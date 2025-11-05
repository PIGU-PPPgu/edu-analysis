#!/bin/bash

# SSH密钥备份脚本
# 用法: ./scripts/backup-ssh.sh

BACKUP_DIR="$HOME/ssh_backup_$(date +%Y%m%d)"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔐 SSH密钥备份脚本"
echo "================================"
echo "备份目录: $BACKUP_DIR"
echo ""

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 检查SSH密钥是否存在
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "❌ SSH密钥不存在，无法备份"
    exit 1
fi

# 备份SSH密钥 (仅公钥，私钥太敏感)
echo "📋 备份SSH公钥..."
cp ~/.ssh/id_ed25519.pub "$BACKUP_DIR/"

# 备份SSH配置
if [ -f ~/.ssh/config ]; then
    echo "📋 备份SSH配置..."
    cp ~/.ssh/config "$BACKUP_DIR/"
fi

# 创建恢复说明
cat > "$BACKUP_DIR/RESTORE_INSTRUCTIONS.md" << EOF
# SSH密钥恢复说明

## 备份信息
- 备份时间: $(date)
- 原始位置: ~/.ssh/
- 关联GitHub账户: PIGU-PPPgu
- 邮箱: pigouwu@gmail.com

## 公钥内容
\`\`\`
$(cat ~/.ssh/id_ed25519.pub)
\`\`\`

## 恢复步骤

### 如果需要重新生成密钥:
1. 生成新密钥:
   \`\`\`bash
   ssh-keygen -t ed25519 -C "pigouwu@gmail.com" -f ~/.ssh/id_ed25519 -N ""
   \`\`\`

2. 添加到GitHub:
   - 复制公钥: \`cat ~/.ssh/id_ed25519.pub\`
   - 去GitHub: Settings → SSH and GPG keys → New SSH key
   - 粘贴公钥并保存

3. 测试连接:
   \`\`\`bash
   ssh -T git@github.com
   \`\`\`

4. 配置Git远程:
   \`\`\`bash
   git remote set-url origin git@github.com:PIGU-PPPgu/edu-analysis.git
   \`\`\`

### 如果GitHub提示密钥已存在:
- 说明当前公钥已经在GitHub中配置
- 只需要确保私钥存在: \`ls ~/.ssh/id_ed25519\`

## 测试脚本
项目中有自动化脚本可用:
\`\`\`bash
cd "$PROJECT_DIR"
./scripts/test-ssh.sh      # 测试SSH连接
./scripts/git-push.sh      # 智能推送
\`\`\`
EOF

# 备份项目中的Git配置信息
echo "📋 备份项目Git配置..."
cd "$PROJECT_DIR"
git remote -v > "$BACKUP_DIR/git_remotes.txt"
git config --list > "$BACKUP_DIR/git_config.txt"

echo "✅ 备份完成!"
echo ""
echo "📂 备份文件:"
ls -la "$BACKUP_DIR"
echo ""
echo "📖 查看恢复说明: $BACKUP_DIR/RESTORE_INSTRUCTIONS.md"