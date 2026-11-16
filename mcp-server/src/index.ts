/**
 * Claude ES Gaian Data Lake Connector — MCP server
 *
 * Wraps the live data sources agreed in scope:
 *   1. Sentinel Hub (satellite / NDVI)
 *   2. Forsler (forest maps / features)
 *   3. 3Bee / XNatura (biodiversity)
 *   4. SoilSense (soil sensors)
 *   5. EarthSurveillance Gemini/OpenAI RAG layer (via public API, no direct DB access)
 *   6. ES Field App / E-Ledger field data (Supabase, read-only — only when MCP_AUTH_TOKEN is set)
 *   + free enrichment sources (weather, soilgrids, GBIF, elevation, FIRMS, GFW, Sentinel-1)
 *
 * Runs as a plain HTTP server (Streamable HTTP transport) so it can be
 * deployed on Cloud Run the same way as the Dashboard service.
 * Routes and access control live in app.ts.
 */
import { createApp } from './app.js'

const authToken = process.env.MCP_AUTH_TOKEN
if (!authToken?.trim()) {
  console.warn('MCP_AUTH_TOKEN not set: /mcp is unauthenticated and the eledger_* tools are disabled')
}

const port = Number(process.env.PORT ?? 8080)
createApp({ authToken }).listen(port, () => {
  console.log(`gaian-data-lake-mcp listening on :${port}`)
})
