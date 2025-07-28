import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";

const abilityRadarData = [
  { ability: "阅读理解", value: 85 },
  { ability: "数学运算", value: 90 },
  { ability: "逻辑思维", value: 75 },
  { ability: "记忆能力", value: 95 },
  { ability: "创新思维", value: 65 },
  { ability: "沟通表达", value: 80 },
];

const AbilityRadar: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">学习能力雷达图</CardTitle>
        <CardDescription>多维度评估学生各方面能力</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ChartContainer
          config={{
            score: { color: "#8884d8" },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="80%"
              data={abilityRadarData}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="ability" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="能力值"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default AbilityRadar;
