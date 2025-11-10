import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  Eye,
  AlertCircle,
} from "lucide-react";
import { WarningStudentData } from "@/services/warningStudentService";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface WarningStudentViewProps {
  students: WarningStudentData[];
  onViewStudent: (studentId: string) => void;
  onViewWarningDetails?: (studentId: string) => void;
}

const WarningStudentView: React.FC<WarningStudentViewProps> = ({
  students,
  onViewStudent,
  onViewWarningDetails,
}) => {
  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getSeverityIcon = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "medium":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityText = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return "高风险";
      case "medium":
        return "中风险";
      default:
        return "低风险";
    }
  };

  if (!students.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
        <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
          <AlertTriangle className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-gray-800">暂无预警学生</h3>
        <p className="text-gray-600 text-center max-w-md">
          系统未检测到需要关注的学生，所有学生状态良好
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((student) => (
        <Card
          key={student.id}
          className="hover:shadow-md transition-shadow border-l-4 border-l-red-400"
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  {getSeverityIcon(student.highestSeverity)}
                  {student.name}
                </CardTitle>
                <Badge variant="secondary" className="mt-1">
                  {student.class_name || "未分班"}
                </Badge>
              </div>
              <Badge
                className={`${getSeverityColor(student.highestSeverity)} font-medium`}
                variant="outline"
              >
                {getSeverityText(student.highestSeverity)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* 预警统计 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">预警数量</span>
                <span className="font-semibold text-red-600">
                  {student.warningCount} 项
                </span>
              </div>

              {/* 平均成绩 */}
              {student.averageScore && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">平均成绩</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">
                      {student.averageScore.toFixed(1)}
                    </span>
                    {student.averageScore < 60 && (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
              )}

              {/* 最新预警 */}
              {student.latestWarning && (
                <div>
                  <span className="text-sm text-gray-600 block mb-1">
                    最新预警
                  </span>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-sm font-medium text-gray-800">
                      {student.latestWarning.rule_name}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(
                          new Date(student.latestWarning.created_at),
                          {
                            addSuffix: true,
                            locale: zhCN,
                          }
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onViewStudent(student.id)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  查看详情
                </Button>
                {onViewWarningDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:bg-red-50"
                    onClick={() => onViewWarningDetails(student.id)}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    预警详情
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WarningStudentView;
