/**
 * 安全功能Hook - 提供组件级别的安全功能
 *
 * 功能：
 * - 权限检查
 * - 数据保护
 * - 安全验证
 * - 审计日志
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  authorizationService,
  type AuthorizationResult,
} from "@/services/auth/authorization";
import {
  dataProtectionService,
  type DataAccessContext,
} from "@/services/security/dataProtectionService";
import {
  securityMiddleware,
  type SecurityContext,
} from "@/middleware/securityMiddleware";
import { SecurityUtils, type ValidationResult } from "@/utils/securityUtils";
import { logInfo } from "@/utils/logger";

export interface SecurityState {
  isAuthenticated: boolean;
  user: any | null;
  roles: string[];
  permissions: string[];
  loading: boolean;
  securityContext: SecurityContext | null;
}

export interface PermissionCheck {
  resource: string;
  action: string;
  context?: Record<string, any>;
}

export interface DataProtectionOptions {
  resource: string;
  action: string;
  sensitiveFields?: string[];
}

/**
 * 安全功能Hook
 */
export function useSecurity() {
  const { user, isLoading } = useAuth();
  const [securityState, setSecurityState] = useState<SecurityState>({
    isAuthenticated: false,
    user: null,
    roles: [],
    permissions: [],
    loading: true,
    securityContext: null,
  });

  // 初始化安全状态
  useEffect(() => {
    const initializeSecurity = async () => {
      if (isLoading) return;

      if (!user) {
        setSecurityState({
          isAuthenticated: false,
          user: null,
          roles: [],
          permissions: [],
          loading: false,
          securityContext: null,
        });
        return;
      }

      try {
        // 获取用户角色和权限
        const userRoles = await authorizationService.getUserRoles(user.id);
        const userPermissions = await authorizationService.getUserPermissions(
          user.id
        );

        // 创建安全上下文
        const securityContext: SecurityContext = {
          userId: user.id,
          roles: userRoles,
          permissions: userPermissions,
          sessionValid: true,
        };

        setSecurityState({
          isAuthenticated: true,
          user,
          roles: userRoles,
          permissions: userPermissions,
          loading: false,
          securityContext,
        });

        logInfo("安全状态初始化完成", {
          userId: user.id,
          roles: userRoles,
          permissionsCount: userPermissions.length,
        });
      } catch (error) {
        console.error("初始化安全状态失败:", error);
        setSecurityState({
          isAuthenticated: false,
          user: null,
          roles: [],
          permissions: [],
          loading: false,
          securityContext: null,
        });
      }
    };

    initializeSecurity();
  }, [user, isLoading]);

  /**
   * 检查用户是否具有特定权限
   */
  const hasPermission = useCallback(
    async (check: PermissionCheck): Promise<AuthorizationResult> => {
      if (!securityState.securityContext) {
        return {
          allowed: false,
          reason: "用户未认证",
        };
      }

      return await authorizationService.hasPermission(
        securityState.securityContext.userId,
        check.resource,
        check.action,
        check.context
      );
    },
    [securityState.securityContext]
  );

  /**
   * 检查用户是否具有特定角色
   */
  const hasRole = useCallback(
    (roleName: string): boolean => {
      return securityState.roles.includes(roleName);
    },
    [securityState.roles]
  );

  /**
   * 检查用户是否具有任一角色
   */
  const hasAnyRole = useCallback(
    (roleNames: string[]): boolean => {
      return roleNames.some((role) => securityState.roles.includes(role));
    },
    [securityState.roles]
  );

  /**
   * 批量权限检查
   */
  const checkMultiplePermissions = useCallback(
    async (
      checks: PermissionCheck[]
    ): Promise<Record<string, AuthorizationResult>> => {
      if (!securityState.securityContext) {
        const emptyResult: Record<string, AuthorizationResult> = {};
        checks.forEach((check) => {
          emptyResult[`${check.resource}:${check.action}`] = {
            allowed: false,
            reason: "用户未认证",
          };
        });
        return emptyResult;
      }

      return await authorizationService.checkMultiplePermissions(
        securityState.securityContext.userId,
        checks
      );
    },
    [securityState.securityContext]
  );

  /**
   * 处理敏感数据
   */
  const protectData = useCallback(
    async <T>(
      data: T[] | T,
      options: DataProtectionOptions
    ): Promise<T[] | T> => {
      if (!securityState.securityContext) {
        throw new Error("用户未认证，无法处理数据");
      }

      const context: DataAccessContext = {
        userId: securityState.securityContext.userId,
        userRoles: securityState.securityContext.roles,
        resource: options.resource,
        action: options.action,
        sensitiveFields: options.sensitiveFields || [],
      };

      return await dataProtectionService.processDataByPermissions(
        data,
        context
      );
    },
    [securityState.securityContext]
  );

  /**
   * 输入验证
   */
  const validateInput = useCallback(
    (
      input: string,
      options?: {
        maxLength?: number;
        minLength?: number;
        allowHtml?: boolean;
        allowSpecialChars?: boolean;
        pattern?: RegExp;
      }
    ): ValidationResult => {
      return SecurityUtils.validateAndSanitizeInput(input, options);
    },
    []
  );

  /**
   * 邮箱验证
   */
  const validateEmail = useCallback((email: string): ValidationResult => {
    return SecurityUtils.validateEmail(email);
  }, []);

  /**
   * 手机号验证
   */
  const validatePhone = useCallback((phone: string): ValidationResult => {
    return SecurityUtils.validatePhone(phone);
  }, []);

  /**
   * 密码强度验证
   */
  const validatePassword = useCallback((password: string): ValidationResult => {
    return SecurityUtils.validatePassword(password);
  }, []);

  /**
   * 文件验证
   */
  const validateFile = useCallback(
    (
      file: File,
      options?: {
        allowedTypes?: "image" | "document" | "audio" | "video" | "all";
        maxSize?: number;
        minSize?: number;
      }
    ) => {
      return SecurityUtils.validateFile(file, options);
    },
    []
  );

  /**
   * 获取权限报告
   */
  const getPermissionReport = useCallback(async () => {
    if (!securityState.securityContext) {
      return null;
    }

    return await authorizationService.generatePermissionReport(
      securityState.securityContext.userId
    );
  }, [securityState.securityContext]);

  /**
   * 安全的数据获取
   */
  const secureDataFetch = useCallback(
    async <T>(
      fetchFn: () => Promise<T>,
      protection: DataProtectionOptions
    ): Promise<T> => {
      const data = await fetchFn();
      return await protectData(data, protection);
    },
    [protectData]
  );

  // 计算派生状态
  const derivedState = useMemo(
    () => ({
      isAdmin: securityState.roles.includes("admin"),
      isTeacher: securityState.roles.includes("teacher"),
      isStudent: securityState.roles.includes("student"),
      canManageUsers:
        securityState.permissions.includes("users:manage") ||
        securityState.permissions.includes("*"),
      canViewReports:
        securityState.permissions.includes("reports:read") ||
        securityState.permissions.includes("*"),
      canManageGrades:
        securityState.permissions.includes("grades:manage") ||
        securityState.permissions.includes("*"),
    }),
    [securityState.roles, securityState.permissions]
  );

  return {
    // 基本状态
    ...securityState,
    ...derivedState,

    // 权限检查
    hasPermission,
    hasRole,
    hasAnyRole,
    checkMultiplePermissions,

    // 数据保护
    protectData,
    secureDataFetch,

    // 输入验证
    validateInput,
    validateEmail,
    validatePhone,
    validatePassword,
    validateFile,

    // 工具函数
    getPermissionReport,

    // 便捷的权限检查Hook
    usePermissionGuard: (requiredPermissions: PermissionCheck[]) => {
      const [permissions, setPermissions] = useState<
        Record<string, AuthorizationResult>
      >({});
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const checkPermissions = async () => {
          if (!securityState.securityContext) {
            setLoading(false);
            return;
          }

          try {
            const results = await checkMultiplePermissions(requiredPermissions);
            setPermissions(results);
          } catch (error) {
            console.error("权限检查失败:", error);
          } finally {
            setLoading(false);
          }
        };

        checkPermissions();
      }, [securityState.securityContext, requiredPermissions]);

      return { permissions, loading };
    },

    // 角色守卫Hook
    useRoleGuard: (requiredRoles: string[]) => {
      return useMemo(() => {
        return {
          hasRequiredRole: hasAnyRole(requiredRoles),
          missingRoles: requiredRoles.filter(
            (role) => !securityState.roles.includes(role)
          ),
        };
      }, [requiredRoles, securityState.roles]);
    },
  };
}

/**
 * 权限守卫Hook - 简化版本
 */
export function usePermissionGuard(requiredPermissions: PermissionCheck[]) {
  const security = useSecurity();
  return security.usePermissionGuard(requiredPermissions);
}

/**
 * 角色守卫Hook - 简化版本
 */
export function useRoleGuard(requiredRoles: string[]) {
  const security = useSecurity();
  return security.useRoleGuard(requiredRoles);
}
