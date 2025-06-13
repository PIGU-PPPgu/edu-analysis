import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🔧 开发模式配置
const DEV_MODE = {
  enabled: false, // ✅ 关闭开发模式，注册问题已解决
  mockUser: {
    id: 'dev-user-123',
    email: 'dev@teacher.com',
    user_metadata: {
      full_name: '开发测试教师'
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    role: 'authenticated',
    updated_at: new Date().toISOString()
  } as User
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // 🔧 开发模式：直接设置模拟用户
    if (DEV_MODE.enabled) {
      console.log('🔧 开发模式已启用 - 使用模拟认证');
      setUser(DEV_MODE.mockUser);
      setSession({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: 'bearer',
        user: DEV_MODE.mockUser
      } as Session);
      setIsAuthReady(true);
      toast.success('开发模式：已自动登录');
      return;
    }

    // 正常的Supabase认证流程
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('获取会话失败:', error);
        } else if (session) {
          setUser(session.user);
          setSession(session);
        }
      } catch (error) {
        console.error('认证初始化失败:', error);
      } finally {
        setIsAuthReady(true);
      }
    };

    initializeAuth();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('认证状态变化:', event, session);
      
      if (session) {
        setUser(session.user);
        setSession(session);
      } else {
        setUser(null);
        setSession(null);
      }
      
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // 🔧 开发模式：模拟登录成功
    if (DEV_MODE.enabled) {
      console.log('🔧 开发模式：模拟登录');
      setUser(DEV_MODE.mockUser);
      setSession({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: 'bearer',
        user: DEV_MODE.mockUser
      } as Session);
      toast.success('开发模式：登录成功');
      return {};
    }

    // 正常的登录流程
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(`登录失败: ${error.message}`);
        return { error };
      }

      toast.success('登录成功');
      return { data };
    } catch (error: any) {
      toast.error(`登录异常: ${error.message}`);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    // 🔧 开发模式：模拟注册成功
    if (DEV_MODE.enabled) {
      console.log('🔧 开发模式：模拟注册');
      toast.success('开发模式：注册成功，已自动登录');
      return await signIn(email, password);
    }

    // 正常的注册流程
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error(`注册失败: ${error.message}`);
        return { error };
      }

      if (data.user && data.session) {
        toast.success('注册成功');
      } else {
        toast.success('注册成功，请查收验证邮件');
      }
      
      return { data };
    } catch (error: any) {
      toast.error(`注册异常: ${error.message}`);
      return { error };
    }
  };

  const signOut = async () => {
    // 🔧 开发模式：模拟退出
    if (DEV_MODE.enabled) {
      console.log('🔧 开发模式：模拟退出');
      setUser(null);
      setSession(null);
      toast.success('开发模式：已退出登录');
      return;
    }

    // 正常的退出流程
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`退出失败: ${error.message}`);
      } else {
        toast.success('已退出登录');
      }
    } catch (error: any) {
      toast.error(`退出异常: ${error.message}`);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isAuthReady,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}; 