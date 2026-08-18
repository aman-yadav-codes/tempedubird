--
-- PostgreSQL database dump
--

\restrict NblRJrSAWOFv69aKqiKEJJI9r97hJMqyRQHR0uRcWIJobrTYHynFctjd0LahXQI

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
-- Data for Name: academic_session_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.academic_session_templates (id, name, start_date, end_date, is_active, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: facility_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.facility_types (id, name, slug, created_at, updated_at, is_active, is_deleted) FROM stdin;
\.


--
-- Data for Name: institution_subtypes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.institution_subtypes (id, name, slug, created_at, updated_at, is_active, is_deleted) FROM stdin;
\.


--
-- Data for Name: institution_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.institution_types (id, name, slug, created_at, updated_at, is_active, is_deleted) FROM stdin;
\.


--
-- Data for Name: languages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.languages (id, name, slug, created_at, updated_at, is_active, is_deleted) FROM stdin;
\.


--
-- Data for Name: program_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.program_types (id, name, slug, created_at, updated_at, is_active, is_deleted) FROM stdin;
\.


--
-- Name: academic_session_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.academic_session_templates_id_seq', 1, false);


--
-- Name: facility_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.facility_types_id_seq', 1, false);


--
-- Name: institution_subtypes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.institution_subtypes_id_seq', 1, false);


--
-- Name: institution_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.institution_types_id_seq', 1, false);


--
-- Name: languages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.languages_id_seq', 1, false);


--
-- Name: program_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.program_types_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict NblRJrSAWOFv69aKqiKEJJI9r97hJMqyRQHR0uRcWIJobrTYHynFctjd0LahXQI

