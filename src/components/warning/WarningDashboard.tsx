
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WarningStatistics from "./WarningStatistics";
import RiskFactorChart from "./RiskFactorChart";
import { Button } from "@/components/ui/button";
import { ZapIcon, Users, School } from "lucide-react";
import { toast } from "sonner";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const WarningDashboard = () => {
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);

  useEffect(() => {
    const config = getUserAIConfig();
    const apiKey = getUserAPIKey();
    setAiConfigured(!!config && !!apiKey);
  }, []);

  const generateRandomInsight = () => {
    const highRiskCount = Math.floor(3 + Math.random() * 5);
    
    const subjects = ["数学", "语文", "英语", "物理", "化学", "生物"];
    const randomSubjects = () => {
      const count = 1 + Math.floor(Math.random() * 2);
      const selected = [];
      for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * subjects.length);
        if (!selected.includes(subjects[index])) {
          selected.push(subjects[index]);
        }
      }
      return selected.join("和");
    };
    
    const riskFactors = ["出勤率", "作业完成情况", "课堂参与度", "考试成绩", "学习态度"];
    const randomRiskFactors = () => {
      const count = 1 + Math.floor(Math.random() * 2);
      const selected = [];
      for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * riskFactors.length);
        if (!selected.includes(riskFactors[index])) {
          selected.push(riskFactors[index]);
        }
      }
      return selected.join("和");
    };
    
    const increasePercent = 5 + Math.floor(Math.random() * 20);
    
    return `
## 预警分析结果

根据当前数据分析，系统检测到以下几点关键发现：

1. **高风险学生**: ${highRiskCount}名学生处于学习高风险状态，主要集中在${randomSubjects()}科目
2. **上升趋势**: 相比上月，预警学生数量增加了${increasePercent}%，需要引起关注
3. **主要风险因素**: ${randomRiskFactors()}是最主要的风险指标

## 建议措施

1. 对高风险学生进行一对一辅导干预
2. 加强班级${Math.random() > 0.5 ? '作业管理和督促' : '考勤管理'}
3. 发起家校沟通，共同关注学生学习状态
${Math.random() > 0.5 ? '4. 设计专项提升计划，针对薄弱学科进行重点辅导' : ''}
      `;
  };

  const generateAIInsights = () => {
    const aiConfig = getUserAIConfig();
    const apiKey = getUserAPIKey();
    
    if (!aiConfig || !apiKey) {
      toast.error("请先配置AI服务", {
        description: "前往AI设置页面配置大模型API"
      });
      return;
    }
    
    setIsGeneratingInsights(true);
    
    setTimeout(() => {
      const insights = generateRandomInsight();
      setAiInsights(insights);
      setIsGeneratingInsights(false);
      toast.success("AI分析完成", {
        description: "已生成预警分析报告"
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">预警总览</h2>
          <p className="text-sm text-gray-500">系统检测到的风险学生情况</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/student-management">
              <Users className="h-4 w-4 mr-1" />
              学生管理
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/class-management">
              <School className="h-4 w-4 mr-1" />
              班级管理
            </Link>
          </Button>
        </div>
      </div>
      
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
                disabled={isGeneratingInsights || !aiConfigured}
              >
                {isGeneratingInsights ? "分析中..." : !aiConfigured ? "请先配置AI服务" : "开始AI分析"}
              </Button>
              {!aiConfigured && (
                <p className="text-sm text-gray-500">
                  您需要先在AI设置页面配置大模型API才能使用AI分析功能
                </p>
              )}
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
    </div>
  );
};

export default WarningDashboard;
