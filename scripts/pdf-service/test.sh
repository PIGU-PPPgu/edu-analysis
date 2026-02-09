#!/bin/bash

# PDF服务测试脚本

set -e

API_URL="http://localhost:5000/api"

echo "🧪 PDF服务功能测试"
echo "===================="
echo ""

# 1. 健康检查
echo "1️⃣ 健康检查..."
if curl -s http://localhost:5000/health | grep -q "ok"; then
    echo "✅ 服务健康"
else
    echo "❌ 服务不可用"
    exit 1
fi
echo ""

# 2. Markdown预览测试
echo "2️⃣ Markdown预览测试..."
PREVIEW_RESULT=$(curl -s -X POST $API_URL/preview \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# 测试标题\n\n这是一段测试内容。\n\n## 二级标题\n\n- 列表项1\n- 列表项2"
  }')

if echo "$PREVIEW_RESULT" | grep -q "html"; then
    echo "✅ 预览功能正常"
else
    echo "❌ 预览功能失败"
    echo "$PREVIEW_RESULT"
    exit 1
fi
echo ""

# 3. PDF生成测试
echo "3️⃣ PDF生成测试..."

MARKDOWN_CONTENT='# 增值评价分析报告

## 一、科目关注策略

【数学科目】
数据：平均增值率-8.5%，低于全年级平均5.2%
原因：从学生表现看，主要是函数和立体几何两个模块薄弱
措施：
  ① 本周五前与数学老师沟通，增加晚自习专项训练
  ② 2周内建立"数学互助小组"，安排优秀生担任小老师


## 二、学生个体指导

【值得表扬】

张三（高一1班）
表扬原因：数学增值率+25%，从入口72分提升到出口91分
话术建议：张三同学在数学学科上进步显著...


【需要谈话】

李四（高一1班）
谈话原因：数学增值率-15%，需要加强基础
谈话要点：...


────────────────────────────

## 三、优秀学生利用

【小老师人选】
1. 张三 - 数学+25%，稳定发挥
2. 王五 - 物理+28%，善于讲解

【帮扶配对】
1. 张三 ↔ 李四（数学帮扶）
2. 王五 ↔ 赵六（物理帮扶）
'

curl -X POST $API_URL/generate-pdf \
  -H "Content-Type: application/json" \
  -d "{
    \"markdown\": $(echo "$MARKDOWN_CONTENT" | jq -Rs .),
    \"title\": \"测试报告\",
    \"template\": \"simple\"
  }" \
  --output test-report.pdf

if [ -f "test-report.pdf" ]; then
    FILE_SIZE=$(ls -lh test-report.pdf | awk '{print $5}')
    echo "✅ PDF生成成功！文件大小: $FILE_SIZE"
    echo "   文件位置: $(pwd)/test-report.pdf"

    # 尝试打开PDF（macOS）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo ""
        echo "📄 正在打开PDF..."
        open test-report.pdf
    fi
else
    echo "❌ PDF生成失败"
    exit 1
fi

echo ""
echo "======================================"
echo "🎉 所有测试通过！"
echo ""
echo "💡 提示："
echo "  - 测试生成的PDF: ./test-report.pdf"
echo "  - 可以查看生成效果"
echo "  - 清理测试文件: rm test-report.pdf"
echo ""
