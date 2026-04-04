"use client";

/**
 * 数据对比分析工具 - 重构版
 * 参考汇优评设计，支持多维度对比分析
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchTimePeriodComparison,
  fetchClassComparison,
  fetchSubjectComparison,
  fetchTeacherComparison,
  fetchAvailableActivities,
  type TimePeriodData,
  type ClassComparisonData,
  type SubjectComparisonData,
  type TeacherComparisonData,
  type ActivityInfo,
} from "@/services/comparisonAnalysisService";
import { safeToFixed } from "@/utils/formatUtils";
import {
  ComparisonFilters,
  type ComparisonType,
} from "./components/ComparisonFilters";
import { ComparisonChart } from "./components/ComparisonChart";
import { ComparisonTable } from "./components/ComparisonTable";

interface ComparisonAnalysisToolProps {
  loading?: boolean;
}

export function ComparisonAnalysisTool({
  loading: parentLoading = false,
}: ComparisonAnalysisToolProps) {
  const [comparisonType, setComparisonType] = useState<ComparisonType>("class");
  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  const [timeData, setTimeData] = useState<TimePeriodData[]>([]);
  const [classData, setClassData] = useState<ClassComparisonData[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectComparisonData[]>([]);
  const [teacherData, setTeacherData] = useState<TeacherComparisonData[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [classComparisonTab, setClassComparisonTab] =
    useState("value-added-rate");

  useEffect(() => {
    fetchAvailableActivities().then((result) => {
      setActivities(result);
      if (result.length > 0 && !selectedActivity)
        setSelectedActivity(result[0].id);
    });
  }, []);

  const handleFilter = async () => {
    if (!selectedActivity && comparisonType !== "time") {
      toast.error("请先选择一个增值活动");
      return;
    }
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      switch (comparisonType) {
        case "time": {
          const result = await fetchTimePeriodComparison(3);
          setTimeData(result);
          if (result.length === 0) toast.info("暂无时间段对比数据");
          break;
        }
        case "class": {
          const result = await fetchClassComparison(
            selectedActivity,
            selectedSubject === "all" ? undefined : selectedSubject
          );
          setClassData(result);
          if (result.length === 0) toast.info("暂无班级对比数据");
          break;
        }
        case "subject": {
          const result = await fetchSubjectComparison(selectedActivity);
          setSubjectData(result);
          if (result.length === 0) toast.info("暂无科目对比数据");
          break;
        }
        case "teacher": {
          const result = await fetchTeacherComparison(
            selectedActivity,
            selectedSubject === "all" ? undefined : selectedSubject
          );
          setTeacherData(result);
          if (result.length === 0) toast.info("暂无教师对比数据");
          break;
        }
      }
    } catch (err) {
      console.error("加载对比数据失败:", err);
      setError("加载数据失败，请重试");
      toast.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setComparisonType("class");
    setSelectedActivity(activities[0]?.id || "");
    setSelectedSubject("all");
    setTimeData([]);
    setClassData([]);
    setSubjectData([]);
    setTeacherData([]);
    setHasSearched(false);
    setError(null);
  };

  const handleExport = () => {
    if (!hasSearched) {
      toast.error("请先筛选数据再导出");
      return;
    }
    try {
      let exportData: Record<string, string | number>[] = [];
      let filename = "";
      switch (comparisonType) {
        case "time":
          exportData = timeData.map((item, idx) => ({
            序号: idx + 1,
            时间段: item.name,
            平均分: safeToFixed(item.avgScore, 1),
            增值率: safeToFixed(item.valueAddedRate, 1) + "%",
            优秀率: safeToFixed(item.excellentRate, 1) + "%",
            及格率: safeToFixed(item.passRate, 1) + "%",
          }));
          filename = "时间段对比分析.csv";
          break;
        case "class":
          exportData = classData.map((item, idx) => ({
            排名: idx + 1,
            班级: item.className,
            入口分: safeToFixed(item.entryScore, 1),
            出口分: safeToFixed(item.exitScore, 1),
            增值率: safeToFixed(item.valueAddedRate, 1) + "%",
            入口标准分: safeToFixed(item.entryStandardScore, 2),
            出口标准分: safeToFixed(item.exitStandardScore, 2),
            优秀率: safeToFixed(item.excellentRate, 1) + "%",
            及格率: safeToFixed(item.passRate, 1) + "%",
            学生数: item.students,
          }));
          filename = "班级对比分析.csv";
          break;
        case "subject":
          exportData = subjectData.map((item, idx) => ({
            序号: idx + 1,
            科目: item.subject,
            入口分: safeToFixed(item.entryScore, 1),
            出口分: safeToFixed(item.exitScore, 1),
            增值率: safeToFixed(item.valueAddedRate, 1) + "%",
            优秀率: safeToFixed(item.excellentRate, 1) + "%",
            入口标准分: safeToFixed(item.entryStandardScore, 2),
            出口标准分: safeToFixed(item.exitStandardScore, 2),
          }));
          filename = "学科对比分析.csv";
          break;
        case "teacher":
          exportData = teacherData.map((item, idx) => ({
            序号: idx + 1,
            教师: item.teacherName,
            平均分: safeToFixed(item.avgScore, 1),
            增值率: safeToFixed(item.valueAddedRate, 1) + "%",
            巩固率: safeToFixed(item.consolidationRate, 1) + "%",
            转化率: safeToFixed(item.transformationRate, 1) + "%",
            贡献率: safeToFixed(item.contributionRate, 1) + "%",
            学生数: item.students,
          }));
          filename = "教师对比分析.csv";
          break;
      }
      if (exportData.length === 0) {
        toast.error("没有可导出的数据");
        return;
      }
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(","),
        ...exportData.map((row) => headers.map((h) => `"${row[h]}"`).join(",")),
      ].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`成功导出 ${exportData.length} 条记录`);
    } catch (err) {
      console.error("导出失败:", err);
      toast.error("导出失败，请重试");
    }
  };

  const hasData =
    comparisonType === "time"
      ? timeData.length > 0
      : comparisonType === "class"
        ? classData.length > 0
        : comparisonType === "subject"
          ? subjectData.length > 0
          : teacherData.length > 0;

  return (
    <div className="space-y-6">
      <ComparisonFilters
        comparisonType={comparisonType}
        activities={activities}
        selectedActivity={selectedActivity}
        selectedSubject={selectedSubject}
        loading={loading}
        hasSearched={hasSearched}
        resultCounts={{
          class: classData.length,
          teacher: teacherData.length,
          subject: subjectData.length,
          time: timeData.length,
        }}
        onComparisonTypeChange={setComparisonType}
        onActivityChange={setSelectedActivity}
        onSubjectChange={setSelectedSubject}
        onFilter={handleFilter}
        onReset={handleReset}
        onExport={handleExport}
      />

      {hasSearched && !loading && !error && hasData && (
        <div className="space-y-6">
          <ComparisonChart
            comparisonType={comparisonType}
            timeData={timeData}
            classData={classData}
            subjectData={subjectData}
            teacherData={teacherData}
            classComparisonTab={classComparisonTab}
            onClassTabChange={setClassComparisonTab}
          />
          <ComparisonTable
            comparisonType={comparisonType}
            timeData={timeData}
            classData={classData}
            subjectData={subjectData}
            teacherData={teacherData}
          />
        </div>
      )}

      {hasSearched && !loading && !error && !hasData && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-semibold text-muted-foreground">
                  暂无数据
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  当前筛选条件下没有找到数据
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasSearched && !loading && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <BarChart3 className="h-16 w-16 text-gray-300" />
              <div>
                <p className="text-lg font-semibold text-muted-foreground">
                  请选择筛选条件
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  选择对比类型、活动和科目后，点击"筛选"按钮查看分析结果
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
