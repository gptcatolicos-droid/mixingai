import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Kept in sync with the real ranges the mixer's own sliders use
// (src/pages/home/components/MixEditor.tsx): volume -40..12dB, pan -50..50,
// master EQ bands -12..12dB. The model is told these ranges too, but the
// server clamps regardless — nothing from the model reaches the client
// outside them.
const VOLUME_MIN = -40, VOLUME_MAX = 12
const PAN_MIN = -50, PAN_MAX = 50
const EQ_MIN = -12, EQ_MAX = 12

const TOOLS = [
  {
    name: 'propose_mix_changes',
    description: 'Propone ajustes de mezcla sobre las pistas y el EQ maestro actuales del proyecto.',
    input_schema: {
      type: 'object',
      properties: {
        reply: { type: 'string', description: 'Respuesta breve en español para el chat (máximo 2 líneas).' },
        changes: {
          type: 'array',
          description: 'Lista de cambios propuestos. Vacía si el mensaje no pedía un ajuste de sonido.',
          items: {
            type: 'object',
            properties: {
              target: { type: 'string', enum: ['stem', 'master'] },
              stemId: { type: 'string', description: "Requerido si target es 'stem'. Debe ser uno de los ids de pista recibidos, nunca inventado." },
              param: {
                type: 'string',
                enum: ['volume', 'pan', 'mute', 'unmute', 'bass', 'mid', 'high', 'reverb', 'delay', 'widener'],
              },
              value: {
                type: 'number',
                description: "Número en dB o unidades de paneo según el parámetro. Para mute/unmute/reverb/delay/widener usa 1 (activar) o 0 (desactivar).",
              },
            },
            required: ['target', 'param', 'value'],
          },
        },
      },
      required: ['reply', 'changes'],
    },
  },
]

function buildSystemPrompt(state: unknown) {
  return `Eres AudioChat, el asistente de mezcla de MixingMusic.AI. Solo propones ajustes sobre la mezcla que ya está cargada: volumen, paneo y mute por pista, EQ maestro (graves/medios/agudos), y activar/desactivar reverb, delay y ensanchador estéreo.

Estado actual de la mezcla (pistas, EQ maestro y efectos):
${JSON.stringify(state)}

Reglas estrictas:
- Responde SIEMPRE usando la herramienta propose_mix_changes.
- Nunca propongas un cambio para una pista con "locked": true. Si el usuario pide algo sobre una pista bloqueada, dilo en "reply" (está protegida) y no la incluyas en "changes".
- "stemId" debe ser exactamente uno de los ids de pista recibidos arriba. Nunca inventes uno.
- Rangos válidos: volumen ${VOLUME_MIN} a ${VOLUME_MAX} dB · paneo ${PAN_MIN} (izquierda) a ${PAN_MAX} (derecha) · graves/medios/agudos ${EQ_MIN} a ${EQ_MAX} dB.
- Si el mensaje no pide un ajuste de sonido (saludo, pregunta general, fuera de tema), deja "changes" vacío y usa "reply" para responder o redirigir amablemente a mezcla.
- "reply" en español, máximo 2 líneas, tono cercano y musical, con al menos un emoji relacionado con audio si aplica.`
}

interface RawChange {
  target?: string
  stemId?: string
  param?: string
  value?: number
}

function sanitizeChanges(raw: unknown, validStemIds: Set<string>, lockedStemIds: Set<string>) {
  if (!Array.isArray(raw)) return []
  const clean: RawChange[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const { target, stemId, param, value } = item as RawChange
    if (target !== 'stem' && target !== 'master') continue
    if (typeof param !== 'string') continue
    if (typeof value !== 'number' || !Number.isFinite(value)) continue

    if (target === 'stem') {
      if (typeof stemId !== 'string' || !validStemIds.has(stemId)) continue
      if (lockedStemIds.has(stemId)) continue // defense in depth — server drops it even if the model slipped
      if (!['volume', 'pan', 'mute', 'unmute'].includes(param)) continue
      let v = value
      if (param === 'volume') v = Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, v))
      else if (param === 'pan') v = Math.max(PAN_MIN, Math.min(PAN_MAX, v))
      else v = value >= 0.5 ? 1 : 0
      clean.push({ target, stemId, param, value: v })
    } else {
      if (!['bass', 'mid', 'high', 'reverb', 'delay', 'widener'].includes(param)) continue
      let v = value
      if (param === 'bass' || param === 'mid' || param === 'high') v = Math.max(EQ_MIN, Math.min(EQ_MAX, v))
      else v = value >= 0.5 ? 1 : 0
      clean.push({ target, param, value: v })
    }
  }
  return clean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages, state } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const stems = Array.isArray(state?.stems) ? state.stems : []
    const validStemIds = new Set(stems.map((s: { id?: string }) => s?.id).filter(Boolean))
    const lockedStemIds = new Set(
      stems.filter((s: { locked?: boolean }) => s?.locked).map((s: { id?: string }) => s?.id).filter(Boolean),
    )

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        system: buildSystemPrompt(state),
        messages,
        tools: TOOLS,
        tool_choice: { type: 'tool', name: 'propose_mix_changes' },
      }),
    })

    const data = await response.json()
    const toolUse = data.content?.find((block: { type?: string }) => block.type === 'tool_use')
    const input = toolUse?.input ?? {}
    const reply = typeof input.reply === 'string' && input.reply.trim()
      ? input.reply
      : 'Cuéntame qué quieres ajustar en la mezcla 🎚️'
    const changes = sanitizeChanges(input.changes, validStemIds, lockedStemIds)

    return new Response(JSON.stringify({ reply, changes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('audio-chat error:', error)
    return new Response(
      JSON.stringify({ reply: 'No pude conectar con AudioChat ahora mismo. Intenta de nuevo en un momento 🎧', changes: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
