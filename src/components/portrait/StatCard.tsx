import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatCardProps {
  title: string;
  value: number | string;
  badgeText?: string;
  badgeColor?: "blue" | "green" | "amber" | "red" | "purple";
  icon?: React.ReactNode;
  className?: string;
}

/**
 * 统计数据卡片组件
 * 用于展示各类统计指标，支持图标和状态徽章
 */
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  badgeText,
  badgeColor = "blue",
  icon,
  className = "",
}) => {
  // 根据颜色生成适当的类名
  const getBgClass = () => {
    switch (badgeColor) {
      case "green":
        return "bg-green-50 border-green-200";
      case "amber":
        return "bg-amber-50 border-amber-200";
      case "red":
        return "bg-red-50 border-red-200";
      case "purple":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const getBadgeClass = () => {
    switch (badgeColor) {
      case "green":
        return "bg-green-500";
      case "amber":
        return "bg-amber-500";
      case "red":
        return "bg-red-500";
      case "purple":
        return "bg-purple-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <Card className={`${getBgClass()} ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          {icon && <div className="mr-2">{icon}</div>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{value}</span>
          {badgeText && <Badge className={getBadgeClass()}>{badgeText}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
