"use client";

/**
 * 段位分布分析报告（九段/六段）
 * Tab1: 分布对比  Tab2: 流动分析（保持/进步/退步）
 * 段位说明改为 Info 按钮弹出 Dialog
 */

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import type { StudentValueAdded } from "@/types/valueAddedTypes";

interface NineSegmentReportProps {
  studentData: StudentValueAdded[];
  loading?: boolean;
}

// 九段定义（Z分区间）
const NINE_SEGMENT_DEFS = [
  {
    level: "1段",
    label: "顶尖生",
    zDesc: "Z ≥ 1.75",
    ratio: "约4%",
    color: "#10b981",
  },
  {
    level: "2段",
    label: "尖子生",
    zDesc: "1.25 ≤ Z < 1.75",
    ratio: "约7%",
    color: "#22c55e",
  },
  {
    level: "3段",
    label: "优秀生",
    zDesc: "0.75 ≤ Z < 1.25",
    ratio: "约12%",
    color: "#3b82f6",
  },
  {
    level: "4段",
    label: "良好生",
    zDesc: "0.25 ≤ Z < 0.75",
    ratio: "约17%",
    color: "#6366f1",
  },
  {
    level: "5段",
    label: "中等生",
    zDesc: "-0.25 ≤ Z < 0.25",
    ratio: "约20%",
    color: "#8b5cf6",
  },
  {
    level: "6段",
    label: "中下生",
    zDesc: "-0.75 ≤ Z < -0.25",
    ratio: "约17%",
    color: "#f59e0b",
  },
  {
    level: "7段",
    label: "后进生",
    zDesc: "-1.25 ≤ Z < -0.75",
    ratio: "约12%",
    color: "#ef4444",
  },
  {
    level: "8段",
    label: "学困生",
    zDesc: "-1.75 ≤ Z < -1.25",
    ratio: "约7%",
    color: "#dc2626",
  },
  {
    level: "9段",
    label: "特困生",
    zDesc: "Z < -1.75",
    ratio: "约4%",
    color: "#991b1b",
  },
];

const SIX_SEGMENTS = ["A+", "A", "B+", "B", "C+", "C"];
const NINE_SEGMENTS = NINE_SEGMENT_DEFS.map((d) => d.level);

const SEGMENT_COLOR: Record<string, string> = {
  ...Object.fromEntries(NINE_SEGMENT_DEFS.map((d) => [d.level, d.color])),
  "A+": "#10b981",
  A: "#22c55e",
  "B+": "#3b82f6",
  B: "#6366f1",
  "C+": "#f59e0b",
  C: "#ef4444",
};

