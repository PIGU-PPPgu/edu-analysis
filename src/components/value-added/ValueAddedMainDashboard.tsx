"use client";

/**
 * 增值评价主仪表板
 * 参照汇优评系统设计，包含三个标签页：
 * 1. 数据导入
 * 2. 增值活动管理
 * 3. 增值报告
 */

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom"; // ✅ 添加 URL 参数读取
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, ListChecks, BarChart3, Settings } from "lucide-react";
import { toast } from "sonner";
import { ReportsMenuDashboard } from "./reports/ReportsMenuDashboard";
import { ActivityList } from "./activity/ActivityList";
import { DataImportWorkflowWithConfig } from "./import/DataImportWorkflowWithConfig";
import { ConfigurationManager } from "./config/ConfigurationManager";
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
    console.log("🔍 [ValueAddedMainDashboard] useEffect triggered", {
      activityId,
      hasActivityId: !!activityId,
      activeTab,
      previousActivityId: previousActivityIdRef.current,
    });

    if (activityId) {
      const isNewActivity = activityId !== previousActivityIdRef.current;
      const isAlreadyOnReports = activeTab === "reports";

      console.log("🔍 [ActivityID Changed]", {
        activityId,
        previousActivityId: previousActivityIdRef.current,
        isNewActivity,
        isAlreadyOnReports,
        activeTab,
      });

      // 更新引用
      previousActivityIdRef.current = activityId;

      // 如果不在reports标签页，先切换
      if (!isAlreadyOnReports) {
        console.log("📍 Switching to reports tab");
        setActiveTab("reports");
        // 切换标签页后，在下一个tick加载数据
        setTimeout(() => {
          console.log("🔄 Loading data after tab switch");
          loadReportData();
        }, 50); // 增加延迟确保状态更新
      } else {
        // ✅ 已经在reports标签页时，无论是否是新活动，都强制重新加载
        console.log(
          "🔄 [Force Reload] Already on reports tab, forcing data reload"
        );
        loadReportData();
      }
    } else {
      console.log("⚠️ [ValueAddedMainDashboard] No activityId in URL");
    }
  }, [activityId]);

  // 加载数据
  const loadReportData = async () => {
    console.log("🔍 [ValueAddedMainDashboard] loadReportData called", {
      activeTab,
      activityId,
      hasActivityId: !!activityId,
    });

    setLoading(true);
    try {
      // 确定要加载的活动ID
      let targetActivityId = activityId;

      if (!targetActivityId) {
        console.log(
          "🔍 [ValueAddedMainDashboard] No activity_id, loading latest activity data"
        );
        const { data: latestActivity } = await supabase
          .from("value_added_activities")
          .select("id, name")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestActivity) {
          console.log(
            "🔍 [ValueAddedMainDashboard] Using latest activity:",
            latestActivity.id
          );
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

      console.log(
        "🔍 [ValueAddedMainDashboard] Filtering by activity_id:",
        targetActivityId
      );

      // ✅ 分别查询不同维度的数据，避免1000条限制
      const [classResult, teacherResult, studentResult, subjectResult] =
        await Promise.all([
          supabase
            .from("value_added_cache")
            .select("*")
            .eq("activity_id", targetActivityId)
            .eq("dimension", "class"),

          supabase
            .from("value_added_cache")
            .select("*")
            .eq("activity_id", targetActivityId)
            .eq("dimension", "teacher"),

          supabase
            .from("value_added_cache")
            .select("*")
            .eq("activity_id", targetActivityId)
            .eq("dimension", "student")
            .limit(5000), // 学生数据可能很多，设置更大的限制

          supabase
            .from("value_added_cache")
            .select("*")
            .eq("activity_id", targetActivityId)
            .eq("report_type", "subject_balance"),
        ]);

      console.log("🔍 [ValueAddedMainDashboard] Query results:", {
        classCount: classResult.data?.length || 0,
        teacherCount: teacherResult.data?.length || 0,
        studentCount: studentResult.data?.length || 0,
        subjectCount: subjectResult.data?.length || 0,
        classError: classResult.error,
        sampleClassData: classResult.data?.slice(0, 2),
        classDimensions: classResult.data?.map((d) => d.dimension).slice(0, 3),
        classReportTypes: classResult.data
          ?.map((d) => d.report_type)
          .slice(0, 3),
      });

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

      console.log("🔍 [ValueAddedMainDashboard] Extracted results:", {
        classCount: classResults.length,
        teacherCount: teacherResults.length,
        studentCount: studentResults.length,
        subjectCount: subjectResults.length,
        sampleClass: classResults[0]
          ? {
              class_name: classResults[0].class_name,
              subject: classResults[0].subject,
              total_students: classResults[0].total_students,
            }
          : null,
      });

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
      // 只在没有指定activityId且非loading状态下自动加载
      console.log("🔍 [Tab Changed] Loading reports without activityId");
      loadReportData();
    }
  }, [activeTab]); // ✅ 只依赖activeTab，有activityId时由第一个useEffect处理

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">增值评价系统</h1>
          <p className="text-gray-600 mt-1">
            全面评估教学成效，科学衡量学生成长
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          核心功能完成 (90%)
        </Badge>
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
