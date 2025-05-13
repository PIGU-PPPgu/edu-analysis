import React, { useState, useEffect, useRef } from 'react';
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
  Share2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Users,
  ClipboardList
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getWarningStatistics, getRiskFactors, WarningStats } from '@/services/warningService';
import { formatNumber } from '@/utils/formatUtils';
import WarningList from './WarningList';
import WarningRules from './WarningRules';
import InterventionWorkflow from './InterventionWorkflow';
import RiskClusterView from './RiskClusterView';
import { useSession } from '@/hooks/useSession';

// 空状态提示组件
const EmptyState = ({ title, message, icon: Icon }: { title: string; message: string; icon: React.ElementType }) => (
  <Card className="bg-gray-50 border-dashed flex flex-col items-center justify-center p-10 text-center">
    <Icon className="h-12 w-12 text-gray-400 mb-4" />
    <h3 className="text-lg font-medium text-gray-700 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 max-w-md mb-6">{message}</p>
  </Card>
);

// 预警分析组件
const WarningAnalysis = () => {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDetails, setShowDetails] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedWarningId, setSelectedWarningId] = useState<string | null>(null);
  
  // 初始化预警统计数据状态
  const [stats, setStats] = useState<WarningStats>({
    students: { total: 0, at_risk: 0, trend: 'unchanged' },
    classes: { total: 0, at_risk: 0, trend: 'unchanged' },
    warnings: { 
      total: 0,
      by_type: [],
      by_severity: [
        { severity: 'high', count: 0, percentage: 0, trend: 'unchanged' },
        { severity: 'medium', count: 0, percentage: 0, trend: 'unchanged' },
        { severity: 'low', count: 0, percentage: 0, trend: 'unchanged' }
      ],
      trend: 'unchanged'
    },
    risk_factors: []
  });

  // 获取预警数据
  const fetchWarningData = async () => {
    setLoadingData(true);
    try {
      const statistics = await getWarningStatistics();
      if (statistics) {
        setStats(statistics);
      }
      
      // 测试已替换为真实API数据
      toast.success('预警数据已更新');
    } catch (error) {
      console.error('获取预警数据失败:', error);
      toast.error('获取预警数据失败');
    } finally {
      setLoadingData(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchWarningData();
  }, []);
  
  // 处理预警记录选择
  const handleWarningSelect = (warningId: string) => {
    setSelectedWarningId(warningId);
    setActiveTab('intervention');  // 自动切换到干预工作流标签
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* 标题和工具栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">预警分析</h1>
          <p className="text-gray-500 mt-1">分析学生预警数据，发现潜在问题并制定干预措施</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchWarningData} disabled={loadingData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? 'animate-spin' : ''}`} />
            {loadingData ? '加载中' : '刷新数据'}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出报告
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            分享
          </Button>
        </div>
      </div>
      
      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full mb-6">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>总览</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>预警列表</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>预警规则</span>
          </TabsTrigger>
          <TabsTrigger value="intervention" className="flex items-center space-x-2">
            <ClipboardList className="h-4 w-4" />
            <span>干预流程</span>
          </TabsTrigger>
          <TabsTrigger value="clusters" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>风险聚类</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <WarningDashboard
            stats={stats}
            isLoading={loadingData}
          />
        </TabsContent>
        
        <TabsContent value="list">
          <WarningList onWarningSelect={handleWarningSelect} />
        </TabsContent>
        
        <TabsContent value="rules">
          <WarningRules />
        </TabsContent>
        
        <TabsContent value="intervention">
          {selectedWarningId ? (
            <InterventionWorkflow 
              warningRecord={{ 
                id: selectedWarningId, 
                student_id: '', 
                rule_id: null,
                details: {},
                status: 'active',
                created_at: ''
              }} 
            />
          ) : (
            <EmptyState
              title="请选择预警记录"
              message="请从预警列表中选择一条预警记录，开始制定干预方案。"
              icon={ClipboardList}
            />
          )}
        </TabsContent>
        
        <TabsContent value="clusters">
          <RiskClusterView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WarningAnalysis; 