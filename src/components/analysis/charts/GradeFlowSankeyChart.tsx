/**
 * 🌊 等级流动桑基图组件
 * 展示学生在连续两次考试间的等级变化（A+→A, B+→A等）
 */

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";

export interface SankeyNode {
  name: string;
  color: string;
}

export interface SankeyLink {
  source: string; // 源节点名称
  target: string; // 目标节点名称
  value: number; // 流量（学生数）
  color?: string;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface GradeFlowSankeyChartProps {
  data: SankeyData;
  title?: string;
  height?: number;
  sourceLabel?: string; // 左侧标签（如"第一次考试"）
  targetLabel?: string; // 右侧标签（如"第二次考试"）
}

// 等级颜色配置
const GRADE_COLORS: Record<string, string> = {
  "A+": "#4ADE80",
  A: "#B9FF66",
  "B+": "#D4F1A6",
  B: "#E8F8C7",
  "C+": "#FEF08A",
  C: "#FDE68A",
  缺考: "#FF6B6B",
};

const GradeFlowSankeyChart: React.FC<GradeFlowSankeyChartProps> = ({
  data,
  title,
  height = 500,
  sourceLabel = "考试1",
  targetLabel = "考试2",
}) => {
  // 计算节点位置和大小
  const layoutData = useMemo(() => {
    const { nodes, links } = data;

    // 分离源节点和目标节点
    const sourceNodes = nodes.filter((n) =>
      links.some((l) => l.source === n.name)
    );
    const targetNodes = nodes.filter((n) =>
      links.some((l) => l.target === n.name)
    );

    // 计算每个节点的总流量
    const nodeValues: Record<string, { in: number; out: number }> = {};
    nodes.forEach((node) => {
      nodeValues[node.name] = { in: 0, out: 0 };
    });
    links.forEach((link) => {
      nodeValues[link.source].out += link.value;
      nodeValues[link.target].in += link.value;
    });

    // 计算总流量用于归一化
    const maxValue = Math.max(
      ...Object.values(nodeValues).map((v) => Math.max(v.in, v.out))
    );

    // 计算节点布局（垂直分布）
    const nodeHeight =
      (height - 100) / Math.max(sourceNodes.length, targetNodes.length);
    const nodeWidth = 30;
    const gap = 400; // 节点间水平间距

    const nodePositions: Record<
      string,
      { x: number; y: number; height: number }
    > = {};

    sourceNodes.forEach((node, index) => {
      const h = (nodeValues[node.name].out / maxValue) * nodeHeight * 0.8;
      nodePositions[`${sourceLabel}-${node.name}`] = {
        x: 50,
        y: index * nodeHeight + 50,
        height: Math.max(h, 20),
      };
    });

    targetNodes.forEach((node, index) => {
      const h = (nodeValues[node.name].in / maxValue) * nodeHeight * 0.8;
      nodePositions[`${targetLabel}-${node.name}`] = {
        x: 50 + gap,
        y: index * nodeHeight + 50,
        height: Math.max(h, 20),
      };
    });

    return { nodePositions, nodeValues, nodeWidth };
  }, [data, height, sourceLabel, targetLabel]);

  // 生成贝塞尔曲线路径
  const generatePath = (
    x1: number,
    y1: number,
    h1: number,
    x2: number,
    y2: number,
    h2: number
  ): string => {
    const ctrlX = (x1 + x2) / 2;

    // 上边缘曲线
    const topPath = `M ${x1} ${y1} C ${ctrlX} ${y1}, ${ctrlX} ${y2}, ${x2} ${y2}`;
    // 下边缘曲线
    const bottomPath = `L ${x2} ${y2 + h2} C ${ctrlX} ${y2 + h2}, ${ctrlX} ${y1 + h1}, ${x1} ${y1 + h1}`;

    return `${topPath} ${bottomPath} Z`;
  };

  if (data.nodes.length === 0 || data.links.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#191A23]/50">
        暂无等级流动数据
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="font-bold text-lg text-[#191A23] mb-4">{title}</h3>
      )}
      <Card className="border-2 border-[#191A23]">
        <CardContent className="p-6">
          <svg width="100%" height={height} viewBox={`0 0 600 ${height}`}>
            <defs>
              {/* 渐变定义 */}
              {data.links.map((link, index) => {
                const sourceColor =
                  GRADE_COLORS[link.source.replace(`${sourceLabel}-`, "")] ||
                  "#B9FF66";
                const targetColor =
                  GRADE_COLORS[link.target.replace(`${targetLabel}-`, "")] ||
                  "#60a5fa";
                return (
                  <linearGradient
                    key={`gradient-${index}`}
                    id={`gradient-${index}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      stopColor={sourceColor}
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="100%"
                      stopColor={targetColor}
                      stopOpacity={0.6}
                    />
                  </linearGradient>
                );
              })}
            </defs>

            {/* 绘制流动路径 */}
            {data.links.map((link, index) => {
              const sourceKey = `${sourceLabel}-${link.source}`;
              const targetKey = `${targetLabel}-${link.target}`;
              const sourcePos = layoutData.nodePositions[sourceKey];
              const targetPos = layoutData.nodePositions[targetKey];

              if (!sourcePos || !targetPos) return null;

              const flowHeight =
                (link.value / layoutData.nodeValues[link.source].out) *
                sourcePos.height;

              return (
                <g key={`link-${index}`}>
                  <path
                    d={generatePath(
                      sourcePos.x + layoutData.nodeWidth,
                      sourcePos.y,
                      flowHeight,
                      targetPos.x,
                      targetPos.y,
                      flowHeight
                    )}
                    fill={`url(#gradient-${index})`}
                    stroke="none"
                    opacity={0.5}
                    className="transition-opacity hover:opacity-80"
                  >
                    <title>{`${link.source} → ${link.target}: ${link.value}人`}</title>
                  </path>
                </g>
              );
            })}

            {/* 绘制节点 */}
            {Object.entries(layoutData.nodePositions).map(([key, pos]) => {
              const gradeName = key.includes(sourceLabel)
                ? key.replace(`${sourceLabel}-`, "")
                : key.replace(`${targetLabel}-`, "");
              const color = GRADE_COLORS[gradeName] || "#B9FF66";
              const isSource = key.includes(sourceLabel);
              const value = isSource
                ? layoutData.nodeValues[gradeName]?.out || 0
                : layoutData.nodeValues[gradeName]?.in || 0;

              return (
                <g key={key}>
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={layoutData.nodeWidth}
                    height={pos.height}
                    fill={color}
                    stroke="#191A23"
                    strokeWidth={2}
                    rx={4}
                  >
                    <title>{`${gradeName}: ${value}人`}</title>
                  </rect>
                  <text
                    x={
                      isSource ? pos.x - 10 : pos.x + layoutData.nodeWidth + 10
                    }
                    y={pos.y + pos.height / 2}
                    textAnchor={isSource ? "end" : "start"}
                    dominantBaseline="middle"
                    fill="#191A23"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {gradeName} ({value})
                  </text>
                </g>
              );
            })}

            {/* 标签 */}
            <text
              x={50}
              y={30}
              textAnchor="start"
              fill="#191A23"
              fontSize="16"
              fontWeight="bold"
            >
              {sourceLabel}
            </text>
            <text
              x={450}
              y={30}
              textAnchor="start"
              fill="#191A23"
              fontSize="16"
              fontWeight="bold"
            >
              {targetLabel}
            </text>
          </svg>

          {/* 图例 */}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {Object.entries(GRADE_COLORS).map(([grade, color]) => (
              <div key={grade} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 border-2 border-[#191A23] rounded"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-sm font-medium text-[#191A23]">
                  {grade}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeFlowSankeyChart;

/**
 * 从两次考试数据生成Sankey流动数据
 */
export function generateGradeFlowData(
  exam1Data: any[],
  exam2Data: any[],
  exam1Title: string = "考试1",
  exam2Title: string = "考试2"
): SankeyData {
  // 创建学生ID到等级的映射
  const exam1Grades: Record<string, string> = {};
  const exam2Grades: Record<string, string> = {};

  exam1Data.forEach((record) => {
    if (record.student_id && record.total_grade) {
      exam1Grades[record.student_id] = record.total_grade.trim();
    }
  });

  exam2Data.forEach((record) => {
    if (record.student_id && record.total_grade) {
      exam2Grades[record.student_id] = record.total_grade.trim();
    }
  });

  // 统计等级流动
  const flowCounts: Record<string, number> = {};
  const allGrades = new Set<string>();

  Object.keys(exam1Grades).forEach((studentId) => {
    if (exam2Grades[studentId]) {
      const from = exam1Grades[studentId];
      const to = exam2Grades[studentId];
      const key = `${from}→${to}`;
      flowCounts[key] = (flowCounts[key] || 0) + 1;
      allGrades.add(from);
      allGrades.add(to);
    }
  });

  // 构建节点
  const gradeOrder = ["A+", "A", "B+", "B", "C+", "C", "缺考"];
  const sortedGrades = gradeOrder.filter((g) => allGrades.has(g));

  const nodes: SankeyNode[] = sortedGrades.map((grade) => ({
    name: grade,
    color: GRADE_COLORS[grade] || "#B9FF66",
  }));

  // 构建链接
  const links: SankeyLink[] = [];
  Object.entries(flowCounts).forEach(([key, count]) => {
    const [source, target] = key.split("→");
    if (source && target && count > 0) {
      links.push({
        source,
        target,
        value: count,
      });
    }
  });

  return { nodes, links };
}

/**
 * 从历史考试数据生成多阶段流动
 */
export function generateMultiExamFlowData(
  examDataList: { title: string; data: any[] }[]
): SankeyData {
  if (examDataList.length < 2) {
    return { nodes: [], links: [] };
  }

  // 取最近两次考试
  const exam1 = examDataList[examDataList.length - 2];
  const exam2 = examDataList[examDataList.length - 1];

  return generateGradeFlowData(
    exam1.data,
    exam2.data,
    exam1.title,
    exam2.title
  );
}
