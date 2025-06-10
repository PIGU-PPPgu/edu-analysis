import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/shared/Navbar";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, FileText, PieChart, ListFilter, BarChart2, Brain, User, ChevronRight, Calendar, Star, Activity, Award, Users, BookOpen, TrendingUp as TrendingUpIcon, BarChart3, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { OverviewTab } from "@/components/class/OverviewTab";
import { DetailTab } from "@/components/class/DetailTab";
import { ComparisonTab } from "@/components/class/ComparisonTab";
import { SubjectAnalysisTab } from "@/components/class/SubjectAnalysisTab";
import ScoreDistribution from "@/components/analysis/statistics/ScoreDistribution";

// 复用现有的分析组件
// import ClassTrendChart from "@/components/analysis/ClassTrendChart"; // 已删除
// import ClassComparison from "@/components/analysis/ClassComparison"; // 已删除
// import ClassWeaknessAnalysis from "@/components/analysis/ClassWeaknessAnalysis"; // 已删除
// import SubjectAverages from "@/components/analysis/SubjectAverages"; // 已删除
import AIProfileTags from "@/components/profile/AIProfileTags";

// 使用portrait API
import { portraitAPI, ClassPortraitStats } from "@/lib/api/portrait";

// 创建一个自定义的统计卡片组件以替代StatisticsOverview
interface StatisticCardProps {
  title: string;
  value: number | string;
  description: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

const StatisticCard: React.FC<StatisticCardProps> = ({ title, value, description, trend = "neutral", icon }) => {
  // 确保value是字符串类型以安全显示
  const displayValue = typeof value === 'number' 
    ? value.toFixed(1).replace(/\.0$/, '') 
    : value.toString();
  
  return (
    <Card className="hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
      <div className={`h-1 w-full ${trend === "up" ? "bg-[#9cff57]" : trend === "down" ? "bg-red-400" : "bg-gray-400"}`}></div>
      <CardContent className="p-6">
        <div className="flex flex-row justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h4 className="text-4xl font-bold mt-2 text-black">{displayValue}</h4>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <div className="mt-1 p-2 rounded-full bg-gray-100">
            {icon || (
              <>
                {trend === "up" && <TrendingUp className="h-5 w-5 text-[#9cff57]" />}
                {trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                {trend === "neutral" && <Minus className="h-5 w-5 text-gray-500" />}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 特色数据展示卡片
interface FeatureStatCardProps {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

const FeatureStatCard: React.FC<FeatureStatCardProps> = ({ 
  value, 
  label,
  icon
}) => {
  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
      <div className="bg-[#9cff57] h-1 w-full"></div>
      <div className="p-6 flex flex-col items-center text-center">
        {icon && <div className="mb-2 text-gray-800">{icon}</div>}
        <h3 className="text-3xl font-bold text-black">{value}</h3>
        <p className="text-sm text-gray-600 mt-1">{label}</p>
      </div>
    </div>
  );
};

// 学生信息卡片
interface StudentCardProps {
  name: string;
  avatarUrl?: string;
  score: number;
  rank: number;
}

const StudentCard: React.FC<StudentCardProps> = ({ name, avatarUrl, score, rank }) => {
  return (
    <div className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center mr-3">
        {avatarUrl ? <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-full" /> : <User className="w-5 h-5 text-gray-500" />}
      </div>
      <div className="flex-1">
        <p className="font-medium text-black">{name}</p>
        <p className="text-sm text-gray-500">得分: {score}</p>
      </div>
      <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rank <= 3 ? 'bg-[#9cff57] text-black' : 'bg-gray-200 text-gray-700'}`}>
          {rank}
        </div>
      </div>
    </div>
  );
};

// 进度里程碑组件
interface MilestoneProps {
  date: string;
  title: string;
  description: string;
  isActive?: boolean;
}

const Milestone: React.FC<MilestoneProps> = ({ date, title, description, isActive = false }) => {
  return (
    <div className="relative flex items-start gap-6">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${isActive ? 'bg-[#9cff57]' : 'bg-gray-200'}`}>
          <Star className={`h-4 w-4 ${isActive ? 'text-black' : 'text-gray-500'}`} />
        </div>
        {/* 连接线 */}
        <div className="w-0.5 h-full bg-gray-200 absolute top-8 bottom-0 left-4"></div>
      </div>
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex-1 mb-8 hover:shadow-md transition-shadow">
        <p className="text-sm text-gray-500">{date}</p>
        <h3 className="font-bold text-black mt-1">{title}</h3>
        <p className="text-gray-600 mt-2">{description}</p>
      </div>
    </div>
  );
};

const ClassProfile: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  
  // 使用React Query获取班级画像数据
  const { 
    data: classStats, 
    isLoading,
    error
  } = useQuery({
    queryKey: ['classStats', classId],
    queryFn: () => portraitAPI.getClassPortraitStats(classId!),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    refetchOnWindowFocus: false
  });

  // 获取班级学生列表
  const { 
    data: classStudents,
    isLoading: studentsLoading
  } = useQuery({
    queryKey: ['classStudents', classId],
    queryFn: () => portraitAPI.getClassStudents(classId!),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000
  });

  // 获取班级小组列表
  const { 
    data: classGroups,
    isLoading: groupsLoading
  } = useQuery({
    queryKey: ['classGroups', classId],
    queryFn: () => portraitAPI.getClassGroups(classId!),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000
  });

  // 获取AI分析数据
  const {
    data: aiAnalysisData,
    isLoading: aiAnalysisLoading
  } = useQuery({
    queryKey: ['aiAnalysis', classId],
    queryFn: () => portraitAPI.getClassAIAnalysis(classId!),
    enabled: !!classId,
    staleTime: 10 * 60 * 1000 // 10分钟缓存
  });

  // 获取顶尖学生数据
  const {
    data: topStudentsData,
    isLoading: topStudentsLoading
  } = useQuery({
    queryKey: ['topStudents', classId],
    queryFn: () => portraitAPI.getClassTopStudents(classId!),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000
  });

  // 获取学习进度里程碑
  const {
    data: milestonesData,
    isLoading: milestonesLoading
  } = useQuery({
    queryKey: ['learningMilestones', classId],
    queryFn: () => portraitAPI.getClassLearningMilestones(classId!),
    enabled: !!classId,
    staleTime: 10 * 60 * 1000
  });

  // 使用API数据或回退到空数组
  const aiInsights = aiAnalysisData?.insights || [];
  const aiRecommendations = aiAnalysisData?.recommendations || [];
  const topStudents = topStudentsData || [];
  const learningMilestones = milestonesData || [];
  const classTags = aiAnalysisData?.tags || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-[#9cff57] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">加载班级数据中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!classStats && error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-3 justify-center items-center h-64">
            <p className="text-lg font-medium">找不到该班级信息</p>
            <Button variant="outline" asChild>
              <Link to="/class-management">
                返回班级管理
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* 页面顶部 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="outline" size="sm" asChild className="border-black hover:bg-black hover:text-white transition-colors">
                <Link to="/class-management">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  返回班级管理
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold">班级画像分析</h1>
            <p className="text-gray-600 mt-1">
              由AI辅助分析的班级整体学习情况与表现
            </p>
          </div>
          <Button className="bg-[#9cff57] hover:bg-[#84d64a] text-black border-none">
            <FileText className="h-4 w-4 mr-2" />
            生成班级报告
          </Button>
        </div>

        {/* 班级概况卡片 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">班级整体表现</h2>
              <p className="text-gray-600 mb-4">
                班级ID: {classId} | 人数: {classStats?.studentCount || 0}人 | 优秀率: {classStats?.excellentRate || 0}%
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {classTags.slice(0, 4).map((tag, index) => (
                  <span 
                    key={index} 
                    className={`px-3 py-1 ${index === 0 ? 'bg-[#9cff57] text-black' : index === 1 ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'} rounded-full text-sm`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <div className="grid grid-cols-2 gap-4">
                <FeatureStatCard 
                  value={`${classStats?.averageScore || 0}`} 
                  label="平均分" 
                  icon={<Award className="w-6 h-6" />}
                />
                <FeatureStatCard 
                  value={`${classStats?.excellentRate || 0}%`} 
                  label="优秀率" 
                  icon={<Activity className="w-6 h-6" />}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 核心数据显示 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">班级数据概览</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            <FeatureStatCard value={`${classStats?.studentCount || 0}`} label="学生人数" icon={<User className="w-6 h-6" />} />
            <FeatureStatCard value={`${classStats?.averageScore || 0}`} label="平均分数" icon={<Award className="w-6 h-6" />} />
            <FeatureStatCard value={`${classStats?.excellentRate || 0}%`} label="优秀率" icon={<Star className="w-6 h-6" />} />
            <FeatureStatCard value={`${classStats?.progressRate || 0}%`} label="进步率" icon={<TrendingUp className="w-6 h-6" />} />
            <FeatureStatCard value={`${classStats?.dataPeriod || '未知'}`} label="数据周期" icon={<Calendar className="w-6 h-6" />} />
          </div>
        </div>

        {/* 主要内容标签 */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border border-gray-200 p-1 rounded-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#9cff57] data-[state=active]:text-black rounded-md px-6 py-2">
              <PieChart className="h-4 w-4 mr-2" />
              班级概览
            </TabsTrigger>
            <TabsTrigger value="scores" className="data-[state=active]:bg-[#9cff57] data-[state=active]:text-black rounded-md px-6 py-2">
              <BarChart2 className="h-4 w-4 mr-2" />
              成绩分析
            </TabsTrigger>
            <TabsTrigger value="subjects" className="data-[state=active]:bg-[#9cff57] data-[state=active]:text-black rounded-md px-6 py-2">
              <ListFilter className="h-4 w-4 mr-2" />
              学科分析
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="data-[state=active]:bg-[#9cff57] data-[state=active]:text-black rounded-md px-6 py-2">
              <Brain className="h-4 w-4 mr-2" />
              AI洞察
            </TabsTrigger>
          </TabsList>
          
          {/* 班级概览标签内容 */}
          <TabsContent value="overview">
            <div className="space-y-8">
              {/* 学生统计 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border border-gray-200 overflow-hidden">
                  <div className="h-1 w-full bg-[#9cff57]"></div>
                  <CardHeader>
                    <CardTitle className="text-xl">班级学习组</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {groupsLoading ? (
                      <div className="h-40 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-[#9cff57] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : !classGroups || classGroups.length === 0 ? (
                      <div className="h-40 flex items-center justify-center">
                        <p className="text-gray-500">暂无学习组数据</p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {classGroups.map((group, index) => (
                          <li key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                            <div>
                              <p className="font-medium">{group.name}</p>
                              <p className="text-xs text-gray-600">{group.description}</p>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">{group.student_count}人</span>
                              {group.averageScore && (
                                <span className="ml-2 px-2 py-1 bg-[#9cff57] text-black rounded-full">
                                  均分:{group.averageScore}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="border border-gray-200 overflow-hidden">
                  <div className="h-1 w-full bg-[#9cff57]"></div>
                  <CardHeader>
                    <CardTitle className="text-xl">班级性别分布</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex-1 flex flex-col justify-center items-center space-y-4 h-64">
                      <div className="flex gap-8">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white text-xl font-bold mb-2">
                            {classStats?.gender.male || 0}
                          </div>
                          <p className="text-gray-700">男生</p>
                        </div>
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2">
                            {classStats?.gender.female || 0}
                          </div>
                          <p className="text-gray-700">女生</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">班级男女比例约为 {classStats?.gender.male || 0}:{classStats?.gender.female || 0}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 顶尖学生 */}
              <Card className="border border-gray-200 overflow-hidden">
                <div className="h-1 w-full bg-[#9cff57]"></div>
                <CardHeader>
                  <CardTitle className="text-xl">班级顶尖学生</CardTitle>
                </CardHeader>
                <CardContent>
                  {topStudentsLoading ? (
                    <div className="h-40 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-[#9cff57] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : !topStudents || topStudents.length === 0 ? (
                    <div className="h-40 flex items-center justify-center">
                      <p className="text-gray-500">暂无学生数据</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {topStudents.map((student) => (
                        <StudentCard 
                          key={student.id || student.name}
                          name={student.name}
                          score={student.score}
                          rank={student.rank}
                          avatarUrl={student.avatarUrl}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-center border-t">
                  <Button 
                    variant="ghost" 
                    className="flex items-center text-gray-600 hover:text-black"
                    onClick={() => {
                      if (classId) {
                        window.location.href = `/student-management?classId=${classId}`;
                      }
                    }}
                  >
                    查看全部学生
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardFooter>
              </Card>

              {/* 学习进度时间线 */}
              <Card className="border border-gray-200 overflow-hidden">
                <div className="h-1 w-full bg-[#9cff57]"></div>
                <CardHeader>
                  <CardTitle className="text-xl">班级学习历程</CardTitle>
                  <CardDescription>从开学到现在的班级学习进度与成果</CardDescription>
                </CardHeader>
                <CardContent>
                  {milestonesLoading ? (
                    <div className="h-40 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-[#9cff57] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : !learningMilestones || learningMilestones.length === 0 ? (
                    <div className="h-40 flex items-center justify-center">
                      <p className="text-gray-500">暂无里程碑数据</p>
                    </div>
                  ) : (
                    <div className="py-4">
                      {learningMilestones.map((milestone, index) => (
                        <Milestone 
                          key={index}
                          date={milestone.date}
                          title={milestone.title}
                          description={milestone.description}
                          isActive={milestone.isActive}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* 成绩分析标签内容 */}
          <TabsContent value="scores">
            <Card className="border border-gray-200 overflow-hidden">
              <div className="h-1 w-full bg-[#9cff57]"></div>
              <CardHeader>
                <CardTitle className="text-xl">班级成绩分析</CardTitle>
                <CardDescription>各分数段分布与总体情况</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <StatisticCard 
                    title="班级平均分" 
                    value={classStats?.averageScore || 0} 
                    description={classStats?.scoreChangeDesc || '数据不足'} 
                    trend={classStats?.averageScoreTrend || 'neutral'}
                    icon={<TrendingUp className="h-5 w-5 text-[#9cff57]" />}
                  />
                  <StatisticCard 
                    title="及格率" 
                    value={`${classStats?.passRate || 0}%`} 
                    description={classStats?.passRateChangeDesc || '数据不足'} 
                    trend={classStats?.passRateTrend || 'neutral'}
                    icon={<TrendingUp className="h-5 w-5 text-[#9cff57]" />}
                  />
                  <StatisticCard 
                    title="不及格率" 
                    value={`${100 - (classStats?.passRate || 0)}%`} 
                    description={`较上月${(classStats?.passRateTrend === 'up') ? '下降' : '上升'}`} 
                    trend={(classStats?.passRateTrend === 'up') ? 'down' : 'up'}
                    icon={<TrendingDown className="h-5 w-5 text-red-500" />}
                  />
                  <StatisticCard 
                    title="优秀率" 
                    value={`${classStats?.excellentRate || 0}%`} 
                    description={classStats?.excellentRateChangeDesc || '数据不足'} 
                    trend={classStats?.excellentRateTrend || 'neutral'}
                    icon={<TrendingUp className="h-5 w-5 text-[#9cff57]" />}
                  />
                </div>
                
                <ScoreDistribution 
                  title="班级成绩分布" 
                  endpoint={`/api/class/${classId}/grade-distribution`}
                />
                
                <ScoreDistribution 
                  title="各分数段学生分布"
                  endpoint={`/api/class/${classId}/score-distribution`}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 学科分析标签内容 */}
          <TabsContent value="subjects">
            <Card className="border border-gray-200 overflow-hidden">
              <div className="h-1 w-full bg-[#9cff57]"></div>
              <CardHeader>
                <CardTitle className="text-xl">学科分析</CardTitle>
                <CardDescription>各学科平均成绩与优势分析</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                      📊
                    </div>
                    <p className="text-lg font-medium">班级弱点分析组件正在重构中</p>
                    <p className="text-sm">此功能将在后续版本中重新设计</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* AI洞察标签内容 */}
          <TabsContent value="ai-insights">
            <Card className="border border-gray-200 overflow-hidden">
              <div className="h-1 w-full bg-[#9cff57]"></div>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">AI分析洞察</CardTitle>
                  <CardDescription>智能分析班级学习情况与教学建议</CardDescription>
                </div>
                <span className="px-3 py-1 bg-[#9cff57] text-black rounded-full text-sm">AI生成</span>
              </CardHeader>
              <CardContent className="space-y-6">
                {aiAnalysisLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-[#9cff57] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    {/* AI分析概述 */}
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-medium mb-4">班级整体分析</h3>
                      <p className="text-gray-700">
                        {aiAnalysisData?.summary || "根据该班级的学习数据分析，学生整体学习情况良好，但存在部分学习薄弱环节和学习习惯问题。AI系统通过对比历史数据和班级内部差异，提供了针对性的教学建议和学习策略。"}
                      </p>
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">样本数量</p>
                          <p className="text-xl font-bold">{classStats?.studentCount || 0}条</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">数据完整度</p>
                          <p className="text-xl font-bold">{aiAnalysisData?.dataCompleteness || "96%"}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">分析精度</p>
                          <p className="text-xl font-bold">{aiAnalysisData?.analysisPrecision || "94%"}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">数据时间跨度</p>
                          <p className="text-xl font-bold">{aiAnalysisData?.dataTimespan || classStats?.dataPeriod || "6个月"}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 关键发现 */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">关键发现与建议</h3>
                      <ul className="space-y-3">
                        {(aiInsights && aiInsights.length > 0) ? (
                          aiInsights.map((insight, index) => (
                            <li key={index} className="p-4 bg-white border border-gray-200 rounded-lg flex items-start">
                              <span className="bg-[#9cff57] text-black w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
                                {index + 1}
                              </span>
                              <span className="text-gray-800">{insight}</span>
                            </li>
                          ))
                        ) : (
                          <li className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-500">暂无AI分析洞察</span>
                          </li>
                        )}
                      </ul>
                    </div>
                    
                    {/* AI建议 */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">AI教学建议</h3>
                      <ul className="space-y-3">
                        {(aiRecommendations && aiRecommendations.length > 0) ? (
                          aiRecommendations.map((recommendation, index) => (
                            <li key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-start hover:bg-white transition-colors">
                              <span className="bg-[#9cff57] text-black w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
                                {index + 1}
                              </span>
                              <span className="text-gray-800">{recommendation}</span>
                            </li>
                          ))
                        ) : (
                          <li className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-500">暂无AI教学建议</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="border-t p-4">
                <Button className="w-full bg-black hover:bg-gray-800 text-white">
                  <FileText className="h-4 w-4 mr-2" />
                  导出完整AI分析报告
                </Button>
              </CardFooter>
            </Card>
            
            {/* 额外AI分析卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card className="border border-gray-200 overflow-hidden">
                <div className="h-1 w-full bg-[#9cff57]"></div>
                <CardHeader>
                  <CardTitle className="text-xl">能力雷达图</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <div className="flex flex-col items-center justify-center h-full">
                    <Brain className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">能力雷达图</h3>
                    <p className="text-gray-500 text-center">
                      能力雷达图组件正在重构中
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border border-gray-200 overflow-hidden">
                <div className="h-1 w-full bg-[#9cff57]"></div>
                <CardHeader>
                  <CardTitle className="text-xl">班级学习特点</CardTitle>
                  <CardDescription>AI根据班级数据生成的学习特点标签</CardDescription>
                </CardHeader>
                <CardContent>
                  {aiAnalysisLoading ? (
                    <div className="h-40 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-[#9cff57] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {classTags && classTags.length > 0 ? (
                        classTags.map((tag, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1.5 rounded-full text-sm bg-black text-white hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center">
                          <span className="text-gray-500">暂无学习特点标签</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClassProfile; 