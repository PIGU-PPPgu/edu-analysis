/**
 * 考试管理页面
 * 使用重新设计的考试管理中心组件
 * 🚀 Phase 4: Lazy loading optimization for large component (2490 lines)
 */

import React, { Suspense, lazy } from "react";
import { Navbar } from "@/components/shared";
import { PageLoadingFallback } from "@/components/ui/loading-fallback";

// Lazy load the large ExamManagementCenter component
const ExamManagementCenter = lazy(
  () => import("@/components/exam/ExamManagementCenter")
);

const ExamManagement: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Suspense fallback={<PageLoadingFallback />}>
        <ExamManagementCenter />
      </Suspense>
    </div>
  );
};

export default ExamManagement;
