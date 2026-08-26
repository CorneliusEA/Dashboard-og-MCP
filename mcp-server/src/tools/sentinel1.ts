import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { fetchSAR } from '../lib/sentinel1.js'
import { BBOXES } from '../lib/sentinel.js'

export function registerSentinel1Tool(server: McpServer) {
  server.registerTool(
    'sentinel_sar',
    {
      title: 'Sentinel-1 SAR (radar backscatter)',
      description:
        'Fetch 30-day Sentinel-1 SAR (VV/VH backscatter) statistics for a known estate (cocabo, xoco) or custom bbox. Same Sentinel Hub credentials as sentinel_ndvi. Unlike optical NDVI, SAR sees through cloud cover and is sensitive to soil/canopy moisture — useful as a wet-season complement to NDVI and as a soil-moisture proxy independent of SoilSense.',
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
      const stats = await fetchSAR(resolvedBbox)
      return {
        content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
      }
    },
  )
}
