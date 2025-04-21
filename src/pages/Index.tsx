
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Users, FileText, UserCircle } from "lucide-react";

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">学业智能分析平台</h1>
        <nav className="flex space-x-4">
          <Button variant="outline" asChild>
            <Link to="/student-management">学生管理</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/class-management">班级管理</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/grade-analysis">成绩分析</Link>
          </Button>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-10 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                成绩分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">智能解析学生成绩数据，提供全面分析</p>
              <Button className="w-full" asChild>
                <Link to="/grade-analysis">查看分析</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                学生管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">管理学生信息，查看学生详细数据</p>
              <Button className="w-full" asChild>
                <Link to="/student-management">管理学生</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                班级管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">班级数据分析，班级对比与班级画像</p>
              <Button className="w-full" asChild>
                <Link to="/class-management">查看班级</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                学生画像
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">深入了解学生学习状况，提供个性化建议</p>
              <Button className="w-full" asChild>
                <Link to="/student-profile/2024001">查看画像</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-6 text-center border-t mt-10">
        <p className="text-gray-500">© 2024 学业智能分析平台</p>
      </footer>
    </div>
  );
};

export default Index;
