import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleApiError } from './apiService';
import { formatNumber } from '@/utils/formatUtils';
import { requestCache } from '@/utils/cacheUtils';

// 预警数据接口
export interface WarningRule {
  id: string;
  name: string;
  description: string | null;
  conditions: any;
  severity: 'low' | 'medium' | 'high';
  is_active: boolean;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarningRecord {
  id: string;
  student_id: string;
  rule_id: string | null;
  details: any;
  status: 'active' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  student?: {
    name: string;
    class_id: string;
    student_id: string;
  };
  rule?: WarningRule;
}

export interface TrendData {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'unchanged';
}

export interface WarningStats {
  students: {
    total: number;
    at_risk: number;
    trend: 'up' | 'down' | 'unchanged';
  };
  classes: {
    total: number;
    at_risk: number;
    trend: 'up' | 'down' | 'unchanged';
  };
  warnings: {
    total: number;
    by_type: Array<{
      type: string;
      count: number;
      percentage: number;
      trend: 'up' | 'down' | 'unchanged';
    }>;
    by_severity: Array<{
      severity: 'high' | 'medium' | 'low';
      count: number;
      percentage: number;
      trend: 'up' | 'down' | 'unchanged';
    }>;
    trend: 'up' | 'down' | 'unchanged';
  };
  risk_factors: Array<{
    factor: string;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'unchanged';
  }>;
}

// 模拟预警统计数据
const mockWarningStats: WarningStats = {
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
};

/**
 * 获取所有预警规则
 */
export const getWarningRules = async (): Promise<WarningRule[]> => {
  try {
    const { data, error } = await supabase
      .from('warning_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as unknown) as WarningRule[];
  } catch (error) {
    console.error('获取预警规则失败:', error);
    toast.error('获取预警规则失败');
    return [];
  }
};

/**
 * 创建新的预警规则
 */
export const createWarningRule = async (rule: Omit<WarningRule, 'id' | 'created_at' | 'updated_at'>): Promise<WarningRule | null> => {
  try {
    const { data, error } = await supabase
      .from('warning_rules')
      .insert(rule)
      .select()
      .single();

    if (error) throw error;
    toast.success('预警规则创建成功');
    return (data as unknown) as WarningRule;
  } catch (error) {
    console.error('创建预警规则失败:', error);
    toast.error('创建预警规则失败');
    return null;
  }
};

/**
 * 更新预警规则
 */
export const updateWarningRule = async (id: string, updates: Partial<WarningRule>): Promise<WarningRule | null> => {
  try {
    const { data, error } = await supabase
      .from('warning_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    toast.success('预警规则已更新');
    return (data as unknown) as WarningRule;
  } catch (error) {
    console.error('更新预警规则失败:', error);
    toast.error('更新预警规则失败');
    return null;
  }
};

/**
 * 删除预警规则
 */
export const deleteWarningRule = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('warning_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    toast.success('预警规则已删除');
    return true;
  } catch (error) {
    console.error('删除预警规则失败:', error);
    toast.error('删除预警规则失败');
    return false;
  }
};

/**
 * 获取所有预警记录，可选择包含学生和规则信息
 */
export const getWarningRecords = async (includeDetails: boolean = true): Promise<WarningRecord[]> => {
  try {
    let query = supabase
      .from('warning_records')
      .select(includeDetails 
        ? `*, student:student_id(name, class_id, student_id), rule:rule_id(*)` 
        : '*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    // 先转换为unknown类型，然后再转换为WarningRecord[]类型以避免类型错误
    return (data as unknown) as WarningRecord[];
  } catch (error) {
    console.error('获取预警记录失败:', error);
    toast.error('获取预警记录失败');
    return [];
  }
};

/**
 * 获取特定学生的预警记录
 */
export const getStudentWarningRecords = async (studentId: string): Promise<WarningRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('warning_records')
      .select(`*, rule:rule_id(*)`)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    // 先转换为unknown类型，然后再转换为WarningRecord[]类型
    return (data as unknown) as WarningRecord[];
  } catch (error) {
    console.error(`获取学生(${studentId})预警记录失败:`, error);
    toast.error('获取学生预警记录失败');
    return [];
  }
};

/**
 * 解决预警记录
 */
export const resolveWarningRecord = async (
  id: string, 
  userId: string, 
  notes: string
): Promise<WarningRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('warning_records')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        resolution_notes: notes
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    toast.success('预警记录已解决');
    // 先转换为unknown类型，然后再转换为WarningRecord类型
    return (data as unknown) as WarningRecord;
  } catch (error) {
    console.error('解决预警记录失败:', error);
    toast.error('解决预警记录失败');
    return null;
  }
};

/**
 * 获取预警统计数据
 */
export const getWarningStatistics = async (): Promise<WarningStats> => {
  return requestCache.get('warning_statistics', async () => {
    try {
      // 实际API实现
      const { data, error } = await supabase
        .from('warning_statistics')
        .select('*')
        .single();
      
      if (error) {
        console.error('获取预警统计出错:', error);
        return mockWarningStats; // 出错时返回模拟数据
      }
      
      return data || mockWarningStats;
    } catch (error) {
      console.error('获取预警统计失败:', error);
      return mockWarningStats;
    }
  }, 5 * 60 * 1000); // 缓存5分钟
};

// 获取单个预警记录
export const getWarningRecord = async (warningId: string): Promise<WarningRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('warning_records')
      .select(`
        *,
        student:student_id(*),
        rule:rule_id(*)
      `)
      .eq('id', warningId)
      .single();
    
    if (error) {
      console.error('获取预警记录失败:', error);
      throw error;
    }
    
    return data as WarningRecord;
  } catch (error) {
    console.error('获取预警记录失败:', error);
    toast.error('获取预警记录失败');
    return null;
  }
};

/**
 * 更新预警记录状态
 * @param warningId 预警记录ID
 * @param newStatus 新状态：'active'(激活), 'resolved'(已解决), 'dismissed'(已忽略)
 * @returns 更新后的预警记录，更新失败则返回null
 */
export const updateWarningStatus = async (
  warningId: string, 
  newStatus: 'active' | 'resolved' | 'dismissed'
): Promise<WarningRecord | null> => {
  try {
    const updates: any = {
      status: newStatus
    };
    
    // 如果状态为已解决，设置解决时间
    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    } else if (newStatus === 'active') {
      // 如果重新激活，清除解决时间和解决者信息
      updates.resolved_at = null;
      updates.resolved_by = null;
      updates.resolution_notes = null;
    }
    
    const { data, error } = await supabase
      .from('warning_records')
      .update(updates)
      .eq('id', warningId)
      .select()
      .single();
    
    if (error) {
      console.error('更新预警状态失败:', error);
      throw error;
    }
    
    const statusText = 
      newStatus === 'resolved' ? '已解决' : 
      newStatus === 'dismissed' ? '已忽略' : 
      '已激活';
    
    toast.success(`预警状态${statusText}`);
    return data as WarningRecord;
  } catch (error) {
    console.error('更新预警状态失败:', error);
    toast.error('更新预警状态失败');
    return null;
  }
}; 