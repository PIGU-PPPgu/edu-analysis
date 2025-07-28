#!/bin/bash
# Docker开发环境健康检查脚本
# 检查所有服务的运行状态和响应能力

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 服务配置
FRONTEND_URL="http://localhost:8080"
BACKEND_URL="http://localhost:3001/health" 
PYTHON_URL="http://localhost:5000/health"

echo -e "${BLUE}=== Docker开发环境健康检查 ===${NC}"
echo "检查时间: $(date)"
echo

# 检查Docker是否运行
echo -e "${YELLOW}🔍 检查Docker状态...${NC}"
if ! docker --version > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker未安装或未运行${NC}"
    exit 1
fi

if ! docker-compose version > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker环境正常${NC}"
echo

# 检查服务容器状态
echo -e "${YELLOW}🐳 检查容器状态...${NC}"
CONTAINERS=$(docker-compose ps --services 2>/dev/null || echo "")

if [ -z "$CONTAINERS" ]; then
    echo -e "${RED}❌ 未找到运行中的容器，请先运行: npm run docker:up${NC}"
    exit 1
fi

for service in frontend-dev backend-api python-service monitoring; do
    status=$(docker-compose ps $service 2>/dev/null | grep -E "(Up|running)" || echo "")
    if [ -n "$status" ]; then
        echo -e "${GREEN}✅ $service: 运行中${NC}"
    else
        echo -e "${RED}❌ $service: 未运行${NC}"
    fi
done
echo

# 检查端口占用
echo -e "${YELLOW}🔌 检查端口状态...${NC}"
for port in 8080 3001 5000; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 端口 $port: 已占用${NC}"
    else
        echo -e "${RED}❌ 端口 $port: 未占用${NC}"
    fi
done
echo

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 5

# 健康检查函数
check_service() {
    local name=$1
    local url=$2
    local timeout=${3:-10}
    
    echo -n "🔍 检查 $name... "
    
    if curl -sf --max-time $timeout "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 正常${NC}"
        return 0
    else
        echo -e "${RED}❌ 异常${NC}"
        return 1
    fi
}

# 执行健康检查
echo -e "${YELLOW}🏥 执行服务健康检查...${NC}"

# 前端服务检查
check_service "前端服务" "$FRONTEND_URL" 15
frontend_status=$?

# 后端API检查  
check_service "后端API" "$BACKEND_URL" 10
backend_status=$?

# Python服务检查
check_service "Python服务" "$PYTHON_URL" 10
python_status=$?

echo

# 功能测试
echo -e "${YELLOW}🧪 执行功能测试...${NC}"

# 测试后端API
echo -n "🔍 测试后端API响应... "
api_response=$(curl -sf "$BACKEND_URL" 2>/dev/null || echo "")
if echo "$api_response" | grep -q "ok"; then
    echo -e "${GREEN}✅ API响应正常${NC}"
else
    echo -e "${RED}❌ API响应异常${NC}"
fi

# 测试Python服务
echo -n "🔍 测试Python服务响应... "
python_response=$(curl -sf "$PYTHON_URL" 2>/dev/null || echo "")
if echo "$python_response" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Python服务响应正常${NC}"
else
    echo -e "${RED}❌ Python服务响应异常${NC}"
fi

echo

# 生成报告
echo -e "${BLUE}📊 健康检查报告 ${NC}"
echo "=========================="

total_services=3
healthy_services=0

[ $frontend_status -eq 0 ] && ((healthy_services++))
[ $backend_status -eq 0 ] && ((healthy_services++))
[ $python_status -eq 0 ] && ((healthy_services++))

echo "总服务数: $total_services"
echo "健康服务数: $healthy_services"
echo "服务可用率: $((healthy_services * 100 / total_services))%"

echo
echo "服务访问地址:"
echo "- 前端应用: $FRONTEND_URL"
echo "- 后端API: http://localhost:3001"  
echo "- Python服务: http://localhost:5000"
echo "- 监控日志: docker-compose logs -f monitoring"

echo
if [ $healthy_services -eq $total_services ]; then
    echo -e "${GREEN}🎉 所有服务运行正常！开发环境已就绪。${NC}"
    exit 0
else
    echo -e "${RED}⚠️  部分服务异常，请检查日志: npm run docker:logs${NC}"
    echo -e "${YELLOW}💡 尝试重启服务: npm run docker:rebuild${NC}"
    exit 1
fi