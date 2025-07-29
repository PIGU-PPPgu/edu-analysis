/**
 * 🎨 主题测试组件 - 用于诊断主题问题
 */

import React, { useEffect, useState } from "react";
import { UnifiedAppProvider } from "./contexts/unified/UnifiedAppContext";
import { useTheme } from "./contexts/unified/modules/UIModule";

const ThemeDisplay: React.FC = () => {
  const { theme, actualTheme, isDark, isLight, setTheme } = useTheme();
  const [domTheme, setDomTheme] = useState("unknown");

  useEffect(() => {
    const checkDomTheme = () => {
      const root = document.documentElement;
      const hasDark = root.classList.contains("dark");
      const hasLight = root.classList.contains("light");

      if (hasDark) setDomTheme("dark");
      else if (hasLight) setDomTheme("light");
      else setDomTheme("none");
    };

    checkDomTheme();
    const interval = setInterval(checkDomTheme, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <h2>🎨 主题诊断信息</h2>

      <div style={{ marginBottom: "20px" }}>
        <h3>当前状态:</h3>
        <p>Context主题: {theme}</p>
        <p>实际主题: {actualTheme}</p>
        <p>是否暗色: {isDark ? "是" : "否"}</p>
        <p>是否亮色: {isLight ? "是" : "否"}</p>
        <p>DOM根元素class: {domTheme}</p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>CSS变量测试:</h3>
        <div
          style={{
            backgroundColor: "var(--card)",
            color: "var(--card-foreground)",
            padding: "10px",
            border: "1px solid var(--border)",
            marginBottom: "10px",
          }}
        >
          卡片背景测试 (--card / --card-foreground)
        </div>

        <div
          style={{
            backgroundColor: "var(--secondary)",
            color: "var(--secondary-foreground)",
            padding: "10px",
            border: "1px solid var(--border)",
            marginBottom: "10px",
          }}
        >
          次要背景测试 (--secondary / --secondary-foreground)
        </div>

        <div
          style={{
            backgroundColor: "var(--muted)",
            color: "var(--muted-foreground)",
            padding: "10px",
            border: "1px solid var(--border)",
          }}
        >
          静音背景测试 (--muted / --muted-foreground)
        </div>
      </div>

      <div>
        <h3>主题切换测试:</h3>
        <button
          onClick={() => setTheme("light")}
          style={{
            marginRight: "10px",
            padding: "5px 10px",
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            border: "none",
            borderRadius: "4px",
          }}
        >
          亮色主题
        </button>

        <button
          onClick={() => setTheme("dark")}
          style={{
            marginRight: "10px",
            padding: "5px 10px",
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            border: "none",
            borderRadius: "4px",
          }}
        >
          暗色主题
        </button>

        <button
          onClick={() => setTheme("system")}
          style={{
            padding: "5px 10px",
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            border: "none",
            borderRadius: "4px",
          }}
        >
          跟随系统
        </button>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>计算样式检查:</h3>
        <div id="computed-styles">
          <p>
            背景色:{" "}
            {getComputedStyle(document.documentElement).getPropertyValue(
              "--background"
            )}
          </p>
          <p>
            前景色:{" "}
            {getComputedStyle(document.documentElement).getPropertyValue(
              "--foreground"
            )}
          </p>
          <p>
            卡片背景:{" "}
            {getComputedStyle(document.documentElement).getPropertyValue(
              "--card"
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export const ThemeTest: React.FC = () => {
  return (
    <div>
      <h1>🎨 主题测试页面</h1>

      <UnifiedAppProvider>
        <ThemeDisplay />
      </UnifiedAppProvider>
    </div>
  );
};
