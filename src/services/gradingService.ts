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
    const { error } = await supabase
      .from('grading_scales')
      .delete()
      .eq('id', scaleId);

    if (error) {
      console.error('删除评级标准失败:', error);
      toast.error(`删除评级标准失败: ${error.message}`);
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