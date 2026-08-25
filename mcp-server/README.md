# Gaian Data Lake MCP Connector

MCP server that wraps the five live data sources agreed in scope — it does
**not** introduce a new data platform. It calls existing, already-deployed
APIs the same way the Dashboard frontend does today.

## Tools

| Tool | Source | Notes |
|---|---|---|
| `sentinel_ndvi` | Sentinel Hub | Direct call, same creds as Dashboard |
| `forsler_maps` | Forsler | Direct call, same creds as Dashboard |
| `soilsense_data` | SoilSense | Direct call. **No hardcoded credential fallback** — set `SOILSENSE_EMAIL`/`SOILSENSE_PASSWORD` or calls fail |
| `xnatura_biodiversity` | 3Bee / XNatura | Direct call, site 101561 |
| `earthsurveillance_rag_chat` | EarthSurveillance Gemini RAG | Via public `api.earthsurveillance.ai` only — placeholder endpoint, confirm real path before use |

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
from `dashboard`, using `mcp-server/cloudbuild.yaml`. Point a Cloud Build
trigger at this file with an included-files filter on `mcp-server/**`.

Environment variables to set on the Cloud Run service (duplicate existing
values from the Dashboard/EarthSurveillance repos — do not regenerate):

- `SENTINEL_CLIENT_ID`, `SENTINEL_CLIENT_SECRET`
- `FORSLER_API_KEY`, `FORSLER_ORGANIZATION_ID`, `FORSLER_BASE_URL`
- `SOILSENSE_BASE_URL`, `SOILSENSE_EMAIL`, `SOILSENSE_PASSWORD`
- `XNATURA_API_TOKEN`, `XNATURA_SITE_ID`
- `EARTHSURVEILLANCE_API_BASE_URL`, `EARTHSURVEILLANCE_API_TOKEN`

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
- [ ] `soilsense_data` — **blocked**: `api.staging.soilsense.io` times out
      at the connection level from this environment (DNS resolves fine).
      Other hosts work, so this looks like the staging server itself being
      down or IP-restricted, not a code issue. Re-test once confirmed reachable.
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
- [ ] Wire up a Cloud Build trigger for `mcp-server/**`
- [ ] Add Sentinel/Forsler/SoilSense tools for the Xoco estate, not just Cocabo, once bboxes are confirmed
