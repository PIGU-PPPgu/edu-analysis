import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KnowledgePoint } from '@/types/homework';

/**
 * 判断两个字符串是否相似
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 是否相似
 */
export function areStringSimilar(str1: string, str2: string): boolean {
  // 1. 清理文本：移除标点符号和多余的空格
  const normalize = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, '') // 移除标点符号，保留中文字符
      .replace(/\s+/g, ' ')                 // 压缩多余空格
      .trim();
  };
  
  const normalized1 = normalize(str1);
  const normalized2 = normalize(str2);
  
  // 2. 完全匹配检查
  if (normalized1 === normalized2) return true;
  
  // 3. 包含关系检查
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    // 如果一个是另一个的子串，且长度差异不大，认为是相似的
    const minLength = Math.min(normalized1.length, normalized2.length);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    
    // 如果长度之比超过80%，认为是相似的
    if (minLength / maxLength > 0.8) return true;
  }
  
  // 4. 计算编辑距离（莱文斯坦距离）
  const levenshteinDistance = (s1: string, s2: string): number => {
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;
    
    const matrix: number[][] = [];
    
    // 初始化矩阵
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }
    
    // 填充矩阵
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 替换
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j] + 1      // 删除
          );
        }
      }
    }
    
    return matrix[s1.length][s2.length];
  };
  
  // 计算相似度
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  // 如果编辑距离小于30%的字符串长度，认为是相似的
  if (maxLength > 0 && distance / maxLength < 0.3) {
    return true;
  }
  
  return false;
}

/**
 * 获取作业相关的知识点列表
 * @param homeworkId 作业ID
 * @returns 知识点列表
 */
