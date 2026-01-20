import { getSupabaseAdmin } from "./supabase-admin";
import type { UserLocation, ApiKey } from "./types";

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

/**
 * Create a new API key for a user
 */
export async function createApiKey(userId: string, name?: string): Promise<ApiKey> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      name: name || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  return {
    key: data.key,
    userId: data.user_id,
    createdAt: data.created_at,
    name: data.name ?? undefined,
  };
}

/**
 * Validate an API key and return the associated userId
 */
export async function validateApiKey(key: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key", key)
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
 */
export async function getKeysForUser(userId: string): Promise<ApiKey[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to get keys for user: ${error.message}`);
  }

  return data.map((row) => ({
    key: row.key,
    userId: row.user_id,
    createdAt: row.created_at,
    name: row.name ?? undefined,
  }));
}

/**
 * Delete an API key
 */
export async function deleteApiKey(key: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from("api_keys")
    .delete({ count: "exact" })
    .eq("key", key);

  if (error) {
    throw new Error(`Failed to delete API key: ${error.message}`);
  }

  return (count ?? 0) > 0;
}
