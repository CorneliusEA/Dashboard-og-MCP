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
| `soilsense_data` | SoilSense | Requires `SOILSENSE_API_KEY` (from account settings). Rewritten 2026-09-02 against the real production API — the original staging host + email/password flow was deprecated, see Status/TODO |
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

Field data from the ES Field App / E-Ledger (added 2026-11-16, **read-only**, Supabase EU/Frankfurt — the only source of truth for field data):

| Tool | Source | Notes |
|---|---|---|
| `eledger_farms` | `records` (`modulo=finca`) | Fincas: name, country, region, ha, sector, parcel count. Returns a `farm_key` per farm |
| `eledger_parcels` | `records` (`modulo=parcela`) | One finca's parcels as GeoJSON FeatureCollection ([lat,lon] → [lon,lat], closed ring) with ha, measured ha, EUDR status |
| `eledger_records` | `records` | Registrations filtered by farm/parcel/modulo/date, limit ≤ 200, short summary per record |
| `eledger_emissions` | `records` + `v_gases` (`v_emissions` for `group_by=org_month`) | kg CO2e + CH4/N2O, grouped by farm/parcel/month/modulo |
| `eledger_species` | `v_observations` + `v_species_ai` | Species finds + AI identifications, per-species summary |
| `eledger_field_measures` | `v_field_measures` | Soil, water, rain, canopy cover (+ docs/media) with per-modulo aggregates |
| `eledger_photo_url` | Supabase Storage `photos` bucket | Signed photo link for one record, valid 1 hour |

E-Ledger rules baked into `src/lib/eledger.ts`:

- Logs in with the app's integration account (profile role must be `integracion` — read everything, write nothing). Never the service_role key. Token cached, refreshed before expiry, re-auth once on 401.
- `farm_id`/`parcel_id` are only unique **per user**, so farms are always keyed on `(user_id, farm_id)`, exposed as an opaque `farm_key` (`<8 hex of sha256(user_id)>:<farm_id>`) — raw user_ids are never returned. A bare `farm_id` shared by several users is rejected with the candidate farm_keys, never merged.
- Every `records` query filters `data->>superseded_by=is.null` (current versions only). The `v_*` views have no `user_id`, so per-farm results are scoped via `view.id = records.id`. `v_emissions` sums across users sharing a farm_id, so it is only used org-wide per month.
- Only `GET` with explicit `select=` (plus the storage signing `POST`), pages ≤ 1000 rows, capped per tool with a `truncated` flag. Never reads `profiles`; `recorded_by` initials are the only person identifier, and record summaries drop email/phone/owner-style fields.

Tests: `npm test` (node:test + an in-memory fake of Supabase auth/PostgREST/storage) covers expired/revoked tokens, superseded records, [lat,lon] parcels and two users with the same `farm_id`.

Investigated and **not** added, with reasons:

- **Copernicus DEM** — not available on the free public OpenTopoData instance; `elevation` (SRTM30m) already covers this need.
- **Copernicus Land Monitoring Service (CORINE Land Cover)** — EU-only coverage, doesn't include Panama/Nicaragua where the estates are.
- **ESA WorldCover via Sentinel Hub** — tried querying it as a Sentinel Hub collection type, got a clear "invalid collection type" rejection. Might be reachable a different way (openEO, direct COG access) but not confirmed — would need more research before spending more Sentinel Hub API calls guessing at it.
- **JRC Global Surface Water** — no simple point/bbox REST API; querying arbitrary polygons requires Google Earth Engine (a service account + enabling the Earth Engine API on a GCP project). That's an infrastructure decision, not just a code change — flagging for a decision rather than building silently.

## Access control (`MCP_AUTH_TOKEN`)

Routes and auth live in `src/app.ts`.

- **`MCP_AUTH_TOKEN` set** (Secret Manager): `POST /mcp` requires
  `Authorization: Bearer <token>`. `POST /mcp/<token>` is accepted too,
  because claude.ai custom connectors can't send a static header (OAuth
  only) — they get the secret URL instead. Wrong token → 401 on `/mcp`,
  404 on `/mcp/<x>`. `GET /health` stays public.
