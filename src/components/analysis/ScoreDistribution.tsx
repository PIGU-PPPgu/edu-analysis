
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DistributionData {
  range: string;
  count: number;
  color: string;
}

interface Props {
  data: DistributionData[];
}

const ScoreDistribution: React.FC<Props> = ({ data }) => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>分数段分布</CardTitle>
        <CardDescription>各分数段学生人数</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="count"
              nameKey="range"
              label={({ range, count }) => `${range}: ${count}人`}
              labelLine={{ stroke: "#D1D5DB", strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value}人`, name]} />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 20 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ScoreDistribution;
