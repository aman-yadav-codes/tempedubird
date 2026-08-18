import type { Pool, PoolClient } from "pg";

import {
  assertCanAccessInstitution,
  getAllowedInstitutionIds,
} from "@/lib/auth/institution-scope";
import {
  isPlatformAdminUser,
  type PermissionUser,
} from "@/lib/auth/permissions";
import type { Syllabus, SyllabusNode } from "@/lib/types/syllabus";

type Queryable = Pool | PoolClient;

type ListSyllabiOptions = {
  search?: string;
  limit?: number;
  offset?: number;
  subjectId?: number | null;
  institutionId?: number | null;
  activeInstitutionId?: number | null;
  templatesOnly?: boolean;
  view?: "my" | "marketplace";
};

type SyllabusInput = {
  subject_id: number;
  institution_id?: number | null;
  title: string;
  description?: string | null;
  version?: number;
  is_template?: boolean;
  is_public?: boolean;
  is_active?: boolean;
};

type SyllabusNodeInput = {
  parent_id?: number | null;
  title: string;
  description?: string | null;
  node_type: string;
  sort_order?: number;
  estimated_hours?: number | null;
  learning_outcomes?: string | null;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
};

const MODIFIED_INHERITED_SYLLABUS_CONDITION = `
  s.parent_syllabus_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM syllabi source
    WHERE source.id = s.parent_syllabus_id
      AND (
        s.title IS DISTINCT FROM source.title
        OR s.description IS DISTINCT FROM source.description
        OR s.version IS DISTINCT FROM source.version
        OR s.is_active IS DISTINCT FROM source.is_active
        OR (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'title', node.title,
                'description', node.description,
                'node_type', node.node_type,
                'sort_order', node.sort_order,
                'estimated_hours', node.estimated_hours,
                'learning_outcomes', node.learning_outcomes,
                'metadata', node.metadata,
                'is_active', node.is_active
              )
              ORDER BY node.sort_order, node.node_type, node.title, node.description, node.estimated_hours, node.learning_outcomes, node.metadata::text, node.is_active
            ),
            '[]'::jsonb
          )
          FROM syllabus_nodes node
          WHERE node.syllabus_id = s.id
        ) IS DISTINCT FROM (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'title', node.title,
                'description', node.description,
                'node_type', node.node_type,
                'sort_order', node.sort_order,
                'estimated_hours', node.estimated_hours,
                'learning_outcomes', node.learning_outcomes,
                'metadata', node.metadata,
                'is_active', node.is_active
              )
              ORDER BY node.sort_order, node.node_type, node.title, node.description, node.estimated_hours, node.learning_outcomes, node.metadata::text, node.is_active
            ),
            '[]'::jsonb
          )
          FROM syllabus_nodes node
          WHERE node.syllabus_id = source.id
        )
      )
  )
`;

const SYLLABUS_SELECT = `
  SELECT
    s.id,
    s.subject_id,
    sub.name AS subject_name,
    sub.board_id,
    b.name AS board_name,
    sub.category_id,
    c.name AS category_name,
    s.institution_id,
    ip.name AS institution_name,
    s.parent_syllabus_id,
    parent.title AS parent_syllabus_title,
    parent.version AS parent_syllabus_version,
    parent.is_template AS parent_is_template,
    COALESCE(parent.is_public, FALSE) AS parent_is_public,
    parent_ip.name AS parent_institution_name,
    s.title,
    s.description,
    s.version,
    (parent.id IS NOT NULL AND parent.version > s.version) AS upgrade_available,
    (${MODIFIED_INHERITED_SYLLABUS_CONDITION}) AS is_modified_inherited,
    s.is_template,
    COALESCE(s.is_public, FALSE) AS is_public,
    s.is_active,
    s.created_at,
    s.updated_at,
    COUNT(sn.id)::int AS node_count
  FROM syllabi s
  INNER JOIN subjects sub ON sub.id = s.subject_id
  LEFT JOIN boards b ON b.id = sub.board_id
  LEFT JOIN categories c ON c.id = sub.category_id
  LEFT JOIN institution_profiles ip ON ip.id = s.institution_id
  LEFT JOIN syllabi parent ON parent.id = s.parent_syllabus_id
  LEFT JOIN institution_profiles parent_ip ON parent_ip.id = parent.institution_id
  LEFT JOIN syllabus_nodes sn ON sn.syllabus_id = s.id
`;

