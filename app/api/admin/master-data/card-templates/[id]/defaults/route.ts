import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isInstitutionAdminUser } from "@/lib/auth/permissions";
import {
  AUTO_GENERATE_FIELDS_KEY,
  isCertificateNumberField,
  readAutoGenerateFields,
} from "@/lib/card-templates/institution-defaults";
import { db } from "@/lib/db/db";

type Context = { params: Promise<{ id: string }> };

type TemplateFieldRow = {
  id: number;
  field_name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
};

function parseId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid ${label}`);
  return id;
}

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    message.includes("not found") ? 404 :
    400;
  return NextResponse.json({ error: message }, { status });
}

function institutionAdminIds(currentUser: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  return currentUser.memberships
    .filter((membership) => membership.role_code === "institution_admin")
    .map((membership) => membership.institution_id);
}

async function getAssignedInstitutions(templateId: number, institutionIds: number[]) {
  if (!institutionIds.length) return [];
  const result = await db.query<{ id: number; name: string }>(
    `
      SELECT ip.id, COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) AS name
      FROM institution_templates it
      INNER JOIN institution_profiles ip
         ON ip.id = it.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      WHERE it.template_id = $1
        AND it.is_active = TRUE
        AND it.institution_id = ANY($2::int[])
      ORDER BY name, ip.id
    `,
    [templateId, institutionIds]
  );
  return result.rows;
}

async function getUnmappedFields(templateId: number) {
  const result = await db.query<TemplateFieldRow>(
    `
      SELECT dtf.id, dtf.field_name, dtf.label, dtf.field_type, dtf.is_required, dtf.sort_order
      FROM document_template_fields dtf
      WHERE dtf.template_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM document_template_field_mappings dtfm
          WHERE dtfm.template_id = dtf.template_id
            AND dtfm.template_field_name = dtf.field_name
            AND dtfm.institution_id IS NULL
            AND dtfm.is_active = TRUE
        )
      ORDER BY dtf.sort_order, dtf.id
    `,
    [templateId]
  );
  return result.rows;
}

async function assertTemplateExists(templateId: number) {
  const result = await db.query(
    `SELECT 1
       FROM document_templates
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1`,
    [templateId]
  );
  if (!result.rowCount) throw new Error("Template not found");
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!isInstitutionAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Only Institution Admin can manage default values" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const templateId = parseId(id, "template id");
    await assertTemplateExists(templateId);

    const institutions = await getAssignedInstitutions(
      templateId,
      institutionAdminIds(currentUser)
    );
    if (!institutions.length) throw new Error("Template not found");

    const requestedInstitutionId = new URL(req.url).searchParams.get("institutionId");
    const institutionId = requestedInstitutionId
      ? parseId(requestedInstitutionId, "institution id")
      : institutions[0].id;
    if (!institutions.some((institution) => institution.id === institutionId)) {
      return NextResponse.json({ error: "Institution is not available for this template" }, { status: 403 });
    }

    const [fields, defaultsResult] = await Promise.all([
      getUnmappedFields(templateId),
      db.query<{ field_values: Record<string, unknown> }>(
        `
          SELECT field_values
          FROM institution_template_defaults
          WHERE institution_id = $1 AND template_id = $2
          LIMIT 1
        `,
        [institutionId, templateId]
      ),
    ]);

    const allowedNames = new Set(fields.map((field) => field.field_name));
    const storedValues = defaultsResult.rows[0]?.field_values ?? {};
    const autoGenerateFields = readAutoGenerateFields(storedValues).filter((fieldName) =>
      fields.some(
        (field) => field.field_name === fieldName && isCertificateNumberField(field)
      )
    );
    const fieldValues = Object.fromEntries(
      Object.entries(storedValues)
        .filter(([key]) => allowedNames.has(key))
        .map(([key, value]) => [key, value == null ? "" : String(value)])
    );

    return NextResponse.json({
      data: {
        institutionId,
        institutions,
        fields,
        fieldValues,
        autoGenerateFields,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request, context: Context) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!isInstitutionAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Only Institution Admin can manage default values" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const templateId = parseId(id, "template id");
    const body = await req.json();
    const institutionId = parseId(body.institution_id, "institution id");
    await assertTemplateExists(templateId);

    const editableInstitutionIds = institutionAdminIds(currentUser);
    const institutions = await getAssignedInstitutions(templateId, editableInstitutionIds);
    if (!institutions.some((institution) => institution.id === institutionId)) {
      return NextResponse.json(
        { error: "You cannot edit defaults for this institution and template" },
        { status: 403 }
      );
    }

    const fields = await getUnmappedFields(templateId);
    const allowedNames = new Set(fields.map((field) => field.field_name));
    const submitted =
      body.field_values && typeof body.field_values === "object" && !Array.isArray(body.field_values)
        ? body.field_values as Record<string, unknown>
        : {};
    const fieldValues = Object.fromEntries(
      Object.entries(submitted)
        .filter(([key]) => allowedNames.has(key))
        .map(([key, value]) => [key, value == null ? "" : String(value)])
    );
    const requestedAutoGenerateFields = Array.isArray(body.auto_generate_fields)
      ? body.auto_generate_fields.map(String)
      : [];
    const autoGenerateFields = requestedAutoGenerateFields.filter((fieldName) =>
      fields.some(
        (field) => field.field_name === fieldName && isCertificateNumberField(field)
      )
    );
    if (autoGenerateFields.length) {
      fieldValues[AUTO_GENERATE_FIELDS_KEY] = autoGenerateFields;
      for (const fieldName of autoGenerateFields) delete fieldValues[fieldName];
    }

    await db.query(
      `
        INSERT INTO institution_template_defaults
          (institution_id, template_id, field_values, created_by, updated_by, created_at, updated_at)
        VALUES ($1, $2, $3::jsonb, $4, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (institution_id, template_id)
        DO UPDATE SET
          field_values = EXCLUDED.field_values,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `,
      [institutionId, templateId, JSON.stringify(fieldValues), currentUser.id]
    );

    return NextResponse.json({
      success: true,
      data: { fieldValues, autoGenerateFields },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
