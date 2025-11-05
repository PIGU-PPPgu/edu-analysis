/**
 * 🎨 强制主题初始化 - 彻底消除系统主题跟随影响
 */

export const forceThemeInit = () => {
  if (typeof window === "undefined") return;

  // 立即移除可能存在的dark类
  const root = document.documentElement;
  root.classList.remove("dark");

  // 强制添加light类
  root.classList.add("light");

  // 强制设置主题为light，覆盖任何system设置
  localStorage.setItem("app-theme", "light");

  // 🔥 关键修复：移除所有系统主题监听器，防止自动切换
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  if (mediaQuery && mediaQuery.removeEventListener) {
    // 移除可能存在的事件监听器
    const listeners = (mediaQuery as any)._listeners || [];
    listeners.forEach((listener: any) => {
      try {
        mediaQuery.removeEventListener("change", listener);
      } catch (e) {
        // 忽略移除失败
      }
    });
  }

  // 🔒 防止系统主题检测：重写matchMedia方法（仅对主题查询）
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = function (query: string) {
    const result = originalMatchMedia.call(this, query);

    // 如果是系统主题查询，强制返回light模式
    if (query.includes("prefers-color-scheme")) {
      return {
        ...result,
        matches: false, // 强制返回false，表示不是dark模式
        addEventListener: () => {}, // 禁用事件监听
        removeEventListener: () => {}, // 禁用事件移除
        addListener: () => {}, // 兼容旧版本
        removeListener: () => {}, // 兼容旧版本
      };
    }

    return result;
  };

  console.log("🎨 强制初始化亮色主题（系统跟随已禁用）", {
    classList: Array.from(root.classList),
    theme: localStorage.getItem("app-theme"),
    systemDarkMode: originalMatchMedia("(prefers-color-scheme: dark)").matches,
    overriddenResult: false,
  });
};

// 立即执行
forceThemeInit();
