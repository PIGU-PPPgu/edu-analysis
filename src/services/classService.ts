import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 视图存在状态缓存，避免重复检查视图
const viewStatusCache = {
  class_statistics: null as boolean | null,
  mv_class_subject_stats: null as boolean | null,
  mv_class_exam_trends: null as boolean | null,
  mv_class_subject_competency: null as boolean | null,
  mv_class_subject_correlation: null as boolean | null
};

// 检查视图是否存在
async function checkViewExists(viewName: string): Promise<boolean> {
  // 如果缓存中有结果，直接返回
  if (viewStatusCache[viewName as keyof typeof viewStatusCache] !== null) {
    return !!viewStatusCache[viewName as keyof typeof viewStatusCache];
  }
  
  try {
    // 尝试查询视图
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1);
    
    // 更新缓存
    const exists = !error;
    viewStatusCache[viewName as keyof typeof viewStatusCache] = exists;
    
    return exists;
  } catch (e) {
    // 更新缓存
    viewStatusCache[viewName as keyof typeof viewStatusCache] = false;
    return false;
  }
}

export interface ClassStatistics {
  class_id: string;
  class_name: string;
  grade: string;
  student_count: number;
  homework_count: number;
  average_score: number;
  excellent_rate: number;
}

/**
 * 获取所有班级的统计信息（包含降级方案）
 */
export async function getAllClasses(): Promise<any[]> {
  try {
    // 检查视图是否存在
    const viewExists = await checkViewExists('class_statistics');
    
    // 视图存在，直接查询
    if (viewExists) {
      const { data: statsData, error: statsError } = await supabase
        .from('class_statistics')
        .select('*');
      
      if (!statsError) {
        return statsData.map(item => ({
          id: item.class_id,
          name: item.class_name,
          grade: item.grade,
          studentCount: item.student_count,
          homeworkCount: item.homework_count,
          averageScore: item.average_score,
          excellentRate: item.excellent_rate
        }));
      }
    }
    
    console.warn('class_statistics视图不存在，降级为基础查询');
    toast.warning('正在使用基础班级数据，部分统计信息可能不可用');
    
    // 视图不存在，降级为查询原始classes表
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*');

    if (classesError) {
      console.error('获取班级列表失败:', classesError);
      toast.error(`获取班级列表失败: ${classesError.message}`);
      return [];
    }

    // 对每个班级单独获取统计数据，并转换为与Class接口一致的格式
    const enrichedClasses = [];
    
    for (const cls of classesData) {
      // 获取学生数量
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', cls.id);
        
      // 获取作业数量  
      const { data: homeworks, error: homeworksError } = await supabase
        .from('homework')
        .select('id')
        .eq('class_id', cls.id);
      
      // 添加带有统计数据的班级，保持原始字段名称与Class接口一致
      enrichedClasses.push({
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        created_at: cls.created_at,
        studentCount: students?.length || 0,
        homeworkCount: homeworks?.length || 0,
        averageScore: 0,   // 暂无法获取，设为默认值
        excellentRate: 0   // 暂无法获取，设为默认值
      });
    }
    
    return enrichedClasses;
  } catch (error: any) {
    console.error('获取班级列表异常:', error);
    toast.error(`获取班级列表失败: ${error?.message || '未知错误'}`);
    return [];
  }
}

/**
 * 根据ID获取班级详情
 * @param classId 班级ID
 * @returns 班级详情对象或null
 */
