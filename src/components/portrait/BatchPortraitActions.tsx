/**
 * 批量画像操作组件 - 提供批量生成、更新画像的功能
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, RefreshCw, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { intelligentPortraitService } from "@/services/intelligentPortraitService";
import { supabase } from "@/integrations/supabase/client";

interface BatchPortraitActionsProps {
  className: string;
  onComplete?: () => void;
}

interface PortraitHealth {
  total: number;
  fresh: number; // 7天内更新
  stale: number; // 7-30天
  outdated: number; // 30天以上
  missing: number; // 无画像
}

export function BatchPortraitActions({
  className,
  onComplete,
}: BatchPortraitActionsProps) {
  const [health, setHealth] = useState<PortraitHealth | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStudent, setCurrentStudent] = useState("");

  // 分析画像健康度
  const analyzeHealth = async () => {
    setIsAnalyzing(true);
    try {
      // 1. 获取班级所有学生
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, student_id, name")
        .eq("class_name", className);

      if (studentsError || !students) {
        toast.error("获取学生列表失败");
        return;
      }

      // 2. 获取所有学生的画像
      const { data: portraits, error: portraitsError } = await supabase
        .from("student_portraits")
        .select("student_id, last_updated")
        .in(
          "student_id",
          students.map((s) => s.id)
        );

      if (portraitsError) {
        console.error("获取画像失败:", portraitsError);
      }

      // 3. 计算健康度
      const now = new Date();
      const portraitMap = new Map(
        (portraits || []).map((p) => [p.student_id, p.last_updated])
      );

      let fresh = 0;
      let stale = 0;
      let outdated = 0;
      let missing = 0;

      students.forEach((student) => {
        const lastUpdated = portraitMap.get(student.id);
        if (!lastUpdated) {
          missing++;
          return;
        }

        const daysSinceUpdate =
          (now.getTime() - new Date(lastUpdated).getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysSinceUpdate <= 7) fresh++;
        else if (daysSinceUpdate <= 30) stale++;
        else outdated++;
      });

      setHealth({
        total: students.length,
        fresh,
        stale,
        outdated,
        missing,
      });
    } catch (error) {
      console.error("分析画像健康度失败:", error);
      toast.error("分析失败");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 组件加载时自动分析健康度
  React.useEffect(() => {
    if (className) {
      analyzeHealth();
    }
  }, [className]);

  // 批量生成画像
  const batchGenerate = async (mode: "missing" | "outdated" | "all") => {
    setIsGenerating(true);
    setProgress(0);

    try {
      // 1. 获取需要生成的学生列表
      const { data: students, error } = await supabase
        .from("students")
        .select("id, student_id, name")
        .eq("class_name", className);

      if (error || !students) {
        toast.error("获取学生列表失败");
        return;
      }

      // 2. 过滤需要生成的学生
      let targetStudents = students;

      if (mode !== "all") {
        const { data: existingPortraits } = await supabase
          .from("student_portraits")
          .select("student_id, last_updated")
          .in(
            "student_id",
            students.map((s) => s.id)
          );

        const portraitMap = new Map(
          (existingPortraits || []).map((p) => [p.student_id, p.last_updated])
        );

        targetStudents = students.filter((student) => {
          const lastUpdated = portraitMap.get(student.id);

          if (mode === "missing") {
            return !lastUpdated;
          }

          if (mode === "outdated") {
            if (!lastUpdated) return true;
            const daysSinceUpdate =
              (new Date().getTime() - new Date(lastUpdated).getTime()) /
              (1000 * 60 * 60 * 24);
            return daysSinceUpdate > 30;
          }

          return false;
        });
      }

      if (targetStudents.length === 0) {
        toast.info("没有需要生成的画像");
        setIsGenerating(false);
        return;
      }

      // 3. 逐个生成画像
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < targetStudents.length; i++) {
        const student = targetStudents[i];
        setCurrentStudent(student.name);
        setProgress(((i + 1) / targetStudents.length) * 100);

        try {
          // 生成画像
          await intelligentPortraitService.generateStudentPortrait(
            student.student_id
          );
          successCount++;

          // 避免请求过快
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`生成${student.name}的画像失败:`, error);
          failCount++;
        }
      }

      // 4. 显示结果
      if (failCount === 0) {
        toast.success(`成功生成 ${successCount} 个学生画像`);
      } else {
        toast.warning(
          `生成完成：成功 ${successCount} 个，失败 ${failCount} 个`
        );
      }

      // 5. 刷新健康度
      await analyzeHealth();
      onComplete?.();
    } catch (error) {
      console.error("批量生成失败:", error);
      toast.error("批量生成失败");
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setCurrentStudent("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>画像批量操作</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={analyzeHealth}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                检查健康度
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 健康度概览 */}
        {health && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {health.fresh}
              </div>
              <div className="text-sm text-gray-600">新鲜画像</div>
              <div className="text-xs text-gray-500 mt-1">&lt;7天</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {health.stale}
              </div>
              <div className="text-sm text-gray-600">一般画像</div>
              <div className="text-xs text-gray-500 mt-1">7-30天</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {health.outdated}
              </div>
              <div className="text-sm text-gray-600">过期画像</div>
              <div className="text-xs text-gray-500 mt-1">&gt;30天</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                {health.missing}
              </div>
              <div className="text-sm text-gray-600">缺失画像</div>
              <div className="text-xs text-gray-500 mt-1">未生成</div>
            </div>
          </div>
        )}

        {/* 批量操作按钮 */}
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isGenerating || !health || health.missing === 0}
              >
                <Zap className="w-4 h-4 mr-2" />
                生成缺失画像 ({health?.missing || 0})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>批量生成缺失画像</AlertDialogTitle>
                <AlertDialogDescription>
                  将为 {health?.missing || 0} 名学生生成画像。
                  <br />
                  这可能需要几分钟时间，确定继续吗？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => batchGenerate("missing")}>
                  开始生成
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isGenerating || !health || health.outdated === 0}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                更新过期画像 ({health?.outdated || 0})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>更新过期画像</AlertDialogTitle>
                <AlertDialogDescription>
                  将更新 {health?.outdated || 0} 个过期画像。
                  <br />
                  这可能需要几分钟时间，确定继续吗？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => batchGenerate("outdated")}>
                  开始更新
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isGenerating || !health}>
                <Users className="w-4 h-4 mr-2" />
                全班重新生成 ({health?.total || 0})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>全班重新生成画像</AlertDialogTitle>
                <AlertDialogDescription>
                  将为全班 {health?.total || 0} 名学生重新生成画像。
                  <br />
                  <strong className="text-orange-600">
                    这将覆盖现有画像，耗时较长，确定继续吗？
                  </strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => batchGenerate("all")}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  确定重新生成
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* 进度显示 */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">正在生成: {currentStudent}</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* 健康度建议 */}
        {health && (health.missing > 0 || health.outdated > 0) && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-medium text-blue-900 mb-1">建议操作</div>
                {health.missing > 0 && (
                  <div className="text-blue-800">
                    • 有 {health.missing} 名学生缺少画像，建议立即生成
                  </div>
                )}
                {health.outdated > 0 && (
                  <div className="text-blue-800">
                    • 有 {health.outdated} 个画像已过期，建议更新以获得最新分析
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {health && health.missing === 0 && health.outdated === 0 && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800">
                所有画像状态良好，无需批量操作
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
