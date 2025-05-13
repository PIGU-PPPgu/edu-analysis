import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 干预计划接口
export interface InterventionPlan {
  id: string;
  warning_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
  start_date?: string;
  end_date?: string;
  student_name?: string;
  activities?: InterventionActivity[];
  assessments?: InterventionAssessment[];
}

// 干预活动接口
export interface InterventionActivity {
  id: string;
  plan_id: string;
  activity_type: string;
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  scheduled_date?: string;
  completion_date?: string;
  responsible_person?: string;
  notes?: string;
}

// 干预评估接口
export interface InterventionAssessment {
  id: string;
  plan_id: string;
  assessment_date: string;
  effectiveness_rating: number;
  metrics?: any;
  observations?: string;
  next_steps?: string;
  assessed_by: string;
}

// 获取预警相关的干预计划
export const getInterventionPlans = async (warningId?: string): Promise<InterventionPlan[]> => {
  try {
    let query = supabase
      .from('intervention_plans')
      .select(`
        *,
        warning:warning_id(id, student:student_id(name)),
        activities:intervention_activities(*),
        assessments:intervention_assessments(*)
      `)
      .order('created_at', { ascending: false });
    
    if (warningId) {
      query = query.eq('warning_id', warningId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // 处理数据格式
    const plans = data.map((plan: any) => ({
      ...plan,
      student_name: plan.warning?.student?.name || '未知学生',
      activities: plan.activities || [],
      assessments: plan.assessments || []
    }));
    
    return plans as InterventionPlan[];
  } catch (error) {
    console.error('获取干预计划失败:', error);
    toast.error('获取干预计划失败');
    return [];
  }
};

// 创建干预计划
export const createInterventionPlan = async (plan: Omit<InterventionPlan, 'id' | 'created_at' | 'updated_at'>): Promise<InterventionPlan | null> => {
  try {
    const { data, error } = await supabase
      .from('intervention_plans')
      .insert(plan)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('干预计划创建成功');
    return data as InterventionPlan;
  } catch (error) {
    console.error('创建干预计划失败:', error);
    toast.error('创建干预计划失败');
    return null;
  }
};

// 更新干预计划
export const updateInterventionPlan = async (id: string, updates: Partial<InterventionPlan>): Promise<InterventionPlan | null> => {
  try {
    const { data, error } = await supabase
      .from('intervention_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('干预计划已更新');
    return data as InterventionPlan;
  } catch (error) {
    console.error('更新干预计划失败:', error);
    toast.error('更新干预计划失败');
    return null;
  }
};

// 添加干预活动
export const addInterventionActivity = async (activity: Omit<InterventionActivity, 'id'>): Promise<InterventionActivity | null> => {
  try {
    const { data, error } = await supabase
      .from('intervention_activities')
      .insert(activity)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('干预活动已添加');
    return data as InterventionActivity;
  } catch (error) {
    console.error('添加干预活动失败:', error);
    toast.error('添加干预活动失败');
    return null;
  }
};

// 更新干预活动
export const updateInterventionActivity = async (id: string, updates: Partial<InterventionActivity>): Promise<InterventionActivity | null> => {
  try {
    const { data, error } = await supabase
      .from('intervention_activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('干预活动已更新');
    return data as InterventionActivity;
  } catch (error) {
    console.error('更新干预活动失败:', error);
    toast.error('更新干预活动失败');
    return null;
  }
};

// 创建干预评估
export const createInterventionAssessment = async (assessment: Omit<InterventionAssessment, 'id'>): Promise<InterventionAssessment | null> => {
  try {
    const { data, error } = await supabase
      .from('intervention_assessments')
      .insert(assessment)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('干预评估已添加');
    return data as InterventionAssessment;
  } catch (error) {
    console.error('创建干预评估失败:', error);
    toast.error('创建干预评估失败');
    return null;
  }
};

// 获取干预类型选项
export const getInterventionTypeOptions = () => [
  { value: 'meeting', label: '面谈辅导' },
  { value: 'tutoring', label: '学业辅导' },
  { value: 'assignment', label: '针对性作业' },
  { value: 'parent_conference', label: '家长会议' },
  { value: 'counseling', label: '心理咨询' },
  { value: 'study_group', label: '学习小组' },
  { value: 'other', label: '其他' }
]; 