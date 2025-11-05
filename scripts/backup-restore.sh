#!/bin/bash

# 🔄 备份和恢复管理脚本
# 提供完整的备份和恢复操作管理功能

set -euo pipefail

# 脚本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$PROJECT_ROOT/k8s"
BACKUP_DIR="$K8S_DIR/backup"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认配置
S3_BUCKET="${S3_BUCKET:-figma-frame-faithful-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
BACKUP_NAMESPACE="backup"

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

success() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

# 显示帮助信息
show_help() {
    cat << EOF
🔄 备份和恢复管理脚本

用法: $0 <命令> [选项]

命令:
  deploy              部署备份系统
  list                列出可用的备份
  backup              执行手动备份
  restore             执行数据恢复
  verify              验证备份/恢复
  cleanup             清理过期备份
  status              检查备份系统状态
  logs                查看备份任务日志

备份命令:
  backup database     备份数据库
  backup config       备份Kubernetes配置
  backup app-data     备份应用数据
  backup monitoring   备份监控数据
  backup all          备份所有数据

恢复命令:
  restore database <backup-name>         恢复数据库
  restore config <backup-name>           恢复Kubernetes配置
  restore app-data <backup-name> [type]  恢复应用数据
  restore monitoring <backup-name>       恢复监控数据

列表命令:
  list backups        列出所有备份
  list database       列出数据库备份
  list config         列出配置备份
  list app-data       列出应用数据备份
  list monitoring     列出监控数据备份

验证命令:
  verify backup <backup-name>    验证备份完整性
  verify restore [type]          验证恢复结果

选项:
  --force             强制执行操作（危险）
  --dry-run           显示将要执行的操作但不实际执行
  --namespace <ns>    指定命名空间
  --bucket <bucket>   指定S3存储桶
  --region <region>   指定AWS区域
  -h, --help          显示此帮助信息

示例:
  $0 deploy                                    # 部署备份系统
  $0 backup database                           # 手动备份数据库
  $0 list database                            # 列出数据库备份
  $0 restore database supabase-backup-20241201-020000  # 恢复数据库
  $0 verify restore database                  # 验证数据库恢复
  $0 cleanup                                  # 清理过期备份

环境变量:
  S3_BUCKET           S3存储桶名称 (默认: figma-frame-faithful-backups)
  AWS_REGION          AWS区域 (默认: us-east-1)
  FORCE_RESTORE       强制恢复标志 (true/false)

EOF
}

# 检查依赖
check_dependencies() {
    local missing_deps=()
    
    # 检查kubectl
    if ! command -v kubectl &> /dev/null; then
        missing_deps+=("kubectl")
    fi
    
    # 检查aws cli
    if ! command -v aws &> /dev/null; then
        missing_deps+=("aws-cli")
    fi
    
    # 检查jq (用于JSON处理)
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        error "缺少依赖: ${missing_deps[*]}"
    fi
    
    # 检查Kubernetes连接
    if ! kubectl cluster-info &> /dev/null; then
        error "无法连接到Kubernetes集群"
    fi
    
    # 检查AWS凭证
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS凭证配置错误"
    fi
}

# 部署备份系统
deploy_backup_system() {
    log "部署备份和恢复系统..."
    
    # 检查配置文件
    local config_files=(
        "$BACKUP_DIR/backup-config.yaml"
        "$BACKUP_DIR/backup-jobs.yaml"
        "$BACKUP_DIR/restore-jobs.yaml"
    )
    
    for file in "${config_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "配置文件不存在: $file"
        fi
    done
    
    # 创建S3存储桶（如果不存在）
    if ! aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
        info "创建S3存储桶: $S3_BUCKET"
        aws s3 mb "s3://$S3_BUCKET" --region "$AWS_REGION"
        
        # 设置生命周期策略
        cat > /tmp/lifecycle.json << EOF
{
    "Rules": [
        {
            "ID": "backup-lifecycle",
            "Status": "Enabled",
            "Filter": {"Prefix": ""},
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 365,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ]
        }
    ]
}
EOF
        aws s3api put-bucket-lifecycle-configuration \
            --bucket "$S3_BUCKET" \
            --lifecycle-configuration file:///tmp/lifecycle.json
        rm /tmp/lifecycle.json
    fi
    
    # 部署配置
    info "部署备份配置..."
    kubectl apply -f "$BACKUP_DIR/backup-config.yaml"
    
    # 部署备份任务
    info "部署备份任务..."
    kubectl apply -f "$BACKUP_DIR/backup-jobs.yaml"
    
    # 部署恢复任务
    info "部署恢复任务..."
    kubectl apply -f "$BACKUP_DIR/restore-jobs.yaml"
    
    # 等待部署完成
    info "等待备份系统初始化..."
    kubectl wait --for=condition=Available deployment --all -n "$BACKUP_NAMESPACE" --timeout=300s 2>/dev/null || true
    
    success "备份系统部署完成"
    
    # 显示状态
    show_backup_status
}

