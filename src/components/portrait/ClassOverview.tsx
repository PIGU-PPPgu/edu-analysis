import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, AlertCircle } from "lucide-react";
import StatCard from "./StatCard";
import { ClassPortraitStats } from "@/lib/api/portrait";
import { PageLoading } from "@/components/ui/loading";
import EmptyState from "@/components/ui/empty-state";

interface ClassOverviewProps {
  classId: string;
  className: string;
  stats: ClassPortraitStats | null;
  onViewClassPortrait: (classId: string) => void;
  isLoading: boolean;
}

/**
 * 班级概览组件
 * 展示班级整体画像和关键统计指标
 */
const ClassOverview: React.FC<ClassOverviewProps> = ({
  classId,
  className,
  stats,
  onViewClassPortrait,
  isLoading,
}) => {
  if (isLoading) {
    return <PageLoading text="加载班级统计数据..." />;
  }

  if (!stats) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="无法加载班级数据"
        description="班级统计数据暂时无法获取，请稍后重试"
        action={{
          label: "重新加载",
          onClick: () => window.location.reload(),
          variant: "outline",
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 border rounded-lg bg-muted/50 space-y-4">
        <h3 className="text-lg font-medium">班级整体画像</h3>
        <p className="text-muted-foreground">
          班级画像提供了班级总体学习情况、能力分布、知识点掌握度等综合分析，
          帮助教师了解班级整体情况，优化教学策略。
        </p>
        <Button onClick={() => onViewClassPortrait(classId)}>
          <BarChart3 className="h-4 w-4 mr-2" />
          查看完整班级画像
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="班级平均成绩"
          value={stats.averageScore.toFixed(1)}
          badgeText={
            stats.averageScore >= 90
              ? "A"
              : stats.averageScore >= 80
                ? "B+"
                : "B"
          }
          badgeColor="blue"
        />

        <StatCard
          title="优秀率"
          value={`${stats.excellentRate}%`}
          badgeText={`${Math.round((stats.studentCount * stats.excellentRate) / 100)}人`}
          badgeColor="green"
        />

        <StatCard
          title="学习进度"
          value={`${stats.progressRate}%`}
          badgeText={
            stats.progressRate > 90
              ? "领先"
              : stats.progressRate > 75
                ? "正常"
                : "滞后"
          }
          badgeColor="amber"
        />
      </div>

      {/* 学科统计 */}
      <Card>
        <CardContent className="py-4">
          <h3 className="text-base font-medium mb-3">学科统计</h3>
          <div className="space-y-3">
            {stats.subjectStats.map((subject, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{subject.name}</span>
                  <span className="text-sm font-medium">
                    {subject.averageScore.toFixed(1)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-primary rounded-full"
                    style={{ width: `${(subject.averageScore / 100) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>优秀人数: {subject.excellentCount}</span>
                  <span>及格人数: {subject.passingCount}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 学生性别分布 */}
      <Card>
        <CardContent className="py-4">
          <h3 className="text-base font-medium mb-3">学生性别分布</h3>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">男生: {stats.gender.male}人</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <span className="text-sm">女生: {stats.gender.female}人</span>
            </div>
            {stats.gender.other > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-sm">其他: {stats.gender.other}人</span>
              </div>
            )}
          </div>
          <div className="h-4 bg-gray-200 rounded-full mt-2 flex overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{
                width: `${(stats.gender.male / stats.studentCount) * 100}%`,
              }}
            ></div>
            <div
              className="h-full bg-pink-500"
              style={{
                width: `${(stats.gender.female / stats.studentCount) * 100}%`,
              }}
            ></div>
            {stats.gender.other > 0 && (
              <div
                className="h-full bg-gray-500"
                style={{
                  width: `${(stats.gender.other / stats.studentCount) * 100}%`,
                }}
              ></div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassOverview;
