// 环境变量类型定义和加载
interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_USE_MOCK_AI: string;
  SUPABASE_STORAGE_BUCKET: string;
  // 注意：API密钥应该在服务端处理，不应暴露在客户端
}

// 获取环境变量，支持 Vite 和 Node.js 环境
function getEnvVar(key: string): string | undefined {
  // 优先检查 VITE_ 前缀的变量（用于客户端）
  const viteKey = `VITE_${key}`;

  // 在浏览器环境中，Vite 会将 VITE_ 前缀的环境变量注入到 import.meta.env
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[viteKey] || import.meta.env[key];
  }

  // 在 Node.js 环境中使用 process.env
  if (typeof process !== "undefined" && process.env) {
    return process.env[viteKey] || process.env[key];
  }

  return undefined;
}

// 验证必需的环境变量
function validateEnv(): Env {
  const requiredVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missing = requiredVars.filter((key) => !getEnvVar(key));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Please check your .env file or environment configuration."
    );
  }

  return {
    SUPABASE_URL: getEnvVar("SUPABASE_URL")!,
    SUPABASE_ANON_KEY: getEnvVar("SUPABASE_ANON_KEY")!,
    NEXT_PUBLIC_USE_MOCK_AI: getEnvVar("NEXT_PUBLIC_USE_MOCK_AI") || "true",
    SUPABASE_STORAGE_BUCKET:
      getEnvVar("SUPABASE_STORAGE_BUCKET") || "homework_files",
  };
}

// 获取环境变量，确保从环境变量中读取敏感信息
export const env: Env = validateEnv();
