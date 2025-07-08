/**
 * Positivus风格成绩趋势分析组件
 */

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  exam_date?: string;
  exam_title?: string;
}

interface TrendAnalysisProps {
  data: GradeRecord[];
  className?: string;
}

interface TrendPoint {
  date: string;
  average: number;
  count: number;
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ data, className = "" }) => {
  const trendData = useMemo((): TrendPoint[] => {
    if (!data || data.length === 0) return [];

    // 按考试日期分组
    const dateGroups = data.reduce((acc, record) => {
      const date = record.exam_date || new Date().toISOString().split('T')[0];
      const score = record.score || record.total_score;
      
      if (score && !isNaN(Number(score))) {
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(Number(score));
      }
      
      return acc;
    }, {} as Record<string, number[]>);

    // 计算每个日期的平均分
    return Object.entries(dateGroups)
      .map(([date, scores]) => ({
        date: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        average: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
        count: scores.length
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10); // 最近10个数据点
  }, [data]);

  const trend = useMemo(() => {
    if (trendData.length < 2) return { direction: 'neutral', value: 0 };
    
    const first = trendData[0].average;
    const last = trendData[trendData.length - 1].average;
    const change = last - first;
    
    return {
      direction: change > 1 ? 'up' : change < -1 ? 'down' : 'neutral',
      value: Math.abs(change)
    };
  }, [trendData]);

  if (trendData.length === 0) {
    return (
      <Card className={`border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF] ${className}`}>
        <CardContent className="p-8 text-center">
          <div className="p-4 bg-[#9C88FF] rounded-full border-2 border-black mx-auto mb-4 w-fit">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <p className="text-lg font-black text-[#191A23] uppercase tracking-wide">暂无趋势数据</p>
          <p className="text-[#191A23]/70 font-medium mt-2">需要多次考试数据来分析趋势</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 趋势概览 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-[#191A23] uppercase tracking-wide">成绩趋势</h3>
        <Badge className={`font-bold border-2 border-black shadow-[2px_2px_0px_0px_#191A23] ${
          trend.direction === 'up' ? 'bg-[#B9FF66] text-[#191A23]' :
          trend.direction === 'down' ? 'bg-[#FF6B6B] text-white' :
          'bg-[#F3F3F3] text-[#191A23]'
        }`}>
          {trend.direction === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
          {trend.direction === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
          {trend.direction === 'neutral' && <Minus className="w-3 h-3 mr-1" />}
          {trend.direction === 'up' ? '上升' : trend.direction === 'down' ? '下降' : '稳定'} {trend.value.toFixed(1)}分
        </Badge>
      </div>

      {/* 趋势图表 */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#191A23" strokeOpacity={0.3} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fontWeight: 'bold', fill: '#191A23' }}
              stroke="#191A23"
            />
            <YAxis 
              tick={{ fontSize: 12, fontWeight: 'bold', fill: '#191A23' }}
              stroke="#191A23"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #191A23',
                borderRadius: '8px',
                boxShadow: '4px 4px 0px 0px #191A23',
                fontWeight: 'bold'
              }}
              formatter={(value: any) => [`${value}分`, '平均分']}
            />
            <Line 
              type="monotone" 
              dataKey="average" 
              stroke="#B9FF66" 
              strokeWidth={3}
              dot={{ fill: '#F7931E', strokeWidth: 2, stroke: '#191A23', r: 4 }}
              activeDot={{ r: 6, fill: '#FF6B6B', stroke: '#191A23', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 数据点统计 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-[#B9FF66]/20 border border-[#B9FF66] rounded">
          <div className="font-black text-[#191A23]">{trendData.length}</div>
          <div className="text-xs font-medium text-[#191A23]/70">数据点</div>
        </div>
        <div className="p-2 bg-[#F7931E]/20 border border-[#F7931E] rounded">
          <div className="font-black text-[#191A23]">{Math.round(trendData.reduce((sum, point) => sum + point.average, 0) / trendData.length)}</div>
          <div className="text-xs font-medium text-[#191A23]/70">整体均分</div>
        </div>
        <div className="p-2 bg-[#9C88FF]/20 border border-[#9C88FF] rounded">
          <div className="font-black text-[#191A23]">{Math.max(...trendData.map(p => p.average))}</div>
          <div className="text-xs font-medium text-[#191A23]/70">峰值</div>
        </div>
      </div>
    </div>
  );
};

export default TrendAnalysis;