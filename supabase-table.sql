CREATE TABLE public.academic_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  academic_year text NOT NULL,
  semester text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT academic_terms_pkey PRIMARY KEY (id),
  CONSTRAINT academic_terms_academic_year_semester_key UNIQUE (academic_year, semester)
);

CREATE VIEW public.active_warnings_summary AS 
SELECT s.student_id,
       s.name AS student_name,
       count(*) FILTER (WHERE wr.status = 'active' AND r.severity = 'high') AS high_severity_count,
       count(*) FILTER (WHERE wr.status = 'active' AND r.severity = 'medium') AS medium_severity_count,
       count(*) FILTER (WHERE wr.status = 'active' AND r.severity = 'low') AS low_severity_count,
       max(wr.created_at) FILTER (WHERE wr.status = 'active') AS latest_warning_date
FROM students s
LEFT JOIN warning_records wr ON s.student_id = wr.student_id
LEFT JOIN warning_rules r ON wr.rule_id = r.id
GROUP BY s.student_id, s.name;

CREATE TABLE public.class_info (
  class_name text NOT NULL,
  grade_level text NOT NULL,
  academic_year text NOT NULL,
  homeroom_teacher text NULL,
  student_count integer NULL,
  department text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT class_info_pkey PRIMARY KEY (class_name)
);

CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  grade text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_name_grade_key UNIQUE (name, grade)
);

CREATE TABLE public.course_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_code text NOT NULL,
  class_name text NOT NULL,
  teacher_id uuid NULL,
  term_id uuid NULL,
  schedule jsonb NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT course_classes_pkey PRIMARY KEY (id),
  CONSTRAINT course_classes_subject_code_class_name_term_id_key UNIQUE (subject_code, class_name, term_id),
  CONSTRAINT course_classes_class_name_fkey FOREIGN KEY (class_name) REFERENCES class_info(class_name),
  CONSTRAINT course_classes_subject_code_fkey FOREIGN KEY (subject_code) REFERENCES subjects(subject_code),
  CONSTRAINT course_classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  CONSTRAINT course_classes_term_id_fkey FOREIGN KEY (term_id) REFERENCES academic_terms(id)
);

CREATE TABLE public.grades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject text NOT NULL,
  score numeric NOT NULL,
  exam_date date NULL,
  exam_type text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  exam_title text NULL,
  CONSTRAINT grades_pkey PRIMARY KEY (id),
  CONSTRAINT grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE public.grading_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL,
  name text NOT NULL,
  description text NULL,
  weight numeric NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grading_criteria_pkey PRIMARY KEY (id),
  CONSTRAINT grading_criteria_homework_id_fkey FOREIGN KEY (homework_id) REFERENCES homework(id)
);

CREATE TABLE public.grading_scale_levels (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  scale_id uuid NULL,
  name text NOT NULL,
  min_score integer NOT NULL,
  max_score integer NOT NULL,
  color text NULL,
  description text NULL,
  position integer NOT NULL,
  CONSTRAINT grading_scale_levels_pkey PRIMARY KEY (id),
  CONSTRAINT grading_scale_levels_scale_id_fkey FOREIGN KEY (scale_id) REFERENCES grading_scales(id) ON DELETE CASCADE
);

CREATE TABLE public.grading_scales (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  is_default boolean NULL DEFAULT false,
  description text NULL,
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT grading_scales_pkey PRIMARY KEY (id),
  CONSTRAINT grading_scales_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.help_content (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id text NOT NULL,
  title text NOT NULL,
  description text NULL,
  content text NULL,
  video_url text NULL,
  order_index integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT help_content_pkey PRIMARY KEY (id),
  CONSTRAINT help_content_section_id_key UNIQUE (section_id)
);

CREATE TABLE public.homework (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NULL,
  due_date date NULL,
  class_id uuid NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  grading_scale_id uuid NULL,
  CONSTRAINT homework_pkey PRIMARY KEY (id),
  CONSTRAINT homework_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT homework_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT homework_grading_scale_id_fkey FOREIGN KEY (grading_scale_id) REFERENCES grading_scales(id)
);

CREATE TABLE public.homework_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL,
  student_id uuid NOT NULL,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  files jsonb NULL,
  status text NOT NULL DEFAULT 'submitted',
  score numeric NULL,
  grade text NULL,
  feedback text NULL,
  ai_analysis jsonb NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  teacher_feedback text NULL,
  knowledge_points_assessed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT homework_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT homework_submissions_homework_id_fkey FOREIGN KEY (homework_id) REFERENCES homework(id),
  CONSTRAINT homework_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE public.knowledge_point_thresholds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  level text NOT NULL,
  threshold integer NOT NULL,
  color text NOT NULL,
  position integer NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT knowledge_point_thresholds_pkey PRIMARY KEY (id),
  CONSTRAINT knowledge_point_thresholds_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.knowledge_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL,
  name text NOT NULL,
  description text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_points_pkey PRIMARY KEY (id),
  CONSTRAINT knowledge_points_homework_id_fkey FOREIGN KEY (homework_id) REFERENCES homework(id)
);

