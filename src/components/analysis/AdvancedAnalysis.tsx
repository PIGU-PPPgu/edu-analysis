
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartBar } from "lucide-react";
import { AutoChart } from "@/components/ui/chart";
import { toast } from "sonner";

interface Props {
  className?: string;
  studentId?: string;
}

const AdvancedAnalysis: React.FC<Props> = ({ className, studentId }) => {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Mock data for development
        const mockData = studentId 
          ? [
              { exam_date: '2023-09-15', subject: '数学', score: 85 },
              { exam_date: '2023-10-20', subject: '数学', score: 88 },
              { exam_date: '2023-11-18', subject: '数学', score: 92 },
              { exam_date: '2023-09-15', subject: '语文', score: 78 },
              { exam_date: '2023-10-20', subject: '语文', score: 82 },
              { exam_date: '2023-11-18', subject: '语文', score: 85 },
              { exam_date: '2023-09-15', subject: '英语', score: 90 },
              { exam_date: '2023-10-20', subject: '英语', score: 87 },
              { exam_date: '2023-11-18', subject: '英语', score: 91 },
            ]
          : [
              { subject: '数学', score: 82.5 },
              { subject: '语文', score: 78.3 },
              { subject: '英语', score: 85.7 },
              { subject: '物理', score: 76.8 },
              { subject: '化学', score: 79.2 },
            ];
            
        setPerformanceData(mockData);
        
        // In production, use:
        // if (studentId) {
        //   const data = await db.getStudentPerformanceOverTime(studentId);
        //   setPerformanceData(data);
        // } else {
        //   const data = await db.getClassPerformanceBySubject(className || "");
        //   setPerformanceData(data);
        // }
        
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
        ) : (
          <AutoChart
            data={performanceData}
            xKey="exam_date"
            yKeys={["score"]}
            chartType="line"
            height={350}
          />
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
        ) : (
          <AutoChart
            data={performanceData}
            xKey="subject"
            yKeys={["score"]}
            chartType="bar"
            height={350}
          />
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
