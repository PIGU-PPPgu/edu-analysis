/**
 * 高级分析页面
 * 面向数据分析师和教学主管的深度分析工具
 */

import React, { useState, useEffect } from "react";
import { ModernGradeAnalysisProvider } from "@/contexts/ModernGradeAnalysisContext";
import AdvancedAnalyticsDashboard from "@/components/analysis/dashboard/AdvancedAnalyticsDashboard";
import Navbar from "@/components/shared/Navbar";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdvancedAnalysis: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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

      console.error("捕获到全局错误:", event.error);
      setError(`页面加载错误: ${event.error?.message || "未知错误"}`);
      event.preventDefault();
    };

    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("error", handleError);
    };
  }, []);

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
        <ModernGradeAnalysisProvider>
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
