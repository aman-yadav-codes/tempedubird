import path from "path";

export const OPENINARY_SUPPORTED_EXTENSIONS = new Set([
  "avif",
  "gif",
  "glb",
  "gltf",
  "heic",
  "heif",
  "jpeg",
  "jpg",
  "mov",
  "mp3",
  "mp4",
  "ogg",
  "png",
  "psd",
  "wav",
  "webm",
  "webp",
]);

export function getOpeninaryConfig() {
  const apiUrl = (process.env.OPENINARY_API_URL || "https://media.143gb.com/api").replace(/\/+$/, "");
  const apiKey = (process.env.OPENINARY_API_KEY || "").trim();
  const folder = (process.env.OPENINARY_UPLOAD_FOLDER || "crmtaskassets").trim();
  const baseUrl = apiUrl.replace(/\/api$/, "");

  return {
    apiUrl,
    apiKey,
    folder,
    baseUrl,
    uploadUrl: apiUrl.endsWith("/upload") ? apiUrl : `${apiUrl}/upload`,
  };
}

export function isOpeninaryConfigured(): boolean {
  const { apiKey } = getOpeninaryConfig();
  return Boolean(apiKey && apiKey.length > 10);
}

export function isMediaSupportedByOpeninary(filename: string, mimeType?: string): boolean {
  const ext = path.extname(filename).toLowerCase().replace(/^\./, "");
  if (OPENINARY_SUPPORTED_EXTENSIONS.has(ext)) return true;

  if (mimeType) {
    const sub = mimeType.split("/")[1]?.toLowerCase();
    if (sub && OPENINARY_SUPPORTED_EXTENSIONS.has(sub)) return true;
  }
  return false;
}

export interface OpeninaryUploadResult {
  url: string;
  fullUrl: string;
  path: string;
  filename: string;
  size?: number;
}

export async function uploadToOpeninary(
  fileData: File | Blob | Buffer | Uint8Array,
  filename: string,
  folderOverride?: string,
  mimeTypeOverride?: string
): Promise<OpeninaryUploadResult> {
  const config = getOpeninaryConfig();
  if (!config.apiKey) {
    throw new Error("OPENINARY_API_KEY is not configured");
  }

  const folder = folderOverride || config.folder;
  const formData = new FormData();

  let blob: Blob;
  if (fileData instanceof Blob) {
    blob = fileData;
  } else if (fileData instanceof Uint8Array || Buffer.isBuffer(fileData)) {
    blob = new Blob([fileData as any], { type: mimeTypeOverride || "application/octet-stream" });
  } else {
    blob = new Blob([fileData], { type: mimeTypeOverride || "application/octet-stream" });
  }

  formData.append("files", blob, filename);
  formData.append("folder", folder);

  const res = await fetch(config.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success || !Array.isArray(json.files) || json.files.length === 0) {
    const errMsg =
      json?.errors?.[0]?.error ||
      json?.message ||
      json?.error ||
      `Openinary upload failed with status ${res.status}`;
    throw new Error(errMsg);
  }

  const uploaded = json.files[0];
  const urlPath = uploaded.url || `/t/${uploaded.path || `${folder}/${filename}`}`;
  const fullUrl = urlPath.startsWith("http") ? urlPath : `${config.baseUrl}${urlPath}`;

  return {
    url: fullUrl,
    fullUrl,
    path: uploaded.path || `${folder}/${filename}`,
    filename: uploaded.filename || filename,
    size: uploaded.size,
  };
}

