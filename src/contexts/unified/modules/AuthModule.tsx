/**
 * 🔐 认证模块 - UnifiedAppContext
 * 基于现有AuthContext功能，提供现代化的认证状态管理
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AuthModuleState,
  AuthModuleActions,
  AppError,
  LoadingState,
} from "../types";

// ==================== 状态和Action类型 ====================

interface AuthModuleContextType extends AuthModuleState, AuthModuleActions {}

type AuthAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_SESSION"; payload: Session | null }
  | { type: "SET_USER_ROLE"; payload: string | null }
  | { type: "SET_AUTH_READY"; payload: boolean }
  | { type: "SET_LOADING"; payload: Partial<LoadingState> }
  | { type: "SET_ERROR"; payload: AppError | null }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET_STATE" };

// ==================== 初始状态 ====================

const AUTH_REQUEST_TIMEOUT_MS = 8000;

const initialState: AuthModuleState = {
  user: null,
  session: null,
  userRole: null,
  isAuthReady: false,
  loading: {
    isLoading: false,
    operation: undefined,
    progress: 0,
    message: undefined,
  },
  error: null,
};

// ==================== Reducer ====================

function authReducer(
  state: AuthModuleState,
  action: AuthAction
): AuthModuleState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };

    case "SET_SESSION":
      return { ...state, session: action.payload };

    case "SET_USER_ROLE":
      return { ...state, userRole: action.payload };

    case "SET_AUTH_READY":
      return { ...state, isAuthReady: action.payload };

    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, ...action.payload },
      };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "RESET_STATE":
      return { ...initialState };

    default:
      return state;
  }
}

// ==================== Context ====================

const AuthModuleContext = createContext<AuthModuleContextType | undefined>(
  undefined
);

// ==================== Provider ====================

export const AuthModuleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ==================== Helper Functions ====================

  // 角色优先级：admin > teacher > student
  const ROLE_PRIORITY: Record<string, number> = {
    admin: 3,
    teacher: 2,
    student: 1,
  };

  const getSessionWithTimeout = useCallback(async () => {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), AUTH_REQUEST_TIMEOUT_MS)
    );
    const result = await Promise.race([supabase.auth.getSession(), timeout]);

    if (!result) {
      console.warn("getSession: 超时，按未登录状态继续初始化");
      return null;
    }

    return result as Awaited<ReturnType<typeof supabase.auth.getSession>>;
  }, []);

  const fetchUserRole = useCallback(async (userId: string): Promise<string> => {
    // 先从 localStorage 缓存取，避免每次都查 DB
    const cached = localStorage.getItem(`user_role_${userId}`);

    // 5秒超时，防止网络挂起导致 isAuthReady 永远不触发
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 5000)
    );
    const query = supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const result = await Promise.race([query, timeout]);

    if (!result) {
      console.warn("fetchUserRole: 超时，使用缓存角色");
      return cached ?? "teacher";
    }
    const { data, error } = result as Awaited<typeof query>;

    if (error || !data || data.length === 0) {
      return cached ?? "teacher";
    }

    // 取最高权限角色
    const topRole = data.reduce((best, cur) => {
      const bp = ROLE_PRIORITY[best.role] ?? 0;
      const cp = ROLE_PRIORITY[cur.role] ?? 0;
      return cp > bp ? cur : best;
    }, data[0]).role;

    localStorage.setItem(`user_role_${userId}`, topRole);
    return topRole;
  }, []);

  const createAppError = useCallback(
    (
      message: string,
      code?: string,
      recoverable: boolean = true
    ): AppError => ({
      id: `AUTH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      code,
      timestamp: Date.now(),
      module: "auth",
      recoverable,
      retryCount: 0,
    }),
    []
  );

  const setLoading = useCallback((loading: Partial<LoadingState>) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  }, []);

  const setError = useCallback((error: AppError | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
    if (error) {
      toast.error(error.message, {
        description: error.recoverable
          ? "点击重试或稍后再试"
          : "请联系系统管理员",
      });
    }
  }, []);

  // ==================== Actions ====================

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading({
        isLoading: true,
        operation: "signIn",
        message: "正在登录...",
      });

      try {
        // 登录流程
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const appError = createAppError(
            `登录失败: ${error.message}`,
            "SIGN_IN_ERROR"
          );
          setError(appError);
          return { error: appError };
        }

        // 登录成功，状态会通过onAuthStateChange更新
        toast.success("登录成功");
        return { data };
      } catch (error: any) {
        const appError = createAppError(
          `登录异常: ${error.message}`,
          "SIGN_IN_EXCEPTION"
        );
        setError(appError);
        return { error: appError };
      } finally {
        setLoading({ isLoading: false });
      }
    },
    [createAppError, setError, setLoading]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      setLoading({
        isLoading: true,
        operation: "signUp",
        message: "正在注册...",
      });

      try {
        // 注册流程
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          const appError = createAppError(
            `注册失败: ${error.message}`,
            "SIGN_UP_ERROR"
          );
          setError(appError);
          return { error: appError };
        }

        if (data.user && data.session) {
          toast.success("注册成功");
        } else {
          toast.success("注册成功，请查收验证邮件");
        }

        return { data };
      } catch (error: any) {
        const appError = createAppError(
          `注册异常: ${error.message}`,
          "SIGN_UP_EXCEPTION"
        );
        setError(appError);
        return { error: appError };
      } finally {
        setLoading({ isLoading: false });
      }
    },
    [createAppError, setError, setLoading, signIn]
  );

  const signOut = useCallback(async () => {
    setLoading({
      isLoading: true,
      operation: "signOut",
      message: "正在退出...",
    });

    try {
      // 退出流程
      const { error } = await supabase.auth.signOut();
      if (error) {
        const appError = createAppError(
          `退出失败: ${error.message}`,
          "SIGN_OUT_ERROR"
        );
        setError(appError);
      } else {
        toast.success("已退出登录");
      }
    } catch (error: any) {
      const appError = createAppError(
        `退出异常: ${error.message}`,
        "SIGN_OUT_EXCEPTION"
      );
      setError(appError);
    } finally {
      setLoading({ isLoading: false });
    }
  }, [createAppError, setError, setLoading]);

  const refreshAuth = useCallback(async () => {
    setLoading({
      isLoading: true,
      operation: "refresh",
      message: "刷新认证状态...",
    });

    try {
      const sessionResult = await getSessionWithTimeout();

      if (!sessionResult) {
        dispatch({ type: "SET_USER", payload: null });
        dispatch({ type: "SET_SESSION", payload: null });
        dispatch({ type: "SET_USER_ROLE", payload: null });
        return;
      }

      const {
        data: { session },
        error,
      } = sessionResult;

      if (error) {
        const appError = createAppError(
          `刷新认证失败: ${error.message}`,
          "REFRESH_ERROR"
        );
        setError(appError);
      } else if (session) {
        dispatch({ type: "SET_USER", payload: session.user });
        dispatch({ type: "SET_SESSION", payload: session });
        const role = await fetchUserRole(session.user.id);
        dispatch({ type: "SET_USER_ROLE", payload: role });
      }
    } catch (error: any) {
      const appError = createAppError(
        `刷新认证异常: ${error.message}`,
        "REFRESH_EXCEPTION"
      );
      setError(appError);
    } finally {
      setLoading({ isLoading: false });
    }
  }, [
    createAppError,
    fetchUserRole,
    getSessionWithTimeout,
    setError,
    setLoading,
  ]);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  // ==================== 初始化和监听 ====================

  useEffect(() => {
    const initializeAuth = async () => {
      // Supabase认证流程
      try {
        const sessionResult = await getSessionWithTimeout();

        if (!sessionResult) {
          dispatch({ type: "SET_USER", payload: null });
          dispatch({ type: "SET_SESSION", payload: null });
          dispatch({ type: "SET_USER_ROLE", payload: null });
          return;
        }

        const {
          data: { session },
          error,
        } = sessionResult;

        if (error) {
          console.error("获取会话失败:", error);
          const appError = createAppError(
            `获取会话失败: ${error.message}`,
            "SESSION_ERROR"
          );
          setError(appError);
        } else if (session) {
          dispatch({ type: "SET_USER", payload: session.user });
          dispatch({ type: "SET_SESSION", payload: session });
          const role = await fetchUserRole(session.user.id);
          dispatch({ type: "SET_USER_ROLE", payload: role });
        }
      } catch (error: any) {
        console.error("认证初始化失败:", error);
        const appError = createAppError(
          `认证初始化失败: ${error.message}`,
          "INIT_ERROR"
        );
        setError(appError);
      } finally {
        dispatch({ type: "SET_AUTH_READY", payload: true });
      }
    };

    initializeAuth();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("认证状态变化:", event, session);

      if (session) {
        dispatch({ type: "SET_USER", payload: session.user });
        dispatch({ type: "SET_SESSION", payload: session });
        const role = await fetchUserRole(session.user.id);
        dispatch({ type: "SET_USER_ROLE", payload: role });
      } else {
        dispatch({ type: "SET_USER", payload: null });
        dispatch({ type: "SET_SESSION", payload: null });
        dispatch({ type: "SET_USER_ROLE", payload: null });
      }

      dispatch({ type: "SET_AUTH_READY", payload: true });
    });

    return () => subscription.unsubscribe();
  }, [createAppError, getSessionWithTimeout, setError]);

  // ==================== Context Value ====================

  const contextValue: AuthModuleContextType = {
    // State
    ...state,

    // Actions
    signIn,
    signUp,
    signOut,
    refreshAuth,
    clearError,
  };

  return (
    <AuthModuleContext.Provider value={contextValue}>
      {children}
    </AuthModuleContext.Provider>
  );
};

// ==================== Hook ====================

export const useAuthModule = (): AuthModuleContextType => {
  const context = useContext(AuthModuleContext);
  if (!context) {
    // 返回安全的默认值而不是抛出错误
    console.warn(
      "useAuthModule called outside AuthModuleProvider, returning default values"
    );
    return {
      user: null,
      session: null,
      userRole: null,
      isAuthReady: false,
      loading: {
        isLoading: false,
        operation: undefined,
        progress: 0,
        message: undefined,
      },
      error: null,
      signIn: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signOut: async () => {},
      refreshAuth: async () => {},
      clearError: () => {},
    };
  }
  return context;
};

// 便捷的认证状态检查hooks
export const useAuth = () => {
  const { user, session, userRole, isAuthReady } = useAuthModule();
  return {
    user,
    session,
    userRole,
    isAuthenticated: !!user && !!session,
    isAuthReady,
  };
};

export const useAuthActions = () => {
  const { signIn, signUp, signOut, refreshAuth, clearError } = useAuthModule();
  return { signIn, signUp, signOut, refreshAuth, clearError };
};
