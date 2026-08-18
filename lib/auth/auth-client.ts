// lib/auth-client.ts
// Client-safe auth utilities

export function isTokenExpired(token: string | null) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // payload.exp is in seconds
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true; // invalid token format
  }
}
