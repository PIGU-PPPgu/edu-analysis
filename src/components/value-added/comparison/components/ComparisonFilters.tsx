"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Calendar,
  Download,
  Filter,
  RotateCcw,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { ActivityInfo } from "@/services/comparisonAnalysisService";

export type ComparisonType = "time" | "class" | "subject" | "teacher";

export const SUBJECTS = [
  { value: "all", label: "全部科目" },
  { value: "语文", label: "语文" },
  { value: "数学", label: "数学" },
  { value: "英语", label: "英语" },
  { value: "物理", label: "物理" },
  { value: "化学", label: "化学" },
  { value: "生物", label: "生物" },
  { value: "政治", label: "政治/道法" },
  { value: "历史", label: "历史" },
  { value: "地理", label: "地理" },
];

interface ComparisonFiltersProps {
  comparisonType: ComparisonType;
  activities: ActivityInfo[];
  selectedActivity: string;
  selectedSubject: string;
  loading: boolean;
  hasSearched: boolean;
  resultCounts: {
    class: number;
    teacher: number;
    subject: number;
    time: number;
  };
  onComparisonTypeChange: (v: ComparisonType) => void;
  onActivityChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onFilter: () => void;
  onReset: () => void;
  onExport: () => void;
}

export function ComparisonFilters({
  comparisonType,
  activities,
  selectedActivity,
  selectedSubject,
  loading,
  hasSearched,
  resultCounts,
  onComparisonTypeChange,
  onActivityChange,
  onSubjectChange,
  onFilter,
  onReset,
  onExport,
}: ComparisonFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          数据对比分析工具
        </CardTitle>
        <CardDescription>
          选择对比维度和筛选条件，深入分析增值表现差异
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">对比类型</label>
              <Select
                value={comparisonType}
                onValueChange={(v) =>
                  onComparisonTypeChange(v as ComparisonType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择对比类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>时间对比</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="class">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>班级对比</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="subject">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>学科对比</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="teacher">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>教师对比</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {comparisonType !== "time" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">增值活动</label>
                <Select
                  value={selectedActivity}
                  onValueChange={onActivityChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择活动" />
                  </SelectTrigger>
                  <SelectContent>
                    {activities.map((act) => (
                      <SelectItem key={act.id} value={act.id}>
                        {act.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(comparisonType === "class" || comparisonType === "teacher") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">科目</label>
                <Select value={selectedSubject} onValueChange={onSubjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择科目" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((sub) => (
                      <SelectItem key={sub.value} value={sub.value}>
                        {sub.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={onFilter} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  加载中...
                </>
              ) : (
                <>
                  <Filter className="h-4 w-4 mr-2" />
                  筛选
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onReset} disabled={loading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              重置
            </Button>
            <Button
              variant="outline"
              className="ml-auto"
              disabled={!hasSearched || loading}
              onClick={onExport}
            >
              <Download className="h-4 w-4 mr-2" />
              导出报告
            </Button>
          </div>

          {hasSearched && !loading && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {comparisonType === "class" &&
                  `已找到 ${resultCounts.class} 条班级数据`}
                {comparisonType === "teacher" &&
                  `已找到 ${resultCounts.teacher} 条教师数据`}
                {comparisonType === "subject" &&
                  `已找到 ${resultCounts.subject} 条学科数据`}
                {comparisonType === "time" &&
                  `已找到 ${resultCounts.time} 个时间段数据`}
                {selectedSubject !== "all" &&
                  ` (科目: ${SUBJECTS.find((s) => s.value === selectedSubject)?.label})`}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
