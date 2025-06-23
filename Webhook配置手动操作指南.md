# Webhook节点配置 - 手动操作指南

## 🎯 目标
修复Webhook节点的"Respond"参数配置，解决"Webhook node not correctly configured"错误。

## 📋 操作步骤

### 步骤1：打开n8n工作流
1. 在浏览器中访问：`http://localhost:5678`
2. 点击"My workflow"工作流
3. 确保您看到工作流的6个节点

### 步骤2：打开Webhook节点配置
1. **找到"POST Webhook"节点**（工作流最左边的第一个节点）
2. **双击该节点**打开配置面板
   - 如果双击不行，可以右键点击 → 选择"Open"
   - 或者单击节点，然后按Enter键

### 步骤3：修改Respond参数
在打开的配置面板中：

1. **找到"Respond"字段**
   - 这个字段可能在配置面板的中间或底部
   - 字段标签显示为"Respond"

2. **当前设置可能是**：
   - "Immediately" 
   - 或者未设置（空白）

3. **将其改为**：
   - 点击下拉菜单
   - 选择：**"Using Respond to Webhook Node"**

### 步骤4：保存配置
1. 点击配置面板底部的**"Save"**按钮
2. 关闭配置面板
3. 点击工作流右上角的**"Save"**按钮保存整个工作流

### 步骤5：验证修复
1. 尝试激活工作流（点击右上角的激活开关）
2. 如果成功，状态应该变为"Active"
3. 如果仍有错误，请告诉我具体的错误信息

## 🖼️ 视觉参考

```
工作流布局：
[POST Webhook] → [Code] → [Model* Information Extractor] → [Edit Fields] → [Supabase] → [Respond to Webhook]
     ↑
   需要配置这个节点
```

## 🔍 配置详情

**Respond参数的作用**：
- **"Immediately"**: Webhook立即响应，不等待工作流完成
- **"Using Respond to Webhook Node"**: 使用工作流末尾的"Respond to Webhook"节点来响应

**为什么要选择"Using Respond to Webhook Node"**：
- 我们的工作流末尾有一个"Respond to Webhook"节点
- 这个节点可以返回处理结果给调用方
- 如果Webhook设置为"Immediately"，就会与末尾的响应节点冲突

## ❓ 如果遇到问题

### 问题1：找不到"Respond"字段
- 确保您打开的是"POST Webhook"节点，不是其他节点
- 滚动配置面板，该字段可能在下方

### 问题2：没有"Using Respond to Webhook Node"选项
- 检查工作流是否有"Respond to Webhook"节点
- 如果没有，可以选择"Immediately"作为临时解决方案

### 问题3：保存后仍然报错
- 请截图发送错误信息
- 检查其他节点是否也有配置问题

## 📞 需要帮助？
如果您在操作过程中遇到任何问题，请：
1. 截图当前界面
2. 告诉我具体的错误信息
3. 我会继续指导您完成配置

---
**重要**：这是修复工作流的关键步骤，完成后工作流应该能够正常运行！ 