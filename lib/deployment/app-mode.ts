import { getFrontendConfig } from "@/lib/config/frontend-config";

export type AppDeploymentMode = "all" | "platform" | "institution" | "platform_admin";

const APP_DEPLOYMENT_MODES = new Set<AppDeploymentMode>([
  "all",
  "platform",
  "institution",
  "platform_admin",
]);

function normalizeAppMode(value: string | undefined | null): AppDeploymentMode {
  const mode = String(value ?? "").trim().toLowerCase();
  if (mode === "hybrid") return "all";
  if (mode === "platform_admin") return "platform_admin";
  return APP_DEPLOYMENT_MODES.has(mode as AppDeploymentMode)
    ? (mode as AppDeploymentMode)
    : "all";
}

export function getAppMode(): AppDeploymentMode {
  const config = getFrontendConfig();
  if (config.isValid) {
    if (config.mode === "platform_admin") return "platform_admin";
    if (config.mode === "institution") return "institution";
    if (config.mode === "all") return "all";
  }
  return normalizeAppMode(
    process.env.APP_MODE ??
      process.env.NEXT_PUBLIC_APP_MODE ??
      process.env.APP_TYPE ??
      process.env.NEXT_PUBLIC_APP_TYPE,
  );
}

export function getAppModeForHost(_host?: string | null): AppDeploymentMode {
  void _host;
  return getAppMode();
}

export function isPlatformDeployment() {
  const mode = getAppMode();
  return mode === "platform" || mode === "platform_admin";
}

export function isInstitutionDeployment() {
  return getAppMode() === "institution";
}

export function isAllDeployment() {
  return getAppMode() === "all";
}

export function getPlatformAdminUrl() {
  return (
    process.env.NEXT_PUBLIC_PLATFORM_ADMIN_URL ??
    process.env.PLATFORM_ADMIN_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "/admin"
  );
}
