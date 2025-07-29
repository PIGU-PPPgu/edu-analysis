/**
 * 组件测试示例 - 展示如何使用统一测试框架测试React组件
 *
 * 本示例涵盖：
 * - 基础组件渲染测试
 * - 交互事件测试
 * - 异步行为测试
 * - Hook测试
 * - Context测试
 * - 快照测试
 */

import React, { useState, useEffect, useContext, createContext } from "react";
import {
  describe,
  it,
  beforeEach,
  afterEach,
  expect,
  mockFunction,
  spyOn,
} from "../index";
import {
  render,
  renderHook,
  waitFor,
  ComponentAssertions,
  createMockComponent,
} from "../component";

// 示例组件：计数器
const Counter: React.FC<{
  initialValue?: number;
  onIncrement?: (value: number) => void;
  onDecrement?: (value: number) => void;
}> = ({ initialValue = 0, onIncrement, onDecrement }) => {
  const [count, setCount] = useState(initialValue);

  const handleIncrement = () => {
    const newCount = count + 1;
    setCount(newCount);
    onIncrement?.(newCount);
  };

  const handleDecrement = () => {
    const newCount = count - 1;
    setCount(newCount);
    onDecrement?.(newCount);
  };

  return React.createElement(
    "div",
    {
      "data-testid": "counter",
    },
    [
      React.createElement(
        "span",
        {
          "data-testid": "counter-value",
          key: "value",
        },
        count.toString()
      ),
      React.createElement(
        "button",
        {
          "data-testid": "increment-button",
          onClick: handleIncrement,
          key: "increment",
        },
        "+"
      ),
      React.createElement(
        "button",
        {
          "data-testid": "decrement-button",
          onClick: handleDecrement,
          key: "decrement",
        },
        "-"
      ),
    ]
  );
};

// 示例组件：异步数据获取
const DataFetcher: React.FC<{
  url: string;
  onLoad?: (data: any) => void;
  onError?: (error: Error) => void;
}> = ({ url, onLoad, onError }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 模拟异步请求
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (cancelled) return;

        const mockData = { message: `Data from ${url}`, timestamp: Date.now() };
        setData(mockData);
        onLoad?.(mockData);
      } catch (err) {
        if (cancelled) return;

        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url, onLoad, onError]);

  if (loading) {
    return React.createElement(
      "div",
      {
        "data-testid": "loading",
      },
      "Loading..."
    );
  }

  if (error) {
    return React.createElement(
      "div",
      {
        "data-testid": "error",
      },
      `Error: ${error}`
    );
  }

  return React.createElement(
    "div",
    {
      "data-testid": "data",
    },
    data ? JSON.stringify(data) : "No data"
  );
};

// 示例Context
const ThemeContext = createContext<{
  theme: "light" | "dark";
  toggleTheme: () => void;
}>({
  theme: "light",
  toggleTheme: () => {},
});

// 示例组件：使用Context
const ThemedButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
}> = ({ children, onClick }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return React.createElement(
    "button",
    {
      "data-testid": "themed-button",
      "data-theme": theme,
      onClick: onClick || toggleTheme,
      style: {
        backgroundColor: theme === "dark" ? "#333" : "#fff",
        color: theme === "dark" ? "#fff" : "#333",
      },
    },
    children
  );
};

// 示例Hook：使用计数器逻辑
const useCounter = (initialValue: number = 0) => {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount((prev) => prev + 1);
  const decrement = () => setCount((prev) => prev - 1);
  const reset = () => setCount(initialValue);

  return { count, increment, decrement, reset };
};

// 示例Hook：使用本地存储
const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item =
        typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = (newValue: T | ((prev: T) => T)) => {
    try {
      const valueToStore =
        newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);

      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue] as const;
};

