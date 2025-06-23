import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  History, Clock, User, MessageCircle, TrendingUp, TrendingDown, 
  CheckCircle, XCircle, AlertTriangle, ArrowRight, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

// 预警历史记录接口
interface WarningHistoryRecord {
  id: string;
  warning_id: string;
  action_type: 'created' | 'resolved' | 'dismissed' | 'reactivated' | 'updated' | 'commented';
  old_status?: string;
  new_status: string;
  action_by: string; // 操作人员ID
  action_by_name?: string; // 操作人员姓名
  notes?: string; // 操作备注
  metadata?: any; // 额外的元数据
  created_at: string;
  warning?: {
    student?: {
      name: string;
      student_id: string;
    };
    rule?: {
      name: string;
      severity: string;
    };
  };
}

// 预警效果跟踪数据
interface WarningEffectTracking {
  warning_id: string;
  resolution_time: number; // 解决时间（小时）
  effectiveness_score: number; // 效果评分 1-5
  follow_up_required: boolean; // 是否需要后续跟进
  improvement_noted: boolean; // 是否观察到改善
  feedback_notes?: string; // 反馈备注
  created_at: string;
}

interface WarningHistoryProps {
  warningId?: string; // 特定预警的历史记录
  studentId?: string; // 特定学生的预警历史
  showEffectTracking?: boolean; // 是否显示效果跟踪
}

