# n8n HTTP Request节点配置指南

## 🎯 新的工作流结构

```
┌─────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────────────┐
│ Webhook │───▶│   Code   │───▶│ HTTP Request │───▶│ Respond to       │
│         │    │          │    │              │    │ Webhook          │
└─────────┘    └──────────┘    └──────────────┘    └──────────────────┘
```

## 🔧 HTTP Request节点配置

### 基本设置

1. **Method**: `POST`
2. **URL**: `https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data`

### Headers配置

添加以下Headers：

| Key | Value |
|-----|-------|
| `apikey` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ` |
| `Authorization` | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ` |
| `Content-Type` | `application/json` |
| `Prefer` | `return=minimal` |

### Body配置

**重要**：选择 `JSON` 格式，然后在Body中输入：

```json
{{ $json }}
```

**注意**：
- ✅ 使用 `{{ $json }}` 而不是 `$json`
- ✅ 确保选择了JSON格式，不是Raw格式
- ✅ 不要添加额外的引号或括号

### 高级设置

1. **Send Body**: 启用
2. **JSON/RAW Parameters**: 选择 `JSON`
3. **Response Format**: `JSON`

## 🔧 详细配置步骤

### 1. 添加HTTP Request节点

1. 在Code节点后面添加HTTP Request节点
2. 连接Code节点的输出到HTTP Request节点的输入

### 2. 配置基本信息

- **Authentication**: None
- **Request Method**: POST
- **URL**: `https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data`

### 3. 配置Headers

点击"Add Header"按钮，添加以下4个headers：

```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ

Content-Type: application/json

Prefer: return=minimal
```

### 4. 配置Body

1. **Send Body**: 开启
2. **Body Content Type**: 选择 `JSON`
3. **JSON**: 输入 `{{ $json }}`

### 5. 配置响应

- **Response Format**: JSON
- **Full Response**: 关闭（除非需要调试）

## ⚠️ 常见错误和解决方案

### 错误1: "JSON parameter needs to be valid JSON"

**原因**: Body格式配置错误

**解决方案**:
- 确保选择了JSON格式
- 使用 `{{ $json }}` 而不是其他格式
- 不要添加额外的引号

### 错误2: "fetch is not defined"

**原因**: 在Code节点中使用了fetch

**解决方案**:
- 使用我们提供的修复版Code节点代码
- 让Code节点只处理数据解析
- 让HTTP Request节点处理API调用

### 错误3: 认证失败

**原因**: Headers配置错误

**解决方案**:
- 检查apikey和Authorization headers
- 确保Bearer token格式正确

## 🧪 测试验证

配置完成后，可以：

1. 在n8n中手动测试工作流
2. 使用我们的测试脚本验证
3. 检查Supabase数据库中的数据

## 🎯 最终工作流

```
Webhook → Code → HTTP Request → Respond to Webhook
```

这样就能完美解决所有问题！ 