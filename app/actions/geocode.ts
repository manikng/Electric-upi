"use server";

export interface GeocodeResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  error?: string;
}

/**
 * Geocodes an address or city name into coordinates [latitude, longitude].
 * Biases results toward Delhi, India (lat: 28.6139, lon: 77.2090) to prioritize local results.
 */
export async function getCoordinates(locationText: string): Promise<GeocodeResult> {
  if (!locationText || !locationText.trim()) {
    return { success: false, error: "Location query is required" };
  }

  try {
    // Append India to query if not already present to narrow down bounds safely
    let queryText = locationText.trim();
    if (!queryText.toLowerCase().includes("india")) {
      queryText += ", India";
    }

    const query = encodeURIComponent(queryText);
    // Bias results toward Delhi NCR (lat: 28.6139, lon: 77.2090)
    const url = `https://photon.komoot.io/api/?q=${query}&limit=1&lat=28.6139&lon=77.2090`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "ElectricUPI_NextJS_App_v1",
      },
      next: { revalidate: 3600 }, // Cache response for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Photon API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [longitude, latitude] = feature.geometry.coordinates; // Photon returns [lon, lat]
      
      // Build a user-friendly display name
      const props = feature.properties;
      const parts = [
        props.name,
        props.district,
        props.city || props.town || props.village,
        props.state,
      ].filter(Boolean);

      const formattedAddress = parts.length > 0 ? parts.join(", ") : locationText;

      return {
        success: true,
        latitude,
        longitude,
        formattedAddress,
      };
    }

    return { success: false, error: "No coordinates found for the provided location" };
  } catch (error: any) {
    console.error("Geocoding server action error:", error);
    return {
      success: false,
      error: error.message || "Failed to geocode location address",
    };
  }
}
