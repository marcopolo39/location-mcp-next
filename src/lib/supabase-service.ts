import { getSupabaseAdmin } from "./supabase-admin";
import type { UserLocation, ApiKey, ApiKeyWithSecret } from "./types";
import { createHash, randomUUID } from "crypto";

/**
 * Hash an API key using SHA-256
 */
function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Supabase service for server-side database operations
 */

/**
 * Store or update a user's location
 */
export async function setLocation(
  userId: string,
  latitude: number,
  longitude: number
): Promise<UserLocation> {
  const supabase = getSupabaseAdmin();
  const location: UserLocation = {
    userId,
    latitude,
    longitude,
    timestamp: new Date().toISOString(),
  };

  const { error } = await supabase.from("locations").upsert({
    user_id: userId,
    latitude,
    longitude,
    timestamp: location.timestamp,
  });

  if (error) {
    throw new Error(`Failed to set location: ${error.message}`);
  }

  return location;
}

/**
 * Get a user's location
 */
export async function getLocation(userId: string): Promise<UserLocation | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get location: ${error.message}`);
  }

  return {
    userId: data.user_id,
    latitude: data.latitude,
    longitude: data.longitude,
    timestamp: data.timestamp,
  };
}

/**
 * Delete a user's location
 */
export async function removeLocation(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from("locations")
    .delete({ count: "exact" })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to remove location: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

const MAX_KEYS_PER_USER = 3;

/**
 * Create a new API key for a user
 * Returns the full raw key (only shown once) along with stored metadata
 * Limited to MAX_KEYS_PER_USER keys per user
 */
export async function createApiKey(userId: string, name?: string): Promise<ApiKeyWithSecret> {
  const supabase = getSupabaseAdmin();
  
  // Check if user has reached the key limit
  const { count, error: countError } = await supabase
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  
  if (countError) {
    throw new Error(`Failed to check key count: ${countError.message}`);
  }
  
  if ((count ?? 0) >= MAX_KEYS_PER_USER) {
    throw new Error(`Maximum of ${MAX_KEYS_PER_USER} API keys allowed. Please delete an existing key first.`);
  }
  
  // Generate a new random UUID as the raw key
  const rawKey = randomUUID();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 8);

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: name || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  return {
    id: data.id,
    keyPrefix: data.key_prefix,
    userId: data.user_id,
    createdAt: data.created_at,
    name: data.name ?? undefined,
    rawKey, // Only returned at creation time
  };
}

/**
 * Validate an API key and return the associated userId
 */
export async function validateApiKey(key: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const keyHash = hashApiKey(key);
  
  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", keyHash)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to validate API key: ${error.message}`);
  }

  return data.user_id;
}

/**
 * Get all API keys for a user
 * Note: Only returns key prefixes, not the full keys (they are never stored)
 */
export async function getKeysForUser(userId: string): Promise<ApiKey[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, key_prefix, user_id, created_at, name")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to get keys for user: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id,
    keyPrefix: row.key_prefix,
    userId: row.user_id,
    createdAt: row.created_at,
    name: row.name ?? undefined,
  }));
}

/**
 * Delete an API key by its id
 */
export async function deleteApiKey(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from("api_keys")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete API key: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

