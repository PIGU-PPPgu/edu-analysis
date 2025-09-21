import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Award,
  Target,
  BookOpen,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Brain,
  Clock,
  Activity,
  Zap,
  Eye,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ScoreDistribution from "@/components/analysis/statistics/ScoreDistribution";
import { toast } from "sonner";
import { getClassDetailedAnalysisData } from "@/services/classService";
import { showError } from "@/services/errorHandler";
import { supabase } from "@/integrations/supabase/client";

interface Class {
  id: string;
  name: string;
  grade: string;
  created_at?: string;
  averageScore?: number;
  excellentRate?: number;
  studentCount?: number;
}

interface ClassStats {
  studentCount: number;
  averageScore: number;
  excellentRate: number;
  passRate: number;
  warningCount: number;
  improvementTrend: 'up' | 'down' | 'stable';
  subjectPerformance: {
    subject: string;
    avgScore: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  recentActivity: {
    homeworkSubmissions: number;
    examParticipation: number;
    attendanceRate: number;
  };
}

interface Props {
  selectedClass: Class;
}

const OverviewTab: React.FC<Props> = ({ selectedClass }) => {
  const className = selectedClass.name;
  const classGrade = selectedClass.grade;
  const [isLoading, setIsLoading] = useState(false);
  const [competencyData, setCompetencyData] = useState<any[]>([]);
  const [boxPlotData, setBoxPlotData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [scoreDistributionData, setScoreDistributionData] = useState<any[]>([]);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [examComparisonData, setExamComparisonData] = useState<any>({
    examList: [],
    initialSelected: [],
    displayScores: [],
  });
  
  // Enhanced class statistics
  const [classStats, setClassStats] = useState<ClassStats>({
    studentCount: 0,
    averageScore: 0,
    excellentRate: 0,
    passRate: 0,
    warningCount: 0,
    improvementTrend: 'stable',
    subjectPerformance: [],
    recentActivity: {
      homeworkSubmissions: 0,
      examParticipation: 0,
      attendanceRate: 95
    }
  });

  // 获取增强的班级统计数据
  const fetchEnhancedClassStats = async () => {
    try {
      // 获取班级预警学生数量
      const { data: warningData, error: warningError } = await supabase
        .from('warning_records')
        .select(`
          student_id,
          students!inner(class_name)
        `)
        .eq('status', 'active');

      const classWarnings = warningData?.filter(
        (warning: any) => warning.students?.class_name === className
      ) || [];

      // 修复：获取班级学生成绩数据用于计算及格率和趋势，使用正确的表名
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_data_new')
        .select('total_score, exam_date, class_name')
        .eq('class_name', className)
        .order('exam_date', { ascending: false });

      // 计算及格率
      const passingGrades = gradeData?.filter((grade: any) => grade.total_score >= 60) || [];
      const passRate = gradeData?.length ? (passingGrades.length / gradeData.length) * 100 : 0;

      // 计算趋势（比较最近两次考试的平均分）
      const recentExams = gradeData?.slice(0, 50) || []; // 最近50条记录
      const olderExams = gradeData?.slice(50, 100) || [];
      
      const recentAvg = recentExams.length > 0 ? 
        recentExams.reduce((sum: number, g: any) => sum + (g.total_score || 0), 0) / recentExams.length : 0;
      const olderAvg = olderExams.length > 0 ? 
        olderExams.reduce((sum: number, g: any) => sum + (g.total_score || 0), 0) / olderExams.length : 0;

      let improvementTrend: 'up' | 'down' | 'stable' = 'stable';
      if (recentAvg > olderAvg + 2) improvementTrend = 'up';
      else if (recentAvg < olderAvg - 2) improvementTrend = 'down';

      // 模拟科目表现数据（实际项目中应从数据库获取）
      const subjectPerformance = [
        { subject: '数学', avgScore: (selectedClass.averageScore || 0) + Math.random() * 10 - 5, trend: improvementTrend },
        { subject: '语文', avgScore: (selectedClass.averageScore || 0) + Math.random() * 10 - 5, trend: improvementTrend },
        { subject: '英语', avgScore: (selectedClass.averageScore || 0) + Math.random() * 10 - 5, trend: improvementTrend },
      ];

      setClassStats({
        studentCount: selectedClass.studentCount || 0,
        averageScore: selectedClass.averageScore || 0,
        excellentRate: selectedClass.excellentRate || 0,
        passRate,
        warningCount: classWarnings.length,
        improvementTrend,
        subjectPerformance,
        recentActivity: {
          homeworkSubmissions: Math.floor(Math.random() * 20) + 80, // 模拟数据
          examParticipation: Math.floor(Math.random() * 10) + 90,
          attendanceRate: Math.floor(Math.random() * 5) + 95
        }
      });

    } catch (error) {
      console.error('获取增强班级统计数据失败:', error);
      // 使用基础数据作为fallback
      setClassStats({
        studentCount: selectedClass.studentCount || 0,
        averageScore: selectedClass.averageScore || 0,
        excellentRate: selectedClass.excellentRate || 0,
        passRate: 80, // 默认值
        warningCount: 0,
        improvementTrend: 'stable',
        subjectPerformance: [],
        recentActivity: {
          homeworkSubmissions: 85,
          examParticipation: 95,
          attendanceRate: 95
        }
      });
    }
  };

  // 获取班级详细分析数据
  useEffect(() => {
    if (selectedClass && selectedClass.id) {
      setIsLoading(true);
      
      // 并行获取数据
      Promise.all([
        getClassDetailedAnalysisData(selectedClass.id),
        fetchEnhancedClassStats()
      ])
        .then(([data]) => {
          if (data.competencyData && data.competencyData.length > 0) {
            setCompetencyData(data.competencyData);
          }

          if (data.boxPlotData && data.boxPlotData.length > 0) {
            setBoxPlotData(data.boxPlotData);
          }

          if (data.trendData && data.trendData.length > 0) {
            setTrendData(data.trendData);
          }

          if (
            data.scoreDistributionData &&
            data.scoreDistributionData.length > 0
          ) {
            setScoreDistributionData(data.scoreDistributionData);
          }

          if (data.examComparisonData) {
            setExamComparisonData(data.examComparisonData);
          }

          // 创建相关性数据
          if (data.studentsListData && data.studentsListData.length > 0) {
            const corrData = data.studentsListData
              .map((student: any, index: number) => {
                // 假设课堂表现和作业质量是根据平均分的随机变化
                const avgScore = student.averageScore || 0;
                const randomFactor1 = 0.8 + Math.random() * 0.4; // 0.8-1.2之间的随机因子
                const randomFactor2 = 0.8 + Math.random() * 0.4;

                return {
                  name: student.name,
                  // 课堂表现、作业质量和考试成绩的关联性
                  xValue: Math.min(100, Math.max(0, avgScore * randomFactor1)),
                  yValue: Math.min(100, Math.max(0, avgScore * randomFactor2)),
                  zValue: avgScore,
                  subject: index % 2 === 0 ? "数学" : "语文", // 简单分配学科
                };
              })
              .slice(0, 10); // 只取前10个学生

            setCorrelationData(corrData);
          }
        })
        .catch((error) => {
          console.error("获取班级详细分析数据失败:", error);
          showError(error, { operation: "获取班级详细分析数据", classId: selectedClass.id });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [selectedClass.id]);

  // 生成班级对比热图数据
  const generateHeatmapData = () => {
    const classAvg = selectedClass.averageScore || 0;
    const classExcellent = selectedClass.excellentRate || 0;

    return [
      { x: "平均分", y: className, value: classAvg },
      { x: "优秀率", y: className, value: classExcellent },
      {
        x: "及格率",
        y: className,
        value:
          classAvg > 0 ? Math.min(100, Math.round((classAvg / 60) * 90)) : 0,
      },
    ];
  };

  return (
    <div className="space-y-6">
      {/* 增强的班级统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">学生总数</p>
                <div className="text-2xl font-bold">{classStats.studentCount}</div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {selectedClass.grade || '未设置'}年级
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">班级平均分</p>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {classStats.averageScore.toFixed(1)}
                  {classStats.improvementTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {classStats.improvementTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  {classStats.improvementTrend === 'stable' && <Minus className="h-4 w-4 text-gray-500" />}
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge className={
                classStats.improvementTrend === 'up' ? "bg-green-100 text-green-800" :
                classStats.improvementTrend === 'down' ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
              }>
                {classStats.improvementTrend === 'up' ? '上升趋势' : 
                 classStats.improvementTrend === 'down' ? '下降趋势' : '保持稳定'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">优秀率</p>
                <div className="text-2xl font-bold">{classStats.excellentRate.toFixed(1)}%</div>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="secondary">
                及格率: {classStats.passRate.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">预警学生</p>
                <div className="text-2xl font-bold">{classStats.warningCount}</div>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge className={
                classStats.warningCount === 0 ? "bg-green-100 text-green-800" :
                classStats.warningCount <= 3 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
              }>
                {classStats.warningCount === 0 ? '无预警' : '需关注'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">活跃度</p>
                <div className="text-2xl font-bold">{classStats.recentActivity.attendanceRate}%</div>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                出勤表现
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 增强的分析区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 班级学习状况 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-600" />
              班级学习状况
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>优秀比例</span>
                  <span>{classStats.excellentRate.toFixed(1)}%</span>
                </div>
                <Progress value={classStats.excellentRate} className="w-full" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>及格比例</span>
                  <span>{classStats.passRate.toFixed(1)}%</span>
                </div>
                <Progress value={classStats.passRate} className="w-full" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>作业提交率</span>
                  <span>{classStats.recentActivity.homeworkSubmissions}%</span>
                </div>
                <Progress value={classStats.recentActivity.homeworkSubmissions} className="w-full" />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">班级健康度</span>
              </div>
              <p className="text-sm text-gray-600">
                班级 {className} 总体表现
                {classStats.excellentRate >= 80 ? '优秀' : 
                 classStats.excellentRate >= 60 ? '良好' : '需提升'}，
                当前有 {classStats.warningCount} 名学生需要额外关注。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 科目表现 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
              科目表现
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {classStats.subjectPerformance.length > 0 ? (
                classStats.subjectPerformance.map((subject, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        subject.avgScore >= 85 ? 'bg-green-500' :
                        subject.avgScore >= 75 ? 'bg-blue-500' :
                        subject.avgScore >= 65 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-medium">{subject.subject}</span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-semibold">{subject.avgScore.toFixed(1)}</span>
                      {subject.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {subject.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                      {subject.trend === 'stable' && <Minus className="h-4 w-4 text-gray-500" />}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">科目数据加载中...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 智能建议 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-green-600" />
              智能建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 班级评级 */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                {classStats.excellentRate >= 80 ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : classStats.excellentRate >= 60 ? (
                  <Clock className="h-6 w-6 text-blue-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                )}
                <div>
                  <Badge className={
                    classStats.excellentRate >= 80 ? "bg-green-100 text-green-800" :
                    classStats.excellentRate >= 60 ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"
                  }>
                    {classStats.excellentRate >= 80 ? '优秀班级' : 
                     classStats.excellentRate >= 60 ? '良好班级' : '需提升班级'}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    {classStats.excellentRate >= 80 ? '继续保持优秀表现' : 
                     classStats.excellentRate >= 60 ? '有提升空间' : '需要重点关注'}
                  </p>
                </div>
              </div>

              {/* 预警提醒 */}
              {classStats.warningCount > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-800">预警提醒</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    班级有 {classStats.warningCount} 名学生需要额外关注，建议及时进行个性化辅导。
                  </p>
                  <Link to="/warning-analysis" className="text-sm text-orange-600 hover:text-orange-700 underline">
                    查看详细预警 →
                  </Link>
                </div>
              )}

              {/* 建议措施 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  推荐行动
                </h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
                    <span>
                      {classStats.improvementTrend === 'down' ? '加强基础知识复习，关注学习困难学生' : 
                       classStats.improvementTrend === 'up' ? '继续保持良好势头，适当提高教学难度' : 
                       '稳定当前教学策略，适时调整教学方法'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></div>
                    <span>建立学习小组，促进学生互助学习</span>
                  </li>
                  {classStats.recentActivity.homeworkSubmissions < 90 && (
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2"></div>
                      <span>提升作业提交率，加强学习习惯培养</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>成绩分布概览</CardTitle>
            <CardDescription>
              显示班级成绩的整体分布情况和统计信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scoreDistributionData && scoreDistributionData.length > 0 ? (
              <ScoreDistribution data={scoreDistributionData} />
            ) : (
              <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">暂无成绩分布数据</p>
                  <p className="text-sm mt-1">成绩数据加载中或暂无考试记录</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作区 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-indigo-600" />
            快捷操作
          </CardTitle>
          <CardDescription>
            快速访问班级相关功能和管理工具
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/student-management" className="flex flex-col items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" />
                <div className="text-center">
                  <div className="font-medium">学生管理</div>
                  <div className="text-xs text-gray-500">查看学生详情</div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/student-portrait" className="flex flex-col items-center gap-2">
                <Brain className="h-6 w-6 text-purple-600" />
                <div className="text-center">
                  <div className="font-medium">学生画像</div>
                  <div className="text-xs text-gray-500">AI智能分析</div>
                </div>
              </Link>
            </Button>

            {classStats.warningCount > 0 && (
              <Button asChild variant="outline" className="h-auto p-4 border-orange-200">
                <Link to="/warning-analysis" className="flex flex-col items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                  <div className="text-center">
                    <div className="font-medium text-orange-600">预警分析</div>
                    <div className="text-xs text-orange-500">{classStats.warningCount}名学生需关注</div>
                  </div>
                </Link>
              </Button>
            )}

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/homework-management" className="flex flex-col items-center gap-2">
                <FileText className="h-6 w-6 text-green-600" />
                <div className="text-center">
                  <div className="font-medium">作业管理</div>
                  <div className="text-xs text-gray-500">布置与批改</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
