# 🔄 备份和恢复系统指南

## 🎯 系统概述

本文档详细介绍 Figma Frame Faithful 项目的完整备份和恢复系统，包括自动化备份策略、灾难恢复流程和最佳实践。

### 🏗️ 备份架构

#### 备份类型
- **数据库备份** - Supabase PostgreSQL数据库的完整备份
- **应用数据备份** - 用户上传文件、配置数据、会话数据
- **Kubernetes配置备份** - 集群配置、应用部署配置、网络策略
- **监控数据备份** - Prometheus指标、Grafana仪表板、告警配置

#### 存储策略
- **主存储**: AWS S3存储桶
- **存储类别**: Standard → Standard-IA (30天) → Glacier (90天) → Deep Archive (365天)
- **生命周期管理**: 自动转换和清理过期备份
- **多区域冗余**: 跨可用区复制

## 🚀 快速开始

### 部署备份系统

```bash
# 一键部署完整备份系统
./scripts/backup-restore.sh deploy

# 或使用npm脚本
npm run backup:deploy
```

### 检查系统状态

```bash
# 查看备份系统状态
./scripts/backup-restore.sh status

# 或
npm run backup:status
```

## 📅 自动备份调度

### 默认备份计划

| 备份类型 | 频率 | 时间 | 保留期 |
|----------|------|------|--------|
| 数据库 | 每日 | 02:00 | 7天 |
| 应用数据 | 每日 | 03:00 | 7天 |
| 监控数据 | 每日 | 04:00 | 14天 |
| Kubernetes配置 | 每周 | 周日 01:00 | 30天 |
| 清理任务 | 每周 | 周日 05:00 | - |

### 查看定时任务状态

```bash
# 查看所有CronJob
kubectl get cronjobs -n backup

# 查看最近的备份任务
kubectl get jobs -n backup --sort-by=.metadata.creationTimestamp
```

## 💾 手动备份操作

### 执行完整备份

```bash
# 备份所有数据
./scripts/backup-restore.sh backup all
# 或
npm run backup:all
```

### 单独备份各组件

```bash
# 数据库备份
./scripts/backup-restore.sh backup database
npm run backup:database

# Kubernetes配置备份
./scripts/backup-restore.sh backup config
npm run backup:config

# 应用数据备份
./scripts/backup-restore.sh backup app-data

# 监控数据备份
./scripts/backup-restore.sh backup monitoring
```

### 查看备份状态

```bash
# 实时查看备份任务日志
kubectl logs -f job/manual-database-backup-20241201120000 -n backup

# 查看所有备份任务日志
./scripts/backup-restore.sh logs
```

## 📋 备份列表和管理

### 列出所有备份

```bash
# 列出所有备份
./scripts/backup-restore.sh list
npm run backup:list

# 列出特定类型的备份
./scripts/backup-restore.sh list database
./scripts/backup-restore.sh list config
./scripts/backup-restore.sh list app-data
./scripts/backup-restore.sh list monitoring
```

### 备份文件命名规范

```
数据库备份: supabase-backup-YYYYMMDD-HHMMSS.tar.gz
配置备份: k8s-config-backup-YYYYMMDD-HHMMSS.tar.gz
应用数据: app-data-backup-YYYYMMDD-HHMMSS-[config|uploads|redis].tar.gz
监控数据: monitoring-backup-YYYYMMDD-HHMMSS.tar.gz
```

### 验证备份完整性

```bash
# 验证特定备份文件
./scripts/backup-restore.sh verify backup supabase-backup-20241201-020000

# 检查备份文件的完整性和大小
aws s3 ls s3://figma-frame-faithful-backups --recursive --human-readable
```

## 🔄 数据恢复操作

### ⚠️ 恢复前准备

1. **创建当前数据快照**
   ```bash
   # 在恢复前自动创建备份
   ./scripts/backup-restore.sh backup all
   ```

2. **停止相关服务**（推荐）
   ```bash
   kubectl scale deployment figma-frame-faithful --replicas=0 -n production
   ```

3. **确认恢复点**
   ```bash
   # 选择要恢复的备份
   ./scripts/backup-restore.sh list database
   ```

### 数据库恢复

```bash
# 恢复数据库（需要确认）
./scripts/backup-restore.sh restore database supabase-backup-20241201-020000

# 强制恢复（跳过确认）
./scripts/backup-restore.sh --force restore database supabase-backup-20241201-020000

# 或使用npm脚本
npm run restore:database supabase-backup-20241201-020000
```

### Kubernetes配置恢复

