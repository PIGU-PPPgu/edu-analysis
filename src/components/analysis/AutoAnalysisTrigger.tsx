// ===========================================
// 🎯 自动分析触发器组件
// 集成到成绩导入流程中，实现自动触发
// ===========================================

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Users,
  BarChart3,
  MessageSquare,
  Bot,
} from "lucide-react";
import {
  getUserWechatSettings,
  isNotificationEnabled,
  type WechatSettings,
} from "@/services/wechatSettingsService";
import { supabase } from "@/integrations/supabase/client";

interface AutoAnalysisTriggerProps {
  examTitle: string;
  className?: string;
  studentCount: number;
  onImportComplete?: () => void;
  autoTrigger?: boolean; // 是否自动触发
  enableWechatChoice?: boolean; // 是否显示企业微信选择
}

const AutoAnalysisTrigger: React.FC<AutoAnalysisTriggerProps> = ({
  examTitle,
  className,
  studentCount,
  onImportComplete,
  autoTrigger = true,
  enableWechatChoice = true,
}) => {
  const [analysisStatus, setAnalysisStatus] = useState<
    "idle" | "triggering" | "processing" | "completed" | "failed"
  >("idle");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // 企业微信推送相关状态
  const [wechatSettings, setWechatSettings] = useState<WechatSettings | null>(
    null
  );
  const [enableWechatPush, setEnableWechatPush] = useState(false);
  const [wechatAvailable, setWechatAvailable] = useState(false);

  // 获取成绩数据
  const fetchGradeData = async (
    examTitle: string,
    className?: string
  ): Promise<string> => {
    try {
      // 从Supabase获取成绩数据
      let query = supabase
        .from("grade_data")
        .select("*")
        .eq("exam_title", examTitle);

      if (className) {
        query = query.eq("class_name", className);
      }

      const { data: grades, error } = await query;

      if (error) {
        throw new Error(`获取成绩数据失败: ${error.message}`);
      }

      if (!grades || grades.length === 0) {
        throw new Error("未找到对应的成绩数据");
      }

      // 转换为CSV格式
      const headers = Object.keys(grades[0]).join(",");
      const rows = grades.map((grade) =>
        Object.values(grade)
          .map((value) =>
            typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value
          )
          .join(",")
      );

      return [headers, ...rows].join("\n");
    } catch (error) {
      console.error("获取成绩数据失败:", error);
      throw error;
    }
  };

  // 根据学生数量选择分析类型
  const getAnalysisType = (
    studentCount: number
  ): "simple" | "detailed" | "premium" | "batch" => {
    if (studentCount <= 30) return "simple";
    if (studentCount <= 100) return "detailed";
    if (studentCount <= 300) return "premium";
    return "batch";
  };

  // 加载企业微信设置
  const loadWechatSettings = async () => {
    try {
      const settings = await getUserWechatSettings();
      setWechatSettings(settings);

      if (settings && settings.is_enabled) {
        const canPush = await isNotificationEnabled("grade_analysis");
        setWechatAvailable(canPush);
        setEnableWechatPush(canPush);
      }
    } catch (error) {
      console.error("加载企业微信设置失败:", error);
      setWechatAvailable(false);
      setEnableWechatPush(false);
    }
  };

  // 自动触发分析
  const triggerAnalysis = async (isAutoTrigger = false) => {
    if (!examTitle) {
      toast.error("考试标题不能为空");
      return;
    }

    try {
      setAnalysisStatus("triggering");
      setProgress(10);

      console.log("🚀 触发成绩分析:", {
        examTitle,
        className,
        studentCount,
        isAutoTrigger,
        enableWechatPush,
      });

      // 获取成绩数据
      const gradeData = await fetchGradeData(examTitle, className);
      setProgress(30);

      // 调用Supabase Edge Function进行分析
      const { data, error } = await supabase.functions.invoke(
        "analyze-grades",
        {
          body: {
            exam_title: examTitle,
            class_name: className,
            analysis_type: getAnalysisType(studentCount),
            grade_data: gradeData,
            enable_wechat_push: enableWechatPush,
            webhook_url: wechatSettings?.webhook_url || null,
            focus_mode: "all",
          },
        }
      );

      setProgress(50);

      if (error) {
        throw new Error(error.message || "调用Edge Function失败");
      }

      if (data?.success) {
        setAnalysisStatus("completed");
        setProgress(100);
        setAnalysisResult(data.data?.result || "分析完成");

        if (isAutoTrigger) {
          toast.success("🤖 成绩分析已自动完成");
        } else {
          toast.success("✅ 成绩分析已完成");
        }

        if (enableWechatPush && data.data?.wechat_push?.success) {
          toast.success("📱 分析结果已推送到企业微信");
        } else if (enableWechatPush && !data.data?.wechat_push?.success) {
          toast.warning("⚠️ 分析完成，但企业微信推送失败");
        }

        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        throw new Error(data?.message || "分析失败");
      }
    } catch (error) {
      console.error("❌ 触发分析失败:", error);
      setAnalysisStatus("failed");
      setProgress(0);

      toast.error(`分析触发失败: ${error.message}`);
    }
  };

  // 组件加载时初始化
  useEffect(() => {
    if (enableWechatChoice) {
      loadWechatSettings();
    }
  }, [enableWechatChoice]);

  // 组件加载时自动触发
  useEffect(() => {
    if (autoTrigger && examTitle && studentCount > 0) {
      console.log("🎯 自动触发分析条件满足");
      // 延迟2秒自动触发，给用户时间看到导入成功
      setTimeout(() => {
        triggerAnalysis(true);
      }, 2000);
    }
  }, [autoTrigger, examTitle, studentCount]);

  // 获取状态显示
  const getStatusDisplay = () => {
    switch (analysisStatus) {
      case "idle":
        return {
          icon: BarChart3,
          text: "准备分析",
          color: "bg-blue-100 text-blue-800",
          description: "点击开始分析或等待自动触发",
        };
      case "triggering":
        return {
          icon: RefreshCw,
          text: "触发中",
          color: "bg-yellow-100 text-yellow-800",
          description: "正在触发分析流程...",
        };
      case "processing":
        return {
          icon: RefreshCw,
          text: "分析中",
          color: "bg-blue-100 text-blue-800",
          description: "AI正在分析成绩数据...",
        };
      case "completed":
        return {
          icon: CheckCircle,
          text: "已完成",
          color: "bg-green-100 text-green-800",
          description: "分析完成，结果已推送",
        };
      case "failed":
        return {
          icon: AlertCircle,
          text: "失败",
          color: "bg-red-100 text-red-800",
          description: "分析失败，请重试",
        };
      default:
        return {
          icon: Clock,
          text: "等待",
          color: "bg-gray-100 text-gray-800",
          description: "等待中...",
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          智能成绩分析
          {autoTrigger && analysisStatus === "idle" && (
            <Badge variant="outline" className="ml-2">
              自动触发
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">考试标题</p>
                <p className="font-medium">{examTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">学生数量</p>
                <p className="font-medium">{studentCount} 名</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusDisplay.color}>
                <StatusIcon
                  className={`h-3 w-3 mr-1 ${analysisStatus === "processing" || analysisStatus === "triggering" ? "animate-spin" : ""}`}
                />
                {statusDisplay.text}
              </Badge>
            </div>
          </div>

          {/* 企业微信推送选择 */}
          {enableWechatChoice && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">企业微信推送</p>
                    <p className="text-sm text-gray-600">
                      {wechatAvailable
                        ? "分析完成后推送报告到企业微信群组"
                        : "未配置企业微信机器人"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {wechatAvailable && (
                    <Switch
                      checked={enableWechatPush}
                      onCheckedChange={setEnableWechatPush}
                      disabled={
                        analysisStatus === "processing" ||
                        analysisStatus === "triggering"
                      }
                    />
                  )}
                  {!wechatAvailable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("/ai-settings", "_blank")}
                    >
                      <Bot className="h-4 w-4 mr-1" />
                      配置
                    </Button>
                  )}
                </div>
              </div>

              {enableWechatPush && wechatSettings && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>将推送到: {wechatSettings.webhook_name}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 进度条 */}
          {(analysisStatus === "triggering" ||
            analysisStatus === "processing") && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* 状态描述 */}
          <p className="text-sm text-gray-600">{statusDisplay.description}</p>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {analysisStatus === "idle" && (
              <Button
                onClick={() => triggerAnalysis(false)}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                手动触发分析
              </Button>
            )}

            {analysisStatus === "failed" && (
              <Button
                onClick={() => triggerAnalysis(false)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                重试分析
              </Button>
            )}

            {analysisStatus === "completed" && analysisResult && (
              <Button
                variant="outline"
                onClick={() => toast.info(`分析结果: ${analysisResult}`)}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                查看结果
              </Button>
            )}
          </div>

          {/* 自动触发说明 */}
          {autoTrigger && analysisStatus === "idle" && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                🤖 <strong>智能提示:</strong> 系统将在2秒后自动触发AI分析，
                分析完成后结果会自动推送到企业微信群组。
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoAnalysisTrigger;
