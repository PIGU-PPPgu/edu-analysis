import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeaknessData {
  subject: string;
  classAvg: number;
  gradeAvg: number;
  gap: string;
  isWeak: boolean;
}

interface ClassWeaknessAnalysisProps {
  className?: string;
  mockData?: WeaknessData[];
}

const ClassWeaknessAnalysis: React.FC<ClassWeaknessAnalysisProps> = ({ 
  className = "高二(1)班",
  mockData
}) => {
  const [weaknessData, setWeaknessData] = useState<WeaknessData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (mockData && mockData.length > 0) {
      setWeaknessData(mockData);
      setIsLoading(false);
      return;
    }

    const fetchWeaknessData = async () => {
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
          setWeaknessData([]);
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
          setWeaknessData([]);
          return;
        }
        
        const studentIds = studentData.map(s => s.id);
        
        // 获取班级科目成绩
        const { data: classGrades, error: classGradeError } = await supabase
          .from('grades')
          .select('subject, score')
          .in('student_id', studentIds);
        
        if (classGradeError) throw classGradeError;
        
        // 获取所有年级成绩
        const { data: gradeScores, error: gradeError } = await supabase
          .from('grades')
          .select('subject, score');
        
        if (gradeError) throw gradeError;
        
        // 计算班级科目平均分
        const classSubjectAverages: Record<string, number> = {};
        const classSubjectCounts: Record<string, number> = {};
        
        classGrades?.forEach(item => {
          if (!classSubjectAverages[item.subject]) {
            classSubjectAverages[item.subject] = 0;
            classSubjectCounts[item.subject] = 0;
          }
          classSubjectAverages[item.subject] += item.score;
          classSubjectCounts[item.subject]++;
        });
        
        Object.keys(classSubjectAverages).forEach(subject => {
          if (classSubjectCounts[subject] > 0) {
            classSubjectAverages[subject] = parseFloat(
              (classSubjectAverages[subject] / classSubjectCounts[subject]).toFixed(1)
            );
          }
        });
        
        // 计算年级科目平均分
        const gradeSubjectAverages: Record<string, number> = {};
        const gradeSubjectCounts: Record<string, number> = {};
        
        gradeScores?.forEach(item => {
          if (!gradeSubjectAverages[item.subject]) {
            gradeSubjectAverages[item.subject] = 0;
            gradeSubjectCounts[item.subject] = 0;
          }
          gradeSubjectAverages[item.subject] += item.score;
          gradeSubjectCounts[item.subject]++;
        });
        
        Object.keys(gradeSubjectAverages).forEach(subject => {
          if (gradeSubjectCounts[subject] > 0) {
            gradeSubjectAverages[subject] = parseFloat(
              (gradeSubjectAverages[subject] / gradeSubjectCounts[subject]).toFixed(1)
            );
          }
        });
        
        // 计算班级与年级差距
        const weaknessResults: WeaknessData[] = [];
        
        Object.keys(classSubjectAverages).forEach(subject => {
          if (gradeSubjectAverages[subject]) {
            const classAvg = classSubjectAverages[subject];
            const gradeAvg = gradeSubjectAverages[subject];
            const diff = classAvg - gradeAvg;
            const gapPercentage = ((diff / gradeAvg) * 100).toFixed(1);
            
            // 如果班级平均分比年级平均分低2分以上，就认为是弱项
            const isWeak = diff < -2;
            
            weaknessResults.push({
              subject,
              classAvg,
              gradeAvg,
              gap: gapPercentage,
              isWeak
            });
          }
        });
        
        // 筛选出弱项科目并排序
        const weakSubjects = weaknessResults
          .filter(item => item.isWeak)
          .sort((a, b) => a.classAvg - b.classAvg);
        
        setWeaknessData(weakSubjects.length > 0 ? weakSubjects : weaknessResults);
      } catch (error) {
        console.error("获取班级弱项数据失败:", error);
        setWeaknessData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch if no mockData
    if (!mockData) {
    fetchWeaknessData();
    }
  }, [className, mockData]);
  
  // 过滤出弱项科目
  const weakSubjects = weaknessData.filter(item => item.isWeak);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          学科弱项分析
        </CardTitle>
        <CardDescription>
          {className}需要重点关注的学科
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : (
          <>
            <div className="h-[250px]">
              <ChartContainer config={{
                classAvg: { color: "#ff8042" },
                gradeAvg: { color: "#8884d8" }
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weakSubjects.length > 0 ? weakSubjects : weaknessData.length > 0 ? weaknessData : [{subject: "暂无数据", classAvg: 80, gradeAvg: 80, gap: "0", isWeak: false}]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[60, 100]} />
                    <Tooltip 
                      formatter={(value, name) => {
                        return [`${value} 分`, name === "classAvg" ? "班级平均分" : "年级平均分"];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="gradeAvg" name="年级平均分" fill="#8884d8" />
                    <Bar dataKey="classAvg" name="班级平均分" fill="#ff8042" />
                    <ReferenceLine y={80} stroke="#B9FF66" strokeDasharray="3 3" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            
            {weakSubjects.length > 0 ? (
              <div className="mt-4 bg-orange-50 p-4 rounded-md border border-orange-200">
                <h3 className="flex items-center gap-2 font-medium text-sm text-orange-700 mb-2">
                  <Lightbulb className="h-4 w-4" />
                  改进建议
                </h3>
                <ul className="space-y-2 text-sm text-orange-700">
                  {weakSubjects.map((subject, index) => (
                    <li key={index}>
                      <span className="font-medium">{subject.subject}：</span>
                      比年级平均水平低 {Math.abs(parseFloat(subject.gap))}%，建议增加课时，加强基础训练，
                      {index % 2 === 0 ? "组织小组讨论巩固难点知识点。" : "针对性补充习题，关注解题方法。"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : weaknessData.length > 0 ? (
              <div className="mt-4 bg-green-50 p-4 rounded-md border border-green-200">
                <p className="text-sm text-green-700">
                  恭喜！该班级各学科均表现良好，没有明显的弱项学科。
                </p>
              </div>
            ) : (
              <div className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-700">
                  暂无足够数据进行班级弱项分析。
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          生成详细分析报告
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClassWeaknessAnalysis;
