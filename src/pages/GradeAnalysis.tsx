import React, { useState, useEffect } from "react";
import GradeAnalysisLayout from "./GradeAnalysisLayout";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// 这个组件只负责成绩分析功能，数据导入功能将只在首页实现
const GradeAnalysis: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 错误处理器，用于捕获和显示组件树中的任何错误
  useEffect(() => {
    // 添加全局错误处理
    const handleError = (event: ErrorEvent) => {
      // 忽略 null 错误和 ResizeObserver 错误
      if (!event.error || 
          (typeof event.error === 'object' && event.error === null) ||
          (event.error?.message && event.error.message.toLowerCase().includes('resizeobserver'))) {
        return;
      }
      
      console.error('捕获到全局错误:', event.error);
      setError(`页面加载错误: ${event.error?.message || '未知错误'}`);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-50 border border-red-400 text-red-700 p-4 rounded mb-6">
          <h2 className="text-lg font-bold mb-2">页面加载失败</h2>
          <p className="mb-4">{error}</p>
          <p className="text-sm">
            请确保已在Supabase中执行了创建标签相关表的SQL脚本，并刷新页面。
          </p>
          <div className="mt-4 flex gap-3">
            <Button 
              variant="destructive"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/")}
            >
              返回首页
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // 正常渲染 - 直接使用现代化布局，移除旧的Provider包装
  try {
    return <GradeAnalysisLayout />;
  } catch (err) {
    console.error('渲染错误:', err);
    setError(`渲染错误: ${err instanceof Error ? err.message : '未知错误'}`);
    return null;
  }
};

export default GradeAnalysis;
