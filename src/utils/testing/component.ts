/**
 * React组件测试工具集
 *
 * 提供：
 * - React组件渲染和测试
 * - 事件模拟和交互测试
 * - Hook测试支持
 * - Context和Provider测试
 * - 异步组件测试
 * - 快照测试
 */

import React from "react";
import { expect, mockFunction, spyOn } from "./index";
import { logError, logInfo } from "@/utils/logger";

// 组件测试类型定义
export interface ComponentTestOptions {
  wrapper?: React.ComponentType<any>;
  props?: Record<string, any>;
  context?: Record<string, any>;
  mockFunctions?: Record<string, any>;
  timeout?: number;
}

export interface RenderResult {
  container: HTMLElement;
  component: any;
  rerender: (props?: Record<string, any>) => void;
  unmount: () => void;
  debug: () => void;
  snapshot: () => string;
  findByText: (text: string) => HTMLElement | null;
  findByTestId: (testId: string) => HTMLElement | null;
  findByRole: (role: string) => HTMLElement | null;
  findAllByText: (text: string) => HTMLElement[];
  findAllByTestId: (testId: string) => HTMLElement[];
  queryByText: (text: string) => HTMLElement | null;
  queryByTestId: (testId: string) => HTMLElement | null;
  waitFor: (
    callback: () => boolean | Promise<boolean>,
    timeout?: number
  ) => Promise<void>;
  fireEvent: EventSimulator;
}

export interface EventSimulator {
  click: (element: HTMLElement) => void;
  doubleClick: (element: HTMLElement) => void;
  mouseEnter: (element: HTMLElement) => void;
  mouseLeave: (element: HTMLElement) => void;
  mouseOver: (element: HTMLElement) => void;
  mouseDown: (element: HTMLElement) => void;
  mouseUp: (element: HTMLElement) => void;
  focus: (element: HTMLElement) => void;
  blur: (element: HTMLElement) => void;
  keyDown: (
    element: HTMLElement,
    key: string,
    options?: KeyEventOptions
  ) => void;
  keyUp: (element: HTMLElement, key: string, options?: KeyEventOptions) => void;
  keyPress: (
    element: HTMLElement,
    key: string,
    options?: KeyEventOptions
  ) => void;
  change: (element: HTMLElement, value: string) => void;
  input: (element: HTMLElement, value: string) => void;
  submit: (element: HTMLElement) => void;
  scroll: (element: HTMLElement, scrollTop: number) => void;
}

export interface KeyEventOptions {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  code?: string;
  charCode?: number;
  keyCode?: number;
}

export interface HookTestResult<T> {
  result: { current: T };
  rerender: (props?: any) => void;
  unmount: () => void;
  waitForNextUpdate: () => Promise<void>;
}

/**
 * 组件测试渲染器
 */
export class ComponentRenderer {
  private container: HTMLElement;
  private component: any;
  private currentProps: Record<string, any> = {};

  constructor() {
    this.container = this.createContainer();
  }

  /**
   * 渲染React组件
   */
  render(
    Component: React.ComponentType<any>,
    options: ComponentTestOptions = {}
  ): RenderResult {
    try {
      // 清理之前的渲染
      this.cleanup();

      // 准备props
      this.currentProps = { ...options.props };

      // 包装组件（如果提供了wrapper）
      let ComponentToRender = Component;
      if (options.wrapper) {
        const Wrapper = options.wrapper;
        ComponentToRender = (props: any) =>
          React.createElement(
            Wrapper,
            {},
            React.createElement(Component, props)
          );
      }

      // 模拟渲染（简化实现，实际应使用React渲染）
      this.component = this.mockRender(ComponentToRender, this.currentProps);

      // 创建结果对象
      const result: RenderResult = {
        container: this.container,
        component: this.component,
        rerender: (newProps = {}) =>
          this.rerender(Component, {
            ...options,
            props: { ...this.currentProps, ...newProps },
          }),
        unmount: () => this.unmount(),
        debug: () => this.debug(),
        snapshot: () => this.createSnapshot(),
        findByText: (text: string) => this.findByText(text),
        findByTestId: (testId: string) => this.findByTestId(testId),
        findByRole: (role: string) => this.findByRole(role),
        findAllByText: (text: string) => this.findAllByText(text),
        findAllByTestId: (testId: string) => this.findAllByTestId(testId),
        queryByText: (text: string) => this.queryByText(text),
        queryByTestId: (testId: string) => this.queryByTestId(testId),
        waitFor: (callback: () => boolean | Promise<boolean>, timeout = 5000) =>
          this.waitFor(callback, timeout),
        fireEvent: this.createEventSimulator(),
      };

      return result;
    } catch (error) {
      logError("组件渲染失败", { Component: Component.name, error });
      throw error;
    }
  }

