
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";

interface GradeData {
  studentId: string;
  name: string;
  subject: string;
  score: number;
  examDate?: string;
  examType?: string;
}

interface Props {
  data?: GradeData[];
}

const GradeTable: React.FC<Props> = ({ data: externalData }) => {
  const { gradeData, isDataLoaded } = useGradeAnalysis();
  const [tableData, setTableData] = useState<GradeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
            students(
              name,
              student_id
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const formattedData = data.map(item => ({
            studentId: item.students?.student_id || '未知学号',
            name: item.students?.name || '未知学生',
            subject: item.subject,
            score: item.score,
            examDate: item.exam_date,
            examType: item.exam_type
          }));
          
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>成绩数据表格</CardTitle>
        <CardDescription>全部学生成绩原始数据</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>科目</TableHead>
                  <TableHead>分数</TableHead>
                  <TableHead>考试日期</TableHead>
                  <TableHead>考试类型</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData && tableData.length > 0 ? (
                  tableData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{sanitizeData(item.studentId)}</TableCell>
                      <TableCell>{sanitizeData(item.name)}</TableCell>
                      <TableCell>{sanitizeData(item.subject)}</TableCell>
                      <TableCell className="font-medium">{sanitizeData(item.score)}</TableCell>
                      <TableCell>{item.examDate ? sanitizeData(item.examDate) : '-'}</TableCell>
                      <TableCell>{item.examType ? sanitizeData(item.examType) : '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GradeTable;
