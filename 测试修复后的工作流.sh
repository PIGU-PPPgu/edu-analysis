#!/bin/bash

echo "🧪 测试修复后的n8n工作流"
echo "================================"

# 配置
WEBHOOK_URL="http://localhost:5678/webhook/csv-upload"
TEST_FILE="907九下月考成绩.csv"
SUPABASE_URL="https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ"

# 1. 检查测试文件
echo "1. 检查测试文件..."
if [ -f "$TEST_FILE" ]; then
    FILE_SIZE=$(wc -c < "$TEST_FILE")
    echo "✅ 测试文件存在: $TEST_FILE ($FILE_SIZE 字节)"
else
    echo "❌ 测试文件不存在: $TEST_FILE"
    exit 1
fi

# 2. 记录修复前的数据库状态
echo -e "\n2. 记录修复前数据库状态..."
BEFORE_COUNT=$(curl -s -X GET "$SUPABASE_URL?select=count" \
  -H "apikey: $SUPABASE_KEY" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
echo "修复前记录数: $BEFORE_COUNT"

# 3. 测试工作流
echo -e "\n3. 测试文件上传到工作流..."
RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL" \
  -F "file=@$TEST_FILE")

HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "HTTP状态码: $HTTP_CODE"
echo "响应内容: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 文件上传成功"
else
    echo "❌ 文件上传失败"
    exit 1
fi

# 4. 等待数据处理
echo -e "\n4. 等待数据处理..."
for i in {1..15}; do
    echo -n "."
    sleep 1
done
echo ""

# 5. 检查数据库变化
echo -e "\n5. 检查数据库变化..."
AFTER_COUNT=$(curl -s -X GET "$SUPABASE_URL?select=count" \
  -H "apikey: $SUPABASE_KEY" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
echo "修复后记录数: $AFTER_COUNT"

if [ "$AFTER_COUNT" -gt "$BEFORE_COUNT" ]; then
    NEW_RECORDS=$((AFTER_COUNT - BEFORE_COUNT))
    echo "✅ 新增了 $NEW_RECORDS 条记录"
else
    echo "❌ 没有新增记录"
fi

# 6. 查看最新记录
echo -e "\n6. 查看最新记录..."
LATEST_RECORDS=$(curl -s -X GET "$SUPABASE_URL?order=created_at.desc&limit=3&select=student_id,name,subject,score,created_at" \
  -H "apikey: $SUPABASE_KEY")
echo "最新3条记录:"
echo "$LATEST_RECORDS" | python3 -m json.tool 2>/dev/null || echo "$LATEST_RECORDS"

# 7. 查找测试数据
echo -e "\n7. 查找测试相关数据..."
TEST_DATA=$(curl -s -X GET "$SUPABASE_URL?exam_title=eq.907九下月考成绩&limit=5&select=student_id,name,subject,score" \
  -H "apikey: $SUPABASE_KEY")
echo "测试数据样本:"
echo "$TEST_DATA" | python3 -m json.tool 2>/dev/null || echo "$TEST_DATA"

# 8. 总结
echo -e "\n================================"
echo "🎯 测试结果总结:"
echo "- 文件上传: $([ "$HTTP_CODE" = "200" ] && echo "✅ 成功" || echo "❌ 失败")"
echo "- 数据处理: $([ "$AFTER_COUNT" -gt "$BEFORE_COUNT" ] && echo "✅ 成功" || echo "❌ 失败")"
echo "- 记录变化: $BEFORE_COUNT → $AFTER_COUNT"

if [ "$AFTER_COUNT" -gt "$BEFORE_COUNT" ]; then
    echo "🎉 工作流修复成功！数据正常导入到数据库"
else
    echo "⚠️ 工作流可能还有问题，请检查n8n执行历史"
    echo "建议检查项目:"
    echo "1. n8n工作流是否激活"
    echo "2. Spreadsheet File节点配置是否正确"
    echo "3. 数据转换节点是否有错误"
    echo "4. Supabase连接是否正常"
fi

echo -e "\n📝 如需查看详细执行日志，请访问:"
echo "http://localhost:5678/workflow/FppT8sCsSxcUnNnj/executions" 