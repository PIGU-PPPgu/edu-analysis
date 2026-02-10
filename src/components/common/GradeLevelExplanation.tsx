/**
 * 等级说明组件
 * 用于所有报告模块展示等级评价标准（A+/A/B+/B/C+/C）
 *
 * 参考：EnhancedClassValueAddedReport.tsx:503-545
 */

import React from "react";

interface GradeLevelExplanationProps {
  className?: string;
}

export const GradeLevelExplanation: React.FC<GradeLevelExplanationProps> = ({
  className = "",
}) => {
  return (
    <div className={`pt-2 border-t border-blue-200 ${className}`}>
      <h4 className="font-semibold text-sm mb-2">📈 等级说明（按排名分布）</h4>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-12 h-5 bg-gradient-to-r from-green-500 to-green-600 rounded flex items-center justify-center text-white font-bold">
            A+
          </span>
          <span className="text-muted-foreground">前5%（最优秀）</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 h-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center text-white font-bold">
            A
          </span>
          <span className="text-muted-foreground">5%-25%（优秀）</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 h-5 bg-gradient-to-r from-purple-500 to-purple-600 rounded flex items-center justify-center text-white font-bold">
            B+
          </span>
          <span className="text-muted-foreground">25%-50%（良好+）</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 h-5 bg-gradient-to-r from-orange-500 to-orange-600 rounded flex items-center justify-center text-white font-bold">
            B
          </span>
          <span className="text-muted-foreground">50%-75%（良好）</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded flex items-center justify-center text-white font-bold">
            C+
          </span>
          <span className="text-muted-foreground">75%-95%（合格+）</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 h-5 bg-gradient-to-r from-gray-500 to-gray-600 rounded flex items-center justify-center text-white font-bold">
            C
          </span>
          <span className="text-muted-foreground">95%-100%（合格）</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        💡 例如：A+ 表示该学生排名在全年级前5%，属于最优秀的学生群体
      </p>
    </div>
  );
};
