
import { supabase } from './auth'
import { validateData } from './validation'
import { toast } from 'sonner'

// 用户注册
export async function registerUser({ 
  phone, 
  email, 
  password 
}: { 
  phone?: string; 
  email?: string; 
  password: string 
}) {
  try {
    await validateData.validateUserAuth({ phone, email, password });
    
    // 根据是用邮箱还是电话注册选择合适的参数
    if (email) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone: phone || undefined,
            user_type: 'student',
          }
        }
      });
      
      if (error) throw error;
      toast.success("注册成功，请登录");
      return data;
    } else if (phone) {
      const { data, error } = await supabase.auth.signUp({
        phone,
        password,
        options: {
          data: {
            user_type: 'student',
          }
        }
      });
      
      if (error) throw error;
      toast.success("注册成功，请登录");
      return data;
    } else {
      throw new Error("请提供邮箱或手机号");
    }
  } catch (error) {
    console.error('注册失败:', error);
    toast.error(`注册失败: ${error.message}`);
    throw error;
  }
}

// 用户登录
export async function loginUser({ 
  phone, 
  email, 
  password 
}: {
  phone?: string;
  email?: string;
  password: string;
}) {
  try {
    await validateData.validateUserAuth({ phone, email, password });
    
    // 根据是用邮箱还是电话登录选择合适的参数
    let credentials;
    if (email) {
      credentials = { email, password };
    } else if (phone) {
      credentials = { phone, password };
    } else {
      throw new Error("请提供邮箱或手机号");
    }
    
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    
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
