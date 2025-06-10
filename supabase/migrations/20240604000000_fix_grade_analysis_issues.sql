-- 修复成绩分析相关的数据库结构问题
-- 解决等级字段和总分字段的不一致问题

-- 1. 首先检查并添加缺失的字段
DO $$
BEGIN
    -- 检查 grade_data 表是否存在等级相关字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grade_data' AND column_name = 'grade_level'
    ) THEN
        ALTER TABLE grade_data ADD COLUMN grade_level TEXT;
        RAISE NOTICE '添加 grade_level 字段到 grade_data 表';
    END IF;
    
    -- 检查是否存在 subject_total_score 字段（每科目的满分）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grade_data' AND column_name = 'subject_total_score'
    ) THEN
        ALTER TABLE grade_data ADD COLUMN subject_total_score NUMERIC DEFAULT 100;
        RAISE NOTICE '添加 subject_total_score 字段到 grade_data 表';
    END IF;
    
    -- 检查是否存在 original_grade 字段（原始等级信息）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grade_data' AND column_name = 'original_grade'
    ) THEN
        ALTER TABLE grade_data ADD COLUMN original_grade TEXT;
        RAISE NOTICE '添加 original_grade 字段到 grade_data 表';
    END IF;
    
    -- 检查是否存在 computed_grade 字段（系统计算的等级）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'grade_data' AND column_name = 'computed_grade'
    ) THEN
        ALTER TABLE grade_data ADD COLUMN computed_grade TEXT;
        RAISE NOTICE '添加 computed_grade 字段到 grade_data 表';
    END IF;
END $$;

-- 2. 创建等级配置表
CREATE TABLE IF NOT EXISTS grade_level_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 配置名称，如 "默认配置"、"高考配置"等
    description TEXT,
    levels JSONB NOT NULL, -- 等级配置，格式: [{"level": "A", "min_score": 90, "max_score": 100}, ...]
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. 插入默认等级配置
INSERT INTO grade_level_config (name, description, levels, is_default)
VALUES (
    '标准五级制',
    '标准的A、B、C、D、E五级制评分',
    '[
        {"level": "A", "min_score": 90, "max_score": 100, "description": "优秀"},
        {"level": "B", "min_score": 80, "max_score": 89, "description": "良好"},
        {"level": "C", "min_score": 70, "max_score": 79, "description": "中等"},
        {"level": "D", "min_score": 60, "max_score": 69, "description": "及格"},
        {"level": "E", "min_score": 0, "max_score": 59, "description": "不及格"}
    ]'::jsonb,
    true
) ON CONFLICT (name) DO NOTHING;

-- 4. 创建计算等级的函数
CREATE OR REPLACE FUNCTION calculate_grade_level(
    p_score NUMERIC,
    p_total_score NUMERIC DEFAULT 100,
    p_config_name TEXT DEFAULT '标准五级制'
)
RETURNS TEXT AS $$
DECLARE
    level_config JSONB;
    level_item JSONB;
    percentage NUMERIC;
BEGIN
    -- 获取等级配置
    SELECT levels INTO level_config
    FROM grade_level_config
    WHERE name = p_config_name;
    
    IF level_config IS NULL THEN
        RETURN 'C'; -- 默认返回中等
    END IF;
    
    -- 计算百分比分数
    percentage := (p_score / NULLIF(p_total_score, 0)) * 100;
    
    -- 遍历等级配置找到匹配的等级
    FOR level_item IN SELECT * FROM jsonb_array_elements(level_config)
    LOOP
        IF percentage >= (level_item->>'min_score')::NUMERIC 
           AND percentage <= (level_item->>'max_score')::NUMERIC THEN
            RETURN level_item->>'level';
        END IF;
    END LOOP;
    
    -- 如果没有匹配的等级，返回最低等级
    RETURN 'E';
END;
$$ LANGUAGE plpgsql;

