import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getSensors, getLatestReadings, getSensorReadings } from '../lib/soilsense.js'

export function registerSoilSenseTool(server: McpServer) {
  server.registerTool(
    'soilsense_data',
    {
      title: 'SoilSense soil sensors',
      description:
        'Query SoilSense soil moisture/temperature sensors: list sensors, get latest readings across all sensors, or history for one sensor.',
      inputSchema: {
        action: z.enum(['sensors', 'latest', 'history']).describe('sensors: list devices. latest: most recent reading per sensor. history: readings for one sensor over a date range'),
        sensorId: z.string().optional().describe('Required for action=history'),
        from: z.string().optional().describe('ISO date, for action=history'),
        to: z.string().optional().describe('ISO date, for action=history'),
      },
    },
    async ({ action, sensorId, from, to }) => {
      let result: unknown
      if (action === 'sensors') {
        result = await getSensors()
      } else if (action === 'latest') {
        result = await getLatestReadings()
      } else {
        if (!sensorId) throw new Error('sensorId is required for action=history')
        result = await getSensorReadings(sensorId, from, to)
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