```bash
# 恢复所有Kubernetes配置
./scripts/backup-restore.sh restore config k8s-config-backup-20241201-010000

# 恢复特定命名空间的配置
./scripts/backup-restore.sh restore config k8s-config-backup-20241201-010000 production

# 或使用npm脚本
npm run restore:config k8s-config-backup-20241201-010000
```

### 应用数据恢复

```bash
# 恢复所有应用数据
./scripts/backup-restore.sh restore app-data app-data-backup-20241201-030000 all

# 仅恢复配置
./scripts/backup-restore.sh restore app-data app-data-backup-20241201-030000 config

# 仅恢复上传文件
./scripts/backup-restore.sh restore app-data app-data-backup-20241201-030000 uploads

# 仅恢复Redis数据
./scripts/backup-restore.sh restore app-data app-data-backup-20241201-030000 redis
```

### 监控数据恢复

```bash
# 恢复所有监控数据
./scripts/backup-restore.sh restore monitoring monitoring-backup-20241201-040000

# 仅恢复Prometheus数据
./scripts/backup-restore.sh restore monitoring monitoring-backup-20241201-040000 prometheus

# 仅恢复Grafana配置
./scripts/backup-restore.sh restore monitoring monitoring-backup-20241201-040000 grafana
```

### 恢复后验证

```bash
# 验证恢复结果
./scripts/backup-restore.sh verify restore database
./scripts/backup-restore.sh verify restore kubernetes
./scripts/backup-restore.sh verify restore monitoring

# 检查应用程序状态
kubectl get pods -n production
kubectl get pods -n monitoring
kubectl get pods -n logging

# 检查数据库连接
kubectl exec -n production deployment/figma-frame-faithful -- curl -f http://localhost:3000/health
```

## 🚨 灾难恢复流程

### 完全系统恢复流程

1. **评估损坏范围**
   ```bash
   # 检查集群状态
   kubectl cluster-info
   kubectl get nodes
   kubectl get namespaces
   ```

2. **准备新环境**（如果需要）
   ```bash
   # 如果集群完全丢失，重新创建集群
   # 部署基础设施
   ./scripts/deploy-monitoring.sh
   ./scripts/backup-restore.sh deploy
   ```

3. **按顺序恢复数据**
   ```bash
   # 1. 恢复Kubernetes配置
   ./scripts/backup-restore.sh --force restore config <latest-config-backup>
   
   # 2. 恢复数据库
   ./scripts/backup-restore.sh --force restore database <latest-db-backup>
   
   # 3. 恢复应用数据
   ./scripts/backup-restore.sh --force restore app-data <latest-app-backup>
   
   # 4. 恢复监控数据
   ./scripts/backup-restore.sh --force restore monitoring <latest-monitoring-backup>
   ```

4. **验证系统功能**
   ```bash
   # 检查所有服务状态
   kubectl get pods --all-namespaces
   
   # 测试应用功能
   curl -f https://your-app-domain.com/health
   
   # 检查监控系统
   kubectl port-forward -n monitoring svc/grafana 3000:3000
   ```

5. **恢复外部服务**
   - DNS配置
   - SSL证书
   - CDN配置
   - 第三方服务集成

### 部分恢复场景

#### 仅数据库损坏
```bash
# 停止应用
kubectl scale deployment figma-frame-faithful --replicas=0 -n production

# 恢复数据库
./scripts/backup-restore.sh --force restore database <backup-name>

# 重启应用
kubectl scale deployment figma-frame-faithful --replicas=3 -n production
```

#### 仅配置丢失
```bash
# 恢复特定命名空间配置
./scripts/backup-restore.sh --force restore config <backup-name> production
```

#### 仅监控系统问题
```bash
# 恢复监控配置
./scripts/backup-restore.sh --force restore monitoring <backup-name> grafana
```

## 🔧 配置管理

### 环境变量配置

创建 `.env` 文件或设置环境变量：

```bash
# AWS配置
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# S3存储桶
export S3_BUCKET="figma-frame-faithful-backups"

# Supabase配置
export SUPABASE_ACCESS_TOKEN="your-supabase-token"
export SUPABASE_DB_URL="postgresql://user:pass@host:port/db"

# 通知配置
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
export NOTIFICATION_EMAIL="ops@figma-frame-faithful.com"
```

### 自定义备份配置

编辑 `k8s/backup/backup-config.yaml` 中的配置：

