"use client";

/**
 * 配置管理页面
 * 查看、编辑、删除导入配置
 */

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  listConfigurations,
  getConfiguration,
  updateConfiguration,
  deleteConfiguration,
  getConfigurationDataStatus,
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

  useEffect(() => {
    loadConfigurations();
  }, []);

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
    setSelectedConfig(config as any);
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

  if (loading) {
    return <div className="p-6">加载中...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">配置管理</h1>
        <Badge variant="outline">{configurations.length} 个配置</Badge>
      </div>

      {configurations.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            暂无配置，请在导入数据时创建新配置
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configurations.map((config) => (
            <Card
              key={config.id}
              className={!config.is_active ? "opacity-60" : ""}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{config.name}</CardTitle>
                  <Badge variant={config.is_active ? "default" : "secondary"}>
                    {config.is_active ? "活跃" : "已停用"}
                  </Badge>
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
                        {dataStatuses.get(config.id)?.teachingArrangement ? (
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
                    创建于 {new Date(config.created_at).toLocaleDateString()}
                  </div>
                  {config.last_used_at && (
                    <div>
                      最后使用{" "}
                      {new Date(config.last_used_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetail(config.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(config)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(config)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(config)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
    </div>
  );
}
