import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { AuthError } from "@supabase/supabase-js";
import { toast } from "sonner";

interface AuthContextType {
  user: any | null;
  userRole: string | null;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<{ error: AuthError } | void>;
  refreshSession: () => Promise<void>;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  signIn: async () => ({}),
  signOut: async () => {},
  refreshSession: async () => {},
  isAuthReady: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  // 从本地存储获取用户角色
  const getUserRoleFromLocalStorage = (userId: string): string | null => {
    try {
      const storedRole = localStorage.getItem(`user_role_${userId}`);
      return storedRole;
    } catch (err) {
      console.error("从本地存储获取角色失败:", err);
      return null;
    }
  };

  // 将用户角色保存到本地存储
  const saveUserRoleToLocalStorage = (userId: string, role: string) => {
    try {
      localStorage.setItem(`user_role_${userId}`, role);
    } catch (err) {
      console.error("保存角色到本地存储失败:", err);
    }
  };

  // 刷新会话函数
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("刷新会话失败:", error);
        toast.error("会话刷新失败，请重新登录");
        await signOut();
        return;
      }
      
      if (data.session) {
        setUser(data.session.user);
        
        // 从本地存储获取角色
        const savedRole = getUserRoleFromLocalStorage(data.session.user.id);
        if (savedRole) {
          setUserRole(savedRole);
        } else {
          // 默认为管理员角色进行测试
          setUserRole('admin');
          saveUserRoleToLocalStorage(data.session.user.id, 'admin');
        }
      }
    } catch (error) {
      console.error("刷新会话异常:", error);
    }
  };

  useEffect(() => {
    // 检查初始会话
    const initAuth = async () => {
      try {
        setIsAuthReady(false);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // 会话有效
          setUser(session.user);
          
          // 从本地存储获取角色
          const savedRole = getUserRoleFromLocalStorage(session.user.id);
          if (savedRole) {
            setUserRole(savedRole);
          } else {
            // 如果没有保存角色，设置为管理员（便于测试）
            setUserRole('admin');
            saveUserRoleToLocalStorage(session.user.id, 'admin');
          }
        } else {
          // 无有效会话
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error("初始化认证失败:", error);
        setUser(null);
        setUserRole(null);
      } finally {
        setIsAuthReady(true);
      }
    };

    initAuth();

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("认证状态变化:", event);
        
        if (session) {
          setUser(session.user);
          
          // 从本地存储获取角色
          const savedRole = getUserRoleFromLocalStorage(session.user.id);
          if (savedRole) {
            setUserRole(savedRole);
          } else {
            // 如果没有保存角色，设置为管理员（便于测试）
            setUserRole('admin');
            saveUserRoleToLocalStorage(session.user.id, 'admin');
          }
        } else {
          setUser(null);
          setUserRole(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 登录时设置角色为管理员（仅用于开发测试）
  async function signIn(email: string, password: string) {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        toast.error(`登录失败: ${result.error.message}`);
      } else if (result.data.user) {
        toast.success("登录成功");
        
        // 登录时设置为管理员角色
        setUserRole('admin');
        saveUserRoleToLocalStorage(result.data.user.id, 'admin');
      }
      return result;
    } catch (error) {
      console.error("登录异常:", error);
      toast.error("登录过程中发生错误");
      return { data: {}, error };
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`退出登录失败: ${error.message}`);
      } else {
        toast.success("已退出登录");
        setUser(null);
        setUserRole(null);
      }
      return { error };
    } catch (error) {
      console.error("退出登录异常:", error);
      toast.error("退出登录过程中发生错误");
      return { error: error as AuthError };
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      signIn, 
      signOut, 
      refreshSession,
      isAuthReady 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
} 