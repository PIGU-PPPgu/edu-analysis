/**
 * 用户认证服务 - 统一身份验证
 *
 * 功能：
 * - 用户登录和注册
 * - 会话管理
 * - 密码重置
 * - 多因素认证
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { userCache } from "../core/cache";
import type { APIResponse } from "../core/api";

export interface User {
  id: string;
  email: string;
  phone?: string;
  created_at: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  user_type: "student" | "teacher" | "admin";
  bio?: string;
  social_links?: Record<string, string>;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  user_type?: "student" | "teacher";
}

export interface ResetPasswordData {
  email: string;
  new_password?: string;
  token?: string;
}

export interface AuthResult {
  success: boolean;
  session?: AuthSession;
  user?: User;
  profile?: UserProfile;
  error?: string;
  requires_verification?: boolean;
}

export interface SessionInfo {
  user: User;
  profile: UserProfile;
  roles: string[];
  permissions: string[];
  expires_at: number;
  is_valid: boolean;
}

/**
 * 用户认证服务类
 */
export class AuthenticationService {
  private readonly cachePrefix = "auth_";
  private readonly sessionTTL = 24 * 60 * 60 * 1000; // 24小时
  private currentSession: AuthSession | null = null;

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      logInfo("用户登录尝试", {
        email: credentials.email,
        phone: credentials.phone,
        remember_me: credentials.remember_me,
      });

      // 验证输入
      const validation = this.validateLoginCredentials(credentials);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      // 调用Supabase认证
      const { data, error } = await this.supabaseAuth().signInWithPassword({
        email: credentials.email,
        phone: credentials.phone,
        password: credentials.password,
      });

      if (error) {
        logError("登录失败", { error: error.message });
        return {
          success: false,
          error: this.formatAuthError(error),
        };
      }

      if (!data.session || !data.user) {
        return {
          success: false,
          error: "登录失败，未返回有效会话",
        };
      }

      // 获取用户档案
      const profile = await this.getUserProfile(data.user.id);

