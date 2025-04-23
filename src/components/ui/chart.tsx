import React from 'react';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProps, Bar, BarChart, Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import ChartZoomControls from "./ChartZoomControls";
import ChartLegendToggle from "./ChartLegendToggle";
import ChartExportButton from "./ChartExportButton";

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
  showLegend = true,
  className
}) => {
  const ensuredColors = yKeys.map((_, i) => colors[i % colors.length]);
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [shownYKeys, setShownYKeys] = useState(yKeys);

  const [animated, setAnimated] = useState(true);

  const getDataDomain = () => {
    if (stacked) {
      const maxValue = Math.max(
        ...data.map(item => 
          shownYKeys.reduce((sum, key) => sum + (Number(item[key]) || 0), 0)
        )
      );
      return [0, maxValue * 1.1];
    } else {
      const allValues = data.flatMap(item => 
        shownYKeys.map(key => Number(item[key]) || 0)
      );
      const maxValue = Math.max(...allValues);
      return [0, maxValue * 1.1];
    }
  };

  const handleToggleYKey = (key: string) => {
    setShownYKeys(shownYKeys => 
      shownYKeys.includes(key)
        ? shownYKeys.length > 1
          ? shownYKeys.filter(k => k !== key)
          : shownYKeys
        : [...shownYKeys, key]
    );
  };

  const handleZoomIn = () => setZoomLevel(z => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoomLevel(z => Math.max(1, z - 0.25));
  const handleZoomReset = () => setZoomLevel(1);

  const yTitle = useMemo(() => (
    yKeys.length === 1 ? yKeys[0] : "数值"
  ), [yKeys]);

  const usedColors = shownYKeys.map(k => colors[yKeys.indexOf(k) % colors.length]);
  const usedLabels = shownYKeys.map((k, i) => k);

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 5 },
    };

    switch(chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps} barCategoryGap={zoomLevel * 20}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            {showAxis && <XAxis dataKey={xKey} />}
            {showAxis && <YAxis domain={getDataDomain()} />}
            {showTooltip && <ChartTooltip />}
            {shownYKeys.map((key, index) => (
              <Bar 
                key={key}
                dataKey={key} 
                fill={usedColors[index]}
                stackId={stacked ? 'stack' : undefined}
                isAnimationActive={animated}
                animationBegin={index * 100}
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
            {shownYKeys.map((key, index) => (
              <Line 
                key={key}
                type="monotone"
                dataKey={key} 
                stroke={usedColors[index]}
                activeDot={{ r: 7 }}
                strokeWidth={2}
                isAnimationActive={animated}
                animationBegin={index * 100}
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
            {shownYKeys.map((key, index) => (
              <Area 
                key={key}
                type="monotone"
                dataKey={key} 
                fill={usedColors[index]}
                stroke={usedColors[index]}
                fillOpacity={0.6}
                stackId={stacked ? 'stack' : undefined}
                isAnimationActive={animated}
                animationBegin={index * 100}
              />
            ))}
          </AreaChart>
        );
      default:
        return null;
    }
  };

  React.useEffect(() => {
    setAnimated(false);
    setTimeout(() => setAnimated(true), 20);
  }, [zoomLevel, shownYKeys.join()]);

  return (
    <div className={className + " relative group"}>
      <ChartExportButton
        svgContainerRef={svgWrapperRef}
        data={data}
        xKey={xKey}
        yKeys={shownYKeys}
      />
      <ChartZoomControls
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
      />
      {showLegend && yKeys.length > 1 && (
        <ChartLegendToggle
          yKeys={yKeys}
          colors={colors}
          shownKeys={shownYKeys}
          onToggle={handleToggleYKey}
        />
      )}
      <ChartContainer className="relative" config={undefined}>
        <div
          ref={svgWrapperRef}
          style={{
            width: "100%",
            height: height,
            transform: `scale(${zoomLevel})`,
            transition: "transform 0.3s cubic-bezier(.4,0,.2,1)"
          }}
        >
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </ChartContainer>
    </div>
  );
};
