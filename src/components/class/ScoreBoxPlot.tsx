import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp } from "lucide-react";

interface BoxPlotData {
  subject: string;
  q1: number;
  q2: number;
  q3: number;
  min: number;
  max: number;
  outliers?: number[];
  count?: number;
  mean?: number;
}

interface ScoreBoxPlotProps {
  data: BoxPlotData[];
  height?: number;
}

const ScoreBoxPlot: React.FC<ScoreBoxPlotProps> = ({ data, height = 300 }) => {
  // 如果没有数据，显示占位符
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-lg font-medium">暂无箱线图数据</p>
        <p className="text-sm text-gray-400 mt-1">请先导入成绩数据</p>
      </div>
    );
  }

  // 转换数据为简化的柱状图展示五数概括
  const chartData = data.map((item) => ({
    subject: item.subject,
    最低分: item.min,
    Q1: item.q1,
    中位数: item.q2,
    Q3: item.q3,
    最高分: item.max,
    四分位距: item.q3 - item.q1,
  }));

  // 自定义工具提示
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <div className="font-medium text-gray-900 mb-2">{label}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">最高分:</span>
              <span className="font-medium">
                {data.最高分?.toFixed(1) || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Q3 (75%):</span>
              <span className="font-medium">
                {data.Q3?.toFixed(1) || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">中位数 (50%):</span>
              <span className="font-medium text-blue-600">
                {data.中位数?.toFixed(1) || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Q1 (25%):</span>
              <span className="font-medium">
                {data.Q1?.toFixed(1) || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">最低分:</span>
              <span className="font-medium">
                {data.最低分?.toFixed(1) || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">四分位距:</span>
              <span className="font-medium text-purple-600">
                {data.四分位距?.toFixed(1) || "N/A"}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* 数据概览 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {data.map((item, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            {item.subject}: {item.q2?.toFixed(1) || "N/A"}
          </Badge>
        ))}
      </div>

      {/* 简化的箱线图（使用柱状图展示五数概括） */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              成绩分布统计 (五数概括)
            </h4>
            <p className="text-xs text-gray-500">
              显示最低分、Q1、中位数、Q3、最高分
            </p>
          </div>

          <div style={{ height: `${height}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="subject"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="最低分" stackId="stack" fill="#FEE2E2" />
                <Bar dataKey="Q1" stackId="stack" fill="#DBEAFE" />
                <Bar dataKey="中位数" stackId="stack" fill="#3B82F6" />
                <Bar dataKey="Q3" stackId="stack" fill="#DBEAFE" />
                <Bar dataKey="最高分" stackId="stack" fill="#FEE2E2" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 图例说明 */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 rounded"></div>
              <span>最值范围</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-100 rounded"></div>
              <span>四分位区间</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>中位数</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((item, index) => (
          <Card key={index} className="border-gray-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600 mb-2">
                  {item.subject}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>中位数:</span>
                    <span className="font-medium">
                      {item.q2?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>四分位距:</span>
                    <span className="font-medium">
                      {(item.q3 - item.q1)?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>范围:</span>
                    <span className="font-medium">
                      {item.min?.toFixed(1) || "N/A"} -{" "}
                      {item.max?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>平均分:</span>
                    <span className="font-medium text-blue-600">
                      {item.mean?.toFixed(1) ||
                        ((item.q1 + item.q2 + item.q3) / 3)?.toFixed(1) ||
                        "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ScoreBoxPlot;
