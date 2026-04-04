import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { SubjectAnomalyStats } from "../types/anomaly";

interface AnomalyChartProps {
  subjectAnomalies: SubjectAnomalyStats[];
}

const AnomalyChart: React.FC<AnomalyChartProps> = ({ subjectAnomalies }) => {
  return (
    <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
          <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          各科目异常统计
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-48 sm:h-64 lg:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectAnomalies}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#191A23"
                strokeOpacity={0.3}
              />
              <XAxis
                dataKey="subject"
                stroke="#191A23"
                fontSize={12}
                fontWeight="bold"
              />
              <YAxis stroke="#191A23" fontSize={12} fontWeight="bold" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #191A23",
                  borderRadius: "8px",
                  boxShadow: "4px 4px 0px 0px #191A23",
                  fontWeight: "bold",
                }}
                formatter={(value: any, name: string) => [
                  name === "anomalies" ? `${value} 个异常` : `${value} 名学生`,
                  name === "anomalies" ? "异常数量" : "学生总数",
                ]}
              />
              <Legend wrapperStyle={{ fontWeight: "bold", color: "#191A23" }} />
              <Bar
                dataKey="anomalies"
                fill="#B9FF66"
                name="异常数量"
                stroke="#191A23"
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="students"
                fill="#9C88FF"
                name="学生总数"
                stroke="#191A23"
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(AnomalyChart);
