import { getAdminDb } from "./firebase-admin";
import type { UserLocation, ApiKey } from "./types";

/**
 * Firebase service for server-side Firestore operations
 * Replaces the in-memory store.ts
 */

// Collection names
const LOCATIONS_COLLECTION = "locations";
const API_KEYS_COLLECTION = "apiKeys";

/**
 * Store or update a user's location in Firestore
 */
export async function setLocation(
  userId: string,
  latitude: number,
  longitude: number
): Promise<UserLocation> {
  const db = getAdminDb();
  const location: UserLocation = {
    userId,
    latitude,
    longitude,
    timestamp: new Date().toISOString(),
  };

  await db.collection(LOCATIONS_COLLECTION).doc(userId).set(location);
  return location;
}

/**
 * Get a user's location from Firestore
 */
export async function getLocation(userId: string): Promise<UserLocation | null> {
  const db = getAdminDb();
  const doc = await db.collection(LOCATIONS_COLLECTION).doc(userId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data() as UserLocation;
}

/**
 * Delete a user's location from Firestore
 */
export async function removeLocation(userId: string): Promise<boolean> {
  const db = getAdminDb();
  const docRef = db.collection(LOCATIONS_COLLECTION).doc(userId);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    return false;
  }
  
  await docRef.delete();
  return true;
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(userId: string, name?: string): Promise<ApiKey> {
  const db = getAdminDb();
  const key = crypto.randomUUID();
  const apiKey: ApiKey = {
    key,
    userId,
    createdAt: new Date().toISOString(),
    name,
  };

  await db.collection(API_KEYS_COLLECTION).doc(key).set(apiKey);
  return apiKey;
}

/**
 * Validate an API key and return the associated userId
 */
export async function validateApiKey(key: string): Promise<string | null> {
  const db = getAdminDb();
  const doc = await db.collection(API_KEYS_COLLECTION).doc(key).get();
  
  if (!doc.exists) {
    return null;
  }
  
  const apiKey = doc.data() as ApiKey;
  return apiKey.userId;
}

/**
 * Get all API keys for a user
 */
export async function getKeysForUser(userId: string): Promise<ApiKey[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(API_KEYS_COLLECTION)
    .where("userId", "==", userId)
    .get();
  
  return snapshot.docs.map(doc => doc.data() as ApiKey);
}

/**
 * Delete an API key
 */
export async function deleteApiKey(key: string): Promise<boolean> {
  const db = getAdminDb();
  const docRef = db.collection(API_KEYS_COLLECTION).doc(key);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    return false;
  }
  
  await docRef.delete();
  return true;
}
