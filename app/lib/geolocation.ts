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

/**
 * Strictly requests and enforces browser geolocation sharing.
 * If user denies permission, disables GPS, or times out, this throws an error.
 * A task CANNOT be started without valid coordinates.
 */
export async function requireBrowserLocation(timeoutMs = 10000): Promise<BrowserLocation> {
  if (typeof window === "undefined" || !navigator?.geolocation) {
    throw new Error("Geolocation is not supported by your browser. Location sharing is mandatory to start a task.");
  }

  return new Promise<BrowserLocation>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Location request timed out. Please ensure GPS/location services are turned on."));
      }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
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
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        let msg = "Location permission is required to start a task. Please enable and allow GPS/location access in your browser settings.";
        if (err.code === 1) { // PERMISSION_DENIED
          msg = "Location permission was denied. You cannot start a task without sharing your location. Please allow location access in your browser.";
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          msg = "Location unavailable. Please make sure location / GPS is enabled on your device.";
        } else if (err.code === 3) { // TIMEOUT
          msg = "Location request timed out. Please check your GPS and try again.";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  });
}
