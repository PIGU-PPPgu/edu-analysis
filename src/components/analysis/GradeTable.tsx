import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";

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
          <ScrollArea className="w-full rounded-md border">
            <div ref={tableRef} style={{ minWidth: '100%' }}>
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead style={{ width: '100px', minWidth: '100px' }} className="px-3">学号</TableHead>
                    <TableHead style={{ width: '120px', minWidth: '120px' }} className="px-3">姓名</TableHead>
                    {showClassName && (
                      <TableHead style={{ width: '120px', minWidth: '120px' }} className="px-3">班级</TableHead>
                    )}
                    <TableHead style={{ width: '100px', minWidth: '100px' }} className="px-3">科目</TableHead>
                    <TableHead style={{ width: '80px', minWidth: '80px' }} className="px-3">分数</TableHead>
                    <TableHead style={{ width: '120px', minWidth: '120px' }} className="px-3">考试日期</TableHead>
                    <TableHead style={{ width: '120px', minWidth: '120px' }} className="px-3">考试类型</TableHead>
                    {showExamTitle && (
                      <TableHead style={{ width: '200px', minWidth: '200px' }} className="px-3">考试标题</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData && tableData.length > 0 ? (
                    tableData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono px-3">{sanitizeData(item.studentId)}</TableCell>
                        <TableCell className="px-3">{sanitizeData(item.name)}</TableCell>
                        {showClassName && (
                          <TableCell className="px-3">{sanitizeData(item.className || '-')}</TableCell>
                        )}
                        <TableCell className="px-3">{sanitizeData(item.subject)}</TableCell>
                        <TableCell className="font-medium px-3">{sanitizeData(item.score)}</TableCell>
                        <TableCell className="px-3">{item.examDate ? sanitizeData(item.examDate) : '-'}</TableCell>
                        <TableCell className="px-3">{item.examType ? sanitizeData(item.examType) : '-'}</TableCell>
                        {showExamTitle && (
                          <TableCell className="px-3">
                            <div style={{ 
                              maxWidth: '200px', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={item.examTitle || '-'}>
                              {item.examTitle ? sanitizeData(item.examTitle) : '-'}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={showExamTitle ? (showClassName ? 8 : 7) : (showClassName ? 7 : 6)} className="text-center py-4 text-gray-500">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default GradeTable;
