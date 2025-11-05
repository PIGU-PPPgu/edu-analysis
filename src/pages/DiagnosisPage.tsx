import React, { useState, useEffect } from "react";

/**
 * 诊断页面 - 检查前端是否正常工作
 * 用于快速诊断CSS、JavaScript和组件问题
 */
export const DiagnosisPage: React.FC = () => {
  const [testResults, setTestResults] = useState({
    css: false,
    javascript: false,
    components: false,
    tailwind: false,
  });

  useEffect(() => {
    // 检查JavaScript是否正常
    setTestResults((prev) => ({ ...prev, javascript: true }));

    // 检查CSS是否加载
    const testElement = document.createElement("div");
    testElement.className = "hidden";
    document.body.appendChild(testElement);
    const styles = window.getComputedStyle(testElement);
    const cssWorking = styles.display === "none";
    document.body.removeChild(testElement);

    // 检查Tailwind CSS是否工作
    const tailwindTest = document.createElement("div");
    tailwindTest.className = "bg-red-500 text-white p-4";
    document.body.appendChild(tailwindTest);
    const tailwindStyles = window.getComputedStyle(tailwindTest);
    const tailwindWorking =
      tailwindStyles.backgroundColor === "rgb(239, 68, 68)";
    document.body.removeChild(tailwindTest);

    setTestResults((prev) => ({
      ...prev,
      css: cssWorking,
      tailwind: tailwindWorking,
      components: true,
    }));
  }, []);

  const TestCard = ({
    title,
    status,
    description,
  }: {
    title: string;
    status: boolean;
    description: string;
  }) => (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
        backgroundColor: status ? "#f0fdf4" : "#fef2f2",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: status ? "#10b981" : "#ef4444",
          }}
        ></div>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>
          {title}
        </h3>
        <span
          style={{
            fontSize: "14px",
            color: status ? "#10b981" : "#ef4444",
            fontWeight: "bold",
          }}
        >
          {status ? "✅ 正常" : "❌ 异常"}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
        {description}
      </p>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        backgroundColor: "#f9fafb",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            前端诊断工具
          </h1>
          <p style={{ color: "#6b7280", fontSize: "16px", margin: 0 }}>
            检查前端系统各项功能是否正常工作
          </p>
        </div>

        {/* 基础样式测试 */}
        <div
          style={{
            backgroundColor: "white",
            padding: "24px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginBottom: "16px",
              color: "#374151",
            }}
          >
            系统状态检查
          </h2>

          <TestCard
            title="JavaScript 运行时"
            status={testResults.javascript}
            description="检查React和JavaScript是否正常执行"
          />

          <TestCard
            title="CSS 样式系统"
            status={testResults.css}
            description="检查CSS文件是否正确加载"
          />

          <TestCard
            title="Tailwind CSS"
            status={testResults.tailwind}
            description="检查Tailwind CSS工具类是否正常工作"
          />

          <TestCard
            title="React 组件"
            status={testResults.components}
            description="检查React组件是否能正常渲染"
          />
        </div>

        {/* Tailwind 测试 */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">
            Tailwind CSS 测试
          </h2>

          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="px-3 py-2 bg-blue-500 text-white rounded">
                蓝色按钮
              </div>
              <div className="px-3 py-2 bg-green-500 text-white rounded">
                绿色按钮
              </div>
              <div className="px-3 py-2 bg-red-500 text-white rounded">
                红色按钮
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold text-gray-800">网格项目 1</h3>
                <p className="text-sm text-gray-600">测试网格布局</p>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold text-gray-800">网格项目 2</h3>
                <p className="text-sm text-gray-600">测试响应式布局</p>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold text-gray-800">网格项目 3</h3>
                <p className="text-sm text-gray-600">测试间距和颜色</p>
              </div>
            </div>
          </div>
        </div>

        {/* 问题诊断 */}
        <div
          style={{
            backgroundColor: "white",
            padding: "24px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginBottom: "16px",
              color: "#374151",
            }}
          >
            问题诊断和解决方案
          </h2>

          <div
            style={{
              backgroundColor: "#f3f4f6",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#374151",
              }}
            >
              常见问题:
            </h3>
            <ul style={{ paddingLeft: "20px", margin: 0, color: "#6b7280" }}>
              <li style={{ marginBottom: "4px" }}>
                如果只看到文字没有样式，可能是CSS加载问题
              </li>
              <li style={{ marginBottom: "4px" }}>
                如果页面空白，检查浏览器控制台是否有JavaScript错误
              </li>
              <li style={{ marginBottom: "4px" }}>
                如果Tailwind不工作，检查tailwind.config.ts配置
              </li>
              <li style={{ marginBottom: "4px" }}>
                如果组件异常，检查shadcn/ui组件安装
              </li>
            </ul>
          </div>

          <div
            style={{
              backgroundColor: "#ecfdf5",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #d1fae5",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#065f46",
              }}
            >
              修复建议:
            </h3>
            <ol style={{ paddingLeft: "20px", margin: 0, color: "#047857" }}>
              <li style={{ marginBottom: "4px" }}>
                重新启动开发服务器: <code>npm run dev</code>
              </li>
              <li style={{ marginBottom: "4px" }}>
                清除缓存:{" "}
                <code>
                  rm -rf node_modules package-lock.json && npm install
                </code>
              </li>
              <li style={{ marginBottom: "4px" }}>检查浏览器控制台错误信息</li>
              <li style={{ marginBottom: "4px" }}>确认所有依赖项正确安装</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisPage;
