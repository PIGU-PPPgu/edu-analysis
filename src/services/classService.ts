import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * 获取所有班级
 * @returns 班级列表数组
 */
export async function getAllClasses() {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name');

    if (error) {
      console.error('获取班级列表失败:', error);
      toast.error(`获取班级列表失败: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取班级列表异常:', error);
    toast.error(`获取班级列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 根据ID获取班级详情
 * @param classId 班级ID
 * @returns 班级详情对象或null
 */
export async function getClassById(classId: string) {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) {
      console.error('获取班级详情失败:', error);
      toast.error(`获取班级详情失败: ${error.message}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('获取班级详情异常:', error);
    toast.error(`获取班级详情失败: ${error.message}`);
    return null;
  }
}

/**
 * 创建新班级
 * @param classData 班级数据对象
 * @returns 创建的班级对象或null
 */
export async function createClass(classData: { name: string; grade: string }) {
  try {
    const { data, error } = await supabase
      .from('classes')
      .insert([classData])
      .select();

    if (error) {
      console.error('创建班级失败:', error);
      toast.error(`创建班级失败: ${error.message}`);
      return null;
    }

    toast.success('班级创建成功');
    return data?.[0] || null;
  } catch (error) {
    console.error('创建班级异常:', error);
    toast.error(`创建班级失败: ${error.message}`);
    return null;
  }
}

/**
 * 更新班级信息
 * @param classId 班级ID
 * @param classData 更新的班级数据
 * @returns 是否成功
 */
export async function updateClass(
  classId: string,
  classData: { name?: string; grade?: string }
) {
  try {
    const { error } = await supabase
      .from('classes')
      .update(classData)
      .eq('id', classId);

    if (error) {
      console.error('更新班级信息失败:', error);
      toast.error(`更新班级信息失败: ${error.message}`);
      return false;
    }

    toast.success('班级信息更新成功');
    return true;
  } catch (error) {
    console.error('更新班级信息异常:', error);
    toast.error(`更新班级信息失败: ${error.message}`);
    return false;
  }
}

/**
 * 删除班级
 * @param classId 班级ID
 * @returns 是否成功
 */
export async function deleteClass(classId: string) {
  try {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) {
      console.error('删除班级失败:', error);
      toast.error(`删除班级失败: ${error.message}`);
      return false;
    }

    toast.success('班级删除成功');
    return true;
  } catch (error) {
    console.error('删除班级异常:', error);
    toast.error(`删除班级失败: ${error.message}`);
    return false;
  }
}

/**
 * 获取班级学生列表
 * @param classId 班级ID
 * @returns 学生列表数组
 */
export async function getClassStudents(classId: string) {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('name');

    if (error) {
      console.error('获取班级学生列表失败:', error);
      toast.error(`获取班级学生列表失败: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取班级学生列表异常:', error);
    toast.error(`获取班级学生列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取班级作业列表
 * @param classId 班级ID
 * @returns 作业列表数组
 */
export async function getClassHomeworks(classId: string) {
  try {
    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

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