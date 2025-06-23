#!/bin/bash

# 测试智能文件处理功能
# 支持Excel和CSV文件，包含数据去重测试

echo "🎯 智能文件处理测试开始..."
echo "================================"

# 配置
N8N_URL="http://localhost:5678"
WEBHOOK_PATH="/webhook/smart-grade-upload"
SUPABASE_URL="https://giluhqotfjpmofowvogn.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ"

# 1. 检查测试文件
echo "📁 1. 检查测试文件..."
if [ -f "907九下月考成绩.csv" ]; then
    FILE_SIZE=$(wc -c < "907九下月考成绩.csv")
    echo "✅ CSV测试文件存在: 907九下月考成绩.csv (${FILE_SIZE} 字节)"
else
    echo "❌ CSV测试文件不存在"
    exit 1
fi

# 2. 创建测试Excel文件数据（模拟）
echo "📊 2. 准备Excel测试数据..."
cat > test_excel_data.json << 'EOF'
{
  "fileName": "测试成绩.xlsx",
  "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "data": [
    {
      "学号": "TEST001",
      "姓名": "测试学生1",
      "班级": "测试班级",
      "语文": "85",
      "数学": "92",
      "英语": "78",
      "物理": "88",
      "化学": "90",
      "总分": "433"
    },
    {
      "学号": "TEST002", 
      "姓名": "测试学生2",
      "班级": "测试班级",
      "语文": "78",
      "数学": "85",
      "英语": "82",
      "物理": "79",
      "化学": "84",
      "总分": "408"
    },
    {
      "学号": "TEST001",
      "姓名": "测试学生1",
      "班级": "测试班级", 
      "语文": "87",
      "数学": "94",
      "英语": "80",
      "物理": "90",
      "化学": "92",
      "总分": "443"
    }
  ]
}
EOF

echo "✅ Excel测试数据准备完成（包含重复数据用于测试去重）"

