/**
 * Access-control tests for the HTTP app (MCP_AUTH_TOKEN). Starts the real
 * Express app on a random port and talks MCP over HTTP to it.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { createApp } from '../src/app.js'

async function withServer(authToken: string | null, fn: (base: string) => Promise<void>) {
  const server = createApp({ authToken }).listen(0)
  await new Promise((r) => server.once('listening', r))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    await fn(base)
  } finally {
    server.close()
  }
}

/** POST tools/list; returns HTTP status and the tool names (if 200). */
async function listTools(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  })
  if (res.status !== 200) return { status: res.status, tools: [] as string[] }
  const text = await res.text()
  // Streamable HTTP may answer as SSE ("data: {...}") or plain JSON
  const payload = text.includes('data:') ? text.split('\n').find((l) => l.startsWith('data:'))!.slice(5) : text
  const tools = (JSON.parse(payload).result?.tools ?? []).map((t: { name: string }) => t.name)
  return { status: res.status, tools }
}

const TOKEN = 'test-token-0123456789abcdef'

test('no MCP_AUTH_TOKEN: open as before, but eledger_* tools are not exposed', async () => {
  await withServer(null, async (base) => {
    const r = await listTools(`${base}/mcp`)
    assert.equal(r.status, 200)
    assert.ok(r.tools.includes('sentinel_ndvi'))
    assert.ok(!r.tools.some((t) => t.startsWith('eledger_')), r.tools.join(','))
    assert.equal((await listTools(`${base}/mcp/anything`)).status, 404)
  })
})

test('MCP_AUTH_TOKEN set: /mcp requires the bearer token', async () => {
  await withServer(TOKEN, async (base) => {
    assert.equal((await listTools(`${base}/mcp`)).status, 401)
    assert.equal((await listTools(`${base}/mcp`, { Authorization: 'Bearer wrong' })).status, 401)
    const ok = await listTools(`${base}/mcp`, { Authorization: `Bearer ${TOKEN}` })
    assert.equal(ok.status, 200)
    assert.ok(ok.tools.includes('eledger_farms'))
    assert.ok(ok.tools.includes('sentinel_ndvi'))
  })
})

test('MCP_AUTH_TOKEN set: secret URL /mcp/<token> works for header-less clients', async () => {
  await withServer(TOKEN, async (base) => {
    const ok = await listTools(`${base}/mcp/${TOKEN}`)
    assert.equal(ok.status, 200)
    assert.ok(ok.tools.includes('eledger_farms'))
    assert.equal((await listTools(`${base}/mcp/wrong-token`)).status, 404)
  })
})

test('health check stays public', async () => {
  await withServer(TOKEN, async (base) => {
    const res = await fetch(`${base}/health`)
    assert.equal(res.status, 200)
  })
})
