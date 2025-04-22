
import { supabase } from './auth';
import { toast } from 'sonner';

// 初始化数据库配置
export async function initializeDatabase() {
  try {
    // 检查是否已存在user_profiles表的触发器
    const { data: existingTriggers, error: triggerCheckError } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .eq('tgname', 'on_auth_user_created')
      .maybeSingle();

    if (triggerCheckError && !triggerCheckError.message.includes('does not exist')) {
      console.error('检查触发器时出错:', triggerCheckError);
      return;
    }

    // 如果触发器不存在，创建触发器函数和触发器
    if (!existingTriggers) {
      // 创建触发器函数
      const { error: functionError } = await supabase.rpc('create_user_profile_function', {});
      
      if (functionError) {
        console.error('创建触发器函数失败:', functionError);
        return;
      }

      // 创建触发器
      const { error: triggerError } = await supabase.rpc('create_user_profile_trigger', {});
      
      if (triggerError) {
        console.error('创建触发器失败:', triggerError);
        return;
      }

      console.log('数据库触发器设置成功');
    }

    // 确保RLS策略已启用
    await setupRLS();

    toast.success('数据库配置已完成');
    return true;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    toast.error('数据库配置失败');
    return false;
  }
}

// 设置行级安全策略
async function setupRLS() {
  try {
    // 检查并配置user_profiles表的RLS策略
    const { error: profilePolicyError } = await supabase.rpc('setup_profile_policies', {});
    if (profilePolicyError) console.error('设置用户资料访问策略失败:', profilePolicyError);

    // 检查并配置students表的RLS策略
    const { error: studentPolicyError } = await supabase.rpc('setup_student_policies', {});
    if (studentPolicyError) console.error('设置学生数据访问策略失败:', studentPolicyError);

    // 检查并配置grades表的RLS策略
    const { error: gradesPolicyError } = await supabase.rpc('setup_grades_policies', {});
    if (gradesPolicyError) console.error('设置成绩数据访问策略失败:', gradesPolicyError);

    return true;
  } catch (error) {
    console.error('设置RLS策略失败:', error);
    return false;
  }
}

// 创建初始数据
export async function setupInitialData() {
  try {
    // 检查是否已存在科目数据
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('subject_code')
      .limit(1);
    
    if (subjectsError) throw subjectsError;
    
    // 如果没有科目数据，添加默认科目
    if (subjectsData.length === 0) {
      const defaultSubjects = [
        { subject_code: 'MATH001', subject_name: '数学', credit: 4, is_required: true },
        { subject_code: 'CHIN001', subject_name: '语文', credit: 4, is_required: true },
        { subject_code: 'ENG001', subject_name: '英语', credit: 4, is_required: true },
        { subject_code: 'PHYS001', subject_name: '物理', credit: 3, is_required: true },
        { subject_code: 'CHEM001', subject_name: '化学', credit: 3, is_required: true },
        { subject_code: 'BIO001', subject_name: '生物', credit: 3, is_required: true },
        { subject_code: 'HIST001', subject_name: '历史', credit: 2, is_required: true },
        { subject_code: 'GEO001', subject_name: '地理', credit: 2, is_required: true },
        { subject_code: 'POL001', subject_name: '政治', credit: 2, is_required: true }
      ];
      
      const { error } = await supabase.from('subjects').insert(defaultSubjects);
      if (error) throw error;
      console.log('初始科目数据已创建');
    }
    
    // 检查是否已存在考试类型数据
    const { data: examTypesData, error: examTypesError } = await supabase
      .from('exam_types')
      .select('exam_code')
      .limit(1);
    
    if (examTypesError) throw examTypesError;
    
    // 如果没有考试类型数据，添加默认考试类型
    if (examTypesData.length === 0) {
      const defaultExamTypes = [
        { exam_code: 'MONTHLY', name: '月考', description: '每月定期考试' },
        { exam_code: 'MIDTERM', name: '期中考试', description: '学期中间考试' },
        { exam_code: 'FINAL', name: '期末考试', description: '学期结束考试' },
        { exam_code: 'QUIZ', name: '小测验', description: '课堂小测验' },
        { exam_code: 'MOCK', name: '模拟考试', description: '升学模拟考试' }
      ];
      
      const { error } = await supabase.from('exam_types').insert(defaultExamTypes);
      if (error) throw error;
      console.log('初始考试类型数据已创建');
    }
    
    // 检查是否已存在学期数据
    const { data: termsData, error: termsError } = await supabase
      .from('academic_terms')
      .select('term_id')
      .limit(1);
    
    if (termsError) throw termsError;
    
    // 如果没有学期数据，添加当前学年的学期
    if (termsData.length === 0) {
      const currentYear = new Date().getFullYear();
      const defaultTerms = [
        { 
          term_id: `${currentYear}-1`, 
          academic_year: `${currentYear}-${currentYear+1}`, 
          semester: '第一学期',
          start_date: `${currentYear}-09-01`,
          end_date: `${currentYear+1}-01-31`
        },
        { 
          term_id: `${currentYear}-2`, 
          academic_year: `${currentYear}-${currentYear+1}`, 
          semester: '第二学期',
          start_date: `${currentYear+1}-02-01`,
          end_date: `${currentYear+1}-07-15`
        }
      ];
      
      const { error } = await supabase.from('academic_terms').insert(defaultTerms);
      if (error) throw error;
      console.log('初始学期数据已创建');
    }
    
    toast.success('初始数据设置成功');
    return true;
  } catch (error) {
    console.error('设置初始数据失败:', error);
    toast.error('初始数据设置失败');
    return false;
  }
}
