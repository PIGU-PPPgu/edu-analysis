"use client";

/**
 * 方案D: URL路由+全局状态布局
 *
 * 核心交互：
 * - 每个报告有独立URL (模拟: /reports/teacher-score)
 * - 全局筛选状态(科目/班级)切换报告时保留
 * - 浏览器前进/后退按钮支持
 * - 支持书签和分享链接
 */

import { useState, createContext, useContext } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Link as LinkIcon } from "lucide-react";
import {
  mockReportCards,
  categories,
  MockReportContent,
} from "./mockReportData";

// 全局筛选状态Context
interface FilterContextType {
  subject: string;
  classFilter: string;
  setSubject: (s: string) => void;
  setClassFilter: (c: string) => void;
}

const FilterContext = createContext<FilterContextType>({
  subject: "all",
  classFilter: "all",
  setSubject: () => {},
  setClassFilter: () => {},
});

export function DemoDRouterLayout() {
  const [routePath, setRoutePath] = useState("/reports");
  const [history, setHistory] = useState(["/reports"]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // 全局筛选状态（切换报告时保留）
  const [subject, setSubject] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  const navigateTo = (path: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setRoutePath(path);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setRoutePath(history[historyIndex - 1]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setRoutePath(history[historyIndex + 1]);
    }
  };

  const currentReportId = routePath.startsWith("/reports/")
    ? routePath.replace("/reports/", "")
    : null;

  return (
    <FilterContext.Provider
      value={{ subject, classFilter, setSubject, setClassFilter }}
    >
      <div className="h-full flex flex-col">
        {/* 顶部导航栏 */}
        <div className="border-b bg-white px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              disabled={historyIndex === 0}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goForward}
              disabled={historyIndex === history.length - 1}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 flex items-center gap-2 text-sm bg-gray-100 px-3 py-1.5 rounded">
            <LinkIcon className="h-4 w-4 text-gray-400" />
            <code className="text-gray-700">/value-added{routePath}</code>
          </div>

          {/* 全局筛选 */}
          <div className="flex items-center gap-2">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部科目</SelectItem>
                <SelectItem value="语文">语文</SelectItem>
                <SelectItem value="数学">数学</SelectItem>
                <SelectItem value="英语">英语</SelectItem>
              </SelectContent>
            </Select>

            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="班级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部班级</SelectItem>
                <SelectItem value="初一1班">初一1班</SelectItem>
                <SelectItem value="初一2班">初一2班</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {routePath === "/reports" ? (
            <ReportsList onNavigate={navigateTo} />
          ) : currentReportId ? (
            <ReportDetail reportId={currentReportId} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              404 - 页面不存在
            </div>
          )}
        </div>
      </div>
    </FilterContext.Provider>
  );
}

function ReportsList({ onNavigate }: { onNavigate: (path: string) => void }) {
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">增值报告中心</h1>
        <p className="text-gray-600">每个报告都有独立URL，支持书签和分享</p>
      </div>

      {categories.map((category) => {
        const categoryReports = mockReportCards.filter(
          (r) => r.category === category
        );

        return (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryReports.map((report) => {
                const Icon = report.icon;

                return (
                  <Card
                    key={report.id}
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => onNavigate(`/reports/${report.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
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
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportDetail({ reportId }: { reportId: string }) {
  const { subject, classFilter } = useContext(FilterContext);

  return (
    <div>
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-900 font-medium">
          ✅ 全局筛选已保留: 科目={subject}, 班级={classFilter}
        </div>
        <div className="text-xs text-blue-700 mt-1">
          （切换到其他报告时，这些筛选条件不会丢失）
        </div>
      </div>

      <MockReportContent reportId={reportId} />
    </div>
  );
}
