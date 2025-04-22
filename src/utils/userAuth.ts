import { supabase } from './auth'
import { validateData } from './validation'
import { toast } from 'sonner'

// 用户注册 - 使用手机号或邮箱
export async function registerUser({ phone, email, password }: { 
  phone?: string; 
  email?: string; 
  password: string 
}) {
  try {
    // 验证注册数据
    await validateData.validateUserAuth({ phone, email, password });
    
    // 构建用户数据
    const signUpData: Record<string, any> = { password };
    
    // 必须有一个标识符 (email或phone)
    if (email) {
      signUpData.email = email;
    } else if (phone) {
      signUpData.phone = phone;
    }
    
    // 使用Supabase创建用户
    const { data, error } = await supabase.auth.signUp({
      ...signUpData as any,
      options: {
        data: {
          phone,
          user_type: 'student', // 默认为学生类型
        }
      }
    });
    
    if (error) throw error;
    
    toast.success("注册成功，请登录");
    return data;
  } catch (error) {
    console.error('注册失败:', error);
    toast.error(`注册失败: ${error.message}`);
    throw error;
  }
}

// 用户登录 - 使用手机号或邮箱
export async function loginUser({ phone, email, password }: {
  phone?: string;
  email?: string;
  password: string;
}) {
  try {
    // 验证登录数据
    await validateData.validateUserAuth({ phone, email, password });
    
    // 构建登录凭证 - 必须提供email或phone其中之一
    const credentials: Record<string, any> = { password };
    if (email) {
      credentials.email = email;
    } else if (phone) {
      credentials.phone = phone;
    }
    
    // 使用Supabase登录
    const { data, error } = await supabase.auth.signInWithPassword(credentials as any);
    
    if (error) throw error;
    
    toast.success("登录成功");
    return data;
  } catch (error) {
    console.error('登录失败:', error);
    toast.error(`登录失败: ${error.message}`);
    throw error;
  }
}

// 发送短信验证码
export async function sendPhoneOTP(phone: string) {
  try {
    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      throw new Error("请输入有效的手机号码");
    }
    
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });
    
    if (error) throw error;
    
    toast.success("验证码已发送，请查收");
    return data;
  } catch (error) {
    console.error('发送验证码失败:', error);
    toast.error(`发送验证码失败: ${error.message}`);
    throw error;
  }
}

// 使用验证码登录
export async function verifyPhoneOTP(phone: string, otp: string) {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });
    
    if (error) throw error;
    
    toast.success("登录成功");
    return data;
  } catch (error) {
    console.error('验证码验证失败:', error);
    toast.error(`验证失败: ${error.message}`);
    throw error;
  }
}
