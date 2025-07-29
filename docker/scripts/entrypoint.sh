#!/bin/sh
# 🚀 Docker入口脚本
# 初始化容器环境并启动Nginx服务

set -e

# 配置
NGINX_CONF="/etc/nginx/nginx.conf"
APP_ROOT="/usr/share/nginx/html"
PID_FILE="/var/run/nginx.pid"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ENTRYPOINT:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ENTRYPOINT:${NC} ✅ $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ENTRYPOINT:${NC} ⚠️  $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ENTRYPOINT:${NC} ❌ $1"
}

# 环境变量替换
substitute_env_vars() {
    log "替换环境变量..."
    
    # 设置默认值
    export NGINX_WORKER_PROCESSES=${NGINX_WORKER_PROCESSES:-auto}
    export NGINX_WORKER_CONNECTIONS=${NGINX_WORKER_CONNECTIONS:-1024}
    
    # 替换nginx.conf中的环境变量
    envsubst '${NGINX_WORKER_PROCESSES} ${NGINX_WORKER_CONNECTIONS}' < "$NGINX_CONF" > /tmp/nginx.conf.tmp
    mv /tmp/nginx.conf.tmp "$NGINX_CONF"
    
    log_success "环境变量替换完成"
}

# 验证配置文件
validate_config() {
    log "验证Nginx配置..."
    
    if nginx -t; then
        log_success "Nginx配置验证通过"
    else
        log_error "Nginx配置验证失败"
        exit 1
    fi
}

# 设置文件权限
setup_permissions() {
    log "设置文件权限..."
    
    # 确保日志目录存在
    mkdir -p /var/log/nginx
    touch /var/log/nginx/access.log
    touch /var/log/nginx/error.log
    
    # 设置权限
    chown -R nginx:nginx /var/log/nginx
    chown -R nginx:nginx /var/cache/nginx
    
    # 确保应用文件权限正确
    chown -R nginx:nginx "$APP_ROOT"
    find "$APP_ROOT" -type f -exec chmod 644 {} \;
    find "$APP_ROOT" -type d -exec chmod 755 {} \;
    
    log_success "文件权限设置完成"
}

# 优化配置
optimize_config() {
    log "优化运行时配置..."
    
    # 根据CPU核心数调整worker进程
    if [ "$NGINX_WORKER_PROCESSES" = "auto" ]; then
        CPU_CORES=$(nproc)
        log "检测到 $CPU_CORES 个CPU核心"
        
        if [ "$CPU_CORES" -gt 4 ]; then
            NGINX_WORKER_PROCESSES=4
            log "限制worker进程数为4（推荐设置）"
        fi
    fi
    
    # 根据内存调整worker连接数
    TOTAL_MEM=$(cat /proc/meminfo | grep MemTotal | awk '{print $2}')
    TOTAL_MEM_MB=$((TOTAL_MEM / 1024))
    
    if [ "$TOTAL_MEM_MB" -lt 512 ]; then
        NGINX_WORKER_CONNECTIONS=512
        log_warning "内存较少（${TOTAL_MEM_MB}MB），降低连接数到512"
    elif [ "$TOTAL_MEM_MB" -gt 2048 ]; then
        NGINX_WORKER_CONNECTIONS=2048
        log "内存充足（${TOTAL_MEM_MB}MB），提高连接数到2048"
    fi
    
    log_success "运行时配置优化完成"
}

# 健康检查准备
prepare_health_check() {
    log "准备健康检查..."
    
    # 创建健康检查端点的静态文件
    cat > "$APP_ROOT/health.json" << EOF
{
    "status": "healthy",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "version": "${APP_VERSION:-unknown}",
    "environment": "${NODE_ENV:-production}",
    "uptime": "0s"
}
EOF
    
    log_success "健康检查准备完成"
}

