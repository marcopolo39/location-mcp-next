import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, setLocation, getLocation } from "@/lib/supabase-service";
import type { LocationUpdate } from "@/lib/types";

/**
 * POST /api/location - Update user location
 * Requires X-API-Key header
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "Unauthorized", message: "X-API-Key header required" },
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

  try {
    const body = await request.json() as Partial<LocationUpdate>;
    const { latitude, longitude } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Invalid request", message: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: "Invalid latitude", message: "Latitude must be between -90 and 90" },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: "Invalid longitude", message: "Longitude must be between -180 and 180" },
        { status: 400 }
      );
    }

    const location = await setLocation(userId, latitude, longitude);

    console.log(`[API] Location updated for user: ${userId}`);
    return NextResponse.json({ success: true, location });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}

/**
 * GET /api/location - Get user's own location
 * Requires X-API-Key header
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "Unauthorized", message: "X-API-Key header required" },
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

  const location = await getLocation(userId);
  
  if (!location) {
    return NextResponse.json(
      { error: "Not found", message: "No location data available" },
      { status: 404 }
    );
  }

  return NextResponse.json(location);
}
