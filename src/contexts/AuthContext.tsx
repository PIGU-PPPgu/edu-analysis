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
      await signOut();
    }
  };

  // 检查初始会话的函数
  const initAuth = async () => {
    try {
      setIsAuthReady(false);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("获取会话失败:", error);
        setUser(null);
        setUserRole(null);
        setIsAuthReady(true);
        return;
      }
      
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

  useEffect(() => {
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

  // 登录函数
  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("登录失败", {
          description: error.message,
        });
        return { data, error };
      }

      if (data?.user) {
        // 登录成功
        setUser(data.user);
        
        // 从本地存储获取角色
        const savedRole = getUserRoleFromLocalStorage(data.user.id);
        if (savedRole) {
          setUserRole(savedRole);
        } else {
          // 如果没有保存角色，设置为管理员（便于测试）
          setUserRole('admin');
          saveUserRoleToLocalStorage(data.user.id, 'admin');
        }
        
        toast.success("登录成功");
      }

      return { data, error };
    } catch (error) {
      console.error("登录过程中出现错误:", error);
      toast.error("登录异常", {
        description: error instanceof Error ? error.message : "未知错误",
      });
      return {
        data: {},
        error: error instanceof Error ? { message: error.message } as AuthError : { message: "未知错误" } as AuthError,
      };
    }
  }

  // 登出函数
  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("退出登录失败:", error);
        toast.error("退出登录失败", {
          description: error.message,
        });
        return { error };
      }

      // 清除用户状态
      setUser(null);
      setUserRole(null);
      toast.success("已退出登录");
      return {};
    } catch (error) {
      console.error("退出登录过程中出现错误:", error);
      toast.error("退出登录异常", {
        description: error instanceof Error ? error.message : "未知错误",
      });
      return {
        error: error instanceof Error ? { message: error.message } as AuthError : { message: "未知错误" } as AuthError,
      };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        signIn,
        signOut,
        refreshSession,
        isAuthReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
} 