export async function getClassById(classId: string) {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) {
      console.error('获取班级详情失败:', error);
      toast.error(`获取班级详情失败: ${error.message}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('获取班级详情异常:', error);
    toast.error(`获取班级详情失败: ${error.message}`);
    return null;
  }
}

/**
 * 创建新班级
 * @param classData 班级数据对象
 * @returns 创建的班级对象或null
 */
export async function createClass(classData: { name: string; grade: string }) {
  try {
    const { data, error } = await supabase
      .from('classes')
      .insert([classData])
      .select();

    if (error) {
      console.error('创建班级失败:', error);
      toast.error(`创建班级失败: ${error.message}`);
      return null;
    }

    toast.success('班级创建成功');
    return data?.[0] || null;
  } catch (error) {
    console.error('创建班级异常:', error);
    toast.error(`创建班级失败: ${error.message}`);
    return null;
  }
}

/**
 * 更新班级信息
 * @param classId 班级ID
 * @param classData 更新的班级数据
 * @returns 是否成功
 */
export async function updateClass(
  classId: string,
  classData: { name?: string; grade?: string }
) {
  try {
    const { error } = await supabase
      .from('classes')
      .update(classData)
      .eq('id', classId);

    if (error) {
      console.error('更新班级信息失败:', error);
      toast.error(`更新班级信息失败: ${error.message}`);
      return false;
    }

    toast.success('班级信息更新成功');
    return true;
  } catch (error) {
    console.error('更新班级信息异常:', error);
    toast.error(`更新班级信息失败: ${error.message}`);
    return false;
  }
}

/**
 * 删除班级
 * @param classId 班级ID
 * @returns 是否成功
 */
export async function deleteClass(classId: string) {
  try {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) {
      console.error('删除班级失败:', error);
      toast.error(`删除班级失败: ${error.message}`);
      return false;
    }

    toast.success('班级删除成功');
    return true;
  } catch (error) {
    console.error('删除班级异常:', error);
    toast.error(`删除班级失败: ${error.message}`);
    return false;
  }
}

/**
 * 获取班级学生列表
 * @param classId 班级ID
 * @returns 学生列表数组
 */
export async function getClassStudents(classId: string) {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('name');

    if (error) {
      console.error('获取班级学生列表失败:', error);
      toast.error(`获取班级学生列表失败: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取班级学生列表异常:', error);
    toast.error(`获取班级学生列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取班级作业列表
 * @param classId 班级ID
 * @returns 作业列表数组
 */
export async function getClassHomeworks(classId: string) {
  try {
    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取班级作业列表失败:', error);
      toast.error(`获取班级作业列表失败: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取班级作业列表异常:', error);
    toast.error(`获取班级作业列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取班级的详细分析数据，包括BoxPlot数据、趋势数据和能力维度数据
 */
export async function getClassDetailedAnalysisData(classId: string) {
  try {
    // 1. 首先检查班级是否存在
    const { data: classInfo, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle();

    if (classError || !classInfo) {
      throw new Error(`获取班级信息失败: ${classError?.message || "班级不存在"}`);
    }

    // 2. 获取该班级的所有学生
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', classId);

    if (studentsError) {
      throw new Error(`获取班级学生失败: ${studentsError.message}`);
    }

    // 如果班级没有学生，返回空数据
    if (!students || students.length === 0) {
      return {
        boxPlotData: [],
        trendData: [],
        competencyData: []
      };
    }

    const studentIds = students.map(s => s.id);

    // 3. 获取所有考试成绩信息
    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('id, student_id, subject, score, exam_type, exam_date')
      .in('student_id', studentIds);

    if (gradesError) {
      throw new Error(`获取成绩数据失败: ${gradesError.message}`);
    }

    // 4. 计算 BoxPlot 数据 (按学科分组)
    const boxPlotData = calculateBoxPlotData(grades);

    // 5. 计算趋势数据 (按考试类型和日期分组)
    const trendData = await calculateTrendData(classId, grades);

    // 6. 计算能力维度数据
    const competencyData = await calculateCompetencyData(classId);

    return {
      boxPlotData,
      trendData,
      competencyData
    };
  } catch (error: any) {
    console.error("获取班级详细分析数据失败:", error);
    throw new Error(`获取班级详细分析数据失败: ${error.message}`);
  }
}

/**
 * 计算BoxPlot数据
 */
function calculateBoxPlotData(grades: any[]) {
  if (!grades || grades.length === 0) return [];

  // 按学科分组
  const subjectGroups: Record<string, number[]> = {};

  grades.forEach(grade => {
    if (!grade.subject || grade.score === null || grade.score === undefined) return;
    
    if (!subjectGroups[grade.subject]) {
      subjectGroups[grade.subject] = [];
    }
    
    subjectGroups[grade.subject].push(grade.score);
  });

  // 对每个学科计算BoxPlot数据
  return Object.entries(subjectGroups).map(([subject, scores]) => {
    // 排序分数
    scores.sort((a, b) => a - b);
    
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const median = calculateMedian(scores);
    const q1 = calculateQuantile(scores, 0.25);
    const q3 = calculateQuantile(scores, 0.75);
    
    return {
      subject,
      min,
      q1,
      median,
      q3,
      max
    };
  });
}

/**
 * 计算中位数
 */
function calculateMedian(sortedArray: number[]) {
  const mid = Math.floor(sortedArray.length / 2);
  return sortedArray.length % 2 === 0
    ? (sortedArray[mid - 1] + sortedArray[mid]) / 2
    : sortedArray[mid];
}

/**
 * 计算分位数
 */
function calculateQuantile(sortedArray: number[], q: number) {
  const pos = q * (sortedArray.length - 1);
  const base = Math.floor(pos);
  const rest = pos - base;
  
  if (sortedArray[base + 1] !== undefined) {
    return sortedArray[base] + rest * (sortedArray[base + 1] - sortedArray[base]);
  } else {
    return sortedArray[base];
  }
}

/**
 * 计算趋势数据
 */
async function calculateTrendData(classId: string, grades: any[]) {
  if (!grades || grades.length === 0) return [];

  // 获取所有不同的考试类型和日期组合
  const examMap = new Map<string, { type: string, date: string }>();
  
  grades.forEach(grade => {
    if (!grade.exam_type || !grade.exam_date) return;
    const key = `${grade.exam_type}-${grade.exam_date}`;
    examMap.set(key, { type: grade.exam_type, date: grade.exam_date });
  });

  // 按时间排序的考试列表
  const sortedExams = Array.from(examMap.values()).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // 计算每次考试的班级平均分和年级平均分
  const trendData = await Promise.all(
    sortedExams.map(async ({ type, date }) => {
      // 该班级的分数
      const classScores = grades.filter(
        g => g.exam_type === type && g.exam_date === date
      ).map(g => g.score);
      
      // 全年级的分数
      const { data: allGrades, error } = await supabase
        .from('grades')
        .select('score')
        .eq('exam_type', type)
        .eq('exam_date', date);
      
      if (error) {
        console.error("获取年级成绩失败:", error);
        return null;
      }
      
      const gradeScores = allGrades.map(g => g.score);
      
      const classAvg = classScores.length > 0
        ? classScores.reduce((sum, score) => sum + score, 0) / classScores.length
        : 0;
        
      const gradeAvg = gradeScores.length > 0
        ? gradeScores.reduce((sum, score) => sum + score, 0) / gradeScores.length
        : 0;
      
      return {
        examName: type,
        classAvg: parseFloat(classAvg.toFixed(1)),
        gradeAvg: parseFloat(gradeAvg.toFixed(1))
      };
    })
  );
  
  return trendData.filter(Boolean);
}

/**
 * 计算能力维度数据
 */
async function calculateCompetencyData(classId: string) {
  // 这部分数据较为复杂，需要结合多个表和业务逻辑
  // 暂时返回模拟数据，实际项目中可根据具体需求实现
  // 能力维度可以从学生作业、考试、课堂表现等多方面数据计算得出
  return [
    { name: "知识理解", current: 85, average: 78, fullScore: 100 },
    { name: "应用能力", current: 76, average: 70, fullScore: 100 },
    { name: "分析能力", current: 68, average: 65, fullScore: 100 },
    { name: "创新思维", current: 72, average: 62, fullScore: 100 },
    { name: "表达能力", current: 80, average: 75, fullScore: 100 },
    { name: "合作学习", current: 88, average: 82, fullScore: 100 },
  ];
}

/**
 * 获取所有班级的详细分析数据
 */
export async function getAllClassesAnalysisData() {
  try {
    // 获取所有班级
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('*');

    if (classesError) {
      throw new Error(`获取班级列表失败: ${classesError.message}`);
    }

    // 为每个班级获取详细分析数据
    const analysisData: Record<string, any> = {
      boxPlotData: {},
      trendData: {},
      competencyData: {}
    };

    await Promise.all(classes.map(async (cls) => {
      try {
        const data = await getClassDetailedAnalysisData(cls.id);
        
        analysisData.boxPlotData[cls.id] = data.boxPlotData;
        analysisData.trendData[cls.id] = data.trendData;
        analysisData.competencyData[cls.id] = data.competencyData;
      } catch (error) {
        console.error(`获取班级 ${cls.name} 详细数据失败:`, error);
      }
    }));

    return analysisData;
  } catch (error: any) {
    console.error("获取所有班级详细分析数据失败:", error);
    throw new Error(`获取所有班级详细分析数据失败: ${error.message}`);
  }
}

/**
 * 从物化视图获取学科分析数据
 * @param classId 班级ID
 * @returns 包含学科分析各维度数据的对象
 */
export async function getSubjectAnalysisData(classId: string) {
  try {
    // 定义返回数据结构
    const result = {
      performance: {} as Record<string, any[]>,
      correlation: {} as Record<string, number>,
      trends: {} as Record<string, any[]>,
      knowledgePoints: {} as Record<string, any[]>,
    };

    // 1. 获取学科成绩表现数据，优先使用物化视图
    const viewExists = await checkViewExists('mv_class_subject_stats');
    
    if (viewExists) {
      const { data: subjectStats, error: subjectStatsError } = await supabase
        .from('mv_class_subject_stats')
        .select('*')
        .eq('class_id', classId);
        
      if (!subjectStatsError && subjectStats && subjectStats.length > 0) {
        // 使用物化视图数据
        const subjects = [...new Set(subjectStats.map(item => item.subject))];
        
        subjects.forEach(subject => {
          const subjectData = subjectStats.find(item => item.subject === subject);
          if (subjectData) {
            // 构建分数分布数据
            // 注意：物化视图中没有直接提供分数分布数据，这里需要合成
            // 实际应用中可以考虑增加物化视图中的分数分布信息
            const estimatedDistribution = [
              { range: "0-59", count: Math.round(subjectData.student_count * (1 - subjectData.pass_rate / 100)) },
              { range: "60-69", count: Math.round(subjectData.student_count * 0.2) },
              { range: "70-79", count: Math.round(subjectData.student_count * 0.2) },
              { range: "80-89", count: Math.round(subjectData.student_count * 0.2) },
              { range: "90-100", count: Math.round(subjectData.student_count * (subjectData.excellent_rate / 100)) },
            ];
            
            result.performance[subject] = [{
              subject,
              averageScore: subjectData.average_score,
              medianScore: subjectData.median_score,
              minScore: subjectData.min_score,
              maxScore: subjectData.max_score,
              passRate: subjectData.pass_rate,
              excellentRate: subjectData.excellent_rate,
              scoreDeviation: subjectData.score_deviation,
              scoreDistribution: estimatedDistribution
            }];
          }
        });
      }
    } else {
      console.warn('物化视图mv_class_subject_stats不存在，降级为基础查询');
      // 如果没有物化视图，降级方案可以使用原始查询
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('*, students!inner(*)')
        .eq('students.class_id', classId);

      if (!gradesError && grades) {
        // 按学科分组处理数据
        const subjectGroups = grades.reduce((acc, grade) => {
          if (!acc[grade.subject]) {
            acc[grade.subject] = [];
          }
          acc[grade.subject].push(grade);
          return acc;
        }, {});

        // 计算每个学科的统计信息
        Object.entries(subjectGroups).forEach(([subject, grades]: [string, any[]]) => {
          const scores = grades.map(g => Number(g.score));
          scores.sort((a, b) => a - b);
          
          // 计算分数分布
          const scoreDistribution = [
            { range: "0-59", count: scores.filter(s => s < 60).length },
            { range: "60-69", count: scores.filter(s => s >= 60 && s < 70).length },
            { range: "70-79", count: scores.filter(s => s >= 70 && s < 80).length },
            { range: "80-89", count: scores.filter(s => s >= 80 && s < 90).length },
            { range: "90-100", count: scores.filter(s => s >= 90).length },
          ];
          
          // 计算统计指标
          const sum = scores.reduce((a, b) => a + b, 0);
          const avg = sum / scores.length;
          const medianIndex = Math.floor(scores.length / 2);
          const median = scores.length % 2 === 0 
            ? (scores[medianIndex - 1] + scores[medianIndex]) / 2 
            : scores[medianIndex];
            
          result.performance[subject] = [{
            subject,
            averageScore: avg,
            medianScore: median,
            minScore: Math.min(...scores),
            maxScore: Math.max(...scores),
            passRate: (scores.filter(s => s >= 60).length / scores.length) * 100,
            excellentRate: (scores.filter(s => s >= 90).length / scores.length) * 100,
            scoreDistribution
          }];
        });
      }
    }

    // 2. 获取学科趋势数据
    const trendsViewExists = await checkViewExists('mv_class_exam_trends');
    
    if (trendsViewExists) {
      const { data: trendData, error: trendError } = await supabase
        .from('mv_class_exam_trends')
        .select('*')
        .eq('class_id', classId);
        
      if (!trendError && trendData && trendData.length > 0) {
        // 使用物化视图数据，按学科分组处理
        const subjects = [...new Set(trendData.map(item => item.subject))];
        
        subjects.forEach(subject => {
          const subjectTrends = trendData
            .filter(item => item.subject === subject)
            .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
            
          result.trends[subject] = subjectTrends.map(trend => ({
            date: trend.exam_date,
            examType: trend.exam_type,
            averageScore: trend.average_score,
            medianScore: trend.median_score,
            passRate: trend.pass_rate,
            excellentRate: trend.excellent_rate
          }));
        });
      }
    } else {
      console.warn('物化视图mv_class_exam_trends不存在，降级为基础查询');
      // 降级为聚合查询
      const { data: gradesWithDates, error: gradesDateError } = await supabase
        .from('grades')
        .select('*, students!inner(*)')
        .eq('students.class_id', classId)
        .not('exam_date', 'is', null)
        .order('exam_date', { ascending: true });

      if (!gradesDateError && gradesWithDates) {
        // 按学科和日期分组
        const subjectDateGroups = gradesWithDates.reduce((acc, grade) => {
          if (!acc[grade.subject]) {
            acc[grade.subject] = {};
          }
          
          const dateKey = grade.exam_date;
          if (!acc[grade.subject][dateKey]) {
            acc[grade.subject][dateKey] = [];
          }
          
          acc[grade.subject][dateKey].push(grade);
          return acc;
        }, {});

        // 处理每个学科的趋势数据
        Object.entries(subjectDateGroups).forEach(([subject, dateGroups]: [string, any]) => {
          result.trends[subject] = Object.entries(dateGroups).map(([date, grades]: [string, any[]]) => {
            const scores = grades.map(g => Number(g.score));
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            return {
              date,
              examType: grades[0].exam_type || '未知考试',
              averageScore: avg,
              medianScore: calculateMedian(scores.sort((a, b) => a - b)),
              passRate: (scores.filter(s => s >= 60).length / scores.length) * 100,
              excellentRate: (scores.filter(s => s >= 90).length / scores.length) * 100
            };
          });
        });
      }
    }

    // 3. 获取知识点掌握数据
    const competencyViewExists = await checkViewExists('mv_class_subject_competency');
    
    if (competencyViewExists) {
      const { data: knowledgeData, error: knowledgeError } = await supabase
        .from('mv_class_subject_competency')
        .select('*')
        .eq('class_id', classId);
        
      if (!knowledgeError && knowledgeData && knowledgeData.length > 0) {
        // 这里使用一个临时方案，尝试从其他地方获取知识点-学科映射
        const { data: knowledgeSubjectMap, error: mapError } = await supabase
          .from('knowledge_points')
          .select('id, subject_id, subject:subject_id(name)');
          
        // 构建知识点到学科的映射
        const pointToSubject = {};
        if (!mapError && knowledgeSubjectMap) {
          knowledgeSubjectMap.forEach(item => {
            pointToSubject[item.id] = item.subject?.name || '未知学科';
          });
        }
        
        // 按知识点ID分组
        const pointGroups = knowledgeData.reduce((acc, item) => {
          const pointId = item.knowledge_point_id;
          if (!acc[pointId]) {
            acc[pointId] = [];
          }
          acc[pointId].push(item);
          return acc;
        }, {});
        
        // 构建每个知识点的数据
        Object.entries(pointGroups).forEach(([pointId, items]: [string, any[]]) => {
          // 获取该知识点对应的学科
          const subjectName = pointToSubject[pointId] || '未知学科';
          
          if (!result.knowledgePoints[subjectName]) {
            result.knowledgePoints[subjectName] = [];
          }
          
          // 使用第一个记录的数据（应该是相同的）
          const item = items[0];
          result.knowledgePoints[subjectName].push({
            id: pointId,
            name: item.knowledge_point_name,
            category: '知识点', // 物化视图中可能没有这个字段
            masteryRate: item.average_mastery
          });
        });
      }
    } else {
      console.warn('物化视图mv_class_subject_competency不存在，降级为基础查询');
      // 降级为原始查询
      // 首先获取班级学生的所有知识点掌握记录
      const { data: knowledgeMastery, error: knowledgeMasteryError } = await supabase
        .from('student_knowledge_mastery')
        .select('*, knowledge_points(*), students!inner(*)')
        .eq('students.class_id', classId);

      if (!knowledgeMasteryError && knowledgeMastery) {
        // 按知识点分组并关联到对应的学科
        const knowledgeBySubject = knowledgeMastery.reduce((acc, record) => {
          // 这里假设在knowledge_points表中有subject_id字段或可通过其他关联获取学科信息
          // 如果结构不同，需要调整查询或此处逻辑
          const subjectName = record.knowledge_points?.subject || 'unknown';
          
          if (!acc[subjectName]) {
            acc[subjectName] = {};
          }
          
          const pointId = record.knowledge_point_id;
          if (!acc[subjectName][pointId]) {
            acc[subjectName][pointId] = {
              id: pointId,
              name: record.knowledge_points?.name || '未知知识点',
              category: record.knowledge_points?.category || '未分类',
              masteryLevels: [],
              masteryRate: 0
            };
          }
          
          acc[subjectName][pointId].masteryLevels.push(record.mastery_level);
          return acc;
        }, {});

        // 计算每个知识点的平均掌握度
        Object.entries(knowledgeBySubject).forEach(([subject, points]: [string, any]) => {
          result.knowledgePoints[subject] = Object.values(points).map((point: any) => {
            const avgMastery = point.masteryLevels.reduce((a: number, b: number) => a + b, 0) / point.masteryLevels.length;
            return {
              ...point,
              masteryRate: avgMastery
            };
          });
        });
      }
    }

    // 4. 获取学科相关性数据
    const correlationViewExists = await checkViewExists('mv_class_subject_correlation');
    
    if (correlationViewExists) {
      const { data: correlationData, error: correlationError } = await supabase
        .from('mv_class_subject_correlation')
        .select('*')
        .eq('class_id', classId);
        
      if (!correlationError && correlationData && correlationData.length > 0) {
        correlationData.forEach(item => {
          result.correlation[`${item.subject_a}-${item.subject_b}`] = item.correlation_coefficient;
        });
      }
    } else {
      console.warn('物化视图mv_class_subject_correlation不存在，降级为基础查询');
      // 这部分较复杂，需要手动计算学科间的相关性
      // 获取班级所有学生的所有学科成绩
      const { data: studentScores, error: scoresError } = await supabase
        .from('grades')
        .select('student_id, subject, score')
        .in('student_id', function(qb) {
          qb.select('id')
            .from('students')
            .eq('class_id', classId);
        });

      if (!scoresError && studentScores) {
        // 按学生ID和学科分组
        const studentSubjectScores = studentScores.reduce((acc, record) => {
          if (!acc[record.student_id]) {
            acc[record.student_id] = {};
          }
          
          if (!acc[record.student_id][record.subject]) {
            acc[record.student_id][record.subject] = [];
          }
          
          acc[record.student_id][record.subject].push(Number(record.score));
          return acc;
        }, {});
        
        // 计算每个学生每个学科的平均分
        const studentAvgScores = {};
        Object.entries(studentSubjectScores).forEach(([studentId, subjects]: [string, any]) => {
          studentAvgScores[studentId] = {};
          Object.entries(subjects).forEach(([subject, scores]: [string, number[]]) => {
            studentAvgScores[studentId][subject] = scores.reduce((a, b) => a + b, 0) / scores.length;
          });
        });
        
        // 获取所有学科
        const allSubjects = [...new Set(studentScores.map(record => record.subject))];
        
        // 计算两两学科之间的相关性
        for (let i = 0; i < allSubjects.length; i++) {
          for (let j = i + 1; j < allSubjects.length; j++) {
            const subjectA = allSubjects[i];
            const subjectB = allSubjects[j];
            
            // 提取同时有这两个学科成绩的学生数据
            const commonStudents = Object.entries(studentAvgScores)
              .filter(([, subjects]: [string, any]) => subjects[subjectA] && subjects[subjectB])
              .map(([studentId, subjects]: [string, any]) => ({
                scoreA: subjects[subjectA],
                scoreB: subjects[subjectB]
              }));
            
            if (commonStudents.length >= 3) { // 至少需要3个样本才能计算相关性
              // 计算Pearson相关系数
              const n = commonStudents.length;
              const sumA = commonStudents.reduce((sum, student) => sum + student.scoreA, 0);
              const sumB = commonStudents.reduce((sum, student) => sum + student.scoreB, 0);
              const sumAB = commonStudents.reduce((sum, student) => sum + student.scoreA * student.scoreB, 0);
              const sumASq = commonStudents.reduce((sum, student) => sum + student.scoreA * student.scoreA, 0);
              const sumBSq = commonStudents.reduce((sum, student) => sum + student.scoreB * student.scoreB, 0);
              
              const numerator = n * sumAB - sumA * sumB;
              const denominator = Math.sqrt((n * sumASq - sumA * sumA) * (n * sumBSq - sumB * sumB));
              
              const correlation = denominator === 0 ? 0 : numerator / denominator;
              
              // 存储相关系数
              result.correlation[`${subjectA}-${subjectB}`] = correlation;
            }
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error('获取学科分析数据失败:', error);
    toast.error(`获取学科分析数据失败: ${error.message || '未知错误'}`);
    throw error; // 向上抛出错误以便调用方处理
  }
} 