let syllabusMarketplaceColumnReady = false;

async function ensureSyllabusMarketplaceColumn(db: Queryable) {
  if (syllabusMarketplaceColumnReady) return;
  await db.query(`
    ALTER TABLE syllabi
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE NOT NULL
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_syllabi_public
    ON syllabi(is_public)
  `);
  syllabusMarketplaceColumnReady = true;
}

function asPositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function isPlatformUser(user: PermissionUser) {
  return isPlatformAdminUser(user);
}

function getInstitutionScopeCondition(user: PermissionUser, alias = "s") {
  if (isPlatformUser(user)) return { sql: "", params: [] as unknown[] };
  const allowedInstitutionIds = getAllowedInstitutionIds(user) ?? [];

  return {
    sql: `(${alias}.is_template = TRUE OR ${alias}.institution_id = ANY($IDX::int[]))`,
    params: [allowedInstitutionIds] as unknown[],
  };
}

function joinWhere(parts: string[]) {
  const filtered = parts.filter(Boolean);
  return filtered.length ? `WHERE ${filtered.join(" AND ")}` : "";
}

async function getSyllabusOwner(db: Queryable, syllabusId: number) {
  const result = await db.query<{
    id: number;
    institution_id: number | null;
    is_template: boolean;
  }>(
    `SELECT id, institution_id, is_template FROM syllabi WHERE id = $1`,
    [syllabusId]
  );

  return result.rows[0] ?? null;
}

export async function listSyllabi(
  db: Queryable,
  user: PermissionUser,
  opts: ListSyllabiOptions = {}
) {
  await ensureSyllabusMarketplaceColumn(db);
  const search = opts.search?.trim() ?? "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const params: unknown[] = [];
  const where: string[] = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(s.title ILIKE $${params.length} OR sub.name ILIKE $${params.length} OR b.name ILIKE $${params.length} OR c.name ILIKE $${params.length} OR ip.name ILIKE $${params.length})`);
  }

  const subjectId = asPositiveInteger(opts.subjectId);
  if (subjectId) {
    params.push(subjectId);
    where.push(`s.subject_id = $${params.length}`);
  }

  const institutionId = asPositiveInteger(opts.institutionId);
  if (institutionId) {
    assertCanAccessInstitution(user, institutionId);
    params.push(institutionId);
    where.push(`s.institution_id = $${params.length}`);
  }

  if (opts.templatesOnly) {
    where.push("s.is_template = TRUE");
  }

  if (opts.view === "my" && isPlatformUser(user)) {
    where.push("s.is_template = TRUE");
  }

  if (opts.view === "my" && !isPlatformUser(user)) {
    const allowedInstitutionIds = getAllowedInstitutionIds(user) ?? [];
    if (allowedInstitutionIds.length === 0) {
      where.push("FALSE");
    } else {
      params.push(allowedInstitutionIds);
      where.push(`s.institution_id = ANY($${params.length}::int[])`);
    }
  }

  if (opts.view === "marketplace") {
    where.push("s.is_template = TRUE");
  }

  const scope = getInstitutionScopeCondition(user);
  if (scope.sql && opts.view !== "marketplace") {
    params.push(scope.params[0]);
    where.push(scope.sql.replace("$IDX", `$${params.length}`));
  }

  const whereSql = joinWhere(where);
  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        ${SYLLABUS_SELECT}
        ${whereSql}
        GROUP BY s.id, sub.name, sub.board_id, b.name, sub.category_id, c.name, ip.name, parent.id, parent.title, parent.version, parent.is_template, parent.is_public, parent_ip.name
        ORDER BY s.is_template DESC, s.updated_at DESC, s.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    ),
    db.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM syllabi s
        INNER JOIN subjects sub ON sub.id = s.subject_id
        LEFT JOIN boards b ON b.id = sub.board_id
        LEFT JOIN categories c ON c.id = sub.category_id
        LEFT JOIN institution_profiles ip ON ip.id = s.institution_id
        ${whereSql}
      `,
      params
    ),
  ]);

  let rows = dataResult.rows as Syllabus[];

  if (opts.view === "marketplace" && rows.length > 0) {
    const activeInstitutionId = asPositiveInteger(opts.activeInstitutionId);
    let inheritedInstitutionIds: number[] = [];
    if (activeInstitutionId) {
      assertCanAccessInstitution(user, activeInstitutionId);
      inheritedInstitutionIds = [activeInstitutionId];
    } else if (!isPlatformUser(user)) {
      inheritedInstitutionIds = getAllowedInstitutionIds(user) ?? [];
    }

    if (inheritedInstitutionIds.length > 0) {
      const inheritedResult = await db.query<{
        parent_syllabus_id: number;
        institution_name: string | null;
      }>(
        `
          SELECT DISTINCT ON (child.parent_syllabus_id)
            child.parent_syllabus_id,
            ip.name AS institution_name
          FROM syllabi child
          LEFT JOIN institution_profiles ip ON ip.id = child.institution_id
          WHERE child.parent_syllabus_id = ANY($1::int[])
            AND child.institution_id = ANY($2::int[])
            AND child.is_template = FALSE
          ORDER BY child.parent_syllabus_id, child.updated_at DESC, child.id DESC
        `,
        [rows.map((row) => row.id), inheritedInstitutionIds]
      );
      const inheritedByParentId = new Map(
        inheritedResult.rows.map((row) => [
          row.parent_syllabus_id,
          row.institution_name ?? "Institution",
        ])
      );
      rows = rows.map((row) => ({
        ...row,
        inherited_by_institution_name: inheritedByParentId.get(row.id) ?? null,
      }));
    }
  }

  return {
    data: rows,
    total: Number(countResult.rows[0]?.count ?? 0),
  };
}

