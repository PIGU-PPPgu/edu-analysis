import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Target,
  Brain,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  Zap,
  Filter,
  RefreshCw,
  Download,
  Settings,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Layers,
} from "lucide-react";

// 数据类型定义
interface StudentPerformance {
  studentId: string;
  studentName: string;
  className: string;
  overallScore: number;
  subjectScores: Record<string, number>;
  trend: "improving" | "declining" | "stable";
  riskLevel: "low" | "medium" | "high";
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface SubjectAnalysis {
  subject: string;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  difficulty: "easy" | "medium" | "hard";
  studentCount: number;
  trend: number; // 与上次相比的变化百分比
}

interface ClassComparison {
  className: string;
  averageScore: number;
  studentCount: number;
  passRate: number;
  topPerformers: number;
  improvementRate: number;
  riskStudents: number;
}

interface TeachingEffectiveness {
  teacher: string;
  subject: string;
  classes: string[];
  averageImprovement: number;
  studentSatisfaction: number;
  passRate: number;
  innovationScore: number;
  recommendations: string[];
}

// 分析视角类型
type AnalysisPerspective =
  | "student-individual" // 学生个体视角
  | "student-group" // 学生群体视角
  | "subject-performance" // 科目表现视角
  | "class-comparison" // 班级对比视角
  | "time-trend" // 时间趋势视角
  | "teaching-effectiveness" // 教学效果视角
  | "predictive-analysis" // 预测分析视角
  | "holistic-overview"; // 全景概览视角

const MultiPerspectiveAnalysis: React.FC = () => {
  // 状态管理
  const [activePerspective, setActivePerspective] =
    useState<AnalysisPerspective>("holistic-overview");
  const [selectedTimeRange, setSelectedTimeRange] = useState("semester");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // 模拟数据
  const [studentData, setStudentData] = useState<StudentPerformance[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectAnalysis[]>([]);
  const [classData, setClassData] = useState<ClassComparison[]>([]);
  const [teachingData, setTeachingData] = useState<TeachingEffectiveness[]>([]);

  // 颜色配置
  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#00ff7f",
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
  ];
  const RISK_COLORS = {
    low: "#10B981",
    medium: "#F59E0B",
    high: "#EF4444",
  };

  // 初始化数据
  useEffect(() => {
    const loadAnalysisData = async () => {
      setIsLoading(true);

      // 模拟API延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 模拟学生数据
      const mockStudentData: StudentPerformance[] = [
        {
          studentId: "001",
          studentName: "张小明",
          className: "高一(1)班",
          overallScore: 85.5,
          subjectScores: { 语文: 88, 数学: 92, 英语: 80, 物理: 85, 化学: 83 },
          trend: "improving",
          riskLevel: "low",
          strengths: ["数学", "物理"],
          weaknesses: ["英语"],
          recommendations: ["加强英语口语练习", "保持数理优势"],
        },
        {
          studentId: "002",
          studentName: "李小红",
          className: "高一(1)班",
          overallScore: 72.3,
          subjectScores: { 语文: 75, 数学: 68, 英语: 78, 物理: 65, 化学: 70 },
          trend: "declining",
          riskLevel: "medium",
          strengths: ["语文", "英语"],
          weaknesses: ["数学", "物理"],
          recommendations: ["数学基础巩固", "物理概念理解"],
        },
        // ... 更多学生数据
      ];

      // 模拟科目数据
      const mockSubjectData: SubjectAnalysis[] = [
        {
          subject: "数学",
          averageScore: 78.5,
          highestScore: 98,
          lowestScore: 45,
          passRate: 85.2,
          difficulty: "medium",
          studentCount: 120,
          trend: 5.2,
        },
        {
          subject: "语文",
          averageScore: 82.1,
          highestScore: 95,
          lowestScore: 52,
          passRate: 92.5,
          difficulty: "easy",
          studentCount: 120,
          trend: -2.1,
        },
        {
          subject: "英语",
          averageScore: 75.8,
          highestScore: 96,
          lowestScore: 38,
          passRate: 78.3,
          difficulty: "hard",
          studentCount: 120,
          trend: 8.7,
        },
        // ... 更多科目
      ];

      // 模拟班级数据
      const mockClassData: ClassComparison[] = [
        {
          className: "高一(1)班",
          averageScore: 81.2,
          studentCount: 45,
          passRate: 88.9,
          topPerformers: 8,
          improvementRate: 12.5,
          riskStudents: 3,
        },
        {
          className: "高一(2)班",
          averageScore: 79.6,
          studentCount: 46,
          passRate: 84.8,
          topPerformers: 6,
          improvementRate: 8.7,
          riskStudents: 5,
        },
        // ... 更多班级
      ];

      setStudentData(mockStudentData);
      setSubjectData(mockSubjectData);
      setClassData(mockClassData);
      setIsLoading(false);
    };

    loadAnalysisData();
  }, [selectedTimeRange, selectedSubject, selectedClass]);

  // 渲染全景概览
  const renderHolisticOverview = () => (
    <div className="space-y-6">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总体平均分</p>
                <p className="text-2xl font-bold">79.8</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  比上期提升 3.2%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-[#c0ff3f]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">及格率</p>
                <p className="text-2xl font-bold">87.3%</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  较理想水平
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">风险学生</p>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-orange-600 flex items-center mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  需要关注
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">优秀率</p>
                <p className="text-2xl font-bold">25.8%</p>
                <p className="text-xs text-purple-600 flex items-center mt-1">
                  <Award className="h-3 w-3 mr-1" />
                  有待提升
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 成绩分布图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              科目成绩对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="averageScore" fill="#8884d8" name="平均分" />
                <Bar dataKey="passRate" fill="#82ca9d" name="及格率(%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              学生风险分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "低风险", value: 85, color: RISK_COLORS.low },
                    { name: "中风险", value: 28, color: RISK_COLORS.medium },
                    { name: "高风险", value: 12, color: RISK_COLORS.high },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: "低风险", value: 85, color: RISK_COLORS.low },
                    { name: "中风险", value: 28, color: RISK_COLORS.medium },
                    { name: "高风险", value: 12, color: RISK_COLORS.high },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 关键洞察 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            关键洞察与建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-800">优势亮点</h4>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 语文学科表现突出，及格率达92.5%</li>
                <li>• 高一(1)班整体进步显著</li>
                <li>• 数学科目难度适中，学生接受度良好</li>
              </ul>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h4 className="font-medium text-orange-800">需要关注</h4>
              </div>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• 英语科目难度较大，需加强基础教学</li>
                <li>• 12名学生存在学习困难，需个性化辅导</li>
                <li>• 部分班级差距较大，需平衡教学资源</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-800">改进建议</h4>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 加强英语基础词汇和语法训练</li>
                <li>• 建立学习小组，促进同伴互助</li>
                <li>• 定期开展个性化辅导课程</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染学生个体分析
  const renderStudentIndividualAnalysis = () => {
    const selectedStudent = studentData[0]; // 简化示例

    if (!selectedStudent) {
      return (
        <div className="text-center py-8 text-gray-500">请选择要分析的学生</div>
      );
    }

    return (
      <div className="space-y-6">
        {/* 学生基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                学生个体分析 - {selectedStudent.studentName}
              </div>
              <Badge
                className={`${
                  selectedStudent.riskLevel === "low"
                    ? "bg-green-100 text-green-800"
                    : selectedStudent.riskLevel === "medium"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {selectedStudent.riskLevel === "low"
                  ? "低风险"
                  : selectedStudent.riskLevel === "medium"
                    ? "中风险"
                    : "高风险"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">班级</p>
                  <p className="font-medium">{selectedStudent.className}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">总体得分</p>
                  <p className="text-2xl font-bold">
                    {selectedStudent.overallScore}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">发展趋势</p>
                  <div className="flex items-center gap-1">
                    {selectedStudent.trend === "improving" ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : selectedStudent.trend === "declining" ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Activity className="h-4 w-4 text-gray-500" />
                    )}
                    <span
                      className={
                        selectedStudent.trend === "improving"
                          ? "text-green-600"
                          : selectedStudent.trend === "declining"
                            ? "text-red-600"
                            : "text-gray-600"
                      }
                    >
                      {selectedStudent.trend === "improving"
                        ? "进步中"
                        : selectedStudent.trend === "declining"
                          ? "需关注"
                          : "稳定"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <h4 className="font-medium mb-3">各科成绩分布</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart
                    data={Object.entries(selectedStudent.subjectScores).map(
                      ([subject, score]) => ({
                        subject,
                        score,
                        fullMark: 100,
                      })
                    )}
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={60} domain={[0, 100]} />
                    <Radar
                      name="成绩"
                      dataKey="score"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 优势与劣势分析 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                学科优势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedStudent.strengths.map((strength, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      {strength}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {selectedStudent.subjectScores[strength]}分
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                待改进科目
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedStudent.weaknesses.map((weakness, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-800"
                    >
                      {weakness}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {selectedStudent.subjectScores[weakness]}分
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 个性化建议 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              个性化学习建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedStudent.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg"
                >
                  <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-800">
                    {recommendation}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // 渲染科目表现分析
  const renderSubjectPerformanceAnalysis = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            科目表现深度分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {subjectData.map((subject, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{subject.subject}</h3>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        subject.difficulty === "easy"
                          ? "bg-green-100 text-green-800"
                          : subject.difficulty === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }
                    >
                      {subject.difficulty === "easy"
                        ? "简单"
                        : subject.difficulty === "medium"
                          ? "中等"
                          : "困难"}
                    </Badge>
                    <Badge variant="outline">
                      {subject.trend > 0 ? "+" : ""}
                      {subject.trend.toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">平均分</p>
                    <p className="text-xl font-bold">{subject.averageScore}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">及格率</p>
                    <p className="text-xl font-bold">{subject.passRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">最高分</p>
                    <p className="text-xl font-bold">{subject.highestScore}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">参与人数</p>
                    <p className="text-xl font-bold">{subject.studentCount}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>及格率进度</span>
                    <span>{subject.passRate}%</span>
                  </div>
                  <Progress value={subject.passRate} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染班级对比分析
  const renderClassComparisonAnalysis = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            班级综合对比分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={classData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="className" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="averageScore" fill="#8884d8" name="平均分" />
              <Bar dataKey="passRate" fill="#82ca9d" name="及格率" />
              <Bar dataKey="improvementRate" fill="#ffc658" name="进步率" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {classData.map((classItem, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{classItem.className}</h3>
                <div className="flex gap-2">
                  {classItem.riskStudents > 5 && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      需要关注
                    </Badge>
                  )}
                  {classItem.improvementRate > 10 && (
                    <Badge className="bg-green-100 text-green-800">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      进步显著
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div>
                  <p className="text-sm text-gray-600">平均分</p>
                  <p className="text-lg font-bold">{classItem.averageScore}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">学生数</p>
                  <p className="text-lg font-bold">{classItem.studentCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">及格率</p>
                  <p className="text-lg font-bold">{classItem.passRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">优秀人数</p>
                  <p className="text-lg font-bold">{classItem.topPerformers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">进步率</p>
                  <p className="text-lg font-bold text-green-600">
                    +{classItem.improvementRate}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">风险学生</p>
                  <p className="text-lg font-bold text-orange-600">
                    {classItem.riskStudents}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // 视角配置
  const perspectiveConfig = {
    "holistic-overview": {
      title: "全景概览",
      icon: Eye,
      description: "整体数据一览",
      component: renderHolisticOverview,
    },
    "student-individual": {
      title: "学生个体分析",
      icon: Users,
      description: "深入个体表现",
      component: renderStudentIndividualAnalysis,
    },
    "subject-performance": {
      title: "科目表现分析",
      icon: BookOpen,
      description: "各科目深度对比",
      component: renderSubjectPerformanceAnalysis,
    },
    "class-comparison": {
      title: "班级对比分析",
      icon: Layers,
      description: "班级间横向对比",
      component: renderClassComparisonAnalysis,
    },
    "time-trend": {
      title: "时间趋势分析",
      icon: TrendingUp,
      description: "时间序列变化",
      component: () => (
        <div className="text-center py-16 text-gray-500">
          时间趋势分析功能开发中...
        </div>
      ),
    },
    "teaching-effectiveness": {
      title: "教学效果分析",
      icon: Award,
      description: "教学质量评估",
      component: () => (
        <div className="text-center py-16 text-gray-500">
          教学效果分析功能开发中...
        </div>
      ),
    },
    "predictive-analysis": {
      title: "预测分析",
      icon: Brain,
      description: "AI智能预测",
      component: () => (
        <div className="text-center py-16 text-gray-500">
          预测分析功能开发中...
        </div>
      ),
    },
  };

  return (
    <div className="space-y-6">
      {/* 头部控制区域 */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">多视角深度分析</h1>
          <p className="text-gray-500 mt-1">
            从不同维度深入洞察学生表现和教学效果
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedTimeRange}
            onValueChange={setSelectedTimeRange}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semester">本学期</SelectItem>
              <SelectItem value="month">近一月</SelectItem>
              <SelectItem value="quarter">本季度</SelectItem>
              <SelectItem value="year">本学年</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="gap-1">
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>

          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            导出
          </Button>
        </div>
      </div>

      {/* 视角选择器 */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {Object.entries(perspectiveConfig).map(([key, config]) => {
              const IconComponent = config.icon;
              return (
                <Button
                  key={key}
                  variant={activePerspective === key ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setActivePerspective(key as AnalysisPerspective)
                  }
                  className={`flex flex-col items-center gap-1 h-auto py-3 ${
                    activePerspective === key
                      ? "bg-[#c0ff3f] text-black hover:bg-[#c0ff3f]/80"
                      : ""
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="text-xs text-center leading-tight">
                    {config.title}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 分析内容区域 */}
      <div className="min-h-[600px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
            <span>加载分析数据中...</span>
          </div>
        ) : (
          perspectiveConfig[activePerspective].component()
        )}
      </div>
    </div>
  );
};

export default MultiPerspectiveAnalysis;
