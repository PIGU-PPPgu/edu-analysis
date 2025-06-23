#!/bin/bash

# n8n智能解析环境设置脚本
# 用于快速配置n8n工作流和依赖

echo "🚀 开始设置n8n智能解析环境..."

# 检查是否已安装n8n
if ! command -v n8n &> /dev/null; then
    echo "📦 安装n8n..."
    npm install -g n8n
else
    echo "✅ n8n已安装，版本: $(n8n --version)"
fi

# 检查Docker是否运行（如果需要数据库）
if ! docker info &> /dev/null; then
    echo "⚠️ Docker未运行，建议启动Docker以获得最佳性能"
fi

# 设置n8n环境变量
export N8N_BASIC_AUTH_ACTIVE=false
export N8N_HOST=localhost
export N8N_PORT=5678
export N8N_PROTOCOL=http
export WEBHOOK_URL=http://localhost:5678/
export N8N_LOG_LEVEL=info

# 创建n8n工作目录
mkdir -p ~/.n8n/workflows
mkdir -p ~/.n8n/credentials

echo "📋 n8n配置信息:"
echo "  - 访问地址: http://localhost:5678"
echo "  - 工作流目录: ~/.n8n/workflows"
echo "  - 凭证目录: ~/.n8n/credentials"

# 导入工作流文件
echo "📥 导入学生成绩解析工作流..."
cp n8n-workflow-design.json ~/.n8n/workflows/grade-parser-workflow.json

echo "🎯 接下来的步骤:"
echo "1. 启动n8n: n8n start"
echo "2. 访问 http://localhost:5678 设置工作流"
echo "3. 配置AI API凭证（OpenAI、豆包等）"
echo "4. 配置Supabase数据库连接"
echo "5. 测试工作流运行"

echo ""
echo "📚 常用命令:"
echo "  启动n8n: n8n start"
echo "  后台运行: nohup n8n start > n8n.log 2>&1 &"
echo "  查看日志: tail -f n8n.log"
echo "  停止n8n: pkill -f n8n"

echo ""
echo "✅ n8n环境设置完成！"

# 询问是否立即启动
read -p "是否立即启动n8n? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 启动n8n..."
    n8n start
fi 