#!/bin/bash
# ========================================
# 🚀 edu-analysis 自动部署脚本 (v3 - 修复网络问题)
# 作者: Pigou Wu
# 更新时间: 2025-10-27
# ========================================

set -e  # 遇到错误立即退出

TMP_DIR="/tmp/edu-temp"
DEPLOY_DIR="/var/www/edu-analysis"
REPO_URL="https://github.com/PIGU-PPPgu/edu-analysis.git"
# 备用镜像加速地址
REPO_MIRROR="https://ghproxy.com/https://github.com/PIGU-PPPgu/edu-analysis.git"

echo "========================================"
echo "🚧 开始部署 edu-analysis ..."
echo "========================================"

# 1️⃣ 检查 Node 环境
if ! command -v node &> /dev/null; then
  echo "⚠️ 未检测到 Node.js，正在安装 Node 18..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# 2️⃣ 安装 pnpm（性能更快）
if ! command -v pnpm &> /dev/null; then
  echo "📦 未检测到 pnpm，正在全局安装..."
  sudo npm install -g pnpm
fi

# 3️⃣ 配置 Git 以解决网络问题
echo "🔧 优化 Git 配置..."
git config --global http.postBuffer 524288000
git config --global core.compression 0
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999

# 4️⃣ 拉取或更新代码（支持多种方式）
echo "📥 获取最新代码..."

# 如果临时目录已存在，尝试更新
if [ -d "$TMP_DIR/.git" ]; then
  echo "🔄 检测到已有仓库，尝试更新..."
  cd $TMP_DIR

  # 重置本地修改
  git reset --hard HEAD
  git clean -fd

  # 尝试 pull
  if git pull origin main 2>/dev/null; then
    echo "✅ 代码更新成功"
  else
    echo "⚠️ 更新失败，删除旧仓库重新克隆..."
    cd ~
    rm -rf $TMP_DIR
  fi
fi

# 如果目录不存在或更新失败，重新克隆
if [ ! -d "$TMP_DIR" ]; then
  echo "🌐 克隆代码仓库..."

  # 方式1: 尝试 SSH 克隆（最稳定）
  if git clone git@github.com:PIGU-PPPgu/edu-analysis.git $TMP_DIR 2>/dev/null; then
    echo "✅ SSH 克隆成功"
  # 方式2: 尝试 HTTPS 浅克隆
  elif git clone --depth 1 $REPO_URL $TMP_DIR 2>/dev/null; then
    echo "✅ HTTPS 克隆成功"
  # 方式3: 尝试镜像加速
  elif git clone --depth 1 $REPO_MIRROR $TMP_DIR 2>/dev/null; then
    echo "✅ 镜像加速克隆成功"
  else
    echo "❌ 所有克隆方式都失败"
    echo ""
    echo "💡 解决方案："
    echo "   1️⃣ 确保 SSH key 已添加到 GitHub："
    echo "      ssh-keygen -t rsa -b 4096 -C 'your_email@example.com'"
    echo "      cat ~/.ssh/id_rsa.pub"
    echo "      然后添加到 https://github.com/settings/keys"
    echo ""
    echo "   2️⃣ 或手动下载代码："
    echo "      wget https://github.com/PIGU-PPPgu/edu-analysis/archive/refs/heads/main.zip"
    echo "      unzip main.zip -d /tmp"
    echo "      mv /tmp/edu-analysis-main $TMP_DIR"
    exit 1
  fi
fi

cd $TMP_DIR

# 5️⃣ 使用国内源加速 npm/pnpm
echo "🌐 配置国内镜像源..."
pnpm config set registry https://registry.npmmirror.com

# 6️⃣ 安装依赖
echo "📦 安装项目依赖..."
pnpm install --frozen-lockfile || {
  echo "⚠️ pnpm install 失败，尝试不使用 frozen-lockfile..."
  pnpm install
}

# 7️⃣ 构建项目
echo "🏗️ 构建生产版本..."
pnpm run build || {
  echo "❌ 构建失败，请检查错误日志"
  exit 1
}

# 8️⃣ 部署到生产目录
echo "🚀 部署到生产环境..."
sudo mkdir -p $DEPLOY_DIR
sudo rm -rf $DEPLOY_DIR/*
sudo cp -r dist/* $DEPLOY_DIR/

# 9️⃣ 设置正确的文件权限
echo "🔐 设置文件权限..."
sudo chown -R www-data:www-data $DEPLOY_DIR
sudo chmod -R 755 $DEPLOY_DIR

# 🔟 重启 Nginx（如果使用）
if command -v nginx &> /dev/null; then
  echo "🔄 重启 Nginx..."
  sudo nginx -t && sudo systemctl reload nginx
fi

# 1️⃣1️⃣ 清理临时文件
echo "🧹 清理临时文件..."
rm -rf $TMP_DIR

echo "========================================"
echo "✅ 部署完成！"
echo "========================================"
echo "📍 部署路径: $DEPLOY_DIR"
echo "🌐 访问地址: http://intelliclass.online"
echo "📊 构建信息:"
du -sh $DEPLOY_DIR
ls -lh $DEPLOY_DIR
echo "========================================"