- **`MCP_AUTH_TOKEN` unset**: open as before, **but the `eledger_*` tools
  are not registered** — field data is never served unauthenticated.

Turning it on (one-time):

1. Create secret `MCP_AUTH_TOKEN` with a long random value
   (e.g. `openssl rand -hex 32`).
2. Cloud Run → `gaian-data-lake-mcp` → expose it as env var
   `MCP_AUTH_TOKEN` (grant the service account access when prompted).
3. Change the claude.ai connector URL to
   `https://gaian-data-lake-mcp-489214757597.europe-west1.run.app/mcp/<token>`.
   The old `/mcp` URL stops working at the moment step 2 deploys.

Note: the secret-URL form puts the token in Cloud Run request logs; use the
bearer header from any client that supports it.

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
- `SOILSENSE_API_KEY` (and optionally `SOILSENSE_BASE_URL`, defaults to `api.app.soilsense.io`) — see Status/TODO below for the 2026-09-02 rewrite against the real production API.
- `ELEDGER_SUPABASE_URL`, `ELEDGER_SUPABASE_ANON_KEY` (publishable key, not secret) as plain env vars; `ELEDGER_SUPABASE_EMAIL`, `ELEDGER_SUPABASE_PASSWORD` from Secret Manager (`--update-secrets=ELEDGER_SUPABASE_EMAIL=ELEDGER_SUPABASE_EMAIL:latest,ELEDGER_SUPABASE_PASSWORD=ELEDGER_SUPABASE_PASSWORD:latest`; the service account needs `roles/secretmanager.secretAccessor` on both). Only the `eledger_*` tools need them.

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
- [x] `soilsense_data` — **working**, rewritten and tested 2026-09-02.
      SoilSense confirmed `api.staging.soilsense.io` (the host the original
      integration guide used) is deprecated and no longer available — the
      earlier "connection times out" wasn't an IP-restriction issue, it was
      dead infrastructure. The real production API is entirely different:
      host `api.app.soilsense.io`, auth is a single `x-api-key` header (not
      email/password + login), and the endpoints/response shape don't
      resemble the old ones at all (`/api/farm`, `/api/farm/sites`,
      `/api/site/{id}/observations/latest`, `/api/site/{id}/observations`,
      `/api/site/{id}/precipitation`). Rewrote `lib/soilsense.ts` and
      `tools/soilsense.ts` from scratch against SoilSense's current docs
      (soilsense.io/blog/integrate-soil-moisture-data-api-webhooks) and
      confirmed live against a real farm (Finca del Lago, Nicaragua — Xoco,
      two sites, both configured with top+bottom depth cables).
      **No pH or nutrient fields exist anywhere in the API** — confirmed
      against a real response, not just the docs. If a stakeholder asks for
      that data, it needs to be sourced elsewhere; SoilSense's sensors
      don't appear to measure it.
      **Date-range filtering on `/observations` is unverified** — `from`/
      `to` query params didn't error, but returned identical results with
      and without them in testing (21 readings, ~7h window either way).
      Don't rely on it working until confirmed with a wider real test.
      SoilSense also offers **webhooks** (HMAC-signed push, telemetry +
      attributes) as an alternative to polling — worth considering for the
      Dashboard's live-updating tiles specifically, since that's a better
      fit for "update every 20 min" than an on-demand MCP tool call. Not
      built — this is a separate Dashboard-frontend decision, not an MCP
      connector change.
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
- [x] `soilgrids` — **working**. Per-property `d_factor` unscaling verified against the raw API response (varies per property, e.g. 10 for pH/clay, 100 for nitrogen — do not hardcode one factor). **Known intermittent issue, external, not ours:** ISRIC's `rest.isric.org` occasionally goes fully unreachable (DNS resolves to Wageningen University's own infra, but the TCP connection to 443 times out completely — same failure signature as the old SoilSense staging host, confirmed again 2026-10-21). Nothing to fix on our side; the tool correctly fails clean (`fetch failed`) rather than faking data. Re-test if this comes up again.
- [x] `gbif_biodiversity` — **working**. `species_summary` does a facet query then N follow-up species-name lookups (one per top result) to resolve numeric species keys to real names — adds latency but numeric-only output isn't useful on its own.
- [x] `elevation` — **working**. Public OpenTopoData instance, no key, ~1 req/sec rate limit — fine for occasional per-estate lookups, would need a paid/self-hosted instance for high call volume.
- [x] `fire_alerts` — **working**, tested 2026-08-26 with a real `FIRMS_MAP_KEY` against both the lib function and the actual MCP `tools/call` protocol. Verified CSV parsing against a real high-activity bbox (Amazon) — Cocabo/Xoco returned empty results (no fires detected), which is a legitimate result, not a failure. Re-verified 2026-10-21 after an external QA pass flagged the empty result as ambiguous: confirmed FIRMS always returns a proper HTTP error code (400) for invalid params or keys rather than 200-with-error-text, so there's no silent-failure path — `[]` genuinely means zero fires. Found and fixed a real bug during that re-check: the tool's own `dayRange` schema claimed a valid range of 1-10, but FIRMS' real API only accepts 1-5 (confirmed live — `dayRange=7` returns a 400 "Invalid day range. Expects [1..5]."); any value 6-10 would always have failed. Added `.min(1).max(5)` so this now fails fast with a clear message instead of a remote 400.
- [x] `sentinel_sar` — **working**, tested 2026-08-26. Found and fixed two real bugs: (1) the same `/2000` resx/resy divisor used for NDVI made SAR's GAMMA0_TERRAIN orthorectification take ~47s per call and produced degenerate stats (Sentinel Hub returning the **JSON string** `"Infinity"` for mean/max on some pixels, not a numeric error) — fixed by using a coarser `/1000` divisor (9s/5s per call) and by sanitizing any non-finite value to `null` regardless of resolution, since this Sentinel Hub quirk isn't fully avoidable just by tuning resolution.
- [x] `global_forest_watch` — **working**, tested 2026-08-26 with a real `GFW_API_KEY` against both actions through the actual MCP protocol. Found and fixed two real bugs:
      1. **The documented `/dataset/{name}/latest/query` path silently drops the `x-api-key` header.** It's deprecated and redirects twice (`latest/query` → `{version}/query` → `{version}/query/json`); the key gets lost somewhere in that chain regardless of client (confirmed with both `curl -L` and Node's `fetch`) and every call fails with GFW's generic "missing API key" error even with a valid key. Fixed by resolving the real version first (an unauthenticated manual-redirect probe, cached per dataset — see `resolveVersion()`) and calling `/{version}/query/json` directly, never through `latest`.
      2. GFW's query engine rejects `IS NOT NULL` with `"Unsupported filter operator: exists"` — removed it from the SQL and filter null rows client-side instead.
      Getting a key is **not** a one-click signup — it's a 4-step flow (MyGFW account with email+password → bearer auth token → `POST /auth/apikey` → use the resulting key in `x-api-key`) — see the account setup used for this test if you need to repeat it for another account.
