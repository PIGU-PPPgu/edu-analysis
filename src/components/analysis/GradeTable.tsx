import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SearchIcon, Download, Filter, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

interface GradeData {
  studentId: string;
  name: string;
  subject: string;
  score: number;
  examDate?: string;
  examType?: string;
  examTitle?: string;
  className?: string;
  id?: string;
  rankInClass?: number;
  rankInGrade?: number;
  grade?: string;
}

interface Props {
  data?: GradeData[];
  showExamTitle?: boolean;
  showClassName?: boolean;
}

const GradeTable: React.FC<Props> = ({ 
  data: externalData, 
  showExamTitle = true,
  showClassName = true
}) => {
  const { gradeData, isDataLoaded } = useGradeAnalysis();
  const [tableData, setTableData] = useState<GradeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [filter, setFilter] = useState<{
    className: string | null;
    subject: string | null;
  }>({
    className: null,
    subject: null
  });

  useEffect(() => {
    // 如果有外部传入的数据或上下文中有数据，优先使用
    if (externalData && externalData.length > 0) {
      setTableData(externalData);
      setIsLoading(false);
      return;
    }
    
    if (isDataLoaded && gradeData.length > 0) {
      setTableData(gradeData);
      setIsLoading(false);
      return;
    }
    
    // 否则从数据库获取
    const fetchGrades = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('grades')
          .select(`
            id,
            score,
            subject,
            exam_date,
            exam_type,
            exam_title,
            students(
              name,
              student_id,
              class_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const formattedData = data.map(item => {
            // 类型断言，确保students是一个对象而不是数组
            const student = Array.isArray(item.students) ? item.students[0] : item.students;
            
            return {
              id: item.id,
              studentId: student?.student_id || '未知学号',
              name: student?.name || '未知学生',
              subject: item.subject,
              score: item.score,
              examDate: item.exam_date,
              examType: item.exam_type,
              examTitle: item.exam_title,
              className: student?.class_name || '未知班级'
            };
          });
          
          setTableData(formattedData);
        } else {
          setTableData([]);
        }
      } catch (error) {
        console.error("获取成绩数据失败:", error);
        setTableData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGrades();
  }, [externalData, gradeData, isDataLoaded]);

  // 安全处理数据显示，防止二进制或非文本内容
  const sanitizeData = (value: any): string => {
    if (value === null || value === undefined) return '-';
    
    // 检查值是否是字符串并包含二进制数据标记
    if (typeof value === 'string' && (value.includes('PK') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value))) {
      return '[二进制数据]';
    }
    
    return String(value);
  };

  // 设置表格宽度
  useEffect(() => {
    if (tableRef.current) {
      // 计算所需的表格宽度
      const baseWidth = 600; // 基础宽度
      const columnCount = showExamTitle ? (showClassName ? 8 : 7) : (showClassName ? 7 : 6);
      const columnWidth = 150; // 每列的平均宽度
      
      // 计算表格需要的最小宽度
      const minTableWidth = baseWidth + (columnCount * columnWidth);
      tableRef.current.style.minWidth = `${minTableWidth}px`;
    }
  }, [showExamTitle, showClassName, tableData]);

  // 从数据中获取可用的筛选选项
  const getUniqueValues = (fieldName: string) => {
    const values = [...new Set(tableData.map(item => item[fieldName]))].filter(Boolean);
    return values.sort();
  };
  
  // 处理排序
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // 应用排序和筛选
  const filteredAndSortedData = () => {
    // 先筛选
    let result = tableData.filter(item => {
      // 应用搜索词过滤
      const searchFields = [item.studentId, item.name, item.className, item.subject].join(' ').toLowerCase();
      const searchMatch = !searchTerm || searchFields.includes(searchTerm.toLowerCase());
      
      // 应用其他筛选条件
      const classMatch = !filter.className || item.className === filter.className;
      const subjectMatch = !filter.subject || item.subject === filter.subject;
      
      return searchMatch && classMatch && subjectMatch;
    });
    
    // 再排序
    if (sortField) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        // 处理数字排序
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // 处理字符串排序
        const aString = String(aValue || '').toLowerCase();
        const bString = String(bValue || '').toLowerCase();
        
        if (sortDirection === 'asc') {
          return aString.localeCompare(bString);
        } else {
          return bString.localeCompare(aString);
        }
      });
    }
    
    return result;
  };
  
  // 处理CSV导出
  const handleExportCSV = () => {
    const rows = [
      // 表头
      ['学号', '姓名', '班级', '科目', '分数', '考试标题', '考试类型', '考试日期', '班级排名', '年级排名', '等级'],
      // 数据行
      ...filteredAndSortedData().map(row => [
        row.studentId,
        row.name,
        row.className,
        row.subject,
        row.score,
        row.examTitle || '',
        row.examType || '',
        row.examDate || '',
        row.rankInClass || '',
        row.rankInGrade || '',
        row.grade || ''
      ])
    ];
    
    // 转换为CSV
    const csvContent = rows
      .map(row => row.map(cell => typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell).join(','))
      .join('\n');
    
    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `成绩数据导出_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };
  
  // 获取排序箭头样式
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUp className="ml-2 h-4 w-4" /> 
      : <ChevronDown className="ml-2 h-4 w-4" />;
  };
  
  // 获取分数等级样式
  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };
  
  const processedData = filteredAndSortedData();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>成绩数据表格</CardTitle>
        <CardDescription>全部学生成绩原始数据</CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-0"> 
        {isLoading ? (
          <div className="flex justify-center py-8">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  placeholder="搜索学号、姓名或班级..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Select
                  value={filter.className || ''}
                  onValueChange={(value) => setFilter({ ...filter, className: value === '' ? null : value })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="班级筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部班级</SelectItem>
                    {getUniqueValues('className').map((className) => (
                      <SelectItem key={className} value={className}>{className}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={filter.subject || ''}
                  onValueChange={(value) => setFilter({ ...filter, subject: value === '' ? null : value })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="科目筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部科目</SelectItem>
                    {getUniqueValues('subject').map((subject) => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  导出
                </Button>
              </div>
            </div>
            
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">序号</TableHead>
                      <TableHead className="w-32 cursor-pointer" onClick={() => handleSort('studentId')}>
                        <div className="flex items-center">
                          学号
                          {getSortIcon('studentId')}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                        <div className="flex items-center">
                          姓名
                          {getSortIcon('name')}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('className')}>
                        <div className="flex items-center">
                          班级
                          {getSortIcon('className')}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('subject')}>
                        <div className="flex items-center">
                          科目
                          {getSortIcon('subject')}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer text-right" onClick={() => handleSort('score')}>
                        <div className="flex items-center justify-end">
                          分数
                          {getSortIcon('score')}
                        </div>
                      </TableHead>
                      {tableData.some(item => item.rankInClass) && (
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('rankInClass')}>
                          <div className="flex items-center justify-end">
                            班排名
                            {getSortIcon('rankInClass')}
                          </div>
                        </TableHead>
                      )}
                      {tableData.some(item => item.rankInGrade) && (
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('rankInGrade')}>
                          <div className="flex items-center justify-end">
                            年级排名
                            {getSortIcon('rankInGrade')}
                          </div>
                        </TableHead>
                      )}
                      {tableData.some(item => item.grade) && (
                        <TableHead className="cursor-pointer" onClick={() => handleSort('grade')}>
                          <div className="flex items-center">
                            等级
                            {getSortIcon('grade')}
                          </div>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedData.length > 0 ? (
                      processedData.map((item, index) => (
                        <TableRow key={`${item.studentId}-${item.subject}-${index}`}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{item.studentId}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.className}</TableCell>
                          <TableCell>{item.subject}</TableCell>
                          <TableCell className="text-right">
                            <Badge className={getScoreBadgeVariant(item.score)}>
                              {item.score}
                            </Badge>
                          </TableCell>
                          {tableData.some(item => item.rankInClass) && (
                            <TableCell className="text-right">{item.rankInClass || '-'}</TableCell>
                          )}
                          {tableData.some(item => item.rankInGrade) && (
                            <TableCell className="text-right">{item.rankInGrade || '-'}</TableCell>
                          )}
                          {tableData.some(item => item.grade) && (
                            <TableCell>{item.grade || '-'}</TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell 
                          colSpan={8 + 
                            (tableData.some(item => item.rankInClass) ? 1 : 0) + 
                            (tableData.some(item => item.rankInGrade) ? 1 : 0) + 
                            (tableData.some(item => item.grade) ? 1 : 0)
                          } 
                          className="h-24 text-center"
                        >
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            <div className="flex justify-between text-sm text-gray-500">
              <span>共 {processedData.length} 条记录</span>
              <span>
                {filter.className || filter.subject ? 
                  `已筛选: ${filter.className ? `班级(${filter.className})` : ''} ${filter.subject ? `科目(${filter.subject})` : ''}` : 
                  '显示全部数据'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GradeTable;
