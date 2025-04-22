
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartBar } from "lucide-react";
import { AutoChart } from "@/components/ui/chart";
import { toast } from "sonner";
import { db } from "@/utils/auth";

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
        
        if (studentId) {
          const data = await db.getStudentPerformanceOverTime(studentId);
          setPerformanceData(data);
        } else {
          const data = await db.getClassPerformanceBySubject(className || "");
          setPerformanceData(data);
        }
        
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
