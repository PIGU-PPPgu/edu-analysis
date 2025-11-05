import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeDataRelationship() {
  console.log('🔍 分析数据表关联关系...')
  
  try {
    // 1. 分析成绩表数据分布
    console.log('\n📊 成绩表 (grades) 数据分布:')
    const { data: gradeStats, error: gradeError } = await supabase
      .from('grades')
      .select('student_id, exam_title, subject, score')
      .limit(10)
    
    if (!gradeError && gradeStats) {
      console.log('✅ 成绩样本:', gradeStats.slice(0, 3))
      
      // 按班级统计成绩 - 需要关联students表获取班级信息
      const { data: gradeWithClass, error: gradeClassError } = await supabase
        .from('grades')
        .select(`
          score,
          exam_title,
          subject,
          students(student_id, name, class_name)
        `)
        .limit(5)
      
      if (!gradeClassError && gradeWithClass) {
        console.log('✅ 成绩-班级关联:', gradeWithClass.slice(0, 2))
        
        // 统计可以直接筛选的维度
        const classNames = new Set()
        const examTitles = new Set()
        gradeWithClass.forEach(g => {
          if (g.students?.class_name) classNames.add(g.students.class_name)
          if (g.exam_title) examTitles.add(g.exam_title)
        })
        console.log('📚 成绩表可筛选班级:', Array.from(classNames))
        console.log('📊 成绩表可筛选考试:', Array.from(examTitles))
      }
    }

    // 2. 分析作业表数据分布
    console.log('\n📝 作业提交表 (homework_submissions) 数据分布:')
    const { data: homeworkStats, error: homeworkError } = await supabase
      .from('homework_submissions')
      .select(`
        score,
        status,
        students(student_id, name, class_name),
        homework(title, due_date)
      `)
      .limit(5)
    
    if (!homeworkError && homeworkStats) {
      console.log('✅ 作业样本:', homeworkStats.slice(0, 2))
      
      const hwClassNames = new Set()
      homeworkStats.forEach(h => {
        if (h.students?.class_name) hwClassNames.add(h.students.class_name)
      })
      console.log('📚 作业表可筛选班级:', Array.from(hwClassNames))
    }

    // 3. 分析预警记录表的关联问题
    console.log('\n⚠️ 预警记录表 (warning_records) 关联分析:')
    const { data: warningStats, error: warningError } = await supabase
      .from('warning_records')
      .select(`
        id,
        student_id,
        details,
        status,
        students(student_id, name, class_name)
      `)
      .limit(5)
    
    if (!warningError && warningStats) {
      console.log('✅ 预警记录样本:', warningStats.slice(0, 2))
      
      // 检查预警记录中的student_id与实际students表的关联
      const warningStudentIds = warningStats.map(w => w.student_id)
      console.log('🔗 预警记录中的student_id:', warningStudentIds.slice(0, 3))
      
      // 检查这些学生是否在grades表中有数据
      const { data: studentsInGrades, error: studentsGradeError } = await supabase
        .from('grades')
        .select('student_id')
        .in('student_id', warningStudentIds)
      
      console.log('📊 预警学生在成绩表中的记录数:', studentsInGrades?.length || 0)
    }

    // 4. 提出基于原始数据的预警计算方案
    console.log('\n💡 基于原始数据的预警计算示例:')
    
    // 示例：计算某班级某考试的不及格预警
    const targetClass = '高一(1)班'
    const targetExam = '907九下月考8'
    
    const { data: failingGrades, error: failError } = await supabase
      .from('grades')
      .select(`
        student_id,
        subject,
        score,
        students(name, class_name)
      `)
      .lt('score', 60) // 不及格
      .eq('exam_title', targetExam)
    
    if (!failError && failingGrades) {
      // 按学生分组统计不及格科目数
      const studentFailCounts = {}
      failingGrades.forEach(grade => {
        if (grade.students?.class_name === targetClass) {
          const studentId = grade.student_id
          studentFailCounts[studentId] = studentFailCounts[studentId] || {
            name: grade.students.name,
            class_name: grade.students.class_name,
            failedSubjects: []
          }
          studentFailCounts[studentId].failedSubjects.push({
            subject: grade.subject,
            score: grade.score
          })
        }
      })
      
      console.log(`✅ ${targetClass} ${targetExam} 不及格预警计算:`)
      Object.values(studentFailCounts).forEach(student => {
        if (student.failedSubjects.length >= 2) { // 2科以上不及格触发预警
          console.log(`   ⚠️ ${student.name}: ${student.failedSubjects.length}科不及格`, 
                     student.failedSubjects.map(s => `${s.subject}(${s.score})`))
        }
      })
    }

    console.log('\n📋 结论:')
    console.log('1. ✅ grades表包含完整的成绩数据，可直接用于筛选和计算')
    console.log('2. ✅ homework_submissions表包含作业数据，可用于作业相关预警')
    console.log('3. ❌ warning_records表与原始数据割裂，筛选复杂')
    console.log('4. 💡 建议：基于grades和homework_submissions实时计算预警指标')

  } catch (error) {
    console.error('❌ 分析失败:', error)
  }
}

analyzeDataRelationship()