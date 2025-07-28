import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * 提交作业
 * @param data 提交数据，包含作业ID、学生ID、文件等
 * @returns 成功的提交对象或null
 */
export async function submitHomework(data: {
  homework_id: string;
  student_id: string;
  files?: any[];
  content?: string;
}) {
  try {
    // 构建提交数据
    const submissionData = {
      homework_id: data.homework_id,
      student_id: data.student_id,
      files: data.files || null,
      status: "submitted", // 设置状态为已提交
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 创建提交记录
    const { data: submission, error } = await supabase
      .from("homework_submissions")
      .insert(submissionData)
      .select()
      .single();

    if (error) {
      console.error("作业提交失败:", error);
      toast.error(`作业提交失败: ${error.message}`);
      return null;
    }

    toast.success("作业提交成功");
    return submission;
  } catch (error) {
    console.error("作业提交异常:", error);
    toast.error(`作业提交失败: ${error.message}`);
    return null;
  }
}

/**
 * 更新提交状态
 * @param submissionId 提交ID
 * @param status 新状态
 * @returns 更新成功返回true，否则返回false
 */
export async function updateSubmissionStatus(
  submissionId: string,
  status: string
) {
  try {
    const { error } = await supabase
      .from("homework_submissions")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (error) {
      console.error("更新提交状态失败:", error);
      toast.error(`更新提交状态失败: ${error.message}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("更新提交状态异常:", error);
    toast.error(`更新提交状态失败: ${error.message}`);
    return false;
  }
}

/**
 * 上传作业文件
 * @param file 文件对象
 * @param homeworkId 作业ID
 * @param studentId 学生ID
 * @returns 文件URL或null
 */
export async function uploadHomeworkFile(
  file: File,
  homeworkId: string,
  studentId: string
) {
  try {
    // 生成唯一文件名
    const fileExt = file.name.split(".").pop();
    const fileName = `${studentId}_${homeworkId}_${Date.now()}.${fileExt}`;
    const filePath = `${homeworkId}/${fileName}`;

    // 上传文件
    const { data, error } = await supabase.storage
      .from("homework_files")
      .upload(filePath, file);

    if (error) {
      console.error("文件上传失败:", error);
      toast.error(`文件上传失败: ${error.message}`);
      return null;
    }

    // 获取文件公共URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("homework_files").getPublicUrl(filePath);

    return {
      path: filePath,
      url: publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  } catch (error) {
    console.error("文件上传异常:", error);
    toast.error(`文件上传失败: ${error.message}`);
    return null;
  }
}

/**
 * 获取提交详情
 * @param submissionId 提交ID
 * @returns 提交详情对象或null
 */
export async function getSubmissionById(submissionId: string) {
  try {
    const { data, error } = await supabase
      .from("homework_submissions")
      .select(
        `
        *,
        homework (
          id, title, description, due_date, created_at,
          classes (id, name, subject)
        ),
        students (id, name, student_id),
        submission_knowledge_points (
          id, knowledge_point_id, mastery_level,
          knowledge_points (id, name, description)
        )
      `
      )
      .eq("id", submissionId)
      .single();

    if (error) {
      console.error("获取提交详情失败:", error);
      toast.error(`获取提交详情失败: ${error.message}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error("获取提交详情异常:", error);
    toast.error(`获取提交详情失败: ${error.message}`);
    return null;
  }
}
