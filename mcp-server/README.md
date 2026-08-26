# Gaian Data Lake MCP Connector

MCP server that wraps live data sources for EarthSurveillance's land
monitoring — it does **not** introduce a new data platform. It calls
existing, already-deployed APIs the same way the Dashboard frontend does
today, plus free public data sources that need no dedicated backend.

## Tools

Original five (phase 1 scope):

| Tool | Source | Notes |
|---|---|---|
| `sentinel_ndvi` | Sentinel Hub | Direct call, same creds as Dashboard |
| `forsler_maps` | Forsler | Direct call, same creds as Dashboard |
| `soilsense_data` | SoilSense | Direct call. **No hardcoded credential fallback** — set `SOILSENSE_EMAIL`/`SOILSENSE_PASSWORD` or calls fail |
| `xnatura_biodiversity` | 3Bee / XNatura | Direct call, site 101561 |
| `earthsurveillance_rag_chat` | EarthSurveillance Gemini RAG | Via public `api.earthsurveillance.ai` only — placeholder endpoint, confirm real path before use |

Free-data enrichment tools (added 2026-08-26, no cost, no dedicated backend):

| Tool | Source | Notes |
|---|---|---|
| `weather` | Open-Meteo | No API key. Forecast + historical daily weather |
| `soilgrids` | ISRIC SoilGrids | No API key. Modeled global soil properties (250m), covers ground SoilSense sensors don't reach |
| `gbif_biodiversity` | GBIF | No API key. Global open occurrence records, complements 3Bee/XNatura |
| `elevation` | OpenTopoData (SRTM30m) | No API key. Public instance, ~1 req/sec rate limit |
| `fire_alerts` | NASA FIRMS | **Requires `FIRMS_MAP_KEY`** (free instant signup at firms.modaps.eosdis.nasa.gov/api/area) — tested working 2026-08-26 |
| `sentinel_sar` | Sentinel Hub (Sentinel-1) | Same creds as `sentinel_ndvi`. Cloud cover-independent, sensitive to soil/canopy moisture |
| `global_forest_watch` | GFW Data API | Requires `GFW_API_KEY` (free but multi-step signup, see Status/TODO below) — tested working 2026-08-26 |

Investigated and **not** added, with reasons:

- **Copernicus DEM** — not available on the free public OpenTopoData instance; `elevation` (SRTM30m) already covers this need.
- **Copernicus Land Monitoring Service (CORINE Land Cover)** — EU-only coverage, doesn't include Panama/Nicaragua where the estates are.
- **ESA WorldCover via Sentinel Hub** — tried querying it as a Sentinel Hub collection type, got a clear "invalid collection type" rejection. Might be reachable a different way (openEO, direct COG access) but not confirmed — would need more research before spending more Sentinel Hub API calls guessing at it.
- **JRC Global Surface Water** — no simple point/bbox REST API; querying arbitrary polygons requires Google Earth Engine (a service account + enabling the Earth Engine API on a GCP project). That's an infrastructure decision, not just a code change — flagging for a decision rather than building silently.

## Architecture rule

This server must **never** connect directly to the EarthSurveillance
Postgres database (bound to `127.0.0.1:5433` on the GoDaddy VPS, not
internet-exposed). All EarthSurveillance data goes through the public API
at `api.earthsurveillance.ai` over HTTPS — see `src/lib/earthsurveillance.ts`.

## Local dev

```bash
cd mcp-server
npm install
cp .env.example .env   # fill in real values
npm run dev             # http://localhost:8080/mcp
```

Health check: `GET /health`.

## Deploy

Deployed as its own Cloud Run service (`gaian-data-lake-mcp`), separate
from `dashboard`, live at
`https://gaian-data-lake-mcp-489214757597.europe-west1.run.app/mcp`.
Cloud Build trigger `mcp-server-deploy` (project `primal-stock-495416-r7`)
watches `mcp-server/**` on pushes to `main` and auto-deploys via
`mcp-server/cloudbuild.yaml` — confirmed working 2026-08-25, no manual
deploy step needed once a PR is merged to `main`.

Environment variables set on the Cloud Run service (duplicate existing
values from the Dashboard/EarthSurveillance repos — do not regenerate):

