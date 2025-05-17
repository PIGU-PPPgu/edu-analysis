import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { requestCache } from '@/utils/cacheUtils';

/**
 * 创建预警统计表并初始化数据
 */
export const createWarningStatisticsTable = async () => {
  try {
    // 检查表是否已存在 - 使用直接查询的方式代替检查information_schema
    let tableExists = false;
    try {
      // 尝试从目标表读取记录，如果能读取成功则表已存在
      const { data, error } = await supabase
        .from('warning_statistics')
        .select('id')
        .limit(1);
      
      // 如果没有错误，说明表存在
      if (!error) {
        console.log('预警统计表已存在，跳过创建');
        tableExists = true;
        
        // 清除缓存，确保应用能正确读取表数据
        requestCache.invalidate('warning_statistics');
        
        return { success: true, message: '预警统计表已存在，无需重新创建' };
      }
    } catch (checkError) {
      // 忽略错误，表示表不存在
      console.log('检查表存在时出错，表可能不存在:', checkError);
    }
    
    // 如果表不存在，继续创建表
    if (!tableExists) {
      console.log('开始创建预警统计表...');
      
      // 创建表
      const { error: createError } = await supabase.rpc('create_warning_statistics_table');
      
      if (createError) {
        // 如果RPC调用失败，尝试使用SQL直接创建
        console.warn('通过RPC创建表失败，尝试直接执行SQL:', createError);
        
        // 创建表的SQL
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS public.warning_statistics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            students JSONB NOT NULL DEFAULT '{"total": 0, "at_risk": 0, "trend": "unchanged"}',
            classes JSONB NOT NULL DEFAULT '{"total": 0, "at_risk": 0, "trend": "unchanged"}',
            warnings JSONB NOT NULL DEFAULT '{"total": 0, "by_type": [], "by_severity": [], "trend": "unchanged"}',
            risk_factors JSONB NOT NULL DEFAULT '[]',
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
          
          -- 添加注释
          COMMENT ON TABLE public.warning_statistics IS '预警统计数据表，保存系统预警统计信息';
          
          -- 启用RLS
          ALTER TABLE public.warning_statistics ENABLE ROW LEVEL SECURITY;
          
          -- 创建读取权限策略
          CREATE POLICY IF NOT EXISTS "允许已认证用户读取预警统计"
            ON public.warning_statistics
            FOR SELECT
            TO authenticated
            USING (true);
        `;
        
        const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        
        if (sqlError) {
          console.error('创建表失败:', sqlError);
          return { success: false, error: sqlError };
        }
      }
      
      console.log('表创建成功，开始插入初始数据...');
      
      // 插入初始数据
      const { error: insertError } = await supabase
        .from('warning_statistics')
        .insert([
          {
            students: {
              total: 320,
              at_risk: 48,
              trend: 'down'
            },
            classes: {
              total: 12,
              at_risk: 8,
              trend: 'unchanged'
            },
            warnings: {
              total: 76,
              by_type: [
                { type: '学业预警', count: 32, percentage: 42, trend: 'up' },
                { type: '行为预警', count: 24, percentage: 32, trend: 'down' },
                { type: '出勤预警', count: 12, percentage: 16, trend: 'down' },
                { type: '情绪预警', count: 8, percentage: 10, trend: 'unchanged' }
              ],
              by_severity: [
                { severity: 'high', count: 24, percentage: 32, trend: 'up' },
                { severity: 'medium', count: 36, percentage: 47, trend: 'down' },
                { severity: 'low', count: 16, percentage: 21, trend: 'unchanged' }
              ],
              trend: 'down'
            },
            risk_factors: [
              { factor: '缺勤率高', count: 28, percentage: 58, trend: 'up' },
              { factor: '作业完成率低', count: 24, percentage: 50, trend: 'unchanged' },
              { factor: '考试成绩下滑', count: 22, percentage: 46, trend: 'down' },
              { factor: '课堂参与度低', count: 18, percentage: 38, trend: 'down' },
              { factor: '纪律问题', count: 10, percentage: 21, trend: 'unchanged' }
            ]
          }
        ]);
      
      if (insertError) {
        console.error('插入初始数据失败:', insertError);
        return { success: false, error: insertError };
      }
      
      console.log('初始数据插入成功，清除缓存...');
      
      // 清除所有缓存确保应用能立即获取新表数据
      requestCache.clear();
      requestCache.invalidate('warning_statistics');
      
      // 确认表已经可以访问，提供预热查询
      try {
        const { data, error } = await supabase
          .from('warning_statistics')
          .select('*')
          .limit(1);
        
        if (error) {
          console.warn('预热查询失败:', error);
        } else {
          console.log('预热查询成功，数据已可访问:', data);
        }
      } catch (warmupError) {
        console.warn('预热查询异常:', warmupError);
      }
      
      toast.success('预警统计表创建成功');
      return { success: true, message: '预警统计表创建成功' };
    }
    
    return { success: true, message: tableExists ? '预警统计表已存在' : '预警统计表创建成功' };
  } catch (error) {
    console.error('创建预警统计表出错:', error);
    toast.error('创建预警统计表失败');
    return { success: false, error, message: error instanceof Error ? error.message : '未知错误' };
  }
}; 