ALTER TABLE public.institution_news
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES public.academic_years(id) ON DELETE SET NULL;

UPDATE public.institution_news news
SET academic_year_id = (
  SELECT academic_year.id
  FROM public.academic_years academic_year
  WHERE academic_year.institution_id = news.institution_id
    AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
    AND COALESCE(academic_year.is_active, TRUE) = TRUE
  ORDER BY
    CASE WHEN CURRENT_DATE BETWEEN academic_year.start_date AND academic_year.end_date THEN 0 ELSE 1 END,
    academic_year.start_date DESC,
    academic_year.id DESC
  LIMIT 1
)
WHERE news.academic_year_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.academic_years academic_year
    WHERE academic_year.institution_id = news.institution_id
      AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
      AND COALESCE(academic_year.is_active, TRUE) = TRUE
  );

CREATE INDEX IF NOT EXISTS idx_institution_news_session
  ON public.institution_news(institution_id, academic_year_id, published_at DESC)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

ALTER TABLE public.institution_complaints
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES public.academic_years(id) ON DELETE SET NULL;

UPDATE public.institution_complaints complaint
SET academic_year_id = (
  SELECT academic_year.id
  FROM public.academic_years academic_year
  WHERE academic_year.institution_id = complaint.institution_id
    AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
    AND COALESCE(academic_year.is_active, TRUE) = TRUE
  ORDER BY
    CASE WHEN CURRENT_DATE BETWEEN academic_year.start_date AND academic_year.end_date THEN 0 ELSE 1 END,
    academic_year.start_date DESC,
    academic_year.id DESC
  LIMIT 1
)
WHERE complaint.academic_year_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.academic_years academic_year
    WHERE academic_year.institution_id = complaint.institution_id
      AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
      AND COALESCE(academic_year.is_active, TRUE) = TRUE
  );

CREATE INDEX IF NOT EXISTS idx_institution_complaints_session
  ON public.institution_complaints(institution_id, academic_year_id, updated_at DESC);
