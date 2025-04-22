
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AuthButtons from "../auth/AuthButtons";

interface HeroProps {
  isLoggedIn: boolean;
  onLogin: () => Promise<void>;
  onWechatLogin: () => Promise<void>;
}

const Hero = ({ isLoggedIn, onLogin, onWechatLogin }: HeroProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-12 items-center py-16">
      <div className="md:w-1/2 space-y-6">
        <h1 className="text-5xl font-bold leading-tight">
          让教育数据分析更简单
        </h1>
        <p className="text-xl text-gray-600">
          智能分析学生成绩数据，提供个性化教学建议，助力教育工作者提升教学效果
        </p>
        <div className="pt-4 space-x-4">
          {!isLoggedIn && (
            <AuthButtons onLogin={onLogin} onWechatLogin={onWechatLogin} />
          )}
          {isLoggedIn && (
            <Button 
              size="lg"
              className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
              asChild
            >
              <Link to="/grade-analysis">开始分析</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="md:w-1/2">
        <img 
          src="https://i.imgur.com/7M0kBdg.png"
          alt="数据分析平台界面" 
          className="rounded-lg shadow-xl border border-gray-100"
        />
      </div>
    </div>
  );
};

export default Hero;
