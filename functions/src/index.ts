import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { admin } from "./config/firebase-admin";
import app from "./app";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({ maxInstances: 10 });

export const api = onRequest(app);
