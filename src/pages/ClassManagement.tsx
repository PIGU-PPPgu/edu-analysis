import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Trash2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import CreateClassDialog from "@/components/class/CreateClassDialog";
import OverviewTab from "@/components/class/OverviewTab";
import DetailTab from "@/components/class/DetailTab";
import ComparisonTab from "@/components/class/ComparisonTab";
import SubjectAnalysisTab from "@/components/class/SubjectAnalysisTab";
import ClassReportGenerator from "@/components/analysis/ClassReportGenerator";
import AIDataAnalysis from "@/components/analysis/AIDataAnalysis";
import { getAllClasses, getAllClassesAnalysisData, getSubjectAnalysisData, deleteClass } from "@/services/classService";

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
  subjectAnalysis: Record<string, {
    data: SubjectAnalysisData | null;
    timestamp: number;
  }>;
}

const ClassManagement: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [allFetchedClasses, setAllFetchedClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("name_asc");

  // 新增 - 分析数据状态
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    boxPlotData: {},
    trendData: {},
    competencyData: {}
  });
  
  // 新增 - 学科分析数据状态
  const [subjectAnalysisData, setSubjectAnalysisData] = useState<SubjectAnalysisData | null>(null);
  const [subjectAnalysisLoading, setSubjectAnalysisLoading] = useState(false);

  // 添加数据缓存机制
  const dataCache = useRef<DataCache>({
    subjectAnalysis: {}
  });
  
  // 缓存过期时间（10分钟）
  const CACHE_EXPIRY = 10 * 60 * 1000;

  // 添加错误状态
  const [subjectAnalysisError, setSubjectAnalysisError] = useState<string | null>(null);

  // 获取班级列表
  const fetchClasses = async () => {
    setLoading(true);
    try {
      const classesData = await getAllClasses();
      setAllFetchedClasses(classesData);
      
      // 获取详细分析数据
      try {
        const detailedData = await getAllClassesAnalysisData();
        setAnalysisData({
          boxPlotData: detailedData.boxPlotData || {},
          trendData: detailedData.trendData || {},
          competencyData: detailedData.competencyData || {}
        });
      } catch (analysisError) {
        console.error("获取班级分析数据失败:", analysisError);
        toast.error("部分分析数据加载失败，可能影响图表展示");
      }
      
      // 默认选择第一个班级
      if (classesData.length > 0 && !selectedClass) {
        setSelectedClass(classesData[0]);
      }
    } catch (error) {
      console.error('获取班级列表失败:', error);
      toast.error('获取班级列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取学科分析数据 - 再次优化版本
  const fetchSubjectAnalysisData = async (classId: string, forceRefresh = false) => {
    if (!classId) return;
    
    setSubjectAnalysisLoading(true);
    setSubjectAnalysisError(null); // 重置错误状态
    
    // 检查缓存
    const cachedData = dataCache.current.subjectAnalysis[classId];
    const now = Date.now();
    
    if (!forceRefresh && cachedData && (now - cachedData.timestamp < CACHE_EXPIRY)) {
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
        timestamp: now
      };
      
      setSubjectAnalysisData(data);
    } catch (error: any) {
      console.error('获取学科分析数据失败:', error);
      setSubjectAnalysisError(error?.message || '数据加载失败');
      toast.error('获取学科分析数据失败');
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
    if (selectedClass && selectedTab === 'subject-analysis') {
      // 切换到学科分析标签页时，确保数据加载
      fetchSubjectAnalysisData(selectedClass.id);
    }
  }, [selectedClass, selectedTab]);

  // 筛选并排序班级列表
  const displayedClasses = useMemo(() => {
    if (!allFetchedClasses || allFetchedClasses.length === 0) {
      return [];
    }

    let filtered = allFetchedClasses.filter(cls => 
      cls && cls.name && cls.grade && 
      (cls.name.toLowerCase().includes((searchTerm || '').toLowerCase()) || 
      cls.grade.toLowerCase().includes((searchTerm || '').toLowerCase()))
    );

    switch (sortOption) {
      case "name_asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "students_asc":
        filtered.sort((a, b) => (a.studentCount || 0) - (b.studentCount || 0));
        break;
      case "students_desc":
        filtered.sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0));
        break;
      case "avg_score_asc":
        filtered.sort((a, b) => (a.averageScore || 0) - (b.averageScore || 0));
        break;
      case "avg_score_desc":
        filtered.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
        break;
      default:
        break;
    }

    return filtered;
  }, [allFetchedClasses, searchTerm, sortOption]);

  // 导航到班级画像页面
  const handleViewClassProfile = (classId: string) => {
    navigate(`/class-profile/${classId}`);
  };
  
  // 处理班级卡片点击
  const handleClassClick = (classItem: Class) => {
    setSelectedClass(classItem);
    setSelectedTab("overview");
    
    // 预加载学科分析数据
    preloadSubjectAnalysisData(classItem.id);
  };

  // 预加载数据函数
  const preloadSubjectAnalysisData = useCallback(async (classId: string) => {
    // 检查缓存
    const cachedData = dataCache.current.subjectAnalysis[classId];
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < CACHE_EXPIRY)) {
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
        timestamp: now
      };
      
      // 只有在当前选中的班级匹配时才更新状态
      if (selectedClass?.id === classId) {
        setSubjectAnalysisData(data);
      }
    } catch (error) {
      console.error('预加载学科分析数据失败:', error);
      // 静默失败，不显示错误提示，等用户实际切换到对应标签页时再处理
    }
  }, [selectedClass]);

  // 处理查看学生
  const handleViewStudents = (classId: string, className: string) => {
    navigate(`/student-management?classId=${classId}&className=${encodeURIComponent(className)}`);
  };

  // 处理删除班级
  const handleDeleteClass = async (classId: string, className: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发卡片点击
    
    if (!confirm(`确定要删除班级"${className}"吗？此操作不可恢复，相关的学生、作业等数据也可能被删除。`)) {
      return;
    }
    
    try {
      const success = await deleteClass(classId);
      if (success) {
        // 如果当前选中的班级被删除，清空选中状态
        if (selectedClass?.id === classId) {
          setSelectedClass(null);
        }
        await fetchClasses(); // 重新获取班级列表
      }
    } catch (error) {
      console.error('删除班级失败:', error);
      toast.error('删除班级失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">班级管理</h1>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            variant="outline"
            className="bg-lime-500 hover:bg-lime-600 text-white dark:bg-lime-600 dark:hover:bg-lime-700 dark:text-gray-900 dark:border-lime-600"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            创建新班级
          </Button>
        </div>

        <Card className="mb-6 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">班级列表与概览</CardTitle>
            <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
              管理您的班级，查看班级学生、平均分和优秀率等关键指标。点击班级卡片切换下方详细视图。
            </CardDescription>
          </CardHeader>
          <CardContent>
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
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg shadow animate-pulse">
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
                <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-lg font-semibold">未找到班级</p>
                <p className="text-sm">
                  {searchTerm ? "没有匹配当前筛选条件的班级。" : "您还没有创建任何班级，请点击右上角按钮创建。"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedClasses.map((classItem) => (
                  <Card 
                    key={classItem.id} 
                    className={`group cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl dark:bg-gray-800 dark:hover:bg-gray-750
                      ${selectedClass?.id === classItem.id ? "ring-2 ring-lime-500 border-lime-500 dark:ring-lime-400 dark:border-lime-400 shadow-lg" : "border-gray-200 dark:border-gray-700"}
                      bg-white dark:bg-gray-850 border hover:border-lime-500 dark:hover:border-lime-400 rounded-lg overflow-hidden shadow-md
                    `}
                    onClick={() => handleClassClick(classItem)}
                  >
                    <div className={`h-1.5 ${selectedClass?.id === classItem.id ? 'bg-lime-500' : 'bg-gray-300 dark:bg-gray-600'} group-hover:bg-lime-500 transition-colors duration-300`}></div>
                    <CardHeader className="pb-2 px-4 pt-3">
                      <CardTitle className="text-lg font-semibold truncate text-gray-800 dark:text-white group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors duration-300">
                        {classItem.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                        {classItem.grade}
                      </CardDescription>
                  </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-1.5">
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                        <Users className="h-3.5 w-3.5 mr-1.5 text-lime-500 dark:text-lime-400" /> 学生: {classItem.studentCount ?? 'N/A'}
                      </div>
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center">
                          平均分: {classItem.averageScore?.toFixed(1) ?? 'N/A'}
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center">
                          优秀率: {classItem.excellentRate !== undefined ? classItem.excellentRate.toFixed(0) + '%' : 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                    <CardContent className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          handleDeleteClass(classItem.id, classItem.name, e);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> 删除
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-500 hover:bg-lime-50 dark:hover:bg-gray-700 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation(); // 防止触发卡片点击
                          handleViewClassProfile(classItem.id);
                        }}
                      >
                        <BarChart3 className="h-4 w-4 mr-1" /> 班级画像
                      </Button>
                    </CardContent>
                </Card>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

            {selectedClass && (
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full mt-8">
            <TabsList className="grid w-full grid-cols-5 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg shadow-inner">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400 data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                <Users className="mr-2 h-5 w-5" />班级总览
              </TabsTrigger>
              <TabsTrigger value="comparison" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400 data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                <ChartPieIcon className="mr-2 h-5 w-5" />班级对比
              </TabsTrigger>
              <TabsTrigger value="subject-analysis" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400 data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                <BookOpen className="mr-2 h-5 w-5" />学科分析
              </TabsTrigger>
              <TabsTrigger value="details" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400 data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                <FileBarChart className="mr-2 h-5 w-5" />详细数据
              </TabsTrigger>
              <TabsTrigger value="ai-analysis" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400 data-[state=active]:shadow-md rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                <Brain className="mr-2 h-5 w-5" />AI分析
              </TabsTrigger>
                  </TabsList>
            <TabsContent value="overview" className="mt-4 p-0">
              <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">班级整体情况</CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                    查看当前选中班级的整体学生构成、作业完成度等信息。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OverviewTab selectedClass={selectedClass} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="comparison" className="mt-4 p-0">
              <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">班级横向对比</CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                    将当前选中班级与其他班级在关键指标上进行对比分析。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ComparisonTab 
                    selectedClass={selectedClass} 
                    allClasses={allFetchedClasses}
                    boxPlotData={analysisData.boxPlotData}
                    trendData={analysisData.trendData}
                    competencyData={analysisData.competencyData}
                    isLoading={loading}
                  />
                </CardContent>
              </Card>
                </TabsContent>
            <TabsContent value="subject-analysis" className="mt-4 p-0">
              <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">学科细分分析</CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                    深入分析班级各学科表现，展示学科成绩、趋势、知识点掌握情况及学科之间的相关性。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SubjectAnalysisTab 
                    selectedClass={selectedClass}
                    data={subjectAnalysisData}
                    isLoading={subjectAnalysisLoading}
                    error={subjectAnalysisError}
                    onRefresh={handleRefreshSubjectData}
                    onBack={handleBackToOverview}
                  />
                </CardContent>
              </Card>
                </TabsContent>
            <TabsContent value="details" className="mt-4 p-0">
               <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">班级详细数据洞察</CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                    深入探索当前班级的学生表现、成绩分布、薄弱环节等多维度数据。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DetailTab 
                    selectedClass={selectedClass} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="ai-analysis" className="mt-4 p-0">
              <Card className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">AI智能分析与报告</CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                    利用AI对班级数据进行智能分析,并生成综合性的班级报告。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedClass ? (
                    <>
                      <AIDataAnalysis selectedClass={selectedClass} />
                      <ClassReportGenerator selectedClass={selectedClass} />
                    </>
                  ) : (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">请先选择一个班级以进行AI分析。</div>
                  )}
                </CardContent>
              </Card>
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
