
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartBar } from "lucide-react";
import { AutoChart } from "@/components/ui/chart";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  className?: string;
  studentId?: string;
}

const AdvancedAnalysis: React.FC<Props> = ({ className, studentId }) => {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        let data = [];
        if (studentId) {
          // 获取特定学生的成绩数据
          const { data: studentScores, error } = await supabase
            .from('grades')
            .select('subject, score, exam_date')
            .eq('student_id', studentId)
            .order('exam_date', { ascending: true });

          if (error) throw error;
          data = studentScores || [];
        } else {
          // 获取所有科目的平均分
          const { data: subjectAverages, error } = await supabase
            .from('grades')
            .select('subject, score')
            .order('subject');

          if (error) throw error;
          
          // 计算每个科目的平均分
          const subjectGroups: Record<string, number[]> = {};
          subjectAverages?.forEach(item => {
            if (!subjectGroups[item.subject]) {
              subjectGroups[item.subject] = [];
            }
            subjectGroups[item.subject].push(item.score);
          });
          
          data = Object.entries(subjectGroups).map(([subject, scores]) => ({
            subject,
            score: scores.reduce((sum, score) => sum + score, 0) / scores.length
          }));
        }
        
        setPerformanceData(data);
        toast.success("数据加载成功");
      } catch (error) {
        console.error("数据加载失败:", error);
        toast.error("数据加载失败，请重试");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [studentId, className]);

  const renderPerformanceChart = () => (
    <Card>
      <CardHeader>
        <CardTitle>成绩趋势分析</CardTitle>
        <CardDescription>各科目成绩变化趋势</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            加载中...
          </div>
        ) : performanceData.length > 0 ? (
          <AutoChart
            data={performanceData}
            xKey={studentId ? "exam_date" : "subject"}
            yKeys={["score"]}
            chartType={studentId ? "line" : "bar"}
            height={350}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            暂无数据
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSubjectComparison = () => (
    <Card>
      <CardHeader>
        <CardTitle>学科对比分析</CardTitle>
        <CardDescription>各科目成绩分布情况</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            加载中...
          </div>
        ) : performanceData.length > 0 ? (
          <AutoChart
            data={performanceData}
            xKey={studentId ? "subject" : "subject"}
            yKeys={["score"]}
            chartType="bar"
            height={350}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            暂无数据
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={className}>
      <Tabs defaultValue="trend">
        <TabsList>
          <TabsTrigger value="trend">
            <ChartBar className="h-4 w-4 mr-2" />
            趋势分析
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <ChartBar className="h-4 w-4 mr-2" />
            对比分析
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="trend" className="mt-4">
          {renderPerformanceChart()}
        </TabsContent>
        
        <TabsContent value="comparison" className="mt-4">
          {renderSubjectComparison()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalysis;
