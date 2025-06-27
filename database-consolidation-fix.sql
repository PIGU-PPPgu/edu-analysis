-- 🚀 数据库表整合修复脚本
-- 解决成绩数据存储分散问题，统一使用 grade_data 表

-- ================================
-- 第一步：备份现有数据
-- ================================

-- 创建备份表
CREATE TABLE IF NOT EXISTS grades_backup AS 
SELECT * FROM grades WHERE FALSE; -- 仅复制结构

CREATE TABLE IF NOT EXISTS grade_data_backup AS 
SELECT * FROM grade_data WHERE FALSE; -- 仅复制结构

-- 备份现有数据
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades') THEN
        INSERT INTO grades_backup SELECT * FROM grades;
        RAISE NOTICE '已备份 grades 表数据';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grade_data') THEN
        INSERT INTO grade_data_backup SELECT * FROM grade_data;
        RAISE NOTICE '已备份 grade_data 表数据';
    END IF;
END $$;

-- ================================
-- 第二步：确保 grade_data 表结构完整
-- ================================

-- 创建或更新 grade_data 表为主表
CREATE TABLE IF NOT EXISTS grade_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id),
    student_id TEXT NOT NULL,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    
    -- 基础信息
    total_score NUMERIC CHECK (total_score >= 0 AND total_score <= 900),
    
    -- 主要科目成绩（满分150分）
    chinese_score NUMERIC CHECK (chinese_score >= 0 AND chinese_score <= 150),
    math_score NUMERIC CHECK (math_score >= 0 AND math_score <= 150),
    english_score NUMERIC CHECK (english_score >= 0 AND english_score <= 150),
    
    -- 理科科目成绩（满分100分）
    physics_score NUMERIC CHECK (physics_score >= 0 AND physics_score <= 100),
    chemistry_score NUMERIC CHECK (chemistry_score >= 0 AND chemistry_score <= 100),
    biology_score NUMERIC CHECK (biology_score >= 0 AND biology_score <= 100),
    
    -- 文科科目成绩（满分100分）
    politics_score NUMERIC CHECK (politics_score >= 0 AND politics_score <= 100),
    history_score NUMERIC CHECK (history_score >= 0 AND history_score <= 100),
    geography_score NUMERIC CHECK (geography_score >= 0 AND geography_score <= 100),
    
    -- 等级字段
    chinese_grade TEXT CHECK (chinese_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E')),
    math_grade TEXT CHECK (math_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E')),
    english_grade TEXT CHECK (english_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E')),
    physics_grade TEXT CHECK (physics_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E')),
    chemistry_grade TEXT CHECK (chemistry_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E')),
    biology_grade TEXT CHECK (biology_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E')),
    politics_grade TEXT CHECK (politics_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E')),
    history_grade TEXT CHECK (history_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E')),
    geography_grade TEXT CHECK (geography_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E')),
    total_grade TEXT CHECK (total_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E')),
    
    -- 排名字段
    rank_in_class INTEGER CHECK (rank_in_class > 0),
    rank_in_grade INTEGER CHECK (rank_in_grade > 0),
    rank_in_school INTEGER CHECK (rank_in_school > 0),
    
    -- 考试信息（冗余存储以提高查询效率）
    exam_title TEXT,
    exam_type TEXT,
    exam_date DATE,
    exam_scope TEXT DEFAULT 'class' CHECK (exam_scope IN ('class', 'grade', 'school')),
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 唯一约束：防止同一学生在同一考试中重复录入
    UNIQUE(student_id, exam_id)
);

-- 添加列注释
COMMENT ON TABLE grade_data IS '统一的成绩数据表 - 支持多科目、多类型成绩存储';
COMMENT ON COLUMN grade_data.chinese_score IS '语文成绩（0-150分）';
COMMENT ON COLUMN grade_data.math_score IS '数学成绩（0-150分）';
COMMENT ON COLUMN grade_data.english_score IS '英语成绩（0-150分）';
COMMENT ON COLUMN grade_data.physics_score IS '物理成绩（0-100分）';
COMMENT ON COLUMN grade_data.chemistry_score IS '化学成绩（0-100分）';
COMMENT ON COLUMN grade_data.biology_score IS '生物成绩（0-100分）';
COMMENT ON COLUMN grade_data.politics_score IS '政治成绩（0-100分）';
COMMENT ON COLUMN grade_data.history_score IS '历史成绩（0-100分）';
COMMENT ON COLUMN grade_data.geography_score IS '地理成绩（0-100分）';
COMMENT ON COLUMN grade_data.rank_in_class IS '班级排名';
COMMENT ON COLUMN grade_data.rank_in_grade IS '年级排名';
COMMENT ON COLUMN grade_data.rank_in_school IS '学校排名';

-- ================================
-- 第三步：数据迁移（从 grades 表到 grade_data 表）
-- ================================

-- 创建数据迁移函数
CREATE OR REPLACE FUNCTION migrate_grades_to_grade_data() RETURNS TEXT AS $$
DECLARE
    grade_record RECORD;
    migrated_count INTEGER := 0;
    error_count INTEGER := 0;
    exam_record RECORD;
    student_record RECORD;
BEGIN
    -- 检查 grades 表是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades') THEN
        RETURN 'grades 表不存在，无需迁移';
    END IF;
    
    -- 按学生和考试分组迁移数据
    FOR exam_record IN 
        SELECT DISTINCT exam_date, exam_type, 
               COALESCE(exam_type || '_' || exam_date::TEXT, '考试_' || exam_date::TEXT) as exam_title
        FROM grades 
        WHERE exam_date IS NOT NULL
    LOOP
        -- 为每个考试创建考试记录（如果不存在）
        INSERT INTO exams (title, date, type, description)
        VALUES (
            exam_record.exam_title,
            exam_record.exam_date,
            exam_record.exam_type,
            '从 grades 表迁移的考试数据'
        )
        ON CONFLICT (title, date, type) DO NOTHING;
        
        -- 获取刚创建或已存在的考试ID
        SELECT id INTO exam_record.exam_id 
        FROM exams 
        WHERE title = exam_record.exam_title 
          AND date = exam_record.exam_date 
          AND type = exam_record.exam_type;
        
        -- 按学生分组处理该考试的成绩
        FOR student_record IN 
            SELECT student_id,
                   MAX(CASE WHEN subject = 'chinese' THEN score END) as chinese_score,
                   MAX(CASE WHEN subject = 'math' THEN score END) as math_score,
                   MAX(CASE WHEN subject = 'english' THEN score END) as english_score,
                   MAX(CASE WHEN subject = 'physics' THEN score END) as physics_score,
                   MAX(CASE WHEN subject = 'chemistry' THEN score END) as chemistry_score,
                   MAX(CASE WHEN subject = 'biology' THEN score END) as biology_score,
                   MAX(CASE WHEN subject = 'politics' THEN score END) as politics_score,
                   MAX(CASE WHEN subject = 'history' THEN score END) as history_score,
                   MAX(CASE WHEN subject = 'geography' THEN score END) as geography_score
            FROM grades 
            WHERE exam_date = exam_record.exam_date 
              AND exam_type = exam_record.exam_type
            GROUP BY student_id
        LOOP
            BEGIN
                -- 获取学生信息
                SELECT name, class_name INTO student_record.name, student_record.class_name
                FROM students WHERE student_id = student_record.student_id;
                
                -- 如果学生不存在，跳过
                IF student_record.name IS NULL THEN
                    CONTINUE;
                END IF;
                
                -- 计算总分
                student_record.total_score := COALESCE(student_record.chinese_score, 0) + 
                                            COALESCE(student_record.math_score, 0) + 
                                            COALESCE(student_record.english_score, 0) + 
                                            COALESCE(student_record.physics_score, 0) + 
                                            COALESCE(student_record.chemistry_score, 0) + 
                                            COALESCE(student_record.biology_score, 0) + 
                                            COALESCE(student_record.politics_score, 0) + 
                                            COALESCE(student_record.history_score, 0) + 
                                            COALESCE(student_record.geography_score, 0);
                
                -- 插入到 grade_data 表
                INSERT INTO grade_data (
                    exam_id, student_id, name, class_name,
                    chinese_score, math_score, english_score,
                    physics_score, chemistry_score, biology_score,
                    politics_score, history_score, geography_score,
                    total_score, exam_title, exam_type, exam_date
                ) VALUES (
                    exam_record.exam_id, student_record.student_id, student_record.name, student_record.class_name,
                    student_record.chinese_score, student_record.math_score, student_record.english_score,
                    student_record.physics_score, student_record.chemistry_score, student_record.biology_score,
                    student_record.politics_score, student_record.history_score, student_record.geography_score,
                    student_record.total_score, exam_record.exam_title, exam_record.exam_type, exam_record.exam_date
                ) ON CONFLICT (student_id, exam_id) DO UPDATE SET
                    chinese_score = EXCLUDED.chinese_score,
                    math_score = EXCLUDED.math_score,
                    english_score = EXCLUDED.english_score,
                    physics_score = EXCLUDED.physics_score,
                    chemistry_score = EXCLUDED.chemistry_score,
                    biology_score = EXCLUDED.biology_score,
                    politics_score = EXCLUDED.politics_score,
                    history_score = EXCLUDED.history_score,
                    geography_score = EXCLUDED.geography_score,
                    total_score = EXCLUDED.total_score,
                    updated_at = NOW();
                
                migrated_count := migrated_count + 1;
                
            EXCEPTION WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE '迁移学生 % 的数据时出错: %', student_record.student_id, SQLERRM;
            END;
        END LOOP;
    END LOOP;
    
    RETURN format('数据迁移完成：成功 %s 条，失败 %s 条', migrated_count, error_count);
END;
$$ LANGUAGE plpgsql;

-- 执行数据迁移
SELECT migrate_grades_to_grade_data();

-- ================================
-- 第四步：创建优化索引
-- ================================

-- 删除可能存在的旧索引
DROP INDEX IF EXISTS idx_grade_data_scores;
DROP INDEX IF EXISTS idx_grade_data_ranks;
DROP INDEX IF EXISTS idx_grade_data_exam_info;
DROP INDEX IF EXISTS idx_grade_data_class_exam;
DROP INDEX IF EXISTS idx_grade_data_student_exam;

-- 创建新的优化索引
CREATE INDEX idx_grade_data_scores ON grade_data (chinese_score, math_score, english_score, total_score) 
WHERE chinese_score IS NOT NULL OR math_score IS NOT NULL OR english_score IS NOT NULL;

CREATE INDEX idx_grade_data_ranks ON grade_data (rank_in_class, rank_in_grade) 
WHERE rank_in_class IS NOT NULL OR rank_in_grade IS NOT NULL;

CREATE INDEX idx_grade_data_exam_info ON grade_data (exam_type, exam_date, exam_scope);

CREATE INDEX idx_grade_data_class_exam ON grade_data (class_name, exam_id);

CREATE INDEX idx_grade_data_student_exam ON grade_data (student_id, exam_date DESC);

CREATE INDEX idx_grade_data_student_name ON grade_data (student_id, name);

CREATE INDEX idx_grade_data_created_by ON grade_data (created_by);

-- ================================
-- 第五步：RLS策略设置
-- ================================

-- 启用行级安全
ALTER TABLE grade_data ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view their own grade data" ON grade_data;
DROP POLICY IF EXISTS "Users can create grade data" ON grade_data;
DROP POLICY IF EXISTS "Users can update their own grade data" ON grade_data;
DROP POLICY IF EXISTS "Users can delete their own grade data" ON grade_data;

-- 创建新的RLS策略
CREATE POLICY "Users can view their own grade data"
  ON grade_data FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create grade data"
  ON grade_data FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own grade data"
  ON grade_data FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own grade data"
  ON grade_data FOR DELETE
  USING (auth.uid() = created_by);

-- ================================
-- 第六步：创建统一的查询视图
-- ================================

-- 创建成绩数据统一查询视图
CREATE OR REPLACE VIEW unified_grade_view AS
SELECT 
    gd.id,
    gd.student_id,
    gd.name as student_name,
    gd.class_name,
    gd.exam_id,
    gd.exam_title,
    gd.exam_type,
    gd.exam_date,
    gd.exam_scope,
    
    -- 成绩字段
    gd.chinese_score,
    gd.math_score,
    gd.english_score,
    gd.physics_score,
    gd.chemistry_score,
    gd.biology_score,
    gd.politics_score,
    gd.history_score,
    gd.geography_score,
    gd.total_score,
    
    -- 等级字段
    gd.chinese_grade,
    gd.math_grade,
    gd.english_grade,
    gd.physics_grade,
    gd.chemistry_grade,
    gd.biology_grade,
    gd.politics_grade,
    gd.history_grade,
    gd.geography_grade,
    gd.total_grade,
    
    -- 排名字段
    gd.rank_in_class,
    gd.rank_in_grade,
    gd.rank_in_school,
    
    -- 计算字段
    CASE 
        WHEN gd.total_score >= 540 THEN 'A+'
        WHEN gd.total_score >= 480 THEN 'A'
        WHEN gd.total_score >= 420 THEN 'B+'
        WHEN gd.total_score >= 360 THEN 'B'
        WHEN gd.total_score >= 300 THEN 'C+'
        WHEN gd.total_score >= 240 THEN 'C'
        ELSE 'D'
    END as calculated_grade,
    
    -- 科目数量
    (CASE WHEN gd.chinese_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN gd.math_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN gd.english_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN gd.physics_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN gd.chemistry_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN gd.biology_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN gd.politics_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN gd.history_score IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN gd.geography_score IS NOT NULL THEN 1 ELSE 0 END) as subject_count,
    
    -- 元数据
    gd.metadata,
    gd.created_by,
    gd.created_at,
    gd.updated_at
    
FROM grade_data gd
ORDER BY gd.exam_date DESC, gd.class_name, gd.student_id;

-- ================================
-- 第七步：废弃冲突表（可选）
-- ================================

-- 重命名 grades 表为 grades_deprecated（保留数据但标记为废弃）
-- 注意：不直接删除，以防数据丢失
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades') THEN
        -- 重命名为废弃表
        ALTER TABLE grades RENAME TO grades_deprecated_backup;
        RAISE NOTICE '已将 grades 表重命名为 grades_deprecated_backup';
    END IF;
END $$;

-- ================================
-- 第八步：创建数据一致性检查函数
-- ================================

CREATE OR REPLACE FUNCTION check_grade_data_consistency() 
RETURNS TABLE(check_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
    -- 检查1：学生ID一致性
    RETURN QUERY
    SELECT 
        '学生ID一致性检查'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '通过' ELSE '失败' END::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '所有学生ID都存在于students表' 
             ELSE '发现 ' || COUNT(*) || ' 个不存在的学生ID' END::TEXT
    FROM (
        SELECT DISTINCT gd.student_id 
        FROM grade_data gd 
        LEFT JOIN students s ON gd.student_id = s.student_id 
        WHERE s.student_id IS NULL
    ) missing_students;
    
    -- 检查2：考试ID一致性
    RETURN QUERY
    SELECT 
        '考试ID一致性检查'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '通过' ELSE '失败' END::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '所有考试ID都存在于exams表' 
             ELSE '发现 ' || COUNT(*) || ' 个不存在的考试ID' END::TEXT
    FROM (
        SELECT DISTINCT gd.exam_id 
        FROM grade_data gd 
        LEFT JOIN exams e ON gd.exam_id = e.id 
        WHERE gd.exam_id IS NOT NULL AND e.id IS NULL
    ) missing_exams;
    
    -- 检查3：分数范围验证
    RETURN QUERY
    SELECT 
        '分数范围检查'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '通过' ELSE '警告' END::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '所有分数都在合理范围内' 
             ELSE '发现 ' || COUNT(*) || ' 个异常分数值' END::TEXT
    FROM grade_data
    WHERE (chinese_score < 0 OR chinese_score > 150) OR
          (math_score < 0 OR math_score > 150) OR
          (english_score < 0 OR english_score > 150) OR
          (physics_score < 0 OR physics_score > 100) OR
          (chemistry_score < 0 OR chemistry_score > 100) OR
          (biology_score < 0 OR biology_score > 100) OR
          (politics_score < 0 OR politics_score > 100) OR
          (history_score < 0 OR history_score > 100) OR
          (geography_score < 0 OR geography_score > 100) OR
          (total_score < 0 OR total_score > 900);
    
    -- 检查4：重复数据检查
    RETURN QUERY
    SELECT 
        '重复数据检查'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '通过' ELSE '警告' END::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '没有发现重复的学生-考试记录' 
             ELSE '发现 ' || COUNT(*) || ' 个重复的学生-考试记录' END::TEXT
    FROM (
        SELECT student_id, exam_id, COUNT(*) 
        FROM grade_data 
        WHERE exam_id IS NOT NULL
        GROUP BY student_id, exam_id 
        HAVING COUNT(*) > 1
    ) duplicates;
    
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 执行完成报告
-- ================================

DO $$
DECLARE
    grade_data_count INTEGER;
    exams_count INTEGER;
    students_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO grade_data_count FROM grade_data;
    SELECT COUNT(*) INTO exams_count FROM exams;
    SELECT COUNT(*) INTO students_count FROM students;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🎉 数据库整合完成！';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📊 当前数据统计:';
    RAISE NOTICE '   - grade_data 记录数: %', grade_data_count;
    RAISE NOTICE '   - exams 记录数: %', exams_count;
    RAISE NOTICE '   - students 记录数: %', students_count;
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ 主要改进:';
    RAISE NOTICE '   1. 统一使用 grade_data 表存储成绩';
    RAISE NOTICE '   2. 完整的字段结构支持所有科目';
    RAISE NOTICE '   3. 优化的索引提升查询性能';
    RAISE NOTICE '   4. 严格的数据验证和约束';
    RAISE NOTICE '   5. 完善的RLS安全策略';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🔧 后续建议:';
    RAISE NOTICE '   1. 运行: SELECT * FROM check_grade_data_consistency();';
    RAISE NOTICE '   2. 更新前端代码统一使用 grade_data 表';
    RAISE NOTICE '   3. 测试所有导入和查询功能';
    RAISE NOTICE '==========================================';
END $$;

-- 运行数据一致性检查
SELECT * FROM check_grade_data_consistency();