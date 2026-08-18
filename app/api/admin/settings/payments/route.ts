import { NextResponse } from "next/server";

import { getAuthenticatedUser, requirePermission } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { hasPermission, isPlatformAdminUser, type PermissionUser } from "@/lib/auth/permissions";

type PaymentScope = "platform" | "institution";

type PaymentSettingsRow = {
  id: number;
  scope_type: PaymentScope;
  institution_id: number | null;
  upi_id: string | null;
  qr_image_url: string | null;
  qr_image_public_id: string | null;
  qr_image_resource_type: string | null;
  is_active: boolean;
  updated_at: string;
};

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function parsePositiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getRequestedInstitutionId(req: Request) {
  return parsePositiveInteger(new URL(req.url).searchParams.get("institutionId"));
}

function getFirstPermittedInstitutionId(user: PermissionUser, permission: string) {
  return user.memberships?.find((membership) =>
    hasPermission(user, permission, { institutionId: membership.institution_id })
  )?.institution_id ?? null;
}

function resolveAccess(user: PermissionUser, action: "view" | "edit", requestedInstitutionId?: number | null) {
  const permission = `settings.payments.${action}`;
  const hasPlatformAccess = isPlatformAdminUser(user);

  if (hasPlatformAccess && !requestedInstitutionId) {
    return { scope: "platform" as const, institutionId: null };
  }

  if (requestedInstitutionId) {
    if (hasPlatformAccess || hasPermission(user, permission, { institutionId: requestedInstitutionId })) {
      return { scope: "institution" as const, institutionId: requestedInstitutionId };
    }
    throw new Error("Forbidden: Admin access required");
  }

  const institutionId = getFirstPermittedInstitutionId(user, permission);
  if (institutionId) return { scope: "institution" as const, institutionId };

  throw new Error("Forbidden: Admin access required");
}

async function ensurePaymentSettingsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_settings (
      id SERIAL PRIMARY KEY,
      scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'institution')),
      institution_id INTEGER NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      upi_id TEXT NULL,
      qr_image_url TEXT NULL,
      qr_image_public_id TEXT NULL,
      qr_image_resource_type TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS payment_settings_platform_unique
      ON payment_settings(scope_type)
      WHERE scope_type = 'platform' AND institution_id IS NULL
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS payment_settings_institution_unique
      ON payment_settings(scope_type, institution_id)
      WHERE scope_type = 'institution' AND institution_id IS NOT NULL
  `);
}

async function getPaymentSettings(scope: PaymentScope, institutionId: number | null) {
  await ensurePaymentSettingsTable();
  const result = await db.query<PaymentSettingsRow>(
    `
      SELECT
        id,
        scope_type,
        institution_id,
        upi_id,
        qr_image_url,
        qr_image_public_id,
        qr_image_resource_type,
        is_active,
        updated_at
      FROM payment_settings
      WHERE scope_type = $1
        AND (
          ($1 = 'platform' AND institution_id IS NULL)
          OR ($1 = 'institution' AND institution_id = $2)
        )
      LIMIT 1
    `,
    [scope, institutionId],
  );

  return result.rows[0] ?? {
    id: 0,
    scope_type: scope,
    institution_id: institutionId,
    upi_id: null,
    qr_image_url: null,
    qr_image_public_id: null,
    qr_image_resource_type: null,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const access = resolveAccess(user, "view", getRequestedInstitutionId(req));
    const data = await getPaymentSettings(access.scope, access.institutionId);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const requestedInstitutionId = parsePositiveInteger(body.institutionId);
    const currentUser = await requirePermission(
      req,
      "settings.payments.edit",
      requestedInstitutionId,
    );
    const access = resolveAccess(currentUser, "edit", requestedInstitutionId);
    await ensurePaymentSettingsTable();

    const upiId = typeof body.upi_id === "string" ? body.upi_id.trim() : "";
    const qrImageUrl = typeof body.qr_image_url === "string" ? body.qr_image_url.trim() : "";
    const qrImagePublicId = typeof body.qr_image_public_id === "string" ? body.qr_image_public_id.trim() : "";
    const qrImageResourceType = typeof body.qr_image_resource_type === "string" ? body.qr_image_resource_type.trim() : "";

    if (!upiId && !qrImageUrl) {
      return NextResponse.json(
        { error: "Add a UPI ID or upload a QR code image." },
        { status: 400 },
      );
    }

    if (access.scope === "institution") {
      const institutionResult = await db.query<PaymentSettingsRow>(
        `
          INSERT INTO payment_settings (
            scope_type,
            institution_id,
            upi_id,
            qr_image_url,
            qr_image_public_id,
            qr_image_resource_type,
            is_active,
            created_by,
            updated_by,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, CURRENT_TIMESTAMP)
          ON CONFLICT (scope_type, institution_id)
            WHERE scope_type = 'institution' AND institution_id IS NOT NULL
          DO UPDATE SET
            upi_id = EXCLUDED.upi_id,
            qr_image_url = EXCLUDED.qr_image_url,
            qr_image_public_id = EXCLUDED.qr_image_public_id,
            qr_image_resource_type = EXCLUDED.qr_image_resource_type,
            is_active = EXCLUDED.is_active,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP
          RETURNING
            id,
            scope_type,
            institution_id,
            upi_id,
            qr_image_url,
            qr_image_public_id,
            qr_image_resource_type,
            is_active,
            updated_at
        `,
        [
          access.scope,
          access.institutionId,
          upiId || null,
          qrImageUrl || null,
          qrImagePublicId || null,
          qrImageResourceType || null,
          body.is_active !== false,
          currentUser.id,
        ],
      );
      return NextResponse.json({ data: institutionResult.rows[0] });
    }

    const result = await db.query<PaymentSettingsRow>(
      `
        INSERT INTO payment_settings (
          scope_type,
          institution_id,
          upi_id,
          qr_image_url,
          qr_image_public_id,
          qr_image_resource_type,
          is_active,
          created_by,
          updated_by,
          updated_at
        )
        VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (scope_type)
          WHERE scope_type = 'platform' AND institution_id IS NULL
        DO UPDATE SET
          upi_id = EXCLUDED.upi_id,
          qr_image_url = EXCLUDED.qr_image_url,
          qr_image_public_id = EXCLUDED.qr_image_public_id,
          qr_image_resource_type = EXCLUDED.qr_image_resource_type,
          is_active = EXCLUDED.is_active,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
        RETURNING
          id,
          scope_type,
          institution_id,
          upi_id,
          qr_image_url,
          qr_image_public_id,
          qr_image_resource_type,
          is_active,
          updated_at
      `,
      [
        access.scope,
        upiId || null,
        qrImageUrl || null,
        qrImagePublicId || null,
        qrImageResourceType || null,
        body.is_active !== false,
        currentUser.id,
      ],
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
