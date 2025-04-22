
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart2, 
  Users, 
  FileText, 
  UserCircle, 
  File as FileImport, // Changed from 'FileImport' to 'File'
  Settings as SettingsIcon, 
  LogIn as LogInIcon, 
  Home as HomeIcon, 
  MessageSquare as WechatIcon 
} from "lucide-react";
import { toast } from "sonner";

const Index: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const handleLogin = () => {
    // 模拟登录过程，实际实现中会连接到微信登录API
    toast.success("登录成功", { description: "欢迎回到学业智能分析平台" });
    setIsLoggedIn(true);
  };
  
  const handleWechatLogin = () => {
    // 模拟微信登录过程
    toast.info("正在连接到微信...", { duration: 1500 });
    setTimeout(() => {
      toast.success("微信登录成功", { description: "已通过微信账号登录" });
      setIsLoggedIn(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/5404ad9ad18a6dff6da5f0646acd0f77aa36f47d?placeholderIfAbsent=true"
              className="h-8 w-auto"
              alt="教师分析平台"
            />
            <h1 className="text-xl font-bold">学业智能分析平台</h1>
          </div>
          <nav className="flex space-x-2">
            {isLoggedIn ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/grade-analysis">
                    <BarChart2 className="h-4 w-4 mr-2" />
                    成绩分析
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/student-management">
                    <Users className="h-4 w-4 mr-2" />
                    学生管理
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/ai-settings">
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    AI设置
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    toast.info("已退出登录");
                    setIsLoggedIn(false);
                  }}
                >
                  <LogInIcon className="h-4 w-4 mr-2" />
                  退出
                </Button>
              </>
            ) : (
              <>
                <Button 
                  className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
                  onClick={handleLogin}
                >
                  <LogInIcon className="h-4 w-4 mr-2" />
                  登录
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={handleWechatLogin}
                >
                  <WechatIcon className="h-4 w-4 mr-2" />
                  微信登录
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {!isLoggedIn ? (
          <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2 space-y-6">
                <h2 className="text-4xl font-bold">教育数据智能分析平台</h2>
                <p className="text-xl text-gray-600">
                  利用人工智能技术分析学生成绩数据，提供个性化教学建议和学生学习改进方案
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-[#B9FF66] p-2 rounded-full">
                      <FileImport className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">智能数据导入</h3>
                      <p className="text-gray-600">自动识别并解析多种数据格式，快速导入成绩数据</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-[#B9FF66] p-2 rounded-full">
                      <BarChart2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">可视化图表分析</h3>
                      <p className="text-gray-600">自动生成多维度图表，直观展示学生成绩数据</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-[#B9FF66] p-2 rounded-full">
                      <SettingsIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">AI智能分析</h3>
                      <p className="text-gray-600">基于大模型的智能分析，提供个性化教学建议</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button 
                    className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]" 
                    size="lg"
                    onClick={handleLogin}
                  >
                    开始使用
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => toast.info("功能演示即将推出")}
                  >
                    查看演示
                  </Button>
                </div>
              </div>
              <div className="md:w-1/2">
                <img 
                  src="https://i.imgur.com/7M0kBdg.png" 
                  alt="分析平台界面" 
                  className="rounded-lg shadow-lg border border-gray-100 w-full" 
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">快速操作</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <FileImport className="h-5 w-5" />
                      导入数据
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">导入学生成绩数据，支持多种格式自动识别</p>
                    <Button className="w-full" asChild>
                      <Link to="/grade-analysis">开始导入</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart2 className="h-5 w-5" />
                      分析报告
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">查看已生成的分析报告和数据图表</p>
                    <Button className="w-full" asChild>
                      <Link to="/grade-analysis">查看报告</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5" />
                      学生画像
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">查看学生个人学习情况和能力分析</p>
                    <Button className="w-full" asChild>
                      <Link to="/student-profile/2024001">查看画像</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">最近分析</h2>
              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">三年级二班期中考试成绩分析</h3>
                        <p className="text-gray-500 text-sm mt-1">分析时间: 2023-11-15</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/grade-analysis">查看详情</Link>
                      </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-gray-500 text-xs">总人数</p>
                        <p className="font-semibold text-lg">42</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-gray-500 text-xs">平均分</p>
                        <p className="font-semibold text-lg">82.5</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-gray-500 text-xs">最高分</p>
                        <p className="font-semibold text-lg">98</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-gray-500 text-xs">及格率</p>
                        <p className="font-semibold text-lg">94.6%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">© 2025 学业智能分析平台</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-500 text-sm hover:text-gray-700">关于我们</a>
            <a href="#" className="text-gray-500 text-sm hover:text-gray-700">使用帮助</a>
            <a href="#" className="text-gray-500 text-sm hover:text-gray-700">联系客服</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
