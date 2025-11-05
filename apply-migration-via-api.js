/**
 * 通过 Supabase REST API 执行数据库迁移
 * 直接创建缺失的 exam_subject_scores 表
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从环境变量获取配置或使用默认值
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mjqaynpqwwdbrtlcwkla.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.log('⚠️ 没有找到 Service Role Key，尝试通过 SQL Editor 方式...');
  console.log('请在 Supabase Dashboard 的 SQL Editor 中执行 apply-migrations.sql 文件');
  process.exit(0);
}

// SQL 迁移内容
const MIGRATION_SQL = `
-- 创建 exam_subject_scores 表
CREATE TABLE IF NOT EXISTS "public"."exam_subject_scores" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES "public"."exams"(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    total_score NUMERIC NOT NULL DEFAULT 100,
    passing_score NUMERIC,
    excellent_score NUMERIC,
    is_required BOOLEAN DEFAULT true,
    weight NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(exam_id, subject_code)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_exam_subject_scores_exam_id ON "public"."exam_subject_scores"(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_subject_scores_subject_code ON "public"."exam_subject_scores"(subject_code);

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_exam_subject_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_exam_subject_scores_updated_at
    BEFORE UPDATE ON "public"."exam_subject_scores"
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_subject_scores_updated_at();
`;

async function executeSQL(sql) {
  try {
    console.log('🚀 开始执行 SQL 迁移...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        sql: sql
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('✅ SQL 执行成功:', result);
    return true;
    
  } catch (error) {
    console.error('❌ SQL 执行失败:', error.message);
    return false;
  }
}

async function checkTableExists(tableName) {
  try {
    console.log(`🔍 检查表 ${tableName} 是否存在...`);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });

    if (response.ok) {
      console.log(`✅ 表 ${tableName} 存在`);
      return true;
    } else if (response.status === 404 || response.status === 400) {
      console.log(`❌ 表 ${tableName} 不存在`);
      return false;
    } else {
      console.log(`⚠️ 检查表 ${tableName} 时出错: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 检查表 ${tableName} 失败:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 开始数据库迁移过程...\n');

  // 检查表是否已存在
  const examSubjectScoresExists = await checkTableExists('exam_subject_scores');
  
  if (examSubjectScoresExists) {
    console.log('✅ exam_subject_scores 表已存在，无需迁移');
    console.log('🎉 科目总分设置功能应该已经可以正常工作！');
    return;
  }

  console.log('📝 准备创建 exam_subject_scores 表...');
  
  // 执行迁移
  const success = await executeSQL(MIGRATION_SQL);
  
  if (success) {
    console.log('\n🎉 迁移执行成功！');
    
    // 再次验证表是否创建成功
    console.log('\n🔍 验证表创建结果...');
    const verifyExists = await checkTableExists('exam_subject_scores');
    
    if (verifyExists) {
      console.log('✅ 验证成功：exam_subject_scores 表已创建');
      console.log('🎯 科目总分设置功能现在应该可以正常工作了！');
      
      // 为现有考试创建默认配置
      console.log('\n📋 为现有考试创建默认科目配置...');
      await createDefaultSubjectScores();
      
    } else {
      console.log('❌ 验证失败：表可能没有正确创建');
    }
  } else {
    console.log('\n❌ 迁移失败，请手动在 Supabase Dashboard 中执行 apply-migrations.sql');
  }
}

async function createDefaultSubjectScores() {
  try {
    // 获取现有考试
    const examResponse = await fetch(`${SUPABASE_URL}/rest/v1/exams?select=id`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });

    if (!examResponse.ok) {
      console.log('⚠️ 无法获取现有考试列表');
      return;
    }

    const exams = await examResponse.json();
    console.log(`📊 找到 ${exams.length} 个现有考试`);

    if (exams.length === 0) {
      console.log('ℹ️ 没有现有考试，跳过默认配置创建');
      return;
    }

    // 为每个考试创建默认科目配置
    const subjects = [
      { code: 'chinese', name: '语文' },
      { code: 'math', name: '数学' },
      { code: 'english', name: '英语' },
      { code: 'physics', name: '物理' },
      { code: 'chemistry', name: '化学' },
      { code: 'biology', name: '生物' },
      { code: 'politics', name: '政治' },
      { code: 'history', name: '历史' },
      { code: 'geography', name: '地理' }
    ];

    const defaultConfigs = [];
    
    exams.forEach(exam => {
      subjects.forEach(subject => {
        defaultConfigs.push({
          exam_id: exam.id,
          subject_code: subject.code,
          subject_name: subject.name,
          total_score: 100,
          passing_score: 60,
          excellent_score: 90,
          is_required: ['chinese', 'math', 'english'].includes(subject.code),
          weight: 1.0
        });
      });
    });

    // 批量插入配置
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/exam_subject_scores`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify(defaultConfigs)
    });

    if (insertResponse.ok) {
      console.log(`✅ 成功为 ${exams.length} 个考试创建了默认科目配置`);
    } else {
      console.log('⚠️ 创建默认配置时出现问题，但表已创建成功');
    }

  } catch (error) {
    console.log('⚠️ 创建默认配置时出错:', error.message);
  }
}

main().catch(console.error);