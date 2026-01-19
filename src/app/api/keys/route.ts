import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { createApiKey } from "@/lib/firebase-service";

/**
 * POST /api/keys - Generate a new API key
 * Requires Firebase Auth token in Authorization header
 * Body: { name?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Get Firebase ID token from Authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authorization header with Bearer token required" },
        { status: 401 }
      );
    }

    const idToken = authHeader.slice(7);
    
    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    
    // Parse request body
    const body = await request.json();
    const { name } = body;

    const apiKey = await createApiKey(userId, name);

    console.log(`[API] New API key created for user: ${userId}`);
    return NextResponse.json({ 
      success: true, 
      apiKey: {
        key: apiKey.key,
        userId: apiKey.userId,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}
