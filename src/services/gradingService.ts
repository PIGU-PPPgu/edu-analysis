import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GradingScaleLevel {
  id?: string;
  name: string;
  min_score: number;
  max_score: number;
  color?: string;
  description?: string;
  position: number;
}

export interface GradingScale {
  id?: string;
  name: string;
  created_by?: string;
  created_at?: string;
  is_default?: boolean;
  levels?: GradingScaleLevel[];
}

/**
 * 获取所有评级标准
 */
export async function getGradingScales() {
  try {
    const { data, error } = await supabase
      .from('grading_scales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取评级标准失败:', error);
      toast.error(`获取评级标准失败: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取评级标准异常:', error);
    toast.error(`获取评级标准失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取评级标准详情(包含等级)
 */
export async function getGradingScaleWithLevels(scaleId: string) {
  try {
    // 获取评级标准基本信息
    const { data: scale, error: scaleError } = await supabase
      .from('grading_scales')
      .select('*')
      .eq('id', scaleId)
      .single();

    if (scaleError) {
      console.error('获取评级标准失败:', scaleError);
      toast.error(`获取评级标准失败: ${scaleError.message}`);
      return null;
    }

    // 获取评级等级
    const { data: levels, error: levelsError } = await supabase
      .from('grading_scale_levels')
      .select('*')
      .eq('scale_id', scaleId)
      .order('position', { ascending: true });

    if (levelsError) {
      console.error('获取评级等级失败:', levelsError);
      toast.error(`获取评级等级失败: ${levelsError.message}`);
      return null;
    }

    return { ...scale, levels: levels || [] };
  } catch (error) {
    console.error('获取评级标准详情异常:', error);
    toast.error(`获取评级标准详情失败: ${error.message}`);
    return null;
  }
}

/**
 * 创建新的评级标准
 */
export async function createGradingScale(scale: GradingScale) {
  try {
    // 创建评级标准
    const { data: newScale, error: scaleError } = await supabase
      .from('grading_scales')
      .insert({
        name: scale.name,
        created_by: scale.created_by,
        is_default: scale.is_default || false
      })
      .select()
      .single();

    if (scaleError) {
      console.error('创建评级标准失败:', scaleError);
      toast.error(`创建评级标准失败: ${scaleError.message}`);
      return null;
    }

    // 创建评级等级
    if (scale.levels && scale.levels.length > 0) {
      const levelsToInsert = scale.levels.map(level => ({
        scale_id: newScale.id,
        name: level.name,
        min_score: level.min_score,
        max_score: level.max_score,
        color: level.color,
        description: level.description,
        position: level.position
      }));

      const { error: levelsError } = await supabase
        .from('grading_scale_levels')
        .insert(levelsToInsert);

      if (levelsError) {
        console.error('创建评级等级失败:', levelsError);
        toast.error(`创建评级等级失败: ${levelsError.message}`);
        return null;
      }
    }

    toast.success('创建评级标准成功');
    return newScale;
  } catch (error) {
    console.error('创建评级标准异常:', error);
    toast.error(`创建评级标准失败: ${error.message}`);
    return null;
  }
}

/**
 * 更新评级标准
 */
export async function updateGradingScale(scale: GradingScale) {
  if (!scale.id) {
    toast.error('更新评级标准失败: 缺少评级标准ID');
    return false;
  }

  try {
    // 更新评级标准基本信息
    const { error: scaleError } = await supabase
      .from('grading_scales')
      .update({
        name: scale.name,
        is_default: scale.is_default
      })
      .eq('id', scale.id);

    if (scaleError) {
      console.error('更新评级标准失败:', scaleError);
      toast.error(`更新评级标准失败: ${scaleError.message}`);
      return false;
    }

    // 如果有提供等级信息，先删除旧的等级，再创建新的等级
    if (scale.levels && scale.levels.length > 0) {
      // 删除旧的等级
      const { error: deleteError } = await supabase
        .from('grading_scale_levels')
        .delete()
        .eq('scale_id', scale.id);

      if (deleteError) {
        console.error('删除旧评级等级失败:', deleteError);
        toast.error(`更新评级等级失败: ${deleteError.message}`);
        return false;
      }

      // 创建新的等级
      const levelsToInsert = scale.levels.map(level => ({
        scale_id: scale.id,
        name: level.name,
        min_score: level.min_score,
        max_score: level.max_score,
        color: level.color,
        description: level.description,
        position: level.position
      }));

      const { error: insertError } = await supabase
        .from('grading_scale_levels')
        .insert(levelsToInsert);

      if (insertError) {
        console.error('创建新评级等级失败:', insertError);
        toast.error(`更新评级等级失败: ${insertError.message}`);
        return false;
      }
    }

    toast.success('更新评级标准成功');
    return true;
  } catch (error) {
    console.error('更新评级标准异常:', error);
    toast.error(`更新评级标准失败: ${error.message}`);
    return false;
  }
}

/**
 * 删除评级标准
 */
export async function deleteGradingScale(scaleId: string) {
  try {
    // 首先检查该评级标准是否被作业引用
    const { data: referencedHomeworks, error: checkError } = await supabase
      .from('homework')
      .select('id, title')
      .eq('grading_scale_id', scaleId)
      .limit(5);
    
    if (checkError) {
      console.error('检查评级标准引用失败:', checkError);
      toast.error(`删除评级标准失败: ${checkError.message}`);
      return false;
    }
    
    // 如果被引用，则不允许删除
    if (referencedHomeworks && referencedHomeworks.length > 0) {
      const homeworkTitles = referencedHomeworks.map(hw => `"${hw.title}"`).join(', ');
      const errorMessage = `无法删除评级标准：该评级标准正在被以下作业使用：${homeworkTitles}。请先将这些作业的评级标准设置为其他值，或删除这些作业后再尝试删除。`;
      console.error(errorMessage);
      toast.error(errorMessage, {
        duration: 8000 // 延长显示时间，让用户能看清
      });
      return false;
    }

    // 没有被引用，可以安全删除
    const { error } = await supabase
      .from('grading_scales')
      .delete()
      .eq('id', scaleId);

    if (error) {
      // 增强错误处理 - 检查是否是外键约束错误
      if (error.code === '23503') { // Foreign key violation
        console.error('删除评级标准失败 - 外键约束:', error);
        toast.error(`无法删除评级标准：该评级标准正在被其他记录引用。错误代码：${error.code}`, {
          duration: 8000
        });
      } else {
        console.error('删除评级标准失败:', error);
        toast.error(`删除评级标准失败: ${error.message}`, {
          duration: 3000
        });
      }
      return false;
    }

    toast.success('删除评级标准成功');
    return true;
  } catch (error) {
    console.error('删除评级标准异常:', error);
    toast.error(`删除评级标准失败: ${error.message}`);
    return false;
  }
}

/**
 * 评分转换为等级
 * @param score 分数
 * @param levels 等级列表
 * @returns 对应的等级名称
 */
export function scoreToCustomGrade(score: number, levels: GradingScaleLevel[]): GradingScaleLevel | null {
  if (!levels || levels.length === 0) return null;
  
  // 按照分数范围找到匹配的等级
  return levels.find(level => 
    score >= level.min_score && score <= level.max_score
  ) || null;
} 