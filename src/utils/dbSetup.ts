
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { executeSql } from './dbUtil';

// 初始化数据库配置
export async function initializeDatabase() {
  try {
    // 检查是否已存在user_profiles表的触发器 - 使用executeSql替代直接查询
    const checkTriggerSql = `
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
      ) as trigger_exists;
    `;
    
    const result = await executeSql(checkTriggerSql);
    const triggerExists = result?.[0]?.trigger_exists;

    // 如果触发器不存在，创建触发器函数和触发器
    if (!triggerExists) {
      // 执行SQL文件中的函数创建触发器函数和触发器
      try {
        await executeSql(`
          -- 创建触发器函数
          CREATE OR REPLACE FUNCTION public.create_user_profile()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO public.user_profiles (id)
            VALUES (NEW.id);
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
          
          -- 创建触发器
          DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
          CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
        `);
        
        console.log('数据库触发器设置成功');
      } catch (error) {
        console.error('创建触发器失败:', error);
        return false;
      }
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
    await executeSql(`
      -- 启用RLS
      ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
      
      -- 删除可能存在的策略以避免冲突
      DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
      DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
      
      -- 创建新策略
      CREATE POLICY "Users can view their own profile"
        ON public.user_profiles FOR SELECT
        USING (auth.uid() = id);
        
      CREATE POLICY "Users can update their own profile"
        ON public.user_profiles FOR UPDATE
        USING (auth.uid() = id);
    `);

    // 检查并配置students表的RLS策略
    await executeSql(`
      -- 启用RLS
      ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
      
      -- 删除可能存在的策略以避免冲突
      DROP POLICY IF EXISTS "Students read access" ON public.students;
      DROP POLICY IF EXISTS "Students write access for authenticated users" ON public.students;
      
      -- 创建新策略
      CREATE POLICY "Students read access"
        ON public.students FOR SELECT
        TO authenticated
        USING (true);
        
      CREATE POLICY "Students write access for authenticated users"
        ON public.students FOR INSERT
        TO authenticated
        WITH CHECK (true);
    `);

    // 检查并配置grades表的RLS策略
    await executeSql(`
      -- 启用RLS
      ALTER TABLE IF EXISTS public.grades ENABLE ROW LEVEL SECURITY;
      
      -- 删除可能存在的策略以避免冲突
      DROP POLICY IF EXISTS "Grades read access" ON public.grades;
      DROP POLICY IF EXISTS "Grades write access for authenticated users" ON public.grades;
      
      -- 创建新策略
      CREATE POLICY "Grades read access"
        ON public.grades FOR SELECT
        TO authenticated
        USING (true);
        
      CREATE POLICY "Grades write access for authenticated users"
        ON public.grades FOR INSERT
        TO authenticated
        WITH CHECK (true);
    `);

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
    const subjectsCheckSql = `SELECT COUNT(*) as count FROM public.subjects LIMIT 1`;
    const subjectsResult = await executeSql(subjectsCheckSql);
    const subjectsExist = subjectsResult?.[0]?.count > 0;
    
    // 如果没有科目数据，添加默认科目
    if (!subjectsExist) {
      const createSubjectsSql = `
        INSERT INTO public.subjects (subject_code, subject_name, credit, is_required)
        VALUES 
          ('MATH001', '数学', 4, true),
          ('CHIN001', '语文', 4, true),
          ('ENG001', '英语', 4, true),
          ('PHYS001', '物理', 3, true),
          ('CHEM001', '化学', 3, true),
          ('BIO001', '生物', 3, true),
          ('HIST001', '历史', 2, true),
          ('GEO001', '地理', 2, true),
          ('POL001', '政治', 2, true);
      `;
      await executeSql(createSubjectsSql);
      console.log('初始科目数据已创建');
    }
    
    // 检查是否已存在考试类型数据
    const examTypesCheckSql = `SELECT COUNT(*) as count FROM public.exam_types LIMIT 1`;
    const examTypesResult = await executeSql(examTypesCheckSql);
    const examTypesExist = examTypesResult?.[0]?.count > 0;
    
    // 如果没有考试类型数据，添加默认考试类型
    if (!examTypesExist) {
      const createExamTypesSql = `
        INSERT INTO public.exam_types (exam_code, name, description)
        VALUES 
          ('MONTHLY', '月考', '每月定期考试'),
          ('MIDTERM', '期中考试', '学期中间考试'),
          ('FINAL', '期末考试', '学期结束考试'),
          ('QUIZ', '小测验', '课堂小测验'),
          ('MOCK', '模拟考试', '升学模拟考试');
      `;
      await executeSql(createExamTypesSql);
      console.log('初始考试类型数据已创建');
    }
    
    // 检查是否已存在学期数据
    const termsCheckSql = `SELECT COUNT(*) as count FROM public.academic_terms LIMIT 1`;
    const termsResult = await executeSql(termsCheckSql);
    const termsExist = termsResult?.[0]?.count > 0;
    
    // 如果没有学期数据，添加当前学年的学期
    if (!termsExist) {
      const currentYear = new Date().getFullYear();
      const createTermsSql = `
        INSERT INTO public.academic_terms (term_id, academic_year, semester, start_date, end_date)
        VALUES 
          ('${currentYear}-1', '${currentYear}-${currentYear+1}', '第一学期', '${currentYear}-09-01', '${currentYear+1}-01-31'),
          ('${currentYear}-2', '${currentYear}-${currentYear+1}', '第二学期', '${currentYear+1}-02-01', '${currentYear+1}-07-15');
      `;
      await executeSql(createTermsSql);
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
