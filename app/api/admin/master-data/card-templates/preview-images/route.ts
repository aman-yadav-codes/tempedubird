import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";

const MAX_URLS = 20;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function isPrivateAddress(address: string) {
  if (address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:")) {
    return true;
  }
  if (!address.includes(".")) return false;
  const parts = address.split(".").map(Number);
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

async function assertSafeUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Only HTTPS image URLs are allowed");
  if (url.username || url.password) throw new Error("Image URLs cannot include credentials");

  if (isIP(url.hostname)) {
    if (isPrivateAddress(url.hostname)) throw new Error("Private image URLs are not allowed");
    return url;
  }

  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private image URLs are not allowed");
  }
  return url;
}

async function fetchImageDataUrl(value: string) {
  let url = await assertSafeUrl(value);

  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*",
        "User-Agent": "EduBird-Template-Preview/1.0",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === 3) throw new Error("Image redirected too many times");
      url = await assertSafeUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Image server returned ${response.status}`);

    const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!contentType.startsWith("image/")) throw new Error("URL did not return an image");

    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_IMAGE_BYTES) throw new Error("Image must be 5MB or smaller");

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image must be 5MB or smaller");
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  }

  throw new Error("Image could not be loaded");
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const urls: string[] = Array.isArray(body.urls)
      ? Array.from(
          new Set<string>(
            body.urls.map((value: unknown) => String(value).trim()).filter(Boolean)
          )
        )
      : [];

    if (!urls.length) return NextResponse.json({ data: {} });
    if (urls.length > MAX_URLS) {
      return NextResponse.json({ error: `A maximum of ${MAX_URLS} images can be loaded` }, { status: 400 });
    }

    const entries = await Promise.all(
      urls.map(async (url) => [url, await fetchImageDataUrl(url)] as const)
    );
    return NextResponse.json({ data: Object.fromEntries(entries) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image preview failed";
    const status =
      message === "Forbidden: Admin access required" ? 403 :
      message === "Unauthorized" || message === "User not found" ? 401 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}
