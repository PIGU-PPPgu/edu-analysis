#!/bin/bash

# 🚀 部署监控和日志系统脚本
# 自动化部署Prometheus、Grafana、AlertManager、ELK栈等监控组件

set -euo pipefail

# 脚本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$PROJECT_ROOT/k8s"
MONITORING_DIR="$K8S_DIR/monitoring"
LOGGING_DIR="$K8S_DIR/logging"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# 检查依赖
check_dependencies() {
    log "检查系统依赖..."
    
    # 检查kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl 未安装，请先安装 kubectl"
    fi
    
    # 检查helm (可选)
    if command -v helm &> /dev/null; then
        info "检测到 Helm，将使用 Helm 进行部分部署"
        HELM_AVAILABLE=true
    else
        warn "未检测到 Helm，将使用纯 kubectl 部署"
        HELM_AVAILABLE=false
    fi
    
    # 检查集群连接
    if ! kubectl cluster-info &> /dev/null; then
        error "无法连接到 Kubernetes 集群，请检查 kubeconfig"
    fi
    
    log "✅ 依赖检查完成"
}

# 创建命名空间
create_namespaces() {
    log "创建命名空间..."
    
    # 创建监控命名空间
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    kubectl label namespace monitoring tier=infrastructure --overwrite
    
    # 创建日志命名空间
    kubectl create namespace logging --dry-run=client -o yaml | kubectl apply -f -
    kubectl label namespace logging tier=infrastructure --overwrite
    
    log "✅ 命名空间创建完成"
}

# 部署存储类
deploy_storage_classes() {
    log "部署存储类..."
    
    # 检查是否已存在存储类
    if kubectl get storageclass fast-ssd &> /dev/null; then
        info "存储类 fast-ssd 已存在，跳过创建"
    else
        # 创建高性能SSD存储类
        cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  labels:
    app: monitoring
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  fsType: ext4
allowVolumeExpansion: true
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
EOF
        log "✅ 存储类创建完成"
    fi
}

# 部署Prometheus监控系统
deploy_prometheus() {
    log "部署Prometheus监控系统..."
    
    # 检查配置文件
    if [[ ! -f "$MONITORING_DIR/prometheus.yaml" ]]; then
        error "Prometheus配置文件不存在: $MONITORING_DIR/prometheus.yaml"
    fi
    
    # 部署Prometheus
    kubectl apply -f "$MONITORING_DIR/prometheus.yaml"
    
    # 等待Prometheus启动
    info "等待Prometheus Pod启动..."
    kubectl wait --for=condition=Ready pod -l app=prometheus -n monitoring --timeout=300s
    
    # 检查Prometheus状态
    if kubectl get pods -n monitoring -l app=prometheus | grep -q "Running"; then
        log "✅ Prometheus部署成功"
        
        # 获取Prometheus访问信息
        info "Prometheus访问信息:"
        info "- 内部访问: http://prometheus.monitoring.svc.cluster.local:9090"
        info "- 端口转发: kubectl port-forward -n monitoring svc/prometheus 9090:9090"
    else
        error "Prometheus部署失败"
    fi
}

# 部署Grafana可视化系统
deploy_grafana() {
    log "部署Grafana可视化系统..."
    
    # 检查配置文件
    if [[ ! -f "$MONITORING_DIR/grafana.yaml" ]]; then
        error "Grafana配置文件不存在: $MONITORING_DIR/grafana.yaml"
    fi
    
    # 部署Grafana
    kubectl apply -f "$MONITORING_DIR/grafana.yaml"
    
    # 等待Grafana启动
    info "等待Grafana Pod启动..."
    kubectl wait --for=condition=Ready pod -l app=grafana -n monitoring --timeout=300s
    
    # 检查Grafana状态
    if kubectl get pods -n monitoring -l app=grafana | grep -q "Running"; then
        log "✅ Grafana部署成功"
        
        # 获取Grafana访问信息
        info "Grafana访问信息:"
        info "- 内部访问: http://grafana.monitoring.svc.cluster.local:3000"
        info "- 端口转发: kubectl port-forward -n monitoring svc/grafana 3000:3000"
        info "- 默认账号: admin / admin123!@#"
    else
        error "Grafana部署失败"
    fi
}

