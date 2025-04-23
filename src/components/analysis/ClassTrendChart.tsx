
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";

interface ClassTrendChartProps {
  className: string;
}

interface ExamData {
  examName: string;
  classAvg: number;
  gradeAvg: number;
}

const ClassTrendChart: React.FC<ClassTrendChartProps> = ({ className }) => {
  const [trendData, setTrendData] = useState<ExamData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClassTrends = async () => {
      try {
        setIsLoading(true);
        
        // 获取班级ID
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id')
          .eq('name', className)
          .maybeSingle();
        
        if (classError) throw classError;
        
        if (!classData) {
          console.log("未找到班级:", className);
          setTrendData([]);
          return;
        }
        
        const classId = classData.id;
        
        // 获取班级学生ID
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId);
        
        if (studentError) throw studentError;
        
        if (!studentData || studentData.length === 0) {
          console.log("班级没有学生:", className);
          setTrendData([]);
          return;
        }
        
        const studentIds = studentData.map(s => s.id);
        
        // 获取所有考试类型和日期
        const { data: examsData, error: examsError } = await supabase
          .from('grades')
          .select('exam_type, exam_date')
          .not('exam_type', 'is', null)
          .not('exam_date', 'is', null)
          .order('exam_date', { ascending: true });
        
        if (examsError) throw examsError;
        
        // 获取每次考试的班级平均分和年级平均分
        const uniqueExams = new Map<string, { type: string, date: string }>();
        examsData?.forEach(item => {
          if (item.exam_type && item.exam_date) {
            const key = `${item.exam_type}-${item.exam_date}`;
            uniqueExams.set(key, { type: item.exam_type, date: item.exam_date });
          }
        });
        
        // 获取每次考试数据
        const examResults = await Promise.all(
          Array.from(uniqueExams.values()).map(async ({ type, date }) => {
            // 获取班级平均分
            const { data: classScores, error: classScoreError } = await supabase
              .from('grades')
              .select('score')
              .in('student_id', studentIds)
              .eq('exam_type', type)
              .eq('exam_date', date);
            
            if (classScoreError) throw classScoreError;
            
            // 获取年级平均分
            const { data: gradeScores, error: gradeScoreError } = await supabase
              .from('grades')
              .select('score')
              .eq('exam_type', type)
              .eq('exam_date', date);
            
            if (gradeScoreError) throw gradeScoreError;
            
            const classAvg = classScores?.length
              ? classScores.reduce((sum, item) => sum + item.score, 0) / classScores.length
              : 0;
              
            const gradeAvg = gradeScores?.length
              ? gradeScores.reduce((sum, item) => sum + item.score, 0) / gradeScores.length
              : 0;
            
            return {
              examName: type,
              classAvg: parseFloat(classAvg.toFixed(1)),
              gradeAvg: parseFloat(gradeAvg.toFixed(1))
            };
          })
        );
        
        setTrendData(examResults);
      } catch (error) {
        console.error("获取班级趋势数据失败:", error);
        setTrendData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClassTrends();
  }, [className]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>班级成绩趋势</CardTitle>
        <CardDescription>{className}与年级平均分对比趋势</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : trendData.length > 0 ? (
          <ChartContainer config={{
            classAvg: { color: "#B9FF66" },
            gradeAvg: { color: "#8884d8" }
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="examName" />
                <YAxis domain={[70, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value} 分`, ""]}
                  labelFormatter={(label) => `考试: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="classAvg" 
                  name={`${className}平均分`} 
                  stroke="#B9FF66" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="gradeAvg" 
                  name="年级平均分" 
                  stroke="#8884d8" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">暂无班级考试数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassTrendChart;
