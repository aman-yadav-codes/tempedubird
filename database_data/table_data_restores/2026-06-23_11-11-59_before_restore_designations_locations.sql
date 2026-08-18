--
-- PostgreSQL database dump
--

\restrict MSvqP8jh1crQ7tPgabQS0SWmTiCgVTXBkR1Ydr1Wic0neE5LMKfXlue2zqsZuai

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
-- Data for Name: designations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.designations (id, name, slug, is_active, is_deleted, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.locations (id, name, slug, type, parent_id, latitude, longitude, is_active, is_deleted, created_at, updated_at, location_scope) FROM stdin;
\.


--
-- Name: designations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.designations_id_seq', 1, false);


--
-- Name: locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.locations_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict MSvqP8jh1crQ7tPgabQS0SWmTiCgVTXBkR1Ydr1Wic0neE5LMKfXlue2zqsZuai

