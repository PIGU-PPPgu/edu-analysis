import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, Eye } from "lucide-react";
import type { TrendAnalysisResult } from "./trendUtils";

interface TrendAnalysisDetailsProps {
  trendAnalysis: TrendAnalysisResult[];
  analysisPage: number;
  analysisPageSize: number;
  onPageChange: (page: number) => void;
}

const TrendAnalysisDetails: React.FC<TrendAnalysisDetailsProps> = ({
  trendAnalysis,
  analysisPage,
  analysisPageSize,
  onPageChange,
}) => {
  const totalPages = Math.ceil(trendAnalysis.length / analysisPageSize);
  const paginatedAnalysis = trendAnalysis.slice(
    analysisPage * analysisPageSize,
    (analysisPage + 1) * analysisPageSize
  );

  return (
    <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
      <CardHeader className="bg-[#6B7280] border-b-2 border-black">
        <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
          <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
            <Eye className="h-5 w-5 text-white" />
          </div>
          科目趋势分析
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 bg-[#B9FF66]/20 border-2 border-[#B9FF66] rounded-lg mb-4">
            <p className="text-sm font-bold text-[#191A23]">
              显示 {analysisPage * analysisPageSize + 1} -{" "}
              {Math.min(
                (analysisPage + 1) * analysisPageSize,
                trendAnalysis.length
              )}{" "}
              / {trendAnalysis.length} 个科目分析
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onPageChange(Math.max(0, analysisPage - 1))}
                disabled={analysisPage === 0}
                className="px-3 py-1 h-8 bg-white border-2 border-black text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] disabled:opacity-50 disabled:transform-none"
              >
                上一页
              </Button>
              <span className="text-sm font-bold text-[#191A23] min-w-[4rem] text-center">
                {analysisPage + 1} / {totalPages}
              </span>
              <Button
                onClick={() =>
                  onPageChange(Math.min(totalPages - 1, analysisPage + 1))
                }
                disabled={analysisPage >= totalPages - 1}
                className="px-3 py-1 h-8 bg-white border-2 border-black text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] disabled:opacity-50 disabled:transform-none"
              >
                下一页
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {paginatedAnalysis.map((analysis, index) => (
            <Card
              key={index}
              className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23]"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full border-2 border-black ${analysis.trend === "improving" ? "bg-[#B9FF66]" : analysis.trend === "declining" ? "bg-[#6B7280]" : "bg-white"}`}
                    >
                      {analysis.trend === "improving" ? (
                        <TrendingUp className="w-5 h-5 text-[#191A23]" />
                      ) : analysis.trend === "declining" ? (
                        <TrendingDown className="w-5 h-5 text-white" />
                      ) : (
                        <Target className="w-5 h-5 text-[#191A23]" />
                      )}
                    </div>
                    <div>
                      <p className="font-black text-[#191A23] text-lg">
                        {analysis.subject}
                      </p>
                      <p className="text-sm font-medium text-[#191A23]/70">
                        平均分: {analysis.averageScore.toFixed(1)} | 最新:{" "}
                        {analysis.latestScore} | 变化:{" "}
                        {analysis.improvement > 0 ? "+" : ""}
                        {analysis.improvement.toFixed(1)}分
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`font-bold shadow-[2px_2px_0px_0px_#191A23] border-2 border-black ${analysis.trend === "improving" ? "bg-[#B9FF66] text-[#191A23]" : "bg-[#6B7280] text-white"}`}
                    >
                      {analysis.trend === "improving"
                        ? "进步中"
                        : analysis.trend === "declining"
                          ? "需关注"
                          : "稳定"}
                    </Badge>
                    <div className="text-right">
                      <p className="text-lg font-black text-[#191A23]">
                        {analysis.latestScore}
                      </p>
                      <p className="text-xs text-[#191A23]/60">当前分数</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendAnalysisDetails;
