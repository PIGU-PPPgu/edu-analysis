
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 执行SQL查询的通用函数
export async function executeSql(sql: string, params: any = {}) {
  try {
    const { data, error } = await supabase.rpc('run_sql', { sql_query: sql, params });
    
    if (error) {
      console.error('SQL执行错误:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('执行SQL失败:', error);
    toast.error(`数据库操作失败: ${error.message}`);
    throw error;
  }
}

// 从SQL文件执行SQL函数
export async function executeSqlFromFile(functionName: string, params: any = {}) {
  try {
    const { data, error } = await supabase.rpc(functionName, params);
    
    if (error) {
      console.error(`执行${functionName}失败:`, error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`执行${functionName}失败:`, error);
    toast.error(`数据库操作失败: ${error.message}`);
    throw error;
  }
}
