/**
 * ExamListTab — 考试列表 Tab
 * 包含：搜索、筛选、分页、考试卡片、批量操作
 * 局部 state：searchTerm / statusFilter / typeFilter / selectedTermId / currentPage / pageSize
 * 共享 state 通过 props 传入
 */

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  RefreshCw,
  BookOpen,
  Calendar,
  Clock,
  Users,
  BarChart3,
  Eye,
  Edit,
  Copy,
  Trash2,
  MoreHorizontal,
  Plus,
  Award,
  Settings,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { UIExam, UIExamType } from "../hooks/useExamData";
import type { AcademicTerm } from "@/services/examService";
import SemesterFilter from "../SemesterFilter";

// ---- Props ----

export interface ExamListTabProps {
  // 共享数据（只读）
  exams: UIExam[];
  examTypes: UIExamType[];
  academicTerms: AcademicTerm[];
  currentTerm: AcademicTerm | null;
  isLoading: boolean;

  // 批量选择（跨 Tab 共享，header 也用）
  selectedExams: string[];
  onSelectedExamsChange: (ids: string[]) => void;

  // 操作回调（父组件持有实现）
  onQuickAction: (exam: UIExam, action: string) => void;
  onBatchAction: (action: string) => void;
  onOpenCreate: () => void;
  onReload?: () => Promise<void>;
}

// ---- 状态徽章 ----

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 border-gray-200",
    scheduled: "bg-blue-100 text-blue-800 border-blue-200",
    ongoing: "bg-[#B9FF66] text-black border-[#B9FF66]",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };
  const labels: Record<string, string> = {
    draft: "草稿",
    scheduled: "已安排",
    ongoing: "进行中",
    completed: "已完成",
    cancelled: "已取消",
  };
  return (
    <Badge className={`${styles[status] ?? ""} border font-medium`}>
      {labels[status] ?? status}
    </Badge>
  );
}

// ---- 主组件 ----

const ExamListTab: React.FC<ExamListTabProps> = ({
  exams,
  examTypes,
  academicTerms,
  currentTerm,
  isLoading,
  selectedExams,
  onSelectedExamsChange,
  onQuickAction,
  onBatchAction,
  onOpenCreate,
  onReload,
}) => {
  // 局部 state：搜索 / 筛选 / 分页
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTermId, setSelectedTermId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [examToDelete, setExamToDelete] = useState<UIExam | null>(null);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounce, statusFilter, typeFilter, selectedTermId]);

  const handleTermChange = (termId: string) => {
    setSelectedTermId(termId);
    const term = academicTerms.find((t) => t.id === termId);
    const label =
      termId === "all"
        ? "全部学期"
        : term
          ? `${term.academic_year} ${term.semester}`
          : termId;
    toast.success(`已切换到${label}`);
  };

  // 筛选
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        !searchDebounce ||
        exam.title.toLowerCase().includes(searchDebounce.toLowerCase()) ||
        exam.description
          ?.toLowerCase()
          .includes(searchDebounce.toLowerCase()) ||
        exam.subjects.some((s) =>
          s.toLowerCase().includes(searchDebounce.toLowerCase())
        );
      const matchesStatus =
        statusFilter === "all" || exam.status === statusFilter;
      const matchesType = typeFilter === "all" || exam.type === typeFilter;
      const matchesTerm =
        selectedTermId === "all" ||
        !selectedTermId ||
        (exam as UIExam & { academic_term_id?: string }).academic_term_id ===
          selectedTermId;
      return matchesSearch && matchesStatus && matchesType && matchesTerm;
    });
  }, [exams, searchDebounce, statusFilter, typeFilter, selectedTermId]);

  // 分页
  const totalPages = Math.ceil(filteredExams.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedExams = filteredExams.slice(startIndex, startIndex + pageSize);

  const toggleSelect = (id: string, checked: boolean) => {
    onSelectedExamsChange(
      checked
        ? [...selectedExams, id]
        : selectedExams.filter((sid) => sid !== id)
    );
  };

  return (
    <div className="space-y-6">
      {/* 搜索和筛选栏 */}
      <Card className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] rounded-lg">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-black" />
                <Input
                  placeholder="搜索考试标题、描述或科目..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-black focus:border-black focus:ring-0 shadow-[2px_2px_0px_0px_#000] font-medium"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <SemesterFilter
                academicTerms={academicTerms}
                selectedTermId={selectedTermId}
                onTermChange={handleTermChange}
                className="min-w-fit"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 border-2 border-black shadow-[2px_2px_0px_0px_#000] font-bold">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent className="border-2 border-black">
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="scheduled">已安排</SelectItem>
                  <SelectItem value="ongoing">进行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 border-2 border-black shadow-[2px_2px_0px_0px_#000] font-bold">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent className="border-2 border-black">
                  <SelectItem value="all">全部类型</SelectItem>
                  {examTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.emoji} {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => onReload?.()}
                className="gap-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] transition-all duration-200 font-bold"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                刷新
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 考试卡片列表 */}
      <div className="grid gap-4">
        <AnimatePresence>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-6 w-6 animate-spin text-[#B9FF66] mr-2" />
              <span className="text-gray-500">加载考试数据中...</span>
            </div>
          ) : filteredExams.length === 0 ? (
            <Card className="border border-gray-200 bg-white rounded-xl">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  暂无考试数据
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                    ? "没有找到符合条件的考试，请调整筛选条件"
                    : "还没有创建任何考试，点击上方按钮开始创建"}
                </p>
                {!searchTerm &&
                  statusFilter === "all" &&
                  typeFilter === "all" && (
                    <Button
                      onClick={onOpenCreate}
                      className="bg-[#B9FF66] text-black hover:bg-[#A3E85A]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      创建第一个考试
                    </Button>
                  )}
              </CardContent>
            </Card>
          ) : (
            paginatedExams.map((exam, index) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card
                  className={`border-2 border-black transition-all duration-300 rounded-lg group ${
                    selectedExams.includes(exam.id)
                      ? "bg-[#B9FF66] shadow-[6px_6px_0px_0px_#000]"
                      : "bg-white shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000]"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={selectedExams.includes(exam.id)}
                            onChange={(e) =>
                              toggleSelect(exam.id, e.target.checked)
                            }
                            className="w-4 h-4 text-[#B9FF66] bg-gray-100 border-gray-300 rounded focus:ring-[#B9FF66] focus:ring-2"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="text-2xl">
                              {examTypes.find((t) => t.name === exam.type)
                                ?.emoji ?? "📝"}
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-gray-800 group-hover:text-[#B9FF66] transition-colors duration-200">
                                {exam.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <StatusBadge status={exam.status} />
                                <Badge
                                  variant="outline"
                                  className="border-gray-300"
                                >
                                  {exam.type}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {exam.description && (
                            <p className="text-gray-600 mb-4">
                              {exam.description}
                            </p>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">{exam.date}</span>
                            </div>
                            {exam.startTime && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">
                                  {exam.startTime} - {exam.endTime}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">
                                {exam.subjects.join(", ")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">
                                {exam.participantCount ?? exam.classes.length}{" "}
                                参与者
                              </span>
                            </div>
                          </div>

                          {exam.status === "completed" && exam.averageScore && (
                            <div className="flex items-center gap-2 mt-4 p-3 bg-green-50 rounded-lg">
                              <Award className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-800">
                                平均分:{" "}
                                <strong>{exam.averageScore.toFixed(1)}</strong>{" "}
                                | 完成率:{" "}
                                <strong>
                                  {exam.completionRate?.toFixed(1)}%
                                </strong>
                              </span>
                            </div>
                          )}

                          {exam.tags && exam.tags.length > 0 && (
                            <div className="flex gap-1 mt-3">
                              {exam.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs bg-gray-100 text-gray-700"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:bg-[#B9FF66] transition-all duration-200 font-bold"
                          onClick={() => onQuickAction(exam, "analysis")}
                        >
                          <BarChart3 className="h-4 w-4" />
                          分析
                        </Button>

                        {exam.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 hover:shadow-md transition-all duration-200"
                            onClick={() => onQuickAction(exam, "view")}
                          >
                            <Eye className="h-4 w-4" />
                            查看详情
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-gray-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => onQuickAction(exam, "edit")}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              编辑考试
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onQuickAction(exam, "view")}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onQuickAction(exam, "duplicate")}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              复制考试
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onQuickAction(exam, "subject-score-config")
                              }
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              科目总分设置
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onQuickAction(exam, "warning-analysis")
                              }
                              className="text-[#9C88FF] focus:text-[#9C88FF] focus:bg-[#9C88FF]/10"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              前往预警分析
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onQuickAction(exam, "generate-report")
                              }
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              生成分析报告
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setExamToDelete(exam)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除考试
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* 分页控件 */}
      {filteredExams.length > 0 && (
        <Card className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] rounded-lg">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="font-medium">
                  显示 {startIndex + 1} -{" "}
                  {Math.min(startIndex + pageSize, filteredExams.length)} 项，
                  共 {filteredExams.length} 项
                </span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 h-8 border border-gray-300 rounded text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[6, 12, 24, 48].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-500">条/页</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-8 px-3 border-2 border-black font-bold hover:shadow-[2px_2px_0px_0px_#000] disabled:opacity-50"
                >
                  首页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="h-8 px-3 border-2 border-black font-bold hover:shadow-[2px_2px_0px_0px_#000] disabled:opacity-50"
                >
                  上一页
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) page = i + 1;
                    else if (currentPage <= 3) page = i + 1;
                    else if (currentPage >= totalPages - 2)
                      page = totalPages - 4 + i;
                    else page = currentPage - 2 + i;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 p-0 text-xs font-bold ${
                          currentPage === page
                            ? "bg-[#B9FF66] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                            : "border border-gray-300 hover:shadow-[2px_2px_0px_0px_#000]"
                        }`}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="h-8 px-3 border-2 border-black font-bold hover:shadow-[2px_2px_0px_0px_#000] disabled:opacity-50"
                >
                  下一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-8 px-3 border-2 border-black font-bold hover:shadow-[2px_2px_0px_0px_#000] disabled:opacity-50"
                >
                  末页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* 删除确认弹窗 */}
      <AlertDialog
        open={!!examToDelete}
        onOpenChange={(open) => !open && setExamToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除考试</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除考试「{examToDelete?.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (examToDelete) {
                  onQuickAction(examToDelete, "delete");
                  setExamToDelete(null);
                }
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExamListTab;
