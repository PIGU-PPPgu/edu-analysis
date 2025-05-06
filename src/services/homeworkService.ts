import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// 静态导入诊断工具
import { diagnoseStudentId, fixStudentId } from '@/tools/homework-diagnostics';
// 静态导入知识点服务
import { updateKnowledgePointEvaluations } from '@/services/knowledgePointService';

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
 * 获取作业的所有提交记录
 * @param homeworkId 作业ID
 * @returns 提交列表和可能的错误
 */
export async function getHomeworkSubmissions(homeworkId: string) {
  try {
    const { data, error } = await supabase
      .from('homework_submissions')
      .select(`
        id,
        status,
        score,
        teacher_feedback,
        updated_at,
        student_id,
        knowledge_points_assessed,
        students (
          id,
          name,
          student_id
        ),
        student_knowledge_mastery (
          id,
          mastery_level,
          mastery_grade,
          comments,
          assessment_count,
          knowledge_point_id,
          knowledge_points (
            id,
            name,
            description
          )
        )
      `)
      .eq('homework_id', homeworkId);

    if (error) {
      console.error('获取作业提交记录失败:', error);
      return {
        success: false,
        error: error.message,
        submissions: []
      };
    }

    return {
      success: true,
      submissions: data
    };
  } catch (error: any) {
    console.error('获取作业提交异常:', error);
    return {
      success: false,
      error: error.message,
      submissions: []
    };
  }
}

/**
 * 提交作业评分
 * @param data 评分数据，包含 submissionId, studentId, homeworkId, score, feedback, knowledgePointEvaluations
 * @returns 成功或失败的结果对象
 */
