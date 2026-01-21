/**
 * Type definitions for the location MCP server
 */

export interface UserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

/**
 * Payload sent by the React Native client to update location
 */
export interface LocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
}

/**
 * API Key for authentication
 * Note: The full key is only returned once at creation time
 */
export interface ApiKey {
  id: string;
  keyPrefix: string; // First 8 chars of the key for display
  userId: string;
  createdAt: string;
  name?: string;
}

/**
 * API Key with the full raw key (only returned at creation)
 */
export interface ApiKeyWithSecret extends ApiKey {
  rawKey: string; // The full key - only available at creation
}
