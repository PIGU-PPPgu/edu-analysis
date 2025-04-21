
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
              {data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.studentId}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.subject}</TableCell>
                  <TableCell className="font-medium">{item.score}</TableCell>
                  <TableCell>{item.examDate || '-'}</TableCell>
                  <TableCell>{item.examType || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default GradeTable;

