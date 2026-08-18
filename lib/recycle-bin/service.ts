import type { Pool, PoolClient } from "pg";

import {
  FULL_ACCESS_PERMISSION,
  type PermissionUser,
} from "@/lib/auth/permissions";
import {
  RECYCLE_BIN_RESOURCE_MAP,
  RECYCLE_BIN_RESOURCES,
  type RecycleBinResource,
} from "@/lib/recycle-bin/registry";

type Queryable = Pick<Pool | PoolClient, "query">;
type RecycleBinAction = "view" | "edit";

export type RecycleBinFilters = {
  search?: string;
  resourceType?: string;
  deletedBy?: string;
  deletedFrom?: string;
  deletedTo?: string;
  page: number;
  limit: number;
};

export type RecycleBinRecord = {
  resource_key: string;
  record_id: string;
  record_name: string;
  record_type: string;
  institution_id: number | null;
  institution_name: string | null;
  deleted_by: number | null;
  deleted_by_name: string | null;
  deleted_at: string | null;
  can_restore: boolean;
};

function isSuperAdmin(user: PermissionUser) {
  return user.role_codes.includes("super_admin");
}

function isPlatformAdmin(user: PermissionUser) {
  return isSuperAdmin(user) || user.role_codes.includes("platform_admin");
}

function hasRole(user: PermissionUser, ...codes: string[]) {
  return codes.some((code) => user.role_codes.includes(code));
}

function permissionCode(resource: RecycleBinResource, action: RecycleBinAction) {
  return resource.permissionModule
    ? `${resource.permissionModule}.${action}`
    : `settings.recycle_bin.${action}`;
}

function allowedInstitutionIds(
  user: PermissionUser,
  resource: RecycleBinResource,
  action: RecycleBinAction
) {
  const permission = permissionCode(resource, action);
  return Array.from(
    new Set(
      user.memberships
        .filter(
          (membership) =>
            membership.permissions.includes(FULL_ACCESS_PERMISSION) ||
            membership.permissions.includes(permission)
        )
        .map((membership) => membership.institution_id)
    )
  );
}

function addParam(params: unknown[], value: unknown) {
  params.push(value);
  return `$${params.length}`;
}

function buildScopedAccess(
  resource: RecycleBinResource,
  user: PermissionUser,
  action: RecycleBinAction,
  params: unknown[]
) {
  if (isSuperAdmin(user)) return "TRUE";

  if (isPlatformAdmin(user)) {
    if (action === "view") return "TRUE";
    return resource.platformOwned ? "TRUE" : "FALSE";
  }

  const clauses: string[] = [];
  const audiences = new Set(resource.audiences ?? []);
  let userParam: string | null = null;
  const getUserParam = () => {
    userParam ??= addParam(params, user.id);
    return userParam;
  };

  if (
    audiences.has("institution_admin") &&
    hasRole(user, "institution_admin", "Principal") &&
    resource.institutionIdSql
  ) {
    const institutionIds = allowedInstitutionIds(user, resource, action);
    if (institutionIds.length > 0) {
      const institutionParam = addParam(params, institutionIds);
      clauses.push(`${resource.institutionIdSql} = ANY(${institutionParam}::int[])`);
    }
  }

  if (
    audiences.has("teacher") &&
    hasRole(user, "teacher") &&
    resource.ownerUserIdSql
  ) {
    const teacherClauses = [`${resource.ownerUserIdSql} = ${getUserParam()}`];
    if (resource.institutionIdSql) {
      const institutionIds = allowedInstitutionIds(user, resource, action);
      if (institutionIds.length === 0) {
        teacherClauses.push("FALSE");
      } else {
        const institutionParam = addParam(params, institutionIds);
        teacherClauses.push(
          `${resource.institutionIdSql} = ANY(${institutionParam}::int[])`
        );
      }
    }
    clauses.push(`(${teacherClauses.join(" AND ")})`);
  }

  if (
    audiences.has("student") &&
    hasRole(user, "student") &&
    resource.studentUserIdSql
  ) {
    clauses.push(`${resource.studentUserIdSql} = ${getUserParam()}`);
  }

  if (
    (audiences.has("guardian") || audiences.has("owner")) &&
    hasRole(user, "parent", "guardian") &&
    resource.ownerUserIdSql
  ) {
    clauses.push(`${resource.ownerUserIdSql} = ${getUserParam()}`);
  }

  if (
    audiences.has("owner") &&
    resource.ownerUserIdSql &&
    !hasRole(user, "parent", "guardian")
  ) {
    clauses.push(`${resource.ownerUserIdSql} = ${getUserParam()}`);
  }

  return clauses.length > 0 ? `(${clauses.join(" OR ")})` : "FALSE";
}