# 显示备份系统状态
show_backup_status() {
    echo
    info "=== 备份系统状态 ==="
    
    # CronJob状态
    echo "定时备份任务:"
    kubectl get cronjobs -n "$BACKUP_NAMESPACE" -o wide 2>/dev/null || echo "  无定时任务"
    
    echo
    echo "最近备份任务:"
    kubectl get jobs -n "$BACKUP_NAMESPACE" --sort-by=.metadata.creationTimestamp | tail -5 2>/dev/null || echo "  无备份任务"
    
    echo
    echo "存储使用情况:"
    aws s3 ls "s3://$S3_BUCKET" --recursive --human-readable --summarize 2>/dev/null | tail -2 || echo "  无法获取存储信息"
    
    echo
    echo "配置状态:"
    kubectl get configmap,secret -n "$BACKUP_NAMESPACE" 2>/dev/null || echo "  无配置信息"
}

# 列出备份文件
list_backups() {
    local backup_type="${1:-all}"
    
    info "列出备份文件: $backup_type"
    
    case "$backup_type" in
        "all"|"backups")
            echo "📊 所有备份:"
            aws s3 ls "s3://$S3_BUCKET" --recursive --human-readable | sort -k1,2
            ;;
        "database")
            echo "💾 数据库备份:"
            aws s3 ls "s3://$S3_BUCKET/database/" --human-readable | sort -k1,2
            ;;
        "config")
            echo "⚙️ 配置备份:"
            aws s3 ls "s3://$S3_BUCKET/kubernetes-config/" --human-readable | sort -k1,2
            ;;
        "app-data")
            echo "📱 应用数据备份:"
            aws s3 ls "s3://$S3_BUCKET/app-data/" --human-readable | sort -k1,2
            ;;
        "monitoring")
            echo "📊 监控数据备份:"
            aws s3 ls "s3://$S3_BUCKET/monitoring/" --human-readable | sort -k1,2
            ;;
        *)
            error "未知的备份类型: $backup_type"
            ;;
    esac
}

# 执行手动备份
execute_backup() {
    local backup_type="${1:-all}"
    
    info "执行手动备份: $backup_type"
    
    case "$backup_type" in
        "database")
            trigger_backup_job "database-backup"
            ;;
        "config")
            trigger_backup_job "k8s-config-backup"
            ;;
        "app-data")
            trigger_backup_job "app-data-backup"
            ;;
        "monitoring")
            trigger_backup_job "monitoring-backup"
            ;;
        "all")
            info "执行全量备份..."
            trigger_backup_job "database-backup"
            sleep 30
            trigger_backup_job "k8s-config-backup"
            sleep 30
            trigger_backup_job "app-data-backup"
            sleep 30
            trigger_backup_job "monitoring-backup"
            ;;
        *)
            error "未知的备份类型: $backup_type"
            ;;
    esac
}

# 触发备份任务
trigger_backup_job() {
    local job_name="$1"
    local manual_job_name="manual-${job_name}-$(date +%Y%m%d%H%M%S)"
    
    info "触发备份任务: $job_name"
    
    # 检查CronJob是否存在
    if ! kubectl get cronjob "$job_name" -n "$BACKUP_NAMESPACE" &> /dev/null; then
        error "备份任务不存在: $job_name"
    fi
    
    # 创建手动Job
    kubectl create job "$manual_job_name" \
        --from=cronjob/"$job_name" \
        -n "$BACKUP_NAMESPACE"
    
    info "手动备份任务已创建: $manual_job_name"
    
    # 等待任务完成
    info "等待备份任务完成..."
    kubectl wait --for=condition=complete job/"$manual_job_name" \
        -n "$BACKUP_NAMESPACE" --timeout=3600s
    
    # 检查任务状态
    if kubectl get job "$manual_job_name" -n "$BACKUP_NAMESPACE" -o jsonpath='{.status.succeeded}' | grep -q "1"; then
        success "备份任务完成: $manual_job_name"
    else
        error "备份任务失败: $manual_job_name"
    fi
    
    # 显示日志
    info "备份任务日志:"
    kubectl logs job/"$manual_job_name" -n "$BACKUP_NAMESPACE" --tail=20
}

