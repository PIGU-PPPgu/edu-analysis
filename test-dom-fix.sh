#!/bin/bash

# 测试DOM错误修复
echo "🧪 测试DOM错误修复..."

# 1. 备份原文件
cp "src/components/analysis/core/grade-importer/GradeImporter.tsx" "src/components/analysis/core/grade-importer/GradeImporter.tsx.backup"
echo "✅ 已备份原文件"

# 2. 应用修复
cp "src/components/analysis/core/grade-importer/GradeImporter.FIXED.tsx" "src/components/analysis/core/grade-importer/GradeImporter.tsx"
echo "✅ 已应用修复代码"

# 3. 启动测试
echo "🚀 启动开发服务器进行测试..."
npm run dev &
DEV_PID=$!

# 4. 等待服务器启动
sleep 5

# 5. 测试文件上传
echo "📁 测试文件上传功能..."
echo "请手动访问 http://localhost:8080 并上传 907九下月考成绩.csv 文件"
echo "观察是否还有DOM错误..."

# 6. 等待用户测试
read -p "测试完成后按回车键继续..."

# 7. 恢复原文件（如果需要）
read -p "是否恢复原文件？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cp "src/components/analysis/core/grade-importer/GradeImporter.tsx.backup" "src/components/analysis/core/grade-importer/GradeImporter.tsx"
    echo "✅ 已恢复原文件"
else
    echo "✅ 保留修复版本"
fi

# 8. 清理
kill $DEV_PID
echo "🧹 测试完成"
