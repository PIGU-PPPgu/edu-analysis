import React, { useEffect, useRef } from "react";
import { Metadata } from "next";
import WarningAnalysis from "@/components/warning/WarningAnalysis";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { HomeIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "学生预警分析系统",
  description: "全面的学生预警分析工具，集成多种预警算法和AI辅助分析",
};

export default function WarningAnalysisPage() {
  // 添加组件挂载状态ref
  const isMountedRef = useRef(true);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">
            <HomeIcon className="h-4 w-4 mr-1" />
            首页
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">预警分析</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      
      <WarningAnalysis />
    </div>
  );
} 