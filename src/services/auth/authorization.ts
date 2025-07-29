/**
 * 用户授权服务 - 权限控制和访问管理
 *
 * 功能：
 * - 角色管理
 * - 权限控制
 * - 资源访问验证
 * - 动态权限分配
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { userCache } from "../core/cache";
import type { APIResponse } from "../core/api";

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
  is_system: boolean;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface AccessContext {
  user_id: string;
  roles: string[];
  permissions: string[];
  resource: string;
  action: string;
  context?: Record<string, any>;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  required_permissions?: string[];
  missing_permissions?: string[];
}

export interface ResourceAccess {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

/**
 * 用户授权服务类
 */
export class AuthorizationService {
  private readonly cachePrefix = "authz_";
  private readonly cacheTTL = 30 * 60 * 1000; // 30分钟

  // 系统预定义角色
  private readonly systemRoles = {
    admin: {
      name: "admin",
      description: "系统管理员",
      permissions: ["*"], // 所有权限
    },
    teacher: {
      name: "teacher",
      description: "教师",
      permissions: [
        "classes:read",
        "classes:manage_own",
        "students:read",
        "students:create",
        "students:update",
        "grades:read",
        "grades:create",
        "grades:update",
        "homework:read",
        "homework:create",
        "homework:update",
        "homework:grade",
        "reports:generate",
      ],
    },
    student: {
      name: "student",
      description: "学生",
      permissions: [
        "profile:read_own",
        "profile:update_own",
        "grades:read_own",
        "homework:read_own",
        "homework:submit",
        "reports:read_own",
      ],
    },
  };

