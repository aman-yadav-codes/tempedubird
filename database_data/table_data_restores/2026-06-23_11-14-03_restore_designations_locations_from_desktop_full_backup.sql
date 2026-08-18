BEGIN;

COPY public.designations (id, name, slug, is_active, is_deleted, created_at, updated_at, deleted_at) FROM stdin;
1	Senior Developer	senior-developer	t	f	2026-05-12 05:09:57.45752	2026-05-12 06:50:18.036124	\N
2	Junior Developer	junior-developer	t	f	2026-05-12 06:52:19.94378	2026-05-12 06:52:19.94378	\N
3	CEO	ceo	t	f	2026-05-12 06:52:59.844038	2026-05-12 06:52:59.844038	\N
4	CTO	cto	t	f	2026-05-12 06:53:00.464476	2026-05-12 06:53:00.464476	\N
5	CIO/Chief Digital Officer/Chief Innovation Officer	cio-chief-digital-officer-chief-innovation-officer	t	f	2026-05-12 06:53:01.061531	2026-05-12 06:53:01.061531	\N
6	VP of Product Management/Head of Product	vp-of-product-management-head-of-product	t	f	2026-05-12 06:53:01.664683	2026-05-12 06:53:01.664683	\N
7	Product Manager	product-manager	t	f	2026-05-12 06:53:02.267827	2026-05-12 06:53:02.267827	\N
8	VP of Marketing	vp-of-marketing	t	f	2026-05-12 06:53:02.979635	2026-05-12 06:53:02.979635	\N
9	VP of Engineering/Director of Engineering	vp-of-engineering-director-of-engineering	t	f	2026-05-12 06:53:05.020323	2026-05-12 06:53:05.020323	\N
10	Chief Architect	chief-architect	t	f	2026-05-12 06:53:05.946164	2026-05-12 06:53:05.946164	\N
11	Software Architect	software-architect	t	f	2026-05-12 06:53:07.367452	2026-05-12 06:53:07.367452	\N
12	Engineering Project Manager/Engineering Manager	engineering-project-manager-engineering-manager	t	f	2026-05-12 06:53:09.080964	2026-05-12 06:53:09.080964	\N
13	Technical Lead/Engineering Lead/Team Lead	technical-lead-engineering-lead-team-lead	t	f	2026-05-12 06:53:09.790566	2026-05-12 06:53:09.790566	\N
14	Principal Software Engineer	principal-software-engineer	t	f	2026-05-12 06:53:10.426193	2026-05-12 06:53:10.426193	\N
15	Senior Software Engineer/Senior Software Developer	senior-software-engineer-senior-software-developer	t	f	2026-05-12 06:53:11.046756	2026-05-12 06:53:11.046756	\N
17	Software Engineer	software-engineer	t	f	2026-05-12 06:53:14.092929	2026-05-12 06:53:14.092929	\N
18	Software Developer	software-developer	t	f	2026-05-12 06:53:14.687918	2026-05-12 06:53:14.687918	\N
19	Junior Software Developer	junior-software-developer	t	f	2026-05-12 06:53:15.446421	2026-05-12 06:53:15.446421	\N
20	Intern Software Developer	intern-software-developer	t	f	2026-05-12 06:53:16.043453	2026-05-12 06:53:16.043453	\N
21	VP of Engineering	vp-of-engineering	t	f	2026-05-12 06:53:16.628238	2026-05-12 06:53:16.628238	\N
22	Director of Engineering	director-of-engineering	t	f	2026-05-12 06:53:17.226768	2026-05-12 06:53:17.226768	\N
23	Engineering Project Manager	engineering-project-manager	t	f	2026-05-12 06:53:17.81196	2026-05-12 06:53:17.81196	\N
24	Engineering Manager	engineering-manager	t	f	2026-05-12 06:53:18.392694	2026-05-12 06:53:18.392694	\N
25	Technical Project Manager	technical-project-manager	t	f	2026-05-12 06:53:19.090987	2026-05-12 06:53:19.090987	\N
26	Project Manager	project-manager	t	f	2026-05-12 06:53:19.672734	2026-05-12 06:53:19.672734	\N
27	Business Account Manager	business-account-manager	t	f	2026-05-12 06:53:20.26866	2026-05-12 06:53:20.26866	\N
28	Senior Manager IT	senior-manager-it	t	f	2026-05-12 06:53:20.858558	2026-05-12 06:53:20.858558	\N
29	IT Infra Manager	it-infra-manager	t	f	2026-05-12 06:53:21.441146	2026-05-12 06:53:21.441146	\N
30	Procurement manager	procurement-manager	t	f	2026-05-12 06:53:22.034011	2026-05-12 06:53:22.034011	\N
31	Learning and Development Manager	learning-and-development-manager	t	f	2026-05-12 06:53:22.624015	2026-05-12 06:53:22.624015	\N
32	Learning and Development co-ordinators	learning-and-development-co-ordinators	t	f	2026-05-12 06:53:23.230246	2026-05-12 06:53:23.230246	\N
33	HR Coordinator	hr-coordinator	t	f	2026-05-12 06:53:23.836561	2026-05-12 06:53:23.836561	\N
34	Payroll Coordinator	payroll-coordinator	t	f	2026-05-12 06:53:24.422153	2026-05-12 06:53:24.422153	\N
35	Recruiting Coordinator	recruiting-coordinator	t	f	2026-05-12 06:53:25.004884	2026-05-12 06:53:25.004884	\N
36	HR Specialist	hr-specialist	t	f	2026-05-12 06:53:25.704217	2026-05-12 06:53:25.704217	\N
37	HR Generalist	hr-generalist	t	f	2026-05-12 06:53:26.286913	2026-05-12 06:53:26.286913	\N
38	Recruiter	recruiter	t	f	2026-05-12 06:53:26.872095	2026-05-12 06:53:26.872095	\N
39	Human Resource Information Specialist	human-resource-information-specialist	t	f	2026-05-12 06:53:27.450385	2026-05-12 06:53:27.450385	\N
40	HR Manager	hr-manager	t	f	2026-05-12 06:53:28.047139	2026-05-12 06:53:28.047139	\N
41	Recruiting Manager	recruiting-manager	t	f	2026-05-12 06:53:28.653345	2026-05-12 06:53:28.653345	\N
42	HR Business Partner	hr-business-partner	t	f	2026-05-12 06:53:29.251346	2026-05-12 06:53:29.251346	\N
43	HR Director	hr-director	t	f	2026-05-12 06:53:30.000058	2026-05-12 06:53:30.000058	\N
44	Recruiting Director	recruiting-director	t	f	2026-05-12 06:53:30.594954	2026-05-12 06:53:30.594954	\N
45	VP of HR	vp-of-hr	t	f	2026-05-12 06:53:31.186659	2026-05-12 06:53:31.186659	\N
46	Chief Human Resource Officer	chief-human-resource-officer	t	f	2026-05-12 06:53:31.768828	2026-05-12 06:53:31.768828	\N
47	Career Consultant	career-consultant	t	f	2026-05-12 06:53:32.378022	2026-05-12 06:53:32.378022	\N
48	Career Advisor	career-advisor	t	f	2026-05-12 06:53:32.975126	2026-05-12 06:53:32.975126	\N
49	Assignment Coordinator	assignment-coordinator	t	f	2026-05-12 06:53:33.969972	2026-05-12 06:53:33.969972	\N
50	Placement Coordinator	placement-coordinator	t	f	2026-05-12 06:53:34.797236	2026-05-12 06:53:34.797236	\N
51	Career Development Strategist	career-development-strategist	t	f	2026-05-12 06:53:35.648455	2026-05-12 06:53:35.648455	\N
52	Personnel Agent	personnel-agent	t	f	2026-05-12 06:53:36.578307	2026-05-12 06:53:36.578307	\N
53	Human Resources Officer	human-resources-officer	t	f	2026-05-12 06:53:37.347454	2026-05-12 06:53:37.347454	\N
54	SEO Manager	seo-manager	t	f	2026-05-12 06:53:37.937361	2026-05-12 06:53:37.937361	\N
55	SEO Engineer	seo-engineer	t	f	2026-05-12 06:53:38.576722	2026-05-12 06:53:38.576722	\N
56	Digital Marketing Manager	digital-marketing-manager	t	f	2026-05-12 06:53:39.161457	2026-05-12 06:53:39.161457	\N
57	Digital Marketing Analyst	digital-marketing-analyst	t	f	2026-05-12 06:53:39.756437	2026-05-12 06:53:39.756437	\N
58	Social Media Marketing Manager	social-media-marketing-manager	t	f	2026-05-12 06:53:40.37394	2026-05-12 06:53:40.37394	\N
59	Social Media Marketing Analyst	social-media-marketing-analyst	t	f	2026-05-12 06:53:40.995324	2026-05-12 06:53:40.995324	\N
60	MARKETING TECHNOLOGIST	marketing-technologist	t	f	2026-05-12 06:53:41.657209	2026-05-12 06:53:41.657209	\N
61	SEO CONSULTANT	seo-consultant	t	f	2026-05-12 06:53:42.379585	2026-05-12 06:53:42.379585	\N
62	WEB ANALYTICS DEVELOPER	web-analytics-developer	t	f	2026-05-12 06:53:43.062853	2026-05-12 06:53:43.062853	\N
63	SOCIAL MEDIA MANAGER	social-media-manager	t	f	2026-05-12 06:53:43.82495	2026-05-12 06:53:43.82495	\N
64	GROWTH HACKER	growth-hacker	t	f	2026-05-12 06:53:44.648725	2026-05-12 06:53:44.648725	\N
65	CONTENT MANAGER	content-manager	t	f	2026-05-12 06:53:45.737145	2026-05-12 06:53:45.737145	\N
66	CONTENT STRATEGIST	content-strategist	t	f	2026-05-12 06:53:46.522483	2026-05-12 06:53:46.522483	\N
67	Admin Big Data	admin-big-data	t	f	2026-05-12 06:53:47.29259	2026-05-12 06:53:47.29259	\N
68	Ansible Operations Engineer	ansible-operations-engineer	t	f	2026-05-12 06:53:48.034028	2026-05-12 06:53:48.034028	\N
69	Artifactory Administrator	artifactory-administrator	t	f	2026-05-12 06:53:49.082659	2026-05-12 06:53:49.082659	\N
70	Artificial intelligence / Machine Learning Engineer	artificial-intelligence-machine-learning-engineer	t	f	2026-05-12 06:53:50.010827	2026-05-12 06:53:50.010827	\N
71	Artificial Intelligence / Machine Learning Leader	artificial-intelligence-machine-learning-leader	t	f	2026-05-12 06:53:50.624189	2026-05-12 06:53:50.624189	\N
72	Artificial Intelligence / Machine Learning Sr.Leader	artificial-intelligence-machine-learning-sr-leader	t	f	2026-05-12 06:53:51.545127	2026-05-12 06:53:51.545127	\N
73	Artificial intelligence Architect	artificial-intelligence-architect	t	f	2026-05-12 06:53:52.150923	2026-05-12 06:53:52.150923	\N
74	Artificial Intelligence Researcher	artificial-intelligence-researcher	t	f	2026-05-12 06:53:52.864686	2026-05-12 06:53:52.864686	\N
75	Big Data Architect	big-data-architect	t	f	2026-05-12 06:53:53.85481	2026-05-12 06:53:53.85481	\N
76	Big Data Engineer	big-data-engineer	t	f	2026-05-12 06:53:54.49065	2026-05-12 06:53:54.49065	\N
77	Big Data Specialist	big-data-specialist	t	f	2026-05-12 06:53:55.132722	2026-05-12 06:53:55.132722	\N
78	Build and Release Engineer	build-and-release-engineer	t	f	2026-05-12 06:53:55.883113	2026-05-12 06:53:55.883113	\N
79	Build Engineer	build-engineer	t	f	2026-05-12 06:53:56.522444	2026-05-12 06:53:56.522444	\N
80	Chef Operations Engineer	chef-operations-engineer	t	f	2026-05-12 06:53:57.157165	2026-05-12 06:53:57.157165	\N
81	Data Analysts	data-analysts	t	f	2026-05-12 06:53:57.825911	2026-05-12 06:53:57.825911	\N
82	Data Architect	data-architect	t	f	2026-05-12 06:53:59.08742	2026-05-12 06:53:59.08742	\N
83	DevOps Architect	devops-architect	t	f	2026-05-12 06:53:59.751345	2026-05-12 06:53:59.751345	\N
84	DevOps Engineer	devops-engineer	t	f	2026-05-12 06:54:00.670507	2026-05-12 06:54:00.670507	\N
85	ELK Engineer	elk-engineer	t	f	2026-05-12 06:54:01.268587	2026-05-12 06:54:01.268587	\N
86	Gerrit Administrator	gerrit-administrator	t	f	2026-05-12 06:54:01.910682	2026-05-12 06:54:01.910682	\N
87	Jenkins Engineer	jenkins-engineer	t	f	2026-05-12 06:54:02.537377	2026-05-12 06:54:02.537377	\N
88	Jira Administrator	jira-administrator	t	f	2026-05-12 06:54:03.157916	2026-05-12 06:54:03.157916	\N
89	Kubernetes Operations Engineer	kubernetes-operations-engineer	t	f	2026-05-12 06:54:03.751923	2026-05-12 06:54:03.751923	\N
90	Machine learning Architect	machine-learning-architect	t	f	2026-05-12 06:54:04.363248	2026-05-12 06:54:04.363248	\N
91	Machine Learning Engineer	machine-learning-engineer	t	f	2026-05-12 06:54:04.984785	2026-05-12 06:54:04.984785	\N
92	Operations Engineer	operations-engineer	t	f	2026-05-12 06:54:05.733309	2026-05-12 06:54:05.733309	\N
93	Principle Engineer in Artificial Intelligence	principle-engineer-in-artificial-intelligence	t	f	2026-05-12 06:54:06.335559	2026-05-12 06:54:06.335559	\N
94	Principle Engineer in Big Data	principle-engineer-in-big-data	t	f	2026-05-12 06:54:06.923379	2026-05-12 06:54:06.923379	\N
95	Principle Engineer in Data Analysis	principle-engineer-in-data-analysis	t	f	2026-05-12 06:54:07.510147	2026-05-12 06:54:07.510147	\N
96	Principle Engineer in Machine Learning	principle-engineer-in-machine-learning	t	f	2026-05-12 06:54:08.098051	2026-05-12 06:54:08.098051	\N
97	Production Support Engineer	production-support-engineer	t	f	2026-05-12 06:54:08.694077	2026-05-12 06:54:08.694077	\N
98	Puppet Operations Engineer	puppet-operations-engineer	t	f	2026-05-12 06:54:09.277595	2026-05-12 06:54:09.277595	\N
99	Senior Build and Release Engineer	senior-build-and-release-engineer	t	f	2026-05-12 06:54:09.902268	2026-05-12 06:54:09.902268	\N
100	Senior Build Engineer	senior-build-engineer	t	f	2026-05-12 06:54:10.487169	2026-05-12 06:54:10.487169	\N
101	Senior DevOps Engineer	senior-devops-engineer	t	f	2026-05-12 06:54:11.073708	2026-05-12 06:54:11.073708	\N
102	Senior Site reliability Engineer	senior-site-reliability-engineer	t	f	2026-05-12 06:54:11.65142	2026-05-12 06:54:11.65142	\N
103	Site Reliability Engineer (Kubernetes – Docker)	site-reliability-engineer-kubernetes-docker	t	f	2026-05-12 06:54:12.23709	2026-05-12 06:54:12.23709	\N
104	Splunk Engineer	splunk-engineer	t	f	2026-05-12 06:54:12.828959	2026-05-12 06:54:12.828959	\N
105	.NET Developer	net-developer	t	f	2026-05-12 06:54:13.412666	2026-05-12 06:54:13.412666	\N
106	ACCESSIBILITY SPECIALIST	accessibility-specialist	t	f	2026-05-12 06:54:13.997372	2026-05-12 06:54:13.997372	\N
107	AGILE PROJECT MANAGER	agile-project-manager	t	f	2026-05-12 06:54:14.588186	2026-05-12 06:54:14.588186	\N
108	Android Developer	android-developer	t	f	2026-05-12 06:54:15.257894	2026-05-12 06:54:15.257894	\N
109	Ansible Automation Engineer	ansible-automation-engineer	t	f	2026-05-12 06:54:15.882724	2026-05-12 06:54:15.882724	\N
110	AppDynamics Engineer	appdynamics-engineer	t	f	2026-05-12 06:54:16.49082	2026-05-12 06:54:16.49082	\N
111	Application Security Engineer	application-security-engineer	t	f	2026-05-12 06:54:17.172879	2026-05-12 06:54:17.172879	\N
112	Artifactory Engineer	artifactory-engineer	t	f	2026-05-12 06:54:17.763841	2026-05-12 06:54:17.763841	\N
113	Artificial Intelligence (AI) / Machine Learning Engineer	artificial-intelligence-ai-machine-learning-engineer	t	f	2026-05-12 06:54:18.374174	2026-05-12 06:54:18.374174	\N
114	AWS DevOps Engineer	aws-devops-engineer	t	f	2026-05-12 06:54:18.984432	2026-05-12 06:54:18.984432	\N
115	AWS Solutions Architect	aws-solutions-architect	t	f	2026-05-12 06:54:19.582385	2026-05-12 06:54:19.582385	\N
116	Azure DevOps Engineer	azure-devops-engineer	t	f	2026-05-12 06:54:20.170352	2026-05-12 06:54:20.170352	\N
117	Bamboo Engineer	bamboo-engineer	t	f	2026-05-12 06:54:20.761032	2026-05-12 06:54:20.761032	\N
118	Bitbucket Engineer	bitbucket-engineer	t	f	2026-05-12 06:54:21.353833	2026-05-12 06:54:21.353833	\N
119	Blockchain Developer	blockchain-developer	t	f	2026-05-12 06:54:21.934682	2026-05-12 06:54:21.934682	\N
120	BUSINESS SYSTEMS ANALYST	business-systems-analyst	t	f	2026-05-12 06:54:22.525446	2026-05-12 06:54:22.525446	\N
121	C# Developer	c-developer	t	f	2026-05-12 06:54:23.130763	2026-05-12 06:54:23.130763	\N
122	Chef InSpec Engineer	chef-inspec-engineer	t	f	2026-05-12 06:54:23.737881	2026-05-12 06:54:23.737881	\N
123	Cloud administrator	cloud-administrator	t	f	2026-05-12 06:54:24.382145	2026-05-12 06:54:24.382145	\N
124	CLOUD ARCHITECT	cloud-architect	t	f	2026-05-12 06:54:25.136513	2026-05-12 06:54:25.136513	\N
125	Cloud automation engineer	cloud-automation-engineer	t	f	2026-05-12 06:54:25.757736	2026-05-12 06:54:25.757736	\N
126	Cloud engineer	cloud-engineer	t	f	2026-05-12 06:54:26.412637	2026-05-12 06:54:26.412637	\N
127	Cloud network engineer	cloud-network-engineer	t	f	2026-05-12 06:54:27.017617	2026-05-12 06:54:27.017617	\N
128	Cloud Security Engineer	cloud-security-engineer	t	f	2026-05-12 06:54:27.632793	2026-05-12 06:54:27.632793	\N
129	CNC Programmer	cnc-programmer	t	f	2026-05-12 06:54:28.251336	2026-05-12 06:54:28.251336	\N
130	Coder	coder	t	f	2026-05-12 06:54:28.844196	2026-05-12 06:54:28.844196	\N
131	COMPUTER GRAPHICS ANIMATOR	computer-graphics-animator	t	f	2026-05-12 06:54:29.474985	2026-05-12 06:54:29.474985	\N
132	Computer Hardware Engineer	computer-hardware-engineer	t	f	2026-05-12 06:54:30.127353	2026-05-12 06:54:30.127353	\N
133	Computer Network Architect	computer-network-architect	t	f	2026-05-12 06:54:30.817498	2026-05-12 06:54:30.817498	\N
134	Computer Programmer	computer-programmer	t	f	2026-05-12 06:54:31.426832	2026-05-12 06:54:31.426832	\N
135	Computer Research Scientist	computer-research-scientist	t	f	2026-05-12 06:54:32.035029	2026-05-12 06:54:32.035029	\N
136	Computer Systems Analyst	computer-systems-analyst	t	f	2026-05-12 06:54:32.670927	2026-05-12 06:54:32.670927	\N
137	Confluence Engineer	confluence-engineer	t	f	2026-05-12 06:54:33.283378	2026-05-12 06:54:33.283378	\N
138	Consul Engineer	consul-engineer	t	f	2026-05-12 06:54:33.883527	2026-05-12 06:54:33.883527	\N
139	Coverage.py Engineer	coverage-py-engineer	t	f	2026-05-12 06:54:34.817315	2026-05-12 06:54:34.817315	\N
140	Data Analyst	data-analyst	t	f	2026-05-12 06:54:35.439093	2026-05-12 06:54:35.439093	\N
141	Data Engineer	data-engineer	t	f	2026-05-12 06:54:36.02881	2026-05-12 06:54:36.02881	\N
142	DATA MODELER	data-modeler	t	f	2026-05-12 06:54:36.836757	2026-05-12 06:54:36.836757	\N
143	DATA SCIENTIST	data-scientist	t	f	2026-05-12 06:54:37.435947	2026-05-12 06:54:37.435947	\N
144	DATABASE ADMINISTRATOR	database-administrator	t	f	2026-05-12 06:54:38.017679	2026-05-12 06:54:38.017679	\N
145	Datadog Engineer	datadog-engineer	t	f	2026-05-12 06:54:38.660618	2026-05-12 06:54:38.660618	\N
146	Developer	developer	t	f	2026-05-12 06:54:39.263679	2026-05-12 06:54:39.263679	\N
147	DEVOPS MANAGER	devops-manager	t	f	2026-05-12 06:54:39.844601	2026-05-12 06:54:39.844601	\N
148	DevSecOps Architect	devsecops-architect	t	f	2026-05-12 06:54:40.427171	2026-05-12 06:54:40.427171	\N
149	DevSecOps Engineer	devsecops-engineer	t	f	2026-05-12 06:54:41.022126	2026-05-12 06:54:41.022126	\N
150	Docker Engineer	docker-engineer	t	f	2026-05-12 06:54:41.61723	2026-05-12 06:54:41.61723	\N
151	Embedded Software Engineer	embedded-software-engineer	t	f	2026-05-12 06:54:42.205861	2026-05-12 06:54:42.205861	\N
152	Entry Level Developer	entry-level-developer	t	f	2026-05-12 06:54:42.789855	2026-05-12 06:54:42.789855	\N
153	Entry Level Network Engineer	entry-level-network-engineer	t	f	2026-05-12 06:54:43.373254	2026-05-12 06:54:43.373254	\N
154	Entry Level Programmer	entry-level-programmer	t	f	2026-05-12 06:54:43.960049	2026-05-12 06:54:43.960049	\N
155	Entry Level Software Developer	entry-level-software-developer	t	f	2026-05-12 06:54:44.55302	2026-05-12 06:54:44.55302	\N
156	Entry Level Software Engineer	entry-level-software-engineer	t	f	2026-05-12 06:54:45.132532	2026-05-12 06:54:45.132532	\N
157	Entry Level Web Developer	entry-level-web-developer	t	f	2026-05-12 06:54:45.721676	2026-05-12 06:54:45.721676	\N
158	Envoy Engineer	envoy-engineer	t	f	2026-05-12 06:54:46.302376	2026-05-12 06:54:46.302376	\N
159	Falco Engineer	falco-engineer	t	f	2026-05-12 06:54:46.894133	2026-05-12 06:54:46.894133	\N
160	FluentD Engineer	fluentd-engineer	t	f	2026-05-12 06:54:47.605792	2026-05-12 06:54:47.605792	\N
161	Fortify Engineer	fortify-engineer	t	f	2026-05-12 06:54:48.194896	2026-05-12 06:54:48.194896	\N
162	FRAMEWORKS SPECIALIST	frameworks-specialist	t	f	2026-05-12 06:54:48.795829	2026-05-12 06:54:48.795829	\N
163	Front End Developer	front-end-developer	t	f	2026-05-12 06:54:49.401905	2026-05-12 06:54:49.401905	\N
164	Front End Web Developer	front-end-web-developer	t	f	2026-05-12 06:54:49.998023	2026-05-12 06:54:49.998023	\N
165	FRONT-END DESIGNER	front-end-designer	t	f	2026-05-12 06:54:50.601098	2026-05-12 06:54:50.601098	\N
166	Full Stack Developer	full-stack-developer	t	f	2026-05-12 06:54:51.201253	2026-05-12 06:54:51.201253	\N
167	Full Stack JAVA Developer/Programmer/Engineer	full-stack-java-developer-programmer-engineer	t	f	2026-05-12 06:54:51.80843	2026-05-12 06:54:51.80843	\N
168	Full Stack Python Developer/Programmer/Engineer	full-stack-python-developer-programmer-engineer	t	f	2026-05-12 06:54:52.404408	2026-05-12 06:54:52.404408	\N
170	Game Developer	game-developer	t	f	2026-05-12 06:54:56.103908	2026-05-12 06:54:56.103908	\N
171	GCP DevOps Engineer	gcp-devops-engineer	t	f	2026-05-12 06:54:59.302062	2026-05-12 06:54:59.302062	\N
172	Gerrit Engineer	gerrit-engineer	t	f	2026-05-12 06:55:12.849704	2026-05-12 06:55:12.849704	\N
173	Git Engineer	git-engineer	t	f	2026-05-12 06:55:13.813492	2026-05-12 06:55:13.813492	\N
174	Github Engineer	github-engineer	t	f	2026-05-12 06:55:14.684815	2026-05-12 06:55:14.684815	\N
175	GitLab Engineer	gitla-engineer	t	f	2026-05-12 06:55:15.312541	2026-05-12 06:55:15.312541	\N
176	Gradle Engineer	gradle-engineer	t	f	2026-05-12 06:55:15.929002	2026-05-12 06:55:15.929002	\N
177	Grafana Engineer	grafana-engineer	t	f	2026-05-12 06:55:16.630522	2026-05-12 06:55:16.630522	\N
178	Groovy Engineer	groovy-engineer	t	f	2026-05-12 06:55:17.21831	2026-05-12 06:55:17.21831	\N
179	INFORMATION ARCHITECT	information-architect	t	f	2026-05-12 06:55:17.810102	2026-05-12 06:55:17.810102	\N
180	Information Security Analyst	information-security-analyst	t	f	2026-05-12 06:55:18.394924	2026-05-12 06:55:18.394924	\N
181	INTERACTION DESIGNER	interaction-designer	t	f	2026-05-12 06:55:18.997824	2026-05-12 06:55:18.997824	\N
182	IOS Developer	ios-developer	t	f	2026-05-12 06:55:19.580728	2026-05-12 06:55:19.580728	\N
183	Istio Engineer	istio-engineer	t	f	2026-05-12 06:55:20.167424	2026-05-12 06:55:20.167424	\N
184	IT Manager	it-manager	t	f	2026-05-12 06:55:20.749269	2026-05-12 06:55:20.749269	\N
185	JaCoCO Engineer	jacoco-engineer	t	f	2026-05-12 06:55:21.348335	2026-05-12 06:55:21.348335	\N
186	Java Developer	java-developer	t	f	2026-05-12 06:55:21.942254	2026-05-12 06:55:21.942254	\N
187	JavaScript Developer	javascript-developer	t	f	2026-05-12 06:55:22.534189	2026-05-12 06:55:22.534189	\N
188	JIRA Engineer	jira-engineer	t	f	2026-05-12 06:55:23.132182	2026-05-12 06:55:23.132182	\N
189	Jr Developer	jr-developer	t	f	2026-05-12 06:55:23.721955	2026-05-12 06:55:23.721955	\N
191	Junior Front End Developer	junior-front-end-developer	t	f	2026-05-12 06:55:24.924746	2026-05-12 06:55:24.924746	\N
192	Junior IOS Developer	junior-ios-developer	t	f	2026-05-12 06:55:25.653972	2026-05-12 06:55:25.653972	\N
193	Junior Software Engineer	junior-software-engineer	t	f	2026-05-12 06:55:26.249065	2026-05-12 06:55:26.249065	\N
194	Junior Web Developer	junior-web-developer	t	f	2026-05-12 06:55:26.845793	2026-05-12 06:55:26.845793	\N
195	JUnit Engineer	junit-engineer	t	f	2026-05-12 06:55:27.442777	2026-05-12 06:55:27.442777	\N
196	kubernetes Administrator	kubernetes-administrator	t	f	2026-05-12 06:55:28.030633	2026-05-12 06:55:28.030633	\N
197	Kubernetes Engineer	kubernetes-engineer	t	f	2026-05-12 06:55:28.734858	2026-05-12 06:55:28.734858	\N
198	MAVEN Engineer	maven-engineer	t	f	2026-05-12 06:55:29.331979	2026-05-12 06:55:29.331979	\N
199	Micro services / API Lead Designer	micro-services-api-lead-designer	t	f	2026-05-12 06:55:29.936147	2026-05-12 06:55:29.936147	\N
200	MOBILE APP DEVELOPER	mobile-app-developer	t	f	2026-05-12 06:55:30.541225	2026-05-12 06:55:30.541225	\N
201	Mobile Application Developer	mobile-application-developer	t	f	2026-05-12 06:55:31.129655	2026-05-12 06:55:31.129655	\N
202	MOBILE DEVELOPER	mobile-developer	t	f	2026-05-12 06:55:31.719945	2026-05-12 06:55:31.719945	\N
203	Mulesoft Developer	mulesoft-developer	t	f	2026-05-12 06:55:32.327272	2026-05-12 06:55:32.327272	\N
204	Nagios Engineer	nagios-engineer	t	f	2026-05-12 06:55:32.911916	2026-05-12 06:55:32.911916	\N
205	Network and Systems Administrator	network-and-systems-administrator	t	f	2026-05-12 06:55:33.501677	2026-05-12 06:55:33.501677	\N
206	Network Engineer	network-engineer	t	f	2026-05-12 06:55:34.195915	2026-05-12 06:55:34.195915	\N
207	New Grad Software Engineer	new-grad-software-engineer	t	f	2026-05-12 06:55:34.781756	2026-05-12 06:55:34.781756	\N
208	New Relic Engineer	new-relic-engineer	t	f	2026-05-12 06:55:35.693067	2026-05-12 06:55:35.693067	\N
209	Nexus Engineer	nexus-engineer	t	f	2026-05-12 06:55:36.27783	2026-05-12 06:55:36.27783	\N
210	Nomad Engineer	nomad-engineer	t	f	2026-05-12 06:55:36.878417	2026-05-12 06:55:36.878417	\N
211	Notary Engineer	notary-engineer	t	f	2026-05-12 06:55:37.635606	2026-05-12 06:55:37.635606	\N
212	Octopus Deploy Engineer	octopus-deploy-engineer	t	f	2026-05-12 06:55:38.227562	2026-05-12 06:55:38.227562	\N
213	OpenShift Engineer	openshift-engineer	t	f	2026-05-12 06:55:38.814391	2026-05-12 06:55:38.814391	\N
214	OpenStack Engineer	openstack-engineer	t	f	2026-05-12 06:55:39.397971	2026-05-12 06:55:39.397971	\N
215	Oracle Developer	oracle-developer	t	f	2026-05-12 06:55:39.98578	2026-05-12 06:55:39.98578	\N
216	Oracle SQL Developer	oracle-sql-developer	t	f	2026-05-12 06:55:40.574548	2026-05-12 06:55:40.574548	\N
217	Packer Engineer	packer-engineer	t	f	2026-05-12 06:55:41.422201	2026-05-12 06:55:41.422201	\N
218	PHP Developer	php-developer	t	f	2026-05-12 06:55:42.013782	2026-05-12 06:55:42.013782	\N
219	Powershell Engineer	powershell-engineer	t	f	2026-05-12 06:55:42.766388	2026-05-12 06:55:42.766388	\N
220	Programmer	programmer	t	f	2026-05-12 06:55:43.669798	2026-05-12 06:55:43.669798	\N
221	Programmer Analyst	programmer-analyst	t	f	2026-05-12 06:55:44.564528	2026-05-12 06:55:44.564528	\N
222	Prometheus Engineer	prometheus-engineer	t	f	2026-05-12 06:55:45.161561	2026-05-12 06:55:45.161561	\N
223	Puppet Engineer	puppet-engineer	t	f	2026-05-12 06:55:45.827176	2026-05-12 06:55:45.827176	\N
224	PyTest Engineer	pytest-engineer	t	f	2026-05-12 06:55:46.413864	2026-05-12 06:55:46.413864	\N
225	Python Developer	python-developer	t	f	2026-05-12 06:55:46.998609	2026-05-12 06:55:46.998609	\N
226	QA (QUALITY ASSURANCE) SPECIALIST	qa-quality-assurance-specialist	t	f	2026-05-12 06:55:47.735002	2026-05-12 06:55:47.735002	\N
227	QA Engineer	qa-engineer	t	f	2026-05-12 06:55:48.321612	2026-05-12 06:55:48.321612	\N
228	React Developer	react-developer	t	f	2026-05-12 06:55:48.908369	2026-05-12 06:55:48.908369	\N
229	Robotics Engineer	robotics-engineer	t	f	2026-05-12 06:55:49.493351	2026-05-12 06:55:49.493351	\N
230	RUBY ON RAILS DEVELOPER	ruby-on-rails-developer	t	f	2026-05-12 06:55:50.312322	2026-05-12 06:55:50.312322	\N
231	Salesforce Developer	salesforce-developer	t	f	2026-05-12 06:55:50.902262	2026-05-12 06:55:50.902262	\N
232	Search Engine Optimization	search-engine-optimization	t	f	2026-05-12 06:55:51.50437	2026-05-12 06:55:51.50437	\N
233	SECURITY SPECIALIST	security-specialist	t	f	2026-05-12 06:55:52.093224	2026-05-12 06:55:52.093224	\N
234	Selenium Engineer	selenium-engineer	t	f	2026-05-12 06:55:52.674722	2026-05-12 06:55:52.674722	\N
235	Senior Ansible Development Engineer	senior-ansible-development-engineer	t	f	2026-05-12 06:55:53.453045	2026-05-12 06:55:53.453045	\N
236	Senior Cloud Architect	senior-cloud-architect	t	f	2026-05-12 06:55:54.035745	2026-05-12 06:55:54.035745	\N
237	Senior DevOps Architect	senior-devops-architect	t	f	2026-05-12 06:55:54.667576	2026-05-12 06:55:54.667576	\N
238	Senior DevSecOps Architect	senior-devsecops-architect	t	f	2026-05-12 06:55:55.269885	2026-05-12 06:55:55.269885	\N
239	Senior DevSecOps Engineer	senior-devsecops-engineer	t	f	2026-05-12 06:55:55.851297	2026-05-12 06:55:55.851297	\N
240	Senior SRE Architect	senior-sre-architect	t	f	2026-05-12 06:55:56.570225	2026-05-12 06:55:56.570225	\N
241	Senior SRE Engineer	senior-sre-engineer	t	f	2026-05-12 06:55:57.155078	2026-05-12 06:55:57.155078	\N
242	Sharepoint Developer	sharepoint-developer	t	f	2026-05-12 06:55:57.737695	2026-05-12 06:55:57.737695	\N
243	SOFTWARE DEVELOPERS	software-developers	t	f	2026-05-12 06:55:58.424702	2026-05-12 06:55:58.424702	\N
244	SonarQube Engineer	sonarqube-engineer	t	f	2026-05-12 06:55:59.015472	2026-05-12 06:55:59.015472	\N
245	Splunk Enterprise Security Engineer	splunk-enterprise-security-engineer	t	f	2026-05-12 06:55:59.605315	2026-05-12 06:55:59.605315	\N
246	SQL Developer	sql-developer	t	f	2026-05-12 06:56:00.185228	2026-05-12 06:56:00.185228	\N
247	SRE Architect	sre-architect	t	f	2026-05-12 06:56:00.772734	2026-05-12 06:56:00.772734	\N
248	SRE Engineer	sre-engineer	t	f	2026-05-12 06:56:01.381044	2026-05-12 06:56:01.381044	\N
249	SYSTEMS ADMINISTRATOR	systems-administrator	t	f	2026-05-12 06:56:01.964899	2026-05-12 06:56:01.964899	\N
250	SYSTEMS ENGINEER	systems-engineer	t	f	2026-05-12 06:56:02.543328	2026-05-12 06:56:02.543328	\N
251	TeamCity Engineer	teamcity-engineer	t	f	2026-05-12 06:56:03.129556	2026-05-12 06:56:03.129556	\N
252	Tech Sales Engineer	tech-sales-engineer	t	f	2026-05-12 06:56:03.707738	2026-05-12 06:56:03.707738	\N
253	TECHNICAL ACCOUNT MANAGER	technical-account-manager	t	f	2026-05-12 06:56:04.306812	2026-05-12 06:56:04.306812	\N
254	TECHNICAL LEAD	technical-lead	t	f	2026-05-12 06:56:04.887277	2026-05-12 06:56:04.887277	\N
255	Terraform Engineer	terraform-engineer	t	f	2026-05-12 06:56:05.46906	2026-05-12 06:56:05.46906	\N
256	TFS Engineer	tfs-engineer	t	f	2026-05-12 06:56:06.117103	2026-05-12 06:56:06.117103	\N
257	Twistkock Engineer	twistkock-engineer	t	f	2026-05-12 06:56:06.703844	2026-05-12 06:56:06.703844	\N
258	UDeploy Engineer	udeploy-engineer	t	f	2026-05-12 06:56:07.295768	2026-05-12 06:56:07.295768	\N
259	UI DESIGNER	ui-designer	t	f	2026-05-12 06:56:07.876369	2026-05-12 06:56:07.876369	\N
260	UI Developer	ui-developer	t	f	2026-05-12 06:56:08.471354	2026-05-12 06:56:08.471354	\N
261	Unity Developer	unity-developer	t	f	2026-05-12 06:56:09.058211	2026-05-12 06:56:09.058211	\N
262	UX DESIGNER	ux-designer	t	f	2026-05-12 06:56:09.63466	2026-05-12 06:56:09.63466	\N
263	Vault Engineer	vault-engineer	t	f	2026-05-12 06:56:10.216133	2026-05-12 06:56:10.216133	\N
264	Web Designer (UI/UX Designer)	web-designer-ui-ux-designer	t	f	2026-05-12 06:56:10.795798	2026-05-12 06:56:10.795798	\N
265	Web Developer	web-developer	t	f	2026-05-12 06:56:11.380474	2026-05-12 06:56:11.380474	\N
266	WordPress Developer	wordpress-developer	t	f	2026-05-12 06:56:12.074857	2026-05-12 06:56:12.074857	\N
267	XL Deploy Engineer	xl-deploy-engineer	t	f	2026-05-12 06:56:12.661651	2026-05-12 06:56:12.661651	\N
268	Zabbix Engineer	zabbix-engineer	t	f	2026-05-12 06:56:13.240235	2026-05-12 06:56:13.240235	\N
269	html	html	t	f	2026-05-12 06:56:13.824027	2026-05-12 06:56:13.824027	\N
270	logo design	logo-design	t	f	2026-05-12 06:56:14.405612	2026-05-12 06:56:14.405612	\N
271	Tele caller	tele-caller	t	f	2026-05-12 06:56:15.384533	2026-05-12 06:56:15.384533	\N
272	Graphics designer	graphics-designer	t	f	2026-05-12 06:56:15.966218	2026-05-12 06:56:15.966218	\N
273	Computer Operator	computer-operator	t	f	2026-05-12 06:56:16.754642	2026-05-12 06:56:16.754642	\N
274	Office excutive	office-excutive	t	f	2026-05-12 06:56:17.353746	2026-05-12 06:56:17.353746	\N
275	Driver	driver	t	f	2026-05-12 06:56:17.932238	2026-05-12 06:56:17.932238	\N
276	Supervisor	supervisor	t	f	2026-05-12 06:56:18.513022	2026-05-12 06:56:18.513022	\N
277	Incharge	incharge	t	f	2026-05-12 06:56:19.093308	2026-05-12 06:56:19.093308	\N
278	Cook	cook	t	f	2026-05-12 06:56:19.677027	2026-05-12 06:56:19.677027	\N
279	Cleaner	cleaner	t	f	2026-05-12 06:56:20.266813	2026-05-12 06:56:20.266813	\N
280	Baby Sitter	baby-sitter	t	f	2026-05-12 06:56:20.852609	2026-05-12 06:56:20.852609	\N
281	Elderly Care	elderly-care-taker	t	f	2026-05-12 06:56:21.429293	2026-05-12 06:56:21.429293	\N
282	Marketing excutive	marketing-excutive	t	f	2026-05-12 06:56:22.019017	2026-05-12 06:56:22.019017	\N
283	Logo designer	logo-designer	t	f	2026-05-12 06:56:22.602677	2026-05-12 06:56:22.602677	\N
284	Front Desk	front-desk	t	f	2026-05-12 06:56:23.195697	2026-05-12 06:56:23.195697	\N
285	Front office	front-office	t	f	2026-05-12 06:56:23.920632	2026-05-12 06:56:23.920632	\N
286	Fresher	fresher	t	f	2026-05-12 06:56:24.507408	2026-05-12 06:56:24.507408	\N
287	Content writer	content-writer	t	f	2026-05-12 06:56:25.189344	2026-05-12 06:56:25.189344	\N
288	Writer	writer	t	f	2026-05-12 06:56:25.900151	2026-05-12 06:56:25.900151	\N
289	Business development manager	business-development-manager	t	f	2026-05-12 06:56:26.482276	2026-05-12 06:56:26.482276	\N
290	Laravel Developer	laravel-developer	t	f	2026-05-12 06:56:27.445323	2026-05-12 06:56:27.445323	\N
291	Dot net developer trainee	dot-net-developer-trainee	t	f	2026-05-12 06:56:28.034093	2026-05-12 06:56:28.034093	\N
292	Software Analyst	software-analyst	t	f	2026-05-12 06:56:28.616745	2026-05-12 06:56:28.616745	\N
293	CorporateTrainer (Health & Wellness)	corporate-trainer	t	f	2026-05-12 06:56:29.199409	2026-05-12 06:56:29.199409	\N
294	Node.js Developer	node-js-developer	t	f	2026-05-12 06:56:29.782059	2026-05-12 06:56:29.782059	\N
295	upsc teacher	upsc-teacher	t	f	2026-05-12 06:56:30.363805	2026-05-12 06:56:30.363805	\N
296	psychiatrist	psychiatrist	t	f	2026-05-12 06:56:30.947354	2026-05-12 06:56:30.947354	\N
297	psychologist	psychologist	t	f	2026-05-12 06:56:31.535203	2026-05-12 06:56:31.535203	\N
298	Flutter Developer	flutter-developer	t	f	2026-05-12 06:56:32.119983	2026-05-12 06:56:32.119983	\N
299	Digital Marketing Executive	digital-marketing-executive	t	f	2026-05-12 06:56:32.699508	2026-05-12 06:56:32.699508	\N
300	Telecaller	telecaller	t	f	2026-05-12 06:56:33.27935	2026-05-12 06:56:33.27935	\N
301	BPO Executive	bpo-executive	t	f	2026-05-12 06:56:33.870103	2026-05-12 06:56:33.870103	\N
302	Copywriter	copywriter	t	f	2026-05-12 06:56:34.476069	2026-05-12 06:56:34.476069	\N
303	HR Executive	hr-executive	t	f	2026-05-12 06:56:35.095613	2026-05-12 06:56:35.095613	\N
304	Sales Executive	sales-executive	t	f	2026-05-12 06:56:35.696888	2026-05-12 06:56:35.696888	\N
305	Sales Manager	sales-manager	t	f	2026-05-12 06:56:36.319404	2026-05-12 06:56:36.319404	\N
306	Customer Support Executive	customer-support-executive	t	f	2026-05-12 06:56:36.915424	2026-05-12 06:56:36.915424	\N
307	Business Development Executive (BDE)	business-development-executive-bde	t	f	2026-05-12 06:56:37.506828	2026-05-12 06:56:37.506828	\N
308	Faculty	faculty	t	f	2026-05-12 06:56:38.116262	2026-05-12 06:56:38.116262	\N
309	multiple domains	multiple-domains	t	f	2026-05-12 06:56:38.736531	2026-05-12 06:56:38.736531	\N
310	Backend Developer	backend-developer	t	f	2026-05-12 06:56:39.329512	2026-05-12 06:56:39.329512	\N
311	Frontend Developer	frontend-developer	t	f	2026-05-12 06:56:39.911454	2026-05-12 06:56:39.911454	\N
312	Desktop Application Developer	desktop-application-developer	t	f	2026-05-12 06:56:40.494792	2026-05-12 06:56:40.494792	\N
313	React Native Developer	react-native-developer	t	f	2026-05-12 06:56:41.090377	2026-05-12 06:56:41.090377	\N
314	API Developer	api-developer	t	f	2026-05-12 06:56:41.677645	2026-05-12 06:56:41.677645	\N
315	Cloud Developer	cloud-developer	t	f	2026-05-12 06:56:42.27162	2026-05-12 06:56:42.27162	\N
316	Unreal Engine	unreal-engine	t	f	2026-05-12 06:56:42.941212	2026-05-12 06:56:42.941212	\N
317	System Software Engineer	system-software-engineer	t	f	2026-05-12 06:56:43.55252	2026-05-12 06:56:43.55252	\N
318	Firmware Developer	firmware-developer	t	f	2026-05-12 06:56:44.148463	2026-05-12 06:56:44.148463	\N
319	AI	ai	t	f	2026-05-12 06:56:44.730278	2026-05-12 06:56:44.730278	\N
320	ML Engineer	ml-engineer	t	f	2026-05-12 06:56:45.319171	2026-05-12 06:56:45.319171	\N
321	VR Developer	vr-developer	t	f	2026-05-12 06:56:45.911057	2026-05-12 06:56:45.911057	\N
322	AR Developer	ar-developer	t	f	2026-05-12 06:56:46.531559	2026-05-12 06:56:46.531559	\N
323	React.js Developer	react-js-developer	t	f	2026-05-12 06:56:47.111966	2026-05-12 06:56:47.111966	\N
324	Angular-Developer	angular-developer	t	f	2026-05-12 06:56:47.700871	2026-05-12 06:56:47.700871	\N
325	Vue.js Developer	vue-js-developer	t	f	2026-05-12 06:56:48.296832	2026-05-12 06:56:48.296832	\N
326	Shopify Developer	shopify-developer	t	f	2026-05-12 06:56:48.880641	2026-05-12 06:56:48.880641	\N
327	Lead-Software-Developer	lead-software-developer	t	f	2026-05-12 06:56:49.472572	2026-05-12 06:56:49.472572	\N
328	Software Development Manager	software-development-manager	t	f	2026-05-12 06:56:50.079894	2026-05-12 06:56:50.079894	\N
329	Site Reliability Engineer (SRE)	site-reliability-engineer-sre	t	f	2026-05-12 06:56:50.857999	2026-05-12 06:56:50.857999	\N
330	QA Automation Engineer	qa-automation-engineer	t	f	2026-05-12 06:56:51.43872	2026-05-12 06:56:51.43872	\N
331	Test Engineer	test-engineer	t	f	2026-05-12 06:56:52.023473	2026-05-12 06:56:52.023473	\N
332	Database Developer / DBA	database-developer-dba	t	f	2026-05-12 06:56:52.610056	2026-05-12 06:56:52.610056	\N
333	UX Developer	ux-developer	t	f	2026-05-12 06:56:53.188964	2026-05-12 06:56:53.188964	\N
334	Next.js Developer	next-js-developer	t	f	2026-05-12 06:56:53.766133	2026-05-12 06:56:53.766133	\N
335	Magento Developer	magento-developer	t	f	2026-05-12 06:56:54.354005	2026-05-12 06:56:54.354005	\N
336	Drupal Developer	drupal-developer	t	f	2026-05-12 06:56:54.943726	2026-05-12 06:56:54.943726	\N
337	UI/UX Designer (Web Focused)	ui-ux-designer-web-focused	t	f	2026-05-12 06:56:55.528649	2026-05-12 06:56:55.528649	\N
338	Graphic & Web Designer	graphic-web-designer	t	f	2026-05-12 06:56:56.113144	2026-05-12 06:56:56.113144	\N
339	Motion UI Developer	motion-ui-developer	t	f	2026-05-12 06:56:56.703067	2026-05-12 06:56:56.703067	\N
340	Senior Web Developer	senior-web-developer	t	f	2026-05-12 06:56:57.290714	2026-05-12 06:56:57.290714	\N
341	Lead Web Developer	lead-web-developer	t	f	2026-05-12 06:56:57.87067	2026-05-12 06:56:57.87067	\N
342	Technical Lead (Web)	technical-lead-web	t	f	2026-05-12 06:56:58.455103	2026-05-12 06:56:58.455103	\N
343	Web Architect / Solution Architect	web-architect-solution-architect	t	f	2026-05-12 06:56:59.041023	2026-05-12 06:56:59.041023	\N
344	WebDevelopment Manager	web-development-manager	t	f	2026-05-12 06:56:59.633977	2026-05-12 06:56:59.633977	\N
345	Frontend Engineer	frontend-engineer	t	f	2026-05-12 06:57:00.262498	2026-05-12 06:57:00.262498	\N
346	Backend Engineer	backend-engineer	t	f	2026-05-12 06:57:00.851459	2026-05-12 06:57:00.851459	\N
347	CMS  Developer	cms-developer	t	f	2026-05-12 06:57:01.444243	2026-05-12 06:57:01.444243	\N
348	Web Application Developer	web-application-developer	t	f	2026-05-12 06:57:02.026873	2026-05-12 06:57:02.026873	\N
349	Progressive Web App (PWA) Developer	progressive-web-app-pwa-developer	t	f	2026-05-12 06:57:02.610575	2026-05-12 06:57:02.610575	\N
350	E-Commerce Developer	e-commerce-developer	t	f	2026-05-12 06:57:03.198304	2026-05-12 06:57:03.198304	\N
351	SEO Specialist (Technical SEO in Web Development)	seo-specialist-technical-seo-in-web-development	t	f	2026-05-12 06:57:03.780049	2026-05-12 06:57:03.780049	\N
352	DevOps Engineer (for web projects)	devops-engineer-for-web-projects	t	f	2026-05-12 06:57:04.376023	2026-05-12 06:57:04.376023	\N
353	AI/ML Engineer	ai-ml-engineer	t	f	2026-05-12 06:57:04.961877	2026-05-12 06:57:04.961877	\N
354	AR/VR Developer	ar-vr-developer	t	f	2026-05-12 06:57:05.545407	2026-05-12 06:57:05.545407	\N
355	QA / Test Engineer	qa-test-engineer	t	f	2026-05-12 06:57:06.12698	2026-05-12 06:57:06.12698	\N
356	UI/UX Developer	ui-ux-developer	t	f	2026-05-12 06:57:06.710128	2026-05-12 06:57:06.710128	\N
357	Native App Developer	native-app-developer	t	f	2026-05-12 06:57:07.302621	2026-05-12 06:57:07.302621	\N
358	Hybrid App Developer	hybrid-app-developer	t	f	2026-05-12 06:57:07.89044	2026-05-12 06:57:07.89044	\N
359	Game App Developer	game-app-developer	t	f	2026-05-12 06:57:08.48853	2026-05-12 06:57:08.48853	\N
360	AR/VR App Developer	ar-vr-app-developer	t	f	2026-05-12 06:57:09.07437	2026-05-12 06:57:09.07437	\N
361	IoT App Developer	iot-app-developer	t	f	2026-05-12 06:57:09.651821	2026-05-12 06:57:09.651821	\N
362	Wearable-App-Developer	wearable-app-developer	t	f	2026-05-12 06:57:10.231549	2026-05-12 06:57:10.231549	\N
363	Senior Mobile App Developer	senior-mobile-app-developer	t	f	2026-05-12 06:57:10.809149	2026-05-12 06:57:10.809149	\N
364	Lead Developer / Lead Engineer	lead-developer-lead-engineer	t	f	2026-05-12 06:57:11.395881	2026-05-12 06:57:11.395881	\N
365	Solution Architect / Web Architect / Mobile Architect	solution-architect-web-architect-mobile-architect	t	f	2026-05-12 06:57:11.979042	2026-05-12 06:57:11.979042	\N
366	CTO (Chief Technology Officer)	cto-chief-technology-officer	t	f	2026-05-12 06:57:12.561454	2026-05-12 06:57:12.561454	\N
367	Cross Platform App Developer	cross-platform-app-developer	t	f	2026-05-12 06:57:13.148042	2026-05-12 06:57:13.148042	\N
368	Kotlin Developer (Android)	kotlin-developer-android	t	f	2026-05-12 06:57:13.732712	2026-05-12 06:57:13.732712	\N
369	Java Android Developer	java-android-developer	t	f	2026-05-12 06:57:14.314504	2026-05-12 06:57:14.314504	\N
370	Swift-Developer-(iOS)	swift-developer-ios	t	f	2026-05-12 06:57:14.906274	2026-05-12 06:57:14.906274	\N
371	Objective-C Developer (iOS)	objective-c-developer-ios	t	f	2026-05-12 06:57:15.49708	2026-05-12 06:57:15.49708	\N
372	Dart Developer (Flutter)	dart-developer-flutter	t	f	2026-05-12 06:57:16.085022	2026-05-12 06:57:16.085022	\N
373	Xamarin Developer	xamarin-developer	t	f	2026-05-12 06:57:16.672615	2026-05-12 06:57:16.672615	\N
374	Ionic Developer	ionic-developer	t	f	2026-05-12 06:57:17.253319	2026-05-12 06:57:17.253319	\N
375	PhoneGap Developer	phonegap-developer	t	f	2026-05-12 06:57:17.83191	2026-05-12 06:57:17.83191	\N
376	Game App Developer (Unity / Unreal Engine)	game-app-developer-unity-unreal-engine	t	f	2026-05-12 06:57:18.415565	2026-05-12 06:57:18.415565	\N
377	Wearable App Developer (Android Wear / Apple Watch)	wearable-app-developer-android-wear-apple-watch	t	f	2026-05-12 06:57:18.998256	2026-05-12 06:57:18.998256	\N
378	IoT App Developer (Mobile Connected Apps)	iot-app-developer-mobile-connected-apps	t	f	2026-05-12 06:57:19.580942	2026-05-12 06:57:19.580942	\N
379	Lead Mobile Engineer	lead-mobile-engineer	t	f	2026-05-12 06:57:20.161647	2026-05-12 06:57:20.161647	\N
380	Mobile Solutions Architect	mobile-solutions-architect	t	f	2026-05-12 06:57:20.742195	2026-05-12 06:57:20.742195	\N
381	Application Development Manager	application-development-manager	t	f	2026-05-12 06:57:21.319627	2026-05-12 06:57:21.319627	\N
382	Engineering Manager (Mobile)	engineering-manager-mobile	t	f	2026-05-12 06:57:21.901334	2026-05-12 06:57:21.901334	\N
383	CTO (Chief Technology Officer) – Mobile/Product Focus	cto-chief-technology-officer-mobile-product-focus	t	f	2026-05-12 06:57:22.491247	2026-05-12 06:57:22.491247	\N
384	Mobile UI/UX Designer	mobile-ui-ux-designer	t	f	2026-05-12 06:57:23.069746	2026-05-12 06:57:23.069746	\N
385	Mobile QA / Test Engineer	mobile-qa-test-engineer	t	f	2026-05-12 06:57:23.648318	2026-05-12 06:57:23.648318	\N
386	Mobile Automation Tester	mobile-automation-tester	t	f	2026-05-12 06:57:24.230199	2026-05-12 06:57:24.230199	\N
387	Mobile DevOps Engineer	mobile-devops-engineer	t	f	2026-05-12 06:57:24.80959	2026-05-12 06:57:24.80959	\N
388	App Store Optimization (ASO) Specialist	app-store-optimization-aso-specialist	t	f	2026-05-12 06:57:25.418985	2026-05-12 06:57:25.418985	\N
389	Mobile Security Engineer	mobile-security-engineer	t	f	2026-05-12 06:57:26.000714	2026-05-12 06:57:26.000714	\N
390	Android Application Engineer	android-application-engineer	t	f	2026-05-12 06:57:26.592783	2026-05-12 06:57:26.592783	\N
391	Mobile Application Developer (Android)	mobile-application-developer-android	t	f	2026-05-12 06:57:27.174038	2026-05-12 06:57:27.174038	\N
392	Android Software Engineer	android-software-engineer	t	f	2026-05-12 06:57:27.75787	2026-05-12 06:57:27.75787	\N
393	Android SDK Developer	android-sdk-developer	t	f	2026-05-12 06:57:28.347519	2026-05-12 06:57:28.347519	\N
394	Android-UI/UX-Developer	android-ui-ux-developer	t	f	2026-05-12 06:57:28.933734	2026-05-12 06:57:28.933734	\N
395	Android Games Developer	android-games-developer	t	f	2026-05-12 06:57:29.520943	2026-05-12 06:57:29.520943	\N
396	Junior Android Developer	junior-android-developer	t	f	2026-05-12 06:57:30.114792	2026-05-12 06:57:30.114792	\N
397	Senior Android Developer	senior-android-developer	t	f	2026-05-12 06:57:30.704059	2026-05-12 06:57:30.704059	\N
398	Lead Android Engineer	lead-android-engineer	t	f	2026-05-12 06:57:31.289456	2026-05-12 06:57:31.289456	\N
399	iOS Application Engineer	ios-application-engineer	t	f	2026-05-12 06:57:31.878184	2026-05-12 06:57:31.878184	\N
400	iOS Software Engineer	ios-software-engineer	t	f	2026-05-12 06:57:32.459087	2026-05-12 06:57:32.459087	\N
401	iOS Mobile App Developer	ios-mobile-app-developer	t	f	2026-05-12 06:57:33.047721	2026-05-12 06:57:33.047721	\N
402	iOS SDK Developer	ios-sdk-developer	t	f	2026-05-12 06:57:33.632422	2026-05-12 06:57:33.632422	\N
403	iOS Games Developer	ios-games-developer	t	f	2026-05-12 06:57:34.265075	2026-05-12 06:57:34.265075	\N
404	Senior iOS Developer	senior-ios-developer	t	f	2026-05-12 06:57:34.98718	2026-05-12 06:57:34.98718	\N
405	Lead iOS Engineer	lead-ios-engineer	t	f	2026-05-12 06:57:35.586462	2026-05-12 06:57:35.586462	\N
406	Cross-Platform Mobile App Developer	cross-platform-mobile-app-developer	t	f	2026-05-12 06:57:36.172235	2026-05-12 06:57:36.172235	\N
407	Flutter Application Engineer	flutter-application-engineer	t	f	2026-05-12 06:57:36.750837	2026-05-12 06:57:36.750837	\N
408	Flutter Software Engineer	flutter-software-engineer	t	f	2026-05-12 06:57:37.34266	2026-05-12 06:57:37.34266	\N
409	Hybrid App Developer (Flutter, React Native)	hybrid-app-developer-flutter-react-native	t	f	2026-05-12 06:57:37.937491	2026-05-12 06:57:37.937491	\N
410	Robotic Surgeon	robotic-surgeon	t	f	2026-05-12 06:57:38.527508	2026-05-12 06:57:38.527508	\N
411	Fibroid Specialist	fibroid-specialist	t	f	2026-05-12 06:57:39.106979	2026-05-12 06:57:39.106979	\N
412	Gynaecologist	gynaecologist	t	f	2026-05-12 06:57:39.696772	2026-05-12 06:57:39.696772	\N
413	Mobile UI Developer (Flutter)	mobile-ui-developer-flutter	t	f	2026-05-12 06:57:40.281598	2026-05-12 06:57:40.281598	\N
414	Junior Flutter Developer	junior-flutter-developer	t	f	2026-05-12 06:57:40.86528	2026-05-12 06:57:40.86528	\N
415	Senior Flutter Developer	senior-flutter-developer	t	f	2026-05-12 06:57:41.449045	2026-05-12 06:57:41.449045	\N
416	Flutter Technical Lead	flutter-technical-lead	t	f	2026-05-12 06:57:42.03372	2026-05-12 06:57:42.03372	\N
417	Flutter Full Stack Mobile Developer	flutter-full-stack-mobile-developer	t	f	2026-05-12 06:57:42.620404	2026-05-12 06:57:42.620404	\N
418	Mobile Software Engineer	mobile-software-engineer	t	f	2026-05-12 06:57:43.203811	2026-05-12 06:57:43.203811	\N
419	Mobile Application Designer & Developer	mobile-application-designer-developer	t	f	2026-05-12 06:57:43.786835	2026-05-12 06:57:43.786835	\N
420	Native App Developer (Android/iOS)	native-app-developer-android-ios	t	f	2026-05-12 06:57:44.405453	2026-05-12 06:57:44.405453	\N
421	Application Architect (Mobile)	application-architect-mobile	t	f	2026-05-12 06:57:44.983038	2026-05-12 06:57:44.983038	\N
422	Mobile Product Engineer	mobile-product-engineer	t	f	2026-05-12 06:57:45.564793	2026-05-12 06:57:45.564793	\N
423	App Development Team Lead	app-development-team-lead	t	f	2026-05-12 06:57:46.146628	2026-05-12 06:57:46.146628	\N
424	Mobile Application Support Engineer	mobile-application-support-engineer	t	f	2026-05-12 06:57:46.727493	2026-05-12 06:57:46.727493	\N
425	Mobile Application Tester (QA for Apps)	mobile-application-tester-qa-for-apps	t	f	2026-05-12 06:57:47.313948	2026-05-12 06:57:47.313948	\N
426	Digital Marketing Specialist	digital-marketing-specialist	t	f	2026-05-12 06:57:47.901795	2026-05-12 06:57:47.901795	\N
427	SEO Executive	seo-executive	t	f	2026-05-12 06:57:48.480496	2026-05-12 06:57:48.480496	\N
428	Social Media Executive	social-media-executive	t	f	2026-05-12 06:57:49.06923	2026-05-12 06:57:49.06923	\N
429	Social Media Specialist	social-media-specialist	t	f	2026-05-12 06:57:49.647273	2026-05-12 06:57:49.647273	\N
430	Email Marketing Executive	email-marketing-executive	t	f	2026-05-12 06:57:50.235427	2026-05-12 06:57:50.235427	\N
431	Email Marketing Specialist	email-marketing-specialist	t	f	2026-05-12 06:57:50.816042	2026-05-12 06:57:50.816042	\N
432	SEM Executive	sem-executive	t	f	2026-05-12 06:57:51.40382	2026-05-12 06:57:51.40382	\N
433	Affiliate Marketing Executive	affiliate-marketing-executive	t	f	2026-05-12 06:57:51.988515	2026-05-12 06:57:51.988515	\N
434	Affiliate Marketing Specialist	affiliate-marketing-specialist	t	f	2026-05-12 06:57:52.566104	2026-05-12 06:57:52.566104	\N
435	PPC / SEM Manager	ppc-sem-manager	t	f	2026-05-12 06:57:53.149722	2026-05-12 06:57:53.149722	\N
436	Email Marketing Manager	email-marketing-manager	t	f	2026-05-12 06:57:53.731447	2026-05-12 06:57:53.731447	\N
437	Affiliate Marketing Manager	affiliate-marketing-manager	t	f	2026-05-12 06:57:54.318378	2026-05-12 06:57:54.318378	\N
438	Head of Digital Marketing	head-of-digital-marketing	t	f	2026-05-12 06:57:54.904928	2026-05-12 06:57:54.904928	\N
439	Digital Marketing Director	digital-marketing-director	t	f	2026-05-12 06:57:55.485526	2026-05-12 06:57:55.485526	\N
440	PPC / SEM Executive / Specialist	ppc-sem-executive-specialist	t	f	2026-05-12 06:57:56.071239	2026-05-12 06:57:56.071239	\N
441	Telecaller Executive	telecaller-executive	t	f	2026-05-12 06:57:56.653116	2026-05-12 06:57:56.653116	\N
442	Telecaller (Sales)	telecaller-sales	t	f	2026-05-12 06:57:57.239723	2026-05-12 06:57:57.239723	\N
443	Telecaller (Customer Support)	telecaller-customer-support	t	f	2026-05-12 06:57:57.838067	2026-05-12 06:57:57.838067	\N
444	Outbound Telecaller	outbound-telecaller	t	f	2026-05-12 06:57:58.427955	2026-05-12 06:57:58.427955	\N
445	Inbound Telecaller	inbound-telecaller	t	f	2026-05-12 06:57:59.009564	2026-05-12 06:57:59.009564	\N
446	Telemarketing Executive	telemarketing-executive	t	f	2026-05-12 06:57:59.592336	2026-05-12 06:57:59.592336	\N
447	Lead-Generation Telecaller	lead-generation-telecaller	t	f	2026-05-12 06:58:00.1759	2026-05-12 06:58:00.1759	\N
448	Collections Telecaller	collections-telecaller	t	f	2026-05-12 06:58:00.764733	2026-05-12 06:58:00.764733	\N
449	Senior Telecaller	senior-telecaller	t	f	2026-05-12 06:58:01.369879	2026-05-12 06:58:01.369879	\N
450	Telecalling Supervisor	telecalling-supervisor	t	f	2026-05-12 06:58:01.947508	2026-05-12 06:58:01.947508	\N
451	Customer Care Executive (CCE)	customer-care-executive-cce	t	f	2026-05-12 06:58:02.526046	2026-05-12 06:58:02.526046	\N
452	Call Center Executive	call-center-executive	t	f	2026-05-12 06:58:03.112777	2026-05-12 06:58:03.112777	\N
453	Customer Support Associate	customer-support-associate	t	f	2026-05-12 06:58:03.699838	2026-05-12 06:58:03.699838	\N
454	Process Associate (BPO)	process-associate-bpo	t	f	2026-05-12 06:58:04.289555	2026-05-12 06:58:04.289555	\N
455	Technical Support Executive	technical-support-executive	t	f	2026-05-12 06:58:04.865928	2026-05-12 06:58:04.865928	\N
456	Chat Support Executive	chat-support-executive	t	f	2026-05-12 06:58:05.449744	2026-05-12 06:58:05.449744	\N
457	Email Support Executive	email-support-executive	t	f	2026-05-12 06:58:06.028208	2026-05-12 06:58:06.028208	\N
458	Senior BPO Executive	senior-bpo-executive	t	f	2026-05-12 06:58:06.605819	2026-05-12 06:58:06.605819	\N
459	BPO Team Leader	bpo-team-leader	t	f	2026-05-12 06:58:07.199743	2026-05-12 06:58:07.199743	\N
460	SEO Content Writer	seo-content-writer	t	f	2026-05-12 06:58:07.781354	2026-05-12 06:58:07.781354	\N
461	Web Content Writer	web-content-writer	t	f	2026-05-12 06:58:08.366122	2026-05-12 06:58:08.366122	\N
462	Technical Content Writer	technical-content-writer	t	f	2026-05-12 06:58:08.950789	2026-05-12 06:58:08.950789	\N
463	Creative Content Writer	creative-content-writer	t	f	2026-05-12 06:58:09.536601	2026-05-12 06:58:09.536601	\N
464	Academic Content Writer	academic-content-writer	t	f	2026-05-12 06:58:10.12326	2026-05-12 06:58:10.12326	\N
465	Marketing Content Writer	marketing-content-writer	t	f	2026-05-12 06:58:10.700841	2026-05-12 06:58:10.700841	\N
466	Business Content Writer	business-content-writer	t	f	2026-05-12 06:58:11.292682	2026-05-12 06:58:11.292682	\N
467	Freelance Content Writer	freelance-content-writer	t	f	2026-05-12 06:58:11.876402	2026-05-12 06:58:11.876402	\N
468	Senior Content Writer	senior-content-writer	t	f	2026-05-12 06:58:12.456404	2026-05-12 06:58:12.456404	\N
469	Creative Copywriter	creative-copywriter	t	f	2026-05-12 06:58:13.038972	2026-05-12 06:58:13.038972	\N
470	Digital Copywriter	digital-copywriter	t	f	2026-05-12 06:58:13.622409	2026-05-12 06:58:13.622409	\N
471	SEO Copywriter	seo-copywriter	t	f	2026-05-12 06:58:14.213377	2026-05-12 06:58:14.213377	\N
472	Marketing Copywriter	marketing-copywriter	t	f	2026-05-12 06:58:14.811559	2026-05-12 06:58:14.811559	\N
473	Advertising Copywriter	advertising-copywriter	t	f	2026-05-12 06:58:15.40323	2026-05-12 06:58:15.40323	\N
474	UX Copywriter (Microcopy Writer)	ux-copywriter-microcopy-writer	t	f	2026-05-12 06:58:15.987992	2026-05-12 06:58:15.987992	\N
475	Technical Copywriter	technical-copywriter	t	f	2026-05-12 06:58:16.574647	2026-05-12 06:58:16.574647	\N
476	Brand Copywriter	brand-copywriter	t	f	2026-05-12 06:58:17.161459	2026-05-12 06:58:17.161459	\N
477	Senior Copywriter	senior-copywriter	t	f	2026-05-12 06:58:17.753313	2026-05-12 06:58:17.753313	\N
478	Content Editor	content-editor	t	f	2026-05-12 06:58:18.329732	2026-05-12 06:58:18.329732	\N
479	Editorial Assistant	editorial-assistant	t	f	2026-05-12 06:58:18.920758	2026-05-12 06:58:18.920758	\N
480	Creative Head (Content/Copy)	creative-head-content-copy	t	f	2026-05-12 06:58:19.504964	2026-05-12 06:58:19.504964	\N
481	Creative Designer	creative-designer	t	f	2026-05-12 06:58:20.087287	2026-05-12 06:58:20.087287	\N
482	Visual Designer	visual-designer	t	f	2026-05-12 06:58:20.666931	2026-05-12 06:58:20.666931	\N
483	Motion Graphic Designer	motion-graphic-designer	t	f	2026-05-12 06:58:21.257929	2026-05-12 06:58:21.257929	\N
484	Brand Identity Designer	brand-identity-designer	t	f	2026-05-12 06:58:21.834244	2026-05-12 06:58:21.834244	\N
485	Print Designer	print-designer	t	f	2026-05-12 06:58:22.425135	2026-05-12 06:58:22.425135	\N
486	Advertising Designer	advertising-designer	t	f	2026-05-12 06:58:23.003656	2026-05-12 06:58:23.003656	\N
487	Junior Graphic Designer	junior-graphic-designer	t	f	2026-05-12 06:58:23.608922	2026-05-12 06:58:23.608922	\N
488	Senior Graphic Designer	senior-graphic-designer	t	f	2026-05-12 06:58:24.195773	2026-05-12 06:58:24.195773	\N
489	UI Designer (User Interface Designer)	ui-designer-user-interface-designer	t	f	2026-05-12 06:58:24.783711	2026-05-12 06:58:24.783711	\N
490	UX Designer (User Experience Designer)	ux-designer-user-experienc-designer	t	f	2026-05-12 06:58:25.369193	2026-05-12 06:58:25.369193	\N
491	Product Designer	product-designer	t	f	2026-05-12 06:58:25.954362	2026-05-12 06:58:25.954362	\N
492	Visual UI Designer	visual-ui-designer	t	f	2026-05-12 06:58:26.546749	2026-05-12 06:58:26.546749	\N
493	Mobile App UI/UX Designer	mobile-app-ui-ux-designer	t	f	2026-05-12 06:58:27.126947	2026-05-12 06:58:27.126947	\N
494	Junior UI/UX Designer	junior-ui-ux-designer	t	f	2026-05-12 06:58:27.713751	2026-05-12 06:58:27.713751	\N
495	Senior UI/UX Designer	senior-ui-ux-designer	t	f	2026-05-12 06:58:28.308852	2026-05-12 06:58:28.308852	\N
496	Art Director	art-director	t	f	2026-05-12 06:58:28.890277	2026-05-12 06:58:28.890277	\N
497	Creative Director	creative-director	t	f	2026-05-12 06:58:29.479137	2026-05-12 06:58:29.479137	\N
498	Visual Communication Designer	visual-communication-designer	t	f	2026-05-12 06:58:30.058357	2026-05-12 06:58:30.058357	\N
499	Multimedia Designer	multimedia-designer	t	f	2026-05-12 06:58:30.640578	2026-05-12 06:58:30.640578	\N
500	Junior Data Analyst	junior-data-analyst	t	f	2026-05-12 06:58:31.221961	2026-05-12 06:58:31.221961	\N
501	Senior Data Analyst	senior-data-analyst	t	f	2026-05-12 06:58:31.801311	2026-05-12 06:58:31.801311	\N
502	Business Data Analyst	business-data-analyst	t	f	2026-05-12 06:58:32.391187	2026-05-12 06:58:32.391187	\N
503	Financial Data Analyst	financial-data-analyst	t	f	2026-05-12 06:58:32.972762	2026-05-12 06:58:32.972762	\N
504	Marketing Data Analyst	marketing-data-analyst	t	f	2026-05-12 06:58:33.561043	2026-05-12 06:58:33.561043	\N
505	Operations Data Analyst	operations-data-analyst	t	f	2026-05-12 06:58:34.154842	2026-05-12 06:58:34.154842	\N
506	Healthcare Data Analyst	healthcare-data-analyst	t	f	2026-05-12 06:58:34.907612	2026-05-12 06:58:34.907612	\N
507	Quantitative Analyst (Quant)	quantitative-analyst-quant	t	f	2026-05-12 06:58:35.494423	2026-05-12 06:58:35.494423	\N
508	Big Data Analyst	big-data-analyst	t	f	2026-05-12 06:58:36.074952	2026-05-12 06:58:36.074952	\N
509	Business Intelligence (BI) Analyst	business-intelligence-bi-analyst	t	f	2026-05-12 06:58:36.659013	2026-05-12 06:58:36.659013	\N
510	Risk Data Analyst	risk-data-analyst	t	f	2026-05-12 06:58:37.241289	2026-05-12 06:58:37.241289	\N
511	Product Data Analyst	product-data-analyst	t	f	2026-05-12 06:58:37.830305	2026-05-12 06:58:37.830305	\N
512	Reporting Analyst	reporting-analyst	t	f	2026-05-12 06:58:38.444583	2026-05-12 06:58:38.444583	\N
513	Data Visualization Specialist	data-visualization-specialist	t	f	2026-05-12 06:58:39.02823	2026-05-12 06:58:39.02823	\N
514	MIS Executive (Management Information Systems)	mis-executive-management-information-systems	t	f	2026-05-12 06:58:39.607811	2026-05-12 06:58:39.607811	\N
515	Research Data Analyst	research-data-analyst	t	f	2026-05-12 06:58:40.209121	2026-05-12 06:58:40.209121	\N
516	Analytics Manager	analytics-manager	t	f	2026-05-12 06:58:41.101855	2026-05-12 06:58:41.101855	\N
517	Lead Data Analyst	lead-data-analyst	t	f	2026-05-12 06:58:41.688639	2026-05-12 06:58:41.688639	\N
518	Head of Analytics	head-of-analytics	t	f	2026-05-12 06:58:42.281569	2026-05-12 06:58:42.281569	\N
519	HR Assistant	hr-assistant	t	f	2026-05-12 06:58:42.865378	2026-05-12 06:58:42.865378	\N
520	Recruiter / Talent Acquisition Executive	recruiter-talent-acquisition-executive	t	f	2026-05-12 06:58:43.453024	2026-05-12 06:58:43.453024	\N
521	Payroll Executive	payroll-executive	t	f	2026-05-12 06:58:44.040888	2026-05-12 06:58:44.040888	\N
522	HR Operations Executive	hr-operations-executive	t	f	2026-05-12 06:58:44.617321	2026-05-12 06:58:44.617321	\N
523	Training & Development Executive	training-development-executive	t	f	2026-05-12 06:58:45.198062	2026-05-12 06:58:45.198062	\N
524	Talent Acquisition Specialist	talent-acquisition-specialist	t	f	2026-05-12 06:58:45.784816	2026-05-12 06:58:45.784816	\N
525	Employee Engagement Specialist	employee-engagement-specialist	t	f	2026-05-12 06:58:46.369467	2026-05-12 06:58:46.369467	\N
526	Compensation & Benefits Analyst	compensation-benefits-analyst	t	f	2026-05-12 06:58:46.963347	2026-05-12 06:58:46.963347	\N
527	Learning & Development Specialist	learning-development-specialist	t	f	2026-05-12 06:58:47.621921	2026-05-12 06:58:47.621921	\N
528	HRIS Executive (HR Information Systems)	hris-executive-hr-information-systems	t	f	2026-05-12 06:58:48.222929	2026-05-12 06:58:48.222929	\N
529	Performance Management Executive	performance-management-executive	t	f	2026-05-12 06:58:48.827122	2026-05-12 06:58:48.827122	\N
530	Compliance & Labor Law Executive	compliance-labor-law-executive	t	f	2026-05-12 06:58:49.429233	2026-05-12 06:58:49.429233	\N
531	Senior HR Manager	senior-hr-manager	t	f	2026-05-12 06:58:50.063447	2026-05-12 06:58:50.063447	\N
532	Talent Acquisition Manager	talent-acquisition-manager	t	f	2026-05-12 06:58:50.646747	2026-05-12 06:58:50.646747	\N
533	Training & Development Manager	training-development-manager	t	f	2026-05-12 06:58:51.230512	2026-05-12 06:58:51.230512	\N
534	Employee Relations Manager	employee-relations-manager	t	f	2026-05-12 06:58:51.815237	2026-05-12 06:58:51.815237	\N
535	Compensation & Benefits Manager	compensation-benefits-manager	t	f	2026-05-12 06:58:52.395947	2026-05-12 06:58:52.395947	\N
536	HR Operations Manager	hr-operations-manager	t	f	2026-05-12 06:58:52.978493	2026-05-12 06:58:52.978493	\N
537	Payroll Manager	payroll-manager	t	f	2026-05-12 06:58:53.574444	2026-05-12 06:58:53.574444	\N
538	Head of HR / HR Director	head-of-hr-hr-director	t	f	2026-05-12 06:58:54.173595	2026-05-12 06:58:54.173595	\N
539	VP – Human Resources	vp-human-resources	t	f	2026-05-12 06:58:54.947642	2026-05-12 06:58:54.947642	\N
540	Chief Human Resources Officer (CHRO)	chief-human-resources-officer-chro	t	f	2026-05-12 06:58:55.761968	2026-05-12 06:58:55.761968	\N
541	Inside Sales Executive	inside-sales-executive	t	f	2026-05-12 06:58:56.609898	2026-05-12 06:58:56.609898	\N
542	Field Sales Executive	field-sales-executive	t	f	2026-05-12 06:58:57.283566	2026-05-12 06:58:57.283566	\N
543	Retail Sales Executive	retail-sales-executive	t	f	2026-05-12 06:58:58.078131	2026-05-12 06:58:58.078131	\N
544	Corporate Sales Executive	corporate-sales-executive	t	f	2026-05-12 06:58:58.678103	2026-05-12 06:58:58.678103	\N
545	Channel Sales Executive	channel-sales-executive	t	f	2026-05-12 06:58:59.290711	2026-05-12 06:58:59.290711	\N
546	Tele-Sales Executive	tele-sales-executive	t	f	2026-05-12 06:59:00.226583	2026-05-12 06:59:00.226583	\N
547	Pre-Sales Executive	pre-sales-executive	t	f	2026-05-12 06:59:00.818663	2026-05-12 06:59:00.818663	\N
548	Sales Coordinator	sales-coordinator	t	f	2026-05-12 06:59:01.40954	2026-05-12 06:59:01.40954	\N
549	Business Development Manager (BDM)	business-development-manager-bdm	t	f	2026-05-12 06:59:02.022692	2026-05-12 06:59:02.022692	\N
550	Key Account Manager	key-account-manager	t	f	2026-05-12 06:59:02.623804	2026-05-12 06:59:02.623804	\N
551	Territory Sales Manager	territory-sales-manager	t	f	2026-05-12 06:59:03.234259	2026-05-12 06:59:03.234259	\N
552	Area Sales Manager	are-sales-manager	t	f	2026-05-12 06:59:03.817473	2026-05-12 06:59:03.817473	\N
553	Regional Sales Manager	regional-sales-manager	t	f	2026-05-12 06:59:04.391401	2026-05-12 06:59:04.391401	\N
554	Zonal Sales Manager	zonal-sales-manager	t	f	2026-05-12 06:59:04.968882	2026-05-12 06:59:04.968882	\N
555	National Sales Manager	national-sales-manager	t	f	2026-05-12 06:59:05.548368	2026-05-12 06:59:05.548368	\N
556	Export Sales Manager	export-sales-manager	t	f	2026-05-12 06:59:06.128918	2026-05-12 06:59:06.128918	\N
557	Channel Sales Manager	channel-sales-manager	t	f	2026-05-12 06:59:06.719658	2026-05-12 06:59:06.719658	\N
558	Inside Sales Manager	inside-sale-manager	t	f	2026-05-12 06:59:07.337127	2026-05-12 06:59:07.337127	\N
559	Retail Sales Manager	retail-sales-manager	t	f	2026-05-12 06:59:07.943347	2026-05-12 06:59:07.943347	\N
560	Corporate Sales Manager	corporate-sales-manager	t	f	2026-05-12 06:59:08.540421	2026-05-12 06:59:08.540421	\N
561	Product Sales Specialist	product-sales-specialist	t	f	2026-05-12 06:59:09.243006	2026-05-12 06:59:09.243006	\N
562	Technical Sales Executive / Engineer	technical-sales-executive-engineer	t	f	2026-05-12 06:59:09.825466	2026-05-12 06:59:09.825466	\N
563	E-commerce Sales Executive	e-commerce-sales-executive	t	f	2026-05-12 06:59:10.409214	2026-05-12 06:59:10.409214	\N
564	Head of Sales / Sales Director	head-of-sales-sales-director	t	f	2026-05-12 06:59:11.000983	2026-05-12 06:59:11.000983	\N
565	VP – Sales / Business Development	vp-sales-business-development	t	f	2026-05-12 06:59:11.597403	2026-05-12 06:59:11.597403	\N
566	Customer Support Executive (CSE)	customer-support-executive-cse	t	f	2026-05-12 06:59:12.194128	2026-05-12 06:59:12.194128	\N
567	Customer Service Associate	customer-service-associate	t	f	2026-05-12 06:59:12.783905	2026-05-12 06:59:12.783905	\N
568	Customer Service Representative (CSR)	customer-service-representative-csr	t	f	2026-05-12 06:59:13.371973	2026-05-12 06:59:13.371973	\N
569	Helpdesk Executive	helpdesk-executive	t	f	2026-05-12 06:59:13.957002	2026-05-12 06:59:13.957002	\N
570	Frontline Support Executive	frontline-support-executive	t	f	2026-05-12 06:59:14.533369	2026-05-12 06:59:14.533369	\N
571	Product Support Executive	product-support-executive	t	f	2026-05-12 06:59:15.111804	2026-05-12 06:59:15.111804	\N
572	IT Support Executive	it-support-executive	t	f	2026-05-12 06:59:15.688679	2026-05-12 06:59:15.688679	\N
573	Service Desk Analyst	service-desk-analyst	t	f	2026-05-12 06:59:16.278227	2026-05-12 06:59:16.278227	\N
574	Application Support Executive	application-support-executive	t	f	2026-05-12 06:59:16.860985	2026-05-12 06:59:16.860985	\N
575	Client Support Executive	client-support-executive	t	f	2026-05-12 06:59:17.443498	2026-05-12 06:59:17.443498	\N
576	Customer Success Executive	customer-success-executive	t	f	2026-05-12 06:59:18.019983	2026-05-12 06:59:18.019983	\N
577	Technical Helpdesk Executive	technical-helpdesk-executive	t	f	2026-05-12 06:59:18.59859	2026-05-12 06:59:18.59859	\N
578	Senior Customer Support Executive	senior-customer-support-executive	t	f	2026-05-12 06:59:19.180227	2026-05-12 06:59:19.180227	\N
579	Customer Support Team Leader	customer-support-team-leader	t	f	2026-05-12 06:59:19.757747	2026-05-12 06:59:19.757747	\N
580	Customer Support Manager	customer-support-manager	t	f	2026-05-12 06:59:20.359901	2026-05-12 06:59:20.359901	\N
581	Technical Support Manager	technical-support-manager	t	f	2026-05-12 06:59:20.938546	2026-05-12 06:59:20.938546	\N
582	Customer Experience Manager	customer-experience-manager	t	f	2026-05-12 06:59:21.52316	2026-05-12 06:59:21.52316	\N
583	Head of Customer Support / Director – Customer Service	head-of-customer-support-director-customer-service	t	f	2026-05-12 06:59:22.100983	2026-05-12 06:59:22.100983	\N
584	Lead Generation Executive	lead-generation-executive	t	f	2026-05-12 06:59:22.677339	2026-05-12 06:59:22.677339	\N
585	Sales Development Representative (SDR)	sales-development-representative-sdr	t	f	2026-05-12 06:59:23.248588	2026-05-12 06:59:23.248588	\N
586	Client Acquisition Executive	client-acquisition-executive	t	f	2026-05-12 06:59:23.824275	2026-05-12 06:59:23.824275	\N
587	Tele-Sales Executive (BDE)	tele-sales-executive-bde	t	f	2026-05-12 06:59:24.402794	2026-05-12 06:59:24.402794	\N
588	Market Research Executive	market-research-executive	t	f	2026-05-12 06:59:24.988441	2026-05-12 06:59:24.988441	\N
589	Senior Business Development Executive	senior-business-development-executive	t	f	2026-05-12 06:59:25.582325	2026-05-12 06:59:25.582325	\N
590	Partnership Manager	partnership-manager	t	f	2026-05-12 06:59:26.164221	2026-05-12 06:59:26.164221	\N
591	Channel Development Manager	channel-development-manager	t	f	2026-05-12 06:59:26.754879	2026-05-12 06:59:26.754879	\N
592	Franchise Development Manager	franchise-development-manager	t	f	2026-05-12 06:59:27.420448	2026-05-12 06:59:27.420448	\N
593	Enterprise Business Development Executive	enterprise-business-development-executive	t	f	2026-05-12 06:59:28.006231	2026-05-12 06:59:28.006231	\N
594	International Business Development Executive	international-business-development-executive	t	f	2026-05-12 06:59:28.596199	2026-05-12 06:59:28.596199	\N
595	Startup Business Development Executive	startup-business-development-executive	t	f	2026-05-12 06:59:29.19211	2026-05-12 06:59:29.19211	\N
596	IT Business Development Executive	it-business-development-executive	t	f	2026-05-12 06:59:29.770727	2026-05-12 06:59:29.770727	\N
597	E-commerce Business Development Executive	e-commerce-business-development-executive	t	f	2026-05-12 06:59:30.358739	2026-05-12 06:59:30.358739	\N
598	Head of Business Development	head-of-business-development	t	f	2026-05-12 06:59:30.94005	2026-05-12 06:59:30.94005	\N
599	Vice President – Business Development	vice-president-business-development	t	f	2026-05-12 06:59:31.514606	2026-05-12 06:59:31.514606	\N
600	Chief Business Development Officer (CBDO)	chief-business-development-officer-cbdo	t	f	2026-05-12 06:59:32.087187	2026-05-12 06:59:32.087187	\N
601	Primary School Teacher	primary-school-teacher	t	f	2026-05-12 06:59:32.666628	2026-05-12 06:59:32.666628	\N
602	Secondary School Teacher	secondary-school-teacher	t	f	2026-05-12 06:59:33.239981	2026-05-12 06:59:33.239981	\N
603	Subject Teacher (Maths/Science/English etc.)	subject-teacher-maths-science-english-etc	t	f	2026-05-12 06:59:33.818546	2026-05-12 06:59:33.818546	\N
604	Class Teacher	class-teacher	t	f	2026-05-12 06:59:34.404356	2026-05-12 06:59:34.404356	\N
605	Special Education Teacher	special-education-teacher	t	f	2026-05-12 06:59:34.980961	2026-05-12 06:59:34.980961	\N
606	Language Teacher	language-teacher	t	f	2026-05-12 06:59:35.618011	2026-05-12 06:59:35.618011	\N
607	Computer Teacher / IT Faculty	computer-teacher-it-faculty	t	f	2026-05-12 06:59:36.226369	2026-05-12 06:59:36.226369	\N
608	Lecturer	lecturer	t	f	2026-05-12 06:59:36.802633	2026-05-12 06:59:36.802633	\N
609	Assistant Professor	assistant-professor	t	f	2026-05-12 06:59:37.380172	2026-05-12 06:59:37.380172	\N
610	Associate Professor	associate-professor	t	f	2026-05-12 06:59:37.967663	2026-05-12 06:59:37.967663	\N
611	Professor	professor	t	f	2026-05-12 06:59:38.547572	2026-05-12 06:59:38.547572	\N
612	Visiting Faculty	visiting-faculty	t	f	2026-05-12 06:59:39.129283	2026-05-12 06:59:39.129283	\N
613	Adjunct Faculty	adjunct-faculty	t	f	2026-05-12 06:59:39.703686	2026-05-12 06:59:39.703686	\N
614	Research Guide / Supervisor	research-guide-supervisor	t	f	2026-05-12 06:59:40.293477	2026-05-12 06:59:40.293477	\N
615	Trainer	trainer	t	f	2026-05-12 06:59:40.879277	2026-05-12 06:59:40.879277	\N
616	Soft Skills Trainer	soft-skills-trainer	t	f	2026-05-12 06:59:41.468117	2026-05-12 06:59:41.468117	\N
617	Technical Trainer	technical-trainer	t	f	2026-05-12 06:59:42.047654	2026-05-12 06:59:42.047654	\N
618	Vocational Trainer	vocational-trainer	t	f	2026-05-12 06:59:42.626282	2026-05-12 06:59:42.626282	\N
619	Language Trainer	language-trainer	t	f	2026-05-12 06:59:43.213024	2026-05-12 06:59:43.213024	\N
620	Fitness Trainer	fitness-trainer	t	f	2026-05-12 06:59:43.799843	2026-05-12 06:59:43.799843	\N
621	Online Tutor	online-tutor	t	f	2026-05-12 06:59:44.379363	2026-05-12 06:59:44.379363	\N
622	Curriculum Developer	curriculum-developer	t	f	2026-05-12 06:59:44.954903	2026-05-12 06:59:44.954903	\N
623	Instructional Designer	instructional-designer	t	f	2026-05-12 06:59:45.549588	2026-05-12 06:59:45.549588	\N
624	Educational Consultant	educational-consultant	t	f	2026-05-12 06:59:46.12902	2026-05-12 06:59:46.12902	\N
625	Academic Coordinator	academic-coordinator	t	f	2026-05-12 06:59:46.714678	2026-05-12 06:59:46.714678	\N
626	Mentor / Coach	mentor-coach	t	f	2026-05-12 06:59:47.298479	2026-05-12 06:59:47.298479	\N
627	Head of Department (HOD)	head-of-department-hod	t	f	2026-05-12 06:59:47.884137	2026-05-12 06:59:47.884137	\N
628	Principal	principal	t	f	2026-05-12 06:59:48.464691	2026-05-12 06:59:48.464691	\N
629	Dean	dean	t	f	2026-05-12 06:59:49.045371	2026-05-12 06:59:49.045371	\N
630	Director of Education / Training	director-of-education-training	t	f	2026-05-12 06:59:49.621129	2026-05-12 06:59:49.621129	\N
631	Intern	intern	t	f	2026-05-12 06:59:50.196483	2026-05-12 06:59:50.196483	\N
632	Summer Intern	summer-intern	t	f	2026-05-12 06:59:50.782195	2026-05-12 06:59:50.782195	\N
633	Winter Intern	winter-intern	t	f	2026-05-12 06:59:51.358649	2026-05-12 06:59:51.358649	\N
634	Project Intern	project-intern	t	f	2026-05-12 06:59:51.939246	2026-05-12 06:59:51.939246	\N
635	Research Intern	research-intern	t	f	2026-05-12 06:59:52.518027	2026-05-12 06:59:52.518027	\N
636	Trainee / Management Trainee	trainee-management-trainee	t	f	2026-05-12 06:59:53.191555	2026-05-12 06:59:53.191555	\N
637	Marketing Intern	marketing-intern	t	f	2026-05-12 06:59:53.82757	2026-05-12 06:59:53.82757	\N
638	Sales Intern	sales-intern	t	f	2026-05-12 06:59:54.42356	2026-05-12 06:59:54.42356	\N
639	Human Resources Intern	human-resources-intern	t	f	2026-05-12 06:59:55.013479	2026-05-12 06:59:55.013479	\N
640	Operations Intern	operations-intern	t	f	2026-05-12 06:59:55.603732	2026-05-12 06:59:55.603732	\N
641	Finance Intern	finance-intern	t	f	2026-05-12 06:59:56.181816	2026-05-12 06:59:56.181816	\N
642	Management Intern	management-intern	t	f	2026-05-12 06:59:56.776792	2026-05-12 06:59:56.776792	\N
643	Software Development Intern	software-development-intern	t	f	2026-05-12 06:59:57.371637	2026-05-12 06:59:57.371637	\N
644	Web Development Intern	web-development-intern	t	f	2026-05-12 06:59:57.958516	2026-05-12 06:59:57.958516	\N
645	App Development Intern (Android/iOS/Flutter)	app-development-intern-android-ios-flutter	t	f	2026-05-12 06:59:58.532898	2026-05-12 06:59:58.532898	\N
646	Data Analyst Intern	data-analyst-intern	t	f	2026-05-12 06:59:59.135045	2026-05-12 06:59:59.135045	\N
647	Machine Learning Intern	machine-learning-intern	t	f	2026-05-12 06:59:59.714572	2026-05-12 06:59:59.714572	\N
648	UI/UX Design Intern	ui-ux-design-intern	t	f	2026-05-12 07:00:00.289134	2026-05-12 07:00:00.289134	\N
649	Graphic Design Intern	graphic-design-intern	t	f	2026-05-12 07:00:00.862549	2026-05-12 07:00:00.862549	\N
650	Digital Marketing Intern	digital-marketing-intern	t	f	2026-05-12 07:00:01.436111	2026-05-12 07:00:01.436111	\N
651	IT Support Intern	it-support-intern	t	f	2026-05-12 07:00:02.005394	2026-05-12 07:00:02.005394	\N
652	Content Writing Intern	content-writing-intern	t	f	2026-05-12 07:00:02.595221	2026-05-12 07:00:02.595221	\N
653	Copywriting Intern	copywriting-intern	t	f	2026-05-12 07:00:03.173927	2026-05-12 07:00:03.173927	\N
654	Social Media Intern	social-media-intern	t	f	2026-05-12 07:00:03.760765	2026-05-12 07:00:03.760765	\N
655	Photography Intern	photography-intern	t	f	2026-05-12 07:00:04.344371	2026-05-12 07:00:04.344371	\N
656	Law Intern	law-intern	t	f	2026-05-12 07:00:04.927964	2026-05-12 07:00:04.927964	\N
657	Medical Intern	medical-intern	t	f	2026-05-12 07:00:05.506651	2026-05-12 07:00:05.506651	\N
658	Engineering Intern	engineering-intern	t	f	2026-05-12 07:00:06.093201	2026-05-12 07:00:06.093201	\N
659	Teaching Intern	teaching-intern	t	f	2026-05-12 07:00:06.673913	2026-05-12 07:00:06.673913	\N
660	Research & Development (R&D) Intern	research-development-r-d-intern	t	f	2026-05-12 07:00:07.249366	2026-05-12 07:00:07.249366	\N
661	video editor	video-editor	t	f	2026-05-12 07:00:07.839306	2026-05-12 07:00:07.839306	\N
662	Digital marketer	digital-marketer	t	f	2026-05-12 07:00:08.41894	2026-05-12 07:00:08.41894	\N
663	asp.net developer	asp-net-developer	t	f	2026-05-12 07:00:09.09065	2026-05-12 07:00:09.09065	\N
664	Math Teacher	math-teacher	t	f	2026-05-12 07:00:09.671372	2026-05-12 07:00:09.671372	\N
665	App Developer	app-developer	t	f	2026-05-12 07:00:10.248009	2026-05-12 07:00:10.248009	\N
666	Animatior	animatior	t	f	2026-05-12 07:00:10.825294	2026-05-12 07:00:10.825294	\N
667	Social Media Marketer	social-media-marketer	t	f	2026-05-12 07:00:11.406396	2026-05-12 07:00:11.406396	\N
668	English Teacher	english-teacher	t	f	2026-05-12 07:00:11.98554	2026-05-12 07:00:11.98554	\N
669	Teacher	teacher	t	f	2026-05-12 07:00:12.574406	2026-05-12 07:00:12.574406	\N
\.

COPY public.locations (id, name, slug, type, parent_id, latitude, longitude, is_active, is_deleted, created_at, updated_at, location_scope) FROM stdin;
1	Uttar Pradesh	uttar-pradesh	state	\N	26.0824328	81.8152687	t	f	2026-05-12 12:13:47.972307	2026-05-12 12:13:47.972307	global
2	Delhi	delhi	state	\N	28.6290806	77.1986729	t	f	2026-05-12 12:13:48.272405	2026-05-12 12:13:48.272405	global
3	Telangana	telangana	state	\N	17.4123424	78.4575153	t	f	2026-05-12 12:13:48.533485	2026-05-12 12:13:48.533485	global
4	Tamil Nadu	tamil-nadu	state	\N	13.0251882	80.2218341	t	f	2026-05-12 12:13:48.796646	2026-05-12 12:13:48.796646	global
5	Maharashtra	maharashtra	state	\N	18.9581228	73.1115525	t	f	2026-05-12 12:13:49.059167	2026-05-12 12:13:49.059167	global
6	karnataka	karnataka	state	\N	12.9753648	77.6188972	t	f	2026-05-12 12:13:49.319987	2026-05-12 12:13:49.319987	global
7	Haryana	haryana	state	\N	28.4023049	77.3187203	t	f	2026-05-12 12:13:49.593485	2026-05-12 12:13:49.593485	global
8	Kerala	kerala	state	\N	10.2713076	76.3099190	t	f	2026-05-12 12:13:49.853608	2026-05-12 12:13:49.853608	global
9	West Bengal	west-bengal	state	\N	22.5744089	88.3638946	t	f	2026-05-12 12:13:50.120703	2026-05-12 12:13:50.120703	global
10	Varanasi	varanasi	city	1	25.3087186	82.9970371	t	f	2026-05-12 12:13:50.38381	2026-05-12 12:13:50.38381	global
11	Lucknow	lucknow	city	1	26.8489941	80.9525376	t	f	2026-05-12 12:13:50.648367	2026-05-12 12:13:50.648367	global
12	Allahabad	allahabad	city	1	25.4239176	81.8533871	t	f	2026-05-12 12:13:50.912373	2026-05-12 12:13:50.912373	global
13	Chandauli	chandauli	city	1	25.2183750	83.2610095	t	f	2026-05-12 12:13:51.173399	2026-05-12 12:13:51.173399	global
14	Mirzapur	mirzapur	city	1	25.1341485	82.6195970	t	f	2026-05-12 12:13:51.436578	2026-05-12 12:13:51.436578	global
15	Azamgarh	azamgarh	city	1	26.0834579	83.1408537	t	f	2026-05-12 12:13:51.701741	2026-05-12 12:13:51.701741	global
16	Ghaziabad	ghaziabad	city	1	28.6740600	77.4305170	t	f	2026-05-12 12:13:51.962007	2026-05-12 12:13:51.962007	global
17	Delhi	delhi	city	2	28.6290806	77.1986729	t	f	2026-05-12 12:13:52.223213	2026-05-12 12:13:52.223213	global
18	Hyderabad	hyderabad	city	3	17.4123424	78.4575153	t	f	2026-05-12 12:13:52.486251	2026-05-12 12:13:52.486251	global
19	Chennai	chennai	city	4	13.0251882	80.2218341	t	f	2026-05-12 12:13:52.748441	2026-05-12 12:13:52.748441	global
20	Jaunpur	jaunpur	city	1	25.7786850	82.6604600	t	f	2026-05-12 12:13:53.0115	2026-05-12 12:13:53.0115	global
21	Mumbai	mumbai	city	5	19.0973441	72.8586894	t	f	2026-05-12 12:13:53.273622	2026-05-12 12:13:53.273622	global
22	Bengaluru	bengaluru	city	6	12.9753648	77.6188972	t	f	2026-05-12 12:13:53.535847	2026-05-12 12:13:53.535847	global
23	Bhadohi	bhadohi	city	1	25.3850591	82.5671288	t	f	2026-05-12 12:13:53.799015	2026-05-12 12:13:53.799015	global
24	Faridabad	faridabad	city	7	28.4023049	77.3187203	t	f	2026-05-12 12:13:54.061214	2026-05-12 12:13:54.061214	global
25	Ghazipur	ghazipur	city	1	25.5638966	83.6059552	t	f	2026-05-12 12:13:54.322298	2026-05-12 12:13:54.322298	global
26	Kanpur	kanpur	city	1	26.4594230	80.2987264	t	f	2026-05-12 12:13:54.582538	2026-05-12 12:13:54.582538	global
27	Kerala	kerala	city	8	10.2713076	76.3099190	t	f	2026-05-12 12:13:54.842617	2026-05-12 12:13:54.842617	global
28	Kolkata	kolkata	city	9	22.5744089	88.3638946	t	f	2026-05-12 12:13:55.116101	2026-05-12 12:13:55.116101	global
29	Pune	pune	city	5	18.5422908	73.8668145	t	f	2026-05-12 12:13:55.377993	2026-05-12 12:13:55.377993	global
30	Pandeypur	pandeypur	area	10	25.3356000	82.9739000	t	f	2026-05-12 12:13:55.637168	2026-05-12 12:13:55.637168	global
31	Sigra	sigra	area	10	25.3176000	82.9857000	t	f	2026-05-12 12:13:55.900474	2026-05-12 12:13:55.900474	global
32	Assi Ghat	assi-ghat	area	10	25.2886000	83.0065000	t	f	2026-05-12 12:13:56.160434	2026-05-12 12:13:56.160434	global
33	Lanka Bhu	lanka-bhu	area	10	25.2770000	83.0060000	t	f	2026-05-12 12:13:56.420548	2026-05-12 12:13:56.420548	global
34	Bhelupur	bhelupur	area	10	25.2969000	83.0013000	t	f	2026-05-12 12:13:56.684666	2026-05-12 12:13:56.684666	global
35	Godowlia	godowlia	area	10	25.3108000	83.0096000	t	f	2026-05-12 12:13:56.947069	2026-05-12 12:13:56.947069	global
36	Dashashwamedh Ghat	dashashwamedh-ghat	area	10	25.3076000	83.0108000	t	f	2026-05-12 12:13:57.209033	2026-05-12 12:13:57.209033	global
37	Orderly Bazar	orderly-bazar	area	10	25.3358000	82.9781000	t	f	2026-05-12 12:13:57.47011	2026-05-12 12:13:57.47011	global
38	Cantonment	cantonment	area	11	26.8822000	80.9937000	t	f	2026-05-12 12:13:57.734245	2026-05-12 12:13:57.734245	global
39	Maidagin	maidagin	area	10	25.2760000	82.9749000	t	f	2026-05-12 12:13:57.994411	2026-05-12 12:13:57.994411	global
40	Chowk	chowk	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:13:58.25569	2026-05-12 12:13:58.25569	global
41	Kabir Chaura	kabir-chaura	area	10	25.3197000	83.0108000	t	f	2026-05-12 12:13:58.520726	2026-05-12 12:13:58.520726	global
42	Chetganj	chetganj	area	10	25.3188000	83.0105000	t	f	2026-05-12 12:13:58.784195	2026-05-12 12:13:58.784195	global
43	Lahurabir	lahurabir	area	10	25.3205000	83.0090000	t	f	2026-05-12 12:13:59.046086	2026-05-12 12:13:59.046086	global
44	Shivala	shivala	area	10	25.3063000	83.0159000	t	f	2026-05-12 12:13:59.307273	2026-05-12 12:13:59.307273	global
45	Durgakund	durgakund	area	10	25.2810000	83.0042000	t	f	2026-05-12 12:13:59.568492	2026-05-12 12:13:59.568492	global
46	Sarnath	sarnath	area	10	25.3772000	83.0231000	t	f	2026-05-12 12:13:59.830551	2026-05-12 12:13:59.830551	global
47	Manduadih	manduadih	area	10	25.3015000	82.9707000	t	f	2026-05-12 12:14:00.09781	2026-05-12 12:14:00.09781	global
48	Dashashwamedh	dashashwamedh	area	10	25.3082000	83.0108000	t	f	2026-05-12 12:14:00.359861	2026-05-12 12:14:00.359861	global
49	Bansphatak	bansphatak	area	10	25.3110000	83.0105000	t	f	2026-05-12 12:14:00.6231	2026-05-12 12:14:00.6231	global
50	Vishwanath Gali	vishwanath-gali	area	10	25.3107000	83.0108000	t	f	2026-05-12 12:14:00.891359	2026-05-12 12:14:00.891359	global
51	Manikarnika	manikarnika	area	10	25.3065000	83.0104000	t	f	2026-05-12 12:14:01.1546	2026-05-12 12:14:01.1546	global
52	Harishchandra	harishchandra	area	10	25.3176000	82.9739000	t	f	2026-05-12 12:14:01.417781	2026-05-12 12:14:01.417781	global
53	Scindia Ghat	scindia-ghat	area	10	25.3070000	83.0107000	t	f	2026-05-12 12:14:01.678871	2026-05-12 12:14:01.678871	global
54	Lalita Ghat	lalita-ghat	area	10	25.3090000	83.0100000	t	f	2026-05-12 12:14:01.940045	2026-05-12 12:14:01.940045	global
55	Rajendra Prasad Ghat	rajendra-prasad-ghat	area	10	25.3072000	83.0103000	t	f	2026-05-12 12:14:02.202086	2026-05-12 12:14:02.202086	global
56	Ahilyabai Ghat	ahilyabai-ghat	area	10	25.3065000	83.0104000	t	f	2026-05-12 12:14:02.462348	2026-05-12 12:14:02.462348	global
57	Darbhanga Ghat	darbhanga-ghat	area	10	25.3090000	83.0146000	t	f	2026-05-12 12:14:02.724348	2026-05-12 12:14:02.724348	global
58	Kedar Ghat	kedar-ghat	area	10	25.2913000	83.0087000	t	f	2026-05-12 12:14:02.986527	2026-05-12 12:14:02.986527	global
59	Chet Singh Ghat	chet-singh-ghat	area	10	25.3084000	83.0087000	t	f	2026-05-12 12:14:03.25075	2026-05-12 12:14:03.25075	global
60	Panchganga Ghat	panchganga-ghat	area	10	25.3125000	83.0058000	t	f	2026-05-12 12:14:03.510822	2026-05-12 12:14:03.510822	global
61	Gyanvapi Area	gyanvapi-area	area	10	25.3109000	83.0106000	t	f	2026-05-12 12:14:03.780095	2026-05-12 12:14:03.780095	global
62	Bansphatak Market	bansphatak-market	area	10	25.3086000	83.0107000	t	f	2026-05-12 12:14:04.04238	2026-05-12 12:14:04.04238	global
63	Teliyabag	teliyabag	area	10	25.3028000	83.0043000	t	f	2026-05-12 12:14:04.302366	2026-05-12 12:14:04.302366	global
64	Bulanala	bulanala	area	10	25.3140000	82.9910000	t	f	2026-05-12 12:14:04.564665	2026-05-12 12:14:04.564665	global
65	Assi	assi	area	10	25.3070000	82.9930000	t	f	2026-05-12 12:14:04.827683	2026-05-12 12:14:04.827683	global
66	Hanuman Ghat	hanuman-ghat	area	10	25.3069000	83.0105000	t	f	2026-05-12 12:14:05.091045	2026-05-12 12:14:05.091045	global
67	Bhadaini	bhadaini	area	10	25.2919000	82.9965000	t	f	2026-05-12 12:14:05.355238	2026-05-12 12:14:05.355238	global
68	Tulsi Ghat	tulsi-ghat	area	10	25.3008000	83.0104000	t	f	2026-05-12 12:14:05.618238	2026-05-12 12:14:05.618238	global
69	Naria	naria	area	10	25.2760000	82.9719000	t	f	2026-05-12 12:14:05.880537	2026-05-12 12:14:05.880537	global
70	Ravindrapuri Colony	ravindrapuri-colony	area	10	25.2890000	83.0047000	t	f	2026-05-12 12:14:06.144558	2026-05-12 12:14:06.144558	global
71	Ravindrapuri Extension	ravindrapuri-extension	area	10	25.2892000	82.9994000	t	f	2026-05-12 12:14:06.403655	2026-05-12 12:14:06.403655	global
72	Kamachha	kamachha	area	10	25.3070000	82.9930000	t	f	2026-05-12 12:14:06.664858	2026-05-12 12:14:06.664858	global
73	Sunderpur	sunderpur	area	10	25.2910000	82.9887000	t	f	2026-05-12 12:14:06.930141	2026-05-12 12:14:06.930141	global
74	Sunderpur Colony	sunderpur-colony	area	10	25.2855000	82.9925000	t	f	2026-05-12 12:14:07.191251	2026-05-12 12:14:07.191251	global
75	Sigra Stadium Area	sigra-stadium-area	area	10	25.3176000	82.9873000	t	f	2026-05-12 12:14:07.452341	2026-05-12 12:14:07.452341	global
76	Durga Kund Colony	durga-kund-colony	area	10	25.2827000	82.9952000	t	f	2026-05-12 12:14:07.71793	2026-05-12 12:14:07.71793	global
77	Bhelupur Colony	bhelupur-colony	area	10	25.2986000	83.0060000	t	f	2026-05-12 12:14:07.979113	2026-05-12 12:14:07.979113	global
78	Nai Basti	nai-basti	area	10	25.3176000	82.9739000	t	f	2026-05-12 12:14:08.239053	2026-05-12 12:14:08.239053	global
79	Mahmoorganj	mahmoorganj	area	10	25.3110000	82.9830000	t	f	2026-05-12 12:14:08.500243	2026-05-12 12:14:08.500243	global
80	Rathyatra	rathyatra	area	10	25.3090000	83.0080000	t	f	2026-05-12 12:14:08.759276	2026-05-12 12:14:08.759276	global
81	Rathyatra Colony	rathyatra-colony	area	10	25.3120000	83.0050000	t	f	2026-05-12 12:14:09.020569	2026-05-12 12:14:09.020569	global
82	Chaukaghat	chaukaghat	area	10	25.3260000	82.9914000	t	f	2026-05-12 12:14:09.286699	2026-05-12 12:14:09.286699	global
83	Kachahari Chauraha	kachahari-chauraha	area	10	25.3250000	82.9886000	t	f	2026-05-12 12:14:09.547831	2026-05-12 12:14:09.547831	global
84	Maldahiya	maldahiya	area	10	25.3167000	82.9873000	t	f	2026-05-12 12:14:09.810162	2026-05-12 12:14:09.810162	global
85	Nichibagh	nichibagh	area	10	25.3140000	83.0040000	t	f	2026-05-12 12:14:10.073081	2026-05-12 12:14:10.073081	global
86	Aurangabad Bazaar	aurangabad-bazaar	area	10	25.3123000	83.0108000	t	f	2026-05-12 12:14:10.335307	2026-05-12 12:14:10.335307	global
87	Jaitpura Bazaar	jaitpura-bazaar	area	10	25.3170000	83.0108000	t	f	2026-05-12 12:14:10.596256	2026-05-12 12:14:10.596256	global
88	Kabir Math Area	kabir-math-area	area	10	25.3080000	83.0107000	t	f	2026-05-12 12:14:10.857668	2026-05-12 12:14:10.857668	global
89	Khojwan	khojwan	area	10	25.2948000	82.9930000	t	f	2026-05-12 12:14:11.123777	2026-05-12 12:14:11.123777	global
90	Bhoolanpur	bhoolanpur	area	10	25.2877000	82.9739000	t	f	2026-05-12 12:14:11.385893	2026-05-12 12:14:11.385893	global
91	Cantt	cantt	area	10	25.3230000	82.9775000	t	f	2026-05-12 12:14:11.65216	2026-05-12 12:14:11.65216	global
92	Varanasi Junction	varanasi-junction	area	10	25.3176000	82.9739000	t	f	2026-05-12 12:14:11.915378	2026-05-12 12:14:11.915378	global
93	Nadesar	nadesar	area	13	25.1450000	83.2700000	t	f	2026-05-12 12:14:12.177511	2026-05-12 12:14:12.177511	global
94	Sigra Colony	sigra-colony	area	10	25.3176000	82.9932000	t	f	2026-05-12 12:14:12.438604	2026-05-12 12:14:12.438604	global
95	Manduadih Cantt	manduadih-cantt	area	10	25.2996000	82.9739000	t	f	2026-05-12 12:14:12.697787	2026-05-12 12:14:12.697787	global
96	Varanasi Bus Stand	varanasi-bus-stand	area	10	25.2815000	82.9890000	t	f	2026-05-12 12:14:12.957817	2026-05-12 12:14:12.957817	global
97	Kashi Railway Station Area	kashi-railway-station-area	area	10	25.3456000	82.9789000	t	f	2026-05-12 12:14:13.221961	2026-05-12 12:14:13.221961	global
98	Varuna Bridge Area	varuna-bridge-area	area	10	25.2820000	83.0007000	t	f	2026-05-12 12:14:13.482095	2026-05-12 12:14:13.482095	global
99	Lahartara	lahartara	area	10	25.3080000	82.9900000	t	f	2026-05-12 12:14:13.744324	2026-05-12 12:14:13.744324	global
100	Lahartara Industrial Area	lahartara-industrial-area	area	10	25.3130000	82.9770000	t	f	2026-05-12 12:14:14.004362	2026-05-12 12:14:14.004362	global
101	Orderly Bypass	orderly-bypass	area	10	25.3032000	82.9755000	t	f	2026-05-12 12:14:14.27256	2026-05-12 12:14:14.27256	global
102	Chitaipur	chitaipur	area	10	25.2580000	82.9810000	t	f	2026-05-12 12:14:14.534784	2026-05-12 12:14:14.534784	global
103	Bhagwanpur	bhagwanpur	area	10	25.3190000	82.9739000	t	f	2026-05-12 12:14:14.796929	2026-05-12 12:14:14.796929	global
104	Dilkusha Colony	dilkusha-colony	area	10	25.2892000	82.9921000	t	f	2026-05-12 12:14:15.061267	2026-05-12 12:14:15.061267	global
105	Shivpur	shivpur	area	14	25.1470000	82.5800000	t	f	2026-05-12 12:14:15.328432	2026-05-12 12:14:15.328432	global
106	Pahariya	pahariya	area	10	25.3360000	83.0104000	t	f	2026-05-12 12:14:15.599682	2026-05-12 12:14:15.599682	global
107	Pahariya Mandi	pahariya-mandi	area	10	25.3120000	82.9700000	t	f	2026-05-12 12:14:15.860888	2026-05-12 12:14:15.860888	global
108	Ashapur	ashapur	area	10	25.3215000	82.9987000	t	f	2026-05-12 12:14:16.122138	2026-05-12 12:14:16.122138	global
109	Chittupur	chittupur	area	10	25.2915000	82.9901000	t	f	2026-05-12 12:14:16.387631	2026-05-12 12:14:16.387631	global
110	Chandua	chandua	area	10	25.3120000	82.9739000	t	f	2026-05-12 12:14:16.64958	2026-05-12 12:14:16.64958	global
111	Phulwaria	phulwaria	area	10	25.2830000	82.9870000	t	f	2026-05-12 12:14:16.912826	2026-05-12 12:14:16.912826	global
112	Jaitpura	jaitpura	area	10	25.2830000	82.9930000	t	f	2026-05-12 12:14:17.172051	2026-05-12 12:14:17.172051	global
113	Kazzakpura	kazzakpura	area	10	25.2875000	82.9983000	t	f	2026-05-12 12:14:17.440337	2026-05-12 12:14:17.440337	global
114	Maheshpur	maheshpur	area	15	26.0670000	83.1830000	t	f	2026-05-12 12:14:17.700393	2026-05-12 12:14:17.700393	global
115	Varuna Pul Area	varuna-pul-area	area	10	25.3330000	82.9700000	t	f	2026-05-12 12:14:17.961584	2026-05-12 12:14:17.961584	global
116	Sigra Bypass	sigra-bypass	area	10	25.3065000	82.9917000	t	f	2026-05-12 12:14:18.223126	2026-05-12 12:14:18.223126	global
117	Chandua Chhittupur	chandua-chhittupur	area	10	25.3340000	83.0270000	t	f	2026-05-12 12:14:18.484238	2026-05-12 12:14:18.484238	global
118	Kamalapati Nagar	kamalapati-nagar	area	10	25.3176000	82.9739000	t	f	2026-05-12 12:14:18.746515	2026-05-12 12:14:18.746515	global
119	Saket Nagar Colony	saket-nagar-colony	area	10	25.2802000	83.0075000	t	f	2026-05-12 12:14:19.008049	2026-05-12 12:14:19.008049	global
120	Kashibagh	kashibagh	area	10	25.3200000	82.9870000	t	f	2026-05-12 12:14:19.271164	2026-05-12 12:14:19.271164	global
121	Paharia Mandi	paharia-mandi	area	10	25.3150000	83.0100000	t	f	2026-05-12 12:14:19.53036	2026-05-12 12:14:19.53036	global
122	Dhamek Stupa Area	dhamek-stupa-area	area	10	25.3794000	83.0288000	t	f	2026-05-12 12:14:19.799591	2026-05-12 12:14:19.799591	global
123	Chaukhandi Stupa Area	chaukhandi-stupa-area	area	10	25.3185000	82.9720000	t	f	2026-05-12 12:14:20.059712	2026-05-12 12:14:20.059712	global
124	Moolgandh Kuti Vihar	moolgandh-kuti-vihar	area	10	25.3109000	83.0102000	t	f	2026-05-12 12:14:20.321868	2026-05-12 12:14:20.321868	global
125	Sarnath Museum Area	sarnath-museum-area	area	10	25.3778000	83.0270000	t	f	2026-05-12 12:14:20.582947	2026-05-12 12:14:20.582947	global
126	Ashapur Crossing	ashapur-crossing	area	10	25.3470000	82.9890000	t	f	2026-05-12 12:14:20.843125	2026-05-12 12:14:20.843125	global
127	Weavers Colony (Sarnath Road)	weavers-colony-sarnath-road	area	10	25.3786000	83.0286000	t	f	2026-05-12 12:14:21.10619	2026-05-12 12:14:21.10619	global
128	Sarainandan	sarainandan	area	10	25.2813000	82.9784000	t	f	2026-05-12 12:14:21.369602	2026-05-12 12:14:21.369602	global
129	Maha Bodhi Society Area	maha-bodhi-society-area	area	10	25.2690000	83.0110000	t	f	2026-05-12 12:14:21.629482	2026-05-12 12:14:21.629482	global
130	Thai Temple Area	thai-temple-area	area	10	25.3070000	83.0128000	t	f	2026-05-12 12:14:21.89275	2026-05-12 12:14:21.89275	global
131	Ramnagar	ramnagar	area	10	25.2797000	82.9970000	t	f	2026-05-12 12:14:22.154903	2026-05-12 12:14:22.154903	global
132	Raj Nagar Extension	raj-nagar-extension	area	16	28.6867000	77.4225000	t	f	2026-05-12 12:14:22.415898	2026-05-12 12:14:22.415898	global
133	Vaishali	vaishali	area	16	28.6450000	77.3470000	t	f	2026-05-12 12:14:22.676586	2026-05-12 12:14:22.676586	global
134	Indirapuram	indirapuram	area	16	28.6380000	77.3670000	t	f	2026-05-12 12:14:22.938149	2026-05-12 12:14:22.938149	global
135	Vasundhara	vasundhara	area	16	28.6596000	77.3584000	t	f	2026-05-12 12:14:23.199409	2026-05-12 12:14:23.199409	global
136	Sahibabad	sahibabad	area	16	28.6700000	77.3500000	t	f	2026-05-12 12:14:23.461764	2026-05-12 12:14:23.461764	global
137	Kaushambi	kaushambi	area	16	28.6427000	77.4305000	t	f	2026-05-12 12:14:23.723912	2026-05-12 12:14:23.723912	global
138	Govindpuram	govindpuram	area	16	28.6650000	77.4380000	t	f	2026-05-12 12:14:23.986066	2026-05-12 12:14:23.986066	global
139	Pratap Vihar	pratap-vihar	area	16	28.6667000	77.4333000	t	f	2026-05-12 12:14:24.247232	2026-05-12 12:14:24.247232	global
140	Rajendra Nagar	rajendra-nagar	area	17	28.6310000	77.2145000	t	f	2026-05-12 12:14:24.510091	2026-05-12 12:14:24.510091	global
141	Mohan Nagar	mohan-nagar	area	16	28.6680000	77.4150000	t	f	2026-05-12 12:14:24.772196	2026-05-12 12:14:24.772196	global
142	Kavi Nagar	kavi-nagar	area	16	28.6667000	77.4333000	t	f	2026-05-12 12:14:25.033351	2026-05-12 12:14:25.033351	global
143	Vijay Nagar	vijay-nagar	area	16	28.6389000	77.4277000	t	f	2026-05-12 12:14:25.294419	2026-05-12 12:14:25.294419	global
144	Bhopura	bhopura	area	16	28.6800000	77.3500000	t	f	2026-05-12 12:14:25.557762	2026-05-12 12:14:25.557762	global
145	Wave City	wave-city	area	16	28.6190000	77.5290000	t	f	2026-05-12 12:14:26.127966	2026-05-12 12:14:26.127966	global
146	Dasna	dasna	area	16	28.6770000	77.5220000	t	f	2026-05-12 12:14:26.390123	2026-05-12 12:14:26.390123	global
147	Shastri Nagar	shastri-nagar	area	16	28.6690000	77.4410000	t	f	2026-05-12 12:14:26.652375	2026-05-12 12:14:26.652375	global
148	Surya Nagar	surya-nagar	area	16	28.6716000	77.4137000	t	f	2026-05-12 12:14:26.912523	2026-05-12 12:14:26.912523	global
149	Charminar	charminar	area	18	17.3616000	78.4747000	t	f	2026-05-12 12:14:27.173552	2026-05-12 12:14:27.173552	global
150	Gachibowli	gachibowli	area	18	17.4401000	78.3489000	t	f	2026-05-12 12:14:27.434633	2026-05-12 12:14:27.434633	global
151	Madhapur	madhapur	area	18	17.4486000	78.3908000	t	f	2026-05-12 12:14:27.69996	2026-05-12 12:14:27.69996	global
152	Jubilee Hills	jubilee-hills	area	18	17.4300000	78.4070000	t	f	2026-05-12 12:14:27.959026	2026-05-12 12:14:27.959026	global
153	Banjara Hills	banjara-hills	area	18	17.4152000	78.4340000	t	f	2026-05-12 12:14:28.227302	2026-05-12 12:14:28.227302	global
154	Kondapur	kondapur	area	18	17.4690000	78.3633000	t	f	2026-05-12 12:14:28.490385	2026-05-12 12:14:28.490385	global
155	Kukatpally	kukatpally	area	18	17.4948000	78.3996000	t	f	2026-05-12 12:14:28.759043	2026-05-12 12:14:28.759043	global
156	Miyapur	miyapur	area	18	17.4965000	78.3565000	t	f	2026-05-12 12:14:29.02095	2026-05-12 12:14:29.02095	global
157	Begumpet	begumpet	area	18	17.4435000	78.4586000	t	f	2026-05-12 12:14:29.282212	2026-05-12 12:14:29.282212	global
158	Somajiguda	somajiguda	area	18	17.4305000	78.4589000	t	f	2026-05-12 12:14:29.543453	2026-05-12 12:14:29.543453	global
159	Masab Tank	masab-tank	area	18	17.3950000	78.4520000	t	f	2026-05-12 12:14:29.808408	2026-05-12 12:14:29.808408	global
160	Punjagutta	punjagutta	area	18	17.4264000	78.4532000	t	f	2026-05-12 12:14:30.069653	2026-05-12 12:14:30.069653	global
161	Secunderabad	secunderabad	area	18	17.4399000	78.4983000	t	f	2026-05-12 12:14:30.333694	2026-05-12 12:14:30.333694	global
162	Tarnaka	tarnaka	area	18	17.4200000	78.5400000	t	f	2026-05-12 12:14:30.597112	2026-05-12 12:14:30.597112	global
163	Nampally	nampally	area	18	17.3935000	78.4626000	t	f	2026-05-12 12:14:30.859138	2026-05-12 12:14:30.859138	global
164	Abids	abids	area	18	17.3920000	78.4700000	t	f	2026-05-12 12:14:31.121368	2026-05-12 12:14:31.121368	global
165	Koti	koti	area	18	17.3850000	78.4867000	t	f	2026-05-12 12:14:31.382421	2026-05-12 12:14:31.382421	global
166	Barkas	barkas	area	18	17.3610000	78.5690000	t	f	2026-05-12 12:14:31.643329	2026-05-12 12:14:31.643329	global
167	Malakpet	malakpet	area	18	17.3710000	78.4906000	t	f	2026-05-12 12:14:31.906665	2026-05-12 12:14:31.906665	global
168	Dilsukhnagar	dilsukhnagar	area	18	17.3680000	78.5248000	t	f	2026-05-12 12:14:32.169938	2026-05-12 12:14:32.169938	global
169	LB Nagar	lb-nagar	area	18	17.3450000	78.5530000	t	f	2026-05-12 12:14:32.433927	2026-05-12 12:14:32.433927	global
170	Uppal	uppal	area	18	17.4050000	78.5590000	t	f	2026-05-12 12:14:32.697105	2026-05-12 12:14:32.697105	global
171	Habsiguda	habsiguda	area	18	17.4219000	78.5432000	t	f	2026-05-12 12:14:32.960273	2026-05-12 12:14:32.960273	global
172	Ramanthapur	ramanthapur	area	18	17.3850000	78.5470000	t	f	2026-05-12 12:14:33.21933	2026-05-12 12:14:33.21933	global
173	Nacharam	nacharam	area	18	17.4352000	78.5696000	t	f	2026-05-12 12:14:33.485728	2026-05-12 12:14:33.485728	global
174	Alwal	alwal	area	18	17.4894000	78.5070000	t	f	2026-05-12 12:14:33.74472	2026-05-12 12:14:33.74472	global
175	Bowenpally	bowenpally	area	18	17.4667000	78.4833000	t	f	2026-05-12 12:14:34.008007	2026-05-12 12:14:34.008007	global
176	Malkajgiri	malkajgiri	area	18	17.4476000	78.5402000	t	f	2026-05-12 12:14:34.268099	2026-05-12 12:14:34.268099	global
177	Sainikpuri	sainikpuri	area	18	17.4875000	78.5475000	t	f	2026-05-12 12:14:34.530056	2026-05-12 12:14:34.530056	global
178	Yapral	yapral	area	18	17.4975000	78.5520000	t	f	2026-05-12 12:14:34.803574	2026-05-12 12:14:34.803574	global
179	Basheerbagh	basheerbagh	area	18	17.3994000	78.4738000	t	f	2026-05-12 12:14:35.062578	2026-05-12 12:14:35.062578	global
180	Laad Bazaar	laad-bazaar	area	18	17.3616000	78.4747000	t	f	2026-05-12 12:14:35.325006	2026-05-12 12:14:35.325006	global
181	Falaknuma	falaknuma	area	18	17.3210000	78.4703000	t	f	2026-05-12 12:14:35.586274	2026-05-12 12:14:35.586274	global
182	Yakutpura	yakutpura	area	18	17.3742000	78.4720000	t	f	2026-05-12 12:14:35.847404	2026-05-12 12:14:35.847404	global
183	Chaderghat	chaderghat	area	18	17.3789000	78.4946000	t	f	2026-05-12 12:14:36.107927	2026-05-12 12:14:36.107927	global
184	Pragathi Nagar	pragathi-nagar	area	18	17.4950000	78.3860000	t	f	2026-05-12 12:14:36.37512	2026-05-12 12:14:36.37512	global
185	Moosapet	moosapet	area	18	17.4436000	78.4269000	t	f	2026-05-12 12:14:36.637991	2026-05-12 12:14:36.637991	global
186	Gandipet	gandipet	area	18	17.3780000	78.3400000	t	f	2026-05-12 12:14:36.900034	2026-05-12 12:14:36.900034	global
187	Kothapet	kothapet	area	18	17.3690000	78.5270000	t	f	2026-05-12 12:14:37.161176	2026-05-12 12:14:37.161176	global
188	Mehdipatnam	mehdipatnam	area	18	17.3984000	78.4398000	t	f	2026-05-12 12:14:37.422299	2026-05-12 12:14:37.422299	global
189	Trimulgherry	trimulgherry	area	18	17.4667000	78.5000000	t	f	2026-05-12 12:14:37.683535	2026-05-12 12:14:37.683535	global
190	Moula Ali	moula-ali	area	18	17.4540000	78.5560000	t	f	2026-05-12 12:14:37.94358	2026-05-12 12:14:37.94358	global
191	Adyar	adyar	area	19	13.0067000	80.2576000	t	f	2026-05-12 12:14:38.211784	2026-05-12 12:14:38.211784	global
192	Velachery	velachery	area	19	12.9802000	80.2182000	t	f	2026-05-12 12:14:38.477297	2026-05-12 12:14:38.477297	global
193	Anna Nagar	anna-nagar	area	19	13.0878000	80.2159000	t	f	2026-05-12 12:14:38.743315	2026-05-12 12:14:38.743315	global
194	Nungambakkam	nungambakkam	area	19	13.0604000	80.2470000	t	f	2026-05-12 12:14:39.006973	2026-05-12 12:14:39.006973	global
195	Mylapore	mylapore	area	19	13.0339000	80.2676000	t	f	2026-05-12 12:14:39.266589	2026-05-12 12:14:39.266589	global
196	Besant Nagar	besant-nagar	area	19	13.0007000	80.2687000	t	f	2026-05-12 12:14:39.530708	2026-05-12 12:14:39.530708	global
197	Tambaram	tambaram	area	19	12.9249000	80.1000000	t	f	2026-05-12 12:14:39.792994	2026-05-12 12:14:39.792994	global
198	Chromepet	chromepet	area	19	12.9516000	80.1418000	t	f	2026-05-12 12:14:40.054056	2026-05-12 12:14:40.054056	global
199	Pallavaram	pallavaram	area	19	12.9675000	80.1505000	t	f	2026-05-12 12:14:40.316196	2026-05-12 12:14:40.316196	global
200	Guindy	guindy	area	19	13.0108000	80.2206000	t	f	2026-05-12 12:14:40.580509	2026-05-12 12:14:40.580509	global
201	Saidapet	saidapet	area	19	13.0200000	80.2100000	t	f	2026-05-12 12:14:40.847604	2026-05-12 12:14:40.847604	global
202	Egmore	egmore	area	19	13.0722000	80.2609000	t	f	2026-05-12 12:14:41.107844	2026-05-12 12:14:41.107844	global
203	Royapuram	royapuram	area	19	13.1080000	80.2902000	t	f	2026-05-12 12:14:41.36994	2026-05-12 12:14:41.36994	global
204	Washermanpet	washermanpet	area	19	13.1160000	80.2878000	t	f	2026-05-12 12:14:41.630078	2026-05-12 12:14:41.630078	global
205	Triplicane	triplicane	area	19	13.0587000	80.2750000	t	f	2026-05-12 12:14:41.89311	2026-05-12 12:14:41.89311	global
206	Santhome	santhome	area	19	13.0230000	80.2800000	t	f	2026-05-12 12:14:42.155107	2026-05-12 12:14:42.155107	global
207	Kottivakkam	kottivakkam	area	19	12.9656000	80.2585000	t	f	2026-05-12 12:14:42.415655	2026-05-12 12:14:42.415655	global
208	Thiruvanmiyur	thiruvanmiyur	area	19	12.9842000	80.2565000	t	f	2026-05-12 12:14:42.676498	2026-05-12 12:14:42.676498	global
209	Perungudi	perungudi	area	19	12.9719000	80.2409000	t	f	2026-05-12 12:14:42.940695	2026-05-12 12:14:42.940695	global
210	Sholinganallur	sholinganallur	area	19	12.9006000	80.2200000	t	f	2026-05-12 12:14:43.201866	2026-05-12 12:14:43.201866	global
211	Navalur	navalur	area	19	12.8400000	80.2200000	t	f	2026-05-12 12:14:43.500935	2026-05-12 12:14:43.500935	global
212	Siruseri	siruseri	area	19	12.8300000	80.2300000	t	f	2026-05-12 12:14:43.765103	2026-05-12 12:14:43.765103	global
213	Medavakkam	medavakkam	area	19	12.9177000	80.1925000	t	f	2026-05-12 12:14:44.025099	2026-05-12 12:14:44.025099	global
214	Pallikaranai	pallikaranai	area	19	12.9345000	80.2110000	t	f	2026-05-12 12:14:44.285425	2026-05-12 12:14:44.285425	global
215	Ashok Nagar	ashok-nagar	area	19	13.0370000	80.2180000	t	f	2026-05-12 12:14:44.553913	2026-05-12 12:14:44.553913	global
216	KK Nagar	kk-nagar	area	19	13.0418000	80.1995000	t	f	2026-05-12 12:14:44.814715	2026-05-12 12:14:44.814715	global
217	Vadapalani	vadapalani	area	19	13.0500000	80.2120000	t	f	2026-05-12 12:14:45.078968	2026-05-12 12:14:45.078968	global
218	Virugambakkam	virugambakkam	area	19	13.0520000	80.1890000	t	f	2026-05-12 12:14:45.344187	2026-05-12 12:14:45.344187	global
219	Saligramam	saligramam	area	19	13.0620000	80.1990000	t	f	2026-05-12 12:14:45.616626	2026-05-12 12:14:45.616626	global
220	Porur	porur	area	19	13.0370000	80.1575000	t	f	2026-05-12 12:14:45.87907	2026-05-12 12:14:45.87907	global
221	Kundrathur	kundrathur	area	19	12.9940000	80.0946000	t	f	2026-05-12 12:14:46.139869	2026-05-12 12:14:46.139869	global
222	Poonamallee	poonamallee	area	19	13.0489000	80.1110000	t	f	2026-05-12 12:14:46.402971	2026-05-12 12:14:46.402971	global
223	Avadi	avadi	area	19	13.1146000	80.1090000	t	f	2026-05-12 12:14:46.671389	2026-05-12 12:14:46.671389	global
224	Ambattur	ambattur	area	19	13.1143000	80.1548000	t	f	2026-05-12 12:14:46.930366	2026-05-12 12:14:46.930366	global
225	Mogappair	mogappair	area	19	13.0833000	80.1800000	t	f	2026-05-12 12:14:47.19044	2026-05-12 12:14:47.19044	global
226	Perambur	perambur	area	19	13.1187000	80.2338000	t	f	2026-05-12 12:14:47.451942	2026-05-12 12:14:47.451942	global
227	Vyasarpadi	vyasarpadi	area	19	13.1156000	80.2570000	t	f	2026-05-12 12:14:47.713784	2026-05-12 12:14:47.713784	global
228	Tondiarpet	tondiarpet	area	19	13.1277000	80.2883000	t	f	2026-05-12 12:14:47.97372	2026-05-12 12:14:47.97372	global
229	Minjur	minjur	area	19	13.2800000	80.2620000	t	f	2026-05-12 12:14:48.235924	2026-05-12 12:14:48.235924	global
230	Manali	manali	area	19	13.0878000	80.2824000	t	f	2026-05-12 12:14:48.50013	2026-05-12 12:14:48.50013	global
231	Madhavaram	madhavaram	area	19	13.1486000	80.2307000	t	f	2026-05-12 12:14:48.765448	2026-05-12 12:14:48.765448	global
232	Chintadripet	chintadripet	area	19	13.0740000	80.2656000	t	f	2026-05-12 12:14:49.031595	2026-05-12 12:14:49.031595	global
233	Thousand Lights	thousand-lights	area	19	13.0604000	80.2496000	t	f	2026-05-12 12:14:49.296849	2026-05-12 12:14:49.296849	global
234	Gopalapuram	gopalapuram	area	19	13.0499000	80.2583000	t	f	2026-05-12 12:14:49.557966	2026-05-12 12:14:49.557966	global
235	Royapettah	royapettah	area	19	13.0565000	80.2647000	t	f	2026-05-12 12:14:49.821115	2026-05-12 12:14:49.821115	global
236	Teynampet	teynampet	area	19	13.0409000	80.2490000	t	f	2026-05-12 12:14:50.082228	2026-05-12 12:14:50.082228	global
237	Arumbakkam	arumbakkam	area	19	13.0745000	80.2090000	t	f	2026-05-12 12:14:50.34551	2026-05-12 12:14:50.34551	global
238	Koyambedu	koyambedu	area	19	13.0734000	80.1982000	t	f	2026-05-12 12:14:50.604475	2026-05-12 12:14:50.604475	global
239	Chepauk	chepauk	area	19	13.0627000	80.2785000	t	f	2026-05-12 12:14:50.866653	2026-05-12 12:14:50.866653	global
240	chandwak	chandwak	area	20	25.5893000	82.9999000	t	f	2026-05-12 12:14:51.129722	2026-05-12 12:14:51.129722	global
241	Bandra	bandra	area	21	19.0682000	72.8659000	t	f	2026-05-12 12:14:51.399399	2026-05-12 12:14:51.399399	global
242	Powai	powai	area	21	19.1189000	72.9117000	t	f	2026-05-12 12:14:51.661432	2026-05-12 12:14:51.661432	global
243	Borivali	borivali	area	21	19.2470000	72.8498000	t	f	2026-05-12 12:14:51.925476	2026-05-12 12:14:51.925476	global
244	Andheri	andheri	area	21	19.1000000	72.8300000	t	f	2026-05-12 12:14:52.185791	2026-05-12 12:14:52.185791	global
245	Chembur	chembur	area	21	19.0500000	72.8800000	t	f	2026-05-12 12:14:52.447695	2026-05-12 12:14:52.447695	global
246	Ghatkopar	ghatkopar	area	21	19.0800000	72.9300000	t	f	2026-05-12 12:14:52.707962	2026-05-12 12:14:52.707962	global
247	Malad	malad	area	21	19.1600000	72.8500000	t	f	2026-05-12 12:14:52.969942	2026-05-12 12:14:52.969942	global
248	Santacruz	santacruz	area	21	19.0700000	72.8300000	t	f	2026-05-12 12:14:53.233319	2026-05-12 12:14:53.233319	global
249	Colaba	colaba	area	21	18.9220000	72.8347000	t	f	2026-05-12 12:14:53.501433	2026-05-12 12:14:53.501433	global
250	Dadar	dadar	area	21	19.0160000	72.8407000	t	f	2026-05-12 12:14:53.766672	2026-05-12 12:14:53.766672	global
251	Mahim	mahim	area	21	19.0400000	72.8400000	t	f	2026-05-12 12:14:54.029862	2026-05-12 12:14:54.029862	global
252	Worli	worli	area	21	19.0161000	72.8169000	t	f	2026-05-12 12:14:54.291407	2026-05-12 12:14:54.291407	global
253	Byculla	byculla	area	21	18.9766000	72.8332000	t	f	2026-05-12 12:14:54.552547	2026-05-12 12:14:54.552547	global
254	Parel	parel	area	21	19.0033000	72.8333000	t	f	2026-05-12 12:14:54.817688	2026-05-12 12:14:54.817688	global
255	Matunga	matunga	area	21	19.0253000	72.8553000	t	f	2026-05-12 12:14:55.08405	2026-05-12 12:14:55.08405	global
256	Sion	sion	area	21	19.0450000	72.8650000	t	f	2026-05-12 12:14:55.34936	2026-05-12 12:14:55.34936	global
257	Kurla	kurla	area	21	19.0720000	72.8790000	t	f	2026-05-12 12:14:55.609298	2026-05-12 12:14:55.609298	global
258	Vikhroli	vikhroli	area	21	19.1100000	72.9300000	t	f	2026-05-12 12:14:55.870652	2026-05-12 12:14:55.870652	global
259	Bhandup	bhandup	area	21	19.1400000	72.9400000	t	f	2026-05-12 12:14:56.133136	2026-05-12 12:14:56.133136	global
260	Mulund	mulund	area	21	19.1726000	72.9560000	t	f	2026-05-12 12:14:56.39472	2026-05-12 12:14:56.39472	global
261	Kandivali	kandivali	area	21	19.2050000	72.8500000	t	f	2026-05-12 12:14:56.663219	2026-05-12 12:14:56.663219	global
262	Goregaon	goregaon	area	21	19.1551000	72.8498000	t	f	2026-05-12 12:14:56.924323	2026-05-12 12:14:56.924323	global
263	Juhu	juhu	area	21	19.1000000	72.8267000	t	f	2026-05-12 12:14:57.185284	2026-05-12 12:14:57.185284	global
264	Vile Parle	vile-parle	area	21	19.0968000	72.8514000	t	f	2026-05-12 12:14:57.448445	2026-05-12 12:14:57.448445	global
265	Marol	marol	area	21	19.1136000	72.8754000	t	f	2026-05-12 12:14:57.707969	2026-05-12 12:14:57.707969	global
266	Jogeshwari	jogeshwari	area	21	19.1350000	72.8500000	t	f	2026-05-12 12:14:57.973802	2026-05-12 12:14:57.973802	global
267	Versova	versova	area	21	19.1300000	72.8000000	t	f	2026-05-12 12:14:58.23394	2026-05-12 12:14:58.23394	global
268	Khar	khar	area	21	19.0700000	72.8400000	t	f	2026-05-12 12:14:58.493013	2026-05-12 12:14:58.493013	global
269	Chakala	chakala	area	21	19.1100000	72.8600000	t	f	2026-05-12 12:14:58.759003	2026-05-12 12:14:58.759003	global
270	Bhuleshwar	bhuleshwar	area	21	18.9510000	72.8320000	t	f	2026-05-12 12:14:59.019512	2026-05-12 12:14:59.019512	global
271	Charni Road	charni-road	area	21	18.9515000	72.8232000	t	f	2026-05-12 12:14:59.27949	2026-05-12 12:14:59.27949	global
272	Mazgaon	mazgaon	area	21	18.9760000	72.8440000	t	f	2026-05-12 12:14:59.539483	2026-05-12 12:14:59.539483	global
273	Grant Road	grant-road	area	21	18.9670000	72.8170000	t	f	2026-05-12 12:14:59.802662	2026-05-12 12:14:59.802662	global
274	Churchgate	churchgate	area	21	18.9353000	72.8273000	t	f	2026-05-12 12:15:00.065847	2026-05-12 12:15:00.065847	global
275	Marine Lines	marine-lines	area	21	18.9520000	72.8210000	t	f	2026-05-12 12:15:00.32803	2026-05-12 12:15:00.32803	global
276	Mahalaxmi	mahalaxmi	area	21	18.9820000	72.8230000	t	f	2026-05-12 12:15:00.588179	2026-05-12 12:15:00.588179	global
277	Lower Parel	lower-parel	area	21	18.9930000	72.8300000	t	f	2026-05-12 12:15:00.851793	2026-05-12 12:15:00.851793	global
278	Sewri	sewri	area	21	18.9900000	72.8600000	t	f	2026-05-12 12:15:01.117536	2026-05-12 12:15:01.117536	global
279	Wadala	wadala	area	21	19.0200000	72.8700000	t	f	2026-05-12 12:15:01.378731	2026-05-12 12:15:01.378731	global
280	Antop Hill	antop-hill	area	21	19.0200000	72.8600000	t	f	2026-05-12 12:15:01.63891	2026-05-12 12:15:01.63891	global
281	Chunabhatti	chunabhatti	area	21	19.0400000	72.8800000	t	f	2026-05-12 12:15:01.898876	2026-05-12 12:15:01.898876	global
282	Kings Circle	kings-circle	area	21	19.0300000	72.8500000	t	f	2026-05-12 12:15:02.158948	2026-05-12 12:15:02.158948	global
283	Mankhurd	mankhurd	area	21	19.0500000	72.9300000	t	f	2026-05-12 12:15:02.419098	2026-05-12 12:15:02.419098	global
284	Trombay	trombay	area	21	19.0300000	72.9400000	t	f	2026-05-12 12:15:02.680346	2026-05-12 12:15:02.680346	global
285	Vasai	vasai	area	21	19.3600000	72.8300000	t	f	2026-05-12 12:15:02.939334	2026-05-12 12:15:02.939334	global
286	Virar	virar	area	21	19.4550000	72.7950000	t	f	2026-05-12 12:15:03.199362	2026-05-12 12:15:03.199362	global
287	Nalasopara	nalasopara	area	21	19.4250000	72.8000000	t	f	2026-05-12 12:15:03.460612	2026-05-12 12:15:03.460612	global
288	Dahisar	dahisar	area	21	19.2550000	72.8550000	t	f	2026-05-12 12:15:03.729494	2026-05-12 12:15:03.729494	global
289	Mira Road	mira-road	area	21	19.2800000	72.8700000	t	f	2026-05-12 12:15:03.99404	2026-05-12 12:15:03.99404	global
290	Kanjurmarg	kanjurmarg	area	21	19.1350000	72.9350000	t	f	2026-05-12 12:15:04.255256	2026-05-12 12:15:04.255256	global
291	Kurla West	kurla-west	area	21	19.0728000	72.8777000	t	f	2026-05-12 12:15:04.519346	2026-05-12 12:15:04.519346	global
292	Kurla East	kurla-east	area	21	19.0725000	72.8850000	t	f	2026-05-12 12:15:04.780564	2026-05-12 12:15:04.780564	global
293	Kalina	kalina	area	21	19.0810000	72.8700000	t	f	2026-05-12 12:15:05.041771	2026-05-12 12:15:05.041771	global
294	Chandivali	chandivali	area	21	19.1080000	72.8970000	t	f	2026-05-12 12:15:05.302222	2026-05-12 12:15:05.302222	global
295	Sakinaka	sakinaka	area	21	19.0990000	72.8880000	t	f	2026-05-12 12:15:05.565016	2026-05-12 12:15:05.565016	global
296	Sahar	sahar	area	21	19.0900000	72.8700000	t	f	2026-05-12 12:15:05.832361	2026-05-12 12:15:05.832361	global
297	Marol Naka	marol-naka	area	21	19.1150000	72.8750000	t	f	2026-05-12 12:15:06.091663	2026-05-12 12:15:06.091663	global
298	MIDC	midc	area	21	19.1200000	72.8700000	t	f	2026-05-12 12:15:06.350536	2026-05-12 12:15:06.350536	global
299	DN Nagar	dn-nagar	area	21	19.1400000	72.8300000	t	f	2026-05-12 12:15:06.611744	2026-05-12 12:15:06.611744	global
300	Four Bungalows	four-bungalows	area	21	19.1405000	72.8235000	t	f	2026-05-12 12:15:06.870765	2026-05-12 12:15:06.870765	global
301	Lokhandwala	lokhandwala	area	21	19.1450000	72.8200000	t	f	2026-05-12 12:15:07.133882	2026-05-12 12:15:07.133882	global
302	Seven Bungalows	seven-bungalows	area	21	19.1400000	72.8200000	t	f	2026-05-12 12:15:07.402215	2026-05-12 12:15:07.402215	global
303	Yari Road	yari-road	area	21	19.1450000	72.8150000	t	f	2026-05-12 12:15:07.666373	2026-05-12 12:15:07.666373	global
304	Oshiwara	oshiwara	area	21	19.1500000	72.8350000	t	f	2026-05-12 12:15:07.927577	2026-05-12 12:15:07.927577	global
305	SV Road	sv-road	area	21	19.1550000	72.8350000	t	f	2026-05-12 12:15:08.188179	2026-05-12 12:15:08.188179	global
306	Patel Estate	patel-estate	area	21	19.1450000	72.8550000	t	f	2026-05-12 12:15:08.457441	2026-05-12 12:15:08.457441	global
307	Veera Desai	veera-desai	area	21	19.1350000	72.8400000	t	f	2026-05-12 12:15:08.721621	2026-05-12 12:15:08.721621	global
308	DN Nagar Metro	dn-nagar-metro	area	21	19.1300000	72.8350000	t	f	2026-05-12 12:15:08.986838	2026-05-12 12:15:08.986838	global
309	Azad Nagar	azad-nagar	area	21	19.1300000	72.8400000	t	f	2026-05-12 12:15:09.248946	2026-05-12 12:15:09.248946	global
310	Amboli	amboli	area	21	19.1300000	72.8350000	t	f	2026-05-12 12:15:09.512155	2026-05-12 12:15:09.512155	global
311	SVP Road	svp-road	area	21	19.2300000	72.8400000	t	f	2026-05-12 12:15:09.776802	2026-05-12 12:15:09.776802	global
312	Charkop	charkop	area	21	19.2100000	72.8300000	t	f	2026-05-12 12:15:10.040603	2026-05-12 12:15:10.040603	global
313	Mahavir Nagar	mahavir-nagar	area	21	19.2100000	72.8350000	t	f	2026-05-12 12:15:10.308939	2026-05-12 12:15:10.308939	global
314	Shimpoli	shimpoli	area	21	19.2200000	72.8400000	t	f	2026-05-12 12:15:10.570142	2026-05-12 12:15:10.570142	global
315	Gorai	gorai	area	21	19.2500000	72.7900000	t	f	2026-05-12 12:15:10.831593	2026-05-12 12:15:10.831593	global
316	Mira Bhayandar	mira-bhayandar	area	21	19.2900000	72.8700000	t	f	2026-05-12 12:15:11.093579	2026-05-12 12:15:11.093579	global
317	Mira Bhayandar East	mira-bhayandar-east	area	21	19.2950000	72.8800000	t	f	2026-05-12 12:15:11.359845	2026-05-12 12:15:11.359845	global
318	Mira Bhayandar West	mira-bhayandar-west	area	21	19.2850000	72.8650000	t	f	2026-05-12 12:15:11.622163	2026-05-12 12:15:11.622163	global
319	Bhayandar East	bhayandar-east	area	21	19.3050000	72.8750000	t	f	2026-05-12 12:15:11.883059	2026-05-12 12:15:11.883059	global
320	Bhayandar West	bhayandar-west	area	21	19.3100000	72.8600000	t	f	2026-05-12 12:15:12.144361	2026-05-12 12:15:12.144361	global
321	Naigaon East	naigaon-east	area	21	19.3700000	72.8450000	t	f	2026-05-12 12:15:12.408897	2026-05-12 12:15:12.408897	global
322	Naigaon West	naigaon-west	area	21	19.3650000	72.8350000	t	f	2026-05-12 12:15:12.673151	2026-05-12 12:15:12.673151	global
323	Vasai East	vasai-east	area	21	19.3850000	72.8700000	t	f	2026-05-12 12:15:12.945168	2026-05-12 12:15:12.945168	global
324	Vasai West	vasai-west	area	21	19.3750000	72.8300000	t	f	2026-05-12 12:15:13.208182	2026-05-12 12:15:13.208182	global
325	Nallasopara East	nallasopara-east	area	21	19.4200000	72.8300000	t	f	2026-05-12 12:15:13.474006	2026-05-12 12:15:13.474006	global
326	Nallasopara West	nallasopara-west	area	21	19.4250000	72.8000000	t	f	2026-05-12 12:15:13.735916	2026-05-12 12:15:13.735916	global
327	Virar East	virar-east	area	21	19.4500000	72.8200000	t	f	2026-05-12 12:15:13.996633	2026-05-12 12:15:13.996633	global
328	Virar West	virar-west	area	21	19.4600000	72.8000000	t	f	2026-05-12 12:15:14.276224	2026-05-12 12:15:14.276224	global
329	Arnala	arnala	area	21	19.4700000	72.7800000	t	f	2026-05-12 12:15:14.537962	2026-05-12 12:15:14.537962	global
330	Palghar	palghar	area	21	19.6900000	72.7500000	t	f	2026-05-12 12:15:14.802512	2026-05-12 12:15:14.802512	global
331	Boisar	boisar	area	21	19.8000000	72.7500000	t	f	2026-05-12 12:15:15.063684	2026-05-12 12:15:15.063684	global
332	Uttan	uttan	area	21	19.2600000	72.7900000	t	f	2026-05-12 12:15:15.324833	2026-05-12 12:15:15.324833	global
333	Madh Island	madh-island	area	21	19.1400000	72.7850000	t	f	2026-05-12 12:15:15.587955	2026-05-12 12:15:15.587955	global
334	Manori	manori	area	21	19.2000000	72.7800000	t	f	2026-05-12 12:15:15.848139	2026-05-12 12:15:15.848139	global
335	Malvani	malvani	area	21	19.1800000	72.8100000	t	f	2026-05-12 12:15:16.109243	2026-05-12 12:15:16.109243	global
336	Chincholi Bunder	chincholi-bunder	area	21	19.1750000	72.8400000	t	f	2026-05-12 12:15:16.371629	2026-05-12 12:15:16.371629	global
337	Orlem	orlem	area	21	19.1800000	72.8400000	t	f	2026-05-12 12:15:16.632585	2026-05-12 12:15:16.632585	global
338	Evershine Nagar	evershine-nagar	area	21	19.1800000	72.8350000	t	f	2026-05-12 12:15:16.893692	2026-05-12 12:15:16.893692	global
339	Patel Nagar	patel-nagar	area	21	19.2000000	72.8600000	t	f	2026-05-12 12:15:17.157926	2026-05-12 12:15:17.157926	global
340	Magathane	magathane	area	21	19.2300000	72.8600000	t	f	2026-05-12 12:15:17.421064	2026-05-12 12:15:17.421064	global
341	Thakur Village	thakur-village	area	21	19.2000000	72.8650000	t	f	2026-05-12 12:15:17.684205	2026-05-12 12:15:17.684205	global
342	Thakur Complex	thakur-complex	area	21	19.2050000	72.8700000	t	f	2026-05-12 12:15:17.945403	2026-05-12 12:15:17.945403	global
343	Samata Nagar	samata-nagar	area	21	19.2100000	72.8650000	t	f	2026-05-12 12:15:18.209763	2026-05-12 12:15:18.209763	global
344	Akurli Road	akurli-road	area	21	19.2100000	72.8600000	t	f	2026-05-12 12:15:18.471636	2026-05-12 12:15:18.471636	global
345	Damu Nagar	damu-nagar	area	21	19.2150000	72.8650000	t	f	2026-05-12 12:15:18.731778	2026-05-12 12:15:18.731778	global
346	Poisar	poisar	area	21	19.2100000	72.8500000	t	f	2026-05-12 12:15:18.991969	2026-05-12 12:15:18.991969	global
347	Irla	irla	area	21	19.1000000	72.8300000	t	f	2026-05-12 12:15:19.255996	2026-05-12 12:15:19.255996	global
348	Subhash Nagar	subhash-nagar	area	21	19.0600000	72.8950000	t	f	2026-05-12 12:15:19.520013	2026-05-12 12:15:19.520013	global
349	Govandi	govandi	area	21	19.0600000	72.9150000	t	f	2026-05-12 12:15:19.780972	2026-05-12 12:15:19.780972	global
350	Deonar	deonar	area	21	19.0500000	72.9150000	t	f	2026-05-12 12:15:20.041994	2026-05-12 12:15:20.041994	global
351	Cheeta Camp	cheeta-camp	area	21	19.0500000	72.9350000	t	f	2026-05-12 12:15:20.305294	2026-05-12 12:15:20.305294	global
352	Anushakti Nagar	anushakti-nagar	area	21	19.0300000	72.9400000	t	f	2026-05-12 12:15:20.567449	2026-05-12 12:15:20.567449	global
353	Chembur East	chembur-east	area	21	19.0600000	72.9000000	t	f	2026-05-12 12:15:20.830551	2026-05-12 12:15:20.830551	global
354	Chembur West	chembur-west	area	21	19.0600000	72.8950000	t	f	2026-05-12 12:15:21.09179	2026-05-12 12:15:21.09179	global
355	RCF Colony	rcf-colony	area	21	19.0500000	72.9050000	t	f	2026-05-12 12:15:21.352851	2026-05-12 12:15:21.352851	global
356	Mahul	mahul	area	21	19.0100000	72.8950000	t	f	2026-05-12 12:15:21.613025	2026-05-12 12:15:21.613025	global
357	Sewri East	sewri-east	area	21	18.9950000	72.8600000	t	f	2026-05-12 12:15:21.87509	2026-05-12 12:15:21.87509	global
358	Reay Road	reay-road	area	21	18.9700000	72.8500000	t	f	2026-05-12 12:15:22.136295	2026-05-12 12:15:22.136295	global
359	Masjid Bunder	masjid-bunder	area	21	18.9550000	72.8400000	t	f	2026-05-12 12:15:22.397337	2026-05-12 12:15:22.397337	global
360	Sandhurst Road	sandhurst-road	area	21	18.9600000	72.8350000	t	f	2026-05-12 12:15:22.657436	2026-05-12 12:15:22.657436	global
361	Grant Road East	grant-road-east	area	21	18.9650000	72.8200000	t	f	2026-05-12 12:15:22.924678	2026-05-12 12:15:22.924678	global
362	Tardeo	tardeo	area	21	18.9700000	72.8120000	t	f	2026-05-12 12:15:23.19209	2026-05-12 12:15:23.19209	global
363	Haji Ali	haji-ali	area	21	18.9820000	72.8080000	t	f	2026-05-12 12:15:23.45513	2026-05-12 12:15:23.45513	global
364	Mahalaxmi East	mahalaxmi-east	area	21	18.9830000	72.8200000	t	f	2026-05-12 12:15:23.716267	2026-05-12 12:15:23.716267	global
365	Nagpada	nagpada	area	21	18.9650000	72.8300000	t	f	2026-05-12 12:15:23.991833	2026-05-12 12:15:23.991833	global
366	Khetwadi	khetwadi	area	21	18.9620000	72.8200000	t	f	2026-05-12 12:15:24.256268	2026-05-12 12:15:24.256268	global
367	Girgaon	girgaon	area	21	18.9540000	72.8180000	t	f	2026-05-12 12:15:24.519507	2026-05-12 12:15:24.519507	global
368	Walkeshwar	walkeshwar	area	21	18.9510000	72.8060000	t	f	2026-05-12 12:15:24.780233	2026-05-12 12:15:24.780233	global
369	Malabar Hill	malabar-hill	area	21	18.9440000	72.8000000	t	f	2026-05-12 12:15:25.041383	2026-05-12 12:15:25.041383	global
370	Napean Sea Road	napean-sea-road	area	21	18.9550000	72.8050000	t	f	2026-05-12 12:15:25.306766	2026-05-12 12:15:25.306766	global
371	Breach Candy	breach-candy	area	21	18.9620000	72.8070000	t	f	2026-05-12 12:15:25.568794	2026-05-12 12:15:25.568794	global
372	Warden Road	warden-road	area	21	18.9650000	72.8100000	t	f	2026-05-12 12:15:25.83296	2026-05-12 12:15:25.83296	global
373	Altamount Road	altamount-road	area	21	18.9680000	72.8120000	t	f	2026-05-12 12:15:26.106427	2026-05-12 12:15:26.106427	global
374	Peddar Road	peddar-road	area	21	18.9700000	72.8125000	t	f	2026-05-12 12:15:26.367463	2026-05-12 12:15:26.367463	global
375	Kemps Corner	kemps-corner	area	21	18.9670000	72.8100000	t	f	2026-05-12 12:15:26.630773	2026-05-12 12:15:26.630773	global
376	Cumballa Hill	cumballa-hill	area	21	18.9680000	72.8100000	t	f	2026-05-12 12:15:26.898962	2026-05-12 12:15:26.898962	global
377	Worli Naka	worli-naka	area	21	19.0000000	72.8200000	t	f	2026-05-12 12:15:27.159093	2026-05-12 12:15:27.159093	global
378	Delisle Road	delisle-road	area	21	19.0050000	72.8300000	t	f	2026-05-12 12:15:27.42328	2026-05-12 12:15:27.42328	global
379	NM Joshi Marg	nm-joshi-marg	area	21	19.0020000	72.8300000	t	f	2026-05-12 12:15:27.685471	2026-05-12 12:15:27.685471	global
380	Saat Rasta	saat-rasta	area	21	18.9950000	72.8350000	t	f	2026-05-12 12:15:27.948614	2026-05-12 12:15:27.948614	global
381	Dhobi Talao	dhobi-talao	area	21	18.9440000	72.8270000	t	f	2026-05-12 12:15:28.209759	2026-05-12 12:15:28.209759	global
382	Opera House	opera-house	area	21	18.9540000	72.8190000	t	f	2026-05-12 12:15:28.470773	2026-05-12 12:15:28.470773	global
383	Mumbai Central	mumbai-central	area	21	18.9700000	72.8250000	t	f	2026-05-12 12:15:28.73308	2026-05-12 12:15:28.73308	global
384	Kumbharwada	kumbharwada	area	21	18.9550000	72.8340000	t	f	2026-05-12 12:15:28.995213	2026-05-12 12:15:28.995213	global
385	Zaveri Bazaar	zaveri-bazaar	area	21	18.9530000	72.8330000	t	f	2026-05-12 12:15:29.256429	2026-05-12 12:15:29.256429	global
386	Kala Ghoda	kala-ghoda	area	21	18.9310000	72.8330000	t	f	2026-05-12 12:15:29.519491	2026-05-12 12:15:29.519491	global
387	Fort	fort	area	21	18.9290000	72.8350000	t	f	2026-05-12 12:15:29.785701	2026-05-12 12:15:29.785701	global
388	Ballard Estate	ballard-estate	area	21	18.9390000	72.8400000	t	f	2026-05-12 12:15:30.047667	2026-05-12 12:15:30.047667	global
389	VT Station	vt-station	area	21	18.9400000	72.8350000	t	f	2026-05-12 12:15:30.308013	2026-05-12 12:15:30.308013	global
390	Princess Street	princess-street	area	21	18.9480000	72.8290000	t	f	2026-05-12 12:15:30.569026	2026-05-12 12:15:30.569026	global
391	Marine Drive	marine-drive	area	21	18.9430000	72.8230000	t	f	2026-05-12 12:15:30.832233	2026-05-12 12:15:30.832233	global
392	Flora Fountain	flora-fountain	area	21	18.9310000	72.8330000	t	f	2026-05-12 12:15:31.10045	2026-05-12 12:15:31.10045	global
393	Nariman Point	nariman-point	area	21	18.9240000	72.8230000	t	f	2026-05-12 12:15:31.362747	2026-05-12 12:15:31.362747	global
394	Maker Chambers	maker-chambers	area	21	18.9250000	72.8225000	t	f	2026-05-12 12:15:31.638282	2026-05-12 12:15:31.638282	global
395	Backbay Reclamation	backbay-reclamation	area	21	18.9320000	72.8220000	t	f	2026-05-12 12:15:31.902341	2026-05-12 12:15:31.902341	global
396	Cooperage	cooperage	area	21	18.9260000	72.8280000	t	f	2026-05-12 12:15:32.162413	2026-05-12 12:15:32.162413	global
397	Regal Circle	regal-circle	area	21	18.9240000	72.8320000	t	f	2026-05-12 12:15:32.428699	2026-05-12 12:15:32.428699	global
398	Mantralaya	mantralaya	area	21	18.9310000	72.8230000	t	f	2026-05-12 12:15:32.692475	2026-05-12 12:15:32.692475	global
399	Charni Road East	charni-road-east	area	21	18.9530000	72.8190000	t	f	2026-05-12 12:15:32.95481	2026-05-12 12:15:32.95481	global
400	Kamathipura	kamathipura	area	21	18.9650000	72.8300000	t	f	2026-05-12 12:15:33.216694	2026-05-12 12:15:33.216694	global
401	Byculla West	byculla-west	area	21	18.9800000	72.8350000	t	f	2026-05-12 12:15:33.47778	2026-05-12 12:15:33.47778	global
402	Byculla East	byculla-east	area	21	18.9850000	72.8380000	t	f	2026-05-12 12:15:33.74211	2026-05-12 12:15:33.74211	global
403	Jacob Circle	jacob-circle	area	21	18.9850000	72.8300000	t	f	2026-05-12 12:15:34.003361	2026-05-12 12:15:34.003361	global
404	Parel Village	parel-village	area	21	19.0000000	72.8300000	t	f	2026-05-12 12:15:34.262376	2026-05-12 12:15:34.262376	global
405	Elphinstone Road	elphinstone-road	area	21	19.0050000	72.8300000	t	f	2026-05-12 12:15:34.526483	2026-05-12 12:15:34.526483	global
406	Naigaon	naigaon	area	21	19.0150000	72.8450000	t	f	2026-05-12 12:15:34.78674	2026-05-12 12:15:34.78674	global
407	Five Gardens	five-gardens	area	21	19.0250000	72.8500000	t	f	2026-05-12 12:15:35.048307	2026-05-12 12:15:35.048307	global
408	King Circle	king-circle	area	21	19.0250000	72.8550000	t	f	2026-05-12 12:15:35.31281	2026-05-12 12:15:35.31281	global
409	Matunga West	matunga-west	area	21	19.0300000	72.8450000	t	f	2026-05-12 12:15:35.577701	2026-05-12 12:15:35.577701	global
410	Wadala West	wadala-west	area	21	19.0200000	72.8550000	t	f	2026-05-12 12:15:35.838257	2026-05-12 12:15:35.838257	global
411	Wadala East	wadala-east	area	21	19.0150000	72.8650000	t	f	2026-05-12 12:15:36.100053	2026-05-12 12:15:36.100053	global
412	Anik Village	anik-village	area	21	19.0300000	72.8750000	t	f	2026-05-12 12:15:36.36221	2026-05-12 12:15:36.36221	global
413	JB Nagar	jb-nagar	area	21	19.1150000	72.8700000	t	f	2026-05-12 12:15:36.622343	2026-05-12 12:15:36.622343	global
414	Old Airport Road	old-airport-road	area	21	19.0950000	72.8600000	t	f	2026-05-12 12:15:36.882763	2026-05-12 12:15:36.882763	global
415	Hanuman Road	hanuman-road	area	21	19.1000000	72.8600000	t	f	2026-05-12 12:15:37.144666	2026-05-12 12:15:37.144666	global
416	Tejpal Scheme	tejpal-scheme	area	21	19.1020000	72.8550000	t	f	2026-05-12 12:15:37.410208	2026-05-12 12:15:37.410208	global
417	Manish Nagar	manish-nagar	area	21	19.1400000	72.8300000	t	f	2026-05-12 12:15:37.672118	2026-05-12 12:15:37.672118	global
418	Veera Desai Road	veera-desai-road	area	21	19.1300000	72.8300000	t	f	2026-05-12 12:15:37.93414	2026-05-12 12:15:37.93414	global
419	Gilbert Hill	gilbert-hill	area	21	19.1200000	72.8300000	t	f	2026-05-12 12:15:38.194267	2026-05-12 12:15:38.194267	global
420	Sahar Village	sahar-village	area	21	19.1100000	72.8600000	t	f	2026-05-12 12:15:38.45441	2026-05-12 12:15:38.45441	global
421	Airport Area	airport-area	area	21	19.1000000	72.8700000	t	f	2026-05-12 12:15:38.715535	2026-05-12 12:15:38.715535	global
422	Marol Pipeline	marol-pipeline	area	21	19.1150000	72.8750000	t	f	2026-05-12 12:15:38.976643	2026-05-12 12:15:38.976643	global
423	Pump House	pump-house	area	21	19.1150000	72.8700000	t	f	2026-05-12 12:15:39.239948	2026-05-12 12:15:39.239948	global
424	Seepz	seepz	area	21	19.1300000	72.8800000	t	f	2026-05-12 12:15:39.507355	2026-05-12 12:15:39.507355	global
425	Sion West	sion-west	area	21	19.0400000	72.8600000	t	f	2026-05-12 12:15:39.768432	2026-05-12 12:15:39.768432	global
426	Sion East	sion-east	area	21	19.0400000	72.8700000	t	f	2026-05-12 12:15:40.030354	2026-05-12 12:15:40.030354	global
427	Vadala Road	vadala-road	area	21	19.0250000	72.8600000	t	f	2026-05-12 12:15:40.295518	2026-05-12 12:15:40.295518	global
428	Wadala Truck Terminal	wadala-truck-terminal	area	21	19.0200000	72.8700000	t	f	2026-05-12 12:15:40.556659	2026-05-12 12:15:40.556659	global
429	GTB Nagar	gtb-nagar	area	21	19.0450000	72.8650000	t	f	2026-05-12 12:15:40.819043	2026-05-12 12:15:40.819043	global
430	Vidyavihar	vidyavihar	area	21	19.0850000	72.9000000	t	f	2026-05-12 12:15:41.079416	2026-05-12 12:15:41.079416	global
431	Ghatkopar East	ghatkopar-east	area	21	19.0850000	72.9100000	t	f	2026-05-12 12:15:41.342128	2026-05-12 12:15:41.342128	global
432	Ghatkopar West	ghatkopar-west	area	21	19.0900000	72.9050000	t	f	2026-05-12 12:15:41.604322	2026-05-12 12:15:41.604322	global
433	Tilak Nagar	tilak-nagar	area	21	19.0700000	72.9000000	t	f	2026-05-12 12:15:41.87407	2026-05-12 12:15:41.87407	global
434	Amar Mahal	amar-mahal	area	21	19.0650000	72.9050000	t	f	2026-05-12 12:15:42.133715	2026-05-12 12:15:42.133715	global
435	Chembur Camp	chembur-camp	area	21	19.0600000	72.8950000	t	f	2026-05-12 12:15:42.395853	2026-05-12 12:15:42.395853	global
436	Sindhi Society	sindhi-society	area	21	19.0650000	72.8950000	t	f	2026-05-12 12:15:42.656946	2026-05-12 12:15:42.656946	global
437	Deonar Village	deonar-village	area	21	19.0500000	72.9200000	t	f	2026-05-12 12:15:42.926327	2026-05-12 12:15:42.926327	global
438	Trombay Village	trombay-village	area	21	19.0200000	72.9250000	t	f	2026-05-12 12:15:43.186699	2026-05-12 12:15:43.186699	global
439	Mahul Village	mahul-village	area	21	19.0050000	72.9000000	t	f	2026-05-12 12:15:43.44961	2026-05-12 12:15:43.44961	global
440	Shivaji Nagar	shivaji-nagar	area	21	19.0500000	72.9150000	t	f	2026-05-12 12:15:43.709824	2026-05-12 12:15:43.709824	global
441	Chembur Naka	chembur-naka	area	21	19.0650000	72.8950000	t	f	2026-05-12 12:15:43.971748	2026-05-12 12:15:43.971748	global
442	Kurla Naka	kurla-naka	area	21	19.0750000	72.8800000	t	f	2026-05-12 12:15:44.23617	2026-05-12 12:15:44.23617	global
443	LBS Marg	lbs-marg	area	21	19.0800000	72.8850000	t	f	2026-05-12 12:15:44.497099	2026-05-12 12:15:44.497099	global
444	Kalpana Talkies	kalpana-talkies	area	21	19.0750000	72.8850000	t	f	2026-05-12 12:15:44.762276	2026-05-12 12:15:44.762276	global
445	Asalpha	asalpha	area	21	19.0900000	72.8950000	t	f	2026-05-12 12:15:45.022363	2026-05-12 12:15:45.022363	global
446	Kirol Village	kirol-village	area	21	19.0850000	72.9000000	t	f	2026-05-12 12:15:45.281682	2026-05-12 12:15:45.281682	global
447	Powai Lake	powai-lake	area	21	19.1200000	72.9100000	t	f	2026-05-12 12:15:45.5471	2026-05-12 12:15:45.5471	global
448	Nahar Amrit Shakti	nahar-amrit-shakti	area	21	19.1150000	72.9050000	t	f	2026-05-12 12:15:45.809886	2026-05-12 12:15:45.809886	global
449	Saki Vihar Road	saki-vihar-road	area	21	19.1100000	72.8900000	t	f	2026-05-12 12:15:46.071991	2026-05-12 12:15:46.071991	global
450	Vikhroli East	vikhroli-east	area	21	19.1000000	72.9300000	t	f	2026-05-12 12:15:46.333088	2026-05-12 12:15:46.333088	global
451	Vikhroli West	vikhroli-west	area	21	19.1050000	72.9250000	t	f	2026-05-12 12:15:46.596284	2026-05-12 12:15:46.596284	global
452	Kanjurmarg East	kanjurmarg-east	area	21	19.1200000	72.9400000	t	f	2026-05-12 12:15:46.866009	2026-05-12 12:15:46.866009	global
453	Kanjurmarg West	kanjurmarg-west	area	21	19.1250000	72.9300000	t	f	2026-05-12 12:15:47.126858	2026-05-12 12:15:47.126858	global
454	Bhandup East	bhandup-east	area	21	19.1400000	72.9500000	t	f	2026-05-12 12:15:47.387184	2026-05-12 12:15:47.387184	global
455	Bhandup West	bhandup-west	area	21	19.1400000	72.9400000	t	f	2026-05-12 12:15:47.654203	2026-05-12 12:15:47.654203	global
456	Mulund West	mulund-west	area	21	19.1700000	72.9400000	t	f	2026-05-12 12:15:47.917415	2026-05-12 12:15:47.917415	global
457	Mulund East	mulund-east	area	21	19.1700000	72.9600000	t	f	2026-05-12 12:15:48.17996	2026-05-12 12:15:48.17996	global
458	Nahur East	nahur-east	area	21	19.1500000	72.9500000	t	f	2026-05-12 12:15:48.442835	2026-05-12 12:15:48.442835	global
459	Nahur West	nahur-west	area	21	19.1550000	72.9450000	t	f	2026-05-12 12:15:48.701817	2026-05-12 12:15:48.701817	global
460	LBS Road	lbs-road	area	21	19.1700000	72.9450000	t	f	2026-05-12 12:15:48.963222	2026-05-12 12:15:48.963222	global
461	Johnson & Johnson Colony	johnson-johnson-colony	area	21	19.1650000	72.9400000	t	f	2026-05-12 12:15:49.224195	2026-05-12 12:15:49.224195	global
462	Veena Nagar	veena-nagar	area	21	19.1600000	72.9400000	t	f	2026-05-12 12:15:49.487311	2026-05-12 12:15:49.487311	global
463	Kalidas Natyagruh	kalidas-natyagruh	area	21	19.1650000	72.9350000	t	f	2026-05-12 12:15:49.751409	2026-05-12 12:15:49.751409	global
464	Mulund Colony	mulund-colony	area	21	19.1650000	72.9300000	t	f	2026-05-12 12:15:50.013489	2026-05-12 12:15:50.013489	global
465	Navghar	navghar	area	21	19.1750000	72.9650000	t	f	2026-05-12 12:15:50.27773	2026-05-12 12:15:50.27773	global
466	MHADA Colony	mhada-colony	area	21	19.1700000	72.9600000	t	f	2026-05-12 12:15:50.544236	2026-05-12 12:15:50.544236	global
467	Airoli Bridge Approach	airoli-bridge-approach	area	21	19.1750000	72.9700000	t	f	2026-05-12 12:15:50.804075	2026-05-12 12:15:50.804075	global
468	Jaunpur City	jaunpur-city	area	20	25.7333000	82.6833000	t	f	2026-05-12 12:15:51.064446	2026-05-12 12:15:51.064446	global
469	Olandganj	olandganj	area	20	25.7425000	82.6811000	t	f	2026-05-12 12:15:51.324278	2026-05-12 12:15:51.324278	global
470	Husainabad	husainabad	area	20	25.7400000	82.6800000	t	f	2026-05-12 12:15:51.585659	2026-05-12 12:15:51.585659	global
471	Sipah	sipah	area	20	25.7408000	82.6843000	t	f	2026-05-12 12:15:51.849736	2026-05-12 12:15:51.849736	global
472	Umarpur	umarpur	area	20	25.7490000	82.6860000	t	f	2026-05-12 12:15:52.112814	2026-05-12 12:15:52.112814	global
473	Rani Bazar	rani-bazar	area	20	25.7400000	82.7000000	t	f	2026-05-12 12:15:52.37296	2026-05-12 12:15:52.37296	global
474	Wazidpur	wazidpur	area	20	25.7498000	82.7000000	t	f	2026-05-12 12:15:52.6352	2026-05-12 12:15:52.6352	global
475	Madiyahu Road	madiyahu-road	area	20	25.7497000	82.6830000	t	f	2026-05-12 12:15:52.898406	2026-05-12 12:15:52.898406	global
476	Kadam Shah	kadam-shah	area	20	25.7406000	82.6838000	t	f	2026-05-12 12:15:53.161311	2026-05-12 12:15:53.161311	global
477	Khidki Muhalla	khidki-muhalla	area	20	25.7330000	82.6830000	t	f	2026-05-12 12:15:53.42268	2026-05-12 12:15:53.42268	global
478	line Bazar	line-bazar	area	20	25.7370000	82.6800000	t	f	2026-05-12 12:15:53.683619	2026-05-12 12:15:53.683619	global
479	Baksariya	baksariya	area	20	25.7300000	82.7000000	t	f	2026-05-12 12:15:53.94491	2026-05-12 12:15:53.94491	global
480	Bhiti	bhiti	area	20	25.5500000	82.7000000	t	f	2026-05-12 12:15:54.207142	2026-05-12 12:15:54.207142	global
481	Shahganj Bazar	shahganj-bazar	area	20	26.0474000	82.6872000	t	f	2026-05-12 12:15:54.469452	2026-05-12 12:15:54.469452	global
482	Kachhaura	kachhaura	area	20	25.7466000	82.6837000	t	f	2026-05-12 12:15:54.730457	2026-05-12 12:15:54.730457	global
483	Dharmapur	dharmapur	area	20	25.7490000	82.6870000	t	f	2026-05-12 12:15:54.991662	2026-05-12 12:15:54.991662	global
484	Belwariya	belwariya	area	20	25.7425000	82.7033000	t	f	2026-05-12 12:15:55.252927	2026-05-12 12:15:55.252927	global
485	Tarawan	tarawan	area	20	25.7200000	82.7000000	t	f	2026-05-12 12:15:55.514005	2026-05-12 12:15:55.514005	global
486	Katra Bazaar	katra-bazaar	area	20	25.7391000	82.6818000	t	f	2026-05-12 12:15:55.774085	2026-05-12 12:15:55.774085	global
487	Kerakat Bazar	kerakat-bazar	area	20	25.6300000	82.9130000	t	f	2026-05-12 12:15:56.037277	2026-05-12 12:15:56.037277	global
488	Mijhaura	mijhaura	area	20	25.7340000	82.6790000	t	f	2026-05-12 12:15:56.29867	2026-05-12 12:15:56.29867	global
489	Dobhi	dobhi	area	20	25.5530000	82.6450000	t	f	2026-05-12 12:15:56.567729	2026-05-12 12:15:56.567729	global
490	Dharmpur	dharmpur	area	20	25.7480000	82.6830000	t	f	2026-05-12 12:15:56.830827	2026-05-12 12:15:56.830827	global
491	Baraipur	baraipur	area	20	25.7489000	82.6871000	t	f	2026-05-12 12:15:57.091998	2026-05-12 12:15:57.091998	global
492	Machhlishahr Bazar	machhlishahr-bazar	area	20	25.6810000	82.4140000	t	f	2026-05-12 12:15:57.354129	2026-05-12 12:15:57.354129	global
493	Teji Bazar	teji-bazar	area	20	25.7485000	82.6808000	t	f	2026-05-12 12:15:57.613205	2026-05-12 12:15:57.613205	global
494	Rampur	rampur	area	20	25.7490000	82.7000000	t	f	2026-05-12 12:15:57.879401	2026-05-12 12:15:57.879401	global
495	Gaura	gaura	area	20	26.7445000	82.6839000	t	f	2026-05-12 12:15:58.138752	2026-05-12 12:15:58.138752	global
496	Mariahu Town	mariahu-town	area	20	25.6012000	82.6045000	t	f	2026-05-12 12:15:58.402775	2026-05-12 12:15:58.402775	global
497	Usraon	usraon	area	20	25.7333000	82.6833000	t	f	2026-05-12 12:15:58.667028	2026-05-12 12:15:58.667028	global
498	Khakhaduba	khakhaduba	area	20	25.7397000	82.6874000	t	f	2026-05-12 12:15:58.930046	2026-05-12 12:15:58.930046	global
499	Babhnauli	babhnauli	area	20	25.7465000	82.6879000	t	f	2026-05-12 12:15:59.190336	2026-05-12 12:15:59.190336	global
500	Badlapur Town	badlapur-town	area	20	26.5369000	82.3140000	t	f	2026-05-12 12:15:59.451339	2026-05-12 12:15:59.451339	global
501	Khaira	khaira	area	20	25.7400000	82.6900000	t	f	2026-05-12 12:15:59.714471	2026-05-12 12:15:59.714471	global
502	Katra	katra	area	20	25.7496000	82.6834000	t	f	2026-05-12 12:15:59.976636	2026-05-12 12:15:59.976636	global
503	Sujanganj	sujanganj	area	20	25.9765000	82.3707000	t	f	2026-05-12 12:16:00.239829	2026-05-12 12:16:00.239829	global
504	Mungra Badshahpur Bazar	mungra-badshahpur-bazar	area	20	25.7450000	82.1700000	t	f	2026-05-12 12:16:00.500873	2026-05-12 12:16:00.500873	global
505	Bijora	bijora	area	20	25.7412000	82.6730000	t	f	2026-05-12 12:16:00.766153	2026-05-12 12:16:00.766153	global
506	Hariharpur	hariharpur	area	20	25.7310000	82.6810000	t	f	2026-05-12 12:16:01.030262	2026-05-12 12:16:01.030262	global
507	Local Areas of Allahabad (Prayagraj)	local-areas-of-allahabad-prayagraj	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:01.294157	2026-05-12 12:16:01.294157	global
508	Civil Lines	civil-lines	area	12	25.4565000	81.8333000	t	f	2026-05-12 12:16:01.554653	2026-05-12 12:16:01.554653	global
509	Lukerganj	lukerganj	area	12	25.4350000	81.8270000	t	f	2026-05-12 12:16:01.816722	2026-05-12 12:16:01.816722	global
510	Daraganj	daraganj	area	12	25.4345000	81.8815000	t	f	2026-05-12 12:16:02.080986	2026-05-12 12:16:02.080986	global
511	Georgetown	georgetown	area	12	25.4539000	81.8463000	t	f	2026-05-12 12:16:02.345186	2026-05-12 12:16:02.345186	global
512	Tagore Town	tagore-town	area	12	25.4399000	81.8464000	t	f	2026-05-12 12:16:02.610393	2026-05-12 12:16:02.610393	global
513	Colonelganj	colonelganj	area	12	25.4330000	81.8466000	t	f	2026-05-12 12:16:02.870539	2026-05-12 12:16:02.870539	global
514	Alopi Bagh	alopi-bagh	area	12	25.4328000	81.8491000	t	f	2026-05-12 12:16:03.133653	2026-05-12 12:16:03.133653	global
515	Alopibagh	alopibagh	area	12	25.4336000	81.8465000	t	f	2026-05-12 12:16:03.394785	2026-05-12 12:16:03.394785	global
516	Muthiganj	muthiganj	area	12	25.4367000	81.8435000	t	f	2026-05-12 12:16:03.656087	2026-05-12 12:16:03.656087	global
517	Dariyabad	dariyabad	area	12	25.4309000	81.8351000	t	f	2026-05-12 12:16:03.916276	2026-05-12 12:16:03.916276	global
518	Kydganj	kydganj	area	12	25.4286000	81.8367000	t	f	2026-05-12 12:16:04.179125	2026-05-12 12:16:04.179125	global
519	Meerapur	meerapur	area	12	25.4390000	81.8463000	t	f	2026-05-12 12:16:04.440345	2026-05-12 12:16:04.440345	global
520	Rambagh	rambagh	area	12	25.4315000	81.8463000	t	f	2026-05-12 12:16:04.706758	2026-05-12 12:16:04.706758	global
521	Rajapur	rajapur	area	12	25.4139000	81.8463000	t	f	2026-05-12 12:16:04.968764	2026-05-12 12:16:04.968764	global
522	Bai Ka Bagh	bai-ka-bagh	area	12	25.4412000	81.8431000	t	f	2026-05-12 12:16:05.229846	2026-05-12 12:16:05.229846	global
523	Khuldabad	khuldabad	area	12	25.4308000	81.8396000	t	f	2026-05-12 12:16:05.51059	2026-05-12 12:16:05.51059	global
524	Teliarganj	teliarganj	area	12	25.4382000	81.8446000	t	f	2026-05-12 12:16:05.771537	2026-05-12 12:16:05.771537	global
525	Kalyani Devi	kalyani-devi	area	12	25.4318000	81.8363000	t	f	2026-05-12 12:16:06.03889	2026-05-12 12:16:06.03889	global
526	Rasulabad	rasulabad	area	12	25.4500000	81.8500000	t	f	2026-05-12 12:16:06.301878	2026-05-12 12:16:06.301878	global
527	Govindpur	govindpur	area	12	25.4330000	81.8490000	t	f	2026-05-12 12:16:06.563089	2026-05-12 12:16:06.563089	global
528	Salori	salori	area	12	25.4508000	81.8451000	t	f	2026-05-12 12:16:06.824192	2026-05-12 12:16:06.824192	global
529	Kareli	kareli	area	12	25.4275000	81.8507000	t	f	2026-05-12 12:16:07.086401	2026-05-12 12:16:07.086401	global
530	Noorullah Road	noorullah-road	area	12	25.4289000	81.8338000	t	f	2026-05-12 12:16:07.352733	2026-05-12 12:16:07.352733	global
531	Stanley Road	stanley-road	area	12	25.4286000	81.8463000	t	f	2026-05-12 12:16:07.617955	2026-05-12 12:16:07.617955	global
532	Sulem Sarai	sulem-sarai	area	12	25.4457000	81.8204000	t	f	2026-05-12 12:16:07.883137	2026-05-12 12:16:07.883137	global
533	Beli Gaon	beli-gaon	area	12	25.4305000	81.8463000	t	f	2026-05-12 12:16:08.144147	2026-05-12 12:16:08.144147	global
534	Subedarganj	subedarganj	area	12	25.4407000	81.8153000	t	f	2026-05-12 12:16:08.406463	2026-05-12 12:16:08.406463	global
535	Transport Nagar	transport-nagar	area	12	25.4310000	81.8463000	t	f	2026-05-12 12:16:08.668504	2026-05-12 12:16:08.668504	global
536	Rajrooppur	rajrooppur	area	12	25.4389000	81.7952000	t	f	2026-05-12 12:16:08.929662	2026-05-12 12:16:08.929662	global
537	Naini	naini	area	12	25.3900000	81.8500000	t	f	2026-05-12 12:16:09.18914	2026-05-12 12:16:09.18914	global
538	Jhalwa	jhalwa	area	12	25.4300000	81.7700000	t	f	2026-05-12 12:16:09.448867	2026-05-12 12:16:09.448867	global
539	Jhunsi	jhunsi	area	12	25.4320000	81.9050000	t	f	2026-05-12 12:16:09.721109	2026-05-12 12:16:09.721109	global
540	Shivkuti	shivkuti	area	12	25.4625000	81.8195000	t	f	2026-05-12 12:16:09.984269	2026-05-12 12:16:09.984269	global
541	Naini Bazar	naini-bazar	area	12	25.3960000	81.8421000	t	f	2026-05-12 12:16:10.245445	2026-05-12 12:16:10.245445	global
542	Arail	arail	area	12	25.3996000	81.8545000	t	f	2026-05-12 12:16:10.506891	2026-05-12 12:16:10.506891	global
543	Chak	chak	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:10.767911	2026-05-12 12:16:10.767911	global
544	Sindhu Nagar	sindhu-nagar	area	12	25.4589000	81.8345000	t	f	2026-05-12 12:16:11.029864	2026-05-12 12:16:11.029864	global
545	Industrial Area Naini	industrial-area-naini	area	12	25.3875000	81.8746000	t	f	2026-05-12 12:16:11.29108	2026-05-12 12:16:11.29108	global
546	Newada	newada	area	12	25.3830000	81.8500000	t	f	2026-05-12 12:16:11.550312	2026-05-12 12:16:11.550312	global
547	Meja Road Belt	meja-road-belt	area	12	25.3000000	81.8500000	t	f	2026-05-12 12:16:11.82145	2026-05-12 12:16:11.82145	global
548	Cantt Area	cantt-area	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:12.084635	2026-05-12 12:16:12.084635	global
549	New Cantt	new-cantt	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:12.351917	2026-05-12 12:16:12.351917	global
550	Old Cantt	old-cantt	area	12	25.4420000	81.8210000	t	f	2026-05-12 12:16:12.613011	2026-05-12 12:16:12.613011	global
551	Rajapur Cantt	rajapur-cantt	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:12.874051	2026-05-12 12:16:12.874051	global
552	Phaphamau	phaphamau	area	12	25.5100000	81.8800000	t	f	2026-05-12 12:16:13.136512	2026-05-12 12:16:13.136512	global
553	Phoolpur	phoolpur	area	12	25.5500000	82.1000000	t	f	2026-05-12 12:16:13.398494	2026-05-12 12:16:13.398494	global
554	Soraon	soraon	area	12	25.4120000	81.8390000	t	f	2026-05-12 12:16:13.670899	2026-05-12 12:16:13.670899	global
555	Karchana	karchana	area	12	25.1600000	81.8500000	t	f	2026-05-12 12:16:13.932062	2026-05-12 12:16:13.932062	global
556	Koraon	koraon	area	12	25.1360000	82.1840000	t	f	2026-05-12 12:16:14.192227	2026-05-12 12:16:14.192227	global
557	Meja	meja	area	12	25.0000000	81.5000000	t	f	2026-05-12 12:16:14.453261	2026-05-12 12:16:14.453261	global
558	Shankargarh	shankargarh	area	12	25.1833000	81.6167000	t	f	2026-05-12 12:16:14.71462	2026-05-12 12:16:14.71462	global
559	Jhunsi Rural	jhunsi-rural	area	12	25.4310000	81.9310000	t	f	2026-05-12 12:16:14.974667	2026-05-12 12:16:14.974667	global
560	Handia	handia	area	12	25.3820000	82.1860000	t	f	2026-05-12 12:16:15.240813	2026-05-12 12:16:15.240813	global
561	Jasra	jasra	area	12	25.3960000	81.8054000	t	f	2026-05-12 12:16:15.501028	2026-05-12 12:16:15.501028	global
562	Manda	manda	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:15.763199	2026-05-12 12:16:15.763199	global
563	Saidabad	saidabad	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:16.022107	2026-05-12 12:16:16.022107	global
564	Holagarh	holagarh	area	12	25.7849000	81.9855000	t	f	2026-05-12 12:16:16.283478	2026-05-12 12:16:16.283478	global
565	Mauaima	mauaima	area	12	25.4167000	81.8333000	t	f	2026-05-12 12:16:16.547542	2026-05-12 12:16:16.547542	global
566	Bahria	bahria	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:16.808753	2026-05-12 12:16:16.808753	global
567	Ugra	ugra	area	12	25.4698000	81.8792000	t	f	2026-05-12 12:16:17.069718	2026-05-12 12:16:17.069718	global
568	Devghat	devghat	area	12	25.4276000	81.8463000	t	f	2026-05-12 12:16:17.328948	2026-05-12 12:16:17.328948	global
569	Sahson	sahson	area	12	25.6000000	81.8000000	t	f	2026-05-12 12:16:17.588826	2026-05-12 12:16:17.588826	global
570	Bahadurpur	bahadurpur	area	12	25.4720000	81.8740000	t	f	2026-05-12 12:16:17.850975	2026-05-12 12:16:17.850975	global
571	Shringverpur	shringverpur	area	12	25.3750000	81.8000000	t	f	2026-05-12 12:16:18.110248	2026-05-12 12:16:18.110248	global
572	Sadiyabad	sadiyabad	area	12	25.4319000	81.8450000	t	f	2026-05-12 12:16:18.37117	2026-05-12 12:16:18.37117	global
573	Utraon	utraon	area	12	25.4380000	82.0525000	t	f	2026-05-12 12:16:18.634345	2026-05-12 12:16:18.634345	global
574	Pandila	pandila	area	12	25.4000000	81.8500000	t	f	2026-05-12 12:16:18.896462	2026-05-12 12:16:18.896462	global
575	Muratganj	muratganj	area	12	25.4377000	81.8463000	t	f	2026-05-12 12:16:19.15577	2026-05-12 12:16:19.15577	global
576	Sangam Area	sangam-area	area	12	25.4305000	81.8918000	t	f	2026-05-12 12:16:19.415815	2026-05-12 12:16:19.415815	global
577	Arail Ghat	arail-ghat	area	12	25.4410000	81.8648000	t	f	2026-05-12 12:16:19.676753	2026-05-12 12:16:19.676753	global
578	Kumbh Mela Sector	kumbh-mela-sector	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:19.936059	2026-05-12 12:16:19.936059	global
579	Jhunsi Ghat	jhunsi-ghat	area	12	25.4190000	81.9010000	t	f	2026-05-12 12:16:20.198034	2026-05-12 12:16:20.198034	global
580	Daraganj Ghat	daraganj-ghat	area	12	25.4317000	81.8820000	t	f	2026-05-12 12:16:20.459214	2026-05-12 12:16:20.459214	global
581	Allahapur	allahapur	area	12	25.4256000	81.8207000	t	f	2026-05-12 12:16:20.720014	2026-05-12 12:16:20.720014	global
582	Preetam Nagar	preetam-nagar	area	12	25.4558000	81.7853000	t	f	2026-05-12 12:16:20.984257	2026-05-12 12:16:20.984257	global
583	Mumfordganj	mumfordganj	area	12	25.4570000	81.8467000	t	f	2026-05-12 12:16:21.246055	2026-05-12 12:16:21.246055	global
584	Stanley Road Colony	stanley-road-colony	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:21.506677	2026-05-12 12:16:21.506677	global
585	Teliarganj Colony	teliarganj-colony	area	12	25.4389000	81.8306000	t	f	2026-05-12 12:16:21.767479	2026-05-12 12:16:21.767479	global
586	Peepalgaon	peepalgaon	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:22.026876	2026-05-12 12:16:22.026876	global
587	Shivkuti Colony	shivkuti-colony	area	12	25.4586000	81.8518000	t	f	2026-05-12 12:16:22.286635	2026-05-12 12:16:22.286635	global
588	Khelgaon Area	khelgaon-area	area	12	25.4280000	81.8463000	t	f	2026-05-12 12:16:22.54782	2026-05-12 12:16:22.54782	global
589	Indalpur	indalpur	area	12	25.4387000	81.8467000	t	f	2026-05-12 12:16:22.807853	2026-05-12 12:16:22.807853	global
590	GT Road Belt	gt-road-belt	area	12	25.4358000	81.8463000	t	f	2026-05-12 12:16:23.07192	2026-05-12 12:16:23.07192	global
591	Badarka	badarka	area	15	26.0730000	83.1740000	t	f	2026-05-12 12:16:23.333092	2026-05-12 12:16:23.333092	global
592	Harbanspur	harbanspur	area	15	26.0735000	83.1859000	t	f	2026-05-12 12:16:23.59638	2026-05-12 12:16:23.59638	global
593	Sidhari	sidhari	area	15	26.0730000	83.1860000	t	f	2026-05-12 12:16:23.856483	2026-05-12 12:16:23.856483	global
594	Narauli	narauli	area	15	26.0725000	83.2078000	t	f	2026-05-12 12:16:24.117522	2026-05-12 12:16:24.117522	global
595	Professor Colony	professor-colony	area	15	26.0670000	83.1859000	t	f	2026-05-12 12:16:24.377581	2026-05-12 12:16:24.377581	global
596	Chhota Bagh	chhota-bagh	area	15	26.0730000	83.1859000	t	f	2026-05-12 12:16:24.641775	2026-05-12 12:16:24.641775	global
597	Dahibar	dahibar	area	15	26.1080000	83.1950000	t	f	2026-05-12 12:16:24.902884	2026-05-12 12:16:24.902884	global
598	Kotwali Area	kotwali-area	area	15	26.0736000	83.1859000	t	f	2026-05-12 12:16:25.16441	2026-05-12 12:16:25.16441	global
599	Pandey Bazar	pandey-bazar	area	15	26.0735000	83.1845000	t	f	2026-05-12 12:16:25.423674	2026-05-12 12:16:25.423674	global
600	Kamela Bazar	kamela-bazar	area	15	26.0730000	83.1830000	t	f	2026-05-12 12:16:25.68573	2026-05-12 12:16:25.68573	global
601	Makdoompur	makdoompur	area	15	26.0730000	83.1865000	t	f	2026-05-12 12:16:25.967361	2026-05-12 12:16:25.967361	global
602	Chakrapar	chakrapar	area	15	26.0689000	83.1841000	t	f	2026-05-12 12:16:26.229388	2026-05-12 12:16:26.229388	global
603	Hafizpur	hafizpur	area	15	26.0218000	83.1760000	t	f	2026-05-12 12:16:26.489619	2026-05-12 12:16:26.489619	global
604	Khekhda	khekhda	area	15	26.0750000	83.1980000	t	f	2026-05-12 12:16:26.752761	2026-05-12 12:16:26.752761	global
605	Azamgarh Bus Stand Area	azamgarh-bus-stand-area	area	15	26.0729000	83.1859000	t	f	2026-05-12 12:16:27.028353	2026-05-12 12:16:27.028353	global
606	Rani Ki Sarai Road Area	rani-ki-sarai-road-area	area	15	26.0670000	83.1740000	t	f	2026-05-12 12:16:27.309003	2026-05-12 12:16:27.309003	global
607	Chilbila	chilbila	area	15	26.0730000	83.1856000	t	f	2026-05-12 12:16:27.571031	2026-05-12 12:16:27.571031	global
608	Jafarpur	jafarpur	area	15	26.0680000	83.1860000	t	f	2026-05-12 12:16:27.831348	2026-05-12 12:16:27.831348	global
609	Nizamabad Road Belt	nizamabad-road-belt	area	15	26.0730000	83.1820000	t	f	2026-05-12 12:16:28.091404	2026-05-12 12:16:28.091404	global
610	Sarfuddinpur	sarfuddinpur	area	15	26.0515000	83.1836000	t	f	2026-05-12 12:16:28.356424	2026-05-12 12:16:28.356424	global
611	Nizamabad Town	nizamabad-town	area	15	26.0736000	83.1796000	t	f	2026-05-12 12:16:28.618506	2026-05-12 12:16:28.618506	global
612	Lakhnipur	lakhnipur	area	15	26.0680000	83.1812000	t	f	2026-05-12 12:16:28.881749	2026-05-12 12:16:28.881749	global
613	Bharauna	bharauna	area	15	26.1118000	83.1818000	t	f	2026-05-12 12:16:29.145013	2026-05-12 12:16:29.145013	global
614	Dubari	dubari	area	15	26.0712000	83.1329000	t	f	2026-05-12 12:16:29.406542	2026-05-12 12:16:29.406542	global
615	Tulsi Nagar	tulsi-nagar	area	15	26.0730000	83.1830000	t	f	2026-05-12 12:16:29.667336	2026-05-12 12:16:29.667336	global
616	Nandpur	nandpur	area	15	26.0736000	83.1859000	t	f	2026-05-12 12:16:29.929702	2026-05-12 12:16:29.929702	global
617	Madhopur	madhopur	area	15	26.0730000	83.1850000	t	f	2026-05-12 12:16:30.19867	2026-05-12 12:16:30.19867	global
618	Mehnagar	mehnagar	area	15	25.8745000	83.1212000	t	f	2026-05-12 12:16:30.462101	2026-05-12 12:16:30.462101	global
619	Dodapur	dodapur	area	15	26.0730000	83.1810000	t	f	2026-05-12 12:16:30.723124	2026-05-12 12:16:30.723124	global
620	Mithapur	mithapur	area	15	26.0725000	83.1865000	t	f	2026-05-12 12:16:30.986176	2026-05-12 12:16:30.986176	global
621	Kharhara	kharhara	area	15	26.0630000	83.1730000	t	f	2026-05-12 12:16:31.254535	2026-05-12 12:16:31.254535	global
622	Deogaon	deogaon	area	15	26.0595000	83.1691000	t	f	2026-05-12 12:16:31.515818	2026-05-12 12:16:31.515818	global
623	Jiyanpur	jiyanpur	area	15	26.0732000	83.1810000	t	f	2026-05-12 12:16:31.776758	2026-05-12 12:16:31.776758	global
624	Manduri	manduri	area	15	26.0500000	82.8500000	t	f	2026-05-12 12:16:32.043076	2026-05-12 12:16:32.043076	global
625	Kharihaniya	kharihaniya	area	15	26.0530000	83.1790000	t	f	2026-05-12 12:16:32.305254	2026-05-12 12:16:32.305254	global
626	Nagwa	nagwa	area	15	26.0680000	83.1850000	t	f	2026-05-12 12:16:32.567293	2026-05-12 12:16:32.567293	global
627	Chhawan	chhawan	area	15	26.0730000	83.1850000	t	f	2026-05-12 12:16:32.827407	2026-05-12 12:16:32.827407	global
628	Atrari	atrari	area	15	26.0600000	83.1900000	t	f	2026-05-12 12:16:33.091641	2026-05-12 12:16:33.091641	global
629	Mubarakpur Town	mubarakpur-town	area	15	26.0890000	83.2770000	t	f	2026-05-12 12:16:33.357793	2026-05-12 12:16:33.357793	global
630	Sarai Meer Road Area	sarai-meer-road-area	area	15	26.0710000	83.1500000	t	f	2026-05-12 12:16:33.618975	2026-05-12 12:16:33.618975	global
631	Ali Nagar	ali-nagar	area	15	26.0725000	83.1859000	t	f	2026-05-12 12:16:33.889846	2026-05-12 12:16:33.889846	global
632	Kasba Mubarakpur	kasba-mubarakpur	area	15	26.0415000	83.1778000	t	f	2026-05-12 12:16:34.150457	2026-05-12 12:16:34.150457	global
633	Jahananpur	jahananpur	area	15	26.0738000	83.1859000	t	f	2026-05-12 12:16:34.412516	2026-05-12 12:16:34.412516	global
634	Shadiabad	shadiabad	area	15	26.0670000	83.1844000	t	f	2026-05-12 12:16:34.673773	2026-05-12 12:16:34.673773	global
635	Mubarakpur Bazar	mubarakpur-bazar	area	15	26.0725000	83.1894000	t	f	2026-05-12 12:16:34.934957	2026-05-12 12:16:34.934957	global
636	Nizampur	nizampur	area	15	26.0680000	83.1840000	t	f	2026-05-12 12:16:35.196108	2026-05-12 12:16:35.196108	global
637	Sarai Mir	sarai-mir	area	15	26.0170000	82.9130000	t	f	2026-05-12 12:16:35.457131	2026-05-12 12:16:35.457131	global
638	Chak Abdullah	chak-abdullah	area	15	26.0680000	83.1830000	t	f	2026-05-12 12:16:35.717226	2026-05-12 12:16:35.717226	global
639	Kuraicha	kuraicha	area	15	26.0730000	83.1865000	t	f	2026-05-12 12:16:35.979425	2026-05-12 12:16:35.979425	global
640	Koiria	koiria	area	15	26.0680000	83.1830000	t	f	2026-05-12 12:16:36.238408	2026-05-12 12:16:36.238408	global
641	Harda	harda	area	15	26.7240000	82.7395000	t	f	2026-05-12 12:16:36.502678	2026-05-12 12:16:36.502678	global
642	Deogaon Road Belt	deogaon-road-belt	area	15	26.0530000	83.1410000	t	f	2026-05-12 12:16:36.770907	2026-05-12 12:16:36.770907	global
643	Atraulia	atraulia	area	15	26.0592000	83.2399000	t	f	2026-05-12 12:16:37.032131	2026-05-12 12:16:37.032131	global
644	Bhaiyapur	bhaiyapur	area	15	26.0800000	83.1900000	t	f	2026-05-12 12:16:37.292326	2026-05-12 12:16:37.292326	global
645	Mahul Road	mahul-road	area	15	26.0656000	83.1859000	t	f	2026-05-12 12:16:37.553215	2026-05-12 12:16:37.553215	global
646	Raunapar	raunapar	area	15	26.0400000	83.0900000	t	f	2026-05-12 12:16:37.813538	2026-05-12 12:16:37.813538	global
647	Hanswar	hanswar	area	15	26.1812000	82.9384000	t	f	2026-05-12 12:16:38.082633	2026-05-12 12:16:38.082633	global
648	Belaisa	belaisa	area	15	26.0560000	83.1640000	t	f	2026-05-12 12:16:38.342919	2026-05-12 12:16:38.342919	global
649	Devgaon	devgaon	area	15	26.0480000	83.2300000	t	f	2026-05-12 12:16:38.605017	2026-05-12 12:16:38.605017	global
650	Lalganj	lalganj	area	15	25.9062000	83.1839000	t	f	2026-05-12 12:16:38.866376	2026-05-12 12:16:38.866376	global
651	Itaur	itaur	area	15	26.0670000	82.9480000	t	f	2026-05-12 12:16:39.129159	2026-05-12 12:16:39.129159	global
652	Gopalpur	gopalpur	area	15	26.0740000	83.1850000	t	f	2026-05-12 12:16:39.392446	2026-05-12 12:16:39.392446	global
653	Bardah	bardah	area	15	26.1910000	83.0900000	t	f	2026-05-12 12:16:39.65364	2026-05-12 12:16:39.65364	global
654	Palhni	palhni	area	15	26.0735000	83.1836000	t	f	2026-05-12 12:16:39.917807	2026-05-12 12:16:39.917807	global
655	Adilabad	adilabad	area	15	26.0671000	82.9346000	t	f	2026-05-12 12:16:40.176961	2026-05-12 12:16:40.176961	global
656	Katghar	katghar	area	15	26.0730000	83.1830000	t	f	2026-05-12 12:16:40.438093	2026-05-12 12:16:40.438093	global
657	Shankarpur	shankarpur	area	15	26.0689000	83.1859000	t	f	2026-05-12 12:16:40.703252	2026-05-12 12:16:40.703252	global
658	Mubarakpur–Phoolpur Link Localities	mubarakpurphoolpur-link-localities	area	15	26.1310000	83.1510000	t	f	2026-05-12 12:16:40.965353	2026-05-12 12:16:40.965353	global
659	Mahagaon	mahagaon	area	15	26.0680000	83.1830000	t	f	2026-05-12 12:16:41.224562	2026-05-12 12:16:41.224562	global
660	Kheta Sarai Side Area (border region)	kheta-sarai-side-area-border-region	area	15	26.0684000	83.1838000	t	f	2026-05-12 12:16:41.484646	2026-05-12 12:16:41.484646	global
661	Bilariyaganj	bilariyaganj	area	15	26.1989000	83.2929000	t	f	2026-05-12 12:16:41.745785	2026-05-12 12:16:41.745785	global
662	Rasulpur	rasulpur	area	15	26.0728000	83.1859000	t	f	2026-05-12 12:16:42.007922	2026-05-12 12:16:42.007922	global
663	Bhadaura	bhadaura	area	15	26.0600000	83.1700000	t	f	2026-05-12 12:16:42.269048	2026-05-12 12:16:42.269048	global
664	Shahmahmoodpur	shahmahmoodpur	area	15	26.0680000	83.1860000	t	f	2026-05-12 12:16:42.533218	2026-05-12 12:16:42.533218	global
665	Ghosi Road Localities	ghosi-road-localities	area	15	26.0565000	83.1834000	t	f	2026-05-12 12:16:42.800413	2026-05-12 12:16:42.800413	global
666	Didarganj	didarganj	area	15	26.0670000	83.1840000	t	f	2026-05-12 12:16:43.0687	2026-05-12 12:16:43.0687	global
667	Azmatgarh	azmatgarh	area	15	26.1025000	83.0288000	t	f	2026-05-12 12:16:43.330988	2026-05-12 12:16:43.330988	global
668	Rani Ki Sarai (Block HQ)	rani-ki-sarai-block-hq	area	15	26.0246000	82.9434000	t	f	2026-05-12 12:16:43.594042	2026-05-12 12:16:43.594042	global
669	Jahangirganj	jahangirganj	area	15	26.0538000	82.6645000	t	f	2026-05-12 12:16:43.859338	2026-05-12 12:16:43.859338	global
670	Koilsa	koilsa	area	15	26.0167000	83.1833000	t	f	2026-05-12 12:16:44.125658	2026-05-12 12:16:44.125658	global
671	Ahiraula	ahiraula	area	15	26.2550000	82.9150000	t	f	2026-05-12 12:16:44.388582	2026-05-12 12:16:44.388582	global
672	Tahbarpur	tahbarpur	area	15	26.1250000	83.2140000	t	f	2026-05-12 12:16:44.648358	2026-05-12 12:16:44.648358	global
673	Maharajganj	maharajganj	area	15	26.1118000	83.1774000	t	f	2026-05-12 12:16:44.911122	2026-05-12 12:16:44.911122	global
674	Mahuwara	mahuwara	area	15	26.0978000	83.1416000	t	f	2026-05-12 12:16:45.173279	2026-05-12 12:16:45.173279	global
675	Haraiya	haraiya	area	15	26.7600000	82.9200000	t	f	2026-05-12 12:16:45.434426	2026-05-12 12:16:45.434426	global
676	Latghat	latghat	area	15	26.1820000	83.0580000	t	f	2026-05-12 12:16:45.694573	2026-05-12 12:16:45.694573	global
677	Mirzapur (Azamgarh region)	mirzapur-azamgarh-region	area	15	25.7430000	82.6770000	t	f	2026-05-12 12:16:45.960851	2026-05-12 12:16:45.960851	global
678	Gopalpur Belt	gopalpur-belt	area	15	26.1250000	83.1860000	t	f	2026-05-12 12:16:46.220947	2026-05-12 12:16:46.220947	global
679	Jamunipur	jamunipur	area	15	26.0670000	83.1830000	t	f	2026-05-12 12:16:46.489335	2026-05-12 12:16:46.489335	global
680	Kalafatpur	kalafatpur	area	15	26.0730000	83.1855000	t	f	2026-05-12 12:16:46.751252	2026-05-12 12:16:46.751252	global
681	Chaubepur	chaubepur	area	15	26.0726000	83.1762000	t	f	2026-05-12 12:16:47.012473	2026-05-12 12:16:47.012473	global
682	Bhikharipur	bhikharipur	area	15	26.0730000	83.1870000	t	f	2026-05-12 12:16:47.277756	2026-05-12 12:16:47.277756	global
683	Kodhar	kodhar	area	15	26.0510000	83.1890000	t	f	2026-05-12 12:16:47.539767	2026-05-12 12:16:47.539767	global
684	Khurahat	khurahat	area	15	26.0600000	83.0900000	t	f	2026-05-12 12:16:47.800947	2026-05-12 12:16:47.800947	global
685	Central Bengaluru	central-bengaluru	area	22	12.9716000	77.5946000	t	f	2026-05-12 12:16:48.061044	2026-05-12 12:16:48.061044	global
686	MG Road	mg-road	area	22	12.9716000	77.5946000	t	f	2026-05-12 12:16:48.325253	2026-05-12 12:16:48.325253	global
687	Brigade Road	brigade-road	area	22	12.9719000	77.6097000	t	f	2026-05-12 12:16:48.586544	2026-05-12 12:16:48.586544	global
688	Richmond Town	richmond-town	area	22	12.9716000	77.5946000	t	f	2026-05-12 12:16:48.851551	2026-05-12 12:16:48.851551	global
689	Vasanth Nagar	vasanth-nagar	area	22	12.9919000	77.5924000	t	f	2026-05-12 12:16:49.112087	2026-05-12 12:16:49.112087	global
690	Domlur	domlur	area	22	12.9601000	77.6412000	t	f	2026-05-12 12:16:49.373844	2026-05-12 12:16:49.373844	global
691	Indiranagar	indiranagar	area	22	12.9719000	77.6412000	t	f	2026-05-12 12:16:49.634914	2026-05-12 12:16:49.634914	global
692	Ulsoor (Halasuru)	ulsoor-halasuru	area	22	12.9812000	77.6271000	t	f	2026-05-12 12:16:49.909411	2026-05-12 12:16:49.909411	global
693	Infantry Road	infantry-road	area	22	12.9793000	77.6026000	t	f	2026-05-12 12:16:50.227856	2026-05-12 12:16:50.227856	global
694	KR Market	kr-market	area	22	12.9606000	77.5743000	t	f	2026-05-12 12:16:50.487928	2026-05-12 12:16:50.487928	global
695	Chickpet	chickpet	area	22	12.9672000	77.5777000	t	f	2026-05-12 12:16:50.750161	2026-05-12 12:16:50.750161	global
696	North Bengaluru	north-bengaluru	area	22	13.0674000	77.5874000	t	f	2026-05-12 12:16:51.010283	2026-05-12 12:16:51.010283	global
697	Hebbal	hebbal	area	22	13.0355000	77.5970000	t	f	2026-05-12 12:16:51.270381	2026-05-12 12:16:51.270381	global
698	Yelahanka	yelahanka	area	22	13.1007000	77.5963000	t	f	2026-05-12 12:16:51.534671	2026-05-12 12:16:51.534671	global
699	Sahakar Nagar	sahakar-nagar	area	22	13.0846000	77.5742000	t	f	2026-05-12 12:16:51.797658	2026-05-12 12:16:51.797658	global
700	Jakkur	jakkur	area	22	13.0654000	77.5966000	t	f	2026-05-12 12:16:52.058857	2026-05-12 12:16:52.058857	global
701	Nagawara	nagawara	area	22	13.0458000	77.6200000	t	f	2026-05-12 12:16:52.326336	2026-05-12 12:16:52.326336	global
702	RT Nagar	rt-nagar	area	22	13.0190000	77.5940000	t	f	2026-05-12 12:16:52.587338	2026-05-12 12:16:52.587338	global
703	Amruthahalli	amruthahalli	area	22	13.0647000	77.5980000	t	f	2026-05-12 12:16:52.848429	2026-05-12 12:16:52.848429	global
704	Vidyaranyapura	vidyaranyapura	area	22	13.0930000	77.5560000	t	f	2026-05-12 12:16:53.108526	2026-05-12 12:16:53.108526	global
705	Thanisandra	thanisandra	area	22	13.0628000	77.6290000	t	f	2026-05-12 12:16:53.368821	2026-05-12 12:16:53.368821	global
706	Kempapura	kempapura	area	22	13.0300000	77.5900000	t	f	2026-05-12 12:16:53.628728	2026-05-12 12:16:53.628728	global
707	Hennur	hennur	area	22	13.0389000	77.6450000	t	f	2026-05-12 12:16:53.891968	2026-05-12 12:16:53.891968	global
708	Bagalur	bagalur	area	22	13.1090000	77.6780000	t	f	2026-05-12 12:16:54.151048	2026-05-12 12:16:54.151048	global
709	Byatarayanapura	byatarayanapura	area	22	13.0631000	77.5958000	t	f	2026-05-12 12:16:54.41521	2026-05-12 12:16:54.41521	global
710	South Bengaluru	south-bengaluru	area	22	12.9000000	77.5500000	t	f	2026-05-12 12:16:54.688557	2026-05-12 12:16:54.688557	global
711	Jayanagar	jayanagar	area	22	12.9308000	77.5838000	t	f	2026-05-12 12:16:54.950548	2026-05-12 12:16:54.950548	global
712	JP Nagar	jp-nagar	area	22	12.9106000	77.5857000	t	f	2026-05-12 12:16:55.209948	2026-05-12 12:16:55.209948	global
713	Banashankari	banashankari	area	22	12.9250000	77.5520000	t	f	2026-05-12 12:16:55.472948	2026-05-12 12:16:55.472948	global
714	Basavanagudi	basavanagudi	area	22	12.9401000	77.5734000	t	f	2026-05-12 12:16:55.736082	2026-05-12 12:16:55.736082	global
715	Kumaraswamy Layout	kumaraswamy-layout	area	22	12.9050000	77.5640000	t	f	2026-05-12 12:16:56.005549	2026-05-12 12:16:56.005549	global
716	Padmanabhanagar	padmanabhanagar	area	22	12.9279000	77.5640000	t	f	2026-05-12 12:16:56.266449	2026-05-12 12:16:56.266449	global
717	Bannerghatta Road	bannerghatta-road	area	22	12.9156000	77.6046000	t	f	2026-05-12 12:16:56.528696	2026-05-12 12:16:56.528696	global
718	BTM Layout	btm-layout	area	22	12.9166000	77.6101000	t	f	2026-05-12 12:16:56.788703	2026-05-12 12:16:56.788703	global
719	Arekere	arekere	area	22	12.8916000	77.6000000	t	f	2026-05-12 12:16:57.050918	2026-05-12 12:16:57.050918	global
720	Hulimavu	hulimavu	area	22	12.8890000	77.6020000	t	f	2026-05-12 12:16:57.310997	2026-05-12 12:16:57.310997	global
721	Gottigere	gottigere	area	22	12.8548000	77.5898000	t	f	2026-05-12 12:16:57.583318	2026-05-12 12:16:57.583318	global
722	Konanakunte	konanakunte	area	22	12.8906000	77.5669000	t	f	2026-05-12 12:16:57.871725	2026-05-12 12:16:57.871725	global
723	East Bengaluru	east-bengaluru	area	22	12.9698000	77.7500000	t	f	2026-05-12 12:16:58.131285	2026-05-12 12:16:58.131285	global
724	Whitefield	whitefield	area	22	12.9698000	77.7500000	t	f	2026-05-12 12:16:58.392527	2026-05-12 12:16:58.392527	global
725	Marathahalli	marathahalli	area	22	12.9592000	77.6974000	t	f	2026-05-12 12:16:58.653092	2026-05-12 12:16:58.653092	global
726	Bellandur	bellandur	area	22	12.9279000	77.6762000	t	f	2026-05-12 12:16:58.912855	2026-05-12 12:16:58.912855	global
727	Kadugodi	kadugodi	area	22	13.0068000	77.7606000	t	f	2026-05-12 12:16:59.175805	2026-05-12 12:16:59.175805	global
728	KR Puram	kr-puram	area	22	13.0098000	77.6958000	t	f	2026-05-12 12:16:59.437007	2026-05-12 12:16:59.437007	global
729	Mahadevapura	mahadevapura	area	22	12.9955000	77.6952000	t	f	2026-05-12 12:16:59.723616	2026-05-12 12:16:59.723616	global
730	Hoodi	hoodi	area	22	12.9916000	77.7150000	t	f	2026-05-12 12:16:59.985012	2026-05-12 12:16:59.985012	global
731	Ramamurthy Nagar	ramamurthy-nagar	area	22	13.0168000	77.6845000	t	f	2026-05-12 12:17:00.249181	2026-05-12 12:17:00.249181	global
732	Varthur	varthur	area	22	12.9400000	77.7500000	t	f	2026-05-12 12:17:00.512394	2026-05-12 12:17:00.512394	global
733	Kundalahalli	kundalahalli	area	22	12.9567000	77.7015000	t	f	2026-05-12 12:17:00.773464	2026-05-12 12:17:00.773464	global
734	Brookefield	brookefield	area	22	12.9720000	77.7180000	t	f	2026-05-12 12:17:01.035658	2026-05-12 12:17:01.035658	global
735	HSR Layout	hsr-layout	area	22	12.9116000	77.6386000	t	f	2026-05-12 12:17:01.321337	2026-05-12 12:17:01.321337	global
736	West Bengaluru	west-bengaluru	area	22	12.9716000	77.5946000	t	f	2026-05-12 12:17:01.58239	2026-05-12 12:17:01.58239	global
737	Rajajinagar	rajajinagar	area	22	12.9860000	77.5550000	t	f	2026-05-12 12:17:01.848656	2026-05-12 12:17:01.848656	global
738	Vijayanagar	vijayanagar	area	22	12.9716000	77.5495000	t	f	2026-05-12 12:17:02.111938	2026-05-12 12:17:02.111938	global
739	Mahalakshmi Layout	mahalakshmi-layout	area	22	13.0158000	77.5486000	t	f	2026-05-12 12:17:02.371335	2026-05-12 12:17:02.371335	global
740	Basaveshwaranagar	basaveshwaranagar	area	22	12.9900000	77.5400000	t	f	2026-05-12 12:17:02.631088	2026-05-12 12:17:02.631088	global
741	Kamakshipalya	kamakshipalya	area	22	12.9865000	77.5200000	t	f	2026-05-12 12:17:02.892136	2026-05-12 12:17:02.892136	global
742	Nagarbhavi	nagarbhavi	area	22	12.9685000	77.5120000	t	f	2026-05-12 12:17:03.153296	2026-05-12 12:17:03.153296	global
743	Magadi Road	magadi-road	area	22	12.9550000	77.6200000	t	f	2026-05-12 12:17:03.413314	2026-05-12 12:17:03.413314	global
744	Sunkadakatte	sunkadakatte	area	22	13.0050000	77.4850000	t	f	2026-05-12 12:17:04.395635	2026-05-12 12:17:04.395635	global
745	Nandini Layout	nandini-layout	area	22	13.0192000	77.5354000	t	f	2026-05-12 12:17:04.662762	2026-05-12 12:17:04.662762	global
746	Bengaluru Rural Border Areas (Metro Influence)	bengaluru-rural-border-areas-metro-influence	area	22	13.1000000	77.5000000	t	f	2026-05-12 12:17:04.925153	2026-05-12 12:17:04.925153	global
747	Devanahalli	devanahalli	area	22	13.2485000	77.7134000	t	f	2026-05-12 12:17:05.187244	2026-05-12 12:17:05.187244	global
748	Nelamangala	nelamangala	area	22	13.0970000	77.3940000	t	f	2026-05-12 12:17:05.450353	2026-05-12 12:17:05.450353	global
749	Hoskote	hoskote	area	22	13.0670000	77.7880000	t	f	2026-05-12 12:17:05.712351	2026-05-12 12:17:05.712351	global
750	Anekal	anekal	area	22	12.7080000	77.6957000	t	f	2026-05-12 12:17:05.987055	2026-05-12 12:17:05.987055	global
751	Sarjapur Road Belt	sarjapur-road-belt	area	22	12.9150000	77.6800000	t	f	2026-05-12 12:17:06.258163	2026-05-12 12:17:06.258163	global
752	Electronic City (Phase 1 & 2)	electronic-city-phase-1-2	area	22	12.8456000	77.6611000	t	f	2026-05-12 12:17:06.519197	2026-05-12 12:17:06.519197	global
753	Chandapura	chandapura	area	22	12.8000000	77.7000000	t	f	2026-05-12 12:17:06.781518	2026-05-12 12:17:06.781518	global
754	Bommasandra	bommasandra	area	22	12.8167000	77.6800000	t	f	2026-05-12 12:17:07.042697	2026-05-12 12:17:07.042697	global
755	Attibele	attibele	area	22	12.7800000	77.7830000	t	f	2026-05-12 12:17:07.305987	2026-05-12 12:17:07.305987	global
756	Bhadohi Nagar	bhadohi-nagar	area	23	25.3940000	82.5700000	t	f	2026-05-12 12:17:07.568885	2026-05-12 12:17:07.568885	global
757	Bhadohi City	bhadohi-city	area	23	25.3860000	82.5700000	t	f	2026-05-12 12:17:07.833141	2026-05-12 12:17:07.833141	global
758	Gyanpur Road	gyanpur-road	area	23	25.3100000	82.5600000	t	f	2026-05-12 12:17:08.093457	2026-05-12 12:17:08.093457	global
759	Nai Bazar	nai-bazar	area	23	25.4025000	82.5700000	t	f	2026-05-12 12:17:08.354485	2026-05-12 12:17:08.354485	global
760	Suriyawan Road	suriyawan-road	area	23	25.3940000	82.5680000	t	f	2026-05-12 12:17:08.618555	2026-05-12 12:17:08.618555	global
761	Aurai Road	aurai-road	area	23	25.3280000	82.5660000	t	f	2026-05-12 12:17:08.878931	2026-05-12 12:17:08.878931	global
762	Rajpura	rajpura	area	23	25.3940000	82.5660000	t	f	2026-05-12 12:17:09.13976	2026-05-12 12:17:09.13976	global
763	Chauri Bazar	chauri-bazar	area	23	25.3936000	82.5703000	t	f	2026-05-12 12:17:09.403022	2026-05-12 12:17:09.403022	global
764	Parsipur	parsipur	area	23	25.3200000	82.5800000	t	f	2026-05-12 12:17:09.673265	2026-05-12 12:17:09.673265	global
765	Gopiganj Road	gopiganj-road	area	23	25.4249000	82.5367000	t	f	2026-05-12 12:17:09.938297	2026-05-12 12:17:09.938297	global
766	Kapsethi Border Area	kapsethi-border-area	area	23	25.3300000	82.5200000	t	f	2026-05-12 12:17:10.199097	2026-05-12 12:17:10.199097	global
767	Nagar Palika	nagar-palika	area	23	25.3952000	82.5708000	t	f	2026-05-12 12:17:10.461498	2026-05-12 12:17:10.461498	global
768	Gyanpur	gyanpur	area	23	25.3167000	82.6500000	t	f	2026-05-12 12:17:10.721519	2026-05-12 12:17:10.721519	global
769	Bhadohi	bhadohi	area	23	25.3950000	82.5728000	t	f	2026-05-12 12:17:10.982735	2026-05-12 12:17:10.982735	global
770	Gopiganj	gopiganj	area	23	25.3276000	82.4261000	t	f	2026-05-12 12:17:11.241852	2026-05-12 12:17:11.241852	global
771	Aurai	aurai	area	23	25.4120000	82.6040000	t	f	2026-05-12 12:17:11.501865	2026-05-12 12:17:11.501865	global
772	Suriyawan	suriyawan	area	23	25.5000000	82.7000000	t	f	2026-05-12 12:17:11.764011	2026-05-12 12:17:11.764011	global
773	Bhadohi District	bhadohi-district	area	23	25.3949000	82.5703000	t	f	2026-05-12 12:17:12.036338	2026-05-12 12:17:12.036338	global
774	Gopiganj Block	gopiganj-block	area	23	25.3020000	82.4420000	t	f	2026-05-12 12:17:12.302151	2026-05-12 12:17:12.302151	global
775	Harraipur	harraipur	area	23	25.3950000	82.5700000	t	f	2026-05-12 12:17:12.565317	2026-05-12 12:17:12.565317	global
776	Khamaria	khamaria	area	23	25.4000000	82.5700000	t	f	2026-05-12 12:17:12.829528	2026-05-12 12:17:12.829528	global
777	Chauri	chauri	area	23	25.3950000	82.5700000	t	f	2026-05-12 12:17:13.097805	2026-05-12 12:17:13.097805	global
778	Jagapur	jagapur	area	23	25.3100000	82.5600000	t	f	2026-05-12 12:17:13.359972	2026-05-12 12:17:13.359972	global
779	Bhikhapur	bhikhapur	area	23	25.3912000	82.5665000	t	f	2026-05-12 12:17:13.623201	2026-05-12 12:17:13.623201	global
780	Baraut	baraut	area	23	25.4230000	82.5600000	t	f	2026-05-12 12:17:13.885198	2026-05-12 12:17:13.885198	global
781	Jangiganj	jangiganj	area	23	25.3120000	82.4300000	t	f	2026-05-12 12:17:14.151521	2026-05-12 12:17:14.151521	global
782	Dhantulsi	dhantulsi	area	23	25.3950000	82.5710000	t	f	2026-05-12 12:17:14.413641	2026-05-12 12:17:14.413641	global
783	Bhadohi Block	bhadohi-block	area	23	25.3940000	82.5690000	t	f	2026-05-12 12:17:14.678807	2026-05-12 12:17:14.678807	global
784	Khamaria Industrial Area	khamaria-industrial-area	area	23	25.3842000	82.5766000	t	f	2026-05-12 12:17:14.93896	2026-05-12 12:17:14.93896	global
785	Mahrajganj	mahrajganj	area	23	25.3030000	82.5660000	t	f	2026-05-12 12:17:15.198906	2026-05-12 12:17:15.198906	global
786	Kaida	kaida	area	23	25.3810000	82.5560000	t	f	2026-05-12 12:17:15.466987	2026-05-12 12:17:15.466987	global
787	Koirauna	koirauna	area	23	25.3833000	82.5833000	t	f	2026-05-12 12:17:15.729165	2026-05-12 12:17:15.729165	global
788	Aurai Block	aurai-block	area	23	25.3500000	82.6000000	t	f	2026-05-12 12:17:15.992271	2026-05-12 12:17:15.992271	global
789	Aurai Town	aurai-town	area	23	25.7960000	82.5870000	t	f	2026-05-12 12:17:16.250489	2026-05-12 12:17:16.250489	global
790	Sitamarhi	sitamarhi	area	23	25.3950000	82.5680000	t	f	2026-05-12 12:17:16.515806	2026-05-12 12:17:16.515806	global
791	Amilipatti	amilipatti	area	23	25.3090000	82.3960000	t	f	2026-05-12 12:17:16.777106	2026-05-12 12:17:16.777106	global
792	Chak Jalaluddin	chak-jalaluddin	area	23	25.4260000	82.5646000	t	f	2026-05-12 12:17:17.04409	2026-05-12 12:17:17.04409	global
793	Mahuari	mahuari	area	23	25.4170000	82.5660000	t	f	2026-05-12 12:17:17.306114	2026-05-12 12:17:17.306114	global
794	Jagdishpur	jagdishpur	area	23	25.3940000	82.5660000	t	f	2026-05-12 12:17:17.567374	2026-05-12 12:17:17.567374	global
795	Sarai Mohana (border area)	sarai-mohana-border-area	area	23	25.2950000	82.9990000	t	f	2026-05-12 12:17:17.829535	2026-05-12 12:17:17.829535	global
796	Suriyawan Block	suriyawan-block	area	23	25.3420000	82.6490000	t	f	2026-05-12 12:17:18.089698	2026-05-12 12:17:18.089698	global
797	Karanja Kala	karanja-kala	area	23	25.3918000	82.5578000	t	f	2026-05-12 12:17:18.351752	2026-05-12 12:17:18.351752	global
798	Dubar	dubar	area	23	25.4296000	82.5678000	t	f	2026-05-12 12:17:18.614889	2026-05-12 12:17:18.614889	global
799	Ghosia	ghosia	area	23	25.4300000	82.5600000	t	f	2026-05-12 12:17:18.88127	2026-05-12 12:17:18.88127	global
800	Umaraha	umaraha	area	23	25.4270000	82.5670000	t	f	2026-05-12 12:17:19.147544	2026-05-12 12:17:19.147544	global
801	Semradh	semradh	area	23	25.3570000	82.5600000	t	f	2026-05-12 12:17:19.408682	2026-05-12 12:17:19.408682	global
802	Patti Nagar	patti-nagar	area	23	25.3950000	82.5660000	t	f	2026-05-12 12:17:19.672842	2026-05-12 12:17:19.672842	global
803	Gyanpur Block	gyanpur-block	area	23	25.3290000	82.4320000	t	f	2026-05-12 12:17:19.938112	2026-05-12 12:17:19.938112	global
804	Bhadohi bypass area	bhadohi-bypass-area	area	23	25.4200000	82.5700000	t	f	2026-05-12 12:17:20.201314	2026-05-12 12:17:20.201314	global
805	Sant Ravidas Nagar belt	sant-ravidas-nagar-belt	area	23	25.3930000	82.5670000	t	f	2026-05-12 12:17:20.462369	2026-05-12 12:17:20.462369	global
806	Hardaspur	hardaspur	area	23	25.4212000	82.5626000	t	f	2026-05-12 12:17:20.722812	2026-05-12 12:17:20.722812	global
807	Gopiganj?Gyanpur Road belt	gopiganjgyanpur-road-belt	area	23	25.3350000	82.4260000	t	f	2026-05-12 12:17:20.985689	2026-05-12 12:17:20.985689	global
808	Taraon	taraon	area	23	25.4200000	82.5700000	t	f	2026-05-12 12:17:21.24799	2026-05-12 12:17:21.24799	global
809	Durgaganj	durgaganj	area	23	25.3980000	82.5730000	t	f	2026-05-12 12:17:21.50993	2026-05-12 12:17:21.50993	global
810	Major Villages	major-villages	area	23	25.3200000	82.5600000	t	f	2026-05-12 12:17:21.771137	2026-05-12 12:17:21.771137	global
811	Kaushar	kaushar	area	23	25.3990000	82.5700000	t	f	2026-05-12 12:17:22.037393	2026-05-12 12:17:22.037393	global
812	Babhniyav	babhniyav	area	23	25.3930000	82.5610000	t	f	2026-05-12 12:17:22.300598	2026-05-12 12:17:22.300598	global
813	Sarauni	sarauni	area	23	25.3950000	82.5700000	t	f	2026-05-12 12:17:22.577996	2026-05-12 12:17:22.577996	global
814	Khajuri	khajuri	area	23	25.3940000	82.5700000	t	f	2026-05-12 12:17:22.844313	2026-05-12 12:17:22.844313	global
815	Itahara	itahara	area	23	25.3350000	82.5600000	t	f	2026-05-12 12:17:23.105532	2026-05-12 12:17:23.105532	global
816	Kathautia	kathautia	area	23	25.3920000	82.5700000	t	f	2026-05-12 12:17:23.368605	2026-05-12 12:17:23.368605	global
817	Khewali	khewali	area	23	25.3510000	82.6470000	t	f	2026-05-12 12:17:23.628636	2026-05-12 12:17:23.628636	global
818	Bairi	bairi	area	23	25.4100000	82.5700000	t	f	2026-05-12 12:17:23.890011	2026-05-12 12:17:23.890011	global
819	Sarai Jagdish	sarai-jagdish	area	23	25.3900000	82.5700000	t	f	2026-05-12 12:17:24.155213	2026-05-12 12:17:24.155213	global
820	Dubkaran	dubkaran	area	23	25.3952000	82.5763000	t	f	2026-05-12 12:17:24.416149	2026-05-12 12:17:24.416149	global
821	Dandupur	dandupur	area	23	25.3820000	82.5700000	t	f	2026-05-12 12:17:24.679356	2026-05-12 12:17:24.679356	global
822	Chandauli Nagar	chandauli-nagar	area	13	25.2636000	83.2647000	t	f	2026-05-12 12:17:24.940396	2026-05-12 12:17:24.940396	global
823	Chandauli Mughalsarai (Pt. Deen Dayal Upadhyaya Nagar)	chandauli-mughalsarai-pt-deen-dayal-upadhyaya-nagar	area	13	25.2830000	83.1230000	t	f	2026-05-12 12:17:25.200539	2026-05-12 12:17:25.200539	global
824	Chandauli Town	chandauli-town	area	13	25.2570000	83.2670000	t	f	2026-05-12 12:17:25.461617	2026-05-12 12:17:25.461617	global
825	Sakaldiha Road	sakaldiha-road	area	13	25.2910000	83.2660000	t	f	2026-05-12 12:17:25.720894	2026-05-12 12:17:25.720894	global
826	Saidpur Road	saidpur-road	area	13	25.2628000	83.2707000	t	f	2026-05-12 12:17:25.985028	2026-05-12 12:17:25.985028	global
827	Ramnagar Road	ramnagar-road	area	13	25.2580000	83.2610000	t	f	2026-05-12 12:17:26.249332	2026-05-12 12:17:26.249332	global
828	Dallipur	dallipur	area	13	25.1700000	83.2700000	t	f	2026-05-12 12:17:26.510445	2026-05-12 12:17:26.510445	global
829	Baburi	baburi	area	13	25.2700000	83.2630000	t	f	2026-05-12 12:17:26.771317	2026-05-12 12:17:26.771317	global
830	Ghosiya	ghosiya	area	13	25.3260000	83.2660000	t	f	2026-05-12 12:17:27.030387	2026-05-12 12:17:27.030387	global
831	Deen Dayal Nagar (DDU)	deen-dayal-nagar-ddu	area	13	25.1630000	83.2600000	t	f	2026-05-12 12:17:27.290466	2026-05-12 12:17:27.290466	global
832	Mughalsarai Railway Colony	mughalsarai-railway-colony	area	13	25.2830000	83.1226000	t	f	2026-05-12 12:17:27.554714	2026-05-12 12:17:27.554714	global
833	Nagar Panchayats	nagar-panchayats	area	13	25.2620000	83.2683000	t	f	2026-05-12 12:17:27.815849	2026-05-12 12:17:27.815849	global
834	Sakaldiha	sakaldiha	area	13	25.3500000	83.2830000	t	f	2026-05-12 12:17:28.076293	2026-05-12 12:17:28.076293	global
835	Chakia	chakia	area	13	25.0500000	83.2200000	t	f	2026-05-12 12:17:28.337792	2026-05-12 12:17:28.337792	global
836	Saiyad Raja (Saidraja)	saiyad-raja-saidraja	area	13	25.2667000	83.2167000	t	f	2026-05-12 12:17:28.602857	2026-05-12 12:17:28.602857	global
837	Mughalsarai (DDU Nagar)	mughalsarai-ddu-nagar	area	13	25.2833000	83.1167000	t	f	2026-05-12 12:17:28.863192	2026-05-12 12:17:28.863192	global
838	Dhanapur	dhanapur	area	13	25.3025000	83.3218000	t	f	2026-05-12 12:17:29.123356	2026-05-12 12:17:29.123356	global
839	Niyamatabad	niyamatabad	area	13	25.2910000	83.3230000	t	f	2026-05-12 12:17:29.384223	2026-05-12 12:17:29.384223	global
840	Chandauli Block	chandauli-block	area	13	25.2580000	83.2610000	t	f	2026-05-12 12:17:29.649588	2026-05-12 12:17:29.649588	global
841	Lohata	lohata	area	13	25.2578000	83.2406000	t	f	2026-05-12 12:17:29.909689	2026-05-12 12:17:29.909689	global
842	Derhgaon	derhgaon	area	13	25.2167000	83.2500000	t	f	2026-05-12 12:17:30.169677	2026-05-12 12:17:30.169677	global
843	Kharagpur	kharagpur	area	13	25.1280000	83.2680000	t	f	2026-05-12 12:17:30.430734	2026-05-12 12:17:30.430734	global
844	Nemaicha	nemaicha	area	13	25.2640000	83.2790000	t	f	2026-05-12 12:17:30.690895	2026-05-12 12:17:30.690895	global
845	Sarauli	sarauli	area	13	25.2620000	83.2710000	t	f	2026-05-12 12:17:30.954065	2026-05-12 12:17:30.954065	global
846	Sakaldiha Block	sakaldiha-block	area	13	25.3600000	83.2400000	t	f	2026-05-12 12:17:31.215217	2026-05-12 12:17:31.215217	global
847	Kasba Deenapur	kasba-deenapur	area	13	25.2740000	83.2650000	t	f	2026-05-12 12:17:31.477397	2026-05-12 12:17:31.477397	global
848	Baragaon	baragaon	area	13	25.1800000	83.2700000	t	f	2026-05-12 12:17:31.74364	2026-05-12 12:17:31.74364	global
849	Bisunpura	bisunpura	area	13	25.2600000	83.2700000	t	f	2026-05-12 12:17:32.00585	2026-05-12 12:17:32.00585	global
850	Pipari	pipari	area	13	25.2580000	83.2670000	t	f	2026-05-12 12:17:32.269005	2026-05-12 12:17:32.269005	global
851	Durgawati Road belt	durgawati-road-belt	area	13	25.1670000	83.2480000	t	f	2026-05-12 12:17:32.52799	2026-05-12 12:17:32.52799	global
852	Chahniya Block	chahniya-block	area	13	25.2667000	83.2667000	t	f	2026-05-12 12:17:32.79016	2026-05-12 12:17:32.79016	global
853	Chahniya	chahniya	area	13	25.2670000	83.2620000	t	f	2026-05-12 12:17:33.054462	2026-05-12 12:17:33.054462	global
854	Kamtinagar	kamtinagar	area	13	25.2630000	83.2630000	t	f	2026-05-12 12:17:33.315562	2026-05-12 12:17:33.315562	global
855	Chandauli?Varanasi Border villages	chandaulivaranasi-border-villages	area	13	25.3030000	83.2030000	t	f	2026-05-12 12:17:33.576594	2026-05-12 12:17:33.576594	global
856	Janki Nagar	janki-nagar	area	13	25.2730000	83.2670000	t	f	2026-05-12 12:17:33.839761	2026-05-12 12:17:33.839761	global
857	Raghunathpur	raghunathpur	area	13	25.2680000	83.2725000	t	f	2026-05-12 12:17:34.104215	2026-05-12 12:17:34.104215	global
858	Dhanapur Block	dhanapur-block	area	13	25.0250000	83.2820000	t	f	2026-05-12 12:17:34.363161	2026-05-12 12:17:34.363161	global
859	Jamalpur	jamalpur	area	13	25.2575000	83.2690000	t	f	2026-05-12 12:17:34.624247	2026-05-12 12:17:34.624247	global
860	Bihra	bihra	area	13	25.2020000	83.2570000	t	f	2026-05-12 12:17:34.888462	2026-05-12 12:17:34.888462	global
861	Bairampur	bairampur	area	13	25.2580000	83.2688000	t	f	2026-05-12 12:17:35.151509	2026-05-12 12:17:35.151509	global
862	Mahuwar	mahuwar	area	13	25.2570000	83.2695000	t	f	2026-05-12 12:17:35.435179	2026-05-12 12:17:35.435179	global
863	Sarai Mohana	sarai-mohana	area	13	25.3170000	83.2520000	t	f	2026-05-12 12:17:35.697336	2026-05-12 12:17:35.697336	global
864	Niyamatabad Block	niyamatabad-block	area	13	25.2760000	83.2870000	t	f	2026-05-12 12:17:35.957489	2026-05-12 12:17:35.957489	global
865	Saidpur South belt	saidpur-south-belt	area	13	25.2560000	83.2610000	t	f	2026-05-12 12:17:36.224805	2026-05-12 12:17:36.224805	global
866	Amoi	amoi	area	13	25.1620000	83.2680000	t	f	2026-05-12 12:17:36.487083	2026-05-12 12:17:36.487083	global
867	Jalalpur	jalalpur	area	13	25.2610000	83.2680000	t	f	2026-05-12 12:17:36.747976	2026-05-12 12:17:36.747976	global
868	Dafi	dafi	area	13	25.2610000	83.2835000	t	f	2026-05-12 12:17:37.009335	2026-05-12 12:17:37.009335	global
869	Ramnagar border line areas	ramnagar-border-line-areas	area	13	25.1300000	83.2900000	t	f	2026-05-12 12:17:37.270293	2026-05-12 12:17:37.270293	global
870	Chakia Block	chakia-block	area	13	25.0430000	83.2430000	t	f	2026-05-12 12:17:37.534485	2026-05-12 12:17:37.534485	global
871	Naugarh Range area	naugarh-range-area	area	13	25.1450000	83.2710000	t	f	2026-05-12 12:17:37.795473	2026-05-12 12:17:37.795473	global
872	Pipri	pipri	area	13	25.2567000	83.2665000	t	f	2026-05-12 12:17:38.056112	2026-05-12 12:17:38.056112	global
873	Shahabganj	shahabganj	area	13	25.0380000	83.2470000	t	f	2026-05-12 12:17:38.318716	2026-05-12 12:17:38.318716	global
874	Dharampur	dharampur	area	13	25.2580000	83.2670000	t	f	2026-05-12 12:17:38.578896	2026-05-12 12:17:38.578896	global
875	Chaurhat	chaurhat	area	13	25.2580000	83.2710000	t	f	2026-05-12 12:17:38.839999	2026-05-12 12:17:38.839999	global
876	Karmasan Gaon	karmasan-gaon	area	13	25.2580000	83.2600000	t	f	2026-05-12 12:17:39.103017	2026-05-12 12:17:39.103017	global
877	Chandraprabha Wildlife Sanctuary belt	chandraprabha-wildlife-sanctuary-belt	area	13	24.9730000	83.0350000	t	f	2026-05-12 12:17:39.363135	2026-05-12 12:17:39.363135	global
878	Shahabganj Block	shahabganj-block	area	13	25.0230000	83.2640000	t	f	2026-05-12 12:17:39.626408	2026-05-12 12:17:39.626408	global
879	Sahupuri	sahupuri	area	13	25.3080000	83.2490000	t	f	2026-05-12 12:17:39.889614	2026-05-12 12:17:39.889614	global
880	Dharauli	dharauli	area	13	25.1590000	83.2580000	t	f	2026-05-12 12:17:40.151675	2026-05-12 12:17:40.151675	global
881	Kharna	kharna	area	13	25.2620000	83.2660000	t	f	2026-05-12 12:17:40.411768	2026-05-12 12:17:40.411768	global
882	Barbatpur	barbatpur	area	13	25.2587000	83.2659000	t	f	2026-05-12 12:17:40.676328	2026-05-12 12:17:40.676328	global
883	Khojwa	khojwa	area	13	25.2500000	83.2700000	t	f	2026-05-12 12:17:40.938117	2026-05-12 12:17:40.938117	global
884	Naugarh Block (Forest & Hill Areas)	naugarh-block-forest-hill-areas	area	13	25.0600000	83.1700000	t	f	2026-05-12 12:17:41.198266	2026-05-12 12:17:41.198266	global
885	Naugarh	naugarh	area	13	24.7530000	83.2710000	t	f	2026-05-12 12:17:41.45933	2026-05-12 12:17:41.45933	global
886	Bagahi	bagahi	area	13	25.2560000	83.2680000	t	f	2026-05-12 12:17:41.722431	2026-05-12 12:17:41.722431	global
887	Jamgarh	jamgarh	area	13	25.2600000	83.2600000	t	f	2026-05-12 12:17:41.984699	2026-05-12 12:17:41.984699	global
888	Bijaraw	bijaraw	area	13	25.1710000	83.2620000	t	f	2026-05-12 12:17:42.245821	2026-05-12 12:17:42.245821	global
889	Chaanw	chaanw	area	13	25.2620000	83.2725000	t	f	2026-05-12 12:17:42.507079	2026-05-12 12:17:42.507079	global
890	Chandraprabha Dam belt	chandraprabha-dam-belt	area	13	24.9300000	83.7000000	t	f	2026-05-12 12:17:42.769102	2026-05-12 12:17:42.769102	global
891	Barahani	barahani	area	13	25.1680000	83.1830000	t	f	2026-05-12 12:17:43.034855	2026-05-12 12:17:43.034855	global
892	Bhitti	bhitti	area	13	25.2610000	83.2800000	t	f	2026-05-12 12:17:43.301169	2026-05-12 12:17:43.301169	global
893	Bahariyabad	bahariyabad	area	13	25.2610000	83.2700000	t	f	2026-05-12 12:17:43.563357	2026-05-12 12:17:43.563357	global
894	Akodha	akodha	area	13	25.1440000	83.2940000	t	f	2026-05-12 12:17:43.82542	2026-05-12 12:17:43.82542	global
895	Karmaara	karmaara	area	13	25.2520000	83.2670000	t	f	2026-05-12 12:17:44.090668	2026-05-12 12:17:44.090668	global
896	Bishunpura	bishunpura	area	13	25.2690000	83.2680000	t	f	2026-05-12 12:17:44.352794	2026-05-12 12:17:44.352794	global
897	Dhanapur Bazar	dhanapur-bazar	area	13	25.2785000	83.2638000	t	f	2026-05-12 12:17:44.613885	2026-05-12 12:17:44.613885	global
898	Bariyarpur	bariyarpur	area	13	25.2620000	83.2680000	t	f	2026-05-12 12:17:44.87501	2026-05-12 12:17:44.87501	global
899	Hardiya	hardiya	area	13	25.2730000	83.2680000	t	f	2026-05-12 12:17:45.13539	2026-05-12 12:17:45.13539	global
900	Nuaon Road side villages	nuaon-road-side-villages	area	13	25.2610000	83.2680000	t	f	2026-05-12 12:17:45.397258	2026-05-12 12:17:45.397258	global
901	Karmaini	karmaini	area	13	25.1430000	83.2630000	t	f	2026-05-12 12:17:45.658399	2026-05-12 12:17:45.658399	global
902	Chakiya Range villages	chakiya-range-villages	area	13	25.0520000	83.2930000	t	f	2026-05-12 12:17:45.919513	2026-05-12 12:17:45.919513	global
903	Dulhipur	dulhipur	area	13	25.2980000	83.2660000	t	f	2026-05-12 12:17:46.182837	2026-05-12 12:17:46.182837	global
904	Koiripur	koiripur	area	13	25.2720000	83.2630000	t	f	2026-05-12 12:17:46.446086	2026-05-12 12:17:46.446086	global
905	North Chennai	north-chennai	area	19	13.1155000	80.2785000	t	f	2026-05-12 12:17:46.711251	2026-05-12 12:17:46.711251	global
906	Korukkupet	korukkupet	area	19	13.1260000	80.2903000	t	f	2026-05-12 12:17:46.972311	2026-05-12 12:17:46.972311	global
907	Kodungaiyur	kodungaiyur	area	19	13.1278000	80.2446000	t	f	2026-05-12 12:17:47.233325	2026-05-12 12:17:47.233325	global
908	Old Washermanpet	old-washermanpet	area	19	13.1277000	80.2834000	t	f	2026-05-12 12:17:47.497657	2026-05-12 12:17:47.497657	global
909	Broadway	broadway	area	19	13.0496000	80.2490000	t	f	2026-05-12 12:17:47.759792	2026-05-12 12:17:47.759792	global
910	Mint	mint	area	19	13.0810000	80.2800000	t	f	2026-05-12 12:17:48.020875	2026-05-12 12:17:48.020875	global
911	Central Chennai	central-chennai	area	19	13.0827000	80.2707000	t	f	2026-05-12 12:17:48.288187	2026-05-12 12:17:48.288187	global
912	George Town (Parry’s Corner)	george-town-parrys-corner	area	19	13.0920000	80.2893000	t	f	2026-05-12 12:17:48.550356	2026-05-12 12:17:48.550356	global
913	Sowcarpet	sowcarpet	area	19	13.0957000	80.2785000	t	f	2026-05-12 12:17:48.810332	2026-05-12 12:17:48.810332	global
914	South Chennai	south-chennai	area	19	13.0000000	80.2700000	t	f	2026-05-12 12:17:49.078687	2026-05-12 12:17:49.078687	global
915	ECR (East Coast Road Belt)	ecr-east-coast-road-belt	area	19	12.9600000	80.2400000	t	f	2026-05-12 12:17:49.338805	2026-05-12 12:17:49.338805	global
916	South-West Chennai	south-west-chennai	area	19	13.0000000	80.2000000	t	f	2026-05-12 12:17:49.601162	2026-05-12 12:17:49.601162	global
917	Anna Nagar (West Extension)	anna-nagar-west-extension	area	19	13.0835000	80.2119000	t	f	2026-05-12 12:17:49.862049	2026-05-12 12:17:49.862049	global
918	Nolambur	nolambur	area	19	13.0818000	80.1741000	t	f	2026-05-12 12:17:50.122165	2026-05-12 12:17:50.122165	global
919	West Chennai	west-chennai	area	19	13.0440000	80.1710000	t	f	2026-05-12 12:17:50.38558	2026-05-12 12:17:50.38558	global
920	Mogappair East & West	mogappair-east-west	area	19	13.0850000	80.1880000	t	f	2026-05-12 12:17:50.647479	2026-05-12 12:17:50.647479	global
921	Padi	padi	area	19	13.0927000	80.2010000	t	f	2026-05-12 12:17:50.912761	2026-05-12 12:17:50.912761	global
922	Maduravoyal	maduravoyal	area	19	13.0550000	80.1670000	t	f	2026-05-12 12:17:51.171803	2026-05-12 12:17:51.171803	global
923	East / Coastal Chennai	east-coastal-chennai	area	19	13.0500000	80.2900000	t	f	2026-05-12 12:17:51.434135	2026-05-12 12:17:51.434135	global
924	Marina Beach Area	marina-beach-area	area	19	13.0500000	80.2800000	t	f	2026-05-12 12:17:51.697322	2026-05-12 12:17:51.697322	global
925	Foreshore Estate	foreshore-estate	area	19	13.0830000	80.2830000	t	f	2026-05-12 12:17:51.97356	2026-05-12 12:17:51.97356	global
926	Neelankarai	neelankarai	area	19	12.9499000	80.2594000	t	f	2026-05-12 12:17:52.234695	2026-05-12 12:17:52.234695	global
927	Injambakkam	injambakkam	area	19	12.9250000	80.2510000	t	f	2026-05-12 12:17:52.4948	2026-05-12 12:17:52.4948	global
928	Palavakkam	palavakkam	area	19	12.9617000	80.2577000	t	f	2026-05-12 12:17:52.755892	2026-05-12 12:17:52.755892	global
929	Thoraipakkam (OMR)	thoraipakkam-omr	area	19	12.9416000	80.2334000	t	f	2026-05-12 12:17:53.015983	2026-05-12 12:17:53.015983	global
930	Greater Chennai / Suburban Zones	greater-chennai-suburban-zones	area	19	13.0827000	80.2707000	t	f	2026-05-12 12:17:53.276419	2026-05-12 12:17:53.276419	global
931	Thiruverkadu	thiruverkadu	area	19	13.0695000	80.1198000	t	f	2026-05-12 12:17:53.537303	2026-05-12 12:17:53.537303	global
932	Thirumullaivoyal	thirumullaivoyal	area	19	13.1258000	80.1270000	t	f	2026-05-12 12:17:53.796297	2026-05-12 12:17:53.796297	global
933	IT & Emerging Areas (OMR + GST Road Belt)	it-emerging-areas-omr-gst-road-belt	area	19	12.9391000	80.2369000	t	f	2026-05-12 12:17:54.05855	2026-05-12 12:17:54.05855	global
934	Padur	padur	area	19	12.8265000	80.2245000	t	f	2026-05-12 12:17:54.320618	2026-05-12 12:17:54.320618	global
935	Kelambakkam	kelambakkam	area	19	12.7900000	80.2300000	t	f	2026-05-12 12:17:54.582843	2026-05-12 12:17:54.582843	global
936	Karapakkam	karapakkam	area	19	12.9190000	80.2284000	t	f	2026-05-12 12:17:54.844171	2026-05-12 12:17:54.844171	global
937	Perumbakkam	perumbakkam	area	19	12.8830000	80.2170000	t	f	2026-05-12 12:17:55.106041	2026-05-12 12:17:55.106041	global
938	Urapakkam	urapakkam	area	19	12.8652000	80.0737000	t	f	2026-05-12 12:17:55.369901	2026-05-12 12:17:55.369901	global
939	Guduvanchery	guduvanchery	area	19	12.8415000	80.0808000	t	f	2026-05-12 12:17:55.630376	2026-05-12 12:17:55.630376	global
940	Maraimalai Nagar	maraimalai-nagar	area	19	12.7650000	80.0326000	t	f	2026-05-12 12:17:55.896717	2026-05-12 12:17:55.896717	global
941	Central Delhi	central-delhi	area	17	28.6139000	77.2090000	t	f	2026-05-12 12:17:56.158684	2026-05-12 12:17:56.158684	global
942	Connaught Place (CP)	connaught-place-cp	area	17	28.6315000	77.2167000	t	f	2026-05-12 12:17:56.42089	2026-05-12 12:17:56.42089	global
943	Karol Bagh	karol-bagh	area	17	28.6517000	77.1900000	t	f	2026-05-12 12:17:56.683049	2026-05-12 12:17:56.683049	global
944	Paharganj	paharganj	area	17	28.6429000	77.2197000	t	f	2026-05-12 12:17:56.943092	2026-05-12 12:17:56.943092	global
945	Daryaganj	daryaganj	area	17	28.6448000	77.2410000	t	f	2026-05-12 12:17:57.204346	2026-05-12 12:17:57.204346	global
946	Chandni Chowk	chandni-chowk	area	17	28.6562000	77.2303000	t	f	2026-05-12 12:17:57.467447	2026-05-12 12:17:57.467447	global
947	Ajmeri Gate	ajmeri-gate	area	17	28.6473000	77.2270000	t	f	2026-05-12 12:17:57.728625	2026-05-12 12:17:57.728625	global
948	Sadar Bazaar	sadar-bazaar	area	17	28.6562000	77.2170000	t	f	2026-05-12 12:17:57.993901	2026-05-12 12:17:57.993901	global
949	Kishan Ganj	kishan-ganj	area	17	28.7041000	77.2033000	t	f	2026-05-12 12:17:58.253893	2026-05-12 12:17:58.253893	global
950	Nabi Karim	nabi-karim	area	17	28.6495000	77.2077000	t	f	2026-05-12 12:17:58.515021	2026-05-12 12:17:58.515021	global
951	Patel Nagar (East/West/South)	patel-nagar-eastwestsouth	area	17	28.6480000	77.1700000	t	f	2026-05-12 12:17:58.779215	2026-05-12 12:17:58.779215	global
952	Mandir Marg	mandir-marg	area	17	28.6353000	77.2070000	t	f	2026-05-12 12:17:59.045437	2026-05-12 12:17:59.045437	global
953	Gole Market	gole-market	area	17	28.6339000	77.2086000	t	f	2026-05-12 12:17:59.307633	2026-05-12 12:17:59.307633	global
954	Talkatora Road	talkatora-road	area	17	28.6398000	77.2127000	t	f	2026-05-12 12:17:59.567701	2026-05-12 12:17:59.567701	global
955	New Delhi District	new-delhi-district	area	17	28.6139000	77.2090000	t	f	2026-05-12 12:17:59.830959	2026-05-12 12:17:59.830959	global
956	Lutyens Bungalow Zone	lutyens-bungalow-zone	area	17	28.6129000	77.2197000	t	f	2026-05-12 12:18:00.09314	2026-05-12 12:18:00.09314	global
957	Chanakyapuri (Diplomatic Area)	chanakyapuri-diplomatic-area	area	17	28.5921000	77.1840000	t	f	2026-05-12 12:18:00.354192	2026-05-12 12:18:00.354192	global
958	INA Colony	ina-colony	area	17	28.5690000	77.2070000	t	f	2026-05-12 12:18:00.617317	2026-05-12 12:18:00.617317	global
959	Sarojini Nagar	sarojini-nagar	area	17	28.5730000	77.1968000	t	f	2026-05-12 12:18:00.881554	2026-05-12 12:18:00.881554	global
960	Lodhi Colony	lodhi-colony	area	17	28.5900000	77.2200000	t	f	2026-05-12 12:18:01.153886	2026-05-12 12:18:01.153886	global
961	Motilal Nehru Marg	motilal-nehru-marg	area	17	28.6147000	77.2094000	t	f	2026-05-12 12:18:01.413995	2026-05-12 12:18:01.413995	global
962	Janpath	janpath	area	17	28.6139000	77.2100000	t	f	2026-05-12 12:18:01.677307	2026-05-12 12:18:01.677307	global
963	Jor Bagh	jor-bagh	area	17	28.5947000	77.2115000	t	f	2026-05-12 12:18:01.938688	2026-05-12 12:18:01.938688	global
964	Golf Links	golf-links	area	17	28.5995000	77.2269000	t	f	2026-05-12 12:18:02.200643	2026-05-12 12:18:02.200643	global
965	Khan Market Area	khan-market-area	area	17	28.6000000	77.2280000	t	f	2026-05-12 12:18:02.461567	2026-05-12 12:18:02.461567	global
1045	Janakpuri	janakpuri	area	17	28.6219000	77.0819000	t	f	2026-05-12 12:18:23.79623	2026-05-12 12:18:23.79623	global
966	Race Course Road Area	race-course-road-area	area	17	28.6226000	77.2180000	t	f	2026-05-12 12:18:02.724736	2026-05-12 12:18:02.724736	global
967	RK Ashram Area	rk-ashram-area	area	17	28.6430000	77.2165000	t	f	2026-05-12 12:18:02.986457	2026-05-12 12:18:02.986457	global
968	South Delhi	south-delhi	area	17	28.5273000	77.2066000	t	f	2026-05-12 12:18:03.252158	2026-05-12 12:18:03.252158	global
969	Major Areas	major-areas	area	17	28.7041000	77.1025000	t	f	2026-05-12 12:18:03.512214	2026-05-12 12:18:03.512214	global
970	Hauz Khas	hauz-khas	area	17	28.5494000	77.2001000	t	f	2026-05-12 12:18:03.773366	2026-05-12 12:18:03.773366	global
971	Green Park	green-park	area	17	28.5558000	77.2037000	t	f	2026-05-12 12:18:04.034501	2026-05-12 12:18:04.034501	global
972	Malviya Nagar	malviya-nagar	area	17	28.5333000	77.2100000	t	f	2026-05-12 12:18:04.3009	2026-05-12 12:18:04.3009	global
973	Saket	saket	area	17	28.5245000	77.2066000	t	f	2026-05-12 12:18:04.56488	2026-05-12 12:18:04.56488	global
974	Lajpat Nagar	lajpat-nagar	area	17	28.5700000	77.2400000	t	f	2026-05-12 12:18:04.827377	2026-05-12 12:18:04.827377	global
975	Greater Kailash 1 & 2	greater-kailash-1-2	area	17	28.5484000	77.2396000	t	f	2026-05-12 12:18:05.087467	2026-05-12 12:18:05.087467	global
976	CR Park (Chittaranjan Park)	cr-park-chittaranjan-park	area	17	28.5383000	77.2528000	t	f	2026-05-12 12:18:05.351482	2026-05-12 12:18:05.351482	global
977	Kalkaji	kalkaji	area	17	28.5484000	77.2513000	t	f	2026-05-12 12:18:05.625393	2026-05-12 12:18:05.625393	global
978	Nehru Place	nehru-place	area	17	28.5494000	77.2511000	t	f	2026-05-12 12:18:05.889059	2026-05-12 12:18:05.889059	global
979	Okhla	okhla	area	17	28.5300000	77.2700000	t	f	2026-05-12 12:18:06.150187	2026-05-12 12:18:06.150187	global
980	Jamia Nagar	jamia-nagar	area	17	28.5625000	77.2840000	t	f	2026-05-12 12:18:06.411488	2026-05-12 12:18:06.411488	global
981	Govindpuri	govindpuri	area	17	28.5355000	77.2650000	t	f	2026-05-12 12:18:06.672478	2026-05-12 12:18:06.672478	global
982	Mehrauli	mehrauli	area	17	28.5244000	77.1855000	t	f	2026-05-12 12:18:06.932553	2026-05-12 12:18:06.932553	global
983	Vasant Kunj	vasant-kunj	area	17	28.5245000	77.1570000	t	f	2026-05-12 12:18:07.194781	2026-05-12 12:18:07.194781	global
984	Vasant Vihar	vasant-vihar	area	17	28.5646000	77.1610000	t	f	2026-05-12 12:18:07.460171	2026-05-12 12:18:07.460171	global
985	Munirka	munirka	area	17	28.5490000	77.1710000	t	f	2026-05-12 12:18:07.730256	2026-05-12 12:18:07.730256	global
986	Safdarjung Enclave	safdarjung-enclave	area	17	28.5672000	77.2075000	t	f	2026-05-12 12:18:07.993584	2026-05-12 12:18:07.993584	global
987	Sarvodaya Enclave	sarvodaya-enclave	area	17	28.5440000	77.2100000	t	f	2026-05-12 12:18:08.259829	2026-05-12 12:18:08.259829	global
988	Sainik Farms	sainik-farms	area	17	28.5130000	77.2140000	t	f	2026-05-12 12:18:08.521777	2026-05-12 12:18:08.521777	global
989	Chhattarpur	chhattarpur	area	17	28.4900000	77.1800000	t	f	2026-05-12 12:18:08.783898	2026-05-12 12:18:08.783898	global
990	Khanpur	khanpur	area	17	28.5400000	77.2500000	t	f	2026-05-12 12:18:09.050305	2026-05-12 12:18:09.050305	global
991	Tughlakabad	tughlakabad	area	17	28.5050000	77.2735000	t	f	2026-05-12 12:18:09.310377	2026-05-12 12:18:09.310377	global
992	Jaitpur	jaitpur	area	17	28.5320000	77.3050000	t	f	2026-05-12 12:18:09.570425	2026-05-12 12:18:09.570425	global
993	Neb Sarai	neb-sarai	area	17	28.5190000	77.1980000	t	f	2026-05-12 12:18:09.834649	2026-05-12 12:18:09.834649	global
994	South East Delhi	south-east-delhi	area	17	28.5200000	77.2500000	t	f	2026-05-12 12:18:10.099876	2026-05-12 12:18:10.099876	global
995	New Friends Colony	new-friends-colony	area	17	28.5666000	77.2728000	t	f	2026-05-12 12:18:10.360023	2026-05-12 12:18:10.360023	global
996	Sarita Vihar	sarita-vihar	area	17	28.5285000	77.2909000	t	f	2026-05-12 12:18:10.621214	2026-05-12 12:18:10.621214	global
997	Okhla Vihar	okhla-vihar	area	17	28.5465000	77.2905000	t	f	2026-05-12 12:18:10.881165	2026-05-12 12:18:10.881165	global
998	Jasola	jasola	area	17	28.5400000	77.2900000	t	f	2026-05-12 12:18:11.142353	2026-05-12 12:18:11.142353	global
999	Madanpur Khadar	madanpur-khadar	area	17	28.5320000	77.3000000	t	f	2026-05-12 12:18:11.404494	2026-05-12 12:18:11.404494	global
1000	Badarpur	badarpur	area	17	28.4949000	77.3061000	t	f	2026-05-12 12:18:11.666771	2026-05-12 12:18:11.666771	global
1001	Lajpat Nagar-IV	lajpat-nagar-iv	area	17	28.5629000	77.2431000	t	f	2026-05-12 12:18:11.929792	2026-05-12 12:18:11.929792	global
1002	Maharani Bagh	maharani-bagh	area	17	28.5765000	77.2670000	t	f	2026-05-12 12:18:12.190661	2026-05-12 12:18:12.190661	global
1003	East Delhi	east-delhi	area	17	28.6237000	77.3056000	t	f	2026-05-12 12:18:12.454232	2026-05-12 12:18:12.454232	global
1004	Preet Vihar	preet-vihar	area	17	28.6452000	77.2960000	t	f	2026-05-12 12:18:12.714266	2026-05-12 12:18:12.714266	global
1005	Mayur Vihar (Phase 1, 2, 3)	mayur-vihar-phase-1-2-3	area	17	28.6089000	77.3045000	t	f	2026-05-12 12:18:12.979418	2026-05-12 12:18:12.979418	global
1006	Laxmi Nagar	laxmi-nagar	area	17	28.6333000	77.2750000	t	f	2026-05-12 12:18:13.239531	2026-05-12 12:18:13.239531	global
1007	Mandawali	mandawali	area	17	28.6230000	77.2800000	t	f	2026-05-12 12:18:13.498714	2026-05-12 12:18:13.498714	global
1008	Pandav Nagar	pandav-nagar	area	17	28.6200000	77.3000000	t	f	2026-05-12 12:18:13.760821	2026-05-12 12:18:13.760821	global
1009	Patparganj	patparganj	area	17	28.6280000	77.3010000	t	f	2026-05-12 12:18:14.036235	2026-05-12 12:18:14.036235	global
1010	Shahdara	shahdara	area	17	28.6737000	77.2894000	t	f	2026-05-12 12:18:14.297319	2026-05-12 12:18:14.297319	global
1011	Anand Vihar	anand-vihar	area	17	28.6520000	77.3150000	t	f	2026-05-12 12:18:14.557408	2026-05-12 12:18:14.557408	global
1012	Krishna Nagar	krishna-nagar	area	17	28.6500000	77.2833000	t	f	2026-05-12 12:18:14.818688	2026-05-12 12:18:14.818688	global
1013	Jagatpuri	jagatpuri	area	17	28.6465000	77.2918000	t	f	2026-05-12 12:18:15.079765	2026-05-12 12:18:15.079765	global
1014	Vivek Vihar	vivek-vihar	area	17	28.6716000	77.3158000	t	f	2026-05-12 12:18:15.340841	2026-05-12 12:18:15.340841	global
1015	Geeta Colony	geeta-colony	area	17	28.6498000	77.2695000	t	f	2026-05-12 12:18:15.611861	2026-05-12 12:18:15.611861	global
1016	Shakarpur	shakarpur	area	17	28.6310000	77.2780000	t	f	2026-05-12 12:18:15.885275	2026-05-12 12:18:15.885275	global
1017	Trilokpuri	trilokpuri	area	17	28.6139000	77.3178000	t	f	2026-05-12 12:18:16.14956	2026-05-12 12:18:16.14956	global
1018	Kalyanpuri	kalyanpuri	area	17	28.6206000	77.3178000	t	f	2026-05-12 12:18:16.413185	2026-05-12 12:18:16.413185	global
1019	Khichdipur	khichdipur	area	17	28.6265000	77.3303000	t	f	2026-05-12 12:18:16.673117	2026-05-12 12:18:16.673117	global
1020	North Delhi	north-delhi	area	17	28.7041000	77.1025000	t	f	2026-05-12 12:18:16.936389	2026-05-12 12:18:16.936389	global
1021	Model Town	model-town	area	17	28.7023000	77.1910000	t	f	2026-05-12 12:18:17.197437	2026-05-12 12:18:17.197437	global
1022	Timarpur	timarpur	area	17	28.7000000	77.2200000	t	f	2026-05-12 12:18:17.45772	2026-05-12 12:18:17.45772	global
1023	Burari	burari	area	17	28.7530000	77.2000000	t	f	2026-05-12 12:18:17.720626	2026-05-12 12:18:17.720626	global
1024	Mukherjee Nagar	mukherjee-nagar	area	17	28.7150000	77.2080000	t	f	2026-05-12 12:18:18.296311	2026-05-12 12:18:18.296311	global
1025	Wazirabad	wazirabad	area	17	28.6855000	77.2531000	t	f	2026-05-12 12:18:18.556344	2026-05-12 12:18:18.556344	global
1026	Shalimar Bagh	shalimar-bagh	area	17	28.7180000	77.1587000	t	f	2026-05-12 12:18:18.81871	2026-05-12 12:18:18.81871	global
1027	Ashok Vihar	ashok-vihar	area	17	28.6928000	77.1721000	t	f	2026-05-12 12:18:19.07975	2026-05-12 12:18:19.07975	global
1028	Majnu Ka Tila	majnu-ka-tila	area	17	28.7016000	77.2277000	t	f	2026-05-12 12:18:19.340597	2026-05-12 12:18:19.340597	global
1029	Azadpur	azadpur	area	17	28.7060000	77.1770000	t	f	2026-05-12 12:18:19.600678	2026-05-12 12:18:19.600678	global
1030	Pitampura (partly North/NW)	pitampura-partly-northnw	area	17	28.7030000	77.1320000	t	f	2026-05-12 12:18:19.860894	2026-05-12 12:18:19.860894	global
1031	North West Delhi	north-west-delhi	area	17	28.7041000	77.1025000	t	f	2026-05-12 12:18:20.120068	2026-05-12 12:18:20.120068	global
1032	Rohini (Sector 1–25)	rohini-sector-125	area	17	28.7340000	77.1080000	t	f	2026-05-12 12:18:20.386282	2026-05-12 12:18:20.386282	global
1033	Pitampura	pitampura	area	17	28.6956000	77.1316000	t	f	2026-05-12 12:18:20.652422	2026-05-12 12:18:20.652422	global
1034	Rithala	rithala	area	17	28.7200000	77.1000000	t	f	2026-05-12 12:18:20.917955	2026-05-12 12:18:20.917955	global
1035	Adarsh Nagar	adarsh-nagar	area	17	28.7215000	77.1723000	t	f	2026-05-12 12:18:21.179166	2026-05-12 12:18:21.179166	global
1036	Saraswati Vihar	saraswati-vihar	area	17	28.7020000	77.1320000	t	f	2026-05-12 12:18:21.439832	2026-05-12 12:18:21.439832	global
1037	Narela	narela	area	17	28.8584000	77.1006000	t	f	2026-05-12 12:18:21.700085	2026-05-12 12:18:21.700085	global
1038	Bawana	bawana	area	17	28.8040000	77.0340000	t	f	2026-05-12 12:18:21.962138	2026-05-12 12:18:21.962138	global
1039	Haiderpur	haiderpur	area	17	28.6980000	77.1640000	t	f	2026-05-12 12:18:22.223251	2026-05-12 12:18:22.223251	global
1040	Mangolpuri	mangolpuri	area	17	28.6896000	77.0897000	t	f	2026-05-12 12:18:22.487611	2026-05-12 12:18:22.487611	global
1041	Sultanpuri	sultanpuri	area	17	28.7030000	77.0780000	t	f	2026-05-12 12:18:22.749673	2026-05-12 12:18:22.749673	global
1042	West Delhi	west-delhi	area	17	28.6667000	77.1000000	t	f	2026-05-12 12:18:23.011866	2026-05-12 12:18:23.011866	global
1043	Rajouri Garden	rajouri-garden	area	17	28.6453000	77.1239000	t	f	2026-05-12 12:18:23.273312	2026-05-12 12:18:23.273312	global
1044	Tagore Garden	tagore-garden	area	17	28.6450000	77.1126000	t	f	2026-05-12 12:18:23.534152	2026-05-12 12:18:23.534152	global
1046	Uttam Nagar	uttam-nagar	area	17	28.6139000	77.0556000	t	f	2026-05-12 12:18:24.057377	2026-05-12 12:18:24.057377	global
1047	Vikas Puri	vikas-puri	area	17	28.6392000	77.0893000	t	f	2026-05-12 12:18:24.318416	2026-05-12 12:18:24.318416	global
1048	Punjabi Bagh	punjabi-bagh	area	17	28.6680000	77.1270000	t	f	2026-05-12 12:18:24.580742	2026-05-12 12:18:24.580742	global
1049	Paschim Vihar	paschim-vihar	area	17	28.6692000	77.1025000	t	f	2026-05-12 12:18:24.843756	2026-05-12 12:18:24.843756	global
1050	Kirti Nagar	kirti-nagar	area	17	28.6570000	77.1500000	t	f	2026-05-12 12:18:25.10384	2026-05-12 12:18:25.10384	global
1051	Moti Nagar	moti-nagar	area	17	28.6573000	77.1426000	t	f	2026-05-12 12:18:25.367073	2026-05-12 12:18:25.367073	global
1052	Patel Nagar (partially west)	patel-nagar-partially-west	area	17	28.6520000	77.1720000	t	f	2026-05-12 12:18:25.62739	2026-05-12 12:18:25.62739	global
1053	South West Delhi	south-west-delhi	area	17	28.5286000	77.0633000	t	f	2026-05-12 12:18:25.888244	2026-05-12 12:18:25.888244	global
1054	Dwarka (Sector 1–26)	dwarka-sector-126	area	17	28.5860000	77.0670000	t	f	2026-05-12 12:18:26.149358	2026-05-12 12:18:26.149358	global
1055	Palam	palam	area	17	28.6280000	77.0880000	t	f	2026-05-12 12:18:26.415636	2026-05-12 12:18:26.415636	global
1056	Mahavir Enclave	mahavir-enclave	area	17	28.6230000	77.0620000	t	f	2026-05-12 12:18:26.675999	2026-05-12 12:18:26.675999	global
1057	Sagarpur	sagarpur	area	17	28.6100000	77.0900000	t	f	2026-05-12 12:18:26.937957	2026-05-12 12:18:26.937957	global
1058	Najafgarh	najafgarh	area	17	28.6092000	76.9798000	t	f	2026-05-12 12:18:27.200125	2026-05-12 12:18:27.200125	global
1059	Bindapur	bindapur	area	17	28.6126000	77.0640000	t	f	2026-05-12 12:18:27.465443	2026-05-12 12:18:27.465443	global
1060	Delhi Cantonment (Cantt)	delhi-cantonment-cantt	area	17	28.5772000	77.1196000	t	f	2026-05-12 12:18:27.726502	2026-05-12 12:18:27.726502	global
1061	Kapashera	kapashera	area	17	28.5133000	77.0826000	t	f	2026-05-12 12:18:27.993889	2026-05-12 12:18:27.993889	global
1062	Bijwasan	bijwasan	area	17	28.5290000	77.0728000	t	f	2026-05-12 12:18:28.253794	2026-05-12 12:18:28.253794	global
1063	Chhawla	chhawla	area	17	28.5430000	77.0190000	t	f	2026-05-12 12:18:28.523035	2026-05-12 12:18:28.523035	global
1064	Uttam Nagar (partly SW)	uttam-nagar-partly-sw	area	17	28.6173000	77.0628000	t	f	2026-05-12 12:18:28.786474	2026-05-12 12:18:28.786474	global
1065	Shahdara District (East Delhi Side)	shahdara-district-east-delhi-side	area	17	28.6770000	77.2910000	t	f	2026-05-12 12:18:29.049496	2026-05-12 12:18:29.049496	global
1066	Seemapuri	seemapuri	area	17	28.6850000	77.3090000	t	f	2026-05-12 12:18:29.309578	2026-05-12 12:18:29.309578	global
1067	Dilshad Garden	dilshad-garden	area	17	28.6855000	77.3171000	t	f	2026-05-12 12:18:29.573788	2026-05-12 12:18:29.573788	global
1068	Jhilmil Colony	jhilmil-colony	area	17	28.6675000	77.3075000	t	f	2026-05-12 12:18:29.83595	2026-05-12 12:18:29.83595	global
1069	Welcome Colony	welcome-colony	area	17	28.6380000	77.2780000	t	f	2026-05-12 12:18:30.095896	2026-05-12 12:18:30.095896	global
1070	Babarpur	babarpur	area	17	28.6829000	77.2932000	t	f	2026-05-12 12:18:30.357125	2026-05-12 12:18:30.357125	global
1071	Maujpur	maujpur	area	17	28.6918000	77.2868000	t	f	2026-05-12 12:18:30.618176	2026-05-12 12:18:30.618176	global
1072	Kardampuri	kardampuri	area	17	28.6745000	77.2823000	t	f	2026-05-12 12:18:30.878389	2026-05-12 12:18:30.878389	global
1073	North East Delhi	north-east-delhi	area	17	28.7240000	77.2740000	t	f	2026-05-12 12:18:31.144568	2026-05-12 12:18:31.144568	global
1074	Seelampur	seelampur	area	17	28.6707000	77.2664000	t	f	2026-05-12 12:18:31.403623	2026-05-12 12:18:31.403623	global
1075	Jafrabad	jafrabad	area	17	28.6880000	77.2800000	t	f	2026-05-12 12:18:31.670859	2026-05-12 12:18:31.670859	global
1076	Mustafabad	mustafabad	area	17	28.7110000	77.2795000	t	f	2026-05-12 12:18:31.931013	2026-05-12 12:18:31.931013	global
1077	Brahampuri	brahampuri	area	17	28.6960000	77.2590000	t	f	2026-05-12 12:18:32.203346	2026-05-12 12:18:32.203346	global
1078	Kabir Nagar	kabir-nagar	area	17	28.6848000	77.3010000	t	f	2026-05-12 12:18:32.466579	2026-05-12 12:18:32.466579	global
1079	Chauhan Banger	chauhan-banger	area	17	28.6840000	77.2600000	t	f	2026-05-12 12:18:32.732908	2026-05-12 12:18:32.732908	global
1080	Gokalpuri	gokalpuri	area	17	28.6900000	77.2840000	t	f	2026-05-12 12:18:32.991867	2026-05-12 12:18:32.991867	global
1081	Bhajanpura	bhajanpura	area	17	28.6963000	77.2634000	t	f	2026-05-12 12:18:33.256223	2026-05-12 12:18:33.256223	global
1082	Shahbad Mohammadpur	shahbad-mohammadpur	area	17	28.5815000	77.0930000	t	f	2026-05-12 12:18:33.518101	2026-05-12 12:18:33.518101	global
1083	Ghitorni	ghitorni	area	17	28.4880000	77.1470000	t	f	2026-05-12 12:18:33.779404	2026-05-12 12:18:33.779404	global
1084	Rajokri	rajokri	area	17	28.5180000	77.1280000	t	f	2026-05-12 12:18:34.040501	2026-05-12 12:18:34.040501	global
1085	Kanjhawala	kanjhawala	area	17	28.7240000	77.0030000	t	f	2026-05-12 12:18:34.301588	2026-05-12 12:18:34.301588	global
1086	Siraspur	siraspur	area	17	28.7560000	77.1490000	t	f	2026-05-12 12:18:34.56269	2026-05-12 12:18:34.56269	global
1087	Barwala	barwala	area	17	28.7375000	77.0950000	t	f	2026-05-12 12:18:34.827069	2026-05-12 12:18:34.827069	global
1088	Pooth Khurd	pooth-khurd	area	17	28.7560000	77.1170000	t	f	2026-05-12 12:18:35.094101	2026-05-12 12:18:35.094101	global
1089	Daryapur	daryapur	area	17	28.6340000	77.2430000	t	f	2026-05-12 12:18:35.356419	2026-05-12 12:18:35.356419	global
1090	Narela Village	narela-village	area	17	28.8528000	77.0956000	t	f	2026-05-12 12:18:35.619531	2026-05-12 12:18:35.619531	global
1091	Burari Village	burari-village	area	17	28.7519000	77.2015000	t	f	2026-05-12 12:18:35.8858	2026-05-12 12:18:35.8858	global
1092	Jharoda Majra	jharoda-majra	area	17	28.6900000	77.0600000	t	f	2026-05-12 12:18:36.147118	2026-05-12 12:18:36.147118	global
1093	Aya Nagar	aya-nagar	area	17	28.4670000	77.1516000	t	f	2026-05-12 12:18:36.409061	2026-05-12 12:18:36.409061	global
1094	Jhatikra	jhatikra	area	17	28.6190000	76.9870000	t	f	2026-05-12 12:18:36.670432	2026-05-12 12:18:36.670432	global
1095	Faridabad City (Urban Areas)	faridabad-city-urban-areas	area	24	28.4089000	77.3178000	t	f	2026-05-12 12:18:36.934337	2026-05-12 12:18:36.934337	global
1096	Sector 1	sector-1	area	24	28.3750000	77.3200000	t	f	2026-05-12 12:18:37.194492	2026-05-12 12:18:37.194492	global
1097	Sector 2	sector-2	area	24	28.4232000	77.3164000	t	f	2026-05-12 12:18:37.462816	2026-05-12 12:18:37.462816	global
1098	Sector 3	sector-3	area	24	28.4170000	77.3178000	t	f	2026-05-12 12:18:37.722912	2026-05-12 12:18:37.722912	global
1099	Sector 4	sector-4	area	24	28.4645000	77.3002000	t	f	2026-05-12 12:18:37.982938	2026-05-12 12:18:37.982938	global
1100	Sector 7	sector-7	area	24	28.3949000	77.3178000	t	f	2026-05-12 12:18:38.246224	2026-05-12 12:18:38.246224	global
1101	Sector 8	sector-8	area	24	28.4100000	77.3200000	t	f	2026-05-12 12:18:38.506201	2026-05-12 12:18:38.506201	global
1102	Sector 9	sector-9	area	24	28.3907000	77.3199000	t	f	2026-05-12 12:18:38.769422	2026-05-12 12:18:38.769422	global
1103	Sector 10	sector-10	area	24	28.3920000	77.3040000	t	f	2026-05-12 12:18:39.030589	2026-05-12 12:18:39.030589	global
1104	Sector 11	sector-11	area	24	28.3972000	77.3149000	t	f	2026-05-12 12:18:39.290769	2026-05-12 12:18:39.290769	global
1105	Sector 12	sector-12	area	24	28.3670000	77.3350000	t	f	2026-05-12 12:18:39.549806	2026-05-12 12:18:39.549806	global
1106	Sector 14	sector-14	area	24	28.4085000	77.3178000	t	f	2026-05-12 12:18:39.813944	2026-05-12 12:18:39.813944	global
1107	Sector 15A	sector-15a	area	24	28.4086000	77.3178000	t	f	2026-05-12 12:18:40.078069	2026-05-12 12:18:40.078069	global
1108	Sector 16 / 16A	sector-16-16a	area	24	28.4075000	77.3148000	t	f	2026-05-12 12:18:40.349433	2026-05-12 12:18:40.349433	global
1109	Sector 17	sector-17	area	24	28.4140000	77.3175000	t	f	2026-05-12 12:18:40.611576	2026-05-12 12:18:40.611576	global
1110	Sector 18	sector-18	area	24	28.4230000	77.3150000	t	f	2026-05-12 12:18:40.872849	2026-05-12 12:18:40.872849	global
1111	Sector 19	sector-19	area	24	28.4115000	77.3178000	t	f	2026-05-12 12:18:41.131837	2026-05-12 12:18:41.131837	global
1112	Sector 20–21	sector-2021	area	24	28.4060000	77.3200000	t	f	2026-05-12 12:18:41.391887	2026-05-12 12:18:41.391887	global
1113	Sector 22	sector-22	area	24	28.4000000	77.3200000	t	f	2026-05-12 12:18:41.653043	2026-05-12 12:18:41.653043	global
1114	Sector 23	sector-23	area	24	28.4339000	77.3167000	t	f	2026-05-12 12:18:41.912158	2026-05-12 12:18:41.912158	global
1115	Sector 27–28	sector-2728	area	24	28.3950000	77.3200000	t	f	2026-05-12 12:18:42.171326	2026-05-12 12:18:42.171326	global
1116	Sector 29	sector-29	area	24	28.4580000	77.3206000	t	f	2026-05-12 12:18:42.432218	2026-05-12 12:18:42.432218	global
1117	Sector 30	sector-30	area	24	28.4570000	77.3120000	t	f	2026-05-12 12:18:42.696486	2026-05-12 12:18:42.696486	global
1118	Sector 31	sector-31	area	24	28.4440000	77.3215000	t	f	2026-05-12 12:18:42.956842	2026-05-12 12:18:42.956842	global
1119	Sector 32	sector-32	area	24	28.4325000	77.3246000	t	f	2026-05-12 12:18:43.223917	2026-05-12 12:18:43.223917	global
1120	Sector 33	sector-33	area	24	28.4365000	77.3300000	t	f	2026-05-12 12:18:43.486309	2026-05-12 12:18:43.486309	global
1121	Sector 34	sector-34	area	24	28.4350000	77.3250000	t	f	2026-05-12 12:18:43.746405	2026-05-12 12:18:43.746405	global
1122	Sector 37	sector-37	area	24	28.4140000	77.3200000	t	f	2026-05-12 12:18:44.006206	2026-05-12 12:18:44.006206	global
1123	Sector 39	sector-39	area	24	28.4465000	77.3150000	t	f	2026-05-12 12:18:44.275232	2026-05-12 12:18:44.275232	global
1124	Sector 41	sector-41	area	24	28.4520000	77.3010000	t	f	2026-05-12 12:18:44.53629	2026-05-12 12:18:44.53629	global
1125	Sector 42	sector-42	area	24	28.4550000	77.0720000	t	f	2026-05-12 12:18:44.798778	2026-05-12 12:18:44.798778	global
1126	Sector 43	sector-43	area	24	28.4795000	77.3243000	t	f	2026-05-12 12:18:45.057937	2026-05-12 12:18:45.057937	global
1127	Sector 45	sector-45	area	24	28.4275000	77.3414000	t	f	2026-05-12 12:18:45.325177	2026-05-12 12:18:45.325177	global
1128	Sector 46	sector-46	area	24	28.3949000	77.3250000	t	f	2026-05-12 12:18:45.586287	2026-05-12 12:18:45.586287	global
1129	Sector 48	sector-48	area	24	28.4260000	77.3470000	t	f	2026-05-12 12:18:45.848793	2026-05-12 12:18:45.848793	global
1130	Sector 49	sector-49	area	24	28.4200000	77.3400000	t	f	2026-05-12 12:18:46.110637	2026-05-12 12:18:46.110637	global
1131	Sector 55	sector-55	area	24	28.4310000	77.3340000	t	f	2026-05-12 12:18:46.37376	2026-05-12 12:18:46.37376	global
1132	Sector 58	sector-58	area	24	28.3949000	77.3249000	t	f	2026-05-12 12:18:46.634991	2026-05-12 12:18:46.634991	global
1133	Sector 59	sector-59	area	24	28.4100000	77.3500000	t	f	2026-05-12 12:18:46.896026	2026-05-12 12:18:46.896026	global
1134	Sector 62	sector-62	area	24	28.4080000	77.3610000	t	f	2026-05-12 12:18:47.157159	2026-05-12 12:18:47.157159	global
1135	Sector 64–65	sector-6465	area	24	28.4050000	77.3200000	t	f	2026-05-12 12:18:47.422388	2026-05-12 12:18:47.422388	global
1136	Sector 70–75	sector-7075	area	24	28.3810000	77.3200000	t	f	2026-05-12 12:18:47.681519	2026-05-12 12:18:47.681519	global
1137	Sector 81–85	sector-8185	area	24	28.4040000	77.3700000	t	f	2026-05-12 12:18:47.945662	2026-05-12 12:18:47.945662	global
1138	Sector 89–91	sector-8991	area	24	28.4100000	77.3500000	t	f	2026-05-12 12:18:48.207824	2026-05-12 12:18:48.207824	global
1139	NIT Faridabad	nit-faridabad	area	24	28.3900000	77.3200000	t	f	2026-05-12 12:18:48.471011	2026-05-12 12:18:48.471011	global
1140	Old Faridabad	old-faridabad	area	24	28.4032000	77.3154000	t	f	2026-05-12 12:18:48.731085	2026-05-12 12:18:48.731085	global
1141	New Industrial Township (NIT 1, 2, 3, 5)	new-industrial-township-nit-1-2-3-5	area	24	28.4232000	77.3140000	t	f	2026-05-12 12:18:48.991366	2026-05-12 12:18:48.991366	global
1142	Ballabhgarh	ballabhgarh	area	24	28.3300000	77.3200000	t	f	2026-05-12 12:18:49.254296	2026-05-12 12:18:49.254296	global
1143	Jawahar Colony	jawahar-colony	area	24	28.3699000	77.3045000	t	f	2026-05-12 12:18:49.513467	2026-05-12 12:18:49.513467	global
1144	Shiv Colony	shiv-colony	area	24	28.4100000	77.3200000	t	f	2026-05-12 12:18:49.777608	2026-05-12 12:18:49.777608	global
1145	Saran Nagar	saran-nagar	area	24	28.3975000	77.3077000	t	f	2026-05-12 12:18:50.037681	2026-05-12 12:18:50.037681	global
1146	SGM Nagar	sgm-nagar	area	24	28.4365000	77.3251000	t	f	2026-05-12 12:18:50.297925	2026-05-12 12:18:50.297925	global
1147	Sanjay Colony	sanjay-colony	area	24	28.4125000	77.3105000	t	f	2026-05-12 12:18:50.560968	2026-05-12 12:18:50.560968	global
1148	Sehatpur	sehatpur	area	24	28.4638000	77.3218000	t	f	2026-05-12 12:18:50.82217	2026-05-12 12:18:50.82217	global
1149	Surajkund	surajkund	area	24	28.4790000	77.3036000	t	f	2026-05-12 12:18:51.082261	2026-05-12 12:18:51.082261	global
1150	Tughlakabad Border Area	tughlakabad-border-area	area	24	28.5040000	77.3130000	t	f	2026-05-12 12:18:51.342396	2026-05-12 12:18:51.342396	global
1151	Ankhir	ankhir	area	24	28.4089000	77.3178000	t	f	2026-05-12 12:18:51.603417	2026-05-12 12:18:51.603417	global
1152	Green Field Colony	green-field-colony	area	24	28.3950000	77.3150000	t	f	2026-05-12 12:18:51.867671	2026-05-12 12:18:51.867671	global
1153	Ashoka Enclave	ashoka-enclave	area	24	28.4540000	77.3030000	t	f	2026-05-12 12:18:52.132817	2026-05-12 12:18:52.132817	global
1154	Charmswood Village	charmswood-village	area	24	28.4087000	77.3178000	t	f	2026-05-12 12:18:52.400173	2026-05-12 12:18:52.400173	global
1155	Friends Colony	friends-colony	area	24	28.4600000	77.3200000	t	f	2026-05-12 12:18:52.659512	2026-05-12 12:18:52.659512	global
1156	Kail Gaon	kail-gaon	area	24	28.3520000	77.3178000	t	f	2026-05-12 12:18:52.938775	2026-05-12 12:18:52.938775	global
1157	Greater Faridabad (Neharpar)	greater-faridabad-neharpar	area	24	28.3530000	77.3400000	t	f	2026-05-12 12:18:53.210212	2026-05-12 12:18:53.210212	global
1158	Charmwood Village	charmwood-village	area	24	28.4615000	77.3159000	t	f	2026-05-12 12:18:53.472375	2026-05-12 12:18:53.472375	global
1159	Sector-21D Pocket Area	sector-21d-pocket-area	area	24	28.3580000	77.3150000	t	f	2026-05-12 12:18:53.732473	2026-05-12 12:18:53.732473	global
1160	Sector-15 Market Area	sector-15-market-area	area	24	28.4068000	77.3165000	t	f	2026-05-12 12:18:53.997699	2026-05-12 12:18:53.997699	global
1161	Greater Faridabad (Neharpar Zone)	greater-faridabad-neharpar-zone	area	24	28.3380000	77.3018000	t	f	2026-05-12 12:18:54.262881	2026-05-12 12:18:54.262881	global
1162	BPTP Parklands	bptp-parklands	area	24	28.4060000	77.3540000	t	f	2026-05-12 12:18:54.524949	2026-05-12 12:18:54.524949	global
1163	Omaxe Heights	omaxe-heights	area	24	28.3975000	77.3199000	t	f	2026-05-12 12:18:54.788241	2026-05-12 12:18:54.788241	global
1164	Puri Pranayam	puri-pranayam	area	24	28.4217000	77.3178000	t	f	2026-05-12 12:18:55.050353	2026-05-12 12:18:55.050353	global
1165	Puri Amanvilas	puri-amanvilas	area	24	28.4080000	77.3130000	t	f	2026-05-12 12:18:55.31981	2026-05-12 12:18:55.31981	global
1166	SRS City	srs-city	area	24	28.4089000	77.3109000	t	f	2026-05-12 12:18:55.579767	2026-05-12 12:18:55.579767	global
1167	SRS Residency	srs-residency	area	24	28.4080000	77.3170000	t	f	2026-05-12 12:18:55.846167	2026-05-12 12:18:55.846167	global
1168	SRS Royal Hills	srs-royal-hills	area	24	28.4180000	77.3010000	t	f	2026-05-12 12:18:56.107062	2026-05-12 12:18:56.107062	global
1169	RPS Palms	rps-palms	area	24	28.4120000	77.3165000	t	f	2026-05-12 12:18:56.367271	2026-05-12 12:18:56.367271	global
1170	RPS Savana	rps-savana	area	24	28.4000000	77.3000000	t	f	2026-05-12 12:18:56.631401	2026-05-12 12:18:56.631401	global
1171	Omaxe World Street Area	omaxe-world-street-area	area	24	28.3870000	77.3160000	t	f	2026-05-12 12:18:56.893879	2026-05-12 12:18:56.893879	global
1172	BPTP Elite Floors	bptp-elite-floors	area	24	28.4315000	77.3239000	t	f	2026-05-12 12:18:57.155812	2026-05-12 12:18:57.155812	global
1173	KLJ Greens	klj-greens	area	24	28.3886000	77.3134000	t	f	2026-05-12 12:18:57.416023	2026-05-12 12:18:57.416023	global
1174	Riwaz Plaza Area	riwaz-plaza-area	area	24	28.3800000	77.3000000	t	f	2026-05-12 12:18:57.676012	2026-05-12 12:18:57.676012	global
1175	Ballabhgarh Region	ballabhgarh-region	area	24	28.3363000	77.3410000	t	f	2026-05-12 12:18:57.937006	2026-05-12 12:18:57.937006	global
1176	Ballabhgarh Old City	ballabhgarh-old-city	area	24	28.3300000	77.3400000	t	f	2026-05-12 12:18:58.197167	2026-05-12 12:18:58.197167	global
1177	Ballabgarh Market	ballabgarh-market	area	24	28.3442000	77.3178000	t	f	2026-05-12 12:18:58.459249	2026-05-12 12:18:58.459249	global
1178	Chawla Colony	chawla-colony	area	24	28.3830000	77.3000000	t	f	2026-05-12 12:18:58.71945	2026-05-12 12:18:58.71945	global
1179	Milk Plant Road Area	milk-plant-road-area	area	24	28.3830000	77.3160000	t	f	2026-05-12 12:18:58.984871	2026-05-12 12:18:58.984871	global
1180	Tigaon Road	tigaon-road	area	24	28.4267000	77.3167000	t	f	2026-05-12 12:18:59.249868	2026-05-12 12:18:59.249868	global
1181	Bharat Colony	bharat-colony	area	24	28.3820000	77.2970000	t	f	2026-05-12 12:18:59.510878	2026-05-12 12:18:59.510878	global
1182	Bhikam Colony	bhikam-colony	area	24	28.3930000	77.3100000	t	f	2026-05-12 12:18:59.773479	2026-05-12 12:18:59.773479	global
1183	Chhainsa Road Area	chhainsa-road-area	area	24	28.3600000	77.3500000	t	f	2026-05-12 12:19:00.035245	2026-05-12 12:19:00.035245	global
1184	Mujesar	mujesar	area	24	28.3895000	77.3130000	t	f	2026-05-12 12:19:00.296334	2026-05-12 12:19:00.296334	global
1185	Ajronda	ajronda	area	24	28.4217000	77.3245000	t	f	2026-05-12 12:19:00.556566	2026-05-12 12:19:00.556566	global
1186	Miladpur	miladpur	area	24	28.4085000	77.3178000	t	f	2026-05-12 12:19:00.819696	2026-05-12 12:19:00.819696	global
1187	Sikri	sikri	area	24	28.3600000	77.3100000	t	f	2026-05-12 12:19:01.079934	2026-05-12 12:19:01.079934	global
1188	Chandpur	chandpur	area	24	28.4082000	77.3100000	t	f	2026-05-12 12:19:01.343981	2026-05-12 12:19:01.343981	global
1189	Sector-3 Ballabhgarh Belt	sector-3-ballabhgarh-belt	area	24	28.3300000	77.3400000	t	f	2026-05-12 12:19:01.606147	2026-05-12 12:19:01.606147	global
1190	Industrial Areas	industrial-areas	area	24	28.4089000	77.3178000	t	f	2026-05-12 12:19:01.867291	2026-05-12 12:19:01.867291	global
1191	Sector 24 Industrial Area	sector-24-industrial-area	area	24	28.4110000	77.3070000	t	f	2026-05-12 12:19:02.1305	2026-05-12 12:19:02.1305	global
1192	Sector 25 Industrial Area	sector-25-industrial-area	area	24	28.4110000	77.3070000	t	f	2026-05-12 12:19:02.394661	2026-05-12 12:19:02.394661	global
1193	Sector 6 Industrial Area	sector-6-industrial-area	area	24	28.4065000	77.3178000	t	f	2026-05-12 12:19:02.653738	2026-05-12 12:19:02.653738	global
1194	Sector 58–59 Industrial Belt	sector-5859-industrial-belt	area	24	28.4245000	77.3396000	t	f	2026-05-12 12:19:02.914811	2026-05-12 12:19:02.914811	global
1195	MSME Industrial Estate	msme-industrial-estate	area	24	28.4045000	77.3150000	t	f	2026-05-12 12:19:03.176047	2026-05-12 12:19:03.176047	global
1196	DLF Industrial Area	dlf-industrial-area	area	24	28.4040000	77.3230000	t	f	2026-05-12 12:19:03.43734	2026-05-12 12:19:03.43734	global
1197	Mathura Road Industrial Belt (NH-19)	mathura-road-industrial-belt-nh-19	area	24	28.3515000	77.3066000	t	f	2026-05-12 12:19:03.696152	2026-05-12 12:19:03.696152	global
1198	Villages / Urbanizing Villages	villages-urbanizing-villages	area	24	28.4089000	77.3178000	t	f	2026-05-12 12:19:03.958795	2026-05-12 12:19:03.958795	global
1199	Mewla Maharajpur	mewla-maharajpur	area	24	28.3770000	77.3110000	t	f	2026-05-12 12:19:04.221148	2026-05-12 12:19:04.221148	global
1200	Tilpat	tilpat	area	24	28.3920000	77.3360000	t	f	2026-05-12 12:19:04.481616	2026-05-12 12:19:04.481616	global
1201	Khori	khori	area	24	28.4244000	77.2910000	t	f	2026-05-12 12:19:04.74177	2026-05-12 12:19:04.74177	global
1202	Pali	pali	area	24	28.4010000	77.3170000	t	f	2026-05-12 12:19:05.003878	2026-05-12 12:19:05.003878	global
1203	Mangar	mangar	area	24	28.4480000	77.1720000	t	f	2026-05-12 12:19:05.264987	2026-05-12 12:19:05.264987	global
1204	Badkhal	badkhal	area	24	28.4342000	77.3028000	t	f	2026-05-12 12:19:05.525054	2026-05-12 12:19:05.525054	global
1205	Mohna	mohna	area	24	28.2860000	77.3170000	t	f	2026-05-12 12:19:05.791389	2026-05-12 12:19:05.791389	global
1206	Tigaon	tigaon	area	24	28.3712000	77.3222000	t	f	2026-05-12 12:19:06.051442	2026-05-12 12:19:06.051442	global
1207	Chandawali	chandawali	area	24	28.4150000	77.3500000	t	f	2026-05-12 12:19:06.316857	2026-05-12 12:19:06.316857	global
1208	Rajpur Kalan	rajpur-kalan	area	24	28.4025000	77.3106000	t	f	2026-05-12 12:19:06.578786	2026-05-12 12:19:06.578786	global
1209	Chhainsa	chhainsa	area	24	28.3450000	77.3170000	t	f	2026-05-12 12:19:06.842916	2026-05-12 12:19:06.842916	global
1210	Bhainsrawali	bhainsrawali	area	24	28.3845000	77.4007000	t	f	2026-05-12 12:19:07.108196	2026-05-12 12:19:07.108196	global
1211	Sirohi	sirohi	area	24	28.4000000	77.3000000	t	f	2026-05-12 12:19:07.371448	2026-05-12 12:19:07.371448	global
1212	Neemka	neemka	area	24	28.3310000	77.3950000	t	f	2026-05-12 12:19:07.63306	2026-05-12 12:19:07.63306	global
1213	Sadpura	sadpura	area	24	28.3894000	77.3028000	t	f	2026-05-12 12:19:07.895689	2026-05-12 12:19:07.895689	global
1214	Fatehpur Tagga	fatehpur-tagga	area	24	28.3150000	77.3870000	t	f	2026-05-12 12:19:08.156881	2026-05-12 12:19:08.156881	global
1215	Asaoti	asaoti	area	24	28.3070000	77.3350000	t	f	2026-05-12 12:19:08.417132	2026-05-12 12:19:08.417132	global
1216	Piyala	piyala	area	24	28.3230000	77.3900000	t	f	2026-05-12 12:19:08.682104	2026-05-12 12:19:08.682104	global
1217	Nachaoli	nachaoli	area	24	28.3970000	77.3200000	t	f	2026-05-12 12:19:08.942187	2026-05-12 12:19:08.942187	global
1218	Shalimar Garden (Main / Ext-1 / Ext-2)	shalimar-garden-main-ext-1-ext-2	area	16	28.6769000	77.3210000	t	f	2026-05-12 12:19:09.202267	2026-05-12 12:19:09.202267	global
1219	Chander Nagar	chander-nagar	area	16	28.6765000	77.3045000	t	f	2026-05-12 12:19:09.463491	2026-05-12 12:19:09.463491	global
1220	Ramprastha	ramprastha	area	16	28.6680000	77.3410000	t	f	2026-05-12 12:19:09.725595	2026-05-12 12:19:09.725595	global
1221	Niti Khand 1 / 2 / 3	niti-khand-1-2-3	area	16	28.6410000	77.3555000	t	f	2026-05-12 12:19:09.984579	2026-05-12 12:19:09.984579	global
1222	Nyay Khand 1 / 2	nyay-khand-1-2	area	16	28.6670000	77.4110000	t	f	2026-05-12 12:19:10.243816	2026-05-12 12:19:10.243816	global
1223	Gyan Khand 1 / 2 / 3 / 4	gyan-khand-1-2-3-4	area	16	28.6350000	77.3640000	t	f	2026-05-12 12:19:10.511033	2026-05-12 12:19:10.511033	global
1224	Abhay Khand 1 / 2 / 3 / 4	abhay-khand-1-2-3-4	area	16	28.6408000	77.3688000	t	f	2026-05-12 12:19:10.774264	2026-05-12 12:19:10.774264	global
1225	Ahinsa Khand 1 / 2	ahinsa-khand-1-2	area	16	28.6356000	77.3697000	t	f	2026-05-12 12:19:11.036284	2026-05-12 12:19:11.036284	global
1226	Shipra Sun City	shipra-sun-city	area	16	28.6370000	77.3830000	t	f	2026-05-12 12:19:11.296443	2026-05-12 12:19:11.296443	global
1227	Khora Colony	khora-colony	area	16	28.7041000	77.3610000	t	f	2026-05-12 12:19:11.55758	2026-05-12 12:19:11.55758	global
1228	Maharajpur	maharajpur	area	16	28.6720000	77.4540000	t	f	2026-05-12 12:19:11.816872	2026-05-12 12:19:11.816872	global
1229	Arthala	arthala	area	16	28.6647000	77.3472000	t	f	2026-05-12 12:19:12.078764	2026-05-12 12:19:12.078764	global
1230	Ghaziabad City	ghaziabad-city	area	16	28.6692000	77.4538000	t	f	2026-05-12 12:19:12.340943	2026-05-12 12:19:12.340943	global
1231	Raj Nagar	raj-nagar	area	16	28.6820000	77.4458000	t	f	2026-05-12 12:19:12.616474	2026-05-12 12:19:12.616474	global
1232	Nehru Nagar	nehru-nagar	area	16	28.6632000	77.4385000	t	f	2026-05-12 12:19:12.892975	2026-05-12 12:19:12.892975	global
1233	Navyug Market Area	navyug-market-area	area	16	28.6696000	77.4380000	t	f	2026-05-12 12:19:13.155073	2026-05-12 12:19:13.155073	global
1234	Maliwara	maliwara	area	16	28.6600000	77.4370000	t	f	2026-05-12 12:19:13.420261	2026-05-12 12:19:13.420261	global
1235	Purana Bus Adda Area	purana-bus-adda-area	area	16	28.6727000	77.4337000	t	f	2026-05-12 12:19:13.690635	2026-05-12 12:19:13.690635	global
1236	Ambedkar Road Area	ambedkar-road-area	area	16	28.6706000	77.4376000	t	f	2026-05-12 12:19:13.959952	2026-05-12 12:19:13.959952	global
1237	Lohia Nagar	lohia-nagar	area	16	28.6698000	77.4535000	t	f	2026-05-12 12:19:14.222135	2026-05-12 12:19:14.222135	global
1238	Vijay Nagar Sector 9–12	vijay-nagar-sector-912	area	16	28.6736000	77.4329000	t	f	2026-05-12 12:19:14.48945	2026-05-12 12:19:14.48945	global
1239	Delhi Gate Area	delhi-gate-area	area	16	28.6640000	77.4380000	t	f	2026-05-12 12:19:14.752707	2026-05-12 12:19:14.752707	global
1240	Crossings Republik & Nearby Zones	crossings-republik-nearby-zones	area	16	28.6550000	77.4360000	t	f	2026-05-12 12:19:15.012582	2026-05-12 12:19:15.012582	global
1241	Crossings Republik Township	crossings-republik-township	area	16	28.6380000	77.4900000	t	f	2026-05-12 12:19:15.284977	2026-05-12 12:19:15.284977	global
1242	Gaur City 1	gaur-city-1	area	16	28.6140000	77.4360000	t	f	2026-05-12 12:19:15.545054	2026-05-12 12:19:15.545054	global
1243	Gaur City 2	gaur-city-2	area	16	28.6200000	77.4300000	t	f	2026-05-12 12:19:15.807208	2026-05-12 12:19:15.807208	global
1244	Noida Extension Border Area	noida-extension-border-area	area	16	28.6010000	77.4350000	t	f	2026-05-12 12:19:16.069375	2026-05-12 12:19:16.069375	global
1245	Shahberi	shahberi	area	16	28.6260000	77.5070000	t	f	2026-05-12 12:19:16.330567	2026-05-12 12:19:16.330567	global
1246	Dundahera	dundahera	area	16	28.6380000	77.4500000	t	f	2026-05-12 12:19:16.590771	2026-05-12 12:19:16.590771	global
1247	Roza Jalalpur	roza-jalalpur	area	16	28.6698000	77.4538000	t	f	2026-05-12 12:19:16.855779	2026-05-12 12:19:16.855779	global
1248	Hindon Area	hindon-area	area	16	28.6730000	77.3735000	t	f	2026-05-12 12:19:17.116939	2026-05-12 12:19:17.116939	global
1249	ITS College Area	its-college-area	area	16	28.6536000	77.4333000	t	f	2026-05-12 12:19:17.379954	2026-05-12 12:19:17.379954	global
1250	Rajendra Nagar Industrial Belt	rajendra-nagar-industrial-belt	area	16	28.6640000	77.4325000	t	f	2026-05-12 12:19:17.641333	2026-05-12 12:19:17.641333	global
1251	Loni	loni	area	16	28.7500000	77.2900000	t	f	2026-05-12 12:19:17.902786	2026-05-12 12:19:17.902786	global
1252	Loni Border	loni-border	area	16	28.6940000	77.2900000	t	f	2026-05-12 12:19:18.164691	2026-05-12 12:19:18.164691	global
1253	Loni Dehat	loni-dehat	area	16	28.7460000	77.2900000	t	f	2026-05-12 12:19:18.426987	2026-05-12 12:19:18.426987	global
1254	Tronica City	tronica-city	area	16	28.6635000	77.4008000	t	f	2026-05-12 12:19:18.704228	2026-05-12 12:19:18.704228	global
1255	Tahirpur	tahirpur	area	16	28.6368000	77.4575000	t	f	2026-05-12 12:19:18.964383	2026-05-12 12:19:18.964383	global
1256	Indralok Colony	indralok-colony	area	16	28.6695000	77.4605000	t	f	2026-05-12 12:19:19.229588	2026-05-12 12:19:19.229588	global
1257	Krishna Vihar	krishna-vihar	area	16	28.6650000	77.4410000	t	f	2026-05-12 12:19:19.49201	2026-05-12 12:19:19.49201	global
1258	Shankar Vihar	shankar-vihar	area	16	28.6165000	77.1225000	t	f	2026-05-12 12:19:19.754086	2026-05-12 12:19:19.754086	global
1259	Jawahar Nagar	jawahar-nagar	area	16	28.6696000	77.4538000	t	f	2026-05-12 12:19:20.014121	2026-05-12 12:19:20.014121	global
1260	Subhash Nagar (Loni)	subhash-nagar-loni	area	16	28.7465000	77.2908000	t	f	2026-05-12 12:19:20.273143	2026-05-12 12:19:20.273143	global
1261	Sarai Meer	sarai-meer	area	16	28.6692000	77.4538000	t	f	2026-05-12 12:19:20.536209	2026-05-12 12:19:20.536209	global
1262	Banthla	banthla	area	16	28.6500000	77.4500000	t	f	2026-05-12 12:19:20.799581	2026-05-12 12:19:20.799581	global
1263	Mandola	mandola	area	16	28.8130000	77.7160000	t	f	2026-05-12 12:19:21.060549	2026-05-12 12:19:21.060549	global
1264	Behta Hajipur	behta-hajipur	area	16	28.6836000	77.4190000	t	f	2026-05-12 12:19:21.321042	2026-05-12 12:19:21.321042	global
1265	Modinagar	modinagar	area	16	28.8370000	77.5800000	t	f	2026-05-12 12:19:21.581909	2026-05-12 12:19:21.581909	global
1266	Modi Nagar Industrial Area	modi-nagar-industrial-area	area	16	28.8667000	77.5667000	t	f	2026-05-12 12:19:21.85179	2026-05-12 12:19:21.85179	global
1267	Ghantaghar Area	ghantaghar-area	area	16	28.6700000	77.4330000	t	f	2026-05-12 12:19:22.113292	2026-05-12 12:19:22.113292	global
1268	Begmabad	begmabad	area	16	28.7740000	77.6120000	t	f	2026-05-12 12:19:22.374466	2026-05-12 12:19:22.374466	global
1269	Niwari	niwari	area	16	28.7350000	77.5050000	t	f	2026-05-12 12:19:22.635445	2026-05-12 12:19:22.635445	global
1270	Bhojpur	bhojpur	area	16	28.6780000	77.4500000	t	f	2026-05-12 12:19:22.901699	2026-05-12 12:19:22.901699	global
1271	Dhaulana Road Localities	dhaulana-road-localities	area	16	28.6792000	77.6628000	t	f	2026-05-12 12:19:23.163868	2026-05-12 12:19:23.163868	global
1272	Muradnagar	muradnagar	area	16	28.7800000	77.5000000	t	f	2026-05-12 12:19:23.424992	2026-05-12 12:19:23.424992	global
1273	DLF Ankur Vihar	dlf-ankur-vihar	area	16	28.7140000	77.3000000	t	f	2026-05-12 12:19:23.688187	2026-05-12 12:19:23.688187	global
1274	Sanjay Nagar	sanjay-nagar	area	16	28.6870000	77.4532000	t	f	2026-05-12 12:19:23.950328	2026-05-12 12:19:23.950328	global
1275	Dasna Road Area	dasna-road-area	area	16	28.6667000	77.5000000	t	f	2026-05-12 12:19:24.214505	2026-05-12 12:19:24.214505	global
1276	Duhai	duhai	area	16	28.7020000	77.4330000	t	f	2026-05-12 12:19:24.479766	2026-05-12 12:19:24.479766	global
1277	Farooq Nagar	farooq-nagar	area	16	28.6340000	77.4530000	t	f	2026-05-12 12:19:24.744049	2026-05-12 12:19:24.744049	global
1278	Ratanpur	ratanpur	area	16	28.6667000	77.4333000	t	f	2026-05-12 12:19:25.018488	2026-05-12 12:19:25.018488	global
1279	Akbarpur–Behta	akbarpurbehta	area	16	28.6300000	77.4300000	t	f	2026-05-12 12:19:25.283631	2026-05-12 12:19:25.283631	global
1280	Vijay City	vijay-city	area	16	28.6680000	77.4530000	t	f	2026-05-12 12:19:25.543669	2026-05-12 12:19:25.543669	global
1281	Adhyatmik Nagar	adhyatmik-nagar	area	16	28.6700000	77.4500000	t	f	2026-05-12 12:19:25.804822	2026-05-12 12:19:25.804822	global
1282	Abupur	abupur	area	16	28.6880000	77.4280000	t	f	2026-05-12 12:19:26.068101	2026-05-12 12:19:26.068101	global
1283	Sihani Gate	sihani-gate	area	16	28.6635000	77.4311000	t	f	2026-05-12 12:19:26.332182	2026-05-12 12:19:26.332182	global
1284	Morta Village Area	morta-village-area	area	16	28.6550000	77.4530000	t	f	2026-05-12 12:19:26.592945	2026-05-12 12:19:26.592945	global
1285	Hapur Road Localities	hapur-road-localities	area	16	28.6692000	77.4538000	t	f	2026-05-12 12:19:26.856213	2026-05-12 12:19:26.856213	global
1286	Mussoorie Gulavathi Road Belt	mussoorie-gulavathi-road-belt	area	16	28.6692000	77.4538000	t	f	2026-05-12 12:19:27.117296	2026-05-12 12:19:27.117296	global
1287	Morta	morta	area	16	28.6695000	77.4528000	t	f	2026-05-12 12:19:27.380492	2026-05-12 12:19:27.380492	global
1288	Ator Nangla	ator-nangla	area	16	28.6690000	77.4530000	t	f	2026-05-12 12:19:27.64271	2026-05-12 12:19:27.64271	global
1289	Farid Nagar	farid-nagar	area	16	28.6709000	77.4230000	t	f	2026-05-12 12:19:27.901686	2026-05-12 12:19:27.901686	global
1290	Sadullapur	sadullapur	area	16	28.6706000	77.4538000	t	f	2026-05-12 12:19:28.163841	2026-05-12 12:19:28.163841	global
1291	Sikrod	sikrod	area	16	28.7035000	77.4785000	t	f	2026-05-12 12:19:28.426067	2026-05-12 12:19:28.426067	global
1292	Nistoli	nistoli	area	16	28.6650000	77.4630000	t	f	2026-05-12 12:19:28.689513	2026-05-12 12:19:28.689513	global
1293	Ator Nagla	ator-nagla	area	16	28.6698000	77.4535000	t	f	2026-05-12 12:19:28.952322	2026-05-12 12:19:28.952322	global
1294	Pantwari	pantwari	area	16	28.6690000	77.4539000	t	f	2026-05-12 12:19:29.215465	2026-05-12 12:19:29.215465	global
1295	Nagla	nagla	area	16	28.6692000	77.4538000	t	f	2026-05-12 12:19:29.477679	2026-05-12 12:19:29.477679	global
1296	Basantpur Saina	basantpur-saina	area	16	28.6865000	77.4928000	t	f	2026-05-12 12:19:29.736944	2026-05-12 12:19:29.736944	global
1297	Bhanera	bhanera	area	16	28.6690000	77.4535000	t	f	2026-05-12 12:19:30.002025	2026-05-12 12:19:30.002025	global
1298	Fazalpur	fazalpur	area	16	28.6916000	77.4380000	t	f	2026-05-12 12:19:30.263376	2026-05-12 12:19:30.263376	global
1299	Tigri	tigri	area	16	28.6516000	77.3630000	t	f	2026-05-12 12:19:30.52629	2026-05-12 12:19:30.52629	global
1300	Surana	surana	area	16	28.6690000	77.4538000	t	f	2026-05-12 12:19:30.787408	2026-05-12 12:19:30.787408	global
1301	Madhuban Bapudham Area villages	madhuban-bapudham-area-villages	area	16	28.6758000	77.4499000	t	f	2026-05-12 12:19:31.051536	2026-05-12 12:19:31.051536	global
1302	Ghazipur City	ghazipur-city	area	25	25.5870000	83.5850000	t	f	2026-05-12 12:19:31.313291	2026-05-12 12:19:31.313291	global
1303	Mahua Bagh	mahua-bagh	area	25	25.5796000	83.5932000	t	f	2026-05-12 12:19:31.578967	2026-05-12 12:19:31.578967	global
1304	Moti Bagh	moti-bagh	area	25	25.5768000	83.5852000	t	f	2026-05-12 12:19:31.840076	2026-05-12 12:19:31.840076	global
1305	Naubatpur	naubatpur	area	25	25.5800000	83.5800000	t	f	2026-05-12 12:19:32.102209	2026-05-12 12:19:32.102209	global
1306	Sikanderpur	sikanderpur	area	25	25.5840000	83.5810000	t	f	2026-05-12 12:19:32.369529	2026-05-12 12:19:32.369529	global
1307	Maqbool Alam Road	maqbool-alam-road	area	25	25.5845000	83.5853000	t	f	2026-05-12 12:19:32.632813	2026-05-12 12:19:32.632813	global
1308	Lanka	lanka	area	25	25.5833000	83.5853000	t	f	2026-05-12 12:19:32.893786	2026-05-12 12:19:32.893786	global
1309	Bisheshwar Ganj	bisheshwar-ganj	area	25	25.5833000	83.5850000	t	f	2026-05-12 12:19:33.170383	2026-05-12 12:19:33.170383	global
1310	Rauza	rauza	area	25	25.5830000	83.5850000	t	f	2026-05-12 12:19:33.435854	2026-05-12 12:19:33.435854	global
1311	Muhammadabad Road Belt	muhammadabad-road-belt	area	25	25.5823000	83.6018000	t	f	2026-05-12 12:19:33.696123	2026-05-12 12:19:33.696123	global
1312	Bundu Katra	bundu-katra	area	25	25.5859000	83.5853000	t	f	2026-05-12 12:19:33.958229	2026-05-12 12:19:33.958229	global
1313	Reti Patti	reti-patti	area	25	25.5830000	83.5850000	t	f	2026-05-12 12:19:34.218267	2026-05-12 12:19:34.218267	global
1314	Sadar Area	sadar-area	area	25	25.5913000	83.5858000	t	f	2026-05-12 12:19:34.478386	2026-05-12 12:19:34.478386	global
1315	Major Towns	major-towns	area	25	25.5841000	83.5781000	t	f	2026-05-12 12:19:34.737478	2026-05-12 12:19:34.737478	global
1316	Muhammadabad	muhammadabad	area	25	25.6167000	83.7583000	t	f	2026-05-12 12:19:34.998659	2026-05-12 12:19:34.998659	global
1317	Saidpur	saidpur	area	25	25.5850000	83.5890000	t	f	2026-05-12 12:19:35.257788	2026-05-12 12:19:35.257788	global
1318	Zamania	zamania	area	25	25.4190000	83.5810000	t	f	2026-05-12 12:19:35.516818	2026-05-12 12:19:35.516818	global
1319	Jangipur	jangipur	area	25	25.3276000	83.2591000	t	f	2026-05-12 12:19:35.784071	2026-05-12 12:19:35.784071	global
1320	Dildarnagar	dildarnagar	area	25	25.3260000	83.7655000	t	f	2026-05-12 12:19:36.047282	2026-05-12 12:19:36.047282	global
1321	Fatehpur Madaun	fatehpur-madaun	area	25	25.5850000	83.5900000	t	f	2026-05-12 12:19:36.30679	2026-05-12 12:19:36.30679	global
1322	Seorai / Saiyad Rai	seorai-saiyad-rai	area	25	25.6320000	83.5990000	t	f	2026-05-12 12:19:36.567515	2026-05-12 12:19:36.567515	global
1323	Jakhania	jakhania	area	25	25.6900000	83.2310000	t	f	2026-05-12 12:19:36.828734	2026-05-12 12:19:36.828734	global
1324	Kasimabad	kasimabad	area	25	25.5940000	83.5920000	t	f	2026-05-12 12:19:37.090623	2026-05-12 12:19:37.090623	global
1325	Reotipur	reotipur	area	25	25.5520000	83.7120000	t	f	2026-05-12 12:19:37.351812	2026-05-12 12:19:37.351812	global
1326	Karimuddinpur	karimuddinpur	area	25	25.5678000	83.8654000	t	f	2026-05-12 12:19:37.61499	2026-05-12 12:19:37.61499	global
1327	Yusufpur	yusufpur	area	25	25.7000000	83.6000000	t	f	2026-05-12 12:19:37.880283	2026-05-12 12:19:37.880283	global
1328	Manihari	manihari	area	25	25.5770000	83.5840000	t	f	2026-05-12 12:19:38.148481	2026-05-12 12:19:38.148481	global
1329	Mardah	mardah	area	25	25.6180000	83.7590000	t	f	2026-05-12 12:19:38.410555	2026-05-12 12:19:38.410555	global
1330	Rehrari	rehrari	area	25	25.5667000	83.5856000	t	f	2026-05-12 12:19:38.672913	2026-05-12 12:19:38.672913	global
1331	Mohammadabad Block	mohammadabad-block	area	25	25.5920000	83.5765000	t	f	2026-05-12 12:19:38.937007	2026-05-12 12:19:38.937007	global
1332	Kamsar	kamsar	area	25	25.5608000	83.5813000	t	f	2026-05-12 12:19:39.201314	2026-05-12 12:19:39.201314	global
1333	Sadar Kot	sadar-kot	area	25	25.5840000	83.5870000	t	f	2026-05-12 12:19:39.463289	2026-05-12 12:19:39.463289	global
1334	Mahewa	mahewa	area	25	25.5820000	83.5850000	t	f	2026-05-12 12:19:39.725398	2026-05-12 12:19:39.725398	global
1335	Bharauli	bharauli	area	25	25.6012000	83.5874000	t	f	2026-05-12 12:19:39.985962	2026-05-12 12:19:39.985962	global
1336	Zamania Block	zamania-block	area	25	25.4180000	83.9730000	t	f	2026-05-12 12:19:40.248942	2026-05-12 12:19:40.248942	global
1337	Gahmar	gahmar	area	25	25.6000000	83.8000000	t	f	2026-05-12 12:19:40.526764	2026-05-12 12:19:40.526764	global
1338	Bara	bara	area	25	25.5800000	83.5800000	t	f	2026-05-12 12:19:40.792276	2026-05-12 12:19:40.792276	global
1339	Bahuara	bahuara	area	25	25.5833000	83.5733000	t	f	2026-05-12 12:19:41.054861	2026-05-12 12:19:41.054861	global
1340	Usia	usia	area	25	25.5800000	83.5800000	t	f	2026-05-12 12:19:41.314854	2026-05-12 12:19:41.314854	global
1341	Dehari	dehari	area	25	25.5850000	83.5800000	t	f	2026-05-12 12:19:41.577162	2026-05-12 12:19:41.577162	global
1342	Karahiya	karahiya	area	25	25.5878000	83.5778000	t	f	2026-05-12 12:19:41.838372	2026-05-12 12:19:41.838372	global
1343	Jakhania Block	jakhania-block	area	25	25.8030000	83.4850000	t	f	2026-05-12 12:19:42.102409	2026-05-12 12:19:42.102409	global
1344	Baraich	baraich	area	25	25.5800000	83.5780000	t	f	2026-05-12 12:19:42.368696	2026-05-12 12:19:42.368696	global
1345	Bhanjanpur	bhanjanpur	area	25	25.5872000	83.5845000	t	f	2026-05-12 12:19:42.629855	2026-05-12 12:19:42.629855	global
1346	Seorai Block	seorai-block	area	25	25.6000000	83.4500000	t	f	2026-05-12 12:19:42.891029	2026-05-12 12:19:42.891029	global
1347	Seorai	seorai	area	25	25.5820000	83.6520000	t	f	2026-05-12 12:19:43.156059	2026-05-12 12:19:43.156059	global
1348	Gurasara	gurasara	area	25	25.5680000	83.5800000	t	f	2026-05-12 12:19:43.419409	2026-05-12 12:19:43.419409	global
1349	Saheri	saheri	area	25	25.5833000	83.5783000	t	f	2026-05-12 12:19:43.679414	2026-05-12 12:19:43.679414	global
1350	Tikva	tikva	area	25	25.5800000	83.5850000	t	f	2026-05-12 12:19:43.939458	2026-05-12 12:19:43.939458	global
1351	Balua	balua	area	25	25.5850000	83.5930000	t	f	2026-05-12 12:19:44.203757	2026-05-12 12:19:44.203757	global
1352	Hata	hata	area	25	25.7770000	83.5910000	t	f	2026-05-12 12:19:44.473058	2026-05-12 12:19:44.473058	global
1353	Dildarnagar / Bhadaura Block	dildarnagar-bhadaura-block	area	25	25.5833000	83.7167000	t	f	2026-05-12 12:19:44.745387	2026-05-12 12:19:44.745387	global
1354	Gorasra	gorasra	area	25	25.5830000	83.6200000	t	f	2026-05-12 12:19:45.004568	2026-05-12 12:19:45.004568	global
1355	Semra	semra	area	25	25.5833000	83.6000000	t	f	2026-05-12 12:19:45.269643	2026-05-12 12:19:45.269643	global
1356	Deorhi	deorhi	area	25	25.5830000	83.5870000	t	f	2026-05-12 12:19:45.530001	2026-05-12 12:19:45.530001	global
1357	Saidpur Block	saidpur-block	area	25	25.5480000	83.5780000	t	f	2026-05-12 12:19:45.794073	2026-05-12 12:19:45.794073	global
1358	Muhammadabad Gohna Belt	muhammadabad-gohna-belt	area	25	25.2450000	83.6060000	t	f	2026-05-12 12:19:46.055112	2026-05-12 12:19:46.055112	global
1359	Kaithwali	kaithwali	area	25	25.5830000	83.5890000	t	f	2026-05-12 12:19:46.318365	2026-05-12 12:19:46.318365	global
1360	Kotwa	kotwa	area	25	25.3220000	83.5850000	t	f	2026-05-12 12:19:46.581543	2026-05-12 12:19:46.581543	global
1361	Mahmoodpur	mahmoodpur	area	25	25.5828000	83.5806000	t	f	2026-05-12 12:19:46.84275	2026-05-12 12:19:46.84275	global
1362	Pipra	pipra	area	25	25.5833000	83.5833000	t	f	2026-05-12 12:19:47.102844	2026-05-12 12:19:47.102844	global
1363	Karanda Block	karanda-block	area	25	25.5800000	83.5800000	t	f	2026-05-12 12:19:47.361744	2026-05-12 12:19:47.361744	global
1364	Karanda	karanda	area	25	25.3250000	83.5760000	t	f	2026-05-12 12:19:47.633115	2026-05-12 12:19:47.633115	global
1365	Baruin	baruin	area	25	25.5800000	83.5900000	t	f	2026-05-12 12:19:47.895215	2026-05-12 12:19:47.895215	global
1366	Nagsar	nagsar	area	25	25.5970000	83.5800000	t	f	2026-05-12 12:19:48.153823	2026-05-12 12:19:48.153823	global
1367	Piparpati	piparpati	area	25	25.5833000	83.6000000	t	f	2026-05-12 12:19:48.418036	2026-05-12 12:19:48.418036	global
1368	Chochakpur	chochakpur	area	25	25.5612000	83.5697000	t	f	2026-05-12 12:19:48.677074	2026-05-12 12:19:48.677074	global
1369	Mardah Block	mardah-block	area	25	25.5500000	83.8500000	t	f	2026-05-12 12:19:48.943441	2026-05-12 12:19:48.943441	global
1370	Bhanwar	bhanwar	area	25	25.5768000	83.5852000	t	f	2026-05-12 12:19:49.205445	2026-05-12 12:19:49.205445	global
1371	Devkali	devkali	area	25	25.5765000	83.5840000	t	f	2026-05-12 12:19:49.465494	2026-05-12 12:19:49.465494	global
1372	Zamania Rural	zamania-rural	area	25	25.4170000	83.5520000	t	f	2026-05-12 12:19:49.737309	2026-05-12 12:19:49.737309	global
1373	Bahadurganj	bahadurganj	area	25	25.5825000	83.5776000	t	f	2026-05-12 12:19:50.001132	2026-05-12 12:19:50.001132	global
1374	Narayanpur	narayanpur	area	25	25.5847000	83.5774000	t	f	2026-05-12 12:19:50.261254	2026-05-12 12:19:50.261254	global
1375	Buxar Border Belt	buxar-border-belt	area	25	25.5753000	83.5850000	t	f	2026-05-12 12:19:50.521281	2026-05-12 12:19:50.521281	global
1376	Korar	korar	area	25	25.5812000	83.5904000	t	f	2026-05-12 12:19:50.781404	2026-05-12 12:19:50.781404	global
1377	Harnandi	harnandi	area	25	25.5922000	83.5850000	t	f	2026-05-12 12:19:51.040491	2026-05-12 12:19:51.040491	global
1378	Mahpur	mahpur	area	25	25.5500000	83.9000000	t	f	2026-05-12 12:19:51.302824	2026-05-12 12:19:51.302824	global
1379	Joga Musahib	joga-musahib	area	25	25.5855000	83.5850000	t	f	2026-05-12 12:19:51.562797	2026-05-12 12:19:51.562797	global
1380	Kheta Sarai Road Belt	kheta-sarai-road-belt	area	25	25.5800000	83.5850000	t	f	2026-05-12 12:19:51.8413	2026-05-12 12:19:51.8413	global
1381	Mahua Bagh Market	mahua-bagh-market	area	25	25.5780000	83.5810000	t	f	2026-05-12 12:19:52.102418	2026-05-12 12:19:52.102418	global
1382	Maqbool Alam Road Market	maqbool-alam-road-market	area	25	25.5830000	83.5850000	t	f	2026-05-12 12:19:52.364506	2026-05-12 12:19:52.364506	global
1383	Lanka Market	lanka-market	area	25	25.5800000	83.5800000	t	f	2026-05-12 12:19:52.625602	2026-05-12 12:19:52.625602	global
1384	Sadar Bazar	sadar-bazar	area	25	25.5908000	83.5927000	t	f	2026-05-12 12:19:52.888829	2026-05-12 12:19:52.888829	global
1385	Muhammadabad Market	muhammadabad-market	area	25	25.5820000	83.6020000	t	f	2026-05-12 12:19:53.148858	2026-05-12 12:19:53.148858	global
1386	Saidpur Market	saidpur-market	area	25	25.5948000	83.5870000	t	f	2026-05-12 12:19:53.409004	2026-05-12 12:19:53.409004	global
1387	Zamania Bazar	zamania-bazar	area	25	25.4250000	83.7680000	t	f	2026-05-12 12:19:53.676568	2026-05-12 12:19:53.676568	global
1388	Dildarnagar Market	dildarnagar-market	area	25	25.3260000	83.7945000	t	f	2026-05-12 12:19:53.942622	2026-05-12 12:19:53.942622	global
1389	Old City (Purana Hyderabad)	old-city-purana-hyderabad	area	18	17.3609000	78.4741000	t	f	2026-05-12 12:19:54.203817	2026-05-12 12:19:54.203817	global
1390	Pathergatti	pathergatti	area	18	17.3615000	78.4786000	t	f	2026-05-12 12:19:54.46481	2026-05-12 12:19:54.46481	global
1391	Bahadurpura	bahadurpura	area	18	17.3480000	78.4508000	t	f	2026-05-12 12:19:54.725255	2026-05-12 12:19:54.725255	global
1392	Chandrayangutta	chandrayangutta	area	18	17.3053000	78.4714000	t	f	2026-05-12 12:19:54.98802	2026-05-12 12:19:54.98802	global
1393	Rein Bazar	rein-bazar	area	18	17.3745000	78.4958000	t	f	2026-05-12 12:19:55.249537	2026-05-12 12:19:55.249537	global
1394	Talab Katta	talab-katta	area	18	17.3890000	78.4740000	t	f	2026-05-12 12:19:55.523984	2026-05-12 12:19:55.523984	global
1395	Hafiz Baba Nagar	hafiz-baba-nagar	area	18	17.3446000	78.4429000	t	f	2026-05-12 12:19:55.78618	2026-05-12 12:19:55.78618	global
1396	Central Hyderabad	central-hyderabad	area	18	17.3850000	78.4867000	t	f	2026-05-12 12:19:56.045455	2026-05-12 12:19:56.045455	global
1397	Himayatnagar	himayatnagar	area	18	17.4048000	78.4857000	t	f	2026-05-12 12:19:56.315521	2026-05-12 12:19:56.315521	global
1398	Saifabad	saifabad	area	18	17.4230000	78.4738000	t	f	2026-05-12 12:19:56.577728	2026-05-12 12:19:56.577728	global
1399	Lakdikapul	lakdikapul	area	18	17.4081000	78.4563000	t	f	2026-05-12 12:19:56.841637	2026-05-12 12:19:56.841637	global
1400	Red Hills	red-hills	area	18	17.4300000	78.4300000	t	f	2026-05-12 12:19:57.105091	2026-05-12 12:19:57.105091	global
1401	Khairatabad	khairatabad	area	18	17.4126000	78.4520000	t	f	2026-05-12 12:19:57.371498	2026-05-12 12:19:57.371498	global
1402	North Hyderabad	north-hyderabad	area	18	17.4500000	78.5000000	t	f	2026-05-12 12:19:57.631462	2026-05-12 12:19:57.631462	global
1403	Bolarum	bolarum	area	18	17.5029000	78.4875000	t	f	2026-05-12 12:19:57.894568	2026-05-12 12:19:57.894568	global
1404	South-East Hyderabad	south-east-hyderabad	area	18	17.3430000	78.5690000	t	f	2026-05-12 12:19:58.158769	2026-05-12 12:19:58.158769	global
1405	Santosh Nagar	santosh-nagar	area	18	17.3676000	78.5330000	t	f	2026-05-12 12:19:58.423969	2026-05-12 12:19:58.423969	global
1406	Saroornagar	saroornagar	area	18	17.3565000	78.5320000	t	f	2026-05-12 12:19:58.686115	2026-05-12 12:19:58.686115	global
1407	Vanasthalipuram	vanasthalipuram	area	18	17.3214000	78.5599000	t	f	2026-05-12 12:19:58.948183	2026-05-12 12:19:58.948183	global
1408	West Hyderabad (Premium / IT Hub)	west-hyderabad-premium-it-hub	area	18	17.4439000	78.3772000	t	f	2026-05-12 12:19:59.208377	2026-05-12 12:19:59.208377	global
1409	Erramanzil	erramanzil	area	18	17.4128000	78.4574000	t	f	2026-05-12 12:19:59.469533	2026-05-12 12:19:59.469533	global
1410	Film Nagar	film-nagar	area	18	17.4195000	78.4126000	t	f	2026-05-12 12:19:59.729626	2026-05-12 12:19:59.729626	global
1411	Cyberabad / IT Corridor (HITEC City Region)	cyberabad-it-corridor-hitec-city-region	area	18	17.4486000	78.3915000	t	f	2026-05-12 12:19:59.996882	2026-05-12 12:19:59.996882	global
1412	HITEC City	hitec-city	area	18	17.4458000	78.3813000	t	f	2026-05-12 12:20:00.260126	2026-05-12 12:20:00.260126	global
1413	Nanakramguda	nanakramguda	area	18	17.4167000	78.3350000	t	f	2026-05-12 12:20:00.521238	2026-05-12 12:20:00.521238	global
1414	Financial District	financial-district	area	18	17.3871000	78.4747000	t	f	2026-05-12 12:20:00.780332	2026-05-12 12:20:00.780332	global
1415	Raidurgam	raidurgam	area	18	17.4430000	78.3810000	t	f	2026-05-12 12:20:01.039477	2026-05-12 12:20:01.039477	global
1416	North-West Hyderabad	north-west-hyderabad	area	18	17.4700000	78.4100000	t	f	2026-05-12 12:20:01.303859	2026-05-12 12:20:01.303859	global
1417	KPHB Colony	kphb-colony	area	18	17.4930000	78.3990000	t	f	2026-05-12 12:20:01.564741	2026-05-12 12:20:01.564741	global
1418	Bachupally	bachupally	area	18	17.5186000	78.3728000	t	f	2026-05-12 12:20:01.824832	2026-05-12 12:20:01.824832	global
1419	Hafeezpet	hafeezpet	area	18	17.4948000	78.3745000	t	f	2026-05-12 12:20:02.085921	2026-05-12 12:20:02.085921	global
1420	East Hyderabad	east-hyderabad	area	18	17.3972000	78.4915000	t	f	2026-05-12 12:20:02.347031	2026-05-12 12:20:02.347031	global
1421	South-West Hyderabad	south-west-hyderabad	area	18	17.3850000	78.4867000	t	f	2026-05-12 12:20:02.607268	2026-05-12 12:20:02.607268	global
1422	Attapur	attapur	area	18	17.3670000	78.4295000	t	f	2026-05-12 12:20:02.872304	2026-05-12 12:20:02.872304	global
1423	Kishan Bagh	kishan-bagh	area	18	17.3786000	78.4308000	t	f	2026-05-12 12:20:03.13257	2026-05-12 12:20:03.13257	global
1424	Budvel	budvel	area	18	17.3527000	78.4074000	t	f	2026-05-12 12:20:03.396607	2026-05-12 12:20:03.396607	global
1425	Lakeside / Outer Premium Areas	lakeside-outer-premium-areas	area	18	17.4340000	78.3470000	t	f	2026-05-12 12:20:03.676344	2026-05-12 12:20:03.676344	global
1426	Manikonda	manikonda	area	18	17.4167000	78.3781000	t	f	2026-05-12 12:20:03.941442	2026-05-12 12:20:03.941442	global
1427	Narsingi	narsingi	area	18	17.4169000	78.3496000	t	f	2026-05-12 12:20:04.202557	2026-05-12 12:20:04.202557	global
1428	Kokapet	kokapet	area	18	17.4089000	78.3416000	t	f	2026-05-12 12:20:04.463707	2026-05-12 12:20:04.463707	global
1429	Puppalaguda	puppalaguda	area	18	17.3960000	78.3800000	t	f	2026-05-12 12:20:04.722798	2026-05-12 12:20:04.722798	global
1430	Toli Chowki	toli-chowki	area	18	17.3984000	78.4167000	t	f	2026-05-12 12:20:04.986091	2026-05-12 12:20:04.986091	global
1431	Shaikpet	shaikpet	area	18	17.4130000	78.4070000	t	f	2026-05-12 12:20:05.247155	2026-05-12 12:20:05.247155	global
1432	Central Kanpur	central-kanpur	area	26	26.4500000	80.3333000	t	f	2026-05-12 12:20:05.515292	2026-05-12 12:20:05.515292	global
1433	Mall Road	mall-road	area	26	26.4537000	80.3502000	t	f	2026-05-12 12:20:05.784756	2026-05-12 12:20:05.784756	global
1434	Swaroop Nagar	swaroop-nagar	area	26	26.4960000	80.3075000	t	f	2026-05-12 12:20:06.042886	2026-05-12 12:20:06.042886	global
1435	Arya Nagar	arya-nagar	area	26	26.4715000	80.3246000	t	f	2026-05-12 12:20:06.304807	2026-05-12 12:20:06.304807	global
1436	Gumti No. 5	gumti-no-5	area	26	26.4630000	80.3462000	t	f	2026-05-12 12:20:06.565938	2026-05-12 12:20:06.565938	global
1437	Gumti No. 3	gumti-no-3	area	26	26.4623000	80.3325000	t	f	2026-05-12 12:20:06.829169	2026-05-12 12:20:06.829169	global
1438	Parade	parade	area	26	26.4691000	80.3482000	t	f	2026-05-12 12:20:07.099598	2026-05-12 12:20:07.099598	global
1439	Cooperganj	cooperganj	area	26	26.4657000	80.3498000	t	f	2026-05-12 12:20:07.362746	2026-05-12 12:20:07.362746	global
1440	Bada Chauraha	bada-chauraha	area	26	26.4670000	80.3470000	t	f	2026-05-12 12:20:07.626027	2026-05-12 12:20:07.626027	global
1441	Naveen Market	naveen-market	area	26	26.4806000	80.3260000	t	f	2026-05-12 12:20:07.886674	2026-05-12 12:20:07.886674	global
1442	Mall Road (Phool Bagh Area)	mall-road-phool-bagh-area	area	26	26.4526000	80.3277000	t	f	2026-05-12 12:20:08.146113	2026-05-12 12:20:08.146113	global
1443	Phoolbagh	phoolbagh	area	26	26.4645000	80.3489000	t	f	2026-05-12 12:20:08.409379	2026-05-12 12:20:08.409379	global
1444	Motijheel	motijheel	area	26	26.4479000	80.3319000	t	f	2026-05-12 12:20:08.673931	2026-05-12 12:20:08.673931	global
1445	Baradevi	baradevi	area	26	26.4494000	80.3205000	t	f	2026-05-12 12:20:08.936623	2026-05-12 12:20:08.936623	global
1446	Old Kanpur	old-kanpur	area	26	26.4499000	80.3319000	t	f	2026-05-12 12:20:09.195674	2026-05-12 12:20:09.195674	global
1447	Collectorganj	collectorganj	area	26	26.4550000	80.3340000	t	f	2026-05-12 12:20:09.457829	2026-05-12 12:20:09.457829	global
1448	Beconganj	beconganj	area	26	26.4550000	80.3214000	t	f	2026-05-12 12:20:09.719058	2026-05-12 12:20:09.719058	global
1449	Gwaltoli	gwaltoli	area	26	26.4679000	80.3465000	t	f	2026-05-12 12:20:09.979131	2026-05-12 12:20:09.979131	global
1450	Kidwai Nagar	kidwai-nagar	area	26	26.4023000	80.3328000	t	f	2026-05-12 12:20:10.26082	2026-05-12 12:20:10.26082	global
1451	Fazalganj	fazalganj	area	26	26.4486000	80.3012000	t	f	2026-05-12 12:20:10.525865	2026-05-12 12:20:10.525865	global
1452	Chamanganj	chamanganj	area	26	26.4736000	80.3294000	t	f	2026-05-12 12:20:10.790206	2026-05-12 12:20:10.790206	global
1453	Panki	panki	area	26	26.4650000	80.1300000	t	f	2026-05-12 12:20:11.051323	2026-05-12 12:20:11.051323	global
1454	Lal Bangla	lal-bangla	area	26	26.4667000	80.3167000	t	f	2026-05-12 12:20:11.313467	2026-05-12 12:20:11.313467	global
1455	Shyam Nagar	shyam-nagar	area	26	26.4680000	80.3100000	t	f	2026-05-12 12:20:11.577563	2026-05-12 12:20:11.577563	global
1456	Govind Nagar	govind-nagar	area	26	26.4555000	80.3165000	t	f	2026-05-12 12:20:11.839696	2026-05-12 12:20:11.839696	global
1457	Darshanpurwa	darshanpurwa	area	26	26.4642000	80.3319000	t	f	2026-05-12 12:20:12.103929	2026-05-12 12:20:12.103929	global
1458	Juhi	juhi	area	26	26.4406000	80.3234000	t	f	2026-05-12 12:20:12.365267	2026-05-12 12:20:12.365267	global
1459	Jareeb Chowki	jareeb-chowki	area	26	26.4756000	80.2721000	t	f	2026-05-12 12:20:12.625202	2026-05-12 12:20:12.625202	global
1460	Anwarganj	anwarganj	area	26	26.4746000	80.3330000	t	f	2026-05-12 12:20:12.88638	2026-05-12 12:20:12.88638	global
1461	Mirpur	mirpur	area	26	26.4516000	80.3319000	t	f	2026-05-12 12:20:13.145426	2026-05-12 12:20:13.145426	global
1462	Sisamau	sisamau	area	26	26.4499000	80.3215000	t	f	2026-05-12 12:20:13.406566	2026-05-12 12:20:13.406566	global
1463	Chaman Ganj	chaman-ganj	area	26	26.4499000	80.3278000	t	f	2026-05-12 12:20:13.6676	2026-05-12 12:20:13.6676	global
1464	Bajaria	bajaria	area	26	26.4512000	80.3319000	t	f	2026-05-12 12:20:13.927772	2026-05-12 12:20:13.927772	global
1465	South Kanpur	south-kanpur	area	26	26.4419000	80.3442000	t	f	2026-05-12 12:20:14.18983	2026-05-12 12:20:14.18983	global
1466	Barra	barra	area	26	26.4499000	80.3319000	t	f	2026-05-12 12:20:14.451978	2026-05-12 12:20:14.451978	global
1467	Barra-2	barra-2	area	26	26.4373000	80.3319000	t	f	2026-05-12 12:20:14.720398	2026-05-12 12:20:14.720398	global
1468	Barra-8	barra-8	area	26	26.4499000	80.3319000	t	f	2026-05-12 12:20:14.981443	2026-05-12 12:20:14.981443	global
1469	Kakadev	kakadev	area	26	26.4700000	80.3200000	t	f	2026-05-12 12:20:15.243568	2026-05-12 12:20:15.243568	global
1470	Saket Nagar	saket-nagar	area	26	26.4716000	80.3199000	t	f	2026-05-12 12:20:15.509166	2026-05-12 12:20:15.509166	global
1471	Yashoda Nagar	yashoda-nagar	area	26	26.4195000	80.3029000	t	f	2026-05-12 12:20:15.771	2026-05-12 12:20:15.771	global
1472	Ratanlal Nagar	ratanlal-nagar	area	26	26.4695000	80.2617000	t	f	2026-05-12 12:20:16.031169	2026-05-12 12:20:16.031169	global
1473	Keshav Nagar	keshav-nagar	area	26	26.4499000	80.3319000	t	f	2026-05-12 12:20:16.294443	2026-05-12 12:20:16.294443	global
1474	Dada Nagar	dada-nagar	area	26	26.4563000	80.3180000	t	f	2026-05-12 12:20:16.567794	2026-05-12 12:20:16.567794	global
1475	Kalpi Road Areas	kalpi-road-areas	area	26	26.4499000	80.3319000	t	f	2026-05-12 12:20:16.831941	2026-05-12 12:20:16.831941	global
1476	Naubasta	naubasta	area	26	26.4269000	80.3176000	t	f	2026-05-12 12:20:17.097059	2026-05-12 12:20:17.097059	global
1477	Juhi Kalan	juhi-kalan	area	26	26.4306000	80.2908000	t	f	2026-05-12 12:20:17.360353	2026-05-12 12:20:17.360353	global
1478	Juhi Lal Colony	juhi-lal-colony	area	26	26.4470000	80.3328000	t	f	2026-05-12 12:20:17.620473	2026-05-12 12:20:17.620473	global
1479	East Kanpur	east-kanpur	area	26	26.4520000	80.3400000	t	f	2026-05-12 12:20:17.881498	2026-05-12 12:20:17.881498	global
1480	Jajmau	jajmau	area	26	26.3990000	80.4165000	t	f	2026-05-12 12:20:18.143632	2026-05-12 12:20:18.143632	global
1481	Ramadevi Chauraha	ramadevi-chauraha	area	26	26.4424000	80.3216000	t	f	2026-05-12 12:20:18.405888	2026-05-12 12:20:18.405888	global
1482	Shyam Nagar Extension	shyam-nagar-extension	area	26	26.4500000	80.3000000	t	f	2026-05-12 12:20:18.671058	2026-05-12 12:20:18.671058	global
1483	Chakeri	chakeri	area	26	26.4265000	80.2765000	t	f	2026-05-12 12:20:18.932264	2026-05-12 12:20:18.932264	global
1484	Singhpur	singhpur	area	26	26.4478000	80.3319000	t	f	2026-05-12 12:20:19.194277	2026-05-12 12:20:19.194277	global
1485	Koyla Nagar	koyla-nagar	area	26	26.5007000	80.2838000	t	f	2026-05-12 12:20:19.456404	2026-05-12 12:20:19.456404	global
1486	Defence Colony	defence-colony	area	26	26.4499000	80.3319000	t	f	2026-05-12 12:20:19.724727	2026-05-12 12:20:19.724727	global
1487	Rail Bazar	rail-bazar	area	26	26.4410000	80.3217000	t	f	2026-05-12 12:20:20.000184	2026-05-12 12:20:20.000184	global
1488	West Kanpur	west-kanpur	area	26	26.4470000	80.3319000	t	f	2026-05-12 12:20:20.260377	2026-05-12 12:20:20.260377	global
1489	Kakadeo	kakadeo	area	26	26.4700000	80.3100000	t	f	2026-05-12 12:20:20.521392	2026-05-12 12:20:20.521392	global
1490	Barra Bypass	barra-bypass	area	26	26.4680000	80.3345000	t	f	2026-05-12 12:20:20.781579	2026-05-12 12:20:20.781579	global
1491	Rawatpur	rawatpur	area	26	26.4769000	80.2540000	t	f	2026-05-12 12:20:21.040747	2026-05-12 12:20:21.040747	global
1492	Kalyanpur	kalyanpur	area	26	26.4770000	80.3319000	t	f	2026-05-12 12:20:21.301786	2026-05-12 12:20:21.301786	global
1493	Indira Nagar (Kanpur)	indira-nagar-kanpur	area	26	26.4876000	80.3210000	t	f	2026-05-12 12:20:21.564812	2026-05-12 12:20:21.564812	global
1494	Panki Industrial Area	panki-industrial-area	area	26	26.4528000	80.3156000	t	f	2026-05-12 12:20:21.829116	2026-05-12 12:20:21.829116	global
1495	Vinayakpur	vinayakpur	area	26	26.4567000	80.3319000	t	f	2026-05-12 12:20:22.092097	2026-05-12 12:20:22.092097	global
1496	Ratanpur Colony	ratanpur-colony	area	26	26.4712000	80.3319000	t	f	2026-05-12 12:20:22.358592	2026-05-12 12:20:22.358592	global
1497	Kanpur Cantonment Area	kanpur-cantonment-area	area	26	26.4499000	80.3478000	t	f	2026-05-12 12:20:22.619654	2026-05-12 12:20:22.619654	global
1498	Manohar Nagar	manohar-nagar	area	26	26.4499000	80.3319000	t	f	2026-05-12 12:20:22.895847	2026-05-12 12:20:22.895847	global
1499	Babupurwa	babupurwa	area	26	26.4499000	80.3319000	t	f	2026-05-12 12:20:23.171894	2026-05-12 12:20:23.171894	global
1500	Panki Industrial Estate	panki-industrial-estate	area	26	26.4570000	80.2932000	t	f	2026-05-12 12:20:23.432862	2026-05-12 12:20:23.432862	global
1501	Dada Nagar Industrial Estate	dada-nagar-industrial-estate	area	26	26.4540000	80.3082000	t	f	2026-05-12 12:20:23.694853	2026-05-12 12:20:23.694853	global
1502	Kalpi Road Industrial Zone	kalpi-road-industrial-zone	area	26	26.4670000	80.3335000	t	f	2026-05-12 12:20:23.95502	2026-05-12 12:20:23.95502	global
1503	Chakeri Industrial	chakeri-industrial	area	26	26.4498000	80.3310000	t	f	2026-05-12 12:20:24.217129	2026-05-12 12:20:24.217129	global
1504	Jajmau Leather Industrial Belt	jajmau-leather-industrial-belt	area	26	26.4330000	80.3970000	t	f	2026-05-12 12:20:24.479135	2026-05-12 12:20:24.479135	global
1505	Suburban / Outer Kanpur Local Areas	suburban-outer-kanpur-local-areas	area	26	26.4499000	80.3319000	t	f	2026-05-12 12:20:24.739437	2026-05-12 12:20:24.739437	global
1506	Bithoor	bithoor	area	26	26.6065000	80.2730000	t	f	2026-05-12 12:20:25.001582	2026-05-12 12:20:25.001582	global
1507	Mandhana	mandhana	area	26	26.5138000	80.2767000	t	f	2026-05-12 12:20:25.26881	2026-05-12 12:20:25.26881	global
1508	Armapur Estate	armapur-estate	area	26	26.4856000	80.2944000	t	f	2026-05-12 12:20:25.530089	2026-05-12 12:20:25.530089	global
1509	Barra World Bank	barra-world-bank	area	26	26.4499000	80.3319000	t	f	2026-05-12 12:20:25.794141	2026-05-12 12:20:25.794141	global
1510	Shivrajpur	shivrajpur	area	26	26.9150000	79.6550000	t	f	2026-05-12 12:20:26.056497	2026-05-12 12:20:26.056497	global
1511	Akbarpur	akbarpur	area	26	26.4395000	79.9530000	t	f	2026-05-12 12:20:26.317474	2026-05-12 12:20:26.317474	global
1512	Kanpur Dehat areas touching Nagar	kanpur-dehat-areas-touching-nagar	area	26	26.4054000	80.2054000	t	f	2026-05-12 12:20:26.583654	2026-05-12 12:20:26.583654	global
1513	Bidhanu	bidhanu	area	26	26.3710000	80.2700000	t	f	2026-05-12 12:20:26.847794	2026-05-12 12:20:26.847794	global
1514	Ghatampur	ghatampur	area	26	26.0015000	80.1660000	t	f	2026-05-12 12:20:27.107908	2026-05-12 12:20:27.107908	global
1515	Bilhaur	bilhaur	area	26	26.7800000	79.8000000	t	f	2026-05-12 12:20:27.370112	2026-05-12 12:20:27.370112	global
1516	Sarsaul	sarsaul	area	26	26.3805000	80.2644000	t	f	2026-05-12 12:20:27.631259	2026-05-12 12:20:27.631259	global
1517	Bhimsen	bhimsen	area	26	26.4446000	80.2738000	t	f	2026-05-12 12:20:27.892326	2026-05-12 12:20:27.892326	global
1518	Maharajpur Road Areas	maharajpur-road-areas	area	26	26.4710000	80.3270000	t	f	2026-05-12 12:20:28.153446	2026-05-12 12:20:28.153446	global
1519	Thiruvananthapuram (Trivandrum)	thiruvananthapuram-trivandrum	area	27	8.5241000	76.9366000	t	f	2026-05-12 12:20:28.417649	2026-05-12 12:20:28.417649	global
1520	Kazhakkoottam	kazhakkoottam	area	27	8.5680000	76.8733000	t	f	2026-05-12 12:20:28.681888	2026-05-12 12:20:28.681888	global
1521	Kovalam	kovalam	area	27	8.4000000	76.9500000	t	f	2026-05-12 12:20:28.942871	2026-05-12 12:20:28.942871	global
1522	Varkala	varkala	area	27	8.7379000	76.7163000	t	f	2026-05-12 12:20:29.207328	2026-05-12 12:20:29.207328	global
1523	Neyyattinkara	neyyattinkara	area	27	8.4019000	77.0856000	t	f	2026-05-12 12:20:29.474832	2026-05-12 12:20:29.474832	global
1524	Attingal	attingal	area	27	8.6961000	76.8193000	t	f	2026-05-12 12:20:29.734617	2026-05-12 12:20:29.734617	global
1525	Karamana	karamana	area	27	8.4957000	76.9863000	t	f	2026-05-12 12:20:29.996731	2026-05-12 12:20:29.996731	global
1526	Pangappara	pangappara	area	27	8.5400000	76.9200000	t	f	2026-05-12 12:20:30.257804	2026-05-12 12:20:30.257804	global
1527	Pothencode	pothencode	area	27	8.6030000	76.8797000	t	f	2026-05-12 12:20:30.520956	2026-05-12 12:20:30.520956	global
1528	Vizhinjam	vizhinjam	area	27	8.3833000	76.9833000	t	f	2026-05-12 12:20:30.782038	2026-05-12 12:20:30.782038	global
1529	Sreekaryam	sreekaryam	area	27	8.5397000	76.8996000	t	f	2026-05-12 12:20:31.044285	2026-05-12 12:20:31.044285	global
1530	Kollam	kollam	area	27	8.8932000	76.6141000	t	f	2026-05-12 12:20:31.307645	2026-05-12 12:20:31.307645	global
1531	Paravur	paravur	area	27	10.1430000	76.2140000	t	f	2026-05-12 12:20:31.575726	2026-05-12 12:20:31.575726	global
1532	Punalur	punalur	area	27	9.0196000	76.9289000	t	f	2026-05-12 12:20:31.838059	2026-05-12 12:20:31.838059	global
1533	Chathannoor	chathannoor	area	27	8.4875000	76.7833000	t	f	2026-05-12 12:20:32.099965	2026-05-12 12:20:32.099965	global
1534	Kundara	kundara	area	27	8.8833000	76.6833000	t	f	2026-05-12 12:20:32.375451	2026-05-12 12:20:32.375451	global
1535	Kottarakkara	kottarakkara	area	27	9.0060000	76.7670000	t	f	2026-05-12 12:20:32.637656	2026-05-12 12:20:32.637656	global
1536	Karunagappally	karunagappally	area	27	9.0598000	76.5370000	t	f	2026-05-12 12:20:32.898878	2026-05-12 12:20:32.898878	global
1537	Sasthamkotta	sasthamkotta	area	27	9.0319000	76.6291000	t	f	2026-05-12 12:20:33.161964	2026-05-12 12:20:33.161964	global
1538	Pathanamthitta	pathanamthitta	area	27	9.2642000	76.7872000	t	f	2026-05-12 12:20:33.422107	2026-05-12 12:20:33.422107	global
1539	Thiruvalla	thiruvalla	area	27	9.3839000	76.5754000	t	f	2026-05-12 12:20:33.682162	2026-05-12 12:20:33.682162	global
1540	Adoor	adoor	area	27	9.1494000	76.7365000	t	f	2026-05-12 12:20:33.943247	2026-05-12 12:20:33.943247	global
1541	Ranni	ranni	area	27	9.3826000	76.7876000	t	f	2026-05-12 12:20:34.203498	2026-05-12 12:20:34.203498	global
1542	Konni	konni	area	27	9.2333000	76.8667000	t	f	2026-05-12 12:20:34.465639	2026-05-12 12:20:34.465639	global
1543	Mallappally	mallappally	area	27	9.4720000	76.7035000	t	f	2026-05-12 12:20:34.726351	2026-05-12 12:20:34.726351	global
1544	Pandalam	pandalam	area	27	9.2667000	76.7000000	t	f	2026-05-12 12:20:34.987976	2026-05-12 12:20:34.987976	global
1545	Alappuzha (Alleppey)	alappuzha-alleppey	area	27	9.4981000	76.3388000	t	f	2026-05-12 12:20:35.254021	2026-05-12 12:20:35.254021	global
1546	Cherthala	cherthala	area	27	9.6844000	76.3360000	t	f	2026-05-12 12:20:35.516151	2026-05-12 12:20:35.516151	global
1547	Kayamkulam	kayamkulam	area	27	9.1710000	76.5000000	t	f	2026-05-12 12:20:35.775208	2026-05-12 12:20:35.775208	global
1548	Haripad	haripad	area	27	9.2500000	76.4667000	t	f	2026-05-12 12:20:36.068093	2026-05-12 12:20:36.068093	global
1549	Mavelikkara	mavelikkara	area	27	9.2590000	76.5580000	t	f	2026-05-12 12:20:36.331342	2026-05-12 12:20:36.331342	global
1550	Chengannur	chengannur	area	27	9.3170000	76.6150000	t	f	2026-05-12 12:20:36.592398	2026-05-12 12:20:36.592398	global
1551	Punnapra	punnapra	area	27	9.3667000	76.3500000	t	f	2026-05-12 12:20:36.852688	2026-05-12 12:20:36.852688	global
1552	Kottayam	kottayam	area	27	9.5916000	76.5222000	t	f	2026-05-12 12:20:37.286039	2026-05-12 12:20:37.286039	global
1553	Pala	pala	area	27	9.9950000	76.7000000	t	f	2026-05-12 12:20:37.547812	2026-05-12 12:20:37.547812	global
1554	Changanassery	changanassery	area	27	9.4450000	76.5402000	t	f	2026-05-12 12:20:37.822268	2026-05-12 12:20:37.822268	global
1555	Kanjirappally	kanjirappally	area	27	9.5545000	76.7891000	t	f	2026-05-12 12:20:38.083609	2026-05-12 12:20:38.083609	global
1556	Ettumanoor	ettumanoor	area	27	9.6670000	76.5353000	t	f	2026-05-12 12:20:38.342521	2026-05-12 12:20:38.342521	global
1557	Vaikom	vaikom	area	27	9.7605000	76.3945000	t	f	2026-05-12 12:20:38.606819	2026-05-12 12:20:38.606819	global
1558	Kumarakom	kumarakom	area	27	9.6170000	76.4300000	t	f	2026-05-12 12:20:38.868796	2026-05-12 12:20:38.868796	global
1559	Idukki	idukki	area	27	9.8500000	77.0500000	t	f	2026-05-12 12:20:39.129068	2026-05-12 12:20:39.129068	global
1560	Munnar	munnar	area	27	10.0889000	77.0595000	t	f	2026-05-12 12:20:39.389058	2026-05-12 12:20:39.389058	global
1561	Thodupuzha	thodupuzha	area	27	9.8908000	76.7174000	t	f	2026-05-12 12:20:39.654238	2026-05-12 12:20:39.654238	global
1562	Painavu	painavu	area	27	9.8480000	76.9500000	t	f	2026-05-12 12:20:39.917417	2026-05-12 12:20:39.917417	global
1563	Kattappana	kattappana	area	27	9.7494000	77.0693000	t	f	2026-05-12 12:20:40.177484	2026-05-12 12:20:40.177484	global
1564	Thekkady	thekkady	area	27	9.6050000	77.1590000	t	f	2026-05-12 12:20:40.437551	2026-05-12 12:20:40.437551	global
1565	Adimali	adimali	area	27	10.0130000	76.9590000	t	f	2026-05-12 12:20:40.699812	2026-05-12 12:20:40.699812	global
1566	Ernakulam	ernakulam	area	27	9.9816000	76.2999000	t	f	2026-05-12 12:20:40.968007	2026-05-12 12:20:40.968007	global
1567	Kochi (Ernakulam City)	kochi-ernakulam-city	area	27	9.9312000	76.2673000	t	f	2026-05-12 12:20:41.229141	2026-05-12 12:20:41.229141	global
1568	Aluva	aluva	area	27	10.1076000	76.3516000	t	f	2026-05-12 12:20:41.490302	2026-05-12 12:20:41.490302	global
1569	Perumbavoor	perumbavoor	area	27	10.1060000	76.4736000	t	f	2026-05-12 12:20:41.752552	2026-05-12 12:20:41.752552	global
1570	Angamaly	angamaly	area	27	10.1900000	76.3870000	t	f	2026-05-12 12:20:42.014622	2026-05-12 12:20:42.014622	global
1571	Muvattupuzha	muvattupuzha	area	27	9.9790000	76.5739000	t	f	2026-05-12 12:20:42.27673	2026-05-12 12:20:42.27673	global
1572	North Paravur	north-paravur	area	27	10.1440000	76.2330000	t	f	2026-05-12 12:20:42.538891	2026-05-12 12:20:42.538891	global
1573	Kalamassery	kalamassery	area	27	10.0600000	76.3000000	t	f	2026-05-12 12:20:42.797953	2026-05-12 12:20:42.797953	global
1574	Kakkanad	kakkanad	area	27	10.0179000	76.3449000	t	f	2026-05-12 12:20:43.063271	2026-05-12 12:20:43.063271	global
1575	Thrissur	thrissur	area	27	10.5276000	76.2144000	t	f	2026-05-12 12:20:43.323327	2026-05-12 12:20:43.323327	global
1576	Guruvayur	guruvayur	area	27	10.5946000	76.0416000	t	f	2026-05-12 12:20:43.588468	2026-05-12 12:20:43.588468	global
1577	Chavakkad	chavakkad	area	27	10.5200000	76.0500000	t	f	2026-05-12 12:20:43.851634	2026-05-12 12:20:43.851634	global
1578	Irinjalakuda	irinjalakuda	area	27	10.3428000	76.2118000	t	f	2026-05-12 12:20:44.11598	2026-05-12 12:20:44.11598	global
1579	Chalakudy	chalakudy	area	27	10.3000000	76.3500000	t	f	2026-05-12 12:20:44.380143	2026-05-12 12:20:44.380143	global
1580	Kodungallur	kodungallur	area	27	10.2330000	76.1830000	t	f	2026-05-12 12:20:44.641302	2026-05-12 12:20:44.641302	global
1581	Ollur	ollur	area	27	10.5489000	76.2145000	t	f	2026-05-12 12:20:44.906381	2026-05-12 12:20:44.906381	global
1582	Kunnamkulam	kunnamkulam	area	27	10.6490000	76.0670000	t	f	2026-05-12 12:20:45.168625	2026-05-12 12:20:45.168625	global
1583	Palakkad	palakkad	area	27	10.7867000	76.6548000	t	f	2026-05-12 12:20:45.431122	2026-05-12 12:20:45.431122	global
1584	Chittur	chittur	area	27	10.7000000	76.7500000	t	f	2026-05-12 12:20:45.693223	2026-05-12 12:20:45.693223	global
1585	Ottappalam	ottappalam	area	27	10.7732000	76.3794000	t	f	2026-05-12 12:20:45.953374	2026-05-12 12:20:45.953374	global
1586	Pattambi	pattambi	area	27	10.8000000	76.2000000	t	f	2026-05-12 12:20:46.217611	2026-05-12 12:20:46.217611	global
1587	Mannarkkad	mannarkkad	area	27	10.9963000	76.4618000	t	f	2026-05-12 12:20:46.479722	2026-05-12 12:20:46.479722	global
1588	Malampuzha	malampuzha	area	27	10.7810000	76.6570000	t	f	2026-05-12 12:20:46.74188	2026-05-12 12:20:46.74188	global
1589	Nemmara	nemmara	area	27	10.5996000	76.6760000	t	f	2026-05-12 12:20:47.002095	2026-05-12 12:20:47.002095	global
1590	Malappuram	malappuram	area	27	11.0000000	76.0833000	t	f	2026-05-12 12:20:47.26204	2026-05-12 12:20:47.26204	global
1591	Manjeri	manjeri	area	27	11.1200000	76.1200000	t	f	2026-05-12 12:20:47.524176	2026-05-12 12:20:47.524176	global
1592	Perinthalmanna	perinthalmanna	area	27	10.9747000	76.2267000	t	f	2026-05-12 12:20:47.784377	2026-05-12 12:20:47.784377	global
1593	Tirur	tirur	area	27	10.9167000	75.9200000	t	f	2026-05-12 12:20:48.048517	2026-05-12 12:20:48.048517	global
1594	Kondotty	kondotty	area	27	11.1450000	75.9680000	t	f	2026-05-12 12:20:48.312817	2026-05-12 12:20:48.312817	global
1595	Kottakkal	kottakkal	area	27	10.9960000	76.0030000	t	f	2026-05-12 12:20:48.575936	2026-05-12 12:20:48.575936	global
1596	Ponnani	ponnani	area	27	10.7667000	75.9300000	t	f	2026-05-12 12:20:48.837025	2026-05-12 12:20:48.837025	global
1597	Parappanangadi	parappanangadi	area	27	11.0469000	75.8883000	t	f	2026-05-12 12:20:49.099158	2026-05-12 12:20:49.099158	global
1598	Kozhikode (Calicut)	kozhikode-calicut	area	27	11.2588000	75.7804000	t	f	2026-05-12 12:20:49.361351	2026-05-12 12:20:49.361351	global
1599	Vadakara	vadakara	area	27	11.6087000	75.5911000	t	f	2026-05-12 12:20:49.626848	2026-05-12 12:20:49.626848	global
1600	Koyilandy	koyilandy	area	27	11.4490000	75.6960000	t	f	2026-05-12 12:20:49.88881	2026-05-12 12:20:49.88881	global
1601	Feroke	feroke	area	27	11.1790000	75.8415000	t	f	2026-05-12 12:20:50.151326	2026-05-12 12:20:50.151326	global
1602	Beypore	beypore	area	27	11.1739000	75.8064000	t	f	2026-05-12 12:20:50.413822	2026-05-12 12:20:50.413822	global
1603	Ramanattukara	ramanattukara	area	27	11.1730000	75.8660000	t	f	2026-05-12 12:20:50.673263	2026-05-12 12:20:50.673263	global
1604	Kunnamangalam	kunnamangalam	area	27	11.3050000	75.8760000	t	f	2026-05-12 12:20:50.93547	2026-05-12 12:20:50.93547	global
1605	Wayanad	wayanad	area	27	11.6854000	76.1320000	t	f	2026-05-12 12:20:51.203791	2026-05-12 12:20:51.203791	global
1606	Kalpetta	kalpetta	area	27	11.6087000	76.0820000	t	f	2026-05-12 12:20:51.467812	2026-05-12 12:20:51.467812	global
1607	Mananthavady	mananthavady	area	27	11.8047000	76.0063000	t	f	2026-05-12 12:20:51.728041	2026-05-12 12:20:51.728041	global
1608	Sulthan Bathery	sulthan-bathery	area	27	11.6650000	76.2700000	t	f	2026-05-12 12:20:51.993248	2026-05-12 12:20:51.993248	global
1609	Meppadi	meppadi	area	27	11.5500000	76.1167000	t	f	2026-05-12 12:20:52.255576	2026-05-12 12:20:52.255576	global
1610	Vythiri	vythiri	area	27	11.5381000	76.0451000	t	f	2026-05-12 12:20:52.517637	2026-05-12 12:20:52.517637	global
1611	Kannur	kannur	area	27	11.8745000	75.3704000	t	f	2026-05-12 12:20:52.778693	2026-05-12 12:20:52.778693	global
1612	Thalassery	thalassery	area	27	11.7510000	75.4921000	t	f	2026-05-12 12:20:53.04103	2026-05-12 12:20:53.04103	global
1613	Payyannur	payyannur	area	27	12.0930000	75.2020000	t	f	2026-05-12 12:20:53.303148	2026-05-12 12:20:53.303148	global
1614	Mattannur	mattannur	area	27	11.9270000	75.5750000	t	f	2026-05-12 12:20:53.563023	2026-05-12 12:20:53.563023	global
1615	Iritty	iritty	area	27	11.9796000	75.6755000	t	f	2026-05-12 12:20:53.824288	2026-05-12 12:20:53.824288	global
1616	Koothuparamba	koothuparamba	area	27	11.7940000	75.5650000	t	f	2026-05-12 12:20:54.092441	2026-05-12 12:20:54.092441	global
1617	Kannur Town	kannur-town	area	27	11.8745000	75.3704000	t	f	2026-05-12 12:20:54.355705	2026-05-12 12:20:54.355705	global
1618	Kasaragod	kasaragod	area	27	12.4984000	74.9896000	t	f	2026-05-12 12:20:54.619882	2026-05-12 12:20:54.619882	global
1619	Kanhangad	kanhangad	area	27	12.3320000	75.0866000	t	f	2026-05-12 12:20:54.886011	2026-05-12 12:20:54.886011	global
1620	Nileshwaram	nileshwaram	area	27	12.2565000	75.1321000	t	f	2026-05-12 12:20:55.147253	2026-05-12 12:20:55.147253	global
1621	Uppala	uppala	area	27	12.6715000	74.9979000	t	f	2026-05-12 12:20:55.408397	2026-05-12 12:20:55.408397	global
1622	Cheruvathur	cheruvathur	area	27	12.2990000	75.1000000	t	f	2026-05-12 12:20:55.673732	2026-05-12 12:20:55.673732	global
1623	Manjeshwaram	manjeshwaram	area	27	12.7130000	74.9900000	t	f	2026-05-12 12:20:55.934745	2026-05-12 12:20:55.934745	global
1624	Central Kolkata	central-kolkata	area	28	22.5726000	88.3639000	t	f	2026-05-12 12:20:56.197923	2026-05-12 12:20:56.197923	global
1625	Esplanade	esplanade	area	28	22.5667000	88.3530000	t	f	2026-05-12 12:20:56.463313	2026-05-12 12:20:56.463313	global
1626	Dharmatala	dharmatala	area	28	22.5565000	88.3529000	t	f	2026-05-12 12:20:56.724315	2026-05-12 12:20:56.724315	global
1627	Bowbazar	bowbazar	area	28	22.5676000	88.3629000	t	f	2026-05-12 12:20:56.986356	2026-05-12 12:20:56.986356	global
1628	Burrabazar	burrabazar	area	28	22.5745000	88.3556000	t	f	2026-05-12 12:20:57.249489	2026-05-12 12:20:57.249489	global
1629	Chandni Chowk (Kolkata)	chandni-chowk-kolkata	area	28	22.5851000	88.3570000	t	f	2026-05-12 12:20:57.511634	2026-05-12 12:20:57.511634	global
1630	Entally	entally	area	28	22.5650000	88.3660000	t	f	2026-05-12 12:20:57.77279	2026-05-12 12:20:57.77279	global
1631	Park Street	park-street	area	28	22.5520000	88.3530000	t	f	2026-05-12 12:20:58.031828	2026-05-12 12:20:58.031828	global
1632	Shakespeare Sarani	shakespeare-sarani	area	28	22.5486000	88.3493000	t	f	2026-05-12 12:20:58.293041	2026-05-12 12:20:58.293041	global
1633	Taltala	taltala	area	28	22.5609000	88.3578000	t	f	2026-05-12 12:20:58.553261	2026-05-12 12:20:58.553261	global
1634	Colootola	colootola	area	28	22.5667000	88.3639000	t	f	2026-05-12 12:20:58.814262	2026-05-12 12:20:58.814262	global
1635	New Market Area	new-market-area	area	28	22.5750000	88.3620000	t	f	2026-05-12 12:20:59.080239	2026-05-12 12:20:59.080239	global
1636	Sudder Street	sudder-street	area	28	22.5575000	88.3510000	t	f	2026-05-12 12:20:59.341561	2026-05-12 12:20:59.341561	global
1637	North Kolkata	north-kolkata	area	28	22.6010000	88.3870000	t	f	2026-05-12 12:20:59.603757	2026-05-12 12:20:59.603757	global
1638	Shyambazar	shyambazar	area	28	22.6047000	88.3729000	t	f	2026-05-12 12:20:59.865005	2026-05-12 12:20:59.865005	global
1639	Bagbazar	bagbazar	area	28	22.6010000	88.3604000	t	f	2026-05-12 12:21:00.127524	2026-05-12 12:21:00.127524	global
1640	Maniktala	maniktala	area	28	22.5757000	88.3733000	t	f	2026-05-12 12:21:00.389199	2026-05-12 12:21:00.389199	global
1641	Kankurgachi	kankurgachi	area	28	22.5819000	88.3953000	t	f	2026-05-12 12:21:00.65034	2026-05-12 12:21:00.65034	global
1642	Ultadanga	ultadanga	area	28	22.5946000	88.3946000	t	f	2026-05-12 12:21:00.914586	2026-05-12 12:21:00.914586	global
1643	Belgachia	belgachia	area	28	22.6050000	88.3740000	t	f	2026-05-12 12:21:01.176647	2026-05-12 12:21:01.176647	global
1644	Dum Dum	dum-dum	area	28	22.6330000	88.4210000	t	f	2026-05-12 12:21:01.445154	2026-05-12 12:21:01.445154	global
1645	Nagerbazar	nagerbazar	area	28	22.6138000	88.3823000	t	f	2026-05-12 12:21:01.708113	2026-05-12 12:21:01.708113	global
1646	Laketown	laketown	area	28	22.5244000	88.4089000	t	f	2026-05-12 12:21:01.977488	2026-05-12 12:21:01.977488	global
1647	Baranagar	baranagar	area	28	22.6361000	88.3740000	t	f	2026-05-12 12:21:02.239524	2026-05-12 12:21:02.239524	global
1648	Sinthee	sinthee	area	28	22.6200000	88.3900000	t	f	2026-05-12 12:21:02.501729	2026-05-12 12:21:02.501729	global
1649	Cossipore	cossipore	area	28	22.6199000	88.3793000	t	f	2026-05-12 12:21:02.76095	2026-05-12 12:21:02.76095	global
1650	Chitpur	chitpur	area	28	22.5999000	88.3526000	t	f	2026-05-12 12:21:03.028182	2026-05-12 12:21:03.028182	global
1651	Rajabazar	rajabazar	area	28	22.5448000	88.3702000	t	f	2026-05-12 12:21:03.288137	2026-05-12 12:21:03.288137	global
1652	Amherst Street	amherst-street	area	28	22.5726000	88.3639000	t	f	2026-05-12 12:21:03.548472	2026-05-12 12:21:03.548472	global
1653	Sealdah	sealdah	area	28	22.5676000	88.3702000	t	f	2026-05-12 12:21:03.808507	2026-05-12 12:21:03.808507	global
1654	Beadon Street	beadon-street	area	28	22.5753000	88.3556000	t	f	2026-05-12 12:21:04.070728	2026-05-12 12:21:04.070728	global
1655	Girish Park	girish-park	area	28	22.5985000	88.3697000	t	f	2026-05-12 12:21:04.335915	2026-05-12 12:21:04.335915	global
1656	College Street	college-street	area	28	22.5726000	88.3639000	t	f	2026-05-12 12:21:04.598021	2026-05-12 12:21:04.598021	global
1657	Hatibagan	hatibagan	area	28	22.6035000	88.3708000	t	f	2026-05-12 12:21:04.857075	2026-05-12 12:21:04.857075	global
1658	Sovabazar	sovabazar	area	28	22.5905000	88.3650000	t	f	2026-05-12 12:21:05.116188	2026-05-12 12:21:05.116188	global
1659	Tala	tala	area	28	22.5747000	88.3967000	t	f	2026-05-12 12:21:05.376475	2026-05-12 12:21:05.376475	global
1660	South Kolkata	south-kolkata	area	28	22.5000000	88.3667000	t	f	2026-05-12 12:21:05.639478	2026-05-12 12:21:05.639478	global
1661	Ballygunge	ballygunge	area	28	22.5210000	88.3639000	t	f	2026-05-12 12:21:05.90058	2026-05-12 12:21:05.90058	global
1662	Gariahat	gariahat	area	28	22.5158000	88.3697000	t	f	2026-05-12 12:21:06.168934	2026-05-12 12:21:06.168934	global
1663	Dhakuria	dhakuria	area	28	22.5065000	88.3702000	t	f	2026-05-12 12:21:06.433053	2026-05-12 12:21:06.433053	global
1664	Jadavpur	jadavpur	area	28	22.4990000	88.3710000	t	f	2026-05-12 12:21:06.692133	2026-05-12 12:21:06.692133	global
1665	Tollygunge	tollygunge	area	28	22.5000000	88.3333000	t	f	2026-05-12 12:21:06.9523	2026-05-12 12:21:06.9523	global
1666	Behala	behala	area	28	22.4980000	88.3290000	t	f	2026-05-12 12:21:07.21241	2026-05-12 12:21:07.21241	global
1667	New Alipore	new-alipore	area	28	22.5118000	88.3218000	t	f	2026-05-12 12:21:07.476462	2026-05-12 12:21:07.476462	global
1668	Rashbehari	rashbehari	area	28	22.5096000	88.3649000	t	f	2026-05-12 12:21:07.740769	2026-05-12 12:21:07.740769	global
1669	Lansdowne	lansdowne	area	28	22.5376000	88.3430000	t	f	2026-05-12 12:21:08.001425	2026-05-12 12:21:08.001425	global
1670	Bansdroni	bansdroni	area	28	22.4722000	88.3628000	t	f	2026-05-12 12:21:08.259956	2026-05-12 12:21:08.259956	global
1671	Naktala	naktala	area	28	22.4735000	88.3648000	t	f	2026-05-12 12:21:08.523052	2026-05-12 12:21:08.523052	global
1672	Santoshpur	santoshpur	area	28	22.4975000	88.3912000	t	f	2026-05-12 12:21:08.785209	2026-05-12 12:21:08.785209	global
1673	Kasba	kasba	area	28	22.5194000	88.3633000	t	f	2026-05-12 12:21:09.046365	2026-05-12 12:21:09.046365	global
1674	Golf Green	golf-green	area	28	22.4900000	88.3400000	t	f	2026-05-12 12:21:09.309571	2026-05-12 12:21:09.309571	global
1675	Lake Gardens	lake-gardens	area	28	22.5167000	88.3667000	t	f	2026-05-12 12:21:09.570706	2026-05-12 12:21:09.570706	global
1676	Jodhpur Park	jodhpur-park	area	28	22.5132000	88.3675000	t	f	2026-05-12 12:21:09.830767	2026-05-12 12:21:09.830767	global
1677	Kalighat	kalighat	area	28	22.5176000	88.3708000	t	f	2026-05-12 12:21:10.09215	2026-05-12 12:21:10.09215	global
1678	Chetla	chetla	area	28	22.5170000	88.3300000	t	f	2026-05-12 12:21:10.352191	2026-05-12 12:21:10.352191	global
1679	East Kolkata	east-kolkata	area	28	22.5626000	88.4000000	t	f	2026-05-12 12:21:10.616347	2026-05-12 12:21:10.616347	global
1680	Salt Lake City (Bidhannagar)	salt-lake-city-bidhannagar	area	28	22.5850000	88.4144000	t	f	2026-05-12 12:21:10.877645	2026-05-12 12:21:10.877645	global
1681	Sector I	sector-i	area	28	22.5676000	88.4010000	t	f	2026-05-12 12:21:11.140679	2026-05-12 12:21:11.140679	global
1682	Sector II	sector-ii	area	28	22.5726000	88.3639000	t	f	2026-05-12 12:21:11.401745	2026-05-12 12:21:11.401745	global
1683	Sector III	sector-iii	area	28	22.5726000	88.3639000	t	f	2026-05-12 12:21:11.660902	2026-05-12 12:21:11.660902	global
1684	Sector V (IT Hub)	sector-v-it-hub	area	28	22.5726000	88.3639000	t	f	2026-05-12 12:21:11.926055	2026-05-12 12:21:11.926055	global
1685	New Town	new-town	area	28	22.5847000	88.4798000	t	f	2026-05-12 12:21:12.186172	2026-05-12 12:21:12.186172	global
1686	Action Area I	action-area-i	area	28	22.5788000	88.3555000	t	f	2026-05-12 12:21:12.44726	2026-05-12 12:21:12.44726	global
1687	Action Area II	action-area-ii	area	28	22.5636000	88.4300000	t	f	2026-05-12 12:21:12.707434	2026-05-12 12:21:12.707434	global
1688	Action Area III	action-area-iii	area	28	22.5090000	88.4090000	t	f	2026-05-12 12:21:12.967576	2026-05-12 12:21:12.967576	global
1689	Rajarhat	rajarhat	area	28	22.6220000	88.4819000	t	f	2026-05-12 12:21:13.226714	2026-05-12 12:21:13.226714	global
1690	Baguiati	baguiati	area	28	22.6167000	88.4250000	t	f	2026-05-12 12:21:13.488687	2026-05-12 12:21:13.488687	global
1691	Teghoria	teghoria	area	28	22.5990000	88.4080000	t	f	2026-05-12 12:21:13.750896	2026-05-12 12:21:13.750896	global
1692	Chinar Park	chinar-park	area	28	22.6167000	88.4333000	t	f	2026-05-12 12:21:14.011987	2026-05-12 12:21:14.011987	global
1693	Kaikhali	kaikhali	area	28	22.6360000	88.4330000	t	f	2026-05-12 12:21:14.273222	2026-05-12 12:21:14.273222	global
1694	Kestopur	kestopur	area	28	22.6130000	88.4230000	t	f	2026-05-12 12:21:14.536416	2026-05-12 12:21:14.536416	global
1695	Mukundapur	mukundapur	area	28	22.4800000	88.4000000	t	f	2026-05-12 12:21:14.795391	2026-05-12 12:21:14.795391	global
1696	Ruby Crossing Area	ruby-crossing-area	area	28	22.5726000	88.3639000	t	f	2026-05-12 12:21:15.0571	2026-05-12 12:21:15.0571	global
1697	Madurdaha	madurdaha	area	28	22.5075000	88.4077000	t	f	2026-05-12 12:21:15.320249	2026-05-12 12:21:15.320249	global
1698	Panchasayar	panchasayar	area	28	22.4865000	88.3929000	t	f	2026-05-12 12:21:15.588787	2026-05-12 12:21:15.588787	global
1699	West Kolkata	west-kolkata	area	28	22.5626000	88.3400000	t	f	2026-05-12 12:21:15.8538	2026-05-12 12:21:15.8538	global
1700	Howrah (adjacent urban zone)	howrah-adjacent-urban-zone	area	28	22.5958000	88.2636000	t	f	2026-05-12 12:21:16.113919	2026-05-12 12:21:16.113919	global
1701	Shibpur	shibpur	area	28	22.5926000	88.3058000	t	f	2026-05-12 12:21:16.376189	2026-05-12 12:21:16.376189	global
1702	Santragachi	santragachi	area	28	22.5008000	88.3190000	t	f	2026-05-12 12:21:16.638573	2026-05-12 12:21:16.638573	global
1703	Belur	belur	area	28	22.6329000	88.3507000	t	f	2026-05-12 12:21:16.900381	2026-05-12 12:21:16.900381	global
1704	Liluah	liluah	area	28	22.6333000	88.3333000	t	f	2026-05-12 12:21:17.166615	2026-05-12 12:21:17.166615	global
1705	Bally	bally	area	28	22.5676000	88.3432000	t	f	2026-05-12 12:21:17.426803	2026-05-12 12:21:17.426803	global
1706	Salkia	salkia	area	28	22.5958000	88.3393000	t	f	2026-05-12 12:21:17.695078	2026-05-12 12:21:17.695078	global
1707	Chatterjee Para	chatterjee-para	area	28	22.5726000	88.3639000	t	f	2026-05-12 12:21:17.956147	2026-05-12 12:21:17.956147	global
1708	Botanical Garden Area	botanical-garden-area	area	28	22.5376000	88.3496000	t	f	2026-05-12 12:21:18.217236	2026-05-12 12:21:18.217236	global
1709	Old Historic Areas	old-historic-areas	area	28	22.5726000	88.3639000	t	f	2026-05-12 12:21:18.477416	2026-05-12 12:21:18.477416	global
1710	Kumartuli	kumartuli	area	28	22.6048000	88.3588000	t	f	2026-05-12 12:21:18.739613	2026-05-12 12:21:18.739613	global
1711	Pottery Town	pottery-town	area	28	22.5745000	88.3639000	t	f	2026-05-12 12:21:19.003763	2026-05-12 12:21:19.003763	global
1712	Burrabazar Market Belt	burrabazar-market-belt	area	28	22.5756000	88.3600000	t	f	2026-05-12 12:21:19.264816	2026-05-12 12:21:19.264816	global
1713	Jorasanko	jorasanko	area	28	22.5762000	88.3639000	t	f	2026-05-12 12:21:19.531017	2026-05-12 12:21:19.531017	global
1714	Pathuriaghata	pathuriaghata	area	28	22.5897000	88.3629000	t	f	2026-05-12 12:21:19.793684	2026-05-12 12:21:19.793684	global
1715	Bow Barracks	bow-barracks	area	28	22.5735000	88.3660000	t	f	2026-05-12 12:21:20.053408	2026-05-12 12:21:20.053408	global
1716	Metiabruz	metiabruz	area	28	22.5360000	88.2730000	t	f	2026-05-12 12:21:20.314478	2026-05-12 12:21:20.314478	global
1717	Garden Reach	garden-reach	area	28	22.5320000	88.3173000	t	f	2026-05-12 12:21:20.578252	2026-05-12 12:21:20.578252	global
1718	Kidderpore	kidderpore	area	28	22.5481000	88.2896000	t	f	2026-05-12 12:21:20.837594	2026-05-12 12:21:20.837594	global
1719	Khidderpore Dock area	khidderpore-dock-area	area	28	22.5405000	88.3218000	t	f	2026-05-12 12:21:21.098759	2026-05-12 12:21:21.098759	global
1720	Industrial / Dock Areas	industrial-dock-areas	area	28	22.5448000	88.3166000	t	f	2026-05-12 12:21:21.362038	2026-05-12 12:21:21.362038	global
1721	Taratala	taratala	area	28	22.5125000	88.3112000	t	f	2026-05-12 12:21:21.623241	2026-05-12 12:21:21.623241	global
1722	Maheshtala	maheshtala	area	28	22.5030000	88.2350000	t	f	2026-05-12 12:21:21.883396	2026-05-12 12:21:21.883396	global
1723	Port Trust Area	port-trust-area	area	28	22.5448000	88.3206000	t	f	2026-05-12 12:21:22.149398	2026-05-12 12:21:22.149398	global
1724	Khidderpore Dock	khidderpore-dock	area	28	22.5486000	88.2930000	t	f	2026-05-12 12:21:22.409491	2026-05-12 12:21:22.409491	global
1725	Budge Budge Industrial Zone	budge-budge-industrial-zone	area	28	22.4833000	88.1833000	t	f	2026-05-12 12:21:22.671749	2026-05-12 12:21:22.671749	global
1726	Kolkata Metropolitan Localities (KMA Zone – Part of District Urban Belt)	kolkata-metropolitan-localities-kma-zone-part-of-district-urban-belt	area	28	22.5726000	88.3639000	t	f	2026-05-12 12:21:22.935014	2026-05-12 12:21:22.935014	global
1727	Barasat	barasat	area	28	22.7200000	88.4800000	t	f	2026-05-12 12:21:23.194933	2026-05-12 12:21:23.194933	global
1728	Madhyamgram	madhyamgram	area	28	22.6997000	88.4462000	t	f	2026-05-12 12:21:23.457188	2026-05-12 12:21:23.457188	global
1729	Barrackpore	barrackpore	area	28	22.7679000	88.3670000	t	f	2026-05-12 12:21:23.717362	2026-05-12 12:21:23.717362	global
1730	Sodepur	sodepur	area	28	22.6945000	88.3781000	t	f	2026-05-12 12:21:23.985552	2026-05-12 12:21:23.985552	global
1731	Konnagar	konnagar	area	28	22.7000000	88.3000000	t	f	2026-05-12 12:21:24.247626	2026-05-12 12:21:24.247626	global
1732	Uttarpara	uttarpara	area	28	22.6735000	88.3488000	t	f	2026-05-12 12:21:24.511847	2026-05-12 12:21:24.511847	global
1733	Chandannagar (extended metro region)	chandannagar-extended-metro-region	area	28	22.8990000	88.3930000	t	f	2026-05-12 12:21:24.773037	2026-05-12 12:21:24.773037	global
1734	Serampore	serampore	area	28	22.7492000	88.3424000	t	f	2026-05-12 12:21:25.033151	2026-05-12 12:21:25.033151	global
1735	Rishra	rishra	area	28	22.7100000	88.3470000	t	f	2026-05-12 12:21:25.301748	2026-05-12 12:21:25.301748	global
1736	Central & Urban Lucknow	central-urban-lucknow	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:25.56413	2026-05-12 12:21:25.56413	global
1737	Local Areas of Lucknow	local-areas-of-lucknow	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:25.823881	2026-05-12 12:21:25.823881	global
1738	Hazratganj	hazratganj	area	11	26.8470000	80.9470000	t	f	2026-05-12 12:21:26.086011	2026-05-12 12:21:26.086011	global
1739	Aminabad	aminabad	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:26.35129	2026-05-12 12:21:26.35129	global
1740	Charbagh	charbagh	area	11	26.8510000	80.9257000	t	f	2026-05-12 12:21:26.611251	2026-05-12 12:21:26.611251	global
1741	Kaiserbagh	kaiserbagh	area	11	26.8530000	80.9410000	t	f	2026-05-12 12:21:26.876628	2026-05-12 12:21:26.876628	global
1742	Lalbagh	lalbagh	area	11	26.8330000	80.9230000	t	f	2026-05-12 12:21:27.136761	2026-05-12 12:21:27.136761	global
1743	Husainganj	husainganj	area	11	26.8558000	80.9450000	t	f	2026-05-12 12:21:27.397757	2026-05-12 12:21:27.397757	global
1744	Alambagh	alambagh	area	11	26.8231000	80.9189000	t	f	2026-05-12 12:21:27.659975	2026-05-12 12:21:27.659975	global
1745	Aliganj	aliganj	area	11	26.9006000	80.9783000	t	f	2026-05-12 12:21:27.920011	2026-05-12 12:21:27.920011	global
1746	Thakurganj	thakurganj	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:28.183694	2026-05-12 12:21:28.183694	global
1747	Rajajipuram	rajajipuram	area	11	26.8667000	80.9142000	t	f	2026-05-12 12:21:28.446257	2026-05-12 12:21:28.446257	global
1748	Aishbagh	aishbagh	area	11	26.8439000	80.9295000	t	f	2026-05-12 12:21:28.708674	2026-05-12 12:21:28.708674	global
1749	Nishatganj	nishatganj	area	11	26.8770000	80.9794000	t	f	2026-05-12 12:21:28.969253	2026-05-12 12:21:28.969253	global
1750	Daliganj	daliganj	area	11	26.8887000	80.9490000	t	f	2026-05-12 12:21:29.232382	2026-05-12 12:21:29.232382	global
1751	Golaganj	golaganj	area	11	26.8646000	80.9435000	t	f	2026-05-12 12:21:29.498546	2026-05-12 12:21:29.498546	global
1752	Yahiyaganj	yahiyaganj	area	11	26.8712000	80.9167000	t	f	2026-05-12 12:21:29.758943	2026-05-12 12:21:29.758943	global
1753	Naka Hindola	naka-hindola	area	11	26.8647000	80.9165000	t	f	2026-05-12 12:21:30.017317	2026-05-12 12:21:30.017317	global
1754	Wazirganj	wazirganj	area	11	26.8790000	80.8988000	t	f	2026-05-12 12:21:30.280296	2026-05-12 12:21:30.280296	global
1755	Gomti Nagar	gomti-nagar	area	11	26.8619000	80.9990000	t	f	2026-05-12 12:21:30.540428	2026-05-12 12:21:30.540428	global
1756	Gomti Nagar Extension	gomti-nagar-extension	area	11	26.8550000	80.9990000	t	f	2026-05-12 12:21:30.81076	2026-05-12 12:21:30.81076	global
1757	Vibhuti Khand	vibhuti-khand	area	11	26.8430000	81.0170000	t	f	2026-05-12 12:21:31.071936	2026-05-12 12:21:31.071936	global
1758	Vipul Khand	vipul-khand	area	11	26.8625000	81.0040000	t	f	2026-05-12 12:21:31.334378	2026-05-12 12:21:31.334378	global
1759	Viram Khand	viram-khand	area	11	26.4489000	80.9801000	t	f	2026-05-12 12:21:31.597195	2026-05-12 12:21:31.597195	global
1760	Vishesh Khand	vishesh-khand	area	11	26.8548000	80.9950000	t	f	2026-05-12 12:21:31.860412	2026-05-12 12:21:31.860412	global
1761	Vinay Khand	vinay-khand	area	11	26.8667000	80.9719000	t	f	2026-05-12 12:21:32.120452	2026-05-12 12:21:32.120452	global
1762	Vineet Khand	vineet-khand	area	11	26.8838000	80.9965000	t	f	2026-05-12 12:21:32.381755	2026-05-12 12:21:32.381755	global
1763	Virat Khand	virat-khand	area	11	26.8858000	81.0040000	t	f	2026-05-12 12:21:32.645824	2026-05-12 12:21:32.645824	global
1764	Vaibhav Khand	vaibhav-khand	area	11	26.8750000	81.1100000	t	f	2026-05-12 12:21:32.908827	2026-05-12 12:21:32.908827	global
1765	Vastu Khand	vastu-khand	area	11	26.8700000	80.9960000	t	f	2026-05-12 12:21:33.169051	2026-05-12 12:21:33.169051	global
1766	Patrakarpuram	patrakarpuram	area	11	26.8745000	80.9812000	t	f	2026-05-12 12:21:33.432217	2026-05-12 12:21:33.432217	global
1767	Indira Nagar	indira-nagar	area	11	26.8746000	81.0122000	t	f	2026-05-12 12:21:33.694438	2026-05-12 12:21:33.694438	global
1768	Faizabad Road Belt	faizabad-road-belt	area	11	26.8840000	81.0200000	t	f	2026-05-12 12:21:33.957626	2026-05-12 12:21:33.957626	global
1769	Munshi Pulia	munshi-pulia	area	11	26.8906000	80.9982000	t	f	2026-05-12 12:21:34.218871	2026-05-12 12:21:34.218871	global
1770	Lekhraj Market	lekhraj-market	area	11	26.8950000	80.9540000	t	f	2026-05-12 12:21:34.481933	2026-05-12 12:21:34.481933	global
1771	Nehru Enclave	nehru-enclave	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:34.744034	2026-05-12 12:21:34.744034	global
1772	Takrohi	takrohi	area	11	26.8525000	81.0210000	t	f	2026-05-12 12:21:35.00439	2026-05-12 12:21:35.00439	global
1773	Khurram Nagar	khurram-nagar	area	11	26.9053000	80.9937000	t	f	2026-05-12 12:21:35.264515	2026-05-12 12:21:35.264515	global
1774	Mahanagar	mahanagar	area	11	26.8912000	80.9835000	t	f	2026-05-12 12:21:35.526477	2026-05-12 12:21:35.526477	global
1775	Jankipuram	jankipuram	area	11	26.9000000	80.9500000	t	f	2026-05-12 12:21:35.787323	2026-05-12 12:21:35.787323	global
1776	Jankipuram Extension	jankipuram-extension	area	11	26.9056000	80.9709000	t	f	2026-05-12 12:21:36.047587	2026-05-12 12:21:36.047587	global
1777	Engineering College Chauraha	engineering-college-chauraha	area	11	26.8728000	80.9948000	t	f	2026-05-12 12:21:36.310708	2026-05-12 12:21:36.310708	global
1778	Vikas Nagar	vikas-nagar	area	11	26.8670000	80.9230000	t	f	2026-05-12 12:21:36.571794	2026-05-12 12:21:36.571794	global
1779	Sector H Aliganj	sector-h-aliganj	area	11	26.8931000	80.9959000	t	f	2026-05-12 12:21:36.832868	2026-05-12 12:21:36.832868	global
1780	Sector K Aliganj	sector-k-aliganj	area	11	26.8919000	80.9783000	t	f	2026-05-12 12:21:37.099073	2026-05-12 12:21:37.099073	global
1781	Kapoorthala	kapoorthala	area	11	26.8846000	80.9760000	t	f	2026-05-12 12:21:37.360231	2026-05-12 12:21:37.360231	global
1782	Tedhi Puliya	tedhi-puliya	area	11	26.8959000	80.9311000	t	f	2026-05-12 12:21:37.620679	2026-05-12 12:21:37.620679	global
1784	Kanpur Road	kanpur-road	area	11	26.7924000	80.8852000	t	f	2026-05-12 12:21:38.145733	2026-05-12 12:21:38.145733	global
1785	Telibagh	telibagh	area	11	26.8000000	80.9750000	t	f	2026-05-12 12:21:38.408894	2026-05-12 12:21:38.408894	global
1786	Ruchi Khand	ruchi-khand	area	11	26.8215000	80.9895000	t	f	2026-05-12 12:21:38.670016	2026-05-12 12:21:38.670016	global
1787	Rajni Khand	rajni-khand	area	11	26.8220000	80.9190000	t	f	2026-05-12 12:21:38.932208	2026-05-12 12:21:38.932208	global
1788	Omaxe City	omaxe-city	area	11	26.8007000	80.9930000	t	f	2026-05-12 12:21:39.193311	2026-05-12 12:21:39.193311	global
1789	Vrindavan Yojna	vrindavan-yojna	area	11	26.7825000	80.9200000	t	f	2026-05-12 12:21:39.454473	2026-05-12 12:21:39.454473	global
1790	South City	south-city	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:39.715541	2026-05-12 12:21:39.715541	global
1791	Amausi	amausi	area	11	26.7608000	80.8860000	t	f	2026-05-12 12:21:39.975642	2026-05-12 12:21:39.975642	global
1792	Amausi Airport	amausi-airport	area	11	26.7606000	80.8960000	t	f	2026-05-12 12:21:40.23673	2026-05-12 12:21:40.23673	global
1793	Cantonment Road	cantonment-road	area	11	26.8500000	80.9500000	t	f	2026-05-12 12:21:40.497916	2026-05-12 12:21:40.497916	global
1794	Arjunganj	arjunganj	area	11	26.7994000	80.9545000	t	f	2026-05-12 12:21:40.758985	2026-05-12 12:21:40.758985	global
1795	Nakhas	nakhas	area	11	26.8570000	80.9120000	t	f	2026-05-12 12:21:41.024217	2026-05-12 12:21:41.024217	global
1796	Shahganj	shahganj	area	11	26.8813000	81.0000000	t	f	2026-05-12 12:21:41.28786	2026-05-12 12:21:41.28786	global
1797	Saadatganj	saadatganj	area	11	26.8733000	80.8937000	t	f	2026-05-12 12:21:41.547661	2026-05-12 12:21:41.547661	global
1798	Raebareli Road	raebareli-road	area	11	26.7407000	80.9417000	t	f	2026-05-12 12:21:41.817029	2026-05-12 12:21:41.817029	global
1799	Qaiserbagh	qaiserbagh	area	11	26.8505000	80.9230000	t	f	2026-05-12 12:21:42.079036	2026-05-12 12:21:42.079036	global
1800	Machchhi Bhawan	machchhi-bhawan	area	11	26.8725000	80.9078000	t	f	2026-05-12 12:21:42.33818	2026-05-12 12:21:42.33818	global
1801	Jama Masjid Area	jama-masjid-area	area	11	26.8680000	80.9006000	t	f	2026-05-12 12:21:42.598311	2026-05-12 12:21:42.598311	global
1802	Bada Imambara Area	bada-imambara-area	area	11	26.8838000	80.9120000	t	f	2026-05-12 12:21:42.858302	2026-05-12 12:21:42.858302	global
1803	Akbari Gate	akbari-gate	area	11	26.8695000	80.9161000	t	f	2026-05-12 12:21:43.118572	2026-05-12 12:21:43.118572	global
1804	Kukrail	kukrail	area	11	26.8947000	80.9989000	t	f	2026-05-12 12:21:43.379592	2026-05-12 12:21:43.379592	global
1805	Polytechnic Chauraha	polytechnic-chauraha	area	11	26.8986000	80.9304000	t	f	2026-05-12 12:21:43.639602	2026-05-12 12:21:43.639602	global
1806	Faizabad Road	faizabad-road	area	11	26.9050000	80.9940000	t	f	2026-05-12 12:21:43.902965	2026-05-12 12:21:43.902965	global
1807	Chinhat	chinhat	area	11	26.9485000	80.9990000	t	f	2026-05-12 12:21:44.172131	2026-05-12 12:21:44.172131	global
1808	Matiyari	matiyari	area	11	26.8625000	81.0017000	t	f	2026-05-12 12:21:44.435598	2026-05-12 12:21:44.435598	global
1809	Kamta	kamta	area	11	26.8756000	81.0064000	t	f	2026-05-12 12:21:44.696537	2026-05-12 12:21:44.696537	global
1810	Deva Road	deva-road	area	11	26.8850000	81.0000000	t	f	2026-05-12 12:21:44.962668	2026-05-12 12:21:44.962668	global
1811	Malihabad	malihabad	area	11	26.9300000	80.7100000	t	f	2026-05-12 12:21:45.22578	2026-05-12 12:21:45.22578	global
1812	Kakori	kakori	area	11	26.9028000	80.7815000	t	f	2026-05-12 12:21:45.489117	2026-05-12 12:21:45.489117	global
1813	Mohanlalganj	mohanlalganj	area	11	26.6500000	80.8833000	t	f	2026-05-12 12:21:45.761417	2026-05-12 12:21:45.761417	global
1814	Gosainganj	gosainganj	area	11	26.7280000	80.9180000	t	f	2026-05-12 12:21:46.02673	2026-05-12 12:21:46.02673	global
1815	Itaunja	itaunja	area	11	26.9970000	80.9500000	t	f	2026-05-12 12:21:46.291989	2026-05-12 12:21:46.291989	global
1816	Bakshi Ka Talab	bakshi-ka-talab	area	11	26.9980000	80.9360000	t	f	2026-05-12 12:21:46.551976	2026-05-12 12:21:46.551976	global
1817	Nigoha	nigoha	area	11	26.7500000	81.0000000	t	f	2026-05-12 12:21:46.812286	2026-05-12 12:21:46.812286	global
1818	Sarsawan	sarsawan	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:47.075167	2026-05-12 12:21:47.075167	global
1819	Kankaha	kankaha	area	11	26.7500000	80.9500000	t	f	2026-05-12 12:21:47.367089	2026-05-12 12:21:47.367089	global
1820	Banthra	banthra	area	11	26.7808000	80.8700000	t	f	2026-05-12 12:21:47.626357	2026-05-12 12:21:47.626357	global
1821	Nawabganj	nawabganj	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:47.887457	2026-05-12 12:21:47.887457	global
1822	Miranpur	miranpur	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:48.151488	2026-05-12 12:21:48.151488	global
1823	Kalli Paschim	kalli-paschim	area	11	26.8670000	80.9830000	t	f	2026-05-12 12:21:48.418754	2026-05-12 12:21:48.418754	global
1824	Kalli Purab	kalli-purab	area	11	26.8500000	80.9500000	t	f	2026-05-12 12:21:48.690344	2026-05-12 12:21:48.690344	global
1825	Aurangabad	aurangabad	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:48.951427	2026-05-12 12:21:48.951427	global
1826	Rehna	rehna	area	11	26.8467000	80.9462000	t	f	2026-05-12 12:21:49.212376	2026-05-12 12:21:49.212376	global
1827	Safedabad	safedabad	area	11	26.8155000	80.9462000	t	f	2026-05-12 12:21:49.607749	2026-05-12 12:21:49.607749	global
1828	Shaheed Path	shaheed-path	area	11	26.7855000	81.0190000	t	f	2026-05-12 12:21:50.910375	2026-05-12 12:21:50.910375	global
1829	Sushant Golf City	sushant-golf-city	area	11	26.7700000	80.9600000	t	f	2026-05-12 12:21:51.172304	2026-05-12 12:21:51.172304	global
1830	Ansal API	ansal-api	area	11	26.7815000	80.9645000	t	f	2026-05-12 12:21:51.435562	2026-05-12 12:21:51.435562	global
1831	Amar Shaheed Path	amar-shaheed-path	area	11	26.8090000	80.9585000	t	f	2026-05-12 12:21:51.697825	2026-05-12 12:21:51.697825	global
1832	Kisan Path	kisan-path	area	11	26.8500000	80.9500000	t	f	2026-05-12 12:21:51.963926	2026-05-12 12:21:51.963926	global
1833	Ahmamau	ahmamau	area	11	26.8487000	80.9462000	t	f	2026-05-12 12:21:52.226248	2026-05-12 12:21:52.226248	global
1834	Mohan Road	mohan-road	area	11	26.8436000	80.9169000	t	f	2026-05-12 12:21:52.504725	2026-05-12 12:21:52.504725	global
1835	Hardoi Road	hardoi-road	area	11	26.8800000	80.9200000	t	f	2026-05-12 12:21:52.779358	2026-05-12 12:21:52.779358	global
1836	Mirzapur Nagar	mirzapur-nagar	area	14	25.1458000	82.5669000	t	f	2026-05-12 12:21:53.047514	2026-05-12 12:21:53.047514	global
1837	Vindhyachal	vindhyachal	area	14	25.1340000	82.5700000	t	f	2026-05-12 12:21:53.317813	2026-05-12 12:21:53.317813	global
1838	Laldiggi	laldiggi	area	14	25.1460000	82.5790000	t	f	2026-05-12 12:21:53.611809	2026-05-12 12:21:53.611809	global
1839	Gadaura	gadaura	area	14	25.1450000	82.5800000	t	f	2026-05-12 12:21:53.886281	2026-05-12 12:21:53.886281	global
1840	Wellesley Ganj	wellesley-ganj	area	14	25.1450000	82.5875000	t	f	2026-05-12 12:21:54.149353	2026-05-12 12:21:54.149353	global
1841	Rajgarh	rajgarh	area	14	25.1440000	82.5646000	t	f	2026-05-12 12:21:54.412538	2026-05-12 12:21:54.412538	global
1842	Ahraura Road	ahraura-road	area	14	25.1440000	82.5780000	t	f	2026-05-12 12:21:54.673658	2026-05-12 12:21:54.673658	global
1843	Kantit	kantit	area	14	25.1486000	82.5846000	t	f	2026-05-12 12:21:54.936884	2026-05-12 12:21:54.936884	global
1844	Pakka Pokhra	pakka-pokhra	area	14	25.1450000	82.5680000	t	f	2026-05-12 12:21:55.200014	2026-05-12 12:21:55.200014	global
1845	Sirsia	sirsia	area	14	25.1450000	82.5840000	t	f	2026-05-12 12:21:55.511209	2026-05-12 12:21:55.511209	global
1846	Chillar Nala	chillar-nala	area	14	25.1440000	82.5810000	t	f	2026-05-12 12:21:55.773398	2026-05-12 12:21:55.773398	global
1847	Bharuhana	bharuhana	area	14	25.1450000	82.5670000	t	f	2026-05-12 12:21:56.03973	2026-05-12 12:21:56.03973	global
1848	Jangi Road	jangi-road	area	14	25.1450000	82.5850000	t	f	2026-05-12 12:21:56.315038	2026-05-12 12:21:56.315038	global
1849	Guru Govind Singh Marg	guru-govind-singh-marg	area	14	25.1500000	82.5800000	t	f	2026-05-12 12:21:56.606178	2026-05-12 12:21:56.606178	global
1850	Towns & Nagar Panchayats	towns-nagar-panchayats	area	14	25.1458000	82.5690000	t	f	2026-05-12 12:21:56.869057	2026-05-12 12:21:56.869057	global
1851	Ahraura	ahraura	area	14	24.9890000	83.0190000	t	f	2026-05-12 12:21:57.138454	2026-05-12 12:21:57.138454	global
1852	Chunar	chunar	area	14	25.1278000	83.1048000	t	f	2026-05-12 12:21:57.401583	2026-05-12 12:21:57.401583	global
1853	Marihan	marihan	area	14	24.9720000	82.6140000	t	f	2026-05-12 12:21:57.667851	2026-05-12 12:21:57.667851	global
1854	Majhawan	majhawan	area	14	25.1450000	82.5850000	t	f	2026-05-12 12:21:57.930988	2026-05-12 12:21:57.930988	global
1855	Halia	halia	area	14	25.1520000	82.5810000	t	f	2026-05-12 12:21:58.193176	2026-05-12 12:21:58.193176	global
1856	Vijaypur	vijaypur	area	14	25.1450000	82.5800000	t	f	2026-05-12 12:21:58.452421	2026-05-12 12:21:58.452421	global
1857	Barkachha	barkachha	area	14	25.1320000	82.6030000	t	f	2026-05-12 12:21:58.713397	2026-05-12 12:21:58.713397	global
1858	Kachhwa Road	kachhwa-road	area	14	25.1450000	82.5610000	t	f	2026-05-12 12:21:58.975519	2026-05-12 12:21:58.975519	global
1859	Madanpur	madanpur	area	14	25.1440000	82.5640000	t	f	2026-05-12 12:21:59.236674	2026-05-12 12:21:59.236674	global
1860	Mirzapur Sadar Block	mirzapur-sadar-block	area	14	25.1460000	82.5690000	t	f	2026-05-12 12:21:59.499511	2026-05-12 12:21:59.499511	global
1861	Rajepur	rajepur	area	14	25.1450000	82.5680000	t	f	2026-05-12 12:21:59.761003	2026-05-12 12:21:59.761003	global
1862	Gaipura	gaipura	area	14	25.1450000	82.5640000	t	f	2026-05-12 12:22:00.030319	2026-05-12 12:22:00.030319	global
1863	Jamui	jamui	area	14	25.1458000	82.6109000	t	f	2026-05-12 12:22:00.293475	2026-05-12 12:22:00.293475	global
1864	Chunar Block	chunar-block	area	14	25.1190000	82.8980000	t	f	2026-05-12 12:22:00.557002	2026-05-12 12:22:00.557002	global
1865	Chunar Nagar	chunar-nagar	area	14	25.1278000	82.8928000	t	f	2026-05-12 12:22:00.820766	2026-05-12 12:22:00.820766	global
1866	Majhwan	majhwan	area	14	25.1470000	82.5990000	t	f	2026-05-12 12:22:01.079933	2026-05-12 12:22:01.079933	global
1867	Madhupur	madhupur	area	14	25.1470000	82.5690000	t	f	2026-05-12 12:22:01.340054	2026-05-12 12:22:01.340054	global
1868	Raipura	raipura	area	14	25.1480000	82.5670000	t	f	2026-05-12 12:22:01.602166	2026-05-12 12:22:01.602166	global
1869	Lalganj Block	lalganj-block	area	14	25.1420000	82.4470000	t	f	2026-05-12 12:22:01.863328	2026-05-12 12:22:01.863328	global
1870	Lalganj Bazar	lalganj-bazar	area	14	25.1460000	82.5800000	t	f	2026-05-12 12:22:02.126924	2026-05-12 12:22:02.126924	global
1871	Patehara Kalan	patehara-kalan	area	14	25.1450000	82.5810000	t	f	2026-05-12 12:22:02.388648	2026-05-12 12:22:02.388648	global
1872	Shivdaspur	shivdaspur	area	14	25.1460000	82.5728000	t	f	2026-05-12 12:22:02.655888	2026-05-12 12:22:02.655888	global
1873	Bharahata	bharahata	area	14	25.1480000	82.5800000	t	f	2026-05-12 12:22:02.920963	2026-05-12 12:22:02.920963	global
1874	Marihan Block	marihan-block	area	14	25.1510000	83.1680000	t	f	2026-05-12 12:22:03.182282	2026-05-12 12:22:03.182282	global
1875	Aurahi	aurahi	area	14	25.1440000	82.5644000	t	f	2026-05-12 12:22:03.442359	2026-05-12 12:22:03.442359	global
1876	Beniganj	beniganj	area	14	25.1460000	82.5690000	t	f	2026-05-12 12:22:03.702523	2026-05-12 12:22:03.702523	global
1877	Danti	danti	area	14	25.1450000	82.5590000	t	f	2026-05-12 12:22:03.971792	2026-05-12 12:22:03.971792	global
1878	Padariya	padariya	area	14	25.1440000	82.5600000	t	f	2026-05-12 12:22:04.237981	2026-05-12 12:22:04.237981	global
1879	Kharhar	kharhar	area	14	25.1460000	82.5644000	t	f	2026-05-12 12:22:04.498056	2026-05-12 12:22:04.498056	global
1880	Halia Block	halia-block	area	14	25.1460000	82.5690000	t	f	2026-05-12 12:22:04.7582	2026-05-12 12:22:04.7582	global
1881	Bihasara	bihasara	area	14	25.1450000	82.5960000	t	f	2026-05-12 12:22:05.020449	2026-05-12 12:22:05.020449	global
1882	Gorsara	gorsara	area	14	25.1460000	82.5870000	t	f	2026-05-12 12:22:05.283661	2026-05-12 12:22:05.283661	global
1883	Laxmanpur	laxmanpur	area	14	25.1450000	82.5840000	t	f	2026-05-12 12:22:05.54365	2026-05-12 12:22:05.54365	global
1884	Barihan	barihan	area	14	25.1490000	82.5870000	t	f	2026-05-12 12:22:05.810854	2026-05-12 12:22:05.810854	global
1885	Patehara Khurd	patehara-khurd	area	14	25.1468000	82.5631000	t	f	2026-05-12 12:22:06.072286	2026-05-12 12:22:06.072286	global
1886	Majhawan Block	majhawan-block	area	14	25.0630000	82.6840000	t	f	2026-05-12 12:22:06.335129	2026-05-12 12:22:06.335129	global
1887	Kalwari	kalwari	area	14	25.1450000	82.5850000	t	f	2026-05-12 12:22:06.596427	2026-05-12 12:22:06.596427	global
1888	Pathara	pathara	area	14	25.1460000	82.5760000	t	f	2026-05-12 12:22:06.857419	2026-05-12 12:22:06.857419	global
1889	Rewa Road belt	rewa-road-belt	area	14	25.1445000	82.5653000	t	f	2026-05-12 12:22:07.119703	2026-05-12 12:22:07.119703	global
1890	Semari	semari	area	14	25.1460000	82.5580000	t	f	2026-05-12 12:22:07.380683	2026-05-12 12:22:07.380683	global
1891	Deori Kalan	deori-kalan	area	14	25.1750000	82.5600000	t	f	2026-05-12 12:22:07.644051	2026-05-12 12:22:07.644051	global
1892	Dadri	dadri	area	14	25.0150000	82.5800000	t	f	2026-05-12 12:22:07.907126	2026-05-12 12:22:07.907126	global
1893	Kanchanpur	kanchanpur	area	14	25.1449000	82.7033000	t	f	2026-05-12 12:22:08.172224	2026-05-12 12:22:08.172224	global
1894	Khutar	khutar	area	14	25.0200000	82.5900000	t	f	2026-05-12 12:22:08.442613	2026-05-12 12:22:08.442613	global
1895	Kachwan	kachwan	area	14	25.1080000	83.0850000	t	f	2026-05-12 12:22:08.706837	2026-05-12 12:22:08.706837	global
1896	Damodarpur	damodarpur	area	14	25.1440000	82.5760000	t	f	2026-05-12 12:22:08.97138	2026-05-12 12:22:08.97138	global
1897	Chilh	chilh	area	14	25.1450000	82.5840000	t	f	2026-05-12 12:22:09.230344	2026-05-12 12:22:09.230344	global
1898	Sahijwar	sahijwar	area	14	25.1450000	82.5980000	t	f	2026-05-12 12:22:09.490149	2026-05-12 12:22:09.490149	global
1899	Kaithi	kaithi	area	14	25.1450000	82.5630000	t	f	2026-05-12 12:22:09.759066	2026-05-12 12:22:09.759066	global
1900	Tenua	tenua	area	14	25.1450000	82.5800000	t	f	2026-05-12 12:22:10.023717	2026-05-12 12:22:10.023717	global
1901	Main Areas in Camp	main-areas-in-camp	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:10.283773	2026-05-12 12:22:10.283773	global
1902	MG Road (Mahatma Gandhi Road)	mg-road-mahatma-gandhi-road	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:10.55608	2026-05-12 12:22:10.55608	global
1903	East Street	east-street	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:10.817419	2026-05-12 12:22:10.817419	global
1904	Dastur Meher Road	dastur-meher-road	area	29	18.5100000	73.8530000	t	f	2026-05-12 12:22:11.081543	2026-05-12 12:22:11.081543	global
1905	Taboot Street	taboot-street	area	29	18.5146000	73.8560000	t	f	2026-05-12 12:22:11.346794	2026-05-12 12:22:11.346794	global
1906	Moledina Road	moledina-road	area	29	18.5167000	73.8780000	t	f	2026-05-12 12:22:11.610062	2026-05-12 12:22:11.610062	global
1907	Quarter Gate	quarter-gate	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:11.874085	2026-05-12 12:22:11.874085	global
1908	Sharbatwala Chowk	sharbatwala-chowk	area	29	18.5210000	73.8567000	t	f	2026-05-12 12:22:12.137328	2026-05-12 12:22:12.137328	global
1909	Bootee Street	bootee-street	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:12.402597	2026-05-12 12:22:12.402597	global
1910	Synagogue Street	synagogue-street	area	29	18.5187000	73.8530000	t	f	2026-05-12 12:22:12.663704	2026-05-12 12:22:12.663704	global
1911	Sachapir Street	sachapir-street	area	29	18.5086000	73.8372000	t	f	2026-05-12 12:22:12.926696	2026-05-12 12:22:12.926696	global
1912	Dr. Ambedkar Road	dr-ambedkar-road	area	29	18.5145000	73.8578000	t	f	2026-05-12 12:22:13.191594	2026-05-12 12:22:13.191594	global
1913	Solapur Bazar	solapur-bazar	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:13.453838	2026-05-12 12:22:13.453838	global
1914	Bhavani Peth (near Camp)	bhavani-peth-near-camp	area	29	18.5200000	73.8730000	t	f	2026-05-12 12:22:13.714919	2026-05-12 12:22:13.714919	global
1915	Nana Peth	nana-peth	area	29	18.5146000	73.8723000	t	f	2026-05-12 12:22:13.976077	2026-05-12 12:22:13.976077	global
1916	Rasta Peth	rasta-peth	area	29	18.5160000	73.8715000	t	f	2026-05-12 12:22:14.235101	2026-05-12 12:22:14.235101	global
1917	Ghorpadi Peth	ghorpadi-peth	area	29	18.5196000	73.8720000	t	f	2026-05-12 12:22:14.496278	2026-05-12 12:22:14.496278	global
1918	Ghorpadi Village	ghorpadi-village	area	29	18.5305000	73.9009000	t	f	2026-05-12 12:22:14.760453	2026-05-12 12:22:14.760453	global
1919	Empress Garden Area	empress-garden-area	area	29	18.5308000	73.8795000	t	f	2026-05-12 12:22:15.027734	2026-05-12 12:22:15.027734	global
1920	Pune Railway Station Area (adjacent)	pune-railway-station-area-adjacent	area	29	18.5289000	73.8740000	t	f	2026-05-12 12:22:15.288442	2026-05-12 12:22:15.288442	global
1921	Central Pune	central-pune	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:15.559315	2026-05-12 12:22:15.559315	global
1922	Shivajinagar	shivajinagar	area	29	18.5308000	73.8470000	t	f	2026-05-12 12:22:15.82027	2026-05-12 12:22:15.82027	global
1923	Deccan Gymkhana	deccan-gymkhana	area	29	18.5167000	73.8405000	t	f	2026-05-12 12:22:16.082366	2026-05-12 12:22:16.082366	global
1924	JM Road	jm-road	area	29	18.5186000	73.8412000	t	f	2026-05-12 12:22:16.341595	2026-05-12 12:22:16.341595	global
1925	FC Road	fc-road	area	29	18.5186000	73.8418000	t	f	2026-05-12 12:22:16.600731	2026-05-12 12:22:16.600731	global
1926	Model Colony	model-colony	area	29	18.5646000	73.9113000	t	f	2026-05-12 12:22:16.862839	2026-05-12 12:22:16.862839	global
1927	Sadashiv Peth	sadashiv-peth	area	29	18.5140000	73.8405000	t	f	2026-05-12 12:22:17.130045	2026-05-12 12:22:17.130045	global
1928	Shaniwar Peth	shaniwar-peth	area	29	18.5144000	73.8521000	t	f	2026-05-12 12:22:17.403444	2026-05-12 12:22:17.403444	global
1929	Narayan Peth	narayan-peth	area	29	18.5167000	73.8520000	t	f	2026-05-12 12:22:17.663915	2026-05-12 12:22:17.663915	global
1930	Kasba Peth	kasba-peth	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:17.928837	2026-05-12 12:22:17.928837	global
1931	Kothrud	kothrud	area	29	18.5074000	73.8077000	t	f	2026-05-12 12:22:18.195205	2026-05-12 12:22:18.195205	global
1932	Erandwane	erandwane	area	29	18.5019000	73.8295000	t	f	2026-05-12 12:22:18.456511	2026-05-12 12:22:18.456511	global
1933	East Pune	east-pune	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:18.716357	2026-05-12 12:22:18.716357	global
1934	Viman Nagar	viman-nagar	area	29	18.5667000	73.9143000	t	f	2026-05-12 12:22:18.983687	2026-05-12 12:22:18.983687	global
1935	Kalyani Nagar	kalyani-nagar	area	29	18.5500000	73.9000000	t	f	2026-05-12 12:22:19.250934	2026-05-12 12:22:19.250934	global
1936	Yerwada	yerwada	area	29	18.5609000	73.8806000	t	f	2026-05-12 12:22:19.515255	2026-05-12 12:22:19.515255	global
1937	Lohegaon	lohegaon	area	29	18.5900000	73.9200000	t	f	2026-05-12 12:22:19.779204	2026-05-12 12:22:19.779204	global
1938	Koregaon Park	koregaon-park	area	29	18.5362000	73.8935000	t	f	2026-05-12 12:22:20.038951	2026-05-12 12:22:20.038951	global
1939	Magarpatta City	magarpatta-city	area	29	18.5167000	73.9330000	t	f	2026-05-12 12:22:20.300487	2026-05-12 12:22:20.300487	global
1940	Hadapsar	hadapsar	area	29	18.4967000	73.9320000	t	f	2026-05-12 12:22:20.562555	2026-05-12 12:22:20.562555	global
1941	Mundhwa	mundhwa	area	29	18.5433000	73.9325000	t	f	2026-05-12 12:22:20.824868	2026-05-12 12:22:20.824868	global
1942	Chandan Nagar	chandan-nagar	area	29	18.5679000	73.9158000	t	f	2026-05-12 12:22:21.08708	2026-05-12 12:22:21.08708	global
1943	West Pune	west-pune	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:21.349028	2026-05-12 12:22:21.349028	global
1944	Baner	baner	area	29	18.5590000	73.7868000	t	f	2026-05-12 12:22:21.609147	2026-05-12 12:22:21.609147	global
1945	Balewadi	balewadi	area	29	18.5830000	73.7790000	t	f	2026-05-12 12:22:21.869215	2026-05-12 12:22:21.869215	global
1946	Aundh	aundh	area	29	18.5610000	73.8077000	t	f	2026-05-12 12:22:22.132714	2026-05-12 12:22:22.132714	global
1947	Pashan	pashan	area	29	18.5483000	73.7931000	t	f	2026-05-12 12:22:22.393697	2026-05-12 12:22:22.393697	global
1948	Bavdhan	bavdhan	area	29	18.5146000	73.7800000	t	f	2026-05-12 12:22:22.65376	2026-05-12 12:22:22.65376	global
1949	Sus Road area	sus-road-area	area	29	18.5690000	73.8050000	t	f	2026-05-12 12:22:22.917736	2026-05-12 12:22:22.917736	global
1950	South Pune	south-pune	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:23.181841	2026-05-12 12:22:23.181841	global
1951	Wanowrie	wanowrie	area	29	18.4887000	73.9016000	t	f	2026-05-12 12:22:23.445822	2026-05-12 12:22:23.445822	global
1952	Wanwadi	wanwadi	area	29	18.4960000	73.9037000	t	f	2026-05-12 12:22:23.710204	2026-05-12 12:22:23.710204	global
1953	Kondhwa	kondhwa	area	29	18.4670000	73.8890000	t	f	2026-05-12 12:22:23.970371	2026-05-12 12:22:23.970371	global
1954	NIBM Road	nibm-road	area	29	18.4840000	73.8994000	t	f	2026-05-12 12:22:24.231391	2026-05-12 12:22:24.231391	global
1955	Salisbury Park	salisbury-park	area	29	18.5019000	73.8714000	t	f	2026-05-12 12:22:24.491613	2026-05-12 12:22:24.491613	global
1956	Dhankawadi	dhankawadi	area	29	18.4615000	73.8615000	t	f	2026-05-12 12:22:24.751671	2026-05-12 12:22:24.751671	global
1957	Bibwewadi	bibwewadi	area	29	18.4600000	73.8600000	t	f	2026-05-12 12:22:25.012788	2026-05-12 12:22:25.012788	global
1958	Katraj	katraj	area	29	18.4486000	73.8630000	t	f	2026-05-12 12:22:25.273908	2026-05-12 12:22:25.273908	global
1959	North Pune	north-pune	area	29	18.6000000	73.8000000	t	f	2026-05-12 12:22:25.5349	2026-05-12 12:22:25.5349	global
1960	Pimpri	pimpri	area	29	18.6298000	73.7997000	t	f	2026-05-12 12:22:25.796057	2026-05-12 12:22:25.796057	global
1961	Chinchwad	chinchwad	area	29	18.6275000	73.8138000	t	f	2026-05-12 12:22:26.059333	2026-05-12 12:22:26.059333	global
1962	Akurdi	akurdi	area	29	18.6499000	73.7808000	t	f	2026-05-12 12:22:26.319488	2026-05-12 12:22:26.319488	global
1963	Nigdi	nigdi	area	29	18.6518000	73.7639000	t	f	2026-05-12 12:22:26.580522	2026-05-12 12:22:26.580522	global
1964	Ravet	ravet	area	29	18.6460000	73.7565000	t	f	2026-05-12 12:22:26.842661	2026-05-12 12:22:26.842661	global
1965	Moshi	moshi	area	29	18.5246000	73.8567000	t	f	2026-05-12 12:22:27.102892	2026-05-12 12:22:27.102892	global
1966	Bhosari	bhosari	area	29	18.6270000	73.8043000	t	f	2026-05-12 12:22:27.361899	2026-05-12 12:22:27.361899	global
1967	Pune District (Rural)	pune-district-rural	area	29	18.5204000	73.8567000	t	f	2026-05-12 12:22:27.622924	2026-05-12 12:22:27.622924	global
1968	Hinjewadi	hinjewadi	area	29	18.5912000	73.7389000	t	f	2026-05-12 12:22:27.883114	2026-05-12 12:22:27.883114	global
1969	Talegaon Dabhade	talegaon-dabhade	area	29	18.7350000	73.6750000	t	f	2026-05-12 12:22:28.144189	2026-05-12 12:22:28.144189	global
1970	Lonavala	lonavala	area	29	18.7540000	73.4060000	t	f	2026-05-12 12:22:28.408407	2026-05-12 12:22:28.408407	global
1971	Shirwal	shirwal	area	29	18.1500000	73.9830000	t	f	2026-05-12 12:22:28.670514	2026-05-12 12:22:28.670514	global
1972	Baramati	baramati	area	29	18.1510000	74.5770000	t	f	2026-05-12 12:22:28.932685	2026-05-12 12:22:28.932685	global
1973	Daund	daund	area	29	18.4667000	74.5833000	t	f	2026-05-12 12:22:29.19282	2026-05-12 12:22:29.19282	global
1974	Alandi	alandi	area	29	18.6775000	73.9041000	t	f	2026-05-12 12:22:29.451871	2026-05-12 12:22:29.451871	global
1975	Junnar	junnar	area	29	19.2086000	73.8778000	t	f	2026-05-12 12:22:29.721176	2026-05-12 12:22:29.721176	global
1976	Manchar	manchar	area	29	18.7395000	73.8553000	t	f	2026-05-12 12:22:29.98437	2026-05-12 12:22:29.98437	global
1783	Aashiyana	aashiyana	area	11	26.8034000	80.9030000	t	f	2026-05-12 12:21:37.883628	2026-05-12 12:49:34.012704	global
1978	Varanasi	chijtswu7gsvjjkreufm4ihk9sq	city	\N	25.3756316	83.0625844	t	f	2026-05-22 07:52:04.157258	2026-05-22 07:52:04.157258	global
1979	93F7+6X5, Bariyasanpur, Uttar Pradesh 221112, India	chijjroj8g4vjjkrbappehzhuvg	city	\N	25.3730066	83.0649970	t	f	2026-05-22 10:23:50.484213	2026-05-22 10:23:50.484213	institution
1980	20, Lajpat Nagar, Maldahiya, Chetganj, Varanasi, Uttar Pradesh 221002, India	eldnywxkywhpewegq3jvc3npbmcsifzpamf5ie5hz2fyienvbg9ueswgq2hl	city	\N	25.3242503	82.9916870	t	f	2026-05-22 12:41:25.42093	2026-05-22 12:41:25.42093	institution
1981	Karundhi, BHU - Lanka Rd, Saket Nagar Colony, Lanka, Varanasi, Uttar Pradesh 221005, India	elbcsfuglsbmyw5rysbszcwgu2frzxqgtmfnyxigq29sb255lcbmyw5ryswg	city	\N	25.2798345	83.0027315	t	f	2026-05-26 12:47:00.389515	2026-05-26 12:47:00.389515	institution
1982	C2MQ+27J, Magrahua, Uttar Pradesh 221104, India	chij-vhoh8ypjjkrfcv-ysczpog	city	\N	25.4317202	83.0389320	t	f	2026-05-26 13:01:40.200081	2026-05-26 13:01:40.200081	institution
1983	B-H101, Type IV, Sector F, Jankipuram, Lucknow, Uttar Pradesh 226031, India	chijg456xz5xmtkri-qbj5c1j5m	city	\N	26.9212042	80.9395620	t	f	2026-05-28 11:20:59.007043	2026-05-28 11:20:59.007043	institution
1984	India	india	country	\N	\N	\N	t	f	2026-06-02 05:38:20.407209	2026-06-02 05:38:20.407209	user
1985	Ramakanth Nagar	ramakanth-nagar	area	10	\N	\N	t	f	2026-06-02 05:38:20.407209	2026-06-02 05:38:20.407209	user
1986	Ashapur	ashapur-1	city	1	\N	\N	t	f	2026-06-03 12:14:42.528921	2026-06-03 12:14:42.528921	user
1987	Ganga Nagar Colony	ganga-nagar-colony	area	10	\N	\N	t	f	2026-06-18 14:18:05.15733	2026-06-18 14:18:05.15733	user
1988	S-9/682, Naibasti, Varanasi, Uttar Pradesh 221002, India	chijjyopwxgujjkryg6z3y0rsjs	city	\N	25.3451402	82.9948427	t	f	2026-06-18 14:30:01.26695	2026-06-18 14:30:01.26695	institution
1989	S-17/283, Nadesar, Chaukaghat, Varanasi, Uttar Pradesh 221002, India	chijhq950t8tjjkrerd4zqdq2ni	city	\N	25.3311769	82.9907228	t	f	2026-06-18 14:32:57.736718	2026-06-18 14:32:57.736718	institution
1990	C27/77, Das Nagar Colony, Jagatganj, Chaukaghat, Varanasi, Uttar Pradesh 221002, India	chijz7sacawujjkrnq14dbzroje	city	\N	25.3271428	82.9989626	t	f	2026-06-18 14:35:24.230796	2026-06-18 14:35:24.230796	institution
1991	D59/235K-D-M, Jai Prakash Nagar, Shivpurwa, Varanasi, Uttar Pradesh 221002, India	chijpcdqh-ctjjkrin39ctjocs0	city	\N	25.3106946	82.9797365	t	f	2026-06-18 14:36:52.708751	2026-06-18 14:36:52.708751	institution
1992	Rajghat	rajghat	area	10	\N	\N	t	f	2026-06-18 14:48:44.323055	2026-06-18 14:48:44.323055	user
1993	Lohta Bazar	lohta-bazar	area	10	\N	\N	t	f	2026-06-18 14:59:19.52878	2026-06-18 14:59:19.52878	user
1994	Bazardiha	bazardiha	area	10	\N	\N	t	f	2026-06-18 15:07:43.491382	2026-06-18 15:07:43.491382	user
1995	Chittanpura	chittanpura	area	10	\N	\N	t	f	2026-06-18 15:13:05.819356	2026-06-18 15:13:05.819356	user
1996	Sajoi	sajoi	city	1	\N	\N	t	f	2026-06-18 15:20:05.052312	2026-06-18 15:20:05.052312	user
1997	Parao	parao	area	10	\N	\N	t	f	2026-06-18 15:29:25.289456	2026-06-18 15:29:25.289456	user
1998	Sarauni	sarauni-1	city	1	\N	\N	t	f	2026-06-18 15:33:35.841925	2026-06-18 15:33:35.841925	user
1999	Tulsipur	tulsipur	area	10	\N	\N	t	f	2026-06-18 16:02:07.193527	2026-06-18 16:02:07.193527	user
2000	Tilbhandeshwer	tilbhandeshwer	area	10	\N	\N	t	f	2026-06-18 17:20:04.438961	2026-06-18 17:20:04.438961	user
2001	Airhe	airhe	city	1	\N	\N	t	f	2026-06-18 17:31:50.203229	2026-06-18 17:31:50.203229	user
2002	Newada	newada-1	city	1	\N	\N	t	f	2026-06-18 17:47:31.847095	2026-06-18 17:47:31.847095	user
2003	8XHM+VRF, Varanasi cantonment, Varanasi, Uttar Pradesh 221002, India	chiji2xlhectjjkr1qkp1vlpqe4	city	\N	25.3300391	82.9845430	t	f	2026-06-22 07:03:17.195544	2026-06-22 07:03:17.195544	institution
2004	Gokul Nagar Colony	gokul-nagar-colony	area	10	\N	\N	t	f	2026-06-22 13:21:42.103362	2026-06-22 13:21:42.103362	user
\.

SELECT pg_catalog.setval('public.designations_id_seq', 669, true);
SELECT pg_catalog.setval('public.locations_id_seq', 2004, true);

COMMIT;
