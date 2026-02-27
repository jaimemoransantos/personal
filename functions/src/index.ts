import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { admin } from "./config/firebase-admin";
import app from "./app";

// Inicializar Firebase Admin

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({ maxInstances: 10 });

// Exportar la API
export const api = onRequest(app);
