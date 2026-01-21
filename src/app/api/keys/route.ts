import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createApiKey, getKeysForUser, deleteApiKey } from "@/lib/supabase-service";

/**
 * GET /api/keys - Get all API keys for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authorization header with Bearer token required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7);
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const keys = await getKeysForUser(user.id);
    return NextResponse.json({ success: true, keys });
  } catch (error) {
    console.error("[API] Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/keys - Generate a new API key
 * Requires Supabase Auth token in Authorization header
 * Body: { name?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authorization header with Bearer token required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7);
    
    // Verify the Supabase access token
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const userId = user.id;
    
    // Parse request body
    let name: string | undefined;
    try {
      const body = await request.json();
      name = body.name;
    } catch {
      // Empty body is fine, name is optional
    }

    const apiKey = await createApiKey(userId, name);

    console.log(`[API] New API key created for user: ${userId}`);
    return NextResponse.json({ 
      success: true, 
      apiKey: {
        id: apiKey.id,
        key: apiKey.rawKey, // Return the raw key to the UI (only shown once)
        keyPrefix: apiKey.keyPrefix,
        userId: apiKey.userId,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
      }
    });
  } catch (error) {
    console.error("[API] Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/keys - Delete an API key
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authorization header with Bearer token required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7);
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Key ID is required" },
        { status: 400 }
      );
    }

    // Verify the key belongs to the user before deleting
    const userKeys = await getKeysForUser(user.id);
    const keyToDelete = userKeys.find(k => k.id === id);
    
    if (!keyToDelete) {
      return NextResponse.json(
        { error: "Not Found", message: "API key not found or does not belong to you" },
        { status: 404 }
      );
    }

    await deleteApiKey(id);
    console.log(`[API] API key deleted for user: ${user.id}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
