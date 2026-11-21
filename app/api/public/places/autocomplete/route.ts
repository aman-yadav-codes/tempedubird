import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  "AIzaSyAtKsoYaqKOXMV00f9qLDAgbYYevlxAGsQ";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const input = url.searchParams.get("input") || url.searchParams.get("q") || "";
    const placeId = url.searchParams.get("place_id");
    const country = url.searchParams.get("country");

    // 1. Place Details Lookup
    if (action === "details" && placeId) {
      if (GOOGLE_API_KEY) {
        try {
          const detailRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
              placeId
            )}&fields=address_components,formatted_address,geometry,url&key=${GOOGLE_API_KEY}`
          );
          const detailData = await detailRes.json();
          if (detailData.status === "OK" && detailData.result) {
            const res = detailData.result;
            const components: any[] = res.address_components || [];

            let city = "";
            let state = "";
            let pincode = "";
            let countryName = "";

            for (const comp of components) {
              const types: string[] = comp.types || [];
              if (types.includes("locality")) {
                city = comp.long_name;
              } else if (!city && (types.includes("administrative_area_level_2") || types.includes("administrative_area_level_3"))) {
                city = comp.long_name;
              }
              if (types.includes("administrative_area_level_1")) {
                state = comp.long_name;
              }
              if (types.includes("postal_code")) {
                pincode = comp.long_name;
              }
              if (types.includes("country")) {
                countryName = comp.long_name;
              }
            }

            const lat = res.geometry?.location?.lat;
            const lng = res.geometry?.location?.lng;
            const mapUrl =
              res.url ||
              (lat && lng
                ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    res.formatted_address || ""
                  )}`);

            return NextResponse.json({
              success: true,
              formatted_address: res.formatted_address || "",
              city,
              state,
              pincode,
              country: countryName,
              lat,
              lng,
              map_url: mapUrl,
            });
          }
        } catch (err) {
          console.error("[Google Places Details Error]", err);
        }
      }

      return NextResponse.json({ success: false, error: "Details unavailable" }, { status: 404 });
    }

    // 2. Autocomplete Suggestions
    if (!input || input.trim().length === 0) {
      return NextResponse.json({ predictions: [] });
    }

    const trimmedInput = input.trim();

    // A. Primary: Google Places Autocomplete API
    if (GOOGLE_API_KEY) {
      try {
        const countryFilter = country && country.toLowerCase() !== "all" ? `&components=country:${country.toLowerCase()}` : "";
        const googleRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            trimmedInput
          )}${countryFilter}&key=${GOOGLE_API_KEY}`
        );
        const googleData = await googleRes.json();

        if (googleData.status === "OK" && Array.isArray(googleData.predictions) && googleData.predictions.length > 0) {
          const predictions = googleData.predictions.map((p: any) => ({
            id: p.place_id,
            place_id: p.place_id,
            name: p.structured_formatting?.main_text || p.description,
            description: p.description,
            secondary_text: p.structured_formatting?.secondary_text || "",
            source: "google",
          }));

          return NextResponse.json({ predictions });
        }
      } catch (googleErr) {
        console.warn("[Google Places Autocomplete Error, falling back to Nominatim]", googleErr);
      }
    }

    // B. Fallback: OpenStreetMap Nominatim
    try {
      const countryFilter = country && country.toLowerCase() !== "all" ? `&countrycodes=${country.toLowerCase()}` : "";
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6${countryFilter}&q=${encodeURIComponent(
          trimmedInput
        )}`,
        {
          headers: {
            "User-Agent": "EduBirdPlatform/1.0",
          },
        }
      );
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        const predictions = nomData.map((item: any) => {
          const addr = item.address || {};
          return {
            id: String(item.place_id),
            place_id: String(item.place_id),
            name: item.name || addr.road || addr.suburb || addr.city || trimmedInput,
            description: item.display_name,
            secondary_text: [addr.city || addr.town || addr.village, addr.state, addr.postcode]
              .filter(Boolean)
              .join(", "),
            city: addr.city || addr.town || addr.village || addr.county || "",
            state: addr.state || "",
            pincode: addr.postcode || "",
            lat: item.lat,
            lng: item.lon,
            map_url: `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`,
            source: "nominatim",
          };
        });

        return NextResponse.json({ predictions });
      }
    } catch (nomErr) {
      console.error("[Nominatim Search Error]", nomErr);
    }

    return NextResponse.json({ predictions: [] });
  } catch (error: any) {
    console.error("[Places Autocomplete Route Error]", error);
    return NextResponse.json({ error: error?.message || "Places lookup failed", predictions: [] }, { status: 500 });
  }
}
