
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lightbulb } from "lucide-react";

// 模拟班级学科弱项数据
const generateWeaknessData = () => {
  const subjects = ["语文", "数学", "英语", "物理", "化学", "生物"];
  const gradeAvgs = [83, 81, 79, 78, 80, 82];
  
  return subjects.map((subject, index) => {
    // 班级平均分与年级平均分的差距
    const diff = (Math.random() * 10) - 5;
    const classAvg = gradeAvgs[index] + diff;
    
    // 计算差距百分比
    const gapPercentage = ((diff / gradeAvgs[index]) * 100).toFixed(1);
    
    return {
      subject,
      classAvg: classAvg.toFixed(1),
      gradeAvg: gradeAvgs[index],
      gap: gapPercentage,
      isWeak: diff < -2  // 如果班级平均分比年级平均分低2分以上，就认为是弱项
    };
  });
};

const mockWeaknessData = generateWeaknessData();
// 过滤出弱项科目
const weakSubjects = mockWeaknessData.filter(item => item.isWeak);

interface ClassWeaknessAnalysisProps {
  className?: string;
}

const ClassWeaknessAnalysis: React.FC<ClassWeaknessAnalysisProps> = ({ 
  className = "高二(1)班" 
}) => {
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
        <div className="h-[250px]">
          <ChartContainer config={{
            classAvg: { color: "#ff8042" },
            gradeAvg: { color: "#8884d8" }
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weakSubjects.length > 0 ? weakSubjects : [{subject: "暂无弱项", classAvg: 80, gradeAvg: 80, gap: "0", isWeak: false}]}
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
        ) : (
          <div className="mt-4 bg-green-50 p-4 rounded-md border border-green-200">
            <p className="text-sm text-green-700">
              恭喜！该班级各学科均表现良好，没有明显的弱项学科。
            </p>
          </div>
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