export async function listSyllabusSubjects(
  db: Queryable,
  search = "",
  limit = 15,
  offset = 0
) {
  const text = search.trim();
  const params = text ? [`%${text}%`, limit, offset] : [limit, offset];
  const where = text
    ? "WHERE (name ILIKE $1 OR board_name ILIKE $1 OR category_name ILIKE $1 OR category_path ILIKE $1 OR label ILIKE $1)"
    : "";
  const limitParam = text ? 2 : 1;
  const offsetParam = text ? 3 : 2;
  const subjectOptionsSql = `
    WITH subject_options AS (
      SELECT
        sub.id,
        sub.name,
        b.name AS board_name,
        c.name AS category_name,
        4 AS level,
        'subject' AS type,
        (
          SELECT string_agg(c2.name, ' -> ' ORDER BY cc.depth DESC)
          FROM category_closure cc
          INNER JOIN categories c2
            ON c2.id = cc.ancestor_id
          WHERE cc.descendant_id = sub.category_id
            AND c2.is_deleted = FALSE
        ) AS category_path,
        CONCAT_WS(
          ' -> ',
          (
            SELECT string_agg(c2.name, ' -> ' ORDER BY cc.depth DESC)
            FROM category_closure cc
            INNER JOIN categories c2
              ON c2.id = cc.ancestor_id
            WHERE cc.descendant_id = sub.category_id
              AND c2.is_deleted = FALSE
          ),
          b.name,
          sub.name
        ) AS label
      FROM subjects sub
      LEFT JOIN boards b ON b.id = sub.board_id
      LEFT JOIN categories c ON c.id = sub.category_id
      WHERE sub.is_deleted = FALSE
        AND COALESCE(sub.is_active, TRUE) = TRUE
        AND COALESCE(b.is_deleted, FALSE) = FALSE
        AND COALESCE(b.is_active, TRUE) = TRUE
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND COALESCE(c.is_active, TRUE) = TRUE
    )
  `;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        ${subjectOptionsSql}
        SELECT id, name, board_name, category_name, category_path, level, type, label
        FROM subject_options
        ${where}
        ORDER BY category_path ASC NULLS LAST, board_name ASC NULLS LAST, name ASC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `,
      params
    ),
    db.query<{ count: number }>(
      `
        ${subjectOptionsSql}
        SELECT COUNT(*)::int AS count
        FROM subject_options
        ${where}
      `,
      text ? [`%${text}%`] : []
    ),
  ]);

  return {
    data: dataResult.rows,
    total: Number(countResult.rows[0]?.count ?? 0),
  };
}

export async function createSyllabus(
  db: Queryable,
  user: PermissionUser,
  input: SyllabusInput
) {
  await ensureSyllabusMarketplaceColumn(db);
  const platform = isPlatformUser(user);
  const institutionId = input.institution_id ?? null;
  const isTemplate = platform && !institutionId ? true : Boolean(input.is_template);

  if (platform && institutionId) {
    throw new Error("Platform Admin can only create platform syllabus templates");
  }

  if (!platform) {
    if (!institutionId) throw new Error("Institution is required");
    assertCanAccessInstitution(user, institutionId);
    if (isTemplate) throw new Error("Institution Admin cannot create platform templates");
  }

  const result = await db.query<{ id: number }>(
    `
      INSERT INTO syllabi (
        subject_id,
        institution_id,
        title,
        description,
        version,
        is_template,
        is_public,
        is_active,
        created_by,
        updated_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
      RETURNING id
    `,
    [
      input.subject_id,
      institutionId,
      input.title,
      input.description ?? null,
      input.version ?? 1,
      isTemplate,
      !isTemplate && input.is_public === true,
      input.is_active ?? true,
      user.id,
    ]
  );

  return getSyllabusById(db, user, result.rows[0].id);
}

export async function getSyllabusById(db: Queryable, user: PermissionUser, syllabusId: number) {
  await ensureSyllabusMarketplaceColumn(db);
  const result = await db.query(
    `
      ${SYLLABUS_SELECT}
      WHERE s.id = $1
      GROUP BY s.id, sub.name, sub.board_id, b.name, sub.category_id, c.name, ip.name, parent.id, parent.title, parent.version, parent.is_template, parent.is_public, parent_ip.name
      LIMIT 1
    `,
    [syllabusId]
  );
  const row = result.rows[0] as Syllabus | undefined;
  if (!row) return null;
  return row;
}

export async function updateSyllabus(
  db: Queryable,
  user: PermissionUser,
  syllabusId: number,
  input: Partial<SyllabusInput>
) {
  await ensureSyllabusMarketplaceColumn(db);
  const owner = await getSyllabusOwner(db, syllabusId);
  if (!owner) throw new Error("Syllabus not found");
  if (isPlatformUser(user) && !owner.is_template) {
    throw new Error("Platform Admin cannot directly edit institution syllabi");
  }
  if (!isPlatformUser(user)) {
    if (owner.is_template) throw new Error("Institution Admin must inherit a template before editing it");
    assertCanAccessInstitution(user, owner.institution_id);
  }

  await db.query(
    `
      UPDATE syllabi
      SET title = COALESCE($2, title),
          description = COALESCE($3, description),
          version = COALESCE($4, version),
          is_active = COALESCE($5, is_active),
          is_public = COALESCE($6, is_public),
          updated_by = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [
      syllabusId,
      input.title ?? null,
      input.description ?? null,
      input.version ?? null,
      typeof input.is_active === "boolean" ? input.is_active : null,
      owner.is_template ? null : typeof input.is_public === "boolean" ? input.is_public : null,
      user.id,
    ]
  );

  return getSyllabusById(db, user, syllabusId);
}

