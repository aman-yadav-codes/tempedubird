export type AppDeploymentMode = "all" | "platform" | "institution";

const APP_DEPLOYMENT_MODES = new Set<AppDeploymentMode>([
  "all",
  "platform",
  "institution",
]);

function normalizeAppMode(value: string | undefined | null): AppDeploymentMode {
  const mode = String(value ?? "").trim().toLowerCase();
  if (mode === "hybrid") return "all";
  return APP_DEPLOYMENT_MODES.has(mode as AppDeploymentMode)
    ? mode as AppDeploymentMode
    : "all";
}

export function getAppMode(): AppDeploymentMode {
  return normalizeAppMode(
    process.env.NEXT_PUBLIC_APP_TYPE ??
      process.env.APP_TYPE ??
      process.env.NEXT_PUBLIC_APP_MODE ??
      process.env.APP_MODE,
  );
}

export function getAppModeForHost(_host?: string | null): AppDeploymentMode {
  void _host;
  return getAppMode();
}

export function isPlatformDeployment() {
  return getAppMode() === "platform";
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
