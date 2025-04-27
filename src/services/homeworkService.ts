import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * 从Supabase获取作业详情
 * @param homeworkId 作业ID
 * @returns 作业详情对象或null
 */
export async function getHomeworkById(homeworkId: string) {
  try {
    // 首先尝试使用分步查询的方式
    let data: any = null;
    let error: any = null;
    
    // 第一步：尝试从homework表查询（单数形式）
    let response = await supabase
      .from('homework')
      .select(`
        *,
        classes (id, name)
      `)
      .eq('id', homeworkId)
      .single();
      
    // 如果查询失败，尝试使用homeworks表（复数形式）
    if (response.error) {
      console.log('单数形式homework查询失败，尝试复数形式homeworks');
      response = await supabase
        .from('homeworks')
        .select(`
          *,
          classes (id, name)
        `)
        .eq('id', homeworkId)
        .single();
    }
    
    // 检查查询结果
    data = response.data;
    error = response.error;
    
    if (error) {
      console.error('获取作业详情失败:', error);
      toast.error(`获取作业详情失败: ${error.message}`);
      return null;
    }

    // 创建返回对象
    const formattedData = {
      ...data,
      teachers: {
        name: '未知老师' // 默认值
      }
    };

    // 如果作业有创建者ID，单独查询教师信息
    if (data.created_by) {
      try {
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('id, name')
          .eq('id', data.created_by)
          .single();
          
        if (!teacherError && teacherData) {
          formattedData.teachers = {
            id: teacherData.id,
            name: teacherData.name
          };
        }
      } catch (err) {
        console.error('获取教师信息失败:', err);
        // 失败不阻止返回作业信息，保持默认教师名
      }
    }

    return formattedData;
  } catch (error) {
    console.error('获取作业详情异常:', error);
    toast.error(`获取作业详情失败: ${error.message}`);
    return null;
  }
}

/**
 * 获取作业的提交列表
 * @param homeworkId 作业ID
 * @returns 提交列表数组
 */
