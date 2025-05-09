import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import GradeDistributionChart from "./GradeDistributionChart";
import GradeTrendChart from "./GradeTrendChart";
import GradeSankeyChart from "./GradeSankeyChart";
import KnowledgePointHeatmap from "./KnowledgePointHeatmap";
import QuestionDifficultyChart from "./QuestionDifficultyChart";
import ClassPerformanceTable from "./ClassPerformanceTable";
import StudentGroupsChart from "./StudentGroupsChart";
import GroupProgressChart from "./GroupProgressChart";
import StudentVsGroupChart from "./StudentVsGroupChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronRight, BarChart3, Clock, LucideTarget, Users, TrendingUp } from "lucide-react";

interface HomeworkAnalysisDashboardProps {
  className?: string;
}

export default function HomeworkAnalysisDashboard({ className }: HomeworkAnalysisDashboardProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("grade");
  const [activeAnalysisType, setActiveAnalysisType] = useState("basic");

  // 刷新数据
  const handleRefresh = () => {
    setIsRefreshing(true);
    // 使用refreshKey状态变量强制组件重新获取数据
    setRefreshKey(prevKey => prevKey + 1);
    
    // 显示短暂的加载状态
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className={className}>
      {/* 顶部信息卡片 */}
      <div className="grid gap-4">
        <Card className="col-span-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>作业分析概览</CardTitle>
              <CardDescription>全面了解学生作业完成情况与质量状况</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? "刷新中..." : "刷新数据"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              通过下方图表，您可以查看作业提交的分数分布、各次作业的成绩趋势以及成绩流动情况，
              这些数据将帮助您更好地了解学生学习状况，并针对性地调整教学策略。
            </div>
            
            {/* 分析类型切换 */}
            <div className="flex mt-4 space-x-2">
              <Button 
                variant={activeAnalysisType === "basic" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveAnalysisType("basic")}
                className="flex items-center"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                基础分析
              </Button>
              <Button 
                variant={activeAnalysisType === "difficulty" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveAnalysisType("difficulty")}
                className="flex items-center"
              >
                <LucideTarget className="h-4 w-4 mr-2" />
                难度分析
              </Button>
              <Button 
                variant={activeAnalysisType === "time" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveAnalysisType("time")}
                className="flex items-center"
              >
                <Clock className="h-4 w-4 mr-2" />
                时间效率
              </Button>
              <Button 
                variant={activeAnalysisType === "knowledge" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveAnalysisType("knowledge")}
                className="flex items-center"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                知识掌握度
              </Button>
              <Button 
                variant={activeAnalysisType === "groups" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveAnalysisType("groups")}
                className="flex items-center"
              >
                <Users className="h-4 w-4 mr-2" />
                学生群体
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 基础分析视图 */}
      {activeAnalysisType === "basic" && (
        <div className="grid grid-cols-1 gap-4 pt-4">
          {/* 成绩分布图 */}
          <Card className="overflow-hidden w-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">成绩等级分布</CardTitle>
              <CardDescription>作业成绩不同等级的数量分布</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="w-full min-h-[250px]">
                <GradeDistributionChart 
                  key={`dist-${refreshKey}`} 
                  title="" 
                  description=""
                  className="w-full h-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* 成绩趋势图 */}
          <Card className="overflow-hidden w-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">作业成绩趋势</CardTitle>
              <CardDescription>各次作业的平均分和提交率走势</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="w-full min-h-[250px]">
                <GradeTrendChart 
                  key={`trend-${refreshKey}`} 
                  title="" 
                  description=""
                  className="w-full h-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* 成绩流向图 */}
          <Card className="overflow-hidden w-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">成绩流向图</CardTitle>
              <CardDescription>展示学生成绩等级的流动趋势</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="w-full min-h-[300px]">
                <GradeSankeyChart 
                  key={`sankey-${refreshKey}`} 
                  title="" 
                  description=""
                  className="w-full h-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 难度分析视图 */}
      {activeAnalysisType === "difficulty" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">题目难度分布</CardTitle>
              <CardDescription>作业中不同难度题目的分布情况</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div className="w-full min-h-[250px]">
                <QuestionDifficultyChart 
                  key={`difficulty-${refreshKey}`}
                  title="" 
                  description=""
                  className="w-full h-full" 
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">班级表现一览</CardTitle>
              <CardDescription>各班级整体表现与关键指标</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div className="w-full min-h-[250px]">
                <ClassPerformanceTable
                  key={`performance-${refreshKey}`}
                  title=""
                  description=""
                  className="w-full h-full"
                />
              </div>
            </CardContent>
          </Card>
          
          <div className="w-full md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">知识点掌握度热图</CardTitle>
                <CardDescription>学生对各知识点的掌握程度</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-2">
                <div className="w-full min-h-[300px]">
                  <KnowledgePointHeatmap
                    key={`heatmap-${refreshKey}`}
                    title=""
                    description=""
                    className="w-full h-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* 时间效率分析视图 */}
      {activeAnalysisType === "time" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">完成时间与成绩关系</CardTitle>
              <CardDescription>作业完成用时与成绩的关联分析</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div className="w-full min-h-[250px] flex items-center justify-center">
                <div className="text-center p-6 border border-dashed rounded-md w-full h-full flex items-center justify-center">
                  <p className="text-muted-foreground">时间-成绩散点图</p>
                  {/* 这里将来放时间与成绩关系图 */}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最佳提交时间段</CardTitle>
              <CardDescription>学生成绩最好的提交时间段分析</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div className="w-full min-h-[250px] flex items-center justify-center">
                <div className="text-center p-6 border border-dashed rounded-md w-full h-full flex items-center justify-center">
                  <p className="text-muted-foreground">时间段绩效分析图</p>
                  {/* 这里将来放最佳时间段分析图 */}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="w-full md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">截止日期前提交时间分布</CardTitle>
                <CardDescription>学生在截止日期前不同时间段的提交分布</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-2">
                <div className="w-full min-h-[300px] flex items-center justify-center">
                  <div className="text-center p-6 border border-dashed rounded-md w-full h-full flex items-center justify-center">
                    <p className="text-muted-foreground">提交时间热力图</p>
                    {/* 这里将来放提交时间热力图 */}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* 知识点掌握度分析视图 */}
      {activeAnalysisType === "knowledge" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">知识点得分率</CardTitle>
              <CardDescription>各知识点的平均得分率对比</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div className="w-full min-h-[250px] flex items-center justify-center">
                <div className="text-center p-6 border border-dashed rounded-md w-full h-full flex items-center justify-center">
                  <p className="text-muted-foreground">知识点得分率雷达图</p>
                  {/* 这里将来放知识点得分率图 */}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">薄弱知识点追踪</CardTitle>
              <CardDescription>学生掌握较弱的知识点分析</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div className="w-full min-h-[250px] flex items-center justify-center">
                <div className="text-center p-6 border border-dashed rounded-md w-full h-full flex items-center justify-center">
                  <p className="text-muted-foreground">薄弱知识点热图</p>
                  {/* 这里将来放薄弱知识点分析图 */}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="w-full md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">知识点掌握度热图</CardTitle>
                <CardDescription>学生对各知识点的掌握程度</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-2">
                <div className="w-full min-h-[300px]">
                  <KnowledgePointHeatmap
                    key={`heatmap-knowledge-${refreshKey}`}
                    title=""
                    description=""
                    className="w-full h-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* 学生群体分析视图 */}
      {activeAnalysisType === "groups" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <Card>
            <CardContent className="pt-4 pb-2">
              <StudentGroupsChart 
                key={`groups-${refreshKey}`}
                className="w-full h-full"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 pb-2">
              <GroupProgressChart
                key={`progress-${refreshKey}`}
                className="w-full h-full"
              />
            </CardContent>
          </Card>
          
          <div className="w-full md:col-span-2">
            <Card>
              <CardContent className="pt-4 pb-2">
                <StudentVsGroupChart
                  key={`vs-${refreshKey}`}
                  className="w-full h-full"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 分析导航 */}
      <div className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle>深度分析报告</CardTitle>
            <CardDescription>选择分析类型，获取更详细的教学分析报告</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              defaultValue="grade" 
              value={activeDetailTab}
              onValueChange={setActiveDetailTab}
            >
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="grade">成绩分析</TabsTrigger>
                <TabsTrigger value="submission">提交分析</TabsTrigger> 
                <TabsTrigger value="trend">趋势报告</TabsTrigger>
              </TabsList>
              
              <TabsContent value="grade" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  成绩深度分析展示各次作业的分数分布情况，帮助教师了解学生整体掌握水平。
                  通过分析优秀、良好、及格和不及格的比例，可以针对性地调整教学难度和重点。
                  <span className="block mt-2 text-primary">包含更多高级分析图表：箱线图、成绩分布热力图等。</span>
                </p>
              </TabsContent>
              
              <TabsContent value="submission" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  提交分析展示作业的提交时间分布、提交率变化趋势等信息，
                  帮助教师了解学生作业完成的积极性和及时性，并对作业截止时间进行合理规划。
                  <span className="block mt-2 text-primary">包含提交时间热力图、截止日期影响分析等。</span>
                </p>
              </TabsContent>
              
              <TabsContent value="trend" className="pt-4">
                <p className="text-sm text-muted-foreground">
                  变化趋势完整报告展示学生成绩随时间的变化情况，
                  帮助教师了解学生学习的发展轨迹，及时发现问题并进行干预。
                  <span className="block mt-2 text-primary">包含学生个体分析、成绩预测、长期学习趋势等。</span>
                </p>
              </TabsContent>
            </Tabs>
            
            {/* 添加进一步分析提示 */}
            <div className="mt-6 flex items-center text-sm text-muted-foreground">
              <ChevronRight className="h-4 w-4 mr-2" />
              <span>
                想要更详细的分析？请前往
                <Button variant="link" className="h-auto p-0 px-1" onClick={() => {
                  if (activeDetailTab === "grade") {
                    window.location.href = "/homework/analysis/grade";
                  } else if (activeDetailTab === "submission") {
                    window.location.href = "/homework/analysis/submission";
                  } else {
                    window.location.href = "/homework/analysis/trend";
                  }
                }}>
                  {activeDetailTab === "grade" ? "成绩深度分析" : 
                   activeDetailTab === "submission" ? "提交情况详情" : "趋势完整报告"}
                </Button>
                页面，了解更多详细信息
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 