- `SENTINEL_CLIENT_ID`, `SENTINEL_CLIENT_SECRET`
- `FORSLER_API_KEY`, `FORSLER_ORGANIZATION_ID`, `FORSLER_BASE_URL`
- `XNATURA_API_KEY`, `XNATURA_SITE_ID`, `XNATURA_USER_SLUG`, `XNATURA_BASE_URL`
- `EARTHSURVEILLANCE_API_BASE_URL`, `EARTHSURVEILLANCE_EMAIL`, `EARTHSURVEILLANCE_PASSWORD`

`SOILSENSE_BASE_URL`/`EMAIL`/`PASSWORD` are **not required for phase 1** —
see Status/TODO below. The server starts and serves the other tools fine
with these unset; `soilsense_data` just fails when called until phase 2.

`FIRMS_MAP_KEY` is optional — only `fire_alerts` needs it, everything else
works without it. Get one free at firms.modaps.eosdis.nasa.gov/api/area.

**Use `--update-env-vars` when adding/changing individual vars on the live
service, not `--set-env-vars`/`--env-vars-file`** — the latter two *replace*
the entire env var list and will silently unset every other credential.

## Status / TODO

Tested 2026-08-24 against real credentials:

- [x] `sentinel_ndvi` — **working**, tested live through the actual MCP
      protocol (`tools/call`), not just the lib function. Fixed two real
      bugs found while testing (also ported back to the Dashboard repo's
      `src/lib/sentinel.ts`): fixed 0.0001° resx/resy overflowed Sentinel
      Hub's 2500px cap on wider bboxes; evalscript was missing the
      `dataMask` output required by the Statistics API.
      Known limitation (not a bug): `estate: "xoco"` can return all-null
      NDVI — the fixed 30-day window + 30% max cloud coverage sometimes
      has zero matching Sentinel-2 acquisitions for Xoco's small bbox
      during Nicaragua's rainy season. Cocabo's larger bbox rarely hits
      this. A future improvement could widen the window or relax cloud
      coverage per-estate, or expose both as tool arguments.
- [x] `forsler_maps` — **working**, no changes needed.
- [ ] `soilsense_data` — **deferred to phase 2**. `api.staging.soilsense.io`
      times out at the connection level from this environment (DNS resolves
      fine). Other hosts work, so this looks like the staging server itself
      being down or IP-restricted, not a code issue. Not a blocker for
      phase 1 launch: the tool is registered but simply fails when called
      until `SOILSENSE_EMAIL`/`PASSWORD` are set and the staging host is
      confirmed reachable — re-test then.
- [x] `xnatura_biodiversity` — **working**. Real base URL/auth/paths found
      2026-08-24 via the platform's Settings → API keys page (X-Api-Key
      header) plus the live OpenAPI spec at platform.3bee.com/openapi.json
      (720 routes, title "Oasi"). `api.3bee.com`, used in the original
      Dashboard route, is a dead end — the real host is `platform.3bee.com`.
      Routes are scoped `/v1/monitoring/{user_slug}/sites/{site_id}/...`;
      `user_slug=earth-surveillance`, `site_id=101561` (Xoco Gourmet, El
      Lago — COCABO has no 3Bee site). See `src/lib/xnatura.ts` for details.
- [x] `earthsurveillance_rag_chat` — **working**, tested live through the
      actual MCP protocol. Two real issues found and fixed vs. the
      original guess:
      1. Endpoint/auth confirmed by reading the backend source directly
         (local checkout of github.com/CorneliusEA/EarthSurveillance):
         `POST /api/v1/gemini/chat`, login via `POST /api/v1/auth/sign-in/`
         (email+password -> Bearer JWT, not a static token), Gemini-style
         messages `{role, parts:[{text}]}`.
      2. **`api.earthsurveillance.ai` (named in the project brief as the
         public API host) does not resolve in DNS at all (NXDOMAIN).**
         The real, live API is served from the main domain,
         `www.earthsurveillance.ai/api/v1/...`. Worth fixing the DNS/docs
         at some point, but the connector works against the real host now.
      Currently tested with a personal login
      (`EARTHSURVEILLANCE_EMAIL`/`PASSWORD`) — recommend swapping to a
      dedicated service account before production use.