# 应用启动前检查
pre_start_checks() {
    log "执行启动前检查..."
    
    # 检查关键文件
    if [ ! -f "$APP_ROOT/index.html" ]; then
        log_error "主页文件不存在: $APP_ROOT/index.html"
        exit 1
    fi
    
    # 检查磁盘空间
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 90 ]; then
        log_warning "磁盘空间不足: ${DISK_USAGE}%"
    fi
    
    # 检查内存
    MEM_AVAILABLE=$(cat /proc/meminfo | grep MemAvailable | awk '{print $2}')
    MEM_AVAILABLE_MB=$((MEM_AVAILABLE / 1024))
    if [ "$MEM_AVAILABLE_MB" -lt 64 ]; then
        log_warning "可用内存较少: ${MEM_AVAILABLE_MB}MB"
    fi
    
    log_success "启动前检查完成"
}

# 清理旧进程
cleanup_old_processes() {
    log "清理旧进程..."
    
    # 清理旧的PID文件
    if [ -f "$PID_FILE" ]; then
        rm -f "$PID_FILE"
        log "清理旧的PID文件"
    fi
    
    # 确保没有僵尸nginx进程
    pkill -f nginx || true
    
    log_success "进程清理完成"
}

# 信号处理
setup_signal_handlers() {
    log "设置信号处理器..."
    
    # 优雅关闭函数
    graceful_shutdown() {
        log "收到关闭信号，开始优雅关闭..."
        
        # 停止接受新连接
        nginx -s quit
        
        # 等待现有连接完成
        local timeout=30
        local count=0
        
        while [ $count -lt $timeout ]; do
            if ! pgrep nginx > /dev/null; then
                log_success "Nginx已优雅关闭"
                exit 0
            fi
            
            sleep 1
            count=$((count + 1))
        done
        
        log_warning "超时，强制关闭Nginx"
        nginx -s stop
        exit 0
    }
    
    # 重载配置函数
    reload_config() {
        log "收到重载信号，重载配置..."
        
        if nginx -t; then
            nginx -s reload
            log_success "配置重载成功"
        else
            log_error "配置验证失败，跳过重载"
        fi
    }
    
    # 绑定信号处理器
    trap graceful_shutdown TERM INT QUIT
    trap reload_config HUP
    
    log_success "信号处理器设置完成"
}

# 启动状态监控
start_monitoring() {
    log "启动状态监控..."
    
    # 后台监控进程
    (
        while true; do
            sleep 300  # 每5分钟检查一次
            
            # 检查Nginx状态
            if ! pgrep nginx > /dev/null; then
                log_error "检测到Nginx进程异常退出"
                exit 1
            fi
            
            # 更新健康检查文件
            cat > "$APP_ROOT/health.json" << EOF
{
    "status": "healthy",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "version": "${APP_VERSION:-unknown}",
    "environment": "${NODE_ENV:-production}",
    "uptime": "$(uptime -p)"
}
EOF
        done
    ) &
    
    log_success "状态监控已启动"
}

# 主启动函数
main() {
    log "🚀 开始启动教育管理系统容器..."
    
    # 显示环境信息
    log "环境信息:"
    log "  - Node环境: ${NODE_ENV:-production}"
    log "  - 应用版本: ${APP_VERSION:-unknown}"
    log "  - Worker进程: ${NGINX_WORKER_PROCESSES:-auto}"
    log "  - Worker连接: ${NGINX_WORKER_CONNECTIONS:-1024}"
    log "  - 时区: $(date +%Z)"
    
    # 执行初始化步骤
    cleanup_old_processes
    substitute_env_vars
    optimize_config
    validate_config
    setup_permissions
    prepare_health_check
    pre_start_checks
    setup_signal_handlers
    start_monitoring
    
    log_success "🎉 容器初始化完成，启动Nginx..."
    
    # 启动Nginx（前台运行）
    exec nginx -g "daemon off;"
}

# 如果是直接运行此脚本
if [ "${1:-}" = "" ]; then
    main
else
    # 如果有参数，直接执行
    log "执行命令: $*"
    exec "$@"
fi