import type { FocusAnalysis, SessionConfig, SessionContext, SessionSummaryData } from './types'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ''

function buildAnalyzePrompt(config: SessionConfig, context: SessionContext): string {
  const mood =
    context.distractionCount === 0
      ? 'gentle and encouraging'
      : context.distractionCount <= 2
        ? 'mildly sarcastic and disappointed'
        : 'savage, creative, brutally funny. no mercy'

  const allowed =
    config.allowedDevices.length > 0 ? config.allowedDevices.join(', ') : 'none specified'

  const screenNote = config.watchScreen
    ? 'Image is SIDE-BY-SIDE: LEFT panel = webcam of the student, RIGHT panel = their live screen. Use BOTH to judge focus. On-screen distracting apps/content count as distraction unless in allowed list.'
    : 'Image is a webcam view of the student.'

  const antiAiRule = config.antiAI && config.watchScreen
    ? `\nANTI-AI MODE IS ON. If the SCREEN panel shows the student using an AI chatbot / LLM to do their work — including ChatGPT, Claude, Gemini, Copilot, Cursor AI chat, Perplexity, Grok, or any chat UI where they are asking an AI to write/solve/generate content related to their task — CALL IT DISTRACTED with distraction_type="ai_usage" and a sharp roast about cheating with AI. Be strict. Even a visible AI chat window open and being typed into counts. Reading AI-generated documentation / API references is fine; having an AI do the thinking for them is not.`
    : ''

  return `You are a real-time focus monitor analyzing ONE frame per second from a student's study session. React fast. ${screenNote}

Student's task: "${config.taskDescription}"
Allowed tools/behaviors (NEVER flag these): ${allowed}${antiAiRule}

Session context:
- Lives remaining: ${context.livesRemaining}/${context.totalLives}
- Focus score: ${context.focusScore}%
- Current streak: ${context.currentStreak} min
- Distractions this session: ${context.distractionCount}

CALL DISTRACTED the MOMENT you see (confidence >= 0.6):
  - Phone or tablet held / looked at (unless in allowed list)
  - Head down on desk, eyes closed, clearly sleeping
  - Another person being spoken to / face-to-face conversation
  - Face turned >45 degrees from workspace for this frame
  - Full meal / sustained eating (quick snack/drink is fine)
  - (Screen panel) social media, games, video streaming, messaging, shopping, unrelated content (not in allowed list)

CALL AWAY when:
  - No face visible in webcam panel
  - Empty chair / empty room
  - Only back of head visible

CALL FOCUSED for everything else: looking at screen/notes, reading, writing, brief glances, adjusting posture, drinking water, stretching, yawning, brief allowed-device glance.

BIAS: DO NOT default to focused. If the frame CLEARLY shows a phone in hand or user asleep, CALL IT DISTRACTED even on first detection. Be decisive, not conservative.

Roast intensity for this response: ${mood}.

Respond with ONE JSON object ONLY, no prose, no code fences. Exact shape:
{
  "status": "focused" | "distracted" | "away",
  "distraction_type": "phone" | "sleeping" | "chatting" | "zoned_out" | "eating" | "looking_away" | "ai_usage" | null,
  "confidence": 0.0-1.0,
  "roast": "1-2 sentence message. Encouraging when focused, brutal-funny when distracted, concerned when away."
}

distraction_type must be null when status is not "distracted".`
}

export async function analyzeFrame(
  base64Image: string,
  config: SessionConfig,
  context: SessionContext,
): Promise<FocusAnalysis | null> {
  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
              { text: buildAnalyzePrompt(config, context) },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[gemini] analyzeFrame HTTP error:', res.status, errText)
      return null
    }

    const data = await res.json()
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.error('[gemini] analyzeFrame: empty response', data)
      return null
    }

    const analysis = JSON.parse(text) as FocusAnalysis
    console.log('[gemini] =>', analysis.status, analysis.distraction_type ?? '', `conf=${analysis.confidence}`)

    // Trust at >= 0.5. Below, downgrade to focused (avoid false positives).
    if (analysis.status === 'distracted' && analysis.confidence < 0.5) {
      return { ...analysis, status: 'focused', distraction_type: null }
    }
    return analysis
  } catch (err) {
    console.error('[gemini] analyzeFrame error:', err)
    return null
  }
}

export async function generateSessionReview(
  summary: SessionSummaryData,
  config: SessionConfig,
): Promise<string> {
  try {
    const distractionSummary = Object.entries(summary.distractionsByType)
      .map(([type, count]) => `${type} (${count}x)`)
      .join(', ')

    const prompt = `A student just completed a focus session. Write a 2-3 sentence personalized review.

Task: ${config.taskDescription}
Duration: ${summary.totalMinutes} min
Focus rate: ${summary.focusPercentage}%
Best streak: ${summary.bestStreakMinutes} min
Lives lost: ${summary.livesLost}
Distractions: ${distractionSummary || 'none'}
Coins earned: ${summary.coinsEarned}

Be specific, encouraging but honest. Reference their actual stats. Keep it under 60 words.`

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8 },
      }),
    })

    if (!res.ok) {
      console.error('[gemini] generateSessionReview HTTP error:', res.status)
      return 'Great session! Keep building that focus muscle.'
    }

    const data = await res.json()
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Great session! Keep up the great work.'
    )
  } catch (err) {
    console.error('[gemini] generateSessionReview error:', err)
    return 'Great session! Keep building that focus muscle.'
  }
}
