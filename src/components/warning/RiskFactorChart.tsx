import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LabelList } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Info, ArrowUpDown } from "lucide-react";

// 组件属性接口
interface RiskFactorChartProps {
  data?: Array<{ factor: string; count: number; percentage: number }>;
  className?: string;
}

// 默认模拟数据
const defaultRiskFactorData = [
  {
    factor: "期中考试成绩下降",
    count: 27,
    percentage: 35
  },
  {
    factor: "作业完成率低",
    count: 24,
    percentage: 31
  },
  {
    factor: "课堂参与度不足",
    count: 18,
    percentage: 23
  },
  {
    factor: "缺交作业次数增加",
    count: 12,
    percentage: 15
  },
  {
    factor: "考试科目成绩不均衡",
    count: 8,
    percentage: 10
  }
];

// 自定义工具提示组件
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
        <p className="font-medium text-gray-800 mb-1">{`${label}`}</p>
        <div className="flex items-center justify-between gap-4 text-gray-700">
          <span>发生次数:</span>
          <span className="font-medium">{payload[0].payload.count}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-gray-700">
          <span>影响占比:</span>
          <span className="font-medium">{payload[0].value}%</span>
        </div>
        <div className="mt-1 pt-1 border-t border-gray-200">
          <span className="text-xs text-gray-500 flex items-center">
            <Info className="h-3 w-3 mr-1" />
            {getRiskLevelText(payload[0].value)}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

// 获取风险级别文本
const getRiskLevelText = (value: number) => {
  if (value >= 30) return "高影响因素，需优先干预";
  if (value >= 20) return "中等影响因素，需关注";
  return "低影响因素，建议监控";
};

// 获取风险级别颜色
const getRiskLevelColor = (value: number) => {
  if (value >= 30) return "#ef4444";
  if (value >= 20) return "#f59e0b";
  if (value >= 10) return "#3b82f6";
  return "#a3a3a3";
};

// 风险级别图例组件
const RiskLevelLegend = () => (
  <div className="flex flex-wrap justify-center gap-3 mt-4">
    <Badge className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
      <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
      高影响因素
    </Badge>
    <Badge className="bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100">
      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
      中影响因素
    </Badge>
    <Badge className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100">
      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
      低影响因素
    </Badge>
  </div>
);

const RiskFactorChart: React.FC<RiskFactorChartProps> = ({ data, className }) => {
  // 使用传入的数据或默认数据
  const chartData = data || defaultRiskFactorData;
  
  // 状态管理
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // 按百分比排序
  const sortedData = [...chartData].sort((a, b) => 
    sortOrder === "desc" 
      ? b.percentage - a.percentage 
      : a.percentage - b.percentage
  );
  
  // 切换排序顺序
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };
  
  // 映射数据以符合图表要求
  const formattedData = sortedData.map(item => ({
    name: item.factor,
    value: item.percentage,
    count: item.count,
    color: getRiskLevelColor(item.percentage)
  }));

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">影响因素分布</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-xs"
          onClick={toggleSortOrder}
        >
          <ArrowUpDown className="h-3 w-3 mr-1" />
          {sortOrder === "desc" ? "按影响降序" : "按影响升序"}
        </Button>
      </div>
      
      <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={formattedData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
            barSize={24}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis 
              type="number" 
              domain={[0, Math.max(100, Math.ceil(formattedData[0]?.value || 0) + 10)]} 
              tickFormatter={(value) => `${value}%`}
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={180}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#4b5563" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
                dataKey="value"
              name="影响占比"
              radius={[0, 4, 4, 0]}
              background={{ fill: "#f3f4f6" }}
              animationDuration={750}
              label={{ 
                position: 'right', 
                formatter: (value: number) => `${value}%`,
                fill: '#6b7280',
                fontSize: 12
              }}
            >
              {formattedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="hover:opacity-80 transition-opacity duration-200"
                />
              ))}
            </Bar>
          </BarChart>
          </ResponsiveContainer>
      </div>
      
      <RiskLevelLegend />
      
      <div className="mt-3 pt-3 border-t text-xs text-gray-500 flex justify-between items-center">
        <span className="flex items-center">
          <Info className="h-3.5 w-3.5 mr-1" />
          {formattedData.length}个主要风险因素
        </span>
        <span className="flex items-center">
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
          基于{formattedData.reduce((sum, item) => sum + item.count, 0)}个预警事件
        </span>
      </div>
    </div>
  );
};

export default RiskFactorChart;

