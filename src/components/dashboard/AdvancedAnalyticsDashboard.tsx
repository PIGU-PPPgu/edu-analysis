import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Activity, 
  Users, 
  Brain, 
  Target,
  TrendingUp,
  AlertTriangle,
  Eye,
  Zap,
  BookOpen,
  Award,
  Search,
  Filter,
  Download,
  Settings,
  RefreshCw
} from 'lucide-react';

// 导入所有高级分析组件
import { CorrelationAnalysis } from '@/components/analysis/advanced/CorrelationAnalysis';
import { SubjectCorrelationAnalysis } from '@/components/analysis/advanced/SubjectCorrelationAnalysis';
import { AnomalyDetection } from '@/components/analysis/advanced/AnomalyDetection';
import { AnomalyDetectionAnalysis } from '@/components/analysis/advanced/AnomalyDetectionAnalysis';
import { PredictiveAnalysis } from '@/components/analysis/advanced/PredictiveAnalysis';
import { LearningBehaviorAnalysis } from '@/components/analysis/advanced/LearningBehaviorAnalysis';
import { ContributionAnalysis } from '@/components/analysis/advanced/ContributionAnalysis';
import { CrossAnalysis } from '@/components/analysis/advanced/CrossAnalysis';
import { AdvancedDashboard } from '@/components/analysis/advanced/AdvancedDashboard';

// 学生画像相关组件
import { IntelligentPortraitAnalysis } from '@/components/portrait/advanced/IntelligentPortraitAnalysis';
import { EnhancedStudentPortrait } from '@/components/portrait/advanced/EnhancedStudentPortrait';

// 统计分析组件
import { StatisticsOverview } from '@/components/analysis/statistics/StatisticsOverview';
import { ScoreDistribution } from '@/components/analysis/statistics/ScoreDistribution';

// 对比分析组件
import { ClassComparisonChart } from '@/components/analysis/comparison/ClassComparisonChart';
import { ClassBoxPlotChart } from '@/components/analysis/comparison/ClassBoxPlotChart';

// 学生画像组件
import { AbilityRadar } from '@/components/profile/AbilityRadar';

export interface DashboardProps {
  classId?: string;
  studentId?: string;
  subjectId?: string;
}

interface AnalysisModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'correlation' | 'anomaly' | 'predictive' | 'portrait' | 'statistics' | 'comparison';
  component: React.ComponentType<any>;
  requiredData: string[];
  isAdvanced: boolean;
}

