"use client";

/**
 * 方案C: 快捷工作台+智能推荐布局
 *
 * 核心交互：
 * - 首页显示: 常用报告(4个) + 最近查看(5个) + 所有报告
 * - 全局搜索框实时筛选报告
 * - 报告底部显示相关推荐(同类别3个)
 * - 个性化用户体验
 */

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Star, Clock, TrendingUp } from "lucide-react";
import { mockReportCards, MockReportContent } from "./mockReportData";

export function DemoCSmartDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // 模拟用户数据（实际应从localStorage或数据库读取）
  const [recentReports] = useState([
    "teacher-score",
    "class-score",
    "student-score-single",
  ]);
  const [favoriteReports] = useState([
    "teacher-score",
    "class-ability",
    "subject-balance",
    "student-detail-download",
  ]);

  const filteredReports = useMemo(() => {
    if (!searchTerm) return mockReportCards;
    const term = searchTerm.toLowerCase();
    return mockReportCards.filter(
      (r) =>
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const getRelatedReports = (reportId: string) => {
    const current = mockReportCards.find((r) => r.id === reportId);
    if (!current) return [];

    return mockReportCards
      .filter((r) => r.category === current.category && r.id !== reportId)
      .slice(0, 3);
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

  const renderReportCard = (reportId: string, showBadge = true) => {
    const report = mockReportCards.find((r) => r.id === reportId);
    if (!report) return null;

    const Icon = report.icon;

    return (
      <Card
        key={report.id}
        className="cursor-pointer hover:shadow-md transition-all"
        onClick={() => setSelectedReport(report.id)}
      >
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{report.title}</CardTitle>
              {showBadge && (
                <Badge
                  className={`${getBadgeColor(report.badge)} mt-1 text-xs`}
                >
                  {report.badge}
                </Badge>
              )}
              <CardDescription className="mt-2 text-sm line-clamp-2">
                {report.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  // 查看具体报告
  if (selectedReport) {
    const relatedReports = getRelatedReports(selectedReport);

    return (
      <div className="p-6 h-full overflow-y-auto">
        <Button
          variant="outline"
          onClick={() => setSelectedReport(null)}
          className="mb-4"
        >
          ← 返回工作台
        </Button>

        <MockReportContent reportId={selectedReport} />

        {/* 相关推荐 */}
        {relatedReports.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              相关报告推荐
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedReports.map((r) => renderReportCard(r.id))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 工作台首页
  return (
    <div className="p-6 space-y-8 h-full overflow-y-auto">
      {/* 全局搜索 */}
      <div className="max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="搜索报告: 输入关键词快速筛选..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-600 mt-2">
            找到 {filteredReports.length} 个匹配结果
          </p>
        )}
      </div>

      {!searchTerm && (
        <>
          {/* 常用报告 */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              常用报告
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {favoriteReports.map((id) => renderReportCard(id))}
            </div>
          </div>

          {/* 最近查看 */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              最近查看
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentReports.map((id) => renderReportCard(id, false))}
            </div>
          </div>
        </>
      )}

      {/* 所有报告 / 搜索结果 */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          {searchTerm ? `搜索结果` : "所有报告"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => renderReportCard(report.id))}
        </div>
      </div>
    </div>
  );
}
