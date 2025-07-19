import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, Zap, MessageCircle, Calendar, Users, BarChart3 } from 'lucide-react';
import { gradeAnalysisAutoTrigger, AnalysisTriggerConfig } from '@/services/gradeAnalysisAutoTrigger';
import { toast } from 'sonner';

interface AIAnalysisButtonProps {
  // 可选：传入导入的记录数，用于显示状态
  importedRecords?: number;
  // 可选：自定义样式
  className?: string;
  // 可选：是否显示配置面板
  showConfig?: boolean;
}

export const AIAnalysisButton: React.FC<AIAnalysisButtonProps> = ({
  importedRecords = 0,
  className = '',
  showConfig = false
}) => {
  const [config, setConfig] = useState<AnalysisTriggerConfig>(
    gradeAnalysisAutoTrigger.getConfig()
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 手动触发分析
  const handleManualTrigger = async () => {
    setIsAnalyzing(true);
    try {
      await gradeAnalysisAutoTrigger.manualTrigger();
    } catch (error) {
      console.error('手动触发分析失败:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 更新配置
  const handleConfigChange = (key: keyof AnalysisTriggerConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    gradeAnalysisAutoTrigger.updateConfig(newConfig);
    
    toast.success('配置已更新', {
      description: `${key} 已设置为 ${value}`,
      duration: 2000
    });
  };

  // 获取状态显示
  const getStatusBadge = () => {
    if (isAnalyzing) {
      return <Badge variant="default" className="bg-blue-500">🤖 分析中</Badge>;
    }
    if (config.enabled) {
      return <Badge variant="default" className="bg-green-500">✅ 已启用</Badge>;
    }
    return <Badge variant="secondary">⏸️ 已禁用</Badge>;
  };

  const getAnalysisStatus = () => {
    if (importedRecords === 0) return '暂无数据';
    if (importedRecords < config.minRecords) {
      return `需要 ${config.minRecords - importedRecords} 条记录才能触发`;
    }
    return '可以触发分析';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 主要控制面板 */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">AI成绩分析</CardTitle>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="gap-1"
              >
                <Settings className="h-4 w-4" />
                设置
              </Button>
            </div>
          </div>
          <CardDescription>
            {config.enabled ? '自动分析已启用，' : '自动分析已禁用，'}
            {getAnalysisStatus()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 状态指示器 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium">已导入记录</div>
                <div className="text-lg font-bold text-blue-600">{importedRecords}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <BarChart3 className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium">触发阈值</div>
                <div className="text-lg font-bold text-green-600">{config.minRecords}</div>
              </div>
            </div>
          </div>

          {/* 推送状态 */}
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
            <MessageCircle className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
              <div className="text-sm font-medium">推送渠道</div>
              <div className="text-xs text-gray-600">
                {config.pushToWechat && '企业微信 '}
                {config.pushToLinear && 'Linear '}
                {!config.pushToWechat && !config.pushToLinear && '无'}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={handleManualTrigger}
              disabled={isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? '分析中...' : '手动触发分析'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 设置面板 */}
      {showSettings && (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">分析设置</CardTitle>
            <CardDescription>自定义AI分析的触发条件和推送方式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 启用开关 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">自动分析</div>
                <div className="text-sm text-gray-600">导入成绩后自动触发AI分析</div>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
              />
            </div>

            {/* 触发阈值 */}
            <div className="space-y-2">
              <label className="font-medium">触发阈值（条记录）</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.minRecords}
                  onChange={(e) => handleConfigChange('minRecords', parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">条</span>
              </div>
              <div className="text-xs text-gray-500">
                至少需要多少条新记录才触发分析
              </div>
            </div>

            {/* 延迟时间 */}
            <div className="space-y-2">
              <label className="font-medium">分析延迟（秒）</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={config.delayMs / 1000}
                  onChange={(e) => handleConfigChange('delayMs', parseInt(e.target.value) * 1000)}
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">秒</span>
              </div>
              <div className="text-xs text-gray-500">
                导入完成后延迟多久开始分析
              </div>
            </div>

            {/* 推送设置 */}
            <div className="space-y-4">
              <div className="font-medium">推送渠道</div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">企业微信</div>
                  <div className="text-sm text-gray-600">推送到企业微信群</div>
                </div>
                <Switch
                  checked={config.pushToWechat}
                  onCheckedChange={(checked) => handleConfigChange('pushToWechat', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Linear</div>
                  <div className="text-sm text-gray-600">创建Linear任务</div>
                </div>
                <Switch
                  checked={config.pushToLinear}
                  onCheckedChange={(checked) => handleConfigChange('pushToLinear', checked)}
                />
              </div>
            </div>

            {/* 重置按钮 */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  const defaultConfig = {
                    enabled: true,
                    minRecords: 5,
                    delayMs: 2000,
                    pushToWechat: true,
                    pushToLinear: true
                  };
                  setConfig(defaultConfig);
                  gradeAnalysisAutoTrigger.updateConfig(defaultConfig);
                  toast.success('配置已重置为默认值');
                }}
              >
                恢复默认设置
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIAnalysisButton;