
import { supabase } from '@/integrations/supabase/client'
import { validateData } from './validation'
import { toast } from 'sonner'

// 登出
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('登出错误:', error)
    throw error
  }
}

// 获取当前用户
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser()
  return data.user
}

// 获取会话状态
export const getSession = async () => {
  const { data } = await supabase.auth.getSession()
  return data.session
}
