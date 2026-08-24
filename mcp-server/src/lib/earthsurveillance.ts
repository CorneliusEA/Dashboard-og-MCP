/**
 * EarthSurveillance API client — thin HTTPS wrapper around the PUBLIC API
 * at api.earthsurveillance.ai. This is the ONLY way the MCP server talks
 * to EarthSurveillance — it must never connect to the Postgres instance on
 * GoDaddy (127.0.0.1:5433, not internet-exposed).
 *
 * Endpoints below are placeholders — confirm exact paths/payloads against
 * the FastAPI routes.py for the gemini/ and gaian/ modules before wiring
 * up the real tool.
 */

const BASE_URL = (process.env.EARTHSURVEILLANCE_API_BASE_URL ?? 'https://api.earthsurveillance.ai').replace(/\/$/, '')
const TOKEN = process.env.EARTHSURVEILLANCE_API_TOKEN ?? ''

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) throw new Error(`EarthSurveillance ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export interface RagChatResponse {
  answer: string
  sources?: unknown[]
}

// TODO: confirm real path — likely something under /gemini/chat or /rag/query
export async function ragChat(query: string, context?: Record<string, unknown>): Promise<RagChatResponse> {
  return request<RagChatResponse>('/gemini/chat', {
    method: 'POST',
    body: JSON.stringify({ query, context }),
  })
}
