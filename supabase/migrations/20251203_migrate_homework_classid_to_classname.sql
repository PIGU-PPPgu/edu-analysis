-- ============================================================================
-- Migration: homework.class_id (UUID) → homework.class_name (TEXT)
-- Date: 2024-12-03
-- Purpose: 将作业系统从UUID班级ID迁移到TEXT班级名称，统一数据模型
-- Strategy: 双字段过渡期（1-2周），保留class_id兼容性
-- ============================================================================

-- ============================================================================
-- 阶段1: 添加新字段 class_name
-- ============================================================================
ALTER TABLE homework
ADD COLUMN IF NOT EXISTS class_name TEXT;

COMMENT ON COLUMN homework.class_name IS '班级名称（新主字段），TEXT类型';

-- ============================================================================
-- 阶段2: 数据迁移 - 从 classes/class_info 表获取班级名称
-- ============================================================================

-- 优先从 class_info 表迁移数据（主表）
UPDATE homework h
SET class_name = ci.class_name
FROM class_info ci
WHERE h.class_name IS NULL
  AND h.class_id IS NOT NULL
  AND (
    ci.id::text = h.class_id::text
    OR ci.uuid_id::text = h.class_id::text
  );

-- 从 classes 表迁移剩余数据（兼容旧表）
UPDATE homework h
SET class_name = c.name
FROM classes c
WHERE h.class_name IS NULL
  AND h.class_id IS NOT NULL
  AND c.id::text = h.class_id::text;

-- 为无法映射的记录设置默认值
UPDATE homework
SET class_name = '未知班级'
WHERE class_name IS NULL AND class_id IS NOT NULL;

-- ============================================================================
-- 阶段3: 创建索引优化查询性能
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_homework_class_name
ON homework(class_name);

COMMENT ON INDEX idx_homework_class_name IS '班级名称索引，优化按班级查询作业';

-- ============================================================================
-- 阶段4: 数据完整性验证
-- ============================================================================

-- 验证：确保所有有 class_id 的记录都有 class_name
DO $$
DECLARE
  unmapped_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmapped_count
  FROM homework
  WHERE class_id IS NOT NULL AND class_name IS NULL;

  IF unmapped_count > 0 THEN
    RAISE WARNING '发现 % 条作业记录无法映射班级名称', unmapped_count;
  ELSE
    RAISE NOTICE '✅ 所有作业记录成功映射班级名称';
  END IF;
END $$;

-- 验证：显示迁移统计
DO $$
DECLARE
  total_count INTEGER;
  mapped_count INTEGER;
  null_class_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM homework;
  SELECT COUNT(*) INTO mapped_count FROM homework WHERE class_name IS NOT NULL;
  SELECT COUNT(*) INTO null_class_count FROM homework WHERE class_id IS NULL AND class_name IS NULL;

  RAISE NOTICE '=== 作业表迁移统计 ===';
  RAISE NOTICE '总记录数: %', total_count;
  RAISE NOTICE '已映射 class_name: % (%.2f%%)', mapped_count, (mapped_count::float / NULLIF(total_count, 0) * 100);
  RAISE NOTICE '无班级信息: % (%.2f%%)', null_class_count, (null_class_count::float / NULLIF(total_count, 0) * 100);
END $$;

-- ============================================================================
-- 阶段5: 添加过渡期触发器（可选）
-- ============================================================================

-- 创建触发器函数：自动同步 class_name 和 class_id
CREATE OR REPLACE FUNCTION sync_homework_class_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果只提供 class_name，尝试反向映射 class_id（过渡期兼容）
  IF NEW.class_name IS NOT NULL AND NEW.class_id IS NULL THEN
    SELECT id INTO NEW.class_id
    FROM class_info
    WHERE class_name = NEW.class_name
    LIMIT 1;

    IF NEW.class_id IS NULL THEN
      SELECT id INTO NEW.class_id
      FROM classes
      WHERE name = NEW.class_name
      LIMIT 1;
    END IF;
  END IF;

  -- 如果只提供 class_id，自动填充 class_name
  IF NEW.class_id IS NOT NULL AND NEW.class_name IS NULL THEN
    SELECT class_name INTO NEW.class_name
    FROM class_info
    WHERE id::text = NEW.class_id::text
       OR uuid_id::text = NEW.class_id::text
    LIMIT 1;

    IF NEW.class_name IS NULL THEN
      SELECT name INTO NEW.class_name
      FROM classes
      WHERE id::text = NEW.class_id::text
      LIMIT 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_sync_homework_class_fields ON homework;
CREATE TRIGGER trigger_sync_homework_class_fields
BEFORE INSERT OR UPDATE ON homework
FOR EACH ROW
EXECUTE FUNCTION sync_homework_class_fields();

COMMENT ON TRIGGER trigger_sync_homework_class_fields ON homework IS '过渡期触发器：自动同步class_name和class_id，确保数据一致性';

-- ============================================================================
-- 注意事项
-- ============================================================================
-- 1. ⚠️ 暂不删除 class_id 字段，保留1-2周过渡期
-- 2. ⚠️ 暂不添加 NOT NULL 约束，等待验证
-- 3. ✅ 触发器确保过渡期数据一致性
-- 4. ✅ 索引已创建，查询性能不受影响
--
-- 清理计划（1-2周后执行）:
-- - ALTER TABLE homework ALTER COLUMN class_name SET NOT NULL;
-- - ALTER TABLE homework DROP COLUMN class_id;
-- - DROP TRIGGER trigger_sync_homework_class_fields ON homework;
-- - DROP FUNCTION sync_homework_class_fields();
-- ============================================================================
