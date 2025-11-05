/**
 * 预警分析页面 - 重定向到新的预警分析系统
 * 这个文件现在重定向到新的预警分析页面
 */

import { useEffect } from "react";

export default function WarningAnalysisPage() {
  useEffect(() => {
    // 重定向到预警分析页面
    window.location.replace("/warning-analysis");
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B9FF66] mx-auto mb-4"></div>
        <p className="text-lg font-medium text-[#191A23]">
          正在跳转到预警分析系统...
        </p>
      </div>
    </div>
  );
}
