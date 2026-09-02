import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getFarm, getSites, getLatestObservation, getObservationHistory, getPrecipitation } from '../lib/soilsense.js'

export function registerSoilSenseTool(server: McpServer) {
  server.registerTool(
    'soilsense_data',
    {
      title: 'SoilSense soil sensors',
      description:
        'Query SoilSense soil moisture/temperature sensors. farm: farm details and site depth/calibration config. sites: list observation sites. latest: most recent reading for one site (top/mid/midBot/bot depths). history: recent readings for one site. precipitation: rain gauge data for one site. No pH or nutrient data is available — SoilSense does not measure it.',
      inputSchema: {
        action: z.enum(['farm', 'sites', 'latest', 'history', 'precipitation']),
        siteId: z.string().optional().describe('Required for action=latest, history, or precipitation'),
      },
    },
    async ({ action, siteId }) => {
      let result: unknown
      if (action === 'farm') {
        result = await getFarm()
      } else if (action === 'sites') {
        result = await getSites()
      } else {
        if (!siteId) throw new Error(`siteId is required for action=${action}`)
        if (action === 'latest') result = await getLatestObservation(siteId)
        else if (action === 'history') result = await getObservationHistory(siteId)
        else result = await getPrecipitation(siteId)
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
