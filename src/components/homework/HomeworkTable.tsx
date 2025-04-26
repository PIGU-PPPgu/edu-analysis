import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, MoreHorizontal, PenLine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HomeworkTableProps {
  className?: string;
}

const mockHomeworks = [
  {
    id: 1,
    title: "JavaScript 基础练习",
    class: "Web前端开发基础",
    dueDate: "2023-05-20",
    submissionCount: "28/30",
    status: "已截止",
  },
  {
    id: 2,
    title: "React状态管理项目",
    class: "前端框架高级应用",
    dueDate: "2023-06-05",
    submissionCount: "18/25",
    status: "进行中",
  },
  {
    id: 3,
    title: "数据库设计与实现",
    class: "数据库系统",
    dueDate: "2023-06-10",
    submissionCount: "22/28",
    status: "进行中",
  },
  {
    id: 4,
    title: "算法分析报告",
    class: "算法与数据结构",
    dueDate: "2023-05-15",
    submissionCount: "30/30",
    status: "已截止",
  },
  {
    id: 5,
    title: "网络安全实验",
    class: "网络与信息安全",
    dueDate: "2023-06-18",
    status: "未开始",
    submissionCount: "0/32",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "已截止":
      return "bg-red-100 text-red-800 hover:bg-red-100/80";
    case "进行中":
      return "bg-green-100 text-green-800 hover:bg-green-100/80";
    default:
      return "bg-blue-100 text-blue-800 hover:bg-blue-100/80";
  }
};

export function HomeworkTable({ className }: HomeworkTableProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center">
        <div>
          <CardTitle>作业列表</CardTitle>
          <CardDescription>管理班级作业和学生提交</CardDescription>
        </div>
        <Button size="sm" className="ml-auto">
          <FileText className="mr-2 h-4 w-4" />
          发布新作业
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>作业标题</TableHead>
              <TableHead>班级</TableHead>
              <TableHead>截止日期</TableHead>
              <TableHead>提交情况</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockHomeworks.map((homework) => (
              <TableRow key={homework.id}>
                <TableCell className="font-medium">{homework.title}</TableCell>
                <TableCell>{homework.class}</TableCell>
                <TableCell>{homework.dueDate}</TableCell>
                <TableCell>{homework.submissionCount}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(homework.status)}>
                    {homework.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">打开菜单</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <PenLine className="mr-2 h-4 w-4" />
                        批改作业
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 