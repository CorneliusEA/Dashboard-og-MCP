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

- [x] `sentinel_ndvi` — **working**. Fixed two real bugs found while testing
      (also present in the original Dashboard `src/lib/sentinel.ts` — worth
      porting the fix back there): fixed 0.0001° resx/resy overflowed
      Sentinel Hub's 2500px cap on wider bboxes; evalscript was missing the
      `dataMask` output required by the Statistics API.
- [x] `forsler_maps` — **working**, no changes needed.
- [ ] `soilsense_data` — **blocked**: `api.staging.soilsense.io` times out
      at the connection level from this environment (DNS resolves fine).
      Other hosts work, so this looks like the staging server itself being
      down or IP-restricted, not a code issue. Re-test once confirmed reachable.
- [ ] `xnatura_biodiversity` — **blocked**: the credentials we have are a
      3Bee *web platform* login, not an API token. `api.3bee.com` is a live
      server but the guessed REST paths (`/v1/sites/{id}/kpis`, `/v1/auth/login`,
      etc.) all 404. Need real API docs / a token from 3Bee support before
      this can be wired up correctly.
- [ ] Confirm real EarthSurveillance API paths for the `gemini`/`gaian` modules
      (`src/lib/earthsurveillance.ts` currently guesses `/gemini/chat`) — untested
- [ ] Wire up a Cloud Build trigger for `mcp-server/**`
- [ ] Add Sentinel/Forsler/SoilSense tools for the Xoco estate, not just Cocabo, once bboxes are confirmed
