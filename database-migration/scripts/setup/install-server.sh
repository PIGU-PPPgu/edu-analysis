#!/bin/bash

# =============================================
# 腾讯云服务器环境配置脚本
# 版本: v1.0
# 日期: 2025-01-21
# 说明: 安装PostgreSQL, Redis, Node.js等环境
# 系统: Ubuntu 22.04 LTS
# =============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "请使用root权限运行此脚本"
        echo "使用: sudo $0"
        exit 1
    fi
}

# 更新系统
update_system() {
    log_info "更新系统包..."
    apt-get update
    apt-get upgrade -y
    apt-get install -y curl wget git vim htop net-tools software-properties-common
    log_success "系统更新完成"
}

# 安装PostgreSQL 15
install_postgresql() {
    log_info "安装PostgreSQL 15..."
    
    # 添加PostgreSQL官方APT仓库
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update
    
    # 安装PostgreSQL
    apt-get install -y postgresql-15 postgresql-client-15 postgresql-contrib-15
    
    # 启动并设置开机自启
    systemctl start postgresql
    systemctl enable postgresql
    
    # 配置PostgreSQL
    log_info "配置PostgreSQL..."
    
    # 修改postgresql.conf
    PG_CONFIG="/etc/postgresql/15/main/postgresql.conf"
    cp $PG_CONFIG $PG_CONFIG.backup
    
    # 允许远程连接
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" $PG_CONFIG
    
    # 性能优化配置
    cat >> $PG_CONFIG << EOF

# 性能优化配置
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 100MB
max_wal_size = 2GB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
max_parallel_maintenance_workers = 2
EOF
    
    # 修改pg_hba.conf允许密码认证
    PG_HBA="/etc/postgresql/15/main/pg_hba.conf"
    cp $PG_HBA $PG_HBA.backup
    echo "host    all             all             0.0.0.0/0               md5" >> $PG_HBA
    
    # 重启PostgreSQL
    systemctl restart postgresql
    
    # 创建数据库和用户
    log_info "创建数据库用户..."
    sudo -u postgres psql << EOF
CREATE USER eduadmin WITH PASSWORD 'EduSystem@2025';
CREATE DATABASE edu_system OWNER eduadmin;
GRANT ALL PRIVILEGES ON DATABASE edu_system TO eduadmin;
ALTER USER eduadmin CREATEDB;
EOF
    
    log_success "PostgreSQL 15 安装配置完成"
    log_info "数据库: edu_system"
    log_info "用户: eduadmin"
    log_info "密码: EduSystem@2025 (请立即修改)"
}

# 安装Redis 7
install_redis() {
    log_info "安装Redis 7..."
    
    # 添加Redis仓库
    curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/redis.list
    
    apt-get update
    apt-get install -y redis-server
    
    # 配置Redis
    log_info "配置Redis..."
    REDIS_CONFIG="/etc/redis/redis.conf"
    cp $REDIS_CONFIG $REDIS_CONFIG.backup
    
    # 设置密码
    sed -i 's/# requirepass foobared/requirepass Redis@2025/' $REDIS_CONFIG
    
    # 允许远程连接
    sed -i 's/bind 127.0.0.1 ::1/bind 0.0.0.0/' $REDIS_CONFIG
    sed -i 's/protected-mode yes/protected-mode no/' $REDIS_CONFIG
    
    # 持久化配置
    sed -i 's/# save 900 1/save 900 1/' $REDIS_CONFIG
    sed -i 's/# save 300 10/save 300 10/' $REDIS_CONFIG
    sed -i 's/# save 60 10000/save 60 10000/' $REDIS_CONFIG
    
    # 内存限制
    echo "maxmemory 512mb" >> $REDIS_CONFIG
    echo "maxmemory-policy allkeys-lru" >> $REDIS_CONFIG
    
    # 启动并设置开机自启
    systemctl restart redis-server
    systemctl enable redis-server
    
    log_success "Redis 7 安装配置完成"
    log_info "密码: Redis@2025 (请立即修改)"
}

# 安装Node.js 20
install_nodejs() {
    log_info "安装Node.js 20..."
    
    # 使用NodeSource仓库
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    # 安装npm全局包
    npm install -g pm2 yarn pnpm
    
    # 配置PM2开机自启
    pm2 startup systemd -u ubuntu --hp /home/ubuntu
    
    log_success "Node.js 20 安装完成"
    log_info "Node版本: $(node -v)"
    log_info "NPM版本: $(npm -v)"
}