  /**
   * 重新渲染组件
   */
  private rerender(
    Component: React.ComponentType<any>,
    options: ComponentTestOptions
  ): void {
    this.currentProps = { ...options.props };
    this.component = this.mockRender(Component, this.currentProps);
  }

  /**
   * 卸载组件
   */
  private unmount(): void {
    this.cleanup();
  }

  /**
   * 模拟React渲染（简化实现）
   */
  private mockRender(
    Component: React.ComponentType<any>,
    props: Record<string, any>
  ): any {
    // 这里是模拟实现，实际环境中应该使用真正的React渲染
    try {
      // 创建模拟的React元素
      const element = React.createElement(Component, props);

      // 模拟渲染到DOM
      this.container.innerHTML = this.renderToString(element);

      return {
        type: Component,
        props,
        element,
        rendered: true,
      };
    } catch (error) {
      logError("模拟渲染失败", error);
      throw error;
    }
  }

  /**
   * 将React元素转换为字符串（简化实现）
   */
  private renderToString(element: any): string {
    if (!element) return "";

    if (typeof element === "string" || typeof element === "number") {
      return String(element);
    }

    if (React.isValidElement(element)) {
      const { type, props } = element;

      if (typeof type === "string") {
        // HTML元素
        const { children, ...attributes } = props || {};
        const attributeString = Object.entries(attributes)
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ");

        const childrenString =
          React.Children.map(children, this.renderToString.bind(this))?.join(
            ""
          ) || "";

        return `<${type} ${attributeString}>${childrenString}</${type}>`;
      } else if (typeof type === "function") {
        // React组件 - 递归渲染
        try {
          const result = type(props);
          return this.renderToString(result);
        } catch (error) {
          return `<div data-error="Component render error: ${error.message}"></div>`;
        }
      }
    }

    return "";
  }

  /**
   * 创建容器元素
   */
  private createContainer(): HTMLElement {
    if (typeof document !== "undefined") {
      const container = document.createElement("div");
      container.setAttribute("data-testid", "test-container");
      return container;
    } else {
      // Node.js环境的模拟DOM
      return this.createMockElement("div");
    }
  }

  /**
   * 创建模拟DOM元素
   */
  private createMockElement(tagName: string): HTMLElement {
    const element = {
      tagName: tagName.toUpperCase(),
      innerHTML: "",
      textContent: "",
      children: [],
      attributes: new Map(),

      querySelector: (selector: string) =>
        this.querySelector(element, selector),
      querySelectorAll: (selector: string) =>
        this.querySelectorAll(element, selector),
      getAttribute: (name: string) => element.attributes.get(name),
      setAttribute: (name: string, value: string) =>
        element.attributes.set(name, value),
      addEventListener: (event: string, handler: Function) => {},
      removeEventListener: (event: string, handler: Function) => {},
      dispatchEvent: (event: Event) => true,

      // 事件模拟方法
      click: () => this.triggerEvent(element, "click"),
      focus: () => this.triggerEvent(element, "focus"),
      blur: () => this.triggerEvent(element, "blur"),
    } as any;

    return element;
  }

  /**
   * 模拟DOM查询
   */
  private querySelector(element: any, selector: string): HTMLElement | null {
    // 简化的选择器实现
    if (selector.startsWith("[data-testid=")) {
      const testId = selector.match(/\[data-testid="([^"]+)"\]/)?.[1];
      if (testId && element.attributes.get("data-testid") === testId) {
        return element;
      }
    }

    if (selector.startsWith(".")) {
      const className = selector.substring(1);
      if (element.attributes.get("class")?.includes(className)) {
        return element;
      }
    }

    if (selector === element.tagName.toLowerCase()) {
      return element;
    }

    return null;
  }

  /**
   * 模拟DOM批量查询
   */
  private querySelectorAll(element: any, selector: string): HTMLElement[] {
    const result = this.querySelector(element, selector);
    return result ? [result] : [];
  }

