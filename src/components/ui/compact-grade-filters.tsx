"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Filter,
  Search,
  Users,
  BookOpen,
  TrendingUp,
  Calendar,
  X,
  ChevronDown,
  Check,
  RotateCcw,
  Settings,
} from "lucide-react";

// 筛选器配置类型
export interface CompactFilterConfig {
  classes: string[];
  subjects: string[];
  examTypes: string[];
  scoreRanges: Array<{ label: string; min: number; max: number }>;
}

// 筛选器状态类型
export interface CompactFilterState {
  searchTerm: string;
  selectedClasses: string[];
  selectedSubjects: string[];
  selectedExamTypes: string[];
  selectedScoreRange: string;
  dateRange?: { start: string; end: string };
}

interface CompactGradeFiltersProps {
  config: CompactFilterConfig;
  filterState: CompactFilterState;
  onFilterChange: (state: CompactFilterState) => void;
  totalRecords: number;
  filteredRecords: number;
  className?: string;
}

const CompactGradeFilters: React.FC<CompactGradeFiltersProps> = ({
  config,
  filterState,
  onFilterChange,
  totalRecords,
  filteredRecords,
  className,
}) => {
  // 添加默认值和防御性编程
  const safeConfig = {
    classes: config?.classes || [],
    subjects: config?.subjects || [],
    examTypes: config?.examTypes || [],
    scoreRanges: config?.scoreRanges || [],
  };

  const safeFilterState = {
    searchTerm: filterState?.searchTerm || "",
    selectedClasses: filterState?.selectedClasses || [],
    selectedSubjects: filterState?.selectedSubjects || [],
    selectedExamTypes: filterState?.selectedExamTypes || [],
    selectedScoreRange: filterState?.selectedScoreRange || "",
    dateRange: filterState?.dateRange,
  };

  const [isClassesOpen, setIsClassesOpen] = useState(false);
  const [isSubjectsOpen, setIsSubjectsOpen] = useState(false);
  const [isExamTypesOpen, setIsExamTypesOpen] = useState(false);

  // 更新筛选器状态的辅助函数
  const updateFilter = (updates: Partial<CompactFilterState>) => {
    const newState = { ...safeFilterState, ...updates };
    onFilterChange?.(newState);
  };

  // 重置所有筛选器
  const resetFilters = () => {
    const defaultState: CompactFilterState = {
      searchTerm: "",
      selectedClasses: [],
      selectedSubjects: [],
      selectedExamTypes: [],
      selectedScoreRange: "",
      dateRange: undefined,
    };
    onFilterChange?.(defaultState);
  };

  // 检查是否有活动筛选器
  const hasActiveFilters = () => {
    return (
      safeFilterState.searchTerm ||
      safeFilterState.selectedClasses.length > 0 ||
      safeFilterState.selectedSubjects.length > 0 ||
      safeFilterState.selectedExamTypes.length > 0 ||
      safeFilterState.selectedScoreRange ||
      safeFilterState.dateRange
    );
  };

  // 获取筛选器摘要
  const getFilterSummary = () => {
    const activeFilters = [];
    if (safeFilterState.selectedClasses.length > 0) {
      activeFilters.push(`${safeFilterState.selectedClasses.length}个班级`);
    }
    if (safeFilterState.selectedSubjects.length > 0) {
      activeFilters.push(`${safeFilterState.selectedSubjects.length}个科目`);
    }
    if (safeFilterState.selectedExamTypes.length > 0) {
      activeFilters.push(
        `${safeFilterState.selectedExamTypes.length}个考试类型`
      );
    }
    if (safeFilterState.selectedScoreRange) {
      activeFilters.push("分数筛选");
    }
    return activeFilters.join(" · ");
  };

  // 班级选择器组件
  const ClassSelector = () => (
    <Popover open={isClassesOpen} onOpenChange={setIsClassesOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-xs font-normal",
            safeFilterState.selectedClasses.length > 0 &&
              "border-blue-300 bg-blue-50"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          班级
          {safeFilterState.selectedClasses.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 text-xs px-1">
              {safeFilterState.selectedClasses.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Command>
          <CommandInput placeholder="搜索班级..." className="h-8" />
          <CommandList>
            <CommandEmpty>未找到班级</CommandEmpty>
            <CommandGroup>
              {safeConfig.classes.map((className) => {
                const isSelected =
                  safeFilterState.selectedClasses.includes(className);
                return (
                  <CommandItem
                    key={className}
                    onSelect={() => {
                      const newClasses = isSelected
                        ? safeFilterState.selectedClasses.filter(
                            (c) => c !== className
                          )
                        : [...safeFilterState.selectedClasses, className];
                      updateFilter({ selectedClasses: newClasses });
                    }}
                    className="flex items-center gap-2 px-2 py-1.5"
                  >
                    <Checkbox checked={isSelected} />
                    <span className="text-sm">{className}</span>
                    {isSelected && <Check className="h-3 w-3 ml-auto" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  // 科目选择器组件
  const SubjectSelector = () => (
    <Popover open={isSubjectsOpen} onOpenChange={setIsSubjectsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-xs font-normal",
            safeFilterState.selectedSubjects.length > 0 &&
              "border-green-300 bg-green-50"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          科目
          {safeFilterState.selectedSubjects.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 text-xs px-1">
              {safeFilterState.selectedSubjects.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start">
        <Command>
          <CommandInput placeholder="搜索科目..." className="h-8" />
          <CommandList>
            <CommandEmpty>未找到科目</CommandEmpty>
            <CommandGroup>
              {safeConfig.subjects.map((subject) => {
                const isSelected =
                  safeFilterState.selectedSubjects.includes(subject);
                return (
                  <CommandItem
                    key={subject}
                    onSelect={() => {
                      const newSubjects = isSelected
                        ? safeFilterState.selectedSubjects.filter(
                            (s) => s !== subject
                          )
                        : [...safeFilterState.selectedSubjects, subject];
                      updateFilter({ selectedSubjects: newSubjects });
                    }}
                    className="flex items-center gap-2 px-2 py-1.5"
                  >
                    <Checkbox checked={isSelected} />
                    <span className="text-sm">{subject}</span>
                    {isSelected && <Check className="h-3 w-3 ml-auto" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  // 分数范围选择器
  const ScoreRangeSelector = () => (
    <Select
      value={safeFilterState.selectedScoreRange}
      onValueChange={(value) => updateFilter({ selectedScoreRange: value })}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-auto min-w-[100px] text-xs",
          safeFilterState.selectedScoreRange && "border-yellow-300 bg-yellow-50"
        )}
      >
        <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
        <SelectValue placeholder="分数段" />
      </SelectTrigger>
      <SelectContent>
        {safeConfig.scoreRanges.map((range) => (
          <SelectItem key={range.label} value={range.label} className="text-xs">
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* 主筛选器栏 */}
      <div className="flex items-center gap-2 p-3 bg-gray-50/50 rounded-lg border border-gray-200">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="搜索学生姓名、学号..."
            value={safeFilterState.searchTerm}
            onChange={(e) => updateFilter({ searchTerm: e.target.value })}
            className="h-8 pl-8 text-xs border-gray-300 focus:border-blue-400"
          />
        </div>

        {/* 分隔线 */}
        <div className="h-6 w-px bg-gray-300" />

        {/* 筛选器组 */}
        <div className="flex items-center gap-2">
          <ClassSelector />
          <SubjectSelector />
          <ScoreRangeSelector />
        </div>

        {/* 重置按钮 */}
        {hasActiveFilters() && (
          <>
            <div className="h-6 w-px bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置
            </Button>
          </>
        )}
      </div>

      {/* 筛选器状态栏 */}
      {hasActiveFilters() && (
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Filter className="h-4 w-4" />
            <span className="font-medium">
              筛选结果: {filteredRecords} / {totalRecords} 条记录
            </span>
            {getFilterSummary() && (
              <>
                <span className="text-blue-400">·</span>
                <span className="text-blue-600">{getFilterSummary()}</span>
              </>
            )}
          </div>

          {/* 已选择筛选器的标签 */}
          <div className="flex items-center gap-1">
            {safeFilterState.selectedClasses.slice(0, 2).map((className) => (
              <Badge
                key={className}
                variant="secondary"
                className="h-5 text-xs bg-blue-100 text-blue-700 border-blue-200"
              >
                {className}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer hover:bg-blue-200 rounded"
                  onClick={() => {
                    const newClasses = safeFilterState.selectedClasses.filter(
                      (c) => c !== className
                    );
                    updateFilter({ selectedClasses: newClasses });
                  }}
                />
              </Badge>
            ))}
            {safeFilterState.selectedClasses.length > 2 && (
              <Badge variant="outline" className="h-5 text-xs">
                +{safeFilterState.selectedClasses.length - 2}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactGradeFilters;
