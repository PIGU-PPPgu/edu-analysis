import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { BarChart, LineChart, Users, Award, AlertTriangle } from "lucide-react";
import { gradeAnalysisService } from "@/services/gradeAnalysisService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ClassAnalysisViewProps {
  classId?: string;
  examId?: string;
  className?: string;
}

export const ClassAnalysisView: React.FC<ClassAnalysisViewProps> = ({ 
  classId,
  examId,
  className = "未知班级"
}) => {
  const { gradeData } = useGradeAnalysis();
  const [classStats, setClassStats] = useState<{
    totalStudents: number;
    averageScore: number;
    passCount: number;
    passRate: number;
    maxScore: number;
    minScore: number;
    excellentCount: number; // 优秀（90分以上）
    goodCount: number; // 良好（80-89分）
    averageCount: number; // 中等（70-79分）
    passOnlyCount: number; // 及格（60-69分）
    failCount: number; // 不及格（60分以下）
  }>({
    totalStudents: 0,
    averageScore: 0,
    passCount: 0,
    passRate: 0,
    maxScore: 0,
    minScore: 0,
    excellentCount: 0,
    goodCount: 0,
    averageCount: 0,
    passOnlyCount: 0,
    failCount: 0
  });
  
  const [studentRankings, setStudentRankings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 获取班级统计数据
  useEffect(() => {
    if (!examId) return;
    
    const calculateClassStats = () => {
      // 过滤出班级数据
      const classData = classId 
        ? gradeData.filter(record => record.className === classId)
        : gradeData;

      if (!classData.length) return;

      // 计算统计数据
      const totalStudents = classData.length;
      const scores = classData.map(student => student.score);
      const validScores = scores.filter(score => !isNaN(Number(score)));
      
      const sum = validScores.reduce((acc, score) => acc + Number(score), 0);
      const averageScore = validScores.length > 0 ? sum / validScores.length : 0;
      
      const passCount = validScores.filter(score => Number(score) >= 60).length;
      const passRate = validScores.length > 0 ? passCount / validScores.length : 0;
      
      const maxScore = validScores.length > 0 ? Math.max(...validScores) : 0;
      const minScore = validScores.length > 0 ? Math.min(...validScores) : 0;
      
      // 各分数段统计
      const excellentCount = validScores.filter(score => Number(score) >= 90).length;
      const goodCount = validScores.filter(score => Number(score) >= 80 && Number(score) < 90).length;
      const averageCount = validScores.filter(score => Number(score) >= 70 && Number(score) < 80).length;
      const passOnlyCount = validScores.filter(score => Number(score) >= 60 && Number(score) < 70).length;
      const failCount = validScores.filter(score => Number(score) < 60).length;

      setClassStats({
        totalStudents,
        averageScore,
        passCount,
        passRate,
        maxScore,
        minScore,
        excellentCount,
        goodCount,
        averageCount,
        passOnlyCount,
        failCount
      });
    };
    
    calculateClassStats();
  }, [gradeData, classId, examId]);
  
  // 获取学生排名
  useEffect(() => {
    const fetchStudentRankings = async () => {
      if (!examId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await gradeAnalysisService.getStudentRanking(examId, classId);
        
        if (error) throw error;
        
        setStudentRankings(data || []);
      } catch (error) {
        console.error("获取学生排名失败:", error);
        toast.error("获取排名数据失败");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudentRankings();
  }, [examId, classId]);

  return (
    <div className="space-y-6">
      {/* 班级成绩概览卡片 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            {className}成绩概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500">学生人数</p>
              <p className="text-2xl font-bold">{classStats.totalStudents}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500">平均分</p>
              <p className="text-2xl font-bold">{classStats.averageScore.toFixed(1)}</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500">及格率</p>
              <p className="text-2xl font-bold">{(classStats.passRate * 100).toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500">最高分</p>
              <p className="text-2xl font-bold">{classStats.maxScore.toFixed(1)}</p>
            </div>
            <div className="text-center p-3 bg-pink-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500">最低分</p>
              <p className="text-2xl font-bold">{classStats.minScore.toFixed(1)}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* 及格率进度条 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">及格率</span>
                <span>{(classStats.passRate * 100).toFixed(1)}%</span>
              </div>
              <Progress value={classStats.passRate * 100} className="h-2" />
            </div>
            
            {/* 分数段分布 */}
            <div className="pt-4">
              <h4 className="text-sm font-medium mb-2">分数段分布</h4>
              <div className="grid grid-cols-5 gap-1">
                <div className="flex flex-col items-center">
                  <div className="h-20 w-full bg-red-100 relative flex items-end">
                    <div 
                      className="bg-red-500 w-full" 
                      style={{ 
                        height: `${classStats.totalStudents ? (classStats.failCount / classStats.totalStudents) * 100 : 0}%` 
                      }}
                    ></div>
                    <span className="absolute bottom-0 left-0 right-0 text-xs text-center pb-1">
                      {classStats.failCount}
                    </span>
                  </div>
                  <span className="text-xs mt-1">不及格</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-20 w-full bg-yellow-100 relative flex items-end">
                    <div 
                      className="bg-yellow-500 w-full" 
                      style={{ 
                        height: `${classStats.totalStudents ? (classStats.passOnlyCount / classStats.totalStudents) * 100 : 0}%` 
                      }}
                    ></div>
                    <span className="absolute bottom-0 left-0 right-0 text-xs text-center pb-1">
                      {classStats.passOnlyCount}
                    </span>
                  </div>
                  <span className="text-xs mt-1">及格</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-20 w-full bg-blue-100 relative flex items-end">
                    <div 
                      className="bg-blue-500 w-full" 
                      style={{ 
                        height: `${classStats.totalStudents ? (classStats.averageCount / classStats.totalStudents) * 100 : 0}%` 
                      }}
                    ></div>
                    <span className="absolute bottom-0 left-0 right-0 text-xs text-center pb-1">
                      {classStats.averageCount}
                    </span>
                  </div>
                  <span className="text-xs mt-1">中等</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-20 w-full bg-green-100 relative flex items-end">
                    <div 
                      className="bg-green-500 w-full" 
                      style={{ 
                        height: `${classStats.totalStudents ? (classStats.goodCount / classStats.totalStudents) * 100 : 0}%` 
                      }}
                    ></div>
                    <span className="absolute bottom-0 left-0 right-0 text-xs text-center pb-1">
                      {classStats.goodCount}
                    </span>
                  </div>
                  <span className="text-xs mt-1">良好</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-20 w-full bg-purple-100 relative flex items-end">
                    <div 
                      className="bg-purple-500 w-full" 
                      style={{ 
                        height: `${classStats.totalStudents ? (classStats.excellentCount / classStats.totalStudents) * 100 : 0}%` 
                      }}
                    ></div>
                    <span className="absolute bottom-0 left-0 right-0 text-xs text-center pb-1">
                      {classStats.excellentCount}
                    </span>
                  </div>
                  <span className="text-xs mt-1">优秀</span>
                </div>
              </div>
              <div className="text-xs text-center text-gray-500 mt-2">
                不及格：&lt;60 | 及格：60-69 | 中等：70-79 | 良好：80-89 | 优秀：≥90
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 学生排名表格 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            班级学生排名
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-purple-500 border-r-transparent"></div>
              <p className="mt-2 text-gray-500">正在加载排名数据...</p>
            </div>
          ) : studentRankings.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">排名</TableHead>
                    <TableHead className="w-1/3">学生</TableHead>
                    <TableHead className="text-right">分数</TableHead>
                    <TableHead className="text-right">百分位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentRankings.map((student, index) => (
                    <TableRow 
                      key={student.id || index}
                      className={index < 3 ? "bg-amber-50" : undefined}
                    >
                      <TableCell className="text-center font-medium">
                        {index < 3 ? (
                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${
                            index === 0 ? "bg-amber-500" : 
                            index === 1 ? "bg-gray-300" : 
                            "bg-amber-800"
                          } text-white text-xs`}>
                            {index + 1}
                          </span>
                        ) : (
                          index + 1
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {(student.name || "").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.student_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${
                          student.total_score >= 90 ? "text-purple-600" :
                          student.total_score >= 80 ? "text-green-600" :
                          student.total_score >= 70 ? "text-blue-600" :
                          student.total_score >= 60 ? "text-amber-600" :
                          "text-red-600"
                        }`}>
                          {student.total_score}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-gray-500">
                          {(100 - student.rankPercentile * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-gray-500 flex flex-col items-center">
              <AlertTriangle className="h-12 w-12 mb-3 text-gray-400" />
              <p>暂无学生排名数据</p>
              {!examId && <p className="text-sm mt-1">请先选择一次考试</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 