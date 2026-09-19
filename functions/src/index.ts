import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import "./config/firebase-admin"; // única inicialización de Admin SDK
import app from "./app";

setGlobalOptions({ maxInstances: 10 });

export const api = onRequest(app);
