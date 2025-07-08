# SSH Git 配置指南

## 🔑 SSH密钥配置完成记录

### 当前配置状态
- ✅ **SSH密钥类型**: Ed25519 (最安全)
- ✅ **密钥位置**: `~/.ssh/id_ed25519` (私钥) + `~/.ssh/id_ed25519.pub` (公钥)
- ✅ **GitHub账户**: PIGU-PPPgu
- ✅ **关联邮箱**: pigouwu@gmail.com
- ✅ **连接状态**: 已验证成功

### SSH公钥信息
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIXoIzBS119qcCya+Muz7JbsHi8zkVsfAVVlHj/jdtt6 pigouwu@gmail.com
```

### Git远程仓库配置
```bash
# 当前仓库使用SSH方式
origin: git@github.com:PIGU-PPPgu/edu-analysis.git

# 如果需要切换回HTTPS (不推荐)
# git remote set-url origin https://github.com/PIGU-PPPgu/edu-analysis.git
```

## 🚀 快速操作命令

### 测试SSH连接
```bash
ssh -T git@github.com
# 成功输出: Hi PIGU-PPPgu! You've successfully authenticated...
```

### 推送代码
```bash
git push origin main
git push origin --tags  # 推送标签
```

### 紧急恢复SSH (如果密钥丢失)
```bash
# 1. 生成新密钥
ssh-keygen -t ed25519 -C "pigouwu@gmail.com" -f ~/.ssh/id_ed25519 -N ""

# 2. 显示公钥
cat ~/.ssh/id_ed25519.pub

# 3. 去GitHub添加: Settings → SSH and GPG keys → New SSH key
# 4. 测试连接
ssh -T git@github.com
```

## ⚠️ 故障排除

### 问题1: Permission denied (publickey)
**原因**: SSH密钥未正确配置或GitHub未添加公钥
**解决**: 重新生成密钥并添加到GitHub

### 问题2: HTTPS vs SSH混用
**现象**: `fatal: unable to access 'https://github.com/...'`
**解决**: 
```bash
git remote set-url origin git@github.com:PIGU-PPPgu/edu-analysis.git
```

### 问题3: Git历史包含敏感信息
**解决**: 使用 filter-branch 重写历史 (如2025-07-08操作)

## 📋 维护清单

### 定期检查 (每月)
- [ ] SSH连接是否正常: `ssh -T git@github.com`
- [ ] 密钥文件是否存在: `ls -la ~/.ssh/id_ed25519*`
- [ ] Git远程配置: `git remote -v`

### 安全建议
- ✅ 使用SSH而非HTTPS (避免网络限制)
- ✅ 定期备份SSH密钥
- ✅ 不要在代码中提交密钥文件
- ✅ 使用强密码保护密钥 (如需要)

## 🔧 自动化脚本位置
- SSH测试脚本: `./scripts/test-ssh.sh`
- 推送脚本: `./scripts/git-push.sh`
- 密钥备份脚本: `./scripts/backup-ssh.sh`

---
*记录时间: 2025-07-08*  
*配置完成人: Claude + PIGU-PPPgu*  
*最后更新: v1.3.0 发布成功*