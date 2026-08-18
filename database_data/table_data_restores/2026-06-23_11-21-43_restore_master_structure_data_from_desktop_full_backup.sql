BEGIN;
SET search_path TO public;

COPY public.academic_session_templates (id, name, start_date, end_date, is_active, created_by, updated_by, created_at, updated_at) FROM stdin;
1	2026-2027	2026-06-24	2027-06-19	t	1	1	2026-06-20 10:05:51.861756	2026-06-20 10:05:51.861756
2	2027-2028	2027-06-09	2028-06-15	t	63	63	2026-06-20 10:05:51.861756	2026-06-20 10:05:51.861756
\.

COPY public.facility_types (id, name, slug, created_at, updated_at, is_active, is_deleted) FROM stdin;
2	Hostel	hostel	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
3	Library	library	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
4	Laboratory	laboratory	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
6	Gym	gym	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
7	Cafeteria	cafeteria	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
8	Transport	transport	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
9	WiFi	wifi	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
10	Auditorium	auditorium	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
11	Parking	parking	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
12	Medical	medical	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
1	Campus	campus	2026-05-22 04:50:06.792338	2026-05-22 04:50:06.792338	t	f
5	Ground	ground	2026-05-22 04:50:06.792338	2026-06-20 13:45:09.968504	t	f
13	Classrooms	classrooms	2026-06-20 13:46:08.132816	2026-06-20 13:46:08.132816	t	f
\.

COPY public.institution_subtypes (id, name, slug, created_at, updated_at, is_active, is_deleted) FROM stdin;
2	Private	private	2026-05-22 04:40:56.151552	2026-05-22 04:40:56.151552	t	f
3	Public	public	2026-05-22 04:40:56.151552	2026-05-22 04:40:56.151552	t	f
5	Deemed	deemed	2026-05-22 04:40:56.151552	2026-05-22 04:40:56.151552	t	f
6	Semi Government	semi-government	2026-05-22 04:40:56.151552	2026-05-22 04:40:56.151552	t	f
1	Government	government	2026-05-22 04:40:56.151552	2026-05-22 04:40:56.151552	t	f
4	Autonomous	autonomous	2026-05-22 04:40:56.151552	2026-05-22 05:02:46.814575	t	f
\.

COPY public.institution_types (id, name, slug, created_at, updated_at, is_active, is_deleted) FROM stdin;
4	College	college	2026-05-21 12:41:23.616719	2026-05-22 07:01:04.887285	t	f
8	Coaching Institute	coaching-institute	2026-05-22 04:38:03.64491	2026-05-22 07:01:04.887285	t	f
5	School	school	2026-05-21 12:41:23.616719	2026-05-22 07:01:04.887285	t	f
7	University	university	2026-05-21 12:41:23.616719	2026-05-22 07:01:04.887285	t	f
\.

COPY public.languages (id, name, slug, created_at, updated_at, is_active, is_deleted) FROM stdin;
2	Hindi	hindi	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
3	Urdu	urdu	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
4	Bengali	bengali	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
5	Tamil	tamil	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
6	Telugu	telugu	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
7	Marathi	marathi	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
8	Gujarati	gujarati	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
9	Punjabi	punjabi	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
10	Kannada	kannada	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
11	Malayalam	malayalam	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
12	Odia	odia	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
13	Sanskrit	sanskrit	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
1	English	english	2026-05-22 04:50:46.97862	2026-05-22 04:50:46.97862	t	f
\.

COPY public.program_types (id, name, slug, created_at, updated_at, is_active, is_deleted) FROM stdin;
1	Course	course	2026-05-22 04:49:48.074848	2026-05-22 05:27:31.565349	t	f
2	Stream	stream	2026-05-22 04:49:48.074848	2026-05-22 05:27:31.565349	t	f
3	Batch	batch	2026-05-22 04:49:48.074848	2026-05-22 05:27:31.565349	t	f
4	Subject	subject	2026-06-08 16:43:45.494426	2026-06-08 16:43:45.494426	t	f
\.

SELECT pg_catalog.setval('public.academic_session_templates_id_seq', 56, true);
SELECT pg_catalog.setval('public.facility_types_id_seq', 13, true);
SELECT pg_catalog.setval('public.institution_subtypes_id_seq', 6, true);
SELECT pg_catalog.setval('public.institution_types_id_seq', 8, true);
SELECT pg_catalog.setval('public.languages_id_seq', 13, true);
SELECT pg_catalog.setval('public.program_types_id_seq', 4, true);

COMMIT;
