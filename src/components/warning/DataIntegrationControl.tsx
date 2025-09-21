import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Users,
  FileCheck,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { runWarningDataIntegration, IntegrationReport, DataIntegrationFilters } from '@/services/warningDataIntegration';

interface DataIntegrationControlProps {
  onDataUpdated?: () => void;
  filters?: DataIntegrationFilters;
}

const DataIntegrationControl: React.FC<DataIntegrationControlProps> = ({ onDataUpdated, filters }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastReport, setLastReport] = useState<IntegrationReport | null>(null);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const handleRunIntegration = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress('初始化数据集成...');
    toast.info('开始数据集成...', {
      description: '正在分析作业、成绩和学生数据（已优化为快速模式）'
    });

    try {
      const report = await runWarningDataIntegration(filters);
      setLastReport(report);
      setLastRunTime(new Date().toLocaleString('zh-CN'));
      setProgress('');
      
      // 通知父组件数据已更新
      if (onDataUpdated) {
        onDataUpdated();
      }
      
      toast.success('数据集成完成', {
        description: `分析了${report.studentsAnalyzed}名学生，生成${report.warningsGenerated}个预警`
      });
      
      console.log('数据集成完成:', report);
    } catch (error) {
      console.error('数据集成失败:', error);
      setProgress('');
      toast.error('数据集成失败', {
        description: '请检查网络连接和数据库状态'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = () => {
    if (!lastReport) return 'text-gray-500';
    if (lastReport.errors.length > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (isRunning) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (!lastReport) return <Clock className="h-4 w-4" />;
    if (lastReport.errors.length > 0) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isRunning) return '数据集成进行中...';
    if (!lastReport) return '尚未运行数据集成';
    if (lastReport.errors.length > 0) return '集成完成但有警告';
    return '数据集成成功';
  };

  return (
    <Card className="bg-white border border-gray-200 rounded-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-lg font-semibold text-gray-800">
              <Database className="h-5 w-5 mr-2 text-[#c0ff3f]" />
              数据集成控制台
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              从作业、成绩、学生信息自动生成预警数据
            </CardDescription>
          </div>
          <div className={`flex items-center ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="ml-2 text-sm font-medium">{getStatusText()}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {lastRunTime ? `上次运行: ${lastRunTime}` : '从未运行过数据集成'}
          </div>
          <Button
            onClick={handleRunIntegration}
            disabled={isRunning}
            className="bg-[#c0ff3f] text-black hover:bg-[#a5e034] font-medium"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                集成中...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                运行数据集成
              </>
            )}
          </Button>
        </div>

        {lastReport && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-800">集成报告</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-lg font-bold text-gray-800">{lastReport.studentsAnalyzed}</span>
                  </div>
                  <p className="text-xs text-gray-500">分析学生数</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-lg font-bold text-gray-800">{lastReport.warningsGenerated}</span>
                  </div>
                  <p className="text-xs text-gray-500">生成预警数</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-lg font-bold text-gray-800">{lastReport.riskFactorsIdentified}</span>
                  </div>
                  <p className="text-xs text-gray-500">风险因素数</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-lg font-bold text-gray-800">
                      {(lastReport.processingTime / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">处理耗时</p>
                </div>
              </div>

              {lastReport.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                    <h5 className="text-sm font-medium text-yellow-800">处理警告</h5>
                  </div>
                  <div className="space-y-1">
                    {lastReport.errors.slice(0, 3).map((error, index) => (
                      <p key={index} className="text-xs text-yellow-700">{error}</p>
                    ))}
                    {lastReport.errors.length > 3 && (
                      <p className="text-xs text-yellow-600">...还有{lastReport.errors.length - 3}个警告</p>
                    )}
                  </div>
                </div>
              )}
              
              {lastReport.warningsGenerated > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">
                      成功为 <Badge variant="outline" className="mx-1">{lastReport.warningsGenerated}</Badge> 名学生生成预警记录
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <Separator />
        
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start">
              <FileCheck className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800 space-y-1">
                <p><strong>数据集成说明:</strong></p>
                <p>• 自动分析学生成绩趋势，识别成绩下降和不及格风险</p>
                <p>• 检测作业提交率和完成质量，发现学习习惯问题</p>
                <p>• 评估知识点掌握情况，定位学习薄弱环节</p>
                <p>• 综合生成风险档案并创建预警记录</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start">
              <TrendingUp className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-green-800 space-y-1">
                <p><strong>⚡ 性能优化说明:</strong></p>
                <p>• 快速模式：仅分析前20名学生，大幅缩短执行时间</p>
                <p>• 批量并行：每批5个学生并行处理，提升处理效率</p>
                <p>• 智能缓存：优化数据库查询，减少重复计算</p>
                <p>• 建议定期运行，而非一次性处理全部学生</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataIntegrationControl;