"use client";

/**
 * 增值评价主仪表板
 * 包含三个标签页：
 * 1. 数据导入
 * 2. 增值活动管理
 * 3. 增值报告
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom"; // ✅ 添加 URL 参数读取
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  ListChecks,
  BarChart3,
  Settings,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ReportsMenuDashboard } from "./reports/ReportsMenuDashboard";
import { ActivityList } from "./activity/ActivityList";
import { DataImportWorkflowWithConfig } from "./import/DataImportWorkflowWithConfig";
import { ConfigurationManager } from "./config/ConfigurationManager";
import { FormulaExplanation } from "./FormulaExplanation";
import { supabase } from "@/integrations/supabase/client";
import type {
  ClassValueAdded,
  TeacherValueAdded,
  StudentValueAdded,
  SubjectBalanceAnalysis,
} from "@/types/valueAddedTypes";

export function ValueAddedMainDashboard() {
  const [searchParams] = useSearchParams(); // ✅ 读取 URL 参数
  const activityId = searchParams.get("activity_id"); // ✅ 获取活动ID
  const previousActivityIdRef = useRef<string | null>(null); // ✅ 跟踪上一次的活动ID

  const [activeTab, setActiveTab] = useState("import");

  // ✅ 学段选择（高中/初中切换时清空缓存重新计算）
  const [gradeLevel, setGradeLevel] = useState<string>("all");

  // ✅ 首次使用引导状态
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem("value_added_welcome_dismissed");
  });

  // 真实数据状态
  const [classData, setClassData] = useState<ClassValueAdded[]>([]);
  const [teacherData, setTeacherData] = useState<TeacherValueAdded[]>([]);
  const [studentData, setStudentData] = useState<StudentValueAdded[]>([]);
  const [subjectBalanceData, setSubjectBalanceData] = useState<
    SubjectBalanceAnalysis[]
  >([]);
  const [currentActivity, setCurrentActivity] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ 如果有 activity_id，自动切换到报告标签页并强制刷新
  useEffect(() => {
    if (activityId) {
      const isNewActivity = activityId !== previousActivityIdRef.current;
      const isAlreadyOnReports = activeTab === "reports";

      // 更新引用
      previousActivityIdRef.current = activityId;

      // 如果不在reports标签页，先切换
      if (!isAlreadyOnReports) {
        setActiveTab("reports");
        // 切换标签页后，在下一个tick加载数据
        setTimeout(() => {
          loadReportData();
        }, 50);
      } else {
        // 已经在reports标签页时，无论是否是新活动，都强制重新加载
        loadReportData();
      }
    }
  }, [activityId]);

  // 加载数据
  const loadReportData = async () => {
    setLoading(true);
    try {
      // 确定要加载的活动ID
      let targetActivityId = activityId;

      if (!targetActivityId) {
        let query = supabase
          .from("value_added_activities")
          .select("id, name")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1);

        // ✅ 按学段筛选活动
        if (gradeLevel === "high") {
          query = query.in("grade_level", ["高一", "高二", "高三"]);
        } else if (gradeLevel === "middle") {
          query = query.in("grade_level", ["初一", "初二", "初三"]);
        }

        const { data: latestActivity } = await query.single();

        if (latestActivity) {
          targetActivityId = latestActivity.id;
          setCurrentActivity({
            id: latestActivity.id,
            name: latestActivity.name,
          });
        }
      } else {
        // 如果有指定的activityId，查询该活动信息
        const { data: activityInfo } = await supabase
          .from("value_added_activities")
          .select("id, name")
          .eq("id", targetActivityId)
          .single();

        if (activityInfo) {
          setCurrentActivity({ id: activityInfo.id, name: activityInfo.name });
        }
      }

      if (!targetActivityId) {
        toast.info(
          '暂无增值报告数据，请先在"数据导入"和"增值活动"标签页完成数据准备和计算'
        );
        setCurrentActivity(null);
        return;
      }

      // ✅ 分别查询不同维度的数据，使用分页查询避免1000条限制
      // 定义分页查询辅助函数
      const fetchAllData = async (
        dimension?: string,
        reportType?: string
      ): Promise<any[]> => {
        let allData: any[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from("value_added_cache")
            .select("*")
            .eq("activity_id", targetActivityId)
            .range(from, from + batchSize - 1);

          if (dimension) {
            query = query.eq("dimension", dimension);
          }
          if (reportType) {
            query = query.eq("report_type", reportType);
          }

          const { data, error } = await query;

          if (error) {
            console.warn(
              `⚠️ 查询value_added_cache失败 (offset ${from}):`,
              error
            );
            break;
          }

          if (data && data.length > 0) {
            allData = allData.concat(data);
            from += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        return allData;
      };

      // 并行查询所有维度的数据
      const [classData_raw, teacherData_raw, studentData_raw, subjectData_raw] =
        await Promise.all([
          fetchAllData("class"),
          fetchAllData("teacher"),
          fetchAllData("student"),
          fetchAllData(undefined, "subject_balance"),
        ]);

      const classResult = { data: classData_raw, error: null };
      const teacherResult = { data: teacherData_raw, error: null };
      const studentResult = { data: studentData_raw, error: null };
      const subjectResult = { data: subjectData_raw, error: null };

      if (
        classResult.error ||
        teacherResult.error ||
        studentResult.error ||
        subjectResult.error
      ) {
        console.error("加载报告数据失败:", {
          classError: classResult.error,
          teacherError: teacherResult.error,
          studentError: studentResult.error,
          subjectError: subjectResult.error,
        });
        toast.error("加载报告数据失败");
        return;
      }

      const classCache = classResult.data || [];
      const teacherCache = teacherResult.data || [];
      const studentCache = studentResult.data || [];
      const subjectCache = subjectResult.data || [];

      const totalCount =
        classCache.length +
        teacherCache.length +
        studentCache.length +
        subjectCache.length;

      if (totalCount === 0) {
        toast.info(
          '该活动还没有计算结果，请先在"增值活动"标签页点击"开始计算"',
          {
            duration: 5000,
          }
        );
        return;
      }

      // 提取结果数据
      const classResults = classCache.map((c) => c.result as ClassValueAdded);
      const teacherResults = teacherCache.map(
        (c) => c.result as TeacherValueAdded
      );
      const studentResults = studentCache.map(
        (c) => c.result as StudentValueAdded
      );
      const subjectResults = subjectCache.map(
        (c) => c.result as SubjectBalanceAnalysis
      );

      setClassData(classResults);
      setTeacherData(teacherResults);
      setStudentData(studentResults);
      setSubjectBalanceData(subjectResults);

      toast.success(
        `已加载 ${totalCount} 条报告数据 (班级:${classResults.length}, 教师:${teacherResults.length}, 学生:${studentResults.length})`,
        {
          duration: 3000,
        }
      );
    } catch (error) {
      console.error("加载报告数据失败:", error);
      toast.error("加载报告数据异常");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 监听标签页切换到reports时加载数据（仅在无activityId时）
  useEffect(() => {
    if (activeTab === "reports" && !activityId && !loading) {
      loadReportData();
    }
  }, [activeTab]); // ✅ 只依赖activeTab，有activityId时由第一个useEffect处理

  // ✅ 学段切换时清空缓存并重新加载
  const handleGradeLevelChange = useCallback(
    (newLevel: string) => {
      setGradeLevel(newLevel);

      // 清空所有缓存数据
      setClassData([]);
      setTeacherData([]);
      setStudentData([]);
      setSubjectBalanceData([]);
      setCurrentActivity(null);

      // 如果当前在报告标签页，重新加载数据
      if (activeTab === "reports") {
        setTimeout(() => loadReportData(), 50);
      }
    },
    [gradeLevel, activeTab]
  );

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("value_added_welcome_dismissed", "true");
  };

  const handleStartGuide = () => {
    setActiveTab("import");
    handleDismissWelcome();
  };

  return (
    <div className="space-y-6">
      {/* ✅ 首次使用欢迎引导 */}
      {showWelcome && (
        <Card className="border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4"
            onClick={handleDismissWelcome}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Sparkles className="h-6 w-6" />
              欢迎使用增值评价系统
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              增值评价是科学衡量教学效果的重要工具，可以客观评估学生在一段时间内的成长情况。
              <br />
              请按照以下步骤开始使用：
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">下载模板</h4>
                  <p className="text-xs text-gray-600">
                    在"数据导入"标签下载Excel模板
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">准备数据</h4>
                  <p className="text-xs text-gray-600">
                    填写学生信息、教学编排和两次考试成绩
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">导入数据</h4>
                  <p className="text-xs text-gray-600">
                    上传填好的Excel文件，系统会自动校验
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">创建活动</h4>
                  <p className="text-xs text-gray-600">
                    在"增值活动"标签创建分析任务
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">查看报告</h4>
                  <p className="text-xs text-gray-600">
                    计算完成后查看班级、教师、学生报告
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleStartGuide}
                className="bg-blue-600 hover:bg-blue-700"
              >
                开始使用
              </Button>
              <Button variant="outline" onClick={handleDismissWelcome}>
                我知道了
              </Button>
              <span className="text-xs text-gray-500 ml-auto">
                提示：预计需要30分钟完成首次配置
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">增值评价系统</h1>
          <p className="text-gray-600 mt-1">
            全面评估教学成效，科学衡量学生成长
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* ✅ 学段切换选择器 */}
          <Select value={gradeLevel} onValueChange={handleGradeLevelChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="选择学段" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部学段</SelectItem>
              <SelectItem value="high">高中</SelectItem>
              <SelectItem value="middle">初中</SelectItem>
            </SelectContent>
          </Select>
          <FormulaExplanation />
          <Badge variant="outline" className="text-sm px-3 py-1">
            核心功能完成 (90%)
          </Badge>
        </div>
      </div>

      {/* 主内容区 - 四个标签页 */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b px-6 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                数据导入
              </TabsTrigger>
              <TabsTrigger
                value="activities"
                className="flex items-center gap-2"
              >
                <ListChecks className="h-4 w-4" />
                增值活动
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                增值报告
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                配置管理
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 标签页内容 */}
          <TabsContent value="import" className="p-6">
            <DataImportWorkflowWithConfig />
          </TabsContent>

          <TabsContent value="activities" className="p-6">
            <ActivityList />
          </TabsContent>

          <TabsContent value="reports" className="p-6">
            <ReportsMenuDashboard
              classData={classData}
              teacherData={teacherData}
              studentData={studentData}
              subjectBalanceData={subjectBalanceData}
              currentActivity={currentActivity}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="config" className="p-6">
            <ConfigurationManager />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
