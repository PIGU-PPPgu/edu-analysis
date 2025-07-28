import React, { useMemo, memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartPie,
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Target,
  Info,
  Download,
  Filter,
  Grid,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
} from "recharts";

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  grade?: string;
  exam_title?: string;
  exam_date?: string;
}

interface CrossAnalysisProps {
  gradeData: GradeRecord[];
  title?: string;
  className?: string;
}

interface ClassSubjectPerformance {
  class_name: string;
  subject: string;
  average: number;
  count: number;
  max: number;
  min: number;
  stdDev: number;
}

// 计算标准差
const calculateStandardDeviation = (values: number[], mean: number): number => {
  if (values.length <= 1) return 0;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
};

// 计算班级-科目交叉分析数据
const calculateClassSubjectAnalysis = (
  gradeData: GradeRecord[]
): ClassSubjectPerformance[] => {
  const classSubjectGroups = gradeData.reduce(
    (acc, record) => {
      if (
        !record.class_name ||
        !record.subject ||
        !record.score ||
        isNaN(Number(record.score))
      )
        return acc;

      const key = `${record.class_name}-${record.subject}`;
      if (!acc[key]) {
        acc[key] = {
          class_name: record.class_name,
          subject: record.subject,
          scores: [],
        };
      }
      acc[key].scores.push(Number(record.score));
      return acc;
    },
    {} as Record<
      string,
      { class_name: string; subject: string; scores: number[] }
    >
  );

  return Object.values(classSubjectGroups)
    .map((group) => {
      const scores = group.scores;
      const average =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const max = Math.max(...scores);
      const min = Math.min(...scores);
      const stdDev = calculateStandardDeviation(scores, average);

      return {
        class_name: group.class_name,
        subject: group.subject,
        average: Number(average.toFixed(2)),
        count: scores.length,
        max,
        min,
        stdDev: Number(stdDev.toFixed(2)),
      };
    })
    .sort((a, b) => b.average - a.average);
};