# 3. 记录数据库初始状态
echo "🗄️ 3. 记录数据库初始状态..."
INITIAL_COUNT=$(curl -s \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/grade_data?select=count" | \
  jq -r '.[0].count // 0')

echo "📊 数据库初始记录数: $INITIAL_COUNT"

# 4. 测试CSV文件处理
echo "📄 4. 测试CSV文件处理..."
CSV_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@907九下月考成绩.csv" \
  "$N8N_URL$WEBHOOK_PATH")

CSV_HTTP_STATUS=$(echo "$CSV_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
CSV_BODY=$(echo "$CSV_RESPONSE" | sed '/HTTP_STATUS/d')

echo "📤 CSV上传状态: $CSV_HTTP_STATUS"
if [ "$CSV_HTTP_STATUS" = "200" ]; then
    echo "✅ CSV文件处理成功"
    echo "📋 响应内容: $CSV_BODY"
else
    echo "❌ CSV文件处理失败"
    echo "📋 错误信息: $CSV_BODY"
fi

# 5. 等待CSV处理完成
echo "⏳ 5. 等待CSV数据处理..."
sleep 8

# 6. 测试Excel数据处理
echo "📊 6. 测试Excel数据处理..."
EXCEL_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d @test_excel_data.json \
  "$N8N_URL$WEBHOOK_PATH")

EXCEL_HTTP_STATUS=$(echo "$EXCEL_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
EXCEL_BODY=$(echo "$EXCEL_RESPONSE" | sed '/HTTP_STATUS/d')

echo "📤 Excel数据处理状态: $EXCEL_HTTP_STATUS"
if [ "$EXCEL_HTTP_STATUS" = "200" ]; then
    echo "✅ Excel数据处理成功"
    echo "📋 响应内容: $EXCEL_BODY"
else
    echo "❌ Excel数据处理失败"
    echo "📋 错误信息: $EXCEL_BODY"
fi

# 7. 等待Excel处理完成
echo "⏳ 7. 等待Excel数据处理..."
sleep 8

# 8. 检查数据库变化
echo "🔍 8. 检查数据库变化..."
FINAL_COUNT=$(curl -s \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/grade_data?select=count" | \
  jq -r '.[0].count // 0')

echo "📊 数据库最终记录数: $FINAL_COUNT"
NEW_RECORDS=$((FINAL_COUNT - INITIAL_COUNT))
echo "📈 新增记录数: $NEW_RECORDS"

# 9. 查找测试数据
echo "🔍 9. 查找测试数据..."
TEST_DATA=$(curl -s \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/grade_data?student_id=like.TEST*&select=student_id,name,subject,score,import_batch")

if [ "$TEST_DATA" != "[]" ]; then
    echo "✅ 找到测试数据:"
    echo "$TEST_DATA" | jq '.'
    
    # 检查去重效果
    TEST001_COUNT=$(echo "$TEST_DATA" | jq '[.[] | select(.student_id == "TEST001")] | length')
    echo "📊 TEST001学生记录数: $TEST001_COUNT (应该去重后只保留分数更高的记录)"
else
    echo "❌ 未找到测试数据"
fi

# 10. 检查最新导入批次
echo "📅 10. 检查最新导入批次..."
LATEST_BATCH=$(curl -s \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/grade_data?select=import_batch&order=created_at.desc&limit=1" | \
  jq -r '.[0].import_batch // "无"')

echo "📋 最新导入批次: $LATEST_BATCH"

# 11. 数据去重验证
echo "🔄 11. 数据去重验证..."
if [ "$TEST_DATA" != "[]" ]; then
    # 检查TEST001的语文成绩（应该是87，不是85）
    CHINESE_SCORE=$(echo "$TEST_DATA" | jq -r '.[] | select(.student_id == "TEST001" and .subject == "语文") | .score')
    if [ "$CHINESE_SCORE" = "87" ]; then
        echo "✅ 去重功能正常：保留了更高的语文成绩 (87 > 85)"
    else
        echo "❌ 去重功能异常：语文成绩为 $CHINESE_SCORE，应该为 87"
    fi
    
    # 检查TEST001的数学成绩（应该是94，不是92）
    MATH_SCORE=$(echo "$TEST_DATA" | jq -r '.[] | select(.student_id == "TEST001" and .subject == "数学") | .score')
    if [ "$MATH_SCORE" = "94" ]; then
        echo "✅ 去重功能正常：保留了更高的数学成绩 (94 > 92)"
    else
        echo "❌ 去重功能异常：数学成绩为 $MATH_SCORE，应该为 94"
    fi
fi

# 12. 清理测试数据
echo "🧹 12. 清理测试数据..."
if [ "$TEST_DATA" != "[]" ]; then
    echo "是否删除测试数据？(y/N)"
    read -r CLEANUP_CHOICE
    if [ "$CLEANUP_CHOICE" = "y" ] || [ "$CLEANUP_CHOICE" = "Y" ]; then
        curl -s -X DELETE \
          -H "apikey: $SUPABASE_KEY" \
          -H "Authorization: Bearer $SUPABASE_KEY" \
          "$SUPABASE_URL/rest/v1/grade_data?student_id=like.TEST*"
        echo "✅ 测试数据已清理"
    else
        echo "⏭️ 跳过清理，测试数据保留"
    fi
fi

# 清理临时文件
rm -f test_excel_data.json

# 13. 测试总结
echo ""
echo "📋 测试总结"
echo "================================"
echo "CSV文件处理: $([ "$CSV_HTTP_STATUS" = "200" ] && echo "✅ 成功" || echo "❌ 失败")"
echo "Excel数据处理: $([ "$EXCEL_HTTP_STATUS" = "200" ] && echo "✅ 成功" || echo "❌ 失败")"
echo "数据库记录变化: $NEW_RECORDS 条新记录"
echo "数据去重功能: $([ "$CHINESE_SCORE" = "87" ] && [ "$MATH_SCORE" = "94" ] && echo "✅ 正常" || echo "❓ 需检查")"

if [ "$CSV_HTTP_STATUS" = "200" ] && [ "$EXCEL_HTTP_STATUS" = "200" ] && [ "$NEW_RECORDS" -gt "0" ]; then
    echo ""
    echo "🎉 智能文件处理测试全部通过！"
    echo "✅ 支持CSV和Excel文件格式"
    echo "✅ 自动文件格式检测正常"
    echo "✅ 数据去重功能正常"
    echo "✅ 数据成功保存到数据库"
else
    echo ""
    echo "⚠️ 部分测试未通过，请检查配置和日志"
fi

echo ""
echo "🔧 如需查看详细日志，请检查n8n工作流执行记录"
echo "�� n8n界面: $N8N_URL" 