export async function deleteSyllabus(db: Queryable, user: PermissionUser, syllabusId: number) {
  const owner = await getSyllabusOwner(db, syllabusId);
  if (!owner) throw new Error("Syllabus not found");
  if (isPlatformUser(user) && !owner.is_template) {
    throw new Error("Platform Admin cannot directly delete institution syllabi");
  }
  if (!isPlatformUser(user)) {
    if (owner.is_template) throw new Error("Institution Admin cannot delete platform templates");
    assertCanAccessInstitution(user, owner.institution_id);
  }

  await db.query(`DELETE FROM syllabi WHERE id = $1`, [syllabusId]);
}

export async function assertCanEditSyllabus(db: Queryable, user: PermissionUser, syllabusId: number) {
  const owner = await getSyllabusOwner(db, syllabusId);
  if (!owner) throw new Error("Syllabus not found");
  if (isPlatformUser(user) && !owner.is_template) {
    throw new Error("Platform Admin cannot directly edit institution syllabi");
  }
  if (!isPlatformUser(user)) {
    if (owner.is_template) throw new Error("Inherit this template before editing nodes");
    assertCanAccessInstitution(user, owner.institution_id);
  }
  return owner;
}

export async function listSyllabusNodes(db: Queryable, user: PermissionUser, syllabusId: number) {
  const syllabus = await getSyllabusById(db, user, syllabusId);
  if (!syllabus) throw new Error("Syllabus not found");

  const result = await db.query<SyllabusNode>(
    `
      SELECT id, syllabus_id, parent_id, title, description, node_type, sort_order,
             estimated_hours, learning_outcomes, metadata, is_active
      FROM syllabus_nodes
      WHERE syllabus_id = $1
      ORDER BY parent_id NULLS FIRST, sort_order ASC, id ASC
    `,
    [syllabusId]
  );

  return result.rows;
}

