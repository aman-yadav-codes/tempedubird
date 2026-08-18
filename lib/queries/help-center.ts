import type { Pool, PoolClient } from "pg";
import type { PermissionUser } from "@/lib/auth/permissions";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { helpArticles as fallbackArticles, helpCategories as fallbackCategories, recentUpdates } from "@/components/help/help-content";

type Queryable = Pool | PoolClient;

export type HelpCategoryRow = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  article_count?: number;
};

export type HelpArticleRow = {
  id: number;
  category_id: number;
  category_name: string | null;
  category_slug: string | null;
  title: string;
  slug: string;
  summary: string | null;
  content_md: string;
  visibility: "PUBLIC" | "AUTHENTICATED" | "PERMISSION_BASED";
  estimated_read_minutes: number | null;
  difficulty_level: string | null;
  is_featured: boolean;
  is_published: boolean;
  published_at: string | null;
  search_keywords: string | null;
  created_at: string;
  updated_at: string;
  permissions?: Array<{ id: number; code: string; name: string }>;
  assets?: HelpArticleAsset[];
  faqs?: HelpArticleFaq[];
  related_articles?: Array<{ id: number; title: string; slug: string; summary: string | null; category_slug: string | null }>;
};

export type HelpArticleAsset = {
  id?: number;
  asset_type: string;
  title?: string | null;
  file_url: string;
  thumbnail_url?: string | null;
  sort_order?: number;
};

export type HelpArticleFaq = {
  id?: number;
  question: string;
  answer: string;
  sort_order?: number;
};

export type HelpRecentUpdateRow = {
  id: number;
  title: string;
  description: string | null;
  href: string | null;
  update_date: string;
  sort_order: number;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
};

export type HelpArticleInput = {
  category_id: number;
  title: string;
  slug: string;
  summary?: string | null;
  content_md: string;
  visibility: "PUBLIC" | "AUTHENTICATED" | "PERMISSION_BASED";
  estimated_read_minutes?: number | null;
  difficulty_level?: string | null;
  is_featured?: boolean;
  is_published?: boolean;
  search_keywords?: string | null;
  permission_ids?: number[];
  assets?: HelpArticleAsset[];
  faqs?: HelpArticleFaq[];
  related_article_ids?: number[];
};

