import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Loader2,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { ExistingStudentCheckResult } from './ImportReviewDialog';
import { 
  IntelligentStudentMatcher, 
  StudentMatchingResult,
  FileStudent,
  SystemStudent 
} from '@/services/intelligentStudentMatcher';
import { 
  StudentCountAnalyzer, 
  StudentCountAnalysisResult 
} from '@/services/studentCountAnalyzer';

interface StudentMatchingAnalysisProps {
  // 原有的简单匹配结果（向后兼容）
  matchingResult?: ExistingStudentCheckResult;
  
  // 新的智能匹配结果
  intelligentMatchingResult?: StudentMatchingResult;
  countAnalysisResult?: StudentCountAnalysisResult;
  
  // 原始数据（用于重新分析）
  fileStudents?: FileStudent[];
  systemStudents?: SystemStudent[];
  
  // 回调函数
  onConfirmFuzzyMatch: (fileStudentIndex: number, systemStudentId: string) => void;
  onRejectFuzzyMatch: (fileStudentIndex: number) => void;
  onViewDetails: (student: any) => void;
  onReanalyze?: () => void;
  
  // 配置选项
  enableRealtimeAnalysis?: boolean;
  showCountAnalysis?: boolean;
}

const StudentMatchingAnalysis: React.FC<StudentMatchingAnalysisProps> = ({
  matchingResult,
  intelligentMatchingResult,
  countAnalysisResult,
  fileStudents,
  systemStudents,
  onConfirmFuzzyMatch,
  onRejectFuzzyMatch,
  onViewDetails,
  onReanalyze,
  enableRealtimeAnalysis = true,
  showCountAnalysis = true
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [localMatchingResult, setLocalMatchingResult] = useState<StudentMatchingResult | null>(null);
  const [localCountResult, setLocalCountResult] = useState<StudentCountAnalysisResult | null>(null);

  // 智能匹配器和分析器实例
  const [matcher] = useState(() => new IntelligentStudentMatcher());
  const [countAnalyzer] = useState(() => new StudentCountAnalyzer());

  // 使用传入的结果或本地分析结果
  const activeMatchingResult = intelligentMatchingResult || localMatchingResult;
  const activeCountResult = countAnalysisResult || localCountResult;

  // 实时分析功能
  useEffect(() => {
    if (enableRealtimeAnalysis && fileStudents && systemStudents && !intelligentMatchingResult) {
      performIntelligentAnalysis();
    }
  }, [fileStudents, systemStudents, enableRealtimeAnalysis]);

  const performIntelligentAnalysis = async () => {
    if (!fileStudents || !systemStudents) return;
    
    setIsAnalyzing(true);
    try {
      console.log('🔍 开始执行智能学生匹配分析...');
      
      // 执行智能匹配
      const matchingResult = await matcher.matchStudents(fileStudents, systemStudents, {
        enableFuzzyMatching: true,
        fuzzyThreshold: 0.7,
        prioritizeExactMatches: true
      });
      
      setLocalMatchingResult(matchingResult);
      
      // 执行数量分析
      if (showCountAnalysis) {
        const matchedStudents = [
          ...matchingResult.exactMatches.map(m => ({ fileStudent: m.fileStudent, systemStudent: m.systemStudent })),
          ...matchingResult.fuzzyMatches.map(m => ({ fileStudent: m.fileStudent, systemStudent: m.systemStudent }))
        ];
        
        const countResult = countAnalyzer.analyzeStudentCounts(
          systemStudents,
          fileStudents,
          matchedStudents,
          {
            tolerancePercentage: 0.1,
            minClassSize: 20,
            maxClassSize: 50
          }
        );
        
        setLocalCountResult(countResult);
      }
      
      console.log('✅ 智能分析完成');
    } catch (error) {
      console.error('❌ 智能分析失败:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
    if (similarity >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.9) return '高度相似';
    if (similarity >= 0.7) return '中等相似';
    return '低相似度';
  };

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'exact_id': return '学号精确匹配';
      case 'exact_name': return '姓名精确匹配';
      case 'exact_class_name': return '班级精确匹配';
      case 'fuzzy_name': return '姓名模糊匹配';
      case 'fuzzy_combined': return '综合模糊匹配';
      default: return '未知匹配类型';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'missing': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'extra': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'new_class': return <UserPlus className="h-4 w-4 text-purple-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  // 如果正在分析，显示加载状态
  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h3 className="text-lg font-semibold">正在执行智能学生匹配分析...</h3>
        <p className="text-sm text-gray-600">请稍候，系统正在分析学生数据</p>
      </div>
    );
  }

  // 向后兼容：如果只有旧的匹配结果，使用旧的显示逻辑
  if (matchingResult && !activeMatchingResult) {
    return renderLegacyMatchingResult(matchingResult);
  }

  // 如果没有任何匹配结果，显示空状态
  if (!activeMatchingResult) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无匹配分析结果</h3>
        <p className="text-gray-600 mb-4">请提供学生数据以开始智能匹配分析</p>
        {onReanalyze && (
          <Button onClick={onReanalyze} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            开始分析
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 智能分析概览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-900">{activeMatchingResult.statistics.totalFileStudents}</div>
            <div className="text-sm text-blue-700">文件中学生</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-900">{activeMatchingResult.statistics.exactMatchCount}</div>
            <div className="text-sm text-green-700">精确匹配</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-center">
            <HelpCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-900">{activeMatchingResult.statistics.fuzzyMatchCount}</div>
            <div className="text-sm text-yellow-700">需要确认</div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 text-center">
            <UserPlus className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-900">{activeMatchingResult.statistics.newStudentCount}</div>
            <div className="text-sm text-purple-700">新学生</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4 text-center">
            <Eye className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{activeMatchingResult.statistics.missingStudentCount}</div>
            <div className="text-sm text-gray-700">缺失学生</div>
          </CardContent>
        </Card>
      </div>

      {/* 匹配率进度条 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">整体匹配率</span>
            <span className="text-sm text-gray-600">
              {(activeMatchingResult.statistics.matchRate * 100).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={activeMatchingResult.statistics.matchRate * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>已匹配: {activeMatchingResult.statistics.exactMatchCount}</span>
            <span>总计: {activeMatchingResult.statistics.totalFileStudents}</span>
          </div>
        </CardContent>
      </Card>

      {/* 智能分析建议 */}
      {activeMatchingResult && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {matcher.getMatchingSuggestions(activeMatchingResult).recommendations.map((rec, index) => (
                <div key={index} className="text-sm">{rec}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 详细分析标签页 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="exact">精确匹配</TabsTrigger>
          <TabsTrigger value="fuzzy">需要确认</TabsTrigger>
          <TabsTrigger value="new">新学生</TabsTrigger>
          {showCountAnalysis && <TabsTrigger value="count">数量分析</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                智能匹配分析报告
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">匹配统计</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>精确匹配率:</span>
                      <span className="font-medium text-green-600">
                        {(activeMatchingResult.statistics.matchRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>需要确认:</span>
                      <span className="font-medium text-yellow-600">
                        {activeMatchingResult.statistics.fuzzyMatchCount} 个学生
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>新学生:</span>
                      <span className="font-medium text-purple-600">
                        {activeMatchingResult.statistics.newStudentCount} 个学生
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>缺失学生:</span>
                      <span className="font-medium text-gray-600">
                        {activeMatchingResult.statistics.missingStudentCount} 个学生
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">数据质量</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>系统中学生总数:</span>
                      <span className="font-medium">
                        {activeMatchingResult.statistics.totalSystemStudents} 个
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>文件中学生总数:</span>
                      <span className="font-medium">
                        {activeMatchingResult.statistics.totalFileStudents} 个
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>数据覆盖率:</span>
                      <span className="font-medium text-blue-600">
                        {((activeMatchingResult.statistics.exactMatchCount + activeMatchingResult.statistics.fuzzyMatchCount) / activeMatchingResult.statistics.totalSystemStudents * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 智能建议 */}
              <div className="mt-6 space-y-3">
                {matcher.getMatchingSuggestions(activeMatchingResult).warnings.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">注意事项</span>
                    </div>
                    <div className="space-y-1">
                      {matcher.getMatchingSuggestions(activeMatchingResult).warnings.map((warning, index) => (
                        <p key={index} className="text-sm text-red-700">{warning}</p>
                      ))}
                    </div>
                  </div>
                )}

                {matcher.getMatchingSuggestions(activeMatchingResult).actions.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">建议操作</span>
                    </div>
                    <div className="space-y-1">
                      {matcher.getMatchingSuggestions(activeMatchingResult).actions.map((action, index) => (
                        <p key={index} className="text-sm text-blue-700">{action}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                精确匹配学生 ({activeMatchingResult.exactMatches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {activeMatchingResult.exactMatches.map((match, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-green-900">{match.fileStudent.name}</div>
                        <div className="text-sm text-green-700">
                          {match.fileStudent.student_id && `学号: ${match.fileStudent.student_id}`}
                          {match.fileStudent.class_name && ` | 班级: ${match.fileStudent.class_name}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          {getMatchTypeLabel(match.matchType)}
                        </Badge>
                        <div className="text-xs text-green-600 mt-1">
                          系统: {match.systemStudent?.name} ({match.systemStudent?.student_id})
                        </div>
                        <div className="text-xs text-green-500 mt-1">
                          置信度: {(match.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuzzy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-yellow-600" />
                需要确认的学生 ({activeMatchingResult.fuzzyMatches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {activeMatchingResult.fuzzyMatches.map((match, index) => (
                    <div key={index} className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                      <div className="mb-3">
                        <h4 className="font-medium text-yellow-900">
                          文件中的学生: {match.fileStudent.name}
                        </h4>
                        <div className="text-sm text-yellow-700">
                          {match.fileStudent.student_id && `学号: ${match.fileStudent.student_id}`}
                          {match.fileStudent.class_name && ` | 班级: ${match.fileStudent.class_name}`}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">智能匹配建议:</h5>
                        <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{match.systemStudent?.name}</div>
                            <div className="text-sm text-gray-600">
                              学号: {match.systemStudent?.student_id}
                              {match.systemStudent?.class_name && ` | 班级: ${match.systemStudent?.class_name}`}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {match.matchReason}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getSimilarityColor(match.confidence)}>
                              {getSimilarityLabel(match.confidence)} ({(match.confidence * 100).toFixed(0)}%)
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                                onClick={() => onConfirmFuzzyMatch(index, match.systemStudent?.id || '')}
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                onClick={() => onRejectFuzzyMatch(index)}
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-600" />
                新学生 ({activeMatchingResult.newStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {activeMatchingResult.newStudents.map((student, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-purple-900">{student.name}</div>
                        <div className="text-sm text-purple-700">
                          {student.student_id && `学号: ${student.student_id}`}
                          {student.class_name && ` | 班级: ${student.class_name}`}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-purple-600 border-purple-300">
                        新学生
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {activeMatchingResult.missingStudents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-gray-600" />
                  系统中存在但本次文件未包含的学生 ({activeMatchingResult.missingStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {activeMatchingResult.missingStudents.map((student, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-600">
                            学号: {student.student_id}
                            {student.class_name && ` | 班级: ${student.class_name}`}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-gray-600 border-gray-300">
                          未包含
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {showCountAnalysis && activeCountResult && (
          <TabsContent value="count" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  班级数量分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 总体统计 */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{activeCountResult.totalSystemStudents}</div>
                      <div className="text-sm text-gray-600">系统中学生</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-900">{activeCountResult.totalFileStudents}</div>
                      <div className="text-sm text-blue-600">文件中学生</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${activeCountResult.totalDifference >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        {activeCountResult.totalDifference >= 0 ? '+' : ''}{activeCountResult.totalDifference}
                      </div>
                      <div className="text-sm text-gray-600">总差异</div>
                    </div>
                  </div>

                  {/* 班级详细分析 */}
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {activeCountResult.classCounts.map((classInfo, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(classInfo.status)}
                            <div>
                              <div className="font-medium">{classInfo.className}</div>
                              <div className="text-sm text-gray-600">
                                系统: {classInfo.systemCount}人 | 文件: {classInfo.fileCount}人
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={classInfo.status === 'normal' ? 'default' : 'secondary'}
                              className={
                                classInfo.status === 'missing' ? 'bg-red-100 text-red-800' :
                                classInfo.status === 'extra' ? 'bg-blue-100 text-blue-800' :
                                classInfo.status === 'new_class' ? 'bg-purple-100 text-purple-800' :
                                'bg-green-100 text-green-800'
                              }
                            >
                              {classInfo.difference >= 0 ? '+' : ''}{classInfo.difference}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* 分析建议 */}
                  {activeCountResult.recommendations.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">分析建议</h4>
                      <div className="space-y-1">
                        {activeCountResult.recommendations.map((rec, index) => (
                          <p key={index} className="text-sm text-blue-700">{rec}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          智能匹配分析完成，请检查结果并确认模糊匹配
        </div>
        {onReanalyze && (
          <Button onClick={onReanalyze} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            重新分析
          </Button>
        )}
      </div>
    </div>
  );

  // 向后兼容的旧版本渲染函数
  function renderLegacyMatchingResult(result: ExistingStudentCheckResult) {
    return (
      <div className="space-y-6">
        {/* 原有的简单统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">{result.totalStudentsInFile}</div>
              <div className="text-sm text-blue-700">文件中学生总数</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{result.exactMatches.length}</div>
              <div className="text-sm text-green-700">精确匹配</div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 text-center">
              <HelpCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-900">{result.fuzzyMatches.length}</div>
              <div className="text-sm text-yellow-700">需要确认</div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-center">
              <UserPlus className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">{result.newStudents.length}</div>
              <div className="text-sm text-purple-700">新学生</div>
            </CardContent>
          </Card>
        </div>

        {/* 简化的标签页 */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="exact">精确匹配</TabsTrigger>
            <TabsTrigger value="fuzzy">需要确认</TabsTrigger>
            <TabsTrigger value="new">新学生</TabsTrigger>
          </TabsList>

          {/* 这里可以添加简化版本的标签页内容 */}
        </Tabs>
      </div>
    );
  }
};

export default StudentMatchingAnalysis; 