# 🏭 系统集成指南 - 生产级成绩分析系统

## 📋 系统架构概览

### 🔧 核心组件
```
生产系统
├── 前端网站 (React + Node.js)
├── 后端API (Node.js + Express)
├── 数据库 (PostgreSQL/Supabase)
├── Hook触发器 (纯Bash)
├── AI分析引擎 (纯Bash + DeepSeek API)
└── 通知系统 (企业微信)
```

### 🎯 **零Python依赖架构**
- ✅ 前端：React + TypeScript + Tailwind CSS
- ✅ 后端：Node.js + Express + Supabase
- ✅ 分析引擎：纯Bash + curl + jq
- ✅ 文件处理：Bash + 在线转换服务
- ✅ 通知系统：企业微信 webhook

## 🚀 部署要求

### 最小系统要求
```bash
# 操作系统
Linux/Unix/macOS (支持bash)

# 必需工具
bash >= 4.0
curl >= 7.0
jq >= 1.5

# 网络要求
- 访问DeepSeek API (https://api.deepseek.com)
- 访问企业微信webhook
- 访问Supabase数据库
```

### 安装依赖
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install curl jq

# CentOS/RHEL
sudo yum install curl jq

# macOS
brew install curl jq
```

## 📁 文件结构

### 生产环境目录
```
/opt/grade-analysis/
├── scripts/
│   ├── production-grade-analysis.sh    # 主分析脚本
│   ├── grade-analysis-hook.sh           # Hook触发器
│   └── debug-wechat-push.sh            # 调试脚本
├── logs/                               # 分析日志
├── config/
│   └── .env.hooks                      # 环境配置
└── data/                               # 数据文件
```

### 配置文件
```bash
# /opt/grade-analysis/config/.env.hooks
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
WECHAT_WORK_WEBHOOK=your_wechat_webhook_url
```

## 🔄 Hook集成方案

### 方案1: 数据库触发器
```sql
-- PostgreSQL触发器
CREATE OR REPLACE FUNCTION trigger_grade_analysis()
RETURNS TRIGGER AS $$
BEGIN
    -- 调用外部脚本
    PERFORM pg_notify('grade_analysis', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grade_analysis_trigger
AFTER INSERT ON grade_data
FOR EACH ROW
EXECUTE FUNCTION trigger_grade_analysis();
```

### 方案2: Supabase实时监听
```javascript
// Node.js监听器
const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');

const supabase = createClient(url, key);

supabase
  .channel('grade_data')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'grade_data' },
    (payload) => {
      // 触发分析脚本
      exec('/opt/grade-analysis/scripts/production-grade-analysis.sh /path/to/data.csv');
    }
  )
  .subscribe();
```

### 方案3: 文件监听Hook
```bash
# 使用inotify监听文件变化
#!/bin/bash
inotifywait -m /path/to/data-directory -e create -e modify |
while read path action file; do
    if [[ "$file" =~ \.(csv|xlsx)$ ]]; then
        echo "检测到文件变化: $file"
        /opt/grade-analysis/scripts/production-grade-analysis.sh "$path$file"
    fi
done
```

## 🎛️ 系统集成步骤

### 1. 环境准备
```bash
# 创建系统用户
sudo useradd -m -s /bin/bash grade-analysis

# 创建工作目录
sudo mkdir -p /opt/grade-analysis/{scripts,logs,config,data}
sudo chown -R grade-analysis:grade-analysis /opt/grade-analysis

