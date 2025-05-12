import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ScoreRange {
  name: string;
  min: number;
  max: number;
  color: string;
}

interface DistributionData {
  subject: string;
  [key: string]: any; // For dynamic score ranges
}

// 除了使用SCORE_RANGES，也支持直接传入分布数据
interface SimpleDistributionItem {
  range: string; // 分数段名称，如 "90-100分"
  count: number; // 该分数段的学生数量
  color: string; // 该分数段的显示颜色
}

const SCORE_RANGES: ScoreRange[] = [
  { name: "优秀(90-100)", min: 90, max: 100, color: "#4CAF50" },
  { name: "良好(80-89)", min: 80, max: 89, color: "#8BC34A" },
  { name: "中等(70-79)", min: 70, max: 79, color: "#CDDC39" },
  { name: "及格(60-69)", min: 60, max: 69, color: "#FFEB3B" },
  { name: "不及格(<60)", min: 0, max: 59, color: "#F44336" }
];

interface Props {
  data?: any[];
}

const ScoreDistribution: React.FC<Props> = ({ data: initialData }) => {
  const [data, setData] = useState<DistributionData[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [viewType, setViewType] = useState<"stacked" | "pie">("stacked");
  
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      processData(initialData);
      return;
    }
    
    const fetchScoreDistribution = async () => {
      try {
        setIsLoading(true);
        
        // 获取学科列表
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('grades')
          .select('subject')
          .order('subject');
        
        if (subjectsError) throw subjectsError;
        
        // 获取所有成绩
        const { data: grades, error: gradesError } = await supabase
          .from('grades')
          .select('subject, score');
        
        if (gradesError) throw gradesError;
        
        if (!grades || grades.length === 0) {
          setData([]);
          return;
        }

        // 提取唯一的学科
        const subjects = Array.from(new Set(subjectsData.map(item => item.subject)));
        
        // 构建学科分数分布数据
        const distributionData = subjects.map(subject => {
          const subjectScores = grades.filter(grade => grade.subject === subject);
          const distribution: DistributionData = { subject };
          
          // 计算每个分数段的人数
          SCORE_RANGES.forEach(range => {
            const count = subjectScores.filter(
              item => item.score >= range.min && item.score <= range.max
            ).length;
            distribution[range.name] = count;
          });
          
          return distribution;
        });
        
        setData(distributionData);
      } catch (error) {
        console.error("获取分数分布数据失败:", error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchScoreDistribution();
  }, [initialData]);
  
  const processData = (rawData: any[]) => {
    // 检查数据格式并处理
    // 如果是从DetailTab传入的简单分布数据格式 { range, count, color }
    if (rawData.length > 0 && 'range' in rawData[0] && 'count' in rawData[0]) {
      const simpleData = rawData as SimpleDistributionItem[];
      
      // 为Bar Chart转换数据格式
      const barData: DistributionData[] = [{ subject: '全班' }];
      simpleData.forEach(item => {
        barData[0][item.range] = item.count;
      });
      setData(barData);
      
      // 为Pie Chart准备数据
      const pieChartData = simpleData.map(item => ({
        name: item.range,
        value: item.count,
        color: item.color
      }));
      setPieData(pieChartData);
      
      setIsLoading(false);
      return;
    }
    
    // 如果是按学科的详细分布数据，则按原逻辑处理
    try {
      // 提取唯一的学科
      const subjects = Array.from(new Set(rawData.map(item => item.subject)));
      
      // 构建学科分数分布数据
      const distributionData = subjects.map(subject => {
        const subjectScores = rawData.filter(grade => grade.subject === subject);
        const distribution: DistributionData = { subject };
        
        // 计算每个分数段的人数
        SCORE_RANGES.forEach(range => {
          const count = subjectScores.filter(
            item => item.score >= range.min && item.score <= range.max
          ).length;
          distribution[range.name] = count;
        });
        
        return distribution;
      });
      
      setData(distributionData);
      setIsLoading(false);
    } catch (error) {
      console.error("处理分数分布数据失败:", error);
      setData([]);
      setIsLoading(false);
    }
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>分数段分布</CardTitle>
          <Tabs value={viewType} onValueChange={(v) => setViewType(v as "stacked" | "pie")} className="ml-auto">
            <TabsList className="grid grid-cols-2 h-8 text-xs">
              <TabsTrigger value="stacked" className="px-3 py-1">堆叠图</TabsTrigger>
              <TabsTrigger value="pie" className="px-3 py-1">饼图</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardDescription className="text-gray-500 pt-1">
          各分数段学生人数
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] flex items-center justify-center">
        {isLoading ? (
          <div className="text-gray-500">加载中...</div>
        ) : data.length > 0 ? (
          viewType === "stacked" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" height={60} angle={-45} textAnchor="end" interval={0} />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value}人`, name]}
                  labelFormatter={(label: string) => `学科: ${label}`}
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                {/* 如果是简单格式数据，使用range作为dataKey */}
                {initialData && initialData.length > 0 && 'range' in initialData[0] ? 
                  initialData.map((item: any) => (
                    <Bar 
                      key={item.range} 
                      dataKey={item.range} 
                      stackId="a" 
                      fill={item.color} 
                    />
                  )) : 
                  SCORE_RANGES.map((range) => (
                  <Bar 
                    key={range.name} 
                    dataKey={range.name} 
                    stackId="a" 
                    fill={range.color} 
                  />
                  ))
                }
              </BarChart>
            </ResponsiveContainer>
          ) : (
            // 实现饼图视图
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}人`, "人数"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )
        ) : (
          <div className="text-gray-500">暂无分数分布数据</div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreDistribution;
