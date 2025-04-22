import { createClient, Provider } from '@supabase/supabase-js'

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
    const { data, error } = await supabase
      .from('students')
      .upsert([studentData], {
        onConflict: 'student_id'
      })
      .select()
    
    if (error) throw error
    return data
  },
  
  // 批量添加或更新学生信息
  async upsertStudents(studentsData: Array<{
    student_id: string;
    name: string;
    class_name: string;
  }>) {
    const { data, error } = await supabase
      .from('students')
      .upsert(studentsData, {
        onConflict: 'student_id'
      })
      .select()
    
    if (error) throw error
    return data
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
    const { data, error } = await supabase
      .from('grades')
      .insert(gradesData)
      .select()
    
    if (error) throw error
    return data
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
  }
}