# 执行数据恢复
execute_restore() {
    local restore_type="$1"
    local backup_name="$2"
    local restore_option="${3:-}"
    
    if [[ -z "$backup_name" ]]; then
        error "请指定备份名称"
    fi
    
    info "执行数据恢复: $restore_type -> $backup_name"
    
    # 安全检查
    if [[ "${FORCE_RESTORE:-false}" != "true" ]] && [[ "${DRY_RUN:-false}" != "true" ]]; then
        echo
        warn "⚠️  数据恢复是危险操作，将覆盖现有数据！"
        warn "⚠️  请确保已经备份了当前数据！"
        echo
        read -p "确认执行恢复操作? (输入 'yes' 确认): " confirmation
        
        if [[ "$confirmation" != "yes" ]]; then
            info "恢复操作已取消"
            return 0
        fi
        
        export FORCE_RESTORE=true
    fi
    
    # 创建恢复Job
    local restore_job_name="restore-${restore_type}-$(date +%Y%m%d%H%M%S)"
    
    # 准备恢复Job配置
    cat > /tmp/restore-job.yaml << EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: $restore_job_name
  namespace: $BACKUP_NAMESPACE
spec:
  activeDeadlineSeconds: 7200
  backoffLimit: 1
  template:
    spec:
      serviceAccountName: backup-service
      restartPolicy: Never
      containers:
      - name: restore
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          # 安装工具
          apt-get update && apt-get install -y curl wget unzip awscli postgresql-client-14 redis-tools
          curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz --strip-components=1 -C /usr/local/bin
          
          # 执行恢复
          case "$RESTORE_TYPE" in
            "database")
              /scripts/restore-database.sh "$BACKUP_NAME"
              ;;
            "config")
              /scripts/restore-k8s-config.sh "$BACKUP_NAME" "$RESTORE_OPTION"
              ;;
            "app-data")
              /scripts/restore-app-data.sh "$BACKUP_NAME" "$RESTORE_OPTION"
              ;;
            "monitoring")
              /scripts/restore-monitoring.sh "$BACKUP_NAME" "$RESTORE_OPTION"
              ;;
            *)
              echo "ERROR: 未知的恢复类型: $RESTORE_TYPE"
              exit 1
              ;;
          esac
          
          # 验证恢复结果
          /scripts/verify-restore.sh "$RESTORE_TYPE"
        env:
        - name: RESTORE_TYPE
          value: "$restore_type"
        - name: BACKUP_NAME
          value: "$backup_name"
        - name: RESTORE_OPTION
          value: "$restore_option"
        - name: FORCE_RESTORE
          value: "${FORCE_RESTORE:-false}"
        envFrom:
        - secretRef:
            name: aws-credentials
        - secretRef:
            name: supabase-credentials
            optional: true
        - configMapRef:
            name: backup-config
        volumeMounts:
        - name: restore-scripts
          mountPath: /scripts
          readOnly: true
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: restore-scripts
        configMap:
          name: restore-scripts
          defaultMode: 0755
EOF
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        info "DRY RUN: 将要执行的恢复Job配置:"
        cat /tmp/restore-job.yaml
        rm /tmp/restore-job.yaml
        return 0
    fi
    
    # 执行恢复
    kubectl apply -f /tmp/restore-job.yaml
    rm /tmp/restore-job.yaml
    
    info "恢复任务已创建: $restore_job_name"
    
    # 等待任务完成
    info "等待恢复任务完成..."
    kubectl wait --for=condition=complete job/"$restore_job_name" \
        -n "$BACKUP_NAMESPACE" --timeout=7200s
    
    # 检查任务状态
    if kubectl get job "$restore_job_name" -n "$BACKUP_NAMESPACE" -o jsonpath='{.status.succeeded}' | grep -q "1"; then
        success "恢复任务完成: $restore_job_name"
    else
        error "恢复任务失败: $restore_job_name"
    fi
    
    # 显示日志
    info "恢复任务日志:"
    kubectl logs job/"$restore_job_name" -n "$BACKUP_NAMESPACE" --tail=50
}

