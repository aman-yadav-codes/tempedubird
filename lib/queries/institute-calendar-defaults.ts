type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;
};

export const DEFAULT_CALENDAR_FUTURE_YEAR_COUNT = 5;

function currentDefaultCalendarRange() {
  const currentYear = new Date().getFullYear();
  return {
    start: new Date(currentYear, 0, 1),
    end: new Date(currentYear + DEFAULT_CALENDAR_FUTURE_YEAR_COUNT, 11, 31, 23, 59, 59, 999),
  };
}

export async function ensureCalendarDefaultImportSchema(db: Queryable) {
  await db.query(`ALTER TABLE institution_calendar_events ALTER COLUMN institution_id DROP NOT NULL`);
  await db.query(`
    ALTER TABLE institution_calendar_events
      ADD COLUMN IF NOT EXISTS source_calendar_event_id INTEGER REFERENCES institution_calendar_events(id) ON DELETE SET NULL
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_calendar_events_source
      ON institution_calendar_events(source_calendar_event_id)
  `);
}

export async function importDefaultCalendarEvents(
  db: Queryable,
  institutionId: number,
  actorId: number | null
) {
  await ensureCalendarDefaultImportSchema(db);
  const { start, end } = currentDefaultCalendarRange();
  const result = await db.query(
    `
      INSERT INTO institution_calendar_events (
        institution_id,
        title,
        description,
        event_type,
        start_date,
        end_date,
        color,
        source_calendar_event_id,
        created_by,
        updated_at
      )
      SELECT
        $1,
        defaults.title,
        defaults.description,
        defaults.event_type,
        defaults.start_date,
        defaults.end_date,
        defaults.color,
        defaults.id,
        $4,
        CURRENT_TIMESTAMP
      FROM institution_calendar_events defaults
      WHERE defaults.institution_id IS NULL
        AND COALESCE(defaults.is_deleted, FALSE) = FALSE
        AND defaults.end_date >= $2
        AND defaults.start_date <= $3
        AND NOT EXISTS (
          SELECT 1
          FROM institution_calendar_events existing
          WHERE existing.institution_id = $1
            AND COALESCE(existing.is_deleted, FALSE) = FALSE
            AND (
              existing.source_calendar_event_id = defaults.id
              OR (
                existing.title = defaults.title
                AND existing.event_type = defaults.event_type
                AND existing.start_date = defaults.start_date
                AND existing.end_date = defaults.end_date
              )
            )
        )
    `,
    [institutionId, start, end, actorId]
  );

  return Number(result.rowCount ?? 0);
}
