/**
 * 学期筛选组件
 * 用于在考试管理界面筛选不同学期的考试
 */

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

export interface AcademicTerm {
  id: string;
  academic_year: string;
  semester: string;
  semester_code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
  description?: string;
}

interface SemesterFilterProps {
  academicTerms: AcademicTerm[];
  selectedTermId: string;
  onTermChange: (termId: string) => void;
  className?: string;
  placeholder?: string;
  showCurrentBadge?: boolean;
}

const SemesterFilter: React.FC<SemesterFilterProps> = ({
  academicTerms,
  selectedTermId,
  onTermChange,
  className = "",
  placeholder = "选择学期",
  showCurrentBadge = true,
}) => {
  // 按学年和学期排序，最新的在前面
  const sortedTerms = [...academicTerms].sort((a, b) => {
    // 首先按学年排序（降序）
    const yearComparison = b.academic_year.localeCompare(a.academic_year);
    if (yearComparison !== 0) return yearComparison;

    // 然后按学期排序（第一学期在前）
    const semesterOrder = { 第一学期: 1, 第二学期: 2 };
    const aOrder =
      semesterOrder[a.semester as keyof typeof semesterOrder] || 999;
    const bOrder =
      semesterOrder[b.semester as keyof typeof semesterOrder] || 999;
    return aOrder - bOrder;
  });

  // 当前学期
  const currentTerm = academicTerms.find((term) => term.is_current);

  // 获取选中学期的信息
  const selectedTerm = academicTerms.find((term) => term.id === selectedTermId);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Calendar className="h-4 w-4" />
        <span>学期</span>
      </div>

      <Select value={selectedTermId} onValueChange={onTermChange}>
        <SelectTrigger className="w-48 border-gray-200">
          <SelectValue placeholder={placeholder}>
            {selectedTerm && (
              <div className="flex items-center gap-2">
                <span>
                  {selectedTerm.academic_year} {selectedTerm.semester}
                </span>
                {selectedTerm.is_current && showCurrentBadge && (
                  <Badge
                    variant="default"
                    className="text-xs bg-[#B9FF66] text-black"
                  >
                    当前
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* 全部学期选项 */}
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <span>全部学期</span>
              <Badge variant="outline" className="text-xs">
                {academicTerms.length} 个学期
              </Badge>
            </div>
          </SelectItem>

          {sortedTerms.length > 0 && (
            <>
              {/* 分隔线 */}
              <div className="border-t my-1" />

              {/* 学期选项 */}
              {sortedTerms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {term.academic_year} {term.semester}
                        </span>
                        {term.is_current && (
                          <Badge
                            variant="default"
                            className="text-xs bg-[#B9FF66] text-black"
                          >
                            当前
                          </Badge>
                        )}
                        {!term.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            已结束
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(term.start_date).toLocaleDateString()} -{" "}
                        {new Date(term.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {sortedTerms.length === 0 && (
            <SelectItem value="empty" disabled>
              <span className="text-gray-500">暂无学期数据</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* 显示当前选择的学期信息 */}
      {selectedTerm && selectedTermId !== "all" && (
        <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
          <span>•</span>
          <span>
            {new Date(selectedTerm.start_date).toLocaleDateString()} 至{" "}
            {new Date(selectedTerm.end_date).toLocaleDateString()}
          </span>
          {selectedTerm.description && (
            <>
              <span>•</span>
              <span>{selectedTerm.description}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SemesterFilter;
