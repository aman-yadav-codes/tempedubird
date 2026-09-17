export interface BrowserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
  source?: "browser_geolocation" | "ip_fallback" | "unavailable";
  address?: string;
  error?: string;
}

/**
 * Automatically captures the user's browser geolocation.
 * Falls back gracefully if permission is denied or unsupported.
 */
export async function captureBrowserLocation(timeoutMs = 6000): Promise<BrowserLocation> {
  if (typeof window === "undefined" || !navigator?.geolocation) {
    return {
      latitude: 0,
      longitude: 0,
      source: "unavailable",
      error: "Geolocation not supported by this browser",
      timestamp: new Date().toISOString(),
    };
  }

  return new Promise<BrowserLocation>((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({
          latitude: 0,
          longitude: 0,
          source: "unavailable",
          error: "Location request timed out",
          timestamp: new Date().toISOString(),
        });
      }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy || 0),
          source: "browser_geolocation",
          timestamp: new Date(position.timestamp || Date.now()).toISOString(),
        });
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        resolve({
          latitude: 0,
          longitude: 0,
          source: "unavailable",
          error: err.message || "Geolocation permission denied",
          timestamp: new Date().toISOString(),
        });
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000,
      }
    );
  });
}
