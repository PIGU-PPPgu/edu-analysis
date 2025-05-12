import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import ExamSelector from "./ExamSelector";
import { supabase } from "@/integrations/supabase/client";

interface Exam {
  id: string;
  name: string;
  date: string;
}

interface SubjectScore {
  total: number;
  count: number;
}

interface ExamComparisonProps {
  mockExamList?: Exam[];
  initialSelectedExams?: string[];
  mockDisplayScores?: any[];
}

const ExamComparison: React.FC<ExamComparisonProps> = ({ mockExamList, initialSelectedExams, mockDisplayScores }) => {
  const [selectedExams, setSelectedExams] = useState<string[]>(initialSelectedExams || []);
  const [examList, setExamList] = useState<Exam[]>(mockExamList || []);
  const [scoreData, setScoreData] = useState<any[]>(mockDisplayScores && initialSelectedExams && initialSelectedExams.length > 0 ? mockDisplayScores : []);
  const [isLoading, setIsLoading] = useState(!mockExamList); // If mockExamList is provided, don't initially load

  useEffect(() => {
    if (mockExamList) {
      setExamList(mockExamList);
      // setSelectedExams is already initialized from initialSelectedExams or []
      // If mockDisplayScores are provided, isLoading should be false.
      if (mockDisplayScores) {
        setIsLoading(false);
      }
      return; // Skip API call for exam types if mockExamList is provided
    }

    const fetchExamTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('grades')
          .select('exam_type, exam_date')
          .not('exam_type', 'is', null)
          .order('exam_date', { ascending: false });
        
        if (error) throw error;
        
        // 处理和去重考试类型
        const uniqueExams = new Map<string, Exam>();
        data?.forEach(item => {
          if (item.exam_type && item.exam_date) {
            const key = `${item.exam_type}-${item.exam_date}`;
            if (!uniqueExams.has(key)) {
              uniqueExams.set(key, {
                id: key,
                name: item.exam_type,
                date: item.exam_date
              });
            }
          }
        });
        
        setExamList(Array.from(uniqueExams.values()));
      } catch (error) {
        console.error("获取考试类型失败:", error);
      }
    };
    
    if (!mockExamList) { // Only fetch if no mockExamList
    fetchExamTypes();
    }
  }, [mockExamList, initialSelectedExams, mockDisplayScores]); // Added mockDisplayScores

  useEffect(() => {
    if (mockDisplayScores && selectedExams.length > 0) {
      //This assumes mockDisplayScores is correctly structured for the selectedExams.
      setScoreData(mockDisplayScores);
      setIsLoading(false);
      return; // Skip API call for scores if mockDisplayScores is provided
    }

      if (selectedExams.length === 0) {
        setScoreData([]);
      // if not in full mock mode (i.e. mockExamList was not provided), then also stop loading.
      if (!mockExamList) setIsLoading(false); 
        return;
      }
      
    // Only fetch real data if not in full mock mode (i.e., neither mockExamList nor mockDisplayScores were provided for current selections)
    if (!mockExamList && !mockDisplayScores) { 
      const fetchScoreData = async () => {
      try {
        // 解析选中的考试ID并提取考试类型和日期
        const examDetails = selectedExams.map(id => {
          const [examType, examDate] = id.split('-');
          return { examType, examDate };
        });
        
        // 构建查询条件
        const queries = examDetails.map(async ({ examType, examDate }) => {
          const { data, error } = await supabase
            .from('grades')
            .select('subject, score')
            .eq('exam_type', examType)
            .eq('exam_date', examDate);
          
          if (error) throw error;
          
          // 按科目计算平均分
          const subjectAverages: Record<string, SubjectScore> = {};
          data?.forEach(item => {
            if (!subjectAverages[item.subject]) {
              subjectAverages[item.subject] = { total: 0, count: 0 };
            }
            subjectAverages[item.subject].total += item.score;
            subjectAverages[item.subject].count += 1;
          });
          
          return Object.entries(subjectAverages).map(([subject, scores]) => ({
            subject,
            [examType]: scores.total / scores.count,
            examId: `${examType}-${examDate}`
          }));
        });
        
        const results = await Promise.all(queries);
        const flatResults = results.flat();
        
        // 按科目合并所有考试的成绩
        const subjectMap: Record<string, any> = {};
        flatResults.forEach(item => {
          if (!subjectMap[item.subject]) {
            subjectMap[item.subject] = { subject: item.subject };
          }
          
          const examType = item.examId.split('-')[0];
          subjectMap[item.subject][examType] = item[examType];
        });
        
        setScoreData(Object.values(subjectMap));
      } catch (error) {
        console.error("获取成绩数据失败:", error);
      }
    };
    
    fetchScoreData();
    }
  }, [selectedExams, mockDisplayScores, mockExamList]);

  const colors = ["#B9FF66", "#8884d8", "#82ca9d", "#ffc658"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>考试成绩对比分析</CardTitle>
        <CardDescription>选择考试进行成绩趋势对比</CardDescription>
        <ExamSelector
          exams={examList}
          selectedExams={selectedExams}
          onChange={setSelectedExams}
          maxSelections={4}
        />
      </CardHeader>
      <CardContent className="h-[320px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : selectedExams.length > 0 && scoreData.length > 0 ? (
          <ChartContainer config={{
            exam: { color: "#B9FF66" }
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={scoreData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="subject" 
                  angle={-45} 
                  textAnchor="end"
                  interval={0}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => [`${value} 分`, ""]}
                  labelFormatter={(label: string) => `科目: ${label}`}
                />
                <Legend />
                {selectedExams.map((examId, index) => {
                  const examType = examId.split('-')[0];
                  return (
                    <Line
                      key={examId}
                      type="monotone"
                      dataKey={examType}
                      name={examType}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            {selectedExams.length === 0 ? "请选择要对比的考试" : "暂无数据"}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExamComparison;
