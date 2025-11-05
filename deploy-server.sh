#!/bin/bash
set -e

echo "========================================"
echo "🚀 开始部署 edu-analysis..."
echo "========================================"

# 🔄 自动更新部署脚本
echo "🔄 检查脚本更新..."
SCRIPT_URL="https://raw.githubusercontent.com/PIGU-PPPgu/edu-analysis/main/deploy-server.sh"
SCRIPT_PATH="$HOME/deploy.sh"

# 下载最新版本到临时文件
if wget -q -O /tmp/deploy-new.sh "$SCRIPT_URL" 2>/dev/null; then
  # 比较文件是否不同
  if ! cmp -s "$SCRIPT_PATH" /tmp/deploy-new.sh; then
    echo "✅ 发现新版本，更新脚本..."
    cp /tmp/deploy-new.sh "$SCRIPT_PATH"
    chmod +x "$SCRIPT_PATH"
    rm /tmp/deploy-new.sh
    echo "🔄 重新运行更新后的脚本..."
    exec "$SCRIPT_PATH"
  else
    echo "✅ 脚本已是最新版本"
    rm /tmp/deploy-new.sh
  fi
else
  echo "⚠️ 无法检查更新，使用当前版本"
fi

cd /tmp
rm -rf edu-temp

echo "📥 尝试克隆代码..."

# 方法1: GitHub直接克隆
git clone --depth 1 https://github.com/PIGU-PPPgu/edu-analysis.git edu-temp && CLONE_SUCCESS=1 || CLONE_SUCCESS=0

# 方法2: 如果失败，尝试镜像
if [ $CLONE_SUCCESS -eq 0 ]; then
  echo "⚠️ GitHub克隆失败，尝试镜像..."
  git clone --depth 1 "https://ghproxy.com/https://github.com/PIGU-PPPgu/edu-analysis.git" edu-temp && CLONE_SUCCESS=1 || CLONE_SUCCESS=0
fi

# 方法3: 如果还失败，下载zip
if [ $CLONE_SUCCESS -eq 0 ]; then
  echo "❌ 克隆失败，下载zip包..."
  wget https://github.com/PIGU-PPPgu/edu-analysis/archive/refs/heads/main.zip
  unzip -q main.zip
  mv edu-analysis-main edu-temp
  rm main.zip
fi

echo "✅ 代码获取成功"
cd edu-temp

echo "📦 安装依赖..."
npm config set registry https://registry.npmmirror.com
npm cache clean --force
npm install --prefer-offline --no-audit

echo "🔧 配置环境变量..."
cat > .env << 'EOF'
SUPABASE_URL=https://giluhqotfjpmofowvogn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ

# Vite 环境变量 (客户端可访问)
VITE_SUPABASE_URL=https://giluhqotfjpmofowvogn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ
VITE_SUPABASE_STORAGE_BUCKET=homework_files
VITE_NEXT_PUBLIC_USE_MOCK_AI=true
EOF

echo "✅ 环境变量配置完成"

echo "🏗️ 构建项目..."
npm run build

echo "🚀 部署到生产..."
sudo rm -rf /var/www/edu-analysis/*
sudo cp -r dist/* /var/www/edu-analysis/
sudo chown -R www-data:www-data /var/www/edu-analysis

echo "🔄 重启 Nginx..."
sudo systemctl reload nginx

echo "🧹 清理临时文件..."
cd /tmp
rm -rf edu-temp

echo "========================================"
echo "✅ 更新完成！"
echo "🌐 访问：https://intelliclass.online"
echo "========================================"
