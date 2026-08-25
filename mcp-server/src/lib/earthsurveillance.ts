/**
 * EarthSurveillance API client — thin HTTPS wrapper around the PUBLIC API
 * at api.earthsurveillance.ai. This is the ONLY way the MCP server talks
 * to EarthSurveillance — it must never connect to the Postgres instance on
 * GoDaddy (127.0.0.1:5433, not internet-exposed).
 *
 * Confirmed 2026-08-25 by reading the EarthSurveillance backend source
 * (github.com/CorneliusEA/EarthSurveillance, local checkout):
 *   - All routes are mounted under /api/v1 (app/main.py)
 *   - Auth: POST /api/v1/auth/sign-in/ with {email, password} -> a JWT
 *     access_token (Bearer). Login fails until the account's email is
 *     verified (app/auth/service.py AuthService.login).
 *   - Gemini RAG chat: POST /api/v1/gemini/chat, requires the Bearer
 *     token, and expects Gemini-style messages: [{role: "user"|"model",
 *     parts: [{text}]}] — NOT OpenAI-style {role, content} (see
 *     app/modules/gemini/schemas.py ChatRequest/GeminiMessage).
 *   - "gaian" module (POST /api/v1/gaian/chat) is a separate, simpler
 *     GPT-4o-mini chat unrelated to the data lake — see module docstring
 *     note in the project brief. Not wired up here; add analogously if
 *     needed.
 */

const BASE_URL = (process.env.EARTHSURVEILLANCE_API_BASE_URL ?? 'https://api.earthsurveillance.ai').replace(/\/$/, '')
const API_PREFIX = '/api/v1'

let cachedToken: { token: string; expires: number } | null = null

async function login(): Promise<string> {
  const email = process.env.EARTHSURVEILLANCE_EMAIL
  const password = process.env.EARTHSURVEILLANCE_PASSWORD
  if (!email || !password) {
    throw new Error('EarthSurveillance: EARTHSURVEILLANCE_EMAIL / EARTHSURVEILLANCE_PASSWORD not configured')
  }

  const res = await fetch(`${BASE_URL}${API_PREFIX}/auth/sign-in/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`EarthSurveillance login failed: ${res.status} ${detail}`)
  }
  const json = (await res.json()) as { access_token: string; refresh_token: string }

  // access_token TTL isn't exposed in the response; re-login each cold
  // start and cache for a conservative 10 minutes within a warm instance.
  cachedToken = { token: json.access_token, expires: Date.now() + 10 * 60_000 }
  return cachedToken.token
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token
  return login()
}

async function authedFetch<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })

  if (res.status === 401 && !isRetry) {
    // Token may have expired server-side before our local TTL guess; force
    // a fresh login once and retry.
    cachedToken = null
    return authedFetch<T>(path, init, true)
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`EarthSurveillance ${path} → ${res.status} ${detail}`)
  }
  return res.json() as Promise<T>
}

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export interface RagChatResponse {
  id: string
  model: string
  content: string
  usage: Record<string, unknown> | null
  grounding_mode: 'retrieval' | 'fallback'
  sources: unknown[]
  analysis: unknown | null
  citations: unknown[]
}

/**
 * Ask a question over EarthSurveillance's Gemini RAG pipeline (retrieval
 * over ingested sensor/NDVI data).
 */
export async function ragChat(query: string): Promise<RagChatResponse> {
  const messages: GeminiMessage[] = [{ role: 'user', parts: [{ text: query }] }]
  return authedFetch<RagChatResponse>('/gemini/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, temperature: 0.7, max_tokens: 1000 }),
  })
}
