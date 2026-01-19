import { NextRequest, NextResponse } from "next/server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "@/lib/mcp-server";
import { validateApiKey } from "@/lib/firebase-service";

// Store active sessions per user
const sessions = new Map<string, { transport: StreamableHTTPServerTransport }>();

/**
 * Handle MCP protocol requests
 * Supports GET, POST, DELETE methods as per Streamable HTTP transport spec
 */
async function handleMcpRequest(request: NextRequest) {
  // Get API key from header or query parameter
  const apiKey = request.headers.get("x-api-key") || 
                 request.nextUrl.searchParams.get("apiKey");
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "Unauthorized", message: "API key required. Pass as X-API-Key header or apiKey query parameter." },
      { status: 401 }
    );
  }

  const userId = await validateApiKey(apiKey);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid API key" },
      { status: 401 }
    );
  }

  console.log(`[MCP] ${request.method} request for user: ${userId}`);

  // Get or create session for this user
  let session = sessions.get(userId);
  
  if (!session) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    const server = createMcpServer(userId);
    server.connect(transport);
    
    session = { transport };
    sessions.set(userId, session);
    console.log(`[MCP] New session created for user: ${userId}`);
  }

  try {
    // Convert Next.js request to Node.js-like request for the transport
    const body = request.method === "POST" ? await request.json() : undefined;
    
    // Create a custom response handler
    return new Promise<NextResponse>((resolve) => {
      const headers: Record<string, string> = {};
      let statusCode = 200;
      let responseBody = "";
      let isSSE = false;
      let sseController: ReadableStreamDefaultController<Uint8Array> | null = null;

      // Mock response object for the transport
      const mockRes = {
        setHeader: (name: string, value: string) => {
          headers[name.toLowerCase()] = value;
          if (name.toLowerCase() === "content-type" && value.includes("text/event-stream")) {
            isSSE = true;
          }
        },
        writeHead: (code: number, hdrs?: Record<string, string>) => {
          statusCode = code;
          if (hdrs) {
            Object.entries(hdrs).forEach(([k, v]) => {
              headers[k.toLowerCase()] = v;
            });
          }
        },
        write: (chunk: string) => {
          if (isSSE && sseController) {
            sseController.enqueue(new TextEncoder().encode(chunk));
          } else {
            responseBody += chunk;
          }
        },
        end: (chunk?: string) => {
          if (chunk) responseBody += chunk;
          if (isSSE && sseController) {
            sseController.close();
          } else {
            resolve(new NextResponse(responseBody, {
              status: statusCode,
              headers,
            }));
          }
        },
        headersSent: false,
      };

      // Mock request object
      const mockReq = {
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body,
        query: Object.fromEntries(request.nextUrl.searchParams.entries()),
      };

      if (request.method === "GET") {
        // SSE stream for GET requests
        const stream = new ReadableStream({
          start(controller) {
            sseController = controller;
            session!.transport.handleRequest(mockReq as never, mockRes as never, body);
          },
        });
        
        resolve(new NextResponse(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }));
      } else {
        session!.transport.handleRequest(mockReq as never, mockRes as never, body);
      }
    });
  } catch (error) {
    console.error("[MCP] Error handling request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
