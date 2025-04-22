
import { supabase } from '@/integrations/supabase/client'
import { validateData } from './validation'
import { toast } from 'sonner'

// 用户注册
export async function registerUser({ 
  email, 
  password 
}: { 
  email: string; 
  password: string 
}) {
  try {
    await validateData.validateUserAuth({ email, password });
    
    console.log('开始注册用户:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: 'student',
        }
      }
    });
    
    if (error) {
      console.error('注册失败:', error);
      throw error;
    }
    
    console.log('注册成功:', data);
    toast.success("注册成功，请登录");
    return data;
  } catch (error) {
    console.error('注册失败:', error);
    toast.error(`注册失败: ${error.message}`);
    throw error;
  }
}

// 用户登录
export async function loginUser({ 
  email, 
  password 
}: {
  email: string;
  password: string;
}) {
  try {
    await validateData.validateUserAuth({ email, password });
    
    console.log('开始登录用户:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('登录失败:', error);
      throw error;
    }
    
    console.log('登录成功:', data);
    toast.success("登录成功");
    return data;
  } catch (error) {
    console.error('登录失败:', error);
    toast.error(`登录失败: ${error.message}`);
    throw error;
  }
}
