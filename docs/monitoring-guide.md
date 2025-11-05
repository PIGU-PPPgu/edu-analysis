# 📊 监控和日志系统使用指南

## 🎯 系统概览

本文档介绍 Figma Frame Faithful 项目的完整监控和日志系统，包括部署、配置和使用方法。

### 🏗️ 架构组件

#### 监控系统 (Monitoring)
- **Prometheus** - 指标收集和存储
- **Grafana** - 可视化仪表板
- **AlertManager** - 告警管理和通知
- **Node Exporter** - 节点指标收集

#### 日志系统 (Logging)
- **Elasticsearch** - 日志存储和搜索
- **Logstash** - 日志处理和转换
- **Kibana** - 日志可视化和分析
- **Filebeat** - 日志收集代理

## 🚀 快速部署

### 自动化部署

使用提供的部署脚本一键部署整个监控和日志系统：

```bash
# 部署完整的监控和日志系统
./scripts/deploy-monitoring.sh

# 仅部署监控系统
./scripts/deploy-monitoring.sh --monitoring-only

# 仅部署日志系统
./scripts/deploy-monitoring.sh --logging-only

# 启用Ingress外部访问
./scripts/deploy-monitoring.sh --enable-ingress
```

### 手动部署

如果需要更精细的控制，可以手动部署各个组件：

```bash
# 1. 创建命名空间
kubectl create namespace monitoring
kubectl create namespace logging

# 2. 部署监控系统
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml
kubectl apply -f k8s/monitoring/alertmanager.yaml
kubectl apply -f k8s/monitoring/node-exporter.yaml

# 3. 部署日志系统
kubectl apply -f k8s/logging/elasticsearch.yaml
kubectl apply -f k8s/logging/logstash.yaml
kubectl apply -f k8s/logging/kibana.yaml
kubectl apply -f k8s/logging/filebeat.yaml
```

## 🔍 系统访问

### 本地访问 (端口转发)

```bash
# Prometheus (监控数据)
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# 访问: http://localhost:9090

# Grafana (监控仪表板)
kubectl port-forward -n monitoring svc/grafana 3000:3000
# 访问: http://localhost:3000
# 默认账号: admin / admin123!@#

# AlertManager (告警管理)
kubectl port-forward -n monitoring svc/alertmanager 9093:9093
# 访问: http://localhost:9093

# Kibana (日志分析)
kubectl port-forward -n logging svc/kibana 5601:5601
# 访问: http://localhost:5601

# Elasticsearch (直接API访问)
kubectl port-forward -n logging svc/elasticsearch 9200:9200
# 访问: http://localhost:9200
```

### 生产环境访问

如果启用了Ingress，可以通过以下域名访问：

- Grafana: `https://grafana.figma-frame-faithful.com`
- Kibana: `https://kibana.figma-frame-faithful.com`

## 📊 Grafana仪表板

### 预配置仪表板

系统预置了以下仪表板：

1. **Kubernetes集群监控**
   - 节点状态和资源使用
   - Pod状态分布
   - 网络流量监控

2. **应用程序监控**
   - HTTP请求统计
   - 响应时间分析
   - 错误率监控
   - Pod资源使用

3. **基础设施监控**
   - CPU、内存、磁盘使用率
   - 网络I/O统计
   - 系统负载监控

### 自定义仪表板

在Grafana中创建自定义仪表板：

