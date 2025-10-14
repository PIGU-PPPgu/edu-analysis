/**
 * ResumePrompt - 断点续传恢复提示组件
 *
 * 检测到可恢复任务时显示提示,引导用户继续导入
 */

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, XCircle, AlertCircle } from "lucide-react";

interface ResumePromptProps {
  /** 是否显示提示 */
  show: boolean;

  /** 恢复信息 */
  resumeInfo: {
    batchIndex: number;
    processed: number;
    successful: number;
    failed: number;
  };

  /** 任务总数 */
  totalRecords: number;

  /** 点击继续按钮 */
  onResume: () => void;

  /** 点击取消按钮(重新开始) */
  onDiscard: () => void;
}

export const ResumePrompt: React.FC<ResumePromptProps> = ({
  show,
  resumeInfo,
  totalRecords,
  onResume,
  onDiscard,
}) => {
  if (!show) return null;

  const remainingCount = totalRecords - resumeInfo.processed;
  const progressPercentage = (
    (resumeInfo.processed / totalRecords) *
    100
  ).toFixed(1);

  return (
    <Alert className="mb-4 border-blue-500 bg-blue-50">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900 font-semibold">
        检测到未完成的导入任务
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2 text-sm text-blue-800">
          <p>
            上次导入中断时已处理{" "}
            <span className="font-semibold">{resumeInfo.processed}</span> 条记录
            (共 {totalRecords} 条, 完成 {progressPercentage}%)
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-green-600">
                ✓ 成功: {resumeInfo.successful}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-600">✗ 失败: {resumeInfo.failed}</span>
            </div>
          </div>

          <p className="pt-2 border-t border-blue-200">
            还有{" "}
            <span className="font-semibold text-blue-900">
              {remainingCount}
            </span>{" "}
            条记录待处理, 是否从上次中断处继续导入?
          </p>

          <div className="flex gap-2 pt-3">
            <Button
              onClick={onResume}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              继续导入
            </Button>
            <Button
              onClick={onDiscard}
              size="sm"
              variant="outline"
              className="border-gray-300"
            >
              <XCircle className="w-3 h-3 mr-1" />
              重新开始
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
