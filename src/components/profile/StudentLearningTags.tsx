import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { portraitAPI } from "@/lib/api/portrait";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Tag as TagIcon, X, Loader2, Save } from "lucide-react";
import { StudentData } from "./types";

interface StudentLearningTagsProps {
  student: StudentData;
  readOnly?: boolean;
}

// 标签类别和颜色映射
const TAG_CATEGORIES = {
  interest: { title: "兴趣特点", color: "bg-blue-100 text-blue-800" },
  learning: { title: "学习风格", color: "bg-green-100 text-green-800" },
  improvement: { title: "待提升", color: "bg-amber-100 text-amber-800" },
  personality: { title: "性格特点", color: "bg-purple-100 text-purple-800" },
  custom: { title: "自定义标签", color: "bg-slate-100 text-slate-800" },
};

// 将标签分类为不同类别
const categorizeTag = (tag: string): string => {
  const learningStyleKeywords = [
    "视觉",
    "听觉",
    "读写",
    "实践",
    "思考",
    "归纳",
    "分析",
  ];
  const improvementKeywords = ["提升", "加强", "改进", "待发展", "弱点"];
  const interestKeywords = ["兴趣", "喜欢", "优势", "擅长", "特长"];
  const personalityKeywords = [
    "性格",
    "内向",
    "外向",
    "热情",
    "认真",
    "细心",
    "责任",
  ];

  if (learningStyleKeywords.some((keyword) => tag.includes(keyword))) {
    return "learning";
  } else if (improvementKeywords.some((keyword) => tag.includes(keyword))) {
    return "improvement";
  } else if (interestKeywords.some((keyword) => tag.includes(keyword))) {
    return "interest";
  } else if (personalityKeywords.some((keyword) => tag.includes(keyword))) {
    return "personality";
  }

  return "custom";
};

const StudentLearningTags: React.FC<StudentLearningTagsProps> = ({
  student,
  readOnly = false,
}) => {
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 获取学生标签数据
  useEffect(() => {
    const loadTags = async () => {
      try {
        // 提取AI标签
        const aiTagsList: string[] = [];

        if (student?.aiTags) {
          if (student.aiTags.learningStyle) {
            aiTagsList.push(...student.aiTags.learningStyle);
          }
          if (student.aiTags.strengths) {
            aiTagsList.push(...student.aiTags.strengths);
          }
          if (student.aiTags.improvements) {
            aiTagsList.push(...student.aiTags.improvements);
          }
          if (student.aiTags.personalityTraits) {
            aiTagsList.push(...student.aiTags.personalityTraits);
          }
        }

        setAiTags(aiTagsList);

        // 设置自定义标签
        setCustomTags(student?.customTags || []);
      } catch (error) {
        console.error("加载标签失败:", error);
      }
    };

    loadTags();
  }, [student]);

  // 添加新标签
  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    // 避免重复标签
    if (customTags.includes(newTag.trim()) || aiTags.includes(newTag.trim())) {
      toast.error("该标签已存在");
      return;
    }

    const updatedTags = [...customTags, newTag.trim()];
    setCustomTags(updatedTags);
    setNewTag("");

    try {
      setIsSaving(true);
      await portraitAPI.saveCustomTags(student.studentId, updatedTags);
      toast.success("标签已添加");
    } catch (error) {
      console.error("保存标签失败:", error);
      toast.error("标签保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  // 删除标签
  const handleDeleteTag = async (tag: string) => {
    const updatedTags = customTags.filter((t) => t !== tag);
    setCustomTags(updatedTags);

    try {
      setIsSaving(true);
      await portraitAPI.saveCustomTags(student.studentId, updatedTags);
      toast.success("标签已删除");
    } catch (error) {
      console.error("删除标签失败:", error);
      toast.error("标签删除失败");
    } finally {
      setIsSaving(false);
    }
  };

  // 按类别分组标签
  const getTagsByCategory = () => {
    const categorized: Record<
      string,
      { title: string; color: string; tags: string[] }
    > = {};

    // 初始化分类
    Object.entries(TAG_CATEGORIES).forEach(([key, value]) => {
      categorized[key] = { ...value, tags: [] };
    });

    // AI生成的标签
    aiTags.forEach((tag) => {
      const category = categorizeTag(tag);
      categorized[category].tags.push(tag);
    });

    // 自定义标签
    customTags.forEach((tag) => {
      categorized["custom"].tags.push(tag);
    });

    return categorized;
  };

  const categorizedTags = getTagsByCategory();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TagIcon className="h-5 w-5" />
          学习特征标签
        </CardTitle>
        <CardDescription>学生学习特点和行为特征的标签化描述</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 标签分类显示 */}
          {Object.entries(categorizedTags).map(([category, data]) => {
            // 只显示有标签的类别
            if (data.tags.length === 0) return null;

            return (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-medium">{data.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1 ${data.color}`}
                    >
                      {tag}
                      {category === "custom" && !readOnly && (
                        <button
                          onClick={() => handleDeleteTag(tag)}
                          className="ml-1 text-gray-600 hover:text-gray-900"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* 添加自定义标签 */}
          {!readOnly && (
            <div className="pt-4 border-t mt-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="输入自定义标签"
                  className="flex-grow"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  添加
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                添加的自定义标签将帮助更准确描述学生特点
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentLearningTags;
