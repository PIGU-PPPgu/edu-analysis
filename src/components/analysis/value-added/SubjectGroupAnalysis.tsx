/**
 * 科目组合分析
 * 分析文科/理科等科目组合的增值情况
 */

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayersIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateSubjectValueAdded,
  calculateGroupValueAdded,
  PREDEFINED_GROUPS,
  type SubjectValueAddedMetrics,
  type SubjectGroup,
} from "../services/valueAddedUtils";
import type { ComparisonScope } from "@/types/valueAddedTypes";

interface SubjectGroupAnalysisProps {
  baselineData: any[];
  targetData: any[];
  scope: ComparisonScope;
  className?: string;
}

const SubjectGroupAnalysis: React.FC<SubjectGroupAnalysisProps> = ({
  baselineData,
  targetData,
  scope,
  className,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  // 计算所有科目的增值
  const subjectMetrics = useMemo(() => {
    return calculateSubjectValueAdded(
      baselineData,
      targetData,
      scope,
      className
    );
  }, [baselineData, targetData, scope, className]);

  // 计算各组合的增值
  const groupMetrics = useMemo(() => {
    return PREDEFINED_GROUPS.map((group) => {
      const metric = calculateGroupValueAdded(subjectMetrics, group);
      return metric ? { group, metric } : null;
    }).filter(Boolean) as Array<{
      group: SubjectGroup;
      metric: SubjectValueAddedMetrics;
    }>;
  }, [subjectMetrics]);

  if (subjectMetrics.length === 0) {
    return null;
  }

  // 渲染单个组合卡片
  const renderGroupCard = (
    group: SubjectGroup,
    metric: SubjectValueAddedMetrics
  ) => {
    const isImproving = metric.avgImprovement > 0;
    const improvementAbs = Math.abs(metric.avgImprovement);

    return (
      <Card
        key={group.name}
        className="border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[5px_5px_0px_0px_#000] transition-all"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-black text-black">
                {group.name}
              </CardTitle>
              <p className="text-xs text-gray-600 mt-1">{group.description}</p>
            </div>
            <Badge
              className={cn(
                "border-2 border-black font-bold",
                isImproving
                  ? "bg-[#B9FF66] text-black"
                  : "bg-orange-200 text-black"
              )}
            >
              {isImproving ? "进步" : "退步"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 核心指标 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 border-2 border-black">
              <p className="text-xs text-gray-600 mb-1">平均进步</p>
              <div className="flex items-center justify-center gap-1">
                {isImproving ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <p
                  className={cn(
                    "text-2xl font-black",
                    isImproving ? "text-green-600" : "text-red-600"
                  )}
                >
                  {isImproving ? "+" : "-"}
                  {improvementAbs}
                </p>
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 border-2 border-black">
              <p className="text-xs text-gray-600 mb-1">进步率</p>
              <p
                className={cn(
                  "text-2xl font-black",
                  isImproving ? "text-green-600" : "text-red-600"
                )}
              >
                {isImproving ? "+" : ""}
                {metric.avgImprovementRate}%
              </p>
            </div>
          </div>

          {/* 详细数据 */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">基准均分</span>
              <span className="font-bold text-black">{metric.baselineAvg}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">目标均分</span>
              <span className="font-bold text-black">{metric.targetAvg}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">进步人数比例</span>
              <span className="font-bold text-black">
                {metric.improvedRate}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">样本人数</span>
              <span className="font-bold text-black">
                {metric.studentCount}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="text-black font-black flex items-center gap-2">
          <LayersIcon className="w-5 h-5" />
          科目组合分析
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={selectedGroup} onValueChange={setSelectedGroup}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="all" className="font-bold">
              全部组合
            </TabsTrigger>
            {PREDEFINED_GROUPS.map((group) => (
              <TabsTrigger
                key={group.name}
                value={group.name}
                className="font-bold"
              >
                {group.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupMetrics.map(({ group, metric }) =>
                renderGroupCard(group, metric)
              )}
            </div>
          </TabsContent>

          {groupMetrics.map(({ group, metric }) => (
            <TabsContent key={group.name} value={group.name}>
              <div className="space-y-6">
                {/* 组合卡片 */}
                {renderGroupCard(group, metric)}

                {/* 包含科目详情 */}
                <Card className="border-2 border-black">
                  <CardHeader className="bg-gray-50 border-b-2 border-black">
                    <CardTitle className="text-sm font-black text-black">
                      包含科目详情
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {subjectMetrics
                        .filter((s) => group.subjects.includes(s.subject))
                        .map((subject) => (
                          <div
                            key={subject.subject}
                            className="p-3 border-2 border-black bg-white"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-black">
                                {subject.subjectName}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border border-black",
                                  subject.avgImprovement > 0
                                    ? "bg-green-100"
                                    : "bg-red-100"
                                )}
                              >
                                {subject.avgImprovement > 0 ? "+" : ""}
                                {subject.avgImprovement}
                              </Badge>
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-600">均分</span>
                                <span className="font-medium">
                                  {subject.baselineAvg} → {subject.targetAvg}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">进步率</span>
                                <span className="font-medium">
                                  {subject.avgImprovementRate}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* 说明 */}
        <div className="mt-6 text-xs text-gray-500 border-t-2 border-gray-200 pt-4">
          <p className="font-bold mb-2">组合说明：</p>
          <ul className="list-disc list-inside space-y-1">
            {PREDEFINED_GROUPS.map((group) => (
              <li key={group.name}>
                <span className="font-medium">{group.name}</span>：
                {group.description}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubjectGroupAnalysis;