# 部署AlertManager告警系统
deploy_alertmanager() {
    log "部署AlertManager告警系统..."
    
    # 检查配置文件
    if [[ ! -f "$MONITORING_DIR/alertmanager.yaml" ]]; then
        error "AlertManager配置文件不存在: $MONITORING_DIR/alertmanager.yaml"
    fi
    
    # 部署AlertManager
    kubectl apply -f "$MONITORING_DIR/alertmanager.yaml"
    
    # 等待AlertManager启动
    info "等待AlertManager Pod启动..."
    kubectl wait --for=condition=Ready pod -l app=alertmanager -n monitoring --timeout=300s
    
    # 检查AlertManager状态
    if kubectl get pods -n monitoring -l app=alertmanager | grep -q "Running"; then
        log "✅ AlertManager部署成功"
        
        # 获取AlertManager访问信息
        info "AlertManager访问信息:"
        info "- 内部访问: http://alertmanager.monitoring.svc.cluster.local:9093"
        info "- 端口转发: kubectl port-forward -n monitoring svc/alertmanager 9093:9093"
    else
        error "AlertManager部署失败"
    fi
}

# 部署Node Exporter
deploy_node_exporter() {
    log "部署Node Exporter..."
    
    # 检查配置文件
    if [[ ! -f "$MONITORING_DIR/node-exporter.yaml" ]]; then
        error "Node Exporter配置文件不存在: $MONITORING_DIR/node-exporter.yaml"
    fi
    
    # 部署Node Exporter
    kubectl apply -f "$MONITORING_DIR/node-exporter.yaml"
    
    # 等待Node Exporter启动
    info "等待Node Exporter DaemonSet启动..."
    kubectl rollout status daemonset/node-exporter -n monitoring --timeout=300s
    
    # 检查Node Exporter状态
    NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
    RUNNING_COUNT=$(kubectl get pods -n monitoring -l app=node-exporter --no-headers | grep Running | wc -l)
    
    if [[ "$RUNNING_COUNT" -eq "$NODE_COUNT" ]]; then
        log "✅ Node Exporter部署成功 ($RUNNING_COUNT/$NODE_COUNT 节点)"
    else
        warn "Node Exporter部署部分成功 ($RUNNING_COUNT/$NODE_COUNT 节点)"
    fi
}

# 部署Elasticsearch
deploy_elasticsearch() {
    log "部署Elasticsearch日志存储..."
    
    # 检查配置文件
    if [[ ! -f "$LOGGING_DIR/elasticsearch.yaml" ]]; then
        error "Elasticsearch配置文件不存在: $LOGGING_DIR/elasticsearch.yaml"
    fi
    
    # 部署Elasticsearch
    kubectl apply -f "$LOGGING_DIR/elasticsearch.yaml"
    
    # 等待Elasticsearch启动（可能需要较长时间）
    info "等待Elasticsearch集群启动（可能需要5-10分钟）..."
    kubectl wait --for=condition=Ready pod -l app=elasticsearch -n logging --timeout=600s
    
    # 检查Elasticsearch状态
    if kubectl get pods -n logging -l app=elasticsearch | grep -q "Running"; then
        log "✅ Elasticsearch部署成功"
        
        # 等待集群就绪
        info "检查Elasticsearch集群健康状态..."
        for i in {1..30}; do
            if kubectl exec -n logging statefulset/elasticsearch-master -- curl -s http://localhost:9200/_cluster/health | grep -q "yellow\|green"; then
                log "✅ Elasticsearch集群健康状态正常"
                break
            fi
            info "等待集群健康检查... ($i/30)"
            sleep 10
        done
    else
        error "Elasticsearch部署失败"
    fi
}

# 部署Logstash
deploy_logstash() {
    log "部署Logstash日志处理..."
    
    # 检查配置文件
    if [[ ! -f "$LOGGING_DIR/logstash.yaml" ]]; then
        error "Logstash配置文件不存在: $LOGGING_DIR/logstash.yaml"
    fi
    
    # 部署Logstash
    kubectl apply -f "$LOGGING_DIR/logstash.yaml"
    
    # 等待Logstash启动
    info "等待Logstash Pod启动..."
    kubectl wait --for=condition=Ready pod -l app=logstash -n logging --timeout=300s
    
    # 检查Logstash状态
    if kubectl get pods -n logging -l app=logstash | grep -q "Running"; then
        log "✅ Logstash部署成功"
    else
        error "Logstash部署失败"
    fi
}

