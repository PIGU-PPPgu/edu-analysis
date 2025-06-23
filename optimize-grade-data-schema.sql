-- 🚀 Grade Data 表结构优化
-- 解决科目成绩字段缺失问题，支持动态字段扩展

-- 1. 添加常用科目成绩字段到 grade_data 表
DO $$ 
BEGIN
    -- 主要科目成绩字段（满分150分）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'chinese_score') THEN
        ALTER TABLE grade_data ADD COLUMN chinese_score NUMERIC CHECK (chinese_score >= 0 AND chinese_score <= 150);
        COMMENT ON COLUMN grade_data.chinese_score IS '语文成绩（0-150分）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'math_score') THEN
        ALTER TABLE grade_data ADD COLUMN math_score NUMERIC CHECK (math_score >= 0 AND math_score <= 150);
        COMMENT ON COLUMN grade_data.math_score IS '数学成绩（0-150分）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'english_score') THEN
        ALTER TABLE grade_data ADD COLUMN english_score NUMERIC CHECK (english_score >= 0 AND english_score <= 150);
        COMMENT ON COLUMN grade_data.english_score IS '英语成绩（0-150分）';
    END IF;

    -- 理科科目成绩字段（满分100分）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'physics_score') THEN
        ALTER TABLE grade_data ADD COLUMN physics_score NUMERIC CHECK (physics_score >= 0 AND physics_score <= 100);
        COMMENT ON COLUMN grade_data.physics_score IS '物理成绩（0-100分）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'chemistry_score') THEN
        ALTER TABLE grade_data ADD COLUMN chemistry_score NUMERIC CHECK (chemistry_score >= 0 AND chemistry_score <= 100);
        COMMENT ON COLUMN grade_data.chemistry_score IS '化学成绩（0-100分）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'biology_score') THEN
        ALTER TABLE grade_data ADD COLUMN biology_score NUMERIC CHECK (biology_score >= 0 AND biology_score <= 100);
        COMMENT ON COLUMN grade_data.biology_score IS '生物成绩（0-100分）';
    END IF;

    -- 文科科目成绩字段（满分100分）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'politics_score') THEN
        ALTER TABLE grade_data ADD COLUMN politics_score NUMERIC CHECK (politics_score >= 0 AND politics_score <= 100);
        COMMENT ON COLUMN grade_data.politics_score IS '政治成绩（0-100分）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'history_score') THEN
        ALTER TABLE grade_data ADD COLUMN history_score NUMERIC CHECK (history_score >= 0 AND history_score <= 100);
        COMMENT ON COLUMN grade_data.history_score IS '历史成绩（0-100分）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'geography_score') THEN
        ALTER TABLE grade_data ADD COLUMN geography_score NUMERIC CHECK (geography_score >= 0 AND geography_score <= 100);
        COMMENT ON COLUMN grade_data.geography_score IS '地理成绩（0-100分）';
    END IF;

    -- 排名字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'rank_in_class') THEN
        ALTER TABLE grade_data ADD COLUMN rank_in_class INTEGER CHECK (rank_in_class > 0);
        COMMENT ON COLUMN grade_data.rank_in_class IS '班级排名';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'rank_in_grade') THEN
        ALTER TABLE grade_data ADD COLUMN rank_in_grade INTEGER CHECK (rank_in_grade > 0);
        COMMENT ON COLUMN grade_data.rank_in_grade IS '年级排名';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'rank_in_school') THEN
        ALTER TABLE grade_data ADD COLUMN rank_in_school INTEGER CHECK (rank_in_school > 0);
        COMMENT ON COLUMN grade_data.rank_in_school IS '学校排名';
    END IF;

    -- 考试信息冗余字段（便于查询）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'exam_title') THEN
        ALTER TABLE grade_data ADD COLUMN exam_title TEXT;
        COMMENT ON COLUMN grade_data.exam_title IS '考试标题（冗余存储）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'exam_type') THEN
        ALTER TABLE grade_data ADD COLUMN exam_type TEXT;
        COMMENT ON COLUMN grade_data.exam_type IS '考试类型（冗余存储）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'exam_date') THEN
        ALTER TABLE grade_data ADD COLUMN exam_date DATE;
        COMMENT ON COLUMN grade_data.exam_date IS '考试日期（冗余存储）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'exam_scope') THEN
        ALTER TABLE grade_data ADD COLUMN exam_scope TEXT DEFAULT 'class' CHECK (exam_scope IN ('class', 'grade', 'school'));
        COMMENT ON COLUMN grade_data.exam_scope IS '考试范围：class(班级), grade(年级), school(学校)';
    END IF;

