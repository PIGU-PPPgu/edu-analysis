
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";

interface SubjectData {
  subject: string;
  average: number;
}

interface Props {
  data?: SubjectData[];
}

const SubjectAverages: React.FC<Props> = ({ data: initialData }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [data, setData] = useState<SubjectData[]>([]);
  const [isLoading, setIsLoading] = useState(!initialData);
  
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setData(initialData);
      return;
    }
    
    const fetchSubjectAverages = async () => {
      try {
        setIsLoading(true);
        
        const { data: grades, error } = await supabase
          .from('grades')
          .select('subject, score');
        
        if (error) throw error;
        
        if (!grades || grades.length === 0) {
          setData([]);
          return;
        }
        
        // 按科目计算平均分
        const subjectGroups: Record<string, number[]> = {};
        grades.forEach(item => {
          if (!subjectGroups[item.subject]) {
            subjectGroups[item.subject] = [];
          }
          subjectGroups[item.subject].push(item.score);
        });
        
        const subjectAverages = Object.entries(subjectGroups).map(([subject, scores]) => ({
          subject,
          average: parseFloat((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1))
        }));
        
        setData(subjectAverages);
      } catch (error) {
        console.error("获取科目平均分失败:", error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubjectAverages();
  }, [initialData]);
  
  const handleMouseOver = (_data: any, index: number) => {
    setActiveIndex(index);
  };
  
  const handleMouseLeave = () => {
    setActiveIndex(null);
  };
  
  const colors = ["#8884d8", "#B9FF66", "#ffc658", "#ff8042", "#82ca9d", "#a4de6c"];
  
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>各科平均分对比</CardTitle>
        <CardDescription>各科目的平均得分情况</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] flex items-center justify-center">
        {isLoading ? (
          <div className="text-gray-500">加载中...</div>
        ) : data.length > 0 ? (
          <ChartContainer config={{
            average: { color: "#8884d8" }
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                onMouseLeave={handleMouseLeave}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" angle={-45} textAnchor="end" interval={0} />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value} 分`, "平均分"]}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Legend wrapperStyle={{ bottom: 0 }} />
                <Bar 
                  dataKey="average" 
                  name="平均分" 
                  onMouseOver={handleMouseOver}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={activeIndex === index ? "#B9FF66" : colors[index % colors.length]} 
                      cursor="pointer"
                      fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="text-gray-500">暂无科目成绩数据</div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubjectAverages;
