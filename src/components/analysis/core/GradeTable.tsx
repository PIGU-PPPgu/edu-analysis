import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Eye
} from "lucide-react";

// StudentGrade 接口定义
interface StudentGrade {
  id: string;
  student_id: string;
  name?: string;
  class_name?: string;
  subject?: string;
  score?: number;
  grade?: string;
  rank_in_class?: number;
  rank_in_grade?: number;
  exam_title?: string;
  exam_type?: string;
  exam_date?: string | null;
  total_score?: number;
  subject_total_score?: number;
  students?: {
    name?: string;
    student_id?: string;
    class_name?: string;
  };
}

interface GradeTableProps {
  gradeData: StudentGrade[];
  onRowClick?: (student: StudentGrade) => void;
}

// 获取成绩颜色样式
const getScoreColor = (score?: number) => {
  if (!score) return "text-gray-500";
  if (score >= 90) return "text-green-600 font-semibold";
  if (score >= 80) return "text-blue-600 font-semibold";
  if (score >= 70) return "text-yellow-600 font-medium";
  if (score >= 60) return "text-orange-600 font-medium";
  return "text-red-600 font-semibold";
};

// 获取等级徽章样式
const getGradeBadge = (grade?: string) => {
  if (!grade) return null;
  
  const gradeConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
    'A': { variant: "default", className: "bg-green-500 text-white" },
    'A+': { variant: "default", className: "bg-green-600 text-white" },
    'A-': { variant: "default", className: "bg-green-400 text-white" },
    'B': { variant: "default", className: "bg-blue-500 text-white" },
    'B+': { variant: "default", className: "bg-blue-600 text-white" },
    'B-': { variant: "default", className: "bg-blue-400 text-white" },
    'C': { variant: "secondary", className: "bg-yellow-500 text-white" },
    'C+': { variant: "secondary", className: "bg-yellow-600 text-white" },
    'C-': { variant: "secondary", className: "bg-yellow-400 text-white" },
    'D': { variant: "destructive", className: "bg-orange-500 text-white" },
    'F': { variant: "destructive", className: "bg-red-500 text-white" },
  };

  const config = gradeConfig[grade] || { variant: "outline" as const, className: "" };
  
  return (
    <Badge variant={config.variant} className={config.className}>
      {grade}
    </Badge>
  );
};

export default function GradeTable({ gradeData, onRowClick }: GradeTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([{ id: "score", desc: true }]);

  // 定义表格列
  const columns: ColumnDef<StudentGrade>[] = useMemo(() => [
    {
      header: "学号",
      accessorKey: "student_id",
      cell: ({ row }) => (
        <div className="font-mono text-sm font-medium">
          {row.getValue("student_id")}
        </div>
      ),
    },
    {
      header: "姓名",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.name || row.original.students?.name || "-"}
        </div>
      ),
    },
    {
      header: "班级",
      accessorKey: "class_name",
      cell: ({ row }) => {
        const className = row.original.class_name || row.original.students?.class_name;
        return className ? (
          <Badge variant="outline" className="font-medium">
            {className}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      header: "科目",
      accessorKey: "subject",
      cell: ({ row }) => {
        const subject = row.getValue("subject") as string;
        return subject ? (
          <Badge variant="secondary" className="font-medium">
            {subject}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      header: "分数",
      accessorKey: "score",
      cell: ({ row }) => {
        const score = row.getValue("score") as number;
        const totalScore = row.original.subject_total_score || row.original.total_score;
        return (
          <div className="text-right">
            <div className={cn("text-lg", getScoreColor(score))}>
              {score ? score.toFixed(1) : "-"}
            </div>
            {totalScore && (
              <div className="text-xs text-gray-500">
                / {totalScore}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "等级",
      accessorKey: "grade",
      cell: ({ row }) => {
        const grade = row.getValue("grade") as string;
        return (
          <div className="flex justify-center">
            {getGradeBadge(grade) || <span className="text-gray-400">-</span>}
          </div>
        );
      },
    },
    {
      header: "班级排名",
      accessorKey: "rank_in_class",
      cell: ({ row }) => {
        const rank = row.getValue("rank_in_class") as number;
        return rank ? (
          <div className="text-center font-medium">
            #{rank}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      header: "年级排名",
      accessorKey: "rank_in_grade",
      cell: ({ row }) => {
        const rank = row.getValue("rank_in_grade") as number;
        return rank ? (
          <div className="text-center font-medium">
            #{rank}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      header: "考试信息",
      accessorKey: "exam_title",
      cell: ({ row }) => (
        <div className="max-w-32">
          <div className="font-medium text-sm truncate">
            {row.original.exam_title || "-"}
          </div>
          {row.original.exam_type && (
            <div className="text-xs text-gray-500">
              {row.original.exam_type}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">操作</span>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRowClick?.(row.original);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ], [onRowClick]);

  const table = useReactTable({
    data: gradeData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const searchableContent = `${row.original.name || row.original.students?.name || ''} ${row.original.student_id} ${row.original.class_name || row.original.students?.class_name || ''} ${row.original.subject || ''}`.toLowerCase();
      return searchableContent.includes((filterValue ?? "").toLowerCase());
    },
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="搜索学号、姓名、班级或科目..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 表格 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center space-x-2",
                          header.column.getCanSort() && "cursor-pointer select-none"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <div className="flex flex-col">
                            {{
                              asc: <ChevronUp className="h-4 w-4" />,
                              desc: <ChevronDown className="h-4 w-4" />,
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页控制 */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          共 {table.getFilteredRowModel().rows.length} 条记录
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
} 