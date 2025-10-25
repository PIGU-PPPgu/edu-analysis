import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, User, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getGradingHistory } from "@/services/homeworkService";

interface GradingHistoryRecord {
  id: string;
  submission_id: string;
  modified_by: string;
  previous_score: number | null;
  new_score: number | null;
  previous_feedback: string | null;
  new_feedback: string | null;
  previous_knowledge_points: any;
  new_knowledge_points: any;
  modification_reason: string | null;
  created_at: string;
  modifier_name?: string;
}

interface GradingHistoryProps {
  submissionId: string;
  className?: string;
}

export const GradingHistory: React.FC<GradingHistoryProps> = ({
  submissionId,
  className = "",
}) => {
  const [history, setHistory] = useState<GradingHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!submissionId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await getGradingHistory(submissionId);
        if (result.success) {
          setHistory(result.data || []);
          setError(null);
        } else {
          setError(result.message || "获取评分历史失败");
        }
      } catch (err: any) {
        console.error("获取评分历史异常:", err);
        setError(err.message || "获取评分历史失败");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [submissionId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderScoreChange = (
    prevScore: number | null,
    newScore: number | null
  ) => {
    if (prevScore === null && newScore === null) return null;
    if (prevScore === null)
      return (
        <Badge className="bg-green-500 text-white border-2 border-black">
          首次评分: {newScore}
        </Badge>
      );

    const diff = (newScore || 0) - (prevScore || 0);
    if (diff === 0)
      return (
        <Badge className="bg-gray-500 text-white border-2 border-black flex items-center gap-1">
          <Minus className="h-3 w-3" />
          分数未变: {newScore}
        </Badge>
      );
    if (diff > 0)
      return (
        <Badge className="bg-green-500 text-white border-2 border-black flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {prevScore} → {newScore} (+{diff.toFixed(1)})
        </Badge>
      );
    return (
      <Badge className="bg-red-500 text-white border-2 border-black flex items-center gap-1">
        <TrendingDown className="h-3 w-3" />
        {prevScore} → {newScore} ({diff.toFixed(1)})
      </Badge>
    );
  };

  const renderKnowledgePointChanges = (
    previous: any,
    current: any
  ): JSX.Element | null => {
    if (!previous && !current) return null;

    const prevMap = new Map(
      Object.entries(previous || {}).map(([id, data]: [string, any]) => [
        id,
        data,
      ])
    );
    const currMap = new Map(
      Object.entries(current || {}).map(([id, data]: [string, any]) => [
        id,
        data,
      ])
    );

    const allIds = new Set([...prevMap.keys(), ...currMap.keys()]);
    const changes: JSX.Element[] = [];

    allIds.forEach((id) => {
      const prev = prevMap.get(id);
      const curr = currMap.get(id);

      if (!prev && curr) {
        changes.push(
          <div key={id} className="text-sm">
            <Badge className="bg-green-100 text-green-800 border-2 border-black">
              新增
            </Badge>{" "}
            <span className="font-semibold">{curr.name}</span>: {curr.level}%
          </div>
        );
      } else if (prev && !curr) {
        changes.push(
          <div key={id} className="text-sm">
            <Badge className="bg-red-100 text-red-800 border-2 border-black">
              移除
            </Badge>{" "}
            <span className="font-semibold">{prev.name}</span>
          </div>
        );
      } else if (prev && curr && prev.level !== curr.level) {
        const diff = curr.level - prev.level;
        changes.push(
          <div key={id} className="text-sm">
            <Badge className="bg-blue-100 text-blue-800 border-2 border-black">
              修改
            </Badge>{" "}
            <span className="font-semibold">{curr.name}</span>: {prev.level}% →{" "}
            {curr.level}%{" "}
            <span className={diff > 0 ? "text-green-600" : "text-red-600"}>
              ({diff > 0 ? "+" : ""}
              {diff}%)
            </span>
          </div>
        );
      }
    });

    return changes.length > 0 ? (
      <div className="space-y-1">{changes}</div>
    ) : null;
  };

  if (loading) {
    return (
      <Card
        className={`border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${className}`}
      >
        <CardHeader className="bg-purple-100 border-b-4 border-black">
          <CardTitle className="text-xl font-black">评分历史</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-40">
            <div className="text-gray-500">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={`border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${className}`}
      >
        <CardHeader className="bg-purple-100 border-b-4 border-black">
          <CardTitle className="text-xl font-black">评分历史</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive" className="border-2 border-black">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${className}`}
    >
      <CardHeader className="bg-purple-100 border-b-4 border-black">
        <CardTitle className="text-xl font-black flex items-center gap-2">
          <Clock className="h-5 w-5" />
          评分历史 ({history.length} 次修改)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>暂无评分修改记录</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {history.map((record, index) => (
                <div key={record.id}>
                  <div className="p-4 border-4 border-black bg-white rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {/* 头部信息 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-bold">
                          {record.modifier_name || "未知教师"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        {formatDate(record.created_at)}
                      </div>
                    </div>

                    {/* 分数变化 */}
                    {(record.previous_score !== null ||
                      record.new_score !== null) && (
                      <div className="mb-2">
                        {renderScoreChange(
                          record.previous_score,
                          record.new_score
                        )}
                      </div>
                    )}

                    {/* 反馈变化 */}
                    {(record.previous_feedback || record.new_feedback) && (
                      <div className="mb-2">
                        <div className="text-sm font-semibold mb-1">
                          反馈变化:
                        </div>
                        {record.previous_feedback && (
                          <div className="text-sm bg-red-50 border-2 border-red-300 p-2 mb-1">
                            <span className="font-semibold text-red-800">
                              修改前:
                            </span>{" "}
                            {record.previous_feedback}
                          </div>
                        )}
                        {record.new_feedback && (
                          <div className="text-sm bg-green-50 border-2 border-green-300 p-2">
                            <span className="font-semibold text-green-800">
                              修改后:
                            </span>{" "}
                            {record.new_feedback}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 知识点变化 */}
                    {(record.previous_knowledge_points ||
                      record.new_knowledge_points) && (
                      <div className="mb-2">
                        <div className="text-sm font-semibold mb-1">
                          知识点评分变化:
                        </div>
                        {renderKnowledgePointChanges(
                          record.previous_knowledge_points,
                          record.new_knowledge_points
                        )}
                      </div>
                    )}

                    {/* 修改原因 */}
                    {record.modification_reason && (
                      <div className="mt-2 pt-2 border-t-2 border-dashed border-gray-300">
                        <div className="text-sm">
                          <span className="font-semibold">修改原因:</span>{" "}
                          {record.modification_reason}
                        </div>
                      </div>
                    )}
                  </div>
                  {index < history.length - 1 && <Separator className="my-3" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default GradingHistory;
