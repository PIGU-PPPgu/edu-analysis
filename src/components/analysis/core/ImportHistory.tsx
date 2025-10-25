import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ImportHistoryRecord {
  id: string;
  import_date: string;
  imported_by: string | null;
  exam_id: string;
  exam_title: string;
  exam_type: string | null;
  exam_date: string | null;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  total_records: number;
  successful_records: number;
  failed_records: number;
  import_status: "pending" | "processing" | "completed" | "failed" | "partial";
  error_log: any;
  warnings: any;
  processing_time_ms: number | null;
  notes: string | null;
}

export const ImportHistory: React.FC = () => {
  const [records, setRecords] = useState<ImportHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    loadImportHistory();
  }, []);

  const loadImportHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("import_history")
        .select("*")
        .order("import_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Failed to load import history:", error);
      toast.error("加载导入历史失败");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (recordId: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedRecords(newExpanded);
  };

  const getStatusIcon = (status: ImportHistoryRecord["import_status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "partial":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: ImportHistoryRecord["import_status"]) => {
    const variants: Record<typeof status, string> = {
      completed: "bg-green-100 text-green-800 border-green-300",
      failed: "bg-red-100 text-red-800 border-red-300",
      partial: "bg-yellow-100 text-yellow-800 border-yellow-300",
      processing: "bg-blue-100 text-blue-800 border-blue-300",
      pending: "bg-gray-100 text-gray-800 border-gray-300",
    };

    const labels: Record<typeof status, string> = {
      completed: "成功",
      failed: "失败",
      partial: "部分成功",
      processing: "处理中",
      pending: "等待中",
    };

    return (
      <Badge
        variant="outline"
        className={`${variants[status]} border font-bold`}
      >
        {labels[status]}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "未知";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const formatProcessingTime = (ms: number | null) => {
    if (!ms) return "未知";
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(2)}min`;
  };

  if (loading) {
    return (
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            导入历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
      <CardHeader className="border-b-2 border-black bg-[#B9FF66]/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <History className="h-5 w-5" />
            导入历史
            <Badge
              variant="outline"
              className="ml-2 border-2 border-black font-mono"
            >
              {records.length} 条记录
            </Badge>
          </CardTitle>
          <Button
            onClick={loadImportHistory}
            variant="outline"
            size="sm"
            className="border-2 border-black font-bold shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000]"
          >
            刷新
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>暂无导入历史</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              <AnimatePresence>
                {records.map((record) => {
                  const isExpanded = expandedRecords.has(record.id);
                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="border-2 border-black rounded-lg p-3 bg-white shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] transition-all"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(record.import_status)}
                            <h3 className="font-bold text-sm">
                              {record.exam_title}
                            </h3>
                            {getStatusBadge(record.import_status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(
                                new Date(record.import_date),
                                {
                                  addSuffix: true,
                                  locale: zhCN,
                                }
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {record.file_name}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(record.id)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="text-center py-1 bg-gray-50 rounded border border-gray-200">
                          <div className="text-xs text-gray-600">总计</div>
                          <div className="font-bold text-sm">
                            {record.total_records}
                          </div>
                        </div>
                        <div className="text-center py-1 bg-green-50 rounded border border-green-200">
                          <div className="text-xs text-green-600">成功</div>
                          <div className="font-bold text-sm text-green-700">
                            {record.successful_records}
                          </div>
                        </div>
                        <div className="text-center py-1 bg-red-50 rounded border border-red-200">
                          <div className="text-xs text-red-600">失败</div>
                          <div className="font-bold text-sm text-red-700">
                            {record.failed_records}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t-2 border-gray-200 pt-3 mt-2"
                          >
                            <div className="space-y-2 text-xs">
                              {/* Exam Details */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-gray-600">考试ID:</span>
                                  <span className="ml-2 font-mono">
                                    {record.exam_id}
                                  </span>
                                </div>
                                {record.exam_type && (
                                  <div>
                                    <span className="text-gray-600">
                                      考试类型:
                                    </span>
                                    <span className="ml-2">
                                      {record.exam_type}
                                    </span>
                                  </div>
                                )}
                                {record.exam_date && (
                                  <div>
                                    <span className="text-gray-600">
                                      考试日期:
                                    </span>
                                    <span className="ml-2">
                                      {record.exam_date}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* File Details */}
                              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded">
                                <div>
                                  <span className="text-gray-600">
                                    文件大小:
                                  </span>
                                  <span className="ml-2">
                                    {formatFileSize(record.file_size)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    处理时间:
                                  </span>
                                  <span className="ml-2">
                                    {formatProcessingTime(
                                      record.processing_time_ms
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Warnings */}
                              {record.warnings &&
                                Array.isArray(record.warnings) &&
                                record.warnings.length > 0 && (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                    <div className="flex items-center gap-1 mb-1">
                                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                                      <span className="font-bold text-yellow-800">
                                        警告 ({record.warnings.length})
                                      </span>
                                    </div>
                                    <ul className="text-xs text-yellow-700 space-y-1 ml-4 list-disc">
                                      {record.warnings
                                        .slice(0, 3)
                                        .map((warning: any, idx: number) => (
                                          <li key={idx}>
                                            {typeof warning === "string"
                                              ? warning
                                              : warning.message}
                                          </li>
                                        ))}
                                      {record.warnings.length > 3 && (
                                        <li>
                                          ...还有 {record.warnings.length - 3}{" "}
                                          条警告
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {/* Errors */}
                              {record.error_log &&
                                Array.isArray(record.error_log) &&
                                record.error_log.length > 0 && (
                                  <div className="bg-red-50 border border-red-200 rounded p-2">
                                    <div className="flex items-center gap-1 mb-1">
                                      <XCircle className="h-3 w-3 text-red-600" />
                                      <span className="font-bold text-red-800">
                                        错误 ({record.error_log.length})
                                      </span>
                                    </div>
                                    <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                                      {record.error_log
                                        .slice(0, 3)
                                        .map((error: any, idx: number) => (
                                          <li key={idx}>
                                            {typeof error === "string"
                                              ? error
                                              : error.message}
                                          </li>
                                        ))}
                                      {record.error_log.length > 3 && (
                                        <li>
                                          ...还有 {record.error_log.length - 3}{" "}
                                          条错误
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {/* Notes */}
                              {record.notes && (
                                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                  <span className="text-xs text-blue-800">
                                    {record.notes}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
