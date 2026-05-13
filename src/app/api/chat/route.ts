import { NextRequest } from 'next/server'

export const runtime = 'edge'

const SYSTEM_PROMPT = `You are a helpful, friendly AI assistant. Be conversational and natural — like texting a knowledgeable friend. Keep responses concise and direct unless the user asks for detail. Never use overly formal or legalistic language. If you don't know something, say so honestly. Use markdown formatting when it genuinely helps (code blocks, lists, bold) but don't overdo it.`

// ─── Preferred models — tried in this exact order first ───────────────────────
const PREFERRED_MODELS = [
  'deepseek/deepseek-chat-v3-0324:free',
  'qwen/qwen3-32b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
]

// ─── Exclude non-conversational model types ───────────────────────────────────
const EXCLUDE_PATTERNS = ['ocr', 'embed', 'rerank', 'tts', 'whisper', 'classify']

// ─── Hardcoded fallbacks if OpenRouter models API is unreachable ──────────────
const STATIC_FALLBACKS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
]

const STATUS_MESSAGES = [
  'Model busy, trying another...',
  'Switching to a different AI...',
  'Finding the best available model...',
  'Almost there, trying backup...',
  'Trying another provider...',
]

// ─── Module-level state ───────────────────────────────────────────────────────
interface ModelCache { models: string[]; fetchedAt: number }
interface FailureRecord { count: number; lastFailed: number }