# 验证备份
verify_backup() {
    local backup_name="$1"
    
    if [[ -z "$backup_name" ]]; then
        error "请指定备份名称"
    fi
    
    info "验证备份: $backup_name"
    
    # 检查备份文件是否存在
    local backup_found=false
    
    for prefix in "database" "kubernetes-config" "app-data" "monitoring"; do
        if aws s3 ls "s3://$S3_BUCKET/$prefix/" | grep -q "$backup_name"; then
            success "找到备份文件: $prefix/$backup_name"
            backup_found=true
            
            # 获取文件信息
            aws s3 ls "s3://$S3_BUCKET/$prefix/" --human-readable | grep "$backup_name"
        fi
    done
    
    if [[ "$backup_found" == "false" ]]; then
        error "未找到备份文件: $backup_name"
    fi
    
    # 检查备份完整性（下载并验证）
    info "检查备份完整性..."
    local temp_dir="/tmp/verify-backup-$$"
    mkdir -p "$temp_dir"
    
    for prefix in "database" "kubernetes-config" "app-data" "monitoring"; do
        local backup_file
        backup_file=$(aws s3 ls "s3://$S3_BUCKET/$prefix/" | grep "$backup_name" | awk '{print $4}' | head -1)
        
        if [[ -n "$backup_file" ]]; then
            info "下载并验证: $prefix/$backup_file"
            
            if aws s3 cp "s3://$S3_BUCKET/$prefix/$backup_file" "$temp_dir/" &> /dev/null; then
                # 检查文件大小
                local file_size
                file_size=$(stat -f%z "$temp_dir/$backup_file" 2>/dev/null || stat -c%s "$temp_dir/$backup_file" 2>/dev/null)
                
                if [[ "$file_size" -gt 0 ]]; then
                    success "备份文件完整: $backup_file (大小: $file_size 字节)"
                    
                    # 如果是tar.gz文件，检查压缩完整性
                    if [[ "$backup_file" == *.tar.gz ]]; then
                        if tar -tzf "$temp_dir/$backup_file" &> /dev/null; then
                            success "压缩文件完整性验证通过: $backup_file"
                        else
                            warn "压缩文件可能损坏: $backup_file"
                        fi
                    fi
                else
                    warn "备份文件为空: $backup_file"
                fi
            else
                warn "无法下载备份文件: $prefix/$backup_file"
            fi
        fi
    done
    
    # 清理临时文件
    rm -rf "$temp_dir"
    
    success "备份验证完成"
}

# 清理过期备份
cleanup_backups() {
    info "清理过期备份..."
    
    # 触发清理任务
    trigger_backup_job "backup-cleanup"
    
    success "备份清理完成"
}

# 查看日志
show_logs() {
    local job_type="${1:-all}"
    
    info "显示备份任务日志: $job_type"
    
    case "$job_type" in
        "all")
            kubectl logs -l app=backup-system -n "$BACKUP_NAMESPACE" --tail=100
            ;;
        "database")
            kubectl logs -l backup-type=database -n "$BACKUP_NAMESPACE" --tail=50
            ;;
        "config")
            kubectl logs -l backup-type=kubernetes-config -n "$BACKUP_NAMESPACE" --tail=50
            ;;
        "app-data")
            kubectl logs -l backup-type=application-data -n "$BACKUP_NAMESPACE" --tail=50
            ;;
        "monitoring")
            kubectl logs -l backup-type=monitoring-data -n "$BACKUP_NAMESPACE" --tail=50
            ;;
        *)
            error "未知的日志类型: $job_type"
            ;;
    esac
}

# 主函数
main() {
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                export FORCE_RESTORE=true
                shift
                ;;
            --dry-run)
                export DRY_RUN=true
                shift
                ;;
            --namespace)
                BACKUP_NAMESPACE="$2"
                shift 2
                ;;
            --bucket)
                S3_BUCKET="$2"
                shift 2
                ;;
            --region)
                AWS_REGION="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
    
    if [[ $# -eq 0 ]]; then
        show_help
        exit 1
    fi
    
    # 检查依赖
    check_dependencies
    
    # 执行命令
    case "$1" in
        "deploy")
            deploy_backup_system
            ;;
        "status")
            show_backup_status
            ;;
        "list")
            list_backups "${2:-all}"
            ;;
        "backup")
            execute_backup "${2:-all}"
            ;;
        "restore")
            execute_restore "${2:-}" "${3:-}" "${4:-}"
            ;;
        "verify")
            if [[ "${2:-}" == "backup" ]]; then
                verify_backup "${3:-}"
            elif [[ "${2:-}" == "restore" ]]; then
                # 验证恢复结果需要在恢复后执行
                info "请在恢复完成后检查系统状态"
            else
                error "请指定验证类型: backup 或 restore"
            fi
            ;;
        "cleanup")
            cleanup_backups
            ;;
        "logs")
            show_logs "${2:-all}"
            ;;
        *)
            error "未知命令: $1"
            ;;
    esac
}

# 运行主函数
main "$@"