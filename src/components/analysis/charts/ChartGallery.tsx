/**
 * 图表展示画廊组件
 * 提供各种高级数据可视化图表
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Sankey,
  ScatterChart,
  Scatter,
  Cell,
  Treemap,
} from "recharts";
import {
  Activity,
  PieChart,
  BarChart3,
  TrendingUp,
  Radar as RadarIcon,
  Network,
  Grid,
  Zap,
  Eye,
  Download,
} from "lucide-react";

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  exam_date?: string;
  exam_title?: string;
}

interface ChartGalleryProps {
  gradeData: GradeRecord[];
  className?: string;
}

// 热力图数据处理
const generateHeatmapData = (gradeData: GradeRecord[]) => {
  const allSubjects = [
    ...new Set(gradeData.map((r) => r.subject).filter(Boolean)),
  ];
  const allClasses = [
    ...new Set(gradeData.map((r) => r.class_name).filter(Boolean)),
  ];

  // 限制显示数量以避免布局过大
  const subjects = allSubjects.slice(0, 5); // 限制为5个科目
  const classes = allClasses.slice(0, 4); // 限制为4个班级

  const heatmapData = [];

  subjects.forEach((subject, subjectIndex) => {
    classes.forEach((className, classIndex) => {
      const records = gradeData.filter(
        (r) => r.subject === subject && r.class_name === className
      );
      const avgScore =
        records.length > 0
          ? records.reduce((sum, r) => sum + (r.score || 0), 0) / records.length
          : 0;

      heatmapData.push({
        x: classIndex,
        y: subjectIndex,
        subject,
        className,
        value: avgScore,
        intensity: avgScore / 100,
      });
    });
  });

  return {
    heatmapData,
    subjects,
    classes,
    totalSubjects: allSubjects.length,
    totalClasses: allClasses.length,
  };
};

// 班级对比图数据处理（替代雷达图）
const generateClassComparisonData = (gradeData: GradeRecord[]) => {
  const subjects = [
    ...new Set(gradeData.map((r) => r.subject).filter(Boolean)),
  ].slice(0, 6);
  const classes = [
    ...new Set(gradeData.map((r) => r.class_name).filter(Boolean)),
  ].slice(0, 4);

  return subjects.map((subject) => {
    const subjectData = { subject };

    classes.forEach((className) => {
      const records = gradeData.filter(
        (r) => r.subject === subject && r.class_name === className
      );
      const avgScore =
        records.length > 0
          ? records.reduce((sum, r) => sum + (r.score || 0), 0) / records.length
          : 0;
      subjectData[className] = avgScore.toFixed(1);
    });

    return subjectData;
  });
};

// 桑葚图数据处理
const generateSankeyData = (gradeData: GradeRecord[]) => {
  const gradeRanges = [
    { name: "优秀(90+)", min: 90, max: 100 },
    { name: "良好(80-89)", min: 80, max: 89 },
    { name: "及格(60-79)", min: 60, max: 79 },
    { name: "不及格(<60)", min: 0, max: 59 },
  ];

  const subjects = [
    ...new Set(gradeData.map((r) => r.subject).filter(Boolean)),
  ];
  const links = [];

  subjects.forEach((subject) => {
    gradeRanges.forEach((range) => {
      const count = gradeData.filter(
        (r) =>
          r.subject === subject && r.score >= range.min && r.score <= range.max
      ).length;

      if (count > 0) {
        links.push({
          source: subject,
          target: range.name,
          value: count,
        });
      }
    });
  });

  return { links, subjects, gradeRanges };
};

// 气泡图数据处理
const generateBubbleData = (gradeData: GradeRecord[]) => {
  const studentGroups = gradeData.reduce(
    (acc, record) => {
      const key = record.student_id;
      if (!acc[key]) {
        acc[key] = {
          studentId: key,
          name: record.name,
          scores: [],
        };
      }
      acc[key].scores.push(record.score || 0);
      return acc;
    },
    {} as Record<string, any>
  );

  return Object.values(studentGroups).map((student: any) => {
    const avgScore =
      student.scores.reduce((sum, s) => sum + s, 0) / student.scores.length;
    const maxScore = Math.max(...student.scores);
    const minScore = Math.min(...student.scores);
    const stability = 100 - (maxScore - minScore); // 稳定性指标

    return {
      name: student.name,
      x: avgScore,
      y: stability,
      z: student.scores.length, // 气泡大小代表考试次数
      avgScore: avgScore.toFixed(1),
      stability: stability.toFixed(1),
      exams: student.scores.length,
    };
  });
};

const ChartGallery: React.FC<ChartGalleryProps> = ({
  gradeData,
  className = "",
}) => {
  const [activeChart, setActiveChart] = useState("heatmap");

  const { heatmapData, subjects, classes, totalSubjects, totalClasses } =
    useMemo(() => generateHeatmapData(gradeData), [gradeData]);
  const classComparisonData = useMemo(
    () => generateClassComparisonData(gradeData),
    [gradeData]
  );
  const sankeyData = useMemo(() => generateSankeyData(gradeData), [gradeData]);
  const bubbleData = useMemo(() => generateBubbleData(gradeData), [gradeData]);

  // 热力图组件
  const HeatmapChart = () => (
    <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
      <CardHeader className="bg-[#B9FF66] border-b-4 border-[#191A23] p-6">
        <CardTitle className="text-2xl font-black text-[#191A23] flex items-center gap-3">
          <Grid className="w-6 h-6" />
          成绩热力图 - 班级科目表现一览
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 bg-white">
        <div className="space-y-4">
          {/* 数据限制通知 */}
          {(totalSubjects > 5 || totalClasses > 4) && (
            <div className="p-3 bg-[#B9FF66]/20 border border-[#B9FF66] rounded-lg">
              <p className="text-sm font-medium text-[#191A23]">
                📊 显示前{Math.min(totalSubjects, 5)}个科目和前
                {Math.min(totalClasses, 4)}个班级
                {totalSubjects > 5 && ` (共${totalSubjects}个科目)`}
                {totalClasses > 4 && ` (共${totalClasses}个班级)`}
              </p>
            </div>
          )}

          <div className="max-w-full overflow-x-auto">
            <div
              className="grid min-w-fit"
              style={{
                gridTemplateColumns: `80px repeat(${classes.length}, minmax(60px, 1fr))`,
                gap: "1px",
              }}
            >
              <div></div>
              {classes.map((className, index) => (
                <div
                  key={index}
                  className="text-center font-bold text-[#191A23] p-1 text-xs bg-[#F8F8F8] border border-[#B9FF66]"
                >
                  {className}
                </div>
              ))}

              {subjects.map((subject, subjectIndex) => (
                <React.Fragment key={subject}>
                  <div className="text-right font-bold text-[#191A23] p-1 text-xs bg-[#F8F8F8] border border-[#B9FF66]">
                    {subject}
                  </div>
                  {classes.map((className, classIndex) => {
                    const cellData = heatmapData.find(
                      (d) => d.subject === subject && d.className === className
                    );
                    const intensity = cellData?.intensity || 0;
                    return (
                      <div
                        key={`${subjectIndex}-${classIndex}`}
                        className="aspect-square border border-black flex items-center justify-center text-xs font-bold transition-all hover:scale-105 min-h-[40px]"
                        style={{
                          backgroundColor: `rgba(185, 255, 102, ${intensity})`,
                          color: intensity > 0.5 ? "#191A23" : "#666",
                        }}
                        title={`${subject} - ${className}: ${cellData?.value?.toFixed(1) || 0}分`}
                      >
                        {cellData?.value?.toFixed(0) || 0}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-bold text-[#191A23]">低分</span>
            <div className="flex space-x-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 border border-black"
                  style={{ backgroundColor: `rgba(185, 255, 102, ${i / 10})` }}
                ></div>
              ))}
            </div>
            <span className="font-bold text-[#191A23]">高分</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 班级对比图组件（替代雷达图）
  const ClassComparisonChart = () => {
    const classes = [
      ...new Set(gradeData.map((r) => r.class_name).filter(Boolean)),
    ].slice(0, 4);

    return (
      <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#6B7280] bg-white">
        <CardHeader className="bg-[#6B7280] border-b-4 border-[#191A23] p-6">
          <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6" />
            班级成绩对比图
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={classComparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="subject"
                  tick={{ fontSize: 12, fontWeight: "bold", fill: "#191A23" }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fontWeight: "bold", fill: "#191A23" }}
                />
                <Tooltip
                  contentStyle={{
                    border: "2px solid #191A23",
                    borderRadius: "8px",
                    backgroundColor: "white",
                    boxShadow: "4px 4px 0px 0px #191A23",
                  }}
                />
                {classes.map((className, index) => (
                  <Bar
                    key={className}
                    dataKey={className}
                    fill={
                      index === 0
                        ? "#B9FF66"
                        : index === 1
                          ? "#6B7280"
                          : index === 2
                            ? "#191A23"
                            : "#CCCCCC"
                    }
                    stroke="#191A23"
                    strokeWidth={2}
                    name={className}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            {classes.map((className, index) => (
              <Badge
                key={index}
                className={`p-2 text-center font-bold border-2 border-black ${
                  index === 0
                    ? "bg-[#B9FF66] text-[#191A23]"
                    : index === 1
                      ? "bg-[#6B7280] text-white"
                      : index === 2
                        ? "bg-[#191A23] text-white"
                        : "bg-[#CCCCCC] text-[#191A23]"
                }`}
              >
                {className}
              </Badge>
            ))}
          </div>

          <div className="mt-4 p-3 bg-[#6B7280]/10 rounded-lg">
            <p className="text-sm font-medium text-[#191A23]">
              💡
              此图表更适合教师分析各班级在不同科目的表现差异，便于制定针对性教学策略
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 气泡图组件
  const BubbleChartComponent = () => (
    <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#9C88FF] bg-white">
      <CardHeader className="bg-[#9C88FF] border-b-4 border-[#191A23] p-6">
        <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
          <Activity className="w-6 h-6" />
          学生进步轨迹气泡图
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 bg-white">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={bubbleData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#191A23"
                strokeOpacity={0.3}
              />
              <XAxis
                dataKey="x"
                domain={[0, 100]}
                tick={{ fontSize: 12, fontWeight: "bold", fill: "#191A23" }}
                label={{
                  value: "平均分",
                  position: "insideBottom",
                  offset: -20,
                  style: { textAnchor: "middle", fontWeight: "bold" },
                }}
              />
              <YAxis
                dataKey="y"
                domain={[0, 100]}
                tick={{ fontSize: 12, fontWeight: "bold", fill: "#191A23" }}
                label={{
                  value: "稳定性",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fontWeight: "bold" },
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <Card className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#191A23] p-3">
                        <CardContent className="p-0">
                          <p className="font-bold text-[#191A23]">
                            {data.name}
                          </p>
                          <p className="text-sm text-[#191A23]">
                            平均分: {data.avgScore}
                          </p>
                          <p className="text-sm text-[#191A23]">
                            稳定性: {data.stability}
                          </p>
                          <p className="text-sm text-[#191A23]">
                            考试次数: {data.exams}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                dataKey="z"
                fill="#B9FF66"
                stroke="#191A23"
                strokeWidth={2}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 p-4 bg-[#F8F8F8] border-2 border-[#B9FF66] rounded-lg">
          <p className="text-[#191A23] font-medium">
            <strong>图表说明:</strong>{" "}
            X轴为平均分，Y轴为成绩稳定性，气泡大小表示考试次数。
            右上角的学生表现最稳定且分数高。
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // 简化版桑葚图（用条形图模拟）
  const SankeyChartComponent = () => (
    <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#FF6B6B] bg-white">
      <CardHeader className="bg-[#FF6B6B] border-b-4 border-[#191A23] p-6">
        <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
          <Network className="w-6 h-6" />
          成绩分布流向图
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 bg-white">
        <div className="space-y-6">
          {subjects.map((subject, index) => {
            const subjectData = gradeData.filter((r) => r.subject === subject);
            const excellent = subjectData.filter((r) => r.score >= 90).length;
            const good = subjectData.filter(
              (r) => r.score >= 80 && r.score < 90
            ).length;
            const pass = subjectData.filter(
              (r) => r.score >= 60 && r.score < 80
            ).length;
            const fail = subjectData.filter((r) => r.score < 60).length;
            const total = subjectData.length;

            return (
              <div key={subject} className="space-y-2">
                <h4 className="font-bold text-[#191A23] flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#B9FF66] border border-black rounded"></div>
                  {subject} ({total}人)
                </h4>
                <div className="flex rounded-lg overflow-hidden border-2 border-black">
                  {excellent > 0 && (
                    <div
                      className="bg-[#B9FF66] text-[#191A23] text-center py-2 px-1 font-bold text-sm flex items-center justify-center"
                      style={{ width: `${(excellent / total) * 100}%` }}
                      title={`优秀: ${excellent}人`}
                    >
                      {excellent > 0 && `优${excellent}`}
                    </div>
                  )}
                  {good > 0 && (
                    <div
                      className="bg-[#F7931E] text-white text-center py-2 px-1 font-bold text-sm flex items-center justify-center"
                      style={{ width: `${(good / total) * 100}%` }}
                      title={`良好: ${good}人`}
                    >
                      {good > 0 && `良${good}`}
                    </div>
                  )}
                  {pass > 0 && (
                    <div
                      className="bg-[#9C88FF] text-white text-center py-2 px-1 font-bold text-sm flex items-center justify-center"
                      style={{ width: `${(pass / total) * 100}%` }}
                      title={`及格: ${pass}人`}
                    >
                      {pass > 0 && `及${pass}`}
                    </div>
                  )}
                  {fail > 0 && (
                    <div
                      className="bg-[#FF6B6B] text-white text-center py-2 px-1 font-bold text-sm flex items-center justify-center"
                      style={{ width: `${(fail / total) * 100}%` }}
                      title={`不及格: ${fail}人`}
                    >
                      {fail > 0 && `不${fail}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#B9FF66] border border-black"></div>
            <span className="font-bold text-[#191A23]">优秀 (90+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#F7931E] border border-black"></div>
            <span className="font-bold text-[#191A23]">良好 (80-89)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#9C88FF] border border-black"></div>
            <span className="font-bold text-[#191A23]">及格 (60-79)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#FF6B6B] border border-black"></div>
            <span className="font-bold text-[#191A23]">不及格 (&lt;60)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!gradeData || gradeData.length === 0) {
    return (
      <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
        <CardContent className="p-12 text-center">
          <PieChart className="h-16 w-16 text-[#B9FF66] mx-auto mb-6" />
          <p className="text-2xl font-black text-[#191A23] mb-3">暂无数据</p>
          <p className="text-[#191A23]/70 font-medium">
            需要成绩数据才能生成图表
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* 图表选择导航 */}
      <Card className="border-3 border-[#B9FF66] shadow-[6px_6px_0px_0px_#191A23] bg-white">
        <CardHeader className="bg-[#B9FF66]/30 border-b-3 border-[#B9FF66] p-5">
          <CardTitle className="text-xl font-bold text-[#191A23] flex items-center gap-3">
            <BarChart3 className="w-6 h-6" />
            高级图表展示画廊
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          <Tabs
            value={activeChart}
            onValueChange={setActiveChart}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 bg-[#F8F8F8] border-2 border-black p-1">
              <TabsTrigger
                value="heatmap"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold"
              >
                热力图
              </TabsTrigger>
              <TabsTrigger
                value="comparison"
                className="data-[state=active]:bg-[#6B7280] data-[state=active]:text-white font-bold"
              >
                班级对比
              </TabsTrigger>
              <TabsTrigger
                value="bubble"
                className="data-[state=active]:bg-[#9C88FF] data-[state=active]:text-white font-bold"
              >
                气泡图
              </TabsTrigger>
              <TabsTrigger
                value="sankey"
                className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white font-bold"
              >
                流向图
              </TabsTrigger>
            </TabsList>

            <TabsContent value="heatmap" className="mt-6">
              <HeatmapChart />
            </TabsContent>

            <TabsContent value="comparison" className="mt-6">
              <ClassComparisonChart />
            </TabsContent>

            <TabsContent value="bubble" className="mt-6">
              <BubbleChartComponent />
            </TabsContent>

            <TabsContent value="sankey" className="mt-6">
              <SankeyChartComponent />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartGallery;
