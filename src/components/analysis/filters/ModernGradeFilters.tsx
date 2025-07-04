/**
 * 🎨 现代化成绩筛选组件
 * 参照 Figma 设计风格，提供直观的筛选体验
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  X,
  Calendar,
  Users,
  BookOpen,
  Award,
  BarChart3,
  ChevronDown,
  Settings2,
  RefreshCw,
  Trash2,
  Edit3,
  Plus
} from 'lucide-react';

// 筛选条件接口
export interface GradeFilterConfig {
  // 基础筛选
  examIds?: string[];
  subjects?: string[];
  classNames?: string[];
  gradeLevels?: string[];
  
  // 分数范围
  scoreRange?: {
    min?: number;
    max?: number;
  };
  
  // 等级筛选
  grades?: string[];
  
  // 排名筛选
  rankRange?: {
    min?: number;
    max?: number;
  };
  
  // 时间范围
  dateRange?: {
    start?: string;
    end?: string;
  };
  
  // 搜索关键词
  searchKeyword?: string;
  
  // 考试类型
  examTypes?: string[];
}

export interface ModernGradeFiltersProps {
  // 筛选配置
  filter: GradeFilterConfig;
  onFilterChange: (filter: GradeFilterConfig) => void;
  
  // 数据选项
  availableExams?: Array<{ id: string; title: string; date: string; type: string; }>;
  availableSubjects?: string[];
  availableClasses?: string[];
  availableGrades?: string[];
  availableExamTypes?: string[];
  
  // 统计信息
  totalCount?: number;
  filteredCount?: number;
  
  // 考试管理回调
  onExamDelete?: (examId: string) => void;
  onExamEdit?: (examId: string) => void;
  onExamAdd?: () => void;
  
  // 样式
  className?: string;
  compact?: boolean;
}

const ModernGradeFilters: React.FC<ModernGradeFiltersProps> = ({
  filter,
  onFilterChange,
  availableExams = [],
  availableSubjects = [],
  availableClasses = [],
  availableGrades = [],
  availableExamTypes = [],
  totalCount = 0,
  filteredCount = 0,
  onExamDelete,
  onExamEdit,
  onExamAdd,
  className,
  compact = false
}) => {
  // 展开状态
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    advanced: false
  });
  
  // 计算活跃筛选器数量
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filter.examIds?.length) count++;
    if (filter.subjects?.length) count++;
    if (filter.classNames?.length) count++;
    if (filter.gradeLevels?.length) count++;
    if (filter.grades?.length) count++;
    if (filter.examTypes?.length) count++;
    if (filter.scoreRange?.min !== undefined || filter.scoreRange?.max !== undefined) count++;
    if (filter.rankRange?.min !== undefined || filter.rankRange?.max !== undefined) count++;
    if (filter.dateRange?.start || filter.dateRange?.end) count++;
    if (filter.searchKeyword) count++;
    return count;
  }, [filter]);
  
  // 更新筛选器
  const updateFilter = useCallback((updates: Partial<GradeFilterConfig>) => {
    onFilterChange({ ...filter, ...updates });
  }, [filter, onFilterChange]);
  
  // 清除所有筛选
  const clearAllFilters = useCallback(() => {
    onFilterChange({});
  }, [onFilterChange]);
  
  // 移除特定筛选
  const removeFilter = useCallback((filterKey: keyof GradeFilterConfig) => {
    const newFilter = { ...filter };
    delete newFilter[filterKey];
    onFilterChange(newFilter);
  }, [filter, onFilterChange]);
  
  // 切换展开状态
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  return (
    <Card className={cn(
      "bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]",
      compact && "shadow-[4px_4px_0px_0px_#B9FF66]",
      className
    )}>
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-[#191A23] uppercase tracking-wide">
                智能筛选器
              </CardTitle>
              <p className="text-sm text-[#191A23]/80 font-medium mt-1">
                {filteredCount > 0 ? (
                  <>已筛选 <span className="font-black text-[#191A23]">{filteredCount}</span> / {totalCount} 条数据</>
                ) : (
                  `共 ${totalCount} 条数据`
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Badge className="bg-[#191A23] text-white border-2 border-black font-bold">
                {activeFiltersCount} 个筛选
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              disabled={activeFiltersCount === 0}
              className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              重置
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* 🔍 Positivus风格搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#191A23]" />
          <Input
            placeholder="🔍 搜索学生姓名、班级或其他信息..."
            value={filter.searchKeyword || ''}
            onChange={(e) => updateFilter({ searchKeyword: e.target.value })}
            className="pl-10 bg-white border-2 border-black font-medium text-[#191A23] placeholder:text-[#191A23]/60 focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] focus:shadow-[4px_4px_0px_0px_#B9FF66] transition-all"
          />
          {filter.searchKeyword && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFilter('searchKeyword')}
              className="absolute right-2 top-1.5 h-7 w-7 p-0 text-[#191A23] hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* 🏷️ Positivus风格活跃筛选器标签 */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filter.examIds?.map(examId => {
              const exam = availableExams.find(e => e.id === examId);
              return exam ? (
                <Badge key={examId} className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all cursor-pointer">
                  📅 {exam.title}
                  <X 
                    className="w-3 h-3 ml-2 hover:text-[#FF6B6B] transition-colors" 
                    onClick={() => updateFilter({ 
                      examIds: filter.examIds?.filter(id => id !== examId) 
                    })}
                  />
                </Badge>
              ) : null;
            })}
            
            {filter.subjects?.map(subject => (
              <Badge key={subject} className="bg-[#F7931E] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all cursor-pointer">
                📚 {subject}
                <X 
                  className="w-3 h-3 ml-2 hover:text-[#FF6B6B] transition-colors" 
                  onClick={() => updateFilter({ 
                    subjects: filter.subjects?.filter(s => s !== subject) 
                  })}
                />
              </Badge>
            ))}
            
            {filter.classNames?.map(className => (
              <Badge key={className} className="bg-[#9C88FF] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all cursor-pointer">
                🏫 {className}
                <X 
                  className="w-3 h-3 ml-2 hover:text-[#FF6B6B] transition-colors" 
                  onClick={() => updateFilter({ 
                    classNames: filter.classNames?.filter(c => c !== className) 
                  })}
                />
              </Badge>
            ))}
          </div>
        )}

        {/* 基础筛选 */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 📅 考试选择与管理 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-black text-[#191A23] uppercase tracking-wide">📅 考试</Label>
                {onExamAdd && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExamAdd}
                    className="h-6 px-2 border-2 border-black bg-[#B9FF66] text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Select
                  value={filter.examIds?.[0] || 'all'}
                  onValueChange={(value) => updateFilter({ examIds: value === 'all' ? [] : [value] })}
                >
                  <SelectTrigger className="bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                    <SelectValue placeholder="选择考试" />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                    <SelectItem value="all">全部考试</SelectItem>
                    {availableExams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#191A23]" />
                          <span className="font-medium">{exam.title}</span>
                          <Badge className="bg-[#F7931E] text-white border border-black text-xs font-bold">
                            {exam.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* 考试管理按钮 */}
                {filter.examIds?.[0] && (onExamEdit || onExamDelete) && (
                  <div className="flex gap-1">
                    {onExamEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExamEdit(filter.examIds![0])}
                        className="px-2 border-2 border-black bg-[#F7931E] text-white font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    )}
                    {onExamDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExamDelete(filter.examIds![0])}
                        className="px-2 border-2 border-black bg-[#FF6B6B] text-white font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 📚 科目选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-black text-[#191A23] uppercase tracking-wide">📚 科目</Label>
              <Select
                value={filter.subjects?.[0] || 'all'}
                onValueChange={(value) => updateFilter({ subjects: value === 'all' ? [] : [value] })}
              >
                <SelectTrigger className="bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#F7931E] focus:ring-2 focus:ring-[#F7931E] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                  <SelectValue placeholder="选择科目" />
                </SelectTrigger>
                <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                  <SelectItem value="all">全部科目</SelectItem>
                  {availableSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#191A23]" />
                        <span className="font-medium">{subject}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 🏫 班级选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-black text-[#191A23] uppercase tracking-wide">🏫 班级</Label>
              <Select
                value={filter.classNames?.[0] || 'all'}
                onValueChange={(value) => updateFilter({ classNames: value === 'all' ? [] : [value] })}
              >
                <SelectTrigger className="bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#9C88FF] focus:ring-2 focus:ring-[#9C88FF] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                  <SelectValue placeholder="选择班级" />
                </SelectTrigger>
                <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                  <SelectItem value="all">全部班级</SelectItem>
                  {availableClasses.map(className => (
                    <SelectItem key={className} value={className}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#191A23]" />
                        <span className="font-medium">{className}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 🏆 等级选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-black text-[#191A23] uppercase tracking-wide">🏆 等级</Label>
              <Select
                value={filter.grades?.[0] || 'all'}
                onValueChange={(value) => updateFilter({ grades: value === 'all' ? [] : [value] })}
              >
                <SelectTrigger className="bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#FED7D7] focus:ring-2 focus:ring-[#FED7D7] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                  <SelectValue placeholder="选择等级" />
                </SelectTrigger>
                <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                  <SelectItem value="all">全部等级</SelectItem>
                  {availableGrades.map(grade => (
                    <SelectItem key={grade} value={grade}>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#191A23]" />
                        <span className="font-medium">{grade}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 🔧 高级筛选 */}
        {!compact && (
          <div className="space-y-4">
            <Separator className="border-[#191A23]/20" />
            
            <Button
              variant="ghost"
              onClick={() => toggleSection('advanced')}
              className="flex items-center gap-2 text-[#191A23] hover:text-[#F7931E] font-bold p-2 hover:bg-[#F7931E]/10 rounded-lg border-2 border-transparent hover:border-[#F7931E] transition-all"
            >
              <Settings2 className="w-4 h-4" />
              <span className="uppercase tracking-wide">🔧 高级筛选</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                expandedSections.advanced && "rotate-180"
              )} />
            </Button>

            {expandedSections.advanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 p-4 bg-[#F3F3F3] border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
                {/* 📊 分数范围 */}
                <div className="space-y-3">
                  <Label className="text-sm font-black text-[#191A23] uppercase tracking-wide">📊 分数范围</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="最低分"
                      value={filter.scoreRange?.min || ''}
                      onChange={(e) => updateFilter({
                        scoreRange: {
                          ...filter.scoreRange,
                          min: e.target.value ? Number(e.target.value) : undefined
                        }
                      })}
                      className="bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23] transition-all"
                    />
                    <Input
                      type="number"
                      placeholder="最高分"
                      value={filter.scoreRange?.max || ''}
                      onChange={(e) => updateFilter({
                        scoreRange: {
                          ...filter.scoreRange,
                          max: e.target.value ? Number(e.target.value) : undefined
                        }
                      })}
                      className="bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23] transition-all"
                    />
                  </div>
                </div>

                {/* 🏆 排名范围 */}
                <div className="space-y-3">
                  <Label className="text-sm font-black text-[#191A23] uppercase tracking-wide">🏆 排名范围</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="最高排名"
                      value={filter.rankRange?.min || ''}
                      onChange={(e) => updateFilter({
                        rankRange: {
                          ...filter.rankRange,
                          min: e.target.value ? Number(e.target.value) : undefined
                        }
                      })}
                      className="bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#F7931E] focus:ring-2 focus:ring-[#F7931E] shadow-[2px_2px_0px_0px_#191A23] transition-all"
                    />
                    <Input
                      type="number"
                      placeholder="最低排名"
                      value={filter.rankRange?.max || ''}
                      onChange={(e) => updateFilter({
                        rankRange: {
                          ...filter.rankRange,
                          max: e.target.value ? Number(e.target.value) : undefined
                        }
                      })}
                      className="bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#F7931E] focus:ring-2 focus:ring-[#F7931E] shadow-[2px_2px_0px_0px_#191A23] transition-all"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 📈 筛选结果统计 */}
        {filteredCount !== totalCount && (
          <div className="bg-[#B9FF66] border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_0px_#191A23]">
            <div className="flex items-center gap-3 text-[#191A23]">
              <div className="p-2 bg-[#191A23] rounded-full">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-base font-black uppercase tracking-wide">
                  📈 筛选结果
                </span>
                <p className="text-sm font-medium mt-1">
                  已筛选出 <span className="font-black text-[#F7931E]">{filteredCount}</span> / {totalCount} 条数据
                  <span className="ml-2 text-xs bg-[#191A23] text-white px-2 py-1 rounded-full font-bold">
                    {Math.round((filteredCount / totalCount) * 100)}%
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModernGradeFilters;