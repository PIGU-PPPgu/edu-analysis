-- 🔧 成绩系统数据库结构修复
-- 解决多科目存储和字段映射问题

-- 1. 修复 grade_data 表约束问题
DO $$
BEGIN
    -- 移除不合理的唯一约束（阻止多科目存储）
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'grade_data_exam_id_student_id_key' 
        AND table_name = 'grade_data'
    ) THEN
        ALTER TABLE grade_data DROP CONSTRAINT grade_data_exam_id_student_id_key;
        RAISE NOTICE '已移除不合理的唯一约束';
    END IF;
    
    -- 添加合理的约束（支持多科目）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_exam_student_subject' 
        AND table_name = 'grade_data'
    ) THEN
        ALTER TABLE grade_data ADD CONSTRAINT unique_exam_student_subject 
        UNIQUE(exam_id, student_id, subject);
        RAISE NOTICE '已添加合理的多科目约束';
    END IF;
END $$;

-- 2. 确保字段完整性
DO $$
BEGIN
    -- 添加缺失的字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'rank_in_school') THEN
        ALTER TABLE grade_data ADD COLUMN rank_in_school INTEGER;
        RAISE NOTICE '已添加 rank_in_school 字段';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_data' AND column_name = 'grade_level') THEN
        ALTER TABLE grade_data ADD COLUMN grade_level TEXT;
        RAISE NOTICE '已添加 grade_level 字段';
    END IF;
    
    -- 确保 subject 字段允许空值（总分记录可能为空）
    ALTER TABLE grade_data ALTER COLUMN subject DROP NOT NULL;
    RAISE NOTICE '已修改 subject 字段允许空值';
END $$;

-- 3. 优化索引结构
DO $$
BEGIN
    -- 添加多科目查询索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grade_data_exam_student_subject') THEN
        CREATE INDEX idx_grade_data_exam_student_subject ON grade_data(exam_id, student_id, subject);
        RAISE NOTICE '已添加多科目查询索引';
    END IF;
    
    -- 添加科目查询索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grade_data_subject') THEN
        CREATE INDEX idx_grade_data_subject ON grade_data(subject) WHERE subject IS NOT NULL;
        RAISE NOTICE '已添加科目查询索引';
    END IF;
    
    -- 添加等级查询索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_grade_data_grade') THEN
        CREATE INDEX idx_grade_data_grade ON grade_data(grade) WHERE grade IS NOT NULL;
        RAISE NOTICE '已添加等级查询索引';
    END IF;
END $$;

-- 4. 创建科目成绩查询函数
CREATE OR REPLACE FUNCTION get_student_subject_scores(p_exam_id UUID, p_student_id TEXT)
RETURNS TABLE (
    subject TEXT,
    score NUMERIC,
    grade TEXT,
    rank_in_class INTEGER,
    rank_in_grade INTEGER,
    rank_in_school INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gd.subject,
        gd.score,
        gd.grade,
        gd.rank_in_class,
        gd.rank_in_grade,
        gd.rank_in_school
    FROM grade_data gd
    WHERE gd.exam_id = p_exam_id 
    AND gd.student_id = p_student_id
    ORDER BY 
        CASE gd.subject 
            WHEN '总分' THEN 1 
            ELSE 2 
        END,
        gd.subject;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建科目分析函数
CREATE OR REPLACE FUNCTION get_subject_analysis(p_exam_id UUID)
RETURNS TABLE (
    subject TEXT,
    student_count INTEGER,
    avg_score NUMERIC,
    max_score NUMERIC,
    min_score NUMERIC,
    std_dev NUMERIC,
    pass_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gd.subject,
        COUNT(*)::INTEGER AS student_count,
        AVG(gd.score)::NUMERIC AS avg_score,
        MAX(gd.score)::NUMERIC AS max_score,
        MIN(gd.score)::NUMERIC AS min_score,
        STDDEV(gd.score)::NUMERIC AS std_dev,
        (COUNT(CASE WHEN gd.score >= 60 THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(*)::NUMERIC, 0) * 100)::NUMERIC AS pass_rate
    FROM grade_data gd
    WHERE gd.exam_id = p_exam_id 
    AND gd.subject IS NOT NULL
    AND gd.score IS NOT NULL
    GROUP BY gd.subject
    ORDER BY 
        CASE gd.subject 
            WHEN '总分' THEN 1 
            ELSE 2 
        END,
        gd.subject;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建等级分析函数
CREATE OR REPLACE FUNCTION get_grade_distribution(p_exam_id UUID, p_subject TEXT DEFAULT NULL)
RETURNS TABLE (
    grade TEXT,
    count INTEGER,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH grade_counts AS (
        SELECT 
            gd.grade,
            COUNT(*) AS count
        FROM grade_data gd
        WHERE gd.exam_id = p_exam_id
        AND (p_subject IS NULL OR gd.subject = p_subject)
        AND gd.grade IS NOT NULL
        GROUP BY gd.grade
    ),
    total AS (
        SELECT COUNT(*) AS total_count 
        FROM grade_data gd
        WHERE gd.exam_id = p_exam_id
        AND (p_subject IS NULL OR gd.subject = p_subject)
        AND gd.grade IS NOT NULL
    )
    SELECT 
        gc.grade,
        gc.count::INTEGER,
        (gc.count::NUMERIC / NULLIF(t.total_count, 0) * 100)::NUMERIC AS percentage
    FROM grade_counts gc, total t
    ORDER BY gc.grade;
END;
$$ LANGUAGE plpgsql;

-- 7. 数据清理和验证
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- 检查是否有重复数据
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT exam_id, student_id, subject, COUNT(*)
        FROM grade_data
        WHERE subject IS NOT NULL
        GROUP BY exam_id, student_id, subject
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE WARNING '发现 % 组重复的科目成绩数据，需要手动清理', duplicate_count;
    ELSE
        RAISE NOTICE '数据检查完成，没有发现重复记录';
    END IF;
END $$;

-- 8. 创建数据完整性检查函数
CREATE OR REPLACE FUNCTION check_grade_data_integrity()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    description TEXT,
    count INTEGER
) AS $$
BEGIN
    -- 检查1: 缺少总分的学生
    RETURN QUERY
    SELECT 
        '缺少总分记录'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'WARNING' ELSE 'OK' END::TEXT,
        '有学生缺少总分记录'::TEXT,
        COUNT(*)::INTEGER
    FROM (
        SELECT DISTINCT gd1.exam_id, gd1.student_id
        FROM grade_data gd1
        WHERE NOT EXISTS (
            SELECT 1 FROM grade_data gd2 
            WHERE gd2.exam_id = gd1.exam_id 
            AND gd2.student_id = gd1.student_id 
            AND gd2.subject = '总分'
        )
    ) missing_totals;
    
    -- 检查2: 孤立的科目成绩（没有对应的总分）
    RETURN QUERY
    SELECT 
        '孤立科目成绩'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'INFO' ELSE 'OK' END::TEXT,
        '有科目成绩但无总分记录'::TEXT,
        COUNT(*)::INTEGER
    FROM grade_data gd1
    WHERE gd1.subject != '总分' 
    AND gd1.subject IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM grade_data gd2 
        WHERE gd2.exam_id = gd1.exam_id 
        AND gd2.student_id = gd1.student_id 
        AND gd2.subject = '总分'
    );
    
    -- 检查3: 空的科目字段
    RETURN QUERY
    SELECT 
        '空科目字段'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'WARNING' ELSE 'OK' END::TEXT,
        '有记录的科目字段为空'::TEXT,
        COUNT(*)::INTEGER
    FROM grade_data
    WHERE subject IS NULL OR subject = '';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_grade_data_integrity() IS '检查成绩数据的完整性';

-- 执行完整性检查
SELECT * FROM check_grade_data_integrity();

RAISE NOTICE '数据库结构修复完成！';
RAISE NOTICE '请运行 SELECT * FROM check_grade_data_integrity(); 来检查数据完整性';