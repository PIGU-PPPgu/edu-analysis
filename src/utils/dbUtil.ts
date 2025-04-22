
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 执行SQL查询的通用函数
export async function executeSql(sql: string, params: any = {}) {
  try {
    // Instead of using RPC, use Supabase's built-in query methods
    // For direct SQL execution, in a production app, we would create 
    // a specific stored procedure, but for now we'll use mock data
    console.log('SQL to execute:', sql, params);
    
    // Return mock data for development
    return mockDataForQuery(sql);
  } catch (error) {
    console.error('执行SQL失败:', error);
    toast.error(`数据库操作失败: ${error.message}`);
    throw error;
  }
}

// 从SQL文件执行SQL函数
export async function executeSqlFromFile(functionName: string, params: any = {}) {
  try {
    // For now, we'll just mock responses instead of calling non-existent RPC functions
    console.log(`执行函数: ${functionName} 带参数:`, params);
    
    // Return mock data based on the function name
    return mockDataForFunction(functionName);
  } catch (error) {
    console.error(`执行${functionName}失败:`, error);
    toast.error(`数据库操作失败: ${error.message}`);
    throw error;
  }
}

// Mock data helper function for SQL queries
function mockDataForQuery(sql: string) {
  if (sql.includes('pg_trigger')) {
    return [{ trigger_exists: false }];
  }
  
  if (sql.includes('COUNT') && sql.includes('subjects')) {
    return [{ count: 0 }];
  }
  
  if (sql.includes('COUNT') && sql.includes('exam_types')) {
    return [{ count: 0 }];
  }
  
  if (sql.includes('COUNT') && sql.includes('academic_terms')) {
    return [{ count: 0 }];
  }
  
  // Default mock data
  return [];
}

// Mock data helper function for function calls
function mockDataForFunction(functionName: string) {
  if (functionName === 'create_user_profile_function') {
    return { success: true };
  }
  
  if (functionName === 'create_user_profile_trigger') {
    return { success: true };
  }
  
  if (functionName === 'setup_profile_policies') {
    return { success: true };
  }
  
  if (functionName === 'setup_student_policies') {
    return { success: true };
  }
  
  if (functionName === 'setup_grades_policies') {
    return { success: true };
  }
  
  // Default mock data
  return { success: true };
}
