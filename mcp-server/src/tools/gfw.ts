import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { fetchTreeCoverLoss, fetchRecentAlerts } from '../lib/gfw.js'
import { BBOXES } from '../lib/sentinel.js'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export function registerGfwTool(server: McpServer) {
  server.registerTool(
    'global_forest_watch',
    {
      title: 'Global Forest Watch',
      description:
        'Tree cover loss by year, or a count of recent deforestation alerts, from Global Forest Watch for a known estate (cocabo, xoco) or custom bbox. Requires GFW_API_KEY — not yet verified against a real key.',
      inputSchema: {
        action: z.enum(['tree_cover_loss', 'recent_alerts']),
        estate: z.enum(['cocabo', 'xoco']).optional().describe('Named estate bbox to use'),
        bbox: z
          .tuple([z.number(), z.number(), z.number(), z.number()])
          .optional()
          .describe('Custom [minLon, minLat, maxLon, maxLat] — overrides estate'),
        sinceDate: isoDate.optional().describe('Required for action=recent_alerts, format YYYY-MM-DD'),
      },
    },
    async ({ action, estate, bbox, sinceDate }) => {
      const resolvedBbox = bbox ?? (estate ? BBOXES[estate] : BBOXES.cocabo)
      let result: unknown
      if (action === 'tree_cover_loss') {
        result = await fetchTreeCoverLoss(resolvedBbox)
      } else {
        if (!sinceDate) throw new Error('sinceDate is required for action=recent_alerts')
        result = await fetchRecentAlerts(resolvedBbox, sinceDate)
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
