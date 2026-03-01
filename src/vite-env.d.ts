/// <reference types="vite/client" />

// 支持 ?raw 导入 markdown 文件
declare module "*.md?raw" {
  const content: string;
  export default content;
}
declare module "*.md" {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_AI_API_KEY: string
  readonly VITE_AI_BASE_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // 添加更多环境变量类型定义...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}