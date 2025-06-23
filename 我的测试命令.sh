#!/bin/bash

echo "🧪 n8n工作流文件上传测试"
echo "=========================="

# 使用POST方法上传文件
curl -X POST "http://localhost:5678/webhook/csv-upload" \
  -F "file=@907九下月考成绩.csv" \
  -F "examTitle=我的测试$(date +%H%M%S)" \
  -F "examType=月考" \
  -F "examDate=$(date +%Y-%m-%d)" \
  -w "\n\n📊 HTTP状态码: %{http_code}\n"

echo ""
echo "✅ 如果状态码是200，说明上传成功！"
echo "🔄 数据正在后台处理，请稍等几秒钟..." 