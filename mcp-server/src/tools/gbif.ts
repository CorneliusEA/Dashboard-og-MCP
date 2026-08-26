import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { searchOccurrences, speciesSummary } from '../lib/gbif.js'
import { BBOXES } from '../lib/sentinel.js'

export function registerGbifTool(server: McpServer) {
  server.registerTool(
    'gbif_biodiversity',
    {
      title: 'GBIF global biodiversity occurrences',
      description:
        'Open species occurrence records from GBIF for a known estate (cocabo, xoco) or custom bbox. Complements 3Bee/XNatura with globally-sourced observations (citizen science, museum records, etc.). action=occurrences: raw record list. action=species_summary: most-recorded species in the area.',
      inputSchema: {
        action: z.enum(['occurrences', 'species_summary']),
        estate: z.enum(['cocabo', 'xoco']).optional().describe('Named estate bbox to use'),
        bbox: z
          .tuple([z.number(), z.number(), z.number(), z.number()])
          .optional()
          .describe('Custom [minLon, minLat, maxLon, maxLat] — overrides estate'),
        limit: z.number().optional().describe('Max records for action=occurrences (default 20)'),
      },
    },
    async ({ action, estate, bbox, limit }) => {
      const resolvedBbox = bbox ?? (estate ? BBOXES[estate] : BBOXES.cocabo)
      const result = action === 'occurrences' ? await searchOccurrences(resolvedBbox, limit) : await speciesSummary(resolvedBbox)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