const WarningHistory: React.FC<WarningHistoryProps> = ({ 
  warningId, 
  studentId, 
  showEffectTracking = false 
}) => {
  const [historyRecords, setHistoryRecords] = useState<WarningHistoryRecord[]>([]);
  const [effectTracking, setEffectTracking] = useState<WarningEffectTracking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterAction, setFilterAction] = useState("all");
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
    fetchHistoryData();
  }, [warningId, studentId, filterAction, timeRange]);

  const fetchHistoryData = async () => {
    setIsLoading(true);
    try {
      // 构建查询
      let historyQuery = supabase
        .from('warning_history')
        .select(`
          *,
          warning_records!inner(
            id,
            students!inner(name, student_id),
            warning_rules(name, severity)
          )
        `)
        .order('created_at', { ascending: false });

      // 应用过滤条件
      if (warningId) {
        historyQuery = historyQuery.eq('warning_id', warningId);
      }
      
      if (studentId) {
        historyQuery = historyQuery.eq('warning_records.student_id', studentId);
      }

      if (filterAction !== 'all') {
        historyQuery = historyQuery.eq('action_type', filterAction);
      }

      // 时间范围过滤
      const now = new Date();
      let fromDate: Date;
      switch (timeRange) {
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      historyQuery = historyQuery.gte('created_at', fromDate.toISOString());

      const { data: historyData, error: historyError } = await historyQuery;

      if (historyError) throw historyError;

      // 获取效果跟踪数据
      let effectData: WarningEffectTracking[] = [];
      if (showEffectTracking) {
        let effectQuery = supabase
          .from('warning_effect_tracking')
          .select('*')
          .order('created_at', { ascending: false });

        if (warningId) {
          effectQuery = effectQuery.eq('warning_id', warningId);
        }

        const { data: effectResult, error: effectError } = await effectQuery;
        if (!effectError && effectResult) {
          effectData = effectResult;
        }
      }

      setHistoryRecords(historyData || []);
      setEffectTracking(effectData);
    } catch (error) {
      console.error('获取预警历史失败:', error);
      toast.error('获取预警历史失败');
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'reactivated':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'updated':
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case 'commented':
        return <MessageCircle className="h-4 w-4 text-cyan-500" />;
      default:
        return <History className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActionText = (actionType: string) => {
    const actionMap: Record<string, string> = {
      created: '创建预警',
      resolved: '解决预警',
      dismissed: '忽略预警',
      reactivated: '重新激活',
      updated: '更新信息',
      commented: '添加备注'
    };
    return actionMap[actionType] || actionType;
  };

  const getActionColor = (actionType: string) => {
    const colorMap: Record<string, string> = {
      created: 'bg-amber-100 text-amber-800 border-amber-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      dismissed: 'bg-gray-100 text-gray-800 border-gray-200',
      reactivated: 'bg-blue-100 text-blue-800 border-blue-200',
      updated: 'bg-purple-100 text-purple-800 border-purple-200',
      commented: 'bg-cyan-100 text-cyan-800 border-cyan-200'
    };
    return colorMap[actionType] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: zhCN 
      });
    } catch (e) {
      return '未知时间';
    }
  };

  const renderEffectTrackingCard = (tracking: WarningEffectTracking) => {
    const effectivenessColor = tracking.effectiveness_score >= 4 ? 'text-green-600' :
                              tracking.effectiveness_score >= 3 ? 'text-yellow-600' : 'text-red-600';
    
    return (
      <Card key={tracking.warning_id} className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-medium text-sm">效果跟踪报告</h4>
            <Badge variant="outline" className={effectivenessColor}>
              效果评分: {tracking.effectiveness_score}/5
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1 text-gray-400" />
              <span>解决用时: {tracking.resolution_time}小时</span>
            </div>
            <div className="flex items-center">
              {tracking.improvement_noted ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span>{tracking.improvement_noted ? '有改善' : '暂无明显改善'}</span>
            </div>
          </div>
          
          {tracking.follow_up_required && (
            <Badge variant="outline" className="mt-2 text-orange-600 border-orange-200">
              需要后续跟进
            </Badge>
          )}
          
          {tracking.feedback_notes && (
            <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              {tracking.feedback_notes}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center">
              <History className="h-5 w-5 text-blue-500 mr-2" />
              预警处理历史
              {historyRecords.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {historyRecords.length} 条记录
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              显示预警记录的处理历史和状态变化跟踪
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHistoryData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 筛选工具栏 */}
        <div className="flex space-x-2 mb-4">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有操作</SelectItem>
              <SelectItem value="created">创建</SelectItem>
              <SelectItem value="resolved">解决</SelectItem>
              <SelectItem value="dismissed">忽略</SelectItem>
              <SelectItem value="reactivated">重新激活</SelectItem>
              <SelectItem value="updated">更新</SelectItem>
              <SelectItem value="commented">备注</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="时间范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">最近一周</SelectItem>
              <SelectItem value="month">最近一月</SelectItem>
              <SelectItem value="quarter">最近三月</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 效果跟踪卡片 */}
        {showEffectTracking && effectTracking.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">预警效果跟踪</h3>
            <div className="space-y-3">
              {effectTracking.map(renderEffectTrackingCard)}
            </div>
          </div>
        )}

        {/* 历史记录时间线 */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">加载历史记录中...</p>
          </div>
        ) : historyRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>暂无历史记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyRecords.map((record, index) => (
              <div key={record.id} className="flex space-x-3">
                {/* 时间线指示器 */}
                <div className="flex flex-col items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                    {getActionIcon(record.action_type)}
                  </div>
                  {index < historyRecords.length - 1 && (
                    <div className="w-0.5 h-16 bg-gray-200 mt-2"></div>
                  )}
                </div>

                {/* 记录内容 */}
                <div className="flex-1 min-w-0 pb-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getActionColor(record.action_type)}>
                        {getActionText(record.action_type)}
                      </Badge>
                      {record.old_status && record.old_status !== record.new_status && (
                        <div className="flex items-center text-xs text-gray-500">
                          <span>{record.old_status}</span>
                          <ArrowRight className="h-3 w-3 mx-1" />
                          <span>{record.new_status}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatRelativeTime(record.created_at)}
                    </div>
                  </div>

                  {/* 学生信息 */}
                  {record.warning?.student && (
                    <div className="flex items-center space-x-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                          {record.warning.student.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{record.warning.student.name}</span>
                      <span className="text-xs text-gray-500">({record.warning.student.student_id})</span>
                    </div>
                  )}

                  {/* 操作人员 */}
                  <div className="flex items-center space-x-2 mb-2 text-xs text-gray-600">
                    <User className="h-3 w-3" />
                    <span>操作人员: {record.action_by_name || record.action_by}</span>
                  </div>

                  {/* 预警规则信息 */}
                  {record.warning?.rule && (
                    <div className="text-xs text-gray-600 mb-2">
                      预警规则: {record.warning.rule.name}
                      <Badge 
                        variant="outline" 
                        className={`ml-2 ${
                          record.warning.rule.severity === 'high' ? 'text-red-600 border-red-200' :
                          record.warning.rule.severity === 'medium' ? 'text-yellow-600 border-yellow-200' :
                          'text-blue-600 border-blue-200'
                        }`}
                      >
                        {record.warning.rule.severity === 'high' ? '高风险' :
                         record.warning.rule.severity === 'medium' ? '中风险' : '低风险'}
                      </Badge>
                    </div>
                  )}

                  {/* 操作备注 */}
                  {record.notes && (
                    <div className="bg-gray-50 rounded p-2 text-sm text-gray-700">
                      <MessageCircle className="h-3 w-3 inline mr-1" />
                      {record.notes}
                    </div>
                  )}

                  {/* 额外的元数据 */}
                  {record.metadata && Object.keys(record.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">查看详细信息</summary>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(record.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WarningHistory; 