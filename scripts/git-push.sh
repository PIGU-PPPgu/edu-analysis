#!/bin/bash

# 智能Git推送脚本 - 自动处理SSH和安全检查
# 用法: ./scripts/git-push.sh [branch] [--with-tags]

BRANCH=${1:-main}
WITH_TAGS=$2

echo "🚀 智能Git推送脚本"
echo "================================"
echo "分支: $BRANCH"
echo "包含标签: ${WITH_TAGS:-否}"
echo ""

# 1. 检查工作目录状态
echo "📋 检查工作目录状态..."
git_status=$(git status --porcelain)
if [ -n "$git_status" ]; then
    echo "⚠️  工作目录有未提交的更改:"
    git status --short
    echo ""
    read -p "是否继续推送? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        echo "❌ 推送已取消"
        exit 1
    fi
fi

# 2. 检查SSH连接
echo "🔑 检查SSH连接..."
ssh_result=$(ssh -T git@github.com 2>&1)
if [[ $ssh_result != *"successfully authenticated"* ]]; then
    echo "❌ SSH连接失败!"
    echo "请运行: ./scripts/test-ssh.sh"
    exit 1
fi
echo "✅ SSH连接正常"

# 3. 检查远程配置
echo "📡 检查远程配置..."
remote_url=$(git remote get-url origin)
if [[ $remote_url != git@github.com:* ]]; then
    echo "⚠️  远程仓库使用HTTPS，切换到SSH..."
    git remote set-url origin git@github.com:PIGU-PPPgu/edu-analysis.git
    echo "✅ 已切换到SSH"
fi

# 4. 检查敏感信息
echo "🔒 扫描敏感信息..."
sensitive_patterns=("api_key" "secret" "password" "token" "lin_api_")
found_sensitive=false

for pattern in "${sensitive_patterns[@]}"; do
    if git diff --cached | grep -i "$pattern" > /dev/null; then
        echo "❌ 发现敏感信息: $pattern"
        found_sensitive=true
    fi
done

if $found_sensitive; then
    echo "⚠️  请移除敏感信息后再推送"
    exit 1
fi

# 5. 显示即将推送的提交
echo "📝 即将推送的提交:"
git log --oneline origin/$BRANCH..$BRANCH 2>/dev/null || git log --oneline -5
echo ""

# 6. 执行推送
echo "🔄 推送到GitHub..."
if git push origin $BRANCH; then
    echo "✅ 代码推送成功!"
    
    # 推送标签 (如果指定)
    if [[ $WITH_TAGS == "--with-tags" ]]; then
        echo "🏷️  推送标签..."
        if git push origin --tags; then
            echo "✅ 标签推送成功!"
        else
            echo "❌ 标签推送失败"
        fi
    fi
    
    # 显示结果
    echo ""
    echo "🎉 推送完成!"
    echo "🔗 查看仓库: https://github.com/PIGU-PPPgu/edu-analysis"
    
else
    echo "❌ 推送失败!"
    echo ""
    echo "🔧 可能的解决方案:"
    echo "1. 检查网络连接"
    echo "2. 运行: ./scripts/test-ssh.sh"
    echo "3. 检查是否有冲突: git pull"
fi