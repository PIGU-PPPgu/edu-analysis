// 环境变量类型定义和加载
interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_USE_MOCK_AI?: string;
  NEXT_PUBLIC_OPENAI_API_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
}

// 默认环境变量，避免开发过程中报错
const defaultEnv: Env = {
  SUPABASE_URL: "https://giluhqotfjpmofowvogn.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ",
  NEXT_PUBLIC_USE_MOCK_AI: "false",
  SUPABASE_STORAGE_BUCKET: "homework_files",
};

// 检查process对象是否存在（浏览器环境中不存在）
const processEnv = typeof process !== 'undefined' && process.env ? process.env : {};

// 获取环境变量，优先使用process.env，不存在则使用默认值
export const env: Env = {
  SUPABASE_URL: processEnv.SUPABASE_URL || defaultEnv.SUPABASE_URL,
  SUPABASE_ANON_KEY: processEnv.SUPABASE_ANON_KEY || defaultEnv.SUPABASE_ANON_KEY,
  NEXT_PUBLIC_USE_MOCK_AI: processEnv.NEXT_PUBLIC_USE_MOCK_AI || defaultEnv.NEXT_PUBLIC_USE_MOCK_AI,
  NEXT_PUBLIC_OPENAI_API_KEY: processEnv.NEXT_PUBLIC_OPENAI_API_KEY,
  SUPABASE_STORAGE_BUCKET: processEnv.SUPABASE_STORAGE_BUCKET || defaultEnv.SUPABASE_STORAGE_BUCKET,
}; 