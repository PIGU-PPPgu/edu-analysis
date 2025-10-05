/**
 * 小组画像分析组件 - 展示小组的综合特征和协作能力
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  TrendingUp,
  BarChart3,
  Target,
  Zap,
  Heart,
  Brain,
  Star,
  Award,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  intelligentPortraitService,
  type GroupPortraitAnalysis,
} from "@/services/intelligentPortraitService";
import { toast } from "sonner";
import * as groupService from "@/services/groupService";
import type { GroupStats } from "@/types/group";

interface GroupPortraitAnalysisProps {
  groupId: string;
  groupName: string;
  members: Array<{
    student_id: string;
    name: string;
    role: string;
    contribution_score: number;
  }>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function GroupPortraitAnalysis({
  groupId,
  groupName,
  members,
}: GroupPortraitAnalysisProps) {
  const [portrait, setPortrait] = useState<GroupPortraitAnalysis | null>(null);
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    if (!groupId) return;

    setIsLoading(true);
    try {
      // 并行加载画像和统计数据
      const [portraitResult, statsResult] = await Promise.all([
        intelligentPortraitService.generateGroupPortrait(groupId),
        groupService.getGroupStats(groupId),
      ]);

      if (portraitResult) {
        setPortrait(portraitResult);
      }

      if (statsResult) {
        setGroupStats(statsResult);
      }

      if (!portraitResult) {
        toast.error("无法生成小组画像，请检查数据");
      }
    } catch (error) {
      console.error("加载小组数据失败:", error);
      toast.error("加载小组数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!portrait) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>暂无小组画像数据</p>
            <Button onClick={loadGroupData} className="mt-2">
              重新加载
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 准备雷达图数据
  const radarData = [
    {
      subject: "学术能力",
      value: portrait.academic_composition.average_performance || 0,
      maxValue: 100,
    },
    {
      subject: "协作能力",
      value: portrait.collaboration_profile.innovation_potential || 0,
      maxValue: 100,
    },
    {
      subject: "凝聚力",
      value: portrait.group_dynamics.cohesion_score || 0,
      maxValue: 100,
    },
    {
      subject: "生产力",
      value: portrait.group_dynamics.productivity_prediction || 0,
      maxValue: 100,
    },
    {
      subject: "挑战准备度",
      value: portrait.group_dynamics.challenge_readiness || 0,
      maxValue: 100,
    },
    {
      subject: "支持网络",
      value: portrait.group_dynamics.support_network_strength || 0,
      maxValue: 100,
    },
  ];

  // 准备成员角色分布数据
  const roleDistribution = members.reduce(
    (acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = Object.entries(roleDistribution).map(([role, count]) => ({
    name: role,
    value: count,
    displayName: getRoleDisplayName(role),
  }));

  // 准备成员贡献度数据
  const contributionData = members
    .sort((a, b) => b.contribution_score - a.contribution_score)
    .map((member) => ({
      name: member.name,
      score: member.contribution_score,
      role: member.role,
    }));

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {groupName} - 小组画像
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{portrait.member_count}名成员</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailDialog(true)}
              >
                详细分析
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 关键指标 - 优先显示数据库真实数据 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {groupStats?.average_score ||
                  Math.round(
                    portrait.academic_composition.average_performance || 0
                  )}
              </div>
              <div className="text-sm text-muted-foreground">平均成绩</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {groupStats?.member_count || portrait.member_count}
              </div>
              <div className="text-sm text-muted-foreground">成员数量</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {groupStats?.highest_score ||
                  Math.round(
                    portrait.group_dynamics.productivity_prediction || 0
                  )}
              </div>
              <div className="text-sm text-muted-foreground">
                {groupStats ? "最高分" : "生产力预测"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {groupStats?.lowest_score ||
                  Math.round(
                    portrait.collaboration_profile.innovation_potential || 0
                  )}
              </div>
              <div className="text-sm text-muted-foreground">
                {groupStats ? "最低分" : "创新潜力"}
              </div>
            </div>
          </div>

          {/* 等级分布 - 如果有数据库统计数据 */}
          {groupStats && groupStats.grade_distribution.length > 0 && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                成绩等级分布
              </h4>
              <div className="flex gap-2 flex-wrap">
                {groupStats.grade_distribution.map((item) => (
                  <Badge key={item.grade} variant="secondary">
                    {item.grade}: {item.count}人
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 能力雷达图 */}
          <div className="h-80">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" />
              综合能力分析
            </h4>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar
                  name="小组能力"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 详细分析标签页 */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="academic">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="academic">学术组成</TabsTrigger>
              <TabsTrigger value="collaboration">协作特征</TabsTrigger>
              <TabsTrigger value="dynamics">团队动态</TabsTrigger>
              <TabsTrigger value="members">成员分析</TabsTrigger>
            </TabsList>

            <TabsContent value="academic" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                学术组成分析
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">成绩分布</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>平均成绩</span>
                        <Badge>
                          {Math.round(
                            portrait.academic_composition.average_performance ||
                              0
                          )}
                          分
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>成绩范围</span>
                        <span className="text-sm">
                          {Math.round(
                            portrait.academic_composition.performance_range
                              ?.min || 0
                          )}{" "}
                          -
                          {Math.round(
                            portrait.academic_composition.performance_range
                              ?.max || 0
                          )}
                          分
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>学习节奏差异</span>
                        <Badge
                          variant={
                            (portrait.academic_composition
                              .learning_pace_variance || 0) < 10
                              ? "default"
                              : (portrait.academic_composition
                                    .learning_pace_variance || 0) < 20
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {portrait.academic_composition
                            .learning_pace_variance < 10
                            ? "一致"
                            : portrait.academic_composition
                                  .learning_pace_variance < 20
                              ? "较好"
                              : "需关注"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">科目强项分布</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground">
                      科目强项数据分析
                      <br />
                      <span className="text-sm">（基于成员个人画像汇总）</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="collaboration" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Heart className="h-4 w-4" />
                协作特征分析
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">角色分布</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">协作能力</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">冲突解决能力</span>
                        <span className="text-sm">
                          {
                            portrait.collaboration_profile
                              .conflict_resolution_capacity
                          }
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          portrait.collaboration_profile
                            .conflict_resolution_capacity
                        }
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">创新潜力</span>
                        <span className="text-sm">
                          {portrait.collaboration_profile.innovation_potential}%
                        </span>
                      </div>
                      <Progress
                        value={
                          portrait.collaboration_profile.innovation_potential
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="dynamics" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                团队动态评估
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {portrait.group_dynamics.cohesion_score}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      凝聚力指数
                    </div>
                    <div className="mt-2">
                      {portrait.group_dynamics.cohesion_score > 80 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      ) : portrait.group_dynamics.cohesion_score > 60 ? (
                        <Minus className="h-4 w-4 text-yellow-500 mx-auto" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {portrait.group_dynamics.productivity_prediction}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      生产力预测
                    </div>
                    <div className="mt-2">
                      {portrait.group_dynamics.productivity_prediction > 80 ? (
                        <ArrowUp className="h-4 w-4 text-green-500 mx-auto" />
                      ) : portrait.group_dynamics.productivity_prediction >
                        70 ? (
                        <Minus className="h-4 w-4 text-yellow-500 mx-auto" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {portrait.group_dynamics.challenge_readiness}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      挑战准备度
                    </div>
                    <div className="mt-2">
                      <Target className="h-4 w-4 text-orange-500 mx-auto" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {portrait.group_dynamics.support_network_strength}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      支持网络
                    </div>
                    <div className="mt-2">
                      <Heart className="h-4 w-4 text-purple-500 mx-auto" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 动态建议 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">团队发展建议</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {portrait.group_dynamics.cohesion_score < 70 && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>凝聚力待加强：</strong>
                          建议增加团队建设活动，促进成员间的了解和信任。
                        </div>
                      </div>
                    )}

                    {portrait.group_dynamics.productivity_prediction < 75 && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>生产力提升：</strong>
                          可以通过明确角色分工和建立有效的沟通机制来提高团队效率。
                        </div>
                      </div>
                    )}

                    {portrait.group_dynamics.challenge_readiness > 80 && (
                      <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                        <Star className="h-4 w-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <strong>挑战准备充分：</strong>
                          这个小组已经准备好接受更高难度的任务和挑战。
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                成员贡献分析
              </h3>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">成员贡献度排名</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={contributionData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="score" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {members.map((member, index) => (
                    <Card key={member.student_id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.name}</span>
                            <Badge variant="outline">
                              {getRoleDisplayName(member.role)}
                            </Badge>
                          </div>
                          {index === 0 && (
                            <Award className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>贡献评分</span>
                          <span>{member.contribution_score}分</span>
                        </div>
                        <Progress
                          value={
                            (member.contribution_score /
                              Math.max(
                                ...members.map((m) => m.contribution_score)
                              )) *
                            100
                          }
                          className="mt-2"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 详细分析对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{groupName} - 深度画像分析</DialogTitle>
            <DialogDescription>
              基于成员个人画像和小组互动数据的综合分析报告
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI分析摘要
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>学术特征：</strong>
                    该小组平均学术水平为
                    {Math.round(
                      portrait.academic_composition.average_performance || 0
                    )}
                    分， 成绩分布
                    {(portrait.academic_composition.performance_range?.max ||
                      0) -
                      (portrait.academic_composition.performance_range?.min ||
                        0) <
                    20
                      ? "相对集中"
                      : "较为分散"}
                    ， 学习节奏
                    {(portrait.academic_composition.learning_pace_variance ||
                      0) < 10
                      ? "高度一致"
                      : "存在差异"}
                    。
                  </p>

                  <p>
                    <strong>协作能力：</strong>
                    团队凝聚力达到{portrait.group_dynamics.cohesion_score}%，
                    创新潜力评估为
                    {portrait.collaboration_profile.innovation_potential}%，
                    在面对挑战时的准备度为
                    {portrait.group_dynamics.challenge_readiness}%。
                  </p>

                  <p>
                    <strong>发展建议：</strong>
                    {portrait.group_dynamics.cohesion_score > 80
                      ? "该小组具备良好的团队协作基础，可以承担更具挑战性的项目。"
                      : portrait.group_dynamics.cohesion_score > 60
                        ? "建议通过团队建设活动进一步提升凝聚力。"
                        : "需要重点关注团队融合，建立有效的沟通机制。"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 这里可以添加更多详细分析内容 */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 辅助函数：获取角色显示名称
function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    leader: "组长",
    collaborator: "协作者",
    supporter: "支持者",
    specialist: "专家",
  };
  return roleMap[role] || role;
}

export default GroupPortraitAnalysis;
