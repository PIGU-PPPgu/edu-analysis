import React from "react";
import {
  X,
  AlertTriangle,
  Calendar,
  TrendingDown,
  BookOpen,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WarningDetail {
  id: string;
  studentName: string;
  studentId: string;
  severity: "high" | "medium" | "low";
  category: string;
  subject?: string;
  description: string;
  date: string;
  trend?: "up" | "down" | "stable";
  recommendations?: string[];
  contact?: {
    email?: string;
    phone?: string;
  };
  recentGrades?: Array<{
    subject: string;
    score: number;
    date: string;
  }>;
}

interface WarningDetailSidebarProps {
  warning: WarningDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve?: (warningId: string) => void;
  onDismiss?: (warningId: string) => void;
}

const WarningDetailSidebar: React.FC<WarningDetailSidebarProps> = ({
  warning,
  isOpen,
  onClose,
  onResolve,
  onDismiss,
}) => {
  if (!isOpen || !warning) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "high":
        return "高风险";
      case "medium":
        return "中风险";
      case "low":
        return "低风险";
      default:
        return "未知";
    }
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* 侧边栏 */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white z-50 shadow-[-4px_0_12px_0_rgba(0,0,0,0.1)] border-l-4 border-[#B9FF66]">
        <ScrollArea className="h-full">
          {/* 头部 */}
          <div className="sticky top-0 bg-white border-b-2 border-black p-6 z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
                  <h2 className="text-xl font-black text-[#191A23]">
                    预警详情
                  </h2>
                </div>
                <Badge
                  variant="outline"
                  className={`font-bold border-2 ${getSeverityColor(warning.severity)}`}
                >
                  {getSeverityLabel(warning.severity)}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6 space-y-6">
            {/* 学生信息 */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
                学生信息
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-bold text-[#191A23]">
                    {warning.studentName}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({warning.studentId})
                  </span>
                </div>
                {warning.contact?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">
                      {warning.contact.email}
                    </span>
                  </div>
                )}
                {warning.contact?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">
                      {warning.contact.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 预警信息 */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
                预警信息
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">触发时间:</span>
                  <span className="text-gray-900">{warning.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">预警类型:</span>
                  <Badge variant="outline" className="font-bold border-2">
                    {warning.category}
                  </Badge>
                </div>
                {warning.subject && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700">科目:</span>
                    <Badge
                      variant="outline"
                      className="bg-[#B9FF66]/20 border-[#B9FF66] font-bold"
                    >
                      {warning.subject}
                    </Badge>
                  </div>
                )}
                {warning.trend && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-700">趋势:</span>
                    <Badge
                      variant="outline"
                      className={`font-bold border-2 ${
                        warning.trend === "down"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : warning.trend === "up"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-100 text-gray-800 border-gray-200"
                      }`}
                    >
                      {warning.trend === "down"
                        ? "下降"
                        : warning.trend === "up"
                          ? "上升"
                          : "稳定"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 详细描述 */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
                详细描述
              </h3>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {warning.description}
                </p>
              </div>
            </div>

            {/* 近期成绩 */}
            {warning.recentGrades && warning.recentGrades.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
                    近期成绩
                  </h3>
                  <div className="space-y-2">
                    {warning.recentGrades.map((grade, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {grade.subject}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg font-bold ${
                              grade.score < 60
                                ? "text-red-600"
                                : grade.score < 80
                                  ? "text-amber-600"
                                  : "text-green-600"
                            }`}
                          >
                            {grade.score}分
                          </span>
                          <span className="text-xs text-gray-500">
                            {grade.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 干预建议 */}
            {warning.recommendations && warning.recommendations.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
                    干预建议
                  </h3>
                  <div className="space-y-2">
                    {warning.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="flex gap-3 p-3 bg-[#B9FF66]/10 rounded-lg border-2 border-[#B9FF66]"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-5 h-5 rounded-full bg-[#B9FF66] border-2 border-black flex items-center justify-center">
                            <span className="text-xs font-bold text-black">
                              {index + 1}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed flex-1">
                          {rec}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="sticky bottom-0 bg-white border-t-2 border-black p-6 space-y-3">
            {onResolve && (
              <Button
                onClick={() => onResolve(warning.id)}
                className="w-full bg-[#B9FF66] text-black border-2 border-black font-bold shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                标记为已处理
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="outline"
                onClick={() => onDismiss(warning.id)}
                className="w-full border-2 border-black bg-white text-black font-bold shadow-[2px_2px_0px_0px_#000] hover:bg-gray-50"
              >
                暂时忽略
              </Button>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default WarningDetailSidebar;
