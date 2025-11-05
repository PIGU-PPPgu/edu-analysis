/**
 * 全局错误处理工具
 */

import { toast } from "sonner";
import { configureLowResourceMode } from "@/config/networkConfig";

/**
 * 初始化全局错误处理程序
 */
export const initGlobalErrorHandlers = (): void => {
  // 设置全局未捕获异常处理器
  window.addEventListener("error", (event) => {
    // 忽略ResizeObserver错误，这是浏览器的常见错误，不影响功能
    const errorMessage = (
      event.error?.message ||
      event.message ||
      ""
    ).toLowerCase();
    if (
      errorMessage.includes("resizeobserver loop completed") ||
      errorMessage.includes("resizeobserver loop limit exceeded")
    ) {
      return false;
    }

    console.error("全局错误:", event.error || event.message);

    const errorStack = (event.error?.stack || "").toLowerCase();

    // 检查是否是资源不足错误
    if (
      errorMessage.includes("insufficient resources") ||
      errorStack.includes("err_insufficient_resources") ||
      errorMessage.includes("failed to fetch")
    ) {
      handleResourceError();
    }

    // 防止在开发环境中吞掉错误
    return false;
  });

  // 设置Promise未捕获错误处理器
  window.addEventListener("unhandledrejection", (event) => {
    console.error("未处理的Promise错误:", event.reason);

    // 检测特定错误
    const errorMessage = (event.reason?.message || "").toLowerCase();
    const errorStack = (event.reason?.stack || "").toLowerCase();

    // 检查是否是资源不足错误
    if (
      errorMessage.includes("insufficient resources") ||
      errorStack.includes("err_insufficient_resources") ||
      errorMessage.includes("failed to fetch")
    ) {
      handleResourceError();
    }

    // 防止在开发环境中吞掉错误
    return false;
  });
};

// 资源不足错误计数器
let resourceErrorCount = 0;
let lastResourceErrorTime = 0;

/**
 * 处理资源不足错误
 */
const handleResourceError = (): void => {
  const now = Date.now();

  // 如果10秒内出现3次以上资源错误，启用低资源模式
  if (now - lastResourceErrorTime < 10000) {
    resourceErrorCount++;
  } else {
    resourceErrorCount = 1;
  }

  lastResourceErrorTime = now;

  // 如果错误频繁，启用低资源模式并通知用户
  if (resourceErrorCount >= 3) {
    configureLowResourceMode(true);

    toast.error("浏览器资源不足", {
      description:
        "已启用低资源模式，降低请求数量。请关闭其他标签页或刷新页面。",
      duration: 5000,
    });

    // 重置计数器以避免重复通知
    resourceErrorCount = 0;
  }
};

/**
 * 检查是否有足够资源运行页面
 * @returns 资源够用返回true，否则返回false
 */
export const checkBrowserResources = (): boolean => {
  try {
    // 检查内存使用情况(如果浏览器支持)
    if (performance && "memory" in performance) {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        console.warn("内存使用已接近上限", {
          used: Math.round(memory.usedJSHeapSize / (1024 * 1024)) + "MB",
          limit: Math.round(memory.jsHeapSizeLimit / (1024 * 1024)) + "MB",
        });
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error("检查浏览器资源时出错", e);
    return true; // 无法检查时假设资源足够
  }
};

/**
 * 自动减少页面上的动画和复杂效果
 * 在资源受限的情况下调用此方法
 */
export const reduceBrowserWorkload = (): void => {
  // 设置一个类名到body上，CSS可以据此减少动画
  document.body.classList.add("reduce-animations");

  // 查找并禁用非必要的动画元素
  const animatedElements = document.querySelectorAll(
    ".animate-pulse, .animate-spin"
  );
  animatedElements.forEach((el) => {
    el.classList.remove("animate-pulse", "animate-spin");
  });

  console.log("已减少页面动画和特效以节省资源");
};
