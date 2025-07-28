/**
 *  AI个性化学习建议组件
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Lightbulb,
  Target,
  BookOpen,
  Clock,
  Star,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
} from "lucide-react";

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  exam_date?: string;
  exam_title?: string;
}

interface PersonalizedRecommendationProps {
  gradeData: GradeRecord[];
  className?: string;
}

interface StudentRecommendation {
  studentId: string;
  studentName: string;
  className: string;
  overallScore: number;
  recommendations: {
    category: "urgent" | "improvement" | "maintenance" | "enhancement";
    priority: number;
    subject?: string;
    title: string;
    description: string;
    actionItems: string[];
    expectedOutcome: string;
    timeframe: string;
  }[];
  strengths: string[];
  challenges: string[];
  learningStyle: "visual" | "auditory" | "kinesthetic" | "mixed";
  motivationLevel: "low" | "medium" | "high";
}

const AIPersonalizedRecommendations: React.FC<
  PersonalizedRecommendationProps
> = ({ gradeData, className = "" }) => {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);

  // 获取学生列表
  const students = useMemo(() => {
    const studentMap = new Map();
    gradeData.forEach((record) => {
      if (!studentMap.has(record.student_id)) {
        studentMap.set(record.student_id, {
          id: record.student_id,
          name: record.name,
          className: record.class_name || "未知班级",
        });
      }
    });
    return Array.from(studentMap.values());
  }, [gradeData]);

  // AI生成个性化建议
  const generateRecommendations = useMemo((): StudentRecommendation[] => {
    if (!gradeData || gradeData.length === 0) return [];

    const studentGroups = gradeData.reduce(
      (acc, record) => {
        const key = record.student_id;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(record);
        return acc;
      },
      {} as Record<string, GradeRecord[]>
    );

    return Object.entries(studentGroups).map(([studentId, records]) => {
      const student = records[0];
      const scores = records
        .map((r) => r.score || r.total_score || 0)
        .filter((s) => s > 0);
      const overallScore =
        scores.length > 0
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length
          : 0;

      // 分析各科目成绩
      const subjectPerformance = records.reduce(
        (acc, record) => {
          if (!record.subject || !record.score) return acc;
          if (!acc[record.subject]) {
            acc[record.subject] = [];
          }
          acc[record.subject].push(record.score);
          return acc;
        },
        {} as Record<string, number[]>
      );

      const subjectAverages = Object.entries(subjectPerformance)
        .map(([subject, scores]) => ({
          subject,
          average: scores.reduce((sum, s) => sum + s, 0) / scores.length,
          count: scores.length,
        }))
        .sort((a, b) => b.average - a.average);

      // 生成建议
      const recommendations = [];
      const strengths = [];
      const challenges = [];

      // 分析优势和劣势
      if (subjectAverages.length > 0) {
        const topSubjects = subjectAverages.slice(
          0,
          Math.ceil(subjectAverages.length / 2)
        );
        const weakSubjects = subjectAverages.slice(
          -Math.ceil(subjectAverages.length / 2)
        );

        topSubjects.forEach((subject) => {
          if (subject.average >= 85) {
            strengths.push(subject.subject);
          }
        });

        weakSubjects.forEach((subject) => {
          if (subject.average < 70) {
            challenges.push(subject.subject);
            recommendations.push({
              category: subject.average < 60 ? "urgent" : "improvement",
              priority: subject.average < 60 ? 1 : 2,
              subject: subject.subject,
              title: `${subject.subject}成绩提升计划`,
              description: `当前${subject.subject}平均分为${subject.average.toFixed(1)}分，需要重点关注`,
              actionItems: [
                "制定专项学习计划，每日练习30分钟",
                "寻找薄弱知识点，进行针对性复习",
                "增加课堂互动，及时解决疑问",
                "定期进行阶段性测试评估",
              ],
              expectedOutcome: `预期提升${(75 - subject.average).toFixed(0)}分，达到良好水平`,
              timeframe: subject.average < 60 ? "2-4周" : "4-8周",
            });
          }
        });
      }

      // 基于整体成绩的建议
      if (overallScore >= 90) {
        recommendations.push({
          category: "enhancement",
          priority: 3,
          title: "优秀生拓展提升计划",
          description: "成绩优异，建议进行深度学习和拓展",
          actionItems: [
            "参与学科竞赛或拓展活动",
            "进行跨学科学习探索",
            "担任学习小组组长，帮助其他同学",
            "提前预习更高难度内容",
          ],
          expectedOutcome: "保持优势，发展特长，培养领导力",
          timeframe: "持续进行",
        });
      } else if (overallScore >= 75) {
        recommendations.push({
          category: "maintenance",
          priority: 2,
          title: "稳定提升学习策略",
          description: "成绩良好，需要保持稳定并寻求突破",
          actionItems: [
            "总结有效的学习方法",
            "加强薄弱环节的练习",
            "建立错题本，定期复习",
            "参与小组学习，互相促进",
          ],
          expectedOutcome: "稳定在良好水平，争取向优秀迈进",
          timeframe: "6-10周",
        });
      } else if (overallScore >= 60) {
        recommendations.push({
          category: "improvement",
          priority: 2,
          title: "基础巩固提升计划",
          description: "成绩合格，需要系统性提升",
          actionItems: [
            "重新梳理基础知识框架",
            "制定详细的学习时间表",
            "寻求老师或同学的学习指导",
            "增加课后练习量",
          ],
          expectedOutcome: "全面提升基础，向良好水平发展",
          timeframe: "8-12周",
        });
      } else {
        recommendations.push({
          category: "urgent",
          priority: 1,
          title: "紧急学习干预计划",
          description: "成绩需要紧急关注和全面提升",
          actionItems: [
            "立即制定个性化学习计划",
            "安排一对一辅导",
            "每日学习情况跟踪",
            "家校密切配合监督",
          ],
          expectedOutcome: "快速提升至合格水平",
          timeframe: "4-6周",
        });
      }

      // 模拟学习风格和动机水平分析
      const learningStyles: Array<
        "visual" | "auditory" | "kinesthetic" | "mixed"
      > = ["visual", "auditory", "kinesthetic", "mixed"];
      const motivationLevels: Array<"low" | "medium" | "high"> = [
        "low",
        "medium",
        "high",
      ];

      const learningStyle =
        learningStyles[Math.floor(Math.random() * learningStyles.length)];
      const motivationLevel =
        overallScore >= 80 ? "high" : overallScore >= 65 ? "medium" : "low";

      return {
        studentId,
        studentName: student.name,
        className: student.class_name || "未知班级",
        overallScore,
        recommendations: recommendations.sort(
          (a, b) => a.priority - b.priority
        ),
        strengths: strengths.length > 0 ? strengths : ["学习态度端正"],
        challenges: challenges.length > 0 ? challenges : ["需要保持当前水平"],
        learningStyle,
        motivationLevel,
      };
    });
  }, [gradeData]);

  const selectedStudentData = useMemo(() => {
    return generateRecommendations.find((s) => s.studentId === selectedStudent);
  }, [generateRecommendations, selectedStudent]);

  const generateAIRecommendations = async () => {
    setIsGenerating(true);
    // 模拟AI生成过程
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsGenerating(false);
    setGenerationComplete(true);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "urgent":
        return "bg-[#FF6B6B]/20 border-[#FF6B6B]";
      case "improvement":
        return "bg-[#F7931E]/20 border-[#F7931E]";
      case "maintenance":
        return "bg-[#B9FF66]/20 border-[#B9FF66]";
      case "enhancement":
        return "bg-[#9C88FF]/20 border-[#9C88FF]";
      default:
        return "bg-[#F3F3F3] border-[#191A23]";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "urgent":
        return <Target className="w-4 h-4 text-[#FF6B6B]" />;
      case "improvement":
        return <TrendingUp className="w-4 h-4 text-[#F7931E]" />;
      case "maintenance":
        return <CheckCircle className="w-4 h-4 text-[#B9FF66]" />;
      case "enhancement":
        return <Star className="w-4 h-4 text-[#9C88FF]" />;
      default:
        return <Lightbulb className="w-4 h-4 text-[#191A23]" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/*  AI建议生成控制面板 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
                学生AI个性化建议
              </span>
            </div>
            <Button
              onClick={generateAIRecommendations}
              disabled={isGenerating}
              className="border-2 border-black bg-[#191A23] hover:bg-[#2A2B35] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  生成中...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  生成AI建议
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Users className="w-5 h-5 text-[#191A23]" />
            <p className="text-[#191A23] font-medium">
              为{" "}
              <span className="font-bold text-[#B9FF66] bg-[#191A23] px-2 py-1 rounded">
                {students.length}
              </span>{" "}
              名学生 生成个性化学习建议和发展计划
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 学生选择和建议展示 */}
      {(isGenerating || generationComplete) && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
            <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI建议结果
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isGenerating ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-[#B9FF66] border-r-transparent mb-6"></div>
                <p className="text-xl font-black text-[#191A23] uppercase tracking-wide mb-2">
                  {" "}
                  AI智能生成中
                </p>
                <p className="text-[#191A23]/70 font-medium">
                  正在为每位学生量身定制个性化学习建议...
                </p>
                <div className="mt-6 w-64 bg-[#F3F3F3] rounded-full h-3 mx-auto border-2 border-black">
                  <div
                    className="bg-[#B9FF66] h-full rounded-full transition-all duration-1000 animate-pulse"
                    style={{ width: "85%" }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Alert className="border-2 border-[#B9FF66] bg-[#B9FF66]/10">
                  <CheckCircle className="h-4 w-4 text-[#B9FF66]" />
                  <AlertDescription className="font-medium text-[#191A23]">
                    AI建议生成完成！为{" "}
                    <span className="font-bold">
                      {generateRecommendations.length}
                    </span>{" "}
                    名学生制定了个性化方案
                  </AlertDescription>
                </Alert>

                <div className="flex items-center gap-4">
                  <label className="font-bold text-[#191A23]">
                    选择学生查看详细建议:
                  </label>
                  <Select
                    value={selectedStudent}
                    onValueChange={setSelectedStudent}
                  >
                    <SelectTrigger className="w-[200px] bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                      <SelectValue placeholder=" 选择学生" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                      {generateRecommendations.map((student) => (
                        <SelectItem
                          key={student.studentId}
                          value={student.studentId}
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#191A23]" />
                            <span className="font-medium">
                              {student.studentName}
                            </span>
                            <Badge className="bg-[#B9FF66] text-[#191A23] border border-black text-xs font-bold">
                              {student.className}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStudentData && (
                  <div className="space-y-6">
                    {/* 学生概览 */}
                    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] bg-[#B9FF66]/10">
                      <CardHeader className="border-b-2 border-black">
                        <CardTitle className="flex items-center justify-between">
                          <span className="font-black text-[#191A23]">
                            {" "}
                            {selectedStudentData.studentName}
                          </span>
                          <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold text-lg px-4 py-2">
                            平均分:{" "}
                            {selectedStudentData.overallScore.toFixed(1)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-bold text-[#191A23] mb-2">
                              {" "}
                              学习优势
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {selectedStudentData.strengths.map(
                                (strength, idx) => (
                                  <Badge
                                    key={idx}
                                    className="bg-[#B9FF66] text-[#191A23] border border-black font-medium"
                                  >
                                    {strength}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-bold text-[#191A23] mb-2">
                              {" "}
                              需要改进
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {selectedStudentData.challenges.map(
                                (challenge, idx) => (
                                  <Badge
                                    key={idx}
                                    className="bg-[#F7931E] text-white border border-black font-medium"
                                  >
                                    {challenge}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-bold text-[#191A23] mb-2">
                              {" "}
                              学习特征
                            </h4>
                            <div className="space-y-1">
                              <Badge className="bg-[#9C88FF] text-white border border-black font-medium w-full">
                                学习风格:{" "}
                                {selectedStudentData.learningStyle === "visual"
                                  ? "视觉型"
                                  : selectedStudentData.learningStyle ===
                                      "auditory"
                                    ? "听觉型"
                                    : selectedStudentData.learningStyle ===
                                        "kinesthetic"
                                      ? "动手型"
                                      : "混合型"}
                              </Badge>
                              <Badge className="bg-[#191A23] text-white border border-black font-medium w-full">
                                动机水平:{" "}
                                {selectedStudentData.motivationLevel === "high"
                                  ? "高"
                                  : selectedStudentData.motivationLevel ===
                                      "medium"
                                    ? "中"
                                    : "低"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI建议列表 */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-black text-[#191A23] uppercase tracking-wide">
                        {" "}
                        AI个性化建议
                      </h3>
                      {selectedStudentData.recommendations.map((rec, index) => (
                        <Card
                          key={index}
                          className={`border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] ${getCategoryColor(rec.category)}`}
                        >
                          <CardHeader className="border-b-2 border-black">
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getCategoryIcon(rec.category)}
                                <span className="font-black text-[#191A23]">
                                  {rec.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-[#191A23] text-white border border-black font-bold">
                                  优先级 {rec.priority}
                                </Badge>
                                {rec.subject && (
                                  <Badge className="bg-[#B9FF66] text-[#191A23] border border-black font-bold">
                                    {rec.subject}
                                  </Badge>
                                )}
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="space-y-4">
                              <p className="text-[#191A23] font-medium">
                                {rec.description}
                              </p>

                              <div>
                                <h4 className="font-bold text-[#191A23] mb-2 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" />
                                  具体行动计划
                                </h4>
                                <ul className="space-y-1">
                                  {rec.actionItems.map((item, idx) => (
                                    <li
                                      key={idx}
                                      className="flex items-start gap-2 text-[#191A23]/80"
                                    >
                                      <span className="font-bold text-[#B9FF66]">
                                        •
                                      </span>
                                      <span className="font-medium">
                                        {item}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-bold text-[#191A23] mb-1 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    预期效果
                                  </h4>
                                  <p className="text-[#191A23]/80 font-medium">
                                    {rec.expectedOutcome}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-bold text-[#191A23] mb-1 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    建议周期
                                  </h4>
                                  <p className="text-[#191A23]/80 font-medium">
                                    {rec.timeframe}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIPersonalizedRecommendations;