export function buildSyllabusTree(nodes: SyllabusNode[]) {
  const byId = new Map<number, SyllabusNode>();
  const roots: SyllabusNode[] = [];

  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] });
  }

  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)?.children?.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function insertClosureForNode(db: Queryable, nodeId: number, parentId: number | null) {
  await db.query(
    `INSERT INTO syllabus_node_closure (ancestor_id, descendant_id, depth)
     VALUES ($1, $1, 0)
     ON CONFLICT DO NOTHING`,
    [nodeId]
  );

  if (!parentId) return;

  await db.query(
    `
      INSERT INTO syllabus_node_closure (ancestor_id, descendant_id, depth)
      SELECT ancestor_id, $1, depth + 1
      FROM syllabus_node_closure
      WHERE descendant_id = $2
      ON CONFLICT DO NOTHING
    `,
    [nodeId, parentId]
  );
}

export async function createSyllabusNode(
  db: Queryable,
  user: PermissionUser,
  syllabusId: number,
  input: SyllabusNodeInput
) {
  await assertCanEditSyllabus(db, user, syllabusId);
  if (input.parent_id) await assertNodeBelongsToSyllabus(db, syllabusId, input.parent_id);

  const result = await db.query<{ id: number }>(
    `
      INSERT INTO syllabus_nodes (
        syllabus_id,
        parent_id,
        title,
        description,
        node_type,
        sort_order,
        estimated_hours,
        learning_outcomes,
        metadata,
        is_active,
        created_by,
        updated_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$11)
      RETURNING id
    `,
    [
      syllabusId,
      input.parent_id ?? null,
      input.title,
      input.description ?? null,
      input.node_type,
      input.sort_order ?? 0,
      input.estimated_hours ?? null,
      input.learning_outcomes ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.is_active ?? true,
      user.id,
    ]
  );

  await insertClosureForNode(db, result.rows[0].id, input.parent_id ?? null);
  return result.rows[0].id;
}

async function assertNodeBelongsToSyllabus(db: Queryable, syllabusId: number, nodeId: number) {
  const result = await db.query(`SELECT 1 FROM syllabus_nodes WHERE id = $1 AND syllabus_id = $2`, [nodeId, syllabusId]);
  if (result.rowCount === 0) throw new Error("Node does not belong to this syllabus");
}

