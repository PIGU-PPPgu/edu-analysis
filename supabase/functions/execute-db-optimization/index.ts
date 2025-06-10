import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 开始执行数据库性能优化...')

    const optimizationResults = {
      indexes_created: 0,
      views_created: 0,
      functions_created: 0,
      errors: [] as string[]
    }

    // 创建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name)',
      'CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id)', 
      'CREATE INDEX IF NOT EXISTS idx_students_name ON students(name)',
      'CREATE INDEX IF NOT EXISTS idx_grade_data_exam_id ON grade_data(exam_id)',
      'CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name)',
      'CREATE INDEX IF NOT EXISTS idx_grade_data_subject ON grade_data(subject)',
      'CREATE INDEX IF NOT EXISTS idx_grade_data_score ON grade_data(score) WHERE score IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_grade_data_exam_class ON grade_data(exam_id, class_name)',
      'CREATE INDEX IF NOT EXISTS idx_grade_data_student_subject ON grade_data(student_id, subject)',
      'CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_exams_type ON exams(type)',
      'CREATE INDEX IF NOT EXISTS idx_class_info_grade_level ON class_info(grade_level)'
    ]

    // 执行索引创建
    for (const indexSql of indexes) {
      try {
        const { error } = await supabaseClient.rpc('exec_sql', { sql: indexSql })
        if (error && !error.message.includes('already exists')) {
          console.log(`索引创建失败: ${error.message}`)
          optimizationResults.errors.push(`索引: ${error.message}`)
        } else {
          optimizationResults.indexes_created++
          console.log(`✅ 索引创建成功`)
        }
      } catch (err) {
        console.log(`索引创建异常: ${err.message}`)
        optimizationResults.errors.push(`索引异常: ${err.message}`)
      }
    }

    // 创建性能视图
    const views = [
      {
        name: 'class_performance_summary',
        sql: `
          CREATE OR REPLACE VIEW class_performance_summary AS
          SELECT 
              c.class_name,
              c.grade_level,
              c.homeroom_teacher,
              COUNT(DISTINCT s.id) as student_count,
              ROUND(AVG(gd.score), 2) as average_score,
              COUNT(CASE WHEN gd.score >= 90 THEN 1 END) as excellent_count,
              COUNT(CASE WHEN gd.score >= 60 THEN 1 END) as pass_count,
              ROUND(
                  COUNT(CASE WHEN gd.score >= 60 THEN 1 END)::DECIMAL / 
                  NULLIF(COUNT(gd.score), 0) * 100, 2
              ) as pass_rate,
              MAX(gd.updated_at) as last_updated
          FROM class_info c
          LEFT JOIN students s ON c.class_name = s.class_name
          LEFT JOIN grade_data gd ON s.student_id = gd.student_id
          WHERE gd.score IS NOT NULL
          GROUP BY c.class_name, c.grade_level, c.homeroom_teacher
        `
      },
      {
        name: 'student_grade_summary',
        sql: `
          CREATE OR REPLACE VIEW student_grade_summary AS
          SELECT 
              s.student_id,
              s.name,
              s.class_name,
              s.grade,
              COUNT(gd.id) as total_records,
              ROUND(AVG(gd.score), 2) as average_score,
              MAX(gd.score) as highest_score,
              MIN(gd.score) as lowest_score,
              COUNT(DISTINCT gd.subject) as subject_count,
              MAX(gd.updated_at) as last_exam_date
          FROM students s
          LEFT JOIN grade_data gd ON s.student_id = gd.student_id
          WHERE gd.score IS NOT NULL
          GROUP BY s.student_id, s.name, s.class_name, s.grade
        `
      },
      {
        name: 'subject_analysis_view',
        sql: `
          CREATE OR REPLACE VIEW subject_analysis_view AS
          SELECT 
              gd.subject,
              gd.class_name,
              COUNT(*) as student_count,
              ROUND(AVG(gd.score), 2) as average_score,
              ROUND(STDDEV(gd.score), 2) as score_stddev,
              MAX(gd.score) as max_score,
              MIN(gd.score) as min_score,
              COUNT(CASE WHEN gd.score >= 90 THEN 1 END) as excellent_count
          FROM grade_data gd
          WHERE gd.score IS NOT NULL AND gd.subject IS NOT NULL
          GROUP BY gd.subject, gd.class_name
        `
      }
    ]

    // 执行视图创建
    for (const view of views) {
      try {
        const { error } = await supabaseClient.rpc('exec_sql', { sql: view.sql })
        if (error) {
          console.log(`视图创建失败 ${view.name}: ${error.message}`)
          optimizationResults.errors.push(`视图 ${view.name}: ${error.message}`)
        } else {
          optimizationResults.views_created++
          console.log(`✅ 视图创建成功: ${view.name}`)
        }
      } catch (err) {
        console.log(`视图创建异常 ${view.name}: ${err.message}`)
        optimizationResults.errors.push(`视图异常 ${view.name}: ${err.message}`)
      }
    }

    // 创建优化函数
    const functions = [
      {
        name: 'get_class_score_distribution',
        sql: `
          CREATE OR REPLACE FUNCTION get_class_score_distribution(
              p_class_name TEXT,
              p_subject TEXT DEFAULT NULL
          )
          RETURNS TABLE(
              score_range TEXT,
              student_count BIGINT,
              percentage NUMERIC
          ) AS $$
          BEGIN
              RETURN QUERY
              WITH score_ranges AS (
                  SELECT 
                      CASE 
                          WHEN score >= 90 THEN '90-100分'
                          WHEN score >= 80 THEN '80-89分'
                          WHEN score >= 70 THEN '70-79分'
                          WHEN score >= 60 THEN '60-69分'
                          ELSE '60分以下'
                      END as range,
                      score
                  FROM grade_data gd
                  WHERE gd.class_name = p_class_name
                  AND (p_subject IS NULL OR gd.subject = p_subject)
                  AND gd.score IS NOT NULL
              ),
              total_count AS (
                  SELECT COUNT(*) as total FROM score_ranges
              )
              SELECT 
                  sr.range,
                  COUNT(*)::BIGINT as count,
                  ROUND(COUNT(*)::NUMERIC / NULLIF(tc.total, 0) * 100, 2) as pct
              FROM score_ranges sr, total_count tc
              GROUP BY sr.range, tc.total
              ORDER BY 
                  CASE sr.range
                      WHEN '90-100分' THEN 1
                      WHEN '80-89分' THEN 2
                      WHEN '70-79分' THEN 3
                      WHEN '60-69分' THEN 4
                      WHEN '60分以下' THEN 5
                  END;
          END;
          $$ LANGUAGE plpgsql;
        `
      }
    ]

    // 执行函数创建  
    for (const func of functions) {
      try {
        const { error } = await supabaseClient.rpc('exec_sql', { sql: func.sql })
        if (error) {
          console.log(`函数创建失败 ${func.name}: ${error.message}`)
          optimizationResults.errors.push(`函数 ${func.name}: ${error.message}`)
        } else {
          optimizationResults.functions_created++
          console.log(`✅ 函数创建成功: ${func.name}`)
        }
      } catch (err) {
        console.log(`函数创建异常 ${func.name}: ${err.message}`)
        optimizationResults.errors.push(`函数异常 ${func.name}: ${err.message}`)
      }
    }

    // 分析表统计信息
    const tables = ['students', 'grade_data', 'exams', 'class_info']
    for (const table of tables) {
      try {
        const { error } = await supabaseClient.rpc('exec_sql', { 
          sql: `ANALYZE ${table}` 
        })
        if (error) {
          console.log(`表分析失败 ${table}: ${error.message}`)
        } else {
          console.log(`✅ 表分析完成: ${table}`)
        }
      } catch (err) {
        console.log(`表分析异常 ${table}: ${err.message}`)
      }
    }

    console.log('✅ 数据库优化完成')
    
    return new Response(
      JSON.stringify({
        success: true,
        message: '数据库优化执行完成',
        results: optimizationResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('数据库优化失败:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 