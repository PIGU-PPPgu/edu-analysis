
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface CompetencyData {
  name: string;
  current: number;
  average: number;
  fullScore: number;
}

interface CompetencyRadarProps {
  data: CompetencyData[];
  title?: string;
  description?: string;
  className?: string;
}

const CompetencyRadar: React.FC<CompetencyRadarProps> = ({
  data,
  title = "能力维度分析",
  description = "学生多维度能力评估",
  className
}) => {
  return (
    <Card className={cn("transition-all hover:shadow-md", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[320px] pt-4">
        <ChartContainer>
          <ResponsiveContainer width="100%" height={320} minWidth={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke="hsl(var(--muted-foreground))" opacity={0.3} />
              <PolarAngleAxis 
                dataKey="name" 
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]}
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              />
              <Radar
                name="当前成绩"
                dataKey="current"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
              <Radar
                name="班级平均"
                dataKey="average"
                stroke="hsl(var(--muted))"
                fill="hsl(var(--muted))"
                fillOpacity={0.3}
              />
              <Tooltip
                formatter={(value) => [`${value}分`, ""]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend 
                wrapperStyle={{
                  fontSize: "12px",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default CompetencyRadar;
