# n8n HTTP Request节点批量插入配置

## 🎯 问题解决方案

**问题**：Code节点返回多个items，HTTP Request节点无法正确处理JSON格式

**解决方案**：
1. ✅ Code节点返回单个包含所有记录的数组
2. ✅ HTTP Request节点配置为批量插入模式

## 🔧 HTTP Request节点配置

### 基本设置
- **Method**: `POST`
- **URL**: `https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data`

### Headers配置

| Key | Value |
|-----|-------|
| `apikey` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ` |
| `Authorization` | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ` |
| `Content-Type` | `application/json` |
| `Prefer` | `return=minimal` |

### 🎯 关键修复：Body配置

**重要变更**：

1. **Send Body**: ✅ 启用
2. **Body Content Type**: ✅ 选择 `JSON`
3. **JSON字段**: 输入 `{{ $json }}`

**说明**：
- ❌ 之前：Code节点返回8个items，HTTP Request无法处理
- ✅ 现在：Code节点返回1个item（包含8条记录的数组），HTTP Request可以正确处理

## 📋 详细操作步骤

### 1. 更新Code节点
复制 `n8n-Code节点批量插入修复版.js` 的代码到Code节点

### 2. 配置HTTP Request节点

#### 基本信息
- **Authentication**: None
- **Request Method**: POST
- **URL**: `https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data`

#### Headers设置
添加4个headers（如上表所示）

#### Body设置
1. **Send Body**: 开启 ✅
2. **Body Content Type**: 选择 `JSON` ✅
3. **JSON**: 输入 `{{ $json }}` ✅

**注意**：
- ✅ 使用 `{{ $json }}` 而不是其他格式
- ✅ 确保选择了JSON格式，不是Raw格式
- ✅ 不要添加额外的引号或括号

## 🔄 数据流对比

### ❌ 之前的问题流程
```
Code节点输出:
[
  { json: { student_id: "001", name: "张三", ... } },
  { json: { student_id: "002", name: "李四", ... } },
  ...8个items
]

HTTP Request接收: 无法处理多个items ❌
```

### ✅ 修复后的流程
```
Code节点输出:
[
  { 
    json: [
      { student_id: "001", name: "张三", ... },
      { student_id: "002", name: "李四", ... },
      ...8条记录
    ]
  }
]

HTTP Request接收: 单个数组，批量插入 ✅
```

## 🧪 测试验证

配置完成后：

1. **手动测试**：在n8n中点击"Test workflow"
2. **查看输出**：Code节点应该显示1个item（包含数组）
3. **检查响应**：HTTP Request应该返回成功状态
4. **验证数据库**：检查Supabase中是否有新数据

## ⚠️ 常见问题

### 问题1: 仍然报"JSON parameter needs to be valid JSON"
**解决方案**：
- 确保Code节点使用了新的批量插入版本代码
- 检查HTTP Request的Body配置是否正确

### 问题2: 数据没有插入到数据库
**解决方案**：
- 检查Headers配置是否正确
- 确认Supabase API密钥有效
- 查看HTTP Request的响应状态

### 问题3: Code节点仍然返回多个items
**解决方案**：
- 确保使用了 `n8n-Code节点批量插入修复版.js` 的代码
- 检查return语句是否正确

## 🎉 预期结果

修复后应该看到：
- ✅ Code节点输出：1个item（包含记录数组）
- ✅ HTTP Request：成功执行，无JSON错误
- ✅ 数据库：成功插入所有记录
- ✅ 工作流：完整运行无错误 