function resourceSelect(
  resource: RecycleBinResource,
  user: PermissionUser,
  params: unknown[]
) {
  const viewAccess = buildScopedAccess(resource, user, "view", params);
  const restoreAccess = buildScopedAccess(resource, user, "edit", params);
  const institutionIdSql = resource.institutionIdSql ?? "NULL::integer";
  const institutionJoin = resource.institutionIdSql
    ? `LEFT JOIN institution_profiles recycle_institution
         ON recycle_institution.id = ${resource.institutionIdSql}`
    : "";
  const institutionNameSql = resource.institutionIdSql
    ? "recycle_institution.name"
    : "NULL::text";

  return `
    SELECT
      '${resource.key}'::text AS resource_key,
      ${resource.alias}.id::text AS record_id,
      (${resource.labelSql})::text AS record_name,
      '${resource.typeLabel.replaceAll("'", "''")}'::text AS record_type,
      ${institutionIdSql}::integer AS institution_id,
      ${institutionNameSql}::text AS institution_name,
      ${resource.alias}.deleted_by::integer AS deleted_by,
      COALESCE(recycle_deleter.full_name, recycle_deleter.email)::text AS deleted_by_name,
      ${resource.alias}.deleted_at AS deleted_at,
      (${restoreAccess})::boolean AS can_restore
    FROM ${resource.table} ${resource.alias}
    ${resource.joins ?? ""}
    LEFT JOIN users recycle_deleter
      ON recycle_deleter.id = ${resource.alias}.deleted_by
    ${institutionJoin}
    WHERE COALESCE(${resource.alias}.is_deleted, FALSE) = TRUE
      AND (${viewAccess})
  `;
}

function accessibleResources(user: PermissionUser, requestedType?: string) {
  const resources = requestedType
    ? RECYCLE_BIN_RESOURCES.filter((resource) => resource.key === requestedType)
    : RECYCLE_BIN_RESOURCES;

  if (isPlatformAdmin(user)) return resources;

  return resources.filter((resource) => {
    const audiences = new Set(resource.audiences ?? []);
    if (
      audiences.has("institution_admin") &&
      hasRole(user, "institution_admin", "Principal")
    ) {
      return true;
    }
    if (audiences.has("teacher") && hasRole(user, "teacher")) return true;
    if (audiences.has("student") && hasRole(user, "student")) return true;
    if (
      (audiences.has("guardian") || audiences.has("owner")) &&
      hasRole(user, "parent", "guardian")
    ) {
      return true;
    }
    return audiences.has("owner");
  });
}

export async function listRecycleBin(
  db: Queryable,
  user: PermissionUser,
  filters: RecycleBinFilters
) {
  const resources = accessibleResources(user, filters.resourceType);
  if (resources.length === 0) {
    return {
      data: [] as RecycleBinRecord[],
      total: 0,
      page: filters.page,
      pageCount: 0,
      resourceTypes: [] as Array<{ key: string; label: string }>,
      capabilities: { canPermanentlyDelete: isSuperAdmin(user) },
    };
  }

  const params: unknown[] = [];
  const unionSql = resources
    .map((resource) => resourceSelect(resource, user, params))
    .join("\nUNION ALL\n");
  const where: string[] = [];
  const search = filters.search?.trim() ?? "";
  const deletedBy = filters.deletedBy?.trim() ?? "";

  if (search) {
    const searchParam = addParam(params, `%${search}%`);
    where.push(
      `(record_name ILIKE ${searchParam} OR record_type ILIKE ${searchParam} OR COALESCE(institution_name, '') ILIKE ${searchParam})`
    );
  }
  if (deletedBy) {
    const deletedByParam = addParam(params, `%${deletedBy}%`);
    where.push(`COALESCE(deleted_by_name, '') ILIKE ${deletedByParam}`);
  }
  if (filters.deletedFrom) {
    const fromParam = addParam(params, filters.deletedFrom);
    where.push(`deleted_at::date >= ${fromParam}::date`);
  }
  if (filters.deletedTo) {
    const toParam = addParam(params, filters.deletedTo);
    where.push(`deleted_at::date <= ${toParam}::date`);
  }

  const filterSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const limitParam = addParam(params, filters.limit);
  const offsetParam = addParam(
    params,
    Math.max(0, (filters.page - 1) * filters.limit)
  );
  const result = await db.query<RecycleBinRecord & { total_count: string }>(
    `
      WITH deleted_records AS (
        ${unionSql}
      ),
      filtered_records AS (
        SELECT *
        FROM deleted_records
        ${filterSql}
      )
      SELECT
        filtered_records.*,
        COUNT(*) OVER()::text AS total_count
      FROM filtered_records
      ORDER BY deleted_at DESC NULLS LAST, record_type, record_name
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `,
    params
  );

  const total = Number(result.rows[0]?.total_count ?? 0);
  return {
    data: result.rows.map(({ total_count, ...record }) => {
      void total_count;
      return record;
    }),
    total,
    page: filters.page,
    pageCount: Math.ceil(total / filters.limit),
    resourceTypes: accessibleResources(user).map((resource) => ({
      key: resource.key,
      label: resource.typeLabel,
    })),
    capabilities: { canPermanentlyDelete: isSuperAdmin(user) },
  };
}

