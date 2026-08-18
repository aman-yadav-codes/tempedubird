ALTER TABLE public.student_id_cards
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES public.academic_years(id) ON DELETE SET NULL;

UPDATE public.student_id_cards card
SET academic_year_id = enrollment.academic_year_id
FROM public.student_enrollments enrollment
WHERE card.academic_year_id IS NULL
  AND enrollment.id = card.enrollment_id;

CREATE INDEX IF NOT EXISTS idx_student_id_cards_session
  ON public.student_id_cards(institution_id, academic_year_id, is_deleted, created_at DESC);

ALTER TABLE public.institution_generated_documents
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES public.academic_years(id) ON DELETE SET NULL;

UPDATE public.institution_generated_documents document
SET academic_year_id = enrollment.academic_year_id
FROM public.student_enrollments enrollment
WHERE document.academic_year_id IS NULL
  AND enrollment.id = document.enrollment_id;

CREATE INDEX IF NOT EXISTS idx_institution_generated_documents_session
  ON public.institution_generated_documents(institution_id, academic_year_id, reference_type, is_deleted, created_at DESC);
