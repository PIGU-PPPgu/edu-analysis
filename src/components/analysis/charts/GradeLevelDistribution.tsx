/**
 * 🎯 成绩等级分布图 - 概览页面核心组件
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, Target, Users } from 'lucide-react';

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
  grade?: string;  // 实际上传的等级数据 (A+, A, B+, B, C+, C等)
}

interface GradeLevelDistributionProps {
  gradeData: GradeRecord[];
  className?: string;
}

interface SubjectDistribution {
  subject: string;
  gradeCounts: Record<string, number>; // 实际等级分布，如 {"A+": 5, "A": 10, "B+": 8}
  total: number;
  hasGradeData: boolean; // 是否有实际等级数据
}

const GradeLevelDistribution: React.FC<GradeLevelDistributionProps> = ({ 
  gradeData, 
  className = "" 
}) => {
  // 计算各科目等级分布（优先使用实际等级数据）
  const distributionData = useMemo((): SubjectDistribution[] => {
    if (!gradeData || gradeData.length === 0) return [];

    // 按科目分组，收集实际等级数据
    const subjectGroups = gradeData.reduce((acc, record) => {
      const subject = record.subject || '总分';
      
      if (!acc[subject]) {
        acc[subject] = {
          grades: [],
          scores: []
        };
      }
      
      // 收集实际等级数据
      if (record.grade && record.grade.trim()) {
        acc[subject].grades.push(record.grade.trim());
      }
      
      // 收集分数数据作为备用
      const score = record.score || record.total_score || 0;
      if (score > 0) {
        acc[subject].scores.push(score);
      }
      
      return acc;
    }, {} as Record<string, {grades: string[], scores: number[]}>);

    // 计算每个科目的等级分布
    const distributions = Object.entries(subjectGroups).map(([subject, data]) => {
      const hasGradeData = data.grades.length > 0;
      
      if (hasGradeData) {
        // 使用实际等级数据
        const gradeCounts: Record<string, number> = {};
        data.grades.forEach(grade => {
          gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });
        
        return {
          subject,
          gradeCounts,
          total: data.grades.length,
          hasGradeData: true
        };
      } else {
        // 降级使用分数数据，转换为简化等级
        const gradeCounts: Record<string, number> = {
          '优秀(90+)': data.scores.filter(s => s >= 90).length,
          '良好(80-89)': data.scores.filter(s => s >= 80 && s < 90).length,
          '及格(60-79)': data.scores.filter(s => s >= 60 && s < 80).length,
          '不及格(<60)': data.scores.filter(s => s < 60).length
        };
        
        return {
          subject,
          gradeCounts,
          total: data.scores.length,
          hasGradeData: false
        };
      }
    }).filter(dist => dist.total > 0);

    // 按总人数排序，总分放在最前面
    return distributions.sort((a, b) => {
      if (a.subject === '总分') return -1;
      if (b.subject === '总分') return 1;
      return b.total - a.total;
    });
  }, [gradeData]);

  // 准备图表数据
  const chartData = useMemo(() => {
    return distributionData.map(item => {
      const chartItem: any = {
        subject: item.subject,
        hasGradeData: item.hasGradeData,
        total: item.total
      };
      
      // 将等级分布添加到图表数据中
      Object.entries(item.gradeCounts).forEach(([grade, count]) => {
        chartItem[grade] = count;
      });
      
      return chartItem;
    });
  }, [distributionData]);

  // 整体统计
  const overallStats = useMemo(() => {
    const totalStudents = new Set(gradeData.map(r => r.student_id)).size;
    const totalRecords = gradeData.length;
    const hasAnyGradeData = distributionData.some(item => item.hasGradeData);
    
    // 获取所有等级
    const allGrades = new Set<string>();
    distributionData.forEach(item => {
      Object.keys(item.gradeCounts).forEach(grade => {
        allGrades.add(grade);
      });
    });

    return {
      totalStudents,
      totalRecords,
      subjectCount: distributionData.length,
      hasAnyGradeData,
      allGrades: Array.from(allGrades).sort()
    };
  }, [gradeData, distributionData]);

  // 动态等级颜色映射
  const getLevelColor = (level: string) => {
    // 优先级颜色：优秀等级用绿色，不及格/失败等级用红色，其他用不同透明度的绿色
    if (level.includes('A+') || level.includes('优秀')) return '#B9FF66';
    if (level.includes('A') && !level.includes('+')) return '#B9FF66';
    if (level.includes('B+')) return '#B9FF66';
    if (level.includes('B') && !level.includes('+')) return '#B9FF66';
    if (level.includes('C') || level.includes('D') || level.includes('F') || level.includes('不及格')) return '#FF6B6B';
    if (level.includes('良好')) return '#B9FF66';
    if (level.includes('及格')) return '#B9FF66';
    // 默认颜色
    return '#B9FF66';
  };

  // 动态生成图表所需的颜色配置
  const gradeColors = useMemo(() => {
    const colors: Record<string, string> = {};
    overallStats.allGrades.forEach(grade => {
      colors[grade] = getLevelColor(grade);
    });
    return colors;
  }, [overallStats.allGrades]);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#191A23] p-3">
          <CardContent className="p-0">
            <p className="font-black text-[#191A23] mb-2">{label}</p>
            <div className="space-y-1">
              {overallStats.allGrades.map(grade => {
                const count = data[grade] || 0;
                if (count === 0) return null;
                
                const percentage = data.total > 0 ? ((count / data.total) * 100).toFixed(1) : '0.0';
                const icon = grade.includes('A+') || grade.includes('优秀') ? '🏆' :
                           grade.includes('A') ? '🥇' :
                           grade.includes('B') ? '🥈' :
                           grade.includes('C') ? '🥉' :
                           grade.includes('不及格') || grade.includes('F') ? '⚠️' : '📊';
                           
                return (
                  <p key={grade} className="text-sm font-medium text-[#191A23]">
                    {icon} {grade}: <span className="font-bold">{count}人</span> ({percentage}%)
                  </p>
                );
              })}
              {data.hasGradeData && (
                <p className="text-xs font-bold text-[#B9FF66] bg-[#191A23] px-2 py-1 rounded mt-2">
                  📊 使用实际等级数据
                </p>
              )}
              {!data.hasGradeData && (
                <p className="text-xs font-bold text-[#F7931E] bg-[#191A23] px-2 py-1 rounded mt-2">
                  📈 基于分数计算等级
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  if (distributionData.length === 0) {
    return (
      <Card className={`border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}>
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <TrendingUp className="h-16 w-16 text-[#191A23]" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">📊 暂无成绩数据</p>
          <p className="text-[#191A23]/70 font-medium">需要成绩数据来展示等级分布</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>

      {/* 等级分布条形图 - 主要组件 */}
      <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
        <CardHeader className="bg-[#B9FF66] border-b-4 border-[#191A23] p-6">
          <CardTitle className="text-2xl font-black text-[#191A23] flex items-center gap-3">
            <TrendingUp className="w-5 h-5" />
            📊 成绩等级分布一览
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 bg-white">
          <div className="h-96 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#191A23" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="subject" 
                  tick={{ fontSize: 12, fontWeight: 'bold', fill: '#191A23' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  stroke="#191A23"
                />
                <YAxis 
                  tick={{ fontSize: 12, fontWeight: 'bold', fill: '#191A23' }}
                  stroke="#191A23"
                />
                <Tooltip content={<CustomTooltip />} />
                {overallStats.allGrades.map((grade, index) => (
                  <Bar 
                    key={grade}
                    dataKey={grade} 
                    stackId="a" 
                    fill={gradeColors[grade]} 
                    opacity={grade.includes('不及格') || grade.includes('F') ? 1 : 0.8 - (index * 0.1)}
                    stroke="#191A23" 
                    strokeWidth={1} 
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 动态图例说明 */}
          <div className="space-y-3">
            <div className="flex justify-center items-center gap-2 mb-2">
              {overallStats.hasAnyGradeData ? (
                <Badge className="bg-[#B9FF66] text-[#191A23] border border-black text-xs">
                  📊 使用实际等级数据
                </Badge>
              ) : (
                <Badge className="bg-[#F7931E] text-white border border-black text-xs">
                  📈 基于分数计算等级
                </Badge>
              )}
            </div>
            <div className="flex justify-center gap-4 flex-wrap">
              {overallStats.allGrades.map((grade, index) => {
                const icon = grade.includes('A+') || grade.includes('优秀') ? '🏆' :
                           grade.includes('A') ? '🥇' :
                           grade.includes('B') ? '🥈' :
                           grade.includes('C') ? '🥉' :
                           grade.includes('不及格') || grade.includes('F') ? '⚠️' : '📊';
                           
                return (
                  <div key={grade} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 border border-black"
                      style={{ 
                        backgroundColor: gradeColors[grade],
                        opacity: grade.includes('不及格') || grade.includes('F') ? 1 : 0.8 - (index * 0.1)
                      }}
                    ></div>
                    <span className="font-bold text-[#191A23] text-sm">
                      {icon} {grade}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细数据表格 - 次要组件 */}
      <Card className="border-3 border-[#B9FF66] shadow-[4px_4px_0px_0px_#191A23] bg-white">
        <CardHeader className="bg-[#B9FF66]/30 border-b-3 border-[#B9FF66] p-5">
          <CardTitle className="text-xl font-bold text-[#191A23]">📋 详细等级数据</CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          <div className="space-y-4">
            {distributionData.map((item, index) => (
              <Card key={item.subject} className="border-2 border-[#B9FF66]/60 bg-[#F8F8F8] hover:bg-white transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-[#B9FF66] text-[#191A23]' : 'bg-[#191A23] text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#191A23]">{item.subject}</h3>
                        <p className="text-[#191A23]/70 text-sm">总计 {item.total} 人</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.gradeCounts).map(([grade, count]) => {
                        if (count === 0) return null;
                        const color = getLevelColor(grade);
                        const isLowGrade = grade.includes('不及格') || grade.includes('F');
                        
                        return (
                          <Badge 
                            key={grade}
                            className={`text-center border-2 border-black ${
                              isLowGrade 
                                ? 'bg-[#FF6B6B] text-white' 
                                : 'bg-[#B9FF66] text-[#191A23]'
                            }`}
                          >
                            {grade} {count}
                          </Badge>
                        );
                      })}
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-[#191A23] mb-1">
                        {item.hasGradeData ? '📊 等级数据' : '📈 分数数据'}
                      </div>
                      <div className="text-sm text-[#191A23]/70">
                        总计 {item.total} 人
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeLevelDistribution;