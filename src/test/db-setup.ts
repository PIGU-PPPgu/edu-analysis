/**
 * 🧪 测试数据库设置
 * 提供测试环境的Supabase客户端和数据管理工具
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";

// 测试环境配置
// 使用process.env而非import.meta.env，因为dotenv加载的变量在process.env中
const TEST_SUPABASE_URL =
  process.env.VITE_TEST_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const TEST_SUPABASE_ANON_KEY =
  process.env.VITE_TEST_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!TEST_SUPABASE_URL || !TEST_SUPABASE_ANON_KEY) {
  console.warn("⚠️ 测试环境Supabase配置未设置，使用生产环境配置");
}

/**
 * 创建测试用Supabase客户端
 */
export const createTestSupabaseClient = (): SupabaseClient<Database> => {
  console.log("🔧 创建测试 Supabase 客户端...");
  console.log(`URL: ${TEST_SUPABASE_URL?.substring(0, 30)}...`);
  console.log(`KEY 长度: ${TEST_SUPABASE_ANON_KEY?.length || 0} 字符`);

  // 使用public schema + RLS策略进行数据隔离
  // RLS策略确保只能访问TEST_前缀的数据
  // 注意：不使用Database类型泛型，避免类型冲突导致的查询builder问题
  const client = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false, // 测试环境不持久化session
      autoRefreshToken: false,
    },
    // 不设置db.schema，使用默认的public schema
    // 通过RLS策略限制只能访问TEST_开头的测试数据
  }) as SupabaseClient<Database>;

  // 验证客户端是否正确创建
  if (!client || typeof client.from !== "function") {
    console.error("❌ Supabase 客户端创建失败！");
    throw new Error("Failed to create Supabase client");
  }

  console.log(`✅ Supabase 客户端创建成功，使用public schema + RLS隔离`);
  return client;
};

/**
 * 单例测试客户端 (懒加载)
 */
let _testSupabase: SupabaseClient<Database> | null = null;

export const getTestSupabase = (): SupabaseClient<Database> => {
  if (!_testSupabase) {
    _testSupabase = createTestSupabaseClient();
  }
  return _testSupabase;
};

// 向后兼容的导出
export const testSupabase = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    return (getTestSupabase() as any)[prop];
  },
});

/**
 * 🧹 清理测试数据
 */
export const cleanTestData = async (tables?: string[]) => {
  const targetTables = tables || [
    "warning_records",
    "student_knowledge_mastery",
    "submission_knowledge_points",
    "homework_submissions",
    "knowledge_points",
    "homework",
    "grade_data_new", // 修复：使用正确的表名
    "grades",
    "students",
    "exams",
  ];

  console.log(`🧹 清理测试数据: ${targetTables.join(", ")}`);

  const supabase = getTestSupabase();

  for (const table of targetTables) {
    try {
      // 创建查询builder
      const queryBuilder = supabase.from(table as any);

      if (!queryBuilder || typeof queryBuilder.delete !== "function") {
        console.warn(`⚠️ 无法为表 ${table} 创建查询 builder，跳过清理`);
        continue;
      }

      // 简化清理逻辑：删除所有数据（测试环境可以这样做）
      const { error } = await queryBuilder
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // 删除除了占位符以外的所有数据

      if (error) {
        // 忽略表不存在错误和权限错误（某些表可能没有权限）
        if (error.code !== "42P01" && error.code !== "42501") {
          console.warn(`清理表 ${table} 时出错:`, error.message);
        }
      }
    } catch (e: any) {
      console.warn(`清理表 ${table} 异常:`, e.message || String(e));
    }
  }
};

/**
 * 🔢 计数测试数据
 */
export const countTestData = async (table: string): Promise<number> => {
  const supabase = getTestSupabase();
  const { count, error } = await supabase
    .from(table as any)
    .select("*", { count: "exact", head: true })
    .like("student_id", "TEST_%");

  if (error) {
    console.error(`计数表 ${table} 时出错:`, error);
    return 0;
  }

  return count || 0;
};

/**
 * 📊 加载测试固件数据
 */
export const loadTestFixture = async <T = any>(
  fixtureName: string
): Promise<T[]> => {
  try {
    // 动态导入fixture文件
    const fixture = await import(`./fixtures/${fixtureName}.json`);
    return fixture.default || fixture;
  } catch (error) {
    console.error(`加载fixture ${fixtureName} 失败:`, error);
    return [];
  }
};

/**
 * 🗄️ 批量插入测试数据
 * 注意：集成测试依赖实际数据库连接，如果Supabase连接不可用，测试将失败
 */
