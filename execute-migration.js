/**
 * 执行数据库迁移脚本
 * 直接创建缺失的存储过程
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

console.log('🚀 开始执行数据库迁移...\n');

// 分别执行每个函数的创建语句
const functions = [
  {
    name: 'get_warnings_by_type',
    sql: `
CREATE OR REPLACE FUNCTION get_warnings_by_type()
RETURNS TABLE (
  type TEXT,
  count BIGINT,
  percentage NUMERIC,
  trend TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH warning_counts AS (
    SELECT
      COALESCE((wr.details->>'type')::TEXT, '未分类') as warning_type,
      COUNT(*) as warning_count
    FROM warning_records wr
    WHERE wr.status = 'active'
      AND wr.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY COALESCE((wr.details->>'type')::TEXT, '未分类')
  ),
  total_warnings AS (
    SELECT GREATEST(SUM(warning_count), 1) as total_count FROM warning_counts
  )
  SELECT
    wc.warning_type as type,
    wc.warning_count as count,
    ROUND((wc.warning_count::NUMERIC / tw.total_count) * 100, 1) as percentage,
    'unchanged'::TEXT as trend
  FROM warning_counts wc
  CROSS JOIN total_warnings tw
  ORDER BY wc.warning_count DESC;
END;
$$;`
  },
  {
    name: 'get_risk_by_class',
    sql: `
CREATE OR REPLACE FUNCTION get_risk_by_class()
RETURNS TABLE (
  class_name TEXT,
  student_count BIGINT,
  warning_count BIGINT,
  risk_level TEXT,
  avg_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH class_warnings AS (
    SELECT
      s.class_name,
      COUNT(DISTINCT s.student_id) as students,
      COUNT(wr.id) as warnings
    FROM students s
    LEFT JOIN warning_records wr ON s.student_id = wr.student_id
      AND wr.status = 'active'
    WHERE s.class_name IS NOT NULL
      AND s.class_name != '未知班级'
    GROUP BY s.class_name
  ),
  class_grades AS (
    SELECT
      gd.class_name,
      AVG(gd.total_score) as avg_total_score
    FROM grade_data_new gd
    WHERE gd.class_name IS NOT NULL
      AND gd.total_score IS NOT NULL
    GROUP BY gd.class_name
  )
  SELECT
    cw.class_name,
    cw.students as student_count,
    cw.warnings as warning_count,
    CASE
      WHEN cw.warnings >= 5 THEN 'high'::TEXT
      WHEN cw.warnings >= 2 THEN 'medium'::TEXT
      ELSE 'low'::TEXT
    END as risk_level,
    ROUND(COALESCE(cg.avg_total_score, 0), 1) as avg_score
  FROM class_warnings cw
  LEFT JOIN class_grades cg ON cw.class_name = cg.class_name
  ORDER BY cw.warnings DESC, cw.class_name;
END;
$$;`
  },
  {
    name: 'get_common_risk_factors',
    sql: `
CREATE OR REPLACE FUNCTION get_common_risk_factors()
RETURNS TABLE (
  factor TEXT,
  count BIGINT,
  percentage NUMERIC,
  severity TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH risk_factors AS (
    SELECT
      COALESCE((wr.details->>'factor')::TEXT, '综合风险') as risk_factor,
      COALESCE((wr.details->>'severity')::TEXT, 'medium') as risk_severity,
      COUNT(*) as factor_count
    FROM warning_records wr
    WHERE wr.status = 'active'
      AND wr.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY COALESCE((wr.details->>'factor')::TEXT, '综合风险'), COALESCE((wr.details->>'severity')::TEXT, 'medium')
  ),
  total_factors AS (
    SELECT GREATEST(SUM(factor_count), 1) as total_count FROM risk_factors
  )
  SELECT
    rf.risk_factor as factor,
    rf.factor_count as count,
    ROUND((rf.factor_count::NUMERIC / tf.total_count) * 100, 1) as percentage,
    rf.risk_severity as severity
  FROM risk_factors rf
  CROSS JOIN total_factors tf
  ORDER BY rf.factor_count DESC
  LIMIT 10;
END;
$$;`
  },
  {
    name: 'get_class_portrait_stats',
    sql: `
CREATE OR REPLACE FUNCTION get_class_portrait_stats(input_class_name TEXT)
RETURNS TABLE (
  class_name TEXT,
  student_count BIGINT,
  average_score NUMERIC,
  excellent_rate NUMERIC,
  pass_rate NUMERIC,
  gender_stats JSONB,
  subject_stats JSONB,
  grade_records BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_class_name TEXT;
BEGIN
  -- 智能班级名称解析
  resolved_class_name := input_class_name;

  -- 如果是class-前缀格式，进行解析
  IF input_class_name LIKE 'class-%' THEN
    resolved_class_name := REPLACE(REPLACE(input_class_name, 'class-', ''), '-', '');

    -- 如果解析后不像班级名称，尝试匹配
    IF resolved_class_name NOT LIKE '%班%' AND resolved_class_name NOT LIKE '%级%' THEN
      SELECT s.class_name INTO resolved_class_name
      FROM students s
      WHERE s.class_name IS NOT NULL
        AND (
          LOWER(s.class_name) LIKE '%' || LOWER(resolved_class_name) || '%' OR
          LOWER(resolved_class_name) LIKE '%' || LOWER(s.class_name) || '%'
        )
      LIMIT 1;
    END IF;
  END IF;

  RETURN QUERY
  WITH student_data AS (
    SELECT
      s.student_id,
      s.gender,
      s.class_name as real_class_name
    FROM students s
    WHERE s.class_name = resolved_class_name
  ),
  grade_data AS (
    SELECT
      gd.student_id,
      gd.total_score,
      gd.chinese_score,
      gd.math_score,
      gd.english_score,
      gd.physics_score,
      gd.chemistry_score
    FROM grade_data_new gd
    WHERE gd.class_name = resolved_class_name
      AND gd.total_score IS NOT NULL
  ),
  stats_calculation AS (
    SELECT
      resolved_class_name as calc_class_name,
      COUNT(DISTINCT sd.student_id) as total_students,
      COUNT(gd.total_score) as total_grades,
      AVG(gd.total_score) as avg_score,
      COUNT(CASE WHEN gd.total_score >= 400 THEN 1 END) as excellent_count,
      COUNT(CASE WHEN gd.total_score >= 300 THEN 1 END) as pass_count,

      -- 性别统计
      COUNT(CASE WHEN sd.gender = '男' THEN 1 END) as male_count,
      COUNT(CASE WHEN sd.gender = '女' THEN 1 END) as female_count,
      COUNT(CASE WHEN sd.gender NOT IN ('男', '女') OR sd.gender IS NULL THEN 1 END) as other_count,

      -- 科目统计
      AVG(gd.chinese_score) as avg_chinese,
      AVG(gd.math_score) as avg_math,
      AVG(gd.english_score) as avg_english,
      AVG(gd.physics_score) as avg_physics,
      AVG(gd.chemistry_score) as avg_chemistry,

      COUNT(CASE WHEN gd.chinese_score >= 85 THEN 1 END) as chinese_excellent,
      COUNT(CASE WHEN gd.chinese_score >= 60 THEN 1 END) as chinese_pass,
      COUNT(CASE WHEN gd.math_score >= 85 THEN 1 END) as math_excellent,
      COUNT(CASE WHEN gd.math_score >= 60 THEN 1 END) as math_pass,
      COUNT(CASE WHEN gd.english_score >= 85 THEN 1 END) as english_excellent,
      COUNT(CASE WHEN gd.english_score >= 60 THEN 1 END) as english_pass
    FROM student_data sd
    LEFT JOIN grade_data gd ON sd.student_id = gd.student_id
  )
  SELECT
    sc.calc_class_name,
    sc.total_students,
    ROUND(COALESCE(sc.avg_score, 0), 1),
    ROUND(COALESCE((sc.excellent_count::NUMERIC / GREATEST(sc.total_grades, 1)) * 100, 0), 1) as excellent_rate,
    ROUND(COALESCE((sc.pass_count::NUMERIC / GREATEST(sc.total_grades, 1)) * 100, 0), 1) as pass_rate,

    -- 性别分布JSON
    jsonb_build_object(
      'male', sc.male_count,
      'female', sc.female_count,
      'other', sc.other_count
    ) as gender_stats,

    -- 科目统计JSON
    jsonb_build_array(
      jsonb_build_object('name', '语文', 'averageScore', ROUND(COALESCE(sc.avg_chinese, 0), 1), 'excellentCount', sc.chinese_excellent, 'passingCount', sc.chinese_pass),
      jsonb_build_object('name', '数学', 'averageScore', ROUND(COALESCE(sc.avg_math, 0), 1), 'excellentCount', sc.math_excellent, 'passingCount', sc.math_pass),
      jsonb_build_object('name', '英语', 'averageScore', ROUND(COALESCE(sc.avg_english, 0), 1), 'excellentCount', sc.english_excellent, 'passingCount', sc.english_pass),
      jsonb_build_object('name', '物理', 'averageScore', ROUND(COALESCE(sc.avg_physics, 0), 1), 'excellentCount', 0, 'passingCount', 0),
      jsonb_build_object('name', '化学', 'averageScore', ROUND(COALESCE(sc.avg_chemistry, 0), 1), 'excellentCount', 0, 'passingCount', 0)
    ) as subject_stats,

    sc.total_grades
  FROM stats_calculation sc;
END;
$$;`
  }
];

async function executeFunction(func) {
  console.log(`🔧 创建函数: ${func.name}...`);

  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: func.sql
    });

    if (error) {
      console.log(`❌ ${func.name} 创建失败: ${error.message}`);
      // 尝试直接通过raw SQL执行
      return false;
    } else {
      console.log(`✅ ${func.name} 创建成功`);
      return true;
    }
  } catch (err) {
    console.log(`❌ ${func.name} 执行异常: ${err.message}`);
    return false;
  }
}

async function testFunction(funcName, params = {}) {
  console.log(`🧪 测试函数: ${funcName}...`);

  try {
    const { data, error } = await supabase.rpc(funcName, params);

    if (error) {
      console.log(`❌ ${funcName} 测试失败: ${error.message}`);
      return false;
    } else {
      console.log(`✅ ${funcName} 测试成功，返回 ${data?.length || 0} 条记录`);
      if (data && data.length > 0) {
        console.log('   示例数据:', data[0]);
      }
      return true;
    }
  } catch (err) {
    console.log(`❌ ${funcName} 测试异常: ${err.message}`);
    return false;
  }
}

async function executeMigration() {
  console.log('=== 开始创建存储过程 ===\n');

  // 由于无法直接执行DDL，我们采用迂回策略
  // 先测试现有函数状态
  console.log('🔍 检查现有函数状态...\n');

  const testResults = [];

  // 测试预警类型分布
  testResults.push({
    name: 'get_warnings_by_type',
    success: await testFunction('get_warnings_by_type')
  });

  // 测试班级风险分布
  testResults.push({
    name: 'get_risk_by_class',
    success: await testFunction('get_risk_by_class')
  });

  // 测试风险因素
  testResults.push({
    name: 'get_common_risk_factors',
    success: await testFunction('get_common_risk_factors')
  });

  // 测试班级画像
  testResults.push({
    name: 'get_class_portrait_stats',
    success: await testFunction('get_class_portrait_stats', { input_class_name: '初三7班' })
  });

  console.log('\n=== 测试结果汇总 ===');
  testResults.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}: ${result.success ? '可用' : '需要创建'}`);
  });

  const needsCreation = testResults.filter(r => !r.success);
  if (needsCreation.length === 0) {
    console.log('\n🎉 所有函数都已存在并可用！');
  } else {
    console.log(`\n⚠️ 需要创建 ${needsCreation.length} 个函数`);
    console.log('由于权限限制，需要通过Supabase Dashboard手动创建');

    console.log('\n📋 创建SQL脚本已准备在 supabase/migrations/20241219_create_missing_functions.sql');
  }
}

executeMigration().catch(console.error);