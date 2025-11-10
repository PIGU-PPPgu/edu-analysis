/**
 * 高级分析页面
 * 面向数据分析师和教学主管的深度分析工具
 * 支持从考试管理中心跳转并自动筛选考试
 */

import React, { useState, useEffect } from "react";
import AdvancedAnalyticsDashboard from "@/components/analysis/dashboard/AdvancedAnalyticsDashboard_Fixed";
import { ModernGradeAnalysisProvider } from "@/contexts/ModernGradeAnalysisContext";
import Navbar from "@/components/shared/Navbar";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, ArrowLeft, TrendingUp } from "lucide-react";

const AdvancedAnalysis: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedExamInfo, setSelectedExamInfo] = useState<{
    examId: string;
    examTitle: string;
    examDate: string;
    examType: string;
  } | null>(null);

  // 检查URL参数中是否有考试信息
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const examId = urlParams.get("examId");
    const examTitle = urlParams.get("examTitle");
    const examDate = urlParams.get("examDate");
    const examType = urlParams.get("examType");

    if (examId && examTitle) {
      const examInfo = {
        examId,
        examTitle,
        examDate: examDate || "",
        examType: examType || "",
      };

      setSelectedExamInfo(examInfo);

      toast.success("已自动选择考试", {
        description: `正在进行高级分析: ${examTitle}`,
        duration: 3000,
      });
    }
  }, [location.search]);

  // 错误处理器
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (
        !event.error ||
        (typeof event.error === "object" && event.error === null) ||
        (event.error?.message &&
          event.error.message.toLowerCase().includes("resizeobserver"))
      ) {
        return;
      }

      setError(`页面加载错误: ${event.error?.message || "未知错误"}`);
      event.preventDefault();
    };

    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("error", handleError);
    };
  }, []);

  // 清除考试选择，返回普通分析模式
  const handleClearExamSelection = () => {
    setSelectedExamInfo(null);
    navigate("/advanced-analysis", { replace: true });
    toast.info("已切换到普通高级分析模式");
  };

  // 返回考试管理中心
  const handleBackToExamManagement = () => {
    navigate("/exam-management");
  };

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-50 border border-red-400 text-red-700 p-4 rounded mb-6">
          <h2 className="text-lg font-bold mb-2">高级分析引擎加载失败</h2>
          <p className="mb-4">{error}</p>
          <p className="text-sm">
            请确保已在AI设置中配置相关服务，并刷新页面。
          </p>
          <div className="mt-4 flex gap-3">
            <Button
              variant="destructive"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              返回首页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 正常渲染高级分析界面
  try {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        {/* 考试选择提示条 */}
        {selectedExamInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-gray-200 bg-white shadow-sm"
          >
            <div className="container mx-auto px-4 py-4">
              <Card className="border-l-4 border-l-[#B9FF66] bg-[#B9FF66]/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-[#B9FF66]" />
                        <span className="font-medium text-gray-800">
                          正在进行高级分析
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className="border-[#B9FF66] text-[#B9FF66]"
                        >
                          {selectedExamInfo.examType}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-medium">
                            {selectedExamInfo.examTitle}
                          </span>
                        </div>
                        {selectedExamInfo.examDate && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>{selectedExamInfo.examDate}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToExamManagement}
                        className="gap-1 hover:shadow-md transition-all duration-200"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        返回考试管理
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearExamSelection}
                        className="gap-1 hover:shadow-md transition-all duration-200"
                      >
                        清除筛选
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        <ModernGradeAnalysisProvider
          key={selectedExamInfo ? `exam-${selectedExamInfo.examId}` : "no-exam"}
          initialFilter={
            selectedExamInfo
              ? {
                  examIds: [selectedExamInfo.examId],
                  examTitles: [selectedExamInfo.examTitle],
                }
              : undefined
          }
        >
          <AdvancedAnalyticsDashboard />
        </ModernGradeAnalysisProvider>
      </div>
    );
  } catch (err) {
    console.error("渲染错误:", err);
    setError(`渲染错误: ${err instanceof Error ? err.message : "未知错误"}`);
    return null;
  }
};

export default AdvancedAnalysis;
