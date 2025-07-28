import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  Radar as RadarIcon,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  filterDataByClasses,
  generateClassComparison,
} from "@/utils/gradeFieldUtils";
import { Subject } from "@/types/grade";
import type { GradeRecord, ClassFilterState } from "@/types/grade";

interface ClassComparisonChartProps {
  data: GradeRecord[];
  filterState: ClassFilterState;
  selectedSubject?: Subject;
  className?: string;
}

// Positivus风格颜色方案
const POSITIVUS_COLORS = [
  "#B9FF66",
  "#B9FF66",
  "#B9FF66",
  "#B9FF66",
  "#191A23",
  "#FED7D7",
  "#B9FF66",
  "#B9FF66",
];

export default function ClassComparisonChart({
  data,
  filterState,
  selectedSubject = Subject.TOTAL,
  className,
}: ClassComparisonChartProps) {
  const [chartType, setChartType] = useState<"bar" | "radar" | "ranking">(
    "bar"
  );

  // 生成对比数据
  const comparisonData = generateClassComparison(
    data,
    filterState?.selectedClasses?.length > 0
      ? filterState.selectedClasses
      : undefined
  );

  // 准备柱状图数据
  const prepareBarChartData = (subject: Subject) => {
    const comparison = comparisonData.comparisonMetrics.find(
      (m) => m.subject === subject
    );
    if (!comparison) return [];

    return comparison.classRankings.map((item, index) => ({
      className: item.className,
      average: item.average,
      gradeAverage: comparison.gradeAverage,
      rank: item.rank,
      color: POSITIVUS_COLORS[index % POSITIVUS_COLORS.length],
    }));
  };

  // 准备雷达图数据
  const prepareRadarData = () => {
    const subjects = [
      Subject.CHINESE,
      Subject.MATH,
      Subject.ENGLISH,
      Subject.PHYSICS,
      Subject.CHEMISTRY,
    ];
    const radarData = subjects.map((subject) => {
      const subjectData: any = { subject: subject };

      comparisonData.classes.forEach((classStats, index) => {
        const stats = classStats.statistics[subject];
        if (stats) {
          subjectData[classStats.className] = stats.average;
        }
      });

      // 添加年级平均
      const gradeStats = comparisonData.gradeOverall[subject];
      if (gradeStats) {
        subjectData["年级平均"] = gradeStats.average;
      }

      return subjectData;
    });

    return radarData;
  };

  // 准备排名数据
  const prepareRankingData = () => {
    return comparisonData.comparisonMetrics.map((metric) => ({
      subject: metric.subject,
      bestClass: metric.bestClass,
      worstClass: metric.worstClass,
      gradeAverage: metric.gradeAverage,
      rankings: metric.classRankings,
    }));
  };

  const barData = prepareBarChartData(selectedSubject);
  const radarData = prepareRadarData();
  const rankingData = prepareRankingData();

  // Positivus风格自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#191A23] p-3">
          <CardContent className="p-0">
            <p className="font-black text-[#191A23] mb-2">{label}</p>
            {payload.map((entry: any, index: number) => (
              <p
                key={index}
                className="font-medium text-[#191A23]"
                style={{ color: entry.color }}
              >
                {entry.dataKey === "average" ? "班级平均分" : " 年级平均分"}:{" "}
                <span className="font-black">{entry.value.toFixed(1)}</span>
              </p>
            ))}
            {payload[0]?.payload?.rank && (
              <p className="text-sm font-bold text-[#B9FF66] mt-1">
                排名: 第{payload[0].payload.rank}名
              </p>
            )}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <Card
      className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66] ${className}`}
    >
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
              班级对比分析
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className={`border-2 border-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide ${
                chartType === "bar"
                  ? "bg-[#B9FF66] text-white hover:bg-[#E8821C]"
                  : "bg-white text-[#191A23] hover:bg-[#F3F3F3]"
              }`}
              size="sm"
              onClick={() => setChartType("bar")}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              柱状图
            </Button>
            <Button
              className={`border-2 border-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide ${
                chartType === "radar"
                  ? "bg-[#B9FF66] text-white hover:bg-[#E8821C]"
                  : "bg-white text-[#191A23] hover:bg-[#F3F3F3]"
              }`}
              size="sm"
              onClick={() => setChartType("radar")}
            >
              <RadarIcon className="w-4 h-4 mr-1" />
              雷达图
            </Button>
            <Button
              className={`border-2 border-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide ${
                chartType === "ranking"
                  ? "bg-[#B9FF66] text-white hover:bg-[#E8821C]"
                  : "bg-white text-[#191A23] hover:bg-[#F3F3F3]"
              }`}
              size="sm"
              onClick={() => setChartType("ranking")}
            >
              <Target className="w-4 h-4 mr-1" />
              排名表
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {chartType === "bar" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-xl font-black text-[#191A23] uppercase tracking-wide">
                {selectedSubject} - 班级平均分对比
              </h3>
              <Badge className="bg-[#B9FF66] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] w-fit">
                年级平均: {barData[0]?.gradeAverage?.toFixed(1) || "N/A"}
              </Badge>
            </div>

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
              <CardContent className="p-4">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#191A23"
                        strokeOpacity={0.3}
                      />
                      <XAxis
                        dataKey="className"
                        tick={{
                          fontSize: 12,
                          fontWeight: "bold",
                          fill: "#191A23",
                        }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        stroke="#191A23"
                      />
                      <YAxis
                        tick={{
                          fontSize: 12,
                          fontWeight: "bold",
                          fill: "#191A23",
                        }}
                        stroke="#191A23"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontWeight: "bold", color: "#191A23" }}
                      />
                      <Bar
                        dataKey="average"
                        name="班级平均分"
                        fill="#B9FF66"
                        stroke="#191A23"
                        strokeWidth={2}
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="gradeAverage"
                        name=" 年级平均分"
                        fill="#B9FF66"
                        stroke="#191A23"
                        strokeWidth={2}
                        opacity={0.8}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {chartType === "radar" && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-[#191A23] uppercase tracking-wide">
              🔄 多科目雷达对比图
            </h3>

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
              <CardContent className="p-4">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#191A23" strokeOpacity={0.3} />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{
                          fontSize: 12,
                          fontWeight: "bold",
                          fill: "#191A23",
                        }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 100]}
                        tick={{
                          fontSize: 10,
                          fontWeight: "bold",
                          fill: "#191A23",
                        }}
                        tickCount={6}
                        stroke="#191A23"
                      />

                      {/*  年级平均线 */}
                      <Radar
                        name=" 年级平均"
                        dataKey="年级平均"
                        stroke="#B9FF66"
                        fill="#B9FF66"
                        fillOpacity={0.2}
                        strokeWidth={3}
                      />

                      {/* 各班级数据 */}
                      {comparisonData.classes
                        .slice(0, 6)
                        .map((classStats, index) => (
                          <Radar
                            key={classStats.className}
                            name={`${classStats.className}`}
                            dataKey={classStats.className}
                            stroke={
                              POSITIVUS_COLORS[index % POSITIVUS_COLORS.length]
                            }
                            fill={
                              POSITIVUS_COLORS[index % POSITIVUS_COLORS.length]
                            }
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        ))}

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "2px solid #191A23",
                          borderRadius: "8px",
                          boxShadow: "4px 4px 0px 0px #191A23",
                          fontWeight: "bold",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontWeight: "bold", color: "#191A23" }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {chartType === "ranking" && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-[#191A23] uppercase tracking-wide">
              {" "}
              班级排名详情
            </h3>

            <Tabs defaultValue={Subject.TOTAL} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-[#F3F3F3] border-2 border-black p-1 rounded-lg">
                <TabsTrigger
                  value={Subject.TOTAL}
                  className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] transition-all"
                >
                  总分
                </TabsTrigger>
                <TabsTrigger
                  value={Subject.CHINESE}
                  className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] transition-all"
                >
                  语文
                </TabsTrigger>
                <TabsTrigger
                  value={Subject.MATH}
                  className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] transition-all"
                >
                  🔢 数学
                </TabsTrigger>
                <TabsTrigger
                  value={Subject.ENGLISH}
                  className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] transition-all"
                >
                  🇬🇧 英语
                </TabsTrigger>
              </TabsList>

              {rankingData.map((rankData) => (
                <TabsContent
                  key={rankData.subject}
                  value={rankData.subject}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/*  最佳表现 */}
                    <Card className="border-2 border-[#B9FF66] bg-[#B9FF66]/20 shadow-[4px_4px_0px_0px_#B9FF66]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-[#B9FF66] rounded-full border-2 border-black">
                            <TrendingUp className="w-5 h-5 text-[#191A23]" />
                          </div>
                          <span className="font-black text-[#191A23] uppercase tracking-wide">
                            {" "}
                            最佳表现
                          </span>
                        </div>
                        <p className="text-2xl font-black text-[#191A23] mb-2">
                          {rankData.bestClass}
                        </p>
                        <p className="font-bold text-[#191A23]">
                          平均分:{" "}
                          <span className="text-[#B9FF66]">
                            {rankData.rankings[0]?.average?.toFixed(1) || "N/A"}
                          </span>
                        </p>
                      </CardContent>
                    </Card>

                    {/*  年级平均 */}
                    <Card className="border-2 border-[#B9FF66] bg-[#B9FF66]/20 shadow-[4px_4px_0px_0px_#B9FF66]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-[#B9FF66] rounded-full border-2 border-black">
                            <Target className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-black text-[#191A23] uppercase tracking-wide">
                            {" "}
                            年级平均
                          </span>
                        </div>
                        <p className="text-2xl font-black text-[#191A23] mb-2">
                          {rankData.gradeAverage.toFixed(1)}
                        </p>
                        <p className="font-bold text-[#191A23]">
                          全年级参考标准
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 排名列表 */}
                  <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
                    <CardHeader className="bg-[#B9FF66] border-b-2 border-black py-3">
                      <CardTitle className="text-white font-black uppercase tracking-wide">
                        详细排名
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {rankData.rankings.map((item, index) => {
                          const isAboveAverage =
                            item.average > rankData.gradeAverage;
                          return (
                            <Card
                              key={item.className}
                              className={`border-2 border-black shadow-[2px_2px_0px_0px_#191A23] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] ${
                                isAboveAverage
                                  ? "bg-[#B9FF66]/20"
                                  : "bg-[#F3F3F3]"
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg border-2 border-black ${
                                        index === 0
                                          ? "bg-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23]"
                                          : index === 1
                                            ? "bg-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23]"
                                            : index === 2
                                              ? "bg-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23]"
                                              : "bg-[#191A23] shadow-[2px_2px_0px_0px_#B9FF66]"
                                      }`}
                                    >
                                      {index === 0
                                        ? ""
                                        : index === 1
                                          ? ""
                                          : index === 2
                                            ? ""
                                            : item.rank}
                                    </div>
                                    <span className="font-black text-[#191A23] text-lg">
                                      {item.className}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-black text-[#191A23] text-xl mb-1">
                                      {item.average.toFixed(1)}
                                    </div>
                                    <Badge
                                      className={`font-bold shadow-[2px_2px_0px_0px_#191A23] border-2 border-black ${
                                        isAboveAverage
                                          ? "bg-[#B9FF66] text-[#191A23]"
                                          : "bg-[#B9FF66] text-white"
                                      }`}
                                    >
                                      {isAboveAverage ? "🔺" : "🔻"}{" "}
                                      {Math.abs(
                                        item.average - rankData.gradeAverage
                                      ).toFixed(1)}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
