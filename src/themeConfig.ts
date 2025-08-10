/**
 * 🎨 主题配置 - 应用级主题设置
 */

export interface ThemeConfig {
  // 是否忽略系统主题设置，强制使用指定主题
  ignoreSystemTheme: boolean;

  // 当ignoreSystemTheme为true时，强制使用的主题
  forcedTheme: "light" | "dark";

  // 是否允许用户在设置中更改主题
  allowUserThemeChange: boolean;

  // 是否在控制台显示主题相关日志
  enableThemeLogging: boolean;
}

// 🔒 默认配置：强制使用亮色主题，忽略系统设置
export const defaultThemeConfig: ThemeConfig = {
  ignoreSystemTheme: true,
  forcedTheme: "light",
  allowUserThemeChange: true,
  enableThemeLogging: import.meta.env.DEV,
};

// 应用主题配置管理器
export class ThemeConfigManager {
  private config: ThemeConfig;

  constructor(config: Partial<ThemeConfig> = {}) {
    this.config = { ...defaultThemeConfig, ...config };
  }

  /**
   * 获取应该使用的主题
   */
  getEffectiveTheme(
    userPreference: "light" | "dark" | "system"
  ): "light" | "dark" {
    // 如果配置为忽略系统主题，直接返回强制主题
    if (this.config.ignoreSystemTheme) {
      if (this.config.enableThemeLogging) {
        console.log(
          "🎨 [ThemeConfig] 忽略系统主题，使用强制主题:",
          this.config.forcedTheme
        );
      }
      return this.config.forcedTheme;
    }

    // 否则按照用户偏好处理
    if (userPreference === "system") {
      if (typeof window === "undefined") return "light";
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      return prefersDark ? "dark" : "light";
    }

    return userPreference;
  }

  /**
   * 检查是否应该监听系统主题变化
   */
  shouldListenToSystemTheme(): boolean {
    return !this.config.ignoreSystemTheme;
  }

  /**
   * 获取初始主题设置
   */
  getInitialTheme(): "light" | "dark" | "system" {
    // 如果强制忽略系统主题，直接返回强制主题
    if (this.config.ignoreSystemTheme) {
      return this.config.forcedTheme;
    }

    // 否则从localStorage读取用户设置
    if (typeof window === "undefined") return "light";

    const stored = localStorage.getItem("app-theme");
    if (stored && ["light", "dark", "system"].includes(stored)) {
      return stored as "light" | "dark" | "system";
    }

    return "light";
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ThemeConfig>) {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enableThemeLogging) {
      console.log("🎨 [ThemeConfig] 配置已更新:", this.config);
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ThemeConfig {
    return { ...this.config };
  }
}

// 全局主题配置实例
export const themeConfig = new ThemeConfigManager();
