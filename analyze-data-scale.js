import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeDataScale() {
  console.log('🔍 分析数据库规模...')
  
  try {
    // 1. 分析各表的数据量
    console.log('\n📊 数据表规模统计:')
    
    // 学生表
    const { count: studentCount, error: studentError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
    
    console.log(`👥 students表: ${studentCount}条记录`)
    
    // 成绩表
    const { count: gradeCount, error: gradeError } = await supabase
      .from('grades')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📚 grades表: ${gradeCount}条记录`)
    
    // 预警记录表
    const { count: warningCount, error: warningError } = await supabase
      .from('warning_records')
      .select('*', { count: 'exact', head: true })
    
    console.log(`⚠️ warning_records表: ${warningCount}条记录`)
    
    // 2. 分析数据分布
    console.log('\n📈 数据分布分析:')
    
    // 按班级统计学生分布
    const { data: classDistribution, error: classError } = await supabase
      .from('students')
      .select('class_name')
      .not('class_name', 'is', null)
    
    if (!classError && classDistribution) {
      const classCounts = {}
      classDistribution.forEach(student => {
        classCounts[student.class_name] = (classCounts[student.class_name] || 0) + 1
      })
      
      console.log('📚 学生班级分布:')
      Object.entries(classCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([className, count]) => {
          console.log(`   ${className}: ${count}人`)
        })
      
      console.log(`   总计: ${Object.keys(classCounts).length}个班级`)
    }
    
    // 按考试统计成绩分布
    const { data: examDistribution, error: examError } = await supabase
      .from('grades')
      .select('exam_title')
      .not('exam_title', 'is', null)
    
    if (!examError && examDistribution) {
      const examCounts = {}
      examDistribution.forEach(grade => {
        examCounts[grade.exam_title] = (examCounts[grade.exam_title] || 0) + 1
      })
      
      console.log('\n📊 考试成绩分布:')
      Object.entries(examCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([examTitle, count]) => {
          console.log(`   ${examTitle}: ${count}条成绩`)
        })
      
      console.log(`   总计: ${Object.keys(examCounts).length}个考试`)
    }
    
    // 3. 分析查询性能影响
    console.log('\n⚡ 性能分析:')
    
    // 测试简单查询性能
    const startTime = Date.now()
    const { data: sampleGrades, error: sampleError } = await supabase
      .from('grades')
      .select(`
        student_id,
        subject,
        score,
        exam_title,
        students!inner(
          student_id,
          name,
          class_name
        )
      `)
      .limit(1000)
    
    const queryTime = Date.now() - startTime
    console.log(`📊 查询1000条成绩记录耗时: ${queryTime}ms`)
    
    // 测试班级筛选性能
    const classStartTime = Date.now()
    const { data: classGrades, error: classGradeError } = await supabase
      .from('grades')
      .select(`
        student_id,
        subject,
        score,
        students!inner(class_name)
      `)
      .eq('students.class_name', '高一(1)班')
      .limit(1000)
    
    const classQueryTime = Date.now() - classStartTime
    console.log(`📚 班级筛选查询耗时: ${classQueryTime}ms`)
    
    // 4. 评估架构切换影响
    console.log('\n🔄 架构切换评估:')
    console.log('✅ 优势:')
    console.log('   - 筛选器直接作用于成绩数据，逻辑清晰')
    console.log('   - 数据一致性好，无需同步预警记录')
    console.log('   - 减少复杂的多表JOIN查询')
    
    console.log('⚠️ 挑战:')
    if (gradeCount > 100000) {
      console.log('   - 成绩数据量较大，需要优化查询性能')
      console.log('   - 考虑添加数据库索引')
      console.log('   - 可能需要分页或限制查询范围')
    }
    
    if (studentCount > 50000) {
      console.log('   - 学生数据量大，全量计算可能较慢')
      console.log('   - 建议优先使用筛选条件')
      console.log('   - 考虑缓存机制')
    }
    
    console.log('\n📋 修改范围评估:')
    console.log('🔧 需要修改的文件:')
    console.log('   1. src/services/warningService.ts - 替换getWarningStatistics函数')
    console.log('   2. 无需修改前端组件（接口保持兼容）')
    console.log('   3. 无需修改数据库结构')
    
    console.log('✨ 建议的切换策略:')
    console.log('   1. 保留旧函数作为备份')
    console.log('   2. 添加新函数并逐步测试')
    console.log('   3. 添加性能优化（索引、分页）')
    console.log('   4. 提供开关机制方便回退')

  } catch (error) {
    console.error('❌ 分析失败:', error)
  }
}

analyzeDataScale()