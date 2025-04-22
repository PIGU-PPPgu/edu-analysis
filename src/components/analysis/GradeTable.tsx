
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface GradeData {
  studentId: string;
  name: string;
  subject: string;
  score: number;
  examDate?: string;
  examType?: string;
}

interface Props {
  data: GradeData[];
}

const GradeTable: React.FC<Props> = ({ data }) => {
  // Safely handle data display, preventing any binary or non-text content
  const sanitizeData = (value: any): string => {
    if (value === null || value === undefined) return '-';
    
    // Check if value is a string and contains binary data markers
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
              {data && data.length > 0 ? (
                data.map((item, index) => (
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
      </CardContent>
    </Card>
  );
};

export default GradeTable;
