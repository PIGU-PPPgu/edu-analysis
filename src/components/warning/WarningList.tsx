
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Signal, SignalHigh, SignalMedium, SignalLow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { db } from "@/utils/dbUtils";

type WarningStudent = {
  student_id: string;
  name: string;
  risk_level: string;
  warning_subjects: string[];
  trend: string;
  last_update: string;
};

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

  const { data: warningData, isLoading, error } = useQuery({
    queryKey: ['warningStudents'],
    queryFn: async () => {
      const result = await db.getStudentWarnings();
      return result;
    },
  });

  if (error) {
    toast.error("获取预警数据失败");
    return null;
  }

  if (isLoading) {
    return <div>加载中...</div>;
  }

  const warningStudents: WarningStudent[] = warningData || [];

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
            {warningStudents.map((student) => (
              <TableRow key={student.student_id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {getRiskIcon(student.risk_level)}
                    <span className={getRiskClass(student.risk_level)}>
                      {student.risk_level === "high" ? "高风险" : 
                       student.risk_level === "medium" ? "中风险" : "低风险"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{student.student_id}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.warning_subjects.join(", ")}</TableCell>
                <TableCell>
                  {student.trend === "up" ? "↗️" : 
                   student.trend === "down" ? "↘️" : "→"}
                </TableCell>
                <TableCell>{new Date(student.last_update).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/student-profile/${student.student_id}`)}
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

