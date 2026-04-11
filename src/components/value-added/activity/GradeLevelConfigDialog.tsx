/**
 * 高中9段等级配置对话框
 *
 * 用途：
 * - 当用户创建增值活动并选择高中学段时，弹出此对话框配置9段评价比例
 * - 默认提供深圳市标准九段评价比例（基于Stanine正态分布）
 * - 支持用户自定义每个段位的比例
 *
 * 九段评价标准（基于Stanine）：
 * 1段（顶尖生）: 5%  | 2段（尖子生）: 10% | 3段（优秀生）: 10%
 * 4段（良好生）: 15% | 5段（中等生）: 20% | 6段（中下生）: 15%
 * 7段（后进生）: 10% | 8段（学困生）: 10% | 9段（特困生）: 5%
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertCircle, Info, RotateCcw, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface GradeLevelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: GradeLevelConfig) => void;
  initialConfig?: GradeLevelConfig;
}

export interface GradeLevelConfig {
  configName: string;
  description: string;
  segments: GradeSegment[];
}

export interface GradeSegment {
  segment: number; // 1-9
  label: string; // 例如"顶尖生"
  percentage: number; // 比例（0-100）
}

// 默认九段评价配置（基于Stanine正态分布）
const DEFAULT_CONFIG: GradeLevelConfig = {
  configName: "深圳市标准九段评价",
  description: "基于Stanine正态分布的9级评分系统，中间段最宽，两端最窄",
  segments: [
    { segment: 1, label: "顶尖生", percentage: 5 },
    { segment: 2, label: "尖子生", percentage: 10 },
    { segment: 3, label: "优秀生", percentage: 10 },
    { segment: 4, label: "良好生", percentage: 15 },
    { segment: 5, label: "中等生", percentage: 20 },
    { segment: 6, label: "中下生", percentage: 15 },
    { segment: 7, label: "后进生", percentage: 10 },
    { segment: 8, label: "学困生", percentage: 10 },
    { segment: 9, label: "特困生", percentage: 5 },
  ],
};

// 深圳市教科院 Z 分数标准九段评价（绝对 Z 分数阈值）
// Z≥1.75→1段, 1.25≤Z<1.75→2段, 0.75≤Z<1.25→3段,
// 0.25≤Z<0.75→4段, -0.25≤Z<0.25→5段, -0.75≤Z<-0.25→6段,
// -1.25≤Z<-0.75→7段, -1.75≤Z<-1.25→8段, Z<-1.75→9段
// 对应正态分布比例约为：4%-7%-12%-17%-20%-17%-12%-7%-4%
const SHENZHEN_ZSCORE_CONFIG: GradeLevelConfig = {
  configName: "深圳市教科院 Z 分数标准",
  description:
    "基于绝对 Z 分数阈值（±0.5 间隔），与深圳市教科院增值评价模型配套使用",
  segments: [
    { segment: 1, label: "顶尖生", percentage: 4 },
    { segment: 2, label: "尖子生", percentage: 7 },
    { segment: 3, label: "优秀生", percentage: 12 },
    { segment: 4, label: "良好生", percentage: 17 },
    { segment: 5, label: "中等生", percentage: 20 },
    { segment: 6, label: "中下生", percentage: 17 },
    { segment: 7, label: "后进生", percentage: 12 },
    { segment: 8, label: "学困生", percentage: 7 },
    { segment: 9, label: "特困生", percentage: 4 },
  ],
};

export function GradeLevelConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  initialConfig,
}: GradeLevelConfigDialogProps) {
  const [config, setConfig] = useState<GradeLevelConfig>(
    initialConfig || DEFAULT_CONFIG
  );
  const [totalPercentage, setTotalPercentage] = useState(100);

  // 当 initialConfig prop 变化时同步内部状态（例如编辑已有配置时）
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  useEffect(() => {
    const total = config.segments.reduce((sum, seg) => sum + seg.percentage, 0);
    setTotalPercentage(total);
  }, [config.segments]);

  const handlePercentageChange = (segment: number, value: string) => {
    const numValue = parseFloat(value) || 0;

    setConfig((prev) => ({
      ...prev,
      segments: prev.segments.map((seg) =>
        seg.segment === segment
          ? { ...seg, percentage: Math.max(0, Math.min(100, numValue)) }
          : seg
      ),
    }));
  };

  const handleLabelChange = (segment: number, value: string) => {
    setConfig((prev) => ({
      ...prev,
      segments: prev.segments.map((seg) =>
        seg.segment === segment ? { ...seg, label: value } : seg
      ),
    }));
  };

  const handleResetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    toast.success("已重置为默认九段评价配置");
  };

  const handleConfirm = () => {
    // 验证总和是否为100%
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error(`比例总和必须为100%，当前为${totalPercentage.toFixed(1)}%`);
      return;
    }

    // 验证每个段位的比例是否合理
    const invalidSegments = config.segments.filter(
      (seg) => seg.percentage <= 0
    );
    if (invalidSegments.length > 0) {
      toast.error("每个段位的比例必须大于0%");
      return;
    }

    onConfirm(config);
    toast.success("九段评价配置已保存");
  };

  const getTotalColor = () => {
    if (Math.abs(totalPercentage - 100) < 0.01) {
      return "text-green-600";
    } else {
      return "text-red-600";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            高中九段评价配置
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  加载预设
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setConfig(DEFAULT_CONFIG);
                    toast.success("已加载：Stanine 百分位标准");
                  }}
                >
                  Stanine 百分位标准（5-10-10-15-20-15-10-10-5）
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setConfig(SHENZHEN_ZSCORE_CONFIG);
                    toast.success("已加载：深圳市教科院 Z 分数标准");
                  }}
                >
                  深圳市教科院 Z 分数标准（4-7-12-17-20-17-12-7-4）
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </DialogTitle>
          <DialogDescription>
            为高中学段配置9个层级的评价标准，用于学生能力分层和增值分析
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 配置说明 */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>九段评价</strong>
                  ：基于Stanine（标准九）正态分布，将学生分为9个等级
                </p>
                <p>
                  <strong>默认比例</strong>
                  ：5%-10%-10%-15%-20%-15%-10%-10%-5%（中间段最宽，两端最窄）
                </p>
                <p>
                  <strong>自定义</strong>
                  ：可根据学校实际情况调整比例，但总和必须为100%
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* 配置基本信息 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="configName">配置名称</Label>
              <Input
                id="configName"
                value={config.configName}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, configName: e.target.value }))
                }
                placeholder="例如：深圳市标准九段评价"
              />
            </div>

            <div>
              <Label htmlFor="description">配置说明</Label>
              <Input
                id="description"
                value={config.description}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="简要描述此配置的用途和特点"
              />
            </div>
          </div>

          {/* 段位配置表格 */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center justify-between">
              <span>段位比例配置</span>
              <span className={`text-sm ${getTotalColor()}`}>
                总和：{totalPercentage.toFixed(1)}%
                {Math.abs(totalPercentage - 100) < 0.01 ? " ✓" : " ✗"}
              </span>
            </h4>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">段位</th>
                    <th className="px-4 py-2 text-left font-semibold">
                      学生类型
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      比例（%）
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      百分位范围
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      人数（400人）
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {config.segments.map((seg, index) => {
                    // 计算累计百分位
                    const cumulative = config.segments
                      .slice(0, index)
                      .reduce((sum, s) => sum + s.percentage, 0);
                    const percentileStart = cumulative;
                    const percentileEnd = cumulative + seg.percentage;
                    const studentCount = Math.round(
                      (seg.percentage / 100) * 400
                    );

                    return (
                      <tr
                        key={seg.segment}
                        className="border-t hover:bg-muted/50"
                      >
                        <td className="px-4 py-2">
                          <span className="font-bold text-primary">
                            {seg.segment}段
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={seg.label}
                            onChange={(e) =>
                              handleLabelChange(seg.segment, e.target.value)
                            }
                            className="h-8 text-sm"
                            placeholder="学生类型"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={seg.percentage}
                            onChange={(e) =>
                              handlePercentageChange(
                                seg.segment,
                                e.target.value
                              )
                            }
                            className="h-8 w-20 text-sm"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">
                          {percentileStart.toFixed(1)}% -{" "}
                          {percentileEnd.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">
                          {studentCount}人
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 警告信息 */}
          {Math.abs(totalPercentage - 100) > 0.01 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                比例总和必须为100%，当前为{totalPercentage.toFixed(1)}
                %。请调整各段位的比例。
              </AlertDescription>
            </Alert>
          )}

          {/* 使用说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
            <h5 className="font-semibold text-blue-900">使用说明</h5>
            <ul className="space-y-1 text-blue-800 ml-4">
              <li>
                • <strong>1段</strong>：排名前5%，为顶尖学生，适合竞赛培优
              </li>
              <li>
                • <strong>2-3段</strong>
                ：前5%-25%，尖子生/优秀生，985/211重点培养
              </li>
              <li>
                • <strong>4-6段</strong>：中间40%，主体学生群体，整体推进
              </li>
              <li>
                • <strong>7-9段</strong>：后30%，后进生/学困生，托底转化
              </li>
              <li>• 配置保存后，增值计算会按照此比例进行能力分层分析</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={Math.abs(totalPercentage - 100) > 0.01}
          >
            确认配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
