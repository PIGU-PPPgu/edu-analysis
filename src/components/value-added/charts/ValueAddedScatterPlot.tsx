"use client";

/**
 * 增值分析散点图组件
 * 展示入口分 vs 出口分关系，识别增值效果
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import type {
  ClassValueAdded,
  TeacherValueAdded,
  StudentValueAdded,
} from "@/types/valueAddedTypes";

interface ScatterPlotData {
  id: string;
  data: Array<{
    x: number; // 入口分
    y: number; // 出口分
    name: string; // 班级/教师/学生名称
    valueAddedRate: number; // 增值率
  }>;
}

export interface ScatterPlotClickData {
  name: string;
  entryScore: number;
  exitScore: number;
  valueAddedRate: number;
  rawData: ClassValueAdded | TeacherValueAdded | StudentValueAdded;
}

interface ValueAddedScatterPlotProps {
  data: (ClassValueAdded | TeacherValueAdded | StudentValueAdded)[];
  type: "class" | "teacher" | "student";
  title?: string;
  description?: string;
  onPointClick?: (data: ScatterPlotClickData) => void;
}

/**
 * 计算线性回归趋势线
 */
function calculateTrendLine(points: Array<{ x: number; y: number }>): {
  slope: number;
  intercept: number;
} {
  if (points.length === 0) return { slope: 1, intercept: 0 };

  const n = points.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;

  points.forEach((p) => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  });

  const denominator = n * sumX2 - sumX * sumX;

  // 防止除零：如果所有x值相同，返回水平线
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * 获取名称字段
 */
function getName(
  item: ClassValueAdded | TeacherValueAdded | StudentValueAdded,
  type: string
): string {
  if (type === "class") return (item as ClassValueAdded).class_name;
  if (type === "teacher") return (item as TeacherValueAdded).teacher_name;
  return (item as StudentValueAdded).student_name;
}

/**
 * 获取唯一标识键（组合键，避免重名问题）
 */
function getUniqueKey(
  item: ClassValueAdded | TeacherValueAdded | StudentValueAdded,
  type: string
): string {
  if (type === "class") {
    const classItem = item as ClassValueAdded;
    return `${classItem.class_name}-${classItem.subject}`;
  }
  if (type === "teacher") {
    const teacherItem = item as TeacherValueAdded;
    return `${teacherItem.teacher_name}-${teacherItem.subject}`;
  }
  const studentItem = item as StudentValueAdded;
  return `${studentItem.student_name}-${studentItem.class_name}-${studentItem.subject}`;
}

