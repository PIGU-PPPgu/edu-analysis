
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer } from "@/components/ui/chart";
import { toast } from "sonner";
import { ZapIcon, FileTextIcon } from "lucide-react";

interface AIDataAnalysisProps {
  data: any[];
  charts: React.ReactNode[];
}

const AIDataAnalysis: React.FC<AIDataAnalysisProps> = ({ data, charts }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    overview: string;
    insights: string[];
    recommendations: string[];
  } | null>(null);

  const generateAnalysis = () => {
    setIsAnalyzing(true);
    
    // 模拟AI分析过程
    setTimeout(() => {
      // 这里将来会连接到实际的AI服务
      const mockAnalysis = {
        overview: "整体数据显示学生成绩分布较为均衡，大部分学生成绩在良好范围内，但存在一定的差异化。",
        insights: [
          "数学科目成绩分布较为分散，存在两级分化现象",
          "语文科目整体表现较好，大部分学生达到良好水平",
          "英语科目成绩呈现正态分布，中等成绩学生较多",
          "科学科目相比其他学科，学生掌握程度差异较大"
        ],
        recommendations: [
          "针对数学学科两极分化现象，建议增加分层教学，关注基础较弱的学生",
          "在英语教学中可增加听说练习，提高学生的语言应用能力",
          "科学学科可考虑增加实验教学，加深学生对知识的理解",
          "整体教学中应注重个性化辅导，关注学生的个体差异"
        ]
      };
      
      setAnalysis(mockAnalysis);
      setIsAnalyzing(false);
      toast.success("AI分析完成", {
        description: "已生成数据分析报告和建议"
      });
    }, 2000);
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZapIcon className="h-5 w-5" />
          AI智能分析
        </CardTitle>
        <CardDescription>
          基于导入的数据和生成的图表，提供智能分析和教学建议
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <ZapIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">启动AI智能分析</p>
              <p className="text-sm text-gray-500 mb-6">
                AI将分析您导入的数据和生成的图表，提供教学见解和改进建议
              </p>
            </div>
            <Button 
              onClick={generateAnalysis} 
              className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-pulse mr-2">●</span>
                  正在分析中...
                </>
              ) : (
                "开始分析"
              )}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="overview">总体分析</TabsTrigger>
              <TabsTrigger value="insights">关键发现</TabsTrigger>
              <TabsTrigger value="recommendations">教学建议</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-base">{analysis.overview}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-medium mb-2">数据特点</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• 样本数量: {data.length} 条记录</li>
                    <li>• 数据完整度: 98%</li>
                    <li>• 数据质量: 良好</li>
                  </ul>
                </Card>
                <Card className="p-4">
                  <h3 className="font-medium mb-2">主要结论</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• 整体成绩良好</li>
                    <li>• 存在学科差异</li>
                    <li>• 发现学习规律</li>
                  </ul>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4">
              <ul className="space-y-3">
                {analysis.insights.map((insight, index) => (
                  <li key={index} className="p-3 border rounded-lg flex items-start">
                    <span className="bg-[#B9FF66] text-black w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
                      {index + 1}
                    </span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-4">
              <ul className="space-y-3">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="p-3 border rounded-lg bg-gray-50 flex items-start">
                    <span className="bg-[#B9FF66] text-black w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
                      {index + 1}
                    </span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                onClick={() => {
                  toast.success("报告已导出", {
                    description: "AI分析报告已成功导出为PDF文件"
                  });
                }} 
                variant="outline" 
                className="w-full mt-4"
              >
                <FileTextIcon className="mr-2 h-4 w-4" />
                导出分析报告
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default AIDataAnalysis;
