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

// Connect to emulators only in development
const useEmulators =
  import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true";

// Module-level flag to avoid connecting more than once
let emulatorsConnected = false;

if (useEmulators && !emulatorsConnected) {
  try {
    connectFirestoreEmulator(db, "localhost", 8080);
    connectAuthEmulator(auth, "http://localhost:9099", {
      disableWarnings: true,
    });
    connectFunctionsEmulator(functions, "localhost", 5001);

    emulatorsConnected = true;

    console.log("🔥 Firebase emulators connected");
    console.log("  - Firestore: localhost:8080");
    console.log("  - Auth: localhost:9099");
    console.log("  - Functions: localhost:5001");
  } catch (error) {
    console.warn(
      "Error connecting to emulators (they may already be connected):",
      error
    );
  }
}

export default app;