```yaml
data:
  backup.conf: |
    # 修改备份保留期
    DB_BACKUP_RETENTION=14
    APP_BACKUP_RETENTION=14
    MONITORING_BACKUP_RETENTION=30
    
    # 修改备份调度
    DB_BACKUP_SCHEDULE="0 1 * * *"  # 每天凌晨1点
    
    # 修改存储配置
    S3_STORAGE_CLASS=STANDARD_IA
```

### 修改备份计划

```bash
# 编辑CronJob
kubectl edit cronjob database-backup -n backup

# 或重新部署配置
kubectl apply -f k8s/backup/backup-jobs.yaml
```

## 🔐 安全配置

### 加密设置

1. **备份文件加密**
   ```bash
   # 在备份脚本中启用加密
   BACKUP_ENCRYPTION=true
   ```

2. **传输加密**
   - S3传输使用HTTPS
   - Kubernetes内部通信使用TLS

3. **访问控制**
   ```bash
   # 限制S3存储桶访问
   aws s3api put-bucket-policy --bucket figma-frame-faithful-backups --policy file://bucket-policy.json
   ```

### 备份存储桶策略示例

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::ACCOUNT-ID:role/BackupRole"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::figma-frame-faithful-backups/*"
        }
    ]
}
```

## 📊 监控和告警

### 备份任务监控

1. **Prometheus指标**
   ```yaml
   # 监控备份任务成功率
   - alert: BackupJobFailed
     expr: kube_job_status_failed{namespace="backup"} > 0
     for: 5m
     labels:
       severity: critical
     annotations:
       summary: "备份任务失败"
   ```

2. **Grafana仪表板**
   - 备份任务执行状态
   - 备份文件大小趋势
   - 存储使用量统计

3. **日志监控**
   ```bash
   # 查看备份任务日志
   kubectl logs -f -l app=backup-system -n backup
   
   # 在Kibana中搜索备份相关日志
   namespace: "backup" AND (level: "error" OR level: "warning")
   ```

### 告警配置

1. **Slack通知**
   ```bash
   # 配置Slack Webhook
   kubectl create secret generic backup-notifications \
     --from-literal=SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK" \
     -n backup
   ```

2. **邮件通知**
   ```bash
   # 配置SMTP设置
   kubectl create secret generic email-config \
     --from-literal=SMTP_HOST="smtp.gmail.com" \
     --from-literal=SMTP_USER="alerts@company.com" \
     --from-literal=SMTP_PASSWORD="app-password" \
     -n backup
   ```

## 🧪 测试和验证

### 备份恢复测试

定期执行备份恢复测试以验证流程可靠性：

```bash
# 创建测试环境
kubectl create namespace test-restore

# 在测试环境中恢复数据
./scripts/backup-restore.sh --namespace test-restore restore database <backup-name>

# 验证恢复结果
kubectl exec -n test-restore deployment/test-app -- curl http://localhost:3000/health

# 清理测试环境
kubectl delete namespace test-restore
```

### 自动化测试脚本

```bash
#!/bin/bash
# backup-restore-test.sh

# 执行备份
./scripts/backup-restore.sh backup database

# 等待备份完成
sleep 300

# 获取最新备份
LATEST_BACKUP=$(./scripts/backup-restore.sh list database | tail -1 | awk '{print $4}' | sed 's/.tar.gz//')

# 在测试环境中恢复
kubectl create namespace backup-test
./scripts/backup-restore.sh --namespace backup-test --force restore database $LATEST_BACKUP

# 验证恢复
if kubectl exec -n backup-test deployment/test-app -- curl -f http://localhost:3000/health; then
    echo "✅ 备份恢复测试通过"
else
    echo "❌ 备份恢复测试失败"
    exit 1
fi

# 清理
kubectl delete namespace backup-test
```

## 📚 故障排查

### 常见问题

#### 1. 备份任务失败

```bash
# 查看任务状态
kubectl describe job <job-name> -n backup

# 查看Pod日志
kubectl logs <pod-name> -n backup

# 检查存储权限
aws s3 ls s3://figma-frame-faithful-backups/
```

#### 2. 恢复任务失败

```bash
# 检查恢复任务日志
kubectl logs job/restore-database-xxx -n backup

# 验证备份文件完整性
./scripts/backup-restore.sh verify backup <backup-name>

# 检查目标系统状态
kubectl get pods -n production
```

#### 3. 存储空间不足

```bash
# 查看存储使用情况
aws s3 ls s3://figma-frame-faithful-backups --recursive --human-readable --summarize

# 手动清理过期备份
./scripts/backup-restore.sh cleanup

