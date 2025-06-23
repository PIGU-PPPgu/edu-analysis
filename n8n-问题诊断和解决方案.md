# n8n API调用失败问题诊断和解决方案

## 🚨 当前问题状态

**API密钥状态**: ❌ 无效 (返回401 unauthorized)  
**工作流ID**: FppT8sCsSxcUnNnj  
**n8n实例**: http://localhost:5678

## 🔍 问题诊断步骤

### 1. 检查n8n服务状态
```bash
# 检查n8n是否正常运行
curl -s http://localhost:5678/healthz

# 检查API是否启用
curl -s http://localhost:5678/api/v1/workflows
```

### 2. 验证API密钥
根据[n8n官方文档](https://docs.n8n.io/api/authentication/)，API密钥应该：
- 在n8n界面中生成：Settings > API > Create API Key
- 格式为JWT token
- 通过`X-N8N-API-KEY`头部传递

### 3. 检查API是否被禁用
n8n可能通过环境变量禁用了API：
```bash
# 检查是否禁用了公共API
echo $N8N_PUBLIC_API_DISABLED

# 检查是否禁用了API文档
echo $N8N_PUBLIC_API_SWAGGERUI_DISABLED
```

## 🛠️ 解决方案

### 方案1: 重新生成API密钥
1. 打开n8n界面：http://localhost:5678
2. 进入 Settings > API
3. 删除现有API密钥
4. 创建新的API密钥
5. 复制新密钥进行测试

### 方案2: 直接通过界面测试工作流
如果API无法使用，可以通过n8n界面直接测试：

1. **打开工作流**：
   - 访问：http://localhost:5678/workflow/FppT8sCsSxcUnNnj
   - 检查所有节点配置

2. **手动测试文件上传**：
   - 点击Webhook节点
   - 复制Webhook URL
   - 使用以下命令测试：

```bash
# 简单文件上传测试
curl -X POST \
  "http://localhost:5678/webhook/csv-upload" \
  -F "file=@907九下月考成绩.csv" \
  -F "examTitle=测试考试" \
  -F "examType=月考" \
  -F "examDate=2024-05-14"
```

### 方案3: 检查节点配置

#### Information Extractor节点配置检查
1. **打开工作流编辑器**
2. **点击Information Extractor节点**
3. **检查以下配置**：

**输入数据字段**：
- 应该设置为来自前一个节点的文件内容
- 通常是 `{{ $json.fileContent }}` 或类似

**提取模式**：
- 选择"Define in Node"
- 配置JSON Schema用于成绩数据提取

**AI模型配置**：
- 确认连接到正确的AI模型节点
- 检查模型参数设置

#### HTTP Request节点配置检查
1. **URL配置**：
```
https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data
```

2. **Headers配置**：
```json
{
  "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ",
  "Content-Type": "application/json",
  "Prefer": "return=representation"
}
```

3. **Body配置**：
```json
{{ $json.processedData }}
```

4. **Method**: POST

## 📋 简单测试方法

### 测试1: Webhook直接测试
```bash
# 创建测试脚本
cat > test-webhook.sh << 'EOF'
#!/bin/bash
echo "🧪 测试n8n Webhook..."

# 测试文件上传
response=$(curl -s -w "%{http_code}" -X POST \
  "http://localhost:5678/webhook/csv-upload" \
  -F "file=@907九下月考成绩.csv" \
  -F "examTitle=Webhook测试" \
  -F "examType=月考" \
  -F "examDate=2024-05-14")

http_code="${response: -3}"
body="${response%???}"

echo "HTTP状态码: $http_code"
echo "响应内容: $body"

if [ "$http_code" = "200" ]; then
    echo "✅ Webhook测试成功"
else
    echo "❌ Webhook测试失败"
fi
EOF

chmod +x test-webhook.sh
./test-webhook.sh
```

### 测试2: Supabase直接测试
```bash
# 测试Supabase连接
curl -s -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ" \
  "https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data?limit=1"
```

## 🎯 推荐操作顺序

1. **立即执行**: 运行Webhook直接测试
2. **界面检查**: 在n8n界面中检查工作流配置
3. **节点验证**: 逐个检查Information Extractor和HTTP Request节点
4. **API修复**: 重新生成API密钥（如果需要API访问）

## 📞 获取帮助

如果问题持续存在：
1. 检查n8n日志：`docker logs <n8n-container-name>`
2. 查看n8n社区：https://community.n8n.io/
3. 参考官方文档：https://docs.n8n.io/api/

---
**最后更新**: 2025年6月15日  
**状态**: 待解决API认证问题 