- [x] **External QA pass (2026-10-21)** — an outside review tested all 12 tools and flagged several real issues, since fixed:
      1. **`BBOXES` (shared by every tool in this file) was too wide, contaminating vegetation/species stats with water.** `sentinel_ndvi`'s mean for Xoco (0.22, implausibly low for tropical vegetation) and `gbif_biodiversity`'s top species for Cocabo (*Fregata magnificens*, a seabird) both traced back to the same root cause: Cocabo's box included a large chunk of the Bocas del Toro archipelago/open sea, Xoco's included a large chunk of the lake. Fixed by tightening `BBOXES` to the real Forsler-derived property boundary for Xoco, and a land-verified (SRTM-checked) box around the two known real Cocabo plots for Cocabo — see the comment on `BBOXES` in `lib/sentinel.ts` for the full reasoning and its limits (Cocabo's box is an estimate, not a real boundary — revisit as more farmers get registered in Forsler).
      2. **That same bbox tightening broke `sentinel_ndvi` for Xoco** — the smaller area made the existing 30-day/30%-cloud window return zero cloud-free Sentinel-2 passes (all-null result), the exact same failure mode already fixed for the Dashboard's land-cover renderer. Applied the same fix here: 90-day window, 80% cloud cap, `mosaickingOrder: leastCC`. Also added the same `finite()` sanitization already used for `sentinel_sar`, since Sentinel Hub's Statistics API can return the **string** `"Infinity"` for degenerate pixels on this endpoint too, not just SAR's.
      3. **`fire_alerts`'s `dayRange` schema claimed a valid range of 1-10; FIRMS' real API only accepts 1-5** (confirmed live: `dayRange=7` returns a 400 "Invalid day range. Expects [1..5]."). Any value 6-10 would always have failed. Added `.min(1).max(5)` to fail fast with a clear message instead of a remote 400.
      4. Two tool descriptions (`fire_alerts`, `global_forest_watch`) still said "not yet verified against a real key" despite being confirmed working since 2026-08-26 — fixed, since Claude reads these descriptions live and they shape how much the tool's output gets trusted/caveated in conversation.
      5. **`soilgrids`'s "fetch failed" was re-confirmed as a genuine external outage**, not a bug — `rest.isric.org` DNS resolves fine but the TCP connection to port 443 times out completely, the identical failure signature to the old SoilSense staging host. Nothing to fix; the tool already fails clean.
      6. **`fire_alerts` returning `[]` was re-confirmed as a genuine zero-fires result, not a silent failure** — FIRMS consistently returns proper HTTP error codes rather than 200-with-error-text, so there's no path for an error to be silently parsed as an empty array.

## Phase 1 vs phase 2

**Phase 1 (initial launch):** sentinel, forsler, xnatura, earthsurveillance
— all tested working.
**Phase 1.5 (2026-08-26):** weather, soilgrids, gbif_biodiversity, elevation,
sentinel_sar, fire_alerts, global_forest_watch — all tested working.
**SoilSense (2026-09-02):** rewritten against the real production API and
now working too — see Status/TODO above for what changed. No longer a
phase-2 blocker.
**E-Ledger (2026-11-16):** 7 read-only `eledger_*` tools, unit-tested
against a fake Supabase and run live against the real project once the
integration account got role `integracion`: farms, parcels (GeoJSON
verified at Munkerup, [lon, lat] order correct), records, species, and
photo signing (signed URL downloads a real JPEG) all return real data.
Live-data findings fixed: `equipo` module not in the spec (modulo filter is
free-form now), photo records carry `kg_co2e = 0` (excluded from
emissions), `v_emissions` is split per farm (merged per org/month). Not yet
live-verified because the test data has none: non-zero emissions/CH4/N2O
and `v_field_measures` rows — only covered by the fake-Supabase tests.
**Remaining phase 2:** Xoco-estate bboxes for sentinel/forsler beyond what
already works, and Anders' longer source list (ESA, CarbonTrace).

### SoilSense — resolved, was dead infrastructure not a config issue

The original integration (built 2026-08-24) targeted
`api.staging.soilsense.io` with email/password login, following an
integration guide that turned out to be outdated. Every symptom pointed
to a network-level problem rather than credentials — confirmed unreachable
from three independent points (a developer laptop, the live Cloud Run
service, and this rewrite's own testing), always a clean connection
timeout rather than an auth error. SoilSense support (Giuseppe, 2026-09-02)
confirmed the staging host is simply no longer available, and pointed to
their current docs (soilsense.io/blog/integrate-soil-moisture-data-api-webhooks),
which describe a different host, a different auth method (API key, not
login), and different endpoints entirely. Rewrote the integration from
scratch against those docs and confirmed it live — see Status/TODO above.

---

_Trigger test: 2026-09-02, confirming mcp-server-deploy auto-fires on push (recreated via Console UI after gcloud CLI repeatedly failed)._