const CrossAnalysis: React.FC<CrossAnalysisProps> = ({
  gradeData,
  title = "多维交叉分析",
  className = "",
}) => {
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  // 计算分析数据
  const classSubjectData = useMemo(
    () => calculateClassSubjectAnalysis(gradeData),
    [gradeData]
  );

  // 获取可用的班级和科目列表
  const availableClasses = useMemo(() => {
    return Array.from(
      new Set(gradeData.map((r) => r.class_name).filter(Boolean))
    );
  }, [gradeData]);

  const availableSubjects = useMemo(() => {
    return Array.from(new Set(gradeData.map((r) => r.subject).filter(Boolean)));
  }, [gradeData]);

  // 过滤数据
  const filteredClassSubjectData = useMemo(() => {
    return classSubjectData.filter((item) => {
      const classMatch =
        selectedClass === "all" || item.class_name === selectedClass;
      const subjectMatch =
        selectedSubject === "all" || item.subject === selectedSubject;
      return classMatch && subjectMatch;
    });
  }, [classSubjectData, selectedClass, selectedSubject]);

  // 统计数据
  const stats = useMemo(() => {
    const totalClasses = availableClasses.length;
    const totalSubjects = availableSubjects.length;
    const totalStudents = new Set(gradeData.map((r) => r.student_id)).size;
    const totalRecords = gradeData.length;

    return {
      totalClasses,
      totalSubjects,
      totalStudents,
      totalRecords,
      avgClassSize: totalStudents / totalClasses,
      dataCompleteness: (totalRecords / (totalStudents * totalSubjects)) * 100,
    };
  }, [gradeData, availableClasses, availableSubjects]);

  // 导出数据
  const handleExportData = () => {
    const csvContent = [
      ["班级", "科目", "平均分", "学生数", "最高分", "最低分", "标准差"],
      ...filteredClassSubjectData.map((item) => [
        item.class_name,
        item.subject,
        item.average.toString(),
        item.count.toString(),
        item.max.toString(),
        item.min.toString(),
        item.stdDev.toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "多维交叉分析.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (availableClasses.length === 0 || availableSubjects.length === 0) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#F7931E] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#F7931E] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <Grid className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
            数据不足
          </p>
          <p className="text-[#191A23]/70 font-medium">
            需要至少2个班级和2个科目的数据进行交叉分析
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Positivus风格标题和控制面板 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#F7931E] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#F7931E]">
        <CardHeader className="bg-[#F7931E] border-b-2 border-black">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-white uppercase tracking-wide">
                  🔄 {title}
                </CardTitle>
                <p className="text-white/90 font-medium mt-1">
                  分析 {stats.totalClasses} 个班级、{stats.totalSubjects}{" "}
                  个科目、{stats.totalStudents} 名学生的多维关系
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[140px] bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                  <SelectValue placeholder="选择班级" />
                </SelectTrigger>
                <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                  <SelectItem value="all">全部班级</SelectItem>
                  {availableClasses.map((className) => (
                    <SelectItem key={className} value={className}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#191A23]" />
                        <span className="font-medium">{className}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger className="w-[140px] bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#9C88FF] focus:ring-2 focus:ring-[#9C88FF] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                  <SelectValue placeholder="选择科目" />
                </SelectTrigger>
                <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                  <SelectItem value="all">全部科目</SelectItem>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#191A23]" />
                        <span className="font-medium">{subject}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleExportData}
                className="border-2 border-black bg-[#B9FF66] hover:bg-[#A8E055] text-[#191A23] font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
              >
                <Download className="h-4 w-4 mr-2" />
                导出数据
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Positivus风格分析说明 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black py-4">
          <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Info className="h-4 w-4 text-white" />
            </div>
            交叉分析说明
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#F7931E]/10 border-2 border-[#F7931E] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">班级-科目分析</p>
              <p className="text-sm text-[#191A23]/80">
                展示不同班级在各科目的表现差异
              </p>
            </div>
            <div className="p-4 bg-[#9C88FF]/10 border-2 border-[#9C88FF] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">数据完整度</p>
              <p className="text-sm text-[#191A23]/80">
                当前数据覆盖率为 {stats.dataCompleteness.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-[#FF6B6B]/10 border-2 border-[#FF6B6B] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">应用建议</p>
              <p className="text-sm text-[#191A23]/80">
                识别教学重点，优化资源配置，实现精准教学
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positivus风格统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {stats.totalClasses}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              班级数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#F7931E] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#F7931E]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {stats.totalSubjects}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              科目数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#9C88FF]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {stats.totalStudents}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              学生数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#FF6B6B] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#FF6B6B]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {stats.totalRecords}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              成绩记录
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {stats.avgClassSize.toFixed(1)}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              平均班级规模
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#F7931E] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#F7931E]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {stats.dataCompleteness.toFixed(1)}%
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              数据完整度
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positivus风格班级-科目表现图表 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]">
        <CardHeader className="bg-[#9C88FF] border-b-2 border-black">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            班级-科目平均分对比
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredClassSubjectData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#191A23"
                  opacity={0.2}
                />
                <XAxis
                  dataKey="subject"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12, fontWeight: "bold", fill: "#191A23" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fontWeight: "bold", fill: "#191A23" }}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${value}分`,
                    name === "average" ? "平均分" : name,
                  ]}
                  labelFormatter={(label) => `科目: ${label}`}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "2px solid black",
                    borderRadius: "8px",
                    boxShadow: "4px 4px 0px 0px #9C88FF",
                    fontWeight: "bold",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontWeight: "bold", color: "#191A23" }}
                />
                <Bar
                  dataKey="average"
                  fill="#9C88FF"
                  name="平均分"
                  stroke="#191A23"
                  strokeWidth={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Positivus风格详细数据表 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Grid className="h-5 w-5 text-white" />
            </div>
            详细数据表
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto border-2 border-black rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#191A23]">
                  <th className="border-2 border-black px-4 py-3 text-left text-white font-black uppercase tracking-wide">
                    班级
                  </th>
                  <th className="border-2 border-black px-4 py-3 text-left text-white font-black uppercase tracking-wide">
                    科目
                  </th>
                  <th className="border-2 border-black px-4 py-3 text-right text-white font-black uppercase tracking-wide">
                    平均分
                  </th>
                  <th className="border-2 border-black px-4 py-3 text-right text-white font-black uppercase tracking-wide">
                    学生数
                  </th>
                  <th className="border-2 border-black px-4 py-3 text-right text-white font-black uppercase tracking-wide">
                    最高分
                  </th>
                  <th className="border-2 border-black px-4 py-3 text-right text-white font-black uppercase tracking-wide">
                    最低分
                  </th>
                  <th className="border-2 border-black px-4 py-3 text-right text-white font-black uppercase tracking-wide">
                    标准差
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClassSubjectData.map((item, index) => (
                  <tr
                    key={index}
                    className={`hover:bg-[#B9FF66]/20 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-[#F3F3F3]"}`}
                  >
                    <td className="border-2 border-black px-4 py-3 font-bold text-[#191A23]">
                      {item.class_name}
                    </td>
                    <td className="border-2 border-black px-4 py-3 font-bold text-[#191A23]">
                      {item.subject}
                    </td>
                    <td className="border-2 border-black px-4 py-3 text-right font-black text-[#F7931E] text-lg">
                      {item.average}
                    </td>
                    <td className="border-2 border-black px-4 py-3 text-right font-bold text-[#191A23]">
                      {item.count}
                    </td>
                    <td className="border-2 border-black px-4 py-3 text-right font-bold text-[#B9FF66] bg-[#B9FF66]/20">
                      {item.max}
                    </td>
                    <td className="border-2 border-black px-4 py-3 text-right font-bold text-[#FF6B6B] bg-[#FF6B6B]/20">
                      {item.min}
                    </td>
                    <td className="border-2 border-black px-4 py-3 text-right font-bold text-[#9C88FF]">
                      {item.stdDev}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Positivus风格分析洞察 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#FF6B6B]">
        <CardHeader className="bg-[#FF6B6B] border-b-2 border-black">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Target className="h-5 w-5 text-white" />
            </div>
            分析洞察
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* 最佳表现班级-科目组合 */}
            {filteredClassSubjectData.length > 0 && (
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
                <CardContent className="p-4 bg-[#B9FF66]/20">
                  <p className="font-black text-[#191A23] text-lg mb-2">
                    最佳表现: {filteredClassSubjectData[0].class_name} -{" "}
                    {filteredClassSubjectData[0].subject}
                  </p>
                  <p className="font-medium text-[#191A23]">
                    平均分:{" "}
                    <span className="font-black text-[#F7931E]">
                      {filteredClassSubjectData[0].average}分
                    </span>
                    ， 学生数:{" "}
                    <span className="font-black text-[#9C88FF]">
                      {filteredClassSubjectData[0].count}人
                    </span>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 需要关注的班级-科目组合 */}
            {filteredClassSubjectData.length > 0 && (
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#F7931E]">
                <CardContent className="p-4 bg-[#F7931E]/20">
                  <p className="font-black text-[#191A23] text-lg mb-2">
                    需要关注:{" "}
                    {
                      filteredClassSubjectData[
                        filteredClassSubjectData.length - 1
                      ].class_name
                    }{" "}
                    -{" "}
                    {
                      filteredClassSubjectData[
                        filteredClassSubjectData.length - 1
                      ].subject
                    }
                  </p>
                  <p className="font-medium text-[#191A23]">
                    平均分:{" "}
                    <span className="font-black text-[#FF6B6B]">
                      {
                        filteredClassSubjectData[
                          filteredClassSubjectData.length - 1
                        ].average
                      }
                      分
                    </span>
                    ， 建议加强教学支持
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF]">
              <CardHeader className="bg-[#9C88FF] border-b-2 border-black py-3">
                <CardTitle className="text-white font-black uppercase tracking-wide">
                  教学建议
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 bg-[#9C88FF]/10">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#B9FF66] border border-black rounded-full mt-2 flex-shrink-0"></div>
                    <p className="font-medium text-[#191A23]">
                      关注平均分较低的班级-科目组合，分析原因并制定改进措施
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#F7931E] border border-black rounded-full mt-2 flex-shrink-0"></div>
                    <p className="font-medium text-[#191A23]">
                      学习优秀班级的教学经验，推广有效的教学方法
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#FF6B6B] border border-black rounded-full mt-2 flex-shrink-0"></div>
                    <p className="font-medium text-[#191A23]">
                      注意标准差较大的组合，可能存在学生水平差异较大的情况
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#9C88FF] border border-black rounded-full mt-2 flex-shrink-0"></div>
                    <p className="font-medium text-[#191A23]">
                      定期进行交叉分析，跟踪教学效果的变化趋势
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(CrossAnalysis);
