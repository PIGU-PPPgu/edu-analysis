/**
 * 预警自动触发服务
 * 管理预警系统的自动触发机制
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 触发队列状态接口
export interface QueueStatus {
  pending: number;
  processing: number;
  failed: number;
  recentActivity: Array<{
    id: string;
    trigger_event: string;
    trigger_data: any;
    status: string;
    created_at: string;
    processed_at?: string;
    error_message?: string;
  }>;
}

// 队列处理结果接口
export interface QueueProcessResult {
  processedCount: number;
  failedCount: number;
  pendingCount: number;
}

/**
 * 手动处理预警触发队列
 */
export async function processWarningQueue(): Promise<QueueProcessResult | null> {
  try {
    console.log("开始处理预警触发队列");

    const { data, error } = await supabase.functions.invoke(
      "warning-queue-processor",
      {
        body: { action: "process" },
      }
    );

    if (error) {
      console.error("处理队列失败:", error);
      toast.error("处理队列失败", {
        description: error.message || "请稍后重试",
      });
      return null;
    }

    if (!data.success) {
      console.error("队列处理失败:", data.error);
      toast.error("队列处理失败", {
        description: data.error || "未知错误",
      });
      return null;
    }

    const result = data.data as QueueProcessResult;

    toast.success("队列处理完成", {
      description: `处理了 ${result.processedCount} 个任务，${result.failedCount} 个失败，${result.pendingCount} 个待处理`,
    });

    return result;
  } catch (error) {
    console.error("处理预警队列失败:", error);
    toast.error("处理预警队列失败");
    return null;
  }
}

/**
 * 获取触发队列状态
 */
export async function getWarningQueueStatus(): Promise<QueueStatus | null> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "warning-queue-processor",
      {
        body: { action: "status" },
      }
    );

    if (error) {
      console.error("获取队列状态失败:", error);
      return null;
    }

    if (!data.success) {
      console.error("获取队列状态失败:", data.error);
      return null;
    }

    return data.data as QueueStatus;
  } catch (error) {
    console.error("获取队列状态失败:", error);
    return null;
  }
}

/**
 * 清理过期的队列记录
 */
export async function cleanupWarningQueue(): Promise<number> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "warning-queue-processor",
      {
        body: { action: "cleanup" },
      }
    );

    if (error) {
      console.error("清理队列失败:", error);
      toast.error("清理队列失败");
      return 0;
    }

    if (!data.success) {
      console.error("清理队列失败:", data.error);
      toast.error("清理队列失败", {
        description: data.error,
      });
      return 0;
    }

    const deletedCount = data.data as number;

    if (deletedCount > 0) {
      toast.success("队列清理完成", {
        description: `删除了 ${deletedCount} 条过期记录`,
      });
    }

    return deletedCount;
  } catch (error) {
    console.error("清理预警队列失败:", error);
    toast.error("清理预警队列失败");
    return 0;
  }
}

/**
 * 手动添加触发任务
 */
export async function addWarningTriggerTask(
  triggerEvent: string,
  triggerData: any,
  entityType?: string,
  entityId?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "warning-queue-processor",
      {
        body: {
          action: "add_task",
          triggerEvent,
          triggerData,
          entityType,
          entityId,
        },
      }
    );

    if (error) {
      console.error("添加触发任务失败:", error);
      toast.error("添加触发任务失败");
      return false;
    }

    if (!data.success) {
      console.error("添加触发任务失败:", data.error);
      toast.error("添加触发任务失败", {
        description: data.error,
      });
      return false;
    }

    toast.success("触发任务已添加到队列");
    return true;
  } catch (error) {
    console.error("添加触发任务失败:", error);
    toast.error("添加触发任务失败");
    return false;
  }
}

/**
 * 触发成绩导入后的预警检查
 */
export async function triggerGradeImportWarning(
  studentId: string,
  examTitle: string,
  examDate: string
): Promise<boolean> {
  return addWarningTriggerTask(
    "grade_import",
    {
      student_id: studentId,
      exam_title: examTitle,
      exam_date: examDate,
      triggered_manually: true,
    },
    "grade_data",
    studentId
  );
}

/**
 * 触发作业提交后的预警检查
 */
export async function triggerHomeworkSubmissionWarning(
  studentId: string,
  homeworkId: string
): Promise<boolean> {
  return addWarningTriggerTask(
    "homework_submission",
    {
      student_id: studentId,
      homework_id: homeworkId,
      triggered_manually: true,
    },
    "homework_submission",
    `${studentId}-${homeworkId}`
  );
}

/**
 * 触发批量导入后的预警检查
 */
export async function triggerBatchImportWarning(
  examTitle: string,
  importCount: number
): Promise<boolean> {
  return addWarningTriggerTask(
    "batch_grade_import",
    {
      exam_title: examTitle,
      import_count: importCount,
      triggered_manually: true,
    },
    "batch_operation",
    examTitle
  );
}

/**
 * 触发规则变更后的预警检查
 */
export async function triggerRuleChangeWarning(
  ruleId: string,
  ruleName: string
): Promise<boolean> {
  return addWarningTriggerTask(
    "rule_change",
    {
      rule_id: ruleId,
      rule_name: ruleName,
      triggered_manually: true,
    },
    "warning_rule",
    ruleId
  );
}

/**
 * 监控队列状态，返回实时状态
 */
export async function monitorQueueStatus(
  onStatusUpdate?: (status: QueueStatus) => void
): Promise<() => void> {
  let isMonitoring = true;

  const updateStatus = async () => {
    if (!isMonitoring) return;

    try {
      const status = await getWarningQueueStatus();
      if (status && onStatusUpdate) {
        onStatusUpdate(status);
      }
    } catch (error) {
      console.error("监控队列状态失败:", error);
    }
  };

  // 立即获取一次状态
  await updateStatus();

  // 每30秒更新一次状态
  const interval = setInterval(updateStatus, 30000);

  // 返回停止监控的函数
  return () => {
    isMonitoring = false;
    clearInterval(interval);
  };
}

/**
 * 获取触发队列的详细记录
 */
export async function getQueueRecords(
  limit: number = 20,
  status?: "pending" | "processing" | "completed" | "failed"
) {
  try {
    let query = supabase
      .from("warning_trigger_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取队列记录失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取队列记录失败:", error);
    return [];
  }
}

/**
 * 重试失败的队列任务
 */
export async function retryFailedQueueTasks(): Promise<boolean> {
  try {
    // 获取失败的任务
    const { data: failedTasks, error: fetchError } = await supabase
      .from("warning_trigger_queue")
      .select("*")
      .eq("status", "failed")
      .lt("retry_count", 3); // 只重试少于3次的任务

    if (fetchError) {
      console.error("获取失败任务失败:", fetchError);
      return false;
    }

    if (!failedTasks || failedTasks.length === 0) {
      toast.info("没有需要重试的失败任务");
      return true;
    }

    // 重置失败任务状态
    const { error: updateError } = await supabase
      .from("warning_trigger_queue")
      .update({
        status: "pending",
        scheduled_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("status", "failed")
      .lt("retry_count", 3);

    if (updateError) {
      console.error("重置失败任务失败:", updateError);
      toast.error("重试失败任务失败");
      return false;
    }

    toast.success(`已重试 ${failedTasks.length} 个失败任务`);

    // 触发队列处理
    setTimeout(() => {
      processWarningQueue();
    }, 1000);

    return true;
  } catch (error) {
    console.error("重试失败任务失败:", error);
    toast.error("重试失败任务失败");
    return false;
  }
}
