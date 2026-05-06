# COCABO ES Dashboard

EarthSurveillance – COCABO Natural Capital Monitor  
1,438 Ngöbe + Naso smallholder farmers · 4,394 ha · Bocas del Toro, Panama

## Deployment

Push to `main` → GitHub Actions bygger automatisk et Docker image og deployer til **Google Cloud Run**.

### Første opsætning – Google Cloud

```bash
# 1. Opret Artifact Registry repository
gcloud artifacts repositories create cocabo-dashboard \
  --repository-format=docker \
  --location=europe-west1

# 2. Opret en service account til GitHub Actions
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Deployer"

# 3. Tildel nødvendige rettigheder
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# 4. Opsæt Workload Identity Federation (anbefalet over service account keys)
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Actions Pool"
```

### GitHub Secrets der skal sættes

| Secret | Beskrivelse |
|--------|-------------|
| `GCP_PROJECT_ID` | Dit Google Cloud projekt-ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider resource name |
| `GCP_SERVICE_ACCOUNT` | Service account email til deployment |

### Lokal test

```bash
docker build -t cocabo-dashboard .
docker run -p 8080:8080 cocabo-dashboard
# Åbn http://localhost:8080
```