# 部署Kibana
deploy_kibana() {
    log "部署Kibana日志可视化..."
    
    # 检查配置文件
    if [[ ! -f "$LOGGING_DIR/kibana.yaml" ]]; then
        error "Kibana配置文件不存在: $LOGGING_DIR/kibana.yaml"
    fi
    
    # 部署Kibana
    kubectl apply -f "$LOGGING_DIR/kibana.yaml"
    
    # 等待Kibana启动
    info "等待Kibana Pod启动..."
    kubectl wait --for=condition=Ready pod -l app=kibana -n logging --timeout=300s
    
    # 检查Kibana状态
    if kubectl get pods -n logging -l app=kibana | grep -q "Running"; then
        log "✅ Kibana部署成功"
        
        # 获取Kibana访问信息
        info "Kibana访问信息:"
        info "- 内部访问: http://kibana.logging.svc.cluster.local:5601"
        info "- 端口转发: kubectl port-forward -n logging svc/kibana 5601:5601"
    else
        error "Kibana部署失败"
    fi
}

# 部署Filebeat
deploy_filebeat() {
    log "部署Filebeat日志收集..."
    
    # 检查配置文件
    if [[ ! -f "$LOGGING_DIR/filebeat.yaml" ]]; then
        error "Filebeat配置文件不存在: $LOGGING_DIR/filebeat.yaml"
    fi
    
    # 部署Filebeat
    kubectl apply -f "$LOGGING_DIR/filebeat.yaml"
    
    # 等待Filebeat启动
    info "等待Filebeat DaemonSet启动..."
    kubectl rollout status daemonset/filebeat -n logging --timeout=300s
    
    # 检查Filebeat状态
    NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
    RUNNING_COUNT=$(kubectl get pods -n logging -l app=filebeat --no-headers | grep Running | wc -l)
    
    if [[ "$RUNNING_COUNT" -eq "$NODE_COUNT" ]]; then
        log "✅ Filebeat部署成功 ($RUNNING_COUNT/$NODE_COUNT 节点)"
    else
        warn "Filebeat部署部分成功 ($RUNNING_COUNT/$NODE_COUNT 节点)"
    fi
}

# 配置监控对象
configure_monitoring() {
    log "配置应用监控..."
    
    # 为应用Pod添加Prometheus注解
    kubectl patch deployment figma-frame-faithful -n production --type='merge' -p='{
        "spec": {
            "template": {
                "metadata": {
                    "annotations": {
                        "prometheus.io/scrape": "true",
                        "prometheus.io/port": "80",
                        "prometheus.io/path": "/metrics"
                    }
                }
            }
        }
    }' || warn "应用deployment不存在，跳过监控配置"
    
    # 为应用Pod添加日志标签
    kubectl patch deployment figma-frame-faithful -n production --type='merge' -p='{
        "spec": {
            "template": {
                "metadata": {
                    "labels": {
                        "logging": "enabled"
                    }
                }
            }
        }
    }' || warn "应用deployment不存在，跳过日志配置"
    
    log "✅ 监控配置完成"
}

# 创建Ingress (可选)
create_ingress() {
    if [[ "${ENABLE_INGRESS:-false}" == "true" ]]; then
        log "创建Ingress访问入口..."
        
        # Grafana Ingress
        cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana
  namespace: monitoring
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-production
spec:
  tls:
  - hosts:
    - grafana.figma-frame-faithful.com
    secretName: grafana-tls-secret
  rules:
  - host: grafana.figma-frame-faithful.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 3000
EOF
        
        log "✅ Ingress创建完成"
    fi
}

# 验证部署
verify_deployment() {
    log "验证部署状态..."
    
    echo
    info "=== 监控系统状态 ==="
    kubectl get pods -n monitoring -o wide
    
    echo
    info "=== 日志系统状态 ==="
    kubectl get pods -n logging -o wide
    
    echo
    info "=== 服务状态 ==="
    kubectl get svc -n monitoring
    kubectl get svc -n logging
    
    echo
    info "=== 存储状态 ==="
    kubectl get pvc -n monitoring
    kubectl get pvc -n logging
    
    # 检查关键组件健康状态
    echo
    info "=== 组件健康检查 ==="
    
    # Prometheus健康检查
    if kubectl exec -n monitoring deployment/prometheus -- wget -q -O- http://localhost:9090/-/healthy 2>/dev/null | grep -q "Prometheus is Healthy"; then
        log "✅ Prometheus 健康状态正常"
    else
        warn "❌ Prometheus 健康检查失败"
    fi
    
    # Grafana健康检查
    if kubectl exec -n monitoring deployment/grafana -- curl -s http://localhost:3000/api/health 2>/dev/null | grep -q "ok"; then
        log "✅ Grafana 健康状态正常"
    else
        warn "❌ Grafana 健康检查失败"
    fi
    
    # Elasticsearch健康检查
    if kubectl exec -n logging statefulset/elasticsearch-master -- curl -s http://localhost:9200/_cluster/health 2>/dev/null | grep -q "yellow\|green"; then
        log "✅ Elasticsearch 集群健康状态正常"
    else
        warn "❌ Elasticsearch 健康检查失败"
    fi
}