END $$;

-- 2. 创建动态字段管理表
CREATE TABLE IF NOT EXISTS dynamic_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name TEXT NOT NULL UNIQUE,
    field_type TEXT NOT NULL DEFAULT 'score' CHECK (field_type IN ('score', 'grade', 'rank', 'text')),
    display_name TEXT NOT NULL,
    description TEXT,
    validation_rules JSONB DEFAULT '{}',
    is_system BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建动态添加字段的函数
CREATE OR REPLACE FUNCTION add_dynamic_field_to_grade_data(
    field_name TEXT,
    field_type TEXT DEFAULT 'score',
    display_name TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    column_exists BOOLEAN;
    sql_type TEXT;
    constraint_sql TEXT := '';
BEGIN
    -- 检查字段名是否合法
    IF field_name !~ '^[a-zA-Z][a-zA-Z0-9_]*$' THEN
        RAISE EXCEPTION '字段名格式不正确: %', field_name;
    END IF;

    -- 检查列是否已存在
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grade_data' AND column_name = field_name
    ) INTO column_exists;

    -- 如果列已存在，返回true
    IF column_exists THEN
        RETURN TRUE;
    END IF;

    -- 根据字段类型确定SQL类型和约束
    CASE field_type
        WHEN 'score' THEN
            sql_type := 'NUMERIC';
            constraint_sql := format(' CHECK (%I >= 0 AND %I <= 150)', field_name, field_name);
        WHEN 'grade' THEN
            sql_type := 'TEXT';
            constraint_sql := format(' CHECK (%I IN (''A+'', ''A'', ''A-'', ''B+'', ''B'', ''B-'', ''C+'', ''C'', ''C-'', ''D+'', ''D'', ''E''))', field_name);
        WHEN 'rank' THEN
            sql_type := 'INTEGER';
            constraint_sql := format(' CHECK (%I > 0)', field_name);
        WHEN 'text' THEN
            sql_type := 'TEXT';
        ELSE
            RAISE EXCEPTION '不支持的字段类型: %', field_type;
    END CASE;

    -- 添加列到grade_data表
    EXECUTE format('ALTER TABLE grade_data ADD COLUMN %I %s%s', field_name, sql_type, constraint_sql);

    -- 添加注释
    IF display_name IS NOT NULL THEN
        EXECUTE format('COMMENT ON COLUMN grade_data.%I IS %L', field_name, display_name);
    END IF;

    -- 记录到动态字段表
    INSERT INTO dynamic_fields (field_name, field_type, display_name, is_system)
    VALUES (field_name, field_type, COALESCE(display_name, field_name), FALSE)
    ON CONFLICT (field_name) DO NOTHING;

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '添加动态字段失败: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建优化的性能索引
DO $$
BEGIN
    -- 成绩字段索引（用于统计分析）
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grade_data_scores') THEN
        CREATE INDEX idx_grade_data_scores ON grade_data (chinese_score, math_score, english_score, total_score) WHERE chinese_score IS NOT NULL OR math_score IS NOT NULL OR english_score IS NOT NULL;
    END IF;

    -- 排名字段索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grade_data_ranks') THEN
        CREATE INDEX idx_grade_data_ranks ON grade_data (rank_in_class, rank_in_grade) WHERE rank_in_class IS NOT NULL OR rank_in_grade IS NOT NULL;
    END IF;

    -- 考试信息复合索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grade_data_exam_info') THEN
        CREATE INDEX idx_grade_data_exam_info ON grade_data (exam_type, exam_date, exam_scope);
    END IF;

    -- 班级+考试复合索引（用于班级分析）
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grade_data_class_exam') THEN
        CREATE INDEX idx_grade_data_class_exam ON grade_data (class_name, exam_id);
    END IF;

    -- 学生ID+考试复合索引（用于学生历史成绩）
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grade_data_student_exam') THEN
        CREATE INDEX idx_grade_data_student_exam ON grade_data (student_id, exam_date DESC);
    END IF;

