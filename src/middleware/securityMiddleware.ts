/**
 * 安全中间件 - 会话验证、速率限制和安全检查
 *
 * 功能：
 * - JWT令牌验证
 * - 会话有效性检查
 * - API速率限制
 * - 请求安全验证
 */

import { logError, logInfo, logWarn } from "@/utils/logger";
import { authenticationService } from "@/services/auth/authentication";
import { authorizationService } from "@/services/auth/authorization";

export interface SecurityContext {
  userId: string;
  roles: string[];
  permissions: string[];
  sessionValid: boolean;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface SecurityMiddlewareOptions {
  enforceAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  rateLimit?: RateLimitConfig;
  allowAnonymous?: boolean;
}

/**
 * 安全中间件类
 */
export class SecurityMiddleware {
  private rateLimitStore = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private blockedIPs = new Set<string>();
  private sessionCache = new Map<
    string,
    { context: SecurityContext; expires: number }
  >();

  /**
   * 主要中间件函数
   */
  async validateRequest(
    token: string | null,
    options: SecurityMiddlewareOptions = {},
    requestInfo?: {
      ip?: string;
      userAgent?: string;
      path?: string;
      method?: string;
    }
  ): Promise<{
    success: boolean;
    context?: SecurityContext;
    error?: string;
    shouldBlock?: boolean;
  }> {
    try {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 1. IP封锁检查
      if (requestInfo?.ip && this.blockedIPs.has(requestInfo.ip)) {
        logWarn("被封锁IP尝试访问", { ip: requestInfo.ip, requestId });
        return {
          success: false,
          error: "访问被拒绝",
          shouldBlock: true,
        };
      }

      // 2. 速率限制检查
      if (options.rateLimit && requestInfo?.ip) {
        const rateLimitResult = this.checkRateLimit(
          requestInfo.ip,
          options.rateLimit
        );
        if (!rateLimitResult.allowed) {
          logWarn("速率限制触发", {
            ip: requestInfo.ip,
            limit: options.rateLimit.maxRequests,
            window: options.rateLimit.windowMs,
            requestId,
          });

          // 多次触发速率限制时临时封锁IP
          if (rateLimitResult.violations > 10) {
            this.blockIP(requestInfo.ip, 60 * 60 * 1000); // 封锁1小时
          }

          return {
            success: false,
            error: "请求过于频繁，请稍后再试",
            shouldBlock: rateLimitResult.violations > 5,
          };
        }
      }

      // 3. 匿名访问检查
      if (options.allowAnonymous && !token) {
        logInfo("匿名访问", { path: requestInfo?.path, requestId });
        return {
          success: true,
          context: {
            userId: "anonymous",
            roles: ["anonymous"],
            permissions: [],
            sessionValid: false,
            ipAddress: requestInfo?.ip,
            userAgent: requestInfo?.userAgent,
            requestId,
          },
        };
      }

      // 4. 认证检查
      if (!token) {
        if (options.enforceAuth !== false) {
          return {
            success: false,
            error: "未提供认证令牌",
          };
        }
      }

      // 5. 令牌验证和会话检查
      const context = await this.validateSession(
        token!,
        requestInfo,
        requestId
      );
      if (!context) {
        return {
          success: false,
          error: "无效的会话",
        };
      }

      // 6. 角色检查
      if (options.requiredRoles?.length) {
        const hasRole = await authorizationService.hasAnyRole(
          context.userId,
          options.requiredRoles
        );
        if (!hasRole) {
          logWarn("角色权限不足", {
            userId: context.userId,
            requiredRoles: options.requiredRoles,
            userRoles: context.roles,
            requestId,
          });
          return {
            success: false,
            error: "权限不足",
          };
        }
      }

      // 7. 权限检查
      if (options.requiredPermissions?.length) {
        const userPermissions = await authorizationService.getUserPermissions(
          context.userId
        );
        const hasPermissions = options.requiredPermissions.every(
          (permission) =>
            userPermissions.includes(permission) ||
            userPermissions.includes("*")
        );
        if (!hasPermissions) {
          logWarn("权限检查失败", {
            userId: context.userId,
            requiredPermissions: options.requiredPermissions,
            userPermissions,
            requestId,
          });
          return {
            success: false,
            error: "权限不足",
          };
        }
      }

      logInfo("安全验证通过", {
        userId: context.userId,
        roles: context.roles,
        path: requestInfo?.path,
        requestId,
      });

      return {
        success: true,
        context,
      };
    } catch (error) {
      logError("安全中间件异常", { error, options, requestInfo });
      return {
        success: false,
        error: "安全验证失败",
      };
    }
  }

