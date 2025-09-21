import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Users,
  TrendingUp,
  BookOpen,
  Target,
  Eye,
  Settings,
  Download
} from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ClassAnalyticsDashboard from "@/components/analytics/ClassAnalyticsDashboard";

const ClassAnalytics: React.FC = () => {
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableExams, setAvailableExams] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // 初始化加载可用数据
  useEffect(() => {
    loadAvailableOptions();
  }, []);

  const loadAvailableOptions = async () => {
    setIsLoading(true);
    try {
      console.log('📊 [班级分析页面] 加载可选项数据...');

      // 并行获取班级和考试数据
      const [classesResponse, examsResponse] = await Promise.all([
        supabase
          .from('grade_data_new')
          .select('class_name')
          .order('class_name'),
        supabase
          .from('grade_data_new')
          .select('exam_title, exam_date')
          .order('exam_date', { ascending: false })
      ]);

      if (classesResponse.error) throw classesResponse.error;
      if (examsResponse.error) throw examsResponse.error;

      // 处理班级数据
      if (classesResponse.data) {
        const uniqueClasses = [...new Set(classesResponse.data.map(item => item.class_name))];
        setAvailableClasses(uniqueClasses);
        console.log('✅ 加载到班级数据:', uniqueClasses.length, '个班级');

        // 默认选择第一个班级
        if (uniqueClasses.length > 0 && !selectedClass) {
          setSelectedClass(uniqueClasses[0]);
        }
      }

      // 处理考试数据
      if (examsResponse.data) {
        const uniqueExams = [...new Set(examsResponse.data.map(item => item.exam_title))];
        setAvailableExams(uniqueExams);
        console.log('✅ 加载到考试数据:', uniqueExams.length, '场考试');

        // 默认选择最新的考试
        if (uniqueExams.length > 0 && !selectedExam) {
          setSelectedExam(uniqueExams[0]);
        }
      }

    } catch (error) {
      console.error('❌ [班级分析页面] 加载可选项失败:', error);
      toast.error('加载班级和考试数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 快速选择功能
  const handleQuickSelect = async (type: 'latest-exam' | 'top-class' | 'problem-class') => {
    try {
      if (type === 'latest-exam' && availableExams.length > 0) {
        setSelectedExam(availableExams[0]);
        toast.success('已选择最新考试');
        return;
      }

      if (type === 'top-class') {
        // 找出成绩最好的班级（基于最新考试的平均分）
        if (!selectedExam) return;

        const { data: classStats } = await supabase
          .from('grade_data_new')
          .select('class_name, total_score')
          .eq('exam_title', selectedExam);

        if (classStats) {
          const classAverages = new Map<string, number[]>();
          classStats.forEach(record => {
            if (record.total_score) {
              if (!classAverages.has(record.class_name)) {
                classAverages.set(record.class_name, []);
              }
              classAverages.get(record.class_name)!.push(record.total_score);
            }
          });

          const classWithBestAvg = Array.from(classAverages.entries())
            .map(([className, scores]) => ({
              className,
              average: scores.reduce((sum, score) => sum + score, 0) / scores.length
            }))
            .sort((a, b) => b.average - a.average)[0];

          if (classWithBestAvg) {
            setSelectedClass(classWithBestAvg.className);
            toast.success(`已选择表现最佳班级: ${classWithBestAvg.className}`);
          }
        }
      }

      if (type === 'problem-class') {
        // 找出需要关注的班级（基于最新考试的及格率）
        if (!selectedExam) return;

        const { data: classStats } = await supabase
          .from('grade_data_new')
          .select('class_name, total_score')
          .eq('exam_title', selectedExam);

        if (classStats) {
          const classPassRates = new Map<string, {total: number, passed: number}>();
          classStats.forEach(record => {
            if (record.total_score !== null) {
              if (!classPassRates.has(record.class_name)) {
                classPassRates.set(record.class_name, {total: 0, passed: 0});
              }
              const stats = classPassRates.get(record.class_name)!;
              stats.total++;
              if (record.total_score >= 300) stats.passed++; // 假设300分为及格线
            }
          });

          const classWithLowestPassRate = Array.from(classPassRates.entries())
            .map(([className, stats]) => ({
              className,
              passRate: stats.total > 0 ? (stats.passed / stats.total) * 100 : 0
            }))
            .sort((a, b) => a.passRate - b.passRate)[0];

          if (classWithLowestPassRate) {
            setSelectedClass(classWithLowestPassRate.className);
            toast.success(`已选择需要关注班级: ${classWithLowestPassRate.className}`);
          }
        }
      }

    } catch (error) {
      console.error('快速选择失败:', error);
      toast.error('快速选择操作失败');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">班级成绩分析</h1>
            <p className="text-muted-foreground mt-2">
              深度分析班级表现，洞察学生成长轨迹，助力精准教学决策
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              分析设置
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              导出数据
            </Button>
          </div>
        </div>
      </div>

      {/* 功能介绍和统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              功能概览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <BookOpen className="h-4 w-4" />
              <AlertDescription>
                提供全方位的班级成绩分析，包括总体表现、科目横向对比、成绩分布分析、
                学生个体追踪等功能，帮助教师精准了解班级状况，制定针对性教学策略。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">可分析班级</p>
                <p className="text-2xl font-bold">{availableClasses.length}</p>
                <p className="text-xs text-gray-500 mt-1">个班级</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">可分析考试</p>
                <p className="text-2xl font-bold">{availableExams.length}</p>
                <p className="text-xs text-gray-500 mt-1">场考试</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速选择工具栏 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            快速分析选择
          </CardTitle>
          <CardDescription>
            选择要分析的班级和考试，或使用快速选择功能定位关键数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 班级选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">选择班级</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择班级" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map(className => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 考试选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">选择考试</label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择考试" />
                </SelectTrigger>
                <SelectContent>
                  {availableExams.map(examTitle => (
                    <SelectItem key={examTitle} value={examTitle}>
                      {examTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 快速选择按钮 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">快速选择</label>
              <div className="flex flex-col space-y-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickSelect('latest-exam')}
                  disabled={availableExams.length === 0}
                >
                  最新考试
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">智能推荐</label>
              <div className="flex flex-col space-y-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickSelect('top-class')}
                  disabled={!selectedExam}
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  优秀班级
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickSelect('problem-class')}
                  disabled={!selectedExam}
                >
                  <Target className="h-3 w-3 mr-1" />
                  关注班级
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主要分析内容 */}
      {selectedClass ? (
        <ClassAnalyticsDashboard 
          className={selectedClass}
          examTitle={selectedExam}
        />
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">请选择要分析的班级</h3>
                <p className="text-gray-600 mt-1">
                  选择班级和考试后，系统将为您生成详细的分析报告
                </p>
              </div>
              <Button 
                onClick={loadAvailableOptions}
                disabled={isLoading}
              >
                刷新数据选项
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassAnalytics;