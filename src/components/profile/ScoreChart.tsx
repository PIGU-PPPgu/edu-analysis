
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ScoreSummaryProps } from "./types";

const ScoreChart: React.FC<ScoreSummaryProps> = ({ student }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">各科目成绩</CardTitle>
        <CardDescription>该学生在各学科的得分情况</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ChartContainer config={{
          score: { color: "#B9FF66" }
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={student.scores}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, 100]} />
              <ChartTooltip />
              <Legend />
              <Bar dataKey="score" name="分数" fill="#B9FF66" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ScoreChart;
