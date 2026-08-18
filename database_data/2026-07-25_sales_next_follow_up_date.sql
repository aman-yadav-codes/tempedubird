ALTER TABLE public.sales_contacts
  ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;

CREATE INDEX IF NOT EXISTS idx_sales_contacts_follow_up
  ON public.sales_contacts (is_deleted, next_follow_up_date)
  WHERE next_follow_up_date IS NOT NULL;
