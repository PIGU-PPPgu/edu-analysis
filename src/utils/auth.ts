
import { createClient, Provider } from '@supabase/supabase-js'

// Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 微信登录
export const signInWithWechat = async () => {
  const redirectUrl = import.meta.env.VITE_REDIRECT_URL || window.location.origin + '/auth/callback'
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'wechat' as Provider,
    options: {
      redirectTo: redirectUrl
    }
  })
  
  if (error) {
    console.error('微信登录错误:', error)
    throw error
  }
  return data
}

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