export async function getKnowledgePointsByHomeworkId(homeworkId: string) {
  try {
    const { data, error } = await supabase
      .from('knowledge_points')
      .select('*')
      .eq('homework_id', homeworkId);
    
    if (error) {
      console.error('获取知识点列表失败:', error);
      toast.error(`获取知识点列表失败: ${error.message}`);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('获取知识点列表异常:', error);
    toast.error(`获取知识点列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取所有知识点
 * @returns 所有知识点列表
 */
export async function getAllKnowledgePoints() {
  try {
    const { data, error } = await supabase
      .from('knowledge_points')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('获取知识点列表失败:', error);
      toast.error(`获取知识点列表失败: ${error.message}`);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('获取知识点列表异常:', error);
    toast.error(`获取知识点列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 创建新知识点
 * @param knowledgePoint 知识点数据
 * @returns 创建的知识点数据
 */
export async function createKnowledgePoint(knowledgePoint: {
  name: string;
  description?: string;
  homework_id: string;
}) {
  try {
    // 获取作业的所有现有知识点
    const { data: existingPoints, error: fetchError } = await supabase
      .from('knowledge_points')
      .select('id, name')
      .eq('homework_id', knowledgePoint.homework_id);
    
    if (fetchError) {
      console.error('获取现有知识点失败:', fetchError);
      toast.error(`创建知识点失败: ${fetchError.message}`);
      return { data: null, success: false, message: fetchError.message };
    }
    
    // 检查相似知识点
    for (const existing of existingPoints || []) {
      if (areStringSimilar(existing.name, knowledgePoint.name)) {
        console.log(`发现相似知识点: "${existing.name}" 与 "${knowledgePoint.name}"`);
        return { 
          data: existing, 
          success: true, 
          message: `已存在相似知识点 "${existing.name}"，避免重复创建` 
        };
      }
    }
    
    // 创建新知识点
    const { data, error } = await supabase
      .from('knowledge_points')
      .insert(knowledgePoint)
      .select()
      .single();
    
    if (error) {
      console.error('创建知识点失败:', error);
      toast.error(`创建知识点失败: ${error.message}`);
      return { data: null, success: false, message: error.message };
    }
    
    return { data, success: true, message: '知识点创建成功' };
  } catch (error) {
    console.error('创建知识点异常:', error);
    toast.error(`创建知识点失败: ${error.message}`);
    return { data: null, success: false, message: error.message };
  }
}

/**
 * 批量创建知识点
 * @param knowledgePoints 知识点数据数组
 * @param homeworkId 作业ID
 * @returns 创建结果
 */
export async function bulkCreateKnowledgePoints(knowledgePoints: KnowledgePoint[], homeworkId: string) {
  // 保存到localStorage作为备份
  try {
    const localStorageKey = `homework_${homeworkId}_knowledge_points`;
    localStorage.setItem(localStorageKey, JSON.stringify(knowledgePoints));
    console.log('已将知识点保存到本地存储作为备份', localStorageKey);
  } catch (localStoreError) {
    console.warn('保存到本地存储失败:', localStoreError);
  }

  try {
    // 先获取所有现有知识点，避免重复请求数据库
    const { data: existingPoints, error: fetchError } = await supabase
      .from('knowledge_points')
      .select('id, name')
      .eq('homework_id', homeworkId);
    
    if (fetchError) {
      console.error('获取现有知识点失败:', fetchError);
      toast.error(`创建知识点失败: ${fetchError.message}`);
      return { 
        success: true, 
        message: '保存到Supabase失败，但已保存到本地', 
        skippedPoints: [],
        localSaved: true
      };
    }
    
    const results = [];
    const skippedPoints = [];
    const successfulPoints = [];
    
    // 逐个创建知识点，避免批量操作失败
    for (const kp of knowledgePoints) {
      // 检查相似知识点
      let similarFound = false;
      
      for (const existing of existingPoints || []) {
        if (areStringSimilar(existing.name, kp.name)) {
          console.log(`跳过相似知识点: "${existing.name}" 与 "${kp.name}"`);
          skippedPoints.push({
            new: kp.name,
            existing: existing.name
          });
          similarFound = true;
          break;
        }
      }
      
      if (!similarFound) {
        // 创建新知识点
        try {
          const result = await supabase
            .from('knowledge_points')
            .insert({
              name: kp.name,
              description: kp.description,
              homework_id: homeworkId
            })
            .select()
            .single();
          
          results.push({
            success: !result.error,
            message: result.error?.message || '创建成功',
            data: result.data
          });
          
          // 如果创建成功，添加到现有知识点列表，防止后续重复创建
          if (result.data) {
            existingPoints.push(result.data);
            successfulPoints.push(result.data);
          }
        } catch (insertError) {
          console.error('插入知识点失败:', insertError);
          results.push({
            success: false,
            message: insertError.message || '插入失败',
            data: null
          });
        }
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    // 如果有跳过的相似知识点
    if (skippedPoints.length > 0) {
      console.log('跳过了以下相似知识点:', skippedPoints);
    }
    
    // 构建消息
    let message = '';
    if (results.length === 0 && skippedPoints.length === 0) {
      message = '没有新知识点需要创建';
    } else if (results.length === 0 && skippedPoints.length > 0) {
      message = `所有 ${skippedPoints.length} 个知识点与现有知识点相似，已跳过`;
    } else if (successCount === results.length) {
      message = `成功创建 ${successCount} 个知识点` + 
        (skippedPoints.length > 0 ? `，跳过 ${skippedPoints.length} 个相似知识点` : '');
    } else {
      message = `部分知识点创建失败: ${successCount}/${results.length} 成功` +
        (skippedPoints.length > 0 ? `，跳过 ${skippedPoints.length} 个相似知识点` : '');
    }
    
    // 显示适当的提示
    if (results.length === 0 || successCount === results.length) {
      toast.success(message);
      return { 
        success: true, 
        message, 
        skippedPoints,
        knowledgePoints: successfulPoints 
      };
    } else {
      toast.warning(message);
      return { 
        success: true, // 改为true，因为我们有本地备份
        message: message + "（已保存到本地作为备份）", 
        skippedPoints,
        knowledgePoints: successfulPoints,
        localSaved: true
      };
    }
  } catch (error) {
    console.error('批量创建知识点异常:', error);
    toast.warning(`保存到数据库失败，但已保存到本地: ${error.message}`);
    return { 
      success: true, 
      message: `保存到数据库失败，但已保存到本地: ${error.message}`,
      skippedPoints: [],
      localSaved: true
    };
  }
}

/**
 * 更新知识点评估
 * @param submissionId 提交ID
 * @param evaluations 知识点评估数据
 * @returns 更新结果
 */
export async function updateKnowledgePointEvaluations(
  submissionId: string,
  evaluations: Array<{
    knowledgePointId: string;
    masteryLevel: number;
    evaluationId?: string;
  }>
) {
  try {
    const results = [];
    
    for (const evaluation of evaluations) {
      if (evaluation.evaluationId) {
        // 更新现有评估
        const { error } = await supabase
          .from('submission_knowledge_points')
          .update({
            mastery_level: evaluation.masteryLevel,
            updated_at: new Date().toISOString()
          })
          .eq('id', evaluation.evaluationId);
        
        results.push({ success: !error, message: error?.message || '更新成功' });
      } else {
        // 创建新评估
        const { error } = await supabase
          .from('submission_knowledge_points')
          .insert({
            submission_id: submissionId,
            knowledge_point_id: evaluation.knowledgePointId,
            mastery_level: evaluation.masteryLevel
          });
        
        results.push({ success: !error, message: error?.message || '创建成功' });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    if (successCount === results.length) {
      return { success: true, message: '知识点评估更新成功' };
    } else {
      return { 
        success: false, 
        message: `部分知识点评估更新失败: ${successCount}/${results.length} 成功`
      };
    }
  } catch (error) {
    console.error('更新知识点评估异常:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 创建子知识点（将知识点划分为更细粒度）
 * @param parentId 父知识点ID
 * @param childData 子知识点数据
 * @returns 创建的子知识点
 */
export async function createChildKnowledgePoint(
  parentId: string,
  childData: {
    name: string;
    description?: string;
  }
) {
  try {
    // 获取父知识点信息
    const { data: parentData, error: parentError } = await supabase
      .from('knowledge_points')
      .select('homework_id')
      .eq('id', parentId)
      .single();
    
    if (parentError) {
      console.error('获取父知识点失败:', parentError);
      toast.error(`创建子知识点失败: ${parentError.message}`);
      return { data: null, success: false, message: parentError.message };
    }
    
    // 创建子知识点
    const { data, error } = await supabase
      .from('knowledge_points')
      .insert({
        name: childData.name,
        description: childData.description,
        homework_id: parentData.homework_id,
        parent_id: parentId
      })
      .select()
      .single();
    
    if (error) {
      console.error('创建子知识点失败:', error);
      toast.error(`创建子知识点失败: ${error.message}`);
      return { data: null, success: false, message: error.message };
    }
    
    toast.success('子知识点创建成功');
    return { data, success: true, message: '子知识点创建成功' };
  } catch (error) {
    console.error('创建子知识点异常:', error);
    toast.error(`创建子知识点失败: ${error.message}`);
    return { data: null, success: false, message: error.message };
  }
}

/**
 * 删除知识点
 * @param knowledgePointId 知识点ID
 * @returns 删除结果
 */
export async function deleteKnowledgePoint(knowledgePointId: string) {
  try {
    // 检查是否有评估记录引用此知识点
    const { data: evaluations, error: checkError } = await supabase
      .from('submission_knowledge_points')
      .select('count')
      .eq('knowledge_point_id', knowledgePointId);
    
    if (checkError) {
      console.error('检查知识点使用情况失败:', checkError);
      toast.error(`删除知识点失败: ${checkError.message}`);
      return { success: false, message: checkError.message };
    }
    
    // 如果有评估记录，则不允许删除
    if (evaluations && evaluations.length > 0) {
      toast.error('该知识点已被评估使用，无法删除');
      return { success: false, message: '该知识点已被评估使用，无法删除' };
    }
    
    // 删除知识点
    const { error } = await supabase
      .from('knowledge_points')
      .delete()
      .eq('id', knowledgePointId);
    
    if (error) {
      console.error('删除知识点失败:', error);
      toast.error(`删除知识点失败: ${error.message}`);
      return { success: false, message: error.message };
    }
    
    toast.success('知识点删除成功');
    return { success: true, message: '知识点删除成功' };
  } catch (error) {
    console.error('删除知识点异常:', error);
    toast.error(`删除知识点失败: ${error.message}`);
    return { success: false, message: error.message };
  }
} 