# 调整生命周期策略
aws s3api get-bucket-lifecycle-configuration --bucket figma-frame-faithful-backups
```

#### 4. 网络连接问题

```bash
# 测试S3连接
aws s3 ls s3://figma-frame-faithful-backups

# 测试数据库连接
kubectl exec -n production deployment/figma-frame-faithful -- pg_isready -h <db-host>

# 检查DNS解析
kubectl exec -n backup deployment/backup-service -- nslookup s3.amazonaws.com
```

### 日志分析

#### 备份日志关键词

```bash
# 成功标识
grep "备份完成\|backup completed\|SUCCESS" /var/log/backup.log

# 错误标识
grep "ERROR\|失败\|failed" /var/log/backup.log

# 性能监控
grep "duration\|耗时\|took" /var/log/backup.log
```

#### 恢复日志关键词

```bash
# 恢复进度
grep "恢复.*%\|restore.*%" /var/log/restore.log

# 验证结果
grep "验证\|verification\|check" /var/log/restore.log
```

## 🔄 维护操作

### 定期维护任务

1. **每周检查**
   ```bash
   # 检查备份系统状态
   ./scripts/backup-restore.sh status
   
   # 验证最新备份
   ./scripts/backup-restore.sh verify backup <latest-backup>
   
   # 检查存储使用量
   aws s3 ls s3://figma-frame-faithful-backups --recursive --human-readable --summarize
   ```

2. **每月检查**
   ```bash
   # 执行完整恢复测试
   ./scripts/backup-restore-test.sh
   
   # 更新备份脚本和配置
   kubectl apply -f k8s/backup/
   
   # 检查告警配置
   kubectl get prometheusrules -n monitoring
   ```

3. **季度检查**
   ```bash
   # 审查备份策略
   # 测试灾难恢复流程
   # 更新文档和操作手册
   # 培训运维人员
   ```

### 配置更新

```bash
# 更新备份配置
kubectl apply -f k8s/backup/backup-config.yaml

# 重启备份任务以应用新配置
kubectl rollout restart deployment/backup-service -n backup

# 验证配置更新
kubectl get configmap backup-config -n backup -o yaml
```

## 📊 性能优化

### 备份性能调优

1. **并行备份**
   ```yaml
   # 在backup-jobs.yaml中调整并发策略
   spec:
     concurrencyPolicy: Allow  # 允许并发执行
     parallelism: 2            # 并行度
   ```

2. **压缩优化**
   ```bash
   # 在备份脚本中使用更高效的压缩
   tar -czf backup.tar.gz --use-compress-program=pigz data/
   ```

3. **增量备份**
   ```bash
   # 实施增量备份策略
   rsync -av --link-dest=/backup/latest /data/ /backup/$(date +%Y%m%d)/
   ```

### 存储成本优化

1. **生命周期策略**
   ```json
   {
     "Rules": [
       {
         "Transitions": [
           {"Days": 7, "StorageClass": "STANDARD_IA"},
           {"Days": 30, "StorageClass": "GLACIER"},
           {"Days": 90, "StorageClass": "DEEP_ARCHIVE"}
         ]
       }
     ]
   }
   ```

2. **压缩率监控**
   ```bash
   # 监控压缩效果
   aws s3api head-object --bucket figma-frame-faithful-backups --key backup.tar.gz
   ```

## 🎯 最佳实践

### 备份策略最佳实践

1. **3-2-1规则**
   - 3份数据副本
   - 2种不同的存储媒介
   - 1份异地备份

2. **测试驱动备份**
   - 定期测试备份恢复
   - 自动化测试流程
   - 记录测试结果

3. **安全第一**
   - 加密传输和存储
   - 最小权限原则
   - 定期审计访问日志

### 运维最佳实践

1. **文档维护**
   - 及时更新操作手册
   - 记录变更历史
   - 培训团队成员

2. **监控告警**
   - 全面的监控指标
   - 及时的告警通知
   - 明确的处理流程

3. **持续改进**
   - 定期评估备份策略
   - 优化性能和成本
   - 更新技术架构

---

## 🆘 紧急联系信息

### 技术支持

- **运维团队**: ops@figma-frame-faithful.com
- **紧急热线**: +1-xxx-xxx-xxxx
- **Slack频道**: #ops-emergency

### 外部服务支持

- **AWS Support**: [AWS控制台](https://console.aws.amazon.com/support/)
- **Supabase Support**: [Supabase Dashboard](https://supabase.com/dashboard)

---

**文档版本**: v1.0  
**最后更新**: 2024年12月  
**维护者**: Figma Frame Faithful DevOps Team