  /**
   * 验证会话
   */
  private async validateSession(
    token: string,
    requestInfo?: any,
    requestId?: string
  ): Promise<SecurityContext | null> {
    try {
      // 检查缓存
      const cached = this.sessionCache.get(token);
      if (cached && cached.expires > Date.now()) {
        return {
          ...cached.context,
          requestId,
          ipAddress: requestInfo?.ip,
          userAgent: requestInfo?.userAgent,
        };
      }

      // 验证令牌
      const sessionResult = await authenticationService.validateSession(token);
      if (!sessionResult.valid || !sessionResult.session) {
        return null;
      }

      const session = sessionResult.session;
      const userRoles = await authorizationService.getUserRoles(
        session.user.id
      );
      const userPermissions = await authorizationService.getUserPermissions(
        session.user.id
      );

      const context: SecurityContext = {
        userId: session.user.id,
        roles: userRoles,
        permissions: userPermissions,
        sessionValid: session.is_valid,
        ipAddress: requestInfo?.ip,
        userAgent: requestInfo?.userAgent,
        requestId,
      };

      // 缓存会话（5分钟）
      this.sessionCache.set(token, {
        context: {
          ...context,
          ipAddress: undefined,
          userAgent: undefined,
          requestId: undefined,
        },
        expires: Date.now() + 5 * 60 * 1000,
      });

      return context;
    } catch (error) {
      logError("会话验证失败", {
        error,
        token: token.substring(0, 10) + "...",
      });
      return null;
    }
  }

  /**
   * 速率限制检查
   */
  private checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): { allowed: boolean; violations: number } {
    const now = Date.now();
    const record = this.rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // 新的时间窗口
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return { allowed: true, violations: 0 };
    }

    record.count++;
    const violations = Math.max(0, record.count - config.maxRequests);

    if (record.count > config.maxRequests) {
      return { allowed: false, violations };
    }

    return { allowed: true, violations: 0 };
  }

  /**
   * 封锁IP
   */
  private blockIP(ip: string, duration: number): void {
    this.blockedIPs.add(ip);
    logWarn("IP被临时封锁", { ip, duration });

    setTimeout(() => {
      this.blockedIPs.delete(ip);
      logInfo("IP封锁解除", { ip });
    }, duration);
  }

  /**
   * 清理过期缓存
   */
  private cleanupCaches(): void {
    const now = Date.now();

    // 清理会话缓存
    for (const [token, cached] of this.sessionCache.entries()) {
      if (cached.expires <= now) {
        this.sessionCache.delete(token);
      }
    }

    // 清理速率限制记录
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (record.resetTime <= now) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * 启动定期清理任务
   */
  startCleanupJob(): void {
    setInterval(
      () => {
        this.cleanupCaches();
      },
      5 * 60 * 1000
    ); // 每5分钟清理一次
  }

  /**
   * 获取安全统计
   */
  getSecurityStats(): {
    activeSessionsCount: number;
    blockedIPsCount: number;
    rateLimitRecordsCount: number;
  } {
    return {
      activeSessionsCount: this.sessionCache.size,
      blockedIPsCount: this.blockedIPs.size,
      rateLimitRecordsCount: this.rateLimitStore.size,
    };
  }

  /**
   * 手动清理指定用户的会话缓存
   */
  invalidateUserSessions(userId: string): void {
    let removedCount = 0;
    for (const [token, cached] of this.sessionCache.entries()) {
      if (cached.context.userId === userId) {
        this.sessionCache.delete(token);
        removedCount++;
      }
    }
    logInfo("清理用户会话缓存", { userId, removedCount });
  }

  /**
   * 解除IP封锁
   */
  unblockIP(ip: string): boolean {
    const wasBlocked = this.blockedIPs.has(ip);
    this.blockedIPs.delete(ip);
    if (wasBlocked) {
      logInfo("手动解除IP封锁", { ip });
    }
    return wasBlocked;
  }
}

// 导出单例实例
export const securityMiddleware = new SecurityMiddleware();

// 启动清理任务
if (typeof window !== "undefined") {
  securityMiddleware.startCleanupJob();
}
