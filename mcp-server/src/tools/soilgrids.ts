import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { fetchSoilProperties } from '../lib/soilgrids.js'
import { BBOXES } from '../lib/sentinel.js'

function centerOf(bbox: [number, number, number, number]): [number, number] {
  const [minLon, minLat, maxLon, maxLat] = bbox
  return [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
}

export function registerSoilGridsTool(server: McpServer) {
  server.registerTool(
    'soilgrids',
    {
      title: 'SoilGrids global soil properties',
      description:
        'Global soil property estimates (pH, organic carbon, clay/sand %, nitrogen) from ISRIC SoilGrids for a known estate (cocabo, xoco) or custom lat/lon. Covers areas without a physical SoilSense sensor — this is a modeled 250m-resolution map, not a live reading.',
      inputSchema: {
        estate: z.enum(['cocabo', 'xoco']).optional().describe('Named estate to use as the location'),
        lat: z.number().optional().describe('Custom latitude — overrides estate'),
        lon: z.number().optional().describe('Custom longitude — overrides estate'),
        depth: z.enum(['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm', '100-200cm']).optional(),
      },
    },
    async ({ estate, lat, lon, depth }) => {
      const [defaultLat, defaultLon] = centerOf(estate ? BBOXES[estate] : BBOXES.cocabo)
      const result = await fetchSoilProperties(lat ?? defaultLat, lon ?? defaultLon, depth)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
