"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase, runMigration } from "@/integrations/supabase/client";
import fs from "fs/promises";
import path from "path";

// 迁移文件路径
const MIGRATIONS_PATH = "../migrations";

export default function ManageMigrations() {
  const [isLoading, setIsLoading] = useState(false);
  const [migrations, setMigrations] = useState<
    { name: string; content: string; executed: boolean }[]
  >([]);

  // 获取迁移文件列表
  useEffect(() => {
    async function loadMigrations() {
      setIsLoading(true);
      try {
        // 在客户端环境下，我们无法直接读取文件系统
        // 这里使用硬编码的方式提供可用的迁移
        const availableMigrations = [
          {
            name: "add_is_ai_generated_column.sql",
            content: `-- 添加is_ai_generated列到knowledge_points表
-- 此列用于标记是否是由AI生成的知识点
ALTER TABLE knowledge_points
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- 为现有知识点设置默认值
UPDATE knowledge_points
SET is_ai_generated = FALSE 
WHERE is_ai_generated IS NULL;

-- 添加索引以便快速查询AI生成的知识点
CREATE INDEX IF NOT EXISTS idx_knowledge_points_is_ai_generated 
ON knowledge_points(is_ai_generated);

-- 添加注释
COMMENT ON COLUMN knowledge_points.is_ai_generated IS '标记是否是由AI生成的知识点';`,
            executed: false,
          },
        ];

        // 检查迁移是否已执行
        const { data: executedMigrations, error } = await supabase
          .from("migrations")
          .select("name, executed_at")
          .order("executed_at", { ascending: false });

        if (error) {
          console.error("获取已执行的迁移失败:", error);
          toast.error("无法获取迁移历史");
        } else {
          // 更新迁移状态
          const updatedMigrations = availableMigrations.map((migration) => {
            const found = executedMigrations?.find(
              (m) => m.name === migration.name
            );
            return {
              ...migration,
              executed: !!found,
            };
          });

          setMigrations(updatedMigrations);
        }
      } catch (error) {
        console.error("加载迁移失败:", error);
        toast.error("加载迁移失败");
      } finally {
        setIsLoading(false);
      }
    }

    loadMigrations();
  }, []);

  // 执行迁移
  const executeMigration = async (migration: {
    name: string;
    content: string;
    executed: boolean;
  }) => {
    setIsLoading(true);
    try {
      if (migration.executed) {
        toast.warning(`迁移 ${migration.name} 已经执行过，跳过`);
        return;
      }

      // 执行SQL
      const result = await runMigration(migration.content, migration.name);

      if (result.success) {
        // 记录迁移历史
        const { error } = await supabase.from("migrations").insert({
          name: migration.name,
          content: migration.content,
          executed_at: new Date().toISOString(),
        });

        if (error) {
          console.error("记录迁移历史失败:", error);
          toast.warning("迁移成功执行，但记录迁移历史失败");
        } else {
          toast.success(`迁移 ${migration.name} 成功执行`);

          // 更新状态
          setMigrations((prev) =>
            prev.map((m) =>
              m.name === migration.name ? { ...m, executed: true } : m
            )
          );
        }
      } else {
        toast.error(`执行迁移 ${migration.name} 失败: ${result.message}`);
      }
    } catch (error) {
      console.error("执行迁移出错:", error);
      toast.error(`执行迁移 ${migration.name} 出错`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">数据库迁移管理</h1>

      <Card>
        <CardHeader>
          <CardTitle>可用迁移</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : migrations.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              没有发现迁移文件
            </p>
          ) : (
            <div className="space-y-4">
              {migrations.map((migration) => (
                <div
                  key={migration.name}
                  className="flex justify-between items-center border-b pb-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{migration.name}</span>
                      {migration.executed ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          已执行
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200"
                        >
                          待执行
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {migration.content
                        .split("\n")[0]
                        .replace("--", "")
                        .trim()}
                    </p>
                  </div>
                  <Button
                    variant={migration.executed ? "outline" : "default"}
                    size="sm"
                    onClick={() => executeMigration(migration)}
                    disabled={isLoading || migration.executed}
                  >
                    {migration.executed ? "已执行" : "执行迁移"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <p className="text-sm text-muted-foreground">
          注意: 请确保在执行迁移前备份数据库。迁移一旦执行无法回滚。
        </p>
      </div>
    </div>
  );
}
