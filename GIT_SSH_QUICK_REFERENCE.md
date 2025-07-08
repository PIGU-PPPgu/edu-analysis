# 🚀 Git SSH 快速参考卡片

## 📞 紧急救命命令

```bash
# 1. 测试SSH连接
./scripts/test-ssh.sh

# 2. 智能推送 (推荐)
./scripts/git-push.sh

# 3. 带标签推送
./scripts/git-push.sh main --with-tags

# 4. 手动测试
ssh -T git@github.com
```

## 🔧 故障排除

| 问题 | 解决命令 |
|------|----------|
| SSH连接失败 | `./scripts/test-ssh.sh` |
| HTTPS错误 | `git remote set-url origin git@github.com:PIGU-PPPgu/edu-analysis.git` |
| 密钥丢失 | `ssh-keygen -t ed25519 -C "pigouwu@gmail.com" -f ~/.ssh/id_ed25519 -N ""` |
| 推送被拒绝 | `./scripts/git-push.sh` (自动检查) |

## 📁 重要文件位置

```
~/.ssh/id_ed25519     # SSH私钥 (保密!)
~/.ssh/id_ed25519.pub # SSH公钥 (可分享)
./scripts/            # 自动化脚本
./docs/SSH_SETUP_GUIDE.md # 详细文档
```

## 🎯 常用操作

```bash
# 查看Git状态
git status

# 提交更改
git add -A && git commit -m "你的提交信息"

# 推送 (自动SSH检查)
./scripts/git-push.sh

# 推送带标签
./scripts/git-push.sh main --with-tags

# 拉取更新
git pull origin main

# 查看远程配置
git remote -v
```

## 🆘 完全重置SSH (最后手段)

```bash
# 1. 重新生成密钥
ssh-keygen -t ed25519 -C "pigouwu@gmail.com" -f ~/.ssh/id_ed25519 -N ""

# 2. 显示公钥并复制
cat ~/.ssh/id_ed25519.pub

# 3. 去GitHub添加公钥
# https://github.com/settings/ssh

# 4. 测试连接
ssh -T git@github.com

# 5. 确保远程为SSH
git remote set-url origin git@github.com:PIGU-PPPgu/edu-analysis.git
```

---
📞 **记住**: 有问题先运行 `./scripts/test-ssh.sh`!