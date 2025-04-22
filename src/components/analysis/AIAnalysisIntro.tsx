
import React from "react";
import { ZapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isAnalyzing: boolean;
  aiConfigured: boolean;
  onStart: () => void;
}

export const AIAnalysisIntro: React.FC<Props> = ({ isAnalyzing, aiConfigured, onStart }) => (
  <div className="text-center py-8">
    <div className="mb-4">
      <ZapIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <p className="text-lg font-medium mb-2">启动AI智能分析</p>
      <p className="text-sm text-gray-500 mb-6">
        AI将分析您导入的数据和生成的图表，提供教学见解和改进建议
      </p>
    </div>
    <Button 
      onClick={onStart} 
      className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
      disabled={isAnalyzing || !aiConfigured}
    >
      {isAnalyzing ? (
        <>
          <span className="animate-pulse mr-2">●</span>
          正在分析中...
        </>
      ) : !aiConfigured ? (
        "请先配置AI服务"
      ) : (
        "开始分析"
      )}
    </Button>
    {!aiConfigured && (
      <p className="text-sm text-gray-500 mt-2">
        您需要先在AI设置页面配置大模型API才能使用AI分析功能
      </p>
    )}
  </div>
);
