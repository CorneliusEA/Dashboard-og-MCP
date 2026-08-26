import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { fetchElevation } from '../lib/elevation.js'
import { BBOXES } from '../lib/sentinel.js'

function centerOf(bbox: [number, number, number, number]): [number, number] {
  const [minLon, minLat, maxLon, maxLat] = bbox
  return [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
}

export function registerElevationTool(server: McpServer) {
  server.registerTool(
    'elevation',
    {
      title: 'SRTM30m elevation',
      description:
        'Elevation in meters for a known estate (cocabo, xoco) or custom lat/lon, from SRTM30m via OpenTopoData. Useful for slope/erosion-risk context.',
      inputSchema: {
        estate: z.enum(['cocabo', 'xoco']).optional().describe('Named estate to use as the location'),
        lat: z.number().optional().describe('Custom latitude — overrides estate'),
        lon: z.number().optional().describe('Custom longitude — overrides estate'),
      },
    },
    async ({ estate, lat, lon }) => {
      const [defaultLat, defaultLon] = centerOf(estate ? BBOXES[estate] : BBOXES.cocabo)
      const result = await fetchElevation(lat ?? defaultLat, lon ?? defaultLon)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
