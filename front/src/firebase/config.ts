import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Conectar a emuladores solo en desarrollo
const useEmulators =
  import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true";

// Variable de módulo para evitar conexiones múltiples
let emulatorsConnected = false;

if (useEmulators && !emulatorsConnected) {
  try {
    // Firestore Emulator
    connectFirestoreEmulator(db, "localhost", 8080);

    // Auth Emulator
    connectAuthEmulator(auth, "http://localhost:9099", {
      disableWarnings: true,
    });

    // Functions Emulator
    connectFunctionsEmulator(functions, "localhost", 5001);

    emulatorsConnected = true;

    console.log("🔥 Firebase Emulators conectados");
    console.log("  - Firestore: localhost:8080");
    console.log("  - Auth: localhost:9099");
    console.log("  - Functions: localhost:5001");
  } catch (error) {
    // If there is an error, probably already connected
    console.warn(
      "Error conectando emuladores (puede que ya estén conectados):",
      error
    );
  }
}

export default app;