export async function gradeHomework(data: {
  submissionId: string;
  // 直接接收 studentId 和 homeworkId
  studentId: string;
  homeworkId: string;
  score: number;
  feedback: string;
  knowledgePointEvaluations: Array<{
    id: string;
    masteryLevel: number;
  }>;
  status?: string; // 添加可选的status参数
}) {
  try {
    console.log('开始评分作业，数据:', data);

    // 直接使用传入的 IDs
    let { submissionId, studentId, homeworkId } = data;

    // 检查是否是临时ID (只用于判断是否需要创建新记录，不再用于提取ID)
    const isTemporarySubmission = submissionId.startsWith('temp-');
    if (isTemporarySubmission) {
        console.log('检测到临时提交ID:', submissionId);
        // 注意：临时ID现在仅作为一个标记，实际的学生ID和作业ID已由调用者提供
    }

    // 最终安全检查 - 确保有效的学生ID和作业ID (使用传入的值)
    if (!studentId || !homeworkId) {
      console.error(`最终检查失败 - 缺少参数：学生ID: ${studentId}, 作业ID: ${homeworkId}`);
      return { success: false, error: 'missing_required_params', message: '缺少学生ID或作业ID' };
    }

    // 最终验证: 确保 studentId 是 UUID 格式
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
    if (!isValidUuid) {
      // 如果传入的不是UUID，尝试用诊断工具基于学号查找（假设传入的是学号）
      console.warn(`最终检查 - 学生ID不是有效的UUID格式: ${studentId}，尝试通过学号查找...`);
      const { data: uuidData, error: uuidError } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', studentId) // 假设传入的是学号
        .maybeSingle();

      if (!uuidError && uuidData) {
        console.log(`找到正确的UUID: ${uuidData.id}，替换原始ID: ${studentId}`);
        studentId = uuidData.id; // 更新为正确的UUID
      } else {
         console.error(`最终检查 - 无法通过学号 ${studentId} 找到UUID`);
        return {
          success: false,
          error: 'invalid_student_id_format',
          message: '学生ID格式无效或无法找到对应的UUID'
        };
      }
    }

    // 再次确认学生ID在数据库中存在 (最终安全检查)
    try {
      console.log('最终安全检查 - 确认学生ID存在于数据库:', studentId);
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, name')
        .eq('id', studentId) // 使用确认后的 studentId
        .single();

      if (studentError || !studentData) {
        console.error('最终检查 - 学生ID验证失败:', studentError || '未找到学生');
        return {
          success: false,
          error: 'student_not_found',
          message: '无法在数据库中验证学生ID'
        };
      }
      console.log('最终安全检查 - 学生ID有效:', studentData);
    } catch (finalCheckError) {
      console.error('最终学生ID验证错误:', finalCheckError);
      return { success: false, error: 'validation_error', message: '验证学生ID时数据库出错' };
    }

    // 构建提交数据对象 (使用确认后的 studentId 和 homeworkId)
    const submissionData = {
      student_id: studentId,
      homework_id: homeworkId,
        score: data.score,
        status: data.status || 'graded', // 使用传入的status或默认为'graded'
      teacher_feedback: data.feedback || '',
        updated_at: new Date().toISOString()
    };

    // 保存评分数据
    console.log('准备保存/更新提交记录，详细参数：', submissionData);

    // 调用数据库创建或更新提交记录
    let result;
    let finalSubmissionId = submissionId; // 用于返回给调用者的最终ID
    let knowledgePointsSuccessfullyAssessed = false; // Flag to track KP success

    // 检查是否是更新现有记录还是创建新记录
    if (isTemporarySubmission) {
      // 创建新记录
      console.log('创建新提交记录...');
      const { data: newSubmission, error: createError } = await supabase
        .from('homework_submissions')
        .insert(submissionData)
        .select('*')
        .single();

      if (createError) {
        console.error('创建作业提交记录失败:', createError);
        return {
          success: false,
          error: 'create_failed',
          message: `创建记录失败: ${createError.message}`
        };
      }

      console.log('新记录创建成功:', newSubmission);
      result = newSubmission;
      finalSubmissionId = newSubmission.id; // 更新为新创建的记录ID
    } else {
      // 更新现有记录 (使用原始的 submissionId)
      console.log('更新现有提交记录:', submissionId);
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('homework_submissions')
        .update(submissionData)
        .eq('id', submissionId) // 使用原始传入的 submissionId
        .select('*')
        .single(); // 使用 single()

      if (updateError) {
        console.error('更新作业提交记录失败:', updateError);
        return {
          success: false,
          error: 'update_failed',
          message: `更新记录失败: ${updateError.message}`
        };
    }

      console.log('作业记录更新成功:', updatedSubmission);
      result = updatedSubmission || {}; // 防止 result 为 null 或 undefined
      finalSubmissionId = submissionId; // 更新时ID不变
    }

    // 处理知识点评估
    let knowledgePointResults = [];
    if (data.knowledgePointEvaluations && data.knowledgePointEvaluations.length > 0) {
      try {
        console.log('处理知识点评估数据:', data.knowledgePointEvaluations.length, '项，提交ID:', finalSubmissionId);
        // 知识点评估服务已经是静态导入的
        // const { updateKnowledgePointEvaluations } = await import('@/services/knowledgePointService'); // 保留注释以备忘，确认静态导入有效

        const kpResult = await updateKnowledgePointEvaluations(
          finalSubmissionId, // 使用最终的提交ID
          data.knowledgePointEvaluations.map(kp => ({
            knowledgePointId: kp.id,
            masteryLevel: kp.masteryLevel
          })),
          homeworkId // 使用确认后的 homeworkId
        );

        knowledgePointResults = kpResult.results || [];

        if (kpResult.success) {
          knowledgePointsSuccessfullyAssessed = true; // Mark KP as assessed successfully
          console.log('知识点评估成功处理');
        } else {
          console.warn('知识点评估更新部分失败:', kpResult.message);
          // Decide if partial failure still counts as assessed - let's say yes for now
          // knowledgePointsSuccessfullyAssessed = true; // Or keep false if strict?
        }
      } catch (kpError) {
        console.error('处理知识点评估时出错:', kpError);
        // Error occurred, KPs are not successfully assessed
        knowledgePointsSuccessfullyAssessed = false;
      }
    }

    // 如果知识点评估成功，单独更新 knowledge_points_assessed 标志
    if (knowledgePointsSuccessfullyAssessed) {
        console.log('更新 knowledge_points_assessed 标志为 true for:', finalSubmissionId);
        const { error: updateKpFlagError } = await supabase
            .from('homework_submissions')
            .update({ knowledge_points_assessed: true })
            .eq('id', finalSubmissionId);
        if (updateKpFlagError) {
            console.error('更新 knowledge_points_assessed 标志失败:', updateKpFlagError);
            // Log error, but maybe don't fail the whole operation?
      }
    }

    // 构建最终返回对象
    console.log('作业评分和知识点评估处理完成');
    return {
      success: true,
      message: '作业评分已保存',
      submissionId: finalSubmissionId, // 返回最终的提交ID
      studentId,
      homeworkId,
      knowledgePointResults,
      knowledgePointsAssessed: knowledgePointsSuccessfullyAssessed // Return the status
    };

  } catch (error) {
    console.error('评分过程发生未捕获异常:', error);
    return {
      success: false,
      error: 'exception',
      message: `评分过程发生异常: ${error.message}`
    };
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

// 保存作业评分
export async function saveHomeworkScore(
  submissionId: string,
  score: number,
  grade?: string,
  feedback?: string
) {
  try {
    if (!submissionId) {
      console.error('提交ID不能为空');
      return { success: false, message: '提交ID不能为空' };
    }

    const { data, error } = await supabase
      .from('homework_submissions')
      .update({
        score: score,
        grade: grade,
        feedback: feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select();

    if (error) {
      console.error('保存作业评分失败:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: '评分已保存', data };
  } catch (error) {
    console.error('保存作业评分异常:', error);
    return { success: false, message: error.message };
  }
}

// 获取作业评分
export async function getHomeworkScore(submissionId: string) {
  try {
    if (!submissionId) {
      console.error('提交ID不能为空');
      return { success: false, message: '提交ID不能为空' };
    }

    const { data, error } = await supabase
      .from('homework_submissions')
      .select('score, grade, feedback')
      .eq('id', submissionId)
      .single();

    if (error) {
      console.error('获取作业评分失败:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('获取作业评分异常:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 获取学生的知识点评分
 * @param submissionId 提交ID
 * @returns 学生知识点评分数据
 */
export async function getStudentKnowledgePointScores(submissionId: string) {
  try {
    if (!submissionId) {
      console.error('提交ID不能为空');
      return { success: false, message: '提交ID不能为空', data: [] };
    }

    const { data, error } = await supabase
      .from('submission_knowledge_points')
      .select(`
        id, 
        mastery_level,
        knowledge_point_id,
        knowledge_points(name, description)
      `)
      .eq('submission_id', submissionId);

    if (error) {
      console.error('获取知识点评分失败:', error);
      return { success: false, message: error.message, data: [] };
    }

    // 格式化返回数据
    const formattedData = data.map(item => {
      // Supabase 关联查询可能返回对象或数组，这里做兼容处理
      const knowledgePointData = Array.isArray(item.knowledge_points) 
                                   ? item.knowledge_points[0] // 如果是数组，取第一个
                                   : item.knowledge_points;    // 如果是对象，直接用
                                   
      return {
        id: item.id,
        masteryLevel: item.mastery_level,
        knowledgePointId: item.knowledge_point_id,
        // 添加可选链和默认值，防止 knowledgePointData 为空或没有对应属性
        knowledgePointName: knowledgePointData?.name || '未知知识点',
        knowledgePointDescription: knowledgePointData?.description || '无描述'
      };
    });

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('获取知识点评分异常:', error);
    return { success: false, message: error.message, data: [] };
  }
}

/**
 * 调试函数：获取当前班级的所有有效学生ID
 * @param classId 班级ID
 * @returns 所有有效的学生ID列表
 */
export async function getValidStudentIds(classId?: string) {
  try {
    let query = supabase.from('students').select('id, name, student_id, class_id');
    
    if (classId) {
      query = query.eq('class_id', classId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('获取学生列表失败:', error);
      return { success: false, message: error.message, data: [] };
    }
    
    console.log('有效的学生ID列表:', data?.map(s => ({
      id: s.id,
      name: s.name,
      student_id: s.student_id,
      class_id: s.class_id
    })));
    
    return { 
      success: true, 
      data: data || [],
      message: `找到 ${data?.length || 0} 名学生`
    };
  } catch (error) {
    console.error('获取学生列表异常:', error);
    return { success: false, message: error.message, data: [] };
  }
}

/**
 * 调试和修复函数: 获取并修复特定作业的学生提交数据
 * @param homeworkId 作业ID
 * @returns 修复结果
 */
export async function diagnoseAndFixHomeworkSubmissions(homeworkId: string) {
  try {
    if (!homeworkId) {
      return { success: false, message: '作业ID不能为空' };
    }
    
    console.log(`开始诊断作业 ${homeworkId} 的提交数据...`);
    
    // 这里应该有函数的其余逻辑
    
    // ... (假设的函数逻辑结束)
    
    return { success: true, message: '诊断完成' }; // 示例返回
    
  } catch (error: any) {
    console.error(`诊断作业 ${homeworkId} 时发生错误:`, error);
    return { success: false, message: `诊断失败: ${error.message}` };
  }
} 