function getResource(resourceKey: string) {
  const resource = RECYCLE_BIN_RESOURCE_MAP.get(resourceKey);
  if (!resource) throw new Error("Unknown recycle bin record type");
  return resource;
}

async function assertRecordAccess(
  db: Queryable,
  user: PermissionUser,
  resource: RecycleBinResource,
  recordId: number,
  action: RecycleBinAction
) {
  const params: unknown[] = [recordId];
  const accessSql = buildScopedAccess(resource, user, action, params);
  const result = await db.query<{
    id: number;
    record_name: string;
    institution_id: number | null;
  }>(
    `
      SELECT
        ${resource.alias}.id,
        (${resource.labelSql})::text AS record_name,
        ${resource.institutionIdSql ?? "NULL::integer"}::integer AS institution_id
      FROM ${resource.table} ${resource.alias}
      ${resource.joins ?? ""}
      WHERE ${resource.alias}.id = $1
        AND COALESCE(${resource.alias}.is_deleted, FALSE) = TRUE
        AND (${accessSql})
      LIMIT 1
    `,
    params
  );
  const record = result.rows[0];
  if (!record) throw new Error("Deleted record not found or outside your permission scope");
  return record;
}

async function writeRecycleAudit(
  db: Queryable,
  input: {
    resource: RecycleBinResource;
    recordId: number;
    institutionId: number | null;
    actorId: number;
    status: "RESTORED" | "PURGED";
    recordName: string;
  }
) {
  await db.query(
    `
      INSERT INTO entity_lifecycle (
        entity_type,
        entity_id,
        institution_id,
        status,
        effective_from,
        effective_to,
        created_by,
        updated_by,
        is_current,
        notes,
        metadata
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        $5,
        $5,
        FALSE,
        $6,
        $7::jsonb
      )
    `,
    [
      `RECYCLE_BIN_${input.resource.key.toUpperCase()}`,
      input.recordId,
      input.institutionId,
      input.status,
      input.actorId,
      `${input.status === "RESTORED" ? "Restored" : "Permanently deleted"} from recycle bin`,
      JSON.stringify({
        resource_key: input.resource.key,
        record_name: input.recordName,
      }),
    ]
  );
}

export async function restoreRecycleBinRecord(
  db: Pool,
  user: PermissionUser,
  resourceKey: string,
  recordId: number
) {
  const resource = getResource(resourceKey);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const record = await assertRecordAccess(client, user, resource, recordId, "edit");
    const restoreParts = [
      "is_deleted = FALSE",
      "deleted_at = NULL",
      "deleted_by = NULL",
      ...(resource.restoreSql ?? []),
    ];
    const result = await client.query<{ id: number }>(
      `
        UPDATE ${resource.table}
        SET ${restoreParts.join(", ")}
        WHERE id = $1
          AND COALESCE(is_deleted, FALSE) = TRUE
        RETURNING id
      `,
      [recordId]
    );
    if (!result.rows[0]) throw new Error("Deleted record is no longer available");
    await writeRecycleAudit(client, {
      resource,
      recordId,
      institutionId: record.institution_id,
      actorId: user.id,
      status: "RESTORED",
      recordName: record.record_name,
    });
    await client.query("COMMIT");
    return { id: recordId, resourceKey, recordName: record.record_name };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function permanentlyDeleteRecycleBinRecord(
  db: Pool,
  user: PermissionUser,
  resourceKey: string,
  recordId: number
) {
  if (!isSuperAdmin(user)) {
    throw new Error("Only Super Admin can permanently delete records");
  }

  const resource = getResource(resourceKey);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const record = await assertRecordAccess(client, user, resource, recordId, "edit");
    await writeRecycleAudit(client, {
      resource,
      recordId,
      institutionId: record.institution_id,
      actorId: user.id,
      status: "PURGED",
      recordName: record.record_name,
    });
    const result = await client.query<{ id: number }>(
      `
        DELETE FROM ${resource.table}
        WHERE id = $1
          AND COALESCE(is_deleted, FALSE) = TRUE
        RETURNING id
      `,
      [recordId]
    );
    if (!result.rows[0]) throw new Error("Deleted record is no longer available");
    await client.query("COMMIT");
    return { id: recordId, resourceKey, recordName: record.record_name };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
