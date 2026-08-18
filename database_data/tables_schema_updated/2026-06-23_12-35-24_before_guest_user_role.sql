--
-- PostgreSQL database dump
--

\restrict FoW9cAIsoiUtuCowj7TaFdkjni9SLKbfyFSCQOnPD2wo8bFAV2S1PzAb5jfthFb

-- Dumped from database version 17.10 (21f7c76)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: teacher_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.teacher_type AS ENUM (
    'individual_teacher',
    'institute_teacher'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academic_session_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_session_templates (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer,
    CONSTRAINT chk_academic_session_template_dates CHECK ((end_date >= start_date))
);


--
-- Name: academic_session_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.academic_session_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: academic_session_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.academic_session_templates_id_seq OWNED BY public.academic_session_templates.id;


--
-- Name: academic_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_years (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    name character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    session_template_id integer,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: academic_years_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.academic_years_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: academic_years_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.academic_years_id_seq OWNED BY public.academic_years.id;


--
-- Name: ai_content_field_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_content_field_settings (
    id integer NOT NULL,
    content_type_id integer NOT NULL,
    field_key character varying(100) NOT NULL,
    label character varying(150) NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ai_content_field_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_content_field_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_content_field_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_content_field_settings_id_seq OWNED BY public.ai_content_field_settings.id;


--
-- Name: ai_content_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_content_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    provider_id integer NOT NULL,
    prompt_template text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ai_content_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_content_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_content_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_content_types_id_seq OWNED BY public.ai_content_types.id;


--
-- Name: ai_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_providers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    base_url text NOT NULL,
    model_name character varying(100),
    chat_id text,
    token text,
    token_expires_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_response_id text,
    institution_id integer,
    provider_scope character varying(20) DEFAULT 'platform'::character varying NOT NULL,
    CONSTRAINT chk_ai_provider_scope CHECK (((provider_scope)::text = ANY ((ARRAY['platform'::character varying, 'institution'::character varying])::text[])))
);


--
-- Name: ai_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_providers_id_seq OWNED BY public.ai_providers.id;


--
-- Name: app_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_migrations (
    key text NOT NULL,
    applied_at timestamp without time zone DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id smallint DEFAULT 1 NOT NULL,
    tracking_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tracker_update_interval_minutes integer DEFAULT 60 NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer,
    CONSTRAINT single_row_check CHECK ((id = 1))
);


--
-- Name: assignment_question_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_question_files (
    id integer NOT NULL,
    question_id integer NOT NULL,
    file_url text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: assignment_question_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignment_question_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assignment_question_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignment_question_files_id_seq OWNED BY public.assignment_question_files.id;


--
-- Name: assignment_question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_question_options (
    id integer NOT NULL,
    question_id integer NOT NULL,
    option_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 1 NOT NULL
);


--
-- Name: assignment_question_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignment_question_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assignment_question_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignment_question_options_id_seq OWNED BY public.assignment_question_options.id;


--
-- Name: assignment_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_questions (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    question_text text NOT NULL,
    question_type character varying(20) NOT NULL,
    marks numeric(8,2) NOT NULL,
    display_order integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: assignment_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignment_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assignment_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignment_questions_id_seq OWNED BY public.assignment_questions.id;


--
-- Name: assignment_syllabus_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_syllabus_nodes (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    syllabus_node_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: assignment_syllabus_nodes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignment_syllabus_nodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assignment_syllabus_nodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignment_syllabus_nodes_id_seq OWNED BY public.assignment_syllabus_nodes.id;


--
-- Name: assignment_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_targets (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    program_id integer
);


--
-- Name: assignment_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignment_targets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assignment_targets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignment_targets_id_seq OWNED BY public.assignment_targets.id;


--
-- Name: assignment_template_question_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_template_question_files (
    id integer NOT NULL,
    question_id integer NOT NULL,
    file_url text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: assignment_template_question_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignment_template_question_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assignment_template_question_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignment_template_question_files_id_seq OWNED BY public.assignment_template_question_files.id;


--
-- Name: assignment_template_question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_template_question_options (
    id integer NOT NULL,
    question_id integer NOT NULL,
    option_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 1 NOT NULL
);


--
-- Name: assignment_template_question_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignment_template_question_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assignment_template_question_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignment_template_question_options_id_seq OWNED BY public.assignment_template_question_options.id;


--
-- Name: assignment_template_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_template_questions (
    id integer NOT NULL,
    template_id integer NOT NULL,
    question_text text NOT NULL,
    question_type character varying(20) NOT NULL,
    marks numeric(8,2) NOT NULL,
    display_order integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: assignment_template_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignment_template_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assignment_template_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignment_template_questions_id_seq OWNED BY public.assignment_template_questions.id;


--
-- Name: assignment_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_templates (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    total_marks numeric(8,2) DEFAULT 0 NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    source_institution_id integer,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    blocked_by_platform boolean DEFAULT false NOT NULL,
    blocked_by integer,
    blocked_at timestamp without time zone,
    block_reason text,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: assignment_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignment_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assignment_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignment_templates_id_seq OWNED BY public.assignment_templates.id;


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    template_id integer,
    title character varying(255) NOT NULL,
    description text,
    issue_date date NOT NULL,
    submission_date date NOT NULL,
    total_marks numeric(8,2) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignments_id_seq OWNED BY public.assignments.id;


--
-- Name: attendance_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_sessions (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    program_id integer NOT NULL,
    section_id integer NOT NULL,
    attendance_date date NOT NULL,
    attendance_mode character varying(20) NOT NULL,
    marked_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer,
    CONSTRAINT attendance_sessions_attendance_mode_check CHECK (((attendance_mode)::text = ANY ((ARRAY['FULL_DAY'::character varying, 'PERIOD_WISE'::character varying])::text[])))
);


--
-- Name: attendance_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_sessions_id_seq OWNED BY public.attendance_sessions.id;


--
-- Name: boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boards (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: boards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.boards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: boards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.boards_id_seq OWNED BY public.boards.id;


--
-- Name: card_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: card_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.card_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: card_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.card_categories_id_seq OWNED BY public.card_categories.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    parent_id integer,
    depth integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: category_boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_boards (
    category_id integer NOT NULL,
    board_id integer NOT NULL
);


--
-- Name: category_closure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_closure (
    ancestor_id integer NOT NULL,
    descendant_id integer NOT NULL,
    depth integer NOT NULL
);


--
-- Name: class_timetables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_timetables (
    id integer NOT NULL,
    institution_class_section_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    period_id integer NOT NULL,
    subject_id integer,
    teacher_id integer,
    room_number character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: class_timetables_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.class_timetables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: class_timetables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.class_timetables_id_seq OWNED BY public.class_timetables.id;


--
-- Name: designations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designations (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: designations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.designations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: designations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.designations_id_seq OWNED BY public.designations.id;


--
-- Name: document_generation_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_generation_data (
    id bigint NOT NULL,
    reference_type character varying(50) NOT NULL,
    reference_id bigint NOT NULL,
    template_id integer NOT NULL,
    manual_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    resolved_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    generated_document_id bigint,
    template_version integer NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer,
    enrollment_id integer,
    lifecycle_id bigint,
    context_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: document_generation_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_generation_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_generation_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_generation_data_id_seq OWNED BY public.document_generation_data.id;


--
-- Name: document_template_field_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_template_field_mappings (
    id integer NOT NULL,
    template_id integer NOT NULL,
    institution_id integer,
    template_field_id integer,
    template_field_name character varying(100) NOT NULL,
    source_field_key character varying(150) NOT NULL,
    source_field_label character varying(200) NOT NULL,
    transform character varying(50) DEFAULT 'text'::character varying NOT NULL,
    fallback_value text,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: document_template_field_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_template_field_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_template_field_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_template_field_mappings_id_seq OWNED BY public.document_template_field_mappings.id;


--
-- Name: document_template_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_template_fields (
    id integer NOT NULL,
    template_id integer NOT NULL,
    field_name character varying(100) NOT NULL,
    label character varying(150) NOT NULL,
    field_type character varying(30) NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: document_template_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_template_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_template_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_template_fields_id_seq OWNED BY public.document_template_fields.id;


--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_templates (
    id integer NOT NULL,
    card_category_id integer NOT NULL,
    name character varying(150) NOT NULL,
    thumbnail_url text,
    html_template text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: document_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_templates_id_seq OWNED BY public.document_templates.id;


--
-- Name: entity_lifecycle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_lifecycle (
    id bigint NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id bigint NOT NULL,
    institution_id integer,
    parent_entity_id bigint,
    status character varying(50) NOT NULL,
    effective_from timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_to timestamp without time zone,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT chk_entity_lifecycle_effective_range CHECK (((effective_to IS NULL) OR (effective_to >= effective_from)))
);


--
-- Name: entity_lifecycle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_lifecycle_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_lifecycle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_lifecycle_id_seq OWNED BY public.entity_lifecycle.id;


--
-- Name: facility_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: facility_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_types_id_seq OWNED BY public.facility_types.id;


--
-- Name: generated_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_documents (
    id bigint NOT NULL,
    institution_id integer NOT NULL,
    template_id integer NOT NULL,
    reference_type character varying(50) NOT NULL,
    reference_id integer NOT NULL,
    image_url text,
    pdf_url text,
    generated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    enrollment_id integer,
    lifecycle_id bigint,
    context_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_by integer
);


--
-- Name: generated_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.generated_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: generated_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.generated_documents_id_seq OWNED BY public.generated_documents.id;


--
-- Name: help_article_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_article_assets (
    id integer NOT NULL,
    article_id integer NOT NULL,
    asset_type character varying(20) NOT NULL,
    title character varying(255),
    file_url text NOT NULL,
    thumbnail_url text,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: help_article_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.help_article_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: help_article_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.help_article_assets_id_seq OWNED BY public.help_article_assets.id;


--
-- Name: help_article_faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_article_faqs (
    id integer NOT NULL,
    article_id integer NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: help_article_faqs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.help_article_faqs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: help_article_faqs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.help_article_faqs_id_seq OWNED BY public.help_article_faqs.id;


--
-- Name: help_article_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_article_permissions (
    article_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: help_article_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_article_relations (
    article_id integer NOT NULL,
    related_article_id integer NOT NULL
);


--
-- Name: help_article_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_article_views (
    id bigint NOT NULL,
    article_id integer NOT NULL,
    user_id integer,
    viewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: help_article_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.help_article_views_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: help_article_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.help_article_views_id_seq OWNED BY public.help_article_views.id;


--
-- Name: help_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_articles (
    id integer NOT NULL,
    category_id integer NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    summary text,
    content_md text NOT NULL,
    visibility character varying(30) DEFAULT 'PUBLIC'::character varying NOT NULL,
    estimated_read_minutes integer,
    difficulty_level character varying(20),
    is_featured boolean DEFAULT false,
    is_published boolean DEFAULT false,
    published_at timestamp without time zone,
    search_keywords text,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: help_articles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.help_articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: help_articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.help_articles_id_seq OWNED BY public.help_articles.id;


--
-- Name: help_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_categories (
    id integer NOT NULL,
    parent_id integer,
    name character varying(150) NOT NULL,
    slug character varying(150) NOT NULL,
    icon character varying(100),
    description text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: help_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.help_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: help_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.help_categories_id_seq OWNED BY public.help_categories.id;


--
-- Name: help_recent_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_recent_updates (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    href text,
    update_date date DEFAULT CURRENT_DATE NOT NULL,
    sort_order integer DEFAULT 0,
    is_published boolean DEFAULT true,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: help_recent_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.help_recent_updates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: help_recent_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.help_recent_updates_id_seq OWNED BY public.help_recent_updates.id;


--
-- Name: help_search_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_search_logs (
    id bigint NOT NULL,
    user_id integer,
    search_term text NOT NULL,
    results_count integer DEFAULT 0,
    searched_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: help_search_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.help_search_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: help_search_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.help_search_logs_id_seq OWNED BY public.help_search_logs.id;


--
-- Name: institution_academic_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_academic_classes (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    category_id integer NOT NULL,
    capacity integer,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_academic_classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_academic_classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_academic_classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_academic_classes_id_seq OWNED BY public.institution_academic_classes.id;


--
-- Name: institution_calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_calendar_events (
    id bigint NOT NULL,
    institution_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_type character varying(30) NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    color character varying(20),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_calendar_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_calendar_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_calendar_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_calendar_events_id_seq OWNED BY public.institution_calendar_events.id;


--
-- Name: institution_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_categories (
    institution_id integer NOT NULL,
    category_id integer NOT NULL
);


--
-- Name: institution_class_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_class_sections (
    id integer NOT NULL,
    institution_class_id integer NOT NULL,
    section_id integer NOT NULL,
    class_teacher_id integer,
    capacity integer,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_class_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_class_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_class_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_class_sections_id_seq OWNED BY public.institution_class_sections.id;


--
-- Name: institution_cutoffs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_cutoffs (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    program_id integer,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ai_response jsonb DEFAULT '{}'::jsonb NOT NULL,
    exam_name character varying(150),
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    years_to_generate integer DEFAULT 5 NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_cutoffs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_cutoffs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_cutoffs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_cutoffs_id_seq OWNED BY public.institution_cutoffs.id;


--
-- Name: institution_facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_facilities (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    facility_type_id integer NOT NULL,
    title character varying(200),
    description text,
    image_url text,
    ai_description jsonb,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_facilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_facilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_facilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_facilities_id_seq OWNED BY public.institution_facilities.id;


--
-- Name: institution_facility_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_facility_media (
    id integer NOT NULL,
    institution_facility_id integer NOT NULL,
    media_type character varying(20) DEFAULT 'image'::character varying NOT NULL,
    url text NOT NULL,
    title character varying(150),
    sort_order integer DEFAULT 0,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_ifm_media_type CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying])::text[])))
);


--
-- Name: institution_facility_media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_facility_media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_facility_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_facility_media_id_seq OWNED BY public.institution_facility_media.id;


--
-- Name: institution_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_media (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    media_type character varying(20) NOT NULL,
    url text NOT NULL,
    title character varying(150),
    sort_order integer DEFAULT 0 NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_media_id_seq OWNED BY public.institution_media.id;


--
-- Name: institution_membership_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_membership_history (
    id bigint NOT NULL,
    membership_id bigint,
    user_id integer NOT NULL,
    institution_id integer NOT NULL,
    role_id integer NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    join_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    leave_date timestamp without time zone,
    previous_membership_history_id bigint,
    is_current boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    remarks text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT chk_membership_history_date_range CHECK (((leave_date IS NULL) OR (leave_date >= join_date)))
);


--
-- Name: institution_membership_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_membership_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_membership_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_membership_history_id_seq OWNED BY public.institution_membership_history.id;


--
-- Name: institution_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_memberships (
    id bigint NOT NULL,
    institution_id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    join_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    leave_date timestamp without time zone,
    previous_membership_id bigint,
    is_current boolean DEFAULT true NOT NULL,
    remarks text,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_memberships_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_memberships_id_seq OWNED BY public.institution_memberships.id;


--
-- Name: institution_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_news (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    content text,
    image_url text,
    published_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_news_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_news_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_news_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_news_id_seq OWNED BY public.institution_news.id;


--
-- Name: institution_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_notification_settings (
    id bigint NOT NULL,
    institution_id integer NOT NULL,
    notification_type character varying(100) NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
    updated_at timestamp without time zone DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL
);


--
-- Name: institution_notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_notification_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_notification_settings_id_seq OWNED BY public.institution_notification_settings.id;


--
-- Name: institution_placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_placements (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    year integer NOT NULL,
    average_package numeric(12,2),
    highest_package numeric(12,2),
    lowest_package numeric(12,2),
    placement_percentage numeric(5,2),
    total_students integer,
    placed_students integer,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_placements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_placements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_placements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_placements_id_seq OWNED BY public.institution_placements.id;


--
-- Name: institution_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_profiles (
    id integer NOT NULL,
    slug text NOT NULL,
    institution_type_id integer NOT NULL,
    institution_subtype_id integer,
    phone character varying(20),
    email character varying(150),
    established_year integer,
    website text,
    about text,
    location_id integer,
    parent_university_id integer,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name text NOT NULL,
    ai_content jsonb,
    add_source smallint,
    board_id integer,
    current_academic_year_id integer,
    deleted_at timestamp without time zone,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    deleted_by integer,
    CONSTRAINT chk_institution_profiles_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'archived'::character varying, 'deleted'::character varying])::text[])))
);


--
-- Name: COLUMN institution_profiles.add_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.institution_profiles.add_source IS '1=user_page, 2=institution_page';


--
-- Name: institution_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_profiles_id_seq OWNED BY public.institution_profiles.id;


--
-- Name: institution_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_programs (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    program_type_id integer NOT NULL,
    slug text NOT NULL,
    title character varying(200) NOT NULL,
    about text,
    duration_value integer,
    duration_unit character varying(20),
    seats_available integer,
    teaching_method character varying(30),
    board_id integer,
    university_id integer,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    academic_year_id integer,
    class_teacher_id integer,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_programs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_programs_id_seq OWNED BY public.institution_programs.id;


--
-- Name: institution_role_permission_denials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_role_permission_denials (
    institution_id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: institution_role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_role_permissions (
    institution_id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: institution_scholarships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_scholarships (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ai_response jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_ai_generated boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_scholarships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_scholarships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_scholarships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_scholarships_id_seq OWNED BY public.institution_scholarships.id;


--
-- Name: institution_subtypes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_subtypes (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_subtypes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_subtypes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_subtypes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_subtypes_id_seq OWNED BY public.institution_subtypes.id;


--
-- Name: institution_template_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_template_defaults (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    template_id integer NOT NULL,
    field_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: institution_template_defaults_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_template_defaults_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_template_defaults_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_template_defaults_id_seq OWNED BY public.institution_template_defaults.id;


--
-- Name: institution_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_templates (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    template_id integer NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    assigned_by integer,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: institution_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_templates_id_seq OWNED BY public.institution_templates.id;


--
-- Name: institution_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: institution_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.institution_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: institution_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.institution_types_id_seq OWNED BY public.institution_types.id;


--
-- Name: institution_user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_user_permissions (
    institution_id integer NOT NULL,
    user_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.languages (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: languages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.languages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: languages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.languages_id_seq OWNED BY public.languages.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    type character varying(50) NOT NULL,
    parent_id integer,
    latitude numeric(10,7),
    longitude numeric(10,7),
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    location_scope character varying(50) DEFAULT 'global'::character varying NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    notification_type character varying(100) NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
    updated_at timestamp without time zone DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL
);


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_preferences_id_seq OWNED BY public.notification_preferences.id;


--
-- Name: notification_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_recipients (
    id bigint NOT NULL,
    notification_id bigint NOT NULL,
    user_id integer NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp without time zone,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
    is_important boolean DEFAULT false NOT NULL
);


--
-- Name: notification_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_recipients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_recipients_id_seq OWNED BY public.notification_recipients.id;


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    title_template text NOT NULL,
    body_template text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
    updated_at timestamp without time zone DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: notification_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_templates_id_seq OWNED BY public.notification_templates.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    type character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    entity_type character varying(100),
    entity_id bigint,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT timezone('Asia/Kolkata'::text, now()) NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: practice_exam_question_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_exam_question_files (
    id integer NOT NULL,
    question_id integer NOT NULL,
    file_url text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: practice_exam_question_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.practice_exam_question_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: practice_exam_question_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.practice_exam_question_files_id_seq OWNED BY public.practice_exam_question_files.id;


--
-- Name: practice_exam_question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_exam_question_options (
    id integer NOT NULL,
    question_id integer NOT NULL,
    option_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 1 NOT NULL
);


--
-- Name: practice_exam_question_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.practice_exam_question_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: practice_exam_question_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.practice_exam_question_options_id_seq OWNED BY public.practice_exam_question_options.id;


--
-- Name: practice_exam_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_exam_questions (
    id integer NOT NULL,
    practice_exam_id integer NOT NULL,
    question_text text NOT NULL,
    question_type character varying(20) NOT NULL,
    marks numeric(8,2) NOT NULL,
    explanation text,
    display_order integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: practice_exam_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.practice_exam_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: practice_exam_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.practice_exam_questions_id_seq OWNED BY public.practice_exam_questions.id;


--
-- Name: practice_exam_syllabus_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_exam_syllabus_nodes (
    id integer NOT NULL,
    practice_exam_id integer NOT NULL,
    syllabus_node_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: practice_exam_syllabus_nodes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.practice_exam_syllabus_nodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: practice_exam_syllabus_nodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.practice_exam_syllabus_nodes_id_seq OWNED BY public.practice_exam_syllabus_nodes.id;


--
-- Name: practice_exam_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_exam_targets (
    id integer NOT NULL,
    practice_exam_id integer NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id integer NOT NULL,
    program_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: practice_exam_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.practice_exam_targets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: practice_exam_targets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.practice_exam_targets_id_seq OWNED BY public.practice_exam_targets.id;


--
-- Name: practice_exam_template_question_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_exam_template_question_files (
    id integer NOT NULL,
    question_id integer NOT NULL,
    file_url text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: practice_exam_template_question_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.practice_exam_template_question_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: practice_exam_template_question_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.practice_exam_template_question_files_id_seq OWNED BY public.practice_exam_template_question_files.id;


--
-- Name: practice_exam_template_question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_exam_template_question_options (
    id integer NOT NULL,
    question_id integer NOT NULL,
    option_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 1 NOT NULL
);


--
-- Name: practice_exam_template_question_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.practice_exam_template_question_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: practice_exam_template_question_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.practice_exam_template_question_options_id_seq OWNED BY public.practice_exam_template_question_options.id;


--
-- Name: practice_exam_template_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_exam_template_questions (
    id integer NOT NULL,
    template_id integer NOT NULL,
    question_text text NOT NULL,
    question_type character varying(20) NOT NULL,
    marks numeric(8,2) NOT NULL,
    explanation text,
    display_order integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: practice_exam_template_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.practice_exam_template_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: practice_exam_template_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.practice_exam_template_questions_id_seq OWNED BY public.practice_exam_template_questions.id;


--
-- Name: practice_exam_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_exam_templates (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    total_marks numeric(8,2) DEFAULT 0 NOT NULL,
    duration_minutes integer,
    is_public boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    source_institution_id integer,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    blocked_by_platform boolean DEFAULT false NOT NULL,
    blocked_by integer,
    blocked_at timestamp without time zone,
    block_reason text,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: practice_exam_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.practice_exam_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: practice_exam_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.practice_exam_templates_id_seq OWNED BY public.practice_exam_templates.id;


--
-- Name: practice_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_exams (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    template_id integer,
    title character varying(255) NOT NULL,
    description text,
    duration_minutes integer,
    total_marks numeric(8,2) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: practice_exams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.practice_exams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: practice_exams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.practice_exams_id_seq OWNED BY public.practice_exams.id;


--
-- Name: program_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_categories (
    program_id integer NOT NULL,
    category_id integer NOT NULL
);


--
-- Name: program_fee_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_fee_components (
    id integer NOT NULL,
    program_id integer NOT NULL,
    title character varying(150) NOT NULL,
    amount numeric(12,2) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: program_fee_components_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.program_fee_components_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: program_fee_components_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.program_fee_components_id_seq OWNED BY public.program_fee_components.id;


--
-- Name: program_languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_languages (
    program_id integer NOT NULL,
    language_id integer NOT NULL
);


--
-- Name: program_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_media (
    id integer NOT NULL,
    program_id integer NOT NULL,
    media_type character varying(20) NOT NULL,
    url text NOT NULL,
    title character varying(150),
    sort_order integer DEFAULT 0 NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: program_media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.program_media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: program_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.program_media_id_seq OWNED BY public.program_media.id;


--
-- Name: program_section_class_teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_section_class_teachers (
    id integer NOT NULL,
    program_id integer NOT NULL,
    section_id integer NOT NULL,
    teacher_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: program_section_class_teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.program_section_class_teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: program_section_class_teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.program_section_class_teachers_id_seq OWNED BY public.program_section_class_teachers.id;


--
-- Name: program_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_sections (
    program_id integer NOT NULL,
    section_id integer NOT NULL
);


--
-- Name: program_subject_teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_subject_teachers (
    id integer NOT NULL,
    program_id integer NOT NULL,
    section_id integer NOT NULL,
    subject_id integer NOT NULL,
    teacher_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: program_subject_teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.program_subject_teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: program_subject_teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.program_subject_teachers_id_seq OWNED BY public.program_subject_teachers.id;


--
-- Name: program_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_subjects (
    program_id integer NOT NULL,
    subject_id integer NOT NULL
);


--
-- Name: program_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: program_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.program_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: program_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.program_types_id_seq OWNED BY public.program_types.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50),
    code character varying(50),
    scope_id integer,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: scope_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scope_types (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: scope_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scope_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scope_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scope_types_id_seq OWNED BY public.scope_types.id;


--
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sections (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    slug character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: sections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sections_id_seq OWNED BY public.sections.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    user_id integer NOT NULL,
    user_agent text,
    ip_address text,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: skills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skills_id_seq OWNED BY public.skills.id;


--
-- Name: student_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_achievements (
    id integer NOT NULL,
    student_id integer NOT NULL,
    title character varying(255) NOT NULL,
    achievement_date date,
    certificate_url text,
    remarks text,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    card_category_id integer NOT NULL,
    document_template_id integer,
    template_id integer,
    institution_id integer,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    enrollment_id integer,
    lifecycle_id bigint,
    context_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_by integer
);


--
-- Name: student_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_achievements_id_seq OWNED BY public.student_achievements.id;


--
-- Name: student_assignment_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_assignment_answers (
    id integer NOT NULL,
    student_assignment_id integer NOT NULL,
    question_id integer NOT NULL,
    selected_option_id integer,
    answer_text text,
    marks_awarded numeric(8,2),
    checked_by integer,
    checked_at timestamp without time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer,
    enrollment_id integer,
    lifecycle_id bigint
);


--
-- Name: student_assignment_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_assignment_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_assignment_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_assignment_answers_id_seq OWNED BY public.student_assignment_answers.id;


--
-- Name: student_assignment_submission_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_assignment_submission_files (
    id integer NOT NULL,
    answer_id integer NOT NULL,
    file_url text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: student_assignment_submission_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_assignment_submission_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_assignment_submission_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_assignment_submission_files_id_seq OWNED BY public.student_assignment_submission_files.id;


--
-- Name: student_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_assignments (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    student_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    submitted_at timestamp without time zone,
    obtained_marks numeric(8,2),
    checked_by integer,
    checked_at timestamp without time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    enrollment_id integer,
    lifecycle_id bigint,
    context_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: student_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_assignments_id_seq OWNED BY public.student_assignments.id;


--
-- Name: student_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_attendance (
    id integer NOT NULL,
    attendance_session_id integer NOT NULL,
    student_id integer NOT NULL,
    status character varying(20) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    enrollment_id integer,
    lifecycle_id bigint,
    deleted_by integer,
    CONSTRAINT student_attendance_status_check CHECK (((status)::text = ANY ((ARRAY['PRESENT'::character varying, 'ABSENT'::character varying, 'LEAVE'::character varying, 'LATE'::character varying])::text[])))
);


--
-- Name: student_attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_attendance_id_seq OWNED BY public.student_attendance.id;


--
-- Name: student_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_documents (
    id integer NOT NULL,
    student_id integer NOT NULL,
    document_type character varying(50) NOT NULL,
    document_number character varying(100),
    file_url text NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    verified_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    public_id text,
    resource_type character varying(50),
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    enrollment_id integer,
    lifecycle_id bigint,
    context_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_by integer
);


--
-- Name: student_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_documents_id_seq OWNED BY public.student_documents.id;


--
-- Name: student_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_enrollments (
    id integer NOT NULL,
    student_id integer NOT NULL,
    institution_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    class_category_id integer NOT NULL,
    section_id integer,
    roll_number character varying(50),
    admission_date date,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    previous_enrollment_id integer,
    remarks text,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    program_id integer,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    promotion_type character varying(50),
    promotion_notes text,
    promoted_by integer,
    promoted_at timestamp without time zone,
    effective_from timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_to timestamp without time zone,
    is_current boolean DEFAULT true NOT NULL,
    lifecycle_id bigint,
    deleted_by integer,
    CONSTRAINT chk_student_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'promoted'::character varying, 'demoted'::character varying, 'transferred'::character varying, 'dropout'::character varying, 'graduated'::character varying, 'completed'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: student_enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_enrollments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_enrollments_id_seq OWNED BY public.student_enrollments.id;


--
-- Name: student_guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_guardians (
    id integer NOT NULL,
    student_id integer NOT NULL,
    guardian_user_id integer NOT NULL,
    relationship character varying(50) NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone
);


--
-- Name: student_guardians_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_guardians_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_guardians_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_guardians_id_seq OWNED BY public.student_guardians.id;


--
-- Name: student_period_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_period_attendance (
    id integer NOT NULL,
    attendance_session_id integer NOT NULL,
    student_id integer NOT NULL,
    slot_id integer NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    enrollment_id integer,
    lifecycle_id bigint,
    deleted_by integer,
    CONSTRAINT student_period_attendance_status_check CHECK (((status)::text = ANY ((ARRAY['PRESENT'::character varying, 'ABSENT'::character varying, 'LEAVE'::character varying, 'LATE'::character varying])::text[])))
);


--
-- Name: student_period_attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_period_attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_period_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_period_attendance_id_seq OWNED BY public.student_period_attendance.id;


--
-- Name: student_practice_exam_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_practice_exam_answers (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    question_id integer NOT NULL,
    selected_option_id integer,
    answer_text text,
    is_correct boolean,
    marks_awarded numeric(8,2),
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer,
    enrollment_id integer,
    lifecycle_id bigint
);


--
-- Name: student_practice_exam_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_practice_exam_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_practice_exam_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_practice_exam_answers_id_seq OWNED BY public.student_practice_exam_answers.id;


--
-- Name: student_practice_exam_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_practice_exam_attempts (
    id integer NOT NULL,
    practice_exam_id integer NOT NULL,
    student_id integer NOT NULL,
    attempt_no integer DEFAULT 1 NOT NULL,
    started_at timestamp without time zone NOT NULL,
    submitted_at timestamp without time zone,
    time_taken_seconds integer,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    obtained_marks numeric(8,2),
    correct_answers integer DEFAULT 0 NOT NULL,
    wrong_answers integer DEFAULT 0 NOT NULL,
    unanswered integer DEFAULT 0 NOT NULL,
    percentage numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    exam_version integer DEFAULT 1 NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    enrollment_id integer,
    lifecycle_id bigint,
    context_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: student_practice_exam_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_practice_exam_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_practice_exam_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_practice_exam_attempts_id_seq OWNED BY public.student_practice_exam_attempts.id;


--
-- Name: student_practice_exam_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_practice_exam_results (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    student_id integer NOT NULL,
    practice_exam_id integer NOT NULL,
    total_questions integer,
    correct_answers integer,
    wrong_answers integer,
    unanswered integer,
    obtained_marks numeric(8,2),
    percentage numeric(5,2),
    submitted_at timestamp without time zone,
    exam_version integer DEFAULT 1 NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    enrollment_id integer,
    lifecycle_id bigint,
    context_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: student_practice_exam_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_practice_exam_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_practice_exam_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_practice_exam_results_id_seq OWNED BY public.student_practice_exam_results.id;


--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    admission_number character varying(100),
    apar_id character varying(100),
    date_of_birth date,
    blood_group character varying(10),
    emergency_contact_name character varying(150),
    emergency_contact_phone character varying(20),
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: student_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_profiles_id_seq OWNED BY public.student_profiles.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    category_id integer NOT NULL,
    board_id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: support_ticket_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_attachments (
    id bigint NOT NULL,
    ticket_message_id bigint NOT NULL,
    file_name character varying(255),
    file_url text NOT NULL,
    uploaded_by integer NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: support_ticket_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_ticket_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_ticket_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_ticket_attachments_id_seq OWNED BY public.support_ticket_attachments.id;


--
-- Name: support_ticket_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_history (
    id bigint NOT NULL,
    ticket_id bigint NOT NULL,
    action character varying(100) NOT NULL,
    old_value text,
    new_value text,
    performed_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: support_ticket_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_ticket_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_ticket_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_ticket_history_id_seq OWNED BY public.support_ticket_history.id;


--
-- Name: support_ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_messages (
    id bigint NOT NULL,
    ticket_id bigint NOT NULL,
    user_id integer NOT NULL,
    message text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reply_to_message_id bigint,
    edited_at timestamp without time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: support_ticket_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_ticket_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_ticket_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_ticket_messages_id_seq OWNED BY public.support_ticket_messages.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id bigint NOT NULL,
    ticket_number character varying(30) NOT NULL,
    institution_id integer,
    created_by integer NOT NULL,
    assigned_to integer,
    resolved_by integer,
    closed_by integer,
    subject character varying(255) NOT NULL,
    description text NOT NULL,
    category character varying(50) NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    assigned_at timestamp without time zone,
    resolved_at timestamp without time zone,
    closed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_tickets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: syllabi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.syllabi (
    id integer NOT NULL,
    subject_id integer NOT NULL,
    institution_id integer,
    parent_syllabus_id integer,
    title character varying(255) NOT NULL,
    description text,
    version integer DEFAULT 1 NOT NULL,
    is_template boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: syllabi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.syllabi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: syllabi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.syllabi_id_seq OWNED BY public.syllabi.id;


--
-- Name: syllabus_inheritance_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.syllabus_inheritance_logs (
    id integer NOT NULL,
    template_syllabus_id integer NOT NULL,
    institution_syllabus_id integer NOT NULL,
    inherited_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    inherited_by integer
);


--
-- Name: syllabus_inheritance_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.syllabus_inheritance_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: syllabus_inheritance_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.syllabus_inheritance_logs_id_seq OWNED BY public.syllabus_inheritance_logs.id;


--
-- Name: syllabus_node_closure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.syllabus_node_closure (
    ancestor_id integer NOT NULL,
    descendant_id integer NOT NULL,
    depth integer NOT NULL
);


--
-- Name: syllabus_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.syllabus_nodes (
    id integer NOT NULL,
    syllabus_id integer NOT NULL,
    parent_id integer,
    title character varying(255) NOT NULL,
    description text,
    node_type character varying(50) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    estimated_hours integer,
    learning_outcomes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: syllabus_nodes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.syllabus_nodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: syllabus_nodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.syllabus_nodes_id_seq OWNED BY public.syllabus_nodes.id;


--
-- Name: teacher_class_subject_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_class_subject_assignments (
    id integer NOT NULL,
    institution_class_section_id integer NOT NULL,
    teacher_id integer NOT NULL,
    subject_id integer NOT NULL,
    academic_year_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: teacher_class_subject_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teacher_class_subject_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teacher_class_subject_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teacher_class_subject_assignments_id_seq OWNED BY public.teacher_class_subject_assignments.id;


--
-- Name: timetable_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_entries (
    id integer NOT NULL,
    academic_year_id integer NOT NULL,
    program_id integer NOT NULL,
    section_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_id integer NOT NULL,
    subject_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    teacher_id integer,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: timetable_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timetable_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timetable_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timetable_entries_id_seq OWNED BY public.timetable_entries.id;


--
-- Name: timetable_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_periods (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    name character varying(100) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    sort_order integer NOT NULL,
    is_break boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: timetable_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timetable_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timetable_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timetable_periods_id_seq OWNED BY public.timetable_periods.id;


--
-- Name: timetable_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_slots (
    id integer NOT NULL,
    institution_id integer NOT NULL,
    slot_name character varying(50),
    slot_order integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    slot_type character varying(20) DEFAULT 'CLASS'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: timetable_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timetable_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timetable_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timetable_slots_id_seq OWNED BY public.timetable_slots.id;


--
-- Name: user_certifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_certifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(200) NOT NULL,
    duration character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    issued_authority character varying(200)
);


--
-- Name: user_certifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_certifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_certifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_certifications_id_seq OWNED BY public.user_certifications.id;


--
-- Name: user_education; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_education (
    id integer NOT NULL,
    user_id integer NOT NULL,
    qualification character varying(150) NOT NULL,
    from_year integer NOT NULL,
    to_year integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    institution_id integer,
    institution_name text
);


--
-- Name: user_education_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_education_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_education_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_education_id_seq OWNED BY public.user_education.id;


--
-- Name: user_experience; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_experience (
    id integer NOT NULL,
    user_id integer NOT NULL,
    job_title character varying(150) NOT NULL,
    from_month integer NOT NULL,
    from_year integer NOT NULL,
    to_month integer,
    to_year integer,
    is_current boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_id integer,
    company_name text
);


--
-- Name: user_experience_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_experience_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_experience_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_experience_id_seq OWNED BY public.user_experience.id;


--
-- Name: user_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_locations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    country_id integer,
    state_id integer,
    city_id integer,
    area_id integer,
    full_address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    pincode character varying(20),
    place_id text,
    formatted_address text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_locations_id_seq OWNED BY public.user_locations.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    user_id integer NOT NULL,
    about text,
    gender character varying(20),
    hourly_charges numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    teacher_type teacher_type,
    is_teacher boolean DEFAULT false NOT NULL,
    under_institution_id integer,
    designation_id integer
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL
);


--
-- Name: user_teaching_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_teaching_categories (
    user_id integer NOT NULL,
    category_id integer NOT NULL
);


--
-- Name: user_teaching_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_teaching_subjects (
    user_id integer NOT NULL,
    subject_id integer NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(20),
    password text,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    last_login_at timestamp without time zone,
    avatar_url text,
    login_provider character varying(50) DEFAULT 'email'::character varying,
    created_by integer,
    updated_by integer,
    is_profile_complete boolean DEFAULT false NOT NULL,
    deleted_by integer
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: visitor_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitor_activities (
    id bigint NOT NULL,
    tracking_token uuid NOT NULL,
    page_url text NOT NULL,
    page_title character varying(255),
    visited_at timestamp without time zone DEFAULT now() NOT NULL,
    trigger_type character varying(50)
);


--
-- Name: visitor_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visitor_activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visitor_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visitor_activities_id_seq OWNED BY public.visitor_activities.id;


--
-- Name: visitor_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitor_sessions (
    id bigint NOT NULL,
    tracking_token uuid NOT NULL,
    full_name character varying(255),
    email character varying(255),
    phone character varying(20),
    first_page_url text,
    current_page_url text,
    utm_source character varying(255),
    utm_medium character varying(255),
    utm_campaign character varying(255),
    utm_term character varying(255),
    utm_content character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp without time zone DEFAULT now() NOT NULL,
    follow_up text,
    lead_status character varying(30) DEFAULT 'new'::character varying NOT NULL
);


--
-- Name: visitor_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visitor_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visitor_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visitor_sessions_id_seq OWNED BY public.visitor_sessions.id;


--
-- Name: academic_session_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_session_templates ALTER COLUMN id SET DEFAULT nextval('academic_session_templates_id_seq'::regclass);


--
-- Name: academic_years id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years ALTER COLUMN id SET DEFAULT nextval('academic_years_id_seq'::regclass);


--
-- Name: ai_content_field_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_field_settings ALTER COLUMN id SET DEFAULT nextval('ai_content_field_settings_id_seq'::regclass);


--
-- Name: ai_content_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_types ALTER COLUMN id SET DEFAULT nextval('ai_content_types_id_seq'::regclass);


--
-- Name: ai_providers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers ALTER COLUMN id SET DEFAULT nextval('ai_providers_id_seq'::regclass);


--
-- Name: assignment_question_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_question_files ALTER COLUMN id SET DEFAULT nextval('assignment_question_files_id_seq'::regclass);


--
-- Name: assignment_question_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_question_options ALTER COLUMN id SET DEFAULT nextval('assignment_question_options_id_seq'::regclass);


--
-- Name: assignment_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_questions ALTER COLUMN id SET DEFAULT nextval('assignment_questions_id_seq'::regclass);


--
-- Name: assignment_syllabus_nodes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_syllabus_nodes ALTER COLUMN id SET DEFAULT nextval('assignment_syllabus_nodes_id_seq'::regclass);


--
-- Name: assignment_targets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_targets ALTER COLUMN id SET DEFAULT nextval('assignment_targets_id_seq'::regclass);


--
-- Name: assignment_template_question_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_template_question_files ALTER COLUMN id SET DEFAULT nextval('assignment_template_question_files_id_seq'::regclass);


--
-- Name: assignment_template_question_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_template_question_options ALTER COLUMN id SET DEFAULT nextval('assignment_template_question_options_id_seq'::regclass);


--
-- Name: assignment_template_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_template_questions ALTER COLUMN id SET DEFAULT nextval('assignment_template_questions_id_seq'::regclass);


--
-- Name: assignment_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_templates ALTER COLUMN id SET DEFAULT nextval('assignment_templates_id_seq'::regclass);


--
-- Name: assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments ALTER COLUMN id SET DEFAULT nextval('assignments_id_seq'::regclass);


--
-- Name: attendance_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions ALTER COLUMN id SET DEFAULT nextval('attendance_sessions_id_seq'::regclass);


--
-- Name: boards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards ALTER COLUMN id SET DEFAULT nextval('boards_id_seq'::regclass);


--
-- Name: card_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_categories ALTER COLUMN id SET DEFAULT nextval('card_categories_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('categories_id_seq'::regclass);


--
-- Name: class_timetables id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_timetables ALTER COLUMN id SET DEFAULT nextval('class_timetables_id_seq'::regclass);


--
-- Name: designations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations ALTER COLUMN id SET DEFAULT nextval('designations_id_seq'::regclass);


--
-- Name: document_generation_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_generation_data ALTER COLUMN id SET DEFAULT nextval('document_generation_data_id_seq'::regclass);


--
-- Name: document_template_field_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_template_field_mappings ALTER COLUMN id SET DEFAULT nextval('document_template_field_mappings_id_seq'::regclass);


--
-- Name: document_template_fields id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_template_fields ALTER COLUMN id SET DEFAULT nextval('document_template_fields_id_seq'::regclass);


--
-- Name: document_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates ALTER COLUMN id SET DEFAULT nextval('document_templates_id_seq'::regclass);


--
-- Name: entity_lifecycle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_lifecycle ALTER COLUMN id SET DEFAULT nextval('entity_lifecycle_id_seq'::regclass);


--
-- Name: facility_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_types ALTER COLUMN id SET DEFAULT nextval('facility_types_id_seq'::regclass);


--
-- Name: generated_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents ALTER COLUMN id SET DEFAULT nextval('generated_documents_id_seq'::regclass);


--
-- Name: help_article_assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_assets ALTER COLUMN id SET DEFAULT nextval('help_article_assets_id_seq'::regclass);


--
-- Name: help_article_faqs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_faqs ALTER COLUMN id SET DEFAULT nextval('help_article_faqs_id_seq'::regclass);


--
-- Name: help_article_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_views ALTER COLUMN id SET DEFAULT nextval('help_article_views_id_seq'::regclass);


--
-- Name: help_articles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles ALTER COLUMN id SET DEFAULT nextval('help_articles_id_seq'::regclass);


--
-- Name: help_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_categories ALTER COLUMN id SET DEFAULT nextval('help_categories_id_seq'::regclass);


--
-- Name: help_recent_updates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_recent_updates ALTER COLUMN id SET DEFAULT nextval('help_recent_updates_id_seq'::regclass);


--
-- Name: help_search_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_search_logs ALTER COLUMN id SET DEFAULT nextval('help_search_logs_id_seq'::regclass);


--
-- Name: institution_academic_classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_academic_classes ALTER COLUMN id SET DEFAULT nextval('institution_academic_classes_id_seq'::regclass);


--
-- Name: institution_calendar_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_calendar_events ALTER COLUMN id SET DEFAULT nextval('institution_calendar_events_id_seq'::regclass);


--
-- Name: institution_class_sections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_class_sections ALTER COLUMN id SET DEFAULT nextval('institution_class_sections_id_seq'::regclass);


--
-- Name: institution_cutoffs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_cutoffs ALTER COLUMN id SET DEFAULT nextval('institution_cutoffs_id_seq'::regclass);


--
-- Name: institution_facilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facilities ALTER COLUMN id SET DEFAULT nextval('institution_facilities_id_seq'::regclass);


--
-- Name: institution_facility_media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facility_media ALTER COLUMN id SET DEFAULT nextval('institution_facility_media_id_seq'::regclass);


--
-- Name: institution_media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_media ALTER COLUMN id SET DEFAULT nextval('institution_media_id_seq'::regclass);


--
-- Name: institution_membership_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_membership_history ALTER COLUMN id SET DEFAULT nextval('institution_membership_history_id_seq'::regclass);


--
-- Name: institution_memberships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_memberships ALTER COLUMN id SET DEFAULT nextval('institution_memberships_id_seq'::regclass);


--
-- Name: institution_news id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_news ALTER COLUMN id SET DEFAULT nextval('institution_news_id_seq'::regclass);


--
-- Name: institution_notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_notification_settings ALTER COLUMN id SET DEFAULT nextval('institution_notification_settings_id_seq'::regclass);


--
-- Name: institution_placements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_placements ALTER COLUMN id SET DEFAULT nextval('institution_placements_id_seq'::regclass);


--
-- Name: institution_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles ALTER COLUMN id SET DEFAULT nextval('institution_profiles_id_seq'::regclass);


--
-- Name: institution_programs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs ALTER COLUMN id SET DEFAULT nextval('institution_programs_id_seq'::regclass);


--
-- Name: institution_scholarships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_scholarships ALTER COLUMN id SET DEFAULT nextval('institution_scholarships_id_seq'::regclass);


--
-- Name: institution_subtypes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_subtypes ALTER COLUMN id SET DEFAULT nextval('institution_subtypes_id_seq'::regclass);


--
-- Name: institution_template_defaults id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_template_defaults ALTER COLUMN id SET DEFAULT nextval('institution_template_defaults_id_seq'::regclass);


--
-- Name: institution_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_templates ALTER COLUMN id SET DEFAULT nextval('institution_templates_id_seq'::regclass);


--
-- Name: institution_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_types ALTER COLUMN id SET DEFAULT nextval('institution_types_id_seq'::regclass);


--
-- Name: languages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.languages ALTER COLUMN id SET DEFAULT nextval('languages_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('locations_id_seq'::regclass);


--
-- Name: notification_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences ALTER COLUMN id SET DEFAULT nextval('notification_preferences_id_seq'::regclass);


--
-- Name: notification_recipients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients ALTER COLUMN id SET DEFAULT nextval('notification_recipients_id_seq'::regclass);


--
-- Name: notification_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates ALTER COLUMN id SET DEFAULT nextval('notification_templates_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('notifications_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('permissions_id_seq'::regclass);


--
-- Name: practice_exam_question_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_question_files ALTER COLUMN id SET DEFAULT nextval('practice_exam_question_files_id_seq'::regclass);


--
-- Name: practice_exam_question_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_question_options ALTER COLUMN id SET DEFAULT nextval('practice_exam_question_options_id_seq'::regclass);


--
-- Name: practice_exam_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_questions ALTER COLUMN id SET DEFAULT nextval('practice_exam_questions_id_seq'::regclass);


--
-- Name: practice_exam_syllabus_nodes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_syllabus_nodes ALTER COLUMN id SET DEFAULT nextval('practice_exam_syllabus_nodes_id_seq'::regclass);


--
-- Name: practice_exam_targets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_targets ALTER COLUMN id SET DEFAULT nextval('practice_exam_targets_id_seq'::regclass);


--
-- Name: practice_exam_template_question_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_template_question_files ALTER COLUMN id SET DEFAULT nextval('practice_exam_template_question_files_id_seq'::regclass);


--
-- Name: practice_exam_template_question_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_template_question_options ALTER COLUMN id SET DEFAULT nextval('practice_exam_template_question_options_id_seq'::regclass);


--
-- Name: practice_exam_template_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_template_questions ALTER COLUMN id SET DEFAULT nextval('practice_exam_template_questions_id_seq'::regclass);


--
-- Name: practice_exam_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_templates ALTER COLUMN id SET DEFAULT nextval('practice_exam_templates_id_seq'::regclass);


--
-- Name: practice_exams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exams ALTER COLUMN id SET DEFAULT nextval('practice_exams_id_seq'::regclass);


--
-- Name: program_fee_components id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_fee_components ALTER COLUMN id SET DEFAULT nextval('program_fee_components_id_seq'::regclass);


--
-- Name: program_media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_media ALTER COLUMN id SET DEFAULT nextval('program_media_id_seq'::regclass);


--
-- Name: program_section_class_teachers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_section_class_teachers ALTER COLUMN id SET DEFAULT nextval('program_section_class_teachers_id_seq'::regclass);


--
-- Name: program_subject_teachers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subject_teachers ALTER COLUMN id SET DEFAULT nextval('program_subject_teachers_id_seq'::regclass);


--
-- Name: program_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_types ALTER COLUMN id SET DEFAULT nextval('program_types_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('roles_id_seq'::regclass);


--
-- Name: scope_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_types ALTER COLUMN id SET DEFAULT nextval('scope_types_id_seq'::regclass);


--
-- Name: sections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections ALTER COLUMN id SET DEFAULT nextval('sections_id_seq'::regclass);


--
-- Name: skills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills ALTER COLUMN id SET DEFAULT nextval('skills_id_seq'::regclass);


--
-- Name: student_achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements ALTER COLUMN id SET DEFAULT nextval('student_achievements_id_seq'::regclass);


--
-- Name: student_assignment_answers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_answers ALTER COLUMN id SET DEFAULT nextval('student_assignment_answers_id_seq'::regclass);


--
-- Name: student_assignment_submission_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_submission_files ALTER COLUMN id SET DEFAULT nextval('student_assignment_submission_files_id_seq'::regclass);


--
-- Name: student_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignments ALTER COLUMN id SET DEFAULT nextval('student_assignments_id_seq'::regclass);


--
-- Name: student_attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance ALTER COLUMN id SET DEFAULT nextval('student_attendance_id_seq'::regclass);


--
-- Name: student_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents ALTER COLUMN id SET DEFAULT nextval('student_documents_id_seq'::regclass);


--
-- Name: student_enrollments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments ALTER COLUMN id SET DEFAULT nextval('student_enrollments_id_seq'::regclass);


--
-- Name: student_guardians id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardians ALTER COLUMN id SET DEFAULT nextval('student_guardians_id_seq'::regclass);


--
-- Name: student_period_attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_period_attendance ALTER COLUMN id SET DEFAULT nextval('student_period_attendance_id_seq'::regclass);


--
-- Name: student_practice_exam_answers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_answers ALTER COLUMN id SET DEFAULT nextval('student_practice_exam_answers_id_seq'::regclass);


--
-- Name: student_practice_exam_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_attempts ALTER COLUMN id SET DEFAULT nextval('student_practice_exam_attempts_id_seq'::regclass);


--
-- Name: student_practice_exam_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_results ALTER COLUMN id SET DEFAULT nextval('student_practice_exam_results_id_seq'::regclass);


--
-- Name: student_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles ALTER COLUMN id SET DEFAULT nextval('student_profiles_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('subjects_id_seq'::regclass);


--
-- Name: support_ticket_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_attachments ALTER COLUMN id SET DEFAULT nextval('support_ticket_attachments_id_seq'::regclass);


--
-- Name: support_ticket_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_history ALTER COLUMN id SET DEFAULT nextval('support_ticket_history_id_seq'::regclass);


--
-- Name: support_ticket_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages ALTER COLUMN id SET DEFAULT nextval('support_ticket_messages_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('support_tickets_id_seq'::regclass);


--
-- Name: syllabi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabi ALTER COLUMN id SET DEFAULT nextval('syllabi_id_seq'::regclass);


--
-- Name: syllabus_inheritance_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_inheritance_logs ALTER COLUMN id SET DEFAULT nextval('syllabus_inheritance_logs_id_seq'::regclass);


--
-- Name: syllabus_nodes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_nodes ALTER COLUMN id SET DEFAULT nextval('syllabus_nodes_id_seq'::regclass);


--
-- Name: teacher_class_subject_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_subject_assignments ALTER COLUMN id SET DEFAULT nextval('teacher_class_subject_assignments_id_seq'::regclass);


--
-- Name: timetable_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries ALTER COLUMN id SET DEFAULT nextval('timetable_entries_id_seq'::regclass);


--
-- Name: timetable_periods id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_periods ALTER COLUMN id SET DEFAULT nextval('timetable_periods_id_seq'::regclass);


--
-- Name: timetable_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_slots ALTER COLUMN id SET DEFAULT nextval('timetable_slots_id_seq'::regclass);


--
-- Name: user_certifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_certifications ALTER COLUMN id SET DEFAULT nextval('user_certifications_id_seq'::regclass);


--
-- Name: user_education id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_education ALTER COLUMN id SET DEFAULT nextval('user_education_id_seq'::regclass);


--
-- Name: user_experience id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_experience ALTER COLUMN id SET DEFAULT nextval('user_experience_id_seq'::regclass);


--
-- Name: user_locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations ALTER COLUMN id SET DEFAULT nextval('user_locations_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Name: visitor_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_activities ALTER COLUMN id SET DEFAULT nextval('visitor_activities_id_seq'::regclass);


--
-- Name: visitor_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_sessions ALTER COLUMN id SET DEFAULT nextval('visitor_sessions_id_seq'::regclass);


--
-- Name: academic_session_templates academic_session_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_session_templates
    ADD CONSTRAINT academic_session_templates_name_key UNIQUE (name);


--
-- Name: academic_session_templates academic_session_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_session_templates
    ADD CONSTRAINT academic_session_templates_pkey PRIMARY KEY (id);


--
-- Name: academic_years academic_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_pkey PRIMARY KEY (id);


--
-- Name: ai_content_field_settings ai_content_field_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_field_settings
    ADD CONSTRAINT ai_content_field_settings_pkey PRIMARY KEY (id);


--
-- Name: ai_content_types ai_content_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_types
    ADD CONSTRAINT ai_content_types_pkey PRIMARY KEY (id);


--
-- Name: ai_content_types ai_content_types_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_types
    ADD CONSTRAINT ai_content_types_slug_key UNIQUE (slug);


--
-- Name: ai_providers ai_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_pkey PRIMARY KEY (id);


--
-- Name: ai_providers ai_providers_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_slug_key UNIQUE (slug);


--
-- Name: app_migrations app_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_migrations
    ADD CONSTRAINT app_migrations_pkey PRIMARY KEY (key);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: assignment_question_files assignment_question_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_question_files
    ADD CONSTRAINT assignment_question_files_pkey PRIMARY KEY (id);


--
-- Name: assignment_question_options assignment_question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_question_options
    ADD CONSTRAINT assignment_question_options_pkey PRIMARY KEY (id);


--
-- Name: assignment_questions assignment_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_questions
    ADD CONSTRAINT assignment_questions_pkey PRIMARY KEY (id);


--
-- Name: assignment_syllabus_nodes assignment_syllabus_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_syllabus_nodes
    ADD CONSTRAINT assignment_syllabus_nodes_pkey PRIMARY KEY (id);


--
-- Name: assignment_targets assignment_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_targets
    ADD CONSTRAINT assignment_targets_pkey PRIMARY KEY (id);


--
-- Name: assignment_template_question_files assignment_template_question_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_template_question_files
    ADD CONSTRAINT assignment_template_question_files_pkey PRIMARY KEY (id);


--
-- Name: assignment_template_question_options assignment_template_question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_template_question_options
    ADD CONSTRAINT assignment_template_question_options_pkey PRIMARY KEY (id);


--
-- Name: assignment_template_questions assignment_template_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_template_questions
    ADD CONSTRAINT assignment_template_questions_pkey PRIMARY KEY (id);


--
-- Name: assignment_templates assignment_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_templates
    ADD CONSTRAINT assignment_templates_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: attendance_sessions attendance_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id);


--
-- Name: boards boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_pkey PRIMARY KEY (id);


--
-- Name: boards boards_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_slug_key UNIQUE (slug);


--
-- Name: card_categories card_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_categories
    ADD CONSTRAINT card_categories_pkey PRIMARY KEY (id);


--
-- Name: card_categories card_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_categories
    ADD CONSTRAINT card_categories_slug_key UNIQUE (slug);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: category_boards category_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_boards
    ADD CONSTRAINT category_boards_pkey PRIMARY KEY (category_id, board_id);


--
-- Name: category_closure category_closure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_closure
    ADD CONSTRAINT category_closure_pkey PRIMARY KEY (ancestor_id, descendant_id);


--
-- Name: class_timetables class_timetables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_timetables
    ADD CONSTRAINT class_timetables_pkey PRIMARY KEY (id);


--
-- Name: designations designations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (id);


--
-- Name: designations designations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_slug_key UNIQUE (slug);


--
-- Name: document_generation_data document_generation_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_generation_data
    ADD CONSTRAINT document_generation_data_pkey PRIMARY KEY (id);


--
-- Name: document_template_field_mappings document_template_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_template_field_mappings
    ADD CONSTRAINT document_template_field_mappings_pkey PRIMARY KEY (id);


--
-- Name: document_template_fields document_template_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_template_fields
    ADD CONSTRAINT document_template_fields_pkey PRIMARY KEY (id);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: entity_lifecycle entity_lifecycle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_lifecycle
    ADD CONSTRAINT entity_lifecycle_pkey PRIMARY KEY (id);


--
-- Name: facility_types facility_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_types
    ADD CONSTRAINT facility_types_pkey PRIMARY KEY (id);


--
-- Name: facility_types facility_types_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_types
    ADD CONSTRAINT facility_types_slug_key UNIQUE (slug);


--
-- Name: generated_documents generated_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT generated_documents_pkey PRIMARY KEY (id);


--
-- Name: help_article_assets help_article_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_assets
    ADD CONSTRAINT help_article_assets_pkey PRIMARY KEY (id);


--
-- Name: help_article_faqs help_article_faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_faqs
    ADD CONSTRAINT help_article_faqs_pkey PRIMARY KEY (id);


--
-- Name: help_article_permissions help_article_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_permissions
    ADD CONSTRAINT help_article_permissions_pkey PRIMARY KEY (article_id, permission_id);


--
-- Name: help_article_relations help_article_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_relations
    ADD CONSTRAINT help_article_relations_pkey PRIMARY KEY (article_id, related_article_id);


--
-- Name: help_article_views help_article_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_views
    ADD CONSTRAINT help_article_views_pkey PRIMARY KEY (id);


--
-- Name: help_articles help_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_pkey PRIMARY KEY (id);


--
-- Name: help_articles help_articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_slug_key UNIQUE (slug);


--
-- Name: help_categories help_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_categories
    ADD CONSTRAINT help_categories_pkey PRIMARY KEY (id);


--
-- Name: help_categories help_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_categories
    ADD CONSTRAINT help_categories_slug_key UNIQUE (slug);


--
-- Name: help_recent_updates help_recent_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_recent_updates
    ADD CONSTRAINT help_recent_updates_pkey PRIMARY KEY (id);


--
-- Name: help_search_logs help_search_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_search_logs
    ADD CONSTRAINT help_search_logs_pkey PRIMARY KEY (id);


--
-- Name: institution_academic_classes institution_academic_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_academic_classes
    ADD CONSTRAINT institution_academic_classes_pkey PRIMARY KEY (id);


--
-- Name: institution_calendar_events institution_calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_calendar_events
    ADD CONSTRAINT institution_calendar_events_pkey PRIMARY KEY (id);


--
-- Name: institution_categories institution_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_categories
    ADD CONSTRAINT institution_categories_pkey PRIMARY KEY (institution_id, category_id);


--
-- Name: institution_class_sections institution_class_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_class_sections
    ADD CONSTRAINT institution_class_sections_pkey PRIMARY KEY (id);


--
-- Name: institution_cutoffs institution_cutoffs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_cutoffs
    ADD CONSTRAINT institution_cutoffs_pkey PRIMARY KEY (id);


--
-- Name: institution_facilities institution_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facilities
    ADD CONSTRAINT institution_facilities_pkey PRIMARY KEY (id);


--
-- Name: institution_facility_media institution_facility_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facility_media
    ADD CONSTRAINT institution_facility_media_pkey PRIMARY KEY (id);


--
-- Name: institution_media institution_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_media
    ADD CONSTRAINT institution_media_pkey PRIMARY KEY (id);


--
-- Name: institution_membership_history institution_membership_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_membership_history
    ADD CONSTRAINT institution_membership_history_pkey PRIMARY KEY (id);


--
-- Name: institution_memberships institution_memberships_institution_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_memberships
    ADD CONSTRAINT institution_memberships_institution_id_user_id_key UNIQUE (institution_id, user_id);


--
-- Name: institution_memberships institution_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_memberships
    ADD CONSTRAINT institution_memberships_pkey PRIMARY KEY (id);


--
-- Name: institution_news institution_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_news
    ADD CONSTRAINT institution_news_pkey PRIMARY KEY (id);


--
-- Name: institution_notification_settings institution_notification_sett_institution_id_notification_t_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_notification_settings
    ADD CONSTRAINT institution_notification_sett_institution_id_notification_t_key UNIQUE (institution_id, notification_type);


--
-- Name: institution_notification_settings institution_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_notification_settings
    ADD CONSTRAINT institution_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: institution_placements institution_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_placements
    ADD CONSTRAINT institution_placements_pkey PRIMARY KEY (id);


--
-- Name: institution_profiles institution_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT institution_profiles_pkey PRIMARY KEY (id);


--
-- Name: institution_profiles institution_profiles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT institution_profiles_slug_key UNIQUE (slug);


--
-- Name: institution_programs institution_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT institution_programs_pkey PRIMARY KEY (id);


--
-- Name: institution_role_permission_denials institution_role_permission_denials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_role_permission_denials
    ADD CONSTRAINT institution_role_permission_denials_pkey PRIMARY KEY (institution_id, role_id, permission_id);


--
-- Name: institution_role_permissions institution_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_role_permissions
    ADD CONSTRAINT institution_role_permissions_pkey PRIMARY KEY (institution_id, role_id, permission_id);


--
-- Name: institution_scholarships institution_scholarships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_scholarships
    ADD CONSTRAINT institution_scholarships_pkey PRIMARY KEY (id);


--
-- Name: institution_subtypes institution_subtypes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_subtypes
    ADD CONSTRAINT institution_subtypes_pkey PRIMARY KEY (id);


--
-- Name: institution_subtypes institution_subtypes_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_subtypes
    ADD CONSTRAINT institution_subtypes_slug_key UNIQUE (slug);


--
-- Name: institution_template_defaults institution_template_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_template_defaults
    ADD CONSTRAINT institution_template_defaults_pkey PRIMARY KEY (id);


--
-- Name: institution_templates institution_templates_institution_id_template_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_templates
    ADD CONSTRAINT institution_templates_institution_id_template_id_key UNIQUE (institution_id, template_id);


--
-- Name: institution_templates institution_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_templates
    ADD CONSTRAINT institution_templates_pkey PRIMARY KEY (id);


--
-- Name: institution_types institution_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_types
    ADD CONSTRAINT institution_types_pkey PRIMARY KEY (id);


--
-- Name: institution_types institution_types_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_types
    ADD CONSTRAINT institution_types_slug_key UNIQUE (slug);


--
-- Name: institution_user_permissions institution_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_user_permissions
    ADD CONSTRAINT institution_user_permissions_pkey PRIMARY KEY (institution_id, user_id, permission_id);


--
-- Name: languages languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (id);


--
-- Name: languages languages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_slug_key UNIQUE (slug);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_notification_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_notification_type_key UNIQUE (user_id, notification_type);


--
-- Name: notification_recipients notification_recipients_notification_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_notification_id_user_id_key UNIQUE (notification_id, user_id);


--
-- Name: notification_recipients notification_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_code_key UNIQUE (code);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: practice_exam_question_files practice_exam_question_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_question_files
    ADD CONSTRAINT practice_exam_question_files_pkey PRIMARY KEY (id);


--
-- Name: practice_exam_question_options practice_exam_question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_question_options
    ADD CONSTRAINT practice_exam_question_options_pkey PRIMARY KEY (id);


--
-- Name: practice_exam_questions practice_exam_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_questions
    ADD CONSTRAINT practice_exam_questions_pkey PRIMARY KEY (id);


--
-- Name: practice_exam_syllabus_nodes practice_exam_syllabus_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_syllabus_nodes
    ADD CONSTRAINT practice_exam_syllabus_nodes_pkey PRIMARY KEY (id);


--
-- Name: practice_exam_targets practice_exam_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_targets
    ADD CONSTRAINT practice_exam_targets_pkey PRIMARY KEY (id);


--
-- Name: practice_exam_template_question_files practice_exam_template_question_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_template_question_files
    ADD CONSTRAINT practice_exam_template_question_files_pkey PRIMARY KEY (id);


--
-- Name: practice_exam_template_question_options practice_exam_template_question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_template_question_options
    ADD CONSTRAINT practice_exam_template_question_options_pkey PRIMARY KEY (id);


--
-- Name: practice_exam_template_questions practice_exam_template_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_template_questions
    ADD CONSTRAINT practice_exam_template_questions_pkey PRIMARY KEY (id);


--
-- Name: practice_exam_templates practice_exam_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_templates
    ADD CONSTRAINT practice_exam_templates_pkey PRIMARY KEY (id);


--
-- Name: practice_exams practice_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exams
    ADD CONSTRAINT practice_exams_pkey PRIMARY KEY (id);


--
-- Name: program_categories program_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_categories
    ADD CONSTRAINT program_categories_pkey PRIMARY KEY (program_id, category_id);


--
-- Name: program_fee_components program_fee_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_fee_components
    ADD CONSTRAINT program_fee_components_pkey PRIMARY KEY (id);


--
-- Name: program_languages program_languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_languages
    ADD CONSTRAINT program_languages_pkey PRIMARY KEY (program_id, language_id);


--
-- Name: program_media program_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_media
    ADD CONSTRAINT program_media_pkey PRIMARY KEY (id);


--
-- Name: program_section_class_teachers program_section_class_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_section_class_teachers
    ADD CONSTRAINT program_section_class_teachers_pkey PRIMARY KEY (id);


--
-- Name: program_sections program_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_sections
    ADD CONSTRAINT program_sections_pkey PRIMARY KEY (program_id, section_id);


--
-- Name: program_subject_teachers program_subject_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subject_teachers
    ADD CONSTRAINT program_subject_teachers_pkey PRIMARY KEY (id);


--
-- Name: program_subjects program_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subjects
    ADD CONSTRAINT program_subjects_pkey PRIMARY KEY (program_id, subject_id);


--
-- Name: program_types program_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_types
    ADD CONSTRAINT program_types_pkey PRIMARY KEY (id);


--
-- Name: program_types program_types_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_types
    ADD CONSTRAINT program_types_slug_key UNIQUE (slug);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- Name: roles roles_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_unique UNIQUE (code);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scope_types scope_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_types
    ADD CONSTRAINT scope_types_code_key UNIQUE (code);


--
-- Name: scope_types scope_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_types
    ADD CONSTRAINT scope_types_pkey PRIMARY KEY (id);


--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- Name: sections sections_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_slug_key UNIQUE (slug);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: skills skills_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_slug_key UNIQUE (slug);


--
-- Name: student_achievements student_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_pkey PRIMARY KEY (id);


--
-- Name: student_assignment_answers student_assignment_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_answers
    ADD CONSTRAINT student_assignment_answers_pkey PRIMARY KEY (id);


--
-- Name: student_assignment_submission_files student_assignment_submission_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_submission_files
    ADD CONSTRAINT student_assignment_submission_files_pkey PRIMARY KEY (id);


--
-- Name: student_assignments student_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignments
    ADD CONSTRAINT student_assignments_pkey PRIMARY KEY (id);


--
-- Name: student_attendance student_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_pkey PRIMARY KEY (id);


--
-- Name: student_documents student_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_pkey PRIMARY KEY (id);


--
-- Name: student_enrollments student_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_pkey PRIMARY KEY (id);


--
-- Name: student_guardians student_guardians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT student_guardians_pkey PRIMARY KEY (id);


--
-- Name: student_period_attendance student_period_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_period_attendance
    ADD CONSTRAINT student_period_attendance_pkey PRIMARY KEY (id);


--
-- Name: student_practice_exam_answers student_practice_exam_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_answers
    ADD CONSTRAINT student_practice_exam_answers_pkey PRIMARY KEY (id);


--
-- Name: student_practice_exam_attempts student_practice_exam_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_attempts
    ADD CONSTRAINT student_practice_exam_attempts_pkey PRIMARY KEY (id);


--
-- Name: student_practice_exam_results student_practice_exam_results_attempt_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_results
    ADD CONSTRAINT student_practice_exam_results_attempt_id_key UNIQUE (attempt_id);


--
-- Name: student_practice_exam_results student_practice_exam_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_results
    ADD CONSTRAINT student_practice_exam_results_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_unique_category_board_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_unique_category_board_slug UNIQUE (category_id, board_id, slug);


--
-- Name: support_ticket_attachments support_ticket_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_attachments
    ADD CONSTRAINT support_ticket_attachments_pkey PRIMARY KEY (id);


--
-- Name: support_ticket_history support_ticket_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_history
    ADD CONSTRAINT support_ticket_history_pkey PRIMARY KEY (id);


--
-- Name: support_ticket_messages support_ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: syllabi syllabi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabi
    ADD CONSTRAINT syllabi_pkey PRIMARY KEY (id);


--
-- Name: syllabus_inheritance_logs syllabus_inheritance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_inheritance_logs
    ADD CONSTRAINT syllabus_inheritance_logs_pkey PRIMARY KEY (id);


--
-- Name: syllabus_node_closure syllabus_node_closure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_node_closure
    ADD CONSTRAINT syllabus_node_closure_pkey PRIMARY KEY (ancestor_id, descendant_id);


--
-- Name: syllabus_nodes syllabus_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_nodes
    ADD CONSTRAINT syllabus_nodes_pkey PRIMARY KEY (id);


--
-- Name: teacher_class_subject_assignments teacher_class_subject_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_subject_assignments
    ADD CONSTRAINT teacher_class_subject_assignments_pkey PRIMARY KEY (id);


--
-- Name: timetable_entries timetable_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_pkey PRIMARY KEY (id);


--
-- Name: timetable_periods timetable_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_periods
    ADD CONSTRAINT timetable_periods_pkey PRIMARY KEY (id);


--
-- Name: timetable_slots timetable_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_pkey PRIMARY KEY (id);


--
-- Name: academic_years uq_academic_year; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT uq_academic_year UNIQUE (institution_id, name);


--
-- Name: assignment_syllabus_nodes uq_assignment_syllabus_node; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_syllabus_nodes
    ADD CONSTRAINT uq_assignment_syllabus_node UNIQUE (assignment_id, syllabus_node_id);


--
-- Name: attendance_sessions uq_attendance_session; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT uq_attendance_session UNIQUE (program_id, section_id, attendance_date);


--
-- Name: class_timetables uq_ct_slot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_timetables
    ADD CONSTRAINT uq_ct_slot UNIQUE (institution_class_section_id, academic_year_id, day_of_week, period_id);


--
-- Name: institution_academic_classes uq_iac_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_academic_classes
    ADD CONSTRAINT uq_iac_unique UNIQUE (institution_id, academic_year_id, category_id);


--
-- Name: institution_class_sections uq_ics_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_class_sections
    ADD CONSTRAINT uq_ics_unique UNIQUE (institution_class_id, section_id);


--
-- Name: institution_news uq_institution_news_institution_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_news
    ADD CONSTRAINT uq_institution_news_institution_slug UNIQUE (institution_id, slug);


--
-- Name: institution_programs uq_institution_programs_institution_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT uq_institution_programs_institution_slug UNIQUE (institution_id, slug);


--
-- Name: institution_template_defaults uq_institution_template_defaults; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_template_defaults
    ADD CONSTRAINT uq_institution_template_defaults UNIQUE (institution_id, template_id);


--
-- Name: practice_exam_syllabus_nodes uq_practice_exam_syllabus; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_syllabus_nodes
    ADD CONSTRAINT uq_practice_exam_syllabus UNIQUE (practice_exam_id, syllabus_node_id);


--
-- Name: practice_exam_targets uq_practice_exam_target; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_targets
    ADD CONSTRAINT uq_practice_exam_target UNIQUE (practice_exam_id, target_type, target_id);


--
-- Name: program_section_class_teachers uq_psct; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_section_class_teachers
    ADD CONSTRAINT uq_psct UNIQUE (program_id, section_id, academic_year_id);


--
-- Name: program_subject_teachers uq_pst; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subject_teachers
    ADD CONSTRAINT uq_pst UNIQUE (program_id, section_id, subject_id, academic_year_id);


--
-- Name: timetable_slots uq_slot_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT uq_slot_order UNIQUE (institution_id, slot_order);


--
-- Name: student_attendance uq_student_attendance; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT uq_student_attendance UNIQUE (attendance_session_id, student_id);


--
-- Name: student_period_attendance uq_student_period_attendance; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_period_attendance
    ADD CONSTRAINT uq_student_period_attendance UNIQUE (attendance_session_id, student_id, slot_id);


--
-- Name: teacher_class_subject_assignments uq_tcsa_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_subject_assignments
    ADD CONSTRAINT uq_tcsa_unique UNIQUE (institution_class_section_id, subject_id, academic_year_id);


--
-- Name: timetable_entries uq_timetable_entry; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT uq_timetable_entry UNIQUE (academic_year_id, program_id, section_id, day_of_week, slot_id);


--
-- Name: user_certifications user_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_certifications
    ADD CONSTRAINT user_certifications_pkey PRIMARY KEY (id);


--
-- Name: user_education user_education_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_education
    ADD CONSTRAINT user_education_pkey PRIMARY KEY (id);


--
-- Name: user_experience user_experience_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_experience
    ADD CONSTRAINT user_experience_pkey PRIMARY KEY (id);


--
-- Name: user_locations user_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations
    ADD CONSTRAINT user_locations_pkey PRIMARY KEY (id);


--
-- Name: user_locations user_locations_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations
    ADD CONSTRAINT user_locations_user_id_key UNIQUE (user_id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: user_teaching_categories user_teaching_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_teaching_categories
    ADD CONSTRAINT user_teaching_categories_pkey PRIMARY KEY (user_id, category_id);


--
-- Name: user_teaching_subjects user_teaching_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_teaching_subjects
    ADD CONSTRAINT user_teaching_subjects_pkey PRIMARY KEY (user_id, subject_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visitor_activities visitor_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_activities
    ADD CONSTRAINT visitor_activities_pkey PRIMARY KEY (id);


--
-- Name: visitor_sessions visitor_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_sessions
    ADD CONSTRAINT visitor_sessions_pkey PRIMARY KEY (id);


--
-- Name: visitor_sessions visitor_sessions_tracking_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_sessions
    ADD CONSTRAINT visitor_sessions_tracking_token_key UNIQUE (tracking_token);


--
-- Name: categories_parent_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_parent_slug_unique ON public.categories USING btree (parent_id, slug) WHERE (parent_id IS NOT NULL);


--
-- Name: categories_root_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_root_slug_unique ON public.categories USING btree (slug) WHERE (parent_id IS NULL);


--
-- Name: idx_academic_session_templates_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_session_templates_recycle_bin ON public.academic_session_templates USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_academic_years_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_years_deleted ON public.academic_years USING btree (is_deleted);


--
-- Name: idx_academic_years_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_years_recycle_bin ON public.academic_years USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_app_settings_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_settings_recycle_bin ON public.app_settings USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_as_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_as_academic_year ON public.attendance_sessions USING btree (academic_year_id);


--
-- Name: idx_as_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_as_date ON public.attendance_sessions USING btree (attendance_date);


--
-- Name: idx_as_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_as_institution ON public.attendance_sessions USING btree (institution_id);


--
-- Name: idx_as_program_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_as_program_section ON public.attendance_sessions USING btree (program_id, section_id);


--
-- Name: idx_as_program_section_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_as_program_section_date ON public.attendance_sessions USING btree (program_id, section_id, attendance_date);


--
-- Name: idx_asn_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asn_assignment ON public.assignment_syllabus_nodes USING btree (assignment_id);


--
-- Name: idx_asn_node; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asn_node ON public.assignment_syllabus_nodes USING btree (syllabus_node_id);


--
-- Name: idx_assignment_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_creator ON public.assignments USING btree (created_by);


--
-- Name: idx_assignment_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_institution ON public.assignments USING btree (institution_id);


--
-- Name: idx_assignment_question_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_question_assignment ON public.assignment_questions USING btree (assignment_id);


--
-- Name: idx_assignment_question_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_question_order ON public.assignment_questions USING btree (assignment_id, display_order);


--
-- Name: idx_assignment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_status ON public.assignments USING btree (status);


--
-- Name: idx_assignment_submission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_submission ON public.assignments USING btree (submission_date);


--
-- Name: idx_assignment_target_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_target_assignment ON public.assignment_targets USING btree (assignment_id);


--
-- Name: idx_assignment_target_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_target_lookup ON public.assignment_targets USING btree (target_type, target_id);


--
-- Name: idx_assignment_targets_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_targets_program ON public.assignment_targets USING btree (program_id);


--
-- Name: idx_assignment_templates_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_templates_blocked ON public.assignment_templates USING btree (blocked_by_platform);


--
-- Name: idx_assignment_templates_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_templates_deleted ON public.assignment_templates USING btree (is_deleted);


--
-- Name: idx_assignment_templates_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_templates_recycle_bin ON public.assignment_templates USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_assignments_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_deleted ON public.assignments USING btree (is_deleted);


--
-- Name: idx_assignments_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_recycle_bin ON public.assignments USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_at_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_at_active ON public.assignment_templates USING btree (is_active);


--
-- Name: idx_at_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_at_creator ON public.assignment_templates USING btree (created_by);


--
-- Name: idx_at_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_at_institution ON public.assignment_templates USING btree (source_institution_id);


--
-- Name: idx_at_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_at_public ON public.assignment_templates USING btree (is_public);


--
-- Name: idx_atq_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_atq_template ON public.assignment_template_questions USING btree (template_id);


--
-- Name: idx_atq_template_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_atq_template_order ON public.assignment_template_questions USING btree (template_id, display_order);


--
-- Name: idx_atqo_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_atqo_question ON public.assignment_template_question_options USING btree (question_id);


--
-- Name: idx_attendance_sessions_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_sessions_deleted ON public.attendance_sessions USING btree (is_deleted);


--
-- Name: idx_attendance_sessions_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_sessions_recycle_bin ON public.attendance_sessions USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_boards_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_boards_active ON public.boards USING btree (is_active);


--
-- Name: idx_boards_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_boards_deleted ON public.boards USING btree (is_deleted);


--
-- Name: idx_boards_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_boards_recycle_bin ON public.boards USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_boards_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_boards_slug ON public.boards USING btree (slug);


--
-- Name: idx_card_categories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_categories_active ON public.card_categories USING btree (is_active);


--
-- Name: idx_card_categories_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_categories_recycle_bin ON public.card_categories USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_categories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_active ON public.categories USING btree (is_active);


--
-- Name: idx_categories_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_deleted ON public.categories USING btree (is_deleted);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_recycle_bin ON public.categories USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_category_boards_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_boards_board ON public.category_boards USING btree (board_id);


--
-- Name: idx_category_boards_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_boards_category ON public.category_boards USING btree (category_id);


--
-- Name: idx_class_timetables_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_class_timetables_recycle_bin ON public.class_timetables USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_closure_ancestor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_closure_ancestor ON public.category_closure USING btree (ancestor_id);


--
-- Name: idx_closure_depth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_closure_depth ON public.category_closure USING btree (depth);


--
-- Name: idx_closure_descendant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_closure_descendant ON public.category_closure USING btree (descendant_id);


--
-- Name: idx_ct_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ct_class ON public.class_timetables USING btree (institution_class_section_id);


--
-- Name: idx_ct_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ct_period ON public.class_timetables USING btree (period_id);


--
-- Name: idx_ct_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ct_subject ON public.class_timetables USING btree (subject_id);


--
-- Name: idx_ct_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ct_teacher ON public.class_timetables USING btree (teacher_id);


--
-- Name: idx_ct_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ct_year ON public.class_timetables USING btree (academic_year_id);


--
-- Name: idx_designations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_designations_active ON public.designations USING btree (is_active);


--
-- Name: idx_designations_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_designations_deleted ON public.designations USING btree (is_deleted);


--
-- Name: idx_designations_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_designations_recycle_bin ON public.designations USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_designations_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_designations_slug ON public.designations USING btree (slug);


--
-- Name: idx_document_generation_data_context_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_generation_data_context_snapshot ON public.document_generation_data USING gin (context_snapshot);


--
-- Name: idx_document_generation_data_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_generation_data_deleted ON public.document_generation_data USING btree (is_deleted);


--
-- Name: idx_document_generation_data_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_generation_data_enrollment ON public.document_generation_data USING btree (enrollment_id);


--
-- Name: idx_document_generation_data_generated_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_generation_data_generated_document ON public.document_generation_data USING btree (generated_document_id);


--
-- Name: idx_document_generation_data_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_generation_data_lifecycle ON public.document_generation_data USING btree (lifecycle_id);


--
-- Name: idx_document_generation_data_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_generation_data_reference ON public.document_generation_data USING btree (reference_type, reference_id);


--
-- Name: idx_document_generation_data_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_generation_data_template ON public.document_generation_data USING btree (template_id);


--
-- Name: idx_document_template_field_mappings_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_template_field_mappings_institution ON public.document_template_field_mappings USING btree (institution_id);


--
-- Name: idx_document_template_field_mappings_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_template_field_mappings_template ON public.document_template_field_mappings USING btree (template_id);


--
-- Name: idx_document_template_fields_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_template_fields_sort ON public.document_template_fields USING btree (template_id, sort_order);


--
-- Name: idx_document_template_fields_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_template_fields_template ON public.document_template_fields USING btree (template_id);


--
-- Name: idx_document_templates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_active ON public.document_templates USING btree (is_active);


--
-- Name: idx_document_templates_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_category ON public.document_templates USING btree (card_category_id);


--
-- Name: idx_document_templates_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_deleted ON public.document_templates USING btree (is_deleted);


--
-- Name: idx_document_templates_marketplace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_marketplace ON public.document_templates USING btree (card_category_id, is_public, is_active);


--
-- Name: idx_document_templates_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_public ON public.document_templates USING btree (is_public);


--
-- Name: idx_document_templates_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_templates_recycle_bin ON public.document_templates USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_entity_lifecycle_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_lifecycle_current ON public.entity_lifecycle USING btree (is_current);


--
-- Name: idx_entity_lifecycle_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_lifecycle_entity ON public.entity_lifecycle USING btree (entity_type, entity_id);


--
-- Name: idx_entity_lifecycle_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_lifecycle_institution ON public.entity_lifecycle USING btree (institution_id);


--
-- Name: idx_entity_lifecycle_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_lifecycle_metadata ON public.entity_lifecycle USING gin (metadata);


--
-- Name: idx_entity_lifecycle_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_lifecycle_status ON public.entity_lifecycle USING btree (status);


--
-- Name: idx_facility_types_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_types_recycle_bin ON public.facility_types USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_generated_documents_context_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_context_snapshot ON public.generated_documents USING gin (context_snapshot);


--
-- Name: idx_generated_documents_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_created_at ON public.generated_documents USING btree (created_at);


--
-- Name: idx_generated_documents_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_deleted ON public.generated_documents USING btree (is_deleted);


--
-- Name: idx_generated_documents_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_enrollment ON public.generated_documents USING btree (enrollment_id);


--
-- Name: idx_generated_documents_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_institution ON public.generated_documents USING btree (institution_id);


--
-- Name: idx_generated_documents_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_lifecycle ON public.generated_documents USING btree (lifecycle_id);


--
-- Name: idx_generated_documents_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_recycle_bin ON public.generated_documents USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_generated_documents_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_reference ON public.generated_documents USING btree (reference_type, reference_id);


--
-- Name: idx_generated_documents_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_template ON public.generated_documents USING btree (template_id);


--
-- Name: idx_help_articles_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_articles_category ON public.help_articles USING btree (category_id);


--
-- Name: idx_help_articles_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_articles_deleted ON public.help_articles USING btree (is_deleted);


--
-- Name: idx_help_articles_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_articles_published ON public.help_articles USING btree (is_published);


--
-- Name: idx_help_articles_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_articles_recycle_bin ON public.help_articles USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_help_articles_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_articles_slug ON public.help_articles USING btree (slug);


--
-- Name: idx_help_articles_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_articles_visibility ON public.help_articles USING btree (visibility);


--
-- Name: idx_help_assets_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_assets_article ON public.help_article_assets USING btree (article_id);


--
-- Name: idx_help_categories_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_categories_deleted ON public.help_categories USING btree (is_deleted);


--
-- Name: idx_help_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_categories_parent ON public.help_categories USING btree (parent_id);


--
-- Name: idx_help_categories_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_categories_recycle_bin ON public.help_categories USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_help_categories_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_categories_sort ON public.help_categories USING btree (sort_order);


--
-- Name: idx_help_faq_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_faq_article ON public.help_article_faqs USING btree (article_id);


--
-- Name: idx_help_recent_updates_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_recent_updates_date ON public.help_recent_updates USING btree (update_date);


--
-- Name: idx_help_recent_updates_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_recent_updates_deleted ON public.help_recent_updates USING btree (is_deleted);


--
-- Name: idx_help_recent_updates_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_recent_updates_published ON public.help_recent_updates USING btree (is_published);


--
-- Name: idx_help_recent_updates_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_recent_updates_recycle_bin ON public.help_recent_updates USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_help_search_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_search_term ON public.help_search_logs USING btree (search_term);


--
-- Name: idx_help_views_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_help_views_article ON public.help_article_views USING btree (article_id);


--
-- Name: idx_iac_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iac_active ON public.institution_academic_classes USING btree (is_active);


--
-- Name: idx_iac_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iac_category ON public.institution_academic_classes USING btree (category_id);


--
-- Name: idx_iac_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iac_institution ON public.institution_academic_classes USING btree (institution_id);


--
-- Name: idx_iac_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iac_year ON public.institution_academic_classes USING btree (academic_year_id);


--
-- Name: idx_ics_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ics_class ON public.institution_class_sections USING btree (institution_class_id);


--
-- Name: idx_ics_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ics_section ON public.institution_class_sections USING btree (section_id);


--
-- Name: idx_ics_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ics_teacher ON public.institution_class_sections USING btree (class_teacher_id);


--
-- Name: idx_ifm_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ifm_created_at ON public.institution_facility_media USING btree (created_at);


--
-- Name: idx_ifm_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ifm_facility ON public.institution_facility_media USING btree (institution_facility_id);


--
-- Name: idx_ifm_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ifm_media_type ON public.institution_facility_media USING btree (media_type);


--
-- Name: idx_ifm_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ifm_sort_order ON public.institution_facility_media USING btree (institution_facility_id, sort_order);


--
-- Name: idx_institution_academic_classes_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_academic_classes_deleted ON public.institution_academic_classes USING btree (is_deleted);


--
-- Name: idx_institution_academic_classes_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_academic_classes_recycle_bin ON public.institution_academic_classes USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_calendar_events_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_calendar_events_deleted ON public.institution_calendar_events USING btree (is_deleted);


--
-- Name: idx_institution_calendar_events_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_calendar_events_recycle_bin ON public.institution_calendar_events USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_categories_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_categories_category ON public.institution_categories USING btree (category_id);


--
-- Name: idx_institution_categories_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_categories_institution ON public.institution_categories USING btree (institution_id);


--
-- Name: idx_institution_class_sections_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_class_sections_deleted ON public.institution_class_sections USING btree (is_deleted);


--
-- Name: idx_institution_class_sections_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_class_sections_recycle_bin ON public.institution_class_sections USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_cutoffs_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_cutoffs_deleted ON public.institution_cutoffs USING btree (is_deleted);


--
-- Name: idx_institution_cutoffs_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_cutoffs_institution ON public.institution_cutoffs USING btree (institution_id);


--
-- Name: idx_institution_cutoffs_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_cutoffs_program ON public.institution_cutoffs USING btree (program_id);


--
-- Name: idx_institution_cutoffs_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_cutoffs_recycle_bin ON public.institution_cutoffs USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_facilities_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_facilities_active ON public.institution_facilities USING btree (is_active);


--
-- Name: idx_institution_facilities_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_facilities_deleted ON public.institution_facilities USING btree (is_deleted);


--
-- Name: idx_institution_facilities_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_facilities_display_order ON public.institution_facilities USING btree (institution_id, display_order);


--
-- Name: idx_institution_facilities_facility_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_facilities_facility_type ON public.institution_facilities USING btree (facility_type_id);


--
-- Name: idx_institution_facilities_facility_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_facilities_facility_type_id ON public.institution_facilities USING btree (facility_type_id);


--
-- Name: idx_institution_facilities_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_facilities_institution ON public.institution_facilities USING btree (institution_id);


--
-- Name: idx_institution_facilities_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_facilities_institution_id ON public.institution_facilities USING btree (institution_id);


--
-- Name: idx_institution_facilities_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_facilities_recycle_bin ON public.institution_facilities USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_media_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_media_deleted ON public.institution_media USING btree (is_deleted);


--
-- Name: idx_institution_media_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_media_institution ON public.institution_media USING btree (institution_id);


--
-- Name: idx_institution_media_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_media_recycle_bin ON public.institution_media USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_media_type ON public.institution_media USING btree (media_type);


--
-- Name: idx_institution_memberships_active_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_memberships_active_context ON public.institution_memberships USING btree (institution_id, user_id, role_id) WHERE ((is_current = true) AND (is_active = true) AND (is_deleted = false));


--
-- Name: idx_institution_memberships_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_memberships_current ON public.institution_memberships USING btree (is_current);


--
-- Name: idx_institution_memberships_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_memberships_deleted ON public.institution_memberships USING btree (is_deleted);


--
-- Name: idx_institution_memberships_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_memberships_institution ON public.institution_memberships USING btree (institution_id);


--
-- Name: idx_institution_memberships_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_memberships_recycle_bin ON public.institution_memberships USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_memberships_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_memberships_status ON public.institution_memberships USING btree (status);


--
-- Name: idx_institution_memberships_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_memberships_user ON public.institution_memberships USING btree (user_id);


--
-- Name: idx_institution_news_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_news_deleted ON public.institution_news USING btree (is_deleted);


--
-- Name: idx_institution_news_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_news_institution ON public.institution_news USING btree (institution_id);


--
-- Name: idx_institution_news_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_news_published ON public.institution_news USING btree (published_at);


--
-- Name: idx_institution_news_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_news_recycle_bin ON public.institution_news USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_news_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_news_slug ON public.institution_news USING btree (slug);


--
-- Name: idx_institution_placements_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_placements_deleted ON public.institution_placements USING btree (is_deleted);


--
-- Name: idx_institution_placements_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_placements_institution ON public.institution_placements USING btree (institution_id);


--
-- Name: idx_institution_placements_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_placements_recycle_bin ON public.institution_placements USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_placements_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_placements_year ON public.institution_placements USING btree (year);


--
-- Name: idx_institution_profiles_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_profiles_board ON public.institution_profiles USING btree (board_id);


--
-- Name: idx_institution_profiles_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_profiles_deleted ON public.institution_profiles USING btree (is_deleted);


--
-- Name: idx_institution_profiles_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_profiles_location ON public.institution_profiles USING btree (location_id);


--
-- Name: idx_institution_profiles_parent_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_profiles_parent_university ON public.institution_profiles USING btree (parent_university_id);


--
-- Name: idx_institution_profiles_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_profiles_recycle_bin ON public.institution_profiles USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_profiles_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_profiles_slug ON public.institution_profiles USING btree (slug);


--
-- Name: idx_institution_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_profiles_status ON public.institution_profiles USING btree (status);


--
-- Name: idx_institution_profiles_subtype; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_profiles_subtype ON public.institution_profiles USING btree (institution_subtype_id);


--
-- Name: idx_institution_profiles_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_profiles_type ON public.institution_profiles USING btree (institution_type_id);


--
-- Name: idx_institution_programs_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_programs_board ON public.institution_programs USING btree (board_id);


--
-- Name: idx_institution_programs_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_programs_deleted ON public.institution_programs USING btree (is_deleted);


--
-- Name: idx_institution_programs_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_programs_institution ON public.institution_programs USING btree (institution_id);


--
-- Name: idx_institution_programs_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_programs_recycle_bin ON public.institution_programs USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_programs_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_programs_slug ON public.institution_programs USING btree (slug);


--
-- Name: idx_institution_programs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_programs_type ON public.institution_programs USING btree (program_type_id);


--
-- Name: idx_institution_programs_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_programs_university ON public.institution_programs USING btree (university_id);


--
-- Name: idx_institution_scholarships_ai_response; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_scholarships_ai_response ON public.institution_scholarships USING gin (ai_response);


--
-- Name: idx_institution_scholarships_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_scholarships_deleted ON public.institution_scholarships USING btree (is_deleted);


--
-- Name: idx_institution_scholarships_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_scholarships_institution ON public.institution_scholarships USING btree (institution_id);


--
-- Name: idx_institution_scholarships_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_scholarships_recycle_bin ON public.institution_scholarships USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_subtypes_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_subtypes_recycle_bin ON public.institution_subtypes USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_institution_templates_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_templates_institution ON public.institution_templates USING btree (institution_id);


--
-- Name: idx_institution_templates_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_templates_template ON public.institution_templates USING btree (template_id);


--
-- Name: idx_institution_types_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_institution_types_recycle_bin ON public.institution_types USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_irpd_institution_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_irpd_institution_role ON public.institution_role_permission_denials USING btree (institution_id, role_id);


--
-- Name: idx_itd_field_values; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_itd_field_values ON public.institution_template_defaults USING gin (field_values);


--
-- Name: idx_itd_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_itd_institution ON public.institution_template_defaults USING btree (institution_id);


--
-- Name: idx_itd_institution_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_itd_institution_template ON public.institution_template_defaults USING btree (institution_id, template_id);


--
-- Name: idx_itd_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_itd_template ON public.institution_template_defaults USING btree (template_id);


--
-- Name: idx_iup_institution_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iup_institution_user ON public.institution_user_permissions USING btree (institution_id, user_id);


--
-- Name: idx_iup_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iup_permission ON public.institution_user_permissions USING btree (permission_id);


--
-- Name: idx_iup_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iup_user ON public.institution_user_permissions USING btree (user_id);


--
-- Name: idx_languages_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_languages_recycle_bin ON public.languages USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_locations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_active ON public.locations USING btree (is_active);


--
-- Name: idx_locations_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_deleted ON public.locations USING btree (is_deleted);


--
-- Name: idx_locations_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_name ON public.locations USING btree (name);


--
-- Name: idx_locations_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_name_trgm ON public.locations USING gin (name gin_trgm_ops);


--
-- Name: idx_locations_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_parent ON public.locations USING btree (parent_id);


--
-- Name: idx_locations_parent_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_locations_parent_slug_unique ON public.locations USING btree (parent_id, slug);


--
-- Name: idx_locations_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_recycle_bin ON public.locations USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_locations_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_slug ON public.locations USING btree (slug);


--
-- Name: idx_locations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_type ON public.locations USING btree (type);


--
-- Name: idx_membership_history_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_history_current ON public.institution_membership_history USING btree (is_current);


--
-- Name: idx_membership_history_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_history_institution ON public.institution_membership_history USING btree (institution_id);


--
-- Name: idx_membership_history_membership; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_history_membership ON public.institution_membership_history USING btree (membership_id);


--
-- Name: idx_membership_history_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_history_metadata ON public.institution_membership_history USING gin (metadata);


--
-- Name: idx_membership_history_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_history_role ON public.institution_membership_history USING btree (role_id);


--
-- Name: idx_membership_history_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_history_status ON public.institution_membership_history USING btree (status);


--
-- Name: idx_membership_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_history_user ON public.institution_membership_history USING btree (user_id);


--
-- Name: idx_notification_recipients_important; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_recipients_important ON public.notification_recipients USING btree (user_id, is_important);


--
-- Name: idx_notification_recipients_notification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_recipients_notification ON public.notification_recipients USING btree (notification_id);


--
-- Name: idx_notification_recipients_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_recipients_unread ON public.notification_recipients USING btree (user_id, is_read);


--
-- Name: idx_notification_recipients_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_recipients_user ON public.notification_recipients USING btree (user_id);


--
-- Name: idx_notification_templates_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_templates_recycle_bin ON public.notification_templates USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_pe_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pe_institution ON public.practice_exams USING btree (institution_id);


--
-- Name: idx_pe_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pe_status ON public.practice_exams USING btree (status);


--
-- Name: idx_pe_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pe_template ON public.practice_exams USING btree (template_id);


--
-- Name: idx_peq_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_peq_exam ON public.practice_exam_questions USING btree (practice_exam_id);


--
-- Name: idx_peq_exam_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_peq_exam_order ON public.practice_exam_questions USING btree (practice_exam_id, display_order);


--
-- Name: idx_peqf_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_peqf_question ON public.practice_exam_question_files USING btree (question_id);


--
-- Name: idx_peqo_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_peqo_question ON public.practice_exam_question_options USING btree (question_id);


--
-- Name: idx_permissions_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permissions_recycle_bin ON public.permissions USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_pesn_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pesn_exam ON public.practice_exam_syllabus_nodes USING btree (practice_exam_id);


--
-- Name: idx_pesn_node; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pesn_node ON public.practice_exam_syllabus_nodes USING btree (syllabus_node_id);


--
-- Name: idx_pet_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_active ON public.practice_exam_templates USING btree (is_active);


--
-- Name: idx_pet_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_exam ON public.practice_exam_targets USING btree (practice_exam_id);


--
-- Name: idx_pet_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_lookup ON public.practice_exam_targets USING btree (target_type, target_id);


--
-- Name: idx_pet_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_program ON public.practice_exam_targets USING btree (program_id);


--
-- Name: idx_pet_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_public ON public.practice_exam_templates USING btree (is_public);


--
-- Name: idx_pet_source_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pet_source_institution ON public.practice_exam_templates USING btree (source_institution_id);


--
-- Name: idx_petq_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_petq_template ON public.practice_exam_template_questions USING btree (template_id);


--
-- Name: idx_petq_template_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_petq_template_order ON public.practice_exam_template_questions USING btree (template_id, display_order);


--
-- Name: idx_petqf_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_petqf_question ON public.practice_exam_template_question_files USING btree (question_id);


--
-- Name: idx_petqo_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_petqo_question ON public.practice_exam_template_question_options USING btree (question_id);


--
-- Name: idx_practice_exam_targets_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_practice_exam_targets_program ON public.practice_exam_targets USING btree (program_id);


--
-- Name: idx_practice_exam_templates_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_practice_exam_templates_blocked ON public.practice_exam_templates USING btree (blocked_by_platform);


--
-- Name: idx_practice_exam_templates_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_practice_exam_templates_deleted ON public.practice_exam_templates USING btree (is_deleted);


--
-- Name: idx_practice_exam_templates_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_practice_exam_templates_recycle_bin ON public.practice_exam_templates USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_practice_exams_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_practice_exams_deleted ON public.practice_exams USING btree (is_deleted);


--
-- Name: idx_practice_exams_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_practice_exams_recycle_bin ON public.practice_exams USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_program_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_academic_year ON public.institution_programs USING btree (academic_year_id);


--
-- Name: idx_program_categories_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_categories_category ON public.program_categories USING btree (category_id);


--
-- Name: idx_program_categories_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_categories_program ON public.program_categories USING btree (program_id);


--
-- Name: idx_program_class_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_class_teacher ON public.institution_programs USING btree (class_teacher_id);


--
-- Name: idx_program_fee_components_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_fee_components_program ON public.program_fee_components USING btree (program_id);


--
-- Name: idx_program_languages_language; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_languages_language ON public.program_languages USING btree (language_id);


--
-- Name: idx_program_languages_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_languages_program ON public.program_languages USING btree (program_id);


--
-- Name: idx_program_media_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_media_program ON public.program_media USING btree (program_id);


--
-- Name: idx_program_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_media_type ON public.program_media USING btree (media_type);


--
-- Name: idx_program_sections_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_sections_program ON public.program_sections USING btree (program_id);


--
-- Name: idx_program_sections_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_sections_section ON public.program_sections USING btree (section_id);


--
-- Name: idx_program_subjects_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_subjects_program ON public.program_subjects USING btree (program_id);


--
-- Name: idx_program_subjects_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_subjects_subject ON public.program_subjects USING btree (subject_id);


--
-- Name: idx_program_types_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_types_recycle_bin ON public.program_types USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_psct_program_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psct_program_section ON public.program_section_class_teachers USING btree (program_id, section_id);


--
-- Name: idx_psct_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psct_teacher ON public.program_section_class_teachers USING btree (teacher_id);


--
-- Name: idx_pst_program_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pst_program_section ON public.program_subject_teachers USING btree (program_id, section_id);


--
-- Name: idx_pst_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pst_teacher ON public.program_subject_teachers USING btree (teacher_id);


--
-- Name: idx_roles_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_recycle_bin ON public.roles USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_sa_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sa_session ON public.student_attendance USING btree (attendance_session_id);


--
-- Name: idx_sa_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sa_status ON public.student_attendance USING btree (status);


--
-- Name: idx_sa_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sa_student ON public.student_attendance USING btree (student_id);


--
-- Name: idx_sa_student_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sa_student_session ON public.student_attendance USING btree (student_id, attendance_session_id);


--
-- Name: idx_saa_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saa_assignment ON public.student_assignment_answers USING btree (student_assignment_id);


--
-- Name: idx_saa_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saa_question ON public.student_assignment_answers USING btree (question_id);


--
-- Name: idx_scope_types_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scope_types_recycle_bin ON public.scope_types USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_sections_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sections_active ON public.sections USING btree (is_active);


--
-- Name: idx_sections_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sections_deleted ON public.sections USING btree (is_deleted);


--
-- Name: idx_sections_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sections_recycle_bin ON public.sections USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_sections_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sections_slug ON public.sections USING btree (slug);


--
-- Name: idx_skills_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skills_active ON public.skills USING btree (is_active);


--
-- Name: idx_skills_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skills_deleted ON public.skills USING btree (is_deleted);


--
-- Name: idx_skills_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skills_recycle_bin ON public.skills USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_skills_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skills_slug ON public.skills USING btree (slug);


--
-- Name: idx_slot_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slot_institution ON public.timetable_slots USING btree (institution_id);


--
-- Name: idx_spa_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spa_session ON public.student_period_attendance USING btree (attendance_session_id);


--
-- Name: idx_spa_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spa_slot ON public.student_period_attendance USING btree (slot_id);


--
-- Name: idx_spa_slot_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spa_slot_session ON public.student_period_attendance USING btree (slot_id, attendance_session_id);


--
-- Name: idx_spa_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spa_student ON public.student_period_attendance USING btree (student_id);


--
-- Name: idx_spa_student_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spa_student_session ON public.student_period_attendance USING btree (student_id, attendance_session_id);


--
-- Name: idx_spa_student_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spa_student_slot ON public.student_period_attendance USING btree (student_id, slot_id);


--
-- Name: idx_spea_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spea_attempt ON public.student_practice_exam_answers USING btree (attempt_id);


--
-- Name: idx_spea_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spea_exam ON public.student_practice_exam_attempts USING btree (practice_exam_id);


--
-- Name: idx_spea_exam_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spea_exam_version ON public.student_practice_exam_attempts USING btree (practice_exam_id, student_id, exam_version);


--
-- Name: idx_spea_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spea_question ON public.student_practice_exam_answers USING btree (question_id);


--
-- Name: idx_spea_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spea_student ON public.student_practice_exam_attempts USING btree (student_id);


--
-- Name: idx_spea_student_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spea_student_exam ON public.student_practice_exam_attempts USING btree (student_id, practice_exam_id);


--
-- Name: idx_sper_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sper_exam ON public.student_practice_exam_results USING btree (practice_exam_id);


--
-- Name: idx_sper_exam_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sper_exam_version ON public.student_practice_exam_results USING btree (practice_exam_id, student_id, exam_version);


--
-- Name: idx_sper_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sper_student ON public.student_practice_exam_results USING btree (student_id);


--
-- Name: idx_student_achievements_card_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_card_category_id ON public.student_achievements USING btree (card_category_id);


--
-- Name: idx_student_achievements_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_category ON public.student_achievements USING btree (card_category_id);


--
-- Name: idx_student_achievements_context_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_context_snapshot ON public.student_achievements USING gin (context_snapshot);


--
-- Name: idx_student_achievements_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_deleted ON public.student_achievements USING btree (is_deleted);


--
-- Name: idx_student_achievements_document_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_document_template ON public.student_achievements USING btree (document_template_id);


--
-- Name: idx_student_achievements_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_enrollment ON public.student_achievements USING btree (enrollment_id);


--
-- Name: idx_student_achievements_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_institution_id ON public.student_achievements USING btree (institution_id);


--
-- Name: idx_student_achievements_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_lifecycle ON public.student_achievements USING btree (lifecycle_id);


--
-- Name: idx_student_achievements_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_recycle_bin ON public.student_achievements USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_student_achievements_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_achievements_template_id ON public.student_achievements USING btree (template_id);


--
-- Name: idx_student_assignment_answers_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_assignment_answers_deleted ON public.student_assignment_answers USING btree (is_deleted);


--
-- Name: idx_student_assignment_answers_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_assignment_answers_enrollment ON public.student_assignment_answers USING btree (enrollment_id);


--
-- Name: idx_student_assignment_answers_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_assignment_answers_lifecycle ON public.student_assignment_answers USING btree (lifecycle_id);


--
-- Name: idx_student_assignment_submission_files_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_assignment_submission_files_recycle_bin ON public.student_assignment_submission_files USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_student_assignments_context_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_assignments_context_snapshot ON public.student_assignments USING gin (context_snapshot);


--
-- Name: idx_student_assignments_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_assignments_deleted ON public.student_assignments USING btree (is_deleted);


--
-- Name: idx_student_assignments_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_assignments_enrollment ON public.student_assignments USING btree (enrollment_id);


--
-- Name: idx_student_assignments_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_assignments_lifecycle ON public.student_assignments USING btree (lifecycle_id);


--
-- Name: idx_student_attendance_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_attendance_deleted ON public.student_attendance USING btree (is_deleted);


--
-- Name: idx_student_attendance_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_attendance_enrollment ON public.student_attendance USING btree (enrollment_id);


--
-- Name: idx_student_attendance_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_attendance_lifecycle ON public.student_attendance USING btree (lifecycle_id);


--
-- Name: idx_student_attendance_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_attendance_recycle_bin ON public.student_attendance USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_student_documents_context_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_documents_context_snapshot ON public.student_documents USING gin (context_snapshot);


--
-- Name: idx_student_documents_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_documents_deleted ON public.student_documents USING btree (is_deleted);


--
-- Name: idx_student_documents_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_documents_enrollment ON public.student_documents USING btree (enrollment_id);


--
-- Name: idx_student_documents_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_documents_lifecycle ON public.student_documents USING btree (lifecycle_id);


--
-- Name: idx_student_documents_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_documents_recycle_bin ON public.student_documents USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_student_enrollment_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollment_class ON public.student_enrollments USING btree (class_category_id);


--
-- Name: idx_student_enrollment_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollment_institution ON public.student_enrollments USING btree (institution_id);


--
-- Name: idx_student_enrollment_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollment_program ON public.student_enrollments USING btree (program_id);


--
-- Name: idx_student_enrollment_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollment_student ON public.student_enrollments USING btree (student_id);


--
-- Name: idx_student_enrollment_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollment_year ON public.student_enrollments USING btree (academic_year_id);


--
-- Name: idx_student_enrollments_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollments_context ON public.student_enrollments USING btree (student_id, institution_id, academic_year_id, is_current);


--
-- Name: idx_student_enrollments_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollments_current ON public.student_enrollments USING btree (is_current);


--
-- Name: idx_student_enrollments_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollments_deleted ON public.student_enrollments USING btree (is_deleted);


--
-- Name: idx_student_enrollments_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollments_lifecycle ON public.student_enrollments USING btree (lifecycle_id);


--
-- Name: idx_student_enrollments_previous; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollments_previous ON public.student_enrollments USING btree (previous_enrollment_id);


--
-- Name: idx_student_enrollments_promotion_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_enrollments_promotion_type ON public.student_enrollments USING btree (promotion_type);


--
-- Name: idx_student_guardian_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_guardian_student ON public.student_guardians USING btree (student_id);


--
-- Name: idx_student_guardian_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_guardian_user ON public.student_guardians USING btree (guardian_user_id);


--
-- Name: idx_student_guardians_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_guardians_deleted ON public.student_guardians USING btree (is_deleted);


--
-- Name: idx_student_period_attendance_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_period_attendance_deleted ON public.student_period_attendance USING btree (is_deleted);


--
-- Name: idx_student_period_attendance_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_period_attendance_enrollment ON public.student_period_attendance USING btree (enrollment_id);


--
-- Name: idx_student_period_attendance_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_period_attendance_lifecycle ON public.student_period_attendance USING btree (lifecycle_id);


--
-- Name: idx_student_period_attendance_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_period_attendance_recycle_bin ON public.student_period_attendance USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_student_practice_exam_answers_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_answers_deleted ON public.student_practice_exam_answers USING btree (is_deleted);


--
-- Name: idx_student_practice_exam_answers_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_answers_enrollment ON public.student_practice_exam_answers USING btree (enrollment_id);


--
-- Name: idx_student_practice_exam_answers_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_answers_lifecycle ON public.student_practice_exam_answers USING btree (lifecycle_id);


--
-- Name: idx_student_practice_exam_attempts_context_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_attempts_context_snapshot ON public.student_practice_exam_attempts USING gin (context_snapshot);


--
-- Name: idx_student_practice_exam_attempts_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_attempts_deleted ON public.student_practice_exam_attempts USING btree (is_deleted);


--
-- Name: idx_student_practice_exam_attempts_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_attempts_enrollment ON public.student_practice_exam_attempts USING btree (enrollment_id);


--
-- Name: idx_student_practice_exam_attempts_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_attempts_lifecycle ON public.student_practice_exam_attempts USING btree (lifecycle_id);


--
-- Name: idx_student_practice_exam_results_context_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_results_context_snapshot ON public.student_practice_exam_results USING gin (context_snapshot);


--
-- Name: idx_student_practice_exam_results_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_results_deleted ON public.student_practice_exam_results USING btree (is_deleted);


--
-- Name: idx_student_practice_exam_results_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_results_enrollment ON public.student_practice_exam_results USING btree (enrollment_id);


--
-- Name: idx_student_practice_exam_results_lifecycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_practice_exam_results_lifecycle ON public.student_practice_exam_results USING btree (lifecycle_id);


--
-- Name: idx_subjects_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_active ON public.subjects USING btree (is_active);


--
-- Name: idx_subjects_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_board ON public.subjects USING btree (board_id);


--
-- Name: idx_subjects_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_category ON public.subjects USING btree (category_id);


--
-- Name: idx_subjects_category_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_category_board ON public.subjects USING btree (category_id, board_id);


--
-- Name: idx_subjects_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_deleted ON public.subjects USING btree (is_deleted);


--
-- Name: idx_subjects_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_recycle_bin ON public.subjects USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_subjects_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_slug ON public.subjects USING btree (slug);


--
-- Name: idx_support_ticket_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_assigned_to ON public.support_tickets USING btree (assigned_to);


--
-- Name: idx_support_ticket_attachments_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_attachments_deleted ON public.support_ticket_attachments USING btree (is_deleted);


--
-- Name: idx_support_ticket_attachments_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_attachments_recycle_bin ON public.support_ticket_attachments USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_support_ticket_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_category ON public.support_tickets USING btree (category);


--
-- Name: idx_support_ticket_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_created_by ON public.support_tickets USING btree (created_by);


--
-- Name: idx_support_ticket_history_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_history_deleted ON public.support_ticket_history USING btree (is_deleted);


--
-- Name: idx_support_ticket_history_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_history_ticket ON public.support_ticket_history USING btree (ticket_id);


--
-- Name: idx_support_ticket_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_institution ON public.support_tickets USING btree (institution_id);


--
-- Name: idx_support_ticket_messages_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_messages_deleted ON public.support_ticket_messages USING btree (is_deleted);


--
-- Name: idx_support_ticket_messages_reply; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_messages_reply ON public.support_ticket_messages USING btree (reply_to_message_id) WHERE (reply_to_message_id IS NOT NULL);


--
-- Name: idx_support_ticket_messages_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_messages_ticket ON public.support_ticket_messages USING btree (ticket_id);


--
-- Name: idx_support_ticket_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_priority ON public.support_tickets USING btree (priority);


--
-- Name: idx_support_ticket_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_status ON public.support_tickets USING btree (status);


--
-- Name: idx_support_tickets_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_deleted ON public.support_tickets USING btree (is_deleted);


--
-- Name: idx_support_tickets_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_recycle_bin ON public.support_tickets USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_syllabi_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabi_institution ON public.syllabi USING btree (institution_id);


--
-- Name: idx_syllabi_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabi_subject ON public.syllabi USING btree (subject_id);


--
-- Name: idx_syllabi_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabi_template ON public.syllabi USING btree (is_template);


--
-- Name: idx_syllabus_closure_ancestor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabus_closure_ancestor ON public.syllabus_node_closure USING btree (ancestor_id);


--
-- Name: idx_syllabus_closure_depth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabus_closure_depth ON public.syllabus_node_closure USING btree (depth);


--
-- Name: idx_syllabus_closure_descendant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabus_closure_descendant ON public.syllabus_node_closure USING btree (descendant_id);


--
-- Name: idx_syllabus_nodes_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabus_nodes_metadata ON public.syllabus_nodes USING gin (metadata);


--
-- Name: idx_syllabus_nodes_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabus_nodes_parent ON public.syllabus_nodes USING btree (parent_id);


--
-- Name: idx_syllabus_nodes_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabus_nodes_sort ON public.syllabus_nodes USING btree (syllabus_id, sort_order);


--
-- Name: idx_syllabus_nodes_syllabus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabus_nodes_syllabus ON public.syllabus_nodes USING btree (syllabus_id);


--
-- Name: idx_syllabus_nodes_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_syllabus_nodes_type ON public.syllabus_nodes USING btree (node_type);


--
-- Name: idx_tcsa_class_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tcsa_class_section ON public.teacher_class_subject_assignments USING btree (institution_class_section_id);


--
-- Name: idx_tcsa_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tcsa_subject ON public.teacher_class_subject_assignments USING btree (subject_id);


--
-- Name: idx_tcsa_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tcsa_teacher ON public.teacher_class_subject_assignments USING btree (teacher_id);


--
-- Name: idx_tcsa_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tcsa_year ON public.teacher_class_subject_assignments USING btree (academic_year_id);


--
-- Name: idx_timetable_entries_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_entries_recycle_bin ON public.timetable_entries USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_tp_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tp_institution ON public.timetable_periods USING btree (institution_id);


--
-- Name: idx_tte_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tte_day ON public.timetable_entries USING btree (day_of_week);


--
-- Name: idx_tte_program_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tte_program_section ON public.timetable_entries USING btree (program_id, section_id);


--
-- Name: idx_tte_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tte_subject ON public.timetable_entries USING btree (subject_id);


--
-- Name: idx_tte_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tte_teacher ON public.timetable_entries USING btree (teacher_id);


--
-- Name: idx_user_teaching_categories_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_teaching_categories_category ON public.user_teaching_categories USING btree (category_id);


--
-- Name: idx_user_teaching_categories_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_teaching_categories_user ON public.user_teaching_categories USING btree (user_id);


--
-- Name: idx_user_teaching_subjects_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_teaching_subjects_subject ON public.user_teaching_subjects USING btree (subject_id);


--
-- Name: idx_user_teaching_subjects_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_teaching_subjects_user ON public.user_teaching_subjects USING btree (user_id);


--
-- Name: idx_users_recycle_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_recycle_bin ON public.users USING btree (is_deleted, deleted_at DESC);


--
-- Name: idx_visitor_activities_tracking_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_activities_tracking_token ON public.visitor_activities USING btree (tracking_token);


--
-- Name: idx_visitor_activities_visited_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_activities_visited_at ON public.visitor_activities USING btree (visited_at);


--
-- Name: institution_memberships_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX institution_memberships_unique_active ON public.institution_memberships USING btree (institution_id, user_id, role_id) WHERE (is_active = true);


--
-- Name: uq_academic_year_session_template; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_academic_year_session_template ON public.academic_years USING btree (institution_id, session_template_id) WHERE (session_template_id IS NOT NULL);


--
-- Name: uq_document_template_field_mappings_global; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_document_template_field_mappings_global ON public.document_template_field_mappings USING btree (template_id, template_field_name) WHERE (institution_id IS NULL);


--
-- Name: uq_document_template_field_mappings_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_document_template_field_mappings_institution ON public.document_template_field_mappings USING btree (template_id, institution_id, template_field_name) WHERE (institution_id IS NOT NULL);


--
-- Name: uq_document_template_fields_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_document_template_fields_name ON public.document_template_fields USING btree (template_id, field_name);


--
-- Name: uq_entity_lifecycle_current; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_entity_lifecycle_current ON public.entity_lifecycle USING btree (entity_type, entity_id, COALESCE(institution_id, '-1'::integer)) WHERE (is_current = true);


--
-- Name: uq_institution_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_institution_facility ON public.institution_facilities USING btree (institution_id, facility_type_id);


--
-- Name: uq_membership_history_current; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_membership_history_current ON public.institution_membership_history USING btree (user_id, institution_id) WHERE (is_current = true);


--
-- Name: uq_student_active_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_student_active_enrollment ON public.student_enrollments USING btree (student_id) WHERE ((status)::text = 'active'::text);


--
-- Name: uq_student_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_student_assignment ON public.student_assignments USING btree (assignment_id, student_id);


--
-- Name: academic_session_templates academic_session_templates_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_session_templates
    ADD CONSTRAINT academic_session_templates_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: academic_years academic_years_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: ai_content_field_settings ai_content_field_settings_content_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_field_settings
    ADD CONSTRAINT ai_content_field_settings_content_type_id_fkey FOREIGN KEY (content_type_id) REFERENCES ai_content_types(id) ON DELETE CASCADE;


--
-- Name: ai_content_types ai_content_types_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_types
    ADD CONSTRAINT ai_content_types_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE;


--
-- Name: ai_providers ai_providers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: ai_providers ai_providers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: app_settings app_settings_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: assignment_templates assignment_templates_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_templates
    ADD CONSTRAINT assignment_templates_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: assignments assignments_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: attendance_sessions attendance_sessions_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;


--
-- Name: attendance_sessions attendance_sessions_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: attendance_sessions attendance_sessions_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: attendance_sessions attendance_sessions_marked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT;


--
-- Name: attendance_sessions attendance_sessions_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_program_id_fkey FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: attendance_sessions attendance_sessions_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;


--
-- Name: boards boards_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: card_categories card_categories_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_categories
    ADD CONSTRAINT card_categories_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: categories categories_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE;


--
-- Name: category_boards category_boards_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_boards
    ADD CONSTRAINT category_boards_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;


--
-- Name: category_boards category_boards_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_boards
    ADD CONSTRAINT category_boards_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;


--
-- Name: category_closure category_closure_ancestor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_closure
    ADD CONSTRAINT category_closure_ancestor_id_fkey FOREIGN KEY (ancestor_id) REFERENCES categories(id) ON DELETE CASCADE;


--
-- Name: category_closure category_closure_descendant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_closure
    ADD CONSTRAINT category_closure_descendant_id_fkey FOREIGN KEY (descendant_id) REFERENCES categories(id) ON DELETE CASCADE;


--
-- Name: class_timetables class_timetables_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_timetables
    ADD CONSTRAINT class_timetables_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: designations designations_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: document_generation_data document_generation_data_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_generation_data
    ADD CONSTRAINT document_generation_data_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: document_generation_data document_generation_data_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_generation_data
    ADD CONSTRAINT document_generation_data_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: document_generation_data document_generation_data_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_generation_data
    ADD CONSTRAINT document_generation_data_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: document_generation_data document_generation_data_generated_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_generation_data
    ADD CONSTRAINT document_generation_data_generated_document_id_fkey FOREIGN KEY (generated_document_id) REFERENCES generated_documents(id) ON DELETE SET NULL;


--
-- Name: document_generation_data document_generation_data_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_generation_data
    ADD CONSTRAINT document_generation_data_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: document_generation_data document_generation_data_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_generation_data
    ADD CONSTRAINT document_generation_data_template_id_fkey FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE RESTRICT;


--
-- Name: document_template_field_mappings document_template_field_mappings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_template_field_mappings
    ADD CONSTRAINT document_template_field_mappings_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: document_template_field_mappings document_template_field_mappings_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_template_field_mappings
    ADD CONSTRAINT document_template_field_mappings_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: document_template_field_mappings document_template_field_mappings_template_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_template_field_mappings
    ADD CONSTRAINT document_template_field_mappings_template_field_id_fkey FOREIGN KEY (template_field_id) REFERENCES document_template_fields(id) ON DELETE CASCADE;


--
-- Name: document_template_field_mappings document_template_field_mappings_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_template_field_mappings
    ADD CONSTRAINT document_template_field_mappings_template_id_fkey FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE CASCADE;


--
-- Name: document_template_field_mappings document_template_field_mappings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_template_field_mappings
    ADD CONSTRAINT document_template_field_mappings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: document_templates document_templates_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: entity_lifecycle entity_lifecycle_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_lifecycle
    ADD CONSTRAINT entity_lifecycle_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: entity_lifecycle entity_lifecycle_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_lifecycle
    ADD CONSTRAINT entity_lifecycle_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE SET NULL;


--
-- Name: entity_lifecycle entity_lifecycle_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_lifecycle
    ADD CONSTRAINT entity_lifecycle_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: facility_types facility_types_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_types
    ADD CONSTRAINT facility_types_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: academic_years fk_academic_year_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT fk_academic_year_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: academic_years fk_academic_year_session_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT fk_academic_year_session_template FOREIGN KEY (session_template_id) REFERENCES academic_session_templates(id) ON DELETE RESTRICT;


--
-- Name: ai_content_field_settings fk_ai_content_field_settings_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_field_settings
    ADD CONSTRAINT fk_ai_content_field_settings_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: ai_content_field_settings fk_ai_content_field_settings_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_field_settings
    ADD CONSTRAINT fk_ai_content_field_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: ai_providers fk_ai_provider_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT fk_ai_provider_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: assignment_syllabus_nodes fk_asn_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_syllabus_nodes
    ADD CONSTRAINT fk_asn_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_syllabus_nodes fk_asn_syllabus_node; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_syllabus_nodes
    ADD CONSTRAINT fk_asn_syllabus_node FOREIGN KEY (syllabus_node_id) REFERENCES syllabus_nodes(id) ON DELETE CASCADE;


--
-- Name: assignments fk_assignment_creator; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT fk_assignment_creator FOREIGN KEY (created_by) REFERENCES users(id);


--
-- Name: assignments fk_assignment_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT fk_assignment_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id);


--
-- Name: assignment_question_options fk_assignment_option_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_question_options
    ADD CONSTRAINT fk_assignment_option_question FOREIGN KEY (question_id) REFERENCES assignment_questions(id) ON DELETE CASCADE;


--
-- Name: assignment_questions fk_assignment_question_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_questions
    ADD CONSTRAINT fk_assignment_question_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;


--
-- Name: assignments fk_assignment_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT fk_assignment_template FOREIGN KEY (template_id) REFERENCES assignment_templates(id) ON DELETE SET NULL;


--
-- Name: assignment_templates fk_assignment_templates_blocked_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_templates
    ADD CONSTRAINT fk_assignment_templates_blocked_by FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: assignments fk_assignment_updater; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT fk_assignment_updater FOREIGN KEY (updated_by) REFERENCES users(id);


--
-- Name: assignment_templates fk_at_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_templates
    ADD CONSTRAINT fk_at_created_by FOREIGN KEY (created_by) REFERENCES users(id);


--
-- Name: assignment_templates fk_at_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_templates
    ADD CONSTRAINT fk_at_institution FOREIGN KEY (source_institution_id) REFERENCES institution_profiles(id) ON DELETE SET NULL;


--
-- Name: assignment_templates fk_at_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_templates
    ADD CONSTRAINT fk_at_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);


--
-- Name: assignment_template_questions fk_atq_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_template_questions
    ADD CONSTRAINT fk_atq_template FOREIGN KEY (template_id) REFERENCES assignment_templates(id) ON DELETE CASCADE;


--
-- Name: assignment_template_question_files fk_atqf_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_template_question_files
    ADD CONSTRAINT fk_atqf_question FOREIGN KEY (question_id) REFERENCES assignment_template_questions(id) ON DELETE CASCADE;


--
-- Name: assignment_template_question_options fk_atqo_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_template_question_options
    ADD CONSTRAINT fk_atqo_question FOREIGN KEY (question_id) REFERENCES assignment_template_questions(id) ON DELETE CASCADE;


--
-- Name: support_ticket_attachments fk_attachment_message; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_attachments
    ADD CONSTRAINT fk_attachment_message FOREIGN KEY (ticket_message_id) REFERENCES support_ticket_messages(id) ON DELETE CASCADE;


--
-- Name: support_ticket_attachments fk_attachment_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_attachments
    ADD CONSTRAINT fk_attachment_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: card_categories fk_card_categories_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_categories
    ADD CONSTRAINT fk_card_categories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: card_categories fk_card_categories_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_categories
    ADD CONSTRAINT fk_card_categories_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: class_timetables fk_ct_class_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_timetables
    ADD CONSTRAINT fk_ct_class_section FOREIGN KEY (institution_class_section_id) REFERENCES institution_class_sections(id) ON DELETE CASCADE;


--
-- Name: class_timetables fk_ct_period; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_timetables
    ADD CONSTRAINT fk_ct_period FOREIGN KEY (period_id) REFERENCES timetable_periods(id) ON DELETE CASCADE;


--
-- Name: class_timetables fk_ct_subject; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_timetables
    ADD CONSTRAINT fk_ct_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;


--
-- Name: class_timetables fk_ct_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_timetables
    ADD CONSTRAINT fk_ct_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: class_timetables fk_ct_year; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_timetables
    ADD CONSTRAINT fk_ct_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;


--
-- Name: document_template_fields fk_document_template_fields_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_template_fields
    ADD CONSTRAINT fk_document_template_fields_template FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE CASCADE;


--
-- Name: document_templates fk_document_templates_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT fk_document_templates_category FOREIGN KEY (card_category_id) REFERENCES card_categories(id) ON DELETE RESTRICT;


--
-- Name: document_templates fk_document_templates_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT fk_document_templates_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: document_templates fk_document_templates_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT fk_document_templates_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: generated_documents fk_generated_documents_generated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT fk_generated_documents_generated_by FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: generated_documents fk_generated_documents_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT fk_generated_documents_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: generated_documents fk_generated_documents_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT fk_generated_documents_template FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE CASCADE;


--
-- Name: help_categories fk_help_category_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_categories
    ADD CONSTRAINT fk_help_category_parent FOREIGN KEY (parent_id) REFERENCES help_categories(id) ON DELETE SET NULL;


--
-- Name: institution_academic_classes fk_iac_academic_year; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_academic_classes
    ADD CONSTRAINT fk_iac_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;


--
-- Name: institution_academic_classes fk_iac_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_academic_classes
    ADD CONSTRAINT fk_iac_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;


--
-- Name: institution_academic_classes fk_iac_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_academic_classes
    ADD CONSTRAINT fk_iac_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_academic_classes fk_iac_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_academic_classes
    ADD CONSTRAINT fk_iac_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_academic_classes fk_iac_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_academic_classes
    ADD CONSTRAINT fk_iac_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_class_sections fk_ics_class; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_class_sections
    ADD CONSTRAINT fk_ics_class FOREIGN KEY (institution_class_id) REFERENCES institution_academic_classes(id) ON DELETE CASCADE;


--
-- Name: institution_class_sections fk_ics_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_class_sections
    ADD CONSTRAINT fk_ics_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;


--
-- Name: institution_class_sections fk_ics_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_class_sections
    ADD CONSTRAINT fk_ics_teacher FOREIGN KEY (class_teacher_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_facilities fk_if_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facilities
    ADD CONSTRAINT fk_if_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_facilities fk_if_facility_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facilities
    ADD CONSTRAINT fk_if_facility_type FOREIGN KEY (facility_type_id) REFERENCES facility_types(id) ON DELETE RESTRICT;


--
-- Name: institution_facilities fk_if_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facilities
    ADD CONSTRAINT fk_if_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_facilities fk_if_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facilities
    ADD CONSTRAINT fk_if_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_facility_media fk_ifm_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facility_media
    ADD CONSTRAINT fk_ifm_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_facility_media fk_ifm_facility; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facility_media
    ADD CONSTRAINT fk_ifm_facility FOREIGN KEY (institution_facility_id) REFERENCES institution_facilities(id) ON DELETE CASCADE;


--
-- Name: institution_facility_media fk_ifm_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facility_media
    ADD CONSTRAINT fk_ifm_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_categories fk_institution_categories_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_categories
    ADD CONSTRAINT fk_institution_categories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;


--
-- Name: institution_categories fk_institution_categories_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_categories
    ADD CONSTRAINT fk_institution_categories_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_profiles fk_institution_current_academic_year; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT fk_institution_current_academic_year FOREIGN KEY (current_academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL;


--
-- Name: institution_cutoffs fk_institution_cutoffs_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_cutoffs
    ADD CONSTRAINT fk_institution_cutoffs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_cutoffs fk_institution_cutoffs_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_cutoffs
    ADD CONSTRAINT fk_institution_cutoffs_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_cutoffs fk_institution_cutoffs_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_cutoffs
    ADD CONSTRAINT fk_institution_cutoffs_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: institution_cutoffs fk_institution_cutoffs_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_cutoffs
    ADD CONSTRAINT fk_institution_cutoffs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_media fk_institution_media_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_media
    ADD CONSTRAINT fk_institution_media_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_media fk_institution_media_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_media
    ADD CONSTRAINT fk_institution_media_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_media fk_institution_media_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_media
    ADD CONSTRAINT fk_institution_media_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_memberships fk_institution_memberships_deleted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_memberships
    ADD CONSTRAINT fk_institution_memberships_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_memberships fk_institution_memberships_previous; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_memberships
    ADD CONSTRAINT fk_institution_memberships_previous FOREIGN KEY (previous_membership_id) REFERENCES institution_memberships(id) ON DELETE SET NULL;


--
-- Name: institution_news fk_institution_news_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_news
    ADD CONSTRAINT fk_institution_news_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_news fk_institution_news_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_news
    ADD CONSTRAINT fk_institution_news_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_news fk_institution_news_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_news
    ADD CONSTRAINT fk_institution_news_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_placements fk_institution_placements_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_placements
    ADD CONSTRAINT fk_institution_placements_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_placements fk_institution_placements_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_placements
    ADD CONSTRAINT fk_institution_placements_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_placements fk_institution_placements_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_placements
    ADD CONSTRAINT fk_institution_placements_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_profiles fk_institution_profiles_board; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT fk_institution_profiles_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE SET NULL;


--
-- Name: institution_profiles fk_institution_profiles_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT fk_institution_profiles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_profiles fk_institution_profiles_location; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT fk_institution_profiles_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;


--
-- Name: institution_profiles fk_institution_profiles_parent_university; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT fk_institution_profiles_parent_university FOREIGN KEY (parent_university_id) REFERENCES institution_profiles(id) ON DELETE SET NULL;


--
-- Name: institution_profiles fk_institution_profiles_subtype; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT fk_institution_profiles_subtype FOREIGN KEY (institution_subtype_id) REFERENCES institution_subtypes(id) ON DELETE SET NULL;


--
-- Name: institution_profiles fk_institution_profiles_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT fk_institution_profiles_type FOREIGN KEY (institution_type_id) REFERENCES institution_types(id) ON DELETE RESTRICT;


--
-- Name: institution_profiles fk_institution_profiles_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT fk_institution_profiles_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_programs fk_institution_programs_board; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT fk_institution_programs_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE SET NULL;


--
-- Name: institution_programs fk_institution_programs_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT fk_institution_programs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_programs fk_institution_programs_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT fk_institution_programs_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_programs fk_institution_programs_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT fk_institution_programs_type FOREIGN KEY (program_type_id) REFERENCES program_types(id) ON DELETE RESTRICT;


--
-- Name: institution_programs fk_institution_programs_university; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT fk_institution_programs_university FOREIGN KEY (university_id) REFERENCES institution_profiles(id) ON DELETE SET NULL;


--
-- Name: institution_programs fk_institution_programs_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT fk_institution_programs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_scholarships fk_institution_scholarships_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_scholarships
    ADD CONSTRAINT fk_institution_scholarships_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_scholarships fk_institution_scholarships_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_scholarships
    ADD CONSTRAINT fk_institution_scholarships_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_scholarships fk_institution_scholarships_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_scholarships
    ADD CONSTRAINT fk_institution_scholarships_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_templates fk_institution_templates_assigned_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_templates
    ADD CONSTRAINT fk_institution_templates_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_templates fk_institution_templates_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_templates
    ADD CONSTRAINT fk_institution_templates_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_templates fk_institution_templates_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_templates
    ADD CONSTRAINT fk_institution_templates_template FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE CASCADE;


--
-- Name: institution_template_defaults fk_itd_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_template_defaults
    ADD CONSTRAINT fk_itd_created_by FOREIGN KEY (created_by) REFERENCES users(id);


--
-- Name: institution_template_defaults fk_itd_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_template_defaults
    ADD CONSTRAINT fk_itd_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_template_defaults fk_itd_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_template_defaults
    ADD CONSTRAINT fk_itd_template FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE CASCADE;


--
-- Name: institution_template_defaults fk_itd_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_template_defaults
    ADD CONSTRAINT fk_itd_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);


--
-- Name: practice_exams fk_pe_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exams
    ADD CONSTRAINT fk_pe_created_by FOREIGN KEY (created_by) REFERENCES users(id);


--
-- Name: practice_exams fk_pe_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exams
    ADD CONSTRAINT fk_pe_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: practice_exams fk_pe_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exams
    ADD CONSTRAINT fk_pe_template FOREIGN KEY (template_id) REFERENCES practice_exam_templates(id) ON DELETE SET NULL;


--
-- Name: practice_exams fk_pe_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exams
    ADD CONSTRAINT fk_pe_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: practice_exam_questions fk_peq_exam; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_questions
    ADD CONSTRAINT fk_peq_exam FOREIGN KEY (practice_exam_id) REFERENCES practice_exams(id) ON DELETE CASCADE;


--
-- Name: practice_exam_question_files fk_peqf_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_question_files
    ADD CONSTRAINT fk_peqf_question FOREIGN KEY (question_id) REFERENCES practice_exam_questions(id) ON DELETE CASCADE;


--
-- Name: practice_exam_question_options fk_peqo_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_question_options
    ADD CONSTRAINT fk_peqo_question FOREIGN KEY (question_id) REFERENCES practice_exam_questions(id) ON DELETE CASCADE;


--
-- Name: practice_exam_syllabus_nodes fk_pesn_exam; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_syllabus_nodes
    ADD CONSTRAINT fk_pesn_exam FOREIGN KEY (practice_exam_id) REFERENCES practice_exams(id) ON DELETE CASCADE;


--
-- Name: practice_exam_syllabus_nodes fk_pesn_node; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_syllabus_nodes
    ADD CONSTRAINT fk_pesn_node FOREIGN KEY (syllabus_node_id) REFERENCES syllabus_nodes(id) ON DELETE CASCADE;


--
-- Name: practice_exam_templates fk_pet_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_templates
    ADD CONSTRAINT fk_pet_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;


--
-- Name: practice_exam_targets fk_pet_exam; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_targets
    ADD CONSTRAINT fk_pet_exam FOREIGN KEY (practice_exam_id) REFERENCES practice_exams(id) ON DELETE CASCADE;


--
-- Name: practice_exam_templates fk_pet_source_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_templates
    ADD CONSTRAINT fk_pet_source_institution FOREIGN KEY (source_institution_id) REFERENCES institution_profiles(id) ON DELETE SET NULL;


--
-- Name: practice_exam_templates fk_pet_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_templates
    ADD CONSTRAINT fk_pet_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: practice_exam_template_questions fk_petq_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_template_questions
    ADD CONSTRAINT fk_petq_template FOREIGN KEY (template_id) REFERENCES practice_exam_templates(id) ON DELETE CASCADE;


--
-- Name: practice_exam_template_question_files fk_petqf_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_template_question_files
    ADD CONSTRAINT fk_petqf_question FOREIGN KEY (question_id) REFERENCES practice_exam_template_questions(id) ON DELETE CASCADE;


--
-- Name: practice_exam_template_question_options fk_petqo_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_template_question_options
    ADD CONSTRAINT fk_petqo_question FOREIGN KEY (question_id) REFERENCES practice_exam_template_questions(id) ON DELETE CASCADE;


--
-- Name: practice_exam_templates fk_practice_exam_templates_blocked_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_templates
    ADD CONSTRAINT fk_practice_exam_templates_blocked_by FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_programs fk_program_academic_year; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT fk_program_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT;


--
-- Name: program_categories fk_program_categories_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_categories
    ADD CONSTRAINT fk_program_categories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;


--
-- Name: program_categories fk_program_categories_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_categories
    ADD CONSTRAINT fk_program_categories_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: institution_programs fk_program_class_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT fk_program_class_teacher FOREIGN KEY (class_teacher_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: program_fee_components fk_program_fee_components_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_fee_components
    ADD CONSTRAINT fk_program_fee_components_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: program_fee_components fk_program_fee_components_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_fee_components
    ADD CONSTRAINT fk_program_fee_components_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: program_fee_components fk_program_fee_components_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_fee_components
    ADD CONSTRAINT fk_program_fee_components_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: program_languages fk_program_languages_language; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_languages
    ADD CONSTRAINT fk_program_languages_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE;


--
-- Name: program_languages fk_program_languages_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_languages
    ADD CONSTRAINT fk_program_languages_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: program_media fk_program_media_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_media
    ADD CONSTRAINT fk_program_media_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: program_media fk_program_media_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_media
    ADD CONSTRAINT fk_program_media_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: program_media fk_program_media_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_media
    ADD CONSTRAINT fk_program_media_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: program_section_class_teachers fk_psct_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_section_class_teachers
    ADD CONSTRAINT fk_psct_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: program_section_class_teachers fk_psct_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_section_class_teachers
    ADD CONSTRAINT fk_psct_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;


--
-- Name: program_section_class_teachers fk_psct_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_section_class_teachers
    ADD CONSTRAINT fk_psct_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: program_section_class_teachers fk_psct_year; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_section_class_teachers
    ADD CONSTRAINT fk_psct_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;


--
-- Name: program_subject_teachers fk_pst_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subject_teachers
    ADD CONSTRAINT fk_pst_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: program_subject_teachers fk_pst_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subject_teachers
    ADD CONSTRAINT fk_pst_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;


--
-- Name: program_subject_teachers fk_pst_subject; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subject_teachers
    ADD CONSTRAINT fk_pst_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;


--
-- Name: program_subject_teachers fk_pst_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subject_teachers
    ADD CONSTRAINT fk_pst_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: program_subject_teachers fk_pst_year; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subject_teachers
    ADD CONSTRAINT fk_pst_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;


--
-- Name: student_assignments fk_sa_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignments
    ADD CONSTRAINT fk_sa_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;


--
-- Name: student_assignments fk_sa_checker; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignments
    ADD CONSTRAINT fk_sa_checker FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_assignments fk_sa_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignments
    ADD CONSTRAINT fk_sa_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;


--
-- Name: student_assignment_answers fk_saa_option; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_answers
    ADD CONSTRAINT fk_saa_option FOREIGN KEY (selected_option_id) REFERENCES assignment_question_options(id) ON DELETE SET NULL;


--
-- Name: student_assignment_answers fk_saa_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_answers
    ADD CONSTRAINT fk_saa_question FOREIGN KEY (question_id) REFERENCES assignment_questions(id) ON DELETE CASCADE;


--
-- Name: student_assignment_answers fk_saa_student_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_answers
    ADD CONSTRAINT fk_saa_student_assignment FOREIGN KEY (student_assignment_id) REFERENCES student_assignments(id) ON DELETE CASCADE;


--
-- Name: student_assignment_submission_files fk_sasf_answer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_submission_files
    ADD CONSTRAINT fk_sasf_answer FOREIGN KEY (answer_id) REFERENCES student_assignment_answers(id) ON DELETE CASCADE;


--
-- Name: student_practice_exam_answers fk_spea_attempt; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_answers
    ADD CONSTRAINT fk_spea_attempt FOREIGN KEY (attempt_id) REFERENCES student_practice_exam_attempts(id) ON DELETE CASCADE;


--
-- Name: student_practice_exam_attempts fk_spea_exam; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_attempts
    ADD CONSTRAINT fk_spea_exam FOREIGN KEY (practice_exam_id) REFERENCES practice_exams(id) ON DELETE CASCADE;


--
-- Name: student_practice_exam_answers fk_spea_option; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_answers
    ADD CONSTRAINT fk_spea_option FOREIGN KEY (selected_option_id) REFERENCES practice_exam_question_options(id) ON DELETE SET NULL;


--
-- Name: student_practice_exam_answers fk_spea_question; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_answers
    ADD CONSTRAINT fk_spea_question FOREIGN KEY (question_id) REFERENCES practice_exam_questions(id) ON DELETE CASCADE;


--
-- Name: student_practice_exam_attempts fk_spea_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_attempts
    ADD CONSTRAINT fk_spea_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;


--
-- Name: student_practice_exam_results fk_sper_attempt; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_results
    ADD CONSTRAINT fk_sper_attempt FOREIGN KEY (attempt_id) REFERENCES student_practice_exam_attempts(id) ON DELETE CASCADE;


--
-- Name: student_practice_exam_results fk_sper_exam; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_results
    ADD CONSTRAINT fk_sper_exam FOREIGN KEY (practice_exam_id) REFERENCES practice_exams(id) ON DELETE CASCADE;


--
-- Name: student_practice_exam_results fk_sper_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_results
    ADD CONSTRAINT fk_sper_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;


--
-- Name: student_achievements fk_student_achievements_document_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT fk_student_achievements_document_template FOREIGN KEY (document_template_id) REFERENCES document_templates(id) ON DELETE SET NULL;


--
-- Name: student_documents fk_student_document_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT fk_student_document_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;


--
-- Name: student_documents fk_student_document_verified_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT fk_student_document_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_enrollments fk_student_enrollment_class; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT fk_student_enrollment_class FOREIGN KEY (class_category_id) REFERENCES categories(id) ON DELETE RESTRICT;


--
-- Name: student_enrollments fk_student_enrollment_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT fk_student_enrollment_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_enrollments fk_student_enrollment_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT fk_student_enrollment_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: student_enrollments fk_student_enrollment_previous; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT fk_student_enrollment_previous FOREIGN KEY (previous_enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: student_enrollments fk_student_enrollment_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT fk_student_enrollment_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE SET NULL;


--
-- Name: student_enrollments fk_student_enrollment_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT fk_student_enrollment_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;


--
-- Name: student_enrollments fk_student_enrollment_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT fk_student_enrollment_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;


--
-- Name: student_enrollments fk_student_enrollment_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT fk_student_enrollment_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_enrollments fk_student_enrollment_year; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT fk_student_enrollment_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT;


--
-- Name: student_guardians fk_student_guardian_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT fk_student_guardian_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;


--
-- Name: student_guardians fk_student_guardian_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT fk_student_guardian_user FOREIGN KEY (guardian_user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: student_profiles fk_student_profile_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT fk_student_profile_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_profiles fk_student_profile_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT fk_student_profile_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_profiles fk_student_profile_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT fk_student_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: support_tickets fk_support_ticket_assigned_to; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_support_ticket_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: support_tickets fk_support_ticket_closed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_support_ticket_closed_by FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: support_tickets fk_support_ticket_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_support_ticket_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: support_tickets fk_support_ticket_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_support_ticket_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE SET NULL;


--
-- Name: support_ticket_messages fk_support_ticket_message_reply; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT fk_support_ticket_message_reply FOREIGN KEY (reply_to_message_id) REFERENCES support_ticket_messages(id) ON DELETE SET NULL;


--
-- Name: support_tickets fk_support_ticket_resolved_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_support_ticket_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: syllabi fk_syllabi_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabi
    ADD CONSTRAINT fk_syllabi_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: syllabi fk_syllabi_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabi
    ADD CONSTRAINT fk_syllabi_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: syllabi fk_syllabi_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabi
    ADD CONSTRAINT fk_syllabi_parent FOREIGN KEY (parent_syllabus_id) REFERENCES syllabi(id) ON DELETE SET NULL;


--
-- Name: syllabi fk_syllabi_subject; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabi
    ADD CONSTRAINT fk_syllabi_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;


--
-- Name: syllabi fk_syllabi_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabi
    ADD CONSTRAINT fk_syllabi_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: syllabus_node_closure fk_syllabus_closure_ancestor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_node_closure
    ADD CONSTRAINT fk_syllabus_closure_ancestor FOREIGN KEY (ancestor_id) REFERENCES syllabus_nodes(id) ON DELETE CASCADE;


--
-- Name: syllabus_node_closure fk_syllabus_closure_descendant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_node_closure
    ADD CONSTRAINT fk_syllabus_closure_descendant FOREIGN KEY (descendant_id) REFERENCES syllabus_nodes(id) ON DELETE CASCADE;


--
-- Name: syllabus_inheritance_logs fk_syllabus_inherit_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_inheritance_logs
    ADD CONSTRAINT fk_syllabus_inherit_institution FOREIGN KEY (institution_syllabus_id) REFERENCES syllabi(id) ON DELETE CASCADE;


--
-- Name: syllabus_inheritance_logs fk_syllabus_inherit_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_inheritance_logs
    ADD CONSTRAINT fk_syllabus_inherit_template FOREIGN KEY (template_syllabus_id) REFERENCES syllabi(id) ON DELETE CASCADE;


--
-- Name: syllabus_inheritance_logs fk_syllabus_inherit_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_inheritance_logs
    ADD CONSTRAINT fk_syllabus_inherit_user FOREIGN KEY (inherited_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: syllabus_nodes fk_syllabus_nodes_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_nodes
    ADD CONSTRAINT fk_syllabus_nodes_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: syllabus_nodes fk_syllabus_nodes_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_nodes
    ADD CONSTRAINT fk_syllabus_nodes_parent FOREIGN KEY (parent_id) REFERENCES syllabus_nodes(id) ON DELETE CASCADE;


--
-- Name: syllabus_nodes fk_syllabus_nodes_syllabus; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_nodes
    ADD CONSTRAINT fk_syllabus_nodes_syllabus FOREIGN KEY (syllabus_id) REFERENCES syllabi(id) ON DELETE CASCADE;


--
-- Name: syllabus_nodes fk_syllabus_nodes_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_nodes
    ADD CONSTRAINT fk_syllabus_nodes_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: assignment_targets fk_target_assignment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_targets
    ADD CONSTRAINT fk_target_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;


--
-- Name: teacher_class_subject_assignments fk_tcsa_class_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_subject_assignments
    ADD CONSTRAINT fk_tcsa_class_section FOREIGN KEY (institution_class_section_id) REFERENCES institution_class_sections(id) ON DELETE CASCADE;


--
-- Name: teacher_class_subject_assignments fk_tcsa_subject; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_subject_assignments
    ADD CONSTRAINT fk_tcsa_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;


--
-- Name: teacher_class_subject_assignments fk_tcsa_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_subject_assignments
    ADD CONSTRAINT fk_tcsa_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: teacher_class_subject_assignments fk_tcsa_year; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_subject_assignments
    ADD CONSTRAINT fk_tcsa_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;


--
-- Name: support_ticket_history fk_ticket_history_ticket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_history
    ADD CONSTRAINT fk_ticket_history_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_ticket_history fk_ticket_history_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_history
    ADD CONSTRAINT fk_ticket_history_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: support_ticket_messages fk_ticket_message_ticket; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT fk_ticket_message_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_ticket_messages fk_ticket_message_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT fk_ticket_message_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: timetable_periods fk_tp_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_periods
    ADD CONSTRAINT fk_tp_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: timetable_entries fk_tte_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT fk_tte_program FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: timetable_entries fk_tte_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT fk_tte_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;


--
-- Name: timetable_entries fk_tte_slot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT fk_tte_slot FOREIGN KEY (slot_id) REFERENCES timetable_slots(id) ON DELETE CASCADE;


--
-- Name: timetable_entries fk_tte_subject; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT fk_tte_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;


--
-- Name: timetable_entries fk_tte_teacher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT fk_tte_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: timetable_entries fk_tte_year; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT fk_tte_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;


--
-- Name: timetable_slots fk_tts_institution; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT fk_tts_institution FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: generated_documents generated_documents_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT generated_documents_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: generated_documents generated_documents_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT generated_documents_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: generated_documents generated_documents_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT generated_documents_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: help_article_assets help_article_assets_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_assets
    ADD CONSTRAINT help_article_assets_article_id_fkey FOREIGN KEY (article_id) REFERENCES help_articles(id) ON DELETE CASCADE;


--
-- Name: help_article_faqs help_article_faqs_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_faqs
    ADD CONSTRAINT help_article_faqs_article_id_fkey FOREIGN KEY (article_id) REFERENCES help_articles(id) ON DELETE CASCADE;


--
-- Name: help_article_permissions help_article_permissions_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_permissions
    ADD CONSTRAINT help_article_permissions_article_id_fkey FOREIGN KEY (article_id) REFERENCES help_articles(id) ON DELETE CASCADE;


--
-- Name: help_article_permissions help_article_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_permissions
    ADD CONSTRAINT help_article_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;


--
-- Name: help_article_relations help_article_relations_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_relations
    ADD CONSTRAINT help_article_relations_article_id_fkey FOREIGN KEY (article_id) REFERENCES help_articles(id) ON DELETE CASCADE;


--
-- Name: help_article_relations help_article_relations_related_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_relations
    ADD CONSTRAINT help_article_relations_related_article_id_fkey FOREIGN KEY (related_article_id) REFERENCES help_articles(id) ON DELETE CASCADE;


--
-- Name: help_article_views help_article_views_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_views
    ADD CONSTRAINT help_article_views_article_id_fkey FOREIGN KEY (article_id) REFERENCES help_articles(id) ON DELETE CASCADE;


--
-- Name: help_article_views help_article_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_article_views
    ADD CONSTRAINT help_article_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);


--
-- Name: help_articles help_articles_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_category_id_fkey FOREIGN KEY (category_id) REFERENCES help_categories(id) ON DELETE CASCADE;


--
-- Name: help_articles help_articles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);


--
-- Name: help_articles help_articles_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: help_articles help_articles_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id);


--
-- Name: help_categories help_categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_categories
    ADD CONSTRAINT help_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);


--
-- Name: help_categories help_categories_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_categories
    ADD CONSTRAINT help_categories_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: help_categories help_categories_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_categories
    ADD CONSTRAINT help_categories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id);


--
-- Name: help_recent_updates help_recent_updates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_recent_updates
    ADD CONSTRAINT help_recent_updates_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);


--
-- Name: help_recent_updates help_recent_updates_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_recent_updates
    ADD CONSTRAINT help_recent_updates_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: help_recent_updates help_recent_updates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_recent_updates
    ADD CONSTRAINT help_recent_updates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id);


--
-- Name: help_search_logs help_search_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_search_logs
    ADD CONSTRAINT help_search_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);


--
-- Name: institution_academic_classes institution_academic_classes_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_academic_classes
    ADD CONSTRAINT institution_academic_classes_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_calendar_events institution_calendar_events_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_calendar_events
    ADD CONSTRAINT institution_calendar_events_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_class_sections institution_class_sections_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_class_sections
    ADD CONSTRAINT institution_class_sections_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_cutoffs institution_cutoffs_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_cutoffs
    ADD CONSTRAINT institution_cutoffs_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_facilities institution_facilities_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_facilities
    ADD CONSTRAINT institution_facilities_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_media institution_media_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_media
    ADD CONSTRAINT institution_media_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_membership_history institution_membership_histor_previous_membership_history__fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_membership_history
    ADD CONSTRAINT institution_membership_histor_previous_membership_history__fkey FOREIGN KEY (previous_membership_history_id) REFERENCES institution_membership_history(id) ON DELETE SET NULL;


--
-- Name: institution_membership_history institution_membership_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_membership_history
    ADD CONSTRAINT institution_membership_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_membership_history institution_membership_history_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_membership_history
    ADD CONSTRAINT institution_membership_history_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_membership_history institution_membership_history_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_membership_history
    ADD CONSTRAINT institution_membership_history_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES institution_memberships(id) ON DELETE SET NULL;


--
-- Name: institution_membership_history institution_membership_history_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_membership_history
    ADD CONSTRAINT institution_membership_history_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;


--
-- Name: institution_membership_history institution_membership_history_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_membership_history
    ADD CONSTRAINT institution_membership_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_membership_history institution_membership_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_membership_history
    ADD CONSTRAINT institution_membership_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: institution_memberships institution_memberships_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_memberships
    ADD CONSTRAINT institution_memberships_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_memberships institution_memberships_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_memberships
    ADD CONSTRAINT institution_memberships_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;


--
-- Name: institution_memberships institution_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_memberships
    ADD CONSTRAINT institution_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: institution_news institution_news_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_news
    ADD CONSTRAINT institution_news_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_notification_settings institution_notification_settings_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_notification_settings
    ADD CONSTRAINT institution_notification_settings_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_placements institution_placements_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_placements
    ADD CONSTRAINT institution_placements_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_profiles institution_profiles_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_profiles
    ADD CONSTRAINT institution_profiles_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_programs institution_programs_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_programs
    ADD CONSTRAINT institution_programs_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_role_permission_denials institution_role_permission_denials_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_role_permission_denials
    ADD CONSTRAINT institution_role_permission_denials_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_role_permission_denials institution_role_permission_denials_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_role_permission_denials
    ADD CONSTRAINT institution_role_permission_denials_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;


--
-- Name: institution_role_permission_denials institution_role_permission_denials_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_role_permission_denials
    ADD CONSTRAINT institution_role_permission_denials_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;


--
-- Name: institution_role_permissions institution_role_permissions_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_role_permissions
    ADD CONSTRAINT institution_role_permissions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_role_permissions institution_role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_role_permissions
    ADD CONSTRAINT institution_role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;


--
-- Name: institution_role_permissions institution_role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_role_permissions
    ADD CONSTRAINT institution_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;


--
-- Name: institution_scholarships institution_scholarships_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_scholarships
    ADD CONSTRAINT institution_scholarships_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_subtypes institution_subtypes_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_subtypes
    ADD CONSTRAINT institution_subtypes_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_types institution_types_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_types
    ADD CONSTRAINT institution_types_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: institution_user_permissions institution_user_permissions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_user_permissions
    ADD CONSTRAINT institution_user_permissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);


--
-- Name: institution_user_permissions institution_user_permissions_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_user_permissions
    ADD CONSTRAINT institution_user_permissions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE;


--
-- Name: institution_user_permissions institution_user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_user_permissions
    ADD CONSTRAINT institution_user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;


--
-- Name: institution_user_permissions institution_user_permissions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_user_permissions
    ADD CONSTRAINT institution_user_permissions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id);


--
-- Name: institution_user_permissions institution_user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_user_permissions
    ADD CONSTRAINT institution_user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: languages languages_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: locations locations_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: locations locations_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_parent_fk FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: notification_recipients notification_recipients_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE;


--
-- Name: notification_recipients notification_recipients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: notification_templates notification_templates_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: permissions permissions_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: practice_exam_templates practice_exam_templates_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exam_templates
    ADD CONSTRAINT practice_exam_templates_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: practice_exams practice_exams_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_exams
    ADD CONSTRAINT practice_exams_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: program_sections program_sections_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_sections
    ADD CONSTRAINT program_sections_program_id_fkey FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: program_sections program_sections_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_sections
    ADD CONSTRAINT program_sections_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;


--
-- Name: program_subjects program_subjects_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subjects
    ADD CONSTRAINT program_subjects_program_id_fkey FOREIGN KEY (program_id) REFERENCES institution_programs(id) ON DELETE CASCADE;


--
-- Name: program_subjects program_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_subjects
    ADD CONSTRAINT program_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;


--
-- Name: program_types program_types_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_types
    ADD CONSTRAINT program_types_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;


--
-- Name: roles roles_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: roles roles_scope_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_scope_fk FOREIGN KEY (scope_id) REFERENCES scope_types(id) ON DELETE RESTRICT;


--
-- Name: roles roles_scope_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES scope_types(id);


--
-- Name: scope_types scope_types_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scope_types
    ADD CONSTRAINT scope_types_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: sections sections_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: skills skills_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_achievements student_achievements_card_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_card_category_id_fkey FOREIGN KEY (card_category_id) REFERENCES card_categories(id) ON DELETE RESTRICT;


--
-- Name: student_achievements student_achievements_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_achievements student_achievements_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: student_achievements student_achievements_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_achievements
    ADD CONSTRAINT student_achievements_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: student_assignment_answers student_assignment_answers_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_answers
    ADD CONSTRAINT student_assignment_answers_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_assignment_answers student_assignment_answers_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_answers
    ADD CONSTRAINT student_assignment_answers_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: student_assignment_answers student_assignment_answers_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_answers
    ADD CONSTRAINT student_assignment_answers_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: student_assignment_submission_files student_assignment_submission_files_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignment_submission_files
    ADD CONSTRAINT student_assignment_submission_files_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_assignments student_assignments_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignments
    ADD CONSTRAINT student_assignments_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: student_assignments student_assignments_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_assignments
    ADD CONSTRAINT student_assignments_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: student_attendance student_attendance_attendance_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_attendance_session_id_fkey FOREIGN KEY (attendance_session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE;


--
-- Name: student_attendance student_attendance_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_attendance student_attendance_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: student_attendance student_attendance_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: student_attendance student_attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;


--
-- Name: student_documents student_documents_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_documents student_documents_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: student_documents student_documents_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: student_enrollments student_enrollments_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_enrollments student_enrollments_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: student_enrollments student_enrollments_promoted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_promoted_by_fkey FOREIGN KEY (promoted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_period_attendance student_period_attendance_attendance_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_period_attendance
    ADD CONSTRAINT student_period_attendance_attendance_session_id_fkey FOREIGN KEY (attendance_session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE;


--
-- Name: student_period_attendance student_period_attendance_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_period_attendance
    ADD CONSTRAINT student_period_attendance_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_period_attendance student_period_attendance_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_period_attendance
    ADD CONSTRAINT student_period_attendance_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: student_period_attendance student_period_attendance_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_period_attendance
    ADD CONSTRAINT student_period_attendance_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: student_period_attendance student_period_attendance_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_period_attendance
    ADD CONSTRAINT student_period_attendance_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES timetable_slots(id) ON DELETE CASCADE;


--
-- Name: student_period_attendance student_period_attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_period_attendance
    ADD CONSTRAINT student_period_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE;


--
-- Name: student_practice_exam_answers student_practice_exam_answers_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_answers
    ADD CONSTRAINT student_practice_exam_answers_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: student_practice_exam_answers student_practice_exam_answers_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_answers
    ADD CONSTRAINT student_practice_exam_answers_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: student_practice_exam_answers student_practice_exam_answers_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_answers
    ADD CONSTRAINT student_practice_exam_answers_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: student_practice_exam_attempts student_practice_exam_attempts_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_attempts
    ADD CONSTRAINT student_practice_exam_attempts_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: student_practice_exam_attempts student_practice_exam_attempts_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_attempts
    ADD CONSTRAINT student_practice_exam_attempts_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: student_practice_exam_results student_practice_exam_results_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_results
    ADD CONSTRAINT student_practice_exam_results_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL;


--
-- Name: student_practice_exam_results student_practice_exam_results_lifecycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_practice_exam_results
    ADD CONSTRAINT student_practice_exam_results_lifecycle_id_fkey FOREIGN KEY (lifecycle_id) REFERENCES entity_lifecycle(id) ON DELETE SET NULL;


--
-- Name: subjects subjects_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: support_ticket_attachments support_ticket_attachments_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_attachments
    ADD CONSTRAINT support_ticket_attachments_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: support_ticket_history support_ticket_history_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_history
    ADD CONSTRAINT support_ticket_history_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: support_ticket_messages support_ticket_messages_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: timetable_entries timetable_entries_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: user_certifications user_certifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_certifications
    ADD CONSTRAINT user_certifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: user_education user_education_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_education
    ADD CONSTRAINT user_education_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: user_experience user_experience_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_experience
    ADD CONSTRAINT user_experience_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: user_locations user_locations_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations
    ADD CONSTRAINT user_locations_area_id_fkey FOREIGN KEY (area_id) REFERENCES locations(id) ON DELETE SET NULL;


--
-- Name: user_locations user_locations_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations
    ADD CONSTRAINT user_locations_city_id_fkey FOREIGN KEY (city_id) REFERENCES locations(id) ON DELETE SET NULL;


--
-- Name: user_locations user_locations_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations
    ADD CONSTRAINT user_locations_country_id_fkey FOREIGN KEY (country_id) REFERENCES locations(id) ON DELETE SET NULL;


--
-- Name: user_locations user_locations_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations
    ADD CONSTRAINT user_locations_state_id_fkey FOREIGN KEY (state_id) REFERENCES locations(id) ON DELETE SET NULL;


--
-- Name: user_locations user_locations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_locations
    ADD CONSTRAINT user_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_designation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_designation_id_fkey FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL;


--
-- Name: user_profiles user_profiles_under_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_under_institution_id_fkey FOREIGN KEY (under_institution_id) REFERENCES institution_profiles(id) ON DELETE SET NULL;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_fk FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: user_teaching_categories user_teaching_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_teaching_categories
    ADD CONSTRAINT user_teaching_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;


--
-- Name: user_teaching_categories user_teaching_categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_teaching_categories
    ADD CONSTRAINT user_teaching_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: user_teaching_subjects user_teaching_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_teaching_subjects
    ADD CONSTRAINT user_teaching_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;


--
-- Name: user_teaching_subjects user_teaching_subjects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_teaching_subjects
    ADD CONSTRAINT user_teaching_subjects_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


--
-- Name: users users_created_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: users users_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- Name: users users_updated_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict FoW9cAIsoiUtuCowj7TaFdkjni9SLKbfyFSCQOnPD2wo8bFAV2S1PzAb5jfthFb

