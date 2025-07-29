# 🧪 统一测试框架

一个全面的、企业级的测试框架，支持单元测试、组件测试、集成测试、性能测试和负载测试。

## 🌟 特性

### 🔧 核心测试框架

- **统一API**: 一致的测试接口和断言语法
- **高级断言**: 丰富的断言方法和自定义匹配器
- **异步支持**: 完整的Promise和async/await支持
- **模拟工具**: 强大的函数模拟和对象存根
- **测试生命周期**: 完整的setup/teardown钩子

### ⚛️ React组件测试

- **组件渲染**: 完整的React组件渲染和测试
- **事件模拟**: 鼠标、键盘、焦点等事件模拟
- **Hook测试**: 专门的React Hook测试支持
- **Context测试**: Provider和Context测试
- **快照测试**: 组件状态快照比较

### 🔗 集成测试

- **API测试**: HTTP请求和响应测试
- **数据库测试**: 数据库迁移、种子数据、事务测试
- **服务集成**: 微服务间通信测试
- **工作流测试**: 端到端业务流程测试

### ⚡ 性能测试

- **基准测试**: 函数执行性能测量
- **负载测试**: 并发和压力测试
- **内存监控**: 内存使用情况分析
- **性能回归**: 历史性能对比
- **吞吐量测试**: 操作频率和响应时间

## 📦 安装和使用

### 基础使用

```typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  mockFunction,
} from "@/utils/testing";

describe("用户服务测试", () => {
  it("应该创建新用户", () => {
    const user = createUser({ name: "Alice", email: "alice@example.com" });

    expect(user.id).toBeDefined();
    expect(user.name).toBe("Alice");
    expect(user.email).toBe("alice@example.com");
  });
});
```

### 组件测试

```typescript
import {
  render,
  ComponentAssertions,
  fireEvent,
} from "@/utils/testing/component";

describe("计数器组件", () => {
  it("应该响应点击事件", () => {
    const { findByTestId, fireEvent } = render(Counter, {
      props: { initialValue: 0 },
    });

    const button = findByTestId("increment-button");
    fireEvent.click(button!);

    const display = findByTestId("counter-display");
    ComponentAssertions.expectComponentToHaveText(display!, "1");
  });
});
```

### 集成测试

```typescript
import {
  createIntegrationTestRunner,
  createTestConfig,
  IntegrationAssertions,
} from "@/utils/testing/integration";

describe("API集成测试", () => {
  let runner: IntegrationTestRunner;

  beforeAll(async () => {
    runner = createIntegrationTestRunner(createTestConfig());
    await runner.setup();
  });

  it("应该创建和检索用户", async () => {
    const apiClient = runner.getAPIClient();

    const createResponse = await apiClient.post("/api/users", {
      name: "Bob",
      email: "bob@example.com",
    });

    IntegrationAssertions.expectAPIResponseStatus(createResponse, 201);

    const getResponse = await apiClient.get(
      `/api/users/${createResponse.data.id}`
    );
    IntegrationAssertions.expectAPIResponseStatus(getResponse, 200);
    expect(getResponse.data.name).toBe("Bob");
  });
});
```

### 性能测试

```typescript
import {
  createPerformanceTester,
  PerformanceAssertions,
  benchmark,
} from "@/utils/testing/performance";

describe("性能测试", () => {
  it("应该在指定时间内完成", async () => {
    const result = await benchmark(
      "数据处理",
      () => {
        return processLargeDataSet(generateTestData(1000));
      },
      { iterations: 100 }
    );

    PerformanceAssertions.expectExecutionTime(result, 50); // 最大50ms
    PerformanceAssertions.expectThroughput(result, 20); // 最少20 ops/sec
  });
});
```

### 负载测试

```typescript
import {
  createLoadTester,
  PerformanceAssertions,
} from "@/utils/testing/performance";

describe("负载测试", () => {
  it("应该处理高并发请求", async () => {
    const loadTester = createLoadTester();

    const result = await loadTester.runLoadTest(
      "API负载测试",
      async () => {
        const response = await fetch("/api/health");
        if (!response.ok) throw new Error("Health check failed");
        return response.json();
      },
      {
        concurrency: 20,
        duration: 10000, // 10秒
        requestsPerSecond: 100,
      }
    );

    PerformanceAssertions.expectErrorRate(result, 5); // 最大5%错误率
    PerformanceAssertions.expectLoadTestResponseTime(result, 100); // P95 < 100ms
  });
});
```

## 🎯 最佳实践

### 1. 测试结构

```typescript
describe("功能模块", () => {
  describe("子功能", () => {
    beforeEach(() => {
      // 每个测试前的设置
    });

    it("应该执行特定行为", () => {
      // 具体测试逻辑
    });
  });
});
```

### 2. 断言风格

```typescript
// 推荐：具体明确的断言
expect(user.email).toBe("alice@example.com");
expect(response.status).toBe(200);
expect(result.data).toHaveLength(3);

// 避免：过于宽泛的断言
expect(result).toBeTruthy();
expect(data).toBeDefined();
```

