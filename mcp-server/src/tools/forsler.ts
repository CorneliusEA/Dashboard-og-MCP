import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { searchMaps, getMap, searchMapFeatures } from '../lib/forsler.js'

export function registerForslerTool(server: McpServer) {
  server.registerTool(
    'forsler_maps',
    {
      title: 'Forsler forest maps',
      description:
        'List Forsler maps for the org, or fetch a specific map and its features. Set action to choose the operation.',
      inputSchema: {
        action: z.enum(['list', 'get', 'features']).describe('list: search org maps. get: fetch one map. features: fetch features of one map'),
        mapId: z.string().optional().describe('Required for action=get or action=features'),
        orgId: z.string().optional().describe('Override default FORSLER_ORGANIZATION_ID for action=list'),
      },
    },
    async ({ action, mapId, orgId }) => {
      let result: unknown
      if (action === 'list') {
        result = await searchMaps(orgId)
      } else if (action === 'get') {
        if (!mapId) throw new Error('mapId is required for action=get')
        result = await getMap(mapId)
      } else {
        if (!mapId) throw new Error('mapId is required for action=features')
        result = await searchMapFeatures(mapId)
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}
