import React, { memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { AnomalyData } from "../types/anomaly";

interface AnomalyListProps {
  anomalies: AnomalyData[];
  pageSize?: number;
}

const getAnomalyStyle = (
  type: AnomalyData["anomaly_type"],
  severity: AnomalyData["severity"]
) => {
  const baseStyles = {
    outlier_high: {
      color: "text-[#191A23]",
      bg: "bg-[#B9FF66]/20",
      border: "border-[#B9FF66] border-2",
      cardStyle: "shadow-[4px_4px_0px_0px_#B9FF66]",
      icon: TrendingUp,
    },
    outlier_low: {
      color: "text-white",
      bg: "bg-[#B9FF66]/20",
      border: "border-[#B9FF66] border-2",
      cardStyle: "shadow-[4px_4px_0px_0px_#B9FF66]",
      icon: TrendingDown,
    },
    sudden_rise: {
      color: "text-[#191A23]",
      bg: "bg-[#B9FF66]/10",
      border: "border-[#B9FF66] border-2",
      cardStyle: "shadow-[4px_4px_0px_0px_#B9FF66]",
      icon: TrendingUp,
    },
    sudden_drop: {
      color: "text-white",
      bg: "bg-[#B9FF66]/20",
      border: "border-[#B9FF66] border-2",
      cardStyle: "shadow-[4px_4px_0px_0px_#B9FF66]",
      icon: TrendingDown,
    },
    missing_pattern: {
      color: "text-[#191A23]",
      bg: "bg-[#9C88FF]/20",
      border: "border-[#9C88FF] border-2",
      cardStyle: "shadow-[4px_4px_0px_0px_#9C88FF]",
      icon: AlertCircle,
    },
  };

  return baseStyles[type] || baseStyles.missing_pattern;
};

const getSeverityBadge = (severity: AnomalyData["severity"]) => {
  switch (severity) {
    case "high":
      return (
        <Badge className="bg-[#B9FF66] text-white border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">
          高风险
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-[#9C88FF] text-white border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">
          中风险
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">
          低风险
        </Badge>
      );
    default:
      return (
        <Badge className="bg-[#F3F3F3] text-[#191A23] border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">
          未知
        </Badge>
      );
  }
};

const AnomalyList: React.FC<AnomalyListProps> = ({
  anomalies,
  pageSize = 5,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(anomalies.length / pageSize);

  const paginatedAnomalies = React.useMemo(() => {
    const startIndex = currentPage * pageSize;
    return anomalies.slice(startIndex, startIndex + pageSize);
  }, [anomalies, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(0);
  }, [anomalies.length]);

  return (
    <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]">
      <CardHeader className="bg-[#9C88FF] border-b-2 border-black">
        <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
          <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
            <Eye className="h-5 w-5 text-white" />
          </div>
          异常详情列表
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 bg-[#9C88FF]/20 border-2 border-[#9C88FF] rounded-lg mb-4">
            <div>
              <p className="text-sm font-bold text-[#191A23]">
                显示 {currentPage * pageSize + 1} -{" "}
                {Math.min((currentPage + 1) * pageSize, anomalies.length)} /{" "}
                {anomalies.length} 个异常
              </p>
              {anomalies.length > pageSize && (
                <p className="text-xs text-[#191A23]/70 mt-1">
                  检测到较多异常，建议跳转到预警分析进行深度处理
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 h-8 bg-white border-2 border-black text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] disabled:opacity-50 disabled:transform-none disabled:shadow-[2px_2px_0px_0px_#191A23]"
              >
                上一页
              </Button>
              <span className="text-sm font-bold text-[#191A23] min-w-[4rem] text-center">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                }
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-1 h-8 bg-white border-2 border-black text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] disabled:opacity-50 disabled:transform-none disabled:shadow-[2px_2px_0px_0px_#191A23]"
              >
                下一页
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {anomalies.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-[#9C88FF] rounded-full border-2 border-black mx-auto mb-6 w-fit">
                <AlertTriangle className="h-12 w-12 text-white" />
              </div>
              <p className="text-xl font-black text-[#191A23] uppercase tracking-wide mb-2">
                未检测到异常成绩
              </p>
              <p className="text-[#191A23]/70 font-medium">
                所有学生成绩都在正常范围内
              </p>
            </div>
          ) : (
            paginatedAnomalies.map((anomaly, index) => {
              const style = getAnomalyStyle(
                anomaly.anomaly_type,
                anomaly.severity
              );
              const IconComponent = style.icon;

              return (
                <Card
                  key={index}
                  className={`${style.border} ${style.cardStyle} transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]`}
                >
                  <CardContent className={`p-4 ${style.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-full border-2 border-black ${
                            anomaly.anomaly_type === "outlier_high"
                              ? "bg-[#B9FF66]"
                              : anomaly.anomaly_type === "outlier_low"
                                ? "bg-[#B9FF66]"
                                : anomaly.anomaly_type === "sudden_rise"
                                  ? "bg-[#B9FF66]"
                                  : anomaly.anomaly_type === "sudden_drop"
                                    ? "bg-[#B9FF66]"
                                    : "bg-[#9C88FF]"
                          }`}
                        >
                          <IconComponent
                            className={`w-5 h-5 ${
                              anomaly.anomaly_type === "outlier_low" ||
                              anomaly.anomaly_type === "sudden_drop"
                                ? "text-white"
                                : "text-[#191A23]"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-black text-[#191A23] text-lg">
                            {anomaly.name} ({anomaly.student_id})
                          </p>
                          <p className="text-sm font-medium text-[#191A23]/80">
                            {anomaly.class_name} • {anomaly.subject} • 实际:{" "}
                            <span className="font-bold text-[#B9FF66]">
                              {anomaly.score}分
                            </span>{" "}
                            • 预期:{" "}
                            <span className="font-bold text-[#9C88FF]">
                              {anomaly.expected_score.toFixed(1)}分
                            </span>
                          </p>
                          <p className="text-sm font-medium text-[#191A23] mt-2 leading-relaxed">
                            {anomaly.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-black text-[#191A23] px-3 py-1 bg-white rounded-lg border-2 border-black">
                            Z分数: {anomaly.z_score.toFixed(2)}
                          </div>
                          <div className="text-xs font-bold text-[#191A23]/70 mt-1">
                            偏差: {anomaly.deviation > 0 ? "+" : ""}
                            {anomaly.deviation.toFixed(1)}分
                          </div>
                        </div>
                        {getSeverityBadge(anomaly.severity)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(AnomalyList);
