// 环境变量类型定义和加载
interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_USE_MOCK_AI: string;
  SUPABASE_STORAGE_BUCKET: string;
  // 注意：API密钥应该在服务端处理，不应暴露在客户端
}

// 检查process对象是否存在（浏览器环境中不存在）
const processEnv: Record<string, string | undefined> =
  typeof process !== "undefined" && process.env ? process.env : {};

// 验证必需的环境变量
function validateEnv(): Env {
  const requiredVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missing = requiredVars.filter((key) => !processEnv[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Please check your .env file or environment configuration."
    );
  }

  return {
    SUPABASE_URL: processEnv.SUPABASE_URL!,
    SUPABASE_ANON_KEY: processEnv.SUPABASE_ANON_KEY!,
    NEXT_PUBLIC_USE_MOCK_AI: processEnv.NEXT_PUBLIC_USE_MOCK_AI || "true",
    SUPABASE_STORAGE_BUCKET:
      processEnv.SUPABASE_STORAGE_BUCKET || "homework_files",
  };
}

// 获取环境变量，确保从环境变量中读取敏感信息
export const env: Env = validateEnv();
