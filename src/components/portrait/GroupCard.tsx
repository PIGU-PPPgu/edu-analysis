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
import { BarChart3, Users } from "lucide-react";
import { GroupPortraitData } from "@/lib/api/portrait";

interface GroupCardProps {
  group: GroupPortraitData;
  onView: (groupId: string) => void;
}

/**
 * 小组卡片组件
 * 使用memo优化渲染性能，避免不必要的重渲染
 */
const GroupCard: React.FC<GroupCardProps> = memo(({ group, onView }) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 bg-muted/30">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{group.name}</CardTitle>
              {group.averageScore && (
                <CardDescription className="flex items-center">
                  平均成绩:{" "}
                  <span className="font-medium ml-1">{group.averageScore}</span>
                </CardDescription>
              )}
            </div>
          </div>
          <Badge variant="outline">{group.student_count}人</Badge>
        </div>
        {group.description && (
          <CardDescription className="mt-2">
            {group.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-4 pb-2">
        {group.stats && group.stats.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">能力评估:</div>
            <div className="grid grid-cols-3 gap-2">
              {group.stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center bg-muted/20 rounded-md p-2"
                >
                  <div className="text-xs text-muted-foreground">
                    {stat.name}
                  </div>
                  <div className="font-medium">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <Button size="sm" onClick={() => onView(group.id)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            查看小组画像
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

GroupCard.displayName = "GroupCard";

export default GroupCard;
