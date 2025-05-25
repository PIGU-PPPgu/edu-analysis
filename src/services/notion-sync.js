import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 初始化Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 将进度数据同步到Notion
 * @param {Array} modules - 模块进度数据数组
 * @returns {Promise<Object>} - 同步结果
 */
export async function syncProgressToNotion(modules) {
  try {
    // 调用同步Edge Function
    const { data, error } = await supabase.functions.invoke('sync-notion-data/sync-progress', {
      body: { modules },
    });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('同步到Notion失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 从Notion获取进度数据
 * @returns {Promise<Object>} - 进度数据
 */
export async function getProgressFromNotion() {
  try {
    // 调用获取数据Edge Function
    const { data, error } = await supabase.functions.invoke('sync-notion-data/progress');
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('从Notion获取数据失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 从进度统计文件创建模块数据，并同步到Notion
 * @returns {Promise<Object>} - 同步结果
 */
export async function syncAllModules() {
  try {
    // 首先从数据库获取模块数据
    const { data: modules, error } = await supabase
      .from('modules')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    // 将数据格式化为Notion需要的格式
    const formattedModules = modules.map(module => ({
      name: module.name,
      progress: module.progress,
      status: module.status
    }));
    
    // 同步到Notion
    return await syncProgressToNotion(formattedModules);
  } catch (error) {
    console.error('同步所有模块失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 从Notion获取数据并更新到Supabase数据库
 * @returns {Promise<Object>} - 更新结果
 */
export async function updateFromNotion() {
  try {
    // 首先从Notion获取数据
    const { success, data, error } = await getProgressFromNotion();
    if (!success) throw new Error(error);
    
    // 更新Supabase数据库
    for (const module of data.modules) {
      // 检查模块是否存在
      const { data: existingModules, error: checkError } = await supabase
        .from('modules')
        .select('id')
        .eq('name', module.name)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingModules) {
        // 更新现有模块
        const { error: updateError } = await supabase
          .from('modules')
          .update({
            progress: module.progress,
            status: module.status,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingModules.id);
        
        if (updateError) throw updateError;
      } else {
        // 创建新模块
        const { error: insertError } = await supabase
          .from('modules')
          .insert({
            name: module.name,
            progress: module.progress,
            status: module.status
          });
        
        if (insertError) throw insertError;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('从Notion更新数据失败:', error);
    return { success: false, error: error.message };
  }
} 