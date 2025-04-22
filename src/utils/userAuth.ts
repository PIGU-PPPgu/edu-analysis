
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
      toast.error(`注册失败: ${error.message || '未知错误'}`);
      throw error;
    }
    
    console.log('注册成功:', data);
    return data;
  } catch (error) {
    console.error('注册失败:', error);
    toast.error(`注册失败: ${error.message || '请检查您的输入'}`);
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
      toast.error(`登录失败: ${error.message || '请检查您的邮箱和密码'}`);
      throw error;
    }
    
    console.log('登录成功，用户信息:', data.user);
    console.log('登录成功，会话信息:', data.session);
    return data;
  } catch (error) {
    console.error('登录失败:', error);
    toast.error(`登录失败: ${error.message || '请检查您的邮箱和密码'}`);
    throw error;
  }
}

// 保存用户AI配置
export async function saveUserAIConfig({ 
  apiKey, 
  provider, 
  enabled 
}: { 
  apiKey: string; 
  provider: string; 
  enabled: boolean 
}) {
  try {
    if (!apiKey) {
      throw new Error('API密钥不能为空');
    }
    
    // 验证API密钥有效性 (实际环境中应该验证API密钥，这里简化处理)
    const isValidKey = apiKey.length > 8;
    if (!isValidKey) {
      throw new Error('API密钥格式无效');
    }
    
    // 加密处理API密钥 - 这里只是示意，实际应在服务端加密
    const maskedKey = apiKey.substring(0, 3) + "..." + apiKey.substring(apiKey.length - 3);
    console.log(`保存用户AI配置: 提供商=${provider}, 密钥=${maskedKey}, 启用=${enabled}`);
    
    // 在localStorage中保存配置信息
    localStorage.setItem('aiConfig', JSON.stringify({
      provider,
      keyValid: true,
      enabled,
      lastUpdated: new Date().toISOString()
    }));
    
    // 加密保存apiKey - 实际环境应该在后端保存
    const encryptedKey = btoa(apiKey); // 简单base64编码，实际应使用更安全的加密
    localStorage.setItem('aiKey', encryptedKey);
    
    return {
      success: true,
      provider,
      keyValid: true,
      enabled
    };
  } catch (error) {
    console.error('保存AI配置失败:', error);
    toast.error(`AI配置保存失败: ${error.message || '请检查您输入的API密钥'}`);
    throw error;
  }
}

// 获取用户AI配置
export function getUserAIConfig() {
  try {
    const configStr = localStorage.getItem('aiConfig');
    if (!configStr) return null;
    
    return JSON.parse(configStr);
  } catch (error) {
    console.error('获取AI配置失败:', error);
    return null;
  }
}

// 获取用户API密钥
export function getUserAPIKey() {
  try {
    const encryptedKey = localStorage.getItem('aiKey');
    if (!encryptedKey) return null;
    
    // 解密API密钥 - 简单base64解码，实际应使用更安全的解密
    return atob(encryptedKey);
  } catch (error) {
    console.error('获取API密钥失败:', error);
    return null;
  }
}
