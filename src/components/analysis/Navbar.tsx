
import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
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
            首页
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
            to="/student-profile"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/student-profile') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            学生画像
          </Link>
          <Link
            to="/student-management"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/student-management') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            学生管理
          </Link>
          <Link
            to="/class-management"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/class-management') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            班级管理
          </Link>
          <button
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4"
            onClick={() => console.log("用户点击了导出数据")}
          >
            导出数据
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Navbar;
