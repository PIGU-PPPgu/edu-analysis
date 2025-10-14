import React, { memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CircleUser,
  UserCircle,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  Target,
  BookOpen,
} from "lucide-react";
import { StudentPortraitData } from "@/lib/api/portrait";

interface StudentCardProps {
  student: StudentPortraitData;
  onView: (studentId: string) => void;
  onSmartAnalysis?: (studentId: string) => void;
}

/**
 * 学生卡片组件
 * 使用memo优化渲染性能，避免不必要的重渲染
 */
const StudentCard: React.FC<StudentCardProps> = memo(
  ({ student, onView, onSmartAnalysis }) => {
    // 计算平均成绩和趋势
    const averageScore = student.recent_scores?.length
      ? student.recent_scores.reduce((sum, score) => sum + score, 0) /
        student.recent_scores.length
      : student.average_score || 0;

    // 判断学习趋势
    const getTrend = () => {
      if (!student.recent_scores || student.recent_scores.length < 2)
        return null;
      const recent = student.recent_scores.slice(-3);
      const earlier = student.recent_scores.slice(-6, -3);
      if (recent.length === 0 || earlier.length === 0) return null;

      const recentAvg =
        recent.reduce((sum, score) => sum + score, 0) / recent.length;
      const earlierAvg =
        earlier.reduce((sum, score) => sum + score, 0) / earlier.length;

      if (recentAvg > earlierAvg + 3) return "up";
      if (recentAvg < earlierAvg - 3) return "down";
      return "stable";
    };

    // 获取风险等级
    const getRiskLevel = () => {
      if (averageScore >= 85)
        return {
          level: "low",
          text: "优秀",
          color: "bg-green-100 text-green-800",
        };
      if (averageScore >= 70)
        return {
          level: "medium",
          text: "良好",
          color: "bg-blue-100 text-blue-800",
        };
      if (averageScore >= 60)
        return {
          level: "medium",
          text: "及格",
          color: "bg-yellow-100 text-yellow-800",
        };
      return {
        level: "high",
        text: "待提升",
        color: "bg-red-100 text-red-800",
      };
    };

    // 获取特长标签
    const getStrengthTags = () => {
      const tags = [];
      if (student.ai_tags?.strengths) {
        tags.push(...student.ai_tags.strengths.slice(0, 2));
      }
      if (student.custom_tags && student.custom_tags.length > 0) {
        tags.push(...student.custom_tags.slice(0, 2));
      }
      return tags.slice(0, 3);
    };

    const trend = getTrend();
    const riskLevel = getRiskLevel();
    const strengthTags = getStrengthTags();

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                <CircleUser className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {student.name}
                  {trend === "up" && (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                  {trend === "down" && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  {averageScore >= 95 && (
                    <Trophy className="h-4 w-4 text-yellow-500" />
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span>学号: {student.student_id}</span>
                  <Badge variant="outline" className="text-xs">
                    {student.gender || "未知"}
                  </Badge>
                </CardDescription>
              </div>
            </div>
            <Badge className={riskLevel.color}>{riskLevel.text}</Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-4 space-y-3">
          {/* 成绩信息 */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">平均分</span>
            </div>
            <span className="font-semibold text-lg">
              {averageScore.toFixed(1)}
            </span>
          </div>

          {/* 学习特长标签 */}
          {strengthTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {strengthTags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs px-2 py-1"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* 最近表现 */}
          {student.recent_scores && student.recent_scores.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <BookOpen className="h-3 w-3" />
                <span>最近表现</span>
              </div>
              <div className="flex gap-1">
                {student.recent_scores.slice(-5).map((score, index) => (
                  <div
                    key={index}
                    className={`h-2 w-3 rounded-sm ${
                      score >= 90
                        ? "bg-green-400"
                        : score >= 80
                          ? "bg-blue-400"
                          : score >= 70
                            ? "bg-yellow-400"
                            : "bg-red-400"
                    }`}
                    title={`第${index + 1}次考试: ${score}分`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 预警提示 */}
          {(student as any).warningCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              <AlertTriangle className="h-3 w-3" />
              <span>有{(student as any).warningCount}个预警</span>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(student.id)}
              className="flex-1"
            >
              <UserCircle className="h-4 w-4 mr-1" />
              详情
            </Button>
            {onSmartAnalysis && (
              <Button
                size="sm"
                onClick={() => onSmartAnalysis(student.id)}
                className="flex-1"
              >
                <Brain className="h-4 w-4 mr-1" />
                画像
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

StudentCard.displayName = "StudentCard";

export default StudentCard;
