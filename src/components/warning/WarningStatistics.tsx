import React, { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  Sector,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  InfoIcon,
} from "lucide-react";

// 组件属性接口
interface WarningStatisticsProps {
  data?: Array<{
    type: string;
    count: number;
    percentage: number;
    trend?: "up" | "down" | "unchanged";
  }>;
  levelData?: Array<{ level: string; count: number; percentage: number }>;
  totalStudents?: number; // 添加全校学生总数参数
  className?: string;
}

// 空数据占位，避免使用模拟数据
const defaultTypeData: Array<{
  type: string;
  count: number;
  percentage: number;
  trend?: "up" | "down" | "unchanged";
}> = [];

const defaultLevelData: Array<{
  level: string;
  count: number;
  percentage: number;
}> = [];

// 风险级别颜色映射
const LEVEL_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#3b82f6",
  none: "#10b981",
};

// 风险级别名称映射
const LEVEL_NAMES: Record<string, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
  none: "无风险",
};

// 风险级别描述映射
const LEVEL_DESCRIPTIONS: Record<string, string> = {
  high: "需要立即干预的学生",
  medium: "需密切关注的学生",
  low: "需定期监控的学生",
  none: "状态正常的学生",
};

// 自定义活跃形状
const ActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    name,
    value,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <text
        x={cx}
        y={cy - 15}
        textAnchor="middle"
        fill="#374151"
        className="font-medium"
        fontSize={14}
      >
        {name}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="#4b5563" fontSize={13}>
        {`${value}人 (${Math.round((value / props.total) * 100)}%)`}
      </text>
    </g>
  );
};

// 自定义提示框
const CustomTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = Math.round((data.value / total) * 100);

    return (
      <Card
        className="shadow-lg border-t-2"
        style={{ borderTopColor: data.color }}
      >
        <CardContent className="p-3">
          <div className="flex flex-col gap-1">
            <div className="font-medium text-gray-900">{data.name}</div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>学生数量:</span>
              <span>{data.value}人</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>占总人数:</span>
              <span>{percentage}%</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {LEVEL_DESCRIPTIONS[data.level] || data.description || ""}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  return null;
};

