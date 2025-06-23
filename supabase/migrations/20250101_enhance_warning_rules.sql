-- Enhanced Warning Rules Migration
-- 为预警规则表添加scope和category字段，支持整体预警和考试级预警分类

-- 1. 添加新字段
ALTER TABLE warning_rules 
ADD COLUMN scope TEXT DEFAULT 'global' CHECK (scope IN ('global', 'exam', 'class', 'student')),
ADD COLUMN category TEXT DEFAULT 'grade' CHECK (category IN ('grade', 'attendance', 'behavior', 'progress', 'homework', 'composite')),
ADD COLUMN priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
ADD COLUMN auto_trigger BOOLEAN DEFAULT true,
ADD COLUMN notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN metadata JSONB DEFAULT '{}';

-- 2. 创建索引提升查询性能
CREATE INDEX idx_warning_rules_scope ON warning_rules(scope);
CREATE INDEX idx_warning_rules_category ON warning_rules(category);
CREATE INDEX idx_warning_rules_active_scope ON warning_rules(is_active, scope);

-- 3. 插入预设的预警规则模板

-- 整体预警规则（全局范围）
INSERT INTO warning_rules (name, description, conditions, severity, scope, category, priority, is_active, is_system, auto_trigger) VALUES
('连续不及格预警', '学生连续2次考试不及格时触发预警', 
 '{"type": "consecutive_fails", "count": 2, "threshold": 60, "subject": "all"}', 
 'medium', 'global', 'grade', 7, true, true, true),

('成绩下降预警', '学生成绩连续下降超过15分时触发预警', 
 '{"type": "grade_decline", "decline_threshold": 15, "consecutive_count": 2, "subject": "all"}', 
 'high', 'global', 'progress', 8, true, true, true),

('单科异常预警', '单科成绩低于班级平均分30分以上时触发预警', 
 '{"type": "subject_anomaly", "deviation_threshold": 30, "comparison": "class_average", "subject": "any"}', 
 'medium', 'global', 'grade', 6, true, true, true),

('作业拖欠预警', '连续3次作业未提交或迟交时触发预警', 
 '{"type": "homework_default", "count": 3, "include_late": true}', 
 'medium', 'global', 'homework', 6, true, true, true),

('综合风险预警', '多个风险因素综合评估达到高风险时触发预警', 
 '{"type": "composite_risk", "factors": ["grade", "homework", "attendance"], "risk_threshold": 0.7}', 
 'high', 'global', 'composite', 9, true, true, true);

-- 考试级预警规则（针对特定考试）
INSERT INTO warning_rules (name, description, conditions, severity, scope, category, priority, is_active, is_system, auto_trigger) VALUES
('考试不及格预警', '本次考试成绩不及格时触发预警', 
 '{"type": "exam_fail", "threshold": 60, "subject": "all"}', 
 'medium', 'exam', 'grade', 5, true, true, true),

('考试退步预警', '本次考试相比上次考试成绩下降超过10分时触发预警', 
 '{"type": "exam_regression", "decline_threshold": 10, "comparison": "previous_exam", "subject": "all"}', 
 'medium', 'exam', 'progress', 6, true, true, true),

('考试排名下降预警', '本次考试班级排名下降超过5名时触发预警', 
 '{"type": "rank_decline", "rank_decline_threshold": 5, "scope": "class"}', 
 'low', 'exam', 'progress', 4, true, true, true),

('考试异常低分预警', '本次考试成绩低于个人历史平均分20分以上时触发预警', 
 '{"type": "personal_anomaly", "deviation_threshold": 20, "comparison": "personal_average", "subject": "all"}', 
 'high', 'exam', 'grade', 8, true, true, true),

('多科目失利预警', '本次考试有3门以上科目不及格时触发预警', 
 '{"type": "multi_subject_fail", "fail_count_threshold": 3, "threshold": 60}', 
 'high', 'exam', 'grade', 9, true, true, true);

