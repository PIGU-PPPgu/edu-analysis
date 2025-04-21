
import React from "react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  return (
    <div className="flex w-full max-w-[1440px] items-center gap-[40px_100px] overflow-hidden justify-between flex-wrap px-[100px] max-md:max-w-full max-md:px-5 py-6 border-b">
      <div className="self-stretch flex gap-2.5 overflow-hidden w-[220px] my-auto py-2.5">
        <Link to="/">
          <img
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/5404ad9ad18a6dff6da5f0646acd0f77aa36f47d?placeholderIfAbsent=true"
            className="aspect-[6.1] object-contain w-[220px]"
            alt="教师分析平台"
          />
        </Link>
      </div>
      <div className="self-stretch flex min-w-60 items-center gap-10 text-xl text-black font-normal leading-[1.4] justify-center flex-wrap my-auto max-md:max-w-full">
        <Link
          to="/"
          className="self-stretch my-auto hover:text-gray-600 transition-colors"
        >
          首页
        </Link>
        <Link
          to="/grade-analysis"
          className="self-stretch my-auto text-[#B9FF66] font-medium"
        >
          成绩分析
        </Link>
        <Link
          to="/student-management"
          className="self-stretch my-auto hover:text-gray-600 transition-colors"
        >
          学生管理
        </Link>
        <Link
          to="/reports"
          className="self-stretch my-auto hover:text-gray-600 transition-colors"
        >
          报告中心
        </Link>
        <Link
          to="/help"
          className="self-stretch my-auto hover:text-gray-600 transition-colors"
        >
          帮助文档
        </Link>
        <button
          className="self-stretch gap-2.5 text-center my-auto px-[35px] py-5 rounded-[14px] bg-[#191A23] text-white hover:bg-[#2d2e3d] transition-colors max-md:px-5"
          onClick={() => console.log("用户点击了导出数据")}
        >
          导出数据
        </button>
      </div>
    </div>
  );
};

export default Navbar;