# 安装Nginx
install_nginx() {
    log_info "安装Nginx..."
    
    apt-get install -y nginx
    
    # 配置Nginx
    cat > /etc/nginx/sites-available/edu-api << 'EOF'
upstream edu_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name _;  # 修改为你的域名
    
    # API反向代理
    location /api {
        proxy_pass http://edu_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态文件
    location / {
        root /var/www/edu-system;
        try_files $uri $uri/ /index.html;
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/edu-api /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # 创建Web目录
    mkdir -p /var/www/edu-system
    chown -R www-data:www-data /var/www/edu-system
    
    # 测试配置并重启
    nginx -t
    systemctl restart nginx
    systemctl enable nginx
    
    log_success "Nginx 安装配置完成"
}

# 配置防火墙
setup_firewall() {
    log_info "配置防火墙..."
    
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    ufw allow 3000/tcp  # 前端开发端口
    ufw allow 3001/tcp  # API端口
    ufw allow 5432/tcp  # PostgreSQL
    ufw allow 6379/tcp  # Redis
    
    ufw --force enable
    
    log_success "防火墙配置完成"
}

# 创建应用目录结构
create_app_structure() {
    log_info "创建应用目录结构..."
    
    mkdir -p /home/ubuntu/edu-system/{api,frontend,logs,backups,scripts}
    
    # 创建环境变量文件模板
    cat > /home/ubuntu/edu-system/api/.env.example << 'EOF'
# Database
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=edu_system
PG_USER=eduadmin
PG_PASSWORD=EduSystem@2025

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=Redis@2025

# Supabase (保留用于认证)
SUPABASE_URL=https://giluhqotfjpmofowvogn.supabase.co
SUPABASE_ANON_KEY=your_key_here

# API Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=your_jwt_secret_here
EOF
    
    chown -R ubuntu:ubuntu /home/ubuntu/edu-system
    
    log_success "应用目录创建完成"
}

# 安装监控工具
install_monitoring() {
    log_info "安装监控工具..."
    
    # 安装netdata
    bash <(curl -Ss https://my-netdata.io/kickstart.sh) --dont-wait --non-interactive
    
    # 安装其他监控工具
    apt-get install -y iotop iftop ncdu
    
    log_success "监控工具安装完成"
    log_info "Netdata访问地址: http://服务器IP:19999"
}

# 系统优化
optimize_system() {
    log_info "优化系统配置..."
    
    # 优化内核参数
    cat >> /etc/sysctl.conf << 'EOF'

# 网络优化
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.core.netdev_max_backlog = 65536
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 10000 65535

# 文件描述符
fs.file-max = 100000

# 内存优化
vm.swappiness = 10
EOF
    
    sysctl -p
    
    # 增加文件描述符限制
    cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF
    
    log_success "系统优化完成"
}

# 创建备份脚本
create_backup_script() {
    log_info "创建自动备份脚本..."
    
    cat > /home/ubuntu/edu-system/scripts/backup.sh << 'EOF'
#!/bin/bash
# 数据库备份脚本

BACKUP_DIR="/home/ubuntu/edu-system/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="edu_system"
DB_USER="eduadmin"

# 创建备份
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 保留最近7天的备份
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "备份完成: db_$DATE.sql.gz"
EOF
    
    chmod +x /home/ubuntu/edu-system/scripts/backup.sh
    
    # 添加到crontab
    (crontab -u ubuntu -l 2>/dev/null; echo "0 3 * * * /home/ubuntu/edu-system/scripts/backup.sh") | crontab -u ubuntu -
    
    log_success "备份脚本创建完成"
}

# 显示安装信息
show_info() {
    echo ""
    echo "=============================================="
    echo "           安装完成！"
    echo "=============================================="
    echo ""
    echo "PostgreSQL数据库:"
    echo "  - 地址: localhost:5432"
    echo "  - 数据库: edu_system"
    echo "  - 用户: eduadmin"
    echo "  - 密码: EduSystem@2025"
    echo ""
    echo "Redis缓存:"
    echo "  - 地址: localhost:6379"
    echo "  - 密码: Redis@2025"
    echo ""
    echo "应用目录:"
    echo "  - /home/ubuntu/edu-system/"
    echo ""
    echo "监控面板:"
    echo "  - http://服务器IP:19999"
    echo ""
    echo "⚠️  重要提醒:"
    echo "  1. 请立即修改数据库和Redis密码"
    echo "  2. 配置SSL证书"
    echo "  3. 修改防火墙规则限制访问来源"
    echo ""
}

# 主函数
main() {
    check_root
    
    echo "=============================================="
    echo "    腾讯云服务器环境配置脚本 v1.0"
    echo "=============================================="
    echo ""
    
    update_system
    install_postgresql
    install_redis
    install_nodejs
    install_nginx
    setup_firewall
    create_app_structure
    install_monitoring
    optimize_system
    create_backup_script
    
    show_info
}

# 执行主函数
main