- [x] Cloud Build trigger wired and confirmed working (2026-08-25) — see Deploy above.
- [ ] Add Sentinel/Forsler/SoilSense tools for the Xoco estate, not just Cocabo, once bboxes are confirmed

Tested 2026-08-26 (free enrichment tools), all against real live requests through the actual MCP protocol, not just the lib function:

- [x] `weather` — **working**. Both `forecast` and lookup via estate center-point tested against Cocabo/Xoco.
- [x] `soilgrids` — **working**. Per-property `d_factor` unscaling verified against the raw API response (varies per property, e.g. 10 for pH/clay, 100 for nitrogen — do not hardcode one factor).
- [x] `gbif_biodiversity` — **working**. `species_summary` does a facet query then N follow-up species-name lookups (one per top result) to resolve numeric species keys to real names — adds latency but numeric-only output isn't useful on its own.
- [x] `elevation` — **working**. Public OpenTopoData instance, no key, ~1 req/sec rate limit — fine for occasional per-estate lookups, would need a paid/self-hosted instance for high call volume.
- [x] `fire_alerts` — **working**, tested 2026-08-26 with a real `FIRMS_MAP_KEY` against both the lib function and the actual MCP `tools/call` protocol. Verified CSV parsing against a real high-activity bbox (Amazon) — Cocabo/Xoco returned empty results (no fires detected), which is a legitimate result, not a failure.
- [x] `sentinel_sar` — **working**, tested 2026-08-26. Found and fixed two real bugs: (1) the same `/2000` resx/resy divisor used for NDVI made SAR's GAMMA0_TERRAIN orthorectification take ~47s per call and produced degenerate stats (Sentinel Hub returning the **JSON string** `"Infinity"` for mean/max on some pixels, not a numeric error) — fixed by using a coarser `/1000` divisor (9s/5s per call) and by sanitizing any non-finite value to `null` regardless of resolution, since this Sentinel Hub quirk isn't fully avoidable just by tuning resolution.
- [x] `global_forest_watch` — **working**, tested 2026-08-26 with a real `GFW_API_KEY` against both actions through the actual MCP protocol. Found and fixed two real bugs:
      1. **The documented `/dataset/{name}/latest/query` path silently drops the `x-api-key` header.** It's deprecated and redirects twice (`latest/query` → `{version}/query` → `{version}/query/json`); the key gets lost somewhere in that chain regardless of client (confirmed with both `curl -L` and Node's `fetch`) and every call fails with GFW's generic "missing API key" error even with a valid key. Fixed by resolving the real version first (an unauthenticated manual-redirect probe, cached per dataset — see `resolveVersion()`) and calling `/{version}/query/json` directly, never through `latest`.
      2. GFW's query engine rejects `IS NOT NULL` with `"Unsupported filter operator: exists"` — removed it from the SQL and filter null rows client-side instead.
      Getting a key is **not** a one-click signup — it's a 4-step flow (MyGFW account with email+password → bearer auth token → `POST /auth/apikey` → use the resulting key in `x-api-key`) — see the account setup used for this test if you need to repeat it for another account.

## Phase 1 vs phase 2

**Phase 1 (this launch):** sentinel, forsler, xnatura, earthsurveillance —
all tested working. SoilSense ships registered-but-unconfigured; calling
it fails cleanly until phase 2 sets its env vars and confirms the staging
host is reachable.
**Phase 1.5 (2026-08-26):** weather, soilgrids, gbif_biodiversity, elevation
— all free, no key required, tested working. fire_alerts added but needs
a `FIRMS_MAP_KEY` before it can be tested/used.
**Phase 2:** SoilSense (blocked externally — see below), Xoco-estate bboxes,
and Anders' longer source list (Global Forest Watch, ESA, CarbonTrace).

### SoilSense — external blocker, not a code issue

As of 2026-08-25, tested with real credentials set on the live Cloud Run
service (not just locally): the call now gets past auth-configuration and
fails with a generic `fetch failed` at the network layer — same failure
from Cloud Run's IP as from a developer laptop. This means it's not a
credentials problem, it's `api.staging.soilsense.io` itself being down or
IP-restricted. Needs someone to confirm with SoilSense whether the staging
server is up, and if there's an IP allowlist, whether Cloud Run's egress
IP needs to be added to it.
