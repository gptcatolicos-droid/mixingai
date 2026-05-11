import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM = `You are an expert professional mixing and mastering engineer with 20+ years of experience working with major labels. You are embedded inside MixingMusic.AI, a professional browser DAW.

You receive audio analysis data from the DAW and respond with:
1. A brief, professional explanation (2-4 sentences max, in the same language as the user)
2. A JSON block with parameter changes to apply automatically

## Audio Parameters You Can Control:
- Master EQ: bass (-12 to +12 dB), mid (-12 to +12 dB), high (-12 to +12 dB)
- Per-track EQ: same bands, specify trackId
- Reverb: level (0.0 to 0.5)
- Delay: level (0.0 to 0.4), time (0.1 to 0.8 seconds)
- Stereo widener: enabled (true/false)
- Compression: enabled (true/false)
- Track volume: volume (0.0 to 1.0), specify trackId
- Track pan: pan (-1.0 to 1.0), specify trackId

## Response Format:
ALWAYS end your response with a JSON block, even if no changes are needed:

\`\`\`json
{
  "actions": [
    { "type": "master_eq", "bass": 0, "mid": 0, "high": 0 },
    { "type": "track_eq", "trackId": "trk-xxx", "bass": 0, "mid": 0, "high": 0 },
    { "type": "reverb", "level": 0.2 },
    { "type": "delay", "level": 0.1, "time": 0.35 },
    { "type": "widener", "enabled": true },
    { "type": "compression", "enabled": true },
    { "type": "track_volume", "trackId": "trk-xxx", "volume": 0.8 },
    { "type": "track_pan", "trackId": "trk-xxx", "pan": -0.3 }
  ]
}
\`\`\`

Only include actions that actually change something. Empty array if no changes needed.

## Mixing Rules:
- Vocals should sit between -18 and -14 LUFS before master
- Kick drum needs space at 60-80Hz — cut competing instruments there
- Muddiness usually lives at 200-400Hz — cut 2-4dB
- Clarity comes from 2-6kHz presence
- Air at 10-16kHz opens up the mix
- Stereo widener hurts mono compatibility — use sparingly on bass-heavy material
- Reverb should be subtle in pop/hip-hop, generous in classical/gospel
- Target integrated LUFS: -14 for streaming, -8 for club tracks`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages, mixData } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

    // Build context from audio analysis
    const contextMsg = mixData ? `
## Current Mix State:
- LUFS Momentary: ${mixData.lufsMomentary?.toFixed(1)} LUFS
- LUFS Integrated: ${mixData.lufsIntegrated?.toFixed(1)} LUFS
- Master EQ: Bass ${mixData.masterEQ?.bass}dB | Mid ${mixData.masterEQ?.mid}dB | High ${mixData.masterEQ?.high}dB
- Reverb: ${Math.round((mixData.reverbLevel || 0) * 100)}% | Delay: ${Math.round((mixData.delayLevel || 0) * 100)}%
- Stereo Widener: ${mixData.widenerEnabled ? 'ON' : 'OFF'}
- Tracks (${mixData.tracks?.length || 0}):
${(mixData.tracks || []).map((t: any) => `  • ${t.name} (${t.instrument}) — Vol: ${Math.round(t.volume * 100)}% | Pan: ${t.pan > 0 ? 'R' : t.pan < 0 ? 'L' : 'C'}${Math.abs(Math.round(t.pan * 100))} | EQ: B${t.eqBass}/${t.eqMid}/${t.eqHigh} | ${t.muted ? 'MUTED' : 'active'} | ID: ${t.id}`).join('\n')}
- Frequency analysis: Sub(0-80Hz): ${mixData.freqBands?.sub?.toFixed(0)}% | Bass(80-250Hz): ${mixData.freqBands?.bass?.toFixed(0)}% | Low-Mid(250-500Hz): ${mixData.freqBands?.lowMid?.toFixed(0)}% | Mid(500-2k): ${mixData.freqBands?.mid?.toFixed(0)}% | High-Mid(2k-8k): ${mixData.freqBands?.highMid?.toFixed(0)}% | Air(8k+): ${mixData.freqBands?.air?.toFixed(0)}%` : ''

    // Prepend context to the last user message
    const enrichedMessages = [...messages]
    if (enrichedMessages.length > 0 && enrichedMessages[enrichedMessages.length - 1].role === 'user') {
      enrichedMessages[enrichedMessages.length - 1] = {
        ...enrichedMessages[enrichedMessages.length - 1],
        content: contextMsg + '\n\n## User Request:\n' + enrichedMessages[enrichedMessages.length - 1].content
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: SYSTEM,
        messages: enrichedMessages,
      }),
    })

    const data = await response.json()
    const rawText = data.content?.[0]?.text || '{"actions":[]}'

    // Extract JSON actions from response
    let actions: any[] = []
    let displayText = rawText
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        actions = parsed.actions || []
        displayText = rawText.replace(/```json[\s\S]*?```/g, '').trim()
      } catch {}
    }

    return new Response(JSON.stringify({ text: displayText, actions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('ai-mix-assistant error:', error)
    return new Response(JSON.stringify({
      text: 'Error connecting to AI. Check your ANTHROPIC_API_KEY in Supabase secrets.',
      actions: []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