export async function getHomeworkSubmissions(homeworkId: string) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .select(`
        *,
        students (id, name, student_id),
        submission_knowledge_points (
          id,
          knowledge_point_id,
          mastery_level,
          knowledge_points (id, name)
        )
      `)
      .eq('homework_id', homeworkId);

    if (error) {
      console.error('获取作业提交列表失败:', error);
      toast.error(`获取作业提交列表失败: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取作业提交列表异常:', error);
    toast.error(`获取作业提交列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 提交作业评分
 * @param data 评分数据
 * @returns 成功或失败的结果对象
 */
export async function gradeHomework(data: {
  submissionId: string;
  score: number;
  feedback: string;
  knowledgePointEvaluations: Array<{
    id: string;
    masteryLevel: number;
  }>;
}) {
  try {
    // 更新提交状态和评分
    const { error: submissionError } = await supabase
      .from('homework_submissions')
      .update({
        score: data.score,
        feedback: data.feedback,
        status: 'graded',
        updated_at: new Date().toISOString()
      })
      .eq('id', data.submissionId);

    if (submissionError) {
      console.error('更新作业提交状态失败:', submissionError);
      toast.error(`评分失败: ${submissionError.message}`);
      return { success: false };
    }

    // 更新知识点评估
    for (const evaluation of data.knowledgePointEvaluations) {
      const { error: evalError } = await supabase
        .from('submission_knowledge_points')
        .update({
          mastery_level: evaluation.masteryLevel
        })
        .eq('id', evaluation.id);

      if (evalError) {
        console.error('更新知识点评估失败:', evalError);
        // 继续处理其他知识点，但记录错误
      }
    }

    toast.success('作业评分成功');
    return { success: true };
  } catch (error) {
    console.error('评分作业异常:', error);
    toast.error(`评分失败: ${error.message}`);
    return { success: false };
  }
}

/**
 * 获取所有作业列表
 * @returns 作业列表数组
 */
export async function getAllHomeworks() {
  try {
    // 首先尝试从homework表查询
    let response = await supabase
      .from('homework')
      .select(`
        *,
        classes (id, name)
      `)
      .order('created_at', { ascending: false });
      
    // 如果查询失败，尝试使用homeworks表
    if (response.error) {
      console.log('单数形式homework查询失败，尝试复数形式homeworks');
      response = await supabase
        .from('homeworks')
        .select(`
          *,
          classes (id, name)
        `)
        .order('created_at', { ascending: false });
    }
    
    const { data, error } = response;

    if (error) {
      console.error('获取作业列表失败:', error);
      toast.error(`获取作业列表失败: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取作业列表异常:', error);
    toast.error(`获取作业列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 按班级筛选作业列表
 * @param classId 班级ID
 * @returns 作业列表数组
 */
export async function getHomeworksByClassId(classId: string) {
  try {
    // 首先尝试从homework表查询
    let response = await supabase
      .from('homework')
      .select(`
        *,
        classes (id, name)
      `)
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
      
    // 如果查询失败，尝试使用homeworks表
    if (response.error) {
      console.log('单数形式homework查询失败，尝试复数形式homeworks');
      response = await supabase
        .from('homeworks')
        .select(`
          *,
          classes (id, name)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });
    }
    
    const { data, error } = response;

    if (error) {
      console.error('获取班级作业列表失败:', error);
      toast.error(`获取班级作业列表失败: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取班级作业列表异常:', error);
    toast.error(`获取班级作业列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 删除作业
 * @param homeworkId 作业ID
 * @returns 成功或失败的结果对象
 */
export async function deleteHomework(homeworkId: string) {
  try {
    // 首先检查是否有学生提交
    const { data: submissions, error: checkError } = await supabase
      .from('homework_submissions')
      .select('id')
      .eq('homework_id', homeworkId);

    if (checkError) {
      console.error('检查作业提交失败:', checkError);
      toast.error(`删除作业失败: ${checkError.message}`);
      return { success: false, hasSubmissions: false };
    }

    // 如果有提交，返回特殊标记
    if (submissions && submissions.length > 0) {
      return { success: false, hasSubmissions: true, submissionsCount: submissions.length };
    }

    // 没有提交，可以直接删除
    // 首先尝试从homework表删除
    let deleteResponse = await supabase
      .from('homework')
      .delete()
      .eq('id', homeworkId);
      
    // 如果删除失败，尝试从homeworks表删除
    if (deleteResponse.error) {
      console.log('从homework表删除失败，尝试从homeworks表删除');
      deleteResponse = await supabase
        .from('homeworks')
        .delete()
        .eq('id', homeworkId);
    }
    
    const { error } = deleteResponse;

    if (error) {
      console.error('删除作业失败:', error);
      toast.error(`删除作业失败: ${error.message}`);
      return { success: false, hasSubmissions: false };
    }

    toast.success('作业删除成功');
    return { success: true, hasSubmissions: false };
  } catch (error) {
    console.error('删除作业异常:', error);
    toast.error(`删除作业失败: ${error.message}`);
    return { success: false, hasSubmissions: false };
  }
}

/**
 * 更新作业信息
 * @param homeworkId 作业ID
 * @param data 更新数据
 * @returns 成功或失败的结果对象
 */
export async function updateHomework(
  homeworkId: string, 
  data: {
    title?: string;
    description?: string;
    class_id?: string;
    due_date?: string | null;
    grading_scale_id?: string | null;
  }
) {
  try {
    // 首先尝试更新homework表
    let updateResponse = await supabase
      .from('homework')
      .update(data)
      .eq('id', homeworkId);
      
    // 如果更新失败，尝试更新homeworks表
    if (updateResponse.error) {
      console.log('更新homework表失败，尝试更新homeworks表');
      updateResponse = await supabase
        .from('homeworks')
        .update(data)
        .eq('id', homeworkId);
    }
    
    const { error } = updateResponse;

    if (error) {
      console.error('更新作业失败:', error);
      toast.error(`更新作业失败: ${error.message}`);
      return { success: false };
    }

    toast.success('作业更新成功');
    return { success: true };
  } catch (error) {
    console.error('更新作业异常:', error);
    toast.error(`更新作业失败: ${error.message}`);
    return { success: false };
  }
}

/**
 * 获取学生的作业提交列表
 * @param studentId 学生ID
 * @returns 作业提交列表
 */
export async function getStudentHomeworkSubmissions(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .select(`
        *,
        homework (
          id,
          title,
          description,
          due_date,
          created_at,
          classes (id, name)
        )
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('获取学生作业提交列表失败:', error);
      toast.error(`获取作业提交列表失败: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取学生作业提交列表异常:', error);
    toast.error(`获取作业提交列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 创建新作业
 * @param data 作业数据
 * @returns 成功或失败的结果对象，成功时返回创建的作业ID
 */
export async function createHomework(data: {
  title: string;
  description?: string;
  class_id?: string;
  due_date?: string | null;
  grading_scale_id?: string | null;
  created_by: string; // 用户ID，必需
}) {
  try {
    // 确保created_by字段存在
    if (!data.created_by) {
      console.error('创建作业失败: 缺少用户ID');
      toast.error('创建作业失败: 用户认证问题');
      return { success: false, id: null };
    }

    const { data: newHomework, error } = await supabase
      .from('homework')
      .insert([data])
      .select('id')
      .single();

    if (error) {
      console.error('创建作业失败:', error);
      toast.error(`创建作业失败: ${error.message}`);
      return { success: false, id: null };
    }

    toast.success('作业创建成功');
    return { success: true, id: newHomework?.id || null };
  } catch (error: any) {
    console.error('创建作业异常:', error);
    toast.error(`创建作业失败: ${error.message || '未知错误'}`);
    return { success: false, id: null };
  }
} 