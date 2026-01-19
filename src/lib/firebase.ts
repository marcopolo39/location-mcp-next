import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase client-side configuration
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase config is available (might not be during build/prerender)
const isConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId &&
  typeof window !== "undefined" // Only initialize in browser
);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

// Lazy initialize Firebase app
function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (!isConfigured) {
      throw new Error("Firebase is not configured");
    }
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

// Export auth with lazy initialization
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!authInstance) {
      authInstance = getAuth(getFirebaseApp());
    }
    return Reflect.get(authInstance, prop);
  }
});

// Export db with lazy initialization  
export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!dbInstance) {
      dbInstance = getFirestore(getFirebaseApp());
    }
    return Reflect.get(dbInstance, prop);
  }
});

export default app;
