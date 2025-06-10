#!/usr/bin/env node

/**
 * 快速数据库修复脚本
 * 专门解决当前遇到的问题：
 * 1. 添加缺失的字段
 * 2. 创建必要的函数
 * 3. 修复班级匹配问题
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 开始快速数据库修复...\n');

/**
 * 执行SQL查询
 */
async function executeSql(query, description) {
  try {
    console.log(`🔍 ${description}...`);
    const { data, error } = await supabase.rpc('sql', { query });
    
    if (error) {
      console.log(`❌ ${description}失败:`, error.message);
      return false;
    } else {
      console.log(`✅ ${description}成功`);
      return true;
    }
  } catch (error) {
    console.log(`❌ ${description}失败:`, error.message);
    return false;
  }
}

/**
 * 检查字段是否存在
 */
async function checkFieldExists(tableName, fieldName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', tableName)
      .eq('column_name', fieldName);
    
    return !error && data && data.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * 添加缺失的字段
 */
async function addMissingFields() {
  console.log('📋 添加缺失的字段到grade_data表...');
  
  const fieldsToAdd = [
    { name: 'grade_level', type: 'text', description: '年级' },
    { name: 'subject_total_score', type: 'numeric', description: '科目满分' },
    { name: 'original_grade', type: 'text', description: '原始等级' },
    { name: 'computed_grade', type: 'text', description: '计算等级' }
  ];
  
  for (const field of fieldsToAdd) {
    const exists = await checkFieldExists('grade_data', field.name);
    
    if (!exists) {
      const query = `ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS ${field.name} ${field.type};`;
      const success = await executeSql(query, `添加字段 ${field.name} (${field.description})`);
      
      if (success) {
        // 设置默认值
        if (field.name === 'subject_total_score') {
          await executeSql(
            `UPDATE grade_data SET ${field.name} = 100 WHERE ${field.name} IS NULL;`,
            `设置 ${field.name} 默认值为100`
          );
        }
      }
    } else {
      console.log(`✅ 字段 ${field.name} 已存在`);
    }
  }
}

/**
 * 创建grade_level_config表
 */
async function createGradeLevelConfigTable() {
  console.log('\n📋 创建等级配置表...');
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS grade_level_config (
      id SERIAL PRIMARY KEY,
      config_name TEXT NOT NULL,
      grade_levels JSONB NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  const success = await executeSql(createTableQuery, '创建grade_level_config表');
  
  if (success) {
    // 插入默认配置
    const insertDefaultConfig = `
      INSERT INTO grade_level_config (config_name, grade_levels, is_default, description)
      VALUES (
        '标准5级制',
        '[
          {"grade": "A", "name": "优秀", "min_score": 90, "max_score": 100},
          {"grade": "B", "name": "良好", "min_score": 80, "max_score": 89},
          {"grade": "C", "name": "中等", "min_score": 70, "max_score": 79},
          {"grade": "D", "name": "及格", "min_score": 60, "max_score": 69},
          {"grade": "F", "name": "不及格", "min_score": 0, "max_score": 59}
        ]'::jsonb,
        true,
        '标准的5级等级制度'
      )
      ON CONFLICT DO NOTHING;
    `;
    
    await executeSql(insertDefaultConfig, '插入默认等级配置');
  }
}

/**
 * 创建必要的函数
 */
async function createNecessaryFunctions() {
  console.log('\n🔧 创建必要的数据库函数...');
  
  // 创建has_column函数
  const hasColumnFunction = `
    CREATE OR REPLACE FUNCTION has_column(table_name_param text, column_name_param text)
    RETURNS boolean
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1
        FROM information_schema.columns 
        WHERE table_name = table_name_param 
        AND column_name = column_name_param
        AND table_schema = 'public'
      );
    END;
    $$;
  `;
  
  await executeSql(hasColumnFunction, '创建has_column函数');
  
  // 创建等级计算函数
  const calculateGradeLevelFunction = `
    CREATE OR REPLACE FUNCTION calculate_grade_level(score_value numeric, total_score_value numeric DEFAULT 100)
    RETURNS text
    LANGUAGE plpgsql
    AS $$
    DECLARE
      percentage numeric;
      config_data jsonb;
      grade_level text;
      level jsonb;
    BEGIN
      -- 计算百分比
      percentage := (score_value / total_score_value) * 100;
      
      -- 获取默认等级配置
      SELECT grade_levels INTO config_data
      FROM grade_level_config
      WHERE is_default = true
      LIMIT 1;
      
      -- 如果没有配置，使用默认规则
      IF config_data IS NULL THEN
        IF percentage >= 90 THEN
          RETURN 'A';
        ELSIF percentage >= 80 THEN
          RETURN 'B';
        ELSIF percentage >= 70 THEN
          RETURN 'C';
        ELSIF percentage >= 60 THEN
          RETURN 'D';
        ELSE
          RETURN 'F';
        END IF;
      END IF;
      
      -- 使用配置的等级规则
      FOR level IN SELECT * FROM jsonb_array_elements(config_data)
      LOOP
        IF percentage >= (level->>'min_score')::numeric AND 
           percentage <= (level->>'max_score')::numeric THEN
          RETURN level->>'grade';
        END IF;
      END LOOP;
      
      RETURN 'F'; -- 默认返回F
    END;
    $$;
  `;
  
  await executeSql(calculateGradeLevelFunction, '创建calculate_grade_level函数');
  
  // 创建有效分数获取函数
  const getEffectiveScoreFunction = `
    CREATE OR REPLACE FUNCTION get_effective_score(score_value numeric, total_score_value numeric)
    RETURNS numeric
    LANGUAGE plpgsql
    AS $$
    BEGIN
      -- 优先使用score字段，如果为空则使用total_score
      RETURN COALESCE(score_value, total_score_value);
    END;
    $$;
  `;
  
  await executeSql(getEffectiveScoreFunction, '创建get_effective_score函数');
  
  // 创建有效等级获取函数
  const getEffectiveGradeFunction = `
    CREATE OR REPLACE FUNCTION get_effective_grade(original_grade text, computed_grade text)
    RETURNS text
    LANGUAGE plpgsql
    AS $$
    BEGIN
      -- 优先级：original_grade > computed_grade
      RETURN COALESCE(original_grade, computed_grade, 'N/A');
    END;
    $$;
  `;
  
  await executeSql(getEffectiveGradeFunction, '创建get_effective_grade函数');
}

/**
 * 修复班级数据
 */
async function fixClassData() {
  console.log('\n🏫 修复班级数据...');
  
  // 检查班级数据分布
  try {
    const { data: classData, error } = await supabase
      .from('grade_data')
      .select('class_name, count(*)')
      .not('class_name', 'is', null);
    
    if (error) {
      console.log('❌ 无法获取班级数据:', error.message);
      return;
    }
    
    console.log('班级数据分布:');
    if (classData && classData.length > 0) {
      classData.forEach(item => {
        console.log(`  ${item.class_name}: ${item.count || 0} 条记录`);
      });
    }
    
    // 检查"未知班级"的数量
    const { data: unknownData, error: unknownError } = await supabase
      .from('grade_data')
      .select('*', { count: 'exact' })
      .or('class_name.is.null,class_name.eq.未知班级');
    
    if (!unknownError && unknownData) {
      console.log(`⚠️  "未知班级"或NULL班级记录数量: ${unknownData.length}`);
      
      if (unknownData.length > 0) {
        console.log('📝 "未知班级"记录示例:');
        unknownData.slice(0, 3).forEach((record, index) => {
          console.log(`  ${index + 1}. 学号: ${record.student_id}, 姓名: ${record.name}, 班级: ${record.class_name || 'NULL'}`);
        });
      }
    }
    
  } catch (error) {
    console.log('❌ 检查班级数据时出错:', error.message);
  }
}

/**
 * 主修复函数
 */
async function runQuickFix() {
  console.log('🚀 快速数据库修复开始\n');
  console.log('=' .repeat(50));
  
  // 执行修复步骤
  await addMissingFields();
  await createGradeLevelConfigTable();
  await createNecessaryFunctions();
  await fixClassData();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 快速修复完成！');
  
  console.log('\n📝 修复摘要:');
  console.log('✅ 添加了缺失的字段到grade_data表');
  console.log('✅ 创建了grade_level_config表和默认配置');
  console.log('✅ 创建了必要的数据库函数');
  console.log('✅ 检查了班级数据状态');
  
  console.log('\n🎯 下一步:');
  console.log('1. 重新测试成绩导入功能');
  console.log('2. 检查班级匹配是否正常');
  console.log('3. 验证AI功能配置');
}

// 运行修复
runQuickFix().catch(console.error); 