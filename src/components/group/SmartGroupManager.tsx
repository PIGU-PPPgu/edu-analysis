/**
 * 学习分组管理器 - 支持自动分组算法和教师自定义分组
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Shuffle,
  Settings,
  UserPlus,
  BarChart3,
  Target,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import {
  intelligentPortraitService,
  type GroupAllocationResult,
} from "@/services/intelligentPortraitService";
import * as groupService from "@/services/groupService";
import type { GroupWithMembers } from "@/types/group";

interface SmartGroupManagerProps {
  className: string;
  students: Array<{
    student_id: string;
    name: string;
    overall_score?: number;
  }>;
  onGroupsCreated: (groups: GroupAllocationResult[]) => void;
}

type GroupingStrategy = "balanced" | "mixed_ability" | "homogeneous";

interface GroupingConfig {
  strategy: GroupingStrategy;
  groupCount: number;
  minGroupSize: number;
  maxGroupSize: number;
  considerPersonality: boolean;
  considerAcademicLevel: boolean;
  allowManualAdjustment: boolean;
}

export function SmartGroupManager({
  className,
  students,
  onGroupsCreated,
}: SmartGroupManagerProps) {
  const [config, setConfig] = useState<GroupingConfig>({
    strategy: "balanced",
    groupCount: Math.ceil(students.length / 4), // 默认每组4人
    minGroupSize: 3,
    maxGroupSize: 6,
    considerPersonality: true,
    considerAcademicLevel: true,
    allowManualAdjustment: true,
  });

  const [generatedGroups, setGeneratedGroups] = useState<
    GroupAllocationResult[]
  >([]);
  const [existingGroups, setExistingGroups] = useState<GroupWithMembers[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  );
  const [customGroupName, setCustomGroupName] = useState("");
  const [customGroupDescription, setCustomGroupDescription] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 加载已有分组
  useEffect(() => {
    loadExistingGroups();
  }, [className]);

  const loadExistingGroups = async () => {
    setIsLoading(true);
    try {
      const groups = await groupService.getGroupsByClass(className);
      setExistingGroups(groups);
    } catch (error) {
      console.error("加载小组失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 计算推荐的分组参数
  const recommendedGroups = Math.ceil(students.length / 4);
  const optimalRange = {
    min: Math.max(2, Math.ceil(students.length / 6)),
    max: Math.min(8, Math.ceil(students.length / 2)),
  };

  /**
   * 自动分组
   */
  const handleAutoGrouping = async () => {
    if (students.length === 0) {
      toast.error("班级没有学生数据");
      return;
    }

    setIsGenerating(true);
    try {
      const groups = await intelligentPortraitService.generateOptimalGroups(
        className,
        config.groupCount,
        config.strategy
      );

      setGeneratedGroups(groups);
      toast.success(`成功生成${groups.length}个学习小组`);
    } catch (error) {
      console.error("自动分组失败:", error);
      toast.error("自动分组失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 创建自定义分组
   */
  const handleCreateCustomGroup = () => {
    if (selectedStudents.size === 0) {
      toast.error("请至少选择一名学生");
      return;
    }

    if (!customGroupName.trim()) {
      toast.error("请输入小组名称");
      return;
    }

    const selectedStudentData = Array.from(selectedStudents).map(
      (studentId) => {
        const student = students.find((s) => s.student_id === studentId);
        return {
          student_id: studentId,
          name: student?.name || "",
          role: "collaborator" as const,
          contribution_score: student?.overall_score || 0,
        };
      }
    );

    const newGroup: GroupAllocationResult = {
      group_id: `custom_${Date.now()}`,
      group_name: customGroupName.trim(),
      members: selectedStudentData,
      group_balance: {
        academic_balance: 85,
        personality_balance: 80,
        skill_complementarity: 75,
      },
      predicted_performance:
        selectedStudentData.reduce((sum, s) => sum + s.contribution_score, 0) /
        selectedStudentData.length,
    };

    setGeneratedGroups((prev) => [...prev, newGroup]);
    setSelectedStudents(new Set());
    setCustomGroupName("");
    setCustomGroupDescription("");
    setShowCreateDialog(false);

    toast.success(`成功创建自定义小组：${newGroup.group_name}`);
  };

  /**
   * 调整分组
   */
  const handleAdjustGroup = (
    groupId: string,
    studentId: string,
    action: "remove" | "add"
  ) => {
    setGeneratedGroups((prev) => {
      return prev.map((group) => {
        if (group.group_id === groupId) {
          if (action === "remove") {
            return {
              ...group,
              members: group.members.filter((m) => m.student_id !== studentId),
            };
          }
        }
        return group;
      });
    });
  };

  /**
   * 确认并保存分组到数据库
   */
  const handleSaveGroups = async () => {
    if (generatedGroups.length === 0) {
      toast.error("请先生成分组方案");
      return;
    }

    setIsLoading(true);
    try {
      // 保存每个小组到数据库
      for (const group of generatedGroups) {
        // 创建小组
        const createdGroup = await groupService.createGroup({
          class_name: className,
          group_name: group.group_name,
          description: `自动生成的${config.strategy}分组`,
        });

        if (createdGroup) {
          // 添加成员
          for (const member of group.members) {
            await groupService.addMemberToGroup(
              createdGroup.id,
              member.student_id,
              member.role === "leader" ? "leader" : "member"
            );
          }
        }
      }

      // 重新加载分组
      await loadExistingGroups();
      setGeneratedGroups([]);
      onGroupsCreated(generatedGroups);
      toast.success(`成功保存${generatedGroups.length}个小组`);
    } catch (error) {
      console.error("保存分组失败:", error);
      toast.error("保存分组失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 删除已有分组
   */
  const handleDeleteGroup = async (groupId: string) => {
    const success = await groupService.deleteGroup(groupId);
    if (success) {
      await loadExistingGroups();
    }
  };

  /**
   * 分组质量评估
   */
  const getGroupingQuality = () => {
    if (generatedGroups.length === 0) return null;

    const totalStudents = generatedGroups.reduce(
      (sum, g) => sum + g.members.length,
      0
    );
    const avgBalance =
      generatedGroups.reduce((sum, g) => {
        const balance =
          (g.group_balance.academic_balance +
            g.group_balance.personality_balance +
            g.group_balance.skill_complementarity) /
          3;
        return sum + balance;
      }, 0) / generatedGroups.length;

    const sizeVariance =
      Math.max(...generatedGroups.map((g) => g.members.length)) -
      Math.min(...generatedGroups.map((g) => g.members.length));

    return {
      overall_quality: avgBalance,
      coverage: (totalStudents / students.length) * 100,
      size_balance: Math.max(0, 100 - sizeVariance * 20),
      group_count: generatedGroups.length,
    };
  };

  const quality = getGroupingQuality();

  return (
    <div className="space-y-6">
      {/* 配置面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            分组配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 分组策略 */}
            <div className="space-y-2">
              <Label>分组策略</Label>
              <Select
                value={config.strategy}
                onValueChange={(value: GroupingStrategy) =>
                  setConfig((prev) => ({ ...prev, strategy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">平衡分组（推荐）</SelectItem>
                  <SelectItem value="mixed_ability">混合能力分组</SelectItem>
                  <SelectItem value="homogeneous">相似水平分组</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {config.strategy === "balanced" &&
                  "确保每组学术能力和个性特征平衡"}
                {config.strategy === "mixed_ability" &&
                  "每组包含不同能力水平的学生"}
                {config.strategy === "homogeneous" &&
                  "相似水平的学生分在同一组"}
              </p>
            </div>

            {/* 分组数量 */}
            <div className="space-y-2">
              <Label>分组数量: {config.groupCount}</Label>
              <Slider
                value={[config.groupCount]}
                onValueChange={([value]) =>
                  setConfig((prev) => ({ ...prev, groupCount: value }))
                }
                max={optimalRange.max}
                min={optimalRange.min}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>推荐: {recommendedGroups}组</span>
                <span>
                  范围: {optimalRange.min}-{optimalRange.max}
                </span>
              </div>
            </div>

            {/* 组大小范围 */}
            <div className="space-y-2">
              <Label>
                每组人数: {config.minGroupSize}-{config.maxGroupSize}人
              </Label>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">最少人数</Label>
                  <Slider
                    value={[config.minGroupSize]}
                    onValueChange={([value]) =>
                      setConfig((prev) => ({ ...prev, minGroupSize: value }))
                    }
                    max={5}
                    min={2}
                    step={1}
                  />
                </div>
                <div>
                  <Label className="text-xs">最多人数</Label>
                  <Slider
                    value={[config.maxGroupSize]}
                    onValueChange={([value]) =>
                      setConfig((prev) => ({ ...prev, maxGroupSize: value }))
                    }
                    max={8}
                    min={3}
                    step={1}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 高级选项 */}
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="considerPersonality"
                checked={config.considerPersonality}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    considerPersonality: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="considerPersonality" className="text-sm">
                考虑性格特征
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="considerAcademicLevel"
                checked={config.considerAcademicLevel}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    considerAcademicLevel: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="considerAcademicLevel" className="text-sm">
                考虑学术水平
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowManualAdjustment"
                checked={config.allowManualAdjustment}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    allowManualAdjustment: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="allowManualAdjustment" className="text-sm">
                允许手动调整
              </Label>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleAutoGrouping}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Users className="h-4 w-4" />
              )}
              {isGenerating ? "分组中..." : "自动分组"}
            </Button>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  自定义分组
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>创建自定义分组</DialogTitle>
                  <DialogDescription>
                    选择学生并创建自定义小组
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>小组名称</Label>
                    <Input
                      value={customGroupName}
                      onChange={(e) => setCustomGroupName(e.target.value)}
                      placeholder="例如：数学兴趣小组"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>小组描述（可选）</Label>
                    <Textarea
                      value={customGroupDescription}
                      onChange={(e) =>
                        setCustomGroupDescription(e.target.value)
                      }
                      placeholder="描述小组的特点或目标"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>选择学生 ({selectedStudents.size}人已选)</Label>
                    <div className="max-h-64 overflow-y-auto border rounded-md p-2">
                      {students.map((student) => (
                        <div
                          key={student.student_id}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted ${
                            selectedStudents.has(student.student_id)
                              ? "bg-primary/10"
                              : ""
                          }`}
                          onClick={() => {
                            const newSelected = new Set(selectedStudents);
                            if (newSelected.has(student.student_id)) {
                              newSelected.delete(student.student_id);
                            } else {
                              newSelected.add(student.student_id);
                            }
                            setSelectedStudents(newSelected);
                          }}
                        >
                          <span>{student.name}</span>
                          <div className="flex items-center gap-2">
                            {student.overall_score && (
                              <Badge variant="secondary">
                                {student.overall_score}分
                              </Badge>
                            )}
                            {selectedStudents.has(student.student_id) && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      取消
                    </Button>
                    <Button onClick={handleCreateCustomGroup}>创建小组</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {generatedGroups.length > 0 && (
              <Button variant="outline" onClick={() => setGeneratedGroups([])}>
                <Shuffle className="h-4 w-4 mr-2" />
                重新分组
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 已有分组 */}
      {existingGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              已有分组 ({existingGroups.length}个小组)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {existingGroups.map((group) => (
                <Card key={group.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {group.group_name}
                      </CardTitle>
                      <Badge variant="outline">{group.member_count}人</Badge>
                    </div>
                    {group.leader_name && (
                      <div className="text-sm text-muted-foreground">
                        组长: {group.leader_name}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {/* 组员列表 */}
                    <div className="space-y-2 mb-4">
                      {group.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex items-center gap-2">
                            {member.student_name}
                            {member.role === "leader" && (
                              <Badge variant="default" className="text-xs">
                                组长
                              </Badge>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 操作按钮 */}
                    <div className="pt-2 border-t">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteGroup(group.id)}
                        className="w-full"
                      >
                        删除小组
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分组结果 */}
      {generatedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                分组结果 ({generatedGroups.length}个小组)
              </CardTitle>
              <div className="flex gap-2">
                {quality && (
                  <Badge
                    variant={
                      quality.overall_quality > 80 ? "default" : "secondary"
                    }
                  >
                    整体质量: {Math.round(quality.overall_quality)}分
                  </Badge>
                )}
                <Button onClick={handleSaveGroups}>保存分组方案</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 分组质量评估 */}
            {quality && (
              <Alert className="mb-4">
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div>
                      <div className="text-sm font-medium">覆盖率</div>
                      <div className="text-2xl">
                        {Math.round(quality.coverage)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">大小均衡</div>
                      <div className="text-2xl">
                        {Math.round(quality.size_balance)}分
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">分组数量</div>
                      <div className="text-2xl">{quality.group_count}个</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">整体评分</div>
                      <div
                        className={`text-2xl ${quality.overall_quality > 80 ? "text-green-600" : "text-yellow-600"}`}
                      >
                        {Math.round(quality.overall_quality)}分
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 分组列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedGroups.map((group) => (
                <Card key={group.group_id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {group.group_name}
                      </CardTitle>
                      <Badge variant="outline">{group.members.length}人</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        预测成绩: {Math.round(group.predicted_performance)}分
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 组员列表 */}
                    <div className="space-y-2 mb-4">
                      {group.members.map((member) => (
                        <div
                          key={member.student_id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex items-center gap-2">
                            {member.name}
                            {member.role === "leader" && (
                              <Badge variant="default" className="text-xs">
                                组长
                              </Badge>
                            )}
                            {member.role === "specialist" && (
                              <Badge variant="secondary" className="text-xs">
                                专家
                              </Badge>
                            )}
                          </span>
                          {config.allowManualAdjustment && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleAdjustGroup(
                                  group.group_id,
                                  member.student_id,
                                  "remove"
                                )
                              }
                              className="h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 平衡性指标 */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between text-xs">
                        <span>学术平衡</span>
                        <span>
                          {Math.round(group.group_balance.academic_balance)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>性格平衡</span>
                        <span>
                          {Math.round(group.group_balance.personality_balance)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>技能互补</span>
                        <span>
                          {Math.round(
                            group.group_balance.skill_complementarity
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 帮助提示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            分组建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <strong>平衡分组：</strong>
                适合大多数教学场景，确保每组都有不同能力水平的学生，促进互助学习。
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <strong>最佳组大小：</strong>
                建议每组3-5人，既保证参与度又便于管理。
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <strong>注意事项：</strong>
                自动分组基于学生成绩和学习特征，教师可根据实际情况手动调整。
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SmartGroupManager;
