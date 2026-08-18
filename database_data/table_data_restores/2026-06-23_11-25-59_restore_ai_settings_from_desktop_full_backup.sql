BEGIN;
SET search_path TO public;
DELETE FROM ai_content_field_settings;
DELETE FROM ai_content_types;
DELETE FROM ai_providers;
DELETE FROM app_settings;

COPY public.ai_content_field_settings (id, content_type_id, field_key, label, is_enabled, sort_order, created_at, created_by, updated_by, updated_at) FROM stdin;
\.

COPY public.ai_content_types (id, name, slug, provider_id, prompt_template, is_active, created_by, updated_by, created_at, updated_at) FROM stdin;
\.

COPY public.ai_providers (id, name, slug, base_url, model_name, chat_id, token, token_expires_at, is_active, created_by, updated_by, created_at, updated_at, last_response_id, institution_id, provider_scope) FROM stdin;
2	Open Ai	open-ai	https://api.openai.com	gpt-5.5	\N	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	\N	t	1	1	2026-06-19 15:54:59.508957	2026-06-19 15:54:59.508957	\N	\N	platform
\.

COPY public.app_settings (id, tracking_enabled, created_at, updated_at, tracker_update_interval_minutes) FROM stdin;
1	t	2026-05-30 11:44:49.907762	2026-05-30 11:51:01.00508	60
\.

SELECT pg_catalog.setval('public.ai_content_field_settings_id_seq', 17, true);
SELECT pg_catalog.setval('public.ai_content_types_id_seq', 3, true);
SELECT pg_catalog.setval('public.ai_providers_id_seq', 2, true);

COMMIT;
