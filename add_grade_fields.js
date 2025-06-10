const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://zpflwvtiqynzxqtojgwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZmx3dnRpcXluenhxdG9qZ3doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTc1NjIwOSwiZXhwIjoyMDM1MzMyMjA5fQ.Y9sGQaHfaYINjV53MpGZVU2F7rP9sAv94aD6Y0qflLM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGradeLevelFields() {
  try {
    console.log('📊 添加等级字段到grade_data表...');
    
    // 直接在代码中定义SQL，避免读取文件
    const sql = `
      DO $$
      DECLARE
        columns_to_add TEXT[] := ARRAY[
          '总分等级',
          '语文等级', 
          '数学等级',
          '英语等级',
          '物理等级',
          '化学等级',
          '道法等级',
          '历史等级'
        ];
        col TEXT;
        column_exists BOOLEAN;
      BEGIN
        FOREACH col IN ARRAY columns_to_add
        LOOP
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'grade_data' 
            AND column_name = col
          ) INTO column_exists;
          
          IF NOT column_exists THEN
            RAISE NOTICE 'Adding column % to grade_data table', col;
            EXECUTE format('ALTER TABLE grade_data ADD COLUMN %I TEXT', col);
          ELSE
            RAISE NOTICE 'Column % already exists in grade_data table', col;
          END IF;
        END LOOP;
      END $$;
    `;
    
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ 执行SQL失败:', error);
      return;
    }
    
    console.log('✅ 等级字段添加成功!');
    console.log('响应:', data);
    
  } catch (err) {
    console.error('❌ 操作失败:', err);
  }
}

addGradeLevelFields(); 