export const AdvancedAnalyticsDashboard: React.FC<DashboardProps> = ({
  classId,
  studentId,
  subjectId
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  // 定义所有分析模块
  const analysisModules: AnalysisModule[] = [
    // 相关性分析模块
    {
      id: 'correlation-analysis',
      title: '相关性分析',
      description: '全面的学科间相关性分析，包含热力图、散点图和相关性矩阵',
      icon: <BarChart3 className="h-5 w-5" />,
      category: 'correlation',
      component: CorrelationAnalysis,
      requiredData: ['grades', 'subjects'],
      isAdvanced: true
    },
    {
      id: 'subject-correlation',
      title: '学科相关性分析',
      description: '专注于学科间相关性的简化分析界面',
      icon: <BookOpen className="h-5 w-5" />,
      category: 'correlation',
      component: SubjectCorrelationAnalysis,
      requiredData: ['grades', 'subjects'],
      isAdvanced: false
    },
    
    // 异常检测模块
    {
      id: 'anomaly-detection',
      title: '异常检测',
      description: '智能异常检测系统，识别学习表现中的异常模式',
      icon: <AlertTriangle className="h-5 w-5" />,
      category: 'anomaly',
      component: AnomalyDetection,
      requiredData: ['grades', 'behavior_data'],
      isAdvanced: true
    },
    {
      id: 'anomaly-analysis',
      title: '异常分析',
      description: '基于统计学的异常检测和深度分析',
      icon: <Eye className="h-5 w-5" />,
      category: 'anomaly',
      component: AnomalyDetectionAnalysis,
      requiredData: ['grades', 'statistics'],
      isAdvanced: true
    },
    
    // 预测分析模块
    {
      id: 'predictive-analysis',
      title: '预测分析',
      description: 'AI驱动的学生表现预测和趋势分析',
      icon: <TrendingUp className="h-5 w-5" />,
      category: 'predictive',
      component: PredictiveAnalysis,
      requiredData: ['historical_grades', 'behavior_data'],
      isAdvanced: true
    },
    {
      id: 'learning-behavior',
      title: '学习行为分析',
      description: '多维度学习行为模式分析和可视化',
      icon: <Activity className="h-5 w-5" />,
      category: 'predictive',
      component: LearningBehaviorAnalysis,
      requiredData: ['behavior_data', 'engagement_metrics'],
      isAdvanced: true
    },
    
    // 学生画像模块
    {
      id: 'intelligent-portrait',
      title: '智能学生画像',
      description: 'AI驱动的智能学生画像分析系统',
      icon: <Brain className="h-5 w-5" />,
      category: 'portrait',
      component: IntelligentPortraitAnalysis,
      requiredData: ['student_profile', 'grades', 'behavior_data'],
      isAdvanced: true
    },
    {
      id: 'enhanced-portrait',
      title: '增强学生画像',
      description: '全方位学生能力和特征分析',
      icon: <User className="h-5 w-5" />,
      category: 'portrait',
      component: EnhancedStudentPortrait,
      requiredData: ['student_profile', 'ability_data'],
      isAdvanced: true
    },
    {
      id: 'ability-radar',
      title: '能力雷达图',
      description: '学生多维能力可视化展示',
      icon: <Target className="h-5 w-5" />,
      category: 'portrait',
      component: AbilityRadar,
      requiredData: ['ability_scores'],
      isAdvanced: false
    },
    
    // 统计分析模块
    {
      id: 'statistics-overview',
      title: '统计概览',
      description: '班级和学科统计数据综合概览',
      icon: <PieChart className="h-5 w-5" />,
      category: 'statistics',
      component: StatisticsOverview,
      requiredData: ['grades', 'class_data'],
      isAdvanced: false
    },
    {
      id: 'score-distribution',
      title: '成绩分布分析',
      description: '详细的成绩分布统计和可视化',
      icon: <BarChart3 className="h-5 w-5" />,
      category: 'statistics',
      component: ScoreDistribution,
      requiredData: ['grades'],
      isAdvanced: false
    },
    
    // 对比分析模块
    {
      id: 'class-comparison',
      title: '班级对比分析',
      description: '多维度班级表现对比分析',
      icon: <Users className="h-5 w-5" />,
      category: 'comparison',
      component: ClassComparisonChart,
      requiredData: ['class_grades'],
      isAdvanced: false
    },
    {
      id: 'boxplot-analysis',
      title: '箱线图分析',
      description: '基于箱线图的班级表现分布分析',
      icon: <LineChart className="h-5 w-5" />,
      category: 'comparison',
      component: ClassBoxPlotChart,
      requiredData: ['class_grades'],
      isAdvanced: false
    },
    
    // 综合分析模块
    {
      id: 'contribution-analysis',
      title: '贡献度分析',
      description: '学生对班级表现的贡献度分析',
      icon: <Award className="h-5 w-5" />,
      category: 'comparison',
      component: ContributionAnalysis,
      requiredData: ['student_grades', 'class_averages'],
      isAdvanced: true
    },
    {
      id: 'cross-analysis',
      title: '交叉分析',
      description: '多维度交叉分析和数据关联发现',
      icon: <Zap className="h-5 w-5" />,
      category: 'comparison',
      component: CrossAnalysis,
      requiredData: ['multi_dimensional_data'],
      isAdvanced: true
    }
  ];

  // 过滤模块
  const filteredModules = analysisModules.filter(module => {
    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || module.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // 按类别分组模块
  const modulesByCategory = analysisModules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, AnalysisModule[]>);

  // 刷新数据
  const handleRefreshData = () => {
    setIsLoading(true);
    setDataRefreshKey(prev => prev + 1);
    setTimeout(() => setIsLoading(false), 1000);
  };

  // 导出分析报告
  const handleExportReport = () => {
    // 实现导出功能
    console.log('Exporting analysis report...');
  };

  const categoryLabels = {
    correlation: '相关性分析',
    anomaly: '异常检测',
    predictive: '预测分析',
    portrait: '学生画像',
    statistics: '统计分析',
    comparison: '对比分析'
  };

  const categoryColors = {
    correlation: 'bg-blue-500',
    anomaly: 'bg-red-500',
    predictive: 'bg-green-500',
    portrait: 'bg-purple-500',
    statistics: 'bg-yellow-500',
    comparison: 'bg-indigo-500'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 顶部标题和控件 */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">高级分析仪表板</h1>
            <p className="text-gray-600 mt-1">全面的教育数据分析和洞察平台</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleRefreshData}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>
            
            <Button
              onClick={handleExportReport}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              导出报告
            </Button>
            
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              设置
            </Button>
          </div>
        </div>

        {/* 搜索和筛选栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索分析模块..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="选择类别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类别</SelectItem>
                    <SelectItem value="correlation">相关性分析</SelectItem>
                    <SelectItem value="anomaly">异常检测</SelectItem>
                    <SelectItem value="predictive">预测分析</SelectItem>
                    <SelectItem value="portrait">学生画像</SelectItem>
                    <SelectItem value="statistics">统计分析</SelectItem>
                    <SelectItem value="comparison">对比分析</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="modules">分析模块</TabsTrigger>
            <TabsTrigger value="correlation">相关性</TabsTrigger>
            <TabsTrigger value="predictive">预测</TabsTrigger>
            <TabsTrigger value="portrait">画像</TabsTrigger>
            <TabsTrigger value="statistics">统计</TabsTrigger>
          </TabsList>

          {/* 总览标签页 */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(categoryLabels).map(([category, label]) => {
                const modules = modulesByCategory[category] || [];
                const advancedCount = modules.filter(m => m.isAdvanced).length;
                
                return (
                  <Card key={category} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{label}</CardTitle>
                        <div className={`w-3 h-3 rounded-full ${categoryColors[category as keyof typeof categoryColors]}`} />
                      </div>
                      <CardDescription>
                        {modules.length} 个模块，{advancedCount} 个高级功能
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {modules.slice(0, 3).map(module => (
                          <div key={module.id} className="flex items-center gap-2 text-sm">
                            {module.icon}
                            <span className="truncate">{module.title}</span>
                            {module.isAdvanced && (
                              <Badge variant="secondary" className="text-xs">高级</Badge>
                            )}
                          </div>
                        ))}
                        {modules.length > 3 && (
                          <p className="text-xs text-gray-500">+{modules.length - 3} 更多...</p>
                        )}
                      </div>
                      
                      <Button
                        className="w-full mt-4"
                        variant="outline"
                        onClick={() => {
                          setActiveTab('modules');
                          setFilterCategory(category);
                        }}
                      >
                        查看所有模块
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 快速统计 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{analysisModules.length}</div>
                  <div className="text-sm text-gray-600">分析模块总数</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisModules.filter(m => m.isAdvanced).length}
                  </div>
                  <div className="text-sm text-gray-600">高级分析功能</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Object.keys(categoryLabels).length}
                  </div>
                  <div className="text-sm text-gray-600">分析类别</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {filteredModules.length}
                  </div>
                  <div className="text-sm text-gray-600">当前显示模块</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 分析模块标签页 */}
          <TabsContent value="modules" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredModules.map(module => (
                <Card 
                  key={module.id} 
                  className={`hover:shadow-lg transition-all cursor-pointer ${
                    selectedModule === module.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedModule(module.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {module.icon}
                        <CardTitle className="text-base">{module.title}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${categoryColors[module.category]} text-white`}
                        >
                          {categoryLabels[module.category]}
                        </Badge>
                        {module.isAdvanced && (
                          <Badge variant="outline" className="text-xs">高级</Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">所需数据:</p>
                        <div className="flex flex-wrap gap-1">
                          {module.requiredData.map(data => (
                            <Badge key={data} variant="outline" className="text-xs">
                              {data}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 这里可以实现模块的直接启动
                          console.log(`启动模块: ${module.id}`);
                        }}
                      >
                        启动分析
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 相关性分析标签页 */}
          <TabsContent value="correlation" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>全面相关性分析</CardTitle>
                  <CardDescription>包含热力图、散点图和统计分析</CardDescription>
                </CardHeader>
                <CardContent>
                  <CorrelationAnalysis key={dataRefreshKey} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>学科相关性分析</CardTitle>
                  <CardDescription>简化的学科间相关性分析</CardDescription>
                </CardHeader>
                <CardContent>
                  <SubjectCorrelationAnalysis key={dataRefreshKey} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 预测分析标签页 */}
          <TabsContent value="predictive" className="space-y-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI预测分析</CardTitle>
                  <CardDescription>基于机器学习的学生表现预测</CardDescription>
                </CardHeader>
                <CardContent>
                  <PredictiveAnalysis key={dataRefreshKey} />
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>学习行为分析</CardTitle>
                    <CardDescription>多维度学习行为模式分析</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LearningBehaviorAnalysis key={dataRefreshKey} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>异常检测</CardTitle>
                    <CardDescription>智能异常模式识别</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnomalyDetection key={dataRefreshKey} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 学生画像标签页 */}
          <TabsContent value="portrait" className="space-y-6">
            <div className="space-y-6">
              {studentId && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>智能学生画像</CardTitle>
                      <CardDescription>AI驱动的全方位学生分析</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <IntelligentPortraitAnalysis 
                        key={dataRefreshKey}
                        studentId={studentId}
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>增强学生画像</CardTitle>
                      <CardDescription>详细的能力和特征分析</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EnhancedStudentPortrait 
                        key={dataRefreshKey}
                        studentId={studentId}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>能力雷达图</CardTitle>
                  <CardDescription>多维能力可视化分析</CardDescription>
                </CardHeader>
                <CardContent>
                  <AbilityRadar key={dataRefreshKey} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 统计分析标签页 */}
          <TabsContent value="statistics" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>统计概览</CardTitle>
                  <CardDescription>班级和学科的综合统计信息</CardDescription>
                </CardHeader>
                <CardContent>
                  <StatisticsOverview key={dataRefreshKey} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>成绩分布分析</CardTitle>
                  <CardDescription>详细的成绩分布统计</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScoreDistribution key={dataRefreshKey} />
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>班级对比分析</CardTitle>
                  <CardDescription>多班级表现对比</CardDescription>
                </CardHeader>
                <CardContent>
                  <ClassComparisonChart key={dataRefreshKey} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>箱线图分析</CardTitle>
                  <CardDescription>表现分布的箱线图展示</CardDescription>
                </CardHeader>
                <CardContent>
                  <ClassBoxPlotChart key={dataRefreshKey} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;