-- 5. 创建更新计算等级的函数
CREATE OR REPLACE FUNCTION update_computed_grades(p_exam_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- 更新计算等级
    WITH updated AS (
        UPDATE grade_data 
        SET 
            computed_grade = calculate_grade_level(
                COALESCE(score, total_score), 
                COALESCE(subject_total_score, 100)
            ),
            updated_at = now()
        WHERE 
            (p_exam_id IS NULL OR exam_id = p_exam_id)
            AND (score IS NOT NULL OR total_score IS NOT NULL)
        RETURNING id
    )
    SELECT COUNT(*) INTO updated_count FROM updated;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建获取有效等级的函数（优先使用原始等级，然后是计算等级）
CREATE OR REPLACE FUNCTION get_effective_grade(
    p_original_grade TEXT,
    p_computed_grade TEXT,
    p_grade TEXT
)
RETURNS TEXT AS $$
BEGIN
    -- 优先级：original_grade > grade > computed_grade
    IF p_original_grade IS NOT NULL AND p_original_grade != '' THEN
        RETURN p_original_grade;
    END IF;
    
    IF p_grade IS NOT NULL AND p_grade != '' THEN
        RETURN p_grade;
    END IF;
    
    RETURN COALESCE(p_computed_grade, 'C');
END;
$$ LANGUAGE plpgsql;

-- 7. 创建获取有效分数的函数（优先使用score，然后是total_score）
CREATE OR REPLACE FUNCTION get_effective_score(
    p_score NUMERIC,
    p_total_score NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN COALESCE(p_score, p_total_score, 0);
END;
$$ LANGUAGE plpgsql;

-- 8. 更新现有数据的计算等级
SELECT update_computed_grades();

-- 9. 创建触发器，在插入或更新时自动计算等级
CREATE OR REPLACE FUNCTION auto_calculate_grade()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果没有原始等级，自动计算等级
    IF NEW.computed_grade IS NULL OR NEW.computed_grade = '' THEN
        NEW.computed_grade := calculate_grade_level(
            COALESCE(NEW.score, NEW.total_score),
            COALESCE(NEW.subject_total_score, 100)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_auto_calculate_grade ON grade_data;

-- 创建新触发器
CREATE TRIGGER trigger_auto_calculate_grade
    BEFORE INSERT OR UPDATE ON grade_data
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_grade();

-- 10. 创建查询视图，简化数据访问
CREATE OR REPLACE VIEW grade_analysis_view AS
SELECT 
    id,
    exam_id,
    student_id,
    name,
    class_name,
    subject,
    get_effective_score(score, total_score) as effective_score,
    score as original_score,
    total_score,
    subject_total_score,
    get_effective_grade(original_grade, computed_grade, grade) as effective_grade,
    original_grade,
    computed_grade,
    grade as legacy_grade,
    rank_in_class,
    rank_in_grade,
    percentile,
    z_score,
    exam_date,
    exam_type,
    exam_title,
    exam_scope,
    created_at,
    updated_at
FROM grade_data;

-- 11. 添加注释说明
COMMENT ON COLUMN grade_data.score IS '单科分数或总分';
COMMENT ON COLUMN grade_data.total_score IS '总分（当有多科时使用）';
COMMENT ON COLUMN grade_data.subject_total_score IS '该科目的满分';
COMMENT ON COLUMN grade_data.original_grade IS '原始等级（从CSV导入的等级）';
COMMENT ON COLUMN grade_data.computed_grade IS '计算等级（系统自动计算）';
COMMENT ON COLUMN grade_data.grade IS '等级字段（向后兼容）';

COMMENT ON FUNCTION get_effective_grade(TEXT, TEXT, TEXT) IS '获取有效等级：优先使用原始等级，然后是旧等级，最后是计算等级';
COMMENT ON FUNCTION get_effective_score(NUMERIC, NUMERIC) IS '获取有效分数：优先使用score，然后是total_score';
COMMENT ON FUNCTION calculate_grade_level(NUMERIC, NUMERIC, TEXT) IS '根据分数和配置计算等级';

-- 12. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_grade_data_effective_score ON grade_data USING btree (COALESCE(score, total_score));
CREATE INDEX IF NOT EXISTS idx_grade_data_subject_total_score ON grade_data(subject_total_score);
CREATE INDEX IF NOT EXISTS idx_grade_data_computed_grade ON grade_data(computed_grade);

RAISE NOTICE '✅ 成绩分析数据库结构修复完成';
RAISE NOTICE '   - 添加了等级和总分相关字段';
RAISE NOTICE '   - 创建了等级配置表和计算函数';
RAISE NOTICE '   - 创建了数据访问视图';
RAISE NOTICE '   - 更新了现有数据的计算等级'; 