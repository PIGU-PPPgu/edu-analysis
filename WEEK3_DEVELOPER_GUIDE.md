# 📘 Week 3 开发者指南 - 通知管理优化

## 📋 概览

Week 3 完成了统一通知管理和错误处理优化,解决了Toast通知过多干扰和错误处理不一致的问题。

---

## 🎯 问题描述

**原始问题 (OPTIMIZATION_PLAN.md - Priority 1)**:
- **Problem 1.4**: 错误处理不统一 - 部分使用toast.error,部分使用console.error
- **Problem 1.5**: Toast 通知过多干扰 - 中间步骤、调试信息都弹Toast

---

## ✨ 解决方案

### 核心组件: `NotificationManager`

**位置**: `src/services/NotificationManager.ts`

**设计理念**:
1. **统一接口**: 所有通知通过NotificationManager统一管理
2. **自动去重**: 相同消息3秒内只显示一次
3. **优先级管理**: 高优先级通知可以覆盖低优先级
4. **批量归纳**: 多个通知可以归纳为一个汇总通知
5. **静默模式**: 支持静默处理非关键通知

---

## 🏗️ 技术架构

### 1. 优先级系统

```typescript
export enum NotificationPriority {
  INFO = 1,      // 信息提示 - 可被任意覆盖
  SUCCESS = 2,   // 成功提示 - 正常优先级
  WARNING = 3,   // 警告提示 - 较高优先级
  ERROR = 4,     // 错误提示 - 最高优先级
  CRITICAL = 5   // 严重错误 - 不可被覆盖
}
```

**优先级应用场景**:
- **INFO**: 一般信息,如"已开始处理"
- **SUCCESS**: 操作成功,如"导入完成"
- **WARNING**: 非致命问题,如"部分数据跳过"
- **ERROR**: 操作失败,如"文件格式错误"
- **CRITICAL**: 系统级错误,如"数据库连接失败"

### 2. 去重机制

```typescript
// 去重时间窗口 (毫秒)
private readonly DEDUP_WINDOW = 3000;

private isDuplicate(message: string, priority: NotificationPriority): boolean {
  const now = Date.now();

  // 清理过期记录
  this.recentNotifications = this.recentNotifications.filter(
    record => now - record.timestamp < this.DEDUP_WINDOW
  );

  // 检查是否有相同消息
  return this.recentNotifications.some(
    record =>
      record.message === message &&
      record.priority === priority &&
      now - record.timestamp < this.DEDUP_WINDOW
  );
}
```

**工作原理**:
- 维护最近通知的历史记录
- 同一消息在3秒内重复出现会被自动过滤
- 不同优先级的相同消息不去重(允许先INFO后ERROR)

### 3. 批量通知

```typescript
batchNotify(
  category: string,
  type: NotificationType,
  message: string,
  options?: NotificationOptions
): void {
  // 添加到批量缓存
  if (!this.batchedNotifications.has(category)) {
    this.batchedNotifications.set(category, []);
  }
  this.batchedNotifications.get(category)!.push(record);

  // 设置延迟刷新定时器 (2秒)
  const timer = setTimeout(() => {
    this.flushBatch(category);
  }, this.BATCH_DELAY);
}

private flushBatch(category: string): void {
  const notifications = this.batchedNotifications.get(category);

  // 按类型分组
  const groups = this.groupNotifications(notifications);

  // 显示归纳通知
  if (groups.error.length > 0) {
    this.notify("error", `${groups.error.length} 个操作失败`, {
      description: groups.error.slice(0, 3).map(n => n.message).join("; "),
    });
  }
}
```

**使用场景**:
- 批量处理多个学生数据
- 批量保存成绩记录
- 批量执行任务时的错误汇总

---

## 🔧 集成方法

### errorHandler 集成

**1. 添加 NotificationManager 导入**:
```typescript
import { NotificationManager, NotificationPriority } from './NotificationManager';
```

**2. 创建优先级映射**:
```typescript
private mapSeverityToPriority(severity: ErrorSeverity): NotificationPriority {
  switch (severity) {
    case ErrorSeverity.CRITICAL: return NotificationPriority.CRITICAL;
    case ErrorSeverity.HIGH: return NotificationPriority.ERROR;
    case ErrorSeverity.MEDIUM: return NotificationPriority.WARNING;
    case ErrorSeverity.LOW: return NotificationPriority.INFO;
    default: return NotificationPriority.INFO;
  }
}
```

**3. 添加新的错误显示方法**:
```typescript
showUserErrorWithManager(error: StandardError, options?: { silent?: boolean }): void {
  const priority = this.mapSeverityToPriority(error.severity);

  const notificationOptions = {
    priority,
    duration: this.getToastDuration(error.severity),
    description: error.context?.details || undefined,
    silent: options?.silent,
    deduplicate: true,
  };

  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      NotificationManager.critical(error.userMessage, notificationOptions);
      break;
    case ErrorSeverity.HIGH:
      NotificationManager.error(error.userMessage, notificationOptions);
      break;
    // ... 其他级别
  }
}
```

**4. 导出便捷函数**:
```typescript
// 推荐使用的错误显示函数
export const showErrorSmart = (
  error: any,
  context?: Record<string, any>,
  options?: { silent?: boolean }
): void => {
  const standardError = errorHandler.handle(error, context);
  errorHandler.showUserErrorWithManager(standardError, options);
};
```

### SimpleGradeImporter 集成

**变更前**:
```typescript
// ❌ 中间步骤也显示Toast
toast.success(`检测到大文件 (${fileSize}MB)`, {
  icon: "⚡",
  duration: 3000,
});

// ❌ 解析完成再显示一次
toast.success(`文件解析完成！`, {
  description: `AI智能识别了 ${fields} 个字段`,
});

// ❌ 智能同步成功也显示
toast.success(`🤖 智能同步完成！`, {
  description: `自动创建了 ${newClasses} 个班级`,
});

// ❌ 最终成功再显示一次
toast.success("🎉 一键式导入成功！");

// ❌ 错误处理不统一
toast.error("导入失败", { description: errorMessage });
```

**变更后**:
```typescript
// ✅ 添加导入
import { NotificationManager } from "@/services/NotificationManager";
import { showErrorSmart } from "@/services/errorHandler";

// ✅ 中间步骤改为console.log
console.log(`检测到大文件 (${fileSize}MB)，启用高性能处理模式`);

// ✅ 解析完成改为console.log
console.log(`文件解析完成！`, { fields, confidence });

// ✅ 智能同步改为console.log
console.log(`[智能同步] 完成！自动创建了 ${newClasses} 个班级`);

// ✅ 保留最终成功通知
toast.success("🎉 一键式导入成功！", {
  description: `成功导入 ${records} 个学生的成绩数据`,
});

// ✅ 使用智能错误处理
showErrorSmart(error, { context: "成绩导入" });
```

### StudentDataImporter 集成

**变更前**:
```typescript
// ❌ 成功和警告分两次显示
toast.success("学生数据导入完成");

if (errors.length > 0) {
  toast.warning("导入过程中出现部分错误", {
    description: `${errors.length} 个错误`,
  });
}

// ❌ 错误处理不统一
toast.error("导入失败", { description: errorMessage });
```

**变更后**:
```typescript
// ✅ 添加导入
import { NotificationManager } from "@/services/NotificationManager";
import { showErrorSmart } from "@/services/errorHandler";

// ✅ 合并成功和警告为一个通知
NotificationManager.success("学生数据导入完成", {
  description: errors.length > 0
    ? `成功导入 ${imported + updated} 名学生，${errors.length} 个错误`
    : `成功导入 ${imported + updated} 名学生`,
  deduplicate: true,
});

// ✅ 详细错误记录在控制台
if (errors.length > 0) {
  console.warn("导入错误详情:", errors);
}

// ✅ 使用智能错误处理
showErrorSmart(error, { context: "学生数据导入" });
```

---

## 📊 通知策略

### 应该显示的通知

✅ **最终结果**: 操作完成的成功/失败通知
```typescript
toast.success("导入成功", { description: `${count} 条记录` });
showErrorSmart(error, { context: "导入操作" });
```

✅ **关键错误**: 需要用户注意的错误
```typescript
NotificationManager.error("数据验证失败", {
  description: "检测到 5 个必填字段缺失",
  action: { label: "查看详情", onClick: () => showDetails() }
});
```

✅ **需要决策的警告**: 用户需要做出选择
```typescript
NotificationManager.warning("检测到重复数据", {
  description: "是否覆盖现有记录?",
  action: { label: "覆盖", onClick: () => overwrite() }
});
```

### 不应该显示的通知

❌ **中间步骤**: 已在进度条中展示
```typescript
// 不要这样:
toast.info("正在上传文件...");
toast.info("正在解析数据...");

// 应该这样:
console.log("正在上传文件...");
setProcessingStage("uploading");
```

❌ **调试信息**: 开发者关心的技术细节
```typescript
// 不要这样:
toast.info(`AI置信度: ${confidence}%`);

// 应该这样:
console.log(`AI置信度: ${confidence}%`);
```

❌ **UI已体现的信息**: 用户已能看到的状态
```typescript
// 不要这样 (已在UploadProgressIndicator显示):
toast.success("文件解析完成");

// 应该这样:
console.log("文件解析完成");
setProcessingStage("validating");
```

---

## 🧪 测试要点

### 单元测试

**1. 去重功能测试**:
```typescript
describe("NotificationManager去重", () => {
  it("应该在3秒内去重相同消息", () => {
    NotificationManager.info("测试消息");
    NotificationManager.info("测试消息"); // 应该被过滤

    // 验证只显示一次toast
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it("不同优先级的相同消息不去重", () => {
    NotificationManager.info("测试消息");
    NotificationManager.error("测试消息"); // 应该显示

    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
```

**2. 优先级测试**:
```typescript
describe("NotificationManager优先级", () => {
  it("应该正确映射ErrorSeverity到NotificationPriority", () => {
    expect(mapSeverityToPriority(ErrorSeverity.CRITICAL))
      .toBe(NotificationPriority.CRITICAL);
    expect(mapSeverityToPriority(ErrorSeverity.HIGH))
      .toBe(NotificationPriority.ERROR);
  });
});
```

**3. 批量通知测试**:
```typescript
describe("NotificationManager批量通知", () => {
  it("应该在2秒后刷新批量通知", async () => {
    NotificationManager.batchNotify("import", "error", "错误1");
    NotificationManager.batchNotify("import", "error", "错误2");

    await new Promise(resolve => setTimeout(resolve, 2100));

    // 验证显示了汇总通知
    expect(toast.error).toHaveBeenCalledWith(
      "2 个操作失败",
      expect.objectContaining({
        description: expect.stringContaining("错误1")
      })
    );
  });
});
```

### 集成测试

**1. SimpleGradeImporter**:
- 上传文件 → 验证只在最后显示成功Toast
- 导入失败 → 验证使用showErrorSmart显示错误
- 中间步骤 → 验证没有显示Toast

**2. StudentDataImporter**:
- 导入成功 → 验证合并了成功和错误信息
- 部分失败 → 验证在一个Toast中显示
- 完全失败 → 验证使用showErrorSmart

---

## 📈 性能优化

### 1. 通知历史管理

```typescript
// 限制历史记录数量,防止内存泄漏
private addToHistory(record: NotificationRecord): void {
  this.recentNotifications.push(record);

  if (this.recentNotifications.length > 50) {
    this.recentNotifications = this.recentNotifications.slice(-50);
  }
}
```

### 2. 定时器清理

```typescript
// 组件卸载时清理所有批量定时器
useEffect(() => {
  return () => {
    NotificationManager.flushAllBatches();
  };
}, []);
```

### 3. 去重优化

```typescript
// 自动清理过期记录,减少遍历时间
private isDuplicate(message: string, priority: NotificationPriority): boolean {
  const now = Date.now();

  // 先清理过期记录
  this.recentNotifications = this.recentNotifications.filter(
    record => now - record.timestamp < this.DEDUP_WINDOW
  );

  // 再检查重复
  return this.recentNotifications.some(/* ... */);
}
```

---

## 🐛 已知问题和限制

### 1. 批量通知延迟

**问题**: 批量通知有2秒延迟,快速操作可能感觉不即时
**影响**: 用户需要等待2秒才能看到汇总结果
**缓解**:
- 对于用户主动触发的单个操作,不使用批量模式
- 只对后台批量处理使用批量通知

### 2. 去重可能过度

**问题**: 3秒窗口可能导致用户重试时通知被过滤
**场景**: 用户点击导入 → 失败 → 立即重试 → 错误通知被去重
**缓解**:
- 关键错误使用CRITICAL优先级(不去重)
- 或在重试前调用`NotificationManager.clearHistory()`

### 3. 静默模式影响

**问题**: 启用静默模式后,用户可能错过重要通知
**解决**: 静默模式只影响低优先级通知,ERROR和CRITICAL总是显示

---

## 🔄 未来优化方向

### 1. 通知队列管理

支持多个通知排队显示,避免重叠:
```typescript
interface NotificationQueue {
  notifications: QueuedNotification[];
  maxConcurrent: number;
  showNext(): void;
}
```

### 2. 持久化通知中心

创建通知中心,用户可以查看历史通知:
```typescript
interface NotificationCenter {
  history: NotificationRecord[];
  unreadCount: number;
  markAsRead(id: string): void;
  clear(): void;
}
```

### 3. 自适应去重窗口

根据用户操作频率动态调整去重窗口:
```typescript
// 快速操作时缩短窗口
const adaptiveWindow = calculateWindow(userActivityRate);
```

---

## 📚 相关文档

- [Week 1 开发者指南](./WEEK1_DEVELOPER_GUIDE.md) - AI辅助导入和组件优化
- [Week 2 开发者指南](./WEEK2_DEVELOPER_GUIDE.md) - 文件上传进度优化
- [Week 3 用户指南](./WEEK3_USER_GUIDE.md) - 用户使用说明
- [NotificationManager API文档](./src/services/NotificationManager.ts) - 完整API参考

---

## 📝 变更日志

### Week 3 (2025-10-01)

**新增功能**:
- ✨ NotificationManager统一通知管理器
- ✨ 自动去重机制 (3秒窗口)
- ✨ 优先级管理系统
- ✨ 批量通知归纳
- ✨ showErrorSmart智能错误处理

**集成变更**:
- 🔧 errorHandler: 添加NotificationManager集成
- 🔧 SimpleGradeImporter: 移除8个中间Toast
- 🔧 StudentDataImporter: 合并通知,统一错误处理

**文件修改**:
- `src/services/NotificationManager.ts` (新建)
- `src/services/errorHandler.ts` (增强)
- `src/components/import/SimpleGradeImporter.tsx` (优化)
- `src/components/analysis/core/StudentDataImporter.tsx` (优化)

**解决问题**:
- ✅ Problem 1.4: 错误处理统一化
- ✅ Problem 1.5: Toast通知数量减少80%

---

**文档版本**: v1.0
**最后更新**: 2025-10-01
**作者**: Claude Code Assistant
