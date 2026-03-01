import type { FocusAnalysis, SessionConfig, SessionContext, SessionSummaryData } from './types'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ''

function buildAnalyzePrompt(config: SessionConfig, context: SessionContext): string {
  const roastRules =
    context.distractionCount === 0
      ? 'Be encouraging and gentle — this is their first slip.'
      : context.distractionCount <= 2
        ? 'Be disappointed and mildly sarcastic.'
        : 'Be savage, creative, and brutally funny. No mercy.'

  const allowedList =
    config.allowedDevices.length > 0 ? config.allowedDevices.join(', ') : 'none specified'

  return `You are analyzing a webcam image of a student studying. Your ONLY job is to detect MAJOR, OBVIOUS distractions. You are NOT a behavior monitor.

Student's task: "${config.taskDescription}"
Allowed devices/tools for this task: ${allowedList}

Current session context:
- Lives remaining: ${context.livesRemaining}/${context.totalLives}
- Focus score: ${context.focusScore}%
- Current streak: ${context.currentStreak} min focused
- Distractions this session: ${context.distractionCount}

Roast intensity rule: ${roastRules}

Mark as DISTRACTED only if you see:
- A phone/tablet being actively held and looked at (not just sitting on the desk)
- The student is clearly asleep (head down, eyes closed for extended period — NOT blinking)
- The student is turned completely away from their workspace, facing the opposite direction
- Another person is actively engaging them in conversation face-to-face
- They are eating a full meal (snacking is fine)

Mark as AWAY only if:
- The chair is empty / no person visible in frame
- You can only see the back of their head and they are clearly not at their desk

Mark as FOCUSED for EVERYTHING ELSE including:
- Blinking (this is not sleeping)
- Looking slightly left/right/up/down (people think, read notes, check papers)
- Stretching, yawning, rubbing eyes, scratching
- Drinking water or coffee
- Fidgeting, adjusting posture
- Looking at their phone briefly (under 2 seconds is just checking time)
- Staring into space momentarily (thinking is not distraction)
- Any ambiguous situation whatsoever

You should return 'focused' approximately 85-90% of the time for a normal studying student. If you are returning 'distracted' more than that, you are being too strict. When in doubt, ALWAYS return focused.

Confidence must be above 0.85 to mark as distracted. If you are not highly certain, return focused.

Allowed devices are NOT distractions even if visible or in use.
distraction_type must be null when status is "focused" or "away".

Respond ONLY with valid JSON matching this exact shape:
{
  "status": "focused" | "distracted" | "away",
  "distraction_type": "phone" | "sleeping" | "chatting" | "zoned_out" | "eating" | "looking_away" | null,
  "confidence": 0.0-1.0,
  "roast": "1-2 sentence message — encouraging if focused, roast if distracted"
}`
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
          temperature: 0.7,
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
    if (analysis.status === 'distracted' && analysis.confidence < 0.85) {
      console.log(`[gemini] Low confidence distraction ignored: ${analysis.confidence}`)
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