export async function updateSyllabusNode(
  db: Queryable,
  user: PermissionUser,
  syllabusId: number,
  nodeId: number,
  input: Partial<SyllabusNodeInput>
) {
  await assertCanEditSyllabus(db, user, syllabusId);
  await assertNodeBelongsToSyllabus(db, syllabusId, nodeId);

  await db.query(
    `
      UPDATE syllabus_nodes
      SET title = COALESCE($3, title),
          description = COALESCE($4, description),
          node_type = COALESCE($5, node_type),
          sort_order = COALESCE($6, sort_order),
          estimated_hours = CASE WHEN $12::boolean THEN $7 ELSE estimated_hours END,
          learning_outcomes = COALESCE($8, learning_outcomes),
          metadata = COALESCE($9::jsonb, metadata),
          is_active = COALESCE($10, is_active),
          updated_by = $11,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND syllabus_id = $2
    `,
    [
      nodeId,
      syllabusId,
      input.title ?? null,
      input.description ?? null,
      input.node_type ?? null,
      input.sort_order ?? null,
      input.estimated_hours === undefined ? null : input.estimated_hours,
      input.learning_outcomes ?? null,
      input.metadata === undefined ? null : JSON.stringify(input.metadata ?? {}),
      typeof input.is_active === "boolean" ? input.is_active : null,
      user.id,
      input.estimated_hours !== undefined,
    ]
  );
}

export async function deleteSyllabusNode(db: Queryable, user: PermissionUser, syllabusId: number, nodeId: number) {
  await assertCanEditSyllabus(db, user, syllabusId);
  await assertNodeBelongsToSyllabus(db, syllabusId, nodeId);
  await db.query(`DELETE FROM syllabus_nodes WHERE id = $1 AND syllabus_id = $2`, [nodeId, syllabusId]);
}

