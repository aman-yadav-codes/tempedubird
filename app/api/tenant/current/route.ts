import { NextResponse } from "next/server";

import { getAppModeForHost } from "@/lib/deployment/app-mode";
import { db } from "@/lib/db/db";
import { getInstitutionTenantByHost, getRequestHost, normalizeTenantHost } from "@/lib/tenancy/institution-domain";

export async function GET(req: Request) {
  const host = getRequestHost(req);
  const tenant = await getInstitutionTenantByHost(db, host);

  return NextResponse.json({
    appType: getAppModeForHost(host),
    host: normalizeTenantHost(host),
    tenant,
  });
}
