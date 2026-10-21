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
        'Near-real-time satellite fire/thermal anomaly detections from NASA FIRMS for a known estate (cocabo, xoco) or custom bbox, over the last N days. Requires FIRMS_MAP_KEY (free signup) — confirmed working against a real key.',
      inputSchema: {
        estate: z.enum(['cocabo', 'xoco']).optional().describe('Named estate bbox to use'),
        bbox: z
          .tuple([z.number(), z.number(), z.number(), z.number()])
          .optional()
          .describe('Custom [minLon, minLat, maxLon, maxLat] — overrides estate'),
        // FIRMS' Area API only accepts 1-5 (confirmed live: 7 returns a 400
        // "Invalid day range. Expects [1..5]."), not 1-10 as this previously
        // claimed — validating here fails fast with a clear message instead
        // of a remote 400.
        dayRange: z.number().int().min(1).max(5).optional().describe('Days to look back, 1-5 (default 3)'),
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
