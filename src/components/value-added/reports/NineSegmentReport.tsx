"use client";

/**
 * 九段评价分布报告
 * 展示各班级入口→出口的九段人数分布变化
 * 仅当活动使用九段配置时有意义
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type { StudentValueAdded } from "@/types/valueAddedTypes";

interface NineSegmentReportProps {
  studentData: StudentValueAdded[];
  loading?: boolean;
}

// 九段标签顺序（1段最优，9段最差）
const NINE_SEGMENTS = [
  "1段",
  "2段",
  "3段",
  "4段",
  "5段",
  "6段",
  "7段",
  "8段",
  "9段",
];

// 六段标签（兼容旧数据）
const SIX_SEGMENTS = ["A+", "A", "B+", "B", "C+", "C"];

const SEGMENT_COLORS: Record<string, string> = {
  "1段": "bg-emerald-600 text-white",
  "2段": "bg-emerald-500 text-white",
  "3段": "bg-green-400 text-white",
  "4段": "bg-lime-400 text-gray-800",
  "5段": "bg-yellow-300 text-gray-800",
  "6段": "bg-orange-300 text-gray-800",
  "7段": "bg-orange-500 text-white",
  "8段": "bg-red-500 text-white",
  "9段": "bg-red-700 text-white",
  // 六段兼容
  "A+": "bg-emerald-600 text-white",
  A: "bg-green-500 text-white",
  "B+": "bg-lime-400 text-gray-800",
  B: "bg-yellow-300 text-gray-800",
  "C+": "bg-orange-400 text-white",
  C: "bg-red-500 text-white",
};

function SegmentBadge({ level }: { level: string }) {
  const cls = SEGMENT_COLORS[level] ?? "bg-gray-200 text-gray-700";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls}`}
    >
      {level}
    </span>
  );
}

export function NineSegmentReport({
  studentData,
  loading = false,
}: NineSegmentReportProps) {
  const [selectedClass, setSelectedClass] = useState<string>("all");

  // 检测数据使用的是几段制
  const segmentLabels = useMemo(() => {
    const levels = studentData.map((s) => s.entry_level).filter(Boolean);
    const hasNine = levels.some((l) => NINE_SEGMENTS.includes(l as string));
    return hasNine ? NINE_SEGMENTS : SIX_SEGMENTS;
  }, [studentData]);

  const isNineSegment = segmentLabels === NINE_SEGMENTS;

  // 班级列表
  const classes = useMemo(() => {
    return Array.from(new Set(studentData.map((s) => s.class_name))).sort();
  }, [studentData]);

  // 按班级过滤
  const filtered = useMemo(() => {
    if (selectedClass === "all") return studentData;
    return studentData.filter((s) => s.class_name === selectedClass);
  }, [studentData, selectedClass]);

  // 计算各班各段人数
  const classStats = useMemo(() => {
    const byClass: Record<
      string,
      { entry: Record<string, number>; exit: Record<string, number>; n: number }
    > = {};

    for (const s of filtered) {
      const cls = s.class_name;
      if (!byClass[cls]) {
        byClass[cls] = {
          entry: Object.fromEntries(segmentLabels.map((l) => [l, 0])),
          exit: Object.fromEntries(segmentLabels.map((l) => [l, 0])),
          n: 0,
        };
      }
      byClass[cls].n++;
      if (s.entry_level && segmentLabels.includes(s.entry_level as string)) {
        byClass[cls].entry[s.entry_level as string]++;
      }
      if (s.exit_level && segmentLabels.includes(s.exit_level as string)) {
        byClass[cls].exit[s.exit_level as string]++;
      }
    }

    return Object.entries(byClass).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, segmentLabels]);

  // 全年级汇总
  const gradeTotal = useMemo(() => {
    const entry = Object.fromEntries(segmentLabels.map((l) => [l, 0]));
    const exit = Object.fromEntries(segmentLabels.map((l) => [l, 0]));
    for (const s of filtered) {
      if (s.entry_level && segmentLabels.includes(s.entry_level as string))
        entry[s.entry_level as string]++;
      if (s.exit_level && segmentLabels.includes(s.exit_level as string))
        exit[s.exit_level as string]++;
    }
    return { entry, exit, n: filtered.length };
  }, [filtered, segmentLabels]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-400">
          加载中...
        </CardContent>
      </Card>
    );
  }

  if (studentData.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-400">
          暂无学生数据
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!isNineSegment && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            当前活动使用六段评价配置，若需九段评价请在活动创建时选择"深圳市标准九段评价"配置，并重新计算。
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="选择班级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部班级</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">
          共 {filtered.length} 名学生
        </span>
      </div>

      {/* 全年级汇总 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {selectedClass === "all" ? "全年级" : selectedClass} 段位分布对比
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">段位</TableHead>
                {segmentLabels.map((l) => (
                  <TableHead key={l} className="text-center px-2">
                    <SegmentBadge level={l} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-sm">入口人数</TableCell>
                {segmentLabels.map((l) => (
                  <TableCell key={l} className="text-center text-sm">
                    {gradeTotal.entry[l] || 0}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-sm">出口人数</TableCell>
                {segmentLabels.map((l) => (
                  <TableCell key={l} className="text-center text-sm">
                    {gradeTotal.exit[l] || 0}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium text-sm">变化</TableCell>
                {segmentLabels.map((l) => {
                  const diff =
                    (gradeTotal.exit[l] || 0) - (gradeTotal.entry[l] || 0);
                  return (
                    <TableCell
                      key={l}
                      className="text-center text-sm font-semibold"
                    >
                      <span
                        className={
                          diff > 0
                            ? "text-green-600"
                            : diff < 0
                              ? "text-red-600"
                              : "text-gray-400"
                        }
                      >
                        {diff > 0 ? `+${diff}` : diff === 0 ? "—" : diff}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 各班明细（仅全部班级时显示） */}
      {selectedClass === "all" && classStats.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">各班出口段位分布</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">班级</TableHead>
                  <TableHead className="text-center w-16">人数</TableHead>
                  {segmentLabels.map((l) => (
                    <TableHead key={l} className="text-center px-1">
                      <SegmentBadge level={l} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStats.map(([cls, stats]) => (
                  <TableRow key={cls}>
                    <TableCell className="font-medium text-sm">{cls}</TableCell>
                    <TableCell className="text-center text-sm">
                      {stats.n}
                    </TableCell>
                    {segmentLabels.map((l) => {
                      const exitN = stats.exit[l] || 0;
                      const entryN = stats.entry[l] || 0;
                      const diff = exitN - entryN;
                      return (
                        <TableCell key={l} className="text-center text-xs px-1">
                          <div>{exitN}</div>
                          {diff !== 0 && (
                            <div
                              className={`text-xs ${diff > 0 ? "text-green-600" : "text-red-500"}`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