let modelCache: ModelCache | null = null
const MODEL_CACHE_TTL  = 5  * 60 * 1000
const FAILURE_COOLDOWN = 2  * 60 * 1000
const FAILURE_EXPIRE   = 10 * 60 * 1000
const failureMap       = new Map<string, FailureRecord>()

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sseEvent(obj: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`)
}

function isRetryableStatus(status: number): boolean {
  return status === 404 || status === 429 || status === 502 || status === 503 || status === 504
}

function extractParams(id: string): number {
  const m = id.match(/(\d+(?:\.\d+)?)b/i)
  return m ? parseFloat(m[1]) : 0
}

function scoreModel(id: string, now: number): number {
  const prefIdx = PREFERRED_MODELS.indexOf(id)
  if (prefIdx !== -1) return 10_000 - prefIdx * 100

  const failure = failureMap.get(id)
  if (failure) {
    const age = now - failure.lastFailed
    if (age > FAILURE_EXPIRE) {
      failureMap.delete(id)
    } else if (age < FAILURE_COOLDOWN) {
      return Math.max(0, extractParams(id) * 10 - 5_000 - failure.count * 500)
    } else {
      return Math.max(0, extractParams(id) * 10 - failure.count * 200)
    }
  }
  return extractParams(id) * 10
}

function recordFailure(model: string): void {
  const e = failureMap.get(model)
  failureMap.set(model, { count: (e?.count ?? 0) + 1, lastFailed: Date.now() })
}

function recordSuccess(model: string): void {
  failureMap.delete(model)
}

async function getFreeChatModels(apiKey: string): Promise<string[]> {
  const now = Date.now()
  if (modelCache && now - modelCache.fetchedAt < MODEL_CACHE_TTL) return modelCache.models

  try {
    const ac = new AbortController()
    const t  = setTimeout(() => ac.abort(), 4_000)
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: ac.signal,
    })
    clearTimeout(t)
    if (!res.ok) throw new Error('models API error')

    const data = (await res.json()) as { data: Array<{ id: string }> }
    const models = data.data
      .map(m => m.id)
      .filter(id => id.endsWith(':free'))
      .filter(id => !EXCLUDE_PATTERNS.some(p => id.toLowerCase().includes(p)))

    modelCache = { models, fetchedAt: now }
    return models
  } catch {
    return [...PREFERRED_MODELS, ...STATIC_FALLBACKS]
  }
}

function buildQueue(allModels: string[], preferredModel: string | null): string[] {
  const now    = Date.now()
  const deduped = [...new Set([...PREFERRED_MODELS, ...allModels])]
  const sorted  = deduped.sort((a, b) => scoreModel(b, now) - scoreModel(a, now))

  if (preferredModel) {
    const failure  = failureMap.get(preferredModel)
    const onCooldown = failure && Date.now() - failure.lastFailed < FAILURE_COOLDOWN
    if (!onCooldown && sorted.includes(preferredModel)) {
      return [preferredModel, ...sorted.filter(m => m !== preferredModel)]
    }
  }
  return sorted
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    messages: Array<{ role: string; content: string }>
    preferredModel?: string
    userApiKey?: string
  }

  // Prefer user-supplied key; fall back to server env var
  const apiKey = (body.userApiKey?.trim()) || process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'No API key configured. Add your OpenRouter key in Settings.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const referer      = req.headers.get('origin') ?? 'https://localhost:5000'
  const userMsgs     = body.messages.filter(m => m.role !== 'system')
  const fullMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...userMsgs]

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  ;(async () => {
    const allModels = await getFreeChatModels(apiKey)
    const queue     = buildQueue(allModels, body.preferredModel ?? null)

    let succeeded  = false
    let attemptNum = 0

    for (const model of queue) {
      if (req.signal.aborted) break

      attemptNum++
      if (attemptNum > 1) {
        const msg = STATUS_MESSAGES[Math.min(attemptNum - 2, STATUS_MESSAGES.length - 1)]
        await writer.write(sseEvent({ _status: msg }))
        await new Promise(r => setTimeout(r, 250))
      }

      const modelAc = new AbortController()
      const timeout = setTimeout(() => modelAc.abort('timeout'), 25_000)
      const onStop  = () => modelAc.abort('client')
      req.signal.addEventListener('abort', onStop, { once: true })

      try {
        const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': referer,
            'X-Title': 'AI Chat',
          },
          body: JSON.stringify({ model, messages: fullMessages, stream: true, max_tokens: 2048 }),
          signal: modelAc.signal,
        })
        clearTimeout(timeout)
        req.signal.removeEventListener('abort', onStop)

        if (!upstream.ok) {
          recordFailure(model)
          if (isRetryableStatus(upstream.status)) continue
          continue
        }

        await writer.write(sseEvent({ _model: model }))

        const reader      = upstream.body!.getReader()
        const decoder     = new TextDecoder()
        let   parseBuf    = ''
        let   gotContent  = false

        while (true) {
          if (req.signal.aborted) break
          const { done, value } = await reader.read()
          if (done) break

          parseBuf += decoder.decode(value, { stream: true })
          const lines = parseBuf.split('\n')
          parseBuf    = lines.pop() ?? ''
          for (const line of lines) {
            const t = line.trim()
            if (!t.startsWith('data:')) continue
            const d = t.slice(5).trim()
            if (d === '[DONE]') continue
            try {
              const j = JSON.parse(d)
              const delta = (j.choices as Array<{ delta?: { content?: string } }>)?.[0]?.delta?.content
              if (delta) gotContent = true
            } catch { /* skip */ }
          }
          await writer.write(value)
        }

        if (!gotContent && !req.signal.aborted) {
          recordFailure(model)
          await writer.write(sseEvent({ _status: 'Retrying with another model...' }))
          continue
        }

        if (!req.signal.aborted) {
          recordSuccess(model)
          succeeded = true
        }
        break
      } catch (err) {
        clearTimeout(timeout)
        req.signal.removeEventListener('abort', onStop)
        if (req.signal.aborted) break
        if (err instanceof Error && err.name === 'AbortError') {
          recordFailure(model)
          await writer.write(sseEvent({ _status: 'Model timed out, trying another...' }))
        } else {
          recordFailure(model)
        }
      }
    }

    if (!succeeded && !req.signal.aborted) {
      await writer.write(
        sseEvent({ _error: 'All AI models are busy right now. Please try again in a moment.' })
      )
    }
    try { await writer.close() } catch { /* already closed */ }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
