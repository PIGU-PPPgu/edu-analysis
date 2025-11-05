#!/usr/bin/env node

/**
 * 导出Supabase数据库结构备份脚本
 * 用于记录现有表结构和关系
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Supabase配置
const SUPABASE_URL = 'https://giluhqotfjpmofowvogn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 导出所有表的结构信息
 */
async function exportTableSchemas() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(__dirname, '../../docs/backup', timestamp);
  
  // 创建输出目录
  await fs.mkdir(outputDir, { recursive: true });
  
  console.log('📦 开始导出Supabase数据库结构...');
  console.log(`📁 输出目录: ${outputDir}`);
  
  // 获取所有表信息的SQL查询
  const queries = {
    // 1. 获取所有表列表
    tables: `
      SELECT 
        t.table_name,
        obj_description(pgc.oid, 'pg_class') as table_comment,
        COUNT(c.column_name) as column_count,
        pg_size_pretty(pg_total_relation_size(pgc.oid)) as total_size
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      LEFT JOIN pg_class pgc ON pgc.relname = t.table_name
      WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name, pgc.oid
      ORDER BY t.table_name;
    `,
    
    // 2. 获取表的列信息
    columns: `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `,
    
    // 3. 获取主键信息
    primaryKeys: `
      SELECT
        tc.table_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as primary_key_columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      GROUP BY tc.table_name
      ORDER BY tc.table_name;
    `,
    
    // 4. 获取外键关系
    foreignKeys: `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.ordinal_position;
    `,
    
    // 5. 获取索引信息
    indexes: `
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `,
    
    // 6. 统计数据量
    rowCounts: `
      SELECT 
        'students' as table_name, COUNT(*) as row_count FROM students
      UNION ALL
      SELECT 'grade_data_new', COUNT(*) FROM grade_data_new  
      UNION ALL
      SELECT 'grades', COUNT(*) FROM grades
      UNION ALL
      SELECT 'classes', COUNT(*) FROM classes
      UNION ALL
      SELECT 'class_info', COUNT(*) FROM class_info
      UNION ALL
      SELECT 'homework', COUNT(*) FROM homework
      UNION ALL
      SELECT 'homework_submissions', COUNT(*) FROM homework_submissions
      UNION ALL
      SELECT 'warning_records', COUNT(*) FROM warning_records
      UNION ALL
      SELECT 'warning_rules', COUNT(*) FROM warning_rules
      ORDER BY row_count DESC;
    `
  };
  
  const results = {};
  
  // 执行所有查询
  for (const [key, query] of Object.entries(queries)) {
    try {
      console.log(`📊 正在查询${key}...`);
      const { data, error } = await supabase.rpc('exec_sql', { query });
      
      if (error) {
        console.error(`❌ 查询${key}失败:`, error);
        results[key] = { error: error.message };
      } else {
        results[key] = data;
        console.log(`✅ ${key}查询完成，获取到${data?.length || 0}条记录`);
      }
    } catch (err) {
      console.error(`❌ 查询${key}异常:`, err);
      results[key] = { error: err.message };
    }
  }
  
  // 保存结果
  const schemaFile = path.join(outputDir, 'database-schema.json');
  await fs.writeFile(schemaFile, JSON.stringify(results, null, 2));
  console.log(`📄 数据库结构已保存到: ${schemaFile}`);
  
  // 生成Markdown文档
  const markdown = generateMarkdownDoc(results);
  const mdFile = path.join(outputDir, 'database-schema.md');
  await fs.writeFile(mdFile, markdown);
  console.log(`📝 Markdown文档已生成: ${mdFile}`);
  
  return results;
}

/**
 * 生成Markdown格式的文档
 */
function generateMarkdownDoc(results) {
  let md = '# Supabase数据库结构备份\n\n';
  md += `生成时间: ${new Date().toISOString()}\n\n`;
  
  // 表概览
  md += '## 📊 表概览\n\n';
  if (results.tables && Array.isArray(results.tables)) {
    md += '| 表名 | 说明 | 列数 | 大小 |\n';
    md += '|------|------|------|------|\n';
    results.tables.forEach(table => {
      md += `| ${table.table_name} | ${table.table_comment || '-'} | ${table.column_count} | ${table.total_size || '-'} |\n`;
    });
  }
  
  // 数据统计
  md += '\n## 📈 数据统计\n\n';
  if (results.rowCounts && Array.isArray(results.rowCounts)) {
    md += '| 表名 | 记录数 |\n';
    md += '|------|--------|\n';
    results.rowCounts.forEach(stat => {
      md += `| ${stat.table_name} | ${stat.row_count} |\n`;
    });
  }
  
  // 表结构详情
  md += '\n## 🗂️ 表结构详情\n\n';
  if (results.columns && Array.isArray(results.columns)) {
    const tableColumns = {};
    results.columns.forEach(col => {
      if (!tableColumns[col.table_name]) {
        tableColumns[col.table_name] = [];
      }
      tableColumns[col.table_name].push(col);
    });
    
    Object.keys(tableColumns).sort().forEach(tableName => {
      md += `### ${tableName}\n\n`;
      md += '| 列名 | 数据类型 | 允许空 | 默认值 |\n';
      md += '|------|----------|--------|--------|\n';
      tableColumns[tableName].forEach(col => {
        md += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default || '-'} |\n`;
      });
      md += '\n';
    });
  }
  
  // 外键关系
  md += '\n## 🔗 外键关系\n\n';
  if (results.foreignKeys && Array.isArray(results.foreignKeys)) {
    md += '| 表名 | 列名 | 引用表 | 引用列 |\n';
    md += '|------|------|--------|--------|\n';
    results.foreignKeys.forEach(fk => {
      md += `| ${fk.table_name} | ${fk.column_name} | ${fk.foreign_table_name} | ${fk.foreign_column_name} |\n`;
    });
  }
  
  return md;
}

// 执行导出
if (require.main === module) {
  exportTableSchemas()
    .then(() => {
      console.log('✅ 数据库结构导出完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 导出失败:', error);
      process.exit(1);
    });
}

module.exports = { exportTableSchemas };