/**
 * 考试模板管理服务
 * 提供考试模板的CRUD操作
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 考试模板接口
export interface ExamTemplate {
  id: string;
  template_name: string;
  description?: string;
  exam_type: string;
  config: TemplateConfig;
  created_by?: string;
  is_public: boolean;
  is_system: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// 模板配置接口
export interface TemplateConfig {
  duration?: number; // 考试时长(分钟)
  total_score?: number; // 总分
  passing_score?: number; // 及格分
  subjects?: string[]; // 科目列表
  subject_scores?: Record<
    string,
    {
      total: number;
      passing: number;
      excellent: number;
    }
  >;
  classes?: string[]; // 班级
  tags?: string[]; // 标签
}

// 创建模板输入
export interface CreateTemplateInput {
  template_name: string;
  description?: string;
  exam_type: string;
  config: TemplateConfig;
  is_public?: boolean;
}

/**
 * 获取所有可用模板(包括用户自己的和公开的)
 */
export const getExamTemplates = async (): Promise<ExamTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from("exam_templates")
      .select("*")
      .order("is_system", { ascending: false })
      .order("usage_count", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("获取考试模板失败:", error);
    toast.error("获取考试模板失败");
    return [];
  }
};

/**
 * 根据考试类型获取模板
 */
export const getTemplatesByType = async (
  examType: string
): Promise<ExamTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from("exam_templates")
      .select("*")
      .eq("exam_type", examType)
      .order("is_system", { ascending: false })
      .order("usage_count", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("获取模板失败:", error);
    toast.error("获取模板失败");
    return [];
  }
};

/**
 * 根据ID获取模板
 */
export const getTemplateById = async (
  templateId: string
): Promise<ExamTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from("exam_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("获取模板详情失败:", error);
    toast.error("获取模板详情失败");
    return null;
  }
};

/**
 * 创建新模板
 */
export const createExamTemplate = async (
  templateData: CreateTemplateInput
): Promise<ExamTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from("exam_templates")
      .insert([
        {
          template_name: templateData.template_name,
          description: templateData.description,
          exam_type: templateData.exam_type,
          config: templateData.config,
          is_public: templateData.is_public || false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    toast.success("考试模板创建成功");
    return data;
  } catch (error) {
    console.error("创建考试模板失败:", error);
    toast.error("创建考试模板失败");
    return null;
  }
};

/**
 * 更新模板
 */
export const updateExamTemplate = async (
  templateId: string,
  templateData: Partial<CreateTemplateInput>
): Promise<ExamTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from("exam_templates")
      .update({
        template_name: templateData.template_name,
        description: templateData.description,
        exam_type: templateData.exam_type,
        config: templateData.config,
        is_public: templateData.is_public,
      })
      .eq("id", templateId)
      .select()
      .single();

    if (error) throw error;

    toast.success("模板更新成功");
    return data;
  } catch (error) {
    console.error("更新模板失败:", error);
    toast.error("更新模板失败");
    return null;
  }
};

/**
 * 删除模板
 */
export const deleteExamTemplate = async (
  templateId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("exam_templates")
      .delete()
      .eq("id", templateId);

    if (error) throw error;

    toast.success("模板删除成功");
    return true;
  } catch (error) {
    console.error("删除模板失败:", error);
    toast.error("删除模板失败");
    return false;
  }
};

/**
 * 使用模板(增加使用次数)
 */
export const useTemplate = async (templateId: string): Promise<boolean> => {
  try {
    const { data: template, error: fetchError } = await supabase
      .from("exam_templates")
      .select("usage_count")
      .eq("id", templateId)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from("exam_templates")
      .update({
        usage_count: (template.usage_count || 0) + 1,
      })
      .eq("id", templateId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error("更新模板使用次数失败:", error);
    return false;
  }
};

/**
 * 从模板创建考试
 */
export const createExamFromTemplate = async (
  templateId: string,
  examData: {
    title: string;
    date: string;
    description?: string;
  }
): Promise<any> => {
  try {
    // 获取模板
    const template = await getTemplateById(templateId);
    if (!template) {
      throw new Error("模板不存在");
    }

    // 增加模板使用次数
    await useTemplate(templateId);

    // 构建考试数据
    const newExamData = {
      title: examData.title,
      type: template.exam_type,
      date: examData.date,
      description: examData.description,
      duration: template.config.duration,
      total_score: template.config.total_score,
      passing_score: template.config.passing_score,
      classes: template.config.classes || [],
      tags: template.config.tags || [],
    };

    // 创建考试
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .insert([newExamData])
      .select()
      .single();

    if (examError) throw examError;

    // 如果模板包含科目配置,创建科目分数配置
    if (template.config.subject_scores && exam.id) {
      const subjectScores = Object.entries(template.config.subject_scores).map(
        ([subject, scores]) => ({
          exam_id: exam.id,
          subject_code: subject,
          subject_name: subject,
          total_score: scores.total,
          passing_score: scores.passing,
          excellent_score: scores.excellent,
          is_required: true,
          weight: 1,
        })
      );

      const { error: scoresError } = await supabase
        .from("exam_subject_scores")
        .insert(subjectScores);

      if (scoresError) {
        console.error("创建科目分数配置失败:", scoresError);
      }
    }

    toast.success("从模板创建考试成功");
    return exam;
  } catch (error) {
    console.error("从模板创建考试失败:", error);
    toast.error("从模板创建考试失败");
    return null;
  }
};

/**
 * 将现有考试保存为模板
 */
export const saveExamAsTemplate = async (
  examId: string,
  templateName: string,
  description?: string,
  isPublic = false
): Promise<ExamTemplate | null> => {
  try {
    // 获取考试信息
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError) throw examError;

    // 获取科目配置
    const { data: subjectScores, error: scoresError } = await supabase
      .from("exam_subject_scores")
      .select("*")
      .eq("exam_id", examId);

    if (scoresError) throw scoresError;

    // 构建模板配置
    const config: TemplateConfig = {
      duration: exam.duration,
      total_score: exam.total_score,
      passing_score: exam.passing_score,
      subjects: subjectScores?.map((s) => s.subject_name) || [],
      subject_scores:
        subjectScores?.reduce(
          (acc, s) => {
            acc[s.subject_code] = {
              total: s.total_score,
              passing: s.passing_score,
              excellent: s.excellent_score,
            };
            return acc;
          },
          {} as Record<string, any>
        ) || {},
      classes: exam.classes || [],
      tags: exam.tags || [],
    };

    // 创建模板
    return await createExamTemplate({
      template_name: templateName,
      description: description || `基于考试"${exam.title}"创建的模板`,
      exam_type: exam.type,
      config,
      is_public: isPublic,
    });
  } catch (error) {
    console.error("保存考试为模板失败:", error);
    toast.error("保存考试为模板失败");
    return null;
  }
};
