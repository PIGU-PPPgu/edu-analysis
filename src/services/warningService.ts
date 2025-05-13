import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleApiError } from './apiService';
import { formatNumber } from '@/utils/formatUtils';

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
  totalStudents: number;
  atRiskStudents: number;
  highRiskStudents: number;
  totalStudentsTrend: TrendData;
  atRiskStudentsTrend: TrendData;
  highRiskStudentsTrend: TrendData;
  warningsByType: { 
    type: string; 
    count: number; 
    percentage: number; 
    trend: 'up' | 'down' | 'unchanged';
    previous_count?: number;
  }[];
  riskByClass: { 
    className: string; 
    studentCount: number; 
    atRiskCount: number;
    trend: 'up' | 'down' | 'unchanged';
    previous_count?: number;
  }[];
  commonRiskFactors: { 
    factor: string; 
    count: number; 
    percentage: number;
    trend: 'up' | 'down' | 'unchanged';
    previous_count?: number;
  }[];
}

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
  try {
    // 使用新创建的存储过程获取所有统计数据和趋势
    const { data, error } = await supabase.rpc('get_warning_statistics_with_trends');
    
    if (error) {
      console.error('获取预警统计数据失败:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('未获取到预警统计数据');
    }
    
    // 计算预警类型百分比
    const warningsByType = data.warningsByType ? data.warningsByType.map((item: any) => {
      const total = data.atRiskStudents.current || 1; // 避免除以0
      const percentage = Math.round((item.current_count / total) * 100);
      return {
        type: item.warning_type,
        count: item.current_count,
        percentage: percentage,
        trend: item.trend,
        previous_count: item.previous_count
      };
    }) : [];
    
    // 格式化班级数据
    const riskByClass = data.riskByClass ? data.riskByClass.map((item: any) => ({
      className: item.class_name,
      studentCount: item.current_count + (item.current_count - item.previous_count), // 估算总学生数
      atRiskCount: item.current_count,
      trend: item.trend,
      previous_count: item.previous_count
    })) : [];
    
    // 格式化风险因素数据
    const commonRiskFactors = data.commonRiskFactors ? data.commonRiskFactors.map((item: any) => {
      const total = data.atRiskStudents.current || 1; // 避免除以0
      const percentage = Math.round((item.current_count / total) * 100);
      return {
        factor: item.risk_factor,
        count: item.current_count,
        percentage: percentage,
        trend: item.trend,
        previous_count: item.previous_count
      };
    }) : [];
    
    // 返回完整的统计数据
    return {
      totalStudents: data.totalStudents.current,
      atRiskStudents: data.atRiskStudents.current,
      highRiskStudents: data.highRiskStudents.current,
      totalStudentsTrend: data.totalStudents,
      atRiskStudentsTrend: data.atRiskStudents,
      highRiskStudentsTrend: data.highRiskStudents,
      warningsByType,
      riskByClass,
      commonRiskFactors
    };
  } catch (error) {
    console.error('获取预警统计数据失败:', error);
    // 返回空的统计数据
    return {
      totalStudents: 0,
      atRiskStudents: 0,
      highRiskStudents: 0,
      totalStudentsTrend: { current: 0, previous: 0, trend: 'unchanged' },
      atRiskStudentsTrend: { current: 0, previous: 0, trend: 'unchanged' },
      highRiskStudentsTrend: { current: 0, previous: 0, trend: 'unchanged' },
      warningsByType: [],
      riskByClass: [],
      commonRiskFactors: []
    };
  }
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