-- 班级级预警规则
INSERT INTO warning_rules (name, description, conditions, severity, scope, category, priority, is_active, is_system, auto_trigger) VALUES
('班级整体下滑预警', '班级平均分相比上次考试下降超过5分时触发预警', 
 '{"type": "class_decline", "decline_threshold": 5, "comparison": "previous_exam"}', 
 'medium', 'class', 'progress', 6, true, true, true),

('班级及格率预警', '班级及格率低于60%时触发预警', 
 '{"type": "class_pass_rate", "threshold": 0.6}', 
 'medium', 'class', 'grade', 7, true, true, true);

-- 学生个人级预警规则  
INSERT INTO warning_rules (name, description, conditions, severity, scope, category, priority, is_active, is_system, auto_trigger) VALUES
('学习状态异常预警', '学生个人学习数据出现异常模式时触发预警', 
 '{"type": "learning_pattern_anomaly", "factors": ["grade_variance", "submission_timing", "performance_trend"]}', 
 'medium', 'student', 'behavior', 5, true, true, true),

('潜力未发挥预警', '学生能力评估与实际表现存在较大差距时触发预警', 
 '{"type": "potential_gap", "gap_threshold": 0.3, "assessment_period": "month"}', 
 'low', 'student', 'progress', 3, true, true, false);

-- 4. 创建函数：获取适用的预警规则
CREATE OR REPLACE FUNCTION get_applicable_warning_rules(
  rule_scope TEXT DEFAULT 'global',
  rule_category TEXT DEFAULT NULL,
  active_only BOOLEAN DEFAULT true
) RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  conditions JSONB,
  severity TEXT,
  scope TEXT,
  category TEXT,
  priority INTEGER,
  is_active BOOLEAN,
  auto_trigger BOOLEAN
) 
LANGUAGE sql
AS $$
  SELECT 
    wr.id,
    wr.name,
    wr.description,
    wr.conditions,
    wr.severity,
    wr.scope,
    wr.category,
    wr.priority,
    wr.is_active,
    wr.auto_trigger
  FROM warning_rules wr
  WHERE 
    (rule_scope IS NULL OR wr.scope = rule_scope)
    AND (rule_category IS NULL OR wr.category = rule_category)
    AND (NOT active_only OR wr.is_active = true)
  ORDER BY wr.priority DESC, wr.created_at DESC;
$$;

-- 5. 创建函数：获取预警规则统计
CREATE OR REPLACE FUNCTION get_warning_rules_stats()
RETURNS JSONB
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'total_rules', COUNT(*),
    'active_rules', COUNT(*) FILTER (WHERE is_active = true),
    'by_scope', jsonb_object_agg(scope, scope_count),
    'by_category', jsonb_object_agg(category, category_count),
    'by_severity', jsonb_object_agg(severity, severity_count)
  )
  FROM (
    SELECT 
      scope,
      category,
      severity,
      COUNT(*) OVER (PARTITION BY scope) as scope_count,
      COUNT(*) OVER (PARTITION BY category) as category_count,
      COUNT(*) OVER (PARTITION BY severity) as severity_count
    FROM warning_rules
    WHERE is_active = true
    GROUP BY scope, category, severity
  ) stats;
$$;

-- 6. 添加注释
COMMENT ON COLUMN warning_rules.scope IS '规则适用范围: global(全局), exam(考试级), class(班级级), student(学生级)';
COMMENT ON COLUMN warning_rules.category IS '规则分类: grade(成绩), attendance(出勤), behavior(行为), progress(进步), homework(作业), composite(综合)';
COMMENT ON COLUMN warning_rules.priority IS '规则优先级: 1-10, 数值越高优先级越高';
COMMENT ON COLUMN warning_rules.auto_trigger IS '是否自动触发预警';
COMMENT ON COLUMN warning_rules.notification_enabled IS '是否启用通知';
COMMENT ON COLUMN warning_rules.metadata IS '规则元数据, 存储额外的配置信息'; 