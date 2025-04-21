
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">学业智能分析平台</h1>
        <nav className="flex space-x-4">
          <Button variant="outline" asChild>
            <Link to="/grade-analysis">成绩分析</Link>
          </Button>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-10 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>成绩分析</CardTitle>
            </CardHeader>
            <CardContent>
              <p>智能解析学生成绩数据，提供全面分析</p>
              <Button className="mt-4" asChild>
                <Link to="/grade-analysis">开始分析</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>学生画像</CardTitle>
            </CardHeader>
            <CardContent>
              <p>深入了解学生学习状况，提供个性化建议</p>
              <Button className="mt-4" variant="secondary" disabled>
                即将推出
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-6 text-center">
        <p className="text-gray-500">© 2024 学业智能分析平台</p>
      </footer>
    </div>
  );
};

export default Index;
