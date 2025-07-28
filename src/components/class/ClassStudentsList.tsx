import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  Eye,
  UserCheck,
} from "lucide-react";
import { getScoreColors, getTrendColors } from "@/config/colors";

interface StudentData {
  studentId: string;
  name: string;
  averageScore: number;
  trend: number;
  gradeRank?: number;
  classRank?: number;
  subjects?: { [key: string]: number };
}

interface ClassStudentsListProps {
  classId: string;
  students: StudentData[];
  className: string;
  studentCount: number;
  mockStudentData: StudentData[];
}

const ClassStudentsList: React.FC<ClassStudentsListProps> = ({
  classId,
  students,
  className,
  studentCount,
  mockStudentData,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof StudentData>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // 使用传入的数据，如果没有则使用mock数据
  const studentData = students.length > 0 ? students : mockStudentData;

  // 搜索过滤
  const filteredStudents = studentData.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 排序
  const sortedStudents = useMemo(() => {
    let filtered = filteredStudents.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
    return filtered;
  }, [filteredStudents, sortField, sortDirection]);

  const handleSort = (field: keyof StudentData) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getTrendIcon = (trend: number) => {
    const colors = getTrendColors(trend);
    if (trend > 0) return <TrendingUp className={`h-4 w-4 ${colors.icon}`} />;
    if (trend < 0) return <TrendingDown className={`h-4 w-4 ${colors.icon}`} />;
    return <Minus className={`h-4 w-4 ${colors.icon}`} />;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: "default" as const, label: "优秀" };
    if (score >= 80) return { variant: "secondary" as const, label: "良好" };
    if (score >= 70) return { variant: "outline" as const, label: "中等" };
    if (score >= 60) return { variant: "outline" as const, label: "及格" };
    return { variant: "destructive" as const, label: "不及格" };
  };

  // 如果没有数据，显示占位符
  if (studentData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {className} 学生列表
          </CardTitle>
          <CardDescription>
            班级ID: {classId} • 学生总数: {studentCount}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <UserCheck className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium">暂无学生数据</p>
            <p className="text-sm text-gray-400 mt-1">请先添加学生信息</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {className} 学生列表
            </CardTitle>
            <CardDescription>
              班级ID: {classId} • 学生总数: {studentData.length}
            </CardDescription>
          </div>
          <Badge variant="outline">共 {sortedStudents.length} 名学生</Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* 搜索栏 */}
        <div className="flex items-center space-x-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="搜索学生姓名或学号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            排序:{" "}
            {sortField === "averageScore"
              ? "成绩"
              : sortField === "name"
                ? "姓名"
                : "学号"}
          </Button>
        </div>

        {/* 学生表格 */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("studentId")}
                >
                  <div className="flex items-center gap-1">
                    学号
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    姓名
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("averageScore")}
                >
                  <div className="flex items-center gap-1">
                    平均分
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>趋势</TableHead>
                <TableHead>班级排名</TableHead>
                <TableHead>年级排名</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents.map((student, index) => {
                const scoreBadge = getScoreBadge(student.averageScore);
                const scoreColors = getScoreColors(student.averageScore);
                const trendColors = getTrendColors(student.trend);

                return (
                  <TableRow
                    key={student.studentId}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="font-mono text-sm">
                      {student.studentId}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-lg px-2 py-1 rounded ${scoreColors.text} ${scoreColors.background}`}
                        >
                          {student.averageScore.toFixed(1)}
                        </span>
                        <Badge variant={scoreBadge.variant} size="sm">
                          {scoreBadge.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(student.trend)}
                        <span
                          className={`text-sm font-medium ${trendColors.text}`}
                        >
                          {student.trend > 0
                            ? `+${student.trend.toFixed(1)}`
                            : student.trend < 0
                              ? student.trend.toFixed(1)
                              : "0.0"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        #{student.classRank || index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        #{student.gradeRank || "未知"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* 统计信息 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {studentData.length}
              </div>
              <div className="text-sm text-gray-600">总学生数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {(
                  studentData.reduce((sum, s) => sum + s.averageScore, 0) /
                  studentData.length
                ).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">班级平均分</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.max(...studentData.map((s) => s.averageScore)).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">最高分</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.min(...studentData.map((s) => s.averageScore)).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">最低分</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassStudentsList;
