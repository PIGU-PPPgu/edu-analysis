import { createClient, Provider } from '@supabase/supabase-js'
import { validateData } from './validation'
import { toast } from 'sonner'

// Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 微信登录
export const signInWithWechat = async () => {
  const redirectUrl = import.meta.env.VITE_REDIRECT_URL || window.location.origin + '/auth/callback'
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'wechat' as Provider,
    options: {
      redirectTo: redirectUrl
    }
  })
  
  if (error) {
    console.error('微信登录错误:', error)
    throw error
  }
  return data
}

// 登出
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('登出错误:', error)
    throw error
  }
}

// 获取当前用户
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser()
  return data.user
}

// 获取会话状态
export const getSession = async () => {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// 数据库操作函数
export const db = {
  // 添加或更新学生信息
  async upsertStudent(studentData: { 
    student_id: string;
    name: string;
    class_name: string;
  }) {
    try {
      // 验证数据
      await validateData.validateStudent(studentData);
      
      const { data, error } = await supabase
        .from('students')
        .upsert([studentData], {
          onConflict: 'student_id'
        })
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('添加/更新学生信息失败:', error);
      toast.error('操作失败: ' + error.message);
      throw error;
    }
  },
  
  // 批量添加或更新学生信息
  async upsertStudents(studentsData: Array<{
    student_id: string;
    name: string;
    class_name: string;
  }>) {
    try {
      // 批量验证数据
      await validateData.validateStudents(studentsData);
      
      const { data, error } = await supabase
        .from('students')
        .upsert(studentsData, {
          onConflict: 'student_id'
        })
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('批量添加/更新学生信息失败:', error);
      toast.error('操作失败: ' + error.message);
      throw error;
    }
  },
  
  // 添加成绩记录
  async insertGrades(gradesData: Array<{
    student_id: string;
    subject: string;
    score: number;
    exam_date: string;
    exam_type: string;
    semester?: string;
  }>) {
    try {
      // 批量验证成绩数据
      await validateData.validateGrades(gradesData);
      
      const { data, error } = await supabase
        .from('grades')
        .insert(gradesData)
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('添加成绩记录失败:', error);
      toast.error('操作失败: ' + error.message);
      throw error;
    }
  },
  
  // 获取学生列表
  async getStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('class_name', { ascending: true })
    
    if (error) throw error
    return data
  },
  
  // 获取特定学生的所有成绩
  async getStudentGrades(studentId: string) {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', studentId)
      .order('exam_date', { ascending: false })
    
    if (error) throw error
    return data
  },
  
  // 获取班级的平均成绩
  async getClassAverages(className: string) {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        subject,
        score,
        students!inner(class_name)
      `)
      .eq('students.class_name', className)
    
    if (error) throw error
    return data
  },

  // 科目相关操作
  async getSubjects() {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('subject_name', { ascending: true })
    
    if (error) throw error
    return data
  },

  async upsertSubject(subjectData: {
    subject_code: string;
    subject_name: string;
  }) {
    const { data, error } = await supabase
      .from('subjects')
      .upsert([subjectData], {
        onConflict: 'subject_code'
      })
      .select()
    
    if (error) throw error
    return data
  },

  // 班级相关操作
  async getClassInfo() {
    const { data, error } = await supabase
      .from('class_info')
      .select('*')
      .order('grade_level', { ascending: true })
    
    if (error) throw error
    return data
  },

  async upsertClassInfo(classData: {
    class_name: string;
    grade_level: string;
    academic_year: string;
    homeroom_teacher?: string;
  }) {
    const { data, error } = await supabase
      .from('class_info')
      .upsert([classData], {
        onConflict: 'class_name'
      })
      .select()
    
    if (error) throw error
    return data
  },

  // 扩展的成绩分析功能
  async getStudentPerformanceOverTime(studentId: string) {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        *,
        students!inner(
          name,
          class_name
        )
      `)
      .eq('student_id', studentId)
      .order('exam_date', { ascending: true })
    
    if (error) throw error
    return data
  },

  async getClassPerformanceBySubject(className: string) {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        subject,
        score,
        exam_date,
        exam_type,
        students!inner(
          name,
          class_name
        )
      `)
      .eq('students.class_name', className)
      .order('exam_date', { ascending: true })
    
    if (error) throw error
    return data
  },

  async getSubjectPerformanceStats(subjectCode: string) {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        score,
        exam_date,
        exam_type,
        students!inner(
          class_name
        )
      `)
      .eq('subject', subjectCode)
    
    if (error) throw error
    return data
  },

  // 获取预警学生列表
  async getStudentWarnings() {
    const { data, error } = await supabase.rpc('get_student_warnings');
    if (error) throw error;
    return data;
  },

  // 获取预警统计信息
  async getWarningStatistics() {
    const { data, error } = await supabase.rpc('get_warning_statistics');
    if (error) throw error;
    return data;
  },

  // 获取风险因素数据
  async getRiskFactors() {
    const { data, error } = await supabase.rpc('get_risk_factors');
    if (error) throw error;
    return data;
  }
}
