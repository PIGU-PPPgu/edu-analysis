import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface WarningRule {
  id: string
  name: string
  description: string
  conditions: any
  severity: 'low' | 'medium' | 'high'
  is_active: boolean
}

interface StudentData {
  student_id: string
  name: string
  class_name?: string
  recent_grades?: any[]
  homework_submissions?: any[]
  attendance_data?: any[]
}

interface WarningResult {
  student_id: string
  rule_id: string
  details: any
  severity: string
  risk_score: number
  recommendations: string[]
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🚀 开始自动预警分析...')

    // 1. 获取所有活跃的预警规则
    const { data: warningRules, error: rulesError } = await supabase
      .from('warning_rules')
      .select('*')
      .eq('is_active', true)

    if (rulesError) {
      throw new Error(`获取预警规则失败: ${rulesError.message}`)
    }

    console.log(`📋 获取到 ${warningRules.length} 条活跃预警规则`)

    // 2. 获取所有学生数据
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        student_id,
        name,
        class_name,
        created_at
      `)

    if (studentsError) {
      throw new Error(`获取学生数据失败: ${studentsError.message}`)
    }

    console.log(`👥 获取到 ${students.length} 名学生数据`)

    // 3. 分析每个学生的风险情况
    const warningResults: WarningResult[] = []
    const analysisTime = new Date()

    for (const student of students) {
      console.log(`🔍 分析学生: ${student.name} (${student.student_id})`)
      
      // 获取学生的详细数据
      const studentData = await getStudentDetailData(supabase, student.student_id)
      
      // 对每个规则进行检查
      for (const rule of warningRules) {
        const riskAnalysis = await analyzeStudentRisk(studentData, rule)
        
        if (riskAnalysis.hasRisk) {
          const warningResult: WarningResult = {
            student_id: student.student_id,
            rule_id: rule.id,
            details: {
              rule_name: rule.name,
              risk_factors: riskAnalysis.riskFactors,
              data_points: riskAnalysis.dataPoints,
              analysis_time: analysisTime,
              ai_insights: riskAnalysis.aiInsights
            },
            severity: rule.severity,
            risk_score: riskAnalysis.riskScore,
            recommendations: riskAnalysis.recommendations
          }
          
          warningResults.push(warningResult)
          console.log(`⚠️ 发现风险: ${student.name} - ${rule.name} (${rule.severity})`)
        }
      }
    }

    console.log(`📊 分析完成，发现 ${warningResults.length} 个预警`)

    // 4. 保存预警记录到数据库
    let savedCount = 0
    let updatedCount = 0

    for (const warning of warningResults) {
      // 检查是否已存在相同的预警记录
      const { data: existingWarning } = await supabase
        .from('warning_records')
        .select('id, status')
        .eq('student_id', warning.student_id)
        .eq('rule_id', warning.rule_id)
        .eq('status', 'active')
        .single()

      if (existingWarning) {
        // 更新现有预警记录
        const { error: updateError } = await supabase
          .from('warning_records')
          .update({
            details: warning.details,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingWarning.id)

        if (!updateError) {
          updatedCount++
        }
      } else {
        // 创建新的预警记录
        const { error: insertError } = await supabase
          .from('warning_records')
          .insert({
            student_id: warning.student_id,
            rule_id: warning.rule_id,
            details: warning.details,
            status: 'active'
          })

        if (!insertError) {
          savedCount++
        }
      }
    }

    // 5. 生成AI增强的预警摘要
    const aiSummary = await generateAISummary(warningResults, students.length)

    // 6. 发送预警通知（如果配置了）
    await sendWarningNotifications(supabase, warningResults)

    const response = {
      success: true,
      message: '自动预警分析完成',
      analysis_time: analysisTime,
      statistics: {
        total_students: students.length,
        active_rules: warningRules.length,
        warnings_found: warningResults.length,
        new_warnings: savedCount,
        updated_warnings: updatedCount,
        high_risk_count: warningResults.filter(w => w.severity === 'high').length,
        medium_risk_count: warningResults.filter(w => w.severity === 'medium').length,
        low_risk_count: warningResults.filter(w => w.severity === 'low').length
      },
      ai_summary: aiSummary,
      warning_details: warningResults.slice(0, 10) // 返回前10个预警详情
    }

    console.log('✅ 自动预警分析成功完成')
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('❌ 自动预警分析失败:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// 获取学生详细数据
async function getStudentDetailData(supabase: any, studentId: string): Promise<StudentData> {
  // 获取最近的成绩数据
  const { data: recentGrades } = await supabase
    .from('grade_data_new')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(20)

  // 获取作业提交数据
  const { data: homeworkSubmissions } = await supabase
    .from('homework_submissions')
    .select(`
      *,
      homework:homework_id (
        title,
        due_date,
        created_at
      )
    `)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(20)

  return {
    student_id: studentId,
    name: '', // 在调用处已获取
    recent_grades: recentGrades || [],
    homework_submissions: homeworkSubmissions || [],
    attendance_data: [] // 暂时为空，可以后续扩展
  }
}

// 分析学生风险
async function analyzeStudentRisk(studentData: StudentData, rule: WarningRule) {
  const conditions = rule.conditions
  let hasRisk = false
  let riskScore = 0
  const riskFactors: string[] = []
  const dataPoints: any[] = []
  const recommendations: string[] = []

  try {
    // 根据规则类型进行不同的分析
    switch (conditions.type) {
      case 'consecutive_fails':
        const analysis1 = analyzeConsecutiveFails(studentData, conditions)
        hasRisk = analysis1.hasRisk
        riskScore = analysis1.riskScore
        riskFactors.push(...analysis1.riskFactors)
        dataPoints.push(...analysis1.dataPoints)
        recommendations.push(...analysis1.recommendations)
        break

      case 'grade_decline':
        const analysis2 = analyzeGradeDecline(studentData, conditions)
        hasRisk = analysis2.hasRisk
        riskScore = analysis2.riskScore
        riskFactors.push(...analysis2.riskFactors)
        dataPoints.push(...analysis2.dataPoints)
        recommendations.push(...analysis2.recommendations)
        break

      case 'homework_issues':
        const analysis3 = analyzeHomeworkIssues(studentData, conditions)
        hasRisk = analysis3.hasRisk
        riskScore = analysis3.riskScore
        riskFactors.push(...analysis3.riskFactors)
        dataPoints.push(...analysis3.dataPoints)
        recommendations.push(...analysis3.recommendations)
        break

      case 'comprehensive':
        const analysis4 = analyzeComprehensive(studentData, conditions)
        hasRisk = analysis4.hasRisk
        riskScore = analysis4.riskScore
        riskFactors.push(...analysis4.riskFactors)
        dataPoints.push(...analysis4.dataPoints)
        recommendations.push(...analysis4.recommendations)
        break

      default:
        console.warn(`未知的预警规则类型: ${conditions.type}`)
    }

    // 生成AI增强的洞察
    const aiInsights = await generateAIInsights(studentData, riskFactors, rule)

    return {
      hasRisk,
      riskScore,
      riskFactors,
      dataPoints,
      recommendations,
      aiInsights
    }

  } catch (error) {
    console.error(`分析学生风险失败 ${studentData.student_id}:`, error)
    return {
      hasRisk: false,
      riskScore: 0,
      riskFactors: [],
      dataPoints: [],
      recommendations: [],
      aiInsights: null
    }
  }
}

// 分析连续不及格
function analyzeConsecutiveFails(studentData: StudentData, conditions: any) {
  const { times = 2, score_threshold = 60, subject = null } = conditions
  const recentGrades = studentData.recent_grades || []
  
  let consecutiveFailCount = 0
  let maxConsecutive = 0
  const failedSubjects: string[] = []
  const dataPoints: any[] = []

  // 按时间排序，分析连续不及格情况
  const sortedGrades = recentGrades
    .filter(grade => subject ? grade.subject === subject : true)
    .sort((a, b) => new Date(b.exam_date || b.created_at).getTime() - new Date(a.exam_date || a.created_at).getTime())

  for (const grade of sortedGrades) {
    const score = parseFloat(grade.score) || 0
    dataPoints.push({
      subject: grade.subject,
      score: score,
      date: grade.exam_date || grade.created_at,
      exam_type: grade.exam_type
    })

    if (score < score_threshold) {
      consecutiveFailCount++
      if (!failedSubjects.includes(grade.subject)) {
        failedSubjects.push(grade.subject)
      }
    } else {
      maxConsecutive = Math.max(maxConsecutive, consecutiveFailCount)
      consecutiveFailCount = 0
    }
  }

  maxConsecutive = Math.max(maxConsecutive, consecutiveFailCount)
  const hasRisk = maxConsecutive >= times
  const riskScore = Math.min(100, (maxConsecutive / times) * 60 + failedSubjects.length * 10)

  const riskFactors = []
  const recommendations = []

  if (hasRisk) {
    riskFactors.push(`连续${maxConsecutive}次考试不及格`)
    riskFactors.push(`涉及科目: ${failedSubjects.join(', ')}`)
    
    recommendations.push('建议加强基础知识复习')
    recommendations.push('考虑安排一对一辅导')
    if (failedSubjects.length > 1) {
      recommendations.push('多科目不及格，建议制定综合学习计划')
    }
  }

  return { hasRisk, riskScore, riskFactors, dataPoints, recommendations }
}

// 分析成绩下降
function analyzeGradeDecline(studentData: StudentData, conditions: any) {
  const { decline_threshold = 10, period_count = 3, subject = null } = conditions
  const recentGrades = studentData.recent_grades || []
  
  const subjectGrades = recentGrades
    .filter(grade => subject ? grade.subject === subject : true)
    .sort((a, b) => new Date(a.exam_date || a.created_at).getTime() - new Date(b.exam_date || b.created_at).getTime())

  if (subjectGrades.length < period_count) {
    return { hasRisk: false, riskScore: 0, riskFactors: [], dataPoints: [], recommendations: [] }
  }

  const recentPeriods = subjectGrades.slice(-period_count)
  const firstScore = parseFloat(recentPeriods[0].score) || 0
  const lastScore = parseFloat(recentPeriods[recentPeriods.length - 1].score) || 0
  const decline = firstScore - lastScore

  const hasRisk = decline >= decline_threshold
  const riskScore = hasRisk ? Math.min(100, (decline / decline_threshold) * 50 + 20) : 0

  const riskFactors = []
  const recommendations = []
  const dataPoints = recentPeriods.map(grade => ({
    subject: grade.subject,
    score: parseFloat(grade.score) || 0,
    date: grade.exam_date || grade.created_at,
    exam_type: grade.exam_type
  }))

  if (hasRisk) {
    riskFactors.push(`成绩下降${decline.toFixed(1)}分`)
    riskFactors.push(`从${firstScore}分降至${lastScore}分`)
    
    recommendations.push('分析成绩下降原因')
    recommendations.push('及时调整学习方法')
    recommendations.push('增加练习和复习时间')
  }

  return { hasRisk, riskScore, riskFactors, dataPoints, recommendations }
}

// 分析作业问题
function analyzeHomeworkIssues(studentData: StudentData, conditions: any) {
  const { late_threshold = 3, missing_threshold = 2, quality_threshold = 60 } = conditions
  const submissions = studentData.homework_submissions || []
  
  let lateCount = 0
  let missingCount = 0
  let lowQualityCount = 0
  const dataPoints: any[] = []

  for (const submission of submissions) {
    const homework = submission.homework
    if (!homework) continue

    const dueDate = new Date(homework.due_date)
    const submittedDate = submission.submitted_at ? new Date(submission.submitted_at) : null
    const score = parseFloat(submission.score) || 0

    dataPoints.push({
      homework_title: homework.title,
      due_date: homework.due_date,
      submitted_at: submission.submitted_at,
      score: score,
      status: submission.status
    })

    if (submission.status === 'missing') {
      missingCount++
    } else if (submittedDate && submittedDate > dueDate) {
      lateCount++
    }

    if (score > 0 && score < quality_threshold) {
      lowQualityCount++
    }
  }

  const hasRisk = lateCount >= late_threshold || missingCount >= missing_threshold || lowQualityCount >= 2
  let riskScore = 0
  if (lateCount >= late_threshold) riskScore += 30
  if (missingCount >= missing_threshold) riskScore += 40
  if (lowQualityCount >= 2) riskScore += 20

  const riskFactors = []
  const recommendations = []

  if (hasRisk) {
    if (lateCount >= late_threshold) {
      riskFactors.push(`作业迟交${lateCount}次`)
      recommendations.push('建立作业提醒机制')
    }
    if (missingCount >= missing_threshold) {
      riskFactors.push(`作业缺交${missingCount}次`)
      recommendations.push('加强作业管理和监督')
    }
    if (lowQualityCount >= 2) {
      riskFactors.push(`作业质量不佳${lowQualityCount}次`)
      recommendations.push('提供作业指导和范例')
    }
  }

  return { hasRisk, riskScore, riskFactors, dataPoints, recommendations }
}

// 综合分析
function analyzeComprehensive(studentData: StudentData, conditions: any) {
  // 综合多个维度进行分析
  const gradeAnalysis = analyzeGradeDecline(studentData, { decline_threshold: 8, period_count: 3 })
  const failAnalysis = analyzeConsecutiveFails(studentData, { times: 2, score_threshold: 65 })
  const homeworkAnalysis = analyzeHomeworkIssues(studentData, { late_threshold: 2, missing_threshold: 1 })

  const totalRiskScore = (gradeAnalysis.riskScore + failAnalysis.riskScore + homeworkAnalysis.riskScore) / 3
  const hasRisk = totalRiskScore > 30

  const riskFactors = [
    ...gradeAnalysis.riskFactors,
    ...failAnalysis.riskFactors,
    ...homeworkAnalysis.riskFactors
  ]

  const recommendations = [
    ...gradeAnalysis.recommendations,
    ...failAnalysis.recommendations,
    ...homeworkAnalysis.recommendations
  ]

  const dataPoints = [
    ...gradeAnalysis.dataPoints,
    ...homeworkAnalysis.dataPoints
  ]

  return { hasRisk, riskScore: totalRiskScore, riskFactors, dataPoints, recommendations }
}

// 生成AI洞察
async function generateAIInsights(studentData: StudentData, riskFactors: string[], rule: WarningRule) {
  try {
    // 这里可以调用AI服务生成更深入的洞察
    // 暂时返回基于规则的洞察
    return {
      summary: `学生在${rule.name}方面存在风险`,
      key_factors: riskFactors.slice(0, 3),
      intervention_priority: rule.severity,
      suggested_actions: [
        '与学生进行一对一谈话',
        '联系家长了解情况',
        '制定个性化学习计划'
      ]
    }
  } catch (error) {
    console.error('生成AI洞察失败:', error)
    return null
  }
}

// 生成AI摘要
async function generateAISummary(warningResults: WarningResult[], totalStudents: number) {
  const highRiskCount = warningResults.filter(w => w.severity === 'high').length
  const riskPercentage = ((warningResults.length / totalStudents) * 100).toFixed(1)

  return {
    overview: `本次分析共检查${totalStudents}名学生，发现${warningResults.length}个预警`,
    risk_distribution: {
      high: warningResults.filter(w => w.severity === 'high').length,
      medium: warningResults.filter(w => w.severity === 'medium').length,
      low: warningResults.filter(w => w.severity === 'low').length
    },
    risk_percentage: parseFloat(riskPercentage),
    top_risk_factors: extractTopRiskFactors(warningResults),
    recommendations: [
      highRiskCount > 0 ? '优先关注高风险学生' : '持续监控中低风险学生',
      '建立定期预警检查机制',
      '加强家校沟通'
    ]
  }
}

// 提取主要风险因素
function extractTopRiskFactors(warningResults: WarningResult[]) {
  const factorCounts: { [key: string]: number } = {}
  
  warningResults.forEach(warning => {
    warning.details.risk_factors?.forEach((factor: string) => {
      factorCounts[factor] = (factorCounts[factor] || 0) + 1
    })
  })

  return Object.entries(factorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([factor, count]) => ({ factor, count }))
}

// 发送预警通知
async function sendWarningNotifications(supabase: any, warningResults: WarningResult[]) {
  // 这里可以实现通知发送逻辑
  // 例如：邮件、短信、系统内通知等
  console.log(`📧 预警通知: 共${warningResults.length}个预警需要关注`)
  
  // 暂时只记录到日志
  const highRiskWarnings = warningResults.filter(w => w.severity === 'high')
  if (highRiskWarnings.length > 0) {
    console.log(`🚨 高风险预警: ${highRiskWarnings.length}个学生需要立即关注`)
  }
} 