export async function inheritSyllabusTemplate(
  pool: Pool,
  user: PermissionUser,
  templateSyllabusId: number,
  institutionId: number,
  title?: string | null
) {
  await ensureSyllabusMarketplaceColumn(pool);
  assertCanAccessInstitution(user, institutionId);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const template = await client.query<Syllabus>(
      `
        SELECT *
        FROM syllabi
        WHERE id = $1
        FOR UPDATE
      `,
      [templateSyllabusId]
    );
    const source = template.rows[0];
    if (!source) throw new Error("Syllabus not found");

    const existing = await client.query<{ id: number }>(
      `
        SELECT id
        FROM syllabi
        WHERE institution_id = $1
          AND subject_id = $2
          AND is_template = FALSE
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      `,
      [institutionId, source.subject_id]
    );

    if (existing.rows[0]) {
      await client.query("COMMIT");
      return existing.rows[0].id;
    }

    const inserted = await client.query<{ id: number }>(
      `
        INSERT INTO syllabi (
          subject_id,
          institution_id,
          parent_syllabus_id,
          title,
          description,
          version,
          is_template,
          is_active,
          created_by,
          updated_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,FALSE,TRUE,$7,$7)
        RETURNING id
      `,
      [
        source.subject_id,
        institutionId,
        templateSyllabusId,
        title?.trim() || source.title,
        source.description,
        source.version,
        user.id,
      ]
    );
    const newSyllabusId = inserted.rows[0].id;

    const nodes = await client.query<SyllabusNode>(
      `
        SELECT *
        FROM syllabus_nodes
        WHERE syllabus_id = $1
        ORDER BY parent_id NULLS FIRST, sort_order ASC, id ASC
      `,
      [templateSyllabusId]
    );
    const idMap = new Map<number, number>();

    for (const node of nodes.rows) {
      const parentId = node.parent_id ? idMap.get(node.parent_id) ?? null : null;
      const newNode = await client.query<{ id: number }>(
        `
          INSERT INTO syllabus_nodes (
            syllabus_id,
            parent_id,
            title,
            description,
            node_type,
            sort_order,
            estimated_hours,
            learning_outcomes,
            metadata,
            is_active,
            created_by,
            updated_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$11)
          RETURNING id
        `,
        [
          newSyllabusId,
          parentId,
          node.title,
          node.description,
          node.node_type,
          node.sort_order,
          node.estimated_hours,
          node.learning_outcomes,
          JSON.stringify(node.metadata ?? {}),
          node.is_active,
          user.id,
        ]
      );
      idMap.set(node.id, newNode.rows[0].id);
    }

    for (const node of nodes.rows) {
      const newNodeId = idMap.get(node.id);
      if (!newNodeId) continue;
      const newParentId = node.parent_id ? idMap.get(node.parent_id) ?? null : null;
      await insertClosureForNode(client, newNodeId, newParentId);
    }

    await client.query(
      `
        INSERT INTO syllabus_inheritance_logs (
          template_syllabus_id,
          institution_syllabus_id,
          inherited_by
        )
        VALUES ($1,$2,$3)
      `,
      [templateSyllabusId, newSyllabusId, user.id]
    );

    await client.query("COMMIT");
    return newSyllabusId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateInheritedSyllabusFromParent(
  pool: Pool,
  user: PermissionUser,
  institutionSyllabusId: number
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const copyResult = await client.query<Syllabus>(
      `
        SELECT *
        FROM syllabi
        WHERE id = $1
        FOR UPDATE
      `,
      [institutionSyllabusId]
    );
    const copy = copyResult.rows[0];
    if (!copy) throw new Error("Syllabus not found");
    if (copy.is_template || !copy.institution_id || !copy.parent_syllabus_id) {
      throw new Error("This syllabus is not inherited from a marketplace template");
    }
    assertCanAccessInstitution(user, copy.institution_id);

    const sourceResult = await client.query<Syllabus>(
      `
        SELECT *
        FROM syllabi
        WHERE id = $1
          AND is_template = TRUE
        LIMIT 1
      `,
      [copy.parent_syllabus_id]
    );
    const source = sourceResult.rows[0];
    if (!source) throw new Error("Source syllabus template not found");

    await client.query(
      `
        UPDATE syllabi
        SET subject_id = $2,
            title = $3,
            description = $4,
            version = $5,
            is_active = TRUE,
            updated_by = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [
        institutionSyllabusId,
        source.subject_id,
        source.title,
        source.description,
        source.version,
        user.id,
      ]
    );

    await client.query(`DELETE FROM syllabus_nodes WHERE syllabus_id = $1`, [
      institutionSyllabusId,
    ]);

    const nodes = await client.query<SyllabusNode>(
      `
        SELECT *
        FROM syllabus_nodes
        WHERE syllabus_id = $1
        ORDER BY parent_id NULLS FIRST, sort_order ASC, id ASC
      `,
      [source.id]
    );
    const idMap = new Map<number, number>();

    for (const node of nodes.rows) {
      const parentId = node.parent_id ? idMap.get(node.parent_id) ?? null : null;
      const newNode = await client.query<{ id: number }>(
        `
          INSERT INTO syllabus_nodes (
            syllabus_id,
            parent_id,
            title,
            description,
            node_type,
            sort_order,
            estimated_hours,
            learning_outcomes,
            metadata,
            is_active,
            created_by,
            updated_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$11)
          RETURNING id
        `,
        [
          institutionSyllabusId,
          parentId,
          node.title,
          node.description,
          node.node_type,
          node.sort_order,
          node.estimated_hours,
          node.learning_outcomes,
          JSON.stringify(node.metadata ?? {}),
          node.is_active,
          user.id,
        ]
      );
      idMap.set(node.id, newNode.rows[0].id);
    }

    for (const node of nodes.rows) {
      const newNodeId = idMap.get(node.id);
      if (!newNodeId) continue;
      const newParentId = node.parent_id ? idMap.get(node.parent_id) ?? null : null;
      await insertClosureForNode(client, newNodeId, newParentId);
    }

    await client.query(
      `
        INSERT INTO syllabus_inheritance_logs (
          template_syllabus_id,
          institution_syllabus_id,
          inherited_by
        )
        VALUES ($1,$2,$3)
      `,
      [source.id, institutionSyllabusId, user.id]
    );

    await client.query("COMMIT");
    return institutionSyllabusId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
