/**
 * Google Reverse Geocoding utility
 * Uses the official Google Maps Services Node.js client
 */

import { Client, ReverseGeocodeResponse, Status } from "@googlemaps/google-maps-services-js";

export interface AddressComponents {
  formattedAddress: string;
  streetNumber?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

// Create a single client instance
const client = new Client({});

/**
 * Reverse geocode GPS coordinates to an address using Google Maps Geocoding API
 * 
 * @param latitude - The latitude coordinate
 * @param longitude - The longitude coordinate
 * @returns Address components or null if geocoding fails
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<AddressComponents | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("[Geocode] GOOGLE_MAPS_API_KEY environment variable not set");
    return null;
  }

  try {
    const response: ReverseGeocodeResponse = await client.reverseGeocode({
      params: {
        latlng: { lat: latitude, lng: longitude },
        key: apiKey,
      },
    });

    if (response.data.status !== Status.OK) {
      console.error(`[Geocode] API error: ${response.data.status} - ${response.data.error_message || "Unknown error"}`);
      return null;
    }

    if (response.data.results.length === 0) {
      console.error("[Geocode] No results found");
      return null;
    }

    const result = response.data.results[0];
    const components = result.address_components;

    // Extract address components by type
    const getComponent = (type: string): string | undefined => {
      const component = components.find((c) => 
        (c.types as string[]).includes(type)
      );
      return component?.long_name;
    };

    return {
      formattedAddress: result.formatted_address,
      streetNumber: getComponent("street_number"),
      street: getComponent("route"),
      city: getComponent("locality") || getComponent("sublocality"),
      state: getComponent("administrative_area_level_1"),
      country: getComponent("country"),
      postalCode: getComponent("postal_code"),
    };
  } catch (error) {
    console.error("[Geocode] Request failed:", error);
    return null;
  }
}