export type HelpCategoryInput = {
  parent_id?: number | null;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export type HelpRecentUpdateInput = {
  title: string;
  description?: string | null;
  href?: string | null;
  update_date: string;
  sort_order?: number;
  is_published?: boolean;
};

export function canManageHelpCenter(user: PermissionUser | null | undefined) {
  return isPlatformAdminUser(user);
}

function visibleSql(user: PermissionUser | null | undefined, alias = "a") {
  if (canManageHelpCenter(user)) return { sql: "TRUE", params: [] as unknown[] };
  const permissions = user?.permissions ?? [];
  return {
    sql: `
      ${alias}.is_published = TRUE
      AND (
        ${alias}.visibility = 'PUBLIC'
        OR (${alias}.visibility = 'AUTHENTICATED' AND $1 = TRUE)
        OR (
          ${alias}.visibility = 'PERMISSION_BASED'
          AND EXISTS (
            SELECT 1
            FROM help_article_permissions hap
            INNER JOIN permissions p ON p.id = hap.permission_id
            WHERE hap.article_id = ${alias}.id
              AND (p.code = ANY($2::text[]) OR '*' = ANY($2::text[]))
          )
        )
      )
    `,
    params: [Boolean(user), permissions],
  };
}

export async function listHelpCategories(
  db: Queryable,
  opts: { includeInactive?: boolean } = {}
): Promise<HelpCategoryRow[]> {
  try {
    const result = await db.query<HelpCategoryRow>(
      `
        SELECT c.*, COUNT(a.id)::int AS article_count
        FROM help_categories c
        LEFT JOIN help_articles a
          ON a.category_id = c.id
         AND COALESCE(a.is_deleted, FALSE) = FALSE
        WHERE ($1::boolean = TRUE OR c.is_active = TRUE)
          AND COALESCE(c.is_deleted, FALSE) = FALSE
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.name ASC
      `,
      [opts.includeInactive === true]
    );
    if (result.rows.length || opts.includeInactive) return result.rows;
    return fallbackHelpCategories();
  } catch {
    return fallbackHelpCategories();
  }
}

export async function listHelpArticles(
  db: Queryable,
  opts: { user?: PermissionUser | null; search?: string; categorySlug?: string; includeDrafts?: boolean; limit?: number } = {}
): Promise<HelpArticleRow[]> {
  try {
    const visibility = opts.includeDrafts ? { sql: "TRUE", params: [] as unknown[] } : visibleSql(opts.user, "a");
    const search = opts.search?.trim() ?? "";
    const params = [...visibility.params, search, `%${search}%`, opts.categorySlug ?? "", opts.limit ?? 100];
    const base = visibility.params.length;
    const result = await db.query<HelpArticleRow>(
      `
        SELECT a.*, c.name AS category_name, c.slug AS category_slug
        FROM help_articles a
        INNER JOIN help_categories c
          ON c.id = a.category_id
         AND COALESCE(c.is_deleted, FALSE) = FALSE
        WHERE ${visibility.sql}
          AND COALESCE(a.is_deleted, FALSE) = FALSE
          AND ($${base + 1} = '' OR a.title ILIKE $${base + 2} OR a.summary ILIKE $${base + 2} OR a.content_md ILIKE $${base + 2} OR a.search_keywords ILIKE $${base + 2})
          AND ($${base + 3} = '' OR c.slug = $${base + 3})
        ORDER BY a.is_featured DESC, c.sort_order ASC, a.updated_at DESC
        LIMIT $${base + 4}
      `,
      params
    );
    if (result.rows.length || opts.includeDrafts) return result.rows;
    return fallbackHelpArticles();
  } catch {
    return fallbackHelpArticles();
  }
}

function fallbackHelpCategories(): HelpCategoryRow[] {
  return fallbackCategories.map((category, index) => ({
    id: index + 1,
    parent_id: null,
    name: category.title,
    slug: category.slug,
    icon: category.icon,
    description: category.description,
    sort_order: index + 1,
    is_active: true,
    article_count: 0,
  }));
}

function fallbackHelpArticles(): HelpArticleRow[] {
  return fallbackArticles.map((article, index) => ({
    id: index + 1,
    category_id: index + 1,
    category_name: article.category,
    category_slug: article.category.toLowerCase().replaceAll(" ", "-").replaceAll("&", "").replaceAll("--", "-"),
    title: article.title,
    slug: article.slug,
    summary: article.description,
    content_md: `# ${article.title}\n\n${article.overview}\n\n## Prerequisites\n\n${article.prerequisites.map((item) => `- ${item}`).join("\n")}\n\n## Steps\n\n${article.steps.map((step, idx) => `${idx + 1}. ${step}`).join("\n")}`,
    visibility: "PUBLIC" as const,
    estimated_read_minutes: 3,
    difficulty_level: "Beginner",
    is_featured: index < 6,
    is_published: true,
    published_at: new Date().toISOString(),
    search_keywords: article.tags.join(", "),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    faqs: article.faqs.map((faq, faqIndex) => ({
      question: faq.question,
      answer: faq.answer,
      sort_order: faqIndex,
    })),
  }));
}

function fallbackHelpRecentUpdates(): HelpRecentUpdateRow[] {
  return recentUpdates.map((update, index) => ({
    id: index + 1,
    title: update.title,
    description: null,
    href: "/help/release-notes",
    update_date: new Date(update.date).toISOString(),
    sort_order: index + 1,
    is_published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

export async function listHelpRecentUpdates(
  db: Queryable,
  opts: { includeDrafts?: boolean; limit?: number } = {}
): Promise<HelpRecentUpdateRow[]> {
  try {
    const result = await db.query<HelpRecentUpdateRow>(
      `
        SELECT *
        FROM help_recent_updates
        WHERE ($1::boolean = TRUE OR is_published = TRUE)
          AND COALESCE(is_deleted, FALSE) = FALSE
        ORDER BY sort_order ASC, update_date DESC, id DESC
        LIMIT $2
      `,
      [opts.includeDrafts === true, opts.limit ?? 20]
    );
    if (result.rows.length || opts.includeDrafts) return result.rows;
    return fallbackHelpRecentUpdates().slice(0, opts.limit ?? 20);
  } catch {
    return fallbackHelpRecentUpdates().slice(0, opts.limit ?? 20);
  }
}

export async function createHelpRecentUpdate(db: Pool, input: HelpRecentUpdateInput, userId: number) {
  const result = await db.query<HelpRecentUpdateRow>(
    `
      INSERT INTO help_recent_updates (title, description, href, update_date, sort_order, is_published, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
      RETURNING *
    `,
    [
      input.title,
      input.description ?? null,
      input.href ?? null,
      input.update_date,
      input.sort_order ?? 0,
      input.is_published ?? true,
      userId,
    ]
  );
  return result.rows[0];
}

export async function updateHelpRecentUpdate(db: Pool, id: number, input: HelpRecentUpdateInput, userId: number) {
  const result = await db.query<HelpRecentUpdateRow>(
    `
      UPDATE help_recent_updates
      SET title=$1, description=$2, href=$3, update_date=$4, sort_order=$5, is_published=$6, updated_by=$7, updated_at=NOW()
      WHERE id=$8
      RETURNING *
    `,
    [
      input.title,
      input.description ?? null,
      input.href ?? null,
      input.update_date,
      input.sort_order ?? 0,
      input.is_published ?? true,
      userId,
      id,
    ]
  );
  return result.rows[0] ?? null;
}

export async function deleteHelpRecentUpdate(db: Pool, id: number) {
  await db.query(
    `UPDATE help_recent_updates
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            updated_at = NOW()
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE`,
    [id]
  );
}

export async function getHelpArticleBySlug(db: Queryable, slug: string, user?: PermissionUser | null, includeDrafts = false) {
  const visibility = includeDrafts ? { sql: "TRUE", params: [] as unknown[] } : visibleSql(user, "a");
  const result = await db.query<HelpArticleRow>(
    `
      SELECT a.*, c.name AS category_name, c.slug AS category_slug
      FROM help_articles a
      INNER JOIN help_categories c
        ON c.id = a.category_id
       AND COALESCE(c.is_deleted, FALSE) = FALSE
      WHERE a.slug = $${visibility.params.length + 1}
        AND COALESCE(a.is_deleted, FALSE) = FALSE
        AND ${visibility.sql}
      LIMIT 1
    `,
    [...visibility.params, slug]
  );
  const article = result.rows[0] ?? null;
  if (!article) return null;
  return hydrateArticle(db, article);
}

export async function getHelpArticleByCategoryAndSlug(db: Queryable, categorySlug: string, articleSlug: string, user?: PermissionUser | null) {
  const article = await getHelpArticleBySlug(db, articleSlug, user);
  if (!article || article.category_slug !== categorySlug) return null;
  return article;
}

export async function hydrateArticle(db: Queryable, article: HelpArticleRow) {
  const [permissions, assets, faqs, related] = await Promise.all([
    db.query(
      `SELECT p.id, p.code, p.name FROM help_article_permissions hap INNER JOIN permissions p ON p.id = hap.permission_id WHERE hap.article_id = $1 ORDER BY p.code`,
      [article.id]
    ),
    db.query<HelpArticleAsset>(`SELECT * FROM help_article_assets WHERE article_id = $1 ORDER BY sort_order ASC, id ASC`, [article.id]),
    db.query<HelpArticleFaq>(`SELECT * FROM help_article_faqs WHERE article_id = $1 ORDER BY sort_order ASC, id ASC`, [article.id]),
    db.query(
      `
        SELECT a.id, a.title, a.slug, a.summary, c.slug AS category_slug
        FROM help_article_relations r
        INNER JOIN help_articles a
          ON a.id = r.related_article_id
         AND COALESCE(a.is_deleted, FALSE) = FALSE
        INNER JOIN help_categories c
          ON c.id = a.category_id
         AND COALESCE(c.is_deleted, FALSE) = FALSE
        WHERE r.article_id = $1
        ORDER BY a.title
      `,
      [article.id]
    ),
  ]);
  return {
    ...article,
    permissions: permissions.rows,
    assets: assets.rows,
    faqs: faqs.rows,
    related_articles: related.rows,
  };
}

export async function createHelpCategory(db: Pool, input: HelpCategoryInput, userId: number) {
  const result = await db.query<HelpCategoryRow>(
    `
      INSERT INTO help_categories (parent_id, name, slug, icon, description, sort_order, is_active, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
      RETURNING *
    `,
    [input.parent_id ?? null, input.name, input.slug, input.icon ?? null, input.description ?? null, input.sort_order ?? 0, input.is_active ?? true, userId]
  );
  return result.rows[0];
}

export async function updateHelpCategory(db: Pool, id: number, input: HelpCategoryInput, userId: number) {
  const result = await db.query<HelpCategoryRow>(
    `
      UPDATE help_categories
      SET parent_id=$1, name=$2, slug=$3, icon=$4, description=$5, sort_order=$6, is_active=$7, updated_by=$8, updated_at=NOW()
      WHERE id=$9
      RETURNING *
    `,
    [input.parent_id ?? null, input.name, input.slug, input.icon ?? null, input.description ?? null, input.sort_order ?? 0, input.is_active ?? true, userId, id]
  );
  return result.rows[0] ?? null;
}

export async function deleteHelpCategory(db: Pool, id: number) {
  await db.query(
    `UPDATE help_categories
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            is_active = FALSE,
            updated_at = NOW()
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE`,
    [id]
  );
}

export async function saveHelpArticle(db: Pool, input: HelpArticleInput, userId: number, id?: number) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const params = [
      input.category_id,
      input.title,
      input.slug,
      input.summary ?? null,
      input.content_md ?? "",
      input.visibility,
      input.estimated_read_minutes ?? 3,
      input.difficulty_level ?? null,
      input.is_featured ?? false,
      input.is_published ?? false,
      input.search_keywords ?? null,
      userId,
    ];
    const articleResult = id
      ? await client.query<HelpArticleRow>(
          `
            UPDATE help_articles
            SET category_id=$1,title=$2,slug=$3,summary=$4,content_md=$5,visibility=$6,estimated_read_minutes=$7,
                difficulty_level=$8,is_featured=$9,is_published=$10,search_keywords=$11,updated_by=$12,updated_at=NOW(),
                published_at=CASE WHEN $10 = TRUE AND published_at IS NULL THEN NOW() ELSE published_at END
            WHERE id=$13
            RETURNING *
          `,
          [...params, id]
        )
      : await client.query<HelpArticleRow>(
          `
            INSERT INTO help_articles (category_id,title,slug,summary,content_md,visibility,estimated_read_minutes,difficulty_level,is_featured,is_published,search_keywords,created_by,updated_by,published_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,CASE WHEN $10 = TRUE THEN NOW() ELSE NULL END)
            RETURNING *
          `,
          params
        );
    const article = articleResult.rows[0];
    if (!article) throw new Error("Article not found");
    await replaceArticleChildren(client, article.id, input);
    await client.query("COMMIT");
    return hydrateArticle(db, article);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function replaceArticleChildren(client: PoolClient, articleId: number, input: HelpArticleInput) {
  await Promise.all([
    client.query(`DELETE FROM help_article_permissions WHERE article_id = $1`, [articleId]),
    client.query(`DELETE FROM help_article_assets WHERE article_id = $1`, [articleId]),
    client.query(`DELETE FROM help_article_faqs WHERE article_id = $1`, [articleId]),
    client.query(`DELETE FROM help_article_relations WHERE article_id = $1`, [articleId]),
  ]);
  for (const permissionId of input.permission_ids ?? []) {
    await client.query(`INSERT INTO help_article_permissions (article_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [articleId, permissionId]);
  }
  for (const [index, asset] of (input.assets ?? []).entries()) {
    if (!asset.file_url) continue;
    await client.query(
      `INSERT INTO help_article_assets (article_id, asset_type, title, file_url, thumbnail_url, sort_order) VALUES ($1,$2,$3,$4,$5,$6)`,
      [articleId, asset.asset_type, asset.title ?? null, asset.file_url, asset.thumbnail_url ?? null, asset.sort_order ?? index]
    );
  }
  for (const [index, faq] of (input.faqs ?? []).entries()) {
    if (!faq.question || !faq.answer) continue;
    await client.query(
      `INSERT INTO help_article_faqs (article_id, question, answer, sort_order) VALUES ($1,$2,$3,$4)`,
      [articleId, faq.question, faq.answer, faq.sort_order ?? index]
    );
  }
  for (const relatedId of input.related_article_ids ?? []) {
    if (relatedId === articleId) continue;
    await client.query(`INSERT INTO help_article_relations (article_id, related_article_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [articleId, relatedId]);
  }
}

export async function deleteHelpArticle(db: Pool, id: number) {
  await db.query(
    `UPDATE help_articles
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            is_published = FALSE,
            updated_at = NOW()
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE`,
    [id]
  );
}

export async function logHelpSearch(db: Queryable, userId: number | null, searchTerm: string, resultsCount: number) {
  if (!searchTerm.trim()) return;
  await db.query(`INSERT INTO help_search_logs (user_id, search_term, results_count) VALUES ($1,$2,$3)`, [userId, searchTerm, resultsCount]);
}

export async function logHelpArticleView(db: Queryable, articleId: number, userId: number | null) {
  await db.query(`INSERT INTO help_article_views (article_id, user_id) VALUES ($1,$2)`, [articleId, userId]);
}

export async function getHelpAnalytics(db: Queryable) {
  const [mostViewed, searches, zeroViews, noResults, updates] = await Promise.all([
    db.query(`
      SELECT a.id, a.title, a.slug, COUNT(v.id)::int AS views
      FROM help_articles a
      LEFT JOIN help_article_views v ON v.article_id = a.id
      WHERE COALESCE(a.is_deleted, FALSE) = FALSE
      GROUP BY a.id
      ORDER BY views DESC, a.title ASC
      LIMIT 10
    `),
    db.query(`SELECT search_term, COUNT(*)::int AS count FROM help_search_logs GROUP BY search_term ORDER BY count DESC LIMIT 10`),
    db.query(`
      SELECT a.id, a.title, a.slug
      FROM help_articles a
      LEFT JOIN help_article_views v ON v.article_id = a.id
      WHERE v.id IS NULL
        AND COALESCE(a.is_deleted, FALSE) = FALSE
      ORDER BY a.updated_at DESC
      LIMIT 10
    `),
    db.query(`SELECT search_term, searched_at FROM help_search_logs WHERE results_count = 0 ORDER BY searched_at DESC LIMIT 10`),
    listHelpRecentUpdates(db, { includeDrafts: true, limit: 10 }),
  ]);
  return { mostViewed: mostViewed.rows, searches: searches.rows, zeroViews: zeroViews.rows, noResults: noResults.rows, recentUpdates: updates };
}

export function userCanSeeArticle(user: PermissionUser | null | undefined, article: HelpArticleRow) {
  if (article.visibility === "PUBLIC") return true;
  if (article.visibility === "AUTHENTICATED") return Boolean(user);
  return (article.permissions ?? []).some((permission) => hasPermission(user, permission.code));
}