export function ValueAddedScatterPlot({
  data,
  type,
  title = "增值效果散点图",
  description = "入口分 vs 出口分关系分析",
  onPointClick,
}: ValueAddedScatterPlotProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  // 准备散点图数据
  const scatterData: ScatterPlotData[] = [
    {
      id: "数据点",
      data: data.map((item) => ({
        x: item.avg_score_entry || 0,
        y: item.avg_score_exit || 0,
        name: getName(item, type),
        uniqueKey: getUniqueKey(item, type), // 添加唯一键
        valueAddedRate: item.avg_score_value_added_rate || 0,
      })),
    },
  ];

  // 计算趋势线
  const points = scatterData[0].data.map((d) => ({ x: d.x, y: d.y }));
  const { slope, intercept } = calculateTrendLine(points);

  // 计算四象限分割线（平均值）
  const avgEntry = points.reduce((sum, p) => sum + p.x, 0) / points.length || 0;
  const avgExit = points.reduce((sum, p) => sum + p.y, 0) / points.length || 0;

  // 计算数据范围
  const allX = points.map((p) => p.x);
  const allY = points.map((p) => p.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  // 生成趋势线数据
  const trendLineData: ScatterPlotData = {
    id: "趋势线",
    data: [
      { x: minX, y: slope * minX + intercept, name: "", valueAddedRate: 0 },
      { x: maxX, y: slope * maxX + intercept, name: "", valueAddedRate: 0 },
    ],
  };

  // 合并数据
  const chartData = [scatterData[0], trendLineData];

  // 统计四象限数据
  const quadrants = {
    q1: data.filter(
      (item) =>
        (item.avg_score_entry || 0) >= avgEntry &&
        (item.avg_score_exit || 0) >= avgExit
    ).length, // 高进高出
    q2: data.filter(
      (item) =>
        (item.avg_score_entry || 0) < avgEntry &&
        (item.avg_score_exit || 0) >= avgExit
    ).length, // 低进高出 ✨
    q3: data.filter(
      (item) =>
        (item.avg_score_entry || 0) < avgEntry &&
        (item.avg_score_exit || 0) < avgExit
    ).length, // 低进低出
    q4: data.filter(
      (item) =>
        (item.avg_score_entry || 0) >= avgEntry &&
        (item.avg_score_exit || 0) < avgExit
    ).length, // 高进低出 ⚠️
  };

  // 识别最佳增值案例（低进高出）
  const bestCases = data
    .filter(
      (item) =>
        (item.avg_score_entry || 0) < avgEntry &&
        (item.avg_score_exit || 0) >= avgExit
    )
    .sort((a, b) => b.avg_score_value_added_rate - a.avg_score_value_added_rate)
    .slice(0, 3);

  // 识别需要关注案例（高进低出）
  const concernCases = data
    .filter(
      (item) =>
        (item.avg_score_entry || 0) >= avgEntry &&
        (item.avg_score_exit || 0) < avgExit
    )
    .sort((a, b) => a.avg_score_value_added_rate - b.avg_score_value_added_rate)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 散点图 */}
          <div style={{ height: "500px" }}>
            <ResponsiveScatterPlot
              data={chartData}
              margin={{ top: 40, right: 140, bottom: 70, left: 90 }}
              xScale={{ type: "linear", min: minX - 5, max: maxX + 5 }}
              yScale={{ type: "linear", min: minY - 5, max: maxY + 5 }}
              blendMode="multiply"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "入口平均分",
                legendPosition: "middle",
                legendOffset: 46,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "出口平均分",
                legendPosition: "middle",
                legendOffset: -60,
              }}
              colors={({ serieId }) =>
                serieId === "趋势线" ? "#ff6b6b" : "#4dabf7"
              }
              nodeSize={(node) => (node.serieId === "趋势线" ? 0 : 10)}
              tooltip={({ node }) => {
                if (node.serieId === "趋势线") return null;
                const d = node.data as any;
                return (
                  <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                    <p className="font-bold text-gray-800">{d.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      入口分: {d.x.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      出口分: {d.y.toFixed(2)}
                    </p>
                    <p className="text-sm font-semibold text-blue-600 mt-1">
                      增值率: {(d.valueAddedRate * 100).toFixed(2)}%
                    </p>
                  </div>
                );
              }}
              markers={[
                {
                  axis: "y",
                  value: avgExit,
                  lineStyle: { stroke: "#b0b0b0", strokeWidth: 2 },
                  legend: "平均出口分",
                  legendPosition: "top-left",
                },
                {
                  axis: "x",
                  value: avgEntry,
                  lineStyle: { stroke: "#b0b0b0", strokeWidth: 2 },
                  legend: "平均入口分",
                  legendPosition: "bottom-right",
                },
              ]}
              legends={[
                {
                  anchor: "top-right",
                  direction: "column",
                  translateX: 130,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemsSpacing: 5,
                  symbolSize: 12,
                  symbolShape: "circle",
                },
              ]}
              onClick={(node) => {
                if (node.serieId === "趋势线") return;
                if (!onPointClick) return;

                const nodeData = node.data as any;
                // 使用唯一键从原始数据中查找，避免重名问题
                const rawDataItem = data.find(
                  (item) => getUniqueKey(item, type) === nodeData.uniqueKey
                );
                if (!rawDataItem) return;

                onPointClick({
                  name: nodeData.name,
                  entryScore: nodeData.x,
                  exitScore: nodeData.y,
                  valueAddedRate: nodeData.valueAddedRate,
                  rawData: rawDataItem,
                });
              }}
            />
          </div>

          {/* 四象限分析 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="text-xs text-green-700 font-medium">
                Q1: 高进高出
              </div>
              <div className="text-2xl font-bold text-green-700">
                {quadrants.q1}
              </div>
              <div className="text-xs text-green-600 mt-1">稳定表现</div>
            </Card>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="text-xs text-blue-700 font-medium">
                Q2: 低进高出 ✨
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {quadrants.q2}
              </div>
              <div className="text-xs text-blue-600 mt-1">增值典范</div>
            </Card>

            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="text-xs text-gray-700 font-medium">
                Q3: 低进低出
              </div>
              <div className="text-2xl font-bold text-gray-700">
                {quadrants.q3}
              </div>
              <div className="text-xs text-gray-600 mt-1">需要提升</div>
            </Card>

            <Card className="p-4 bg-red-50 border-red-200">
              <div className="text-xs text-red-700 font-medium">
                Q4: 高进低出 ⚠️
              </div>
              <div className="text-2xl font-bold text-red-700">
                {quadrants.q4}
              </div>
              <div className="text-xs text-red-600 mt-1">需要关注</div>
            </Card>
          </div>

          {/* 关键发现 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 增值典范 */}
            {bestCases.length > 0 && (
              <Card className="p-4 bg-blue-50">
                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  ✨ 增值典范
                </h4>
                <ul className="space-y-2 text-sm">
                  {bestCases.map((item, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="font-medium">{getName(item, type)}</span>
                      <span className="text-blue-600 font-bold">
                        +{(item.avg_score_value_added_rate * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* 需要关注 */}
            {concernCases.length > 0 && (
              <Card className="p-4 bg-red-50">
                <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                  ⚠️ 需要关注
                </h4>
                <ul className="space-y-2 text-sm">
                  {concernCases.map((item, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="font-medium">{getName(item, type)}</span>
                      <span className="text-red-600 font-bold">
                        {(item.avg_score_value_added_rate * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* 趋势说明 */}
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
            <p>
              <strong>趋势线斜率:</strong> {slope.toFixed(3)} (
              {slope > 1
                ? "出口分增长快于入口分"
                : slope < 1
                  ? "出口分增长慢于入口分"
                  : "出口分与入口分同步增长"}
              )
            </p>
            <p className="mt-2">
              <strong>解读:</strong>{" "}
              {slope > 1.05
                ? "整体增值效果显著，教学质量优秀"
                : slope > 0.95
                  ? "增值效果稳定，保持现有水平"
                  : "增值效果有待提升，需要改进教学方法"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
