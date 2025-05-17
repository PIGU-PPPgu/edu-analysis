import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 创建Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 读取并执行SQL文件
async function executeSqlFile(filePath) {
  console.log(`正在执行SQL文件: ${filePath}`);
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // 使用Supabase的RPC调用执行SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // 如果exec_sql函数不存在，我们需要先创建它
      if (error.message && error.message.includes('does not exist')) {
        console.log('exec_sql函数不存在，正在尝试创建...');
        
        // 创建辅助函数的SQL
        const helperFunctionsPath = path.join(__dirname, 'supabase', 'migrations', '20240726000000_create_helper_functions.sql');
        const helperSql = fs.readFileSync(helperFunctionsPath, 'utf8');
        
        // 使用REST API直接执行SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'X-Client-Info': 'supabase-js/2.0.0'
          },
          body: JSON.stringify({
            query: helperSql
          })
        });
        
        if (!response.ok) {
          throw new Error(`创建辅助函数失败: ${await response.text()}`);
        }
        
        console.log('辅助函数创建成功，重新尝试执行原始SQL...');
        return executeSqlFile(filePath);
      }
      
      throw new Error(`执行SQL失败: ${error.message}`);
    }
    
    console.log('SQL执行成功:', data);
    return data;
  } catch (err) {
    console.error('执行SQL文件时出错:', err);
    throw err;
  }
}

// 检查表结构并修复
async function checkAndFixTableStructure() {
  try {
    // 1. 创建辅助函数
    await executeSqlFile(path.join(__dirname, 'supabase', 'migrations', '20240726000000_create_helper_functions.sql'));
    
    // 2. 检查并修复exams表
    await executeSqlFile(path.join(__dirname, 'fix_exams_table.sql'));
    
    // 3. 检查并修复grade_data表
    const fixGradeDataTableSql = `
    DO $$
    DECLARE
      column_exists BOOLEAN;
    BEGIN
      -- 检查exam_scope字段是否存在
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'grade_data' 
        AND column_name = 'exam_scope'
      ) INTO column_exists;
      
      IF NOT column_exists THEN
        RAISE NOTICE 'Adding exam_scope column to grade_data table';
        ALTER TABLE grade_data ADD COLUMN exam_scope TEXT DEFAULT 'class';
        COMMENT ON COLUMN grade_data.exam_scope IS '考试范围，继承自exams表';
      END IF;
    END $$;
    `;
    
    // 保存SQL到文件
    fs.writeFileSync(path.join(__dirname, 'fix_grade_data_table.sql'), fixGradeDataTableSql);
    await executeSqlFile(path.join(__dirname, 'fix_grade_data_table.sql'));
    
    console.log('所有表结构修复完成!');
  } catch (err) {
    console.error('修复表结构时出错:', err);
    process.exit(1);
  }
}

// 执行主函数
checkAndFixTableStructure(); 