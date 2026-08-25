import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ragChat } from '../lib/earthsurveillance.js'

export function registerAiTool(server: McpServer) {
  server.registerTool(
    'earthsurveillance_rag_chat',
    {
      title: 'EarthSurveillance RAG chat',
      description:
        "Ask a question over EarthSurveillance's ingested sensor/NDVI data via its Gemini RAG pipeline, " +
        'reached over the public api.earthsurveillance.ai API (never a direct DB connection). ' +
        'Requires EARTHSURVEILLANCE_EMAIL/PASSWORD for a real, email-verified account.',
      inputSchema: {
        query: z.string().describe('Natural-language question to answer via retrieval over ingested data'),
      },
    },
    async ({ query }) => {
      const result = await ragChat(query)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
