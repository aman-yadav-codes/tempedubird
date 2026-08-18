-- Full reset while preserving app_migrations, categories/tree, syllabus, roles, permissions.
-- Generated: 2026-06-23_10-38-50
-- Login after reset:
--   email: admin@edubird.local
--   password: Admin@123

BEGIN;

UPDATE public.card_categories SET created_by = NULL, updated_by = NULL;
UPDATE public.syllabi SET institution_id = NULL, created_by = NULL, updated_by = NULL;
UPDATE public.syllabus_nodes SET created_by = NULL, updated_by = NULL;
UPDATE public.syllabus_inheritance_logs SET inherited_by = NULL;

CREATE TEMP TABLE keep_app_migrations AS TABLE public."app_migrations";
CREATE TEMP TABLE keep_scope_types AS TABLE public."scope_types";
CREATE TEMP TABLE keep_permissions AS TABLE public."permissions";
CREATE TEMP TABLE keep_roles AS TABLE public."roles";
CREATE TEMP TABLE keep_role_permissions AS TABLE public."role_permissions";
CREATE TEMP TABLE keep_boards AS TABLE public."boards";
CREATE TEMP TABLE keep_categories AS TABLE public."categories";
CREATE TEMP TABLE keep_sections AS TABLE public."sections";
CREATE TEMP TABLE keep_subjects AS TABLE public."subjects";
CREATE TEMP TABLE keep_card_categories AS TABLE public."card_categories";
CREATE TEMP TABLE keep_category_closure AS TABLE public."category_closure";
CREATE TEMP TABLE keep_category_boards AS TABLE public."category_boards";
CREATE TEMP TABLE keep_syllabi AS TABLE public."syllabi";
CREATE TEMP TABLE keep_syllabus_nodes AS TABLE public."syllabus_nodes";
CREATE TEMP TABLE keep_syllabus_node_closure AS TABLE public."syllabus_node_closure";
CREATE TEMP TABLE keep_syllabus_inheritance_logs AS TABLE public."syllabus_inheritance_logs";

TRUNCATE TABLE
  public."academic_session_templates",
  public."academic_years",
  public."ai_content_field_settings",
  public."ai_content_types",
  public."ai_providers",
  public."app_migrations",
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
  public."boards",
  public."card_categories",
  public."categories",
  public."category_boards",
  public."category_closure",
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
  public."institution_profiles",
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
  public."permissions",
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
  public."role_permissions",
  public."roles",
  public."scope_types",
  public."sections",
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
  public."subjects",
  public."support_ticket_attachments",
  public."support_ticket_history",
  public."support_ticket_messages",
  public."support_tickets",
  public."syllabi",
  public."syllabus_inheritance_logs",
  public."syllabus_node_closure",
  public."syllabus_nodes",
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
  public."users",
  public."visitor_activities",
  public."visitor_sessions"
RESTART IDENTITY CASCADE;

INSERT INTO public."app_migrations" SELECT * FROM keep_app_migrations;
INSERT INTO public."scope_types" SELECT * FROM keep_scope_types;
INSERT INTO public."permissions" SELECT * FROM keep_permissions;
INSERT INTO public."roles" SELECT * FROM keep_roles;
INSERT INTO public."role_permissions" SELECT * FROM keep_role_permissions;
INSERT INTO public."boards" SELECT * FROM keep_boards;
INSERT INTO public."categories" SELECT * FROM keep_categories;
INSERT INTO public."sections" SELECT * FROM keep_sections;
INSERT INTO public."subjects" SELECT * FROM keep_subjects;
INSERT INTO public."card_categories" SELECT * FROM keep_card_categories;
INSERT INTO public."category_closure" SELECT * FROM keep_category_closure;
INSERT INTO public."category_boards" SELECT * FROM keep_category_boards;
INSERT INTO public."syllabi" SELECT * FROM keep_syllabi;
INSERT INTO public."syllabus_nodes" SELECT * FROM keep_syllabus_nodes;
INSERT INTO public."syllabus_node_closure" SELECT * FROM keep_syllabus_node_closure;
INSERT INTO public."syllabus_inheritance_logs" SELECT * FROM keep_syllabus_inheritance_logs;

DO $$
DECLARE
  rec record;
  seq_name text;
  max_id bigint;
BEGIN
  FOR rec IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'id'
      AND table_name = ANY(ARRAY[
        'scope_types','permissions','roles','boards','categories','sections','subjects','card_categories','syllabi','syllabus_nodes','syllabus_inheritance_logs'
      ])
  LOOP
    SELECT pg_get_serial_sequence('public.' || quote_ident(rec.table_name), 'id') INTO seq_name;
    IF seq_name IS NOT NULL THEN
      EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM public.%I', rec.table_name) INTO max_id;
      IF max_id > 0 THEN
        EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_id);
      ELSE
        EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
      END IF;
    END IF;
  END LOOP;
END
$$;

INSERT INTO public.scope_types (code, name, is_active)
SELECT 'platform', 'Platform', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.scope_types WHERE code = 'platform');

INSERT INTO public.roles (name, code, scope_id)
SELECT 'Platform Admin', 'platform_admin', st.id
FROM public.scope_types st
WHERE st.code = 'platform'
  AND NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'platform_admin');

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'platform_admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.users (full_name, email, phone, password, is_active, is_verified, is_deleted, login_provider, is_profile_complete, created_at, updated_at)
VALUES ('Admin Pro', 'admin@edubird.local', NULL, '$2b$10$DFKH7sg8fx0du.y1rU33KORXqtSStbN3H3XLNsJQsBXaITnKd9udi', TRUE, TRUE, FALSE, 'email', TRUE, NOW(), NOW());

INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.users u
JOIN public.roles r ON r.code = 'platform_admin'
WHERE u.email = 'admin@edubird.local'
ON CONFLICT DO NOTHING;

COMMIT;
