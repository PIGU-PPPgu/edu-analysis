import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";

interface StudentData {
  id: string;
  name: string;
  class_name?: string;
  averageScore?: number;
  recentScores?: number[];
  trend?: "up" | "down" | "stable";
}

interface StudentQuickViewProps {
  students: StudentData[];
  onViewStudent: (studentId: string) => void;
}

const StudentQuickView: React.FC<StudentQuickViewProps> = ({
  students,
  onViewStudent,
}) => {
  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case "up":
        return "text-green-600 bg-green-50";
      case "down":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (!students.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>暂无学生数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.slice(0, 6).map((student) => (
        <Card key={student.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-medium">
                  {student.name}
                </CardTitle>
                <Badge variant="secondary" className="mt-1">
                  {student.class_name || "未分班"}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(student.trend)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">平均成绩</span>
                <span className="font-semibold">
                  {student.averageScore?.toFixed(1) || "0.0"}
                </span>
              </div>

              {student.recentScores && student.recentScores.length > 0 && (
                <div>
                  <span className="text-sm text-gray-600 block mb-1">
                    最近成绩
                  </span>
                  <div className="flex gap-1">
                    {student.recentScores.slice(-3).map((score, index) => (
                      <div
                        key={index}
                        className="text-xs px-2 py-1 bg-gray-100 rounded"
                      >
                        {score}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onViewStudent(student.id)}
              >
                <Eye className="h-3 w-3 mr-1" />
                查看详情
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StudentQuickView;
