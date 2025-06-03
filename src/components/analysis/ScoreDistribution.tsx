import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { useGradeAnalysis } from '@/contexts/GradeAnalysisContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart as PieChartIcon, BarChart3, Award, Users, TrendingUp } from 'lucide-react';

// 成绩分布区间定义 - 使用更现代的色彩方案
const SCORE_RANGES = [
  { name: '优秀 (90-100)', range: [90, 100], color: '#10b981', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' },
  { name: '良好 (80-89)', range: [80, 89], color: '#3b82f6', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  { name: '中等 (70-79)', range: [70, 79], color: '#f59e0b', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  { name: '及格 (60-69)', range: [60, 69], color: '#f97316', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
  { name: '不及格 (<60)', range: [0, 59], color: '#ef4444', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' }
];

interface ScoreDistributionProps {
  className?: string;
}

const ScoreDistribution: React.FC<ScoreDistributionProps> = ({ className }) => {
  const { gradeData } = useGradeAnalysis();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  
  // 提取所有可用的科目
  const subjects = useMemo(() => {
    if (!gradeData || gradeData.length === 0) return ['all'];
    
    const subjectSet = new Set<string>();
    subjectSet.add('all'); // 添加"全部"选项
    
    gradeData.forEach(item => {
      if (item.subject) {
        subjectSet.add(item.subject);
      }
    });
    
    return Array.from(subjectSet);
  }, [gradeData]);
  
  // 根据选择的科目过滤数据
  const filteredData = useMemo(() => {
    if (!gradeData || gradeData.length === 0) return [];
    
    if (selectedSubject === 'all') {
      return gradeData;
    }
    
    return gradeData.filter(item => item.subject === selectedSubject);
  }, [gradeData, selectedSubject]);
  
  // 计算分数分布
  const distributionData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return SCORE_RANGES.map(range => ({
        ...range,
        value: 0,
        count: 0,
        percentage: 0
      }));
    }
    
    // 统计每个分数区间的人数
    const distribution = SCORE_RANGES.map(range => {
      const count = filteredData.filter(
        item => item.score >= range.range[0] && item.score <= range.range[1]
      ).length;
      
      return {
        ...range,
        value: count,
        count,
        percentage: (count / filteredData.length) * 100
      };
    });
    
    return distribution;
  }, [filteredData]);
  
  // 计算总体统计
  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        total: 0,
        average: 0,
        passCount: 0,
        passRate: 0,
        excellentCount: 0,
        excellentRate: 0
      };
    }
    
    const total = filteredData.length;
    const average = filteredData.reduce((sum, item) => sum + item.score, 0) / total;
    const passCount = filteredData.filter(item => item.score >= 60).length;
    const passRate = (passCount / total) * 100;
    const excellentCount = filteredData.filter(item => item.score >= 90).length;
    const excellentRate = (excellentCount / total) * 100;
    
    return {
      total,
      average,
      passCount,
      passRate,
      excellentCount,
      excellentRate
    };
  }, [filteredData]);

  // 自定义工具提示组件
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-sm text-gray-600">人数: {data.count}</p>
          <p className="text-sm text-gray-600">占比: {data.percentage.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">分数区间: {data.range[0]}-{data.range[1]}分</p>
        </div>
      );
    }
    return null;
  };
  
  if (!gradeData || gradeData.length === 0) {
    return (
      <Card className={`bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-gray-500" />
            成绩分布分析
          </CardTitle>
          <CardDescription>还没有成绩数据可供分析</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 mx-auto">
              <PieChartIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-muted-foreground">请先导入成绩数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`bg-gradient-to-br from-white to-gray-50 shadow-lg border-0 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-600" />
              成绩分布分析
            </CardTitle>
            <CardDescription className="mt-1">
              {selectedSubject === 'all' ? '所有科目' : selectedSubject} • 
              共{stats.total}人 • 平均分{stats.average.toFixed(1)}
            </CardDescription>
          </div>
          
          {/* 科目选择器 */}
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="选择科目" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>
                  {subject === 'all' ? '📊 所有科目' : `📚 ${subject}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 快速统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">总人数</span>
            </div>
            <div className="text-lg font-bold text-blue-800 mt-1">{stats.total}</div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">及格率</span>
            </div>
            <div className="text-lg font-bold text-green-800 mt-1">{stats.passRate.toFixed(1)}%</div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">优秀率</span>
            </div>
            <div className="text-lg font-bold text-purple-800 mt-1">{stats.excellentRate.toFixed(1)}%</div>
          </div>
          
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-3 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">平均分</span>
            </div>
            <div className="text-lg font-bold text-amber-800 mt-1">{stats.average.toFixed(1)}</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={chartType} onValueChange={(value) => setChartType(value as 'pie' | 'bar')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pie" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              饼图分析
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              柱状图分析
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pie" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 饼图 */}
              <div className="lg:col-span-2">
                <div className="h-80 bg-white rounded-lg p-4 border border-gray-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => 
                          percent > 0 ? `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%` : ''
                        }
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        formatter={(value, entry) => 
                          `${value} (${entry.payload.count}人)`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* 详细统计列表 */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 mb-4">分布详情</h4>
                {distributionData.map((range, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${range.bgColor} ${range.borderColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${range.textColor}`}>
                        {range.name}
                      </span>
                      <Badge variant="outline" className={range.textColor}>
                        {range.count}人
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>占比</span>
                        <span>{range.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={range.percentage} 
                        className="h-2"
                        style={{ 
                          backgroundColor: `${range.color}20`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="bar" className="space-y-4">
            <div className="h-80 bg-white rounded-lg p-4 border border-gray-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ value: '人数', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    radius={[4, 4, 0, 0]}
                    fill="#8884d8"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* 柱状图下方的进度条统计 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-white p-4 rounded-lg border border-gray-100">
                <h5 className="font-medium text-gray-800 mb-3">关键指标</h5>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>及格率 (≥60分)</span>
                      <span className="font-medium">{stats.passRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={stats.passRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>优秀率 (≥90分)</span>
                      <span className="font-medium">{stats.excellentRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={stats.excellentRate} className="h-2" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-100">
                <h5 className="font-medium text-gray-800 mb-3">分析建议</h5>
                <div className="space-y-2 text-sm text-gray-600">
                  {stats.excellentRate >= 30 && (
                    <p className="text-green-600">✓ 优秀率较高，整体表现出色</p>
                  )}
                  {stats.passRate >= 80 && (
                    <p className="text-blue-600">✓ 及格率良好，基础扎实</p>
                  )}
                  {stats.passRate < 60 && (
                    <p className="text-red-600">⚠ 及格率偏低，需要重点关注</p>
                  )}
                  {distributionData.find(d => d.name.includes('不及格'))?.percentage > 20 && (
                    <p className="text-orange-600">⚠ 不及格比例较高，建议加强辅导</p>
                  )}
                  <p className="text-gray-500">
                    平均分{stats.average.toFixed(1)}分，
                    {stats.average >= 85 ? '整体水平优秀' : 
                     stats.average >= 75 ? '整体水平良好' : 
                     stats.average >= 65 ? '整体水平中等' : '需要提升'}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ScoreDistribution;
