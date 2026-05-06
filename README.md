# COCABO ES Dashboard

EarthSurveillance — COCABO Natural Capital Monitor  
1,438 Ngöbe + Naso smallholder farmers · 4,394 ha · Bocas del Toro, Panama

Built with **Next.js 14** · Deployed to **Google Cloud Run** via GitHub Actions.

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Main dashboard (tab state)
│   ├── layout.tsx            # HTML root + metadata
│   ├── globals.css           # Design system
│   └── api/
│       ├── overview/         # Pilot metrics
│       ├── communities/      # EUDR community data
│       ├── carbon/           # Carbon stock + scenarios
│       ├── eledger/          # Farm-to-buyer chain
│       ├── biodiversity/     # Bird species data
│       └── finance/          # DFI + revenue model
├── components/
│   ├── TopBar.tsx            # Navigation + live clock
│   ├── screens/              # One component per tab
│   └── ui/                   # Metric, Card, Pill
└── lib/
    └── types.ts              # Shared TypeScript types
```

## Local development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Deployment — Google Cloud Run

Push to `main` triggers:
1. Docker build (Next.js standalone)
2. Push to Artifact Registry (`europe-west1`)
3. Deploy to Cloud Run (`cocabo-dashboard`)

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider resource name |
| `GCP_SERVICE_ACCOUNT` | Service account with run.admin + artifactregistry.writer |

### First-time Google Cloud setup

```bash
# Artifact Registry
gcloud artifacts repositories create cocabo-dashboard \
  --repository-format=docker --location=europe-west1

# Service account
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Deployer"

# Permissions
for role in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="$role"
done

# Workload Identity Federation
gcloud iam workload-identity-pools create github-pool \
  --location=global --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"

gcloud iam service-accounts add-iam-policy-binding \
  github-deployer@$PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/CorneliusEA/Dashboard"
```

## Connecting live data

Each API route has a `// TODO` comment where you replace the hardcoded values with your real data source:

- **Satellite data** → Sentinel-2 / Google Earth Engine API
- **GPS/field data** → COCABO field app / Google Sheets
- **Financial data** → Internal spreadsheet / database
- **Biodiversity** → Acoustic monitoring platform
