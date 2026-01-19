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
 */
export interface ApiKey {
  key: string;
  userId: string;
  createdAt: string;
  name?: string;
}
