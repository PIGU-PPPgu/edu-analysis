import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle,
  History,
  LineChart
} from "lucide-react";
import { gradeAnalysisService } from "@/services/gradeAnalysisService";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface StudentProgressViewProps {
  studentId: string;
  studentName?: string;
}

export const StudentProgressView: React.FC<StudentProgressViewProps> = ({ 
  studentId,
  studentName = "未知学生"
}) => {
  const [progressData, setProgressData] = useState<any>(null);
  const [examList, setExamList] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("totalScore");
  const [subjectList, setSubjectList] = useState<string[]>(["totalScore"]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 获取学生进步情况数据
  useEffect(() => {
    if (!studentId) return;
    
    const fetchStudentProgress = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await gradeAnalysisService.getStudentProgress(studentId);
        
        if (error) throw error;
        
        if (data) {
          setProgressData(data.progressData || {});
          setExamList(data.exams || []);
          
          // 设置科目列表
          const subjects = ["totalScore", ...Object.keys(data.progressData || {}).filter(key => key !== "totalScore")];
          setSubjectList(subjects);
        }
      } catch (error) {
        console.error("获取学生进步情况失败:", error);
        toast.error("获取进步数据失败");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudentProgress();
  }, [studentId]);
  
  // 当前选择的学科的进步数据
  const currentSubjectProgress = progressData?.[selectedSubject] || null;
  
  // 格式化数据，用于展示
  const formatSubjectName = (subject: string) => {
    if (subject === "totalScore") return "总分";
    return subject.charAt(0).toUpperCase() + subject.slice(1);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="ml-3 text-gray-600">正在加载进步数据...</p>
      </div>
    );
  }
  
  if (!progressData || Object.keys(progressData).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-500">
        <AlertTriangle className="h-12 w-12 mb-3 text-gray-400" />
        <p>暂无学生历史成绩数据</p>
        <p className="text-sm mt-1">至少需要两次考试数据才能分析进步情况</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* 学生信息卡片 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-500" />
            {studentName} - 成绩进步分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Avatar className="h-12 w-12 mr-3">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {studentName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{studentName}</p>
                <p className="text-sm text-gray-500">学号: {studentId}</p>
              </div>
            </div>
            
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="选择科目" />
              </SelectTrigger>
              <SelectContent>
                {subjectList.map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {formatSubjectName(subject)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {currentSubjectProgress ? (
            <>
              {/* 进步情况概览 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-500">最近成绩</p>
                      <p className="text-2xl font-bold">{currentSubjectProgress.current.toFixed(1)}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-500">上次成绩</p>
                      <p className="text-2xl font-bold">{currentSubjectProgress.previous.toFixed(1)}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center flex flex-col items-center">
                      <p className="text-sm font-medium text-gray-500">成绩变化</p>
                      <div className="flex items-center mt-1">
                        {currentSubjectProgress.difference >= 0 ? (
                          <>
                            <TrendingUp className="h-5 w-5 text-green-500 mr-1" />
                            <p className="text-2xl font-bold text-green-500">
                              +{currentSubjectProgress.difference.toFixed(1)}
                            </p>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-5 w-5 text-red-500 mr-1" />
                            <p className="text-2xl font-bold text-red-500">
                              {currentSubjectProgress.difference.toFixed(1)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* 进步幅度 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3">进步幅度</h3>
                <div className="flex items-center">
                  <div className="flex-1 mr-4">
                    <Progress 
                      value={Math.abs(currentSubjectProgress.percentChange)}
                      className={`h-3 ${
                        currentSubjectProgress.percentChange >= 0 
                          ? "bg-green-100" 
                          : "bg-red-100"
                      }`}
                    />
                  </div>
                  <Badge 
                    className={
                      currentSubjectProgress.percentChange >= 0 
                        ? "bg-green-500" 
                        : "bg-red-500"
                    }
                  >
                    {currentSubjectProgress.percentChange >= 0 ? "+" : ""}
                    {currentSubjectProgress.percentChange.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              
              {/* 历史成绩趋势 */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                  <History className="h-4 w-4" />
                  历史成绩趋势
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>考试</TableHead>
                      <TableHead>日期</TableHead>
                      <TableHead className="text-right">成绩</TableHead>
                      <TableHead className="text-right">变化</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentSubjectProgress.trend.map((item: any, index: number) => {
                      const prevScore = index < currentSubjectProgress.trend.length - 1 
                        ? currentSubjectProgress.trend[index + 1].score
                        : null;
                      const scoreDiff = prevScore !== null 
                        ? item.score - prevScore 
                        : null;
                      
                      return (
                        <TableRow key={item.examId || index}>
                          <TableCell className="font-medium">{item.examTitle}</TableCell>
                          <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold">{item.score.toFixed(1)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {scoreDiff !== null ? (
                              <span className={
                                scoreDiff > 0 
                                  ? "text-green-600 flex items-center justify-end" 
                                  : scoreDiff < 0 
                                  ? "text-red-500 flex items-center justify-end" 
                                  : "text-gray-500 flex items-center justify-end"
                              }>
                                {scoreDiff > 0 ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : scoreDiff < 0 ? (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                ) : null}
                                {scoreDiff > 0 ? "+" : ""}
                                {scoreDiff.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>暂无{formatSubjectName(selectedSubject)}科目进步数据</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 进步分析卡片 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <LineChart className="h-5 w-5 text-blue-500" />
            进步情况分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 各科目进步情况 */}
            <div>
              <h3 className="text-sm font-medium mb-3">各科目进步情况</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectList.map(subject => {
                  const subjectData = progressData[subject];
                  if (!subjectData) return null;
                  
                  const isPositive = subjectData.difference >= 0;
                  
                  return (
                    <Card key={subject} className={`
                      ${selectedSubject === subject ? "border-blue-200 shadow-md" : ""}
                    `}>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{formatSubjectName(subject)}</p>
                            <div className="flex items-center mt-1">
                              <div className={`flex items-center ${isPositive ? "text-green-500" : "text-red-500"}`}>
                                {isPositive ? (
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 mr-1" />
                                )}
                                <span className="text-lg font-bold">
                                  {isPositive ? "+" : ""}
                                  {subjectData.difference.toFixed(1)}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 ml-2">
                                ({isPositive ? "+" : ""}
                                {subjectData.percentChange.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">当前/上次</div>
                            <div className="font-medium">
                              {subjectData.current.toFixed(1)} / {subjectData.previous.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        {subject !== selectedSubject && (
                          <div className="mt-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full text-blue-500"
                              onClick={() => setSelectedSubject(subject)}
                            >
                              查看详情
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
            
            {/* 分析总结卡片 */}
            {currentSubjectProgress && (
              <div>
                <h3 className="text-sm font-medium mb-2">进步分析</h3>
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <p className="text-gray-700 leading-relaxed">
                      {studentName}在{formatSubjectName(selectedSubject)}科目的表现
                      {currentSubjectProgress.difference > 0 
                        ? "有所提高" 
                        : currentSubjectProgress.difference < 0 
                        ? "有所下降" 
                        : "保持稳定"}，
                      从上次考试的{currentSubjectProgress.previous.toFixed(1)}分
                      {currentSubjectProgress.difference > 0 
                        ? "上升" 
                        : currentSubjectProgress.difference < 0 
                        ? "下降" 
                        : "保持"}
                      至{currentSubjectProgress.current.toFixed(1)}分，
                      {currentSubjectProgress.difference !== 0 
                        ? `幅度为${Math.abs(currentSubjectProgress.percentChange).toFixed(1)}%。` 
                        : "成绩保持稳定。"}
                      
                      {currentSubjectProgress.difference > 5 && "这是一个显著的进步，应当给予肯定和鼓励。"}
                      {currentSubjectProgress.difference > 0 && currentSubjectProgress.difference <= 5 && "这表明有一定进步，但仍有提升空间。"}
                      {currentSubjectProgress.difference === 0 && "建议关注学生学习状态，帮助找到突破点。"}
                      {currentSubjectProgress.difference < 0 && currentSubjectProgress.difference >= -5 && "略有下滑，需要关注学生最近的学习状态。"}
                      {currentSubjectProgress.difference < -5 && "成绩下降明显，建议及时与学生沟通，了解原因并提供针对性帮助。"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 