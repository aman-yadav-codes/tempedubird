CREATE SCHEMA "public";
CREATE TYPE "teacher_type" AS ENUM('individual_teacher', 'institute_teacher');
CREATE TABLE "academic_years" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL UNIQUE,
	"name" varchar(50) NOT NULL UNIQUE,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_academic_year" UNIQUE("institution_id","name")
);
CREATE TABLE "ai_providers" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL CONSTRAINT "ai_providers_slug_key" UNIQUE,
	"base_url" text NOT NULL,
	"model_name" varchar(100),
	"chat_id" text,
	"last_response_id" text,
	"token" text,
	"token_expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "app_migrations" (
	"key" text PRIMARY KEY,
	"applied_at" timestamp DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL
);
CREATE TABLE "app_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1,
	"tracking_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"tracker_update_interval_minutes" integer DEFAULT 60 NOT NULL,
	CONSTRAINT "single_row_check" CHECK ((id = 1))
);
CREATE TABLE "assignment_question_files" (
	"id" serial PRIMARY KEY,
	"question_id" integer NOT NULL,
	"file_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "assignment_question_options" (
	"id" serial PRIMARY KEY,
	"question_id" integer NOT NULL,
	"option_text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 1 NOT NULL
);
CREATE TABLE "assignment_questions" (
	"id" serial PRIMARY KEY,
	"assignment_id" integer NOT NULL,
	"question_text" text NOT NULL,
	"question_type" varchar(20) NOT NULL,
	"marks" numeric(8, 2) NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "assignment_targets" (
	"id" serial PRIMARY KEY,
	"assignment_id" integer NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "assignment_template_question_files" (
	"id" serial PRIMARY KEY,
	"question_id" integer NOT NULL,
	"file_url" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "assignment_template_question_options" (
	"id" serial PRIMARY KEY,
	"question_id" integer NOT NULL,
	"option_text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 1 NOT NULL
);
CREATE TABLE "assignment_template_questions" (
	"id" serial PRIMARY KEY,
	"template_id" integer NOT NULL,
	"question_text" text NOT NULL,
	"question_type" varchar(20) NOT NULL,
	"marks" numeric(8, 2) NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "assignment_templates" (
	"id" serial PRIMARY KEY,
	"title" varchar(255) NOT NULL,
	"description" text,
	"total_marks" numeric(8, 2) DEFAULT '0' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source_institution_id" integer,
	"created_by" integer NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"blocked_by_platform" boolean DEFAULT false NOT NULL,
	"blocked_by" integer,
	"blocked_at" timestamp,
	"block_reason" text
);
CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL,
	"template_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"issue_date" date NOT NULL,
	"submission_date" date NOT NULL,
	"total_marks" numeric(8, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "attendance_sessions" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL,
	"academic_year_id" integer NOT NULL,
	"program_id" integer NOT NULL UNIQUE,
	"section_id" integer NOT NULL UNIQUE,
	"attendance_date" date NOT NULL UNIQUE,
	"attendance_mode" varchar(20) NOT NULL,
	"marked_by" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_attendance_session" UNIQUE("program_id","section_id","attendance_date"),
	CONSTRAINT "attendance_sessions_attendance_mode_check" CHECK (((attendance_mode)::text = ANY ((ARRAY['FULL_DAY'::character varying, 'PERIOD_WISE'::character varying])::text[])))
);
CREATE TABLE "boards" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL CONSTRAINT "boards_slug_key" UNIQUE,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "card_categories" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL CONSTRAINT "card_categories_slug_key" UNIQUE,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" integer,
	"depth" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "category_boards" (
	"category_id" integer,
	"board_id" integer,
	CONSTRAINT "category_boards_pkey" PRIMARY KEY("category_id","board_id")
);
CREATE TABLE "category_closure" (
	"ancestor_id" integer,
	"descendant_id" integer,
	"depth" integer NOT NULL,
	CONSTRAINT "category_closure_pkey" PRIMARY KEY("ancestor_id","descendant_id")
);
CREATE TABLE "class_timetables" (
	"id" serial PRIMARY KEY,
	"institution_class_section_id" integer NOT NULL UNIQUE,
	"academic_year_id" integer NOT NULL UNIQUE,
	"day_of_week" smallint NOT NULL UNIQUE,
	"period_id" integer NOT NULL UNIQUE,
	"subject_id" integer,
	"teacher_id" integer,
	"room_number" varchar(50),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_ct_slot" UNIQUE("institution_class_section_id","academic_year_id","day_of_week","period_id")
);
CREATE TABLE "designations" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL CONSTRAINT "designations_slug_key" UNIQUE,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp
);
CREATE TABLE "document_template_fields" (
	"id" serial PRIMARY KEY,
	"template_id" integer NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"label" varchar(150) NOT NULL,
	"field_type" varchar(30) NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "document_templates" (
	"id" serial PRIMARY KEY,
	"card_category_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"thumbnail_url" text,
	"html_template" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "facility_types" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL CONSTRAINT "facility_types_slug_key" UNIQUE,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
CREATE TABLE "generated_documents" (
	"id" bigserial PRIMARY KEY,
	"institution_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"reference_id" integer NOT NULL,
	"image_url" text,
	"pdf_url" text,
	"generated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "institution_academic_classes" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL UNIQUE,
	"academic_year_id" integer NOT NULL UNIQUE,
	"category_id" integer NOT NULL UNIQUE,
	"capacity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_iac_unique" UNIQUE("institution_id","academic_year_id","category_id")
);
CREATE TABLE "institution_categories" (
	"institution_id" integer,
	"category_id" integer,
	CONSTRAINT "institution_categories_pkey" PRIMARY KEY("institution_id","category_id")
);
CREATE TABLE "institution_class_sections" (
	"id" serial PRIMARY KEY,
	"institution_class_id" integer NOT NULL UNIQUE,
	"section_id" integer NOT NULL UNIQUE,
	"class_teacher_id" integer,
	"capacity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_ics_unique" UNIQUE("institution_class_id","section_id")
);
CREATE TABLE "institution_cutoffs" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL,
	"program_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ai_response" jsonb DEFAULT '{}' NOT NULL,
	"exam_name" varchar(150),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"years_to_generate" integer DEFAULT 5 NOT NULL
);
CREATE TABLE "institution_media" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL,
	"media_type" varchar(20) NOT NULL,
	"url" text NOT NULL,
	"title" varchar(150),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "institution_memberships" (
	"id" bigserial PRIMARY KEY,
	"institution_id" integer NOT NULL UNIQUE,
	"user_id" integer NOT NULL UNIQUE,
	"role_id" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "institution_memberships_institution_id_user_id_key" UNIQUE("institution_id","user_id")
);
CREATE TABLE "institution_news" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL UNIQUE,
	"slug" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"content" text,
	"image_url" text,
	"published_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_institution_news_institution_slug" UNIQUE("institution_id","slug")
);
CREATE TABLE "institution_notification_settings" (
	"id" bigserial PRIMARY KEY,
	"institution_id" integer NOT NULL UNIQUE,
	"notification_type" varchar(100) NOT NULL UNIQUE,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
	"updated_at" timestamp DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
	CONSTRAINT "institution_notification_sett_institution_id_notification_t_key" UNIQUE("institution_id","notification_type")
);
CREATE TABLE "institution_placements" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL,
	"year" integer NOT NULL,
	"average_package" numeric(12, 2),
	"highest_package" numeric(12, 2),
	"lowest_package" numeric(12, 2),
	"placement_percentage" numeric(5, 2),
	"total_students" integer,
	"placed_students" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "institution_profiles" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL CONSTRAINT "institution_profiles_slug_key" UNIQUE,
	"institution_type_id" integer NOT NULL,
	"institution_subtype_id" integer,
	"phone" varchar(20),
	"email" varchar(150),
	"established_year" integer,
	"website" text,
	"about" text,
	"location_id" integer,
	"parent_university_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" text NOT NULL,
	"ai_content" jsonb,
	"add_source" smallint,
	"board_id" integer
);
CREATE TABLE "institution_programs" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL UNIQUE,
	"program_type_id" integer NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"title" varchar(200) NOT NULL,
	"about" text,
	"duration_value" integer,
	"duration_unit" varchar(20),
	"seats_available" integer,
	"teaching_method" varchar(30),
	"board_id" integer,
	"university_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"academic_year_id" integer,
	"class_teacher_id" integer,
	CONSTRAINT "uq_institution_programs_institution_slug" UNIQUE("institution_id","slug")
);
CREATE TABLE "institution_role_permissions" (
	"institution_id" integer,
	"role_id" integer,
	"permission_id" integer,
	CONSTRAINT "institution_role_permissions_pkey" PRIMARY KEY("institution_id","role_id","permission_id")
);
CREATE TABLE "institution_role_permission_denials" (
	"institution_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "institution_role_permission_denials_pkey" PRIMARY KEY("institution_id","role_id","permission_id")
);
CREATE TABLE "institution_user_permissions" (
	"institution_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "institution_user_permissions_pkey" PRIMARY KEY("institution_id","user_id","permission_id")
);
CREATE TABLE "institution_scholarships" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ai_response" jsonb DEFAULT '{}' NOT NULL,
	"is_ai_generated" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
CREATE TABLE "institution_subtypes" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL CONSTRAINT "institution_subtypes_slug_key" UNIQUE,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
CREATE TABLE "institution_templates" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL UNIQUE,
	"template_id" integer NOT NULL UNIQUE,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"assigned_by" integer,
	"assigned_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "institution_templates_institution_id_template_id_key" UNIQUE("institution_id","template_id")
);
CREATE TABLE "institution_types" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL CONSTRAINT "institution_types_slug_key" UNIQUE,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
CREATE TABLE "languages" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL CONSTRAINT "languages_slug_key" UNIQUE,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"parent_id" integer,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"location_scope" varchar(50) DEFAULT 'global' NOT NULL
);
CREATE TABLE "notification_preferences" (
	"id" bigserial PRIMARY KEY,
	"user_id" integer NOT NULL UNIQUE,
	"notification_type" varchar(100) NOT NULL UNIQUE,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
	"updated_at" timestamp DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
	CONSTRAINT "notification_preferences_user_id_notification_type_key" UNIQUE("user_id","notification_type")
);
CREATE TABLE "notification_recipients" (
	"id" bigserial PRIMARY KEY,
	"notification_id" bigint NOT NULL UNIQUE,
	"user_id" integer NOT NULL UNIQUE,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
	"is_important" boolean DEFAULT false NOT NULL,
	CONSTRAINT "notification_recipients_notification_id_user_id_key" UNIQUE("notification_id","user_id")
);
CREATE TABLE "notification_templates" (
	"id" serial PRIMARY KEY,
	"code" varchar(100) NOT NULL CONSTRAINT "notification_templates_code_key" UNIQUE,
	"title_template" text NOT NULL,
	"body_template" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
	"updated_at" timestamp DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL
);
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY,
	"type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"entity_type" varchar(100),
	"entity_id" bigint,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL
);
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY,
	"code" varchar(100) NOT NULL CONSTRAINT "permissions_code_key" UNIQUE,
	"name" varchar(150) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "program_categories" (
	"program_id" integer,
	"category_id" integer,
	CONSTRAINT "program_categories_pkey" PRIMARY KEY("program_id","category_id")
);
CREATE TABLE "program_fee_components" (
	"id" serial PRIMARY KEY,
	"program_id" integer NOT NULL,
	"title" varchar(150) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "program_languages" (
	"program_id" integer,
	"language_id" integer,
	CONSTRAINT "program_languages_pkey" PRIMARY KEY("program_id","language_id")
);
CREATE TABLE "program_media" (
	"id" serial PRIMARY KEY,
	"program_id" integer NOT NULL,
	"media_type" varchar(20) NOT NULL,
	"url" text NOT NULL,
	"title" varchar(150),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "program_section_class_teachers" (
	"id" serial PRIMARY KEY,
	"program_id" integer NOT NULL UNIQUE,
	"section_id" integer NOT NULL UNIQUE,
	"teacher_id" integer NOT NULL,
	"academic_year_id" integer NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_psct" UNIQUE("program_id","section_id","academic_year_id")
);
CREATE TABLE "program_sections" (
	"program_id" integer,
	"section_id" integer,
	CONSTRAINT "program_sections_pkey" PRIMARY KEY("program_id","section_id")
);
CREATE TABLE "program_subject_teachers" (
	"id" serial PRIMARY KEY,
	"program_id" integer NOT NULL UNIQUE,
	"section_id" integer NOT NULL UNIQUE,
	"subject_id" integer NOT NULL UNIQUE,
	"teacher_id" integer NOT NULL,
	"academic_year_id" integer NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_pst" UNIQUE("program_id","section_id","subject_id","academic_year_id")
);
CREATE TABLE "program_subjects" (
	"program_id" integer,
	"subject_id" integer,
	CONSTRAINT "program_subjects_pkey" PRIMARY KEY("program_id","subject_id")
);
CREATE TABLE "program_types" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL CONSTRAINT "program_types_slug_key" UNIQUE,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
CREATE TABLE "role_permissions" (
	"role_id" integer,
	"permission_id" integer,
	CONSTRAINT "role_permissions_pkey" PRIMARY KEY("role_id","permission_id")
);
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY,
	"name" varchar(50) CONSTRAINT "roles_name_key" UNIQUE,
	"code" varchar(50) CONSTRAINT "roles_code_key" UNIQUE,
	"scope_id" integer
);
CREATE TABLE "scope_types" (
	"id" serial PRIMARY KEY,
	"code" varchar(50) NOT NULL CONSTRAINT "scope_types_code_key" UNIQUE,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "sections" (
	"id" serial PRIMARY KEY,
	"name" varchar(50) NOT NULL,
	"slug" varchar(50) NOT NULL CONSTRAINT "sections_slug_key" UNIQUE,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"user_id" integer NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL CONSTRAINT "skills_slug_key" UNIQUE,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp
);
CREATE TABLE "student_achievements" (
	"id" serial PRIMARY KEY,
	"student_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"achievement_date" date,
	"certificate_url" text,
	"remarks" text,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"card_category_id" integer NOT NULL,
	"template_id" integer,
	"institution_id" integer
);
CREATE TABLE "student_assignment_answers" (
	"id" serial PRIMARY KEY,
	"student_assignment_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"selected_option_id" integer,
	"answer_text" text,
	"marks_awarded" numeric(8, 2),
	"checked_by" integer,
	"checked_at" timestamp
);
CREATE TABLE "student_assignment_submission_files" (
	"id" serial PRIMARY KEY,
	"answer_id" integer NOT NULL,
	"file_url" text NOT NULL,
	"uploaded_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "student_assignments" (
	"id" serial PRIMARY KEY,
	"assignment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp,
	"obtained_marks" numeric(8, 2),
	"checked_by" integer,
	"checked_at" timestamp
);
CREATE TABLE "student_attendance" (
	"id" serial PRIMARY KEY,
	"attendance_session_id" integer NOT NULL UNIQUE,
	"student_id" integer NOT NULL UNIQUE,
	"status" varchar(20) NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_student_attendance" UNIQUE("attendance_session_id","student_id"),
	CONSTRAINT "student_attendance_status_check" CHECK (((status)::text = ANY ((ARRAY['PRESENT'::character varying, 'ABSENT'::character varying, 'LEAVE'::character varying, 'LATE'::character varying])::text[])))
);
CREATE TABLE "student_documents" (
	"id" serial PRIMARY KEY,
	"student_id" integer NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"document_number" varchar(100),
	"file_url" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"public_id" text,
	"resource_type" varchar(50)
);
CREATE TABLE "student_enrollments" (
	"id" serial PRIMARY KEY,
	"student_id" integer NOT NULL,
	"institution_id" integer NOT NULL,
	"academic_year_id" integer NOT NULL,
	"class_category_id" integer NOT NULL,
	"section_id" integer,
	"roll_number" varchar(50),
	"admission_date" date,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"previous_enrollment_id" integer,
	"remarks" text,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"program_id" integer,
	CONSTRAINT "chk_student_status" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'promoted'::character varying, 'demoted'::character varying, 'transferred'::character varying, 'dropout'::character varying, 'graduated'::character varying, 'completed'::character varying, 'suspended'::character varying])::text[])))
);
CREATE TABLE "student_guardians" (
	"id" serial PRIMARY KEY,
	"student_id" integer NOT NULL,
	"guardian_user_id" integer NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "student_period_attendance" (
	"id" serial PRIMARY KEY,
	"attendance_session_id" integer NOT NULL UNIQUE,
	"student_id" integer NOT NULL UNIQUE,
	"slot_id" integer NOT NULL UNIQUE,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_student_period_attendance" UNIQUE("attendance_session_id","student_id","slot_id"),
	CONSTRAINT "student_period_attendance_status_check" CHECK (((status)::text = ANY ((ARRAY['PRESENT'::character varying, 'ABSENT'::character varying, 'LEAVE'::character varying, 'LATE'::character varying])::text[])))
);
CREATE TABLE "student_profiles" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL CONSTRAINT "student_profiles_user_id_key" UNIQUE,
	"admission_number" varchar(100),
	"apar_id" varchar(100),
	"date_of_birth" date,
	"blood_group" varchar(10),
	"emergency_contact_name" varchar(150),
	"emergency_contact_phone" varchar(20),
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY,
	"category_id" integer NOT NULL UNIQUE,
	"board_id" integer NOT NULL UNIQUE,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "subjects_unique_category_board_slug" UNIQUE("category_id","board_id","slug")
);
CREATE TABLE "support_ticket_attachments" (
	"id" bigserial PRIMARY KEY,
	"ticket_message_id" bigint NOT NULL,
	"file_name" varchar(255),
	"file_url" text NOT NULL,
	"uploaded_by" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "support_ticket_history" (
	"id" bigserial PRIMARY KEY,
	"ticket_id" bigint NOT NULL,
	"action" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"performed_by" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "support_ticket_messages" (
	"id" bigserial PRIMARY KEY,
	"ticket_id" bigint NOT NULL,
	"user_id" integer NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reply_to_message_id" bigint,
	"edited_at" timestamp
);
CREATE TABLE "support_tickets" (
	"id" bigserial PRIMARY KEY,
	"ticket_number" varchar(30) NOT NULL CONSTRAINT "support_tickets_ticket_number_key" UNIQUE,
	"institution_id" integer,
	"created_by" integer NOT NULL,
	"assigned_to" integer,
	"resolved_by" integer,
	"closed_by" integer,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"assigned_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "syllabi" (
	"id" serial PRIMARY KEY,
	"subject_id" integer NOT NULL,
	"institution_id" integer,
	"parent_syllabus_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "syllabus_inheritance_logs" (
	"id" serial PRIMARY KEY,
	"template_syllabus_id" integer NOT NULL,
	"institution_syllabus_id" integer NOT NULL,
	"inherited_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"inherited_by" integer
);
CREATE TABLE "syllabus_node_closure" (
	"ancestor_id" integer,
	"descendant_id" integer,
	"depth" integer NOT NULL,
	CONSTRAINT "syllabus_node_closure_pkey" PRIMARY KEY("ancestor_id","descendant_id")
);
CREATE TABLE "syllabus_nodes" (
	"id" serial PRIMARY KEY,
	"syllabus_id" integer NOT NULL,
	"parent_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"node_type" varchar(50) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"estimated_hours" integer,
	"learning_outcomes" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "teacher_class_subject_assignments" (
	"id" serial PRIMARY KEY,
	"institution_class_section_id" integer NOT NULL UNIQUE,
	"teacher_id" integer NOT NULL,
	"subject_id" integer NOT NULL UNIQUE,
	"academic_year_id" integer NOT NULL UNIQUE,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_tcsa_unique" UNIQUE("institution_class_section_id","subject_id","academic_year_id")
);
CREATE TABLE "timetable_entries" (
	"id" serial PRIMARY KEY,
	"academic_year_id" integer NOT NULL UNIQUE,
	"program_id" integer NOT NULL UNIQUE,
	"section_id" integer NOT NULL UNIQUE,
	"day_of_week" smallint NOT NULL UNIQUE,
	"slot_id" integer NOT NULL UNIQUE,
	"subject_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"teacher_id" integer,
	CONSTRAINT "uq_timetable_entry" UNIQUE("academic_year_id","program_id","section_id","day_of_week","slot_id")
);
CREATE TABLE "timetable_periods" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"sort_order" integer NOT NULL,
	"is_break" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE "timetable_slots" (
	"id" serial PRIMARY KEY,
	"institution_id" integer NOT NULL UNIQUE,
	"slot_name" varchar(50),
	"slot_order" integer NOT NULL UNIQUE,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"slot_type" varchar(20) DEFAULT 'CLASS' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "uq_slot_order" UNIQUE("institution_id","slot_order")
);
CREATE TABLE "user_certifications" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"duration" varchar(100),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"issued_authority" varchar(200)
);
CREATE TABLE "user_education" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"qualification" varchar(150) NOT NULL,
	"from_year" integer NOT NULL,
	"to_year" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"institution_id" integer,
	"institution_name" text
);
CREATE TABLE "user_experience" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"job_title" varchar(150) NOT NULL,
	"from_month" integer NOT NULL,
	"from_year" integer NOT NULL,
	"to_month" integer,
	"to_year" integer,
	"is_current" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"company_id" integer,
	"company_name" text
);
CREATE TABLE "user_locations" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL CONSTRAINT "user_locations_user_id_key" UNIQUE,
	"country_id" integer,
	"state_id" integer,
	"city_id" integer,
	"area_id" integer,
	"full_address" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"pincode" varchar(20),
	"place_id" text,
	"formatted_address" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "user_profiles" (
	"user_id" integer PRIMARY KEY,
	"about" text,
	"gender" varchar(20),
	"hourly_charges" numeric(10, 2),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"teacher_type" teacher_type,
	"is_teacher" boolean DEFAULT false NOT NULL,
	"under_institution_id" integer,
	"designation_id" integer
);
CREATE TABLE "user_roles" (
	"user_id" integer,
	"role_id" integer,
	CONSTRAINT "user_roles_pkey" PRIMARY KEY("user_id","role_id")
);
CREATE TABLE "user_teaching_categories" (
	"user_id" integer,
	"category_id" integer,
	CONSTRAINT "user_teaching_categories_pkey" PRIMARY KEY("user_id","category_id")
);
CREATE TABLE "user_teaching_subjects" (
	"user_id" integer,
	"subject_id" integer,
	CONSTRAINT "user_teaching_subjects_pkey" PRIMARY KEY("user_id","subject_id")
);
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"full_name" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL CONSTRAINT "users_email_key" UNIQUE,
	"phone" varchar(20),
	"password" text,
	"is_active" boolean DEFAULT true,
	"is_verified" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"deleted_at" timestamp,
	"last_login_at" timestamp,
	"avatar_url" text,
	"login_provider" varchar(50) DEFAULT 'email',
	"created_by" integer,
	"updated_by" integer
);
CREATE TABLE "visitor_activities" (
	"id" bigserial PRIMARY KEY,
	"tracking_token" uuid NOT NULL,
	"page_url" text NOT NULL,
	"page_title" varchar(255),
	"visited_at" timestamp DEFAULT now() NOT NULL,
	"trigger_type" varchar(50)
);
CREATE TABLE "visitor_sessions" (
	"id" bigserial PRIMARY KEY,
	"tracking_token" uuid NOT NULL CONSTRAINT "visitor_sessions_tracking_token_key" UNIQUE,
	"full_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(20),
	"first_page_url" text,
	"current_page_url" text,
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_term" varchar(255),
	"utm_content" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"follow_up" text
);
CREATE UNIQUE INDEX "academic_years_pkey" ON "academic_years" ("id");
CREATE UNIQUE INDEX "uq_academic_year" ON "academic_years" ("institution_id","name");
CREATE UNIQUE INDEX "ai_providers_pkey" ON "ai_providers" ("id");
CREATE UNIQUE INDEX "ai_providers_slug_key" ON "ai_providers" ("slug");
CREATE UNIQUE INDEX "app_migrations_pkey" ON "app_migrations" ("key");
CREATE UNIQUE INDEX "app_settings_pkey" ON "app_settings" ("id");
CREATE UNIQUE INDEX "assignment_question_files_pkey" ON "assignment_question_files" ("id");
CREATE UNIQUE INDEX "assignment_question_options_pkey" ON "assignment_question_options" ("id");
CREATE UNIQUE INDEX "assignment_questions_pkey" ON "assignment_questions" ("id");
CREATE INDEX "idx_assignment_question_assignment" ON "assignment_questions" ("assignment_id");
CREATE INDEX "idx_assignment_question_order" ON "assignment_questions" ("assignment_id","display_order");
CREATE UNIQUE INDEX "assignment_targets_pkey" ON "assignment_targets" ("id");
CREATE INDEX "idx_assignment_target_assignment" ON "assignment_targets" ("assignment_id");
CREATE INDEX "idx_assignment_target_lookup" ON "assignment_targets" ("target_type","target_id");
CREATE UNIQUE INDEX "assignment_template_question_files_pkey" ON "assignment_template_question_files" ("id");
CREATE UNIQUE INDEX "assignment_template_question_options_pkey" ON "assignment_template_question_options" ("id");
CREATE INDEX "idx_atqo_question" ON "assignment_template_question_options" ("question_id");
CREATE UNIQUE INDEX "assignment_template_questions_pkey" ON "assignment_template_questions" ("id");
CREATE INDEX "idx_atq_template" ON "assignment_template_questions" ("template_id");
CREATE INDEX "idx_atq_template_order" ON "assignment_template_questions" ("template_id","display_order");
CREATE UNIQUE INDEX "assignment_templates_pkey" ON "assignment_templates" ("id");
CREATE INDEX "idx_assignment_templates_blocked" ON "assignment_templates" ("blocked_by_platform");
CREATE INDEX "idx_at_active" ON "assignment_templates" ("is_active");
CREATE INDEX "idx_at_creator" ON "assignment_templates" ("created_by");
CREATE INDEX "idx_at_institution" ON "assignment_templates" ("source_institution_id");
CREATE INDEX "idx_at_public" ON "assignment_templates" ("is_public");
CREATE UNIQUE INDEX "assignments_pkey" ON "assignments" ("id");
CREATE INDEX "idx_assignment_creator" ON "assignments" ("created_by");
CREATE INDEX "idx_assignment_institution" ON "assignments" ("institution_id");
CREATE INDEX "idx_assignment_status" ON "assignments" ("status");
CREATE INDEX "idx_assignment_submission" ON "assignments" ("submission_date");
CREATE UNIQUE INDEX "attendance_sessions_pkey" ON "attendance_sessions" ("id");
CREATE INDEX "idx_as_academic_year" ON "attendance_sessions" ("academic_year_id");
CREATE INDEX "idx_as_date" ON "attendance_sessions" ("attendance_date");
CREATE INDEX "idx_as_institution" ON "attendance_sessions" ("institution_id");
CREATE INDEX "idx_as_program_section" ON "attendance_sessions" ("program_id","section_id");
CREATE INDEX "idx_as_program_section_date" ON "attendance_sessions" ("program_id","section_id","attendance_date");
CREATE UNIQUE INDEX "uq_attendance_session" ON "attendance_sessions" ("program_id","section_id","attendance_date");
CREATE UNIQUE INDEX "boards_pkey" ON "boards" ("id");
CREATE UNIQUE INDEX "boards_slug_key" ON "boards" ("slug");
CREATE INDEX "idx_boards_active" ON "boards" ("is_active");
CREATE INDEX "idx_boards_deleted" ON "boards" ("is_deleted");
CREATE INDEX "idx_boards_slug" ON "boards" ("slug");
CREATE UNIQUE INDEX "card_categories_pkey" ON "card_categories" ("id");
CREATE UNIQUE INDEX "card_categories_slug_key" ON "card_categories" ("slug");
CREATE INDEX "idx_card_categories_active" ON "card_categories" ("is_active");
CREATE UNIQUE INDEX "categories_parent_slug_unique" ON "categories" ("parent_id","slug");
CREATE UNIQUE INDEX "categories_pkey" ON "categories" ("id");
CREATE UNIQUE INDEX "categories_root_slug_unique" ON "categories" ("slug");
CREATE INDEX "idx_categories_active" ON "categories" ("is_active");
CREATE INDEX "idx_categories_deleted" ON "categories" ("is_deleted");
CREATE INDEX "idx_categories_parent" ON "categories" ("parent_id");
CREATE INDEX "idx_categories_slug" ON "categories" ("slug");
CREATE UNIQUE INDEX "category_boards_pkey" ON "category_boards" ("category_id","board_id");
CREATE INDEX "idx_category_boards_board" ON "category_boards" ("board_id");
CREATE INDEX "idx_category_boards_category" ON "category_boards" ("category_id");
CREATE UNIQUE INDEX "category_closure_pkey" ON "category_closure" ("ancestor_id","descendant_id");
CREATE INDEX "idx_closure_ancestor" ON "category_closure" ("ancestor_id");
CREATE INDEX "idx_closure_depth" ON "category_closure" ("depth");
CREATE INDEX "idx_closure_descendant" ON "category_closure" ("descendant_id");
CREATE UNIQUE INDEX "class_timetables_pkey" ON "class_timetables" ("id");
CREATE INDEX "idx_ct_class" ON "class_timetables" ("institution_class_section_id");
CREATE INDEX "idx_ct_period" ON "class_timetables" ("period_id");
CREATE INDEX "idx_ct_subject" ON "class_timetables" ("subject_id");
CREATE INDEX "idx_ct_teacher" ON "class_timetables" ("teacher_id");
CREATE INDEX "idx_ct_year" ON "class_timetables" ("academic_year_id");
CREATE UNIQUE INDEX "uq_ct_slot" ON "class_timetables" ("institution_class_section_id","academic_year_id","day_of_week","period_id");
CREATE UNIQUE INDEX "designations_pkey" ON "designations" ("id");
CREATE UNIQUE INDEX "designations_slug_key" ON "designations" ("slug");
CREATE INDEX "idx_designations_active" ON "designations" ("is_active");
CREATE INDEX "idx_designations_deleted" ON "designations" ("is_deleted");
CREATE INDEX "idx_designations_slug" ON "designations" ("slug");
CREATE UNIQUE INDEX "document_template_fields_pkey" ON "document_template_fields" ("id");
CREATE INDEX "idx_document_template_fields_sort" ON "document_template_fields" ("template_id","sort_order");
CREATE INDEX "idx_document_template_fields_template" ON "document_template_fields" ("template_id");
CREATE UNIQUE INDEX "uq_document_template_fields_name" ON "document_template_fields" ("template_id","field_name");
CREATE UNIQUE INDEX "document_templates_pkey" ON "document_templates" ("id");
CREATE INDEX "idx_document_templates_active" ON "document_templates" ("is_active");
CREATE INDEX "idx_document_templates_category" ON "document_templates" ("card_category_id");
CREATE INDEX "idx_document_templates_marketplace" ON "document_templates" ("card_category_id","is_public","is_active");
CREATE INDEX "idx_document_templates_public" ON "document_templates" ("is_public");
CREATE UNIQUE INDEX "facility_types_pkey" ON "facility_types" ("id");
CREATE UNIQUE INDEX "facility_types_slug_key" ON "facility_types" ("slug");
CREATE UNIQUE INDEX "generated_documents_pkey" ON "generated_documents" ("id");
CREATE INDEX "idx_generated_documents_created_at" ON "generated_documents" ("created_at");
CREATE INDEX "idx_generated_documents_institution" ON "generated_documents" ("institution_id");
CREATE INDEX "idx_generated_documents_reference" ON "generated_documents" ("reference_type","reference_id");
CREATE INDEX "idx_generated_documents_template" ON "generated_documents" ("template_id");
CREATE INDEX "idx_iac_active" ON "institution_academic_classes" ("is_active");
CREATE INDEX "idx_iac_category" ON "institution_academic_classes" ("category_id");
CREATE INDEX "idx_iac_institution" ON "institution_academic_classes" ("institution_id");
CREATE INDEX "idx_iac_year" ON "institution_academic_classes" ("academic_year_id");
CREATE UNIQUE INDEX "institution_academic_classes_pkey" ON "institution_academic_classes" ("id");
CREATE UNIQUE INDEX "uq_iac_unique" ON "institution_academic_classes" ("institution_id","academic_year_id","category_id");
CREATE INDEX "idx_institution_categories_category" ON "institution_categories" ("category_id");
CREATE INDEX "idx_institution_categories_institution" ON "institution_categories" ("institution_id");
CREATE UNIQUE INDEX "institution_categories_pkey" ON "institution_categories" ("institution_id","category_id");
CREATE INDEX "idx_ics_class" ON "institution_class_sections" ("institution_class_id");
CREATE INDEX "idx_ics_section" ON "institution_class_sections" ("section_id");
CREATE INDEX "idx_ics_teacher" ON "institution_class_sections" ("class_teacher_id");
CREATE UNIQUE INDEX "institution_class_sections_pkey" ON "institution_class_sections" ("id");
CREATE UNIQUE INDEX "uq_ics_unique" ON "institution_class_sections" ("institution_class_id","section_id");
CREATE INDEX "idx_institution_cutoffs_institution" ON "institution_cutoffs" ("institution_id");
CREATE INDEX "idx_institution_cutoffs_program" ON "institution_cutoffs" ("program_id");
CREATE UNIQUE INDEX "institution_cutoffs_pkey" ON "institution_cutoffs" ("id");
CREATE INDEX "idx_institution_media_institution" ON "institution_media" ("institution_id");
CREATE INDEX "idx_institution_media_type" ON "institution_media" ("media_type");
CREATE UNIQUE INDEX "institution_media_pkey" ON "institution_media" ("id");
CREATE INDEX "idx_institution_memberships_institution" ON "institution_memberships" ("institution_id");
CREATE INDEX "idx_institution_memberships_user" ON "institution_memberships" ("user_id");
CREATE UNIQUE INDEX "institution_memberships_institution_id_user_id_key" ON "institution_memberships" ("institution_id","user_id");
CREATE UNIQUE INDEX "institution_memberships_pkey" ON "institution_memberships" ("id");
CREATE UNIQUE INDEX "institution_memberships_unique_active" ON "institution_memberships" ("institution_id","user_id","role_id");
CREATE INDEX "idx_institution_news_institution" ON "institution_news" ("institution_id");
CREATE INDEX "idx_institution_news_published" ON "institution_news" ("published_at");
CREATE INDEX "idx_institution_news_slug" ON "institution_news" ("slug");
CREATE UNIQUE INDEX "institution_news_pkey" ON "institution_news" ("id");
CREATE UNIQUE INDEX "uq_institution_news_institution_slug" ON "institution_news" ("institution_id","slug");
CREATE UNIQUE INDEX "institution_notification_sett_institution_id_notification_t_key" ON "institution_notification_settings" ("institution_id","notification_type");
CREATE UNIQUE INDEX "institution_notification_settings_pkey" ON "institution_notification_settings" ("id");
CREATE INDEX "idx_institution_placements_institution" ON "institution_placements" ("institution_id");
CREATE INDEX "idx_institution_placements_year" ON "institution_placements" ("year");
CREATE UNIQUE INDEX "institution_placements_pkey" ON "institution_placements" ("id");
CREATE INDEX "idx_institution_profiles_board" ON "institution_profiles" ("board_id");
CREATE INDEX "idx_institution_profiles_location" ON "institution_profiles" ("location_id");
CREATE INDEX "idx_institution_profiles_parent_university" ON "institution_profiles" ("parent_university_id");
CREATE INDEX "idx_institution_profiles_slug" ON "institution_profiles" ("slug");
CREATE INDEX "idx_institution_profiles_subtype" ON "institution_profiles" ("institution_subtype_id");
CREATE INDEX "idx_institution_profiles_type" ON "institution_profiles" ("institution_type_id");
CREATE UNIQUE INDEX "institution_profiles_pkey" ON "institution_profiles" ("id");
CREATE UNIQUE INDEX "institution_profiles_slug_key" ON "institution_profiles" ("slug");
CREATE INDEX "idx_institution_programs_board" ON "institution_programs" ("board_id");
CREATE INDEX "idx_institution_programs_institution" ON "institution_programs" ("institution_id");
CREATE INDEX "idx_institution_programs_slug" ON "institution_programs" ("slug");
CREATE INDEX "idx_institution_programs_type" ON "institution_programs" ("program_type_id");
CREATE INDEX "idx_institution_programs_university" ON "institution_programs" ("university_id");
CREATE INDEX "idx_program_academic_year" ON "institution_programs" ("academic_year_id");
CREATE INDEX "idx_program_class_teacher" ON "institution_programs" ("class_teacher_id");
CREATE UNIQUE INDEX "institution_programs_pkey" ON "institution_programs" ("id");
CREATE UNIQUE INDEX "uq_institution_programs_institution_slug" ON "institution_programs" ("institution_id","slug");
CREATE INDEX "idx_irpd_institution_role" ON "institution_role_permission_denials" ("institution_id","role_id");
CREATE UNIQUE INDEX "institution_role_permission_denials_pkey" ON "institution_role_permission_denials" ("institution_id","role_id","permission_id");
CREATE UNIQUE INDEX "institution_role_permissions_pkey" ON "institution_role_permissions" ("institution_id","role_id","permission_id");
CREATE INDEX "idx_iup_institution_user" ON "institution_user_permissions" ("institution_id","user_id");
CREATE INDEX "idx_iup_permission" ON "institution_user_permissions" ("permission_id");
CREATE INDEX "idx_iup_user" ON "institution_user_permissions" ("user_id");
CREATE UNIQUE INDEX "institution_user_permissions_pkey" ON "institution_user_permissions" ("institution_id","user_id","permission_id");
CREATE INDEX "idx_institution_scholarships_ai_response" ON "institution_scholarships" USING gin ("ai_response");
CREATE INDEX "idx_institution_scholarships_institution" ON "institution_scholarships" ("institution_id");
CREATE UNIQUE INDEX "institution_scholarships_pkey" ON "institution_scholarships" ("id");
CREATE UNIQUE INDEX "institution_subtypes_pkey" ON "institution_subtypes" ("id");
CREATE UNIQUE INDEX "institution_subtypes_slug_key" ON "institution_subtypes" ("slug");
CREATE INDEX "idx_institution_templates_institution" ON "institution_templates" ("institution_id");
CREATE INDEX "idx_institution_templates_template" ON "institution_templates" ("template_id");
CREATE UNIQUE INDEX "institution_templates_institution_id_template_id_key" ON "institution_templates" ("institution_id","template_id");
CREATE UNIQUE INDEX "institution_templates_pkey" ON "institution_templates" ("id");
CREATE UNIQUE INDEX "institution_types_pkey" ON "institution_types" ("id");
CREATE UNIQUE INDEX "institution_types_slug_key" ON "institution_types" ("slug");
CREATE UNIQUE INDEX "languages_pkey" ON "languages" ("id");
CREATE UNIQUE INDEX "languages_slug_key" ON "languages" ("slug");
CREATE INDEX "idx_locations_active" ON "locations" ("is_active");
CREATE INDEX "idx_locations_deleted" ON "locations" ("is_deleted");
CREATE INDEX "idx_locations_name" ON "locations" ("name");
CREATE INDEX "idx_locations_name_trgm" ON "locations" USING gin ("name");
CREATE INDEX "idx_locations_parent" ON "locations" ("parent_id");
CREATE UNIQUE INDEX "idx_locations_parent_slug_unique" ON "locations" ("parent_id","slug");
CREATE INDEX "idx_locations_slug" ON "locations" ("slug");
CREATE INDEX "idx_locations_type" ON "locations" ("type");
CREATE UNIQUE INDEX "locations_pkey" ON "locations" ("id");
CREATE UNIQUE INDEX "notification_preferences_pkey" ON "notification_preferences" ("id");
CREATE UNIQUE INDEX "notification_preferences_user_id_notification_type_key" ON "notification_preferences" ("user_id","notification_type");
CREATE INDEX "idx_notification_recipients_important" ON "notification_recipients" ("user_id","is_important");
CREATE INDEX "idx_notification_recipients_notification" ON "notification_recipients" ("notification_id");
CREATE INDEX "idx_notification_recipients_unread" ON "notification_recipients" ("user_id","is_read");
CREATE INDEX "idx_notification_recipients_user" ON "notification_recipients" ("user_id");
CREATE UNIQUE INDEX "notification_recipients_notification_id_user_id_key" ON "notification_recipients" ("notification_id","user_id");
CREATE UNIQUE INDEX "notification_recipients_pkey" ON "notification_recipients" ("id");
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates" ("code");
CREATE UNIQUE INDEX "notification_templates_pkey" ON "notification_templates" ("id");
CREATE UNIQUE INDEX "notifications_pkey" ON "notifications" ("id");
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions" ("code");
CREATE UNIQUE INDEX "permissions_pkey" ON "permissions" ("id");
CREATE INDEX "idx_program_categories_category" ON "program_categories" ("category_id");
CREATE INDEX "idx_program_categories_program" ON "program_categories" ("program_id");
CREATE UNIQUE INDEX "program_categories_pkey" ON "program_categories" ("program_id","category_id");
CREATE INDEX "idx_program_fee_components_program" ON "program_fee_components" ("program_id");
CREATE UNIQUE INDEX "program_fee_components_pkey" ON "program_fee_components" ("id");
CREATE INDEX "idx_program_languages_language" ON "program_languages" ("language_id");
CREATE INDEX "idx_program_languages_program" ON "program_languages" ("program_id");
CREATE UNIQUE INDEX "program_languages_pkey" ON "program_languages" ("program_id","language_id");
CREATE INDEX "idx_program_media_program" ON "program_media" ("program_id");
CREATE INDEX "idx_program_media_type" ON "program_media" ("media_type");
CREATE UNIQUE INDEX "program_media_pkey" ON "program_media" ("id");
CREATE INDEX "idx_psct_program_section" ON "program_section_class_teachers" ("program_id","section_id");
CREATE INDEX "idx_psct_teacher" ON "program_section_class_teachers" ("teacher_id");
CREATE UNIQUE INDEX "program_section_class_teachers_pkey" ON "program_section_class_teachers" ("id");
CREATE UNIQUE INDEX "uq_psct" ON "program_section_class_teachers" ("program_id","section_id","academic_year_id");
CREATE INDEX "idx_program_sections_program" ON "program_sections" ("program_id");
CREATE INDEX "idx_program_sections_section" ON "program_sections" ("section_id");
CREATE UNIQUE INDEX "program_sections_pkey" ON "program_sections" ("program_id","section_id");
CREATE INDEX "idx_pst_program_section" ON "program_subject_teachers" ("program_id","section_id");
CREATE INDEX "idx_pst_teacher" ON "program_subject_teachers" ("teacher_id");
CREATE UNIQUE INDEX "program_subject_teachers_pkey" ON "program_subject_teachers" ("id");
CREATE UNIQUE INDEX "uq_pst" ON "program_subject_teachers" ("program_id","section_id","subject_id","academic_year_id");
CREATE INDEX "idx_program_subjects_program" ON "program_subjects" ("program_id");
CREATE INDEX "idx_program_subjects_subject" ON "program_subjects" ("subject_id");
CREATE UNIQUE INDEX "program_subjects_pkey" ON "program_subjects" ("program_id","subject_id");
CREATE UNIQUE INDEX "program_types_pkey" ON "program_types" ("id");
CREATE UNIQUE INDEX "program_types_slug_key" ON "program_types" ("slug");
CREATE UNIQUE INDEX "role_permissions_pkey" ON "role_permissions" ("role_id","permission_id");
CREATE UNIQUE INDEX "roles_code_key" ON "roles" ("code");
CREATE UNIQUE INDEX "roles_code_unique" ON "roles" ("code");
CREATE UNIQUE INDEX "roles_name_key" ON "roles" ("name");
CREATE UNIQUE INDEX "roles_pkey" ON "roles" ("id");
CREATE UNIQUE INDEX "scope_types_code_key" ON "scope_types" ("code");
CREATE UNIQUE INDEX "scope_types_pkey" ON "scope_types" ("id");
CREATE INDEX "idx_sections_active" ON "sections" ("is_active");
CREATE INDEX "idx_sections_deleted" ON "sections" ("is_deleted");
CREATE INDEX "idx_sections_slug" ON "sections" ("slug");
CREATE UNIQUE INDEX "sections_pkey" ON "sections" ("id");
CREATE UNIQUE INDEX "sections_slug_key" ON "sections" ("slug");
CREATE UNIQUE INDEX "sessions_pkey" ON "sessions" ("id");
CREATE INDEX "idx_skills_active" ON "skills" ("is_active");
CREATE INDEX "idx_skills_deleted" ON "skills" ("is_deleted");
CREATE INDEX "idx_skills_slug" ON "skills" ("slug");
CREATE UNIQUE INDEX "skills_pkey" ON "skills" ("id");
CREATE UNIQUE INDEX "skills_slug_key" ON "skills" ("slug");
CREATE INDEX "idx_student_achievements_card_category_id" ON "student_achievements" ("card_category_id");
CREATE INDEX "idx_student_achievements_category" ON "student_achievements" ("card_category_id");
CREATE INDEX "idx_student_achievements_template_id" ON "student_achievements" ("template_id");
CREATE INDEX "idx_student_achievements_institution_id" ON "student_achievements" ("institution_id");
CREATE UNIQUE INDEX "student_achievements_pkey" ON "student_achievements" ("id");
CREATE INDEX "idx_saa_assignment" ON "student_assignment_answers" ("student_assignment_id");
CREATE INDEX "idx_saa_question" ON "student_assignment_answers" ("question_id");
CREATE UNIQUE INDEX "student_assignment_answers_pkey" ON "student_assignment_answers" ("id");
CREATE UNIQUE INDEX "student_assignment_submission_files_pkey" ON "student_assignment_submission_files" ("id");
CREATE UNIQUE INDEX "student_assignments_pkey" ON "student_assignments" ("id");
CREATE UNIQUE INDEX "uq_student_assignment" ON "student_assignments" ("assignment_id","student_id");
CREATE INDEX "idx_sa_session" ON "student_attendance" ("attendance_session_id");
CREATE INDEX "idx_sa_status" ON "student_attendance" ("status");
CREATE INDEX "idx_sa_student" ON "student_attendance" ("student_id");
CREATE INDEX "idx_sa_student_session" ON "student_attendance" ("student_id","attendance_session_id");
CREATE UNIQUE INDEX "student_attendance_pkey" ON "student_attendance" ("id");
CREATE UNIQUE INDEX "uq_student_attendance" ON "student_attendance" ("attendance_session_id","student_id");
CREATE UNIQUE INDEX "student_documents_pkey" ON "student_documents" ("id");
CREATE INDEX "idx_student_enrollment_class" ON "student_enrollments" ("class_category_id");
CREATE INDEX "idx_student_enrollment_institution" ON "student_enrollments" ("institution_id");
CREATE INDEX "idx_student_enrollment_program" ON "student_enrollments" ("program_id");
CREATE INDEX "idx_student_enrollment_student" ON "student_enrollments" ("student_id");
CREATE INDEX "idx_student_enrollment_year" ON "student_enrollments" ("academic_year_id");
CREATE UNIQUE INDEX "student_enrollments_pkey" ON "student_enrollments" ("id");
CREATE UNIQUE INDEX "uq_student_active_enrollment" ON "student_enrollments" ("student_id");
CREATE INDEX "idx_student_guardian_student" ON "student_guardians" ("student_id");
CREATE INDEX "idx_student_guardian_user" ON "student_guardians" ("guardian_user_id");
CREATE UNIQUE INDEX "student_guardians_pkey" ON "student_guardians" ("id");
CREATE INDEX "idx_spa_session" ON "student_period_attendance" ("attendance_session_id");
CREATE INDEX "idx_spa_slot" ON "student_period_attendance" ("slot_id");
CREATE INDEX "idx_spa_slot_session" ON "student_period_attendance" ("slot_id","attendance_session_id");
CREATE INDEX "idx_spa_student" ON "student_period_attendance" ("student_id");
CREATE INDEX "idx_spa_student_session" ON "student_period_attendance" ("student_id","attendance_session_id");
CREATE INDEX "idx_spa_student_slot" ON "student_period_attendance" ("student_id","slot_id");
CREATE UNIQUE INDEX "student_period_attendance_pkey" ON "student_period_attendance" ("id");
CREATE UNIQUE INDEX "uq_student_period_attendance" ON "student_period_attendance" ("attendance_session_id","student_id","slot_id");
CREATE UNIQUE INDEX "student_profiles_pkey" ON "student_profiles" ("id");
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles" ("user_id");
CREATE INDEX "idx_subjects_active" ON "subjects" ("is_active");
CREATE INDEX "idx_subjects_board" ON "subjects" ("board_id");
CREATE INDEX "idx_subjects_category" ON "subjects" ("category_id");
CREATE INDEX "idx_subjects_category_board" ON "subjects" ("category_id","board_id");
CREATE INDEX "idx_subjects_deleted" ON "subjects" ("is_deleted");
CREATE INDEX "idx_subjects_slug" ON "subjects" ("slug");
CREATE UNIQUE INDEX "subjects_pkey" ON "subjects" ("id");
CREATE UNIQUE INDEX "subjects_unique_category_board_slug" ON "subjects" ("category_id","board_id","slug");
CREATE UNIQUE INDEX "support_ticket_attachments_pkey" ON "support_ticket_attachments" ("id");
CREATE INDEX "idx_support_ticket_history_ticket" ON "support_ticket_history" ("ticket_id");
CREATE UNIQUE INDEX "support_ticket_history_pkey" ON "support_ticket_history" ("id");
CREATE INDEX "idx_support_ticket_messages_reply" ON "support_ticket_messages" ("reply_to_message_id");
CREATE INDEX "idx_support_ticket_messages_ticket" ON "support_ticket_messages" ("ticket_id");
CREATE UNIQUE INDEX "support_ticket_messages_pkey" ON "support_ticket_messages" ("id");
CREATE INDEX "idx_support_ticket_assigned_to" ON "support_tickets" ("assigned_to");
CREATE INDEX "idx_support_ticket_category" ON "support_tickets" ("category");
CREATE INDEX "idx_support_ticket_created_by" ON "support_tickets" ("created_by");
CREATE INDEX "idx_support_ticket_institution" ON "support_tickets" ("institution_id");
CREATE INDEX "idx_support_ticket_priority" ON "support_tickets" ("priority");
CREATE INDEX "idx_support_ticket_status" ON "support_tickets" ("status");
CREATE UNIQUE INDEX "support_tickets_pkey" ON "support_tickets" ("id");
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets" ("ticket_number");
CREATE INDEX "idx_syllabi_institution" ON "syllabi" ("institution_id");
CREATE INDEX "idx_syllabi_subject" ON "syllabi" ("subject_id");
CREATE INDEX "idx_syllabi_template" ON "syllabi" ("is_template");
CREATE UNIQUE INDEX "syllabi_pkey" ON "syllabi" ("id");
CREATE UNIQUE INDEX "syllabus_inheritance_logs_pkey" ON "syllabus_inheritance_logs" ("id");
CREATE INDEX "idx_syllabus_closure_ancestor" ON "syllabus_node_closure" ("ancestor_id");
CREATE INDEX "idx_syllabus_closure_depth" ON "syllabus_node_closure" ("depth");
CREATE INDEX "idx_syllabus_closure_descendant" ON "syllabus_node_closure" ("descendant_id");
CREATE UNIQUE INDEX "syllabus_node_closure_pkey" ON "syllabus_node_closure" ("ancestor_id","descendant_id");
CREATE INDEX "idx_syllabus_nodes_metadata" ON "syllabus_nodes" USING gin ("metadata");
CREATE INDEX "idx_syllabus_nodes_parent" ON "syllabus_nodes" ("parent_id");
CREATE INDEX "idx_syllabus_nodes_sort" ON "syllabus_nodes" ("syllabus_id","sort_order");
CREATE INDEX "idx_syllabus_nodes_syllabus" ON "syllabus_nodes" ("syllabus_id");
CREATE INDEX "idx_syllabus_nodes_type" ON "syllabus_nodes" ("node_type");
CREATE UNIQUE INDEX "syllabus_nodes_pkey" ON "syllabus_nodes" ("id");
CREATE INDEX "idx_tcsa_class_section" ON "teacher_class_subject_assignments" ("institution_class_section_id");
CREATE INDEX "idx_tcsa_subject" ON "teacher_class_subject_assignments" ("subject_id");
CREATE INDEX "idx_tcsa_teacher" ON "teacher_class_subject_assignments" ("teacher_id");
CREATE INDEX "idx_tcsa_year" ON "teacher_class_subject_assignments" ("academic_year_id");
CREATE UNIQUE INDEX "teacher_class_subject_assignments_pkey" ON "teacher_class_subject_assignments" ("id");
CREATE UNIQUE INDEX "uq_tcsa_unique" ON "teacher_class_subject_assignments" ("institution_class_section_id","subject_id","academic_year_id");
CREATE INDEX "idx_tte_day" ON "timetable_entries" ("day_of_week");
CREATE INDEX "idx_tte_program_section" ON "timetable_entries" ("program_id","section_id");
CREATE INDEX "idx_tte_subject" ON "timetable_entries" ("subject_id");
CREATE INDEX "idx_tte_teacher" ON "timetable_entries" ("teacher_id");
CREATE UNIQUE INDEX "timetable_entries_pkey" ON "timetable_entries" ("id");
CREATE UNIQUE INDEX "uq_timetable_entry" ON "timetable_entries" ("academic_year_id","program_id","section_id","day_of_week","slot_id");
CREATE INDEX "idx_tp_institution" ON "timetable_periods" ("institution_id");
CREATE UNIQUE INDEX "timetable_periods_pkey" ON "timetable_periods" ("id");
CREATE INDEX "idx_slot_institution" ON "timetable_slots" ("institution_id");
CREATE UNIQUE INDEX "timetable_slots_pkey" ON "timetable_slots" ("id");
CREATE UNIQUE INDEX "uq_slot_order" ON "timetable_slots" ("institution_id","slot_order");
CREATE UNIQUE INDEX "user_certifications_pkey" ON "user_certifications" ("id");
CREATE UNIQUE INDEX "user_education_pkey" ON "user_education" ("id");
CREATE UNIQUE INDEX "user_experience_pkey" ON "user_experience" ("id");
CREATE UNIQUE INDEX "user_locations_pkey" ON "user_locations" ("id");
CREATE UNIQUE INDEX "user_locations_user_id_key" ON "user_locations" ("user_id");
CREATE UNIQUE INDEX "user_profiles_pkey" ON "user_profiles" ("user_id");
CREATE UNIQUE INDEX "user_roles_pkey" ON "user_roles" ("user_id","role_id");
CREATE INDEX "idx_user_teaching_categories_category" ON "user_teaching_categories" ("category_id");
CREATE INDEX "idx_user_teaching_categories_user" ON "user_teaching_categories" ("user_id");
CREATE UNIQUE INDEX "user_teaching_categories_pkey" ON "user_teaching_categories" ("user_id","category_id");
CREATE INDEX "idx_user_teaching_subjects_subject" ON "user_teaching_subjects" ("subject_id");
CREATE INDEX "idx_user_teaching_subjects_user" ON "user_teaching_subjects" ("user_id");
CREATE UNIQUE INDEX "user_teaching_subjects_pkey" ON "user_teaching_subjects" ("user_id","subject_id");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");
CREATE INDEX "idx_visitor_activities_tracking_token" ON "visitor_activities" ("tracking_token");
CREATE INDEX "idx_visitor_activities_visited_at" ON "visitor_activities" ("visited_at");
CREATE UNIQUE INDEX "visitor_activities_pkey" ON "visitor_activities" ("id");
CREATE UNIQUE INDEX "visitor_sessions_pkey" ON "visitor_sessions" ("id");
CREATE UNIQUE INDEX "visitor_sessions_tracking_token_key" ON "visitor_sessions" ("tracking_token");
ALTER TABLE "academic_years" ADD CONSTRAINT "fk_academic_year_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "assignment_question_options" ADD CONSTRAINT "fk_assignment_option_question" FOREIGN KEY ("question_id") REFERENCES "assignment_questions"("id") ON DELETE CASCADE;
ALTER TABLE "assignment_questions" ADD CONSTRAINT "fk_assignment_question_assignment" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE;
ALTER TABLE "assignment_targets" ADD CONSTRAINT "fk_target_assignment" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE;
ALTER TABLE "assignment_template_question_files" ADD CONSTRAINT "fk_atqf_question" FOREIGN KEY ("question_id") REFERENCES "assignment_template_questions"("id") ON DELETE CASCADE;
ALTER TABLE "assignment_template_question_options" ADD CONSTRAINT "fk_atqo_question" FOREIGN KEY ("question_id") REFERENCES "assignment_template_questions"("id") ON DELETE CASCADE;
ALTER TABLE "assignment_template_questions" ADD CONSTRAINT "fk_atq_template" FOREIGN KEY ("template_id") REFERENCES "assignment_templates"("id") ON DELETE CASCADE;
ALTER TABLE "assignment_templates" ADD CONSTRAINT "fk_assignment_templates_blocked_by" FOREIGN KEY ("blocked_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "assignment_templates" ADD CONSTRAINT "fk_at_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id");
ALTER TABLE "assignment_templates" ADD CONSTRAINT "fk_at_institution" FOREIGN KEY ("source_institution_id") REFERENCES "institution_profiles"("id") ON DELETE SET NULL;
ALTER TABLE "assignment_templates" ADD CONSTRAINT "fk_at_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id");
ALTER TABLE "assignments" ADD CONSTRAINT "fk_assignment_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id");
ALTER TABLE "assignments" ADD CONSTRAINT "fk_assignment_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id");
ALTER TABLE "assignments" ADD CONSTRAINT "fk_assignment_template" FOREIGN KEY ("template_id") REFERENCES "assignment_templates"("id") ON DELETE SET NULL;
ALTER TABLE "assignments" ADD CONSTRAINT "fk_assignment_updater" FOREIGN KEY ("updated_by") REFERENCES "users"("id");
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;
ALTER TABLE "card_categories" ADD CONSTRAINT "fk_card_categories_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "card_categories" ADD CONSTRAINT "fk_card_categories_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE CASCADE;
ALTER TABLE "category_boards" ADD CONSTRAINT "category_boards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE;
ALTER TABLE "category_boards" ADD CONSTRAINT "category_boards_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE;
ALTER TABLE "category_closure" ADD CONSTRAINT "category_closure_ancestor_id_fkey" FOREIGN KEY ("ancestor_id") REFERENCES "categories"("id") ON DELETE CASCADE;
ALTER TABLE "category_closure" ADD CONSTRAINT "category_closure_descendant_id_fkey" FOREIGN KEY ("descendant_id") REFERENCES "categories"("id") ON DELETE CASCADE;
ALTER TABLE "class_timetables" ADD CONSTRAINT "fk_ct_class_section" FOREIGN KEY ("institution_class_section_id") REFERENCES "institution_class_sections"("id") ON DELETE CASCADE;
ALTER TABLE "class_timetables" ADD CONSTRAINT "fk_ct_period" FOREIGN KEY ("period_id") REFERENCES "timetable_periods"("id") ON DELETE CASCADE;
ALTER TABLE "class_timetables" ADD CONSTRAINT "fk_ct_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL;
ALTER TABLE "class_timetables" ADD CONSTRAINT "fk_ct_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "class_timetables" ADD CONSTRAINT "fk_ct_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;
ALTER TABLE "document_template_fields" ADD CONSTRAINT "fk_document_template_fields_template" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE CASCADE;
ALTER TABLE "document_templates" ADD CONSTRAINT "fk_document_templates_category" FOREIGN KEY ("card_category_id") REFERENCES "card_categories"("id") ON DELETE RESTRICT;
ALTER TABLE "document_templates" ADD CONSTRAINT "fk_document_templates_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "document_templates" ADD CONSTRAINT "fk_document_templates_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "generated_documents" ADD CONSTRAINT "fk_generated_documents_generated_by" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "generated_documents" ADD CONSTRAINT "fk_generated_documents_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "generated_documents" ADD CONSTRAINT "fk_generated_documents_template" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE CASCADE;
ALTER TABLE "institution_academic_classes" ADD CONSTRAINT "fk_iac_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;
ALTER TABLE "institution_academic_classes" ADD CONSTRAINT "fk_iac_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT;
ALTER TABLE "institution_academic_classes" ADD CONSTRAINT "fk_iac_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_academic_classes" ADD CONSTRAINT "fk_iac_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_academic_classes" ADD CONSTRAINT "fk_iac_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_categories" ADD CONSTRAINT "fk_institution_categories_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE;
ALTER TABLE "institution_categories" ADD CONSTRAINT "fk_institution_categories_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_class_sections" ADD CONSTRAINT "fk_ics_class" FOREIGN KEY ("institution_class_id") REFERENCES "institution_academic_classes"("id") ON DELETE CASCADE;
ALTER TABLE "institution_class_sections" ADD CONSTRAINT "fk_ics_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT;
ALTER TABLE "institution_class_sections" ADD CONSTRAINT "fk_ics_teacher" FOREIGN KEY ("class_teacher_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_cutoffs" ADD CONSTRAINT "fk_institution_cutoffs_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_cutoffs" ADD CONSTRAINT "fk_institution_cutoffs_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_cutoffs" ADD CONSTRAINT "fk_institution_cutoffs_program" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "institution_cutoffs" ADD CONSTRAINT "fk_institution_cutoffs_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_media" ADD CONSTRAINT "fk_institution_media_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_media" ADD CONSTRAINT "fk_institution_media_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_media" ADD CONSTRAINT "fk_institution_media_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_memberships" ADD CONSTRAINT "institution_memberships_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_memberships" ADD CONSTRAINT "institution_memberships_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT;
ALTER TABLE "institution_memberships" ADD CONSTRAINT "institution_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "institution_news" ADD CONSTRAINT "fk_institution_news_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_news" ADD CONSTRAINT "fk_institution_news_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_news" ADD CONSTRAINT "fk_institution_news_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_notification_settings" ADD CONSTRAINT "institution_notification_settings_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_placements" ADD CONSTRAINT "fk_institution_placements_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_placements" ADD CONSTRAINT "fk_institution_placements_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_placements" ADD CONSTRAINT "fk_institution_placements_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_profiles" ADD CONSTRAINT "fk_institution_profiles_board" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE SET NULL;
ALTER TABLE "institution_profiles" ADD CONSTRAINT "fk_institution_profiles_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_profiles" ADD CONSTRAINT "fk_institution_profiles_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL;
ALTER TABLE "institution_profiles" ADD CONSTRAINT "fk_institution_profiles_parent_university" FOREIGN KEY ("parent_university_id") REFERENCES "institution_profiles"("id") ON DELETE SET NULL;
ALTER TABLE "institution_profiles" ADD CONSTRAINT "fk_institution_profiles_subtype" FOREIGN KEY ("institution_subtype_id") REFERENCES "institution_subtypes"("id") ON DELETE SET NULL;
ALTER TABLE "institution_profiles" ADD CONSTRAINT "fk_institution_profiles_type" FOREIGN KEY ("institution_type_id") REFERENCES "institution_types"("id") ON DELETE RESTRICT;
ALTER TABLE "institution_profiles" ADD CONSTRAINT "fk_institution_profiles_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_programs" ADD CONSTRAINT "fk_institution_programs_board" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE SET NULL;
ALTER TABLE "institution_programs" ADD CONSTRAINT "fk_institution_programs_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_programs" ADD CONSTRAINT "fk_institution_programs_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_programs" ADD CONSTRAINT "fk_institution_programs_type" FOREIGN KEY ("program_type_id") REFERENCES "program_types"("id") ON DELETE RESTRICT;
ALTER TABLE "institution_programs" ADD CONSTRAINT "fk_institution_programs_university" FOREIGN KEY ("university_id") REFERENCES "institution_profiles"("id") ON DELETE SET NULL;
ALTER TABLE "institution_programs" ADD CONSTRAINT "fk_institution_programs_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_programs" ADD CONSTRAINT "fk_program_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT;
ALTER TABLE "institution_programs" ADD CONSTRAINT "fk_program_class_teacher" FOREIGN KEY ("class_teacher_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_role_permission_denials" ADD CONSTRAINT "institution_role_permission_denials_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_role_permission_denials" ADD CONSTRAINT "institution_role_permission_denials_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE;
ALTER TABLE "institution_role_permission_denials" ADD CONSTRAINT "institution_role_permission_denials_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_role_permissions" ADD CONSTRAINT "institution_role_permissions_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_role_permissions" ADD CONSTRAINT "institution_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE;
ALTER TABLE "institution_role_permissions" ADD CONSTRAINT "institution_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_user_permissions" ADD CONSTRAINT "institution_user_permissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");
ALTER TABLE "institution_user_permissions" ADD CONSTRAINT "institution_user_permissions_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_user_permissions" ADD CONSTRAINT "institution_user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE;
ALTER TABLE "institution_user_permissions" ADD CONSTRAINT "institution_user_permissions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id");
ALTER TABLE "institution_user_permissions" ADD CONSTRAINT "institution_user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "institution_scholarships" ADD CONSTRAINT "fk_institution_scholarships_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_scholarships" ADD CONSTRAINT "fk_institution_scholarships_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_scholarships" ADD CONSTRAINT "fk_institution_scholarships_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_templates" ADD CONSTRAINT "fk_institution_templates_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "institution_templates" ADD CONSTRAINT "fk_institution_templates_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "institution_templates" ADD CONSTRAINT "fk_institution_templates_template" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE CASCADE;
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "locations"("id") ON DELETE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "program_categories" ADD CONSTRAINT "fk_program_categories_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE;
ALTER TABLE "program_categories" ADD CONSTRAINT "fk_program_categories_program" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "program_fee_components" ADD CONSTRAINT "fk_program_fee_components_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "program_fee_components" ADD CONSTRAINT "fk_program_fee_components_program" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "program_fee_components" ADD CONSTRAINT "fk_program_fee_components_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "program_languages" ADD CONSTRAINT "fk_program_languages_language" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE;
ALTER TABLE "program_languages" ADD CONSTRAINT "fk_program_languages_program" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "program_media" ADD CONSTRAINT "fk_program_media_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "program_media" ADD CONSTRAINT "fk_program_media_program" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "program_media" ADD CONSTRAINT "fk_program_media_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "program_section_class_teachers" ADD CONSTRAINT "fk_psct_program" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "program_section_class_teachers" ADD CONSTRAINT "fk_psct_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;
ALTER TABLE "program_section_class_teachers" ADD CONSTRAINT "fk_psct_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "program_section_class_teachers" ADD CONSTRAINT "fk_psct_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;
ALTER TABLE "program_sections" ADD CONSTRAINT "program_sections_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "program_sections" ADD CONSTRAINT "program_sections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;
ALTER TABLE "program_subject_teachers" ADD CONSTRAINT "fk_pst_program" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "program_subject_teachers" ADD CONSTRAINT "fk_pst_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;
ALTER TABLE "program_subject_teachers" ADD CONSTRAINT "fk_pst_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE;
ALTER TABLE "program_subject_teachers" ADD CONSTRAINT "fk_pst_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "program_subject_teachers" ADD CONSTRAINT "fk_pst_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;
ALTER TABLE "program_subjects" ADD CONSTRAINT "program_subjects_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "program_subjects" ADD CONSTRAINT "program_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "scope_types"("id") ON DELETE RESTRICT;
ALTER TABLE "roles" ADD CONSTRAINT "roles_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "scope_types"("id");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_card_category_id_fkey" FOREIGN KEY ("card_category_id") REFERENCES "card_categories"("id") ON DELETE RESTRICT;
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE RESTRICT;
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT;
ALTER TABLE "student_assignment_answers" ADD CONSTRAINT "fk_saa_option" FOREIGN KEY ("selected_option_id") REFERENCES "assignment_question_options"("id") ON DELETE SET NULL;
ALTER TABLE "student_assignment_answers" ADD CONSTRAINT "fk_saa_question" FOREIGN KEY ("question_id") REFERENCES "assignment_questions"("id") ON DELETE CASCADE;
ALTER TABLE "student_assignment_answers" ADD CONSTRAINT "fk_saa_student_assignment" FOREIGN KEY ("student_assignment_id") REFERENCES "student_assignments"("id") ON DELETE CASCADE;
ALTER TABLE "student_assignment_submission_files" ADD CONSTRAINT "fk_sasf_answer" FOREIGN KEY ("answer_id") REFERENCES "student_assignment_answers"("id") ON DELETE CASCADE;
ALTER TABLE "student_assignments" ADD CONSTRAINT "fk_sa_assignment" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE;
ALTER TABLE "student_assignments" ADD CONSTRAINT "fk_sa_checker" FOREIGN KEY ("checked_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "student_assignments" ADD CONSTRAINT "fk_sa_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_attendance_session_id_fkey" FOREIGN KEY ("attendance_session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE;
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "student_documents" ADD CONSTRAINT "fk_student_document_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "student_documents" ADD CONSTRAINT "fk_student_document_verified_by" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "fk_student_enrollment_class" FOREIGN KEY ("class_category_id") REFERENCES "categories"("id") ON DELETE RESTRICT;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "fk_student_enrollment_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "fk_student_enrollment_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "fk_student_enrollment_previous" FOREIGN KEY ("previous_enrollment_id") REFERENCES "student_enrollments"("id") ON DELETE SET NULL;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "fk_student_enrollment_program" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE SET NULL;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "fk_student_enrollment_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "fk_student_enrollment_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "fk_student_enrollment_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "fk_student_enrollment_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT;
ALTER TABLE "student_guardians" ADD CONSTRAINT "fk_student_guardian_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "student_guardians" ADD CONSTRAINT "fk_student_guardian_user" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "student_period_attendance" ADD CONSTRAINT "student_period_attendance_attendance_session_id_fkey" FOREIGN KEY ("attendance_session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE;
ALTER TABLE "student_period_attendance" ADD CONSTRAINT "student_period_attendance_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "timetable_slots"("id") ON DELETE CASCADE;
ALTER TABLE "student_period_attendance" ADD CONSTRAINT "student_period_attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "student_profiles" ADD CONSTRAINT "fk_student_profile_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "student_profiles" ADD CONSTRAINT "fk_student_profile_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "student_profiles" ADD CONSTRAINT "fk_student_profile_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE;
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE;
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "fk_attachment_message" FOREIGN KEY ("ticket_message_id") REFERENCES "support_ticket_messages"("id") ON DELETE CASCADE;
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "fk_attachment_user" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "support_ticket_history" ADD CONSTRAINT "fk_ticket_history_ticket" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE;
ALTER TABLE "support_ticket_history" ADD CONSTRAINT "fk_ticket_history_user" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "fk_support_ticket_message_reply" FOREIGN KEY ("reply_to_message_id") REFERENCES "support_ticket_messages"("id") ON DELETE SET NULL;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "fk_ticket_message_ticket" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "fk_ticket_message_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "fk_support_ticket_assigned_to" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "support_tickets" ADD CONSTRAINT "fk_support_ticket_closed_by" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "support_tickets" ADD CONSTRAINT "fk_support_ticket_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "fk_support_ticket_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE SET NULL;
ALTER TABLE "support_tickets" ADD CONSTRAINT "fk_support_ticket_resolved_by" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "syllabi" ADD CONSTRAINT "fk_syllabi_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "syllabi" ADD CONSTRAINT "fk_syllabi_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "syllabi" ADD CONSTRAINT "fk_syllabi_parent" FOREIGN KEY ("parent_syllabus_id") REFERENCES "syllabi"("id") ON DELETE SET NULL;
ALTER TABLE "syllabi" ADD CONSTRAINT "fk_syllabi_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE;
ALTER TABLE "syllabi" ADD CONSTRAINT "fk_syllabi_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "syllabus_inheritance_logs" ADD CONSTRAINT "fk_syllabus_inherit_institution" FOREIGN KEY ("institution_syllabus_id") REFERENCES "syllabi"("id") ON DELETE CASCADE;
ALTER TABLE "syllabus_inheritance_logs" ADD CONSTRAINT "fk_syllabus_inherit_template" FOREIGN KEY ("template_syllabus_id") REFERENCES "syllabi"("id") ON DELETE CASCADE;
ALTER TABLE "syllabus_inheritance_logs" ADD CONSTRAINT "fk_syllabus_inherit_user" FOREIGN KEY ("inherited_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "syllabus_node_closure" ADD CONSTRAINT "fk_syllabus_closure_ancestor" FOREIGN KEY ("ancestor_id") REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE;
ALTER TABLE "syllabus_node_closure" ADD CONSTRAINT "fk_syllabus_closure_descendant" FOREIGN KEY ("descendant_id") REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE;
ALTER TABLE "syllabus_nodes" ADD CONSTRAINT "fk_syllabus_nodes_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "syllabus_nodes" ADD CONSTRAINT "fk_syllabus_nodes_parent" FOREIGN KEY ("parent_id") REFERENCES "syllabus_nodes"("id") ON DELETE CASCADE;
ALTER TABLE "syllabus_nodes" ADD CONSTRAINT "fk_syllabus_nodes_syllabus" FOREIGN KEY ("syllabus_id") REFERENCES "syllabi"("id") ON DELETE CASCADE;
ALTER TABLE "syllabus_nodes" ADD CONSTRAINT "fk_syllabus_nodes_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "teacher_class_subject_assignments" ADD CONSTRAINT "fk_tcsa_class_section" FOREIGN KEY ("institution_class_section_id") REFERENCES "institution_class_sections"("id") ON DELETE CASCADE;
ALTER TABLE "teacher_class_subject_assignments" ADD CONSTRAINT "fk_tcsa_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE;
ALTER TABLE "teacher_class_subject_assignments" ADD CONSTRAINT "fk_tcsa_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "teacher_class_subject_assignments" ADD CONSTRAINT "fk_tcsa_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;
ALTER TABLE "timetable_entries" ADD CONSTRAINT "fk_tte_program" FOREIGN KEY ("program_id") REFERENCES "institution_programs"("id") ON DELETE CASCADE;
ALTER TABLE "timetable_entries" ADD CONSTRAINT "fk_tte_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE;
ALTER TABLE "timetable_entries" ADD CONSTRAINT "fk_tte_slot" FOREIGN KEY ("slot_id") REFERENCES "timetable_slots"("id") ON DELETE CASCADE;
ALTER TABLE "timetable_entries" ADD CONSTRAINT "fk_tte_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE;
ALTER TABLE "timetable_entries" ADD CONSTRAINT "fk_tte_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "timetable_entries" ADD CONSTRAINT "fk_tte_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE;
ALTER TABLE "timetable_periods" ADD CONSTRAINT "fk_tp_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "timetable_slots" ADD CONSTRAINT "fk_tts_institution" FOREIGN KEY ("institution_id") REFERENCES "institution_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "user_certifications" ADD CONSTRAINT "user_certifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_education" ADD CONSTRAINT "user_education_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_experience" ADD CONSTRAINT "user_experience_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "locations"("id") ON DELETE SET NULL;
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "locations"("id") ON DELETE SET NULL;
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "locations"("id") ON DELETE SET NULL;
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "locations"("id") ON DELETE SET NULL;
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL;
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_under_institution_id_fkey" FOREIGN KEY ("under_institution_id") REFERENCES "institution_profiles"("id") ON DELETE SET NULL;
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_teaching_categories" ADD CONSTRAINT "user_teaching_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE;
ALTER TABLE "user_teaching_categories" ADD CONSTRAINT "user_teaching_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_teaching_subjects" ADD CONSTRAINT "user_teaching_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE;
ALTER TABLE "user_teaching_subjects" ADD CONSTRAINT "user_teaching_subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;
