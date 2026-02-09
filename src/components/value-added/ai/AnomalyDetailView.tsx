"use client";

/**
 * 异常检测详细视图
 * 显示：人名/班级/异常学科/异常原因，支持班级筛选
 */

import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Search, Filter, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AnomalyDetail {
  id: string;
  name: string; // 人名/班级名
  className?: string; // 班级（如果是学生）
  subject: string; // 异常科目
  reason: string; // 异常原因
  severity: "high" | "medium" | "low";
  value: number; // 具体数值
  standardDeviation?: number; // 偏离标准差
  type: "student" | "teacher" | "class"; // 实体类型
}

interface AnomalyDetailViewProps {
  /** 异常数据 */
  anomalies: AnomalyDetail[];
  /** 是否加载中 */
  loading?: boolean;
  /** 隐藏内部筛选器（当外部已有筛选时使用） */
  hideFilters?: boolean;
}

export function AnomalyDetailView({
  anomalies,
  loading = false,
  hideFilters = false,
}: AnomalyDetailViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  // 获取所有班级、科目、严重程度选项
  const { classes, subjects, severities } = useMemo(() => {
    const classSet = new Set<string>();
    const subjectSet = new Set<string>();
    const severitySet = new Set<string>();

    anomalies.forEach((anomaly) => {
      if (anomaly.className) classSet.add(anomaly.className);
      subjectSet.add(anomaly.subject);
      severitySet.add(anomaly.severity);
    });

    return {
      classes: Array.from(classSet).sort(),
      subjects: Array.from(subjectSet).sort(),
      severities: Array.from(severitySet),
    };
  }, [anomalies]);

  // 筛选后的数据
  const filteredAnomalies = useMemo(() => {
    // 如果隐藏了筛选器，直接返回所有数据（外部已筛选）
    if (hideFilters) {
      return anomalies;
    }

    return anomalies.filter((anomaly) => {
      // 搜索过滤
      if (
        searchTerm &&
        !anomaly.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // 班级过滤
      if (selectedClass !== "all" && anomaly.className !== selectedClass) {
        return false;
      }

      // 科目过滤
      if (selectedSubject !== "all" && anomaly.subject !== selectedSubject) {
        return false;
      }

      // 严重程度过滤
      if (selectedSeverity !== "all" && anomaly.severity !== selectedSeverity) {
        return false;
      }

      return true;
    });
  }, [
    anomalies,
    searchTerm,
    selectedClass,
    selectedSubject,
    selectedSeverity,
    hideFilters,
  ]);

  // 严重程度徽章颜色
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            严重
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="default"
            className="bg-orange-500 flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            中等
          </Badge>
        );
      case "low":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            轻微
          </Badge>
        );
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  // 实体类型徽章
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "student":
        return <Badge variant="outline">学生</Badge>;
      case "teacher":
        return <Badge variant="outline">教师</Badge>;
      case "class":
        return <Badge variant="outline">班级</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
            <p>正在分析异常数据...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mb-4 text-gray-400" />
            <p className="text-lg font-medium">未检测到异常</p>
            <p className="text-sm mt-2">所有数据均在正常范围内</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 筛选控件 - 仅在未隐藏时显示 */}
      {!hideFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              筛选条件
            </CardTitle>
            <CardDescription>
              共检测到 {anomalies.length} 个异常，当前显示{" "}
              {filteredAnomalies.length} 个
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* 班级筛选 */}
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="选择班级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部班级</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 科目筛选 */}
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择科目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部科目</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 严重程度筛选 */}
              <Select
                value={selectedSeverity}
                onValueChange={setSelectedSeverity}
              >
                <SelectTrigger>
                  <SelectValue placeholder="严重程度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部程度</SelectItem>
                  <SelectItem value="high">严重</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="low">轻微</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 重置按钮 */}
            {(searchTerm ||
              selectedClass !== "all" ||
              selectedSubject !== "all" ||
              selectedSeverity !== "all") && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedClass("all");
                    setSelectedSubject("all");
                    setSelectedSeverity("all");
                  }}
                >
                  重置筛选
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 异常列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            异常详情
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAnomalies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>无匹配的异常记录</p>
              <p className="text-sm mt-2">请尝试调整筛选条件</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>姓名/班级</TableHead>
                    <TableHead>班级</TableHead>
                    <TableHead>科目</TableHead>
                    <TableHead>异常原因</TableHead>
                    <TableHead>数值</TableHead>
                    <TableHead>偏离程度</TableHead>
                    <TableHead>严重程度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnomalies.map((anomaly) => (
                    <TableRow key={anomaly.id}>
                      <TableCell>{getTypeBadge(anomaly.type)}</TableCell>
                      <TableCell className="font-medium">
                        {anomaly.name}
                      </TableCell>
                      <TableCell>
                        {anomaly.className || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{anomaly.subject}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-sm text-muted-foreground">
                          {anomaly.reason}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            anomaly.value < 0
                              ? "text-red-600 font-medium"
                              : "text-foreground"
                          }
                        >
                          {anomaly.value.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {anomaly.standardDeviation !== undefined ? (
                          <span className="text-sm text-muted-foreground">
                            {anomaly.standardDeviation > 0 ? "+" : ""}
                            {anomaly.standardDeviation.toFixed(2)}σ
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(anomaly.severity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 统计摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              严重异常
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredAnomalies.filter((a) => a.severity === "high").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              中等异常
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredAnomalies.filter((a) => a.severity === "medium").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              轻微异常
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {filteredAnomalies.filter((a) => a.severity === "low").length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
