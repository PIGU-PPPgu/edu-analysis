import React, { useEffect, useRef, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import WarningDashboard from "@/components/warning/WarningDashboard";
import WarningRules from "@/components/warning/WarningRules";
import WarningList from "@/components/warning/WarningList";
import ExamWarningAnalysis from "@/components/warning/ExamWarningAnalysis";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Settings, AlertTriangle, RefreshCcw, BarChart3, Calendar } from "lucide-react";
import { toast } from "sonner";
import { getWarningStatistics, WarningStats } from "@/services/warningService";

const WarningAnalysis = () => {
  // 添加组件挂载状态ref以防止任何潜在的问题
  const isMountedRef = useRef(true);
  const [isLoading, setIsLoading] = useState(false);
  const [warningStats, setWarningStats] = useState<WarningStats | null>(null);
  const [activeTab, setActiveTab] = useState("overall");
  
  // 清理任何潜在的副作用
  useEffect(() => {
    fetchWarningData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 获取预警数据
  const fetchWarningData = async () => {
    if (!isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      const stats = await getWarningStatistics();
      
      if (isMountedRef.current) {
        setWarningStats(stats);
      }
    } catch (error) {
      console.error('获取预警数据失败:', error);
      if (isMountedRef.current) {
        toast.error('获取预警数据失败', {
          description: '请稍后重试'
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchWarningData();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">预警分析</h1>
            <p className="text-gray-500 mt-1">
              基于多维度数据的学生学习预警系统，整合成绩、出勤、作业和参与度等数据
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isLoading}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? '刷新中...' : '刷新数据'}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/ai-settings">
                <Settings className="mr-2 h-4 w-4" />
                AI配置
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
            <div>
              <h4 className="font-medium">预警系统说明</h4>
              <p className="text-sm mt-1">
                本系统通过分析多种维度的学生数据，识别潜在风险因素并生成预警。
                您可以查看整体预警统计，也可以针对特定考试进行详细的预警分析。
                系统将自动评估并向您提供学生风险分析和干预建议。
              </p>
            </div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger 
              value="overall" 
              className="flex items-center gap-2 data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black"
            >
              <BarChart3 className="h-4 w-4" />
              整体预警分析
            </TabsTrigger>
            <TabsTrigger 
              value="exam" 
              className="flex items-center gap-2 data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black"
            >
              <Calendar className="h-4 w-4" />
              考试级预警分析
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overall" className="space-y-6">
          <WarningDashboard 
            warningData={warningStats}
            factorStats={warningStats?.commonRiskFactors}
          />
          <WarningList />
          <WarningRules />
          </TabsContent>

          <TabsContent value="exam" className="space-y-6">
            <ExamWarningAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WarningAnalysis;
