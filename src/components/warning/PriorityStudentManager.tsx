/**
 * 重点跟进学生管理器
 * 支持搜索、添加、编辑重点跟进学生
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Card, CardContent } from "@/components/ui/card";
import {
  UserPlus,
  Search,
  User,
  School,
  AlertTriangle,
  Tag,
  Calendar,
  Target,
  Loader2,
  Plus,
  X,
  Save,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  searchStudentsForPriority,
  addPriorityStudent,
  updatePriorityStudent,
  EnhancedPriorityStudent,
} from "@/services/priorityStudentService";

interface PriorityStudentManagerProps {
  onStudentAdded: () => void;
  trigger?: React.ReactNode;
}

interface StudentSearchResult {
  student_id: string;
  name: string;
  class_name: string;
  priority_student_management?: any[];
}

const PriorityStudentManager: React.FC<PriorityStudentManagerProps> = ({
  onStudentAdded,
  trigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // 表单状态
  const [priorityLevel, setPriorityLevel] = useState<"high" | "medium" | "low">(
    "medium"
  );
  const [category, setCategory] = useState("");
  const [reasonDescription, setReasonDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [followUpEndDate, setFollowUpEndDate] = useState("");
  const [interventionGoals, setInterventionGoals] = useState<string[]>([]);
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

  // 搜索学生
  const handleSearch = async (term: string) => {
    if (term.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchStudentsForPriority(term, 20);
      setSearchResults(results);
    } catch (error) {
      console.error("搜索学生失败:", error);
      toast.error("搜索失败");
    } finally {
      setIsSearching(false);
    }
  };

  // 防抖搜索
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // 选择学生
  const handleSelectStudent = (student: StudentSearchResult) => {
    setSelectedStudent(student);
    setReasonDescription(`手动添加 ${student.name} 到重点跟进`);
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
      setInterventionGoals([...interventionGoals, goalInput.trim()]);
      setGoalInput("");
    }
  };

  // 移除目标
  const handleRemoveGoal = (goalToRemove: string) => {
    setInterventionGoals(
      interventionGoals.filter((goal) => goal !== goalToRemove)
    );
  };

  // 重置表单
  const resetForm = () => {
    setSelectedStudent(null);
    setPriorityLevel("medium");
    setCategory("");
    setReasonDescription("");
    setNotes("");
    setCustomTags([]);
    setTagInput("");
    setFollowUpEndDate("");
    setInterventionGoals([]);
    setGoalInput("");
  };

  // 提交添加学生
  const handleSubmit = async () => {
    if (!selectedStudent) {
      toast.error("请选择要添加的学生");
      return;
    }

    if (!reasonDescription.trim()) {
      toast.error("请填写添加原因");
      return;
    }

    setIsAdding(true);
    try {
      const success = await addPriorityStudent({
        studentId: selectedStudent.student_id,
        sourceType: "manual",
        priorityLevel,
        reasonDescription: reasonDescription.trim(),
        customTags,
        category: category || undefined,
        followUpEndDate: followUpEndDate || undefined,
        interventionGoals,
        notes: notes.trim() || undefined,
      });

      if (success) {
        toast.success(`${selectedStudent.name} 已添加到重点跟进`);
        resetForm();
        setSearchTerm("");
        setSearchResults([]);
        setIsOpen(false);
        onStudentAdded();
      }
    } catch (error) {
      console.error("添加学生失败:", error);
      toast.error("添加失败");
    } finally {
      setIsAdding(false);
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  // 获取优先级文本
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            className="bg-[#c0ff3f] hover:bg-[#a8e635] text-black"
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            添加学生
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <UserPlus className="h-5 w-5 mr-2 text-[#c0ff3f]" />
            添加重点跟进学生
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 学生搜索 */}
          {!selectedStudent && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="search" className="text-base font-medium">
                  搜索学生
                </Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="输入学生姓名、学号或班级..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-[#c0ff3f]" />
                  )}
                </div>
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <Label className="text-sm text-gray-600">搜索结果</Label>
                  {searchResults.map((student) => (
                    <Card
                      key={student.student_id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleSelectStudent(student)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-full bg-blue-100">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800">
                                {student.name}
                              </h4>
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                <School className="h-3 w-3 mr-1" />
                                <span>{student.class_name}</span>
                                <span className="mx-2">·</span>
                                <span>学号: {student.student_id}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            选择
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {searchTerm && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>未找到匹配的学生</p>
                  <p className="text-sm">尝试使用不同的搜索词</p>
                </div>
              )}
            </div>
          )}

          {/* 学生信息和配置表单 */}
          {selectedStudent && (
            <div className="space-y-6">
              {/* 选中的学生信息 */}
              <Card className="border-[#c0ff3f] bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-[#c0ff3f] text-black">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">
                          {selectedStudent.name}
                        </h4>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <School className="h-3 w-3 mr-1" />
                          <span>{selectedStudent.class_name}</span>
                          <span className="mx-2">·</span>
                          <span>学号: {selectedStudent.student_id}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedStudent(null)}
                    >
                      重新选择
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 配置表单 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左列 */}
                <div className="space-y-4">
                  {/* 优先级 */}
                  <div>
                    <Label htmlFor="priority" className="text-sm font-medium">
                      优先级 *
                    </Label>
                    <Select
                      value={priorityLevel}
                      onValueChange={(value: any) => setPriorityLevel(value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">
                          <span className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                            高优先级
                          </span>
                        </SelectItem>
                        <SelectItem value="medium">
                          <span className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                            中优先级
                          </span>
                        </SelectItem>
                        <SelectItem value="low">
                          <span className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-blue-500" />
                            低优先级
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 分类 */}
                  <div>
                    <Label htmlFor="category" className="text-sm font-medium">
                      分类
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="选择分类（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 跟进期限 */}
                  <div>
                    <Label htmlFor="endDate" className="text-sm font-medium">
                      跟进期限
                    </Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="endDate"
                        type="date"
                        value={followUpEndDate}
                        onChange={(e) => setFollowUpEndDate(e.target.value)}
                        className="pl-10"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                </div>

                {/* 右列 */}
                <div className="space-y-4">
                  {/* 添加原因 */}
                  <div>
                    <Label htmlFor="reason" className="text-sm font-medium">
                      添加原因 *
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder="请说明为什么要将此学生添加到重点跟进..."
                      value={reasonDescription}
                      onChange={(e) => setReasonDescription(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {/* 备注 */}
                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium">
                      备注
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="其他备注信息（可选）..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* 自定义标签 */}
              <div>
                <Label className="text-sm font-medium">自定义标签</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="输入标签（如：数学困难、注意力不集中等）"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        className="pl-10"
                        onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                      />
                    </div>
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
              </div>

              {/* 干预目标 */}
              <div>
                <Label className="text-sm font-medium">干预目标</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="输入干预目标（如：提高数学成绩、改善课堂表现等）"
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        className="pl-10"
                        onKeyPress={(e) => e.key === "Enter" && handleAddGoal()}
                      />
                    </div>
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
                          className="flex items-center justify-between bg-gray-50 p-2 rounded"
                        >
                          <span className="text-sm">{goal}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGoal(goal)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsOpen(false);
                  }}
                  disabled={isAdding}
                >
                  取消
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isAdding || !reasonDescription.trim()}
                  className="bg-[#c0ff3f] hover:bg-[#a8e635] text-black"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      添加中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      确认添加
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriorityStudentManager;
