/**
 * 执行数据库迁移脚本
 * 用法: npx tsx scripts/run-migration.ts <migration-file-name>
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// 从环境变量读取Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 缺少环境变量:");
  console.error("   - VITE_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\n请在.env.local文件中配置这些变量");
  process.exit(1);
}

// 创建Supabase客户端（使用service role key以绕过RLS）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration(migrationFileName: string) {
  console.log(`\n🚀 开始执行迁移: ${migrationFileName}\n`);

  // 读取迁移文件
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    migrationFileName
  );

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ 迁移文件不存在: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, "utf-8");

  console.log("📄 迁移文件内容预览:");
  console.log("─".repeat(60));
  console.log(sql.substring(0, 500) + "...\n");
  console.log("─".repeat(60));
  console.log(`\n⏳ 执行SQL (共${sql.split("\n").length}行)...\n`);

  try {
    // 执行SQL
    const { data, error } = await supabase.rpc("exec_sql", {
      sql_string: sql,
    });

    if (error) {
      // 如果RPC不存在，尝试直接执行
      console.log("⚠️  exec_sql函数不存在，尝试分段执行...\n");

      // 按分号分割SQL语句
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`[${i + 1}/${statements.length}] 执行语句...`);

        const { error: stmtError } = await supabase.rpc("exec", {
          sql: statement,
        });

        if (stmtError) {
          console.error(`❌ 语句 ${i + 1} 执行失败:`);
          console.error(`   ${statement.substring(0, 100)}...`);
          console.error(`   错误: ${stmtError.message}`);
          throw stmtError;
        }
      }

      console.log(`\n✅ 成功执行 ${statements.length} 条SQL语句`);
    } else {
      console.log("✅ 迁移执行成功!");
      if (data) {
        console.log("返回数据:", data);
      }
    }

    console.log("\n🎉 迁移完成!\n");
  } catch (error: any) {
    console.error("\n❌ 迁移失败:");
    console.error(`   ${error.message}\n`);
    console.error("详细错误:", error);
    process.exit(1);
  }
}

// 主函数
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error("❌ 请指定迁移文件名");
  console.error("\n用法: npx tsx scripts/run-migration.ts <migration-file>");
  console.error("示例: npx tsx scripts/run-migration.ts 20260213_fix_rls_policies.sql");
  process.exit(1);
}

runMigration(migrationFile);
