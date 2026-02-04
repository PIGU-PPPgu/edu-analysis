"use client";

/**
 * 学生增值明细下载组件
 * 提供学生增值数据的Excel导出功能
 */

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, Filter } from "lucide-react";
import { toast } from "sonner";
import { exportStudentReportToExcel } from "@/services/reportExportService";
import type { StudentValueAdded } from "@/types/valueAddedTypes";

interface StudentDetailDownloadProps {
  /** 学生增值数据 */
  data: StudentValueAdded[];

  /** 是否显示加载状态 */
  loading?: boolean;
}

export function StudentDetailDownload({
  data,
  loading = false,
}: StudentDetailDownloadProps) {
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  // 提取可用班级列表
  const availableClasses = useMemo(() => {
    const classes = Array.from(new Set(data.map((d) => d.class_name))).sort();
    return classes;
  }, [data]);

  // 提取可用科目列表
  const availableSubjects = useMemo(() => {
    const subjects = Array.from(new Set(data.map((d) => d.subject))).sort();
    return subjects;
  }, [data]);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    let result = data;

    if (selectedClass !== "all") {
      result = result.filter((d) => d.class_name === selectedClass);
    }

    if (selectedSubject !== "all") {
      result = result.filter((d) => d.subject === selectedSubject);
    }

    return result;
  }, [data, selectedClass, selectedSubject]);

  // 导出Excel
  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error("没有可导出的数据");
      return;
    }

    const fileName = `学生增值明细${selectedClass !== "all" ? `_${selectedClass}` : ""}${selectedSubject !== "all" ? `_${selectedSubject}` : ""}.xlsx`;

    const result = exportStudentReportToExcel(filteredData, { fileName });

    if (result.success) {
      toast.success(`成功导出 ${filteredData.length} 条学生数据`);
    } else {
      toast.error(`导出失败: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无学生增值数据</p>
        <p className="text-sm mt-2">
          请先在"增值活动"标签页中创建活动并点击"开始计算"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            学生增值明细下载
          </CardTitle>
          <CardDescription>
            导出所有学生的详细增值数据，包括分数、等级、增值率等完整信息
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 筛选条件 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                班级筛选
              </label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="选择班级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部班级</SelectItem>
                  {availableClasses.map((className) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                科目筛选
              </label>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择科目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部科目</SelectItem>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 数据统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">总数据量</div>
                <div className="text-2xl font-bold">{data.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">筛选后数据</div>
                <div className="text-2xl font-bold text-blue-600">
                  {filteredData.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">导出状态</div>
                <div className="mt-1">
                  {filteredData.length > 0 ? (
                    <Badge variant="default">就绪</Badge>
                  ) : (
                    <Badge variant="secondary">无数据</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 导出按钮 */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              onClick={handleExport}
              disabled={filteredData.length === 0}
              className="min-w-[200px]"
            >
              <Download className="h-5 w-5 mr-2" />
              下载 Excel 文件 ({filteredData.length} 条记录)
            </Button>
          </div>

          {/* 说明信息 */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
            <CardContent className="p-4">
              <div className="text-sm space-y-2">
                <p className="font-semibold">导出内容说明：</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>基础信息</strong>：学号、姓名、班级、科目
                  </li>
                  <li>
                    <strong>分数数据</strong>：入口分、出口分、Z分数、标准分
                  </li>
                  <li>
                    <strong>增值指标</strong>：分数增值、增值率
                  </li>
                  <li>
                    <strong>能力数据</strong>：入口等级、出口等级、等级变化
                  </li>
                  <li>
                    <strong>排名信息</strong>：班级排名、年级排名（如有）
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
