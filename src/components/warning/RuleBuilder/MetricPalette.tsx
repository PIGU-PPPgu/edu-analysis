/**
 * 指标面板组件 - 可拖拽的指标库
 * 用户可以从这里拖拽指标到画布构建预警规则
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  Search,
  GripVertical,
  Info,
  TrendingUp,
  GraduationCap,
  BookOpen,
  Users,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricDefinition, DragItem } from "./types";
import { allMetrics, metricsByCategory } from "./metricDefinitions";

interface MetricPaletteProps {
  className?: string;
  onDragStart?: (item: DragItem) => void;
  compact?: boolean;
}

// 类别图标映射
const categoryIcons = {
  grade: GraduationCap,
  trend: TrendingUp,
  homework: BookOpen,
  behavior: Users,
  statistical: BarChart3,
} as const;

// 类别显示名称
const categoryNames = {
  grade: "成绩指标",
  trend: "趋势分析",
  homework: "作业相关",
  behavior: "行为表现",
  statistical: "统计数据",
} as const;

// 可拖拽的指标项组件
const DraggableMetricItem: React.FC<{
  metric: MetricDefinition;
  onDragStart?: (item: DragItem) => void;
}> = ({ metric, onDragStart }) => {
  const handleDragStart = (e: React.DragEvent) => {
    const dragItem: DragItem = {
      type: "metric",
      data: metric,
      source: "palette",
    };

    // 设置拖拽数据
    e.dataTransfer.setData("application/json", JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = "copy";

    // 触发回调
    onDragStart?.(dragItem);
  };

  // 根据指标类型确定颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case "numeric":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "percentage":
        return "bg-green-100 text-green-800 border-green-200";
      case "rank":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "boolean":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "category":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getDataSourceColor = (source: string) => {
    switch (source) {
      case "grade_data":
        return "border-l-blue-500";
      case "homework_submissions":
        return "border-l-green-500";
      case "students":
        return "border-l-orange-500";
      case "calculated":
        return "border-l-purple-500";
      default:
        return "border-l-gray-500";
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "group p-3 bg-white border-2 border-black rounded-lg cursor-grab active:cursor-grabbing",
        "hover:shadow-[4px_4px_0px_0px_#000] transition-all duration-200",
        "border-l-4",
        getDataSourceColor(metric.dataSource)
      )}
    >
      {/* 拖拽手柄 */}
      <div className="flex items-start gap-3">
        <GripVertical className="h-4 w-4 text-gray-400 mt-1 group-hover:text-gray-600" />

        <div className="flex-1 min-w-0">
          {/* 指标标题和图标 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{metric.icon}</span>
            <h4 className="font-bold text-[#191A23] text-sm truncate">
              {metric.displayName}
            </h4>
          </div>

          {/* 指标描述 */}
          <p className="text-xs text-[#191A23]/70 mb-3 line-clamp-2">
            {metric.description}
          </p>

          {/* 指标属性标签 */}
          <div className="flex flex-wrap gap-1">
            <Badge
              className={cn(
                "text-xs font-medium border",
                getTypeColor(metric.type)
              )}
            >
              {metric.type}
            </Badge>
            {metric.unit && (
              <Badge variant="outline" className="text-xs border-black">
                {metric.unit}
              </Badge>
            )}
            {metric.range && (
              <Badge variant="outline" className="text-xs border-black">
                {metric.range[0]}-{metric.range[1]}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 指标类别组件
const MetricCategory: React.FC<{
  category: string;
  metrics: MetricDefinition[];
  expanded: boolean;
  onToggle: () => void;
  onDragStart?: (item: DragItem) => void;
}> = ({ category, metrics, expanded, onToggle, onDragStart }) => {
  const IconComponent =
    categoryIcons[category as keyof typeof categoryIcons] || BarChart3;
  const categoryName =
    categoryNames[category as keyof typeof categoryNames] || category;

  return (
    <Card className="border-2 border-black shadow-[2px_2px_0px_0px_#000]">
      {/* 类别标题 */}
      <CardHeader
        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="h-4 w-4 text-[#191A23]" />
            <CardTitle className="text-sm font-bold text-[#191A23]">
              {categoryName}
            </CardTitle>
            <Badge variant="outline" className="text-xs border-black">
              {metrics.length}
            </Badge>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </CardHeader>

      {/* 指标列表 */}
      {expanded && (
        <CardContent className="p-3 pt-0 space-y-2">
          {metrics.map((metric) => (
            <DraggableMetricItem
              key={metric.id}
              metric={metric}
              onDragStart={onDragStart}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
};

const MetricPalette: React.FC<MetricPaletteProps> = ({
  className,
  onDragStart,
  compact = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    grade: true,
    trend: false,
    homework: false,
    behavior: false,
    statistical: false,
  });

  // 筛选指标
  const filteredMetrics = useMemo(() => {
    if (!searchTerm) return allMetrics;

    const term = searchTerm.toLowerCase();
    return allMetrics.filter(
      (metric) =>
        metric.displayName.toLowerCase().includes(term) ||
        metric.description.toLowerCase().includes(term) ||
        metric.name.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  // 按类别分组筛选后的指标
  const filteredMetricsByCategory = useMemo(() => {
    const grouped: Record<string, MetricDefinition[]> = {};

    filteredMetrics.forEach((metric) => {
      if (!grouped[metric.category]) {
        grouped[metric.category] = [];
      }
      grouped[metric.category].push(metric);
    });

    return grouped;
  }, [filteredMetrics]);

  // 切换类别展开状态
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // 展开所有类别
  const expandAll = () => {
    const newState: Record<string, boolean> = {};
    Object.keys(metricsByCategory).forEach((category) => {
      newState[category] = true;
    });
    setExpandedCategories(newState);
  };

  // 收起所有类别
  const collapseAll = () => {
    const newState: Record<string, boolean> = {};
    Object.keys(metricsByCategory).forEach((category) => {
      newState[category] = false;
    });
    setExpandedCategories(newState);
  };

  return (
    <Card
      className={cn(
        "border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] h-fit",
        className
      )}
    >
      {/* 面板标题 */}
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-black font-black uppercase tracking-wide">
            指标库
          </CardTitle>
          <Badge className="bg-white text-[#191A23] border-2 border-black text-xs font-bold">
            {filteredMetrics.length} 项
          </Badge>
        </div>

        {/* 搜索框 */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="搜索指标..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-2 border-black"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={expandAll}
            className="flex-1 border-2 border-black bg-white text-black font-bold text-xs"
          >
            展开全部
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={collapseAll}
            className="flex-1 border-2 border-black bg-white text-black font-bold text-xs"
          >
            收起全部
          </Button>
        </div>
      </CardHeader>

      {/* 指标列表 */}
      <CardContent className="p-4">
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {/* 使用说明 */}
            <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-800">
                    拖拽指标到右侧画布构建预警规则
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    不同颜色的边框代表不同的数据源
                  </p>
                </div>
              </div>
            </div>

            {/* 指标类别 */}
            {Object.entries(filteredMetricsByCategory).map(
              ([category, metrics]) => (
                <MetricCategory
                  key={category}
                  category={category}
                  metrics={metrics}
                  expanded={expandedCategories[category]}
                  onToggle={() => toggleCategory(category)}
                  onDragStart={onDragStart}
                />
              )
            )}

            {/* 无结果提示 */}
            {filteredMetrics.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">未找到匹配的指标</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="mt-2"
                >
                  清除搜索
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MetricPalette;
