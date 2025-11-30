/**
 * 🔧 环境变量加载 (必须最先执行)
 * 此文件在所有其他测试设置之前加载，确保环境变量可用
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ES模块中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载.env.local文件
const envPath = path.resolve(__dirname, "../../.env.local");
console.log(`📝 加载环境变量: ${envPath}`);

const result = config({ path: envPath });

if (result.error) {
  console.warn("⚠️  环境变量加载警告:", result.error.message);
} else {
  console.log(
    `✅ 环境变量已加载 (${Object.keys(result.parsed || {}).length} 个变量)`
  );
  console.log(
    `   VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL?.substring(0, 30)}...`
  );
  console.log(
    `   VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? `${process.env.VITE_SUPABASE_ANON_KEY.length} 字符` : "未设置"}`
  );
}
