
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface BubbleData {
  name: string;
  xValue: number;
  yValue: number;
  zValue: number;
  subject: string;
}

interface CorrelationBubbleProps {
  data: BubbleData[];
  xName: string;
  yName: string;
  zName: string;
  title?: string;
  description?: string;
  className?: string;
}

const CorrelationBubble: React.FC<CorrelationBubbleProps> = ({
  data,
  xName,
  yName,
  zName,
  title = "学科关联性分析",
  description = "学科之间的相关性和影响因素",
  className
}) => {
  // 分组数据按学科
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.subject]) {
      acc[item.subject] = [];
    }
    acc[item.subject].push(item);
    return acc;
  }, {} as Record<string, BubbleData[]>);

  // 不同学科的颜色
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe", "#00c49f"];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ChartContainer config={{
          scatter: { color: "#8884d8" }
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="xValue"
                name={xName}
                label={{ value: xName, position: "bottom", offset: 15 }}
              />
              <YAxis
                type="number"
                dataKey="yValue"
                name={yName}
                label={{ value: yName, angle: -90, position: "left" }}
              />
              <ZAxis
                type="number"
                dataKey="zValue"
                range={[50, 400]}
                name={zName}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as BubbleData;
                    return (
                      <div className="rounded-md border bg-background p-2 shadow-md">
                        <p className="font-bold">{data.name}</p>
                        <p>{xName}: {data.xValue}</p>
                        <p>{yName}: {data.yValue}</p>
                        <p>{zName}: {data.zValue}</p>
                        <p>学科: {data.subject}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              {Object.entries(groupedData).map(([subject, items], index) => (
                <Scatter
                  key={subject}
                  name={subject}
                  data={items}
                  fill={colors[index % colors.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default CorrelationBubble;