# 复制脚本文件
sudo cp scripts/*.sh /opt/grade-analysis/scripts/
sudo chmod +x /opt/grade-analysis/scripts/*.sh
```

### 2. 配置文件设置
```bash
# 创建配置文件
sudo tee /opt/grade-analysis/config/.env.hooks << EOF
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat
WECHAT_WORK_WEBHOOK=your_wechat_webhook_url
EOF

# 设置权限
sudo chmod 600 /opt/grade-analysis/config/.env.hooks
```

### 3. 系统服务配置
```bash
# 创建systemd服务
sudo tee /etc/systemd/system/grade-analysis.service << EOF
[Unit]
Description=Grade Analysis Service
After=network.target

[Service]
Type=simple
User=grade-analysis
WorkingDirectory=/opt/grade-analysis
ExecStart=/opt/grade-analysis/scripts/grade-analysis-hook.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启用服务
sudo systemctl daemon-reload
sudo systemctl enable grade-analysis
sudo systemctl start grade-analysis
```

## 🔧 API集成

### 直接调用接口
```bash
# 手动触发分析
curl -X POST "http://your-api.com/analyze" \
  -H "Content-Type: application/json" \
  -d '{"file_path": "/path/to/data.csv"}'
```

### 网站集成
```javascript
// 前端触发分析
const triggerAnalysis = async (filePath) => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_path: filePath })
  });
  
  const result = await response.json();
  return result;
};

// 后端API (Node.js)
app.post('/api/analyze', (req, res) => {
  const { file_path } = req.body;
  const { exec } = require('child_process');
  
  exec(`/opt/grade-analysis/scripts/production-grade-analysis.sh "${file_path}"`, 
    (error, stdout, stderr) => {
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({ success: true, output: stdout });
    }
  );
});
```

## 📊 监控和日志

### 日志管理
```bash
# 日志轮转配置
sudo tee /etc/logrotate.d/grade-analysis << EOF
/opt/grade-analysis/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 grade-analysis grade-analysis
}
EOF
```

### 监控脚本
```bash
#!/bin/bash
# 监控脚本健康状态
check_system_health() {
    echo "🔍 系统健康检查..."
    
    # 检查服务状态
    systemctl is-active grade-analysis
    
    # 检查日志错误
    tail -n 100 /opt/grade-analysis/logs/analysis.log | grep -i error
    
    # 检查磁盘空间
    df -h /opt/grade-analysis
    
    # 检查API连通性
    curl -s "https://api.deepseek.com/v1/models" -H "Authorization: Bearer $DEEPSEEK_API_KEY" | jq .
}
```

## 🔒 安全配置

### 权限设置
```bash
# 设置文件权限
sudo chmod 755 /opt/grade-analysis/scripts/*.sh
sudo chmod 600 /opt/grade-analysis/config/.env.hooks
sudo chmod 755 /opt/grade-analysis/logs

# 设置SELinux策略 (如果适用)
sudo setsebool -P httpd_exec_enable 1
```

### 防火墙配置
```bash
# 允许必要的出站连接
sudo ufw allow out 443/tcp  # HTTPS
sudo ufw allow out 80/tcp   # HTTP
```

## 🎯 Excel文件处理方案

### 方案1: 用户手动转换
```bash
# 提示用户转换Excel
echo "请将Excel文件另存为CSV格式："
echo "1. 打开Excel文件"
echo "2. 文件 -> 另存为 -> CSV格式"
echo "3. 重新运行分析脚本"
```

### 方案2: 在线转换服务
```bash
# 使用在线API转换
convert_excel_online() {
    local input_file="$1"
    local output_file="$2"
    
    # 调用在线转换服务
    curl -X POST "https://api.convertio.co/convert" \
        -F "file=@$input_file" \
        -F "outputformat=csv" \
        -o "$output_file"
}
```

### 方案3: 服务器端Node.js处理
```javascript
// 在Node.js后端处理Excel
const xlsx = require('xlsx');

const convertExcelToCSV = (inputPath, outputPath) => {
  const workbook = xlsx.readFile(inputPath);
  const sheetName = workbook.SheetNames[0];
  const csvData = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
  
  require('fs').writeFileSync(outputPath, csvData);
};
```

## 📋 测试和验证

### 功能测试
```bash
# 测试脚本执行
/opt/grade-analysis/scripts/production-grade-analysis.sh test-data.csv

# 测试企业微信推送
/opt/grade-analysis/scripts/debug-wechat-push.sh

# 测试API连通性
curl -s "https://api.deepseek.com/v1/models" -H "Authorization: Bearer $DEEPSEEK_API_KEY"
```

### 性能测试
```bash
# 测试大文件处理
time /opt/grade-analysis/scripts/production-grade-analysis.sh large-data.csv

# 监控内存使用
ps aux | grep grade-analysis
```

## 🎉 总结

### ✅ 优势
- **零Python依赖** - 纯Bash实现
- **轻量级** - 最小资源占用
- **高兼容性** - 支持所有Unix/Linux系统
- **易部署** - 简单的文件复制和配置
- **易维护** - 标准Shell脚本

### 📈 扩展性
- 支持多种数据格式
- 支持多种通知方式
- 支持集群部署
- 支持自定义分析逻辑

### 🔧 运维友好
- 详细的日志记录
- 健康监控
- 自动重启机制
- 标准化部署流程

---

**部署支持**: 如需技术支持，请联系系统管理员
**文档版本**: v1.0
**更新日期**: 2025-01-18