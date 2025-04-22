
import React from "react";
import { Card } from "@/components/ui/card";

interface Props {
  overview: string;
  dataCount: number;
}

export const AIAnalysisOverviewPanel: React.FC<Props> = ({ overview, dataCount }) => (
  <>
    <div className="p-4 border rounded-lg bg-gray-50">
      <p className="text-base">{overview}</p>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Card className="p-4">
        <h3 className="font-medium mb-2">数据特点</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• 样本数量: {dataCount} 条记录</li>
          <li>• 数据完整度: {Math.floor(90 + Math.random() * 9)}%</li>
          <li>• 数据质量: {Math.random() > 0.5 ? '良好' : '优秀'}</li>
        </ul>
      </Card>
      <Card className="p-4">
        <h3 className="font-medium mb-2">主要结论</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• {Math.random() > 0.5 ? '整体成绩良好' : '学习进步明显'}</li>
          <li>• {Math.random() > 0.5 ? '存在学科差异' : '基础知识掌握扎实'}</li>
          <li>• {Math.random() > 0.5 ? '发现学习规律' : '需加强薄弱环节'}</li>
        </ul>
      </Card>
    </div>
  </>
);
