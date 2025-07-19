# 🎯 触发DeepSeek成绩分析

手动触发DeepSeek AI成绩分析。支持CSV和XLSX文件格式。

## 用法

如果没有参数，分析默认的907九下月考成绩.csv文件：

```bash
./scripts/simple-deepseek-analysis.sh "907九下月考成绩.csv"
```

如果有参数，分析指定的文件：

```bash
./scripts/simple-deepseek-analysis.sh "$ARGUMENTS"
```

## 功能特点

- ✅ 使用DeepSeek Chat模型进行AI分析
- ✅ 支持CSV文件格式
- ✅ 自动推送到企业微信
- ✅ 本地保存分析结果
- ✅ 教育专家级别的分析质量

## 分析内容

1. **整体成绩分析**: 总分分布、各科目详细分析
2. **排名分析**: 班级、校级、年级排名对比
3. **教学建议**: 班级整体和学生个体的改进建议