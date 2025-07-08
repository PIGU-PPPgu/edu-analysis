#!/bin/bash

# SSH连接测试脚本
# 用法: ./scripts/test-ssh.sh

echo "🔑 测试SSH连接到GitHub..."
echo "================================"

# 检查SSH密钥是否存在
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "❌ SSH私钥不存在: ~/.ssh/id_ed25519"
    echo "请运行: ssh-keygen -t ed25519 -C \"pigouwu@gmail.com\" -f ~/.ssh/id_ed25519 -N \"\""
    exit 1
fi

if [ ! -f ~/.ssh/id_ed25519.pub ]; then
    echo "❌ SSH公钥不存在: ~/.ssh/id_ed25519.pub"
    exit 1
fi

echo "✅ SSH密钥文件存在"

# 显示公钥
echo ""
echo "📋 当前SSH公钥:"
cat ~/.ssh/id_ed25519.pub
echo ""

# 测试GitHub连接
echo "🌐 测试GitHub SSH连接..."
ssh_result=$(ssh -T git@github.com 2>&1)

if [[ $ssh_result == *"successfully authenticated"* ]]; then
    echo "✅ SSH连接成功!"
    echo "$ssh_result"
else
    echo "❌ SSH连接失败:"
    echo "$ssh_result"
    echo ""
    echo "🔧 解决方案:"
    echo "1. 复制上面的公钥"
    echo "2. 去GitHub添加: https://github.com/settings/ssh"
    echo "3. 重新运行此脚本"
fi

# 检查Git远程配置
echo ""
echo "📡 当前Git远程配置:"
git remote -v

echo ""
echo "✨ 测试完成!"