"use client";

/**
 * AI分析页面
 * 集成算法洞察、异常检测和AI报告生成
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  RefreshCw,
  Filter,
  Search,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Users,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AIInsightsPanel } from "../ai/AIInsightsPanel";
import { AnomalyDetailView, type AnomalyDetail } from "../ai/AnomalyDetailView";
import { AIReportViewer } from "../reports/AIReportViewer";
import { chatWithModel } from "@/services/aiService";
import { getUserAIConfig } from "@/utils/userAuth";
import type {
  ClassValueAdded,
  TeacherValueAdded,
  StudentValueAdded,
} from "@/types/valueAddedTypes";
import type { AIInsight } from "@/types/aiInsights";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// 异常检测工具函数
const generateAnomalies = (
  classes: ClassValueAdded[],
  teachers: TeacherValueAdded[],
  students: StudentValueAdded[]
): AnomalyDetail[] => {
  const anomalies: AnomalyDetail[] = [];

  // 计算统计数据的辅助函数
  const calculateStats = (values: number[]) => {
    if (values.length === 0) return { mean: 0, std: 1 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    return { mean, std: std || 1 };
  };

  // 检测班级异常
  if (classes.length > 0) {
    const valueAddedRates = classes.map((c) => c.avg_score_value_added_rate);
    const stats = calculateStats(valueAddedRates);

    classes.forEach((classItem) => {
      const zScore =
        (classItem.avg_score_value_added_rate - stats.mean) / stats.std;
      if (Math.abs(zScore) > 2) {
        anomalies.push({
          id: `class-${classItem.class_name}`,
          name: classItem.class_name,
          className: classItem.class_name,
          subject: classItem.subject,
          reason: `增值率${classItem.avg_score_value_added_rate > 0 ? "+" : ""}${(classItem.avg_score_value_added_rate * 100).toFixed(1)}%，${zScore > 0 ? "显著高于" : "显著低于"}平均水平`,
          severity:
            Math.abs(zScore) > 3
              ? "high"
              : Math.abs(zScore) > 2.5
                ? "medium"
                : "low",
          value: classItem.avg_score_value_added_rate,
          standardDeviation: zScore,
          type: "class",
        });
      }
    });
  }

  // 检测教师异常
  if (teachers.length > 0) {
    const valueAddedRates = teachers.map((t) => t.avg_score_value_added_rate);
    const stats = calculateStats(valueAddedRates);

    teachers.forEach((teacher) => {
      const zScore =
        (teacher.avg_score_value_added_rate - stats.mean) / stats.std;
      if (Math.abs(zScore) > 2) {
        anomalies.push({
          id: `teacher-${teacher.teacher_name}`,
          name: teacher.teacher_name,
          subject: teacher.subject,
          reason: `增值率${teacher.avg_score_value_added_rate > 0 ? "+" : ""}${(teacher.avg_score_value_added_rate * 100).toFixed(1)}%，${zScore > 0 ? "显著高于" : "显著低于"}平均水平`,
          severity:
            Math.abs(zScore) > 3
              ? "high"
              : Math.abs(zScore) > 2.5
                ? "medium"
                : "low",
          value: teacher.avg_score_value_added_rate,
          standardDeviation: zScore,
          type: "teacher",
        });
      }
    });
  }

  // 检测学生异常（限制数量）
  if (students.length > 0) {
    const valueAddedRates = students.map((s) => s.avg_score_value_added_rate);
    const stats = calculateStats(valueAddedRates);

    students.slice(0, 200).forEach((student) => {
      const zScore =
        (student.avg_score_value_added_rate - stats.mean) / stats.std;
      if (Math.abs(zScore) > 2.5) {
        // 学生阈值提高到2.5σ
        anomalies.push({
          id: `student-${student.student_name}`,
          name: student.student_name,
          className: student.class_name,
          subject: student.subject,
          reason: `增值率${student.avg_score_value_added_rate > 0 ? "+" : ""}${(student.avg_score_value_added_rate * 100).toFixed(1)}%，${zScore > 0 ? "显著高于" : "显著低于"}平均水平`,
          severity:
            Math.abs(zScore) > 3
              ? "high"
              : Math.abs(zScore) > 2.5
                ? "medium"
                : "low",
          value: student.avg_score_value_added_rate,
          standardDeviation: zScore,
          type: "student",
        });
      }
    });
  }

  return anomalies;
};

export function AIAnalysisPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activityId = searchParams.get("activity_id");

  const [loading, setLoading] = useState(true);
  const [activityName, setActivityName] = useState("");
  const [classData, setClassData] = useState<ClassValueAdded[]>([]);
  const [teacherData, setTeacherData] = useState<TeacherValueAdded[]>([]);
  const [studentData, setStudentData] = useState<StudentValueAdded[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);

  // 筛选状态
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [teacherSubjectFilter, setTeacherSubjectFilter] =
    useState<string>("all"); // 教师排行的科目筛选

  // 获取可用的筛选选项
  const { subjects, classes } = useMemo(() => {
    const subjectSet = new Set<string>();
    const classSet = new Set<string>();

    classData.forEach((c) => {
      if (c.subject) subjectSet.add(c.subject);
      if (c.class_name) classSet.add(c.class_name);
    });
    teacherData.forEach((t) => {
      if (t.subject) subjectSet.add(t.subject);
    });

    return {
      subjects: Array.from(subjectSet).sort(),
      classes: Array.from(classSet).sort(),
    };
  }, [classData, teacherData]);

  // 筛选后的数据
  const filteredClassData = useMemo(() => {
    return classData.filter((c) => {
      if (selectedSubject !== "all" && c.subject !== selectedSubject)
        return false;
      if (selectedClass !== "all" && c.class_name !== selectedClass)
        return false;
      if (
        searchTerm &&
        !c.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    });
  }, [classData, selectedSubject, selectedClass, searchTerm]);

  const filteredTeacherData = useMemo(() => {
    // 如果选择了特定班级，不包含教师数据（因为教师数据没有班级字段）
    if (selectedClass !== "all") {
      console.log("🔍 [筛选] 选择了班级，跳过教师数据");
      return [];
    }

    return teacherData.filter((t) => {
      if (selectedSubject !== "all" && t.subject !== selectedSubject)
        return false;
      if (
        searchTerm &&
        !t.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    });
  }, [teacherData, selectedSubject, selectedClass, searchTerm]);

  const filteredStudentData = useMemo(() => {
    return studentData.filter((s) => {
      if (selectedSubject !== "all" && s.subject !== selectedSubject)
        return false;
      if (selectedClass !== "all" && s.class_name !== selectedClass)
        return false;
      if (
        searchTerm &&
        !s.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    });
  }, [studentData, selectedSubject, selectedClass, searchTerm]);

  // 根据筛选后的数据动态生成异常检测
  const anomalyData = useMemo(() => {
    return generateAnomalies(
      filteredClassData,
      filteredTeacherData,
      filteredStudentData
    );
  }, [filteredClassData, filteredTeacherData, filteredStudentData]);

  useEffect(() => {
    if (activityId) {
      loadData();
    } else {
      toast.error("缺少活动ID");
      navigate("/value-added");
    }
  }, [activityId]);

  const loadData = async () => {
    if (!activityId) return;

    setLoading(true);
    try {
      // 查询活动信息
      const { data: activity } = await supabase
        .from("value_added_activities")
        .select("name")
        .eq("id", activityId)
        .single();

      if (activity) {
        setActivityName(activity.name);
      }

      // 查询增值数据
      const [classResult, teacherResult, studentResult] = await Promise.all([
        supabase
          .from("value_added_cache")
          .select("*")
          .eq("activity_id", activityId)
          .eq("dimension", "class"),

        supabase
          .from("value_added_cache")
          .select("*")
          .eq("activity_id", activityId)
          .eq("dimension", "teacher"),

        supabase
          .from("value_added_cache")
          .select("*")
          .eq("activity_id", activityId)
          .eq("dimension", "student")
          .limit(1000),
      ]);

      console.log("🔍 [AI分析] 原始查询结果:", {
        classResult,
        teacherResult,
        studentResult,
      });

      // 正确提取数据：value_added_cache 的 result 字段包含实际数据
      const classes = (classResult.data || [])
        .map((row) => row.result)
        .filter((d) => d && typeof d === "object") as ClassValueAdded[];
      const teachers = (teacherResult.data || [])
        .map((row) => row.result)
        .filter((d) => d && typeof d === "object") as TeacherValueAdded[];
      const students = (studentResult.data || [])
        .map((row) => row.result)
        .filter((d) => d && typeof d === "object") as StudentValueAdded[];

      console.log("🔍 [AI分析] 提取后的数据:", {
        classes,
        teachers,
        students,
        classCount: classes.length,
        teacherCount: teachers.length,
        studentCount: students.length,
      });

      setClassData(classes);
      setTeacherData(teachers);
      setStudentData(students);
    } catch (error) {
      console.error("加载数据失败:", error);
      toast.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async (
    classes: ClassValueAdded[],
    teachers: TeacherValueAdded[],
    students: StudentValueAdded[],
    activityName: string
  ) => {
    setGeneratingAI(true);
    try {
      // 获取AI配置
      const aiConfig = await getUserAIConfig();
      if (!aiConfig || !aiConfig.enabled) {
        throw new Error("AI未配置或未启用，请前往AI设置页面配置");
      }

      // 分析学生数据，找出优秀学生和需关注学生
      const sortedStudents = [...students].sort(
        (a, b) => b.avg_score_value_added_rate - a.avg_score_value_added_rate
      );
      const topStudents = sortedStudents.slice(0, 15); // 前15名优秀学生
      const bottomStudents = sortedStudents.slice(-15); // 后15名需关注学生

      // 按科目分组分析
      const subjectAnalysis = students.reduce((acc, s) => {
        if (!acc[s.subject]) {
          acc[s.subject] = {
            total: 0,
            avgRate: 0,
            topStudents: [],
            needAttention: [],
          };
        }
        acc[s.subject].total++;
        acc[s.subject].avgRate += s.avg_score_value_added_rate;

        if (s.avg_score_value_added_rate > 0.15) {
          acc[s.subject].topStudents.push(s);
        } else if (s.avg_score_value_added_rate < -0.1) {
          acc[s.subject].needAttention.push(s);
        }
        return acc;
      }, {} as any);

      // 计算每个科目的平均增值率并排序
      const subjectPriority = Object.entries(subjectAnalysis)
        .map(([subject, data]: [string, any]) => ({
          subject,
          avgRate: data.avgRate / data.total,
          needAttentionCount: data.needAttention.length,
          topCount: data.topStudents.length,
        }))
        .sort((a, b) => a.avgRate - b.avgRate); // 增值率低的科目需要优先关注

      // 构建详细的分析数据摘要（班主任视角）
      const summary = `
【增值评价活动】${activityName}

【整体数据】
参与班级：${classes.length}个 | 涉及教师：${teachers.length}位 | 分析学生：${students.length}人

【科目优先级】需重点关注的科目（增值率从低到高）：
${subjectPriority
  .slice(0, 5)
  .map(
    (s, i) =>
      `${i + 1}. ${s.subject}：平均增值率 ${(s.avgRate * 100).toFixed(1)}%，${s.needAttentionCount}名学生需关注，${s.topCount}名优秀`
  )
  .join("\n")}

【优秀学生】前15名：
${topStudents
  .map(
    (s, i) =>
      `${i + 1}. ${s.student_name}（${s.class_name}）${s.subject}：增值率 ${(s.avg_score_value_added_rate * 100).toFixed(1)}%，出口 ${s.exit_score?.toFixed(1)}分`
  )
  .join("\n")}

【需关注学生】后15名：
${bottomStudents
  .map(
    (s, i) =>
      `${i + 1}. ${s.student_name}（${s.class_name}）${s.subject}：增值率 ${(s.avg_score_value_added_rate * 100).toFixed(1)}%，出口 ${s.exit_score?.toFixed(1)}分`
  )
  .join("\n")}

【班级表现】前8个班：
${classes
  .slice(0, 8)
  .map(
    (c, i) =>
      `${i + 1}. ${c.class_name}（${c.subject}）：增值 ${(c.avg_score_value_added_rate * 100).toFixed(1)}%，巩固 ${c.consolidation_rate?.toFixed(1)}%，转化 ${c.transformation_rate?.toFixed(1)}%`
  )
  .join("\n")}

【教师效果】前8位：
${teachers
  .slice(0, 8)
  .map(
    (t, i) =>
      `${i + 1}. ${t.teacher_name}（${t.subject}）：增值 ${(t.avg_score_value_added_rate * 100).toFixed(1)}%，教学 ${t.total_students} 人`
  )
  .join("\n")}

---

请以班主任视角分析数据，提供详细、具体的指导报告。

一、科目关注策略

【要求】列出3-5个最需关注的科目，每个科目包含：
- 当前增值率数据（与平均值对比）
- 表现不佳的具体原因分析（是入口基础弱？教学方法问题？学生态度？）
- 针对原因的2-3条具体措施（包含时间节点、责任人）
- 如果有表现优秀的科目，也要说明原因和可推广经验


二、学生个体指导

【值得表扬】列出5-8名学生：
- 姓名、班级、科目
- 表扬原因：增值率数据 + 进步表现
- 具体表扬话术建议

【需要谈话】列出5-8名学生：
- 姓名、班级、科目
- 谈话原因：增值率数据 + 问题诊断
- 谈话要点和改进建议

【防滑对象】识别2-3名学生：
- 为什么需要特别关注（数据特征）
- 预防措施


三、优秀学生利用

【小老师人选】推荐3-5人，说明选择依据
【学习小组长】每科推荐1-2人
【帮扶配对】给出3-5对，说明配对理由
【激励措施】2-3项具体奖励方案


四、行动计划

【短期行动（1-2周内）】
列出3-5项具体事项，每项包含：具体内容、负责人、完成时间、验收标准

【中期行动（1个月内）】
列出2-3项工作重点，包含检查节点和预期成果

【长期目标（本学期）】
1-2个可衡量目标，跟踪方式和评估标准


五、家校沟通

列出5-8名学生家长需要沟通：
每位家长包含：
- 学生姓名、当前表现数据
- 沟通原因：表扬进步 or 指出问题
- 具体话术建议
- 预期家长配合事项


════════════════════════════════════════

【输出格式要求 - 重要！】
1. 使用"一、""二、""三、"作为大标题
2. 使用【】标注小节标题，如【值得表扬】【需要谈话】
3. 大标题之间空2行
4. 小节之间空1行
5. 每条具体内容之间也要空行
6. 使用"────"作为分隔线
7. 保持清晰的层级结构

【内容要求】
- 每条建议控制在3-5行，但必须包含：数据+原因+措施
- 使用真实学生姓名和数据
- 语言专业但易懂，可直接用于教师会议

【重要】每一项分析都要回答：数据是什么？为什么这样？怎么办？
`;

      // 调用AI分析
      const aiResponse = await chatWithModel(
        aiConfig.provider,
        aiConfig.model || aiConfig.version, // 优先使用model字段，向后兼容version字段
        summary,
        {
          systemPrompt: `你是一位拥有20年班主任经验的资深教育专家，擅长：
1. 通过增值评价数据发现学生潜力和问题
2. 基于数据进行深度原因分析
3. 制定切实可行的班级管理和教学改进计划
4. 与学生和家长进行有效沟通

请以班主任的实际工作视角，提供详细、深入、可操作的分析和建议。

【核心要求】
- 每一项分析都要包含：具体数据 + 原因分析 + 解决方案
- 不要只说"要做XX"，要说"为什么做XX"和"具体怎么做"
- 用数据说话：增值率、排名、分数变化等
- 挖掘问题根因：是基础问题？学习方法？态度？教学问题？
- 所有建议要具体到人、到科目、到时间节点
- 语言要专业但易懂，适合在教师会议或班会上使用

【排版格式要求 - 非常重要！】
1. 使用"一、""二、""三、"等作为大标题
2. 使用【】标注小节标题，例如【值得表扬】【需要谈话】
3. 大标题之间必须空2行
4. 小节之间必须空1行
5. 每个学生/每条建议之间也要空1行
6. 使用"────────────────"作为章节分隔线
7. 保持清晰的层级结构，避免内容过于密集

【输出示例格式】
一、科目关注策略

【数学科目】
数据：平均增值率-8.5%，低于全年级...
原因：从学生表现看...
措施：①本周五前与数学老师沟通...

【语文科目】
数据：...

────────────────

二、学生个体指导

【值得表扬】

张三（高一1班）
表扬原因：数学增值率+25%...
话术建议：...

李四（高一2班）
表扬原因：...

请严格按照上述格式输出，确保排版清晰、易读！`,
          temperature: 0.7,
          maxTokens: 4000, // 增加token数以获得更详细的分析
        }
      );

      // 将AI响应转换为洞察格式
      const insights: AIInsight[] = [
        {
          id: "ai-analysis-1",
          type: "achievement" as any,
          priority: "high" as any,
          sentiment: "neutral" as any,
          title: "班主任工作指导报告",
          description: aiResponse,
          confidence: 0.9,
          timestamp: new Date(),
        },
      ];

      setAiInsights(insights);
      toast.success("AI分析完成");
    } catch (error) {
      console.error("AI分析失败:", error);
      toast.error(
        error instanceof Error
          ? `AI分析失败: ${error.message}`
          : "AI分析失败，请检查AI配置"
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  // 🔧 添加空数据检查
  const hasData =
    classData.length > 0 || teacherData.length > 0 || studentData.length > 0;

  if (!hasData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/value-added")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold">AI智能分析</h1>
              <p className="text-sm text-muted-foreground mt-1">
                活动：{activityName}
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">暂无分析数据</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              该增值活动还没有计算数据，或计算过程出现了问题。
            </p>
            <div className="flex gap-3">
              <Button onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                重新加载
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/value-added")}
              >
                返回活动列表
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/value-added")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">AI智能分析</h1>
            <p className="text-sm text-muted-foreground mt-1">
              活动：{activityName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            班级 {classData.length} | 教师 {teacherData.length} | 学生{" "}
            {studentData.length}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新数据
          </Button>
        </div>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <CardTitle>数据筛选</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名/班级..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 科目筛选 */}
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="选择科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部科目</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 班级筛选 */}
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="选择班级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部班级</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 重置按钮 */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedSubject("all");
                setSelectedClass("all");
              }}
              disabled={
                searchTerm === "" &&
                selectedSubject === "all" &&
                selectedClass === "all"
              }
            >
              重置筛选
            </Button>
          </div>

          {/* 筛选结果统计 */}
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              筛选结果：班级 {filteredClassData.length} | 教师{" "}
              {filteredTeacherData.length} | 学生 {filteredStudentData.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 主内容区域 */}
      <Card>
        <Tabs defaultValue="overview">
          <div className="border-b px-6 pt-4">
            <TabsList>
              <TabsTrigger value="overview">考试整体分析</TabsTrigger>
              <TabsTrigger value="insights">算法洞察</TabsTrigger>
              <TabsTrigger value="anomaly">异常检测</TabsTrigger>
              <TabsTrigger value="report">AI报告生成</TabsTrigger>
            </TabsList>
          </div>

          {/* 考试整体分析 */}
          <TabsContent value="overview" className="p-6">
            {(() => {
              // 聚合班级数据：计算每个班级所有科目的平均增值率
              const aggregatedClassData = classData.reduce((acc, cls) => {
                if (!acc[cls.class_name]) {
                  acc[cls.class_name] = {
                    class_name: cls.class_name,
                    subjects: [],
                    totalRate: 0,
                    count: 0,
                  };
                }
                // 🔧 添加空值检查：忽略null/undefined/NaN的增值率
                const rate = cls.avg_score_value_added_rate;
                if (rate !== null && rate !== undefined && !isNaN(rate)) {
                  acc[cls.class_name].subjects.push({
                    subject: cls.subject,
                    rate: rate,
                  });
                  acc[cls.class_name].totalRate += rate;
                  acc[cls.class_name].count++;
                }
                return acc;
              }, {} as any);

              const classOverallData = Object.values(aggregatedClassData).map(
                (item: any) => ({
                  class_name: item.class_name,
                  avgRate: item.count > 0 ? item.totalRate / item.count : 0,
                  subjectCount: item.count,
                })
              );

              // 计算唯一班级数量
              const uniqueClasses = new Set(classData.map((c) => c.class_name));

              return (
                <div className="space-y-6">
                  {/* 整体数据统计卡片 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            参与班级
                          </CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {uniqueClasses.size}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          涵盖全年级所有班级
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            参与教师
                          </CardTitle>
                          <Award className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {teacherData.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          各科目任课教师
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            分析学生
                          </CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {studentData.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          全年级学生数据
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            平均增值率
                          </CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {classOverallData.length > 0
                            ? (
                                (classOverallData.reduce(
                                  (sum, c) => sum + (c.avgRate || 0),
                                  0
                                ) /
                                  classOverallData.length) *
                                100
                              ).toFixed(1)
                            : "0.0"}
                          %
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {classOverallData.length > 0
                            ? "年级整体表现"
                            : "暂无数据"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 班级整体增值率分布图 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        班级整体增值率分布
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        各班级所有科目的平均增值表现
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={classOverallData
                            .sort((a, b) => b.avgRate - a.avgRate)
                            .slice(0, 20)}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="class_name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            label={{
                              value: "增值率 (%)",
                              angle: -90,
                              position: "insideLeft",
                            }}
                          />
                          <Tooltip
                            formatter={(value: number) =>
                              `${value.toFixed(2)}%`
                            }
                          />
                          <Legend />
                          <Bar
                            dataKey="avgRate"
                            name="平均增值率"
                            fill="#4CAF50"
                          >
                            {classOverallData
                              .sort((a, b) => b.avgRate - a.avgRate)
                              .slice(0, 20)
                              .map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.avgRate > 0.05
                                      ? "#4CAF50"
                                      : entry.avgRate > 0
                                        ? "#FFC107"
                                        : "#f44336"
                                  }
                                />
                              ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* 班级排名 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top10优秀班级 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-green-600" />
                          优秀班级 Top10
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          基于所有科目的整体表现
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {classOverallData
                            .sort((a, b) => b.avgRate - a.avgRate)
                            .slice(0, 10)
                            .map((cls, idx) => (
                              <div
                                key={cls.class_name}
                                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-bold text-sm">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <div className="font-semibold">
                                      {cls.class_name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {cls.subjectCount} 个科目
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-green-600">
                                    +{(cls.avgRate * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    平均增值率
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bottom10需关注班级 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          需关注班级 Bottom10
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          整体增值率较低的班级
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {classOverallData
                            .sort((a, b) => a.avgRate - b.avgRate)
                            .slice(0, 10)
                            .map((cls, idx) => (
                              <div
                                key={cls.class_name}
                                className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-600 text-white font-bold text-sm">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <div className="font-semibold">
                                      {cls.class_name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {cls.subjectCount} 个科目
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-orange-600">
                                    {(cls.avgRate * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    平均增值率
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 教师表现排行 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            教师增值率排行
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            教学效果前15位教师
                          </p>
                        </div>
                        {/* 科目筛选器 */}
                        <Select
                          value={teacherSubjectFilter}
                          onValueChange={setTeacherSubjectFilter}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="选择科目" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部科目</SelectItem>
                            {subjects.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {teacherData
                          .filter((t) =>
                            teacherSubjectFilter === "all"
                              ? true
                              : t.subject === teacherSubjectFilter
                          )
                          .sort(
                            (a, b) =>
                              b.avg_score_value_added_rate -
                              a.avg_score_value_added_rate
                          )
                          .slice(0, 15)
                          .map((teacher, idx) => (
                            <div
                              key={teacher.teacher_id}
                              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline">第 {idx + 1} 名</Badge>
                                <Badge
                                  variant={
                                    teacher.avg_score_value_added_rate > 0.1
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {teacher.subject}
                                </Badge>
                              </div>
                              <div className="font-semibold text-lg">
                                {teacher.teacher_name}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm text-muted-foreground">
                                  增值率
                                </span>
                                <span className="font-bold text-green-600">
                                  +
                                  {(
                                    teacher.avg_score_value_added_rate * 100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-sm text-muted-foreground">
                                  教学人数
                                </span>
                                <span className="font-semibold">
                                  {teacher.total_students} 人
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                      {teacherData.filter((t) =>
                        teacherSubjectFilter === "all"
                          ? true
                          : t.subject === teacherSubjectFilter
                      ).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          该科目暂无教师数据
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 整体算法洞察 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>整体算法洞察</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        基于全年级数据的统计分析
                      </p>
                    </CardHeader>
                    <CardContent>
                      <AIInsightsPanel
                        key={`overview-insights-${classData.length}`}
                        data={[...classData, ...teacherData]}
                        context={{
                          activityId: activityId || undefined,
                          scope: "全年级",
                        }}
                        maxInsights={8}
                      />
                    </CardContent>
                  </Card>

                  {/* 整体异常检测汇总 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>异常检测汇总</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        年级层面的异常情况统计
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="border-red-200 bg-red-50">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-red-600">
                                {
                                  generateAnomalies(
                                    classData,
                                    teacherData,
                                    studentData
                                  ).filter((a) => a.severity === "high").length
                                }
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                严重异常
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-orange-200 bg-orange-50">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-orange-600">
                                {
                                  generateAnomalies(
                                    classData,
                                    teacherData,
                                    studentData
                                  ).filter((a) => a.severity === "medium")
                                    .length
                                }
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                中等异常
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-yellow-200 bg-yellow-50">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-yellow-600">
                                {
                                  generateAnomalies(
                                    classData,
                                    teacherData,
                                    studentData
                                  ).filter((a) => a.severity === "low").length
                                }
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                轻微异常
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      <AnomalyDetailView
                        anomalies={generateAnomalies(
                          classData,
                          teacherData,
                          studentData
                        )}
                        loading={false}
                        hideFilters={false}
                      />
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </TabsContent>

          {/* 算法洞察 */}
          <TabsContent value="insights" className="p-6">
            <AIInsightsPanel
              key={`insights-${selectedSubject}-${selectedClass}-${searchTerm}-${filteredClassData.length}-${filteredTeacherData.length}`}
              data={[...filteredClassData, ...filteredTeacherData]}
              context={{
                activityId: activityId || undefined,
              }}
              maxInsights={10}
            />
          </TabsContent>

          {/* 异常检测 */}
          <TabsContent value="anomaly" className="p-6">
            <AnomalyDetailView
              anomalies={anomalyData}
              loading={false}
              hideFilters={true}
            />
          </TabsContent>

          {/* AI报告生成 */}
          <TabsContent value="report" className="p-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>生成AI分析报告</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      基于当前筛选的班级生成综合分析报告（使用真实AI分析）
                    </p>
                  </div>
                  {aiInsights.length > 0 && (
                    <Button
                      onClick={() =>
                        generateAIInsights(
                          filteredClassData,
                          filteredTeacherData,
                          filteredStudentData,
                          activityName
                        )
                      }
                      disabled={generatingAI}
                      variant="outline"
                    >
                      {generatingAI ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          重新生成中...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          重新生成
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {aiInsights.length > 0 ? (
                  <AIReportViewer
                    insights={aiInsights}
                    rawData={[...filteredClassData, ...filteredTeacherData]}
                    context={{
                      activityId: activityId || undefined,
                      analysisDate: new Date().toISOString(),
                      selectedClass:
                        selectedClass === "all" ? "全部班级" : selectedClass,
                    }}
                    title={`${activityName} - AI增值评价分析报告${
                      selectedClass !== "all" ? ` (${selectedClass})` : ""
                    }`}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      点击按钮生成AI智能分析
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      将对
                      {selectedClass === "all" ? "全年级" : `${selectedClass}`}
                      的 {filteredStudentData.length} 名学生数据进行深度分析
                    </p>
                    <Button
                      onClick={() =>
                        generateAIInsights(
                          filteredClassData,
                          filteredTeacherData,
                          filteredStudentData,
                          activityName
                        )
                      }
                      disabled={generatingAI}
                      size="lg"
                    >
                      {generatingAI ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          AI分析中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          生成AI分析
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
