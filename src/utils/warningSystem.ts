
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const warningSystem = {
  // Get all warning rules
  async getWarningRules() {
    try {
      const { data, error } = await supabase
        .from('warning_rules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取预警规则失败:', error);
      toast.error('获取预警规则失败');
      return [];
    }
  },

  // Create new warning rule
  async createWarningRule(rule: {
    name: string;
    description?: string;
    conditions: any;
    severity: 'low' | 'medium' | 'high';
  }) {
    try {
      const { data, error } = await supabase
        .from('warning_rules')
        .insert([
          {
            ...rule,
            is_system: false,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      toast.success('预警规则创建成功');
      return data;
    } catch (error) {
      console.error('创建预警规则失败:', error);
      toast.error('创建预警规则失败');
      return null;
    }
  },

  // Update warning rule
  async updateWarningRule(ruleId: string, updates: {
    name?: string;
    description?: string;
    conditions?: any;
    severity?: 'low' | 'medium' | 'high';
    is_active?: boolean;
  }) {
    try {
      const { data, error } = await supabase
        .from('warning_rules')
        .update(updates)
        .eq('id', ruleId)
        .select()
        .single();

      if (error) throw error;
      toast.success('预警规则更新成功');
      return data;
    } catch (error) {
      console.error('更新预警规则失败:', error);
      toast.error('更新预警规则失败');
      return null;
    }
  },

  // Get warning records
  async getWarningRecords(studentId?: string) {
    try {
      let query = supabase
        .from('warning_records')
        .select(`
          *,
          students (
            name,
            student_id
          ),
          warning_rules (
            name,
            severity
          )
        `)
        .order('created_at', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取预警记录失败:', error);
      toast.error('获取预警记录失败');
      return [];
    }
  },

  // Create warning record
  async createWarningRecord(record: {
    student_id: string;
    rule_id: string;
    details: any;
  }) {
    try {
      const { data, error } = await supabase
        .from('warning_records')
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('创建预警记录失败:', error);
      toast.error('创建预警记录失败');
      return null;
    }
  },

  // Resolve warning
  async resolveWarning(warningId: string, resolutionNotes: string) {
    try {
      const { data, error } = await supabase
        .from('warning_records')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
          resolution_notes: resolutionNotes
        })
        .eq('id', warningId)
        .select()
        .single();

      if (error) throw error;
      toast.success('预警已解决');
      return data;
    } catch (error) {
      console.error('解决预警失败:', error);
      toast.error('解决预警失败');
      return null;
    }
  },

  // Dismiss warning
  async dismissWarning(warningId: string) {
    try {
      const { data, error } = await supabase
        .from('warning_records')
        .update({
          status: 'dismissed',
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', warningId)
        .select()
        .single();

      if (error) throw error;
      toast.success('预警已忽略');
      return data;
    } catch (error) {
      console.error('忽略预警失败:', error);
      toast.error('忽略预警失败');
      return null;
    }
  }
};
