/**
 * 标准化错误处理演示组件
 * 展示如何使用新的统一错误处理机制
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from "lucide-react";
import {
  useStandardizedApi,
  useStandardizedListApi,
  useStandardizedFormApi,
  useStandardizedDeleteApi,
} from "@/hooks/useStandardizedApi";
import {
  getWarningRulesStandardized,
  createWarningRuleStandardized,
  updateWarningRuleStandardized,
  deleteWarningRuleStandardized,
  getWarningStatisticsStandardized,
} from "@/services/standardizedWarningService";
import { toast } from "sonner";

export function StandardizedWarningDemo() {
  const [newRuleName, setNewRuleName] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState("");

  // 使用标准化列表API Hook
  const rulesApi = useStandardizedListApi(getWarningRulesStandardized, {
    initialLoad: true,
    showSuccessToast: false, // 列表加载成功不需要提示
    successMessage: "规则列表已刷新",
  });

  // 使用标准化统计API Hook
  const statsApi = useStandardizedApi(getWarningStatisticsStandardized, {
    showSuccessToast: false,
    errorMessage: "获取统计数据失败",
  });

  // 使用标准化表单API Hook
  const createRuleApi = useStandardizedFormApi(createWarningRuleStandardized, {
    successMessage: "规则创建成功",
    errorMessage: "规则创建失败",
    onSuccess: () => {
      setNewRuleName("");
      rulesApi.refetch();
    },
  });

  // 使用标准化删除API Hook
  const deleteRuleApi = useStandardizedDeleteApi(
    deleteWarningRuleStandardized,
    {
      confirmMessage: "确定要删除这个规则吗？",
      successMessage: "规则删除成功",
      errorMessage: "规则删除失败",
      onSuccess: () => {
        rulesApi.refetch();
      },
    }
  );

  const handleCreateRule = () => {
    if (!newRuleName.trim()) {
      toast.error("请输入规则名称");
      return;
    }

    createRuleApi.execute({
      name: newRuleName.trim(),
      description: "新创建的预警规则",
      conditions: { type: "basic" },
      severity: "medium",
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>标准化API演示</CardTitle>
          <CardDescription>
            展示统一的错误处理、加载状态和成功反馈机制
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 统计数据演示 */}
          <div>
            <Label className="text-sm font-medium">统计数据加载</Label>
            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => statsApi.execute()}
                disabled={statsApi.isLoading}
              >
                {statsApi.isLoading ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    加载中...
                  </>
                ) : (
                  <>
                    <RefreshCwIcon className="mr-2 h-4 w-4" />
                    获取统计
                  </>
                )}
              </Button>

              {statsApi.data && (
                <Badge variant="secondary">
                  <CheckCircleIcon className="mr-1 h-3 w-3" />
                  数据已加载
                </Badge>
              )}

              {statsApi.error && (
                <Badge variant="destructive">
                  <XCircleIcon className="mr-1 h-3 w-3" />
                  加载失败
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* 规则列表演示 */}
          <div>
            <Label className="text-sm font-medium">规则列表管理</Label>
            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => rulesApi.refetch()}
                disabled={rulesApi.isLoading}
              >
                {rulesApi.isLoading ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    刷新中...
                  </>
                ) : (
                  <>
                    <RefreshCwIcon className="mr-2 h-4 w-4" />
                    刷新列表
                  </>
                )}
              </Button>

              {rulesApi.data && (
                <Badge variant="secondary">
                  共 {rulesApi.data.length} 条规则
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* 创建规则演示 */}
          <div>
            <Label className="text-sm font-medium">创建新规则</Label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                placeholder="输入规则名称"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                className="max-w-xs"
              />
              <Button
                size="sm"
                onClick={handleCreateRule}
                disabled={createRuleApi.isLoading}
              >
                {createRuleApi.isLoading ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <PlayIcon className="mr-2 h-4 w-4" />
                    创建规则
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* 删除规则演示 */}
          <div>
            <Label className="text-sm font-medium">删除规则</Label>
            <div className="mt-2">
              {rulesApi.data && rulesApi.data.length > 0 ? (
                <div className="space-y-2">
                  {rulesApi.data.slice(0, 3).map((rule: any) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="text-sm">{rule.name}</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteRuleApi.execute(rule.id)}
                        disabled={deleteRuleApi.isLoading}
                      >
                        {deleteRuleApi.isLoading ? (
                          <LoaderIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无规则可删除</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误和成功状态显示 */}
      <Card>
        <CardHeader>
          <CardTitle>状态反馈</CardTitle>
          <CardDescription>显示各API的状态和错误信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 统计API状态 */}
          {statsApi.error && (
            <Alert variant="destructive">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                统计数据加载错误: {statsApi.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* 规则列表API状态 */}
          {rulesApi.error && (
            <Alert variant="destructive">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                规则列表加载错误: {rulesApi.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* 创建规则API状态 */}
          {createRuleApi.error && (
            <Alert variant="destructive">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                创建规则错误: {createRuleApi.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* 删除规则API状态 */}
          {deleteRuleApi.error && (
            <Alert variant="destructive">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                删除规则错误: {deleteRuleApi.error.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StandardizedWarningDemo;
