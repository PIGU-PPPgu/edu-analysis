
import React from "react";

interface Props {
  insights: string[];
}

export const AIAnalysisInsightsPanel: React.FC<Props> = ({ insights }) => (
  <ul className="space-y-3">
    {insights.map((insight, index) => (
      <li key={index} className="p-3 border rounded-lg flex items-start">
        <span className="bg-[#B9FF66] text-black w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
          {index + 1}
        </span>
        <span>{insight}</span>
      </li>
    ))}
  </ul>
);