END $$;

-- 5. 创建数据验证和清理函数
CREATE OR REPLACE FUNCTION validate_grade_data() RETURNS TRIGGER AS $$
BEGIN
    -- 验证总分与各科目分数的一致性（如果都有数据的话）
    IF NEW.total_score IS NOT NULL AND (
        NEW.chinese_score IS NOT NULL OR 
        NEW.math_score IS NOT NULL OR 
        NEW.english_score IS NOT NULL OR
        NEW.physics_score IS NOT NULL OR
        NEW.chemistry_score IS NOT NULL OR
        NEW.biology_score IS NOT NULL OR
        NEW.politics_score IS NOT NULL OR
        NEW.history_score IS NOT NULL OR
        NEW.geography_score IS NOT NULL
    ) THEN
        -- 这里可以添加总分验证逻辑
        NULL;
    END IF;

    -- 验证排名的合理性
    IF NEW.rank_in_class IS NOT NULL AND NEW.rank_in_class <= 0 THEN
        RAISE EXCEPTION '班级排名必须大于0';
    END IF;

    IF NEW.rank_in_grade IS NOT NULL AND NEW.rank_in_grade <= 0 THEN
        RAISE EXCEPTION '年级排名必须大于0';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建验证触发器
DROP TRIGGER IF EXISTS trigger_validate_grade_data ON grade_data;
CREATE TRIGGER trigger_validate_grade_data
    BEFORE INSERT OR UPDATE ON grade_data
    FOR EACH ROW EXECUTE FUNCTION validate_grade_data();

-- 6. 为动态字段表添加RLS策略
ALTER TABLE dynamic_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许认证用户查看动态字段" ON dynamic_fields
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY "允许认证用户创建动态字段" ON dynamic_fields
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- 7. 添加一些默认的动态字段示例
INSERT INTO dynamic_fields (field_name, field_type, display_name, description, is_system) VALUES
('chinese_class_rank', 'rank', '语文班级排名', '语文科目在班级内的排名', TRUE),
('math_class_rank', 'rank', '数学班级排名', '数学科目在班级内的排名', TRUE),
('english_class_rank', 'rank', '英语班级排名', '英语科目在班级内的排名', TRUE),
('chinese_grade', 'grade', '语文等级', '语文科目等级评定', TRUE),
('math_grade', 'grade', '数学等级', '数学科目等级评定', TRUE),
('english_grade', 'grade', '英语等级', '英语科目等级评定', TRUE)
ON CONFLICT (field_name) DO NOTHING;

