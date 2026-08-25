# Graph Report - Dashboard  (2026-08-25)

## Corpus Check
- Corpus is ~26,280 words - fits in a single context window. You may not need a graph.

## Summary
- 446 nodes · 640 edges · 25 communities (20 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.84)
- Token cost: 45,000 input · 7,051 output

## Community Hubs (Navigation)
- Cocabo/Xoco Dashboard Screens
- Cloud Build Pipeline & Static Mockup
- MCP EarthSurveillance Client
- Admin & Auth Routes
- MCP Server Package Config
- Dashboard ESLint/Package Config
- Dashboard TSConfig
- Communities/Forsler/Map Routes
- Dashboard Package Dependencies
- MCP Server TSConfig
- Placeholder Mock API Routes
- Sentinel NDVI & Carbon Routes
- Admin Page UI
- MCP SoilSense Client
- Dashboard SoilSense Client
- XocoMap Component
- App Layout & Providers
- Client Portal Page
- TopBar Navigation
- Login Page
- XNatura/3Bee Route
- Next.js Config
- Auth Middleware

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `Card()` - 14 edges
3. `compilerOptions` - 13 edges
4. `Pill()` - 13 edges
5. `COCABO ES Dashboard (Project)` - 9 edges
6. `AdminPage()` - 8 edges
7. `searchMaps()` - 8 edges
8. `fetchNDVI()` - 8 edges
9. `Metric()` - 7 edges
10. `Gaian Data Lake MCP Connector` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Carbon Reserve Screen/Tab` --semantically_similar_to--> `/api/carbon route (src/app/api/carbon/route.ts)`  [INFERRED] [semantically similar]
  COCABO_ES_Dashboard (1).html → README.md
- `/api/carbon route (src/app/api/carbon/route.ts)` --semantically_similar_to--> `sentinel_ndvi MCP Tool`  [INFERRED] [semantically similar]
  README.md → mcp-server/README.md
- `E-Ledger Screen/Tab` --semantically_similar_to--> `/api/eledger route (src/app/api/eledger/route.ts)`  [INFERRED] [semantically similar]
  COCABO_ES_Dashboard (1).html → README.md
- `Biodiversity Screen/Tab` --semantically_similar_to--> `/api/biodiversity route (src/app/api/biodiversity/route.ts)`  [INFERRED] [semantically similar]
  COCABO_ES_Dashboard (1).html → README.md
- `/api/biodiversity route (src/app/api/biodiversity/route.ts)` --semantically_similar_to--> `xnatura_biodiversity MCP Tool`  [INFERRED] [semantically similar]
  README.md → mcp-server/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Gaian Data Lake MCP Tools (five data-source wrappers)** — mcp_server_readme_sentinel_ndvi_tool, mcp_server_readme_forsler_maps_tool, mcp_server_readme_soilsense_data_tool, mcp_server_readme_xnatura_biodiversity_tool, mcp_server_readme_earthsurveillance_rag_chat_tool [EXTRACTED 1.00]
- **Dashboard Next.js API Routes (live-data TODOs)** — readme_api_overview_route, readme_api_communities_route, readme_api_carbon_route, readme_api_eledger_route, readme_api_biodiversity_route, readme_api_finance_route [EXTRACTED 1.00]
- **COCABO Dashboard Mockup Tab Screens** — cocabo_es_dashboard_1_html_overview_screen, cocabo_es_dashboard_1_html_eudr_screen, cocabo_es_dashboard_1_html_carbon_screen, cocabo_es_dashboard_1_html_eledger_screen, cocabo_es_dashboard_1_html_biodiversity_screen, cocabo_es_dashboard_1_html_finance_screen [EXTRACTED 1.00]

## Communities (25 total, 5 thin omitted)

### Community 0 - "Cocabo/Xoco Dashboard Screens"
Cohesion: 0.06
Nodes (55): SCREENS, Tab, SCREENS, Biodiversity(), fetcher(), Carbon(), fetcher(), fmt() (+47 more)

### Community 1 - "Cloud Build Pipeline & Static Mockup"
Cohesion: 0.05
Nodes (47): cloud-run-source-deploy/dashboard Docker Image, Dashboard Cloud Build Pipeline (cloudbuild.yaml), dashboard Cloud Run Service (europe-west1), bioChart (Chart.js), Biodiversity Screen/Tab, Carbon Reserve Screen/Tab, carbonChart (Chart.js), Chart.js 4.4.0 (CDN dependency) (+39 more)

### Community 2 - "MCP EarthSurveillance Client"
Cohesion: 0.09
Nodes (31): app, buildServer(), port, authedFetch(), BASE_URL, GeminiMessage, getToken(), login() (+23 more)

### Community 3 - "Admin & Auth Routes"
Cohesion: 0.13
Nodes (18): DELETE(), isAdmin(), PUT(), GET(), isAdmin(), POST(), handler, authOptions (+10 more)

### Community 4 - "MCP Server Package Config"
Cohesion: 0.07
Nodes (26): express, dependencies, express, @modelcontextprotocol/sdk, zod, description, devDependencies, tsx (+18 more)

### Community 5 - "Dashboard ESLint/Package Config"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @types/bcryptjs, @types/leaflet, @types/node (+17 more)

### Community 6 - "Dashboard TSConfig"
Cohesion: 0.08
Nodes (25): dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, allowJs (+17 more)

### Community 7 - "Communities/Forsler/Map Routes"
Cohesion: 0.13
Nodes (22): COMMUNITIES, GET(), revalidate, GET(), revalidate, XOCO_ESTATES, GET(), layerColor() (+14 more)

### Community 8 - "Dashboard Package Dependencies"
Cohesion: 0.10
Nodes (21): bcryptjs, chart.js, firebase-admin, next-auth, dependencies, bcryptjs, chart.js, firebase-admin (+13 more)

### Community 9 - "MCP Server TSConfig"
Cohesion: 0.10
Nodes (20): compilerOptions, declaration, esModuleInterop, lib, module, moduleResolution, outDir, resolveJsonModule (+12 more)

### Community 10 - "Placeholder Mock API Routes"
Cohesion: 0.12
Nodes (11): TODO: Replace with live acoustic monitoring / satellite LAI data, TODO: Replace with live shipment data from E-Ledger system, TODO: Replace with live financial data source, TODO: Replace with live data source (database, Google Sheets, satellite API), BiodiversityMetrics, CarbonScenario, Community, ELedgerMetrics (+3 more)

### Community 11 - "Sentinel NDVI & Carbon Routes"
Cohesion: 0.18
Nodes (13): GET(), revalidate, GET(), revalidate, GET(), revalidate, BBOXES, COCABO_BBOX (+5 more)

### Community 12 - "Admin Page UI"
Cohesion: 0.13
Nodes (4): AdminPage(), DASHBOARDS, inputStyle, User

### Community 13 - "MCP SoilSense Client"
Cohesion: 0.31
Nodes (9): apiFetch(), getLatestReadings(), getSensorReadings(), getSensors(), getToken(), NOTE: no hardcoded credential fallback here — SOILSENSE_EMAIL/PASSWORD, SoilReading, SoilSensor (+1 more)

### Community 14 - "Dashboard SoilSense Client"
Cohesion: 0.31
Nodes (7): GET(), apiFetch(), getLatestReadings(), getSensors(), getToken(), SoilReading, SoilSensor

### Community 15 - "XocoMap Component"
Cohesion: 0.33
Nodes (4): XocoMap, LayerData, MapData, TILE_LAYERS

### Community 17 - "Client Portal Page"
Cohesion: 0.50
Nodes (4): ClientCard, CLIENTS, fetcher(), Portal()

### Community 18 - "TopBar Navigation"
Cohesion: 0.40
Nodes (4): Tab, TABS, TopBar(), TopBarProps

## Knowledge Gaps
- **174 isolated node(s):** `name`, `version`, `private`, `description`, `type` (+169 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `version`, `private` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cocabo/Xoco Dashboard Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.05536568694463431 - nodes in this community are weakly interconnected._
- **Should `Cloud Build Pipeline & Static Mockup` be split into smaller, more focused modules?**
  _Cohesion score 0.0545790934320074 - nodes in this community are weakly interconnected._
- **Should `MCP EarthSurveillance Client` be split into smaller, more focused modules?**
  _Cohesion score 0.08846153846153847 - nodes in this community are weakly interconnected._
- **Should `Admin & Auth Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.13227513227513227 - nodes in this community are weakly interconnected._
- **Should `MCP Server Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Dashboard ESLint/Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._