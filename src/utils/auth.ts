
import { createClient, Provider } from '@supabase/supabase-js'

// 替换为你的实际Supabase和微信配置
const supabaseUrl = 'https://your-project.supabase.co'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const signInWithWechat = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'wechat' as Provider, // Type assertion to tell TypeScript this is a valid provider
    options: {
      redirectTo: `https://yourdomain.com/auth/callback`
    }
  })
  
  if (error) {
    console.error('WeChat Login Error:', error)
    throw error
  }
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Sign Out Error:', error)
    throw error
  }
}
