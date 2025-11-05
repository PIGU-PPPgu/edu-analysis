import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClassData } from "@/types/database";

// 定义班级类型
interface ClassSummary {
  id: string;
  name: string;
  grade: string;
  averageScore?: number;
  excellentRate?: number;
  studentCount?: number;
  homeworkCount?: number;
  // 新增维度
  passRate?: number;
  knowledgeMastery?: number;
  problemSolvingAbility?: number;
  learningAttitude?: number;
  examStability?: number;
}

interface ComparisonTabProps {
  selectedClass: ClassSummary | null;
  allClasses: ClassSummary[];
  isLoading?: boolean;
}

const ComparisonTab: React.FC<ComparisonTabProps> = ({
  selectedClass,
  allClasses,
  isLoading = false,
}) => {
  // 如果没有选择班级或正在加载，显示加载状态
  if (!selectedClass) {
    return (
      <div className="p-4 text-center text-gray-500">
        请先从上方选择一个班级以进行对比。
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        正在加载数据，请稍候...
      </div>
    );
  }

  // 找到另一个用于比较的班级
  const classToCompare = allClasses.find((cls) => cls.id !== selectedClass.id);

  // 使用useMemo优化热力图数据生成
  const heatmapData = useMemo(() => {
    const metrics = ["平均分", "优秀率", "合格率", "知识掌握", "解题能力"];
    return allClasses
      .filter((cls) => cls && cls.name)
      .flatMap((cls) =>
        metrics.map((metric) => {
          let value = 0;
          switch (metric) {
            case "平均分":
              value = cls.averageScore || 0;
              break;
            case "优秀率":
              value = cls.excellentRate || 0;
              break;
            case "合格率":
              value = cls.passRate || 0;
              break;
            case "知识掌握":
              value = cls.knowledgeMastery || 0;
              break;
            case "解题能力":
              value = cls.problemSolvingAbility || 0;
              break;
            default:
              value = 0;
          }

          return {
            x: metric,
            y: cls.name,
            value: value,
          };
        })
      );
  }, [allClasses]);

  // 优化文本生成逻辑，使用useMemo避免重复计算
  const performanceComparisonText = useMemo(() => {
    if (!selectedClass) return "";

    let text = "";
    if (classToCompare) {
      text = `${selectedClass.name} 和 ${classToCompare.name} 在表现上各有千秋。`;

      if (selectedClass.averageScore && classToCompare.averageScore) {
        const diff = selectedClass.averageScore - classToCompare.averageScore;
        text += ` 平均分方面，${selectedClass.name} (${selectedClass.averageScore.toFixed(1)}) ${diff > 0 ? "领先" : diff < 0 ? "落后" : "持平"} ${classToCompare.name} (${classToCompare.averageScore.toFixed(1)}) ${Math.abs(diff).toFixed(1)}分。`;
      }

      if (selectedClass.excellentRate && classToCompare.excellentRate) {
        const diffRate =
          selectedClass.excellentRate - classToCompare.excellentRate;
        text += ` 优秀率方面 (${selectedClass.excellentRate}% vs ${classToCompare.excellentRate}%)，${selectedClass.name} ${diffRate > 0 ? "更高" : diffRate < 0 ? "更低" : "持平"}。`;
      }

      // 新增维度比较
      if (selectedClass.passRate && classToCompare.passRate) {
        const diffPass = selectedClass.passRate - classToCompare.passRate;
        text += ` 合格率差异 ${Math.abs(diffPass).toFixed(1)}%。`;
      }

      if (selectedClass.examStability && classToCompare.examStability) {
        text += ` 在考试稳定性方面，${selectedClass.name}${selectedClass.examStability > classToCompare.examStability ? "表现更稳定" : "稍显波动"}。`;
      }
    } else {
      text = `${selectedClass.name} 的详细表现如下，暂无其他班级进行直接对比。`;
    }

    return text;
  }, [selectedClass, classToCompare]);

  const teachingSuggestionText = useMemo(() => {
    if (!selectedClass) return "";

    let text = `针对 ${selectedClass.name} 的情况，建议关注其${selectedClass.averageScore && selectedClass.averageScore < 75 ? "平均分提升" : "优势学科的持续培养"}。`;

    if (classToCompare) {
      text += ` 对比 ${classToCompare.name}，可以考虑借鉴其在${classToCompare.averageScore && classToCompare.averageScore > (selectedClass.averageScore || 0) ? "整体教学管理" : "特定学科"}上的经验。`;
    }

    // 基于新维度提供更有针对性的建议
    if (
      selectedClass.problemSolvingAbility &&
      selectedClass.problemSolvingAbility < 75
    ) {
      text += " 建议加强解题策略训练和思维方法培养，提高学生的应用能力。";
    }

    if (selectedClass.learningAttitude && selectedClass.learningAttitude < 80) {
      text += " 可考虑开展激励计划，培养学生的学习兴趣和自主学习能力。";
    }

    text += " 鼓励跨班级教学研讨，分享成功案例，共同进步。";
    return text;
  }, [selectedClass, classToCompare]);

  // 雷达图数据 - 对比选中班级和对比班级的多维度能力
  const radarChartData = useMemo(() => {
    if (!selectedClass || !classToCompare) return null;

    const dimensions = [
      { key: "averageScore", label: "平均分", max: 100 },
      { key: "excellentRate", label: "优秀率", max: 100 },
      { key: "passRate", label: "及格率", max: 100 },
      { key: "knowledgeMastery", label: "知识掌握", max: 100 },
      { key: "problemSolvingAbility", label: "解题能力", max: 100 },
    ];

    return {
      dimensions,
      selectedClassData: dimensions.map((d) => ({
        dimension: d.label,
        value: (selectedClass as any)[d.key] || 0,
      })),
      compareClassData: dimensions.map((d) => ({
        dimension: d.label,
        value: (classToCompare as any)[d.key] || 0,
      })),
    };
  }, [selectedClass, classToCompare]);

  return (
    <div className="space-y-4">
      {/* 雷达图对比 */}
      {radarChartData && (
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {selectedClass.name} vs {classToCompare?.name} - 多维度对比雷达图
            </CardTitle>
            <CardDescription className="text-xs">
              五个核心维度的综合能力对比分析
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full" style={{ height: "400px" }}>
              {/* SVG雷达图 */}
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* 背景同心圆 */}
                {[20, 40, 60, 80, 100].map((percent, idx) => {
                  const radius = (percent / 100) * 150;
                  return (
                    <circle
                      key={idx}
                      cx="200"
                      cy="200"
                      r={radius}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* 维度轴线 */}
                {radarChartData.dimensions.map((dim, idx) => {
                  const angle =
                    (idx * 2 * Math.PI) / radarChartData.dimensions.length -
                    Math.PI / 2;
                  const x = 200 + 150 * Math.cos(angle);
                  const y = 200 + 150 * Math.sin(angle);
                  const labelX = 200 + 170 * Math.cos(angle);
                  const labelY = 200 + 170 * Math.sin(angle);

                  return (
                    <g key={idx}>
                      <line
                        x1="200"
                        y1="200"
                        x2={x}
                        y2={y}
                        stroke="#d1d5db"
                        strokeWidth="1"
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-medium fill-gray-700"
                      >
                        {dim.label}
                      </text>
                    </g>
                  );
                })}

                {/* 对比班级数据多边形 */}
                {classToCompare &&
                  (() => {
                    const points = radarChartData.compareClassData
                      .map((item, idx) => {
                        const angle =
                          (idx * 2 * Math.PI) /
                            radarChartData.dimensions.length -
                          Math.PI / 2;
                        const radius = (item.value / 100) * 150;
                        const x = 200 + radius * Math.cos(angle);
                        const y = 200 + radius * Math.sin(angle);
                        return `${x},${y}`;
                      })
                      .join(" ");

                    return (
                      <polygon
                        points={points}
                        fill="#93c5fd"
                        fillOpacity="0.2"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                    );
                  })()}

                {/* 选中班级数据多边形 */}
                {(() => {
                  const points = radarChartData.selectedClassData
                    .map((item, idx) => {
                      const angle =
                        (idx * 2 * Math.PI) / radarChartData.dimensions.length -
                        Math.PI / 2;
                      const radius = (item.value / 100) * 150;
                      const x = 200 + radius * Math.cos(angle);
                      const y = 200 + radius * Math.sin(angle);
                      return `${x},${y}`;
                    })
                    .join(" ");

                  return (
                    <polygon
                      points={points}
                      fill="#B9FF66"
                      fillOpacity="0.3"
                      stroke="#5E9622"
                      strokeWidth="3"
                      filter="url(#glow)"
                    />
                  );
                })()}

                {/* 数据点 */}
                {radarChartData.selectedClassData.map((item, idx) => {
                  const angle =
                    (idx * 2 * Math.PI) / radarChartData.dimensions.length -
                    Math.PI / 2;
                  const radius = (item.value / 100) * 150;
                  const x = 200 + radius * Math.cos(angle);
                  const y = 200 + radius * Math.sin(angle);

                  return (
                    <circle key={idx} cx={x} cy={y} r="4" fill="#5E9622" />
                  );
                })}
              </svg>

              {/* 图例 */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#B9FF66] border-2 border-[#5E9622] rounded-sm"></div>
                  <span className="text-xs font-medium">
                    {selectedClass.name}
                  </span>
                </div>
                {classToCompare && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-200 border-2 border-blue-500 rounded-sm"></div>
                    <span className="text-xs font-medium">
                      {classToCompare.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 数据详情表 */}
            <div className="mt-6 grid grid-cols-5 gap-3">
              {radarChartData.dimensions.map((dim, idx) => {
                const selectedValue =
                  radarChartData.selectedClassData[idx].value;
                const compareValue = radarChartData.compareClassData[idx].value;
                const diff = selectedValue - compareValue;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      {dim.label}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-[#5E9622]">
                        {selectedValue.toFixed(1)}
                      </span>
                      {classToCompare && (
                        <>
                          <span className="text-sm text-gray-400">vs</span>
                          <span className="text-sm text-blue-600">
                            {compareValue.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                    {classToCompare && (
                      <Badge
                        variant={
                          diff > 0
                            ? "default"
                            : diff < 0
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs mt-1"
                      >
                        {diff > 0 ? "+" : ""}
                        {diff.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">班级关键指标对比</CardTitle>
          <CardDescription className="text-xs">
            一览所有班级在关键指标上的表现分布
          </CardDescription>
        </CardHeader>
        <CardContent>
          {heatmapData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">班级</th>
                    <th className="text-center p-2 font-medium">平均分</th>
                    <th className="text-center p-2 font-medium">优秀率</th>
                    <th className="text-center p-2 font-medium">合格率</th>
                    <th className="text-center p-2 font-medium">知识掌握</th>
                    <th className="text-center p-2 font-medium">解题能力</th>
                  </tr>
                </thead>
                <tbody>
                  {allClasses
                    .filter((cls) => cls && cls.name)
                    .map((cls) => (
                      <tr
                        key={cls.id}
                        className={`border-b hover:bg-gray-50 ${cls.id === selectedClass.id ? "bg-[#B9FF66]/10" : ""}`}
                      >
                        <td className="p-2 font-medium">
                          {cls.name}
                          {cls.id === selectedClass.id && (
                            <span className="ml-2 text-xs bg-[#B9FF66] text-black px-2 py-1 rounded font-medium">
                              当前
                            </span>
                          )}
                        </td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center space-x-2">
                            <span>{cls.averageScore?.toFixed(1) || "0.0"}</span>
                            <div
                              className={`w-4 h-4 rounded-full ${
                                (cls.averageScore || 0) >= 85
                                  ? "bg-green-500"
                                  : (cls.averageScore || 0) >= 75
                                    ? "bg-yellow-500"
                                    : (cls.averageScore || 0) >= 60
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                            ></div>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center space-x-2">
                            <span>
                              {cls.excellentRate?.toFixed(1) || "0.0"}%
                            </span>
                            <div
                              className={`w-4 h-4 rounded-full ${
                                (cls.excellentRate || 0) >= 80
                                  ? "bg-green-500"
                                  : (cls.excellentRate || 0) >= 60
                                    ? "bg-yellow-500"
                                    : (cls.excellentRate || 0) >= 40
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                            ></div>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center space-x-2">
                            <span>
                              {cls.passRate?.toFixed(1) ||
                                ((cls.averageScore || 0) > 60
                                  ? Math.min(
                                      100,
                                      Math.round(
                                        ((cls.averageScore || 0) / 60) * 90
                                      )
                                    )
                                  : 0)}
                              %
                            </span>
                            <div
                              className={`w-4 h-4 rounded-full ${
                                (cls.passRate || 0) >= 90 ||
                                (cls.averageScore || 0) >= 80
                                  ? "bg-green-500"
                                  : (cls.passRate || 0) >= 80 ||
                                      (cls.averageScore || 0) >= 70
                                    ? "bg-yellow-500"
                                    : (cls.passRate || 0) >= 60 ||
                                        (cls.averageScore || 0) >= 60
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                            ></div>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center space-x-2">
                            <span>
                              {cls.knowledgeMastery?.toFixed(1) || "0.0"}%
                            </span>
                            <div
                              className={`w-4 h-4 rounded-full ${
                                (cls.knowledgeMastery || 0) >= 85
                                  ? "bg-green-500"
                                  : (cls.knowledgeMastery || 0) >= 75
                                    ? "bg-yellow-500"
                                    : (cls.knowledgeMastery || 0) >= 60
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                            ></div>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center space-x-2">
                            <span>
                              {cls.problemSolvingAbility?.toFixed(1) || "0.0"}%
                            </span>
                            <div
                              className={`w-4 h-4 rounded-full ${
                                (cls.problemSolvingAbility || 0) >= 85
                                  ? "bg-green-500"
                                  : (cls.problemSolvingAbility || 0) >= 75
                                    ? "bg-yellow-500"
                                    : (cls.problemSolvingAbility || 0) >= 60
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="mt-4 text-xs text-gray-500 flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>优秀</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>良好</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>待改进</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>需关注</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">
              暂无足够数据生成热力图。
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {selectedClass.name}{" "}
              {classToCompare ? `vs ${classToCompare.name}` : ""} 表现对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white/80 border-2 border-black p-4 rounded-lg">
              {classToCompare && (
                <h3 className="font-semibold mb-2 text-sm">
                  {selectedClass.name} vs {classToCompare.name}
                </h3>
              )}
              <p className="text-sm text-gray-700 leading-relaxed">
                {performanceComparisonText}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">教学建议</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white/80 border-2 border-black p-4 rounded-lg">
              <p className="text-sm text-gray-700 leading-relaxed">
                {teachingSuggestionText}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {selectedClass.name} 班级表现
            </CardTitle>
            <CardDescription className="text-xs">
              关键指标与表现总结
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-[#B9FF66]/10 border-2 border-black p-3 rounded-lg">
                  <div className="text-2xl font-bold text-black">
                    {selectedClass.averageScore?.toFixed(1) || "0.0"}
                  </div>
                  <div className="text-sm text-[#5E9622]">当前平均分</div>
                </div>
                <div className="bg-[#B9FF66]/20 border-2 border-black p-3 rounded-lg">
                  <div className="text-2xl font-bold text-black">
                    {selectedClass.excellentRate?.toFixed(1) || "0.0"}%
                  </div>
                  <div className="text-sm text-[#5E9622]">优秀率</div>
                </div>
                <div className="bg-[#B9FF66]/10 border-2 border-black p-3 rounded-lg">
                  <div className="text-2xl font-bold text-black">
                    {selectedClass.studentCount || 0}
                  </div>
                  <div className="text-sm text-[#5E9622]">学生人数</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">班级表现总结</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    • 班级 {selectedClass.name} 目前有{" "}
                    {selectedClass.studentCount || 0} 名学生
                  </p>
                  <p>
                    • 平均成绩为{" "}
                    {selectedClass.averageScore?.toFixed(1) || "0.0"} 分
                  </p>
                  <p>
                    • 优秀率达到{" "}
                    {selectedClass.excellentRate?.toFixed(1) || "0.0"}%
                  </p>
                  <p className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    {(selectedClass.excellentRate || 0) >= 80
                      ? "班级表现优秀，继续保持"
                      : (selectedClass.excellentRate || 0) >= 60
                        ? "班级表现良好，可适当提升难度"
                        : (selectedClass.excellentRate || 0) >= 40
                          ? "建议加强基础知识巩固"
                          : "需要重点关注，调整教学策略"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {classToCompare && (
          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {classToCompare.name} 班级表现
              </CardTitle>
              <CardDescription className="text-xs">
                关键指标与表现总结
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-[#B9FF66]/10 border-2 border-black p-3 rounded-lg">
                    <div className="text-2xl font-bold text-black">
                      {classToCompare.averageScore?.toFixed(1) || "0.0"}
                    </div>
                    <div className="text-sm text-[#5E9622]">当前平均分</div>
                  </div>
                  <div className="bg-[#B9FF66]/20 border-2 border-black p-3 rounded-lg">
                    <div className="text-2xl font-bold text-black">
                      {classToCompare.excellentRate?.toFixed(1) || "0.0"}%
                    </div>
                    <div className="text-sm text-[#5E9622]">优秀率</div>
                  </div>
                  <div className="bg-[#B9FF66]/10 border-2 border-black p-3 rounded-lg">
                    <div className="text-2xl font-bold text-black">
                      {classToCompare.studentCount || 0}
                    </div>
                    <div className="text-sm text-[#5E9622]">学生人数</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">班级表现总结</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>
                      • 班级 {classToCompare.name} 目前有{" "}
                      {classToCompare.studentCount || 0} 名学生
                    </p>
                    <p>
                      • 平均成绩为{" "}
                      {classToCompare.averageScore?.toFixed(1) || "0.0"} 分
                    </p>
                    <p>
                      • 优秀率达到{" "}
                      {classToCompare.excellentRate?.toFixed(1) || "0.0"}%
                    </p>
                    <p className="mt-3 p-2 bg-gray-50 rounded text-xs">
                      {(classToCompare.excellentRate || 0) >= 80
                        ? "班级表现优秀，继续保持"
                        : (classToCompare.excellentRate || 0) >= 60
                          ? "班级表现良好，可适当提升难度"
                          : (classToCompare.excellentRate || 0) >= 40
                            ? "建议加强基础知识巩固"
                            : "需要重点关注，调整教学策略"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {selectedClass.name} 成绩分布
            </CardTitle>
            <CardDescription className="text-xs">
              各学科成绩与成绩等级分布
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">科目成绩分析</h4>
                  <p className="text-xs text-gray-500 py-4">
                    需要从OverviewTab的"各科目表现"获取真实数据
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">成绩分布</h4>
                  <p className="text-xs text-gray-500 py-4">
                    需要从grade_data表查询真实分布数据
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {classToCompare && (
          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {classToCompare.name} 成绩分布
              </CardTitle>
              <CardDescription className="text-xs">
                各学科成绩与成绩等级分布
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">科目成绩分析</h4>
                    <p className="text-xs text-gray-500 py-4">
                      需要从OverviewTab的"各科目表现"获取真实数据
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">成绩分布</h4>
                    <p className="text-xs text-gray-500 py-4">
                      需要从grade_data表查询真实分布数据
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {selectedClass.name} 能力维度
            </CardTitle>
            <CardDescription className="text-xs">
              多维度核心能力表现评估
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h4 className="font-medium mb-3">能力维度评估</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">知识掌握</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-full rounded-full bg-blue-500`}
                        style={{
                          width: `${Math.min(100, selectedClass.knowledgeMastery || (selectedClass.averageScore || 0) * 0.8)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs w-12 text-right">
                      {(
                        selectedClass.knowledgeMastery ||
                        (selectedClass.averageScore || 0) * 0.8
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">解题能力</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-full rounded-full bg-green-500`}
                        style={{
                          width: `${Math.min(100, selectedClass.problemSolvingAbility || (selectedClass.averageScore || 0) * 0.9)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs w-12 text-right">
                      {(
                        selectedClass.problemSolvingAbility ||
                        (selectedClass.averageScore || 0) * 0.9
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">学习态度</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-full rounded-full bg-yellow-500`}
                        style={{
                          width: `${Math.min(100, selectedClass.learningAttitude || (selectedClass.averageScore || 0) * 0.75 + 10)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs w-12 text-right">
                      {(
                        selectedClass.learningAttitude ||
                        (selectedClass.averageScore || 0) * 0.75 + 10
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">考试稳定性</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-full rounded-full bg-purple-500`}
                        style={{
                          width: `${Math.min(100, selectedClass.examStability || (selectedClass.averageScore || 0) * 0.85)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs w-12 text-right">
                      {(
                        selectedClass.examStability ||
                        (selectedClass.averageScore || 0) * 0.85
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  综合评估: {selectedClass.name} 在知识掌握和解题能力方面
                  {(selectedClass.averageScore || 0) >= 80
                    ? "表现优秀"
                    : (selectedClass.averageScore || 0) >= 70
                      ? "表现良好"
                      : "需要加强"}
                  ，建议
                  {(selectedClass.averageScore || 0) >= 80
                    ? "继续保持并提升难度"
                    : (selectedClass.averageScore || 0) >= 70
                      ? "针对性训练提升"
                      : "加强基础训练"}
                  。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        {classToCompare && (
          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {classToCompare.name} 能力维度
              </CardTitle>
              <CardDescription className="text-xs">
                多维度核心能力表现评估
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="font-medium mb-3">能力维度评估</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">知识掌握</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-full rounded-full bg-blue-500`}
                          style={{
                            width: `${Math.min(100, classToCompare.knowledgeMastery || (classToCompare.averageScore || 0) * 0.82)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs w-12 text-right">
                        {(
                          classToCompare.knowledgeMastery ||
                          (classToCompare.averageScore || 0) * 0.82
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">解题能力</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-full rounded-full bg-green-500`}
                          style={{
                            width: `${Math.min(100, classToCompare.problemSolvingAbility || (classToCompare.averageScore || 0) * 0.88)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs w-12 text-right">
                        {(
                          classToCompare.problemSolvingAbility ||
                          (classToCompare.averageScore || 0) * 0.88
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">学习态度</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-full rounded-full bg-yellow-500`}
                          style={{
                            width: `${Math.min(100, classToCompare.learningAttitude || (classToCompare.averageScore || 0) * 0.78 + 8)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs w-12 text-right">
                        {(
                          classToCompare.learningAttitude ||
                          (classToCompare.averageScore || 0) * 0.78 + 8
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">考试稳定性</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-full rounded-full bg-purple-500`}
                          style={{
                            width: `${Math.min(100, classToCompare.examStability || (classToCompare.averageScore || 0) * 0.87)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs w-12 text-right">
                        {(
                          classToCompare.examStability ||
                          (classToCompare.averageScore || 0) * 0.87
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    综合评估: {classToCompare.name} 在知识掌握和解题能力方面
                    {(classToCompare.averageScore || 0) >= 80
                      ? "表现优秀"
                      : (classToCompare.averageScore || 0) >= 70
                        ? "表现良好"
                        : "需要加强"}
                    ，建议
                    {(classToCompare.averageScore || 0) >= 80
                      ? "继续保持并提升难度"
                      : (classToCompare.averageScore || 0) >= 70
                        ? "针对性训练提升"
                        : "加强基础训练"}
                    。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ComparisonTab;
