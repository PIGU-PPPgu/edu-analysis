import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, Import } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import DataExport from "./DataExport";

const Navbar: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Sample data structure for export
  const exportData = {
    students: [
      { id: "2024001", name: "张三", class: "高一(1)班" },
      { id: "2024002", name: "李四", class: "高一(1)班" },
    ],
    grades: [
      { studentId: "2024001", subject: "数学", score: 85 },
      { studentId: "2024002", subject: "数学", score: 92 },
    ],
    classInfo: [
      { className: "高一(1)班", avgScore: 88.5, studentCount: 45 },
      { className: "高一(2)班", avgScore: 86.3, studentCount: 42 },
    ],
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex gap-2.5">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/5404ad9ad18a6dff6da5f0646acd0f77aa36f47d?placeholderIfAbsent=true"
              className="h-8 w-auto"
              alt="教师分析平台"
            />
          </Link>
        </div>
        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            数据导入
          </Link>
          <Link
            to="/homework"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/homework') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            作业管理
          </Link>
          <Link
            to="/grade-analysis"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/grade-analysis') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            成绩分析
          </Link>
          <Link
            to="/warning-analysis"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/warning-analysis') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            预警分析
          </Link>
          <Link
            to="/student-profile/20230001"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/student-profile') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            学生画像
          </Link>
          <Link
            to="/class-management"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/class-management') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            班级管理
          </Link>
          <Link
            to="/ai-settings"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/ai-settings') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            AI设置
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4"
              >
                <FileText className="h-4 w-4 mr-2" />
                导出数据
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>数据导出</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <DataExport data={exportData} />
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </div>
  );
};

export default Navbar;
