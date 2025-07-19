# 📊 手动成绩分析指南

## 快速使用

### 1. 手动触发分析
```bash
./scripts/manual-grade-analysis.sh "907九下月考成绩.csv"
```

### 2. 完整路径触发
```bash
./scripts/manual-grade-analysis.sh "/Users/iguppp/Library/Mobile Documents/com~apple~CloudDocs/代码备份/figma-frame-faithful-front/907九下月考成绩.csv"
```

## 功能说明

### 🎯 脚本功能
- ✅ 解析CSV文件中的成绩数据
- ✅ 调用豆包AI进行专业分析
- ✅ 推送结果到邮箱、微信、Linear
- ✅ 保存分析结果到本地文件

### 📋 输出内容
1. **实时日志**: 显示执行过程和状态
2. **分析结果**: 在终端显示完整的AI分析报告
3. **推送状态**: 各渠道推送的成功/失败状态
4. **本地保存**: 自动保存到 `logs/manual-analysis-*.txt`

### 🔧 环境要求
- ✅ `.env.hooks` 文件已配置
- ✅ `DOUBAO_API_KEY` 已设置
- ✅ 可选：邮箱、微信、Linear API密钥

## 与自动Hook的区别

| 特性 | 自动Hook | 手动触发 |
|------|---------|---------|
| 触发方式 | 数据库新增记录 | 指定CSV文件 |
| 数据来源 | Supabase数据库 | 本地CSV文件 |
| 触发条件 | 超过阈值(5条) | 立即执行 |
| 使用场景 | 日常自动化 | 特定文件分析 |

## 使用示例

### 分析特定考试成绩
```bash
cd /Users/iguppp/Library/Mobile\ Documents/com~apple~CloudDocs/代码备份/figma-frame-faithful-front
./scripts/manual-grade-analysis.sh "907九下月考成绩.csv"
```

### 预期输出
```
2024-01-15 10:30:00 [MANUAL-ANALYSIS] 🚀 开始手动成绩分析...
2024-01-15 10:30:00 [MANUAL-ANALYSIS] 📁 数据文件: 907九下月考成绩.csv
2024-01-15 10:30:01 [MANUAL-ANALYSIS] 📂 解析CSV文件: 907九下月考成绩.csv
2024-01-15 10:30:01 [MANUAL-ANALYSIS] ✅ CSV解析成功，共45条记录
2024-01-15 10:30:01 [MANUAL-ANALYSIS] 🤖 开始AI成绩分析...
2024-01-15 10:30:05 [MANUAL-ANALYSIS] ✅ AI分析完成
2024-01-15 10:30:05 [MANUAL-ANALYSIS] ✅ 分析完成，开始推送...

=======================================
🎯 AI分析结果：
=======================================
[AI分析报告内容]
=======================================

2024-01-15 10:30:06 [MANUAL-ANALYSIS] 📧 推送分析结果到邮箱...
2024-01-15 10:30:06 [MANUAL-ANALYSIS] 💬 推送分析结果到企业微信...
2024-01-15 10:30:07 [MANUAL-ANALYSIS] ✅ 邮箱推送成功
2024-01-15 10:30:07 [MANUAL-ANALYSIS] ✅ 企业微信推送成功
2024-01-15 10:30:07 [MANUAL-ANALYSIS] ✅ 手动分析和通知推送完成
2024-01-15 10:30:07 [MANUAL-ANALYSIS] 💾 分析结果已保存到: logs/manual-analysis-20240115-103007.txt
2024-01-15 10:30:07 [MANUAL-ANALYSIS] 🏁 手动分析完成
```

## 故障排除

### 常见问题
1. **权限错误**: 确保脚本有执行权限 `chmod +x scripts/manual-grade-analysis.sh`
2. **文件不存在**: 检查CSV文件路径是否正确
3. **API密钥错误**: 检查 `.env.hooks` 中的配置
4. **CSV格式问题**: 确保CSV文件编码为UTF-8，分隔符为逗号

### 调试模式
```bash
# 显示详细执行信息
bash -x ./scripts/manual-grade-analysis.sh "907九下月考成绩.csv"
```

---

**下一步**: 执行以下命令开始分析：
```bash
cd /Users/iguppp/Library/Mobile\ Documents/com~apple~CloudDocs/代码备份/figma-frame-faithful-front
./scripts/manual-grade-analysis.sh "907九下月考成绩.csv"
```