### 3. 模拟和存根

```typescript
// 创建模拟函数
const mockCallback = mockFunction();
mockCallback.mockReturnValue("mocked result");

// 监听已存在的方法
const spy = spyOn(userService, "findById");
spy.mockImplementation(async (id) => ({ id, name: "Test User" }));

// 测试后清理
afterEach(() => {
  mockCallback.clear();
  spy.restore();
});
```

### 4. 异步测试

```typescript
// 使用async/await
it("应该异步加载数据", async () => {
  const data = await loadUserData(123);
  expect(data.id).toBe(123);
});

// 使用waitFor等待条件
it("应该等待异步更新", async () => {
  const { waitFor, findByTestId } = render(AsyncComponent);

  await waitFor(() => findByTestId("loaded-content") !== null);

  const content = findByTestId("loaded-content");
  expect(content).toBeInTheDocument();
});
```

### 5. 性能测试

```typescript
// 基准测试
const result = await benchmark(
  "算法性能",
  () => {
    return complexAlgorithm(testData);
  },
  {
    iterations: 1000,
    warmupIterations: 100,
  }
);

// 性能回归检测
PerformanceAssertions.expectNoRegression(currentResult, baselineResult, 10);
```

## 📊 测试报告

框架自动生成详细的测试报告：

```
📊 测试执行报告
================

总体统计:
- 测试套件: 12
- 测试用例: 156
- 通过: 152 ✅
- 失败: 4 ❌
- 跳过: 0 ⏭️
- 总耗时: 45.23s

📋 用户服务测试
   通过率: 100% (25/25)
   耗时: 3.45s

📋 组件测试
   通过率: 95.7% (22/23)
   耗时: 8.12s
   ❌ 失败的测试:
      - 异步组件加载: 超时等待数据加载

📋 集成测试
   通过率: 100% (15/15)
   耗时: 28.91s

📋 性能测试
   通过率: 100% (8/8)
   耗时: 4.75s
```

## 🔧 配置选项

### 测试运行器配置

```typescript
const config = {
  timeout: 10000, // 默认超时时间
  parallel: true, // 并行执行
  retries: 2, // 失败重试次数
  setupFilesAfterEnv: [
    // 环境设置文件
    "<rootDir>/src/utils/testing/setup.ts",
  ],
  testEnvironment: "jsdom", // 测试环境
  collectCoverage: true, // 收集覆盖率
  coverageThreshold: {
    // 覆盖率阈值
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### 性能测试配置

```typescript
const performanceConfig = {
  iterations: 1000, // 测试迭代次数
  warmupIterations: 100, // 预热迭代次数
  timeout: 30000, // 总超时时间
  minSampleSize: 10, // 最小样本数
  maxSampleSize: 10000, // 最大样本数
  targetMarginOfError: 0.05, // 目标误差范围
  confidenceLevel: 0.95, // 置信度
  memoryMonitoring: true, // 内存监控
  cpuProfiling: false, // CPU性能分析
};
```

## 🚀 CI/CD 集成

### GitHub Actions

```yaml
name: 测试
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: 安装依赖
        run: npm ci

      - name: 运行测试
        run: npm run test

      - name: 运行集成测试
        run: npm run test:integration

      - name: 运行性能测试
        run: npm run test:performance

      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v1
```

### npm scripts

```json
{
  "scripts": {
    "test": "node -r ts-node/register src/utils/testing/runner.ts",
    "test:unit": "npm run test -- --filter=unit",
    "test:component": "npm run test -- --filter=component",
    "test:integration": "npm run test -- --filter=integration",
    "test:performance": "npm run test -- --filter=performance",
    "test:watch": "npm run test -- --watch",
    "test:coverage": "npm run test -- --coverage",
    "test:ci": "npm run test -- --ci --coverage --watchAll=false"
  }
}
```

## 📚 API 参考

### 核心断言

- `expect(actual).toBe(expected)` - 严格相等断言
- `expect(actual).toEqual(expected)` - 深度相等断言
- `expect(actual).toBeTypeOf(type)` - 类型断言
- `expect(actual).toBeInstanceOf(Class)` - 实例断言
- `expect(actual).toBeDefined()` - 定义断言
- `expect(actual).toBeTruthy()` - 真值断言
- `expect(actual).toContain(item)` - 包含断言
- `expect(actual).toMatch(pattern)` - 模式匹配断言

### 组件测试API

- `render(Component, options)` - 渲染组件
- `fireEvent.click(element)` - 模拟点击事件
- `waitFor(callback, timeout)` - 等待条件满足
- `ComponentAssertions.expectComponentToBeInDocument(element)` - 组件存在断言

### 性能测试API

- `benchmark(name, fn, config)` - 基准测试
- `PerformanceAssertions.expectExecutionTime(result, maxTime)` - 执行时间断言
- `PerformanceAssertions.expectThroughput(result, minOps)` - 吞吐量断言

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

---

**构建高质量的软件需要全面的测试策略。这个统一测试框架为您的项目提供了企业级的测试解决方案。** 🚀
