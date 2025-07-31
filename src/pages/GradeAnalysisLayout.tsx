/**
 * 🎨 现代化成绩分析页面
 * 基于新的架构和设计理念重构
 * 支持从考试管理中心跳转并自动筛选考试
 */

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ModernGradeAnalysisProvider } from "@/contexts/ModernGradeAnalysisContext";
import CompleteAnalyticsDashboard from "@/components/analysis/dashboard/CompleteAnalyticsDashboard_Safe";
import Navbar from "@/components/shared/Navbar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, ArrowLeft, BarChart3 } from "lucide-react";

const GradeAnalysisLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedExamInfo, setSelectedExamInfo] = useState<{
    examId: string;
    examTitle: string;
    examDate: string;
    examType: string;
  } | null>(null);

  // 检查URL参数中是否有考试信息
  useEffect(() => {
    console.log("🔍 基础分析页面 - 检查URL参数:", location.search);
    console.log("🔍 完整URL:", window.location.href);

    const urlParams = new URLSearchParams(location.search);
    const examId = urlParams.get("examId");
    const examTitle = urlParams.get("examTitle");
    const examDate = urlParams.get("examDate");
    const examType = urlParams.get("examType");
    const filterByTitle = urlParams.get("filterByTitle");

    console.log("📋 URL参数解析:", {
      examId,
      examTitle,
      examDate,
      examType,
      filterByTitle,
    });
    console.log("🔍 URLSearchParams 迭代器:");
    for (const [key, value] of urlParams) {
      console.log(`  ${key} = "${value}"`);
    }

    if (examId && examTitle) {
      const examInfo = {
        examId,
        examTitle,
        examDate: examDate || "",
        examType: examType || "",
      };

      console.log("✅ 设置考试信息:", examInfo);
      setSelectedExamInfo(examInfo);

      // 显示成功提示
      toast.success("已自动选择考试", {
        description: `正在分析: ${examTitle}`,
        duration: 3000,
      });

      // 添加延迟再次提示，确保用户知道筛选应该生效
      setTimeout(() => {
        toast.info("筛选参数已设置，正在应用筛选...", {
          description: `筛选条件: examId=${examId}, examTitle="${examTitle}"`,
          duration: 5000,
        });
      }, 1000);
    } else {
      console.log("❌ 缺少必需的URL参数");
      console.log("🔍 具体情况:");
      console.log(`  examId: "${examId}" (${typeof examId})`);
      console.log(`  examTitle: "${examTitle}" (${typeof examTitle})`);

      if (!location.search) {
        console.log("⚠️ URL中没有查询参数!");
      }
    }
  }, [location.search]);

  // 清除考试选择，返回普通分析模式
  const handleClearExamSelection = () => {
    setSelectedExamInfo(null);
    navigate("/grade-analysis", { replace: true });
    toast.info("已切换到普通分析模式");
  };

  // 返回考试管理中心
  const handleBackToExamManagement = () => {
    navigate("/exam-management");
  };

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
                      <BarChart3 className="h-5 w-5 text-[#B9FF66]" />
                      <span className="font-medium text-gray-800">
                        正在分析特定考试
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
                examTitles: [selectedExamInfo.examTitle], // 添加按标题筛选
              }
            : undefined
        }
      >
        <CompleteAnalyticsDashboard />
      </ModernGradeAnalysisProvider>
    </div>
  );
};

export default GradeAnalysisLayout;
