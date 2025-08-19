/**
 * 预警队列处理器 Edge Function
 * 定时处理预警触发队列中的任务
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface QueueProcessResult {
  processedCount: number;
  failedCount: number;
  pendingCount: number;
}

// 队列处理器类
class WarningQueueProcessor {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 处理预警触发队列
   */
  async processQueue(): Promise<QueueProcessResult> {
    console.log('[QueueProcessor] 开始处理预警触发队列');
    
    try {
      // 调用数据库函数处理队列
      const { data, error } = await this.supabase.rpc('process_warning_trigger_queue');
      
      if (error) {
        console.error('[QueueProcessor] 处理队列失败:', error);
        throw error;
      }

      const result = data[0] as QueueProcessResult;
      
      console.log(`[QueueProcessor] 队列处理完成:`, {
        processed: result.processedCount,
        failed: result.failedCount,
        pending: result.pendingCount,
      });

      // 如果有待处理的任务需要调用预警引擎
      if (result.processedCount > 0) {
        await this.triggerWarningEngine();
      }

      return result;
    } catch (error) {
      console.error('[QueueProcessor] 处理队列时发生错误:', error);
      throw error;
    }
  }

  /**
   * 触发预警引擎执行
   */
  private async triggerWarningEngine(): Promise<void> {
    try {
      console.log('[QueueProcessor] 触发预警引擎执行');
      
      // 调用预警引擎 Edge Function
      const { data, error } = await this.supabase.functions.invoke('warning-engine', {
        body: {
          action: 'execute_all',
          trigger: 'auto_queue_processing',
        },
      });

      if (error) {
        console.error('[QueueProcessor] 调用预警引擎失败:', error);
      } else if (data.success) {
        console.log('[QueueProcessor] 预警引擎执行成功:', data.data.summary);
      } else {
        console.error('[QueueProcessor] 预警引擎执行失败:', data.error);
      }
    } catch (error) {
      console.error('[QueueProcessor] 触发预警引擎时发生错误:', error);
    }
  }

  /**
   * 清理过期的队列记录
   */
  async cleanupQueue(): Promise<number> {
    try {
      console.log('[QueueProcessor] 开始清理过期队列记录');
      
      const { data, error } = await this.supabase.rpc('cleanup_warning_trigger_queue');
      
      if (error) {
        console.error('[QueueProcessor] 清理队列失败:', error);
        return 0;
      }

      const deletedCount = data as number;
      console.log(`[QueueProcessor] 清理完成，删除 ${deletedCount} 条过期记录`);
      
      return deletedCount;
    } catch (error) {
      console.error('[QueueProcessor] 清理队列时发生错误:', error);
      return 0;
    }
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    recentActivity: any[];
  }> {
    try {
      // 获取队列统计
      const { data: stats, error: statsError } = await this.supabase
        .from('warning_trigger_queue')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // 最近24小时

      if (statsError) {
        throw statsError;
      }

      // 获取最近活动
      const { data: recentActivity, error: activityError } = await this.supabase
        .from('warning_trigger_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (activityError) {
        throw activityError;
      }

      // 统计各状态数量
      const statusCounts = (stats || []).reduce((acc: any, item: any) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      return {
        pending: statusCounts.pending || 0,
        processing: statusCounts.processing || 0,
        failed: statusCounts.failed || 0,
        recentActivity: recentActivity || [],
      };
    } catch (error) {
      console.error('[QueueProcessor] 获取队列状态失败:', error);
      return {
        pending: 0,
        processing: 0,
        failed: 0,
        recentActivity: [],
      };
    }
  }

  /**
   * 手动添加触发任务到队列
   */
  async addTriggerTask(
    triggerEvent: string,
    triggerData: any,
    entityType?: string,
    entityId?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('warning_trigger_queue')
        .insert({
          trigger_event: triggerEvent,
          trigger_data: triggerData,
          entity_type: entityType,
          entity_id: entityId,
          status: 'pending',
          scheduled_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[QueueProcessor] 添加触发任务失败:', error);
        return false;
      }

      console.log(`[QueueProcessor] 成功添加触发任务: ${triggerEvent}`);
      return true;
    } catch (error) {
      console.error('[QueueProcessor] 添加触发任务时发生错误:', error);
      return false;
    }
  }
}

// Edge Function 主函数
Deno.serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('缺少必要的环境变量');
    }

    const processor = new WarningQueueProcessor(supabaseUrl, supabaseServiceKey);

    // 解析请求
    const { action, ...params } = await req.json().catch(() => ({ action: 'process' }));

    let result;
    switch (action) {
      case 'process':
        result = await processor.processQueue();
        break;
      
      case 'cleanup':
        result = await processor.cleanupQueue();
        break;
      
      case 'status':
        result = await processor.getQueueStatus();
        break;
      
      case 'add_task':
        result = await processor.addTriggerTask(
          params.triggerEvent,
          params.triggerData,
          params.entityType,
          params.entityId
        );
        break;
      
      default:
        throw new Error(`未知操作: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('队列处理器执行失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});