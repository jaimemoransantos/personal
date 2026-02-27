import * as admin from "firebase-admin";

const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "personal-67927",
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
