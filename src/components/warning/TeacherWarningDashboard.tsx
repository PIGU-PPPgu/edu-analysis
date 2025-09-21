import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Users,
  TrendingDown,
  Clock,
  CheckCircle,
  Phone,
  MessageSquare,
  BookOpen,
  Target,
  ArrowRight,
  RefreshCw,
  Filter
} from "lucide-react";
import { formatNumber } from "@/utils/formatUtils";
import { getWarningStatistics, getWarningRecords, updateWarningStatus } from "@/services/warningService";
import { toast } from "sonner";

// 教师友好的预警信息界面
const TeacherWarningDashboard: React.FC = () => {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPriority, setSelectedPriority] = useState<"all" | "high" | "medium">("all");

  useEffect(() => {
    loadWarningData();
  }, [selectedPriority]);

  const loadWarningData = async () => {
    try {
      setIsLoading(true);
      
      const [statsResult, warningsResult] = await Promise.all([
        getWarningStatistics(),
        getWarningRecords()
      ]);

      setStats(statsResult);
      
      // 过滤和排序预警记录
      let filteredWarnings = warningsResult.filter(w => w.status === 'active');
      
      if (selectedPriority !== "all") {
        filteredWarnings = filteredWarnings.filter(w => 
          w.warning_rules?.severity === selectedPriority
        );
      }

      // 按严重程度和创建时间排序
      filteredWarnings.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const severityDiff = (severityOrder[b.warning_rules?.severity] || 0) - 
                           (severityOrder[a.warning_rules?.severity] || 0);
        
        if (severityDiff !== 0) return severityDiff;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setWarnings(filteredWarnings.slice(0, 20)); // 显示前20个最重要的预警
    } catch (error) {
      console.error('加载预警数据失败:', error);
      toast.error('加载预警数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveWarning = async (warningId: string) => {
    try {
      await updateWarningStatus(warningId, 'resolved');
      await loadWarningData();
      toast.success('预警已标记为已处理');
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high': return '紧急';
      case 'medium': return '重要';
      case 'low': return '一般';
      default: return '未知';
    }
  };

  const getActionableAdvice = (warningRule: any, studentInfo: any) => {
    const ruleName = warningRule?.name || '';
    const severity = warningRule?.severity || 'medium';
    
    if (ruleName.includes('连续不及格') || ruleName.includes('考试不及格')) {
      return {
        immediate: '立即与学生和家长沟通',
        followup: '安排课后辅导，检查学习方法',
        timeline: '本周内完成'
      };
    }
    
    if (ruleName.includes('成绩下降') || ruleName.includes('退步')) {
      return {
        immediate: '分析下降原因，是否有外界干扰',
        followup: '制定个性化学习计划，定期跟踪',
        timeline: '2周内见效'
      };
    }
    
    if (ruleName.includes('作业')) {
      return {
        immediate: '检查作业完成情况，了解困难',
        followup: '建立作业监督机制',
        timeline: '每日跟进'
      };
    }

    if (ruleName.includes('ML') || ruleName.includes('AI')) {
      return {
        immediate: '重点关注，进行全面评估',
        followup: '建立个人档案，制定干预计划',
        timeline: '立即开始，持续监控'
      };
    }
    
    return {
      immediate: '与学生面谈了解情况',
      followup: '制定针对性改进方案',
      timeline: '1周内完成初步评估'
    };
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days}天前`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">加载预警信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题和快速操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">班级预警中心</h1>
          <p className="text-gray-600 mt-1">需要您关注的学生情况</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">优先级:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className="text-sm border rounded-md px-2 py-1"
            >
              <option value="all">全部</option>
              <option value="high">紧急</option>
              <option value="medium">重要</option>
            </select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadWarningData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      {/* 概览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">需要关注</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats?.highRiskStudents || 0)}
                </p>
                <p className="text-xs text-red-600">名学生</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">成绩下降</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats?.warningsByType?.find(t => t.type === '学业预警')?.count || 0)}
                </p>
                <p className="text-xs text-orange-600">个预警</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">等待处理</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(warnings.length)}
                </p>
                <p className="text-xs text-blue-600">个预警</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">班级总数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats?.totalStudents || 0)}
                </p>
                <p className="text-xs text-green-600">名学生</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 预警列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            需要处理的预警 ({warnings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-gray-500 text-lg">太棒了！暂时没有需要处理的预警</p>
              <p className="text-gray-400 text-sm mt-2">继续保持良好的教学管理</p>
            </div>
          ) : (
            <div className="space-y-4">
              {warnings.map((warning) => {
                const advice = getActionableAdvice(warning.warning_rules, warning.students);
                const severity = warning.warning_rules?.severity || 'medium';
                
                return (
                  <div 
                    key={warning.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          severity === 'high' ? 'bg-red-100' :
                          severity === 'medium' ? 'bg-orange-100' : 'bg-yellow-100'
                        }`}>
                          <AlertTriangle className={`h-4 w-4 ${
                            severity === 'high' ? 'text-red-600' :
                            severity === 'medium' ? 'text-orange-600' : 'text-yellow-600'
                          }`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {warning.students?.name || '未知学生'}
                            </h3>
                            <Badge className={getSeverityColor(severity)}>
                              {getSeverityText(severity)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(warning.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">班级:</span> {warning.students?.class_name || '未知班级'}
                          </p>
                          
                          <p className="text-sm text-gray-700 mb-3">
                            <span className="font-medium">问题:</span> {warning.warning_rules?.name || '预警规则'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 行动建议 */}
                    <Alert className="mb-3 border-blue-200 bg-blue-50">
                      <Target className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <div className="space-y-2">
                          <p><span className="font-semibold">立即行动:</span> {advice.immediate}</p>
                          <p><span className="font-semibold">后续跟进:</span> {advice.followup}</p>
                          <p><span className="font-semibold">完成时限:</span> {advice.timeline}</p>
                        </div>
                      </AlertDescription>
                    </Alert>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleResolveWarning(warning.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        标记已处理
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Phone className="h-4 w-4" />
                        联系家长
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        学生面谈
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <BookOpen className="h-4 w-4" />
                        查看详情
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {warnings.length >= 20 && (
                <div className="text-center py-4">
                  <Button variant="outline" className="flex items-center gap-2">
                    查看更多预警
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherWarningDashboard;