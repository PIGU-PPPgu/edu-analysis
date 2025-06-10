import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarDays, TrendingUp, Users } from 'lucide-react';

interface ExamData {
  id: string;
  name: string;
  date: string;
  score?: number;
  classAvg?: number;
  gradeAvg?: number;
}

interface ExamComparisonProps {
  mockExamList: ExamData[];
  initialSelectedExams: string[];
  mockDisplayScores: ExamData[];
}

const ExamComparison: React.FC<ExamComparisonProps> = ({
  mockExamList,
  initialSelectedExams,
  mockDisplayScores
}) => {
  const [selectedExams, setSelectedExams] = useState<string[]>(initialSelectedExams);

  const handleExamToggle = (examId: string) => {
    setSelectedExams(prev => 
      prev.includes(examId)
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  // 准备图表数据
  const chartData = mockDisplayScores.filter(exam => selectedExams.includes(exam.id));

  // 如果没有数据，显示占位符
  if (mockExamList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <CalendarDays className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-lg font-medium">暂无考试数据</p>
        <p className="text-sm text-gray-400 mt-1">请先添加考试记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 考试选择器 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          选择考试进行对比
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {mockExamList.map((exam) => (
            <div key={exam.id} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50">
              <Checkbox
                id={exam.id}
                checked={selectedExams.includes(exam.id)}
                onCheckedChange={() => handleExamToggle(exam.id)}
              />
              <label htmlFor={exam.id} className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{exam.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {exam.date}
                  </Badge>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 图表显示 */}
      {selectedExams.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" />
                考试成绩对比
              </h4>
              <div className="flex flex-wrap gap-2">
                {chartData.map((exam) => (
                  <Badge key={exam.id} variant="secondary" className="text-xs">
                    {exam.name}: {exam.score?.toFixed(1) || 'N/A'}分
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      `${value?.toFixed(1) || 'N/A'}分`, 
                      name === 'score' ? '班级平均分' : 
                      name === 'classAvg' ? '班级平均' : 
                      name === 'gradeAvg' ? '年级平均' : name
                    ]}
                    labelFormatter={(label) => `考试: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="score" fill="#3B82F6" name="班级平均分" />
                  {chartData.some(d => d.classAvg !== undefined) && (
                    <Bar dataKey="classAvg" fill="#10B981" name="班级平均" />
                  )}
                  {chartData.some(d => d.gradeAvg !== undefined) && (
                    <Bar dataKey="gradeAvg" fill="#F59E0B" name="年级平均" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <Users className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm font-medium">请选择要对比的考试</p>
          <p className="text-xs text-gray-400">勾选上方的考试进行对比分析</p>
        </div>
      )}
    </div>
  );
};

export default ExamComparison; 