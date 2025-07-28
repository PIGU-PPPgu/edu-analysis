import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  isAuthReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Supabase认证流程
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("获取会话失败:", error);
        } else if (session) {
          setUser(session.user);
          setSession(session);
          // 为所有登录用户默认设置teacher角色，确保可以访问功能
          setUserRole("teacher");
        }
      } catch (error) {
        console.error("认证初始化失败:", error);
      } finally {
        setIsAuthReady(true);
      }
    };

    initializeAuth();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("认证状态变化:", event, session);

      if (session) {
        setUser(session.user);
        setSession(session);
        setUserRole("teacher"); // 为所有登录用户设置teacher角色
      } else {
        setUser(null);
        setSession(null);
        setUserRole(null);
      }

      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // 登录流程
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(`登录失败: ${error.message}`);
        return { error };
      }

      toast.success("登录成功");
      return { data };
    } catch (error: any) {
      toast.error(`登录异常: ${error.message}`);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    // 注册流程
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
        toast.success("注册成功");
      } else {
        toast.success("注册成功，请查收验证邮件");
      }

      return { data };
    } catch (error: any) {
      toast.error(`注册异常: ${error.message}`);
      return { error };
    }
  };

  const signOut = async () => {
    // 退出流程
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`退出失败: ${error.message}`);
      } else {
        toast.success("已退出登录");
      }
    } catch (error: any) {
      toast.error(`退出异常: ${error.message}`);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    userRole,
    isAuthReady,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
