import { supabase } from '@/integrations/supabase/client'
import { validateData } from './validation'
import { toast } from 'sonner'
import { UserAIConfig } from '@/types/ai';

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

// 加密API密钥（实际环境应使用更安全的加密方法）
function encryptApiKey(apiKey: string): string {
  // 这里仅作为示例，实际应使用更强的加密算法
  // 在生产环境中，应该使用服务端加密或更安全的方法
  return btoa(apiKey);
}

// 解密API密钥
function decryptApiKey(encryptedKey: string): string {
  // 对应encryptApiKey的解密
  return atob(encryptedKey);
}

// 存储密钥和配置的键名
const API_KEY_STORAGE_KEY = 'user_api_key';
const AI_CONFIG_STORAGE_KEY = 'user_ai_config';

/**
 * 获取用户API密钥
 * @returns API密钥
 */
export async function getUserAPIKey(): Promise<string | null> {
  try {
    // 从localStorage获取密钥
    const key = localStorage.getItem(API_KEY_STORAGE_KEY);
    return key;
  } catch (error) {
    console.error('获取API密钥失败:', error);
    return null;
  }
}

/**
 * 保存用户API密钥
 * @param apiKey API密钥
 */
export async function saveUserAPIKey(apiKey: string): Promise<void> {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (error) {
    console.error('保存API密钥失败:', error);
    throw error;
  }
}

/**
 * 获取用户AI配置
 * @returns AI配置
 */
export async function getUserAIConfig(): Promise<UserAIConfig | null> {
  try {
    const configJson = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
    if (!configJson) return null;
    
    return JSON.parse(configJson);
  } catch (error) {
    console.error('获取AI配置失败:', error);
    return null;
  }
}

/**
 * 保存用户AI配置
 * @param config AI配置
 */
export async function saveUserAIConfig(config: UserAIConfig): Promise<void> {
  try {
    localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('保存AI配置失败:', error);
    throw error;
  }
}

/**
 * 清除用户AI配置和API密钥
 */
export async function clearUserAISettings(): Promise<void> {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
  } catch (error) {
    console.error('清除AI设置失败:', error);
    throw error;
  }
}

