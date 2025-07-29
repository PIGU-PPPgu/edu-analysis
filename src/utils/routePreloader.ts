/**
 * 🚀 Master-Frontend: 路由预加载工具
 * 智能预加载用户可能访问的页面，提升用户体验
 */

// 定义预加载策略
interface PreloadStrategy {
  immediate: string[]; // 立即预加载
  onHover: string[]; // 鼠标悬停时预加载
  onIdle: string[]; // 浏览器空闲时预加载
  conditional: { [key: string]: string[] }; // 条件预加载
}

// 基于用户角色的预加载策略
const PRELOAD_STRATEGIES: { [role: string]: PreloadStrategy } = {
  admin: {
    immediate: ["/dashboard", "/grade-analysis"],
    onHover: ["/advanced-analysis", "/student-management", "/class-management"],
    onIdle: ["/warning-analysis", "/ai-settings"],
    conditional: {
      "/dashboard": ["/grade-analysis", "/student-management"],
      "/grade-analysis": ["/advanced-analysis", "/warning-analysis"],
    },
  },
  teacher: {
    immediate: ["/dashboard", "/grade-analysis"],
    onHover: ["/advanced-analysis", "/homework"],
    onIdle: ["/student-management", "/warning-analysis"],
    conditional: {
      "/dashboard": ["/grade-analysis", "/homework"],
      "/grade-analysis": ["/advanced-analysis"],
    },
  },
  student: {
    immediate: ["/dashboard", "/profile"],
    onHover: ["/homework"],
    onIdle: ["/ai-settings"],
    conditional: {
      "/dashboard": ["/homework", "/profile"],
    },
  },
};

class RoutePreloader {
  private preloadedRoutes = new Set<string>();
  private preloadPromises = new Map<string, Promise<any>>();
  private userRole: string = "student";
  private currentRoute: string = "/";

  constructor() {
    this.initializeEventListeners();
  }

  /**
   * 设置用户角色，更新预加载策略
   */
  setUserRole(role: string) {
    this.userRole = role;
    this.executeImmediatePreload();
  }

  /**
   * 更新当前路由，触发条件预加载
   */
  setCurrentRoute(route: string) {
    this.currentRoute = route;
    this.executeConditionalPreload();
  }

  /**
   * 预加载指定路由
   */
  async preloadRoute(route: string): Promise<void> {
    if (this.preloadedRoutes.has(route)) {
      return;
    }

    if (this.preloadPromises.has(route)) {
      return this.preloadPromises.get(route);
    }

    console.log(`🚀 [RoutePreloader] 预加载路由: ${route}`);

    const preloadPromise = this.loadRouteModule(route);
    this.preloadPromises.set(route, preloadPromise);

    try {
      await preloadPromise;
      this.preloadedRoutes.add(route);
      console.log(`✅ [RoutePreloader] 路由预加载完成: ${route}`);
    } catch (error) {
      console.warn(`⚠️ [RoutePreloader] 路由预加载失败: ${route}`, error);
      this.preloadPromises.delete(route);
    }
  }

  /**
   * 根据路由路径动态导入对应模块
   */
  private async loadRouteModule(route: string): Promise<any> {
    const routeModuleMap: { [key: string]: () => Promise<any> } = {
      "/dashboard": () => import("../pages/Index"),
      "/grade-analysis": () => import("../pages/GradeAnalysis"),
      "/advanced-analysis": () => import("../pages/AdvancedAnalysis"),
      "/student-management": () => import("../pages/StudentManagement"),
      "/class-management": () => import("../pages/ClassManagement"),
      "/homework": () => import("../pages/HomeworkManagement"),
      "/warning-analysis": () => import("../pages/WarningAnalysis"),
      "/exam-center": () => import("../components/warning/ExamWarningAnalysis"),
      "/ai-settings": () => import("../pages/AISettings"),
      "/profile": () => import("../pages/ProfilePage"),
      "/student-portrait-management": () => import("../pages/StudentPortraitManagement"),
    };

    const loader = routeModuleMap[route];
    if (!loader) {
      throw new Error(`No module loader found for route: ${route}`);
    }

    return loader();
  }

  /**
   * 执行立即预加载
   */
  private executeImmediatePreload() {
    const strategy = PRELOAD_STRATEGIES[this.userRole];
    if (!strategy) return;

    strategy.immediate.forEach((route) => {
      this.preloadRoute(route);
    });
  }

  /**
   * 执行条件预加载
   */
  private executeConditionalPreload() {
    const strategy = PRELOAD_STRATEGIES[this.userRole];
    if (!strategy?.conditional[this.currentRoute]) return;

    strategy.conditional[this.currentRoute].forEach((route) => {
      this.preloadRoute(route);
    });
  }

  /**
   * 在浏览器空闲时执行预加载
   */
  private executeIdlePreload() {
    const strategy = PRELOAD_STRATEGIES[this.userRole];
    if (!strategy) return;

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        strategy.onIdle.forEach((route) => {
          this.preloadRoute(route);
        });
      });
    } else {
      // 回退方案：使用setTimeout
      setTimeout(() => {
        strategy.onIdle.forEach((route) => {
          this.preloadRoute(route);
        });
      }, 2000);
    }
  }

  /**
   * 初始化事件监听器
   */
  private initializeEventListeners() {
    // 监听链接悬停事件
    document.addEventListener('mouseover', this.handleLinkHover.bind(this));
    
    // 监听页面加载完成
    if (document.readyState === 'complete') {
      this.executeIdlePreload();
    } else {
      window.addEventListener('load', this.executeIdlePreload.bind(this));
    }
  }

  /**
   * 处理链接悬停事件
   */
  private handleLinkHover(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const link = target.closest('a[href]') as HTMLAnchorElement;
    
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) return;

    const strategy = PRELOAD_STRATEGIES[this.userRole];
    if (!strategy?.onHover.includes(href)) return;

    // 防抖：避免频繁悬停触发多次预加载
    clearTimeout((link as any)._preloadTimeout);
    (link as any)._preloadTimeout = setTimeout(() => {
      this.preloadRoute(href);
    }, 150);
  }

  /**
   * 清理预加载缓存
   */
  clearCache() {
    this.preloadedRoutes.clear();
    this.preloadPromises.clear();
    console.log("🧹 [RoutePreloader] 预加载缓存已清理");
  }

  /**
   * 获取预加载统计信息
   */
  getStats() {
    return {
      preloadedCount: this.preloadedRoutes.size,
      pendingCount: this.preloadPromises.size,
      preloadedRoutes: Array.from(this.preloadedRoutes),
      pendingRoutes: Array.from(this.preloadPromises.keys()),
    };
  }
}

// 创建全局实例
export const routePreloader = new RoutePreloader();

// React Hook for easy integration
export const useRoutePreloader = () => {
  return {
    setUserRole: routePreloader.setUserRole.bind(routePreloader),
    setCurrentRoute: routePreloader.setCurrentRoute.bind(routePreloader),
    preloadRoute: routePreloader.preloadRoute.bind(routePreloader),
    clearCache: routePreloader.clearCache.bind(routePreloader),
    getStats: routePreloader.getStats.bind(routePreloader),
  };
};

export default RoutePreloader;