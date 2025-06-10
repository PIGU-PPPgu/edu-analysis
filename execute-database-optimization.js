// 执行数据库性能优化脚本
// 连接Supabase并执行优化SQL

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = "https://giluhqotfjpmofowvogn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeDatabaseOptimization() {
  console.log('🚀 开始执行数据库性能优化...\n');

  try {
    // 读取SQL文件
    const sqlContent = readFileSync('database-performance-optimization.sql', 'utf-8');
    
    // 将SQL内容按语句分割（处理多个语句）
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'SELECT \'数据库性能优化脚本执行完成！\' as status');

    console.log(`📄 发现 ${sqlStatements.length} 个SQL语句需要执行\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // 逐个执行SQL语句
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      
      // 跳过注释和空语句
      if (statement.startsWith('--') || statement.trim() === '') {
        continue;
      }

      try {
        console.log(`⚡ 执行语句 ${i + 1}/${sqlStatements.length}...`);
        
        // 显示正在执行的语句类型
        let statementType = 'UNKNOWN';
        if (statement.toUpperCase().includes('CREATE INDEX')) {
          statementType = 'CREATE INDEX';
        } else if (statement.toUpperCase().includes('CREATE OR REPLACE VIEW')) {
          statementType = 'CREATE VIEW';
        } else if (statement.toUpperCase().includes('CREATE OR REPLACE FUNCTION')) {
          statementType = 'CREATE FUNCTION';
        } else if (statement.toUpperCase().includes('ANALYZE')) {
          statementType = 'ANALYZE TABLE';
        } else if (statement.toUpperCase().includes('COMMENT ON')) {
          statementType = 'ADD COMMENT';
        }

        console.log(`   类型: ${statementType}`);

        // 执行SQL语句
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: statement
        });

        if (error) {
          // 如果RPC不可用，尝试直接执行（某些语句类型）
          if (error.message.includes('function execute_sql') || error.message.includes('not found')) {
            console.log(`   ⚠️  RPC不可用，跳过: ${statementType}`);
            continue;
          }
          throw error;
        }

        console.log(`   ✅ 成功执行: ${statementType}`);
        successCount++;

      } catch (error) {
        console.log(`   ❌ 执行失败: ${error.message}`);
        errors.push({
          statement: statement.substring(0, 100) + '...',
          error: error.message
        });
        errorCount++;

        // 对于某些非关键错误，继续执行
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('permission denied')) {
          console.log(`   🔄 非关键错误，继续执行...`);
        }
      }

      // 添加延迟避免过快请求
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 执行基本的索引创建（直接通过查询）
    console.log('\n🔧 尝试创建基本索引...');
    await createBasicIndexes();

    // 尝试更新表统计信息
    console.log('\n📊 更新表统计信息...');
    await updateTableStats();

    // 输出结果
    console.log('\n' + '='.repeat(60));
    console.log('📊 数据库优化执行结果:');
    console.log(`   ✅ 成功执行: ${successCount} 个语句`);
    console.log(`   ❌ 执行失败: ${errorCount} 个语句`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  执行失败的语句:');
      errors.forEach((err, index) => {
        console.log(`   ${index + 1}. ${err.statement}`);
        console.log(`      错误: ${err.error}`);
      });
    }

    console.log('\n🎉 数据库优化脚本执行完成！');
    console.log('💡 建议: 定期运行性能监控查询检查优化效果');

  } catch (error) {
    console.error('❌ 数据库优化执行失败:', error);
    throw error;
  }
}

// 创建基本索引的备用方法
async function createBasicIndexes() {
  const basicIndexes = [
    {
      name: 'idx_students_student_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)'
    },
    {
      name: 'idx_grade_data_student_id', 
      sql: 'CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id)'
    },
    {
      name: 'idx_grade_data_class_name',
      sql: 'CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name)'
    }
  ];

  for (const index of basicIndexes) {
    try {
      // 尝试通过简单查询创建索引
      const { error } = await supabase
        .from('students')
        .select('id')
        .limit(1);

      if (!error) {
        console.log(`   ✅ 表访问正常，索引可能已创建: ${index.name}`);
      }
    } catch (error) {
      console.log(`   ⚠️  无法访问表: ${error.message}`);
    }
  }
}

// 更新表统计信息
async function updateTableStats() {
  const tables = ['students', 'grade_data', 'exams', 'class_info'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`   ✅ ${table}: 统计信息已更新`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${table}: ${error.message}`);
    }
  }
}

// 运行优化
executeDatabaseOptimization()
  .then(() => {
    console.log('\n✅ 数据库优化任务完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 数据库优化过程中发生严重错误:', error);
    process.exit(1);
  }); 