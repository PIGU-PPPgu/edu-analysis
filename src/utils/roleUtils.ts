
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = 'admin' | 'teacher' | 'student';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// 获取当前用户的所有角色
export const getCurrentUserRoles = async (): Promise<AppRole[]> => {
  try {
    const { data, error } = await supabase.rpc('get_user_roles');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取用户角色失败:', error);
    return [];
  }
};

// 检查当前用户是否为管理员
export const checkIsAdmin = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('检查管理员权限失败:', error);
    return false;
  }
};

// 为用户分配新角色
export const assignRole = async (userId: string, role: AppRole): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role }]);
    
    if (error) throw error;
    toast.success(`成功分配${role}角色`);
    return true;
  } catch (error) {
    console.error('分配角色失败:', error);
    toast.error('分配角色失败');
    return false;
  }
};

// 移除用户角色
export const removeRole = async (userId: string, role: AppRole): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);
    
    if (error) throw error;
    toast.success(`成功移除${role}角色`);
    return true;
  } catch (error) {
    console.error('移除角色失败:', error);
    toast.error('移除角色失败');
    return false;
  }
};