function SegmentBadge({ level }: { level: string }) {
  const color = SEGMENT_COLOR[level] ?? "#9ca3af";
  return (
    <span
      style={{ backgroundColor: color }}
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-white"
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

  const segmentLabels = useMemo(() => {
    const levels = studentData.map((s) => s.entry_level).filter(Boolean);
    return levels.some((l) => NINE_SEGMENTS.includes(l as string))
      ? NINE_SEGMENTS
      : SIX_SEGMENTS;
  }, [studentData]);

  const isNine = segmentLabels === NINE_SEGMENTS;

  // 检测入口考试区分度：标准差 / 全距 < 5% 视为区分度不足
  const entryDiscriminationWarning = useMemo(() => {
    const scores = studentData
      .map((s) => s.entry_score)
      .filter((v) => typeof v === "number" && Number.isFinite(v));
    if (scores.length < 2) return false;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min;
    if (range === 0) return true;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stddev = Math.sqrt(
      scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
        (scores.length - 1)
    );
    return stddev / range < 0.12;
  }, [studentData]);

  const classes = useMemo(
    () => Array.from(new Set(studentData.map((s) => s.class_name))).sort(),
    [studentData]
  );

  const filtered = useMemo(
    () =>
      selectedClass === "all"
        ? studentData
        : studentData.filter((s) => s.class_name === selectedClass),
    [studentData, selectedClass]
  );

  // 各班各段人数（入口/出口）—— 始终基于全量数据，不受班级筛选影响
  const allClassStats = useMemo(() => {
    const map: Record<
      string,
      { entry: Record<string, number>; exit: Record<string, number>; n: number }
    > = {};
    for (const s of studentData) {
      if (!map[s.class_name]) {
        map[s.class_name] = {
          entry: Object.fromEntries(segmentLabels.map((l) => [l, 0])),
          exit: Object.fromEntries(segmentLabels.map((l) => [l, 0])),
          n: 0,
        };
      }
      map[s.class_name].n++;
      if (s.entry_level && segmentLabels.includes(s.entry_level as string))
        map[s.class_name].entry[s.entry_level as string]++;
      if (s.exit_level && segmentLabels.includes(s.exit_level as string))
        map[s.class_name].exit[s.exit_level as string]++;
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [studentData, segmentLabels]);

  // 全年级汇总（受班级筛选影响，用于顶部图表）
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

  // 分布对比图数据
  const distributionChartData = useMemo(
    () =>
      segmentLabels.map((l) => ({
        segment: l,
        入口: gradeTotal.entry[l] || 0,
        出口: gradeTotal.exit[l] || 0,
        color: SEGMENT_COLOR[l] ?? "#9ca3af",
      })),
    [gradeTotal, segmentLabels]
  );

  // 流动分析
  const levelOrder = isNine
    ? Object.fromEntries(NINE_SEGMENTS.map((l, i) => [l, i]))
    : { "A+": 0, A: 1, "B+": 2, B: 3, "C+": 4, C: 5 };

  const flowStats = useMemo(() => {
    const byClass: Record<
      string,
      { keep: number; improve: number; regress: number; n: number }
    > = {};
    for (const s of filtered) {
      const cls = s.class_name;
      if (!byClass[cls])
        byClass[cls] = { keep: 0, improve: 0, regress: 0, n: 0 };
      byClass[cls].n++;
      const entryRank = levelOrder[s.entry_level as string] ?? -1;
      const exitRank = levelOrder[s.exit_level as string] ?? -1;
      if (entryRank === -1 || exitRank === -1) continue;
      if (exitRank < entryRank) byClass[cls].improve++;
      else if (exitRank > entryRank) byClass[cls].regress++;
      else byClass[cls].keep++;
    }
    return Object.entries(byClass).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, levelOrder]);

  const flowChartData = useMemo(
    () =>
      flowStats.map(([cls, s]) => ({
        班级: cls,
        进步: s.improve,
        保持: s.keep,
        退步: s.regress,
        进步率: s.n > 0 ? ((s.improve / s.n) * 100).toFixed(1) : "0",
        保持率: s.n > 0 ? ((s.keep / s.n) * 100).toFixed(1) : "0",
        退步率: s.n > 0 ? ((s.regress / s.n) * 100).toFixed(1) : "0",
      })),
    [flowStats]
  );

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
      {!isNine && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            当前活动使用六段评价配置。若需九段评价，请在活动创建时选择"深圳市标准九段评价"并重新计算。
          </AlertDescription>
        </Alert>
      )}

      {entryDiscriminationWarning && (
        <Alert
          variant="destructive"
          className="border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">入口考试区分度不足</span>
            ——入口分数分布极度集中（标准差不足全距的
            5%），通常见于掐尖录取场景（如中考进重点高中）。此时段位划分无法有效区分学生能力，流动分析结果仅供参考，建议以增值评价（TVA）为主要依据。
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

        {/* 段位说明 Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto gap-1.5">
              <Info className="h-3.5 w-3.5" />
              {isNine ? "九段说明" : "六段说明"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isNine ? "深圳市标准九段评价说明" : "六段评价说明"}
              </DialogTitle>
            </DialogHeader>
            {isNine ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">等级</TableHead>
                    <TableHead className="w-20">标签</TableHead>
                    <TableHead>Z分数区间</TableHead>
                    <TableHead className="w-20 text-right">理论比例</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {NINE_SEGMENT_DEFS.map((d) => (
                    <TableRow key={d.level}>
                      <TableCell>
                        <SegmentBadge level={d.level} />
                      </TableCell>
                      <TableCell className="text-sm">{d.label}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {d.zDesc}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {d.ratio}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500">
                六段评价基于百分位排名划分，A+为前5%，C为后5%。
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="distribution">
        <TabsList>
          <TabsTrigger value="distribution">分布对比</TabsTrigger>
          <TabsTrigger value="flow">流动分析</TabsTrigger>
        </TabsList>

        {/* Tab1: 分布对比 */}
        <TabsContent value="distribution" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedClass === "all" ? "全年级" : selectedClass}{" "}
                入口/出口段位分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={distributionChartData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segment" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="入口" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="出口" radius={[3, 3, 0, 0]}>
                    {distributionChartData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 各班出口段位明细 —— 始终显示 */}
          {allClassStats.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  各班出口段位明细（出口人数 / 变化）
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">班级</TableHead>
                      <TableHead className="text-center w-14">人数</TableHead>
                      {segmentLabels.map((l) => (
                        <TableHead
                          key={l}
                          className="text-center px-1 min-w-[48px]"
                        >
                          <SegmentBadge level={l} />
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allClassStats.map(([cls, stats]) => (
                      <TableRow
                        key={cls}
                        className={
                          selectedClass !== "all" && selectedClass !== cls
                            ? "opacity-30"
                            : ""
                        }
                      >
                        <TableCell className="font-medium text-sm">
                          {cls}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {stats.n}
                        </TableCell>
                        {segmentLabels.map((l) => {
                          const diff =
                            (stats.exit[l] || 0) - (stats.entry[l] || 0);
                          return (
                            <TableCell
                              key={l}
                              className="text-center text-xs px-1"
                            >
                              <div className="font-medium">
                                {stats.exit[l] || 0}
                              </div>
                              {diff !== 0 && (
                                <div
                                  className={
                                    diff > 0 ? "text-green-600" : "text-red-500"
                                  }
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
        </TabsContent>

        {/* Tab2: 流动分析 */}
        <TabsContent value="flow" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                各班段位流动（进步 / 保持 / 退步）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={flowChartData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="班级" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name, props) => {
                      const d = props.payload;
                      const rate =
                        name === "进步"
                          ? d.进步率
                          : name === "保持"
                            ? d.保持率
                            : d.退步率;
                      return [`${value}人 (${rate}%)`, name];
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="进步"
                    stackId="a"
                    fill="#22c55e"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar dataKey="保持" stackId="a" fill="#94a3b8" />
                  <Bar
                    dataKey="退步"
                    stackId="a"
                    fill="#ef4444"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">各班流动率汇总</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>班级</TableHead>
                    <TableHead className="text-center">人数</TableHead>
                    <TableHead className="text-center text-green-600">
                      进步人数
                    </TableHead>
                    <TableHead className="text-center text-green-600">
                      进步率
                    </TableHead>
                    <TableHead className="text-center text-gray-500">
                      保持人数
                    </TableHead>
                    <TableHead className="text-center text-gray-500">
                      保持率
                    </TableHead>
                    <TableHead className="text-center text-red-500">
                      退步人数
                    </TableHead>
                    <TableHead className="text-center text-red-500">
                      退步率
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flowStats.map(([cls, s]) => (
                    <TableRow key={cls}>
                      <TableCell className="font-medium text-sm">
                        {cls}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {s.n}
                      </TableCell>
                      <TableCell className="text-center text-sm text-green-600 font-medium">
                        {s.improve}
                      </TableCell>
                      <TableCell className="text-center text-sm text-green-600">
                        {s.n > 0 ? ((s.improve / s.n) * 100).toFixed(1) : 0}%
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-500">
                        {s.keep}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-500">
                        {s.n > 0 ? ((s.keep / s.n) * 100).toFixed(1) : 0}%
                      </TableCell>
                      <TableCell className="text-center text-sm text-red-500 font-medium">
                        {s.regress}
                      </TableCell>
                      <TableCell className="text-center text-sm text-red-500">
                        {s.n > 0 ? ((s.regress / s.n) * 100).toFixed(1) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
