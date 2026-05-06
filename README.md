# COCABO ES Dashboard

EarthSurveillance — COCABO Natural Capital Monitor  
1,438 Ngöbe + Naso smallholder farmers · 4,394 ha · Bocas del Toro, Panama

**Stack:** Next.js 14 · TypeScript · Cloud Run (`europe-west1`) · Cloud Build

---

## Auto-deploy: GitHub → Google Cloud Build → Cloud Run

Ingen GitHub Secrets. Alt kører nativt i Google Cloud.

### Opsætning (én gang — kun i Google Cloud Console)

**1. Opret Artifact Registry repository**
```bash
gcloud artifacts repositories create cloud-run-source-deploy \
  --repository-format=docker \
  --location=europe-west1 \
  --project=primal-stock-495416-r7
```

**2. Tilslut GitHub i Cloud Build Console**

Gå til: **Cloud Build → Triggers → Connect Repository**
- Vælg **GitHub**
- Autentificer og vælg `CorneliusEA/Dashboard`
- Klik **Done**

**3. Opret trigger**

I **Cloud Build → Triggers → Create Trigger**:
| Felt | Værdi |
|------|-------|
| Name | `deploy-on-push` |
| Event | Push to branch |
| Branch | `^main$` |
| Configuration | `cloudbuild.yaml` (autodetect) |

Klik **Save** — det er det. Fra nu af deployer hvert push til `main` automatisk.

**4. Giv Cloud Build tilladelse til Cloud Run**

```bash
# Hent Cloud Build service account nummer
PROJECT_NUMBER=$(gcloud projects describe primal-stock-495416-r7 --format="value(projectNumber)")

# Tildel Cloud Run deploy-rettighed
gcloud projects add-iam-policy-binding primal-stock-495416-r7 \
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding primal-stock-495416-r7 \
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

---

## Lokal udvikling

```bash
npm install
npm run dev
# Åbn http://localhost:3000
```

## Tilslut live data

Hver API-route har en `// TODO` kommentar — skift med din rigtige datakilde:

| Route | Fil | Tænkt kilde |
|-------|-----|-------------|
| `/api/overview` | `src/app/api/overview/route.ts` | Database / Google Sheets |
| `/api/communities` | `src/app/api/communities/route.ts` | GPS field app |
| `/api/carbon` | `src/app/api/carbon/route.ts` | Google Earth Engine / Sentinel-2 |
| `/api/eledger` | `src/app/api/eledger/route.ts` | Shipment tracking |
| `/api/biodiversity` | `src/app/api/biodiversity/route.ts` | Acoustic monitoring |
| `/api/finance` | `src/app/api/finance/route.ts` | Financial model |
