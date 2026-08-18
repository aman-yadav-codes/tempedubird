CREATE TABLE IF NOT EXISTS public.sales_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  package_for VARCHAR(160) NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_unit VARCHAR(20) NOT NULL DEFAULT 'month',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES public.users(id),
  created_by INTEGER REFERENCES public.users(id),
  updated_by INTEGER REFERENCES public.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_packages_active
  ON public.sales_packages (is_deleted, is_active, name);

CREATE TABLE IF NOT EXISTS public.sales_contacts (
  id SERIAL PRIMARY KEY,
  contact_type VARCHAR(40) NOT NULL,
  full_name VARCHAR(180) NOT NULL,
  emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  phones JSONB NOT NULL DEFAULT '[]'::jsonb,
  website VARCHAR(240),
  business_name VARCHAR(180),
  business_is_active BOOLEAN NOT NULL DEFAULT FALSE,
  designation VARCHAR(160),
  address TEXT,
  lead_source VARCHAR(40) NOT NULL,
  sales_stage VARCHAR(40) NOT NULL DEFAULT 'lead',
  pipeline_stage VARCHAR(40) NOT NULL DEFAULT 'meeting_demo',
  next_follow_up_date DATE,
  assigned_to INTEGER REFERENCES public.users(id),
  assigned_package_id INTEGER REFERENCES public.sales_packages(id),
  remarks TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES public.users(id),
  created_by INTEGER REFERENCES public.users(id),
  updated_by INTEGER REFERENCES public.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_contacts_search
  ON public.sales_contacts (is_deleted, sales_stage, lead_source, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_contacts_follow_up
  ON public.sales_contacts (is_deleted, next_follow_up_date)
  WHERE next_follow_up_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sales_contact_changes (
  id BIGSERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES public.sales_contacts(id),
  action VARCHAR(40) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  changed_by INTEGER REFERENCES public.users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
