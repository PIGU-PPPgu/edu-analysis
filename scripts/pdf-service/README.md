# PDF专业报告生成服务

基于 [42ai_pdf_builder](https://github.com/42-AI/42ai_pdf_builder) 的专业PDF生成服务，将Markdown报告转换为高质量LaTeX排版的PDF文档。

## 🎯 特性

- ✅ **专业排版** - LaTeX引擎，出版级质量
- ✅ **中文支持** - 完整的中文字体和排版支持
- ✅ **自定义模板** - 支持自定义LaTeX模板和Logo
- ✅ **Docker部署** - 一键启动，无需配置LaTeX环境
- ✅ **RESTful API** - 简单的HTTP接口
- ✅ **快速生成** - 60秒内完成转换

## 📦 安装部署

### 方式一：Docker部署（推荐）

```bash
# 1. 进入pdf-service目录
cd scripts/pdf-service

# 2. 构建并启动服务
docker-compose up -d

# 3. 检查服务状态
curl http://localhost:5000/health
# 返回: {"status":"ok","service":"pdf-builder"}

# 4. 查看日志
docker-compose logs -f
```

### 方式二：本地安装

```bash
# 1. 安装系统依赖
# macOS
brew install pandoc
brew install --cask mactex

# Ubuntu/Debian
sudo apt-get install pandoc texlive-xetex texlive-fonts-extra

# 2. 安装LaTeX包
tlmgr update --self
tlmgr install ucs fvextra sectsty cancel framed titlesec ctex xecjk

# 3. 安装Python包
pip install git+https://github.com/42-AI/42ai_pdf_builder.git
pip install flask flask-cors

# 4. 启动服务
python pdf_api.py
```

## 🚀 使用方法

### 1. API调用示例

```bash
# 生成PDF
curl -X POST http://localhost:5000/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# 增值评价分析报告\n\n## 一、科目关注策略\n...",
    "title": "增值评价分析报告",
    "template": "simple"
  }' \
  --output report.pdf

# 预览HTML
curl -X POST http://localhost:5000/api/preview \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# 测试报告\n\n内容..."
  }'
```

### 2. 前端集成

```typescript
// 导入服务
import { pdfGenerator } from '@/services/pdfService';

// 生成PDF
const generateReport = async () => {
  const result = await pdfGenerator.generatePDF({
    markdown: '# 报告标题\n\n内容...',
    title: '增值评价分析报告',
    template: 'simple',
  });

  if (result.success && result.blob) {
    pdfGenerator.downloadPDF(result.blob, '报告.pdf');
  }
};
```

### 3. AIReportViewer集成

在 `src/components/value-added/reports/AIReportViewer.tsx` 中添加按钮：

```tsx
<Button variant="outline" size="sm" onClick={exportProfessionalPDF}>
  <FileText className="w-4 h-4 mr-2" />
  导出专业PDF (LaTeX)
</Button>
```

## 📝 API文档

### POST /api/generate-pdf

生成PDF报告

**请求体：**
```json
{
  "markdown": "string (required) - Markdown内容",
  "title": "string (required) - 报告标题",
  "template": "string (optional) - simple|bootcamp, 默认simple",
  "logo": "string (optional) - base64编码的Logo图片"
}
```

**响应：**
- 成功：返回PDF文件（application/pdf）
- 失败：返回JSON错误信息

**示例：**
```typescript
{
  markdown: `
# 增值评价分析报告

## 一、科目关注策略

【数学科目】
数据：平均增值率-8.5%...
原因：...
措施：...

## 二、学生个体指导
...
  `,
  title: "高一1班增值评价分析报告",
  template: "simple"
}
```

### POST /api/preview

预览Markdown渲染效果

**请求体：**
```json
{
  "markdown": "string (required) - Markdown内容"
}
```

**响应：**
```json
{
  "html": "string - 渲染后的HTML"
}
```

### GET /health

健康检查

**响应：**
```json
{
  "status": "ok",
  "service": "pdf-builder"
}
```

## 🎨 自定义模板

### 添加自定义Logo

```typescript
// 读取Logo文件
const logoFile = await fetch('/logo.png');
const logoBlob = await logoFile.blob();
const reader = new FileReader();
reader.onload = async (e) => {
  const base64Logo = e.target?.result as string;

  const result = await pdfGenerator.generatePDF({
    markdown: '...',
    title: '报告',
    logo: base64Logo, // 传入base64编码的Logo
  });
};
reader.readAsDataURL(logoBlob);
```

### 自定义LaTeX模板

将自定义模板放在 `scripts/pdf-service/templates/` 目录：

```latex
% custom-template.tex
\documentclass[12pt,a4paper]{article}
\usepackage{xeCJK}
\usepackage{graphicx}
\setCJKmainfont{SimSun} % 中文字体

\begin{document}
$body$
\end{document}
```

## 🔧 故障排除

### 问题1：中文显示乱码

**原因：** 缺少中文字体或XeTeX支持

**解决：**
```bash
# Docker中已包含ctex和xecjk包
# 如果本地安装，需要：
tlmgr install ctex xecjk
```

### 问题2：PDF生成超时

**原因：** Markdown内容过大或LaTeX编译耗时

**解决：**
- 分段生成报告
- 调整API超时时间（默认60秒）
- 优化Markdown内容，减少复杂表格

### 问题3：Docker服务无法启动

**检查步骤：**
```bash
# 1. 检查端口占用
lsof -i :5000

# 2. 查看Docker日志
docker-compose logs pdf-builder

# 3. 重新构建镜像
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📊 性能优化

### 1. 启用缓存

```python
# 在pdf_api.py中添加缓存
from functools import lru_cache

@lru_cache(maxsize=100)
def generate_pdf_cached(markdown_hash: str):
    # 缓存生成的PDF
    pass
```

### 2. 并发处理

```python
# 使用gunicorn启动多进程
gunicorn -w 4 -b 0.0.0.0:5000 pdf_api:app
```

### 3. CDN加速

将生成的PDF上传到OSS/S3，返回CDN链接：

```typescript
const result = await pdfGenerator.generatePDF({...});
if (result.success && result.blob) {
  // 上传到OSS
  const cdnUrl = await uploadToOSS(result.blob);
  // 返回CDN链接
  window.open(cdnUrl);
}
```

## 🌟 进阶功能

### 批量生成报告

```typescript
// 批量生成多个班级的报告
const classes = ['高一1班', '高一2班', '高一3班'];

for (const className of classes) {
  const markdown = generateMarkdownForClass(className);
  const result = await pdfGenerator.generatePDF({
    markdown,
    title: `${className}增值评价报告`,
  });

  if (result.success && result.blob) {
    pdfGenerator.downloadPDF(result.blob, `${className}.pdf`);
  }
}
```

### 定时报告生成

```typescript
// 每周自动生成报告
import { schedule } from 'node-cron';

schedule('0 0 * * 1', async () => {
  // 每周一0点生成报告
  const markdown = generateWeeklyReport();
  const result = await pdfGenerator.generatePDF({
    markdown,
    title: '周报',
  });

  // 发送邮件
  await sendEmail(result.blob);
});
```

## 📄 Markdown语法支持

支持的Markdown特性：

- ✅ 标题（# - ######）
- ✅ 粗体/斜体
- ✅ 列表（有序/无序）
- ✅ 表格
- ✅ 代码块
- ✅ 引用
- ✅ 链接
- ✅ 图片
- ✅ 分隔线
- ✅ 中文排版

**推荐格式：**
```markdown
# 一级标题

## 二、章节标题

### 【小节标题】

正文内容...

#### 1. 细节要点

内容...

────────────────

## 三、下一章节
```

## 🤝 贡献

欢迎提交Issue和PR！

## 📜 许可证

MIT License

---

**问题反馈：** 如有问题请提交Issue或联系开发团队
