"use client";

/**
 * 增值活动列表组件
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ 添加导航hook
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Play,
  MoreVertical,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ValueAddedActivity,
  ActivityStatus,
} from "@/types/valueAddedTypes";
import {
  getValueAddedActivities,
  deleteActivity,
  clearActivityCache,
  executeValueAddedCalculation,
  type CalculationProgress,
} from "@/services/valueAddedActivityService";
import { CreateActivityDialog } from "./CreateActivityDialog";

export function ActivityList() {
  const navigate = useNavigate(); // ✅ 添加导航实例
  const [activities, setActivities] = useState<ValueAddedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recalculateDialogOpen, setRecalculateDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<ValueAddedActivity | null>(null);
  const [calculatingId, setCalculatingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<CalculationProgress | null>(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await getValueAddedActivities();
      setActivities(data);
    } catch (error) {
      console.error("加载活动列表失败:", error);
      toast.error("加载活动列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCalculation = async (activity: ValueAddedActivity) => {
    setCalculatingId(activity.id);
    setProgress({ step: "start", progress: 0, message: "准备开始..." });

    try {
      const result = await executeValueAddedCalculation(activity.id, (prog) =>
        setProgress(prog)
      );

      if (result.success) {
        toast.success("计算完成！");
        await loadActivities();
      } else {
        toast.error(result.error || "计算失败");
      }
    } catch (error) {
      console.error("计算失败:", error);
      toast.error("计算失败，请重试");
    } finally {
      setCalculatingId(null);
      setProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedActivity) return;

    try {
      const success = await deleteActivity(selectedActivity.id);

      if (success) {
        toast.success("活动已删除");
        await loadActivities();
      } else {
        toast.error("删除失败");
      }
    } catch (error) {
      console.error("删除活动失败:", error);
      toast.error("删除失败，请重试");
    } finally {
      setDeleteDialogOpen(false);
      setSelectedActivity(null);
    }
  };

  const handleRecalculate = async () => {
    if (!selectedActivity) return;

    setRecalculateDialogOpen(false);

    // 开始清除缓存
    toast.loading("正在清除旧数据...", { id: "recalculate" });

    try {
      const success = await clearActivityCache(selectedActivity.id);

      if (!success) {
        toast.error("清除缓存失败", { id: "recalculate" });
        return;
      }

      toast.success("旧数据已清除，开始重新计算", { id: "recalculate" });

      // 重新加载活动列表，状态应该变为pending
      await loadActivities();

      // 找到刚才的活动（现在状态是pending）
      const updatedActivity = activities.find(
        (a) => a.id === selectedActivity.id
      );
      if (updatedActivity) {
        // 自动开始计算
        await handleStartCalculation({ ...updatedActivity, status: "pending" });
      }
    } catch (error) {
      console.error("重新计算失败:", error);
      toast.error("重新计算失败，请重试", { id: "recalculate" });
    } finally {
      setSelectedActivity(null);
    }
  };

  const getStatusBadge = (status: ActivityStatus) => {
    const config = {
      pending: {
        label: "待计算",
        icon: Clock,
        variant: "secondary" as const,
        color: "text-gray-600",
      },
      analyzing: {
        label: "计算中",
        icon: Loader2,
        variant: "default" as const,
        color: "text-blue-600",
      },
      completed: {
        label: "已完成",
        icon: CheckCircle,
        variant: "default" as const,
        color: "text-green-600",
      },
      failed: {
        label: "失败",
        icon: XCircle,
        variant: "destructive" as const,
        color: "text-red-600",
      },
    };

    const { label, icon: Icon, variant, color } = config[status];

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon
          className={`h-3 w-3 ${status === "analyzing" ? "animate-spin" : ""}`}
        />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>增值活动列表</CardTitle>
            <Button onClick={() => setCreateDialogOpen(true)}>创建活动</Button>
          </div>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                还没有创建任何增值活动
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                创建第一个活动
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>活动名称</TableHead>
                  <TableHead>入口考试</TableHead>
                  <TableHead>出口考试</TableHead>
                  <TableHead>年级</TableHead>
                  <TableHead>学期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">
                      {activity.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {activity.entry_exam_title}
                    </TableCell>
                    <TableCell className="text-sm">
                      {activity.exit_exam_title}
                    </TableCell>
                    <TableCell>{activity.grade_level}</TableCell>
                    <TableCell>{activity.semester}</TableCell>
                    <TableCell>
                      {getStatusBadge(activity.status)}
                      {calculatingId === activity.id && progress && (
                        <div className="mt-2 space-y-1">
                          {/* 进度条 */}
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-300 ease-out"
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>

                          {/* 详细阶段说明 */}
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div className="font-medium">
                              {progress.message}
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span
                                className={
                                  progress.progress >= 30
                                    ? "text-green-600"
                                    : "text-gray-400"
                                }
                              >
                                {progress.progress >= 30 ? "✓" : "○"} 班级分析
                              </span>
                              <span
                                className={
                                  progress.progress >= 50
                                    ? "text-green-600"
                                    : "text-gray-400"
                                }
                              >
                                {progress.progress >= 50 ? "✓" : "○"} 教师分析
                              </span>
                              <span
                                className={
                                  progress.progress >= 70
                                    ? "text-green-600"
                                    : "text-gray-400"
                                }
                              >
                                {progress.progress >= 70 ? "✓" : "○"} 学生分析
                              </span>
                              <span
                                className={
                                  progress.progress >= 90
                                    ? "text-green-600"
                                    : "text-gray-400"
                                }
                              >
                                {progress.progress >= 90 ? "✓" : "○"} 数据保存
                              </span>
                            </div>
                            <div className="text-gray-500">
                              预计还需{" "}
                              {Math.max(
                                0,
                                Math.ceil((100 - progress.progress) / 10)
                              )}{" "}
                              分钟
                            </div>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(activity.created_at).toLocaleDateString(
                        "zh-CN"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activity.status === "pending" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStartCalculation(activity)}
                            disabled={calculatingId !== null}
                          >
                            {calculatingId === activity.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                计算中...
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                开始计算
                              </>
                            )}
                          </Button>
                        )}

                        {activity.status === "completed" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                console.log(
                                  "🔍 [ActivityList] Button clicked, navigating to:",
                                  activity.id
                                );
                                console.log(
                                  "🔍 [ActivityList] Current location:",
                                  window.location.pathname,
                                  window.location.search
                                );

                                // 强制刷新导航
                                const targetUrl = `/value-added?activity_id=${activity.id}`;

                                // 如果已经在目标URL，先清空再导航
                                if (
                                  window.location.pathname === "/value-added"
                                ) {
                                  console.log(
                                    "🔄 [ActivityList] Already on /value-added, forcing navigation"
                                  );
                                  // 先清空activity_id
                                  navigate("/value-added", { replace: true });
                                  // 然后导航到带activity_id的URL
                                  setTimeout(() => {
                                    console.log(
                                      "🔄 [ActivityList] Navigating with activity_id:",
                                      activity.id
                                    );
                                    navigate(targetUrl, { replace: false });
                                  }, 50);
                                } else {
                                  console.log(
                                    "🔄 [ActivityList] Direct navigation"
                                  );
                                  navigate(targetUrl, { replace: false });
                                }
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              查看报告
                            </Button>

                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                navigate(
                                  `/value-added/ai-analysis?activity_id=${activity.id}`
                                );
                              }}
                            >
                              <Sparkles className="h-4 w-4 mr-1" />
                              AI分析
                            </Button>
                          </>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={calculatingId === activity.id}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(activity.status === "completed" ||
                              activity.status === "failed") && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedActivity(activity);
                                  setRecalculateDialogOpen(true);
                                }}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                重新计算
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedActivity(activity);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除活动
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建活动对话框 */}
      <CreateActivityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadActivities}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除活动 "{selectedActivity?.name}" 吗？
              此操作将同时删除所有相关的计算结果，且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重新计算确认对话框 */}
      <AlertDialog
        open={recalculateDialogOpen}
        onOpenChange={setRecalculateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认重新计算</AlertDialogTitle>
            <AlertDialogDescription>
              确定要重新计算活动 "{selectedActivity?.name}" 吗？
              此操作将清除所有现有的计算结果，并重新开始计算。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecalculate}>
              确认重新计算
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
