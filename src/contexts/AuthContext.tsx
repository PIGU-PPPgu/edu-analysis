import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { AuthError } from "@supabase/supabase-js";

interface AuthContextType {
  user: any | null;
  userRole: string | null;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<{ error: AuthError } | void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  signIn: async () => ({}),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // 检查初始会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        // 获取用户角色
        fetchUserRole(session.user.id);
      }
    });

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
          fetchUserRole(session.user.id);
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

  async function fetchUserRole(userId: string) {
    try {
      // 从user_roles表查询用户角色
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (!roleError && roleData) {
        setUserRole(roleData.role);
        return;
      }

      // 尝试从学生表查询
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("id", userId)
        .single();

      if (!studentError && studentData) {
        setUserRole("student");
        return;
      }

      setUserRole(null);
    } catch (error) {
      console.error("获取用户角色失败:", error);
      setUserRole(null);
    }
  }

  async function signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    return supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, userRole, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
} 