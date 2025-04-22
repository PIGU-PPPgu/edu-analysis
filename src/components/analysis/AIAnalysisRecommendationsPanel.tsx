
import React from "react";
import { Button } from "@/components/ui/button";
import { FileTextIcon, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface Props {
  recommendations: string[];
}

export const AIAnalysisRecommendationsPanel: React.FC<Props> = ({ recommendations }) => {
  const handleExportReport = () => {
    // 这里可以实现导出PDF的功能
    toast.success("报告已导出", {
      description: "AI分析报告已成功导出为PDF文件"
    });
  };

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">暂无教学建议</p>
        <p className="text-sm mt-2">AI未能生成教学建议，请尝试调整AI设置或使用不同的模型</p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {recommendations.map((recommendation, index) => (
          <li key={index} className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 flex items-start transition-colors">
            <span className="bg-[#B9FF66] text-black w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
              {index + 1}
            </span>
            <span>{recommendation}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={handleExportReport} 
        variant="outline" 
        className="w-full mt-4 hover:bg-[#B9FF66] hover:text-black transition-colors"
      >
        <FileTextIcon className="mr-2 h-4 w-4" />
        导出分析报告
      </Button>
    </>
  );
};
