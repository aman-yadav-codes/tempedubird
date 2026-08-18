-- Reset data while preserving categories/tree/syllabus/roles/permissions.
-- Generated: 2026-06-23_10-36-32
-- Login after reset:
--   email: admin@edubird.local
--   password: Admin@123

BEGIN;

-- Detach preserved tables from users/institutions so users and institutions can be cleared safely.
UPDATE public.card_categories SET created_by = NULL, updated_by = NULL;
UPDATE public.syllabi SET institution_id = NULL, created_by = NULL, updated_by = NULL;
UPDATE public.syllabus_nodes SET created_by = NULL, updated_by = NULL;
UPDATE public.syllabus_inheritance_logs SET inherited_by = NULL;

-- Clear all non-preserved application data tables.
TRUNCATE TABLE
  public."academic_session_templates",
  public."academic_years",
  public."ai_content_field_settings",
  public."ai_content_types",
  public."ai_providers",
  public."app_settings",
  public."assignment_question_files",
  public."assignment_question_options",
  public."assignment_questions",
  public."assignment_syllabus_nodes",
  public."assignment_targets",
  public."assignment_template_question_files",
  public."assignment_template_question_options",
  public."assignment_template_questions",
  public."assignment_templates",
  public."assignments",
  public."attendance_sessions",
  public."class_timetables",
  public."designations",
  public."document_generation_data",
  public."document_template_field_mappings",
  public."document_template_fields",
  public."document_templates",
  public."facility_types",
  public."generated_documents",
  public."help_article_assets",
  public."help_article_faqs",
  public."help_article_permissions",
  public."help_article_relations",
  public."help_article_views",
  public."help_articles",
  public."help_categories",
  public."help_recent_updates",
  public."help_search_logs",
  public."institution_academic_classes",
  public."institution_calendar_events",
  public."institution_categories",
  public."institution_class_sections",
  public."institution_cutoffs",
  public."institution_facilities",
  public."institution_facility_media",
  public."institution_media",
  public."institution_memberships",
  public."institution_news",
  public."institution_notification_settings",
  public."institution_placements",
  public."institution_programs",
  public."institution_role_permission_denials",
  public."institution_role_permissions",
  public."institution_scholarships",
  public."institution_subtypes",
  public."institution_template_defaults",
  public."institution_templates",
  public."institution_types",
  public."institution_user_permissions",
  public."languages",
  public."locations",
  public."notification_preferences",
  public."notification_recipients",
  public."notification_templates",
  public."notifications",
  public."practice_exam_question_files",
  public."practice_exam_question_options",
  public."practice_exam_questions",
  public."practice_exam_syllabus_nodes",
  public."practice_exam_targets",
  public."practice_exam_template_question_files",
  public."practice_exam_template_question_options",
  public."practice_exam_template_questions",
  public."practice_exam_templates",
  public."practice_exams",
  public."program_categories",
  public."program_fee_components",
  public."program_languages",
  public."program_media",
  public."program_section_class_teachers",
  public."program_sections",
  public."program_subject_teachers",
  public."program_subjects",
  public."program_types",
  public."sessions",
  public."skills",
  public."student_achievements",
  public."student_assignment_answers",
  public."student_assignment_submission_files",
  public."student_assignments",
  public."student_attendance",
  public."student_documents",
  public."student_enrollments",
  public."student_guardians",
  public."student_period_attendance",
  public."student_practice_exam_answers",
  public."student_practice_exam_attempts",
  public."student_practice_exam_results",
  public."student_profiles",
  public."support_ticket_attachments",
  public."support_ticket_history",
  public."support_ticket_messages",
  public."support_tickets",
  public."teacher_class_subject_assignments",
  public."timetable_entries",
  public."timetable_periods",
  public."timetable_slots",
  public."user_certifications",
  public."user_education",
  public."user_experience",
  public."user_locations",
  public."user_profiles",
  public."user_roles",
  public."user_teaching_categories",
  public."user_teaching_subjects",
  public."visitor_activities",
  public."visitor_sessions"
RESTART IDENTITY;

-- These are referenced by preserved tables, so use DELETE after detaching instead of TRUNCATE CASCADE.
DELETE FROM public.institution_profiles;
DELETE FROM public.users;

-- Reset common serial sequences for cleared parent tables.
SELECT setval(pg_get_serial_sequence('public.users', 'id'), 1, false) WHERE pg_get_serial_sequence('public.users', 'id') IS NOT NULL;
SELECT setval(pg_get_serial_sequence('public.institution_profiles', 'id'), 1, false) WHERE pg_get_serial_sequence('public.institution_profiles', 'id') IS NOT NULL;

-- Ensure platform scope and platform_admin role exist.
INSERT INTO public.scope_types (code, name, is_active)
SELECT 'platform', 'Platform', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.scope_types WHERE code = 'platform');

INSERT INTO public.roles (name, code, scope_id)
SELECT 'Platform Admin', 'platform_admin', st.id
FROM public.scope_types st
WHERE st.code = 'platform'
  AND NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'platform_admin');

-- Repair Platform Admin default permissions: grant every permission to platform_admin.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'platform_admin'
ON CONFLICT DO NOTHING;

-- Create the single Platform Admin account.
INSERT INTO public.users (
  full_name,
  email,
  phone,
  password,
  is_active,
  is_verified,
  is_deleted,
  login_provider,
  is_profile_complete,
  created_at,
  updated_at
)
VALUES (
  'Admin Pro',
  'admin@edubird.local',
  NULL,
  '$2b$10$DFKH7sg8fx0du.y1rU33KORXqtSStbN3H3XLNsJQsBXaITnKd9udi',
  TRUE,
  TRUE,
  FALSE,
  'email',
  TRUE,
  NOW(),
  NOW()
)
RETURNING id;

INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.users u
JOIN public.roles r ON r.code = 'platform_admin'
WHERE u.email = 'admin@edubird.local'
ON CONFLICT DO NOTHING;

COMMIT;
