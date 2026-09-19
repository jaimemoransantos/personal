import * as admin from "firebase-admin";

const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "personal-67927",
    // Requerido para admin.storage().bucket() sin argumentos
    // (mismo bucket que VITE_FIREBASE_STORAGE_BUCKET en el front).
    storageBucket: "personal-67927.firebasestorage.app",
  });

  if (isEmulator) {
    admin.firestore().settings({
      host: "127.0.0.1:8081",
      ssl: false,
    });

    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  }
}

export const db = admin.firestore();

export { admin };
