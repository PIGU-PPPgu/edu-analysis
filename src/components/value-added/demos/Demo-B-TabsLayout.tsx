"use client";

/**
 * 方案B: Tab分类+卡片展开布局
 *
 * 核心交互：
 * - 顶部Tab切换8个类别
 * - Tab内显示当前类别的报告卡片(3列网格)
 * - 点击卡片在下方展开报告内容
 * - 展开时其他卡片隐藏，全屏显示报告
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronUp } from "lucide-react";
import {
  mockReportCards,
  categories,
  MockReportContent,
} from "./mockReportData";

export function DemoBTabsLayout() {
  const [activeCategory, setActiveCategory] = useState("教师增值评价");
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const toggleReport = (reportId: string) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "总体":
        return "bg-blue-100 text-blue-700";
      case "教学班":
        return "bg-green-100 text-green-700";
      case "行政班":
        return "bg-purple-100 text-purple-700";
      case "个人":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">增值报告中心</h1>
        <p className="text-gray-600">通过Tab快速切换类别，点击卡片查看详情</p>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="whitespace-nowrap"
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => {
          const categoryReports = mockReportCards.filter(
            (r) => r.category === category
          );

          return (
            <TabsContent key={category} value={category} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryReports.map((report) => {
                  const Icon = report.icon;
                  const isExpanded = expandedReport === report.id;

                  return (
                    <div
                      key={report.id}
                      className={isExpanded ? "col-span-full" : ""}
                    >
                      <Card className="cursor-pointer hover:shadow-md transition-all">
                        <CardHeader onClick={() => toggleReport(report.id)}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-50">
                                <Icon className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-base">
                                  {report.title}
                                </CardTitle>
                                <Badge
                                  className={`${getBadgeColor(
                                    report.badge
                                  )} mt-1 text-xs`}
                                >
                                  {report.badge}
                                </Badge>
                              </div>
                            </div>
                            {isExpanded && (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <CardDescription className="mt-2 text-sm">
                            {report.description}
                          </CardDescription>
                        </CardHeader>

                        {!isExpanded && (
                          <CardContent>
                            <Button
                              variant="default"
                              className="w-full"
                              onClick={() => toggleReport(report.id)}
                            >
                              点击查看
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </CardContent>
                        )}
                      </Card>

                      {/* 展开的报告内容 */}
                      {isExpanded && (
                        <div className="mt-4 p-6 border rounded-lg bg-gray-50">
                          <MockReportContent reportId={report.id} />
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => toggleReport(report.id)}
                          >
                            收起报告
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
