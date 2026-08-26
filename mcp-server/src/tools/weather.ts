import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { fetchForecast, fetchHistory } from '../lib/openmeteo.js'
import { BBOXES } from '../lib/sentinel.js'

function centerOf(bbox: [number, number, number, number]): [number, number] {
  const [minLon, minLat, maxLon, maxLat] = bbox
  return [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
}

export function registerWeatherTool(server: McpServer) {
  server.registerTool(
    'weather',
    {
      title: 'Open-Meteo weather',
      description:
        'Weather for a known estate (cocabo, xoco) or custom lat/lon. action=forecast: current conditions + 7-day daily forecast. action=history: daily precipitation/temperature between two dates (YYYY-MM-DD).',
      inputSchema: {
        action: z.enum(['forecast', 'history']),
        estate: z.enum(['cocabo', 'xoco']).optional().describe('Named estate to use as the location'),
        lat: z.number().optional().describe('Custom latitude — overrides estate'),
        lon: z.number().optional().describe('Custom longitude — overrides estate'),
        from: z.string().optional().describe('Required for action=history, ISO date YYYY-MM-DD'),
        to: z.string().optional().describe('Required for action=history, ISO date YYYY-MM-DD'),
      },
    },
    async ({ action, estate, lat, lon, from, to }) => {
      const [defaultLat, defaultLon] = centerOf(estate ? BBOXES[estate] : BBOXES.cocabo)
      const resolvedLat = lat ?? defaultLat
      const resolvedLon = lon ?? defaultLon

      let result: unknown
      if (action === 'forecast') {
        result = await fetchForecast(resolvedLat, resolvedLon)
      } else {
        if (!from || !to) throw new Error('from and to are required for action=history')
        result = await fetchHistory(resolvedLat, resolvedLon, from, to)
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