1. 登录Grafana (admin/admin123!@#)
2. 点击 "+" → "Dashboard"
3. 添加Panel，选择数据源 "Prometheus"
4. 编写PromQL查询语句

#### 常用PromQL查询

```promql
# CPU使用率
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 内存使用率
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# HTTP请求率
rate(nginx_ingress_controller_requests_total[5m])

# 应用响应时间 (95th percentile)
histogram_quantile(0.95, rate(nginx_ingress_controller_request_duration_seconds_bucket[5m]))

# Pod重启次数
increase(kube_pod_container_status_restarts_total[1h])
```

## 📋 日志分析

### Kibana使用指南

#### 创建索引模式

1. 打开Kibana → Management → Stack Management → Index Patterns
2. 创建以下索引模式：
   - `application-logs-*` (应用日志)
   - `nginx-logs-*` (Nginx访问日志)
   - `kubernetes-logs-*` (Kubernetes系统日志)

#### 日志查询语法

```javascript
// 查询错误日志
log_level: "error" OR has_error: true

// 查询特定时间段的日志
@timestamp: [2024-01-01 TO 2024-01-02]

// 查询特定Pod的日志
kubernetes.pod.name: "figma-frame-faithful-*"

// 查询HTTP错误
status_category: "server_error" OR response: [500 TO 599]

// 查询性能慢的请求
duration: [1000 TO *]

// 组合查询
log_level: "error" AND kubernetes.namespace: "production" AND @timestamp: [now-1h TO now]
```

### 日志聚合和分析

#### 创建可视化图表

1. **错误趋势图**
   - 索引: `application-logs-*`
   - 图表类型: Line Chart
   - X轴: @timestamp (Date Histogram)
   - Y轴: Count of documents
   - 过滤器: `has_error: true`

2. **HTTP状态码分布**
   - 索引: `nginx-logs-*`
   - 图表类型: Pie Chart
   - 分割: response (Terms)
   - 指标: Count

3. **性能热力图**
   - 索引: `application-logs-*`
   - 图表类型: Heatmap
   - X轴: @timestamp
   - Y轴: duration
   - 值: Count

## 🚨 告警配置

### AlertManager告警规则

系统预配置了以下告警规则：

#### 基础设施告警

```yaml
# 节点宕机
- alert: NodeDown
  expr: up{job="node-exporter"} == 0
  for: 5m

# 高CPU使用率
- alert: NodeHighCPU
  expr: 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
  for: 10m

# 高内存使用率
- alert: NodeHighMemory
  expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
  for: 5m
```

#### 应用告警

```yaml
# Pod崩溃循环
- alert: PodCrashLooping
  expr: rate(kube_pod_container_status_restarts_total[10m]) > 0
  for: 5m

# 高响应时间
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(nginx_ingress_controller_request_duration_seconds_bucket[5m])) > 2
  for: 10m

# 高错误率
- alert: HighErrorRate
  expr: rate(nginx_ingress_controller_requests_total{status=~"5.."}[5m]) / rate(nginx_ingress_controller_requests_total[5m]) * 100 > 5
  for: 5m
```

### 自定义告警规则

在`k8s/monitoring/prometheus.yaml`中添加自定义规则：

```yaml
groups:
- name: custom.rules
  rules:
  - alert: CustomAlert
    expr: your_metric > threshold
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "自定义告警"
      description: "详细描述"
```

### 通知配置

编辑`k8s/monitoring/alertmanager.yaml`配置通知渠道：

#### 邮件通知

```yaml
email_configs:
- to: 'admin@figma-frame-faithful.com'
  subject: '🚨 告警通知'
  body: |
    告警: {{ .Annotations.summary }}
    描述: {{ .Annotations.description }}
```

#### Slack通知

```yaml
slack_configs:
- channel: '#alerts'
  title: '🚨 系统告警'
  text: |
    *告警:* {{ .Annotations.summary }}
    *描述:* {{ .Annotations.description }}
```

#### 钉钉通知

```yaml
webhook_configs:
- url: 'https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN'
  send_resolved: true
```

## 🔧 系统维护

### 监控系统健康检查

```bash
# 检查所有监控组件状态
kubectl get pods -n monitoring
kubectl get pods -n logging

# 检查服务状态
kubectl get svc -n monitoring
kubectl get svc -n logging

# 检查存储使用情况
kubectl get pvc -n monitoring
kubectl get pvc -n logging

# 查看资源使用情况
kubectl top pods -n monitoring
kubectl top pods -n logging
```

### 数据保留策略

#### Prometheus数据保留

默认保留30天，可在配置中修改：

```yaml
args:
- '--storage.tsdb.retention.time=30d'
- '--storage.tsdb.retention.size=90GB'
```

#### Elasticsearch数据保留

创建ILM策略自动管理索引生命周期：

```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "10GB",
            "max_age": "7d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "allocate": {
            "number_of_replicas": 0
          }
        }
      },
      "delete": {
        "min_age": "30d"
      }
    }
  }
}
```

### 性能优化

#### Prometheus性能调优

```yaml
# 增加内存限制
resources:
  limits:
    memory: "8Gi"

# 调整抓取间隔
global:
  scrape_interval: 30s
  evaluation_interval: 30s

# 启用压缩
remote_write:
- url: "http://remote-storage/api/v1/write"
  compression: snappy
```

#### Elasticsearch性能调优

```yaml
# JVM堆内存设置
env:
- name: ES_JAVA_OPTS
  value: "-Xms4g -Xmx4g"

# 索引设置优化
template:
  settings:
    number_of_shards: 1
    number_of_replicas: 1
    refresh_interval: "30s"
    index.codec: "best_compression"
```

### 备份和恢复

#### Prometheus数据备份

```bash
# 创建快照
curl -XPOST http://prometheus:9090/api/v1/admin/tsdb/snapshot

# 复制快照数据
kubectl cp monitoring/prometheus-pod:/prometheus/snapshots/snapshot-name ./backup/
```

#### Elasticsearch数据备份

```bash
# 创建仓库
curl -X PUT "elasticsearch:9200/_snapshot/backup_repository" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/backup"
  }
}'

# 创建快照
curl -X PUT "elasticsearch:9200/_snapshot/backup_repository/snapshot_1"
```

## 🔐 安全配置

### 认证和授权

#### Grafana安全设置

```yaml
# 修改默认密码
env:
- name: GF_SECURITY_ADMIN_PASSWORD
  valueFrom:
    secretKeyRef:
      name: grafana-secret
      key: admin-password

# 启用LDAP认证
- name: GF_AUTH_LDAP_ENABLED
  value: "true"
```

#### Elasticsearch安全设置

```yaml
# 启用X-Pack安全
xpack.security.enabled: true

# 配置TLS
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: true
```

### 网络安全

#### 网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: monitoring-network-policy
spec:
  podSelector:
    matchLabels:
      tier: monitoring
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
```

#### TLS加密

为所有组件间通信启用TLS加密：

```yaml
# Prometheus TLS配置
tls_config:
  ca_file: /etc/ssl/certs/ca.crt
  cert_file: /etc/ssl/certs/client.crt
  key_file: /etc/ssl/private/client.key
```

## 📚 故障排查

### 常见问题

#### 1. Prometheus无法抓取指标

```bash
# 检查目标状态
kubectl exec -n monitoring deployment/prometheus -- wget -qO- http://localhost:9090/api/v1/targets

# 检查网络连接
kubectl exec -n monitoring deployment/prometheus -- nslookup target-service

# 检查服务发现
kubectl get endpoints -n target-namespace
```

#### 2. Grafana无法连接Prometheus

```bash
# 检查数据源配置
kubectl exec -n monitoring deployment/grafana -- curl -s http://prometheus:9090/api/v1/query?query=up

# 检查DNS解析
kubectl exec -n monitoring deployment/grafana -- nslookup prometheus.monitoring.svc.cluster.local
```

#### 3. Elasticsearch集群状态异常

```bash
# 检查集群健康状态
kubectl exec -n logging statefulset/elasticsearch-master -- curl -s http://localhost:9200/_cluster/health

# 检查节点状态
kubectl exec -n logging statefulset/elasticsearch-master -- curl -s http://localhost:9200/_cat/nodes?v

# 检查索引状态
kubectl exec -n logging statefulset/elasticsearch-master -- curl -s http://localhost:9200/_cat/indices?v
```

#### 4. 日志数据丢失

```bash
# 检查Filebeat状态
kubectl logs -n logging daemonset/filebeat

# 检查Logstash处理状态
kubectl logs -n logging deployment/logstash

# 检查Elasticsearch存储
kubectl exec -n logging statefulset/elasticsearch-master -- curl -s http://localhost:9200/_cat/allocation?v
```

### 日志分析

#### 监控组件日志

```bash
# Prometheus日志
kubectl logs -n monitoring deployment/prometheus -f

# Grafana日志
kubectl logs -n monitoring deployment/grafana -f

# Elasticsearch日志
kubectl logs -n logging statefulset/elasticsearch-master -f

# Logstash日志
kubectl logs -n logging deployment/logstash -f
```

#### 系统事件

```bash
# 查看Pod事件
kubectl describe pod -n monitoring prometheus-pod-name

# 查看命名空间事件
kubectl get events -n monitoring --sort-by='.lastTimestamp'

# 查看节点事件
kubectl get events --field-selector involvedObject.kind=Node
```

## 📈 性能监控指标

### 关键性能指标 (KPIs)

#### 应用性能指标

- **响应时间**: 95th percentile < 2秒
- **错误率**: < 1%
- **可用性**: > 99.9%
- **吞吐量**: 根据业务需求设定

#### 基础设施指标

- **CPU使用率**: < 80%
- **内存使用率**: < 85%
- **磁盘使用率**: < 80%
- **网络延迟**: < 100ms

#### 监控系统自身指标

- **Prometheus数据摄入率**: 监控样本数/秒
- **Grafana响应时间**: < 3秒
- **Elasticsearch查询性能**: < 500ms
- **日志处理延迟**: < 30秒

### 容量规划

#### 存储需求估算

```bash
# Prometheus存储需求 (每天)
# 样本数 × 样本大小 × 86400秒 ÷ 抓取间隔
# 例: 10000 × 1bytes × 86400 ÷ 15 = 57.6MB/天

# Elasticsearch存储需求
# 日志条数 × 平均日志大小
# 例: 1000000 × 500bytes = 500MB/天
```

## 🎯 最佳实践

### 监控最佳实践

1. **分层监控**: 基础设施 → 应用 → 业务
2. **告警分级**: Critical → Warning → Info
3. **SLI/SLO设定**: 明确服务质量目标
4. **可观测性**: 指标 + 日志 + 链路追踪

### 日志最佳实践

1. **结构化日志**: 使用JSON格式
2. **统一日志级别**: ERROR → WARN → INFO → DEBUG
3. **上下文信息**: 包含请求ID、用户ID等
4. **敏感信息脱敏**: 避免记录密码、token等

### 运维最佳实践

1. **定期备份**: 监控数据和配置
2. **容量规划**: 预估存储和计算需求
3. **安全加固**: 认证、授权、加密
4. **文档维护**: 保持文档更新

---

## 🆘 技术支持

如有问题或需要帮助，请：

1. 查看系统日志和监控指标
2. 参考本文档的故障排查部分
3. 联系运维团队: ops@figma-frame-faithful.com
4. 提交Issue到项目仓库

---

**文档版本**: v1.0  
**最后更新**: 2024年12月  
**维护者**: Figma Frame Faithful DevOps Team