// 测试套件开始
describe("组件测试示例", () => {
  let mockOnIncrement: any;
  let mockOnDecrement: any;

  beforeEach(() => {
    // 创建模拟函数
    mockOnIncrement = mockFunction();
    mockOnDecrement = mockFunction();
  });

  afterEach(() => {
    // 清理模拟
  });

  describe("Counter组件测试", () => {
    it("应该正确渲染初始值", () => {
      const { findByTestId } = render(Counter, {
        props: { initialValue: 5 },
      });

      const counterValue = findByTestId("counter-value");
      ComponentAssertions.expectComponentToBeInDocument(counterValue);
      ComponentAssertions.expectComponentToHaveText(counterValue!, "5");
    });

    it("应该响应点击增加按钮", () => {
      const { findByTestId, fireEvent } = render(Counter, {
        props: {
          initialValue: 0,
          onIncrement: mockOnIncrement,
        },
      });

      const incrementButton = findByTestId("increment-button");
      const counterValue = findByTestId("counter-value");

      // 点击增加按钮
      fireEvent.click(incrementButton!);

      // 验证值已更新
      ComponentAssertions.expectComponentToHaveText(counterValue!, "1");

      // 验证回调被调用
      mockOnIncrement.toHaveBeenCalledTimes(1);
      mockOnIncrement.toHaveBeenCalledWith(1);
    });

    it("应该响应点击减少按钮", () => {
      const { findByTestId, fireEvent } = render(Counter, {
        props: {
          initialValue: 2,
          onDecrement: mockOnDecrement,
        },
      });

      const decrementButton = findByTestId("decrement-button");
      const counterValue = findByTestId("counter-value");

      // 点击减少按钮
      fireEvent.click(decrementButton!);

      // 验证值已更新
      ComponentAssertions.expectComponentToHaveText(counterValue!, "1");

      // 验证回调被调用
      mockOnDecrement.toHaveBeenCalledTimes(1);
      mockOnDecrement.toHaveBeenCalledWith(1);
    });

    it("应该支持多次点击", () => {
      const { findByTestId, fireEvent } = render(Counter, {
        props: { initialValue: 0 },
      });

      const incrementButton = findByTestId("increment-button");
      const counterValue = findByTestId("counter-value");

      // 多次点击
      fireEvent.click(incrementButton!);
      fireEvent.click(incrementButton!);
      fireEvent.click(incrementButton!);

      // 验证最终值
      ComponentAssertions.expectComponentToHaveText(counterValue!, "3");
    });
  });

  describe("DataFetcher组件测试", () => {
    let mockOnLoad: any;
    let mockOnError: any;

    beforeEach(() => {
      mockOnLoad = mockFunction();
      mockOnError = mockFunction();
    });

    it("应该显示加载状态", () => {
      const { findByTestId } = render(DataFetcher, {
        props: {
          url: "/api/test",
          onLoad: mockOnLoad,
        },
      });

      const loadingElement = findByTestId("loading");
      ComponentAssertions.expectComponentToBeInDocument(loadingElement);
      ComponentAssertions.expectComponentToHaveText(
        loadingElement!,
        "Loading..."
      );
    });

    it("应该在数据加载后显示数据", async () => {
      const { findByTestId, queryByTestId, waitFor } = render(DataFetcher, {
        props: {
          url: "/api/test",
          onLoad: mockOnLoad,
        },
      });

      // 等待数据加载完成
      await waitFor(() => queryByTestId("data") !== null);

      const dataElement = findByTestId("data");
      ComponentAssertions.expectComponentToBeInDocument(dataElement);

      // 验证数据内容
      const expectedData = expect(dataElement!.textContent).toContain(
        "Data from /api/test"
      );

      // 验证回调被调用
      mockOnLoad.toHaveBeenCalledTimes(1);
    });

    it("应该在URL变化时重新加载数据", async () => {
      const { findByTestId, rerender, waitFor } = render(DataFetcher, {
        props: {
          url: "/api/test1",
          onLoad: mockOnLoad,
        },
      });

      // 等待第一次加载完成
      await waitFor(() => findByTestId("data") !== null);

      // 更改URL并重新渲染
      rerender({
        url: "/api/test2",
        onLoad: mockOnLoad,
      });

      // 等待新数据加载完成
      await waitFor(() => {
        const dataElement = findByTestId("data");
        return dataElement?.textContent?.includes("test2") || false;
      });

      // 验证新数据
      const dataElement = findByTestId("data");
      expect(dataElement!.textContent).toContain("Data from /api/test2");

      // 验证回调被调用两次
      mockOnLoad.toHaveBeenCalledTimes(2);
    });
  });

  describe("ThemedButton组件测试", () => {
    const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
      children,
    }) => {
      const [theme, setTheme] = useState<"light" | "dark">("light");

      const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
      };

      const value = { theme, toggleTheme };

      return React.createElement(ThemeContext.Provider, { value }, children);
    };

    it("应该根据主题显示正确的样式", () => {
      const { findByTestId } = render(ThemedButton, {
        wrapper: ThemeProvider,
        props: {
          children: "Test Button",
        },
      });

      const button = findByTestId("themed-button");
      ComponentAssertions.expectComponentToBeInDocument(button);
      ComponentAssertions.expectComponentToHaveAttribute(
        button!,
        "data-theme",
        "light"
      );
    });

    it("应该在点击时切换主题", () => {
      const { findByTestId, fireEvent } = render(ThemedButton, {
        wrapper: ThemeProvider,
        props: {
          children: "Toggle Theme",
        },
      });

      const button = findByTestId("themed-button");

      // 初始主题应该是light
      ComponentAssertions.expectComponentToHaveAttribute(
        button!,
        "data-theme",
        "light"
      );

      // 点击切换主题
      fireEvent.click(button!);

      // 主题应该变为dark
      ComponentAssertions.expectComponentToHaveAttribute(
        button!,
        "data-theme",
        "dark"
      );
    });

    it("应该支持自定义onClick处理器", () => {
      const mockOnClick = mockFunction();

      const { findByTestId, fireEvent } = render(ThemedButton, {
        wrapper: ThemeProvider,
        props: {
          children: "Custom Button",
          onClick: mockOnClick,
        },
      });

      const button = findByTestId("themed-button");
      fireEvent.click(button!);

      // 验证自定义处理器被调用
      mockOnClick.toHaveBeenCalledTimes(1);
    });
  });

  describe("useCounter Hook测试", () => {
    it("应该返回初始值", () => {
      const { result } = renderHook(() => useCounter(5));

      expect(result.current.count).toBe(5);
      expect(typeof result.current.increment).toBe("function");
      expect(typeof result.current.decrement).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });

    it("应该正确增加计数", () => {
      const { result } = renderHook(() => useCounter(0));

      // 调用increment
      result.current.increment();

      expect(result.current.count).toBe(1);
    });

    it("应该正确减少计数", () => {
      const { result } = renderHook(() => useCounter(2));

      // 调用decrement
      result.current.decrement();

      expect(result.current.count).toBe(1);
    });

    it("应该正确重置计数", () => {
      const { result } = renderHook(() => useCounter(5));

      // 先增加几次
      result.current.increment();
      result.current.increment();
      expect(result.current.count).toBe(7);

      // 重置
      result.current.reset();
      expect(result.current.count).toBe(5);
    });

    it("应该支持重新渲染时更新初始值", () => {
      const { result, rerender } = renderHook(
        ({ initialValue }) => useCounter(initialValue),
        { initialProps: { initialValue: 0 } }
      );

      expect(result.current.count).toBe(0);

      // 重新渲染时不应该重置计数（因为Hook内部状态已建立）
      result.current.increment();
      expect(result.current.count).toBe(1);

      rerender({ initialValue: 10 });
      expect(result.current.count).toBe(1); // 应该保持之前的状态
    });
  });

  describe("useLocalStorage Hook测试", () => {
    const localStorageMock = {
      getItem: mockFunction(),
      setItem: mockFunction(),
      removeItem: mockFunction(),
      clear: mockFunction(),
    };

    beforeEach(() => {
      // 模拟localStorage
      (global as any).localStorage = localStorageMock;
      localStorageMock.getItem.mockReturnValue(null);
    });

    it("应该返回默认值当localStorage为空时", () => {
      const { result } = renderHook(() =>
        useLocalStorage("test-key", "default-value")
      );

      expect(result.current[0]).toBe("default-value");
    });

    it("应该从localStorage读取现有值", () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify("stored-value"));

      const { result } = renderHook(() =>
        useLocalStorage("test-key", "default-value")
      );

      expect(result.current[0]).toBe("stored-value");
      localStorageMock.getItem.toHaveBeenCalledWith("test-key");
    });

    it("应该更新localStorage当值改变时", () => {
      const { result } = renderHook(() =>
        useLocalStorage("test-key", "initial")
      );

      // 更新值
      const [, setValue] = result.current;
      setValue("new-value");

      // 验证localStorage被调用
      localStorageMock.setItem.toHaveBeenCalledWith(
        "test-key",
        JSON.stringify("new-value")
      );
    });

    it("应该支持函数式更新", () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(5));

      const { result } = renderHook(() => useLocalStorage("counter", 0));

      // 使用函数式更新
      const [, setValue] = result.current;
      setValue((prev: number) => prev + 1);

      localStorageMock.setItem.toHaveBeenCalledWith(
        "counter",
        JSON.stringify(6)
      );
    });

    it("应该处理localStorage错误", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const { result } = renderHook(() =>
        useLocalStorage("test-key", "fallback")
      );

      // 应该回退到默认值
      expect(result.current[0]).toBe("fallback");
    });
  });

  describe("快照测试", () => {
    it("Counter组件快照", () => {
      const { container } = render(Counter, {
        props: { initialValue: 0 },
      });

      ComponentAssertions.expectComponentToMatchSnapshot(
        container,
        "counter-initial"
      );
    });

    it("ThemedButton暗色主题快照", () => {
      const DarkThemeProvider: React.FC<{ children: React.ReactNode }> = ({
        children,
      }) => {
        const value = {
          theme: "dark" as const,
          toggleTheme: () => {},
        };
        return React.createElement(ThemeContext.Provider, { value }, children);
      };

      const { container } = render(ThemedButton, {
        wrapper: DarkThemeProvider,
        props: { children: "Dark Button" },
      });

      ComponentAssertions.expectComponentToMatchSnapshot(
        container,
        "themed-button-dark"
      );
    });
  });

  describe("模拟组件测试", () => {
    it("应该创建和使用模拟组件", () => {
      const MockCard = createMockComponent("Card", { title: "Default Title" });

      const { findByTestId } = render(MockCard, {
        props: {
          title: "Test Card",
          content: "Test content",
        },
      });

      const mockCard = findByTestId("mock-card");
      ComponentAssertions.expectComponentToBeInDocument(mockCard);
      ComponentAssertions.expectComponentToHaveText(mockCard!, "Mock Card");
    });
  });

  describe("错误边界测试", () => {
    const ThrowError: React.FC<{ shouldThrow: boolean }> = ({
      shouldThrow,
    }) => {
      if (shouldThrow) {
        throw new Error("Test error");
      }
      return React.createElement("div", {}, "No error");
    };

    it("应该处理组件抛出的错误", () => {
      // 在真实环境中，应该使用错误边界组件包装
      try {
        render(ThrowError, { props: { shouldThrow: true } });
      } catch (error) {
        expect(error.message).toBe("Test error");
      }
    });
  });

  describe("异步测试综合案例", () => {
    it("应该处理复杂的异步交互", async () => {
      const mockApiCall = mockFunction();
      mockApiCall.mockReturnValue(Promise.resolve({ data: "async result" }));

      const AsyncComponent: React.FC = () => {
        const [data, setData] = useState<string | null>(null);
        const [loading, setLoading] = useState(false);

        const handleLoad = async () => {
          setLoading(true);
          try {
            const result = await mockApiCall();
            setData(result.data);
          } catch (error) {
            setData("error");
          } finally {
            setLoading(false);
          }
        };

        return React.createElement(
          "div",
          {},
          [
            React.createElement(
              "button",
              {
                "data-testid": "load-button",
                onClick: handleLoad,
                key: "button",
              },
              "Load"
            ),
            loading &&
              React.createElement(
                "div",
                {
                  "data-testid": "loading",
                  key: "loading",
                },
                "Loading..."
              ),
            data &&
              React.createElement(
                "div",
                {
                  "data-testid": "result",
                  key: "result",
                },
                data
              ),
          ].filter(Boolean)
        );
      };

      const { findByTestId, queryByTestId, fireEvent, waitFor } =
        render(AsyncComponent);

      // 点击加载按钮
      const loadButton = findByTestId("load-button");
      fireEvent.click(loadButton!);

      // 验证加载状态
      await waitFor(() => queryByTestId("loading") !== null);

      // 等待结果显示
      await waitFor(() => queryByTestId("result") !== null);

      // 验证最终结果
      const result = findByTestId("result");
      ComponentAssertions.expectComponentToHaveText(result!, "async result");

      // 验证API被调用
      mockApiCall.toHaveBeenCalledTimes(1);
    });
  });
});
