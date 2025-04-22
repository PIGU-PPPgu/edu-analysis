
import React from "react";
import { LightbulbIcon } from "lucide-react";

interface Props {
  insights: string[];
}

export const AIAnalysisInsightsPanel: React.FC<Props> = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <LightbulbIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">暂无分析见解</p>
        <p className="text-sm mt-2">AI未能从当前数据中提取关键见解，可能需要更多样本数据</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {insights.map((insight, index) => (
        <li key={index} className="p-3 border rounded-lg flex items-start bg-white hover:bg-gray-50 transition-colors">
          <span className="bg-[#B9FF66] text-black w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
            {index + 1}
          </span>
          <span>{insight}</span>
        </li>
      ))}
    </ul>
  );
};