  /**
   * 检查用户是否有特定权限
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<AuthorizationResult> {
    try {
      logInfo("检查用户权限", { userId, resource, action, context });

      // 获取用户角色和权限
      const userPermissions = await this.getUserPermissions(userId);

      // 构建访问上下文
      const accessContext: AccessContext = {
        user_id: userId,
        roles: await this.getUserRoles(userId),
        permissions: userPermissions,
        resource,
        action,
        context,
      };

      // 执行权限检查
      const result = this.evaluatePermission(accessContext);

      logInfo("权限检查结果", {
        userId,
        resource,
        action,
        allowed: result.allowed,
        reason: result.reason,
      });

      return result;
    } catch (error) {
      logError("权限检查失败", { userId, resource, action, error });
      return {
        allowed: false,
        reason: "权限检查异常",
      };
    }
  }

  /**
   * 检查用户是否有特定角色
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);
      return userRoles.includes(roleName);
    } catch (error) {
      logError("角色检查失败", { userId, roleName, error });
      return false;
    }
  }

  /**
   * 检查用户是否有任一角色
   */
  async hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);
      return roleNames.some((role) => userRoles.includes(role));
    } catch (error) {
      logError("多角色检查失败", { userId, roleNames, error });
      return false;
    }
  }

  /**
   * 为用户分配角色
   */
  async assignRole(
    userId: string,
    roleName: string
  ): Promise<APIResponse<UserRole>> {
    try {
      logInfo("分配用户角色", { userId, roleName });

      // 检查角色是否存在
      const roleExists = await this.roleExists(roleName);
      if (!roleExists) {
        return {
          success: false,
          error: "角色不存在",
        };
      }

      // 检查用户是否已有该角色
      const hasRole = await this.hasRole(userId, roleName);
      if (hasRole) {
        return {
          success: false,
          error: "用户已具有该角色",
        };
      }

      // 分配角色
      const response = await apiClient.insert<UserRole>("user_roles", {
        user_id: userId,
        role: roleName,
        created_at: new Date().toISOString(),
      });

      if (response.success) {
        // 清除权限缓存
        this.clearUserPermissionCache(userId);

        logInfo("角色分配成功", { userId, roleName });
      }

      return response;
    } catch (error) {
      logError("分配角色失败", { userId, roleName, error });
      return {
        success: false,
        error: error.message || "分配角色失败",
      };
    }
  }

  /**
   * 移除用户角色
   */
  async removeRole(
    userId: string,
    roleName: string
  ): Promise<APIResponse<boolean>> {
    try {
      logInfo("移除用户角色", { userId, roleName });

      // 删除角色关联
      const response = await apiClient.query("user_roles", {
        filters: {
          user_id: userId,
          role: roleName,
        },
      });

      if (!response.success || !response.data?.length) {
        return {
          success: false,
          error: "用户没有该角色",
        };
      }

      const userRole = response.data[0];
      const deleteResponse = await apiClient.delete("user_roles", userRole.id);

      if (deleteResponse.success) {
        // 清除权限缓存
        this.clearUserPermissionCache(userId);

        logInfo("角色移除成功", { userId, roleName });
      }

      return {
        success: deleteResponse.success,
        error: deleteResponse.error,
        data: deleteResponse.success,
      };
    } catch (error) {
      logError("移除角色失败", { userId, roleName, error });
      return {
        success: false,
        error: error.message || "移除角色失败",
      };
    }
  }

  /**
   * 获取用户所有角色
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const cacheKey = `${this.cachePrefix}user_roles_${userId}`;
      const cached = userCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await apiClient.query<UserRole>("user_roles", {
        filters: { user_id: userId },
        select: ["role"],
      });

      const roles =
        response.success && response.data
          ? response.data.map((ur) => ur.role)
          : [];

      userCache.set(cacheKey, roles, this.cacheTTL);
      return roles;
    } catch (error) {
      logError("获取用户角色失败", { userId, error });
      return [];
    }
  }

  /**
   * 获取用户所有权限
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const cacheKey = `${this.cachePrefix}user_permissions_${userId}`;
      const cached = userCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // 获取用户角色
      const userRoles = await this.getUserRoles(userId);

      // 获取所有角色的权限
      const allPermissions = new Set<string>();

      for (const roleName of userRoles) {
        const rolePermissions = this.getRolePermissions(roleName);
        rolePermissions.forEach((permission) => allPermissions.add(permission));
      }

      const permissions = Array.from(allPermissions);
      userCache.set(cacheKey, permissions, this.cacheTTL);

      return permissions;
    } catch (error) {
      logError("获取用户权限失败", { userId, error });
      return [];
    }
  }

  /**
   * 获取角色权限
   */
  getRolePermissions(roleName: string): string[] {
    const role = this.systemRoles[roleName as keyof typeof this.systemRoles];
    return role ? role.permissions : [];
  }

  /**
   * 获取用户可访问的资源
   */
  async getUserAccessibleResources(userId: string): Promise<ResourceAccess[]> {
    try {
      const permissions = await this.getUserPermissions(userId);
      const resourceMap = new Map<string, Set<string>>();

      // 解析权限，构建资源访问映射
      permissions.forEach((permission) => {
        if (permission === "*") {
          // 超级权限，返回所有资源
          return [{ resource: "*", actions: ["*"] }];
        }

        const [resource, action] = permission.split(":");
        if (resource && action) {
          if (!resourceMap.has(resource)) {
            resourceMap.set(resource, new Set());
          }
          resourceMap.get(resource)!.add(action);
        }
      });

      // 转换为ResourceAccess数组
      return Array.from(resourceMap.entries()).map(([resource, actions]) => ({
        resource,
        actions: Array.from(actions),
      }));
    } catch (error) {
      logError("获取用户可访问资源失败", { userId, error });
      return [];
    }
  }

  /**
   * 创建自定义角色
   */
  async createRole(
    roleData: Omit<Role, "id" | "created_at" | "is_system">
  ): Promise<APIResponse<Role>> {
    try {
      logInfo("创建自定义角色", { name: roleData.name });

      // 验证角色数据
      const validation = this.validateRoleData(roleData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      // 检查角色名称是否重复
      const exists = await this.roleExists(roleData.name);
      if (exists) {
        return {
          success: false,
          error: "角色名称已存在",
        };
      }

      const role: Role = {
        ...roleData,
        id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        is_system: false,
        created_at: new Date().toISOString(),
      };

      // 这里应该保存到数据库，暂时存储在缓存中
      userCache.set(
        `${this.cachePrefix}role_${role.name}`,
        role,
        24 * 60 * 60 * 1000
      );

      logInfo("自定义角色创建成功", { roleId: role.id, name: role.name });

      return { success: true, data: role };
    } catch (error) {
      logError("创建自定义角色失败", error);
      return {
        success: false,
        error: error.message || "创建角色失败",
      };
    }
  }

  /**
   * 批量检查权限
   */
  async checkMultiplePermissions(
    userId: string,
    checks: Array<{
      resource: string;
      action: string;
      context?: Record<string, any>;
    }>
  ): Promise<Record<string, AuthorizationResult>> {
    try {
      const results: Record<string, AuthorizationResult> = {};

      // 获取用户权限一次，避免重复查询
      const userPermissions = await this.getUserPermissions(userId);
      const userRoles = await this.getUserRoles(userId);

      for (const check of checks) {
        const key = `${check.resource}:${check.action}`;

        const accessContext: AccessContext = {
          user_id: userId,
          roles: userRoles,
          permissions: userPermissions,
          resource: check.resource,
          action: check.action,
          context: check.context,
        };

        results[key] = this.evaluatePermission(accessContext);
      }

      return results;
    } catch (error) {
      logError("批量权限检查失败", { userId, error });
      return {};
    }
  }

  /**
   * 生成权限报告
   */
  async generatePermissionReport(userId: string): Promise<{
    user_id: string;
    roles: string[];
    permissions: string[];
    accessible_resources: ResourceAccess[];
    generated_at: string;
  }> {
    try {
      const roles = await this.getUserRoles(userId);
      const permissions = await this.getUserPermissions(userId);
      const accessibleResources = await this.getUserAccessibleResources(userId);

      return {
        user_id: userId,
        roles,
        permissions,
        accessible_resources: accessibleResources,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      logError("生成权限报告失败", { userId, error });
      return {
        user_id: userId,
        roles: [],
        permissions: [],
        accessible_resources: [],
        generated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * 执行权限评估
   */
  private evaluatePermission(context: AccessContext): AuthorizationResult {
    const { permissions, resource, action, user_id } = context;

    // 检查超级权限
    if (permissions.includes("*")) {
      return { allowed: true, reason: "超级管理员权限" };
    }

    // 检查精确权限匹配
    const exactPermission = `${resource}:${action}`;
    if (permissions.includes(exactPermission)) {
      return { allowed: true, reason: "拥有精确权限" };
    }

    // 检查资源通配符权限
    const resourceWildcard = `${resource}:*`;
    if (permissions.includes(resourceWildcard)) {
      return { allowed: true, reason: "拥有资源通配符权限" };
    }

    // 检查自有资源权限
    if (action.endsWith("_own")) {
      const baseAction = action.replace("_own", "");
      const ownPermission = `${resource}:${baseAction}_own`;

      if (permissions.includes(ownPermission)) {
        // 需要验证资源是否属于用户
        const isOwner = this.verifyResourceOwnership(context);
        if (isOwner) {
          return { allowed: true, reason: "拥有自有资源权限" };
        } else {
          return {
            allowed: false,
            reason: "不是资源所有者",
            missing_permissions: [exactPermission],
          };
        }
      }
    }

    // 检查特殊情况权限
    const specialResult = this.evaluateSpecialPermissions(context);
    if (specialResult) {
      return specialResult;
    }

    // 权限不足
    return {
      allowed: false,
      reason: "权限不足",
      required_permissions: [exactPermission],
      missing_permissions: [exactPermission],
    };
  }

  /**
   * 验证资源所有权
   */
  private verifyResourceOwnership(context: AccessContext): boolean {
    // 这里应该根据资源类型和上下文验证所有权
    // 简化实现，实际应用中需要查询数据库

    const { resource, context: ctx, user_id } = context;

    if (!ctx) return false;

    switch (resource) {
      case "profile":
        return ctx.profile_user_id === user_id;
      case "grades":
        return ctx.student_id === user_id;
      case "homework":
        return ctx.student_id === user_id || ctx.created_by === user_id;
      default:
        return false;
    }
  }

  /**
   * 评估特殊权限
   */
  private evaluateSpecialPermissions(
    context: AccessContext
  ): AuthorizationResult | null {
    const { resource, action, roles, context: ctx } = context;

    // 教师可以访问自己班级的学生数据
    if (
      resource === "students" &&
      action === "read" &&
      roles.includes("teacher")
    ) {
      if (ctx?.class_teacher_id === context.user_id) {
        return { allowed: true, reason: "班主任可以访问本班学生数据" };
      }
    }

    // 教师可以管理自己创建的作业
    if (resource === "homework" && roles.includes("teacher")) {
      if (ctx?.created_by === context.user_id) {
        return { allowed: true, reason: "可以管理自己创建的作业" };
      }
    }

    // 学生可以查看自己的成绩和作业
    if (roles.includes("student") && ctx?.student_id === context.user_id) {
      if (
        (resource === "grades" && action === "read") ||
        (resource === "homework" && action === "read")
      ) {
        return { allowed: true, reason: "可以查看自己的数据" };
      }
    }

    return null;
  }

  /**
   * 检查角色是否存在
   */
  private async roleExists(roleName: string): Promise<boolean> {
    // 检查系统角色
    if (this.systemRoles[roleName as keyof typeof this.systemRoles]) {
      return true;
    }

    // 检查自定义角色（从缓存或数据库）
    const cached = userCache.get(`${this.cachePrefix}role_${roleName}`);
    return !!cached;
  }

  /**
   * 验证角色数据
   */
  private validateRoleData(
    roleData: Omit<Role, "id" | "created_at" | "is_system">
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!roleData.name?.trim()) {
      errors.push("角色名称不能为空");
    }

    if (roleData.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(roleData.name)) {
      errors.push("角色名称只能包含字母、数字和下划线，且不能以数字开头");
    }

    if (this.systemRoles[roleData.name as keyof typeof this.systemRoles]) {
      errors.push("不能使用系统保留的角色名称");
    }

    if (!roleData.permissions || roleData.permissions.length === 0) {
      errors.push("角色必须至少包含一个权限");
    }

    // 验证权限格式
    if (roleData.permissions) {
      for (const permission of roleData.permissions) {
        if (permission !== "*" && !permission.includes(":")) {
          errors.push(
            `权限格式错误: ${permission}（应为 resource:action 格式）`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 清除用户权限缓存
   */
  private clearUserPermissionCache(userId: string): void {
    const patterns = [
      `${this.cachePrefix}user_roles_${userId}`,
      `${this.cachePrefix}user_permissions_${userId}`,
    ];

    patterns.forEach((pattern) => {
      userCache.delete(pattern);
    });

    logInfo("清除用户权限缓存", { userId });
  }
}

// 导出服务实例
export const authorizationService = new AuthorizationService();