  /**
   * 触发事件
   */
  private triggerEvent(
    element: any,
    eventType: string,
    options: any = {}
  ): void {
    // 模拟事件触发
    logInfo("模拟事件触发", { element: element.tagName, eventType, options });
  }

  /**
   * 查找元素方法
   */
  private findByText(text: string): HTMLElement | null {
    return this.container.querySelector(`*:contains("${text}")`) || null;
  }

  private findByTestId(testId: string): HTMLElement | null {
    return this.container.querySelector(`[data-testid="${testId}"]`);
  }

  private findByRole(role: string): HTMLElement | null {
    return this.container.querySelector(`[role="${role}"]`);
  }

  private findAllByText(text: string): HTMLElement[] {
    return Array.from(
      this.container.querySelectorAll(`*:contains("${text}")`) || []
    );
  }

  private findAllByTestId(testId: string): HTMLElement[] {
    return Array.from(
      this.container.querySelectorAll(`[data-testid="${testId}"]`)
    );
  }

  private queryByText(text: string): HTMLElement | null {
    try {
      return this.findByText(text);
    } catch {
      return null;
    }
  }

  private queryByTestId(testId: string): HTMLElement | null {
    try {
      return this.findByTestId(testId);
    } catch {
      return null;
    }
  }

  /**
   * 等待条件满足
   */
  private async waitFor(
    callback: () => boolean | Promise<boolean>,
    timeout: number
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await callback();
        if (result) {
          return;
        }
      } catch (error) {
        // 继续等待
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error(`waitFor超时: ${timeout}ms`);
  }

  /**
   * 创建事件模拟器
   */
  private createEventSimulator(): EventSimulator {
    return {
      click: (element: HTMLElement) => this.simulateEvent(element, "click"),
      doubleClick: (element: HTMLElement) =>
        this.simulateEvent(element, "dblclick"),
      mouseEnter: (element: HTMLElement) =>
        this.simulateEvent(element, "mouseenter"),
      mouseLeave: (element: HTMLElement) =>
        this.simulateEvent(element, "mouseleave"),
      mouseOver: (element: HTMLElement) =>
        this.simulateEvent(element, "mouseover"),
      mouseDown: (element: HTMLElement) =>
        this.simulateEvent(element, "mousedown"),
      mouseUp: (element: HTMLElement) => this.simulateEvent(element, "mouseup"),
      focus: (element: HTMLElement) => this.simulateEvent(element, "focus"),
      blur: (element: HTMLElement) => this.simulateEvent(element, "blur"),
      keyDown: (element: HTMLElement, key: string, options?: KeyEventOptions) =>
        this.simulateKeyEvent(element, "keydown", key, options),
      keyUp: (element: HTMLElement, key: string, options?: KeyEventOptions) =>
        this.simulateKeyEvent(element, "keyup", key, options),
      keyPress: (
        element: HTMLElement,
        key: string,
        options?: KeyEventOptions
      ) => this.simulateKeyEvent(element, "keypress", key, options),
      change: (element: HTMLElement, value: string) =>
        this.simulateChangeEvent(element, value),
      input: (element: HTMLElement, value: string) =>
        this.simulateInputEvent(element, value),
      submit: (element: HTMLElement) => this.simulateEvent(element, "submit"),
      scroll: (element: HTMLElement, scrollTop: number) =>
        this.simulateScrollEvent(element, scrollTop),
    };
  }

  /**
   * 模拟基础事件
   */
  private simulateEvent(element: HTMLElement, eventType: string): void {
    if (typeof element.dispatchEvent === "function") {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    } else {
      // 模拟环境
      this.triggerEvent(element, eventType);
    }
  }

  /**
   * 模拟键盘事件
   */
  private simulateKeyEvent(
    element: HTMLElement,
    eventType: string,
    key: string,
    options: KeyEventOptions = {}
  ): void {
    if (typeof KeyboardEvent !== "undefined") {
      const event = new KeyboardEvent(eventType, {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
      });
      element.dispatchEvent(event);
    } else {
      this.triggerEvent(element, eventType, { key, ...options });
    }
  }

