import { supabase } from '@/integrations/supabase/client'
import { validateData } from './validation'
import { toast } from 'sonner'
import { getCurrentUserRoles } from './roleUtils'

// 登出
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('登出错误:', error)
    throw error
  }
  return { success: true }
}

// 获取当前用户
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
  console.log('当前用户信息:', data.user)
  return data.user
}

// 获取会话状态
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('获取会话失败:', error)
    return null
  }
  console.log('当前会话状态:', data.session ? '已登录' : '未登录')
  return data.session
}

// 获取用户角色
export const getUserRoles = async () => {
  try {
    return await getCurrentUserRoles();
  } catch (error) {
    console.error('获取用户角色失败:', error);
    console.warn('getUserRoles出错，使用默认角色["teacher", "student"]');
    return ['teacher', 'student'];
  }
}
