import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Search,
  Filter,
  Clock,
  BookOpen,
  BarChart3,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import {
  getExams,
  getExamTypes,
  getRecentExams,
  type Exam,
  type ExamType,
  type ExamFilter,
} from "@/services/examService";
import { formatNumber } from "@/utils/formatUtils";
import { toast } from "sonner";

interface ExamSelectorProps {
  selectedExamId?: string;
  onExamSelect: (exam: Exam | null) => void;
  showStatistics?: boolean;
  className?: string;
}

const ExamSelector: React.FC<ExamSelectorProps> = ({
  selectedExamId,
  onExamSelect,
  showStatistics = true,
  className = "",
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 筛选条件
  const [filter, setFilter] = useState<ExamFilter>({});
  const [searchTerm, setSearchTerm] = useState("");

  // 选中的考试
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // 获取考试数据
  const fetchExams = async (filterParams?: ExamFilter) => {
    setIsLoading(true);
    try {
      const [examsData, typesData, recentData] = await Promise.all([
        getExams(filterParams),
        getExamTypes(),
        getRecentExams(5),
      ]);

      setExams(examsData);
      setExamTypes(typesData);
      setRecentExams(recentData);
    } catch (error) {
      console.error("获取考试数据失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchExams();
  }, []);

  // 当筛选条件改变时重新获取数据
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      const currentFilter = {
        ...filter,
        searchTerm: searchTerm.trim() || undefined,
      };
      fetchExams(currentFilter);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [filter, searchTerm]);

  // 根据选中ID设置选中考试
  useEffect(() => {
    if (selectedExamId && exams.length > 0) {
      const exam = exams.find((e) => e.id === selectedExamId);
      if (exam) {
        setSelectedExam(exam);
      }
    }
  }, [selectedExamId, exams]);

  // 处理考试选择
  const handleExamSelect = (exam: Exam) => {
    setSelectedExam(exam);
    onExamSelect(exam);
    toast.success(`已选择考试：${exam.title}`, {
      description: `${exam.type} - ${exam.date}`,
    });
  };

  // 清除选择
  const handleClearSelection = () => {
    setSelectedExam(null);
    onExamSelect(null);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setFilter({});
    setSearchTerm("");
    setShowFilters(false);
  };

  // 筛选后的考试列表
  const filteredExams = useMemo(() => {
    if (
      !searchTerm &&
      !filter.type &&
      !filter.subject &&
      !filter.dateFrom &&
      !filter.dateTo
    ) {
      return exams;
    }
    return exams;
  }, [exams, searchTerm, filter]);

  // 考试类型选项
  const examTypeOptions = useMemo(() => {
    return examTypes.map((type) => ({
      value: type.type_name,
      label: type.type_name,
      description: type.description,
    }));
  }, [examTypes]);

  // 科目选项（从考试中提取）
  const subjectOptions = useMemo(() => {
    const subjects = Array.from(
      new Set(exams.map((exam) => exam.subject).filter(Boolean))
    );
    return subjects.map((subject) => ({
      value: subject!,
      label: subject!,
    }));
  }, [exams]);

  return (
    <Card className={`${className} border border-gray-200`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-gray-800">
            <Calendar className="h-5 w-5 mr-2 text-[#c0ff3f]" />
            考试选择器
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="border-gray-300"
            >
              <Filter className="h-4 w-4 mr-1" />
              筛选
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchExams(filter)}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
              />
              刷新
            </Button>
          </div>
        </div>

        {/* 当前选中的考试显示 */}
        {selectedExam && (
          <div className="mt-4 p-3 bg-[#c0ff3f]/10 border border-[#c0ff3f]/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-[#c0ff3f] mr-2" />
                <div>
                  <p className="font-medium text-gray-800">
                    {selectedExam.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedExam.type} • {selectedExam.date}
                    {selectedExam.subject && ` • ${selectedExam.subject}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="text-gray-500 hover:text-gray-700"
              >
                清除
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 快速搜索 */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索考试标题..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 高级筛选面板 */}
        {showFilters && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="examType" className="text-sm font-medium">
                  考试类型
                </Label>
                <Select
                  value={filter.type || ""}
                  onValueChange={(value) =>
                    setFilter((prev) => ({
                      ...prev,
                      type: value || undefined,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    {examTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject" className="text-sm font-medium">
                  科目
                </Label>
                <Select
                  value={filter.subject || ""}
                  onValueChange={(value) =>
                    setFilter((prev) => ({
                      ...prev,
                      subject: value || undefined,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择科目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部科目</SelectItem>
                    {subjectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateFrom" className="text-sm font-medium">
                  起始日期
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filter.dateFrom || ""}
                  onChange={(e) =>
                    setFilter((prev) => ({
                      ...prev,
                      dateFrom: e.target.value || undefined,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="dateTo" className="text-sm font-medium">
                  结束日期
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filter.dateTo || ""}
                  onChange={(e) =>
                    setFilter((prev) => ({
                      ...prev,
                      dateTo: e.target.value || undefined,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-gray-600"
              >
                重置筛选
              </Button>
            </div>
          </div>
        )}

        {/* 最近考试快速选择 */}
        {!showFilters && recentExams.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              <Clock className="h-4 w-4 inline mr-1" />
              最近考试
            </Label>
            <div className="flex flex-wrap gap-2">
              {recentExams.map((exam) => (
                <Badge
                  key={exam.id}
                  variant={
                    selectedExam?.id === exam.id ? "default" : "secondary"
                  }
                  className={`cursor-pointer px-3 py-1.5 ${
                    selectedExam?.id === exam.id
                      ? "bg-[#c0ff3f] text-black hover:bg-[#c0ff3f]/80"
                      : "hover:bg-gray-200"
                  }`}
                  onClick={() => handleExamSelect(exam)}
                >
                  {exam.title}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 考试列表 */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            <BookOpen className="h-4 w-4 inline mr-1" />
            考试列表 ({formatNumber(filteredExams.length)})
          </Label>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>暂无考试数据</p>
              <p className="text-sm">请尝试调整筛选条件或联系管理员</p>
            </div>
          ) : (
            <ScrollArea className="h-60">
              <div className="space-y-2">
                {filteredExams.map((exam) => (
                  <div
                    key={exam.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedExam?.id === exam.id
                        ? "border-[#c0ff3f] bg-[#c0ff3f]/10"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => handleExamSelect(exam)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">
                          {exam.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <Badge variant="outline" className="text-xs">
                            {exam.type}
                          </Badge>
                          <span>{exam.date}</span>
                          {exam.subject && <span>• {exam.subject}</span>}
                        </div>
                      </div>
                      {showStatistics && (
                        <div className="text-right ml-4">
                          <BarChart3 className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExamSelector;
