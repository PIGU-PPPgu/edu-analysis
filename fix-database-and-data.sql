-- 学生成绩系统全面修复脚本
-- 解决数据库结构与多学科数据存储问题

-- 1. 添加缺失字段
DO $$
BEGIN
    -- 添加rank_in_school字段（校内排名）
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'grade_data' 
        AND column_name = 'rank_in_school'
    ) THEN
        ALTER TABLE grade_data ADD COLUMN rank_in_school INTEGER;
        COMMENT ON COLUMN grade_data.rank_in_school IS '校内排名';
        RAISE NOTICE 'rank_in_school字段已添加';
    ELSE
        RAISE NOTICE 'rank_in_school字段已存在，无需添加';
    END IF;
    
    -- 添加其他可能缺失的字段
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'grade_data' 
        AND column_name = 'grade'
    ) THEN
        ALTER TABLE grade_data ADD COLUMN grade TEXT;
        COMMENT ON COLUMN grade_data.grade IS '等级评定（如A+、B-等）';
        RAISE NOTICE 'grade字段已添加';
    ELSE
        RAISE NOTICE 'grade字段已存在，无需添加';
    END IF;
END $$;

-- 2. 修复唯一约束问题
DO $$
BEGIN
    -- 检查并修改旧的唯一约束
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'grade_data_exam_id_student_id_key' 
        AND conrelid = 'grade_data'::regclass
    ) THEN
        -- 删除旧的约束
        ALTER TABLE grade_data DROP CONSTRAINT grade_data_exam_id_student_id_key;
        RAISE NOTICE '已删除旧的唯一约束 grade_data_exam_id_student_id_key';
        
        -- 添加包含subject字段的新约束
        ALTER TABLE grade_data ADD CONSTRAINT grade_data_exam_id_student_id_subject_key 
            UNIQUE (exam_id, student_id, subject);
        RAISE NOTICE '已添加新的唯一约束 grade_data_exam_id_student_id_subject_key，支持多学科数据';
    ELSE
        -- 检查新约束是否存在
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'grade_data_exam_id_student_id_subject_key' 
            AND conrelid = 'grade_data'::regclass
        ) THEN
            -- 如果新约束也不存在，则添加它
            ALTER TABLE grade_data ADD CONSTRAINT grade_data_exam_id_student_id_subject_key 
                UNIQUE (exam_id, student_id, subject);
            RAISE NOTICE '已添加新的唯一约束 grade_data_exam_id_student_id_subject_key';
        ELSE
            RAISE NOTICE '新的唯一约束 grade_data_exam_id_student_id_subject_key 已存在';
        END IF;
    END IF;
END $$;

-- 3. 添加索引提升性能
CREATE INDEX IF NOT EXISTS idx_grade_data_subject ON grade_data(subject);
CREATE INDEX IF NOT EXISTS idx_grade_data_rank_in_school ON grade_data(rank_in_school);
CREATE INDEX IF NOT EXISTS idx_grade_data_grade ON grade_data(grade);

-- 4. 创建表格状态检查函数
CREATE OR REPLACE FUNCTION check_grade_data_structure()
RETURNS TABLE (
    table_name TEXT,
    column_count INTEGER,
    record_count BIGINT,
    has_required_columns BOOLEAN,
    required_columns_list TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH column_check AS (
        SELECT 
            'grade_data' AS table_name,
            COUNT(column_name) AS column_count,
            BOOL_AND(
                column_name IN ('exam_id','student_id','name','class_name','subject','score','rank_in_class','rank_in_grade','rank_in_school')
            ) AS has_required_columns,
            STRING_AGG(column_name, ', ' ORDER BY column_name) AS columns_list
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'grade_data'
    ),
    record_count AS (
        SELECT 
            COUNT(*) AS count 
        FROM grade_data
    )
    SELECT 
        cc.table_name, 
        cc.column_count,
        rc.count,
        cc.has_required_columns,
        cc.columns_list
    FROM column_check cc, record_count rc;
END;
$$ LANGUAGE plpgsql;

-- 5. 数据导入支持函数，支持多学科数据导入
CREATE OR REPLACE FUNCTION import_grade_data(
    p_exam_id UUID,
    p_student_id TEXT,
    p_name TEXT,
    p_class_name TEXT,
    p_subject TEXT,
    p_score NUMERIC,
    p_grade TEXT DEFAULT NULL,
    p_rank_in_class INTEGER DEFAULT NULL,
    p_rank_in_grade INTEGER DEFAULT NULL,
    p_rank_in_school INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    -- 使用upsert操作，如果记录已存在则更新
    INSERT INTO grade_data (
        exam_id, student_id, name, class_name, subject, 
        score, grade, rank_in_class, rank_in_grade, rank_in_school
    ) VALUES (
        p_exam_id, p_student_id, p_name, p_class_name, p_subject,
        p_score, p_grade, p_rank_in_class, p_rank_in_grade, p_rank_in_school
    )
    ON CONFLICT (exam_id, student_id, subject) 
    DO UPDATE SET
        name = EXCLUDED.name,
        class_name = EXCLUDED.class_name,
        score = EXCLUDED.score,
        grade = EXCLUDED.grade,
        rank_in_class = EXCLUDED.rank_in_class,
        rank_in_grade = EXCLUDED.rank_in_grade,
        rank_in_school = EXCLUDED.rank_in_school,
        updated_at = now()
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 6. 添加表统计视图，方便分析
CREATE OR REPLACE VIEW grade_data_stats AS
SELECT 
    e.title AS exam_title,
    e.date AS exam_date,
    e.type AS exam_type,
    gd.subject,
    COUNT(*) AS student_count,
    AVG(gd.score) AS average_score,
    MIN(gd.score) AS min_score,
    MAX(gd.score) AS max_score,
    COUNT(CASE WHEN gd.score >= 60 THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 AS pass_rate,
    COUNT(DISTINCT gd.class_name) AS class_count
FROM 
    grade_data gd
JOIN 
    exams e ON gd.exam_id = e.id
GROUP BY
    e.title, e.date, e.type, gd.subject
ORDER BY
    e.date DESC, e.title; 