#!/bin/bash

# PDF服务快速启动脚本

set -e

echo "🚀 PDF专业报告生成服务 - 快速启动"
echo "======================================"
echo ""

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装"
    echo "请先安装Docker: https://www.docker.com/get-started"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装"
    echo "请先安装Docker Compose"
    exit 1
fi

echo "✅ Docker已安装"
echo ""

# 进入脚本目录
cd "$(dirname "$0")"

echo "📦 构建Docker镜像..."
docker-compose build

echo ""
echo "🚀 启动服务..."
docker-compose up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 健康检查
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo ""
        echo "✅ PDF服务启动成功！"
        echo ""
        echo "📊 服务信息："
        echo "  - API地址: http://localhost:5000/api"
        echo "  - 健康检查: http://localhost:5000/health"
        echo ""
        echo "📝 测试命令："
        echo '  curl -X POST http://localhost:5000/api/generate-pdf \'
        echo '    -H "Content-Type: application/json" \'
        echo '    -d '"'"'{"markdown":"# 测试报告","title":"测试"}'"'"' \'
        echo '    --output test.pdf'
        echo ""
        echo "📖 查看日志："
        echo "  docker-compose logs -f"
        echo ""
        echo "🛑 停止服务："
        echo "  docker-compose down"
        echo ""
        exit 0
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "等待服务响应... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 3
done

echo ""
echo "❌ 服务启动失败或超时"
echo "查看日志："
echo "  docker-compose logs"
exit 1
