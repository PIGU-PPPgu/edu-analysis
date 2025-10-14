import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Users,
  ChartPieIcon,
  FileBarChart,
  Brain,
  Filter,
  ArrowUpDown,
  Loader2,
  BarChart3,
  BookOpen,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Calendar,
  Maximize2,
  Minimize2,
  Clock,
  X,
  Star,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import CreateClassDialog from "@/components/class/CreateClassDialog";
import OverviewTab from "@/components/class/OverviewTab";
import DetailTab from "@/components/class/DetailTab";
import ComparisonTab from "@/components/class/ComparisonTab";
import SubjectAnalysisTab from "@/components/class/SubjectAnalysisTab";
import StudentsTab from "@/components/class/StudentsTab";
import AnalysisTab from "@/components/class/AnalysisTab";
import PortraitTab from "@/components/class/PortraitTab";
// 智能画像功能组件
import ClassPortraitDashboard from "@/components/class/ClassPortraitDashboard";
import SmartGroupManager from "@/components/group/SmartGroupManager";
import GroupPortraitAnalysis from "@/components/group/GroupPortraitAnalysis";
// import ClassReportGenerator from "@/components/analysis/ClassReportGenerator"; // 已删除
// import AIDataAnalysis from "@/components/analysis/AIDataAnalysis"; // 已删除
import {
  getAllClasses,
  getAllClassesAnalysisData,
  getSubjectAnalysisData,
  deleteClass,
} from "@/services/classService";
import { SmartPagination } from "@/components/ui/smart-pagination";
import { supabase } from "@/integrations/supabase/client";
import {
  intelligentPortraitService,
  type GroupAllocationResult,
} from "@/services/intelligentPortraitService";

// 定义班级类型
interface Class {
  id: string;
  name: string;
  grade: string;
  created_at?: string;
  studentCount?: number;
  homeworkCount?: number;
  averageScore?: number;
  excellentRate?: number;
  // 新增维度
  passRate?: number;
  knowledgeMastery?: number;
  problemSolvingAbility?: number;
  learningAttitude?: number;
  examStability?: number;
  // 预警和考试信息
  warningCount?: number; // 处于预警状态的学生数量
  lastExamTitle?: string; // 最近一次考试名称
  lastExamDate?: string; // 最近一次考试日期
}

// 分析数据类型
interface AnalysisData {
  boxPlotData: Record<string, any[]>;
  trendData: Record<string, any[]>;
  competencyData: Record<string, any[]>;
}

// 学科分析数据类型
interface SubjectAnalysisData {
  performance: Record<string, any[]>;
  correlation: Record<string, number>;
  trends: Record<string, any[]>;
  knowledgePoints: Record<string, any[]>;
}

// 定义缓存类型
interface DataCache {
  subjectAnalysis: Record<
    string,
    {
      data: SubjectAnalysisData | null;
      timestamp: number;
    }
  >;
}