-- 8. 创建查询所有可用字段的视图
CREATE OR REPLACE VIEW grade_data_fields AS
SELECT 
    column_name as field_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('chinese_score', 'math_score', 'english_score', 'physics_score', 'chemistry_score', 'biology_score', 'politics_score', 'history_score', 'geography_score', 'total_score') THEN 'score'
        WHEN column_name IN ('rank_in_class', 'rank_in_grade', 'rank_in_school') THEN 'rank'
        WHEN column_name IN ('student_id', 'name', 'class_name', 'exam_title', 'exam_type', 'exam_scope') THEN 'info'
        WHEN column_name LIKE '%_grade' THEN 'grade'
        WHEN column_name LIKE '%_rank' THEN 'rank'
        ELSE 'other'
    END as field_category,
    COALESCE(
        (SELECT display_name FROM dynamic_fields WHERE field_name = column_name),
        CASE column_name
            WHEN 'chinese_score' THEN '语文成绩'
            WHEN 'math_score' THEN '数学成绩'
            WHEN 'english_score' THEN '英语成绩'
            WHEN 'physics_score' THEN '物理成绩'
            WHEN 'chemistry_score' THEN '化学成绩'
            WHEN 'biology_score' THEN '生物成绩'
            WHEN 'politics_score' THEN '政治成绩'
            WHEN 'history_score' THEN '历史成绩'
            WHEN 'geography_score' THEN '地理成绩'
            WHEN 'total_score' THEN '总分'
            WHEN 'rank_in_class' THEN '班级排名'
            WHEN 'rank_in_grade' THEN '年级排名'
            WHEN 'rank_in_school' THEN '学校排名'
            WHEN 'student_id' THEN '学号'
            WHEN 'name' THEN '姓名'
            WHEN 'class_name' THEN '班级'
            ELSE column_name
        END
    ) as display_name
FROM information_schema.columns 
WHERE table_name = 'grade_data' 
    AND table_schema = 'public'
    AND column_name NOT IN ('id', 'exam_id', 'created_at', 'updated_at', 'metadata')
ORDER BY 
    CASE field_category
        WHEN 'info' THEN 1
        WHEN 'score' THEN 2
        WHEN 'grade' THEN 3
        WHEN 'rank' THEN 4
        ELSE 5
    END,
    column_name;

-- 9. 创建批量导入优化函数
CREATE OR REPLACE FUNCTION batch_insert_grade_data(
    grade_data_array JSONB
) RETURNS TABLE(inserted_count INTEGER, error_count INTEGER, errors TEXT[]) AS $$
DECLARE
    data_record JSONB;
    inserted_count INTEGER := 0;
    error_count INTEGER := 0;
    errors_array TEXT[] := '{}';
    error_msg TEXT;
BEGIN
    -- 遍历数组中的每条记录
    FOR data_record IN SELECT * FROM jsonb_array_elements(grade_data_array)
    LOOP
        BEGIN
            -- 插入单条记录
            INSERT INTO grade_data (
                exam_id, student_id, name, class_name, total_score,
                chinese_score, math_score, english_score,
                physics_score, chemistry_score, biology_score,
                politics_score, history_score, geography_score,
                rank_in_class, rank_in_grade, rank_in_school,
                exam_title, exam_type, exam_date, exam_scope
            ) VALUES (
                (data_record->>'exam_id')::UUID,
                data_record->>'student_id',
                data_record->>'name',
                data_record->>'class_name',
                (data_record->>'total_score')::NUMERIC,
                (data_record->>'chinese_score')::NUMERIC,
                (data_record->>'math_score')::NUMERIC,
                (data_record->>'english_score')::NUMERIC,
                (data_record->>'physics_score')::NUMERIC,
                (data_record->>'chemistry_score')::NUMERIC,
                (data_record->>'biology_score')::NUMERIC,
                (data_record->>'politics_score')::NUMERIC,
                (data_record->>'history_score')::NUMERIC,
                (data_record->>'geography_score')::NUMERIC,
                (data_record->>'rank_in_class')::INTEGER,
                (data_record->>'rank_in_grade')::INTEGER,
                (data_record->>'rank_in_school')::INTEGER,
                data_record->>'exam_title',
                data_record->>'exam_type',
                (data_record->>'exam_date')::DATE,
                data_record->>'exam_scope'
            );
            
            inserted_count := inserted_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            error_msg := format('学号%s: %s', data_record->>'student_id', SQLERRM);
            errors_array := array_append(errors_array, error_msg);
        END;
    END LOOP;
    
    RETURN QUERY SELECT inserted_count, error_count, errors_array;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 执行完成
SELECT 'Grade Data 表结构优化完成！' as result;