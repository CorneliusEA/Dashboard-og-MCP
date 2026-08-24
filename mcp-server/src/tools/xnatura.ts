import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBiodiversity } from '../lib/xnatura.js'

export function registerXNaturaTool(server: McpServer) {
  server.registerTool(
    'xnatura_biodiversity',
    {
      title: '3Bee / XNatura biodiversity',
      description: 'Fetch biodiversity KPIs and species observations for the configured 3Bee site (default: 101561).',
      inputSchema: {},
    },
    async () => {
      const result = await getBiodiversity()
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