export const insertTestData = async <T extends Record<string, any>>(
  table: string,
  data: T[]
): Promise<{ success: boolean; insertedCount: number; error?: any }> => {
  try {
    console.log(`📝 准备插入 ${data.length} 条数据到表 ${table}...`);

    // 创建查询builder
    const supabase = getTestSupabase();
    const queryBuilder = supabase.from(table as any);

    // 检查builder是否正确创建
    if (!queryBuilder || typeof queryBuilder.insert !== "function") {
      console.error(`❌ 无法为表 ${table} 创建查询 builder`);
      return {
        success: false,
        insertedCount: 0,
        error: new Error(
          `Invalid table name or Supabase client not initialized: ${table}`
        ),
      };
    }

    console.log(`🔧 Query builder 创建成功，执行插入...`);

    // 执行插入 - Supabase v2需要调用终端方法(.select())来完成builder链
    const { error, data: insertedData } = await queryBuilder
      .insert(data)
      .select();

    console.log(`📊 插入响应:`, {
      hasError: !!error,
      errorCode: error?.code || "none",
      errorMessage: error?.message || "no error",
      insertedCount: insertedData?.length || 0,
    });

    if (error) {
      console.error(`插入数据到 ${table} 失败:`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { success: false, insertedCount: 0, error };
    }

    // 插入成功，数据数量就是输入数据的长度
    console.log(`✅ 成功插入 ${data.length} 条数据到 ${table}`);
    return { success: true, insertedCount: data.length };
  } catch (error: any) {
    console.error(`插入数据到 ${table} 异常:`, {
      message: error.message || String(error),
      details: error.stack,
      hint: "",
      code: "",
    });
    return { success: false, insertedCount: 0, error };
  }
};

/**
 * 🔐 创建测试用户并登录
 */
export const createTestUser = async (
  email: string = "test@example.com",
  password: string = "test-password-123"
) => {
  try {
    const supabase = getTestSupabase();

    // 尝试登录现有用户
    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (!loginError && loginData.user) {
      console.log("✅ 测试用户已登录");
      return { user: loginData.user, session: loginData.session };
    }

    // 如果登录失败，创建新用户
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
      }
    );

    if (signUpError) {
      console.error("创建测试用户失败:", signUpError);
      throw signUpError;
    }

    console.log("✅ 测试用户已创建并登录");
    return { user: signUpData.user, session: signUpData.session };
  } catch (error) {
    console.error("测试用户设置失败:", error);
    throw error;
  }
};

/**
 * 🚪 登出测试用户
 */
export const cleanupTestUser = async () => {
  const supabase = getTestSupabase();
  await supabase.auth.signOut();
  console.log("🚪 测试用户已登出");
};

/**
 * 📦 通用测试数据库钩子
 *
 * 使用示例:
 * ```typescript
 * import { setupTestDatabase } from '@/test/db-setup';
 *
 * describe('MyService', () => {
 *   setupTestDatabase(); // 自动清理数据
 *
 *   it('should work', async () => {
 *     // 测试逻辑
 *   });
 * });
 * ```
 */
export const setupTestDatabase = (options?: {
  cleanBefore?: boolean;
  cleanAfter?: boolean;
  tables?: string[];
  authenticateUser?: boolean;
}) => {
  const {
    cleanBefore = true,
    cleanAfter = true,
    tables,
    authenticateUser = false,
  } = options || {};

  if (cleanBefore) {
    beforeAll(async () => {
      await cleanTestData(tables);
      if (authenticateUser) {
        await createTestUser();
      }
    });
  }

  if (cleanAfter) {
    afterAll(async () => {
      await cleanTestData(tables);
      if (authenticateUser) {
        await cleanupTestUser();
      }
    });
  }

  // 每个测试前重置
  beforeEach(async () => {
    if (cleanBefore) {
      await cleanTestData(tables);
    }
  });
};

/**
 * 🎯 等待数据库操作完成
 */
export const waitForDatabase = (ms: number = 100) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 🔍 验证数据库状态
 */
export const verifyDatabaseState = async (
  table: string,
  expectedCount: number,
  condition?: Record<string, any>
): Promise<boolean> => {
  const supabase = getTestSupabase();
  let query = supabase
    .from(table as any)
    .select("*", { count: "exact", head: true });

  if (condition) {
    Object.entries(condition).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { count, error } = await query;

  if (error) {
    console.error(`验证表 ${table} 状态失败:`, error);
    return false;
  }

  const matches = count === expectedCount;
  if (!matches) {
    console.warn(
      `❌ 表 ${table} 期望 ${expectedCount} 条记录，实际 ${count} 条`
    );
  }

  return matches;
};

/**
 * 📝 测试数据库连接
 */
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const supabase = getTestSupabase();
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ 测试数据库连接失败:", error);
      return false;
    }

    console.log("✅ 测试数据库连接成功");
    return true;
  } catch (error) {
    console.error("❌ 测试数据库连接异常:", error);
    return false;
  }
};
