/**
 * 考试筛选器组件
 */

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Filter,
  X,
  Calendar as CalendarIcon,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ExamFilters,
  ExamType,
  AcademicTerm,
  EXAM_STATUS_OPTIONS,
} from "../types";

interface ExamFiltersComponentProps {
  filters: ExamFilters;
  onFiltersChange: (filters: ExamFilters) => void;
  examTypes: ExamType[];
  academicTerms: AcademicTerm[];
  showFilters: boolean;
  onToggleFilters: () => void;
}

export const ExamFiltersComponent: React.FC<ExamFiltersComponentProps> = ({
  filters,
  onFiltersChange,
  examTypes,
  academicTerms,
  showFilters,
  onToggleFilters,
}) => {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters.dateRange?.from
      ? new Date(filters.dateRange.from)
      : undefined,
    to: filters.dateRange?.to ? new Date(filters.dateRange.to) : undefined,
  });

  // 更新搜索词
  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchTerm: value,
    });
  };

  // 更新状态筛选
  const handleStatusFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      statusFilter: value,
    });
  };

  // 更新类型筛选
  const handleTypeFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      typeFilter: value,
    });
  };

  // 更新学期筛选
  const handleTermFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      selectedTermId: value,
    });
  };

  // 更新日期范围
  const handleDateRangeChange = (range?: DateRange) => {
    const nextRange = range ?? { from: undefined, to: undefined };
    setDateRange({ from: nextRange.from, to: nextRange.to });
    onFiltersChange({
      ...filters,
      dateRange:
        nextRange.from && nextRange.to
          ? {
              from: format(nextRange.from, "yyyy-MM-dd"),
              to: format(nextRange.to, "yyyy-MM-dd"),
            }
          : undefined,
    });
  };

  // 重置所有筛选条件
  const handleResetFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    onFiltersChange({
      searchTerm: "",
      statusFilter: "all",
      typeFilter: "all",
      selectedTermId: "all",
    });
  };

  // 计算激活的筛选器数量
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.statusFilter !== "all") count++;
    if (filters.typeFilter !== "all") count++;
    if (filters.selectedTermId !== "all") count++;
    if (filters.dateRange) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="space-y-4">
      {/* 顶部搜索栏和筛选器切换 */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 搜索框 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="搜索考试标题、类型或描述..."
            value={filters.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>

        {/* 筛选器切换按钮 */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onToggleFilters}
            className={cn(
              "flex items-center gap-2",
              showFilters && "bg-blue-50 border-blue-200"
            )}
          >
            <Filter className="h-4 w-4" />
            筛选器
            {activeFiltersCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              重置
            </Button>
          )}
        </div>
      </div>

      {/* 展开的筛选器 */}
      {showFilters && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 状态筛选 */}
              <div className="space-y-2">
                <Label htmlFor="status-filter">状态筛选</Label>
                <Select
                  value={filters.statusFilter}
                  onValueChange={handleStatusFilterChange}
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 类型筛选 */}
              <div className="space-y-2">
                <Label htmlFor="type-filter">类型筛选</Label>
                <Select
                  value={filters.typeFilter}
                  onValueChange={handleTypeFilterChange}
                >
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    {examTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        <div className="flex items-center gap-2">
                          <span>{type.emoji}</span>
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 学期筛选 */}
              <div className="space-y-2">
                <Label htmlFor="term-filter">学期筛选</Label>
                <Select
                  value={filters.selectedTermId}
                  onValueChange={handleTermFilterChange}
                >
                  <SelectTrigger id="term-filter">
                    <SelectValue placeholder="选择学期" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部学期</SelectItem>
                    {academicTerms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.academic_year} {term.semester}
                        {term.is_current && (
                          <Badge variant="secondary" className="ml-2">
                            当前
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 日期范围筛选 */}
              <div className="space-y-2">
                <Label>日期范围</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from &&
                          !dateRange.to &&
                          "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "yyyy/MM/dd")} -{" "}
                            {format(dateRange.to, "yyyy/MM/dd")}
                          </>
                        ) : (
                          format(dateRange.from, "yyyy/MM/dd")
                        )
                      ) : (
                        "选择日期范围"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={(range) => handleDateRangeChange(range)}
                      numberOfMonths={2}
                    />
                    {(dateRange.from || dateRange.to) && (
                      <div className="p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDateRangeChange({
                              from: undefined,
                              to: undefined,
                            })
                          }
                          className="w-full"
                        >
                          <X className="h-4 w-4 mr-2" />
                          清除日期
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 激活的筛选器标签 */}
            {activeFiltersCount > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">激活的筛选器:</span>

                  {filters.searchTerm && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      搜索: {filters.searchTerm}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleSearchChange("")}
                      />
                    </Badge>
                  )}

                  {filters.statusFilter !== "all" && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      状态:{" "}
                      {
                        EXAM_STATUS_OPTIONS.find(
                          (s) => s.value === filters.statusFilter
                        )?.label
                      }
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleStatusFilterChange("all")}
                      />
                    </Badge>
                  )}

                  {filters.typeFilter !== "all" && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      类型: {filters.typeFilter}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleTypeFilterChange("all")}
                      />
                    </Badge>
                  )}

                  {filters.selectedTermId !== "all" && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      学期:{" "}
                      {
                        academicTerms.find(
                          (t) => t.id === filters.selectedTermId
                        )?.academic_year
                      }{" "}
                      {
                        academicTerms.find(
                          (t) => t.id === filters.selectedTermId
                        )?.semester
                      }
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleTermFilterChange("all")}
                      />
                    </Badge>
                  )}

                  {filters.dateRange && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      日期: {filters.dateRange.from} - {filters.dateRange.to}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          handleDateRangeChange({
                            from: undefined,
                            to: undefined,
                          })
                        }
                      />
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
