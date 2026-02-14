"use client";

/**
 * 方案A: 侧边栏+面包屑布局
 *
 * 核心交互：
 * - 左侧固定侧边栏(240px)，8个类别可折叠
 * - 点击报告项直接切换内容，无需返回
 * - 顶部面包屑显示当前位置
 * - 当前查看的报告高亮显示
 */

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  mockReportCards,
  categories,
  MockReportContent,
} from "./mockReportData";

export function DemoASidebarLayout() {
  const [selectedReport, setSelectedReport] = useState("teacher-score");
  const [expandedCategories, setExpandedCategories] = useState(
    new Set(["教师增值评价"])
  );

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  const currentReport = mockReportCards.find((r) => r.id === selectedReport);
  const breadcrumbs = [
    "增值评价",
    currentReport?.category,
    currentReport?.title,
  ];

  return (
    <div className="flex h-full">
      {/* 左侧固定侧边栏 */}
      <div className="w-60 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b bg-white">
          <h2 className="font-bold text-lg">增值报告</h2>
          <p className="text-xs text-gray-500 mt-1">选择报告快速切换</p>
        </div>

        {categories.map((category) => {
          const categoryReports = mockReportCards.filter(
            (r) => r.category === category
          );
          const isExpanded = expandedCategories.has(category);

          return (
            <Collapsible
              key={category}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between">
                <span className="font-medium text-sm">{category}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                {categoryReports.map((report) => {
                  const Icon = report.icon;
                  const isActive = report.id === selectedReport;

                  return (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report.id)}
                      className={`w-full px-6 py-2 text-left text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-medium border-l-2 border-blue-600"
                          : "text-gray-700"
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{report.title}</span>
                    </button>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 面包屑导航 */}
        <div className="px-6 py-3 border-b bg-white flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4" />}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? "text-gray-900 font-medium"
                    : ""
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>

        {/* 报告内容区 */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <MockReportContent reportId={selectedReport} />
        </div>
      </div>
    </div>
  );
}
