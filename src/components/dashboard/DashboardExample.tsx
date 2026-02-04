import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import AdvancedAnalyticsDashboard from "@/components/analysis/dashboard/AdvancedAnalyticsDashboard_Fixed";
import {
  BookOpen,
  Users,
  User,
  School,
  BarChart3,
  Eye,
  Settings,
  Info,
} from "lucide-react";

/**
 * 仪表板使用示例组件
 * 展示如何在实际应用中集成和使用高级分析仪表板
 */
export const DashboardExample: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [viewMode, setViewMode] = useState<"demo" | "live">("demo");

  // 模拟数据
  const mockClasses = [
    { id: "class-001", name: "高一(1)班", studentCount: 45 },
    { id: "class-002", name: "高一(2)班", studentCount: 43 },
    { id: "class-003", name: "高一(3)班", studentCount: 44 },
    { id: "class-004", name: "高二(1)班", studentCount: 42 },
    { id: "class-005", name: "高二(2)班", studentCount: 41 },
  ];

  const mockStudents = [
    { id: "student-001", name: "张三", classId: "class-001" },
    { id: "student-002", name: "李四", classId: "class-001" },
    { id: "student-003", name: "王五", classId: "class-001" },
    { id: "student-004", name: "赵六", classId: "class-002" },
    { id: "student-005", name: "钱七", classId: "class-002" },
  ];

  const mockSubjects = [
    { id: "subject-001", name: "数学", code: "MATH" },
    { id: "subject-002", name: "语文", code: "CHINESE" },
    { id: "subject-003", name: "英语", code: "ENGLISH" },
    { id: "subject-004", name: "物理", code: "PHYSICS" },
    { id: "subject-005", name: "化学", code: "CHEMISTRY" },
  ];

  // 过滤学生（基于选中的班级）
  const filteredStudents = selectedClass
    ? mockStudents.filter((student) => student.classId === selectedClass)
    : mockStudents;

  const handleStartAnalysis = () => {
    if (!selectedClass) {
      alert("请先选择一个班级");
      return;
    }
    setViewMode("live");
  };

  const handleResetDemo = () => {
    setSelectedClass("");
    setSelectedStudent("");
    setSelectedSubject("");
    setViewMode("demo");
  };

  if (viewMode === "live") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 顶部控制栏 */}
        <div className="bg-white border-b p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleResetDemo}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                返回配置
              </Button>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <School className="h-4 w-4" />
                <span>当前配置:</span>
                {selectedClass && (
                  <Badge variant="secondary">
                    班级:{" "}
                    {mockClasses.find((c) => c.id === selectedClass)?.name}
                  </Badge>
                )}
                {selectedStudent && (
                  <Badge variant="secondary">
                    学生:{" "}
                    {mockStudents.find((s) => s.id === selectedStudent)?.name}
                  </Badge>
                )}
                {selectedSubject && (
                  <Badge variant="secondary">
                    学科:{" "}
                    {mockSubjects.find((s) => s.id === selectedSubject)?.name}
                  </Badge>
                )}
              </div>
            </div>

            <Badge variant="outline" className="gap-1">
              <Eye className="h-3 w-3" />
              实时分析模式
            </Badge>
          </div>
        </div>

        {/* 仪表板主体 */}
        <AdvancedAnalyticsDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 标题和说明 */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">
            高级分析仪表板集成示例
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            本示例展示了如何配置和使用高级分析仪表板。选择相应的参数后，
            您将看到一个功能完整的分析界面，包含18个专业分析模块。
          </p>
        </div>

        {/* 功能特性展示 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-semibold">18个分析模块</h3>
              <p className="text-sm text-gray-600">
                涵盖相关性、预测、画像等分析
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-semibold">6大分析类别</h3>
              <p className="text-sm text-gray-600">系统化的分析功能分类</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-semibold">智能化界面</h3>
              <p className="text-sm text-gray-600">搜索、筛选、导出等功能</p>
            </CardContent>
          </Card>
        </div>

        {/* 配置面板 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              分析配置
            </CardTitle>
            <CardDescription>
              请选择要分析的班级、学生和学科。班级是必选项，学生和学科为可选项。
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 班级选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <School className="h-4 w-4" />
                选择班级 <span className="text-red-500">*</span>
              </label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择班级" />
                </SelectTrigger>
                <SelectContent>
                  {mockClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{cls.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {cls.studentCount}人
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 学生选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                选择学生 <span className="text-gray-400">(可选)</span>
              </label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={selectedClass ? "请选择学生" : "请先选择班级"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">不限制学生</SelectItem>
                  {filteredStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 学科选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                选择学科 <span className="text-gray-400">(可选)</span>
              </label>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择学科" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">不限制学科</SelectItem>
                  {mockSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <span>{subject.name}</span>
                        <Badge variant="outline">{subject.code}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleStartAnalysis}
                disabled={!selectedClass}
                className="flex-1"
              >
                启动分析仪表板
              </Button>

              <Button
                variant="outline"
                onClick={handleResetDemo}
                disabled={
                  !selectedClass && !selectedStudent && !selectedSubject
                }
              >
                重置配置
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 帮助信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              使用说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0">
                  1
                </Badge>
                <p>选择一个班级作为分析对象（必选）</p>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0">
                  2
                </Badge>
                <p>可选择特定学生进行个性化分析（可选）</p>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0">
                  3
                </Badge>
                <p>可选择特定学科进行专项分析（可选）</p>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0">
                  4
                </Badge>
                <p>点击"启动分析仪表板"进入完整的分析界面</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 技术信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">技术实现</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">核心组件</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 相关性分析 (2个模块)</li>
                  <li>• 异常检测 (2个模块)</li>
                  <li>• 预测分析 (2个模块)</li>
                  <li>• 学生画像 (3个模块)</li>
                  <li>• 统计分析 (2个模块)</li>
                  <li>• 对比分析 (4个模块)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">技术栈</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• React 18 + TypeScript</li>
                  <li>• Recharts + Nivo 图表库</li>
                  <li>• Tailwind CSS + shadcn/ui</li>
                  <li>• Supabase 数据库</li>
                  <li>• 响应式设计</li>
                  <li>• 模块化架构</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardExample;
