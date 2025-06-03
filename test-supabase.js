// 测试 Supabase 连接
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 从 .env 文件读取配置
const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const SUPABASE_URL = envVars.SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.SUPABASE_ANON_KEY;

console.log('使用以下配置测试 Supabase 连接:');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`KEY: ${SUPABASE_ANON_KEY.substring(0, 10)}...`);

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 测试连接
async function testConnection() {
  try {
    console.log('正在测试 Supabase 连接...');
    
    // 尝试获取健康状态
    const { data: health, error: healthError } = await supabase.from('pg_stat_statements').select('*').limit(1);
    
    if (healthError) {
      console.log('无法查询健康状态，错误:', healthError.message);
      console.log('这是预期的，因为我们可能没有访问此表的权限');
      console.log('尝试使用信息模式查询所有表...');
    } else {
      console.log('成功连接到 Supabase!');
    }
    
    // 尝试列出所有表
    const { data: schemas, error: schemasError } = await supabase
      .from('information_schema.schemata')
      .select('schema_name');
    
    if (schemasError) {
      console.error('无法查询模式列表:', schemasError.message);
    } else {
      console.log('可用的模式:', schemas.map(s => s.schema_name).join(', '));
    }
    
    // 尝试查询公共模式中的表
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('无法查询表列表:', tablesError.message);
    } else {
      console.log('public 模式下的表:', tables.map(t => t.table_name).join(', '));
    }
    
    // 尝试直接查询一个可能存在的表
    const tables_to_try = ['users', 'students', 'teachers', 'grades', 'classes'];
    
    for (const table of tables_to_try) {
      console.log(`尝试查询 ${table} 表...`);
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        if (error.code === '42P01') { // 表不存在错误
          console.log(`- 表 ${table} 不存在`);
        } else {
          console.log(`- 查询表 ${table} 失败: ${error.message}`);
        }
      } else {
        console.log(`✓ 成功查询 ${table} 表，找到 ${data.length} 条记录`);
      }
    }
  } catch (err) {
    console.error('测试过程中出现异常:', err);
  }
}

testConnection(); 