CREATE TABLE public.learning_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  knowledge_point_id uuid NOT NULL,
  mastery_level integer NULL,
  last_reviewed timestamp with time zone NULL,
  next_review timestamp with time zone NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT learning_progress_pkey PRIMARY KEY (id),
  CONSTRAINT learning_progress_student_id_knowledge_point_id_key UNIQUE (student_id, knowledge_point_id),
  CONSTRAINT learning_progress_knowledge_point_id_fkey FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id),
  CONSTRAINT learning_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(student_id),
  CONSTRAINT learning_progress_mastery_level_check CHECK (mastery_level >= 0 AND mastery_level <= 5)
);

CREATE TABLE public.learning_resources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NULL,
  resource_type text NOT NULL,
  url text NULL,
  file_path text NULL,
  subject_code text NULL,
  knowledge_point_id uuid NULL,
  creator_id uuid NULL,
  is_public boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT learning_resources_pkey PRIMARY KEY (id),
  CONSTRAINT learning_resources_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES auth.users(id),
  CONSTRAINT learning_resources_knowledge_point_id_fkey FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id),
  CONSTRAINT learning_resources_subject_code_fkey FOREIGN KEY (subject_code) REFERENCES subjects(subject_code),
  CONSTRAINT learning_resources_resource_type_check CHECK (resource_type = ANY (ARRAY['document', 'video', 'audio', 'link', 'other']))
);

CREATE TABLE public.migrations_log (
  id serial NOT NULL,
  name text NOT NULL,
  executed_at timestamp with time zone NULL DEFAULT now(),
  description text NULL,
  status text NULL DEFAULT 'success',
  CONSTRAINT migrations_log_pkey PRIMARY KEY (id),
  CONSTRAINT migrations_log_name_key UNIQUE (name)
);

CREATE TABLE public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  homework_due boolean NULL DEFAULT true,
  grade_posted boolean NULL DEFAULT true,
  system_announcement boolean NULL DEFAULT true,
  message_received boolean NULL DEFAULT true,
  email_notifications boolean NULL DEFAULT false,
  push_notifications boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT notification_settings_pkey PRIMARY KEY (id),
  CONSTRAINT notification_settings_user_id_key UNIQUE (user_id),
  CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.onboarding_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_step text NULL,
  completed_steps text[] NULL,
  is_completed boolean NULL DEFAULT false,
  first_login timestamp with time zone NULL,
  completed_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT onboarding_status_pkey PRIMARY KEY (id),
  CONSTRAINT onboarding_status_user_id_key UNIQUE (user_id),
  CONSTRAINT onboarding_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.student_knowledge_mastery (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL,
  knowledge_point_id uuid NOT NULL,
  homework_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  mastery_level integer NOT NULL DEFAULT 0,
  mastery_grade text NOT NULL DEFAULT 'C',
  assessment_count integer NOT NULL DEFAULT 1,
  comments text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT student_knowledge_mastery_pkey PRIMARY KEY (id),
  CONSTRAINT student_knowledge_mastery_student_id_knowledge_point_id_hom_key UNIQUE (student_id, knowledge_point_id, homework_id),
  CONSTRAINT student_knowledge_mastery_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES homework_submissions(id),
  CONSTRAINT student_knowledge_mastery_knowledge_point_id_fkey FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id),
  CONSTRAINT student_knowledge_mastery_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT student_knowledge_mastery_homework_id_fkey FOREIGN KEY (homework_id) REFERENCES homework(id),
  CONSTRAINT student_knowledge_mastery_mastery_level_check CHECK (mastery_level >= 0 AND mastery_level <= 100),
  CONSTRAINT student_knowledge_mastery_mastery_grade_check CHECK (mastery_grade = ANY (ARRAY['A', 'B', 'C', 'D', 'E']))
);

