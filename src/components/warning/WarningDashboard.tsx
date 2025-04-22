
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WarningList from "./WarningList";
import WarningStatistics from "./WarningStatistics";
import RiskFactorChart from "./RiskFactorChart";
import { Button } from "@/components/ui/button";
import { ZapIcon } from "lucide-react";
import { toast } from "sonner";

const WarningDashboard = () => {
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  const generateAIInsights = () => {
    setIsGeneratingInsights(true);
    
    // 模拟AI分析过程
    setTimeout(() => {
      const insights = `
## 预警分析结果

根据当前数据分析，系统检测到以下几点关键发现：

1. **高风险学生**: 5名学生处于学习高风险状态，主要集中在数学和物理科目
2. **上升趋势**: 相比上月，预警学生数量增加了15%，需要引起关注
3. **主要风险因素**: 出勤率和作业完成情况是最主要的风险指标

## 建议措施

1. 对高风险学生进行一对一辅导干预
2. 加强班级作业管理和督促
3. 发起家校沟通，共同关注学生学习状态
      `;
      
      setAiInsights(insights);
      setIsGeneratingInsights(false);
      toast.success("AI分析完成", {
        description: "已生成预警分析报告"
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WarningStatistics />
        <RiskFactorChart />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ZapIcon className="h-5 w-5" />
            AI预警分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!aiInsights ? (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">
                AI可以分析学生数据，识别潜在风险因素，提供干预建议
              </p>
              <Button 
                onClick={generateAIInsights}
                className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
                disabled={isGeneratingInsights}
              >
                {isGeneratingInsights ? "分析中..." : "开始AI分析"}
              </Button>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: aiInsights.replace(/\n/g, '<br/>').replace(/## (.*)/g, '<h3>$1</h3>') }} />
              <div className="mt-4 pt-4 border-t flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAiInsights(null)}
                >
                  重新分析
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <WarningList />
    </div>
  );
};

export default WarningDashboard;
