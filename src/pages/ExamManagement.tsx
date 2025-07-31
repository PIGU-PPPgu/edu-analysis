/**
 * 考试管理页面
 * 使用重新设计的考试管理中心组件
 */

import React from "react";
import { Navbar } from "@/components/shared";
import ExamManagementCenter from "@/components/exam/ExamManagementCenter";

const ExamManagement: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ExamManagementCenter />
    </div>
  );
};

export default ExamManagement;
