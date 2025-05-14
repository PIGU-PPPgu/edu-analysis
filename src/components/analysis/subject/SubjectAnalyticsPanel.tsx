import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import useCachedQuery from '@/hooks/useCachedQuery';
import { supabase } from '@/integrations/supabase/client';

// 注册ChartJS组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SubjectStatData {
  class_id: string;
  class_name: string;
  subject: string;
  student_count: number;
  average_score: number;
  median_score: number;
  min_score: number;
  max_score: number;
  score_deviation: number;
  pass_rate: number;
  excellent_rate: number;
}

interface ExamTrendData {
  class_id: string;
  class_name: string;
  subject: string;
  exam_type: string;
  exam_date: string;
  exam_count: number;
  average_score: number;
  median_score: number;
  q1_score: number;
  q3_score: number;
  score_deviation: number;
  pass_rate: number;
  excellent_rate: number;
}

interface SubjectAnalyticsPanelProps {
  classId: string;
  subject: string;
  onBack?: () => void;
}

const SubjectAnalyticsPanel: React.FC<SubjectAnalyticsPanelProps> = ({
  classId,
  subject,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // 使用缓存钩子获取学科统计数据
  const {
    data: subjectStats,
    loading: loadingStats,
    error: statsError,
    fromCache: statsFromCache,
    cacheInfo: statsCacheInfo,
    refetch: refetchStats
  } = useCachedQuery<SubjectStatData>({
    cacheKey: `subject_analytics_${classId}_${subject}`,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_class_subject_stats')
        .select('*')
        .eq('class_id', classId)
        .eq('subject', subject)
        .single();
      
      if (error) throw error;
      return data;
    },
    cacheDuration: 10 * 60 * 1000, // 10分钟
    useServerCache: true
  });

  // 使用缓存钩子获取考试趋势数据
  const {
    data: examTrends,
    loading: loadingTrends,
    error: trendsError,
    fromCache: trendsFromCache,
    cacheInfo: trendsCacheInfo,
    refetch: refetchTrends
  } = useCachedQuery<ExamTrendData[]>({
    cacheKey: `exam_trends_${classId}_${subject}`,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_class_exam_trends')
        .select('*')
        .eq('class_id', classId)
        .eq('subject', subject)
        .order('exam_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration: 15 * 60 * 1000, // 15分钟
    useServerCache: true
  });

  // 刷新所有数据
  const refreshAll = async () => {
    await Promise.all([refetchStats(), refetchTrends()]);
  };

  // 准备图表数据
  const examTrendChartData = {
    labels: examTrends?.map(item => format(new Date(item.exam_date), 'MM/dd', { locale: zhCN })) || [],
    datasets: [
      {
        label: '平均分',
        data: examTrends?.map(item => item.average_score) || [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: '优秀率(%)',
        data: examTrends?.map(item => item.excellent_rate) || [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y1',
      }
    ]
  };

  const examTrendChartOptions: ChartOptions<'line'> = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        min: 0,
        max: 100,
        title: {
          display: true,
          text: '分数'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: '百分比(%)'
        }
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${subject}考试趋势`,
      },
    },
  };

  const scoreDistributionData = {
    labels: ['最低分', '下四分位数', '中位数', '上四分位数', '最高分'],
    datasets: [
      {
        label: '分数分布',
        data: examTrends?.length 
          ? [
              examTrends[examTrends.length-1].min_score || 0,
              examTrends[examTrends.length-1].q1_score || 0,
              examTrends[examTrends.length-1].median_score || 0,
              examTrends[examTrends.length-1].q3_score || 0,
              examTrends[examTrends.length-1].max_score || 0
            ]
          : [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      }
    ]
  };

  // 创建骨架屏
  const renderSkeleton = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      
      <Skeleton className="h-[300px] mt-6 rounded-lg" />
    </div>
  );

  // 错误显示
  const renderError = (error: Error | null) => (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>获取数据失败</AlertTitle>
      <AlertDescription>
        {error?.message || '发生未知错误，请稍后重试'}
      </AlertDescription>
    </Alert>
  );

  // 缓存信息显示
  const renderCacheInfo = (cacheInfo: any, fromCache: boolean) => {
    if (!cacheInfo) return null;
    
    const timeAgo = formatDistanceToNow(new Date(cacheInfo.timestamp), { locale: zhCN, addSuffix: true });
    
    return (
      <div className="flex items-center text-xs text-gray-500 mt-1">
        <Clock className="h-3 w-3 mr-1" />
        <span>
          数据{fromCache ? '来自缓存，' : '已更新，'}
          {timeAgo}
        </span>
        {cacheInfo.serverControlled && (
          <Badge variant="outline" className="ml-2 py-0 h-5">
            服务器缓存控制
          </Badge>
        )}
      </div>
    );
  };

  // 渲染概览标签页
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* 关键指标 */}
      {subjectStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-sm font-medium text-gray-500">平均分</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5">
              <div className="text-3xl font-bold text-lime-600">
                {subjectStats.average_score?.toFixed(1) || '无数据'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                中位数: {subjectStats.median_score?.toFixed(1) || '无数据'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-sm font-medium text-gray-500">优秀率</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5">
              <div className="text-3xl font-bold text-lime-600">
                {subjectStats.excellent_rate?.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                及格率: {subjectStats.pass_rate?.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-sm font-medium text-gray-500">分数区间</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5">
              <div className="text-2xl font-bold text-lime-600">
                {subjectStats.min_score} - {subjectStats.max_score}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                标准差: {subjectStats.score_deviation?.toFixed(2) || '无数据'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 趋势图表 */}
      <Card>
        <CardHeader>
          <CardTitle>考试成绩趋势</CardTitle>
          <CardDescription>
            展示班级{subject}科目考试平均分和优秀率变化趋势
          </CardDescription>
        </CardHeader>
        <CardContent>
          {examTrends?.length ? (
            <div className="h-[300px]">
              <Line 
                data={examTrendChartData}
                options={examTrendChartOptions}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              暂无考试趋势数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // 渲染分布标签页
  const renderDistributionTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>分数分布</CardTitle>
          <CardDescription>
            最近一次考试的分数分布情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          {examTrends?.length ? (
            <div className="h-[300px]">
              <Bar 
                data={scoreDistributionData}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: {
                        display: true,
                        text: '分数'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    },
                    title: {
                      display: true,
                      text: `${subject}分数分布`
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              暂无分数分布数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            {subject} 分析
            {(loadingStats || loadingTrends) && (
              <RefreshCw className="ml-2 h-4 w-4 animate-spin text-lime-500" />
            )}
          </h2>
          {renderCacheInfo(statsCacheInfo, statsFromCache)}
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={loadingStats || loadingTrends}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新数据
          </Button>
          
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          )}
        </div>
      </div>
      
      {(statsError || trendsError) && (
        <div className="space-y-4">
          {statsError && renderError(statsError)}
          {trendsError && renderError(trendsError)}
        </div>
      )}
      
      {(loadingStats || loadingTrends) && !subjectStats && !examTrends ? (
        renderSkeleton()
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="distribution">分数分布</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-0">
            {renderOverviewTab()}
          </TabsContent>
          
          <TabsContent value="distribution" className="mt-0">
            {renderDistributionTab()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SubjectAnalyticsPanel; 