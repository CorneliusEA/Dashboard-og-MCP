/**
 * HTTP app for the Gaian Data Lake MCP server (separate from index.ts so
 * tests can start it on a random port).
 *
 * Access control — MCP_AUTH_TOKEN (Secret Manager on Cloud Run):
 *   - set:   POST /mcp needs `Authorization: Bearer <token>`. POST /mcp/<token>
 *            is also accepted, because claude.ai custom connectors can't send
 *            a static header (OAuth only) — they use the secret URL instead.
 *   - unset: the server stays open as before, BUT the eledger_* tools are not
 *            registered. Field data (all orgs' parcels, emissions, photos)
 *            is never served from an unauthenticated endpoint.
 */
import { timingSafeEqual } from 'node:crypto'
import express, { Request, Response } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { registerSentinelTool } from './tools/sentinel.js'
import { registerSentinel1Tool } from './tools/sentinel1.js'
import { registerForslerTool } from './tools/forsler.js'
import { registerSoilSenseTool } from './tools/soilsense.js'
import { registerXNaturaTool } from './tools/xnatura.js'
import { registerAiTool } from './tools/ai.js'
import { registerWeatherTool } from './tools/weather.js'
import { registerSoilGridsTool } from './tools/soilgrids.js'
import { registerGbifTool } from './tools/gbif.js'
import { registerElevationTool } from './tools/elevation.js'
import { registerFirmsTool } from './tools/firms.js'
import { registerGfwTool } from './tools/gfw.js'
import { registerEledgerTools } from './tools/eledger.js'

export interface AppOptions {
  /** Shared secret; when empty, the server is open and E-Ledger tools are disabled. */
  authToken?: string | null
}

function buildServer(opts: { eledger: boolean }): McpServer {
  const server = new McpServer({
    name: 'gaian-data-lake',
    version: '0.1.0',
  })

  registerSentinelTool(server)
  registerSentinel1Tool(server)
  registerForslerTool(server)
  registerSoilSenseTool(server)
  registerXNaturaTool(server)
  registerAiTool(server)
  registerWeatherTool(server)
  registerSoilGridsTool(server)
  registerGbifTool(server)
  registerElevationTool(server)
  registerFirmsTool(server)
  registerGfwTool(server)
  if (opts.eledger) registerEledgerTools(server)

  return server
}

function sameSecret(provided: string | undefined, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function createApp({ authToken }: AppOptions = {}) {
  const token = authToken?.trim() || null
  const app = express()
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: 'gaian-data-lake-mcp' })
  })

  // Stateless mode: one MCP server + transport instance per request.
  // Simplest correct option for Cloud Run's scale-to-zero / multi-instance model.
  async function handleMcp(req: Request, res: Response) {
    try {
      const server = buildServer({ eledger: !!token })
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on('close', () => {
        transport.close()
        server.close()
      })
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch (err) {
      console.error('MCP request error:', err)
      if (!res.headersSent) {
        res.status(500).json({ error: 'internal_error' })
      }
    }
  }

  app.post('/mcp', (req, res) => {
    if (token) {
      const bearer = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
      if (!sameSecret(bearer, token)) {
        res.status(401).set('WWW-Authenticate', 'Bearer').json({ error: 'unauthorized' })
        return
      }
    }
    void handleMcp(req, res)
  })

  app.post('/mcp/:token', (req, res) => {
    if (!token || !sameSecret(req.params.token, token)) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    void handleMcp(req, res)
  })

  return app
}
