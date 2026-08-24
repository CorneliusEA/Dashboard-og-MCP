import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { fetchNDVI, BBOXES } from '../lib/sentinel.js'

export function registerSentinelTool(server: McpServer) {
  server.registerTool(
    'sentinel_ndvi',
    {
      title: 'Sentinel Hub NDVI',
      description:
        'Fetch 30-day NDVI (vegetation index) statistics from Sentinel Hub for a known estate (cocabo, xoco) or a custom bbox.',
      inputSchema: {
        estate: z.enum(['cocabo', 'xoco']).optional().describe('Named estate bbox to use'),
        bbox: z
          .tuple([z.number(), z.number(), z.number(), z.number()])
          .optional()
          .describe('Custom [minLon, minLat, maxLon, maxLat] — overrides estate'),
      },
    },
    async ({ estate, bbox }) => {
      const resolvedBbox = bbox ?? (estate ? BBOXES[estate] : BBOXES.cocabo)
      const stats = await fetchNDVI(resolvedBbox)
      return {
        content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
      }
    },
  )
}
