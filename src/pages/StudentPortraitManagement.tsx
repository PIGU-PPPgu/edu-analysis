import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Search,
  Users,
  UserCircle,
  UsersIcon,
  Layers,
  BarChart3,
  Brain,
  Zap,
  ArrowLeftRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toastHelpers } from "@/components/ui/toast-helpers";
import { toast } from "@/components/ui/use-toast";

import { useQuery } from "@tanstack/react-query";
import {
  portraitAPI,
  ClassPortraitStats,
  StudentPortraitData,
  GroupPortraitData,
} from "@/lib/api/portrait";
import StudentCard from "@/components/portrait/StudentCard";
import GroupCard from "@/components/portrait/GroupCard";
import ClassOverview from "@/components/portrait/ClassOverview";
import { IntelligentPortraitAnalysis } from "@/components/portrait/advanced";
import EnhancedStudentPortrait from "@/components/portrait/advanced/EnhancedStudentPortrait";
import StudentPortraitComparison from "@/components/portrait/advanced/StudentPortraitComparison";
import StudentPortraitGenerator from "@/components/portrait/StudentPortraitGenerator";
import { supabase } from "@/integrations/supabase/client";
import { PageLoading, CardLoading } from "@/components/ui/loading";
import EmptyState from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/useDebounce";

interface Class {
  id: string;
  name: string;
  grade: string;
  student_count?: number;
}

const StudentPortraitManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("class");
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // 使用防抖优化搜索体验
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // 搜索状态指示
  const isSearching = searchQuery !== debouncedSearchQuery;

  // 从班级名称推断年级的辅助函数
  const inferGradeFromClassName = (className: string): string => {
    if (className.includes('高一') || className.includes('1班')) return '高一';
    if (className.includes('高二') || className.includes('2班')) return '高二';
    if (className.includes('高三') || className.includes('3班')) return '高三';
    if (className.includes('九') || className.includes('初三')) return '九年级';
    if (className.includes('八') || className.includes('初二')) return '八年级';
    if (className.includes('七') || className.includes('初一')) return '七年级';
    return '未知年级';
  };

  // 使用React Query获取班级数据 - 直接从students表统计班级
  const { data: classesData, isLoading: isLoadingClasses } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      try {
        // 从students表获取所有班级信息并统计学生数量
        const { data: studentData, error } = await supabase
          .from("students")
          .select("class_name, student_id, grade")
          .not("class_name", "is", null);

        if (error) throw error;

        // 按班级名称分组并统计
        const classStats = new Map();
        (studentData || []).forEach(student => {
          const className = student.class_name;
          if (!classStats.has(className)) {
            classStats.set(className, {
              id: `class-${className}`, // 生成一个临时ID
              name: className,
              grade: student.grade || inferGradeFromClassName(className),
              student_count: 0
            });
          }
          classStats.get(className).student_count++;
        });

        // 转换为数组并排序
        const classesArray = Array.from(classStats.values()).sort((a, b) => {
          // 按年级排序，然后按班级名称排序
          if (a.grade !== b.grade) {
            return a.grade.localeCompare(b.grade);
          }
          return a.name.localeCompare(b.name);
        });

        console.log('✅ 从students表获取到班级列表:', classesArray.length, '个班级');
        return classesArray;
      } catch (error) {
        console.error("获取班级列表失败:", error);
        toastHelpers.loadError("班级列表");
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5分钟内数据不会重新获取
    refetchOnWindowFocus: false,
  });

  // 使用React Query获取班级学生数据
  const { data: students, isLoading: isLoadingStudents } = useQuery<
    StudentPortraitData[]
  >({
    queryKey: ["students", selectedClassId],
    queryFn: () => portraitAPI.getClassStudents(selectedClassId!),
    enabled: !!selectedClassId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 使用React Query获取班级小组数据
  const { data: groups, isLoading: isLoadingGroups } = useQuery<
    GroupPortraitData[]
  >({
    queryKey: ["groups", selectedClassId],
    queryFn: () => portraitAPI.getClassGroups(selectedClassId!),
    enabled: !!selectedClassId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 使用React Query获取班级统计数据
  const { data: classStats, isLoading: isLoadingClassStats } =
    useQuery<ClassPortraitStats | null>({
      queryKey: ["classStats", selectedClassId],
      queryFn: () => portraitAPI.getClassPortraitStats(selectedClassId!),
      enabled: !!selectedClassId,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

  useEffect(() => {
    if (classesData && classesData.length > 0) {
      setClasses(classesData);

      if (!selectedClassId) {
        setSelectedClassId(classesData[0].id);
      }
    }
  }, [classesData, selectedClassId]);

  useEffect(() => {
    if (selectedClassId && classes.length > 0) {
      const selected = classes.find((c) => c.id === selectedClassId) || null;
      setSelectedClass(selected);
    }
  }, [selectedClassId, classes]);

  // 使用useCallback避免不必要的重新创建
  const handleViewStudentProfile = useCallback(
    (studentId: string) => {
      navigate(`/student-profile/${studentId}`);
    },
    [navigate]
  );

  // 处理学生选择，用于智能画像分析
  const handleSelectStudent = useCallback((studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab("smart-portrait");
  }, []);

  const handleClassChange = useCallback((classId: string) => {
    setSelectedClassId(classId);
    setActiveTab("class");
    // 重置搜索查询
    setSearchQuery("");
  }, []);

  const handleViewClassPortrait = useCallback((classId: string) => {
    // 暂时使用toast，后续实现班级画像页面
    toastHelpers.developing("班级画像");
    // navigate(`/class-portrait/${classId}`);
  }, []);

  const handleViewGroupPortrait = useCallback((groupId: string) => {
    // 暂时使用toast，后续实现小组画像页面
    toastHelpers.developing("小组画像");
    // navigate(`/group-portrait/${groupId}`);
  }, []);

  // 过滤数据 - 使用useMemo优化性能，使用防抖搜索
  const filteredClasses = React.useMemo(() => {
    return classes.filter(
      (cls) =>
        cls.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        cls.grade.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [classes, debouncedSearchQuery]);

  const filteredStudents = React.useMemo(() => {
    return (
      students?.filter(
        (student) =>
          student.name
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          student.student_id
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase())
      ) || []
    );
  }, [students, debouncedSearchQuery]);

  const filteredGroups = React.useMemo(() => {
    return (
      groups?.filter(
        (group) =>
          group.name
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          (group.description &&
            group.description
              .toLowerCase()
              .includes(debouncedSearchQuery.toLowerCase()))
      ) || []
    );
  }, [groups, debouncedSearchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">学生画像管理</h1>
              <p className="text-muted-foreground mt-1">
                查看班级、小组和学生的全方位分析画像
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* 左侧班级列表 */}
            <div className="col-span-12 md:col-span-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Layers className="h-5 w-5 mr-2" />
                    班级列表
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索班级..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                      <div className="absolute right-2.5 top-2.5">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                    {isLoadingClasses ? (
                      <CardLoading text="加载班级列表..." />
                    ) : filteredClasses.length === 0 ? (
                      <EmptyState
                        icon={AlertCircle}
                        title="没有找到班级"
                        description={
                          searchQuery
                            ? "没有匹配的班级，请尝试其他关键词"
                            : "暂无班级数据"
                        }
                        size="sm"
                      />
                    ) : (
                      filteredClasses.map((cls) => (
                        <div
                          key={cls.id}
                          className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${
                            selectedClassId === cls.id
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => handleClassChange(cls.id)}
                        >
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            <div>
                              <span className="font-medium">{cls.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {cls.grade}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {cls.student_count || 0}人
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧内容 */}
            <div className="col-span-12 md:col-span-9">
              {selectedClass ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{selectedClass.name} 画像管理</CardTitle>
                        <CardDescription>
                          {selectedClass.grade} | {students?.length || 0}名学生
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          handleViewClassPortrait(selectedClass.id)
                        }
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        查看班级画像
                      </Button>
                    </div>
                  </CardHeader>

                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="px-6">
                      <TabsList className="grid w-full grid-cols-7">
                        <TabsTrigger
                          value="class"
                          className="flex items-center text-xs"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          班级
                        </TabsTrigger>
                        <TabsTrigger
                          value="group"
                          className="flex items-center text-xs"
                        >
                          <UsersIcon className="h-4 w-4 mr-1" />
                          小组
                        </TabsTrigger>
                        <TabsTrigger
                          value="student"
                          className="flex items-center text-xs"
                        >
                          <UserCircle className="h-4 w-4 mr-1" />
                          学生
                        </TabsTrigger>
                        <TabsTrigger
                          value="smart-portrait"
                          className="flex items-center text-xs"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          智能画像
                        </TabsTrigger>
                        <TabsTrigger
                          value="ai-analysis"
                          className="flex items-center text-xs"
                        >
                          <Brain className="h-4 w-4 mr-1" />
                          AI分析
                        </TabsTrigger>
                        <TabsTrigger
                          value="enhanced-analysis"
                          className="flex items-center text-xs"
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          增强分析
                        </TabsTrigger>
                        <TabsTrigger
                          value="comparison"
                          className="flex items-center text-xs"
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          对比分析
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <CardContent className="pt-6">
                      <TabsContent value="class" className="mt-0">
                        <ClassOverview
                          classId={selectedClass.id}
                          className={selectedClass.name}
                          stats={classStats}
                          onViewClassPortrait={handleViewClassPortrait}
                          isLoading={isLoadingClassStats}
                        />
                      </TabsContent>

                      <TabsContent value="group" className="mt-0">
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="搜索小组..."
                              className="pl-8"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {isSearching && (
                              <div className="absolute right-2.5 top-2.5">
                                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>

                          {isLoadingGroups ? (
                            <PageLoading text="加载小组数据..." />
                          ) : filteredGroups.length === 0 ? (
                            <EmptyState
                              icon={UsersIcon}
                              title="没有找到小组"
                              description={
                                searchQuery
                                  ? "没有匹配的小组，请尝试其他关键词"
                                  : "该班级暂无小组数据"
                              }
                              action={{
                                label: "创建小组",
                                onClick: () =>
                                  toast({
                                    description: "小组创建功能正在开发中",
                                  }),
                                variant: "outline",
                              }}
                            />
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {filteredGroups.map((group) => (
                                <GroupCard
                                  key={group.id}
                                  group={group}
                                  onView={handleViewGroupPortrait}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="student" className="mt-0">
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="搜索学生姓名或学号..."
                              className="pl-8"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {isSearching && (
                              <div className="absolute right-2.5 top-2.5">
                                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>

                          {isLoadingStudents ? (
                            <PageLoading text="加载学生数据..." />
                          ) : filteredStudents.length === 0 ? (
                            <EmptyState
                              icon={UserCircle}
                              title="没有找到学生"
                              description={
                                searchQuery
                                  ? "没有匹配的学生，请尝试其他关键词"
                                  : "该班级暂无学生数据"
                              }
                              action={{
                                label: "添加学生",
                                onClick: () =>
                                  toast({
                                    description:
                                      "学生添加功能请前往学生管理页面",
                                  }),
                                variant: "outline",
                              }}
                            />
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              {filteredStudents.map((student) => (
                                <StudentCard
                                  key={student.id}
                                  student={student}
                                  onView={handleViewStudentProfile}
                                  onSmartAnalysis={handleSelectStudent}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="smart-portrait" className="mt-0">
                        {selectedStudentId ? (
                          <StudentPortraitGenerator 
                            studentId={selectedStudentId}
                            className={selectedClass?.name}
                          />
                        ) : (
                          <div className="text-center py-20">
                            <Sparkles className="h-16 w-16 text-muted-foreground/50 mb-4 mx-auto" />
                            <p className="text-lg font-medium mb-2">AI智能画像生成</p>
                            <p className="text-sm text-muted-foreground text-center max-w-md mx-auto">
                              请先从"学生"标签页选择一个学生，或点击学生卡片上的"智能画像"按钮
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="ai-analysis" className="mt-0">
                        <IntelligentPortraitAnalysis />
                      </TabsContent>

                      <TabsContent value="enhanced-analysis" className="mt-0">
                        <EnhancedStudentPortrait />
                      </TabsContent>

                      <TabsContent value="comparison" className="mt-0">
                        <StudentPortraitComparison />
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium mb-2">请选择一个班级</p>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      从左侧列表选择一个班级，查看班级、小组和学生的画像分析
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPortraitManagement;
