import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { fetchFireAlerts } from '../lib/firms.js'
import { BBOXES } from '../lib/sentinel.js'

export function registerFirmsTool(server: McpServer) {
  server.registerTool(
    'fire_alerts',
    {
      title: 'NASA FIRMS fire/thermal alerts',
      description:
        'Near-real-time satellite fire/thermal anomaly detections from NASA FIRMS for a known estate (cocabo, xoco) or custom bbox, over the last N days. Requires FIRMS_MAP_KEY (free signup) — not yet verified against a real key.',
      inputSchema: {
        estate: z.enum(['cocabo', 'xoco']).optional().describe('Named estate bbox to use'),
        bbox: z
          .tuple([z.number(), z.number(), z.number(), z.number()])
          .optional()
          .describe('Custom [minLon, minLat, maxLon, maxLat] — overrides estate'),
        dayRange: z.number().optional().describe('Days to look back, 1-10 (default 3)'),
      },
    },
    async ({ estate, bbox, dayRange }) => {
      const resolvedBbox = bbox ?? (estate ? BBOXES[estate] : BBOXES.cocabo)
      const result = await fetchFireAlerts(resolvedBbox, dayRange)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
