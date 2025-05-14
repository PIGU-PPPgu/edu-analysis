# 教育分析平台数据库结构

## 数据库表及主键信息

| 表名 | 主键 |
|------|------|
| academic_terms | id |
| cache_control | cache_key |
| class_info | class_name |
| classes | id |
| course_classes | id |
| exams | id |
| grade_data | id |
| grade_data_tags | id |
| grade_tags | id |
| grades | id |
| grading_criteria | id |
| grading_scale_levels | id |
| grading_scales | id |
| help_content | id |
| homework | id |
| homework_submissions | id |
| intervention_activities | id |
| intervention_assessments | id |
| intervention_plans | id |
| knowledge_point_thresholds | id |
| knowledge_points | id |
| learning_progress | id |
| learning_resources | id |
| migrations_log | id |
| notification_settings | id |
| onboarding_status | id |
| student_knowledge_mastery | id |
| student_portraits | id |
| students | id |
| subjects | subject_code |
| submission_knowledge_points | id |
| system_monitoring | id |
| teachers | id |
| user_ai_configs | id |
| user_profiles | id |
| user_roles | id |
| user_settings | id |
| warning_records | id |
| warning_rules | id |

## 主要表结构

### exams 表
| 列名 | 数据类型 | 可为空 | 默认值 |
|------|---------|--------|--------|
| id | uuid | 否 | gen_random_uuid() |
| title | text | 否 | 无 |
| type | text | 否 | 无 |
| date | date | 否 | 无 |
| subject | text | 是 | 无 |
| created_at | timestamp with time zone | 是 | now() |
| updated_at | timestamp with time zone | 是 | now() |
| created_by | uuid | 是 | 无 |

### grade_data 表
| 列名 | 数据类型 | 可为空 | 默认值 |
|------|---------|--------|--------|
| id | uuid | 否 | gen_random_uuid() |
| exam_id | uuid | 否 | 无 |
| student_id | text | 否 | 无 |
| name | text | 否 | 无 |
| class_name | text | 是 | 无 |
| total_score | numeric | 是 | 无 |
| created_at | timestamp with time zone | 是 | now() |
| updated_at | timestamp with time zone | 是 | now() |
| metadata | jsonb | 是 | '{}' |

### grade_tags 表
| 列名 | 数据类型 | 可为空 | 默认值 |
|------|---------|--------|--------|
| id | uuid | 否 | gen_random_uuid() |
| name | text | 否 | 无 |
| description | text | 是 | 无 |
| color | text | 是 | '#3B82F6' |
| created_by | uuid | 是 | 无 |
| created_at | timestamp with time zone | 是 | now() |
| updated_at | timestamp with time zone | 是 | now() |
| is_system | boolean | 是 | false |

### grade_data_tags 表
| 列名 | 数据类型 | 可为空 | 默认值 |
|------|---------|--------|--------|
| id | uuid | 否 | gen_random_uuid() |
| grade_id | uuid | 是 | 无 |
| tag_id | uuid | 是 | 无 |
| created_at | timestamp with time zone | 是 | now() |

### students 表
| 列名 | 数据类型 | 可为空 | 默认值 |
|------|---------|--------|--------|
| id | uuid | 否 | gen_random_uuid() |
| student_id | text | 否 | 无 |
| name | text | 否 | 无 |
| class_id | uuid | 是 | 无 |
| created_at | timestamp with time zone | 否 | now() |
| user_id | uuid | 是 | 无 |
| admission_year | text | 是 | 无 |
| gender | text | 是 | 无 |
| contact_phone | text | 是 | 无 |
| contact_email | text | 是 | 无 |

### classes 表
| 列名 | 数据类型 | 可为空 | 默认值 |
|------|---------|--------|--------|
| id | uuid | 否 | gen_random_uuid() |
| name | text | 否 | 无 |
| grade | text | 否 | 无 |
| created_at | timestamp with time zone | 否 | now() |

## 主要表间外键关系

| 来源表 | 来源列 | 目标表 | 目标列 |
|-------|-------|-------|-------|
| grade_data | exam_id | exams | id |
| grade_data_tags | grade_id | grade_data | id |
| grade_data_tags | tag_id | grade_tags | id |
| grades | student_id | students | id |
| homework | class_id | classes | id |
| homework_submissions | student_id | students | id |
| students | class_id | classes | id |
| warning_records | student_id | students | student_id |
| course_classes | class_name | class_info | class_name |
| course_classes | subject_code | subjects | subject_code |
| course_classes | teacher_id | teachers | id |
| course_classes | term_id | academic_terms | id |
| grading_criteria | homework_id | homework | id |
| grading_scale_levels | scale_id | grading_scales | id |
| homework | grading_scale_id | grading_scales | id |
| homework_submissions | homework_id | homework | id |
| intervention_activities | plan_id | intervention_plans | id |
| intervention_assessments | plan_id | intervention_plans | id |
| intervention_plans | warning_id | warning_records | id |
| knowledge_points | homework_id | homework | id |
| learning_progress | knowledge_point_id | knowledge_points | id |
| learning_progress | student_id | students | student_id |
| learning_resources | knowledge_point_id | knowledge_points | id |
| learning_resources | subject_code | subjects | subject_code |
| student_knowledge_mastery | homework_id | homework | id |
| student_knowledge_mastery | knowledge_point_id | knowledge_points | id |
| student_knowledge_mastery | student_id | students | id |
| student_knowledge_mastery | submission_id | homework_submissions | id |
| student_portraits | student_id | students | id |
| submission_knowledge_points | homework_id | homework | id |
| submission_knowledge_points | knowledge_point_id | knowledge_points | id |
| submission_knowledge_points | student_id | students | id |
| submission_knowledge_points | submission_id | homework_submissions | id |
| user_settings | default_grading_scale_id | grading_scales | id |
| user_settings | user_id | user_roles | id |
| warning_records | rule_id | warning_rules | id |

## 视图

### active_warnings_summary
分析了每个学生的活跃警告情况，按严重程度分类计数。

### class_statistics
统计了每个班级的数据，包括学生数量、作业数量、平均分和优秀率等。

## 系统模块概述

根据表结构，系统可以划分为以下几个主要模块：

1. **考试成绩管理模块**：exams、grade_data、grade_tags表
2. **学生管理模块**：students、classes表
3. **作业管理模块**：homework、homework_submissions表
4. **预警监控模块**：warning_records、warning_rules表
5. **学习资源模块**：knowledge_points、learning_resources表
6. **干预计划模块**：intervention_plans、intervention_activities、intervention_assessments表
7. **用户与权限管理**：user_roles、user_profiles、user_settings表

这些表通过主键和外键关系形成了完整的数据结构，支持学生成绩分析和教学管理功能。 