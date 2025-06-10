import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, BarChart2, ListChecks, FileText } from "lucide-react";
// import HomeworkAnalysisDashboard from "../analysis/HomeworkAnalysisDashboard"; // 已删除

export default function HomeworkManagementPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">作业管理</h1>
          <p className="text-muted-foreground">管理、发布和分析学生作业提交情况</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            导出报告
          </Button>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            创建作业
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="dashboard">
            <BarChart2 className="mr-2 h-4 w-4" />
            数据分析
          </TabsTrigger>
          <TabsTrigger value="homeworks">
            <ListChecks className="mr-2 h-4 w-4" />
            作业列表
          </TabsTrigger>
          <TabsTrigger value="stats">
            <FileText className="mr-2 h-4 w-4" />
            统计报告
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
                      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-medium mb-2">作业分析面板</h3>
              <p className="text-gray-500 text-center">
                作业分析功能正在重构中，敬请期待
              </p>
            </div>
        </TabsContent>
        
        <TabsContent value="homeworks">
          <Card>
            <CardHeader>
              <CardTitle>作业列表</CardTitle>
              <CardDescription>管理已创建的所有作业</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                暂未实现作业列表功能，请切换到数据分析标签页查看作业分析
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>统计报告</CardTitle>
              <CardDescription>查看作业统计数据和生成报告</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                暂未实现统计报告功能，请切换到数据分析标签页查看作业分析
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 