const ClassManagement: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [allFetchedClasses, setAllFetchedClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("name_asc");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // 年级折叠状态
  const [collapsedGrades, setCollapsedGrades] = useState<Set<string>>(
    new Set()
  );

  // 最近访问班级（只存储ID）
  const [recentClassIds, setRecentClassIds] = useState<string[]>([]);

  // 收藏班级
  const [favoriteClassIds, setFavoriteClassIds] = useState<Set<string>>(
    new Set()
  );

  // 新增 - 分析数据状态
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    boxPlotData: {},
    trendData: {},
    competencyData: {},
  });

  // 新增 - 学科分析数据状态
  const [subjectAnalysisData, setSubjectAnalysisData] =
    useState<SubjectAnalysisData | null>(null);
  const [subjectAnalysisLoading, setSubjectAnalysisLoading] = useState(false);

  // 添加数据缓存机制
  const dataCache = useRef<DataCache>({
    subjectAnalysis: {},
  });

  // 缓存过期时间（10分钟）
  const CACHE_EXPIRY = 10 * 60 * 1000;

  // 添加错误状态
  const [subjectAnalysisError, setSubjectAnalysisError] = useState<
    string | null
  >(null);

  // 智能画像相关状态
  const [studentsWithScores, setStudentsWithScores] = useState<
    Array<{
      student_id: string;
      name: string;
      class_name: string;
      overall_score?: number;
    }>
  >([]);
  const [existingGroups, setExistingGroups] = useState<
    Array<{
      id: string;
      name: string;
      description?: string;
      class_name: string;
      student_ids: string[];
      group_type: string;
      allocation_strategy?: string;
      created_at: string;
      status: string;
      group_metrics: any;
      performance_prediction?: number;
      balance_scores: any;
    }>
  >([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [smartPortraitLoading, setSmartPortraitLoading] = useState(false);
  const [smartPortraitDataLoaded, setSmartPortraitDataLoaded] = useState(false);

  // 获取班级列表
  const fetchClasses = async () => {
    setLoading(true);
    try {
      const classesData = await getAllClasses();
      setAllFetchedClasses(classesData);

      // 🚀 性能优化：移除自动加载所有班级的分析数据
      // 改为在用户选择特定班级和标签页时按需加载
      // 这大幅减少初始加载时间

      // 默认选择第一个班级
      if (classesData.length > 0 && !selectedClass) {
        setSelectedClass(classesData[0]);
      }
    } catch (error) {
      console.error("获取班级列表失败:", error);
      toast.error("获取班级列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 从localStorage加载最近访问班级ID和收藏
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentClassIds");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentClassIds(parsed.slice(0, 5)); // 最多5个
      }

      const favorites = localStorage.getItem("favoriteClasses");
      if (favorites) {
        const parsed = JSON.parse(favorites);
        setFavoriteClassIds(new Set(parsed));
      }
    } catch (error) {
      console.error("加载最近访问班级失败:", error);
    }
  }, []);

  // 搜索防抖：延迟300ms更新debouncedSearchTerm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 添加班级到最近访问列表（只存储ID）
  const addToRecentClasses = useCallback((classItem: Class) => {
    setRecentClassIds((prev) => {
      // 移除重复项
      const filtered = prev.filter((id) => id !== classItem.id);
      // 添加到开头
      const updated = [classItem.id, ...filtered].slice(0, 5);
      // 保存到localStorage
      try {
        localStorage.setItem("recentClassIds", JSON.stringify(updated));
      } catch (error) {
        console.error("保存最近访问班级失败:", error);
      }
      return updated;
    });
  }, []);

  // 清除最近访问历史
  const clearRecentClasses = useCallback(() => {
    setRecentClassIds([]);
    try {
      localStorage.removeItem("recentClassIds");
    } catch (error) {
      console.error("清除最近访问班级失败:", error);
    }
  }, []);

  // 切换班级收藏状态
  const toggleFavorite = useCallback(
    (classId: string, e: React.MouseEvent) => {
      e.stopPropagation(); // 防止触发班级点击事件

      // 先获取班级名称用于toast提示
      const className =
        allFetchedClasses.find((c) => c.id === classId)?.name || "该班级";

      setFavoriteClassIds((prev) => {
        const newSet = new Set(prev);
        const isAdding = !newSet.has(classId);

        if (newSet.has(classId)) {
          newSet.delete(classId);
          toast.success(`已取消收藏 ${className}`);
        } else {
          newSet.add(classId);
          toast.success(`已收藏 ${className}`);
        }

        // 保存到localStorage
        try {
          localStorage.setItem(
            "favoriteClasses",
            JSON.stringify(Array.from(newSet))
          );
        } catch (error) {
          console.error("保存收藏失败:", error);
          toast.error("保存收藏失败，请重试");
        }
        return newSet;
      });
    },
    [allFetchedClasses]
  );

  // 获取学科分析数据 - 再次优化版本
  const fetchSubjectAnalysisData = async (
    classId: string,
    forceRefresh = false
  ) => {
    if (!classId) return;

    setSubjectAnalysisLoading(true);
    setSubjectAnalysisError(null); // 重置错误状态

    // 检查缓存
    const cachedData = dataCache.current.subjectAnalysis[classId];
    const now = Date.now();

    if (
      !forceRefresh &&
      cachedData &&
      now - cachedData.timestamp < CACHE_EXPIRY
    ) {
      // 使用缓存数据
      setSubjectAnalysisData(cachedData.data);
      setSubjectAnalysisLoading(false);
      return;
    }

    try {
      const data = await getSubjectAnalysisData(classId);

      // 更新缓存
      dataCache.current.subjectAnalysis[classId] = {
        data,
        timestamp: now,
      };

      setSubjectAnalysisData(data);
    } catch (error: any) {
      console.error("获取学科分析数据失败:", error);
      setSubjectAnalysisError(error?.message || "数据加载失败");
      toast.error("获取学科分析数据失败");
      // 保留以前的数据，如果有的话
      if (!forceRefresh && cachedData) {
        setSubjectAnalysisData(cachedData.data);
      } else {
        setSubjectAnalysisData(null);
      }
    } finally {
      setSubjectAnalysisLoading(false);
    }
  };

  // 处理刷新学科数据
  const handleRefreshSubjectData = () => {
    if (selectedClass) {
      fetchSubjectAnalysisData(selectedClass.id, true);
    }
  };

  // 处理返回总览
  const handleBackToOverview = () => {
    setSelectedTab("overview");
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // 修改标签页切换效果，保持缓存数据状态
  useEffect(() => {
    if (selectedClass && selectedTab === "subject-analysis") {
      // 切换到学科分析标签页时，确保数据加载
      fetchSubjectAnalysisData(selectedClass.id);
    }
    // 移除自动加载智能画像数据，改为按需加载
  }, [selectedClass, selectedTab]);

  // 加载智能画像相关数据
  const loadSmartPortraitData = async () => {
    if (!selectedClass?.name) return;
    if (smartPortraitDataLoaded && studentsWithScores.length > 0) return; // 避免重复加载

    setSmartPortraitLoading(true);
    try {
      // 优化：使用JOIN一次性获取学生及其最新成绩
      const { data: studentsWithGrades, error: studentsError } = await supabase
        .from("students")
        .select(
          `
          student_id, 
          name, 
          class_name,
          grade_data_new!inner(total_score, exam_date)
        `
        )
        .eq("class_name", selectedClass.name)
        .order("grade_data_new(exam_date)", { ascending: false })
        .limit(1);

      if (studentsError) {
        // 如果JOIN查询失败，回退到简单查询
        console.warn("JOIN查询失败，使用简单查询:", studentsError);
        const { data: simpleStudentsData, error: simpleError } = await supabase
          .from("students")
          .select("student_id, name, class_name")
          .eq("class_name", selectedClass.name);

        if (simpleError) throw simpleError;

        // 简化版：不查询成绩，设置默认值
        const studentsWithScoresData = (simpleStudentsData || []).map(
          (student) => ({
            ...student,
            overall_score: 0,
          })
        );

        setStudentsWithScores(studentsWithScoresData);
      } else {
        // 处理JOIN查询结果
        const studentsWithScoresData = (studentsWithGrades || []).map(
          (student: any) => ({
            student_id: student.student_id,
            name: student.name,
            class_name: student.class_name,
            overall_score: student.grade_data_new?.[0]?.total_score || 0,
          })
        );

        setStudentsWithScores(studentsWithScoresData);
      }

      // 加载现有分组 - 添加错误处理
      try {
        const { data: groupsData, error: groupsError } = await supabase
          .from("student_groups")
          .select("*")
          .eq("class_name", selectedClass.name)
          .eq("status", "active");

        if (groupsError) {
          // 如果表不存在，设置为空数组
          console.warn("student_groups表查询失败，可能表不存在:", groupsError);
          setExistingGroups([]);
        } else {
          setExistingGroups(groupsData || []);
        }
      } catch (groupError) {
        console.warn("加载分组数据失败:", groupError);
        setExistingGroups([]);
      }
    } catch (error) {
      console.error("加载智能画像数据失败:", error);
      // 设置默认空状态而不是显示错误
      setStudentsWithScores([]);
      setExistingGroups([]);
    } finally {
      setSmartPortraitLoading(false);
      setSmartPortraitDataLoaded(true);
    }
  };

  // 处理智能分组创建
  const handleGroupsCreated = async (groups: GroupAllocationResult[]) => {
    try {
      // 保存分组到数据库
      for (const group of groups) {
        const { error } = await supabase.from("student_groups").insert({
          name: group.group_name,
          description: `AI智能分组 - 预测表现: ${group.predicted_performance}分`,
          class_name: selectedClass?.name,
          student_ids: group.members.map((m) => m.student_id),
          group_type: "ai_generated",
          allocation_strategy: "balanced",
          group_metrics: {
            member_roles: group.members.reduce(
              (acc, m) => ({ ...acc, [m.student_id]: m.role }),
              {}
            ),
            contribution_scores: group.members.reduce(
              (acc, m) => ({ ...acc, [m.student_id]: m.contribution_score }),
              {}
            ),
          },
          performance_prediction: group.predicted_performance,
          balance_scores: group.group_balance,
        });

        if (error) throw error;
      }

      toast.success(`成功创建${groups.length}个智能分组`);
      await loadSmartPortraitData(); // 重新加载数据
    } catch (error) {
      console.error("保存分组失败:", error);
      toast.error("保存分组失败");
    }
  };

  // 筛选并排序班级列表
  const displayedClasses = useMemo(() => {
    if (!allFetchedClasses || allFetchedClasses.length === 0) {
      return [];
    }

    let filtered = allFetchedClasses.filter(
      (cls) =>
        cls &&
        cls.name &&
        cls.grade &&
        (cls.name
          .toLowerCase()
          .includes((debouncedSearchTerm || "").toLowerCase()) ||
          cls.grade
            .toLowerCase()
            .includes((debouncedSearchTerm || "").toLowerCase()))
    );

    // 如果启用了"仅显示收藏",进一步过滤
    if (showFavoritesOnly) {
      filtered = filtered.filter((cls) => favoriteClassIds.has(cls.id));
    }

    // 不在这里排序，排序将在 groupedByGrade 中按年级组进行
    return filtered;
  }, [
    allFetchedClasses,
    debouncedSearchTerm,
    sortOption,
    favoriteClassIds,
    showFavoritesOnly,
  ]);

  // 从ID获取最近访问的班级完整数据（保证数据新鲜）
  const recentClasses = useMemo(() => {
    if (!allFetchedClasses || recentClassIds.length === 0) return [];

    return recentClassIds
      .map((id) => allFetchedClasses.find((cls) => cls.id === id))
      .filter((cls): cls is Class => cls !== undefined);
  }, [recentClassIds, allFetchedClasses]);

  // 按年级分组班级
  const groupedByGrade = useMemo(() => {
    const groups = new Map<string, Class[]>();

    displayedClasses.forEach((cls) => {
      const grade = cls.grade || "未知年级";
      if (!groups.has(grade)) {
        groups.set(grade, []);
      }
      groups.get(grade)!.push(cls);
    });

    // 对每个年级组内的班级进行排序
    groups.forEach((classes) => {
      classes.sort((a, b) => {
        // 首先按收藏状态排序
        const aFav = favoriteClassIds.has(a.id) ? 1 : 0;
        const bFav = favoriteClassIds.has(b.id) ? 1 : 0;
        if (bFav !== aFav) return bFav - aFav;

        // 然后按用户选择的排序选项排序
        switch (sortOption) {
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "name_desc":
            return b.name.localeCompare(a.name);
          case "students_asc":
            return (a.studentCount || 0) - (b.studentCount || 0);
          case "students_desc":
            return (b.studentCount || 0) - (a.studentCount || 0);
          case "avg_score_asc":
            return (a.averageScore || 0) - (b.averageScore || 0);
          case "avg_score_desc":
            return (b.averageScore || 0) - (a.averageScore || 0);
          default:
            return 0;
        }
      });
    });

    // 按年级排序
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      const gradeOrder = ["初一", "初二", "初三", "高一", "高二", "高三"];
      const indexA = gradeOrder.findIndex((g) => a[0].includes(g));
      const indexB = gradeOrder.findIndex((g) => b[0].includes(g));
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });

    return sortedGroups;
  }, [displayedClasses, favoriteClassIds, sortOption]);

  // 初始化折叠状态：默认全部折叠
  useEffect(() => {
    if (groupedByGrade.length > 0 && collapsedGrades.size === 0) {
      const allGrades = new Set(groupedByGrade.map(([grade]) => grade));
      setCollapsedGrades(allGrades);
    }
  }, [groupedByGrade]);

  // 搜索时自动展开匹配的年级
  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.trim() !== "") {
      // 找出包含匹配班级的年级
      const gradesWithMatches = new Set<string>();
      groupedByGrade.forEach(([grade, classes]) => {
        if (classes.length > 0) {
          gradesWithMatches.add(grade);
        }
      });

      // 只展开包含匹配班级的年级，折叠其他年级
      const allGrades = new Set(groupedByGrade.map(([grade]) => grade));
      const gradesToCollapse = new Set(
        Array.from(allGrades).filter((grade) => !gradesWithMatches.has(grade))
      );
      setCollapsedGrades(gradesToCollapse);
    }
  }, [debouncedSearchTerm, groupedByGrade]);

  // 切换年级折叠状态
  const toggleGradeCollapse = (grade: string) => {
    setCollapsedGrades((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(grade)) {
        newSet.delete(grade);
      } else {
        newSet.add(grade);
      }
      return newSet;
    });
  };

  // 展开全部年级
  const expandAllGrades = () => {
    setCollapsedGrades(new Set());
  };

  // 折叠全部年级
  const collapseAllGrades = () => {
    const allGrades = new Set(groupedByGrade.map(([grade]) => grade));
    setCollapsedGrades(allGrades);
  };

  // 导航到班级画像页面
  const handleViewClassProfile = (classId: string) => {
    navigate(`/class-profile/${classId}`);
  };

  // 处理班级卡片点击
  const handleClassClick = (classItem: Class) => {
    setSelectedClass(classItem);
    setSelectedTab("overview");

    // 添加到最近访问
    addToRecentClasses(classItem);

    // 重置智能画像数据状态
    setSmartPortraitDataLoaded(false);
    setStudentsWithScores([]);
    setExistingGroups([]);
    setSelectedGroup(null);

    // 预加载学科分析数据
    preloadSubjectAnalysisData(classItem.id);
  };

  // 预加载数据函数
  const preloadSubjectAnalysisData = useCallback(
    async (classId: string) => {
      // 检查缓存
      const cachedData = dataCache.current.subjectAnalysis[classId];
      const now = Date.now();

      if (cachedData && now - cachedData.timestamp < CACHE_EXPIRY) {
        // 使用缓存数据
        setSubjectAnalysisData(cachedData.data);
        return;
      }

      // 无缓存或缓存过期，静默加载数据
      try {
        const data = await getSubjectAnalysisData(classId);

        // 更新缓存
        dataCache.current.subjectAnalysis[classId] = {
          data,
          timestamp: now,
        };

        // 只有在当前选中的班级匹配时才更新状态
        if (selectedClass?.id === classId) {
          setSubjectAnalysisData(data);
        }
      } catch (error) {
        console.error("预加载学科分析数据失败:", error);
        // 静默失败，不显示错误提示，等用户实际切换到对应标签页时再处理
      }
    },
    [selectedClass]
  );

  // 处理查看学生
  const handleViewStudents = (classId: string, className: string) => {
    navigate(
      `/student-management?classId=${classId}&className=${encodeURIComponent(className)}`
    );
  };

  // 处理删除班级
  const handleDeleteClass = async (
    classId: string,
    className: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // 防止触发卡片点击

    if (
      !confirm(
        `确定要删除班级"${className}"吗？此操作不可恢复，相关的学生、作业等数据也可能被删除。`
      )
    ) {
      return;
    }

    try {
      const success = await deleteClass(classId);
      if (success) {
        // 如果当前选中的班级被删除，清空选中状态
        if (selectedClass?.id === classId) {
          setSelectedClass(null);
        }

        // 从最近访问中移除
        setRecentClassIds((prev) => {
          const updated = prev.filter((id) => id !== classId);
          try {
            localStorage.setItem("recentClassIds", JSON.stringify(updated));
          } catch (error) {
            console.error("更新最近访问失败:", error);
          }
          return updated;
        });

        // 从收藏中移除
        setFavoriteClassIds((prev) => {
          if (prev.has(classId)) {
            const newSet = new Set(prev);
            newSet.delete(classId);
            try {
              localStorage.setItem(
                "favoriteClasses",
                JSON.stringify(Array.from(newSet))
              );
            } catch (error) {
              console.error("更新收藏失败:", error);
            }
            return newSet;
          }
          return prev;
        });

        await fetchClasses(); // 重新获取班级列表
        toast.success(`班级"${className}"已删除`);
      }
    } catch (error) {
      console.error("删除班级失败:", error);
      toast.error("删除班级失败");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            班级管理
          </h1>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            variant="outline"
            className="bg-[#B9FF66] hover:bg-[#A8F055] text-black dark:bg-[#B9FF66] dark:hover:bg-[#A8F055] dark:text-black border-[#B9FF66]"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            创建新班级
          </Button>
        </div>

        <Card className="mb-6 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">
              班级列表与概览
            </CardTitle>
            <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
              管理您的班级，查看班级学生、平均分和优秀率等关键指标。点击班级卡片切换下方详细视图。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 最近访问班级 */}
            {recentClasses.length > 0 && (
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      最近访问
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {recentClasses.length}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentClasses}
                    className="h-7 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="h-3 w-3 mr-1" />
                    清除
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {recentClasses.map((classItem) => (
                    <Card
                      key={classItem.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedClass?.id === classItem.id
                          ? "ring-2 ring-[#B9FF66] border-[#B9FF66]"
                          : "border-gray-200 dark:border-gray-700 hover:border-[#B9FF66]"
                      }`}
                      onClick={() => handleClassClick(classItem)}
                    >
                      <CardContent className="p-3 space-y-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1.5">
                          {classItem.name}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {classItem.studentCount ?? "N/A"}
                          </span>
                          {classItem.averageScore && (
                            <span className="font-medium text-[#5E9622] dark:text-[#B9FF66]">
                              {classItem.averageScore.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {classItem.excellentRate !== undefined && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            优秀率: {classItem.excellentRate.toFixed(0)}%
                          </div>
                        )}
                        {classItem.warningCount !== undefined &&
                          classItem.warningCount > 0 && (
                            <div className="flex items-center text-xs text-orange-600 dark:text-orange-400">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {classItem.warningCount}人
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-grow">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="筛选班级名称或年级..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-[200px] dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <ArrowUpDown className="mr-2 h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:text-white">
                  <SelectItem value="name_asc">名称 (A-Z)</SelectItem>
                  <SelectItem value="name_desc">名称 (Z-A)</SelectItem>
                  <SelectItem value="students_asc">学生数 (少-多)</SelectItem>
                  <SelectItem value="students_desc">学生数 (多-少)</SelectItem>
                  <SelectItem value="avg_score_asc">平均分 (低-高)</SelectItem>
                  <SelectItem value="avg_score_desc">平均分 (高-低)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={expandAllGrades}
                className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                展开全部
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAllGrades}
                className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                折叠全部
              </Button>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={
                  showFavoritesOnly
                    ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                    : "dark:bg-gray-700 dark:text-white dark:border-gray-600"
                }
                disabled={favoriteClassIds.size === 0}
              >
                <Star
                  className={`h-4 w-4 mr-2 ${showFavoritesOnly ? "fill-current" : ""}`}
                />
                {showFavoritesOnly ? "显示全部" : "仅收藏"}
                {favoriteClassIds.size > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {favoriteClassIds.size}
                  </Badge>
                )}
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card
                    key={index}
                    className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg shadow animate-pulse"
                  >
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-1"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-3"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                      <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : displayedClasses.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                {showFavoritesOnly ? (
                  <>
                    <Star className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-lg font-semibold">没有收藏的班级</p>
                    <p className="text-sm">
                      点击班级卡片右上角的星标图标来收藏常用班级
                    </p>
                  </>
                ) : (
                  <>
                    <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-lg font-semibold">未找到班级</p>
                    <p className="text-sm">
                      {searchTerm
                        ? "没有匹配当前筛选条件的班级。"
                        : "您还没有创建任何班级，请点击右上角按钮创建。"}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedByGrade.map(([grade, classes]) => {
                  const isCollapsed = collapsedGrades.has(grade);
                  const totalStudents = classes.reduce(
                    (sum, cls) => sum + (cls.studentCount || 0),
                    0
                  );
                  const avgScore =
                    classes.reduce(
                      (sum, cls) => sum + (cls.averageScore || 0),
                      0
                    ) / classes.length;

                  return (
                    <div
                      key={grade}
                      className="bg-white dark:bg-gray-850 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                      {/* 年级标题栏 */}
                      <div
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-750 cursor-pointer hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-750 dark:hover:to-gray-700 transition-colors"
                        onClick={() => toggleGradeCollapse(grade)}
                      >
                        <div className="flex items-center space-x-3">
                          {isCollapsed ? (
                            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          )}
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {grade}
                          </h3>
                          <Badge variant="outline" className="ml-2">
                            {classes.length} 个班级
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{totalStudents} 名学生</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="h-4 w-4" />
                            <span>平均分: {avgScore.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 班级卡片网格 */}
                      {!isCollapsed && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {classes.map((classItem, index) => (
                            <Card
                              key={classItem.id}
                              className={`group cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl dark:bg-gray-800 dark:hover:bg-gray-750
                                ${selectedClass?.id === classItem.id ? "ring-2 ring-[#B9FF66] border-[#B9FF66] shadow-lg" : "border-gray-200 dark:border-gray-700"}
                                bg-white dark:bg-gray-850 border hover:border-[#B9FF66] rounded-lg overflow-hidden shadow-md
                              `}
                              onClick={() => handleClassClick(classItem)}
                            >
                              <div
                                className={`h-1.5 ${selectedClass?.id === classItem.id ? "bg-[#B9FF66]" : "bg-gray-300 dark:bg-gray-600"} group-hover:bg-[#B9FF66] transition-colors duration-300`}
                              ></div>
                              <CardHeader className="pb-2 px-4 pt-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-lg font-semibold truncate text-gray-800 dark:text-white group-hover:text-[#5E9622] dark:group-hover:text-[#B9FF66] transition-colors duration-300">
                                      {classItem.name}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                                      {classItem.grade}
                                    </CardDescription>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-transparent"
                                    onClick={(e) =>
                                      toggleFavorite(classItem.id, e)
                                    }
                                  >
                                    <Star
                                      className={`h-5 w-5 transition-colors ${
                                        favoriteClassIds.has(classItem.id)
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300 hover:text-yellow-400"
                                      }`}
                                    />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="px-4 pb-3 space-y-1.5">
                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                                  <Users className="h-3.5 w-3.5 mr-1.5 text-[#B9FF66]" />{" "}
                                  学生: {classItem.studentCount ?? "N/A"}
                                </div>
                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                                  <div className="flex items-center">
                                    平均分:{" "}
                                    {classItem.averageScore?.toFixed(1) ??
                                      "N/A"}
                                  </div>
                                </div>
                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                                  <div className="flex items-center">
                                    优秀率:{" "}
                                    {classItem.excellentRate !== undefined
                                      ? classItem.excellentRate.toFixed(0) + "%"
                                      : "N/A"}
                                  </div>
                                </div>
                                {/* 预警信息 */}
                                {classItem.warningCount !== undefined &&
                                  classItem.warningCount > 0 && (
                                    <div className="flex items-center text-xs text-orange-600 dark:text-orange-400">
                                      <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                                      {classItem.warningCount} 人预警
                                    </div>
                                  )}
                                {/* 最近考试 */}
                                {classItem.lastExamTitle &&
                                  classItem.lastExamDate && (
                                    <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                      {classItem.lastExamTitle} (
                                      {new Date(
                                        classItem.lastExamDate
                                      ).toLocaleDateString("zh-CN", {
                                        month: "numeric",
                                        day: "numeric",
                                      })}
                                      )
                                    </div>
                                  )}
                              </CardContent>
                              <CardContent className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    handleDeleteClass(
                                      classItem.id,
                                      classItem.name,
                                      e
                                    );
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> 删除
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#5E9622] hover:text-[#426811] dark:text-[#B9FF66] dark:hover:text-[#A8F055] hover:bg-[#B9FF66]/10 dark:hover:bg-gray-700 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation(); // 防止触发卡片点击
                                    handleViewClassProfile(classItem.id);
                                  }}
                                >
                                  <BarChart3 className="h-4 w-4 mr-1" />{" "}
                                  班级画像
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedClass && (
          <Tabs
            value={selectedTab}
            onValueChange={(value) => {
              setSelectedTab(value);
              // 当切换到分组或画像标签时，加载相关数据
              if (value === "groups" || value === "portrait") {
                loadSmartPortraitData();
              }
            }}
            className="w-full mt-8"
          >
            <TabsList className="grid w-full grid-cols-6 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg shadow-inner">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#5E9622] dark:data-[state=active]:text-[#B9FF66] data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <ChartPieIcon className="mr-2 h-4 w-4" />
                概览
              </TabsTrigger>
              <TabsTrigger
                value="students"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#5E9622] dark:data-[state=active]:text-[#B9FF66] data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <Users className="mr-2 h-4 w-4" />
                学生
              </TabsTrigger>
              <TabsTrigger
                value="analysis"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#5E9622] dark:data-[state=active]:text-[#B9FF66] data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <FileBarChart className="mr-2 h-4 w-4" />
                分析
              </TabsTrigger>
              <TabsTrigger
                value="portrait"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#5E9622] dark:data-[state=active]:text-[#B9FF66] data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <Brain className="mr-2 h-4 w-4" />
                画像
              </TabsTrigger>
              <TabsTrigger
                value="groups"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#5E9622] dark:data-[state=active]:text-[#B9FF66] data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <Users className="mr-2 h-4 w-4" />
                分组
              </TabsTrigger>
              <TabsTrigger
                value="comparison"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#5E9622] dark:data-[state=active]:text-[#B9FF66] data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                对比
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 p-0">
              <OverviewTab selectedClass={selectedClass} />
            </TabsContent>
            <TabsContent value="students" className="mt-4 p-0">
              <StudentsTab
                classId={selectedClass.id}
                className={selectedClass.name}
              />
            </TabsContent>
            <TabsContent value="analysis" className="mt-4 p-0">
              <AnalysisTab
                selectedClass={selectedClass}
                analysisData={analysisData}
                subjectAnalysisData={subjectAnalysisData}
                loading={loading}
              />
            </TabsContent>
            <TabsContent value="portrait" className="mt-4 p-0">
              <PortraitTab selectedClass={selectedClass} />
            </TabsContent>
            <TabsContent value="groups" className="mt-4 p-0">
              {smartPortraitLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#5E9622]" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    加载学生数据中...
                  </span>
                </div>
              ) : (
                <SmartGroupManager
                  students={studentsWithScores || []}
                  className={selectedClass.name}
                  onGroupsCreated={handleGroupsCreated}
                />
              )}
            </TabsContent>
            <TabsContent value="comparison" className="mt-4 p-0">
              <ComparisonTab
                selectedClass={selectedClass}
                allClasses={allFetchedClasses}
                boxPlotData={analysisData.boxPlotData}
                trendData={analysisData.trendData}
                competencyData={analysisData.competencyData}
                isLoading={loading}
              />
            </TabsContent>
          </Tabs>
        )}

        <CreateClassDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onClassCreated={() => {
            fetchClasses();
            setCreateDialogOpen(false);
            toast.success("班级创建成功!");
          }}
        />
      </main>
    </div>
  );
};

export default ClassManagement;