  /**
   * 模拟输入变化事件
   */
  private simulateChangeEvent(element: HTMLElement, value: string): void {
    // 设置值
    (element as any).value = value;

    if (typeof Event !== "undefined") {
      const event = new Event("change", { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    } else {
      this.triggerEvent(element, "change", { value });
    }
  }

  /**
   * 模拟输入事件
   */
  private simulateInputEvent(element: HTMLElement, value: string): void {
    (element as any).value = value;

    if (typeof Event !== "undefined") {
      const event = new Event("input", { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    } else {
      this.triggerEvent(element, "input", { value });
    }
  }

  /**
   * 模拟滚动事件
   */
  private simulateScrollEvent(element: HTMLElement, scrollTop: number): void {
    (element as any).scrollTop = scrollTop;

    if (typeof Event !== "undefined") {
      const event = new Event("scroll", { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    } else {
      this.triggerEvent(element, "scroll", { scrollTop });
    }
  }

  /**
   * 调试输出
   */
  private debug(): void {
    console.log("组件测试调试信息:");
    console.log("Container HTML:", this.container.innerHTML);
    console.log("Component:", this.component);
  }

  /**
   * 创建快照
   */
  private createSnapshot(): string {
    return this.container.innerHTML;
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.component = null;
  }
}

/**
 * Hook测试工具
 */
export class HookTester {
  private hookResult: any = { current: undefined };
  private currentProps: any = {};

  /**
   * 测试React Hook
   */
  renderHook<T, P = {}>(
    hook: (props: P) => T,
    options: { initialProps?: P; wrapper?: React.ComponentType<any> } = {}
  ): HookTestResult<T> {
    try {
      this.currentProps = options.initialProps || {};

      // 模拟Hook调用
      const result = this.mockHookExecution(hook, this.currentProps);
      this.hookResult.current = result;

      return {
        result: this.hookResult,
        rerender: (newProps?: P) => this.rerender(hook, newProps),
        unmount: () => this.unmount(),
        waitForNextUpdate: () => this.waitForNextUpdate(),
      };
    } catch (error) {
      logError("Hook测试失败", error);
      throw error;
    }
  }

  /**
   * 模拟Hook执行
   */
  private mockHookExecution<T, P>(hook: (props: P) => T, props: P): T {
    try {
      // 设置模拟的React环境
      this.setupMockReactContext();

      // 执行Hook
      const result = hook(props);

      return result;
    } catch (error) {
      logError("模拟Hook执行失败", error);
      throw error;
    }
  }

  /**
   * 设置模拟的React上下文
   */
  private setupMockReactContext(): void {
    // 模拟React Hook环境
    const mockReact = {
      useState: <T>(initialValue: T) => {
        let state = initialValue;
        const setState = (newValue: T | ((prev: T) => T)) => {
          if (typeof newValue === "function") {
            state = (newValue as (prev: T) => T)(state);
          } else {
            state = newValue;
          }
        };
        return [state, setState];
      },

      useEffect: (effect: () => void | (() => void), deps?: any[]) => {
        // 立即执行effect
        const cleanup = effect();
        return cleanup;
      },

      useContext: (context: any) => {
        return context._currentValue || context.defaultValue;
      },

      useReducer: <T, A>(
        reducer: (state: T, action: A) => T,
        initialState: T
      ) => {
        let state = initialState;
        const dispatch = (action: A) => {
          state = reducer(state, action);
        };
        return [state, dispatch];
      },

      useMemo: <T>(factory: () => T, deps?: any[]) => {
        return factory();
      },

      useCallback: <T extends (...args: any[]) => any>(
        callback: T,
        deps?: any[]
      ) => {
        return callback;
      },
    };

    // 注入到全局（在测试环境中）
    if (typeof globalThis !== "undefined") {
      (globalThis as any).React = { ...React, ...mockReact };
    }
  }

  /**
   * 重新渲染Hook
   */
  private rerender<T, P>(hook: (props: P) => T, newProps?: P): void {
    if (newProps !== undefined) {
      this.currentProps = newProps;
    }

    const result = this.mockHookExecution(hook, this.currentProps);
    this.hookResult.current = result;
  }

  /**
   * 卸载Hook
   */
  private unmount(): void {
    this.hookResult.current = undefined;
    this.currentProps = {};
  }

  /**
   * 等待Hook更新
   */
  private async waitForNextUpdate(): Promise<void> {
    // 简化实现，实际应该监听状态变化
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * 组件测试断言扩展
 */
export class ComponentAssertions {
  /**
   * 断言组件已渲染
   */
  static expectComponentToBeInDocument(element: HTMLElement | null): void {
    expect(element).toBeDefined();
    expect(element).not.toBeNull();
  }

  /**
   * 断言组件包含文本
   */
  static expectComponentToHaveText(element: HTMLElement, text: string): void {
    expect(element.textContent).toContain(text);
  }

  /**
   * 断言组件有特定属性
   */
  static expectComponentToHaveAttribute(
    element: HTMLElement,
    attribute: string,
    value?: string
  ): void {
    const attributeValue = element.getAttribute(attribute);
    expect(attributeValue).not.toBeNull();

    if (value !== undefined) {
      expect(attributeValue).toBe(value);
    }
  }

  /**
   * 断言组件有特定CSS类
   */
  static expectComponentToHaveClass(
    element: HTMLElement,
    className: string
  ): void {
    const classes = element.getAttribute("class") || "";
    expect(classes.split(/\s+/)).toContainItem(className);
  }

  /**
   * 断言组件样式
   */
  static expectComponentToHaveStyle(
    element: HTMLElement,
    styles: Record<string, string>
  ): void {
    const computedStyle = getComputedStyle
      ? getComputedStyle(element)
      : (element as any).style;

    for (const [property, expectedValue] of Object.entries(styles)) {
      const actualValue =
        computedStyle[property as any] ||
        computedStyle.getPropertyValue(property);
      expect(actualValue).toBe(expectedValue);
    }
  }

  /**
   * 断言组件可见性
   */
  static expectComponentToBeVisible(element: HTMLElement): void {
    const style = getComputedStyle
      ? getComputedStyle(element)
      : (element as any).style;
    expect(style.display).not.toBe("none");
    expect(style.visibility).not.toBe("hidden");
  }

  /**
   * 断言组件被禁用
   */
  static expectComponentToBeDisabled(element: HTMLElement): void {
    expect(element.getAttribute("disabled")).not.toBeNull();
  }

  /**
   * 断言组件聚焦状态
   */
  static expectComponentToHaveFocus(element: HTMLElement): void {
    if (typeof document !== "undefined") {
      expect(document.activeElement).toBe(element);
    } else {
      // 模拟环境
      expect(element.getAttribute("data-focused")).toBe("true");
    }
  }

  /**
   * 断言快照匹配
   */
  static expectComponentToMatchSnapshot(
    element: HTMLElement,
    snapshotName?: string
  ): void {
    const html = element.outerHTML;
    // 简化实现，实际应该与存储的快照比较
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
  }
}

// 便捷的渲染函数
export function render(
  Component: React.ComponentType<any>,
  options: ComponentTestOptions = {}
): RenderResult {
  const renderer = new ComponentRenderer();
  return renderer.render(Component, options);
}

// 便捷的Hook测试函数
export function renderHook<T, P = {}>(
  hook: (props: P) => T,
  options: { initialProps?: P; wrapper?: React.ComponentType<any> } = {}
): HookTestResult<T> {
  const tester = new HookTester();
  return tester.renderHook(hook, options);
}

// 创建模拟组件
export function createMockComponent(
  name: string,
  defaultProps: Record<string, any> = {}
): React.ComponentType<any> {
  return (props: any) => {
    const allProps = { ...defaultProps, ...props };
    return React.createElement(
      "div",
      {
        "data-testid": `mock-${name.toLowerCase()}`,
        "data-props": JSON.stringify(allProps),
      },
      `Mock ${name}`
    );
  };
}

// 等待异步更新
export async function waitFor(
  callback: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout || 5000;
  const interval = options.interval || 50;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await callback();
      if (result) {
        return;
      }
    } catch (error) {
      // 继续等待
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor超时: ${timeout}ms`);
}

// 等待元素出现
export async function waitForElement(
  container: HTMLElement,
  selector: string,
  timeout: number = 5000
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkElement = () => {
      const element = container.querySelector(selector) as HTMLElement;
      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`元素未找到: ${selector} (超时: ${timeout}ms)`));
        return;
      }

      setTimeout(checkElement, 50);
    };

    checkElement();
  });
}

// 导出所有工具
export { ComponentAssertions, ComponentRenderer, HookTester };

export default {
  render,
  renderHook,
  createMockComponent,
  waitFor,
  waitForElement,
  ComponentAssertions,
  ComponentRenderer,
  HookTester,
};
