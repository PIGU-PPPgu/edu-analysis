import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { OpenAI } from 'https://esm.sh/openai@4.24.1'

interface RequestBody {
  studentId: string
  apiKey: string
  model?: string
  analysisType?: 'simple' | 'comprehensive'
}

interface StudentData {
  id: string
  studentId: string
  name: string
  gender?: string
  classId: string
  className?: string
  scores?: { 
    subject: string
    score: number
    examType: string
    examDate: string
  }[]
  achievements?: {
    id: string
    title: string
    date: string
    description: string
    type: string
  }[]
  learningBehaviors?: {
    attendanceRate: number
    homeworkCompletionRate: number
    classParticipation: number
    focusDuration: number
    learningConsistency: number
    problemSolvingSpeed: number
  }
  learningStyles?: {
    name: string
    value: number
    description: string
  }[]
  learningPatterns?: {
    pattern: string
    description: string
    strength: boolean
  }[]
}

interface AnalysisResult {
  studentId: string
  name: string
  date: string
  className?: string
  learningProfile: {
    summary: string
    strengths: string[]
    challenges: string[]
    learningStyle: string
    recommendedStrategies: string[]
    longTermPotential: string
  }
  analysisType: string
}

async function fetchStudentData(supabase: SupabaseClient, studentId: string): Promise<StudentData | null> {
  try {
    // 获取基础学生信息
    const { data: student, error } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        name,
        class_id,
        gender,
        classes (
          id,
          name,
          grade
        )
      `)
      .eq('id', studentId)
      .single()
      
    if (error || !student) {
      console.error("获取学生信息失败:", error)
      return null
    }
    
    // 初始化学生数据模型
    const studentData: StudentData = {
      id: student.id,
      studentId: student.student_id,
      name: student.name,
      gender: student.gender,
      classId: student.class_id,
      className: student.classes?.name
    }
    
    // 获取学生成绩信息
    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('id, subject, score, exam_type, exam_date')
      .eq('student_id', studentId)
      .order('exam_date', { ascending: false })
      
    if (grades && !gradesError) {
      studentData.scores = grades.map(g => ({
        subject: g.subject,
        score: parseFloat(g.score),
        examType: g.exam_type,
        examDate: g.exam_date
      }))
    }
    
    // 获取学习行为数据
    const { data: behaviors, error: behaviorsError } = await supabase
      .from('student_learning_behaviors')
      .select('*')
      .eq('student_id', studentId)
      .single()
      
    if (behaviors && !behaviorsError) {
      studentData.learningBehaviors = {
        attendanceRate: behaviors.attendance_rate,
        homeworkCompletionRate: behaviors.homework_completion_rate,
        classParticipation: behaviors.class_participation,
        focusDuration: behaviors.focus_duration,
        learningConsistency: behaviors.learning_consistency,
        problemSolvingSpeed: behaviors.problem_solving_speed
      }
    }
    
    // 获取学习风格数据
    const { data: styles, error: stylesError } = await supabase
      .from('student_learning_styles')
      .select('*')
      .eq('student_id', studentId)
      
    if (styles && !stylesError && styles.length > 0) {
      studentData.learningStyles = styles.map(style => ({
        name: style.style_name,
        value: style.percentage,
        description: style.description
      }))
    }
    
    // 获取学习模式数据
    const { data: patterns, error: patternsError } = await supabase
      .from('student_learning_patterns')
      .select('*')
      .eq('student_id', studentId)
      
    if (patterns && !patternsError && patterns.length > 0) {
      studentData.learningPatterns = patterns.map(pattern => ({
        pattern: pattern.pattern_name,
        description: pattern.description,
        strength: pattern.is_strength
      }))
    }
    
    // 获取学生成就数据
    const { data: achievements, error: achievementsError } = await supabase
      .from('student_achievements')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
      
    if (achievements && !achievementsError && achievements.length > 0) {
      studentData.achievements = achievements.map(achievement => ({
        id: achievement.id,
        title: achievement.title,
        date: achievement.date,
        description: achievement.description,
        type: achievement.type
      }))
    }
    
    return studentData
  } catch (error) {
    console.error("获取学生数据失败:", error)
    return null
  }
}

async function generateAnalysisWithAI(studentData: StudentData, apiKey: string, model: string, analysisType: string): Promise<AnalysisResult> {
  const openai = new OpenAI({
    apiKey: apiKey
  })

  // 构建提示词
  const prompt = `
作为一名资深的教育分析专家，你需要基于以下学生数据生成一份全面的学习画像分析报告。
分析类型: ${analysisType === 'comprehensive' ? '综合分析（更详细）' : '简要分析'}

学生信息:
- 姓名: ${studentData.name}
- 学号: ${studentData.studentId}
- 班级: ${studentData.className || '未知'}
- 性别: ${studentData.gender || '未知'}

${studentData.scores && studentData.scores.length > 0 ? `
成绩数据:
${studentData.scores.slice(0, 10).map(s => `- ${s.subject}: ${s.score}分 (${s.examType}, ${s.examDate})`).join('\n')}
` : '无成绩数据'}

${studentData.learningBehaviors ? `
学习行为数据:
- 出勤率: ${studentData.learningBehaviors.attendanceRate}%
- 作业完成率: ${studentData.learningBehaviors.homeworkCompletionRate}%
- 课堂参与度: ${studentData.learningBehaviors.classParticipation}%
- 学习专注度: ${studentData.learningBehaviors.focusDuration}%
- 学习连贯性: ${studentData.learningBehaviors.learningConsistency}%
- 解题速度: ${studentData.learningBehaviors.problemSolvingSpeed}%
` : '无学习行为数据'}

${studentData.learningStyles && studentData.learningStyles.length > 0 ? `
学习风格数据:
${studentData.learningStyles.map(s => `- ${s.name}: ${s.value}% (${s.description || '无描述'})`).join('\n')}
` : '无学习风格数据'}

${studentData.learningPatterns && studentData.learningPatterns.length > 0 ? `
学习模式:
${studentData.learningPatterns.map(p => `- ${p.pattern}: ${p.strength ? '优势' : '待提升'} (${p.description || '无描述'})`).join('\n')}
` : '无学习模式数据'}

${studentData.achievements && studentData.achievements.length > 0 ? `
学习成就:
${studentData.achievements.map(a => `- ${a.title} (${a.date}): ${a.description || '无描述'}`).join('\n')}
` : '无学习成就数据'}

请基于以上数据，生成以下格式的分析结果（使用JSON格式）:

{
  "learningProfile": {
    "summary": "一段200-300字的综合学生学习情况摘要，包括整体学习表现、特点和发展情况",
    "strengths": ["3-5条学生的学习优势", "每条30-50字，具体而有针对性"],
    "challenges": ["2-4条学生面临的学习挑战", "每条30-50字，具体而有针对性"],
    "learningStyle": "100-150字描述学生的主要学习风格和适合的学习方法",
    "recommendedStrategies": ["4-6条针对性的学习策略建议", "每条应具体且可操作"],
    "longTermPotential": "100-150字描述学生的长期学习潜力和发展方向"
  }
}

注意：
1. 所有分析需基于提供的数据，不要臆测太多无据可依的内容
2. 所有分析和建议都应针对这名特定学生的实际情况
3. 使用积极、建设性的语言，即使在描述挑战时也应保持发展性思维
4. 如果数据不足，可以提出需要进一步收集哪些信息
5. 所有文字使用中文
  `

  try {
    const response = await openai.chat.completions.create({
      model: model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一位专业的教育分析专家，擅长分析学生的学习数据并提供有价值的教育建议。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    const content = response.choices[0]?.message?.content || ''
    let analysisResult: AnalysisResult['learningProfile']
    
    try {
      // 尝试解析JSON响应
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[0]
        const parsed = JSON.parse(jsonStr)
        analysisResult = parsed.learningProfile
      } else {
        throw new Error('无法解析AI回复中的JSON')
      }
    } catch (jsonError) {
      console.error('JSON解析失败，使用默认结构', jsonError)
      // 提供默认结构
      analysisResult = {
        summary: '无法生成有效的学生分析摘要。可能是提供的数据不足或AI服务出现问题。',
        strengths: ['数据不足，无法分析具体优势'],
        challenges: ['数据不足，无法分析具体挑战'],
        learningStyle: '数据不足，无法确定学习风格',
        recommendedStrategies: ['建议收集更多学生学习数据以提供准确分析'],
        longTermPotential: '需要更多数据以评估长期潜力'
      }
    }
    
    // 构建完整的返回结果
    return {
      studentId: studentData.studentId,
      name: studentData.name,
      date: new Date().toISOString().split('T')[0],
      className: studentData.className,
      learningProfile: analysisResult,
      analysisType: analysisType || 'simple'
    }
  } catch (error) {
    console.error('AI分析生成失败:', error)
    throw new Error('AI分析生成失败: ' + (error.message || '未知错误'))
  }
}

async function handleRequest(req: Request, supabase: SupabaseClient): Promise<Response> {
  // 解析请求体
  let body: RequestBody
  try {
    body = await req.json()
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '无效的请求格式' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  // 验证必要参数
  const { studentId, apiKey } = body
  if (!studentId || !apiKey) {
    return new Response(
      JSON.stringify({ error: '缺少必要参数：studentId、apiKey' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  try {
    // 获取学生数据
    const studentData = await fetchStudentData(supabase, studentId)
    if (!studentData) {
      return new Response(
        JSON.stringify({ error: '找不到学生数据' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // 生成AI分析
    const model = body.model || 'gpt-3.5-turbo'
    const analysisType = body.analysisType || 'simple'
    const analysisResult = await generateAnalysisWithAI(studentData, apiKey, model, analysisType)
    
    // 将分析结果保存到数据库
    const { error: saveError } = await supabase
      .from('student_learning_profiles')
      .upsert({
        student_id: studentId,
        analysis_date: new Date().toISOString(),
        analysis_type: analysisType,
        analysis_data: analysisResult,
        is_generated_by_ai: true
      }, {
        onConflict: 'student_id,analysis_date'
      })
      
    if (saveError) {
      console.warn('保存分析结果失败，但仍将返回结果:', saveError)
    }
    
    return new Response(
      JSON.stringify(analysisResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('处理请求失败:', error)
    return new Response(
      JSON.stringify({ error: '处理请求失败: ' + (error.message || '未知错误') }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// 为OPTIONS请求提供CORS支持
function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    })
  }
}

serve(async (req) => {
  // 处理CORS预检请求
  const corsResponse = handleOptions(req)
  if (corsResponse) return corsResponse

  // 验证HTTP方法
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '仅支持POST请求' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 初始化Supabase客户端
  const supabaseAdmin = createClient(
    // Supabase API URL - env var exported by default when deployed.
    Deno.env.get('SUPABASE_URL') ?? '',
    // Supabase API SERVICE ROLE KEY - env var exported by default when deployed.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  return handleRequest(req, supabaseAdmin)
}) 