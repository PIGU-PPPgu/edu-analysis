#!/bin/sh
# 🏥 Docker健康检查脚本
# 检查Nginx服务状态和应用可用性

set -e

# 配置
HEALTH_URL="http://localhost:80/health"
MAIN_URL="http://localhost:80/"
TIMEOUT=10
MAX_RETRIES=3

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] HEALTHCHECK: $1"
}

# 检查URL可用性
check_url() {
    local url="$1"
    local description="$2"
    local timeout="$3"
    
    log "检查 $description: $url"
    
    if curl -f -s --max-time "$timeout" "$url" > /dev/null; then
        log "✅ $description 检查通过"
        return 0
    else
        log "❌ $description 检查失败"
        return 1
    fi
}

# 检查Nginx进程
check_nginx_process() {
    log "检查Nginx进程状态"
    
    if pgrep nginx > /dev/null; then
        log "✅ Nginx进程运行正常"
        return 0
    else
        log "❌ Nginx进程未运行"
        return 1
    fi
}

# 检查文件系统
check_filesystem() {
    log "检查关键文件"
    
    # 检查主页文件
    if [ -f "/usr/share/nginx/html/index.html" ]; then
        log "✅ 主页文件存在"
    else
        log "❌ 主页文件不存在"
        return 1
    fi
    
    # 检查Nginx配置
    if [ -f "/etc/nginx/nginx.conf" ]; then
        log "✅ Nginx配置文件存在"
    else
        log "❌ Nginx配置文件不存在"
        return 1
    fi
    
    return 0
}

# 检查磁盘空间
check_disk_space() {
    log "检查磁盘空间"
    
    # 获取根分区使用率
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -lt 90 ]; then
        log "✅ 磁盘空间充足 (使用率: ${DISK_USAGE}%)"
        return 0
    else
        log "⚠️  磁盘空间不足 (使用率: ${DISK_USAGE}%)"
        return 1
    fi
}

# 检查内存使用
check_memory() {
    log "检查内存使用"
    
    # 获取内存使用率
    MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2*100}')
    
    if [ "$MEM_USAGE" -lt 90 ]; then
        log "✅ 内存使用正常 (使用率: ${MEM_USAGE}%)"
        return 0
    else
        log "⚠️  内存使用率过高 (使用率: ${MEM_USAGE}%)"
        return 1
    fi
}

# 主健康检查函数
main_healthcheck() {
    local attempt=1
    local success=0
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log "开始第 $attempt 次健康检查"
        
        # 执行所有检查
        if check_nginx_process && \
           check_filesystem && \
           check_url "$HEALTH_URL" "健康检查端点" "$TIMEOUT" && \
           check_url "$MAIN_URL" "主页面" "$TIMEOUT" && \
           check_disk_space && \
           check_memory; then
            
            log "🎉 所有健康检查通过"
            success=1
            break
        else
            log "❌ 健康检查失败，尝试 $attempt/$MAX_RETRIES"
            
            if [ $attempt -lt $MAX_RETRIES ]; then
                log "等待5秒后重试..."
                sleep 5
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    if [ $success -eq 1 ]; then
        log "✅ 容器健康状态：正常"
        return 0
    else
        log "💀 容器健康状态：异常"
        return 1
    fi
}

# 详细模式
if [ "$1" = "--verbose" ] || [ "$1" = "-v" ]; then
    main_healthcheck
else
    # 简单模式 - 只输出结果
    if main_healthcheck > /dev/null 2>&1; then
        echo "healthy"
        exit 0
    else
        echo "unhealthy"
        exit 1
    fi
fi