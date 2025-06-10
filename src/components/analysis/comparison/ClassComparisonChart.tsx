import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, BarChart3, Radar as RadarIcon, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { filterDataByClasses, generateClassComparison } from '@/utils/gradeFieldUtils';
import { Subject } from '@/types/grade';
import type { GradeRecord, ClassFilterState } from '@/types/grade';

interface ClassComparisonChartProps {
  data: GradeRecord[];
  filterState: ClassFilterState;
  selectedSubject?: Subject;
  className?: string;
}

// 定义颜色方案
const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export default function ClassComparisonChart({
  data,
  filterState,
  selectedSubject = Subject.TOTAL,
  className
}: ClassComparisonChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'radar' | 'ranking'>('bar');
  
  // 生成对比数据
  const comparisonData = generateClassComparison(
    data,
    filterState.selectedClasses.length > 0 ? filterState.selectedClasses : undefined
  );
  
  // 准备柱状图数据
  const prepareBarChartData = (subject: Subject) => {
    const comparison = comparisonData.comparisonMetrics.find(m => m.subject === subject);
    if (!comparison) return [];
    
    return comparison.classRankings.map((item, index) => ({
      className: item.className,
      average: item.average,
      gradeAverage: comparison.gradeAverage,
      rank: item.rank,
      color: COLORS[index % COLORS.length]
    }));
  };
  
  // 准备雷达图数据
  const prepareRadarData = () => {
    const subjects = [Subject.CHINESE, Subject.MATH, Subject.ENGLISH, Subject.PHYSICS, Subject.CHEMISTRY];
    const radarData = subjects.map(subject => {
      const subjectData: any = { subject: subject };
      
      comparisonData.classes.forEach((classStats, index) => {
        const stats = classStats.statistics[subject];
        if (stats) {
          subjectData[classStats.className] = stats.average;
        }
      });
      
      // 添加年级平均
      const gradeStats = comparisonData.gradeOverall[subject];
      if (gradeStats) {
        subjectData['年级平均'] = gradeStats.average;
      }
      
      return subjectData;
    });
    
    return radarData;
  };
  
  // 准备排名数据
  const prepareRankingData = () => {
    return comparisonData.comparisonMetrics.map(metric => ({
      subject: metric.subject,
      bestClass: metric.bestClass,
      worstClass: metric.worstClass,
      gradeAverage: metric.gradeAverage,
      rankings: metric.classRankings
    }));
  };
  
  const barData = prepareBarChartData(selectedSubject);
  const radarData = prepareRadarData();
  const rankingData = prepareRankingData();
  
  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'average' ? '班级平均分' : '年级平均分'}: {entry.value.toFixed(1)}
            </p>
          ))}
          {payload[0]?.payload?.rank && (
            <p className="text-sm text-gray-600">
              排名: 第{payload[0].payload.rank}名
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            班级对比分析
          </div>
          <div className="flex gap-1">
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              柱状图
            </Button>
            <Button
              variant={chartType === 'radar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('radar')}
            >
              <RadarIcon className="w-4 h-4 mr-1" />
              雷达图
            </Button>
            <Button
              variant={chartType === 'ranking' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('ranking')}
            >
              <Target className="w-4 h-4 mr-1" />
              排名表
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {chartType === 'bar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{selectedSubject} - 班级平均分对比</h3>
              <Badge variant="outline">
                年级平均: {barData[0]?.gradeAverage?.toFixed(1) || 'N/A'}
              </Badge>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="className" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="average" 
                    name="班级平均分"
                    fill="#3B82F6"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="gradeAverage" 
                    name="年级平均分"
                    fill="#EF4444"
                    opacity={0.6}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {chartType === 'radar' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">多科目雷达对比图</h3>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }}
                    tickCount={6}
                  />
                  
                  {/* 年级平均线 */}
                  <Radar
                    name="年级平均"
                    dataKey="年级平均"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  
                  {/* 各班级数据 */}
                  {comparisonData.classes.slice(0, 6).map((classStats, index) => (
                    <Radar
                      key={classStats.className}
                      name={classStats.className}
                      dataKey={classStats.className}
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                  
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {chartType === 'ranking' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">班级排名详情</h3>
            
            <Tabs defaultValue={Subject.TOTAL} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value={Subject.TOTAL}>总分</TabsTrigger>
                <TabsTrigger value={Subject.CHINESE}>语文</TabsTrigger>
                <TabsTrigger value={Subject.MATH}>数学</TabsTrigger>
                <TabsTrigger value={Subject.ENGLISH}>英语</TabsTrigger>
              </TabsList>
              
              {rankingData.map((rankData) => (
                <TabsContent key={rankData.subject} value={rankData.subject} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 最佳表现 */}
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-semibold text-green-800">最佳表现</span>
                        </div>
                        <p className="text-lg font-bold text-green-900">{rankData.bestClass}</p>
                        <p className="text-sm text-green-700">
                          平均分: {rankData.rankings[0]?.average?.toFixed(1) || 'N/A'}
                        </p>
                      </CardContent>
                    </Card>
                    
                    {/* 年级平均 */}
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Target className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-semibold text-blue-800">年级平均</span>
                        </div>
                        <p className="text-lg font-bold text-blue-900">{rankData.gradeAverage.toFixed(1)}</p>
                        <p className="text-sm text-blue-700">
                          全年级参考标准
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* 排名列表 */}
                  <div className="space-y-2">
                    <h4 className="font-semibold">详细排名</h4>
                    <div className="space-y-1">
                      {rankData.rankings.map((item, index) => {
                        const isAboveAverage = item.average > rankData.gradeAverage;
                        return (
                          <div
                            key={item.className}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              isAboveAverage ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                            } border`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                index === 0 ? 'bg-yellow-500' :
                                index === 1 ? 'bg-gray-400' :
                                index === 2 ? 'bg-amber-600' : 'bg-gray-500'
                              }`}>
                                {item.rank}
                              </div>
                              <span className="font-medium">{item.className}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{item.average.toFixed(1)}</div>
                              <div className={`text-xs ${isAboveAverage ? 'text-green-600' : 'text-gray-600'}`}>
                                {isAboveAverage ? '↑' : '↓'} {Math.abs(item.average - rankData.gradeAverage).toFixed(1)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 