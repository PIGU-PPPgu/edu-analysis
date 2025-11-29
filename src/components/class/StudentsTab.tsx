import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Users,
  ArrowUpDown,
  Filter,
  BookOpen,
  TrendingUp,
  UserCircle,
  FileText,
  BarChart3,
} from "lucide-react";
import { portraitAPI, StudentPortraitData } from "@/lib/api/portrait";
import StudentCard from "@/components/portrait/StudentCard";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { advancedExportService } from "@/services/advancedExportService";
import { toast } from "sonner";

interface StudentsTabProps {
  classId: string;
  className: string;
}

interface StudentGrade {
  id: string;
  student_id: string;
  subject: string;
  score: number;
  exam_date: string;
  exam_title: string;
  rank_in_class?: number;
}

interface StudentHomework {
  id: string;
  title: string;
  due_date: string;
  status: string;
  score?: number;
  grade?: string;
}

const StudentsTab: React.FC<StudentsTabProps> = ({ classId, className }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("name_asc");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterScoreRange, setFilterScoreRange] = useState<string>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [studentDetailTab, setStudentDetailTab] = useState("overview");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set()
  );
  const [isExporting, setIsExporting] = useState(false);

  // 获取班级学生数据
  const { data: students, isLoading: isLoadingStudents } = useQuery<
    StudentPortraitData[]
  >({
    queryKey: ["students", classId],
    queryFn: () => portraitAPI.getClassStudents(classId),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
  });

  // 获取选中学生对象和UUID
  const selectedStudent = useMemo(() => {
    return students?.find((s) => s.student_id === selectedStudentId);
  }, [students, selectedStudentId]);

  const selectedStudentUUID = useMemo(() => {
    return selectedStudent?.id;
  }, [selectedStudent]);

  // 获取选中学生的成绩数据 - 修复:使用grade_data_new表,获取完整数据
  const { data: studentGrades, isLoading: isLoadingGrades } = useQuery<any[]>({
    queryKey: ["studentGrades", selectedStudent?.student_id],
    queryFn: async () => {
      if (!selectedStudent?.student_id) return [];

      const { data, error } = await supabase
        .from("grade_data_new")
        .select("*")
        .eq("student_id", selectedStudent.student_id)
        .order("exam_date", { ascending: false });

      if (error) {
        console.error("获取学生成绩失败:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!selectedStudent?.student_id,
  });

  // 获取选中学生的作业数据
  const { data: studentHomework, isLoading: isLoadingHomework } = useQuery<
    StudentHomework[]
  >({
    queryKey: ["studentHomework", selectedStudentUUID],
    queryFn: async () => {
      if (!selectedStudentUUID) return [];

      const { data, error } = await supabase
        .from("homework_submissions")
        .select(
          `
          id,
          submitted_at,
          status,
          score,
          grade,
          homework:homework_id (
            id,
            title,
            due_date
          )
        `
        )
        .eq("student_id", selectedStudentUUID)
        .order("submitted_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("获取学生作业失败:", error);
        throw error;
      }

      // 转换数据结构
      const formattedData =
        data?.map((item: any) => ({
          id: item.id,
          title: item.homework?.title || "未知作业",
          due_date: item.homework?.due_date || "",
          status: item.status || "pending",
          score: item.score,
          grade: item.grade,
        })) || [];

      return formattedData;
    },
    enabled: !!selectedStudentUUID,
  });

  // 预计算学生平均分 - 性能优化
  const studentsWithAvgScore = useMemo(() => {
    if (!students) return [];
    return students.map((student) => ({
      ...student,
      avgScore: student.scores?.length
        ? student.scores.reduce((sum, s) => sum + s.score, 0) /
          student.scores.length
        : 0,
    }));
  }, [students]);

  // 筛选和排序学生
  const filteredStudents = useMemo(() => {
    if (!studentsWithAvgScore) return [];

    let filtered = studentsWithAvgScore.filter(
      (student) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterTag) {
      filtered = filtered.filter((student) => {
        if (!student.aiTags) return false;
        return Object.values(student.aiTags).some((tagArray) =>
          tagArray.includes(filterTag)
        );
      });
    }

    // 成绩区间筛选
    if (filterScoreRange !== "all") {
      filtered = filtered.filter((student) => {
        const score = student.avgScore;
        switch (filterScoreRange) {
          case "excellent": // 优秀: >=90
            return score >= 90;
          case "good": // 良好: 80-89
            return score >= 80 && score < 90;
          case "pass": // 及格: 60-79
            return score >= 60 && score < 80;
          case "fail": // 不及格: <60
            return score < 60;
          default:
            return true;
        }
      });
    }

    switch (sortOption) {
      case "name_asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
        break;
      case "name_desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name, "zh-CN"));
        break;
      case "score_asc":
        filtered.sort((a, b) => a.avgScore - b.avgScore);
        break;
      case "score_desc":
        filtered.sort((a, b) => b.avgScore - a.avgScore);
        break;
      case "id_asc":
        filtered.sort((a, b) =>
          a.student_id.localeCompare(b.student_id, "zh-CN")
        );
        break;
      case "id_desc":
        filtered.sort((a, b) =>
          b.student_id.localeCompare(a.student_id, "zh-CN")
        );
        break;
    }

    return filtered;
  }, [studentsWithAvgScore, searchQuery, sortOption, filterTag]);

  // 获取所有AI标签
  const allTags = useMemo(() => {
    if (!students) return [];
    const tags = new Set<string>();
    students.forEach((student) => {
      if (student.aiTags) {
        Object.values(student.aiTags).forEach((tagArray) => {
          tagArray.forEach((tag) => tags.add(tag));
        });
      }
    });
    return Array.from(tags);
  }, [students]);

  if (isLoadingStudents) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 学生列表区域 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>学生列表</CardTitle>
              <CardDescription>搜索、筛选和查看学生详情</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 批量操作工具栏 */}
          {selectedStudentIds.size > 0 && (
            <div className="mb-4 p-4 bg-[#B9FF66]/20 border-2 border-black rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-[#B9FF66] text-black border-2 border-black">
                  已选择 {selectedStudentIds.size} 名学生
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedStudentIds(new Set())}
                  className="h-7 text-xs hover:bg-white/50"
                >
                  清除选择
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-black hover:bg-[#B9FF66]/30"
                  disabled={isExporting}
                  onClick={async () => {
                    setIsExporting(true);
                    try {
                      // 获取选中学生的完整数据
                      const selectedStudents = filteredStudents.filter((s) =>
                        selectedStudentIds.has(s.student_id)
                      );

                      // 导出学生基本信息和成绩
                      const exportData = selectedStudents.map((s) => ({
                        学号: s.student_id,
                        姓名: s.name,
                        班级: className,
                        平均分: (s as any).avgScore?.toFixed(1) || "N/A",
                        AI标签: s.aiTags
                          ? Object.values(s.aiTags).flat().join(", ")
                          : "",
                        自定义标签: s.customTags?.join(", ") || "",
                      }));

                      const result =
                        await advancedExportService.exportStudentGrades({
                          format: "xlsx",
                          fields: [],
                          filters: {
                            student_id:
                              Array.from(selectedStudentIds).join(","),
                          },
                          fileName: `${className}_学生数据_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}`,
                        });

                      if (result.success) {
                        toast.success(
                          `成功导出 ${selectedStudentIds.size} 名学生的数据`
                        );
                        setSelectedStudentIds(new Set());
                      } else {
                        toast.error(result.error || "导出失败");
                      }
                    } catch (error) {
                      console.error("批量导出错误:", error);
                      toast.error("导出失败，请稍后重试");
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-1" />
                  )}
                  {isExporting ? "导出中..." : "批量导出"}
                </Button>
              </div>
            </div>
          )}

          {/* 搜索和筛选栏 */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索学生姓名或学号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">姓名 (A-Z)</SelectItem>
                <SelectItem value="name_desc">姓名 (Z-A)</SelectItem>
                <SelectItem value="score_desc">成绩 (高-低)</SelectItem>
                <SelectItem value="score_asc">成绩 (低-高)</SelectItem>
                <SelectItem value="id_asc">学号 (升序)</SelectItem>
                <SelectItem value="id_desc">学号 (降序)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterScoreRange}
              onValueChange={setFilterScoreRange}
            >
              <SelectTrigger className="w-[160px]">
                <BarChart3 className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="成绩筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部成绩</SelectItem>
                <SelectItem value="excellent">优秀 (≥90)</SelectItem>
                <SelectItem value="good">良好 (80-89)</SelectItem>
                <SelectItem value="pass">及格 (60-79)</SelectItem>
                <SelectItem value="fail">不及格 (&lt;60)</SelectItem>
              </SelectContent>
            </Select>

            {allTags.length > 0 && (
              <Select
                value={filterTag || "all"}
                onValueChange={(value) =>
                  setFilterTag(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="w-[160px]">
                  <Filter className="mr-2 h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="筛选标签" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部标签</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 学生卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map((student) => (
              <StudentCard
                key={student.student_id}
                student={student}
                onView={(studentId) => setSelectedStudentId(studentId)}
              />
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-semibold">未找到学生</p>
              <p className="text-sm">
                {searchQuery
                  ? "没有匹配当前搜索条件的学生"
                  : "该班级暂无学生数据"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 学生详情区域 */}
      {selectedStudent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserCircle className="h-8 w-8 text-[#5E9622]" />
                <div>
                  <CardTitle>{selectedStudent.name}</CardTitle>
                  <CardDescription>
                    学号: {selectedStudent.student_id} · 平均分:{" "}
                    {(selectedStudent as any).avgScore > 0
                      ? (selectedStudent as any).avgScore.toFixed(1)
                      : "N/A"}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudentId(null)}
              >
                关闭
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={studentDetailTab} onValueChange={setStudentDetailTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  画像概览
                </TabsTrigger>
                <TabsTrigger value="grades">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  成绩详情
                </TabsTrigger>
                <TabsTrigger value="homework">
                  <FileText className="h-4 w-4 mr-2" />
                  作业情况
                </TabsTrigger>
              </TabsList>

              {/* 画像概览 */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    AI 画像标签
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.aiTags ? (
                      Object.entries(selectedStudent.aiTags).map(
                        ([category, tags]) =>
                          tags.map((tag) => (
                            <Badge
                              key={`${category}-${tag}`}
                              variant="secondary"
                            >
                              {tag}
                            </Badge>
                          ))
                      )
                    ) : (
                      <p className="text-sm text-gray-500">暂无AI标签</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    自定义标签
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.customTags?.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    )) || (
                      <p className="text-sm text-gray-500">暂无自定义标签</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* 成绩详情 - 修复:显示9个科目的完整成绩 */}
              <TabsContent value="grades" className="mt-4">
                {isLoadingGrades ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : studentGrades && studentGrades.length > 0 ? (
                  <div className="space-y-4">
                    {studentGrades.map((examRecord: any) => {
                      const subjects = [
                        {
                          name: "语文",
                          scoreField: "chinese_score",
                          rankField: "chinese_rank_in_class",
                        },
                        {
                          name: "数学",
                          scoreField: "math_score",
                          rankField: "math_rank_in_class",
                        },
                        {
                          name: "英语",
                          scoreField: "english_score",
                          rankField: "english_rank_in_class",
                        },
                        {
                          name: "物理",
                          scoreField: "physics_score",
                          rankField: "physics_rank_in_class",
                        },
                        {
                          name: "化学",
                          scoreField: "chemistry_score",
                          rankField: "chemistry_rank_in_class",
                        },
                        {
                          name: "生物",
                          scoreField: "biology_score",
                          rankField: "biology_rank_in_class",
                        },
                        {
                          name: "政治",
                          scoreField: "politics_score",
                          rankField: "politics_rank_in_class",
                        },
                        {
                          name: "历史",
                          scoreField: "history_score",
                          rankField: "history_rank_in_class",
                        },
                        {
                          name: "地理",
                          scoreField: "geography_score",
                          rankField: "geography_rank_in_class",
                        },
                      ];

                      return (
                        <Card
                          key={examRecord.id}
                          className="overflow-hidden border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                        >
                          <div className="bg-[#B9FF66]/10 px-4 py-3 border-b-2 border-black">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                  {examRecord.exam_title}
                                </p>
                                <p className="text-xs text-[#5E9622] font-medium">
                                  {examRecord.exam_date} ·{" "}
                                  {examRecord.exam_type || "常规考试"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-[#5E9622]">总分</p>
                                <p className="text-2xl font-bold text-black">
                                  {examRecord.total_score || "N/A"}
                                </p>
                                {examRecord.total_rank_in_class && (
                                  <p className="text-xs text-gray-500">
                                    班级第 {examRecord.total_rank_in_class} 名
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="grid grid-cols-3 gap-3">
                              {subjects.map((subject) => {
                                const score = examRecord[subject.scoreField];
                                const rank = examRecord[subject.rankField];
                                if (!score && score !== 0) return null;

                                return (
                                  <div
                                    key={subject.name}
                                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                                  >
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                      {subject.name}
                                    </p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                      {score}
                                    </p>
                                    {rank && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        第 {rank} 名
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>暂无成绩数据</p>
                  </div>
                )}
              </TabsContent>

              {/* 作业情况 */}
              <TabsContent value="homework" className="mt-4">
                {isLoadingHomework ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : studentHomework && studentHomework.length > 0 ? (
                  <div className="space-y-3">
                    {studentHomework.map((hw) => (
                      <Card key={hw.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{hw.title}</p>
                              <p className="text-sm text-gray-500">
                                截止日期: {hw.due_date}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={
                                  hw.status === "submitted"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {hw.status === "submitted"
                                  ? "已提交"
                                  : "未提交"}
                              </Badge>
                              {hw.score && (
                                <p className="text-sm font-medium mt-1">
                                  {hw.score}分 / {hw.grade}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>暂无作业数据</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentsTab;
