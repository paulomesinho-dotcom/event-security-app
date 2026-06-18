import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length > 0) return getApps()[0];

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error(
      "Firebase Admin SDK não configurado. Adiciona FIREBASE_ADMIN_PRIVATE_KEY e FIREBASE_ADMIN_CLIENT_EMAIL ao .env.local"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminMessaging() {
  const app = initAdmin();
  return getMessaging(app);
}

export function getAdminFirestore() {
  const app = initAdmin();
  return getFirestore(app);
}
