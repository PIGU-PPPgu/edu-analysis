import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZapIcon, ArrowRightIcon, TrendingUpIcon, BarChart3, Network, ArrowDownToLine, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateStudentDataset } from '@/services/mockDataService';
import { 
  generateBatchWarnings, 
  aggregateRiskFactors 
} from '@/services/warningAnalytics';
import {
  generateTransactions,
  generateAssociationRules,
  formatRulesAsWarnings,
  findStrongAssociations,
  convertWarningsToTransactions,
  createCorrelationMatrix
} from '@/services/associationAnalysis';

// 定义关联分析组件的参数
interface AssociationAnalysisProps {
  className?: string;
}

// 关联分析组件
const AssociationAnalysis: React.FC<AssociationAnalysisProps> = ({ className }) => {
  // 状态定义
  const [activeTab, setActiveTab] = useState<string>('rules');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [associationRules, setAssociationRules] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      confidence: number;
      support: number;
      lift: number;
      riskLevel: string;
    }>
  >([]);
  const [correlations, setCorrelations] = useState<
    Array<{
      metricA: string;
      metricB: string;
      correlation: number;
      strength: string;
    }>
  >([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('examAverage');
  
  // 指标名称映射
  const metricLabels: Record<string, string> = {
    'examAverage': '考试平均分',
    'previousExamAverage': '上次考试平均分',
    'homeworkCompletionRate': '作业完成率',
    'participationScore': '课堂参与度',
    'teacherRating': '教师评价'
  };
  
  // 生成分析数据
  const generateAnalysisData = async () => {
    setIsLoading(true);
    
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 生成模拟数据
      const students = generateStudentDataset(150);
      
      // 生成预警结果
      const warnings = generateBatchWarnings(students);
      
      // 生成关联规则
      // 方法1：基于原始学生数据生成事件交易记录
      const transactions = generateTransactions(students);
      // 方法2：基于预警结果生成事件交易记录
      const warningTransactions = convertWarningsToTransactions(warnings);
      
      // 合并两种交易记录
      const combinedTransactions = [...transactions, ...warningTransactions];
      
      // 应用Apriori算法挖掘规则
      const rules = generateAssociationRules(combinedTransactions, 0.1, 0.6);
      
      // 格式化关联规则
      const formattedRules = formatRulesAsWarnings(rules);
      setAssociationRules(formattedRules);
      
      // 计算各指标之间的相关性
      const availableMetrics = [
        'examAverage', 
        'previousExamAverage', 
        'homeworkCompletionRate', 
        'participationScore', 
        'teacherRating'
      ];
      
      // 生成相关性矩阵
      const correlationMatrix = createCorrelationMatrix(students, availableMetrics);
      
      // 转换为可读格式
      const processedCorrelations: Array<{
        metricA: string;
        metricB: string;
        correlation: number;
        strength: string;
      }> = [];
      
      for (let i = 0; i < availableMetrics.length; i++) {
        for (let j = i + 1; j < availableMetrics.length; j++) {
          const metricA = availableMetrics[i];
          const metricB = availableMetrics[j];
          const correlation = correlationMatrix[i][j];
          
          // 判断相关性强度
          let strength = '弱';
          if (Math.abs(correlation) >= 0.7) {
            strength = '强';
          } else if (Math.abs(correlation) >= 0.4) {
            strength = '中';
          }
          
          processedCorrelations.push({
            metricA,
            metricB,
            correlation,
            strength
          });
        }
      }
      
      // 按相关性强度排序
      processedCorrelations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
      setCorrelations(processedCorrelations);
      
    } catch (error) {
      console.error('生成关联分析数据时出错:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 组件加载时生成数据
  useEffect(() => {
    generateAnalysisData();
  }, []);
  
  // 刷新分析数据
  const refreshAnalysis = () => {
    generateAnalysisData();
  };
  
  // 获取相关性类型标签和颜色
  const getCorrelationTypeAndColor = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (correlation > 0) {
      return {
        type: '正相关',
        color: 'bg-emerald-500',
        description: '两指标同向变化',
        iconColor: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200'
      };
    } else {
      return {
        type: '负相关',
        color: 'bg-rose-500',
        description: '两指标反向变化',
        iconColor: 'text-rose-500',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200'
      };
    }
  };
  
  // 获取风险级别徽章颜色
  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'medium':
        return 'bg-amber-500 hover:bg-amber-600 text-white';
      case 'low':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };
  
  return (
    <Card className={`${className} overflow-hidden border-t-4 border-t-indigo-500`}>
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Network className="mr-2 h-5 w-5 text-indigo-500" />
            关联规则分析
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshAnalysis}
            disabled={isLoading}
            className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <ZapIcon className="mr-1 h-4 w-4 text-indigo-500" />
                重新分析
              </>
            )}
          </Button>
        </CardTitle>
        <CardDescription>
          挖掘学生数据中的关联规则和相关性，发现风险因素之间的隐藏关系
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 grid grid-cols-2 w-[400px] bg-slate-100">
            <TabsTrigger 
              value="rules"
              className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
            >
              <Network className="mr-2 h-4 w-4" />
              关联规则
            </TabsTrigger>
            <TabsTrigger 
              value="correlations"
              className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
            >
              <TrendingUpIcon className="mr-2 h-4 w-4" />
              指标相关性
            </TabsTrigger>
          </TabsList>
          
          {/* 关联规则内容 */}
          <TabsContent value="rules" className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                <Progress value={65} className="w-1/2 mb-2" />
                <p className="text-sm text-muted-foreground">
                  正在使用Apriori算法挖掘关联规则...
                </p>
              </div>
            ) : associationRules.length > 0 ? (
              <div>
                <div className="bg-slate-50 p-4 mb-4 rounded-lg border border-slate-100">
                  <h3 className="font-medium text-slate-700 mb-2 flex items-center">
                    <Network className="h-4 w-4 mr-2 text-indigo-500" />
                    关联规则分析结果
                  </h3>
                  <p className="text-sm text-slate-600">
                    关联规则显示了学生数据中不同风险因素之间的关系，可以帮助教师理解风险因素间的关联模式。
                    置信度表示条件成立时结果出现的概率，支持度表示整体数据中该规则出现的频率。
                  </p>
                </div>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>规则描述</TableHead>
                        <TableHead className="w-[150px]">置信度</TableHead>
                        <TableHead className="w-[150px]">支持度</TableHead>
                        <TableHead className="w-[100px]">风险等级</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {associationRules.slice(0, 10).map((rule) => (
                        <TableRow key={rule.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium">
                            <div className="flex flex-col space-y-1">
                              <span>{rule.description}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-indigo-500 flex items-center cursor-help">
                                      提升度: {rule.lift.toFixed(2)}
                                      <ArrowRightIcon className="h-3 w-3 mx-1" />
                                      查看解释
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs max-w-[250px]">
                                      提升度值为{rule.lift.toFixed(2)}，表示该规则比随机情况下出现的可能性高{(rule.lift-1)*100}%。
                                      提升度大于1表示两个事件正相关。
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center">
                                <Progress 
                                  value={rule.confidence * 100} 
                                  className="w-full mr-2"
                                  style={{
                                    '--tw-progress-color': `${rule.confidence > 0.8 ? '#10b981' : rule.confidence > 0.6 ? '#f59e0b' : '#3b82f6'}`
                                  } as React.CSSProperties}
                                />
                                <span className="min-w-10 text-right">{(rule.confidence * 100).toFixed(0)}%</span>
                              </div>
                              <span className="text-xs text-muted-foreground">规则可信度</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center">
                                <Progress 
                                  value={rule.support * 100} 
                                  className="w-full mr-2 bg-slate-100"
                                  style={{
                                    '--tw-progress-color': '#818cf8'
                                  } as React.CSSProperties}
                                />
                                <span className="min-w-10 text-right">{(rule.support * 100).toFixed(0)}%</span>
                              </div>
                              <span className="text-xs text-muted-foreground">数据覆盖率</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getRiskBadgeColor(rule.riskLevel)}`}>
                              {rule.riskLevel === 'high' ? '高风险' : 
                              rule.riskLevel === 'medium' ? '中风险' : '低风险'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                  <span>显示前10条最强关联规则，共发现 {associationRules.length} 条规则</span>
                  <Button variant="outline" size="sm" className="text-xs">
                    <ArrowDownToLine className="h-3 w-3 mr-1" />
                    导出完整报告
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Network className="h-16 w-16 text-slate-200 mb-4" />
                <p className="text-slate-500 mb-2">暂无关联规则数据</p>
                <Button variant="outline" size="sm" onClick={refreshAnalysis}>
                  <ZapIcon className="h-4 w-4 mr-1" />
                  生成分析
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* 指标相关性内容 */}
          <TabsContent value="correlations" className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                <Progress value={70} className="w-1/2 mb-2" />
                <p className="text-sm text-muted-foreground">
                  正在计算各指标之间的相关性...
                </p>
              </div>
            ) : correlations.length > 0 ? (
              <div>
                <div className="bg-slate-50 p-4 mb-4 rounded-lg border border-slate-100">
                  <h3 className="font-medium text-slate-700 mb-2 flex items-center">
                    <TrendingUpIcon className="h-4 w-4 mr-2 text-indigo-500" />
                    指标相关性分析结果
                  </h3>
                  <p className="text-sm text-slate-600">
                    相关性分析展示了不同学习指标之间的相互关系强度。正相关表示两个指标同向变化，负相关表示反向变化。
                    相关系数在-1到1之间，绝对值越接近1表示相关性越强。
                  </p>
                </div>
                
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>指标对</TableHead>
                        <TableHead className="w-[120px]">相关类型</TableHead>
                        <TableHead className="w-[180px]">相关性强度</TableHead>
                        <TableHead className="w-[100px]">相关系数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {correlations.map((item, index) => {
                        const { type, color, description, iconColor, bgColor, borderColor } = getCorrelationTypeAndColor(item.correlation);
                        return (
                          <TableRow key={index} className="hover:bg-slate-50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-700">{metricLabels[item.metricA] || item.metricA}</span>
                                <ArrowRightIcon className="h-3 w-3 mx-1 text-slate-400" />
                                <span className="text-slate-700">{metricLabels[item.metricB] || item.metricB}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${iconColor} ${bgColor} border ${borderColor}`}>
                                <TrendingUpIcon className={`h-3 w-3 mr-1 ${iconColor}`} />
                                <span>{type}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col space-y-1">
                                <Progress 
                                  value={Math.abs(item.correlation) * 100} 
                                  className={`${color} w-full`} 
                                />
                                <span className="text-xs text-slate-600">{item.strength}相关 ({description})</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <div className={`px-2 py-1 rounded ${Math.abs(item.correlation) >= 0.7 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700'}`}>
                                {item.correlation.toFixed(2)}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                <CardFooter className="px-0 pt-4 pb-0 flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    相关系数基于Pearson相关系数计算方法
                  </p>
                  <Button variant="outline" size="sm" className="text-xs">
                    <ArrowDownToLine className="h-3 w-3 mr-1" />
                    导出相关性矩阵
                  </Button>
                </CardFooter>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <TrendingUpIcon className="h-16 w-16 text-slate-200 mb-4" />
                <p className="text-slate-500 mb-2">暂无相关性数据</p>
                <Button variant="outline" size="sm" onClick={refreshAnalysis}>
                  <ZapIcon className="h-4 w-4 mr-1" />
                  生成分析
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AssociationAnalysis; 