# n8n工作流连接配置指南

## 🎯 新的工作流结构

由于Code节点现在直接调用Supabase API，工作流结构大大简化：

```
┌─────────┐    ┌──────────┐    ┌──────────────────┐
│ Webhook │───▶│   Code   │───▶│ Respond to       │
│         │    │          │    │ Webhook          │
└─────────┘    └──────────┘    └──────────────────┘
```

## 📋 详细连接步骤

### 1. 删除不需要的节点

删除以下节点：
- ❌ **Information Extractor** - 已绕过
- ❌ **Supabase** - 功能已集成到Code节点
- ❌ **Edit Fields** - 不再需要（可选）

### 2. 连接节点

1. **Webhook → Code**：
   - 将Webhook节点的输出连接到Code节点的输入

2. **Code → Respond to Webhook**：
   - 将Code节点的输出连接到Respond to Webhook节点的输入

### 3. 配置Respond to Webhook节点

在"Respond to Webhook"节点中设置响应内容：

#### 简单响应（推荐）：
```json
{
  "success": true,
  "message": "CSV文件处理完成",
  "timestamp": "{{ new Date().toISOString() }}"
}
```

#### 详细响应：
```json
{
  "success": {{ $json.success || true }},
  "message": "{{ $json.message || 'CSV文件处理完成' }}",
  "records": "{{ $json.records || 0 }}",
  "exam_info": {
    "title": "{{ $json.exam_info?.examTitle || '未知' }}",
    "type": "{{ $json.exam_info?.examType || '未知' }}",
    "date": "{{ $json.exam_info?.examDate || '未知' }}"
  },
  "timestamp": "{{ new Date().toISOString() }}"
}
```

## 🔧 Code节点功能说明

新的Code节点现在包含以下功能：

1. **📄 文件解析**：
   - 接收base64编码的CSV文件
   - 解析CSV内容和表头
   - 智能字段映射

2. **💾 数据保存**：
   - 直接调用Supabase REST API
   - 批量插入数据到grade_data表
   - 完整的错误处理

3. **📊 响应生成**：
   - 返回处理结果
   - 包含成功/失败状态
   - 提供详细的调试信息

## ✅ 优势

这种简化结构的优势：

1. **🚀 更快速**：减少节点数量，提高执行速度
2. **🔧 更可靠**：避免了Supabase节点的配置问题
3. **🐛 更易调试**：所有逻辑集中在一个Code节点中
4. **📝 更灵活**：可以轻松修改数据处理逻辑

## 🧪 测试验证

连接完成后，使用以下命令测试：

```bash
node test-complete-solution.mjs
```

这将验证：
- ✅ 工作流是否正常运行
- ✅ 数据是否成功保存到数据库
- ✅ 响应是否正确返回

## 🎯 总结

**最终工作流**：`Webhook → Code → Respond to Webhook`

这是最简洁、最可靠的解决方案！ 