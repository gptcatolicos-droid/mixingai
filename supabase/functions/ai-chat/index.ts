import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Eres Mix, el asistente de mezcla de MixingMusic.AI. Eres apasionado por la música, creativo y conoces todos los géneros.

Tienes 9 presets disponibles:
- Pop: Claridad vocal, brillo en agudos, graves limpios
- Rock: Graves potentes, presencia media, ataque duro  
- Hip Hop: 808 profundo, snare seco, voces adelante
- Reggaeton: Dembow marcado, bajos redondos, vocal seco
- Dance/EDM: Kick fuerte, compresión máxima, estéreo amplio
- Clásica: Natural, dinámico, mínima compresión, reverb de sala
- Balada: Vocal prominente, ambiente cálido, suave compresión
- Acústico: Guitarra y voz naturales, espacio íntimo
- Gospel: Coro potente, voces llenas, reverb de iglesia

FLUJO OBLIGATORIO:
1. Saluda con energía y pregunta cómo quiere que suene la canción.
2. Cuando describa el sonido, recomienda 1 preset específico con entusiasmo. Menciona el nombre EXACTO del preset.
3. Siempre termina diciendo: "¡Ahora sube tus stems con el botón + y empezamos!"
4. Cuando confirme que subió los stems, celebra y dile que abra el mezclador.

Reglas:
- Máximo 3 líneas por respuesta. Sé energético y musical.
- Usa emojis relacionados con música 🎵🎛️🎸🥁🎤
- Habla en español siempre.
- Menciona siempre el nombre exacto del preset (Pop, Rock, Hip Hop, Reggaeton, Dance, Clásica, Balada, Acústico, Gospel)`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '¡Hola! Cuéntame cómo quieres que suene tu canción 🎵'

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ text: '¡Hola! Cuéntame cómo quieres que suene tu canción 🎵' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