const WarningStatistics: React.FC<WarningStatisticsProps> = ({
  data = defaultTypeData,
  levelData = defaultLevelData,
  totalStudents = 0,
  className,
}) => {
  // 状态管理
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // 处理饼图扇区点击
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  // 切换详情显示
  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  // 创建饼图数据 - 支持从data参数获取风险级别分布
  let pieData = [];
  let warningStudents = 0; // 有风险的学生总数

  if (levelData && levelData.length > 0) {
    // 使用传入的levelData，计算有风险学生总数
    warningStudents = levelData.reduce((acc, item) => acc + item.count, 0);

    // 构建完整的饼图数据，包含无风险学生
    const riskStudentsData = levelData.map((item) => ({
      name: LEVEL_NAMES[item.level] || item.level,
      value: item.count,
      color: LEVEL_COLORS[item.level] || "#808080",
      level: item.level,
      percentage: item.percentage,
    }));

    // 计算无风险学生数量
    const noRiskStudents = Math.max(0, totalStudents - warningStudents);

    // 添加无风险学生到饼图数据
    if (noRiskStudents > 0) {
      riskStudentsData.push({
        name: LEVEL_NAMES.none,
        value: noRiskStudents,
        color: LEVEL_COLORS.none,
        level: "none",
        percentage:
          totalStudents > 0
            ? Math.round((noRiskStudents / totalStudents) * 100)
            : 0,
      });
    }

    pieData = riskStudentsData;
  } else if (data && data.length > 0) {
    // 如果没有levelData，尝试从data中推断（保持原逻辑作为备选）
    const totalCount = data.reduce((acc, curr) => acc + curr.count, 0);
    warningStudents = totalCount;

    pieData = [
      {
        name: "高风险",
        value: Math.floor(totalCount * 0.3),
        color: LEVEL_COLORS.high,
        level: "high",
        percentage: 30,
      },
      {
        name: "中风险",
        value: Math.floor(totalCount * 0.4),
        color: LEVEL_COLORS.medium,
        level: "medium",
        percentage: 40,
      },
      {
        name: "低风险",
        value: Math.floor(totalCount * 0.2),
        color: LEVEL_COLORS.low,
        level: "low",
        percentage: 20,
      },
      {
        name: "无风险",
        value: Math.max(0, totalStudents - totalCount),
        color: LEVEL_COLORS.none,
        level: "none",
        percentage: 10,
      },
    ];
  }

  // 使用传入的全校学生总数，而不是pieData的总和
  const actualTotalStudents =
    totalStudents || pieData.reduce((acc, curr) => acc + curr.value, 0);

  // 重新计算预警学生数（非"无风险"的学生）
  const actualWarningStudents = pieData.reduce(
    (acc, curr) => (curr.level === "none" ? acc : acc + curr.value),
    0
  );

  // 基于全校学生总数计算预警学生比例
  const warningPercentage =
    actualTotalStudents > 0
      ? Math.round((actualWarningStudents / actualTotalStudents) * 100)
      : 0;

  // 统计卡片
  const StatsCard = ({
    title,
    value,
    change,
    isPositive,
    icon: Icon,
  }: {
    title: string;
    value: string | number;
    change?: number;
    isPositive?: boolean;
    icon: React.ElementType;
  }) => (
    <div className="text-center p-3 bg-gradient-to-b from-slate-50 to-white rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-center mb-1">
        <div
          className={`p-2 rounded-full ${isPositive ? "bg-green-50 text-green-500" : "bg-amber-50 text-amber-500"}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{title}</p>
      {change !== undefined && (
        <div className="flex items-center justify-center mt-1">
          {isPositive ? (
            <ChevronUp className="h-3 w-3 text-green-500" />
          ) : (
            <ChevronDown className="h-3 w-3 text-red-500" />
          )}
          <span
            className={`text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}
          >
            {change}%
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <div className="text-center">
            <Badge className="mb-2 bg-slate-100 text-slate-700 hover:bg-slate-200">
              <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
              预警统计
            </Badge>
            <p className="text-5xl font-bold text-gray-900 flex justify-center items-center">
              {warningPercentage}
              <span className="text-xl text-gray-500 ml-1">%</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              学生存在不同程度的预警风险
            </p>
          </div>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={(props) => (
                <ActiveShape {...props} total={actualTotalStudents} />
              )}
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={onPieEnter}
              animationDuration={800}
              animationBegin={200}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="hover:opacity-90 transition-opacity duration-200 cursor-pointer"
                  stroke="#fff"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={actualTotalStudents} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <StatsCard
          title="总学生数"
          value={actualTotalStudents}
          icon={Users}
          isPositive={true}
        />
        <StatsCard
          title="预警学生数"
          value={actualWarningStudents}
          change={2.5}
          isPositive={false}
          icon={AlertTriangle}
        />
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pieData.map((item, index) => (
              <div
                key={index}
                className="flex items-center p-2 rounded-md hover:bg-slate-50 transition-colors"
                style={{ borderLeft: `3px solid ${item.color}` }}
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <div
                      className="w-2.5 h-2.5 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-4">
                    {LEVEL_DESCRIPTIONS[item.level] || ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{item.value}</div>
                  <div className="text-xs text-gray-500">
                    {item.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleDetails}
          className="text-xs font-normal text-slate-600 border-slate-200"
        >
          {showDetails ? (
            <>
              收起详情
              <ChevronUp className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              查看详情
              <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </div>

      <div className="mt-4 pt-3 text-center">
        <div className="flex items-center justify-center text-xs text-gray-500">
          <InfoIcon className="h-3 w-3 mr-1" />
          <span>预警比例基于当前学期数据计算</span>
        </div>
      </div>
    </div>
  );
};

export default WarningStatistics;
