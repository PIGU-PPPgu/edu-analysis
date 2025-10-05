import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 定义查询结果类型以提高类型安全性
type QueryResult =
  | { trigger_exists: boolean }
  | { count: number }
  | Record<string, any>[];

// 环境检查
const isDevelopment = import.meta.env.DEV;
const ALLOW_MOCK_IN_DEV = true; // 开发环境Mock开关

// 执行SQL查询的通用函数
export async function executeSql(
  sql: string,
  params: any = {}
): Promise<QueryResult> {
  try {
    // 生产环境: 必须使用真实的数据库RPC函数
    if (!isDevelopment) {
      const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: sql,
        query_params: params
      });

      if (error) {
        console.error('[生产环境] SQL执行失败:', error);
        throw error;
      }

      return data as QueryResult;
    }

    // 开发环境: 尝试真实数据库,失败时降级为Mock
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: sql,
        query_params: params
      });

      if (error) {
        if (ALLOW_MOCK_IN_DEV) {
          console.warn('[开发环境] SQL执行失败,使用Mock数据:', error.message);
          console.log('[开发环境] SQL语句:', sql);
          return mockDataForQuery(sql);
        }
        throw error;
      }

      return data as QueryResult;
    } catch (rpcError) {
      if (ALLOW_MOCK_IN_DEV) {
        console.warn('[开发环境] RPC不存在,使用Mock数据. 请创建execute_sql存储过程');
        console.log('[开发环境] SQL语句:', sql);
        return mockDataForQuery(sql);
      }
      throw rpcError;
    }
  } catch (error) {
    console.error("执行SQL失败:", error);
    toast.error(`数据库操作失败: ${error.message}`);
    throw error;
  }
}

// 从SQL文件执行SQL函数
export async function executeSqlFromFile(
  functionName: string,
  params: any = {}
): Promise<any> {
  try {
    // 生产环境: 必须调用真实的数据库函数
    if (!isDevelopment) {
      const { data, error } = await supabase.rpc(functionName, params);

      if (error) {
        console.error(`[生产环境] 函数${functionName}执行失败:`, error);
        throw error;
      }

      return data;
    }

    // 开发环境: 尝试真实函数,失败时降级为Mock
    try {
      const { data, error } = await supabase.rpc(functionName, params);

      if (error) {
        if (ALLOW_MOCK_IN_DEV) {
          console.warn(`[开发环境] 函数${functionName}执行失败,使用Mock数据:`, error.message);
          console.log('[开发环境] 函数参数:', params);
          return mockDataForFunction(functionName);
        }
        throw error;
      }

      return data;
    } catch (rpcError) {
      if (ALLOW_MOCK_IN_DEV) {
        console.warn(`[开发环境] 函数${functionName}不存在,使用Mock数据. 请创建该存储过程`);
        console.log('[开发环境] 函数参数:', params);
        return mockDataForFunction(functionName);
      }
      throw rpcError;
    }
  } catch (error) {
    console.error(`执行${functionName}失败:`, error);
    toast.error(`数据库操作失败: ${error.message}`);
    throw error;
  }
}

/**
 * Mock数据生成函数 - 仅用于开发环境
 *
 * ⚠️ 警告: 此函数仅在开发环境且真实数据库不可用时调用
 * 生产环境将直接抛出错误,不会使用Mock数据
 *
 * @param sql - SQL查询语句
 * @returns 模拟的查询结果
 */
function mockDataForQuery(sql: string): QueryResult {
  console.warn('[MOCK数据] 使用模拟查询结果,请尽快创建真实的execute_sql存储过程');

  if (sql.includes("pg_trigger")) {
    return [{ trigger_exists: false }];
  }

  if (sql.includes("COUNT") && sql.includes("subjects")) {
    return [{ count: 0 }];
  }

  if (sql.includes("COUNT") && sql.includes("exam_types")) {
    return [{ count: 0 }];
  }

  if (sql.includes("COUNT") && sql.includes("academic_terms")) {
    return [{ count: 0 }];
  }

  // Default mock data
  return [];
}

/**
 * Mock函数调用 - 仅用于开发环境
 *
 * ⚠️ 警告: 此函数仅在开发环境且真实存储过程不存在时调用
 * 生产环境将直接抛出错误,不会使用Mock数据
 *
 * @param functionName - 存储过程名称
 * @returns 模拟的函数执行结果
 */
function mockDataForFunction(functionName: string): any {
  console.warn(`[MOCK数据] 使用模拟函数结果: ${functionName},请创建真实的存储过程`);

  // 用户配置相关函数
  if (functionName === "create_user_profile_function") {
    return { success: true, _isMockData: true };
  }

  if (functionName === "create_user_profile_trigger") {
    return { success: true, _isMockData: true };
  }

  // 权限策略相关函数
  if (functionName === "setup_profile_policies") {
    return { success: true, _isMockData: true };
  }

  if (functionName === "setup_student_policies") {
    return { success: true, _isMockData: true };
  }

  if (functionName === "setup_grades_policies") {
    return { success: true, _isMockData: true };
  }

  // Default mock data with warning flag
  return {
    success: true,
    _isMockData: true,
    _warning: `函数${functionName}不存在,返回的是模拟数据`
  };
}
