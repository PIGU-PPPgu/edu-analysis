
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Signal, SignalHigh, SignalMedium, SignalLow } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WarningStudent {
  id: string;
  name: string;
  riskLevel: "high" | "medium" | "low";
  subjects: string[];
  trend: "up" | "down" | "stable";
  lastUpdate: string;
}

const mockWarningData: WarningStudent[] = [
  {
    id: "20230001",
    name: "张三",
    riskLevel: "high",
    subjects: ["数学", "物理"],
    trend: "down",
    lastUpdate: "2024-04-22"
  },
  {
    id: "20230015",
    name: "李四",
    riskLevel: "medium",
    subjects: ["英语"],
    trend: "stable",
    lastUpdate: "2024-04-22"
  },
  {
    id: "20230023",
    name: "王五",
    riskLevel: "low",
    subjects: ["化学"],
    trend: "up",
    lastUpdate: "2024-04-22"
  }
];

const getRiskIcon = (level: string) => {
  switch (level) {
    case "high":
      return <SignalHigh className="h-4 w-4 text-red-500" />;
    case "medium":
      return <SignalMedium className="h-4 w-4 text-yellow-500" />;
    case "low":
      return <SignalLow className="h-4 w-4 text-blue-500" />;
    default:
      return <Signal className="h-4 w-4" />;
  }
};

const getRiskClass = (level: string) => {
  switch (level) {
    case "high":
      return "text-red-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-blue-500";
    default:
      return "";
  }
};

const WarningList = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          预警学生列表
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>风险等级</TableHead>
              <TableHead>学号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>预警科目</TableHead>
              <TableHead>趋势</TableHead>
              <TableHead>最后更新</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockWarningData.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {getRiskIcon(student.riskLevel)}
                    <span className={getRiskClass(student.riskLevel)}>
                      {student.riskLevel === "high" ? "高风险" : 
                       student.riskLevel === "medium" ? "中风险" : "低风险"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{student.id}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.subjects.join(", ")}</TableCell>
                <TableCell>
                  {student.trend === "up" ? "↗️" : 
                   student.trend === "down" ? "↘️" : "→"}
                </TableCell>
                <TableCell>{student.lastUpdate}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/student-profile/${student.id}`)}
                  >
                    查看详情
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default WarningList;
