/**
 * 学生详情和编辑对话框
 * 支持查看学生详细信息和编辑重点跟进设置
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  School,
  AlertTriangle,
  Clock,
  MessageSquare,
  Target,
  Tag,
  Calendar,
  Bot,
  Save,
  X,
  Plus,
  FileText,
  TrendingUp,
  Loader2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStudentPriorityProfile,
  updatePriorityStudent,
  EnhancedPriorityStudent,
} from "@/services/priorityStudentService";
import { getStudentWarningProfile } from "@/services/studentWarningTrackingService";

interface StudentDetailDialogProps {
  student: EnhancedPriorityStudent | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  mode?: "view" | "edit";
}

const StudentDetailDialog: React.FC<StudentDetailDialogProps> = ({
  student,
  isOpen,
  onClose,
  onUpdate,
  mode: initialMode = "view",
}) => {
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 详细数据状态
  const [warningProfile, setWarningProfile] = useState<any>(null);
  const [priorityProfile, setPriorityProfile] = useState<any>(null);

  // 编辑表单状态
  const [priorityLevel, setPriorityLevel] = useState<"high" | "medium" | "low">(
    "medium"
  );
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [followUpEndDate, setFollowUpEndDate] = useState("");
  const [interventionGoals, setInterventionGoals] = useState<string[]>([]);

  // 输入状态
  const [tagInput, setTagInput] = useState("");
  const [goalInput, setGoalInput] = useState("");

  // 常用分类选项
  const categoryOptions = [
    "学业困难",
    "行为问题",
    "心理健康",
    "家庭问题",
    "社交问题",
    "出勤问题",
    "其他",
  ];

  // 加载学生详细数据
  useEffect(() => {
    if (student && isOpen) {
      loadStudentDetails();
      initializeFormData();
    }
  }, [student, isOpen]);

  const loadStudentDetails = async () => {
    if (!student) return;

    setIsLoading(true);
    try {
      const [warningData, priorityData] = await Promise.all([
        getStudentWarningProfile(student.studentId),
        student.priorityManagementId
          ? getStudentPriorityProfile(student.studentId)
          : null,
      ]);

      setWarningProfile(warningData);
      setPriorityProfile(priorityData);
    } catch (error) {
      console.error("加载学生详情失败:", error);
      toast.error("加载详情失败");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeFormData = () => {
    if (!student) return;

    console.log("🔄 [StudentDetailDialog] 初始化表单数据:");
    console.log("  student.priorityLevel:", student.priorityLevel);
    console.log("  student.category:", student.category);
    console.log("  student.notes:", student.notes);
    console.log("  student.customTags:", student.customTags);
    console.log("  student.followUpEndDate:", student.followUpEndDate);
    console.log("  student.interventionGoals:", student.interventionGoals);

    setPriorityLevel(student.priorityLevel);
    setCategory(student.category || "");
    setNotes(student.notes || "");
    setCustomTags(student.customTags || []);
    setFollowUpEndDate(student.followUpEndDate || "");
    // 从学生数据中获取干预目标（如果存在的话）
    setInterventionGoals(student.interventionGoals || []);

    console.log("✅ [StudentDetailDialog] 表单数据初始化完成");
  };

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !customTags.includes(tagInput.trim())) {
      setCustomTags([...customTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // 移除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter((tag) => tag !== tagToRemove));
  };

  // 添加目标
  const handleAddGoal = () => {
    if (goalInput.trim() && !interventionGoals.includes(goalInput.trim())) {
      const newGoals = [...interventionGoals, goalInput.trim()];
      console.log("➕ [StudentDetailDialog] 添加干预目标:", goalInput.trim());
      console.log("   更新后的目标列表:", newGoals);
      setInterventionGoals(newGoals);
      setGoalInput("");
    }
  };

  // 移除目标
  const handleRemoveGoal = (goalToRemove: string) => {
    const newGoals = interventionGoals.filter((goal) => goal !== goalToRemove);
    console.log("➖ [StudentDetailDialog] 移除干预目标:", goalToRemove);
    console.log("   更新后的目标列表:", newGoals);
    setInterventionGoals(newGoals);
  };

  // 保存编辑
  const handleSave = async () => {
    if (!student?.priorityManagementId) {
      toast.error("无法编辑，学生不在重点跟进中");
      return;
    }

    // 调试日志：检查表单状态
    console.log("🔧 [StudentDetailDialog] 开始保存，当前表单状态:");
    console.log("  priorityLevel:", priorityLevel);
    console.log("  customTags:", customTags);
    console.log("  category:", category);
    console.log("  followUpEndDate:", followUpEndDate);
    console.log("  interventionGoals:", interventionGoals);
    console.log("  notes:", notes);
    console.log(
      "  student.priorityManagementId:",
      student.priorityManagementId
    );

    const updateParams = {
      priorityLevel,
      customTags,
      category: category || undefined,
      followUpEndDate: followUpEndDate || undefined,
      interventionGoals,
      notes: notes.trim() || undefined,
    };

    console.log("📝 [StudentDetailDialog] 准备传递的更新参数:", updateParams);

    setIsSaving(true);
    try {
      const success = await updatePriorityStudent(
        student.priorityManagementId,
        updateParams
      );

      if (success) {
        toast.success("保存成功");
        setMode("view");
        onUpdate?.();
      }
    } catch (error) {
      console.error("保存失败:", error);
      toast.error("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  // 获取优先级颜色和文本
  const getPriorityColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityText = (level: string) => {
    switch (level) {
      case "high":
        return "高优先级";
      case "medium":
        return "中优先级";
      case "low":
        return "低优先级";
      default:
        return level;
    }
  };

  // 获取来源标注
  const getSourceBadge = (sourceType?: string) => {
    if (sourceType === "algorithm") {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
          <Bot className="h-3 w-3 mr-1" />
          算法推荐
        </Badge>
      );
    } else if (sourceType === "manual") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <User className="h-3 w-3 mr-1" />
          手动添加
        </Badge>
      );
    }
    return null;
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-[#c0ff3f]" />
              <span>{student.studentName} 的详细档案</span>
              {getSourceBadge(student.sourceType)}
            </div>
            <div className="flex items-center space-x-2">
              {mode === "view" && student.isPriorityActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMode("edit")}
                  className="border-[#c0ff3f] text-[#c0ff3f] hover:bg-[#c0ff3f] hover:text-black"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#c0ff3f] mr-3" />
            <span className="text-gray-600">加载学生详情...</span>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">基本信息</TabsTrigger>
              <TabsTrigger value="warnings">预警记录</TabsTrigger>
              <TabsTrigger value="management">跟进管理</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* 学生基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <School className="h-5 w-5 mr-2" />
                    基本信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        姓名
                      </Label>
                      <p className="text-base font-medium">
                        {student.studentName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        学号
                      </Label>
                      <p className="text-base">{student.studentId}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        班级
                      </Label>
                      <p className="text-base">{student.className}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        当前状态
                      </Label>
                      <div>
                        <Badge
                          className={getPriorityColor(student.finalPriority)}
                        >
                          {getPriorityText(student.finalPriority)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* 统计数据 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">活跃预警</p>
                      <p className="text-xl font-bold text-red-600">
                        {student.activeWarningsCount || 0}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">总预警数</p>
                      <p className="text-xl font-bold text-blue-600">
                        {student.totalWarningsCount || 0}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <MessageSquare className="h-6 w-6 text-green-500 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">干预次数</p>
                      <p className="text-xl font-bold text-green-600">
                        {student.interventionCount || 0}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">风险评分</p>
                      <p className="text-xl font-bold text-purple-600">
                        {student.effectiveRiskScore || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="warnings" className="space-y-4">
              {/* 预警记录 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    预警记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {warningProfile ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-gray-500">总预警数</p>
                          <p className="text-2xl font-bold">
                            {warningProfile.totalWarnings || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">活跃预警</p>
                          <p className="text-2xl font-bold text-red-600">
                            {warningProfile.activeWarnings || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">已解决</p>
                          <p className="text-2xl font-bold text-green-600">
                            {warningProfile.resolvedWarnings || 0}
                          </p>
                        </div>
                      </div>

                      {warningProfile.lastWarningDate && (
                        <div className="pt-4 border-t">
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-2" />
                            最近预警时间:{" "}
                            {new Date(
                              warningProfile.lastWarningDate
                            ).toLocaleString("zh-CN")}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">暂无预警记录数据</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="management" className="space-y-4">
              {/* 跟进管理 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      跟进管理设置
                    </div>
                    {mode === "edit" && (
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            console.log(
                              "🚫 [StudentDetailDialog] 取消编辑，重置表单数据"
                            );
                            setMode("view");
                            initializeFormData();
                          }}
                          disabled={isSaving}
                        >
                          取消
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-[#c0ff3f] hover:bg-[#a8e635] text-black"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              保存中...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              保存
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {student.isPriorityActive ? (
                    <div className="space-y-4">
                      {/* 优先级设置 */}
                      <div>
                        <Label className="text-sm font-medium">优先级</Label>
                        {mode === "edit" ? (
                          <Select
                            value={priorityLevel}
                            onValueChange={(value: any) =>
                              setPriorityLevel(value)
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">高优先级</SelectItem>
                              <SelectItem value="medium">中优先级</SelectItem>
                              <SelectItem value="low">低优先级</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="mt-1">
                            <Badge
                              className={getPriorityColor(
                                student.priorityLevel
                              )}
                            >
                              {getPriorityText(student.priorityLevel)}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* 分类 */}
                      <div>
                        <Label className="text-sm font-medium">分类</Label>
                        {mode === "edit" ? (
                          <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="选择分类" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryOptions.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="mt-1">{student.category || "未设置"}</p>
                        )}
                      </div>

                      {/* 自定义标签 */}
                      <div>
                        <Label className="text-sm font-medium">
                          自定义标签
                        </Label>
                        {mode === "edit" ? (
                          <div className="mt-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <Input
                                placeholder="输入标签"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) =>
                                  e.key === "Enter" && handleAddTag()
                                }
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddTag}
                                disabled={!tagInput.trim()}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            {customTags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {customTags.map((tag, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                  >
                                    {tag}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTag(tag)}
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1">
                            {student.customTags &&
                            student.customTags.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {student.customTags.map((tag, index) => (
                                  <Badge key={index} variant="outline">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500">未设置标签</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 备注 */}
                      <div>
                        <Label className="text-sm font-medium">备注</Label>
                        {mode === "edit" ? (
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="添加备注信息..."
                            className="mt-1"
                          />
                        ) : (
                          <p className="mt-1 text-gray-600">
                            {student.notes || "无备注"}
                          </p>
                        )}
                      </div>

                      {/* 干预目标 */}
                      <div>
                        <Label className="text-sm font-medium">干预目标</Label>
                        {mode === "edit" ? (
                          <div className="mt-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <Input
                                placeholder="输入干预目标"
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                onKeyPress={(e) =>
                                  e.key === "Enter" && handleAddGoal()
                                }
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddGoal}
                                disabled={!goalInput.trim()}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            {interventionGoals.length > 0 && (
                              <div className="space-y-1">
                                {interventionGoals.map((goal, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                                  >
                                    <span>{goal}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveGoal(goal)}
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1">
                            {student.interventionGoals &&
                            student.interventionGoals.length > 0 ? (
                              <div className="space-y-1">
                                {student.interventionGoals.map(
                                  (goal, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center text-sm text-gray-600"
                                    >
                                      <Target className="h-3 w-3 mr-2 text-[#c0ff3f]" />
                                      {goal}
                                    </div>
                                  )
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500">未设置干预目标</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 添加原因 */}
                      {student.reasonDescription && (
                        <div>
                          <Label className="text-sm font-medium">
                            添加原因
                          </Label>
                          <p className="mt-1 text-gray-600">
                            {student.reasonDescription}
                          </p>
                        </div>
                      )}

                      {/* 添加时间 */}
                      {student.priorityAddedAt && (
                        <div>
                          <Label className="text-sm font-medium">
                            添加时间
                          </Label>
                          <p className="mt-1 text-gray-600">
                            {new Date(student.priorityAddedAt).toLocaleString(
                              "zh-CN"
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">该学生不在重点跟进列表中</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailDialog;
