--
-- PostgreSQL database dump
--

\restrict Fch9Ltp763D92FvPaCCNAt2b6CM8HASPU1mTduY93l7P6TqBsAOeH7K5pKGWUmk

-- Dumped from database version 17.10 (21f7c76)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: ai_providers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_providers (id, name, slug, base_url, model_name, chat_id, token, token_expires_at, is_active, created_by, updated_by, created_at, updated_at, last_response_id, institution_id, provider_scope) FROM stdin;
\.


--
-- Data for Name: ai_content_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_content_types (id, name, slug, provider_id, prompt_template, is_active, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_content_field_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_content_field_settings (id, content_type_id, field_key, label, is_enabled, sort_order, created_at, created_by, updated_by, updated_at) FROM stdin;
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_settings (id, tracking_enabled, created_at, updated_at, tracker_update_interval_minutes) FROM stdin;
1	t	2026-06-23 05:10:44.162841	2026-06-23 05:10:44.162841	60
\.


--
-- Name: ai_content_field_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_content_field_settings_id_seq', 1, false);


--
-- Name: ai_content_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_content_types_id_seq', 1, false);


--
-- Name: ai_providers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_providers_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict Fch9Ltp763D92FvPaCCNAt2b6CM8HASPU1mTduY93l7P6TqBsAOeH7K5pKGWUmk

