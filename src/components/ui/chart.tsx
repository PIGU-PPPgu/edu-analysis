
import React from 'react';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProps, Bar, BarChart, Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

interface ChartConfig {
  [key: string]: {
    color: string;
  };
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config?: ChartConfig;
  children: React.ReactNode;
}

export const ChartContainer = React.memo(({
  children,
  config,
  className,
  ...props
}: ChartContainerProps) => {
  return (
    <div
      className={cn(
        "relative w-full rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md animate-fade-in",
        className
      )}
      {...props}
    >
      <div className="h-full w-full">
        {children}
      </div>
    </div>
  );
});

ChartContainer.displayName = "ChartContainer";

export const ChartTooltip = (props: Partial<TooltipProps<ValueType, NameType>>) => {
  return (
    <Tooltip
      contentStyle={{
        backgroundColor: "hsl(var(--background))",
        borderColor: "hsl(var(--border))",
        borderRadius: "var(--radius)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        padding: "8px 12px",
      }}
      labelStyle={{
        color: "hsl(var(--foreground))",
        fontWeight: "500",
        marginBottom: "4px"
      }}
      itemStyle={{
        color: "hsl(var(--foreground))",
        padding: "2px 0"
      }}
      wrapperStyle={{
        outline: "none"
      }}
      {...props}
    />
  );
};

// 通用图表生成函数
interface AutoChartProps {
  data: any[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  chartType?: 'bar' | 'line' | 'area';
  stacked?: boolean;
  height?: number | string;
  showGrid?: boolean;
  showTooltip?: boolean;
  showAxis?: boolean;
  showLegend?: boolean;
  className?: string;
}

// 默认颜色方案
const DEFAULT_COLORS = [
  "#B9FF66", "#4CAF50", "#2196F3", "#9C27B0", "#FF9800", 
  "#795548", "#607D8B", "#E91E63", "#673AB7", "#FFEB3B"
];

export const AutoChart: React.FC<AutoChartProps> = ({
  data,
  xKey,
  yKeys,
  colors = DEFAULT_COLORS,
  chartType = 'bar',
  stacked = false,
  height = 300,
  showGrid = true,
  showTooltip = true,
  showAxis = true,
  showLegend = false,
  className
}) => {
  // 确保有足够的颜色
  const ensuredColors = yKeys.map((_, i) => colors[i % colors.length]);
  
  // 获取数据域范围
  const getDataDomain = () => {
    if (stacked) {
      // 对于堆叠图表，计算每个数据点所有yKeys的总和
      const maxValue = Math.max(
        ...data.map(item => 
          yKeys.reduce((sum, key) => sum + (Number(item[key]) || 0), 0)
        )
      );
      return [0, maxValue * 1.1]; // 增加10%的空间
    } else {
      // 对于非堆叠图表，找到所有yKeys中的最大值
      const allValues = data.flatMap(item => 
        yKeys.map(key => Number(item[key]) || 0)
      );
      const maxValue = Math.max(...allValues);
      return [0, maxValue * 1.1]; // 增加10%的空间
    }
  };

  // 渲染图表
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 5 },
    };

    switch(chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            {showAxis && <XAxis dataKey={xKey} />}
            {showAxis && <YAxis domain={getDataDomain()} />}
            {showTooltip && <ChartTooltip />}
            {yKeys.map((key, index) => (
              <Bar 
                key={key}
                dataKey={key} 
                fill={ensuredColors[index]}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        );
      
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            {showAxis && <XAxis dataKey={xKey} />}
            {showAxis && <YAxis domain={getDataDomain()} />}
            {showTooltip && <ChartTooltip />}
            {yKeys.map((key, index) => (
              <Line 
                key={key}
                type="monotone"
                dataKey={key} 
                stroke={ensuredColors[index]}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            {showAxis && <XAxis dataKey={xKey} />}
            {showAxis && <YAxis domain={getDataDomain()} />}
            {showTooltip && <ChartTooltip />}
            {yKeys.map((key, index) => (
              <Area 
                key={key}
                type="monotone"
                dataKey={key} 
                fill={ensuredColors[index]}
                stroke={ensuredColors[index]}
                fillOpacity={0.6}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </AreaChart>
        );
      
      default:
        return null;
    }
  };

  return (
    <ChartContainer className={className}>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </ChartContainer>
  );
};
