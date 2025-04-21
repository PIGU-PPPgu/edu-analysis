
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Navbar from "../components/analysis/Navbar";
import IntelligentFileParser from "../components/analysis/IntelligentFileParser";
import AIConnector from "../components/analysis/AIConnector";
import StatisticsOverview from "../components/analysis/StatisticsOverview";
import ScoreDistribution from "../components/analysis/ScoreDistribution";
import SubjectAverages from "../components/analysis/SubjectAverages";
import StudentList from "../components/analysis/StudentList";
import GradeTable from "../components/analysis/GradeTable";

interface GradeData {
  studentId: string;
  name: string;
  score: number;
  subject: string;
  examDate?: string;
  examType?: string;
  className?: string;
}

const GradeAnalysis: React.FC = () => {
  const { toast: uiToast } = useToast();
  const [gradeData, setGradeData] = useState<GradeData[]>([]);
  const [isDataUploaded, setIsDataUploaded] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const handleDataParsed = (data: any[]) => {
    const parsedData: GradeData[] = data.map(item => ({
      studentId: item.学号 || item.studentId,
      name: item.姓名 || item.name,
      score: item.分数 || item.score,
      subject: item.科目 || item.subject,
      examDate: item.考试日期 || item.examDate,
      examType: item.考试类型 || item.examType,
      className: item.班级 || item.className
    }));

    setGradeData(parsedData);
    setIsDataUploaded(true);
    setFileInputKey(Date.now());
  };

  const calculateStats = () => {
    if (gradeData.length === 0) return { avg: 0, max: 0, min: 0, passing: 0 };
    
    const scores = gradeData.map(d => d.score);
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passing = scores.filter(score => score >= 60).length;
    
    return { avg, max, min, passing };
  };

  const getScoreDistribution = () => {
    const distribution = [
      { range: '0-59', count: 0, color: '#FF5252' },
      { range: '60-69', count: 0, color: '#FFB74D' },
      { range: '70-79', count: 0, color: '#FFEB3B' },
      { range: '80-89', count: 0, color: '#66BB6A' },
      { range: '90-100', count: 0, color: '#42A5F5' }
    ];

    gradeData.forEach(item => {
      const score = item.score;
      if (score < 60) distribution[0].count++;
      else if (score < 70) distribution[1].count++;
      else if (score < 80) distribution[2].count++;
      else if (score < 90) distribution[3].count++;
      else distribution[4].count++;
    });

    return distribution;
  };

  const getSubjectAverages = () => {
    const subjectMap = new Map<string, { total: number, count: number }>();
    
    gradeData.forEach(item => {
      const subject = item.subject;
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { total: 0, count: 0 });
      }
      const current = subjectMap.get(subject)!;
      current.total += item.score;
      current.count += 1;
    });
    
    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      average: data.total / data.count
    }));
  };

  const getStudentList = () => {
    const uniqueStudents = new Map<string, GradeData>();
    const studentScores = new Map<string, number[]>();
    
    gradeData.forEach(item => {
      if (!uniqueStudents.has(item.studentId)) {
        uniqueStudents.set(item.studentId, item);
      }
      if (!studentScores.has(item.studentId)) {
        studentScores.set(item.studentId, []);
      }
      studentScores.get(item.studentId)?.push(item.score);
    });
    
    return Array.from(uniqueStudents.values()).map(student => ({
      ...student,
      averageScore: studentScores.get(student.studentId)?.reduce((a, b) => a + b, 0) || 0 / 
                    (studentScores.get(student.studentId)?.length || 1)
    }));
  };

  const handleAIConnect = (apiKey: string, provider: string, enabled: boolean) => {
    setIsAIEnabled(enabled);
    console.log(`AI已连接，使用${provider}，API密钥: ${apiKey.substring(0, 3)}...`);
    uiToast({
      title: "AI服务已连接",
      description: `成功连接到${provider}服务`,
    });
  };

  const stats = calculateStats();

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">成绩智能分析平台</h1>
            <div className="flex gap-4">
              {isDataUploaded && (
                <Button 
                  className="bg-[#191A23] text-white hover:bg-[#2d2e3d]"
                  onClick={() => {
                    uiToast({
                      title: "数据已导出",
                      description: "分析报告已成功导出为PDF格式",
                    });
                  }}
                >
                  导出分析报告
                </Button>
              )}
            </div>
          </div>

          {!isDataUploaded ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <IntelligentFileParser onDataParsed={handleDataParsed} />
              </div>
              <div>
                <AIConnector onConnect={handleAIConnect} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="distributions">分数分布</TabsTrigger>
                    <TabsTrigger value="subjects">科目分析</TabsTrigger>
                    <TabsTrigger value="students">学生列表</TabsTrigger>
                    <TabsTrigger value="data">原始数据</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview">
                    <StatisticsOverview 
                      avg={stats.avg}
                      max={stats.max}
                      min={stats.min}
                      passing={stats.passing}
                      total={gradeData.length}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ScoreDistribution data={getScoreDistribution()} />
                      <SubjectAverages data={getSubjectAverages()} />
                    </div>
                  </TabsContent>

                  <TabsContent value="distributions">
                    <ScoreDistribution data={getScoreDistribution()} />
                  </TabsContent>

                  <TabsContent value="subjects">
                    <SubjectAverages data={getSubjectAverages()} />
                  </TabsContent>
                  
                  <TabsContent value="students">
                    <StudentList students={getStudentList()} />
                  </TabsContent>

                  <TabsContent value="data">
                    <GradeTable data={gradeData} />
                  </TabsContent>
                </Tabs>
              </div>
              
              <div>
                <AIConnector onConnect={handleAIConnect} />
                
                <div className="mt-6">
                  <div className="space-y-4">
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        if (!isAIEnabled) {
                          uiToast({
                            title: "AI未启用",
                            description: "请先连接AI服务以使用智能分析功能",
                          });
                          return;
                        }
                        toast("分析已启动", { 
                          description: "正在生成全面分析报告，请稍候..." 
                        });
                      }}
                    >
                      生成整体分析报告
                    </Button>
                    
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        if (!isAIEnabled) {
                          uiToast({
                            title: "AI未启用",
                            description: "请先连接AI服务以使用智能分析功能",
                          });
                          return;
                        }
                        toast("已启动分析", { 
                          description: "正在为每位学生生成个性化学习方案..." 
                        });
                      }}
                    >
                      生成学生学习方案
                    </Button>
                    
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        if (!isAIEnabled) {
                          uiToast({
                            title: "AI未启用",
                            description: "请先连接AI服务以使用智能分析功能",
                          });
                          return;
                        }
                        toast("已启动分析", { 
                          description: "正在分析学生学习状况，生成教学建议..." 
                        });
                      }}
                    >
                      生成教学建议
                    </Button>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">重新导入数据</h4>
                    <label className="w-full">
                      <Button variant="outline" className="w-full">
                        选择文件
                      </Button>
                      <Input
                        type="file"
                        key={fileInputKey}
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsDataUploaded(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradeAnalysis;