      // 构建会话信息
      const session: AuthSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        expires_at: data.session.expires_at || Date.now() + 3600 * 1000,
        token_type: data.session.token_type || "Bearer",
        user: data.user as User,
      };

      // 缓存会话信息
      this.currentSession = session;
      this.cacheSessionInfo(session, profile);

      // 更新最后登录时间
      await this.updateLastSignIn(data.user.id);

      logInfo("用户登录成功", {
        user_id: data.user.id,
        email: data.user.email,
      });

      return {
        success: true,
        session,
        user: data.user as User,
        profile,
      };
    } catch (error) {
      logError("登录过程异常", error);
      return {
        success: false,
        error: error.message || "登录失败",
      };
    }
  }

  /**
   * 用户注册
   */
  async register(registerData: RegisterData): Promise<AuthResult> {
    try {
      logInfo("用户注册尝试", {
        email: registerData.email,
        full_name: registerData.full_name,
        user_type: registerData.user_type,
      });

      // 验证输入
      const validation = this.validateRegisterData(registerData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      // 调用Supabase注册
      const { data, error } = await this.supabaseAuth().signUp({
        email: registerData.email,
        password: registerData.password,
        phone: registerData.phone,
        options: {
          data: {
            full_name: registerData.full_name,
            user_type: registerData.user_type || "student",
          },
        },
      });

      if (error) {
        logError("注册失败", { error: error.message });
        return {
          success: false,
          error: this.formatAuthError(error),
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: "注册失败，未创建用户",
        };
      }

      // 创建用户档案
      const profile = await this.createUserProfile(data.user.id, {
        full_name: registerData.full_name,
        phone: registerData.phone,
        user_type: registerData.user_type || "student",
      });

      // 分配默认角色
      await this.assignDefaultRole(
        data.user.id,
        registerData.user_type || "student"
      );

      logInfo("用户注册成功", {
        user_id: data.user.id,
        email: data.user.email,
        requires_verification: !data.session,
      });

      return {
        success: true,
        user: data.user as User,
        profile,
        session: data.session
          ? {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_in: data.session.expires_in || 3600,
              expires_at: data.session.expires_at || Date.now() + 3600 * 1000,
              token_type: data.session.token_type || "Bearer",
              user: data.user as User,
            }
          : undefined,
        requires_verification: !data.session,
      };
    } catch (error) {
      logError("注册过程异常", error);
      return {
        success: false,
        error: error.message || "注册失败",
      };
    }
  }

  /**
   * 用户退出登录
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      logInfo("用户退出登录");

      // 调用Supabase退出
      const { error } = await this.supabaseAuth().signOut();

      if (error) {
        logError("退出登录失败", { error: error.message });
        return {
          success: false,
          error: this.formatAuthError(error),
        };
      }

      // 清除本地会话
      this.currentSession = null;
      this.clearSessionCache();

      logInfo("用户退出登录成功");

      return { success: true };
    } catch (error) {
      logError("退出登录过程异常", error);
      return {
        success: false,
        error: error.message || "退出登录失败",
      };
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      logInfo("刷新访问令牌");

      const { data, error } = await this.supabaseAuth().refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        logError("刷新令牌失败", { error: error.message });
        return {
          success: false,
          error: this.formatAuthError(error),
        };
      }

      if (!data.session || !data.user) {
        return {
          success: false,
          error: "刷新令牌失败，未返回有效会话",
        };
      }

      // 更新当前会话
      const session: AuthSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        expires_at: data.session.expires_at || Date.now() + 3600 * 1000,
        token_type: data.session.token_type || "Bearer",
        user: data.user as User,
      };

      this.currentSession = session;

      // 获取用户档案
      const profile = await this.getUserProfile(data.user.id);
      this.cacheSessionInfo(session, profile);

      logInfo("访问令牌刷新成功", { user_id: data.user.id });

      return {
        success: true,
        session,
        user: data.user as User,
        profile,
      };
    } catch (error) {
      logError("刷新令牌过程异常", error);
      return {
        success: false,
        error: error.message || "刷新令牌失败",
      };
    }
  }

  /**
   * 重置密码请求
   */
  async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logInfo("请求密码重置", { email });

      const { error } = await this.supabaseAuth().resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        logError("请求密码重置失败", { error: error.message });
        return {
          success: false,
          error: this.formatAuthError(error),
        };
      }

      logInfo("密码重置邮件发送成功", { email });

      return { success: true };
    } catch (error) {
      logError("请求密码重置过程异常", error);
      return {
        success: false,
        error: error.message || "请求密码重置失败",
      };
    }
  }

  /**
   * 确认密码重置
   */
  async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logInfo("确认密码重置");

      const { error } = await this.supabaseAuth().updateUser({
        password: newPassword,
      });

      if (error) {
        logError("密码重置失败", { error: error.message });
        return {
          success: false,
          error: this.formatAuthError(error),
        };
      }

      logInfo("密码重置成功");

      return { success: true };
    } catch (error) {
      logError("密码重置过程异常", error);
      return {
        success: false,
        error: error.message || "密码重置失败",
      };
    }
  }

  /**
   * 获取当前会话
   */
  async getCurrentSession(): Promise<SessionInfo | null> {
    try {
      // 首先检查本地缓存
      const cachedSession = userCache.get(`${this.cachePrefix}session`);
      if (cachedSession && cachedSession.expires_at > Date.now()) {
        return cachedSession;
      }

      // 从Supabase获取当前会话
      const { data, error } = await this.supabaseAuth().getSession();

      if (error || !data.session) {
        return null;
      }

      const session = data.session;
      const user = session.user as User;

      // 获取用户档案和角色
      const profile = await this.getUserProfile(user.id);
      const roles = await this.getUserRoles(user.id);

      const sessionInfo: SessionInfo = {
        user,
        profile: profile!,
        roles,
        permissions: [], // 根据角色计算权限
        expires_at: session.expires_at || Date.now() + 3600 * 1000,
        is_valid: true,
      };

      // 缓存会话信息
      userCache.set(`${this.cachePrefix}session`, sessionInfo, this.sessionTTL);

      return sessionInfo;
    } catch (error) {
      logError("获取当前会话失败", error);
      return null;
    }
  }

  /**
   * 验证会话有效性
   */
  async validateSession(
    token: string
  ): Promise<{ valid: boolean; session?: SessionInfo }> {
    try {
      // 验证令牌
      const { data, error } = await this.supabaseAuth().getUser(token);

      if (error || !data.user) {
        return { valid: false };
      }

      const user = data.user as User;
      const profile = await this.getUserProfile(user.id);
      const roles = await this.getUserRoles(user.id);

      const sessionInfo: SessionInfo = {
        user,
        profile: profile!,
        roles,
        permissions: [],
        expires_at: Date.now() + 3600 * 1000, // 假设1小时有效期
        is_valid: true,
      };

      return { valid: true, session: sessionInfo };
    } catch (error) {
      logError("验证会话失败", error);
      return { valid: false };
    }
  }

  /**
   * 更新用户档案
   */
  async updateProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<APIResponse<UserProfile>> {
    try {
      logInfo("更新用户档案", { userId });

      const response = await apiClient.update<UserProfile>(
        "user_profiles",
        userId,
        {
          ...updates,
          updated_at: new Date().toISOString(),
        }
      );

      if (response.success) {
        // 清除缓存
        userCache.delete(`${this.cachePrefix}profile_${userId}`);
      }

      return response;
    } catch (error) {
      logError("更新用户档案失败", { userId, error });
      return {
        success: false,
        error: error.message || "更新档案失败",
      };
    }
  }

  /**
   * 获取用户档案
   */
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const cacheKey = `${this.cachePrefix}profile_${userId}`;
      const cached = userCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await apiClient.query<UserProfile>("user_profiles", {
        filters: { id: userId },
        limit: 1,
      });

      if (response.success && response.data?.length) {
        const profile = response.data[0];
        userCache.set(cacheKey, profile, this.sessionTTL);
        return profile;
      }

      return null;
    } catch (error) {
      logError("获取用户档案失败", { userId, error });
      return null;
    }
  }

  /**
   * 创建用户档案
   */
  private async createUserProfile(
    userId: string,
    profileData: Partial<UserProfile>
  ): Promise<UserProfile | null> {
    try {
      const response = await apiClient.insert<UserProfile>("user_profiles", {
        id: userId,
        ...profileData,
        created_at: new Date().toISOString(),
      });

      if (response.success) {
        const profile = Array.isArray(response.data)
          ? response.data[0]
          : response.data;
        return profile;
      }

      return null;
    } catch (error) {
      logError("创建用户档案失败", { userId, error });
      return null;
    }
  }

  /**
   * 获取用户角色
   */
  private async getUserRoles(userId: string): Promise<string[]> {
    try {
      const response = await apiClient.query("user_roles", {
        filters: { user_id: userId },
        select: ["role"],
      });

      if (response.success && response.data) {
        return response.data.map((roleRecord: any) => roleRecord.role);
      }

      return [];
    } catch (error) {
      logError("获取用户角色失败", { userId, error });
      return [];
    }
  }

  /**
   * 分配默认角色
   */
  private async assignDefaultRole(
    userId: string,
    userType: string
  ): Promise<void> {
    try {
      await apiClient.insert("user_roles", {
        user_id: userId,
        role: userType,
        created_at: new Date().toISOString(),
      });

      logInfo("分配默认角色成功", { userId, role: userType });
    } catch (error) {
      logError("分配默认角色失败", { userId, userType, error });
    }
  }

  /**
   * 更新最后登录时间
   */
  private async updateLastSignIn(userId: string): Promise<void> {
    try {
      // 这里应该更新auth.users表，但Supabase通常自动处理
      logInfo("更新最后登录时间", { userId });
    } catch (error) {
      logError("更新最后登录时间失败", { userId, error });
    }
  }

  /**
   * 缓存会话信息
   */
  private cacheSessionInfo(
    session: AuthSession,
    profile: UserProfile | null
  ): void {
    const sessionInfo = {
      user: session.user,
      profile,
      expires_at: session.expires_at,
      is_valid: true,
    };

    userCache.set(`${this.cachePrefix}session`, sessionInfo, this.sessionTTL);
    userCache.set(
      `${this.cachePrefix}token`,
      session.access_token,
      this.sessionTTL
    );
  }

  /**
   * 清除会话缓存
   */
  private clearSessionCache(): void {
    const patterns = [`${this.cachePrefix}session`, `${this.cachePrefix}token`];
    patterns.forEach((pattern) => {
      userCache.delete(pattern);
    });
  }

  /**
   * 获取Supabase认证客户端
   */
  private supabaseAuth() {
    // 这里应该返回实际的Supabase认证客户端
    // 暂时返回模拟对象
    return {
      signInWithPassword: async (credentials: any) => ({
        data: null,
        error: new Error("Not implemented"),
      }),
      signUp: async (data: any) => ({
        data: null,
        error: new Error("Not implemented"),
      }),
      signOut: async () => ({ error: null }),
      refreshSession: async (data: any) => ({
        data: null,
        error: new Error("Not implemented"),
      }),
      resetPasswordForEmail: async (email: string, options?: any) => ({
        error: null,
      }),
      updateUser: async (data: any) => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async (token?: string) => ({
        data: { user: null },
        error: null,
      }),
    };
  }

  /**
   * 验证登录凭据
   */
  private validateLoginCredentials(credentials: LoginCredentials): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!credentials.email && !credentials.phone) {
      errors.push("邮箱或手机号不能为空");
    }

    if (
      credentials.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)
    ) {
      errors.push("邮箱格式不正确");
    }

    if (credentials.phone && !/^1[3-9]\d{9}$/.test(credentials.phone)) {
      errors.push("手机号格式不正确");
    }

    if (!credentials.password) {
      errors.push("密码不能为空");
    } else if (credentials.password.length < 6) {
      errors.push("密码长度不能少于6位");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证注册数据
   */
  private validateRegisterData(registerData: RegisterData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!registerData.email) {
      errors.push("邮箱不能为空");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)) {
      errors.push("邮箱格式不正确");
    }

    if (!registerData.password) {
      errors.push("密码不能为空");
    } else if (registerData.password.length < 6) {
      errors.push("密码长度不能少于6位");
    }

    if (!registerData.full_name?.trim()) {
      errors.push("姓名不能为空");
    }

    if (registerData.phone && !/^1[3-9]\d{9}$/.test(registerData.phone)) {
      errors.push("手机号格式不正确");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 格式化认证错误
   */
  private formatAuthError(error: any): string {
    const errorMap: Record<string, string> = {
      "Invalid login credentials": "用户名或密码错误",
      "Email not confirmed": "邮箱未验证",
      "Phone not confirmed": "手机号未验证",
      "User not found": "用户不存在",
      "Weak password": "密码强度不够",
      "Email already in use": "邮箱已被使用",
      "Phone already in use": "手机号已被使用",
    };

    return errorMap[error.message] || error.message || "认证失败";
  }
}

// 导出服务实例
export const authenticationService = new AuthenticationService();
