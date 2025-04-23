
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AIAnalysisTabs } from "./AIAnalysisTabs";
import { Button } from "@/components/ui/button";
import { Brain, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";

interface AIAnalysisProps {
  className?: string;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ className }) => {
  const { gradeData } = useGradeAnalysis();
  const [isLoading, setIsLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [analysis, setAnalysis] = useState<any>({
    overview: "",
    insights: [],
    recommendations: []
  });

  useEffect(() => {
    const config = getUserAIConfig();
    const apiKey = getUserAPIKey();
    setAiConfigured(!!config && !!apiKey);
  }, []);

  const generateAnalysis = () => {
    setIsLoading(true);
    
    // Mock AI analysis generation for demonstration
    setTimeout(() => {
      const mockAnalysis = {
        overview: `分析了${gradeData.length}条成绩记录，整体学习情况良好。${
          Math.random() > 0.5 ? '大部分学生在核心科目上表现稳定，但部分学生在特定领域需要额外关注。' : 
          '发现部分班级的数学和英语成绩存在较大差异，建议调整教学方法。'
        }`,
        insights: [
          `${Math.random() > 0.5 ? '数学' : '英语'}成绩分布呈现双峰特征，表明学生掌握程度存在显著分化`,
          `超过${70 + Math.floor(Math.random() * 20)}%的学生能够在考试中稳定发挥`,
          `发现部分学生在${Math.random() > 0.5 ? '应用题' : '计算题'}解答中存在系统性问题`,
          `${Math.random() > 0.5 ? '文科' : '理科'}科目整体表现优于${Math.random() > 0.5 ? '理科' : '文科'}科目`,
          `高分段学生在各科目表现较为均衡，而中低分段学生科目间差异较大`
        ],
        recommendations: [
          `针对${Math.random() > 0.5 ? '数学计算' : '英语阅读'}薄弱环节，设计专项练习提高基础能力`,
          `建议对${Math.random() > 0.5 ? '中等分数段' : '较低分数段'}学生进行小组辅导，提高学习效率`,
          `调整${Math.random() > 0.5 ? '作业布置' : '课堂教学'}策略，增加${Math.random() > 0.5 ? '实践应用' : '基础巩固'}内容`,
          `组织${Math.random() > 0.5 ? '同伴互助学习小组' : '多层次分组教学'}，促进学生互相学习`,
          `定期进行${Math.random() > 0.5 ? '知识点诊断测试' : '学习方法指导'}，及时调整教学重点`
        ]
      };
      
      setAnalysis(mockAnalysis);
      setIsLoading(false);
      toast.success("AI分析完成", {
        description: "已生成深度分析报告"
      });
    }, 2000);
  };

  const handleRetryAnalysis = () => {
    generateAnalysis();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          智能教学分析
        </CardTitle>
        <CardDescription>
          AI分析学生成绩数据，提供教学洞察和建议
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!analysis.overview ? (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">
              AI可以分析学生成绩特点、发现学习规律，并提供针对性的教学建议
            </p>
            <Button 
              onClick={generateAnalysis}
              className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
              disabled={isLoading || !aiConfigured || gradeData.length === 0}
            >
              <Lightbulb className="mr-2 h-4 w-4" />
              {isLoading ? "正在分析..." : !aiConfigured ? "请先配置AI服务" : gradeData.length === 0 ? "请先导入数据" : "开始AI分析"}
            </Button>
            {!aiConfigured && (
              <p className="text-sm text-gray-500">
                您需要先在AI设置页面配置大模型API才能使用AI分析功能
              </p>
            )}
            {gradeData.length === 0 && (
              <p className="text-sm text-gray-500">
                请先导入成绩数据才能开始分析
              </p>
            )}
          </div>
        ) : (
          <AIAnalysisTabs 
            analysis={analysis} 
            dataCount={gradeData.length}
            onRetry={handleRetryAnalysis}
            isRetrying={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default AIAnalysis;
