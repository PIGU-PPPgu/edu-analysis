#!/bin/bash

echo "🔍 n8n工作流完整验证和诊断"
echo "=================================="
echo ""

# 配置
WEBHOOK_URL="http://localhost:5678/webhook/csv-upload"
TEST_FILE="907九下月考成绩.csv"
SUPABASE_URL="https://giluhqotfjpmofowvogn.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ"

# 生成唯一的测试标识
TEST_ID="测试$(date +%H%M%S)"
echo "📋 测试标识: $TEST_ID"
echo ""

# 第1步：检查文件
echo "📁 第1步：检查测试文件"
if [ ! -f "$TEST_FILE" ]; then
    echo "❌ 测试文件不存在: $TEST_FILE"
    exit 1
fi
echo "✅ 文件存在: $TEST_FILE ($(wc -c < "$TEST_FILE") bytes)"
echo ""

# 第2步：记录上传前的数据库状态
echo "📊 第2步：记录上传前的数据库状态"
BEFORE_COUNT=$(curl -s -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" \
    "$SUPABASE_URL/rest/v1/grade_data?select=count" | jq -r '.[0].count // 0')
echo "📈 上传前数据库记录数: $BEFORE_COUNT"
echo ""

# 第3步：执行文件上传
echo "📤 第3步：执行文件上传"
echo "🔄 正在上传文件到: $WEBHOOK_URL"

UPLOAD_RESULT=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
    -F "file=@$TEST_FILE" \
    -F "examTitle=$TEST_ID" \
    -F "examType=月考" \
    -F "examDate=$(date +%Y-%m-%d)")

# 分离响应和状态码
HTTP_CODE=$(echo "$UPLOAD_RESULT" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESULT" | head -n -1)

echo "📋 HTTP状态码: $HTTP_CODE"
echo "📄 响应内容: $RESPONSE_BODY"

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ 上传失败！状态码: $HTTP_CODE"
    exit 1
fi
echo "✅ 文件上传成功！"
echo ""

# 第4步：等待数据处理
echo "⏳ 第4步：等待数据处理 (10秒)..."
for i in {10..1}; do
    echo -n "$i... "
    sleep 1
done
echo ""
echo ""

# 第5步：检查数据库变化
echo "📊 第5步：检查数据库变化"
AFTER_COUNT=$(curl -s -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" \
    "$SUPABASE_URL/rest/v1/grade_data?select=count" | jq -r '.[0].count // 0')
echo "📈 处理后数据库记录数: $AFTER_COUNT"

NEW_RECORDS=$((AFTER_COUNT - BEFORE_COUNT))
echo "🆕 新增记录数: $NEW_RECORDS"
echo ""

# 第6步：查找测试数据
echo "🔍 第6步：查找测试数据"
echo "🔎 搜索包含 '$TEST_ID' 的记录..."

# 查询最新的几条记录
LATEST_RECORDS=$(curl -s -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" \
    "$SUPABASE_URL/rest/v1/grade_data?order=created_at.desc&limit=10" | \
    jq -r '.[] | select(.exam_title | contains("测试")) | {name: .name, exam_title: .exam_title, subject: .subject, score: .score, created_at: .created_at}')

if [ -n "$LATEST_RECORDS" ]; then
    echo "✅ 找到测试数据:"
    echo "$LATEST_RECORDS" | head -15
else
    echo "❌ 未找到包含'测试'的数据"
    echo ""
    echo "📋 最新的5条记录:"
    curl -s -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" \
        "$SUPABASE_URL/rest/v1/grade_data?order=created_at.desc&limit=5" | \
        jq '.[] | {name: .name, exam_title: .exam_title, created_at: .created_at}' | head -15
fi
echo ""

# 第7步：验证数据准确性
echo "🎯 第7步：验证数据准确性"
if [ "$NEW_RECORDS" -gt 0 ]; then
    echo "✅ 数据库有新记录，工作流正在工作"
    
    # 检查原始文件的记录数
    ORIGINAL_LINES=$(tail -n +2 "$TEST_FILE" | wc -l | tr -d ' ')
    echo "📄 原始文件学生记录数: $ORIGINAL_LINES"
    
    if [ "$NEW_RECORDS" -eq "$ORIGINAL_LINES" ]; then
        echo "✅ 记录数匹配！数据解析完全正确"
    else
        echo "⚠️  记录数不匹配，可能存在重复或解析问题"
    fi
else
    echo "❌ 数据库没有新记录，工作流可能有问题"
fi
echo ""

# 总结
echo "📋 验证总结"
echo "============"
echo "🔗 Webhook状态: $([ "$HTTP_CODE" = "200" ] && echo "✅ 正常" || echo "❌ 异常")"
echo "📊 数据库变化: $([ "$NEW_RECORDS" -gt 0 ] && echo "✅ 有新数据" || echo "❌ 无新数据")"
echo "🎯 整体状态: $([ "$HTTP_CODE" = "200" ] && [ "$NEW_RECORDS" -gt 0 ] && echo "✅ 工作流正常" || echo "❌ 需要检查配置")"
echo ""

if [ "$HTTP_CODE" = "200" ] && [ "$NEW_RECORDS" -gt 0 ]; then
    echo "🎉 恭喜！n8n工作流完全正常工作！"
else
    echo "🔧 建议检查n8n工作流中的节点配置"
fi 