# 显示访问信息
show_access_info() {
    echo
    log "🎉 监控和日志系统部署完成！"
    echo
    info "=== 访问信息 ==="
    info "📊 Prometheus (监控数据收集):"
    info "   kubectl port-forward -n monitoring svc/prometheus 9090:9090"
    info "   然后访问: http://localhost:9090"
    echo
    info "📈 Grafana (监控可视化):"
    info "   kubectl port-forward -n monitoring svc/grafana 3000:3000"
    info "   然后访问: http://localhost:3000"
    info "   默认账号: admin / admin123!@#"
    echo
    info "🚨 AlertManager (告警管理):"
    info "   kubectl port-forward -n monitoring svc/alertmanager 9093:9093"
    info "   然后访问: http://localhost:9093"
    echo
    info "🔍 Kibana (日志可视化):"
    info "   kubectl port-forward -n logging svc/kibana 5601:5601"
    info "   然后访问: http://localhost:5601"
    echo
    info "📊 Elasticsearch (日志存储):"
    info "   kubectl port-forward -n logging svc/elasticsearch 9200:9200"
    info "   然后访问: http://localhost:9200"
    echo
    info "=== 常用命令 ==="
    info "查看监控Pod状态: kubectl get pods -n monitoring"
    info "查看日志Pod状态: kubectl get pods -n logging"
    info "查看Prometheus配置: kubectl get configmap prometheus-config -n monitoring -o yaml"
    info "查看应用日志: kubectl logs -f -l app=figma-frame-faithful -n production"
    echo
    warn "⚠️  注意事项:"
    warn "1. 首次启动可能需要几分钟时间初始化"
    warn "2. 请确保集群有足够的资源 (至少8GB内存，4CPU核心)"
    warn "3. 生产环境请修改默认密码和配置文件中的邮件/Slack设置"
    warn "4. 建议配置持久化存储以防数据丢失"
}

# 清理函数
cleanup() {
    if [[ "${CLEANUP_ON_ERROR:-false}" == "true" ]]; then
        warn "检测到错误，正在清理资源..."
        kubectl delete namespace monitoring --ignore-not-found=true
        kubectl delete namespace logging --ignore-not-found=true
        kubectl delete storageclass fast-ssd --ignore-not-found=true
    fi
}

# 主函数
main() {
    log "🚀 开始部署监控和日志系统..."
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --enable-ingress)
                export ENABLE_INGRESS=true
                shift
                ;;
            --cleanup-on-error)
                export CLEANUP_ON_ERROR=true
                shift
                ;;
            --monitoring-only)
                export MONITORING_ONLY=true
                shift
                ;;
            --logging-only)
                export LOGGING_ONLY=true
                shift
                ;;
            -h|--help)
                echo "用法: $0 [选项]"
                echo "选项:"
                echo "  --enable-ingress     启用Ingress访问"
                echo "  --cleanup-on-error   错误时清理资源"
                echo "  --monitoring-only    仅部署监控系统"
                echo "  --logging-only       仅部署日志系统"
                echo "  -h, --help          显示帮助信息"
                exit 0
                ;;
            *)
                error "未知参数: $1"
                ;;
        esac
    done
    
    # 设置错误处理
    trap cleanup ERR
    
    # 执行部署步骤
    check_dependencies
    create_namespaces
    deploy_storage_classes
    
    # 根据参数选择部署内容
    if [[ "${LOGGING_ONLY:-false}" != "true" ]]; then
        deploy_prometheus
        deploy_grafana
        deploy_alertmanager
        deploy_node_exporter
    fi
    
    if [[ "${MONITORING_ONLY:-false}" != "true" ]]; then
        deploy_elasticsearch
        deploy_logstash
        deploy_kibana
        deploy_filebeat
    fi
    
    configure_monitoring
    create_ingress
    verify_deployment
    show_access_info
    
    log "🎉 部署完成！"
}

# 运行主函数
main "$@"