CREATE TABLE public.student_portraits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  ai_tags jsonb NULL,
  custom_tags text[] NULL,
  last_updated timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT student_portraits_pkey PRIMARY KEY (id),
  CONSTRAINT student_portraits_student_id_key UNIQUE (student_id),
  CONSTRAINT student_portraits_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  name text NOT NULL,
  class_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NULL,
  admission_year text NULL,
  gender text NULL,
  contact_phone text NULL,
  contact_email text NULL,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_student_id_key UNIQUE (student_id),
  CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT students_gender_check CHECK (gender = ANY (ARRAY['男', '女', '其他']))
);

CREATE TABLE public.subjects (
  subject_code text NOT NULL,
  subject_name text NOT NULL,
  credit numeric NULL,
  category text NULL,
  is_required boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (subject_code)
);

CREATE TABLE public.submission_knowledge_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  knowledge_point_id uuid NOT NULL,
  mastery_level numeric NOT NULL DEFAULT 0,
  ai_confidence numeric NULL,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  assignment_id uuid NULL,
  homework_id uuid NULL,
  updated_at timestamp with time zone NULL DEFAULT now(),
  student_id uuid NULL,
  mastery_grade text NULL DEFAULT 'C',
  CONSTRAINT submission_knowledge_points_pkey PRIMARY KEY (id),
  CONSTRAINT submission_knowledge_points_homework_id_fkey FOREIGN KEY (homework_id) REFERENCES homework(id),
  CONSTRAINT submission_knowledge_points_knowledge_point_id_fkey FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id),
  CONSTRAINT submission_knowledge_points_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT submission_knowledge_points_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES homework_submissions(id),
  CONSTRAINT chk_mastery_grade CHECK (mastery_grade = ANY (ARRAY['A', 'B', 'C', 'D', 'E']))
);

CREATE TABLE public.teachers (
  id uuid NOT NULL,
  name text NOT NULL,
  email text NULL,
  subject text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT teachers_pkey PRIMARY KEY (id),
  CONSTRAINT teachers_email_key UNIQUE (email),
  CONSTRAINT teachers_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.user_ai_configs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  provider character varying(255) NOT NULL,
  version character varying(255) NULL,
  api_key_encrypted text NOT NULL,
  enabled boolean NULL DEFAULT true,
  custom_providers jsonb NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_ai_configs_pkey PRIMARY KEY (id),
  CONSTRAINT user_ai_configs_user_id_key UNIQUE (user_id),
  CONSTRAINT user_ai_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  full_name text NULL,
  avatar_url text NULL,
  phone text NULL,
  user_type text NULL DEFAULT 'student',
  bio text NULL,
  social_links jsonb NULL,
  preferences jsonb NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  default_grading_scale_id uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT fk_default_grading_scale_id FOREIGN KEY (default_grading_scale_id) REFERENCES grading_scales(id) ON DELETE SET NULL,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES user_roles(id) ON DELETE CASCADE
);

CREATE TABLE public.warning_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id text NULL,
  rule_id uuid NULL,
  details jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NULL DEFAULT now(),
  resolved_at timestamp with time zone NULL,
  resolved_by uuid NULL,
  resolution_notes text NULL,
  CONSTRAINT warning_records_pkey PRIMARY KEY (id),
  CONSTRAINT warning_records_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id),
  CONSTRAINT warning_records_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES warning_rules(id),
  CONSTRAINT warning_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(student_id),
  CONSTRAINT warning_records_status_check CHECK (status = ANY (ARRAY['active', 'resolved', 'dismissed']))
);

CREATE TABLE public.warning_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  conditions jsonb NOT NULL,
  severity text NOT NULL,
  is_active boolean NULL DEFAULT true,
  is_system boolean NULL DEFAULT false,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT warning_rules_pkey PRIMARY KEY (id),
  CONSTRAINT warning_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT warning_rules_severity_check CHECK (severity = ANY (ARRAY['low', 'medium', 'high']))
);