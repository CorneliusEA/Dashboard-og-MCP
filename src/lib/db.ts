import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// On Cloud Run: uses the service account automatically (no config needed)
// Local dev: run `gcloud auth application-default login`
if (!getApps().length) {
  initializeApp()
}

export const db = getFirestore()
