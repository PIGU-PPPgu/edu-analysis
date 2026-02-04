/**
 * 九段矩阵组件
 * 3x3矩阵展示学生按当前水平和增值水平的分布
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Users, ArrowUpRight, Grid3x3 } from "lucide-react";
import type { ValueAddedMetrics } from "@/types/valueAddedTypes";

// 段位定义（矩阵布局）
const SEGMENTS = [
  { id: 7, label: "第7段", title: "高分·退步", row: 0, col: 0, opacity: 0.7 },
  { id: 8, label: "第8段", title: "高分·持平", row: 0, col: 1, opacity: 0.8 },
  { id: 9, label: "第9段", title: "高分·进步", row: 0, col: 2, opacity: 1.0 },
  { id: 4, label: "第4段", title: "中分·退步", row: 1, col: 0, opacity: 0.4 },
  { id: 5, label: "第5段", title: "中分·持平", row: 1, col: 1, opacity: 0.5 },
  { id: 6, label: "第6段", title: "中分·进步", row: 1, col: 2, opacity: 0.6 },
  { id: 1, label: "第1段", title: "低分·退步", row: 2, col: 0, opacity: 0.1 },
  { id: 2, label: "第2段", title: "低分·持平", row: 2, col: 1, opacity: 0.2 },
  { id: 3, label: "第3段", title: "低分·进步", row: 2, col: 2, opacity: 0.3 },
];

interface NineLevelMatrixProps {
  metrics: ValueAddedMetrics[];
  onSelectSegment?: (segmentId: number, students: ValueAddedMetrics[]) => void;
}

const NineLevelMatrix: React.FC<NineLevelMatrixProps> = ({
  metrics,
  onSelectSegment,
}) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(
    null
  );

  // 计算每个段位的学生分布
  const segmentData = React.useMemo(() => {
    const distribution: Record<
      number,
      { count: number; percentage: number; students: ValueAddedMetrics[] }
    > = {};

    // 初始化
    SEGMENTS.forEach((seg) => {
      distribution[seg.id] = { count: 0, percentage: 0, students: [] };
    });

    // 统计
    metrics.forEach((metric) => {
      if (metric.level && distribution[metric.level]) {
        distribution[metric.level].count++;
        distribution[metric.level].students.push(metric);
      }
    });

    // 计算百分比
    const total = metrics.length;
    Object.keys(distribution).forEach((key) => {
      const id = parseInt(key);
      distribution[id].percentage =
        total > 0 ? Math.round((distribution[id].count / total) * 100) : 0;
    });

    return distribution;
  }, [metrics]);

  const handleSelectSegment = (segmentId: number) => {
    setSelectedSegmentId(segmentId);
    if (onSelectSegment) {
      onSelectSegment(segmentId, segmentData[segmentId].students);
    }
  };

  if (metrics.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="text-black font-black flex items-center gap-2">
          <Grid3x3 className="w-5 h-5" />
          九段评价矩阵
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full max-w-4xl mx-auto">
          {/* 横轴标签（顶部） */}
          <div className="flex justify-between mb-2 pl-12 pr-4 font-black text-xs md:text-sm text-[#6B7280] uppercase tracking-wider">
            <span className="w-1/3 text-center">退步</span>
            <span className="w-1/3 text-center">持平</span>
            <span className="w-1/3 text-center">进步</span>
          </div>

          <div className="flex">
            {/* 纵轴标签（左侧） */}
            <div className="flex flex-col justify-between pr-4 py-8 font-black text-xs md:text-sm text-[#6B7280] uppercase tracking-wider h-[600px] md:h-[500px]">
              <span className="writing-mode-vertical-rl transform rotate-180 flex-1 flex items-center justify-center">
                高分段
              </span>
              <span className="writing-mode-vertical-rl transform rotate-180 flex-1 flex items-center justify-center">
                中分段
              </span>
              <span className="writing-mode-vertical-rl transform rotate-180 flex-1 flex items-center justify-center">
                低分段
              </span>
            </div>

            {/* 3x3 矩阵网格 */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr h-[600px] md:h-[500px]">
              {SEGMENTS.map((seg) => {
                const stats = segmentData[seg.id] || {
                  count: 0,
                  percentage: 0,
                };
                const isSelected = selectedSegmentId === seg.id;

                return (
                  <div
                    key={seg.id}
                    onClick={() => handleSelectSegment(seg.id)}
                    className={cn(
                      "relative p-4 cursor-pointer transition-all duration-200 border-2 border-[#191A23]",
                      "flex flex-col justify-between group min-h-[120px]",
                      isSelected
                        ? "shadow-[6px_6px_0px_0px_#191A23] translate-x-[-2px] translate-y-[-2px] z-10"
                        : "shadow-[2px_2px_0px_0px_#191A23] hover:shadow-[6px_6px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                    )}
                    style={{
                      backgroundColor: `rgba(185, 255, 102, ${isSelected ? 1 : seg.opacity})`,
                    }}
                  >
                    {/* 选中指示器 */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 bg-[#191A23] text-white p-1 border-2 border-white rounded-full">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    )}

                    {/* 段位标签 */}
                    <div className="flex justify-between items-start">
                      <Badge
                        className={cn(
                          "text-xs font-black uppercase tracking-wider px-2 py-1 border border-[#191A23]",
                          isSelected
                            ? "bg-white text-[#191A23]"
                            : "bg-[#191A23] text-white"
                        )}
                      >
                        {seg.label}
                      </Badge>
                      <span className="text-xs font-bold text-[#191A23] opacity-60">
                        {seg.title}
                      </span>
                    </div>

                    {/* 学生数据 */}
                    <div className="mt-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Users className="w-5 h-5 text-[#191A23]" />
                        <span className="text-3xl font-black text-[#191A23]">
                          {stats.count}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-[#191A23] mt-1">
                        占比 {stats.percentage}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 提示信息 */}
          <div className="mt-4 text-xs text-gray-600 text-center">
            点击单元格查看该段位的学生详情
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NineLevelMatrix;
