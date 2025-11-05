#!/bin/bash
# 🔄 蓝绿部署脚本
# 实现零停机时间的生产环境部署

set -euo pipefail

# 配置
NAMESPACE="${NAMESPACE:-production}"
APP_NAME="figma-frame-faithful"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HEALTH_CHECK_PATH="/health"
DEPLOYMENT_TIMEOUT="${DEPLOYMENT_TIMEOUT:-600}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-180}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] DEPLOY:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] DEPLOY:${NC} ✅ $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] DEPLOY:${NC} ⚠️  $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] DEPLOY:${NC} ❌ $1"
}

log_info() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] DEPLOY:${NC} ℹ️  $1"
}

# 检查必要工具
check_prerequisites() {
    log "检查部署前置条件..."
    
    # 检查kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl未找到，请先安装kubectl"
        exit 1
    fi
    
    # 检查集群连接
    if ! kubectl cluster-info &> /dev/null; then
        log_error "无法连接到Kubernetes集群"
        exit 1
    fi
    
    # 检查命名空间
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "命名空间 $NAMESPACE 不存在"
        exit 1
    fi
    
    # 检查必要环境变量
    if [ -z "$IMAGE_TAG" ]; then
        log_error "IMAGE_TAG环境变量未设置"
        exit 1
    fi
    
    log_success "前置条件检查通过"
}

# 获取当前部署信息
get_current_deployment() {
    log "获取当前部署信息..."
    
    # 检查是否存在当前部署
    if kubectl get deployment "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        CURRENT_DEPLOYMENT="$APP_NAME"
        CURRENT_IMAGE=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
        CURRENT_REPLICAS=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
        
        log_info "当前部署: $CURRENT_DEPLOYMENT"
        log_info "当前镜像: $CURRENT_IMAGE"
        log_info "当前副本数: $CURRENT_REPLICAS"
    else
        log_warning "未找到当前部署，这是首次部署"
        CURRENT_DEPLOYMENT=""
        CURRENT_REPLICAS="3"
    fi
}

# 确定蓝绿环境
determine_environments() {
    log "确定蓝绿环境配置..."
    
    # 检查当前活跃环境
    if kubectl get service "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        CURRENT_ENV=$(kubectl get service "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.selector.environment}' 2>/dev/null || echo "blue")
    else
        CURRENT_ENV="blue"
    fi
    
    # 确定新环境
    if [ "$CURRENT_ENV" = "blue" ]; then
        NEW_ENV="green"
    else
        NEW_ENV="blue"
    fi
    
    NEW_DEPLOYMENT="$APP_NAME-$NEW_ENV"
    
    log_info "当前环境: $CURRENT_ENV"
    log_info "新环境: $NEW_ENV"
    log_info "新部署名称: $NEW_DEPLOYMENT"
}

# 创建新环境部署
deploy_new_environment() {
    log "部署新环境 ($NEW_ENV)..."
    
    # 生成新部署配置
    cat > "/tmp/$NEW_DEPLOYMENT.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $NEW_DEPLOYMENT
  namespace: $NAMESPACE
  labels:
    app: $APP_NAME
    environment: $NEW_ENV
    version: $(echo $IMAGE_TAG | cut -d: -f2)
spec:
  replicas: $CURRENT_REPLICAS
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 50%
      maxUnavailable: 0
  selector:
    matchLabels:
      app: $APP_NAME
      environment: $NEW_ENV
  template:
    metadata:
      labels:
        app: $APP_NAME
        environment: $NEW_ENV
        version: $(echo $IMAGE_TAG | cut -d: -f2)
      annotations:
        deployment.timestamp: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    spec:
      containers:
      - name: $APP_NAME
        image: $IMAGE_TAG
        ports:
        - containerPort: 80
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: APP_VERSION
          value: "$(echo $IMAGE_TAG | cut -d: -f2)"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: $HEALTH_CHECK_PATH
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: $HEALTH_CHECK_PATH
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
      terminationGracePeriodSeconds: 30
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        fsGroup: 101
EOF
    
    # 应用新部署
    kubectl apply -f "/tmp/$NEW_DEPLOYMENT.yaml"
    
    log_success "新环境部署配置已应用"
}

