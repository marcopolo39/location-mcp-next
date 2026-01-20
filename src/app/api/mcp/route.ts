import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp-server";
import { validateApiKey } from "@/lib/supabase-service";

// CORS headers helper
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization, MCP-Session-Id, MCP-Protocol-Version, Accept",
    "Access-Control-Expose-Headers": "MCP-Session-Id",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handle MCP protocol requests using Web Standard Streamable HTTP transport
 * Uses stateless mode for serverless compatibility
 */
async function handleMcpRequest(request: NextRequest) {
  // Get API key from header or query parameter (check multiple variations)
  const apiKey = request.headers.get("x-api-key") || 
                 request.headers.get("X-API-Key") ||
                 request.headers.get("authorization")?.replace("Bearer ", "") ||
                 request.nextUrl.searchParams.get("apiKey") ||
                 request.nextUrl.searchParams.get("api_key");
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "Unauthorized", message: "API key required. Pass as X-API-Key header or apiKey query parameter." },
      { 
        status: 401,
        headers: getCorsHeaders()
      }
    );
  }

  const userId = await validateApiKey(apiKey);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid API key" },
      { 
        status: 401,
        headers: getCorsHeaders()
      }
    );
  }

  try {
    // Create a new stateless transport for each request (serverless-compatible)
    const transport = new WebStandardStreamableHTTPServerTransport({
      // Stateless mode - no session ID generation
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    
    // Create and connect the MCP server
    const server = createMcpServer(userId);
    await server.connect(transport);

    // Convert NextRequest to standard Request for the transport
    const webRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? await request.blob() : undefined,
    });

    // Handle the request using the Web Standard transport
    const response = await transport.handleRequest(webRequest);
    
    // Add CORS headers to the response
    const headers = new Headers(response.headers);
    Object.entries(getCorsHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("[MCP] Error handling request:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { 
        status: 500,
        headers: getCorsHeaders()
      }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function POST(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}
