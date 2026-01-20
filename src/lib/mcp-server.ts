import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLocation } from "./supabase-service";

/**
 * Create and configure an MCP server for a specific user.
 * Each user can only access their own location data.
 * 
 * @param userId - The authenticated user's ID (required for security)
 */
export function createMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "location-mcp",
    version: "1.0.0",
  });

  // ============================================
  // RESOURCES
  // ============================================

  /**
   * Resource: Current user's location
   * URI: location://me
   */
  server.registerResource(
    "my-location",
    "location://me",
    {
      description: "Your current location",
      mimeType: "application/json",
    },
    async () => {
      const location = await getLocation(userId);

      if (!location) {
        return {
          contents: [
            {
              uri: "location://me",
              mimeType: "application/json",
              text: JSON.stringify({
                error: "No location data available",
                message: "Your location has not been shared yet",
              }),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: "location://me",
            mimeType: "application/json",
            text: JSON.stringify(location, null, 2),
          },
        ],
      };
    }
  );

  // ============================================
  // TOOLS
  // ============================================

  /**
   * Tool: Get current user's location
   */
  server.registerTool(
    "get_my_location",
    {
      description: "Get your current location",
    },
    async () => {
      const location = await getLocation(userId);

      if (!location) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Your location has not been shared yet. Please update your location from the mobile app first.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(location, null, 2),
          },
        ],
      };
    }
  );

  /**
   * Tool: Check if location is being shared
   */
  server.registerTool(
    "is_sharing_location",
    {
      description: "Check if you are currently sharing your location",
    },
    async () => {
      const location = await getLocation(userId);
      const isSharing = location !== null;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                isSharing,
                lastUpdated: location?.timestamp || null,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}