# 等待新部署就绪
wait_for_deployment() {
    log "等待新部署就绪..."
    
    # 等待部署滚动完成
    if kubectl rollout status deployment "$NEW_DEPLOYMENT" -n "$NAMESPACE" --timeout="${DEPLOYMENT_TIMEOUT}s"; then
        log_success "新部署滚动完成"
    else
        log_error "新部署滚动超时"
        return 1
    fi
    
    # 等待所有Pod就绪
    local ready_pods=0
    local total_pods=0
    local attempts=0
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 5))
    
    while [ $attempts -lt $max_attempts ]; do
        ready_pods=$(kubectl get deployment "$NEW_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        total_pods=$(kubectl get deployment "$NEW_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
        
        if [ "$ready_pods" = "$total_pods" ] && [ "$ready_pods" != "0" ]; then
            log_success "所有Pod已就绪 ($ready_pods/$total_pods)"
            return 0
        fi
        
        log_info "等待Pod就绪: $ready_pods/$total_pods"
        sleep 5
        attempts=$((attempts + 1))
    done
    
    log_error "Pod就绪检查超时"
    return 1
}

# 健康检查
health_check() {
    log "执行新环境健康检查..."
    
    # 获取Pod列表
    local pods=$(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME,environment=$NEW_ENV" -o jsonpath='{.items[*].metadata.name}')
    
    if [ -z "$pods" ]; then
        log_error "未找到新环境的Pod"
        return 1
    fi
    
    # 对每个Pod进行健康检查
    for pod in $pods; do
        log_info "检查Pod健康状态: $pod"
        
        # 端口转发进行健康检查
        kubectl port-forward "pod/$pod" -n "$NAMESPACE" 8080:80 &
        local pf_pid=$!
        
        sleep 3
        
        # 执行健康检查
        local health_status=""
        for i in {1..10}; do
            if curl -f -s "http://localhost:8080$HEALTH_CHECK_PATH" > /dev/null; then
                health_status="healthy"
                break
            fi
            sleep 2
        done
        
        # 清理端口转发
        kill $pf_pid 2>/dev/null || true
        
        if [ "$health_status" != "healthy" ]; then
            log_error "Pod $pod 健康检查失败"
            return 1
        fi
        
        log_success "Pod $pod 健康检查通过"
    done
    
    log_success "所有Pod健康检查通过"
}

# 切换流量
switch_traffic() {
    log "切换流量到新环境..."
    
    # 更新服务选择器
    kubectl patch service "$APP_NAME" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"app\":\"$APP_NAME\",\"environment\":\"$NEW_ENV\"}}}"
    
    log_success "流量已切换到新环境 ($NEW_ENV)"
    
    # 等待一段时间确保流量切换
    sleep 10
    
    # 验证服务端点
    local endpoints=$(kubectl get endpoints "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || echo "")
    if [ -n "$endpoints" ]; then
        log_success "服务端点已更新: $endpoints"
    else
        log_warning "服务端点为空，可能存在问题"
    fi
}

# 验证生产流量
validate_production_traffic() {
    log "验证生产环境流量..."
    
    # 获取服务外部IP/域名
    local service_url=""
    if [ -n "${SERVICE_URL:-}" ]; then
        service_url="$SERVICE_URL"
    else
        # 尝试从Ingress获取
        service_url=$(kubectl get ingress "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "")
        if [ -n "$service_url" ]; then
            service_url="https://$service_url"
        fi
    fi
    
    if [ -n "$service_url" ]; then
        log_info "验证服务URL: $service_url"
        
        local success_count=0
        local total_checks=10
        
        for i in $(seq 1 $total_checks); do
            if curl -f -s --max-time 10 "$service_url$HEALTH_CHECK_PATH" > /dev/null; then
                success_count=$((success_count + 1))
            fi
            sleep 2
        done
        
        local success_rate=$((success_count * 100 / total_checks))
        
        if [ $success_rate -ge 80 ]; then
            log_success "生产流量验证通过 (成功率: ${success_rate}%)"
        else
            log_error "生产流量验证失败 (成功率: ${success_rate}%)"
            return 1
        fi
    else
        log_warning "未配置服务URL，跳过外部访问验证"
    fi
}

# 清理旧环境
cleanup_old_environment() {
    log "清理旧环境..."
    
    if [ -n "$CURRENT_DEPLOYMENT" ] && [ "$CURRENT_DEPLOYMENT" != "$NEW_DEPLOYMENT" ]; then
        # 等待一段时间确保没有遗留连接
        log_info "等待30秒确保连接完全切换..."
        sleep 30
        
        # 缩容旧部署
        log_info "缩容旧部署: $CURRENT_DEPLOYMENT"
        kubectl scale deployment "$CURRENT_DEPLOYMENT" -n "$NAMESPACE" --replicas=0
        
        # 等待旧Pod终止
        kubectl wait --for=delete pods -l "app=$APP_NAME,environment=$CURRENT_ENV" -n "$NAMESPACE" --timeout=60s || true
        
        # 删除旧部署
        log_info "删除旧部署: $CURRENT_DEPLOYMENT"
        kubectl delete deployment "$CURRENT_DEPLOYMENT" -n "$NAMESPACE" --ignore-not-found=true
        
        log_success "旧环境清理完成"
    else
        log_info "无需清理旧环境"
    fi
}

# 回滚函数
rollback() {
    log_error "部署失败，开始回滚..."
    
    if [ -n "$CURRENT_DEPLOYMENT" ]; then
        # 恢复旧服务
        kubectl patch service "$APP_NAME" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"app\":\"$APP_NAME\",\"environment\":\"$CURRENT_ENV\"}}}" || true
        
        # 恢复旧部署副本数
        kubectl scale deployment "$CURRENT_DEPLOYMENT" -n "$NAMESPACE" --replicas="$CURRENT_REPLICAS" || true
        
        log_warning "已回滚到旧环境: $CURRENT_ENV"
    fi
    
    # 清理失败的新部署
    kubectl delete deployment "$NEW_DEPLOYMENT" -n "$NAMESPACE" --ignore-not-found=true
    
    log_error "回滚完成，部署失败"
    exit 1
}

# 部署状态报告
deployment_report() {
    log "生成部署报告..."
    
    echo "=================================="
    echo "🚀 蓝绿部署完成报告"
    echo "=================================="
    echo "时间: $(date)"
    echo "命名空间: $NAMESPACE"
    echo "应用: $APP_NAME"
    echo "新镜像: $IMAGE_TAG"
    echo "部署环境: $NEW_ENV"
    echo "副本数: $CURRENT_REPLICAS"
    echo ""
    
    # 显示当前Pod状态
    echo "📋 当前Pod状态:"
    kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME" -o wide
    echo ""
    
    # 显示服务状态
    echo "🌐 服务状态:"
    kubectl get service "$APP_NAME" -n "$NAMESPACE" -o wide
    echo ""
    
    # 显示Ingress状态（如果存在）
    if kubectl get ingress "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        echo "🔗 Ingress状态:"
        kubectl get ingress "$APP_NAME" -n "$NAMESPACE"
        echo ""
    fi
    
    echo "✅ 部署成功完成！"
    echo "=================================="
}

# 主函数
main() {
    log "🚀 开始蓝绿部署流程..."
    
    # 设置错误处理
    trap rollback ERR
    
    # 执行部署流程
    check_prerequisites
    get_current_deployment
    determine_environments
    deploy_new_environment
    
    if wait_for_deployment && health_check; then
        switch_traffic
        
        if validate_production_traffic; then
            cleanup_old_environment
            deployment_report
            log_success "🎉 蓝绿部署成功完成！"
        else
            rollback
        fi
    else
        rollback
    fi
}

# 执行主函数
main "$@"