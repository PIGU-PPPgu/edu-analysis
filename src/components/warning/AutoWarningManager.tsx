import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  PlayCircle, 
  PauseCircle, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Brain,
  RefreshCw,
  Download,
  Bell,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { autoWarningService, type AutoWarningAnalysisResult } from '@/services/autoWarningService'

interface AutoWarningManagerProps {
  className?: string
}

export function AutoWarningManager({ className }: AutoWarningManagerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [lastAnalysisResult, setLastAnalysisResult] = useState<AutoWarningAnalysisResult | null>(null)
  const [warningStats, setWarningStats] = useState<any>(null)
  const [activeWarnings, setActiveWarnings] = useState<any[]>([])
  const [warningRules, setWarningRules] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 加载初始数据
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // 并行加载数据
      const [stats, warnings, rules] = await Promise.all([
        autoWarningService.getWarningStatistics(),
        autoWarningService.getActiveWarnings(),
        autoWarningService.getWarningRules()
      ])

      setWarningStats(stats)
      setActiveWarnings(warnings)
      setWarningRules(rules)
      
    } catch (error) {
      console.error('加载数据失败:', error)
      toast.error('加载数据失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 手动运行预警分析
  const runAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const result = await autoWarningService.runAnalysis()
      
      clearInterval(progressInterval)
      setAnalysisProgress(100)
      setLastAnalysisResult(result)
      
      // 刷新数据
      await loadInitialData()
      
      toast.success('预警分析完成', {
        description: `发现 ${result.statistics.warnings_found} 个预警，其中高风险 ${result.statistics.high_risk_count} 个`
      })

    } catch (error) {
      console.error('预警分析失败:', error)
      toast.error('预警分析失败', {
        description: error.message
      })
    } finally {
      setIsAnalyzing(false)
      setTimeout(() => setAnalysisProgress(0), 2000)
    }
  }

  // 测试预警系统
  const testWarningSystem = async () => {
    try {
      toast.info('开始测试预警系统...')
      const result = await autoWarningService.testAnalysis()
      
      if (result.success) {
        toast.success('预警系统测试成功', {
          description: `规则数: ${result.rules_count}, 预警数: ${result.analysis_result?.statistics.warnings_found || 0}`
        })
        setLastAnalysisResult(result.analysis_result)
        await loadInitialData()
      } else {
        toast.error('预警系统测试失败', {
          description: result.error
        })
      }
    } catch (error) {
      console.error('测试失败:', error)
      toast.error('测试失败')
    }
  }

  // 解决预警
  const resolveWarning = async (warningId: string, notes?: string) => {
    try {
      await autoWarningService.resolveWarning(warningId, notes)
      toast.success('预警已解决')
      await loadInitialData()
    } catch (error) {
      console.error('解决预警失败:', error)
      toast.error('解决预警失败')
    }
  }

  // 忽略预警
  const dismissWarning = async (warningId: string, reason?: string) => {
    try {
      await autoWarningService.dismissWarning(warningId, reason)
      toast.success('预警已忽略')
      await loadInitialData()
    } catch (error) {
      console.error('忽略预警失败:', error)
      toast.error('忽略预警失败')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>加载预警数据...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部控制面板 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                智能预警管理中心
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                自动化学生风险识别与预警管理
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={testWarningSystem}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                测试系统
              </Button>
              <Button 
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    运行分析
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {(isAnalyzing || analysisProgress > 0) && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>分析进度</span>
                <span>{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
              <p className="text-xs text-gray-500">
                正在分析学生数据，识别潜在风险...
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 统计概览 */}
      {warningStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{warningStats.total}</p>
                  <p className="text-sm text-gray-600">总预警数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{warningStats.active}</p>
                  <p className="text-sm text-gray-600">活跃预警</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{warningStats.resolved}</p>
                  <p className="text-sm text-gray-600">已解决</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{warningStats.resolution_rate}%</p>
                  <p className="text-sm text-gray-600">解决率</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 主要内容区域 */}
      <Tabs defaultValue="active-warnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active-warnings">活跃预警</TabsTrigger>
          <TabsTrigger value="analysis-results">分析结果</TabsTrigger>
          <TabsTrigger value="warning-rules">预警规则</TabsTrigger>
          <TabsTrigger value="schedule">调度设置</TabsTrigger>
        </TabsList>

        {/* 活跃预警 */}
        <TabsContent value="active-warnings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                活跃预警列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeWarnings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>暂无活跃预警</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeWarnings.map((warning) => (
                    <div key={warning.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant={
                                warning.rule?.severity === 'high' ? 'destructive' :
                                warning.rule?.severity === 'medium' ? 'default' : 'secondary'
                              }
                            >
                              {warning.rule?.severity === 'high' ? '高风险' :
                               warning.rule?.severity === 'medium' ? '中风险' : '低风险'}
                            </Badge>
                            <span className="font-medium">{warning.student?.name}</span>
                            <span className="text-sm text-gray-500">{warning.student?.class_name}</span>
                          </div>
                          <p className="text-sm font-medium mb-1">{warning.rule?.name}</p>
                          <p className="text-sm text-gray-600">{warning.rule?.description}</p>
                          
                          {warning.details?.risk_factors && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">风险因素:</p>
                              <div className="flex flex-wrap gap-1">
                                {warning.details.risk_factors.map((factor: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {factor}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => resolveWarning(warning.id, '已处理')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            解决
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => dismissWarning(warning.id, '暂时忽略')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            忽略
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                        创建时间: {new Date(warning.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分析结果 */}
        <TabsContent value="analysis-results">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                最新分析结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastAnalysisResult ? (
                <div className="space-y-6">
                  {/* AI摘要 */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-600" />
                      AI智能摘要
                    </h4>
                    <p className="text-sm mb-3">{lastAnalysisResult.ai_summary.overview}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {lastAnalysisResult.ai_summary.risk_distribution.high}
                        </p>
                        <p className="text-xs text-gray-600">高风险</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {lastAnalysisResult.ai_summary.risk_distribution.medium}
                        </p>
                        <p className="text-xs text-gray-600">中风险</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">
                          {lastAnalysisResult.ai_summary.risk_distribution.low}
                        </p>
                        <p className="text-xs text-gray-600">低风险</p>
                      </div>
                    </div>
                  </div>

                  {/* 主要风险因素 */}
                  <div>
                    <h4 className="font-medium mb-3">主要风险因素</h4>
                    <div className="space-y-2">
                      {lastAnalysisResult.ai_summary.top_risk_factors.map((factor, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{factor.factor}</span>
                          <Badge variant="outline">{factor.count}次</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 建议措施 */}
                  <div>
                    <h4 className="font-medium mb-3">AI建议措施</h4>
                    <ul className="space-y-1">
                      {lastAnalysisResult.ai_summary.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-xs text-gray-500 pt-4 border-t">
                    分析时间: {new Date(lastAnalysisResult.analysis_time).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>暂无分析结果</p>
                  <p className="text-sm mt-1">点击"运行分析"开始智能预警分析</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 预警规则 */}
        <TabsContent value="warning-rules">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  预警规则管理
                </CardTitle>
                <Button size="sm" onClick={() => autoWarningService.createPresetRules()}>
                  创建预设规则
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {warningRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge 
                            variant={rule.is_active ? 'default' : 'secondary'}
                          >
                            {rule.is_active ? '启用' : '禁用'}
                          </Badge>
                          <Badge 
                            variant={
                              rule.severity === 'high' ? 'destructive' :
                              rule.severity === 'medium' ? 'default' : 'secondary'
                            }
                          >
                            {rule.severity === 'high' ? '高' :
                             rule.severity === 'medium' ? '中' : '低'}风险
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                        <div className="text-xs text-gray-500">
                          规则类型: {rule.conditions?.type || '未知'}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline">编辑</Button>
                        <Button size="sm" variant="outline">
                          {rule.is_active ? '禁用' : '启用'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 调度设置 */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                自动调度设置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">自动调度功能</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        此功能将在后续版本中提供，支持定时自动运行预警分析。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">计划功能</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        每日自动分析
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        高风险即时通知
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        邮件报告推送
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        自动任务创建
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">当前状态</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm">自动分析</span>
                        <Badge variant="secondary">手动模式</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm">通知推送</span>
                        <Badge variant="secondary">未配置</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm">报告生成</span>
                        <Badge variant="secondary">未配置</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AutoWarningManager 