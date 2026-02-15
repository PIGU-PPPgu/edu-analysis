"use client";

/**
 * 配置管理页面
 * 查看、编辑、删除导入配置
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Settings,
  Trash2,
  Edit,
  Eye,
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Copy,
  Download,
  Upload,
  BarChart3,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import {
  listConfigurations,
  getConfiguration,
  updateConfiguration,
  deleteConfiguration,
  getConfigurationDataStatus,
  copyConfiguration,
  batchUpdateConfigurations,
  batchDeleteConfigurations,
  exportConfiguration,
  exportConfigurations,
  importConfiguration,
  getConfigurationUsageStats,
} from "@/services/configurationService";
import type {
  ImportConfiguration,
  ConfigurationDetail,
} from "@/types/valueAddedTypes";

// 数据状态类型
interface DataStatus {
  studentInfo: boolean;
  teachingArrangement: boolean;
  electiveCourse: boolean;
  gradeScores: boolean;
}

// 使用统计类型
interface UsageStats {
  usage_count: number;
  last_usage_date?: string;
  exams_count: number;
}

export function ConfigurationManager() {
  const [configurations, setConfigurations] = useState<ImportConfiguration[]>(
    []
  );
  const [dataStatuses, setDataStatuses] = useState<Map<string, DataStatus>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] =
    useState<ConfigurationDetail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);

  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Phase 2: 批量操作状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchToolbar, setShowBatchToolbar] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyingConfigId, setCopyingConfigId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [usageStatsMap, setUsageStatsMap] = useState<Map<string, UsageStats>>(
    new Map()
  );

  useEffect(() => {
    loadConfigurations();
  }, []);

  // 过滤和分页逻辑
  const filteredConfigurations = useMemo(() => {
    return configurations.filter((config) => {
      const matchSearch =
        config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.academic_year
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        config.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? config.is_active : !config.is_active);

      return matchSearch && matchStatus;
    });
  }, [configurations, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredConfigurations.length / itemsPerPage);
  const paginatedConfigurations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredConfigurations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredConfigurations, currentPage, itemsPerPage]);

  // 重置页码当筛选条件变化
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const configs = await listConfigurations({
        activeOnly: false,
        orderBy: "created_at",
      });
      setConfigurations(configs);

      // 并行加载所有配置的数据状态
      const statusPromises = configs.map((config) =>
        getConfigurationDataStatus(config.id)
      );
      const statuses = await Promise.all(statusPromises);

      const statusMap = new Map<string, DataStatus>();
      configs.forEach((config, index) => {
        statusMap.set(config.id, statuses[index]);
      });
      setDataStatuses(statusMap);
    } catch (error) {
      console.error("加载配置失败:", error);
      toast.error("加载配置失败");
    } finally {
      setLoading(false);
    }
  };

  // 查看详情
  const handleViewDetail = async (id: string) => {
    try {
      const detail = await getConfiguration(id);
      if (detail) {
        setSelectedConfig(detail);
        setShowDetailDialog(true);
      }
    } catch (error) {
      console.error("获取配置详情失败:", error);
      toast.error("获取配置详情失败");
    }
  };

  // 编辑配置
  const handleEdit = (config: ImportConfiguration) => {
    setEditingConfig({
      id: config.id,
      name: config.name,
      description: config.description || "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingConfig) return;

    try {
      const success = await updateConfiguration(editingConfig.id, {
        name: editingConfig.name,
        description: editingConfig.description,
      });

      if (success) {
        toast.success("配置更新成功");
        setShowEditDialog(false);
        loadConfigurations();
      } else {
        toast.error("配置更新失败");
      }
    } catch (error) {
      console.error("更新配置失败:", error);
      toast.error("更新配置失败");
    }
  };

  // 删除配置
  const handleDelete = (config: ImportConfiguration) => {
    setSelectedConfig(config as ConfigurationDetail);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedConfig) return;

    try {
      const result = await deleteConfiguration(selectedConfig.id, {
        cascade: true,
      });

      if (result.success) {
        toast.success("配置删除成功");
        setShowDeleteDialog(false);
        loadConfigurations();
      } else {
        toast.error(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除配置失败:", error);
      toast.error("删除配置失败");
    }
  };

  // 切换激活状态
  const handleToggleActive = async (config: ImportConfiguration) => {
    try {
      const success = await updateConfiguration(config.id, {
        is_active: !config.is_active,
      });

      if (success) {
        toast.success(config.is_active ? "配置已停用" : "配置已激活");
        loadConfigurations();
      } else {
        toast.error("操作失败");
      }
    } catch (error) {
      console.error("切换激活状态失败:", error);
      toast.error("操作失败");
    }
  };

  // Phase 2: 批量选择
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedConfigurations.length) {
      setSelectedIds(new Set());
      setShowBatchToolbar(false);
    } else {
      setSelectedIds(new Set(paginatedConfigurations.map((c) => c.id)));
      setShowBatchToolbar(true);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setShowBatchToolbar(newSelected.size > 0);
  };

  // Phase 2: 复制配置
  const handleCopy = (id: string) => {
    setCopyingConfigId(id);
    setShowCopyDialog(true);
  };

  const handleConfirmCopy = async () => {
    if (!copyingConfigId) return;

    try {
      toast.info("正在复制配置...");
      const result = await copyConfiguration(copyingConfigId);

      if (result.success) {
        toast.success(
          `配置复制成功！复制了 ${result.students_created} 名学生，${result.teachers_created} 名教师`
        );
        setShowCopyDialog(false);
        loadConfigurations();
      } else {
        toast.error(result.errors?.[0] || "复制失败");
      }
    } catch (error) {
      console.error("复制配置失败:", error);
      toast.error("复制配置失败");
    }
  };

  // Phase 2: 批量激活/停用
  const handleBatchToggleActive = async (activate: boolean) => {
    try {
      toast.info(`正在批量${activate ? "激活" : "停用"}...`);
      const result = await batchUpdateConfigurations(Array.from(selectedIds), {
        is_active: activate,
      });

      toast.success(`成功 ${result.success} 个，失败 ${result.failed} 个`);
      setSelectedIds(new Set());
      setShowBatchToolbar(false);
      loadConfigurations();
    } catch (error) {
      console.error("批量操作失败:", error);
      toast.error("批量操作失败");
    }
  };

  // Phase 2: 批量删除
  const handleBatchDelete = async () => {
    if (
      !confirm(
        `确定要删除选中的 ${selectedIds.size} 个配置吗？这将同时删除关联的所有数据。`
      )
    ) {
      return;
    }

    try {
      toast.info("正在批量删除...");
      const result = await batchDeleteConfigurations(
        Array.from(selectedIds),
        true
      );

      toast.success(`成功删除 ${result.success} 个，失败 ${result.failed} 个`);
      if (result.errors.length > 0) {
        console.error("删除错误:", result.errors);
      }
      setSelectedIds(new Set());
      setShowBatchToolbar(false);
      loadConfigurations();
    } catch (error) {
      console.error("批量删除失败:", error);
      toast.error("批量删除失败");
    }
  };

  // Phase 2: 单个导出
  const handleExport = async (id: string) => {
    try {
      toast.info("正在导出配置...");
      const result = await exportConfiguration(id);

      if (result.success && result.data) {
        const config = configurations.find((c) => c.id === id);
        const fileName = `config_${config?.name || "unnamed"}_${new Date().toISOString().split("T")[0]}.json`;
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: "application/json",
        });
        saveAs(blob, fileName);
        toast.success("配置导出成功");
      } else {
        toast.error(result.error || "导出失败");
      }
    } catch (error) {
      console.error("导出配置失败:", error);
      toast.error("导出配置失败");
    }
  };

  // Phase 2: 批量导出
  const handleBatchExport = async () => {
    try {
      toast.info("正在批量导出配置...");
      const result = await exportConfigurations(Array.from(selectedIds));

      if (result.success && result.data) {
        const fileName = `configs_batch_${new Date().toISOString().split("T")[0]}.json`;
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: "application/json",
        });
        saveAs(blob, fileName);
        toast.success(`成功导出 ${result.data.length} 个配置`);
      } else {
        toast.error(result.error || "批量导出失败");
      }
    } catch (error) {
      console.error("批量导出失败:", error);
      toast.error("批量导出失败");
    }
  };

  // Phase 2: 导入配置
  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;

    try {
      toast.info("正在导入配置...");
      const text = await importFile.text();
      const data = JSON.parse(text);

      const result = await importConfiguration(data, "rename");

      if (result.success) {
        toast.success(
          `配置导入成功！导入了 ${result.students_created} 名学生，${result.teachers_created} 名教师`
        );
        setShowImportDialog(false);
        setImportFile(null);
        loadConfigurations();
      } else {
        toast.error(result.errors?.[0] || "导入失败");
      }
    } catch (error) {
      console.error("导入配置失败:", error);
      toast.error(error instanceof Error ? error.message : "导入配置失败");
    }
  };

  // Phase 2: 加载使用统计
  useEffect(() => {
    const loadUsageStats = async () => {
      const statsPromises = configurations.map((config) =>
        getConfigurationUsageStats(config.id)
      );
      const stats = await Promise.all(statsPromises);

      const statsMap = new Map<string, UsageStats>();
      configurations.forEach((config, index) => {
        statsMap.set(config.id, stats[index]);
      });
      setUsageStatsMap(statsMap);
    };

    if (configurations.length > 0) {
      loadUsageStats();
    }
  }, [configurations]);

  if (loading) {
    return <div className="p-6">加载中...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">配置管理</h1>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {filteredConfigurations.length} / {configurations.length} 个配置
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            导入配置
          </Button>
        </div>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索配置名称、学年或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value: any) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">仅活跃</SelectItem>
              <SelectItem value="inactive">仅停用</SelectItem>
            </SelectContent>
          </Select>
          {paginatedConfigurations.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {selectedIds.size === paginatedConfigurations.length ? (
                <CheckSquare className="h-4 w-4 mr-2" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              全选
            </Button>
          )}
        </div>
      </div>

      {/* 批量操作工具栏 */}
      {showBatchToolbar && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center gap-4 z-50">
          <span className="font-medium">已选择 {selectedIds.size} 个配置</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBatchToggleActive(true)}
            >
              批量激活
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleBatchToggleActive(false)}
            >
              批量停用
            </Button>
            <Button variant="secondary" size="sm" onClick={handleBatchExport}>
              <Download className="h-4 w-4 mr-1" />
              批量导出
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
              批量删除
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedIds(new Set());
              setShowBatchToolbar(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {filteredConfigurations.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {configurations.length === 0
              ? "暂无配置，请在导入数据时创建新配置"
              : "未找到匹配的配置，请调整搜索条件"}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedConfigurations.map((config) => {
              const stats = usageStatsMap.get(config.id);
              const isIdle = stats?.last_usage_date
                ? (new Date().getTime() -
                    new Date(stats.last_usage_date).getTime()) /
                    (1000 * 60 * 60 * 24) >
                  30
                : false;

              return (
                <Card
                  key={config.id}
                  className={
                    !config.is_active
                      ? "opacity-60 border-red-200 bg-red-50/30"
                      : selectedIds.has(config.id)
                        ? "border-primary ring-2 ring-primary/20"
                        : ""
                  }
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleSelect(config.id)}
                        >
                          {selectedIds.has(config.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                        <CardTitle className="text-lg">{config.name}</CardTitle>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge
                          variant={config.is_active ? "default" : "destructive"}
                        >
                          {config.is_active ? "活跃" : "已停用"}
                        </Badge>
                        {stats && stats.exams_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            {stats.exams_count} 次使用
                          </Badge>
                        )}
                        {isIdle && (
                          <Badge variant="outline" className="text-xs">
                            30天未用
                          </Badge>
                        )}
                      </div>
                    </div>
                    {config.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {config.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 统计信息 */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{config.student_count} 名学生</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span>{config.class_count} 个班级</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{config.teacher_count} 名教师</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{config.subject_count} 个科目</span>
                      </div>
                    </div>

                    {/* 数据导入状态 */}
                    {dataStatuses.has(config.id) && (
                      <div className="pt-3 border-t">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          数据导入状态
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Badge
                            variant={
                              dataStatuses.get(config.id)?.studentInfo
                                ? "default"
                                : "outline"
                            }
                            className="justify-center"
                          >
                            {dataStatuses.get(config.id)?.studentInfo ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            )}
                            学生信息
                          </Badge>
                          <Badge
                            variant={
                              dataStatuses.get(config.id)?.teachingArrangement
                                ? "default"
                                : "outline"
                            }
                            className="justify-center"
                          >
                            {dataStatuses.get(config.id)
                              ?.teachingArrangement ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            )}
                            教学编排
                          </Badge>
                          <Badge
                            variant={
                              dataStatuses.get(config.id)?.gradeScores
                                ? "default"
                                : "outline"
                            }
                            className="justify-center"
                          >
                            {dataStatuses.get(config.id)?.gradeScores ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            )}
                            各科成绩
                          </Badge>
                          <Badge
                            variant={
                              dataStatuses.get(config.id)?.electiveCourse
                                ? "default"
                                : "outline"
                            }
                            className="justify-center"
                          >
                            {dataStatuses.get(config.id)?.electiveCourse ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <AlertCircle className="h-3 w-3 mr-1" />
                            )}
                            走班信息
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* 时间信息 */}
                    <div className="text-xs text-muted-foreground space-y-1">
                      {config.academic_year && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {config.academic_year} {config.semester}
                        </div>
                      )}
                      <div>
                        创建于{" "}
                        {new Date(config.created_at).toLocaleDateString()}
                      </div>
                      {config.last_used_at && (
                        <div>
                          最后使用{" "}
                          {new Date(config.last_used_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <TooltipProvider>
                      <div className="flex gap-2 pt-2 flex-wrap">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(config.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              查看
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>查看配置详情</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(config)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              编辑
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>编辑配置名称和描述</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(config.id)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              复制
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>复制配置</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExport(config.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              导出
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>导出配置为JSON</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={config.is_active ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleToggleActive(config)}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              {config.is_active ? "停用" : "启用"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {config.is_active ? "停用此配置" : "启用此配置"}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(config)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除此配置及关联数据</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 分页组件 */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => {
                      // 只显示当前页前后2页
                      if (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <span className="px-4">...</span>
                          </PaginationItem>
                        );
                      }
                      return null;
                    }
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedConfig?.name}</DialogTitle>
          </DialogHeader>
          {selectedConfig && (
            <div className="space-y-4">
              {/* 统计摘要 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {selectedConfig.student_count}
                  </div>
                  <div className="text-sm text-muted-foreground">学生</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {selectedConfig.class_count}
                  </div>
                  <div className="text-sm text-muted-foreground">班级</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {selectedConfig.teacher_count}
                  </div>
                  <div className="text-sm text-muted-foreground">教师</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {selectedConfig.subject_count}
                  </div>
                  <div className="text-sm text-muted-foreground">科目</div>
                </div>
              </div>

              {/* 班级列表 */}
              {selectedConfig.classes && selectedConfig.classes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">班级列表</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedConfig.classes.map((cls, index) => (
                      <div
                        key={index}
                        className="border rounded p-2 text-sm flex justify-between"
                      >
                        <span>{cls.class_name}</span>
                        <Badge variant="outline">{cls.student_count}人</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 教师列表 */}
              {selectedConfig.teachers &&
                selectedConfig.teachers.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">教师列表</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedConfig.teachers.map((teacher, index) => (
                        <div key={index} className="border rounded p-2 text-sm">
                          <div className="font-medium">
                            {teacher.teacher_name}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {teacher.subjects.join("、")}
                          </div>
                          {teacher.email && (
                            <div className="text-muted-foreground text-xs mt-1">
                              {teacher.email}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* 科目列表 */}
              {selectedConfig.subjects &&
                selectedConfig.subjects.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">科目列表</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedConfig.subjects.map((subject, index) => (
                        <Badge key={index} variant="secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑配置</DialogTitle>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">配置名称</Label>
                <Input
                  id="edit-name"
                  value={editingConfig.name}
                  onChange={(e) =>
                    setEditingConfig({ ...editingConfig, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-description">描述</Label>
                <Input
                  id="edit-description"
                  value={editingConfig.description}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      description: e.target.value,
                    })
                  }
                  placeholder="可选"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除配置"{selectedConfig?.name}
              "吗？此操作将同时删除关联的所有学生、教师和成绩数据，且无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 复制配置对话框 */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>复制配置</DialogTitle>
            <DialogDescription>
              将创建配置的完整副本，包括学生信息和教学编排。
              新配置将自动命名为"原名称 副本"，且默认为未激活状态。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmCopy}>确认复制</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入配置对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入配置</DialogTitle>
            <DialogDescription>
              选择一个JSON配置文件进行导入。如果配置名称重复，将自动重命名。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-file">选择文件</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleImportFile}
              />
            </div>
            {importFile && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  已选择文件: {importFile.name}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleConfirmImport} disabled={!importFile}>
              导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
