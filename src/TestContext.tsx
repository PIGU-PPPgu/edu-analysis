/**
 * 🧪 Context测试组件 - 用于验证UnifiedAppContext是否正常工作
 */

import React from "react";
import {
  UnifiedAppProvider,
  useUnifiedApp,
} from "./contexts/unified/UnifiedAppContext";

const TestComponent: React.FC = () => {
  try {
    const context = useUnifiedApp();
    return (
      <div
        style={{ padding: "20px", backgroundColor: "#f0f0f0", margin: "20px" }}
      >
        <h2>🧪 Context测试结果</h2>
        <div>
          <p>✅ UnifiedAppContext 正常工作</p>
          <p>版本: {context.state.version}</p>
          <p>构建时间: {context.state.buildTime}</p>
          <p>已初始化: {context.state.initialized ? "是" : "否"}</p>
          <p>认证状态: {context.state.auth.isAuthReady ? "就绪" : "未就绪"}</p>
          <p>主题: {context.state.ui.theme}</p>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div
        style={{ padding: "20px", backgroundColor: "#ffebee", margin: "20px" }}
      >
        <h2>❌ Context测试失败</h2>
        <p>错误信息: {error.message}</p>
      </div>
    );
  }
};

export const ContextTest: React.FC = () => {
  return (
    <div>
      <h1>Context 测试页面</h1>

      {/* 测试在Provider外使用Context */}
      <TestComponent />

      {/* 测试在Provider内使用Context */}
      <UnifiedAppProvider>
        <TestComponent />
      </UnifiedAppProvider>
    </div>
  );
};
