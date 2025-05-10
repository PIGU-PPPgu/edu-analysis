import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WarningDashboard from './WarningDashboard';
import AssociationAnalysis from './AssociationAnalysis';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  AlertTriangle, 
  BarChart3, 
  UserRoundSearch, 
  AlertCircle, 
  Network, 
  TrendingUp,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Brain,
  Download,
  Share2
} from 'lucide-react';
import { getMockWarningSystemData } from '@/services/mockDataService';
import { generateStudentDataset } from '@/services/mockDataService';
import { 
  generateBatchWarnings, 
  aggregateRiskFactors,
  aggregateRiskLevels
} from '@/services/warningAnalytics';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// 模拟数据
const initialStats = {
  totalStudents: 0,
  atRiskStudents: 0,
  highRiskStudents: 0,
  warningsByType: [],
  riskByClass: [],
  commonRiskFactors: []
};

/**
 * 学生预警分析系统
 * 整合预警仪表板、关联分析和趋势分析功能
 */
const WarningAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [systemData, setSystemData] = useState(initialStats);
  const [warningResults, setWarningResults] = useState<any[]>([]);
  const [factorStats, setFactorStats] = useState<any[]>([]);
  const [levelStats, setLevelStats] = useState<any[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>(
    new Date().toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit' 
    })
  );

  // 加载系统数据
  const loadSystemData = async () => {
    setIsLoading(true);
    
    try {
      toast.info("正在获取预警数据...");
      
      // 从模拟服务获取数据
      const mockData = getMockWarningSystemData();
      setSystemData(mockData);
      
      // 生成预警结果
      const students = mockData.students;
      const warnings = generateBatchWarnings(students);
      setWarningResults(warnings);
      
      // 计算风险因素统计
      const factors = aggregateRiskFactors(warnings);
      setFactorStats(factors);
      
      // 计算风险级别统计
      const levels = aggregateRiskLevels(warnings);
      setLevelStats(levels);
      
      // 更新时间
      setLastUpdateTime(
        new Date().toLocaleString('zh-CN', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit' 
        })
      );
      
      toast.success("数据获取成功", {
        description: "预警分析数据已更新"
      });
      
    } catch (error) {
      console.error('加载系统数据失败', error);
      toast.error("数据获取失败", {
        description: "请稍后重试"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 组件加载时获取数据
  useEffect(() => {
    loadSystemData();
  }, []);

  // 刷新数据
  const refreshData = () => {
    loadSystemData();
  };

  // 获取风险级别徽章颜色
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-amber-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-green-500';
    }
  };

  // 导出数据
  const exportData = () => {
    toast.info("正在准备导出数据...", {
      description: "功能正在开发中"
    });
  };

  // 分享报告
  const shareReport = () => {
    toast.info("正在准备分享报告...", {
      description: "功能正在开发中"
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-lg border border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">学生预警分析系统</h1>
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {levelStats.find(l => l.level === 'high')?.count || 0} 名高风险
              </Badge>
            </div>
            <p className="text-slate-600 mt-1">实时监控学生风险指标，提供智能干预建议</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="border-slate-200 text-slate-600" 
              onClick={shareReport}
            >
              <Share2 className="h-4 w-4 mr-1" /> 
              分享
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="border-slate-200 text-slate-600" 
              onClick={exportData}
            >
              <Download className="h-4 w-4 mr-1" /> 
              导出
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={refreshData} 
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? '更新中...' : '刷新数据'}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/80 shadow-sm hover:shadow transition-shadow border-t-4 border-t-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserRoundSearch className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-slate-500">学生总数</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{systemData.totalStudents}</span>
                <span className="text-xs text-slate-500 ml-1">人</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 shadow-sm hover:shadow transition-shadow border-t-4 border-t-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-slate-500">预警学生</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{systemData.atRiskStudents}</span>
                <span className="text-xs text-slate-500 ml-1">人</span>
                <span className="text-xs text-amber-500 ml-2">
                  ({((systemData.atRiskStudents / systemData.totalStudents) * 100).toFixed(1)}%)
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 shadow-sm hover:shadow transition-shadow border-t-4 border-t-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-slate-500">高风险学生</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{systemData.highRiskStudents}</span>
                <span className="text-xs text-slate-500 ml-1">人</span>
                <span className="text-xs text-red-500 ml-2">
                  ({((systemData.highRiskStudents / systemData.atRiskStudents) * 100).toFixed(1)}%)
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 shadow-sm hover:shadow transition-shadow border-t-4 border-t-indigo-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-medium text-slate-500">预警类型</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">{systemData.warningsByType.length}</span>
                <span className="text-xs text-slate-500 ml-2">最近更新: {lastUpdateTime}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b">
          <div className="flex justify-between items-center">
            <TabsList className="h-12">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-b-blue-600 rounded-none border-b-2 border-b-transparent px-6">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                预警概况
              </TabsTrigger>
              <TabsTrigger value="association" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-b-blue-600 rounded-none border-b-2 border-b-transparent px-6">
                <Network className="h-4 w-4 mr-2" />
                关联分析
              </TabsTrigger>
              <TabsTrigger value="trends" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-b-blue-600 rounded-none border-b-2 border-b-transparent px-6">
                <TrendingUp className="h-4 w-4 mr-2" />
                趋势分析
              </TabsTrigger>
            </TabsList>
            
            <div className="text-xs text-slate-500 pr-4 flex items-center">
              <Badge variant="outline" className="font-normal text-xs bg-slate-50">
                <RefreshCw className="h-3 w-3 mr-1" />
                {lastUpdateTime} 更新
              </Badge>
            </div>
          </div>
        </div>
        
        {/* 预警概况内容 */}
        <TabsContent value="dashboard" className="space-y-4 pt-6">
          <WarningDashboard 
            factorStats={factorStats} 
            levelStats={levelStats} 
            warningData={systemData} 
          />
        </TabsContent>
        
        {/* 关联分析内容 */}
        <TabsContent value="association" className="space-y-4 pt-6">
          <AssociationAnalysis />
        </TabsContent>
        
        {/* 趋势分析内容 */}
        <TabsContent value="trends" className="space-y-4 pt-6">
          <Card className="overflow-hidden border-t-4 border-t-green-500">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                学生风险趋势分析
              </CardTitle>
              <CardDescription>
                分析学生历史数据，预测未来风险变化趋势
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                <TrendingUp className="h-16 w-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">趋势分析功能正在开发中</h3>
                <p className="text-slate-500 max-w-md mb-4">
                  该功能将支持分析学生风险指标的历史变化趋势，预测未来可能的学业风险，并提供针对性干预建议。
                </p>
                <Button variant="outline">
                  了解更多
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t px-6 py-3">
              <div className="flex items-center text-xs text-slate-500">
                <div className="flex-1">预计上线日期：2023年12月15日</div>
                <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                  开发中
                </Badge>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="text-xs text-slate-500 mt-4 pt-4 border-t flex justify-between items-center">
        <span>学生预警分析系统 v1.0.1</span>
        <span className="flex items-center">
          数据来源：教务系统 + AI模型分析
        </span>
      </div>
    </div>
  );
};

export default WarningAnalysis; 