/**
 * Claude ES Gaian Data Lake Connector — MCP server
 *
 * Wraps the five live data sources agreed in scope:
 *   1. Sentinel Hub (satellite / NDVI)
 *   2. Forsler (forest maps / features)
 *   3. 3Bee / XNatura (biodiversity)
 *   4. SoilSense (soil sensors)
 *   5. EarthSurveillance Gemini/OpenAI RAG layer (via public API, no direct DB access)
 *
 * Runs as a plain HTTP server (Streamable HTTP transport) so it can be
 * deployed on Cloud Run the same way as the Dashboard service.
 */
import express from 'express'
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

function buildServer(): McpServer {
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

  return server
}

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'gaian-data-lake-mcp' })
})

// Stateless mode: one MCP server + transport instance per request.
// Simplest correct option for Cloud Run's scale-to-zero / multi-instance model.
app.post('/mcp', async (req, res) => {
  try {
    const server = buildServer()
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
})

const port = Number(process.env.PORT ?? 8080)
app.listen(port, () => {
  console.log(`gaian-data-lake-mcp listening on :${port}`)
})
