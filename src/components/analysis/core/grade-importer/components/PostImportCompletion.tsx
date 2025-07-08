/**
 *  PostImportCompletion - 导入后智能补全组件
 * 
 * 在分析结果页面智能提醒用户补充缺失的重要数据
 * 让用户在看到初步结果后，轻松添加更多有价值的字段
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  Plus,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  BarChart3,
  Zap,
  ArrowRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 使用智能回退引擎的类型
import type { MissingFieldInfo, PostImportAction } from '../../../services/smartFallbackEngine';

// 数据完整性分析结果
interface DataCompletenessAnalysis {
  overallScore: number;
  categories: {
    studentInfo: { score: number; missing: string[]; impact: string };
    academicData: { score: number; missing: string[]; impact: string };
    performance: { score: number; missing: string[]; impact: string };
    analytics: { score: number; missing: string[]; impact: string };
  };
  priorityActions: EnhancementAction[];
  quickWins: EnhancementAction[];
}

// 增强操作
interface EnhancementAction {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'complex';
  category: 'student_info' | 'academic_data' | 'performance' | 'analytics';
  missingField: string;
  suggestedSources: string[];
  previewBenefit: string;
}

export interface PostImportCompletionProps {
  importedData: any[];
  originalHeaders: string[];
  currentMapping: Record<string, string>;
  missingFields: MissingFieldInfo[];
  postImportActions: PostImportAction[];
  onFieldAdded: (fieldMapping: Record<string, string>) => void;
  onDismiss: () => void;
}

const PostImportCompletion: React.FC<PostImportCompletionProps> = ({
  importedData,
  originalHeaders,
  currentMapping,
  missingFields,
  postImportActions,
  onFieldAdded,
  onDismiss
}) => {
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 分析数据完整性
  const analyzeDataCompleteness = useCallback((): DataCompletenessAnalysis => {
    
    // 检查各类数据的完整性
    const studentInfoFields = ['name', 'student_id', 'class_name'];
    const academicFields = ['chinese_score', 'math_score', 'english_score', 'total_score'];
    const performanceFields = ['rank_in_class', 'rank_in_grade', 'original_grade'];
    const analyticsFields = ['rank_in_school', 'percentile', 'z_score'];

    const mappedFields = Object.values(currentMapping);
    
    const calculateCategoryScore = (fields: string[]) => {
      const presentCount = fields.filter(field => mappedFields.includes(field)).length;
      return Math.round((presentCount / fields.length) * 100);
    };

    const studentInfoScore = calculateCategoryScore(studentInfoFields);
    const academicScore = calculateCategoryScore(academicFields);
    const performanceScore = calculateCategoryScore(performanceFields);
    const analyticsScore = calculateCategoryScore(analyticsFields);

    // 计算总体评分
    const overallScore = Math.round((studentInfoScore * 0.4 + academicScore * 0.4 + performanceScore * 0.15 + analyticsScore * 0.05));

    // 生成增强建议
    const enhancementActions: EnhancementAction[] = [];

    // 学生信息增强
    if (!mappedFields.includes('student_id')) {
      enhancementActions.push({
        id: 'add_student_id',
        title: '添加学号字段',
        description: '学号是学生的唯一标识，有助于精确匹配和数据关联',
        impact: 'high',
        effort: 'easy',
        category: 'student_info',
        missingField: 'student_id',
        suggestedSources: originalHeaders.filter(h => 
          ['学号', '考生号', '编号', 'id'].some(p => h.includes(p))
        ),
        previewBenefit: '可以精确识别学生，避免同名混淆'
      });
    }

    // 总分增强
    if (!mappedFields.includes('total_score') && academicScore > 40) {
      enhancementActions.push({
        id: 'add_total_score',
        title: '添加总分字段',
        description: '总分是最重要的综合指标，影响排名和整体分析',
        impact: 'high',
        effort: 'easy',
        category: 'academic_data',
        missingField: 'total_score',
        suggestedSources: originalHeaders.filter(h => 
          ['总分', '总成绩', '合计', 'total'].some(p => h.includes(p))
        ),
        previewBenefit: '启用综合排名分析和整体表现评估'
      });
    }

    // 排名增强
    if (!mappedFields.includes('rank_in_class') && mappedFields.includes('total_score')) {
      enhancementActions.push({
        id: 'add_class_rank',
        title: '添加班级排名',
        description: '班级排名直观反映学生在班级中的相对位置',
        impact: 'medium',
        effort: 'easy',
        category: 'performance',
        missingField: 'rank_in_class',
        suggestedSources: originalHeaders.filter(h => 
          ['排名', '班级排名', '班排名'].some(p => h.includes(p))
        ),
        previewBenefit: '显示班级内竞争态势和相对表现'
      });
    }

    // 等级增强
    if (!mappedFields.includes('original_grade') && academicScore > 60) {
      enhancementActions.push({
        id: 'add_grade_level',
        title: '添加成绩等级',
        description: '等级评定提供更直观的成绩评价维度',
        impact: 'medium',
        effort: 'easy',
        category: 'performance',
        missingField: 'original_grade',
        suggestedSources: originalHeaders.filter(h => 
          ['等级', '评级', '成绩等级'].some(p => h.includes(p))
        ),
        previewBenefit: '提供A/B/C等级分析和分布统计'
      });
    }

    // 按影响和难度排序
    const priorityActions = enhancementActions
      .filter(action => action.impact === 'high')
      .sort((a, b) => (a.effort === 'easy' ? -1 : 1));

    const quickWins = enhancementActions
      .filter(action => action.effort === 'easy')
      .sort((a, b) => (a.impact === 'high' ? -1 : 1));

    return {
      overallScore,
      categories: {
        studentInfo: { 
          score: studentInfoScore, 
          missing: studentInfoFields.filter(f => !mappedFields.includes(f)),
          impact: studentInfoScore < 70 ? '影响学生识别准确性' : '学生信息基本完整'
        },
        academicData: { 
          score: academicScore, 
          missing: academicFields.filter(f => !mappedFields.includes(f)),
          impact: academicScore < 50 ? '限制成绩分析深度' : '成绩数据相对充足'
        },
        performance: { 
          score: performanceScore, 
          missing: performanceFields.filter(f => !mappedFields.includes(f)),
          impact: performanceScore < 30 ? '无法进行排名和竞争分析' : '表现数据可用'
        },
        analytics: { 
          score: analyticsScore, 
          missing: analyticsFields.filter(f => !mappedFields.includes(f)),
          impact: '高级分析功能受限'
        }
      },
      priorityActions,
      quickWins
    };
  }, [currentMapping, originalHeaders]);

  // 处理字段映射
  const handleFieldMapping = (actionId: string, sourceHeader: string) => {
    const action = completenessAnalysis.priorityActions
      .concat(completenessAnalysis.quickWins)
      .find(a => a.id === actionId);
    
    if (action) {
      setSelectedMappings(prev => ({
        ...prev,
        [actionId]: sourceHeader
      }));
    }
  };

  // 应用选择的映射
  const handleApplyMappings = async () => {
    setIsAnalyzing(true);
    
    try {
      const newMappings: Record<string, string> = {};
      
      Object.entries(selectedMappings).forEach(([actionId, sourceHeader]) => {
        const action = completenessAnalysis.priorityActions
          .concat(completenessAnalysis.quickWins)
          .find(a => a.id === actionId);
        
        if (action) {
          newMappings[sourceHeader] = action.missingField;
        }
      });

      // 模拟重新处理数据
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onFieldAdded(newMappings);
      
      toast.success(`成功添加了 ${Object.keys(newMappings).length} 个字段`, {
        description: '数据分析能力已增强',
        duration: 3000
      });
      
    } catch (error) {
      toast.error('字段添加失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 忽略建议
  const handleDismissAction = (actionId: string) => {
    setDismissedActions(prev => new Set([...prev, actionId]));
  };

  // 获取影响程度颜色
  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const completenessAnalysis = analyzeDataCompleteness();
  const availableActions = completenessAnalysis.priorityActions
    .concat(completenessAnalysis.quickWins)
    .filter(action => !dismissedActions.has(action.id));

  if (availableActions.length === 0) {
    return null; // 没有建议时不显示组件
  }

  return (
    <div className="space-y-6">
      {/* 数据完整性概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            数据完整性分析
          </CardTitle>
          <CardDescription>
            您的数据已成功导入，以下是进一步提升分析能力的建议
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 总体评分 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium">数据完整度评分</h3>
              <p className="text-sm text-gray-600 mt-1">
                {completenessAnalysis.overallScore >= 80 ? '数据质量优秀' :
                 completenessAnalysis.overallScore >= 60 ? '数据质量良好' :
                 completenessAnalysis.overallScore >= 40 ? '数据质量一般' : '建议补充更多数据'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {completenessAnalysis.overallScore}
              </div>
              <div className="text-sm text-gray-500">/ 100</div>
            </div>
          </div>

          {/* 分类完整度 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>学生信息</span>
                <span>{completenessAnalysis.categories.studentInfo.score}%</span>
              </div>
              <Progress value={completenessAnalysis.categories.studentInfo.score} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>学科成绩</span>
                <span>{completenessAnalysis.categories.academicData.score}%</span>
              </div>
              <Progress value={completenessAnalysis.categories.academicData.score} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>表现指标</span>
                <span>{completenessAnalysis.categories.performance.score}%</span>
              </div>
              <Progress value={completenessAnalysis.categories.performance.score} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>分析能力</span>
                <span>{completenessAnalysis.categories.analytics.score}%</span>
              </div>
              <Progress value={completenessAnalysis.categories.analytics.score} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 优先级建议 */}
      {completenessAnalysis.priorityActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              重要提升建议
            </CardTitle>
            <CardDescription>
              这些改进可以显著提升您的数据分析能力
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {completenessAnalysis.priorityActions.map((action) => (
              <Alert 
                key={action.id} 
                className={cn("border-l-4", getImpactColor(action.impact))}
              >
                <AlertDescription>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{action.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {action.impact === 'high' ? '高价值' : '中等价值'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{action.description}</p>
                        <p className="text-xs text-blue-600 mt-1">
                           {action.previewBenefit}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismissAction(action.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {action.suggestedSources.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          请选择对应的数据列：
                        </label>
                        <Select
                          value={selectedMappings[action.id] || ''}
                          onValueChange={(value) => handleFieldMapping(action.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择数据列..." />
                          </SelectTrigger>
                          <SelectContent>
                            {action.suggestedSources.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 快速增强 */}
      {completenessAnalysis.quickWins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              快速增强建议
            </CardTitle>
            <CardDescription>
              这些简单的添加可以立即改善您的分析体验
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {completenessAnalysis.quickWins
              .filter(action => !completenessAnalysis.priorityActions.includes(action))
              .map((action) => (
                <div 
                  key={action.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">{action.title}</p>
                      <p className="text-xs text-gray-600">{action.previewBenefit}</p>
                    </div>
                  </div>
                  
                  {action.suggestedSources.length > 0 && (
                    <Select
                      value={selectedMappings[action.id] || ''}
                      onValueChange={(value) => handleFieldMapping(action.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="选择列..." />
                      </SelectTrigger>
                      <SelectContent>
                        {action.suggestedSources.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onDismiss}>
          跳过，使用当前数据
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setDismissedActions(new Set(availableActions.map(a => a.id)))}
          >
            全部忽略
          </Button>
          <Button 
            onClick={handleApplyMappings}
            disabled={Object.keys(selectedMappings).length === 0 || isAnalyzing}
            className="min-w-[120px]"
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                处理中...
              </div>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                应用 {Object.keys(selectedMappings).length} 项
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PostImportCompletion;