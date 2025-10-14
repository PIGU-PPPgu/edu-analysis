/**
 * 预警分析筛选器组件
 * 参考 ModernGradeFilters 设计的可折叠侧边筛选器
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Filter,
  ChevronDown,
  ChevronRight,
  X,
  Calendar,
  BookOpen,
  Settings,
  RefreshCw,
  AlertTriangle,
  Target,
} from "lucide-react";

// 筛选配置接口
export interface WarningFilterConfig {
  timeRange: "month" | "quarter" | "semester" | "year" | "custom";
  examTypes: string[];
  classNames: string[]; // 新增：班级筛选
  examTitles: string[]; // 新增：具体考试筛选
  mixedAnalysis: boolean;
  analysisMode: "student" | "exam" | "subject";
  startDate?: string;
  endDate?: string;
  severityLevels: ("high" | "medium" | "low")[];
  warningStatus: ("active" | "resolved" | "dismissed")[];
}

export interface WarningFiltersProps {
  filter: WarningFilterConfig;
  onFilterChange: (filter: WarningFilterConfig) => void;
  availableExamTypes?: string[];
  availableClassNames?: string[]; // 新增：可用班级列表
  availableExamTitles?: string[]; // 新增：可用考试列表
  className?: string;
  compact?: boolean;
  onClose?: () => void;
  // 新增：支持URL参数初始化
  initialExamFilter?: string;
  initialDateFilter?: string;
  fromAnomalyDetection?: boolean;
}

const WarningFilters: React.FC<WarningFiltersProps> = ({
  filter,
  onFilterChange,
  availableExamTypes = [
    "月考",
    "期中考试",
    "期末考试",
    "模拟考试",
    "单元测试",
    "诊断考试",
  ],
  availableClassNames = [], // 新增：班级列表默认值
  availableExamTitles = [], // 新增：考试列表默认值
  className,
  compact = false,
  onClose,
  initialExamFilter,
  initialDateFilter,
  fromAnomalyDetection = false,
}) => {
  // 展开状态
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    timeFilter: true,
    examFilter: true,
    classFilter: true, // 新增：班级筛选
    examTitleFilter: false, // 新增：具体考试筛选
    statusFilter: false,
    advanced: false,
  });

  // 计算活跃筛选器数量
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filter.timeRange !== "semester") count++;
    if (filter.examTypes.length !== availableExamTypes.length) count++;
    if (!filter.mixedAnalysis) count++;
    if (filter.analysisMode !== "student") count++;
    if (filter.severityLevels.length !== 3) count++;
    if (filter.warningStatus.length !== 3) count++;
    return count;
  }, [filter, availableExamTypes.length]);

  // 切换展开状态
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 更新筛选器
  const updateFilter = <K extends keyof WarningFilterConfig>(
    key: K,
    value: WarningFilterConfig[K]
  ) => {
    onFilterChange({
      ...filter,
      [key]: value,
    });
  };

  // 切换考试类型
  const toggleExamType = (examType: string) => {
    const newTypes = filter.examTypes.includes(examType)
      ? filter.examTypes.filter((type) => type !== examType)
      : [...filter.examTypes, examType];
    updateFilter("examTypes", newTypes);
  };

  // 切换严重程度
  const toggleSeverity = (severity: "high" | "medium" | "low") => {
    const newLevels = filter.severityLevels.includes(severity)
      ? filter.severityLevels.filter((level) => level !== severity)
      : [...filter.severityLevels, severity];
    updateFilter("severityLevels", newLevels);
  };

  // 切换预警状态
  const toggleStatus = (status: "active" | "resolved" | "dismissed") => {
    const newStatuses = filter.warningStatus.includes(status)
      ? filter.warningStatus.filter((s) => s !== status)
      : [...filter.warningStatus, status];
    updateFilter("warningStatus", newStatuses);
  };

  // 切换班级
  const toggleClassName = (className: string) => {
    const newClasses = filter.classNames.includes(className)
      ? filter.classNames.filter((c) => c !== className)
      : [...filter.classNames, className];
    updateFilter("classNames", newClasses);
  };

  // 切换具体考试
  const toggleExamTitle = (examTitle: string) => {
    const newExamTitles = filter.examTitles.includes(examTitle)
      ? filter.examTitles.filter((title) => title !== examTitle)
      : [...filter.examTitles, examTitle];
    updateFilter("examTitles", newExamTitles);
  };

  // 重置筛选器
  const resetFilters = () => {
    onFilterChange({
      timeRange: "semester",
      examTypes: [...availableExamTypes],
      classNames: [...availableClassNames], // 新增：默认选中所有班级
      examTitles: [], // 新增：默认不筛选具体考试
      mixedAnalysis: true,
      analysisMode: "student",
      severityLevels: ["high", "medium", "low"],
      warningStatus: ["active", "resolved", "dismissed"],
    });
  };

  // 快速设置为异常检测模式
  const setAnomalyDetectionMode = () => {
    if (!initialExamFilter) return;

    // 根据考试标题推断考试类型
    const examTitle = initialExamFilter.toLowerCase();
    let examType = "月考"; // 默认
    if (examTitle.includes("月考")) examType = "月考";
    else if (examTitle.includes("期中")) examType = "期中考试";
    else if (examTitle.includes("期末")) examType = "期末考试";
    else if (examTitle.includes("模拟")) examType = "模拟考试";

    onFilterChange({
      timeRange: initialDateFilter ? "custom" : "semester",
      examTypes: [examType],
      classNames: [...availableClassNames], // 保持所有班级
      examTitles: initialExamFilter ? [initialExamFilter] : [], // 设置具体考试
      mixedAnalysis: false, // 专注单一考试
      analysisMode: "student",
      startDate: initialDateFilter,
      endDate: initialDateFilter,
      severityLevels: ["high", "medium", "low"],
      warningStatus: ["active"], // 只显示活跃预警
    });
  };

  // 渲染展开/收起按钮
  const ExpandButton = ({
    section,
    title,
  }: {
    section: string;
    title: string;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 transition-colors"
    >
      <span className="font-medium text-[#191A23]">{title}</span>
      {expandedSections[section] ? (
        <ChevronDown className="h-4 w-4 text-gray-500" />
      ) : (
        <ChevronRight className="h-4 w-4 text-gray-500" />
      )}
    </button>
  );

  return (
    <Card
      className={cn(
        "border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] h-fit",
        className
      )}
    >
      {/* 筛选器标题 */}
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-black" />
            <CardTitle className="text-black font-black uppercase tracking-wide">
              筛选器
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Badge className="bg-white text-[#191A23] border-2 border-black text-xs font-bold">
                {activeFiltersCount} 个筛选
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 异常检测模式快速设置 */}
            {fromAnomalyDetection && initialExamFilter && (
              <Button
                size="sm"
                variant="ghost"
                onClick={setAnomalyDetectionMode}
                className="text-black hover:bg-black/10 p-1 h-auto"
                title={`专注分析: ${initialExamFilter}`}
              >
                <Target className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={resetFilters}
              className="text-black hover:bg-black/10 p-1 h-auto"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-black hover:bg-black/10 p-1 h-auto lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* 时间筛选 */}
        <div className="border-b border-gray-200">
          <ExpandButton section="timeFilter" title="时间范围" />
          {expandedSections.timeFilter && (
            <div className="p-4 bg-gray-50/50">
              <Label className="text-sm font-bold text-[#191A23] flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4" />
                时间范围
              </Label>
              <Select
                value={filter.timeRange}
                onValueChange={(value: any) => updateFilter("timeRange", value)}
              >
                <SelectTrigger className="border-2 border-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">最近一个月</SelectItem>
                  <SelectItem value="quarter">最近三个月</SelectItem>
                  <SelectItem value="semester">本学期</SelectItem>
                  <SelectItem value="year">本学年</SelectItem>
                  <SelectItem value="custom">自定义范围</SelectItem>
                </SelectContent>
              </Select>

              {filter.timeRange === "custom" && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <Label className="text-xs">开始日期</Label>
                    <Input
                      type="date"
                      value={filter.startDate || ""}
                      onChange={(e) =>
                        updateFilter("startDate", e.target.value)
                      }
                      className="border-2 border-black"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">结束日期</Label>
                    <Input
                      type="date"
                      value={filter.endDate || ""}
                      onChange={(e) => updateFilter("endDate", e.target.value)}
                      className="border-2 border-black"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 考试筛选 */}
        <div className="border-b border-gray-200">
          <ExpandButton section="examFilter" title="考试类型" />
          {expandedSections.examFilter && (
            <div className="p-4 bg-gray-50/50 space-y-4">
              <Label className="text-sm font-bold text-[#191A23] flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                考试类型
                <Badge className="bg-[#B9FF66] text-[#191A23] border border-black text-xs">
                  已选择 {filter.examTypes.length} 种
                </Badge>
              </Label>

              <div className="space-y-2">
                {availableExamTypes.map((examType) => (
                  <Button
                    key={examType}
                    size="sm"
                    variant={
                      filter.examTypes.includes(examType)
                        ? "default"
                        : "outline"
                    }
                    onClick={() => toggleExamType(examType)}
                    className={cn(
                      "w-full justify-start border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]",
                      filter.examTypes.includes(examType)
                        ? "bg-[#B9FF66] text-[#191A23] hover:bg-[#A8E055]"
                        : "bg-white text-[#191A23] hover:bg-gray-50"
                    )}
                  >
                    {examType}
                    {filter.examTypes.includes(examType) && (
                      <div className="ml-auto w-2 h-2 bg-[#191A23] rounded-full" />
                    )}
                  </Button>
                ))}
              </div>

              <div className="flex items-center space-x-3 p-3 border-2 border-black rounded-lg bg-white">
                <Switch
                  checked={filter.mixedAnalysis}
                  onCheckedChange={(checked) =>
                    updateFilter("mixedAnalysis", checked)
                  }
                />
                <div className="flex-1">
                  <Label className="text-sm font-medium text-[#191A23]">
                    混合分析
                  </Label>
                  <p className="text-xs text-[#191A23]/70">
                    将不同类型考试的数据混合分析
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 班级筛选 */}
        <div className="border-b border-gray-200">
          <ExpandButton section="classFilter" title="班级筛选" />
          {expandedSections.classFilter && (
            <div className="p-4 bg-gray-50/50 space-y-4">
              <Label className="text-sm font-bold text-[#191A23] flex items-center gap-2">
                <Target className="h-4 w-4" />
                班级选择
                <Badge className="bg-[#B9FF66] text-[#191A23] border border-black text-xs">
                  已选择 {filter.classNames.length} 个
                </Badge>
              </Label>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableClassNames.length > 0 ? (
                  availableClassNames.map((className) => (
                    <Button
                      key={className}
                      size="sm"
                      variant={
                        filter.classNames.includes(className)
                          ? "default"
                          : "outline"
                      }
                      onClick={() => toggleClassName(className)}
                      className={cn(
                        "w-full justify-start border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]",
                        filter.classNames.includes(className)
                          ? "bg-[#B9FF66] text-[#191A23] hover:bg-[#A8E055]"
                          : "bg-white text-[#191A23] hover:bg-gray-50"
                      )}
                    >
                      {className}
                      {filter.classNames.includes(className) && (
                        <div className="ml-auto w-2 h-2 bg-[#191A23] rounded-full" />
                      )}
                    </Button>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    暂无班级数据，请先加载学生信息
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateFilter("classNames", [])}
                  className="text-xs border-gray-300"
                >
                  清空选择
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateFilter("classNames", [...availableClassNames])
                  }
                  className="text-xs border-gray-300"
                >
                  全选班级
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 具体考试筛选 */}
        <div className="border-b border-gray-200">
          <ExpandButton section="examTitleFilter" title="具体考试" />
          {expandedSections.examTitleFilter && (
            <div className="p-4 bg-gray-50/50 space-y-4">
              <Label className="text-sm font-bold text-[#191A23] flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                考试名称
                <Badge className="bg-[#B9FF66] text-[#191A23] border border-black text-xs">
                  已选择 {filter.examTitles.length} 个
                </Badge>
              </Label>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableExamTitles.length > 0 ? (
                  availableExamTitles.map((examTitle) => (
                    <Button
                      key={examTitle}
                      size="sm"
                      variant={
                        filter.examTitles.includes(examTitle)
                          ? "default"
                          : "outline"
                      }
                      onClick={() => toggleExamTitle(examTitle)}
                      className={cn(
                        "w-full justify-start border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]",
                        filter.examTitles.includes(examTitle)
                          ? "bg-[#B9FF66] text-[#191A23] hover:bg-[#A8E055]"
                          : "bg-white text-[#191A23] hover:bg-gray-50"
                      )}
                    >
                      {examTitle}
                      {filter.examTitles.includes(examTitle) && (
                        <div className="ml-auto w-2 h-2 bg-[#191A23] rounded-full" />
                      )}
                    </Button>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    暂无考试数据，请先加载成绩信息
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateFilter("examTitles", [])}
                  className="text-xs border-gray-300"
                >
                  清空选择
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateFilter("examTitles", [...availableExamTitles])
                  }
                  className="text-xs border-gray-300"
                >
                  全选考试
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 状态筛选 */}
        <div className="border-b border-gray-200">
          <ExpandButton section="statusFilter" title="预警状态" />
          {expandedSections.statusFilter && (
            <div className="p-4 bg-gray-50/50 space-y-4">
              <Label className="text-sm font-bold text-[#191A23] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                严重程度
              </Label>

              <div className="flex flex-wrap gap-2">
                {["high", "medium", "low"].map((severity) => (
                  <Button
                    key={severity}
                    size="sm"
                    variant={
                      filter.severityLevels.includes(severity as any)
                        ? "default"
                        : "outline"
                    }
                    onClick={() => toggleSeverity(severity as any)}
                    className={cn(
                      "border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]",
                      filter.severityLevels.includes(severity as any)
                        ? "bg-[#B9FF66] text-[#191A23]"
                        : "bg-white text-[#191A23]"
                    )}
                  >
                    {severity === "high"
                      ? "高风险"
                      : severity === "medium"
                        ? "中风险"
                        : "低风险"}
                  </Button>
                ))}
              </div>

              <Label className="text-sm font-bold text-[#191A23]">
                预警状态
              </Label>

              <div className="flex flex-wrap gap-2">
                {["active", "resolved", "dismissed"].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={
                      filter.warningStatus.includes(status as any)
                        ? "default"
                        : "outline"
                    }
                    onClick={() => toggleStatus(status as any)}
                    className={cn(
                      "border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]",
                      filter.warningStatus.includes(status as any)
                        ? "bg-[#B9FF66] text-[#191A23]"
                        : "bg-white text-[#191A23]"
                    )}
                  >
                    {status === "active"
                      ? "活跃"
                      : status === "resolved"
                        ? "已解决"
                        : "已忽略"}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 高级选项 */}
        <div>
          <ExpandButton section="advanced" title="高级选项" />
          {expandedSections.advanced && (
            <div className="p-4 bg-gray-50/50">
              <Label className="text-sm font-bold text-[#191A23] flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                分析维度
              </Label>
              <Select
                value={filter.analysisMode}
                onValueChange={(value: any) =>
                  updateFilter("analysisMode", value)
                }
              >
                <SelectTrigger className="border-2 border-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">按学生分析</SelectItem>
                  <SelectItem value="exam">按考试分析</SelectItem>
                  <SelectItem value="subject">按科目分析</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WarningFilters;
