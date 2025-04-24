import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  Award,
  AlertCircle,
  User,
  Check,
  XCircle,
  Send,
} from "lucide-react";

// 提交状态类型
export type SubmissionStatus = "submitted" | "graded" | "not_submitted" | "late" | "absent" | "pending";

// 状态配置
const statusConfig = {
  submitted: {
    label: "已提交",
    icon: <Send className="h-3 w-3" />,
    color: "bg-blue-100 text-blue-800",
  },
  graded: {
    label: "已批改",
    icon: <Check className="h-3 w-3" />,
    color: "bg-green-100 text-green-800",
  },
  late: {
    label: "逾期提交",
    icon: <Clock className="h-3 w-3" />,
    color: "bg-orange-100 text-orange-800",
  },
  not_submitted: {
    label: "未提交",
    icon: <XCircle className="h-3 w-3" />,
    color: "bg-yellow-100 text-yellow-800",
  },
  absent: {
    label: "缺勤",
    icon: <XCircle className="h-3 w-3" />,
    color: "bg-red-100 text-red-800",
  },
  pending: {
    label: "待完成",
    icon: <Clock className="h-3 w-3" />,
    color: "bg-yellow-100 text-yellow-800",
  },
};

// 学生卡片属性
export interface StudentCardProps {
  student: {
    id: string;
    name: string;
    avatar?: string;
    class?: string;
  };
  status: SubmissionStatus;
  score?: number;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

// 学生卡片组件
export function StudentCard({
  student,
  status,
  score,
  onClick,
  selected = false,
  className,
}: StudentCardProps) {
  const statusInfo = statusConfig[status];

  // 获取学生姓名的首字母作为头像备用显示
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // 根据得分获取颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 80) return "text-blue-500";
    if (score >= 70) return "text-orange-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  // 随机颜色类列表，用于头像背景
  const avatarColors = [
    "bg-red-500",
    "bg-blue-500", 
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-yellow-500",
    "bg-orange-500",
  ];
  
  // 基于学生ID生成一个稳定的随机颜色
  const getRandomColor = (id: string) => {
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return avatarColors[sum % avatarColors.length];
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="text-center mb-2">
          <h4 className="font-medium text-base">{student.name}</h4>
          {student.class && (
            <p className="text-xs text-muted-foreground">
              {student.class}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Badge variant="outline" className={cn("text-xs px-2", statusInfo.color)}>
            <span className="flex items-center gap-1">
              {statusInfo.icon}
              {status === "submitted" && "已提交"}
              {status === "graded" && "已评分"}
              {status === "late" && "迟交"}
              {status === "not_submitted" && "未提交"}
              {status === "absent" && "缺勤"}
              {status === "pending" && "待完成"}
            </span>
          </Badge>
          {status === "graded" && score !== undefined && (
            <Badge className={cn("text-xs px-2", getScoreColor(score))}>
              {score}分
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 学生卡片网格容器
export function StudentCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}

// 添加默认导出
export default StudentCard; 