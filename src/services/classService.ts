import { supabase } from "@/integrations/supabase/client";
import { showError, handleError } from "@/services/errorHandler";
import { toast } from "sonner";
import { getCachedData, clearCacheByPattern } from "@/utils/cacheHelpers";

// 班级统计数据接口
interface ClassStatistics {
  class_name: string;
  student_count: number;
  students_with_grades: number;
  total_grade_records: number;
  latest_exam_date: string | null;
  data_consistency_status: string;
}

// 缓存配置
const CACHE_CONFIGS = {
  VIEW_EXISTENCE: 60 * 60 * 1000, // 视图存在性缓存1小时
  CLASS_STATS: 10 * 60 * 1000, // 班级统计缓存10分钟
  EXAM_TRENDS: 15 * 60 * 1000, // 考试趋势缓存15分钟
  GRADE_ANALYSIS: 5 * 60 * 1000, // 成绩分析缓存5分钟
};

/**
 * 从grade_data_new表获取班级成绩统计
 */
async function getClassGradeStatsFromGradeDataNew(classNames: string[]) {
  try {
    const { data, error } = await supabase
      .from("grade_data_new")
      .select("class_name, total_score")
      .in("class_name", classNames)
      .not("total_score", "is", null);

    if (error) {
      console.error("获取成绩统计失败:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 按班级分组计算统计
    const statsMap = new Map();
    data.forEach(record => {
      const className = record.class_name;
      if (!statsMap.has(className)) {
        statsMap.set(className, {
          class_name: className,
          scores: []
        });
      }
      statsMap.get(className).scores.push(record.total_score);
    });

    // 计算每个班级的统计指标
    const result = Array.from(statsMap.values()).map(classData => {
      const scores = classData.scores;
      const avg_score = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const excellent_count = scores.filter(score => score >= 400).length; // 假设400+为优秀
      const excellent_rate = (excellent_count / scores.length) * 100;

      return {
        class_name: classData.class_name,
        avg_score: Math.round(avg_score * 10) / 10,
        excellent_rate: Math.round(excellent_rate * 10) / 10,
        grade_records: scores.length
      };
    });

    return result;
  } catch (error) {
    console.error("获取班级成绩统计时出错:", error);
    return [];
  }
}

// 检查视图是否存在 - 优化版本
async function checkViewExists(viewName: string): Promise<boolean> {
  const cacheKey = `view_exists_${viewName}`;

  return getCachedData(cacheKey, async () => {
    try {
      const { error } = await supabase.from(viewName).select("*").limit(1);
      return !error;
    } catch (error) {
      console.warn(`检查视图 ${viewName} 时出错:`, error);
      return false;
    }
  }, CACHE_CONFIGS.VIEW_EXISTENCE);
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
 * 获取所有班级信息，基于统一数据模型（修复版）
 */
export async function getAllClasses(): Promise<any[]> {
  try {
    console.log("正在获取班级列表...");

    // 从学生数据中获取实际存在的班级列表
    const { data: studentClassData, error: studentError } = await supabase
      .from("students")
      .select("class_name, grade")
      .not("class_name", "is", null);

    if (studentError) {
      console.error("获取学生班级数据失败:", studentError);
      showError(studentError, { operation: '获取学生班级数据', table: 'students' });
      return [];
    }

    if (!studentClassData || studentClassData.length === 0) {
      console.log("未找到任何学生班级数据");
      toast.warning("暂无班级数据");
      return [];
    }

    // 统计每个班级的学生数量和年级信息
    const classStats = new Map();
    studentClassData.forEach(student => {
      const className = student.class_name;
      if (!classStats.has(className)) {
        classStats.set(className, {
          name: className,
          grade: student.grade || '未知',
          studentCount: 0
        });
      }
      classStats.get(className).studentCount++;
    });

    const classNames = Array.from(classStats.keys());
    console.log(`发现${classNames.length}个实际班级:`, classNames.slice(0, 5));

    // 批量获取班级成绩统计
    const [gradeStats, homeworkStats] = await Promise.all([
      getClassGradeStatsFromGradeDataNew(classNames),
      getMultipleClassHomeworkStats(classNames)
    ]);

    // 合并数据
    const enrichedClasses = Array.from(classStats.values()).map(classInfo => {
      const gradeData = gradeStats.find(g => g.class_name === classInfo.name);
      const hwData = homeworkStats.find(h => h.class_name === classInfo.name);

      return {
        id: `class-${classInfo.name.replace(/[^a-zA-Z0-9]/g, '-')}`, // 生成稳定的ID
        name: classInfo.name,
        grade: classInfo.grade,
        studentCount: classInfo.studentCount,
        homeworkCount: hwData?.homework_count || 0,
        averageScore: gradeData?.avg_score || 0,
        excellentRate: gradeData?.excellent_rate || 0,
        gradeRecordCount: gradeData?.grade_records || 0,
        created_at: new Date().toISOString(),
      };
    });
    
    console.log(`成功获取${enrichedClasses.length}个班级的完整信息`);
    return enrichedClasses;

  } catch (error: any) {
    console.error("获取班级列表异常:", error);
    showError(error, { operation: '获取班级列表', table: 'classes' });
    return [];
  }
}

/**
 * 批量获取多个班级的成绩统计
 */
async function getMultipleClassGradeStats(classNames: string[]): Promise<Array<{
  class_name: string;
  avg_score: number;
  excellent_rate: number;
  grade_records: number;
}>> {
  try {
    if (classNames.length === 0) return [];
    
    const { data, error } = await supabase
      .from('grade_data_new')
      .select('class_name, total_score')
      .in('class_name', classNames)
      .not('total_score', 'is', null);
    
    if (error) {
      console.error('获取成绩统计失败:', error);
      return [];
    }
    
    // 按班级聚合统计
    const statsByClass: Record<string, {
      scores: number[];
      excellentCount: number;
    }> = {};
    
    data?.forEach(record => {
      if (!statsByClass[record.class_name]) {
        statsByClass[record.class_name] = {
          scores: [],
          excellentCount: 0
        };
      }
      
      statsByClass[record.class_name].scores.push(record.total_score);
      if (record.total_score >= 85) {
        statsByClass[record.class_name].excellentCount++;
      }
    });
    
    return Object.entries(statsByClass).map(([className, stats]) => ({
      class_name: className,
      avg_score: stats.scores.length > 0 ? Math.round(stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length * 10) / 10 : 0,
      excellent_rate: stats.scores.length > 0 ? Math.round(stats.excellentCount / stats.scores.length * 100 * 10) / 10 : 0,
      grade_records: stats.scores.length
    }));
    
  } catch (error) {
    console.error('批量获取成绩统计异常:', error);
    return [];
  }
}

/**
 * 批量获取多个班级的作业统计
 */
async function getMultipleClassHomeworkStats(classNames: string[]): Promise<Array<{
  class_name: string;
  homework_count: number;
}>> {
  try {
    if (classNames.length === 0) return [];
    
    // 首先从classes表获取班级名称对应的UUID
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .in('name', classNames);
    
    if (classError) {
      console.error('获取班级ID失败:', classError);
      return classNames.map(className => ({
        class_name: className,
        homework_count: 0
      }));
    }
    
    // 如果没有找到班级数据，返回0统计
    if (!classData || classData.length === 0) {
      return classNames.map(className => ({
        class_name: className,
        homework_count: 0
      }));
    }
    
    // 提取班级ID
    const classIds = classData.map(c => c.id);
    const classNameToId = new Map(classData.map(c => [c.name, c.id]));
    
    // 查询homework表
    const { data: homeworkData, error: homeworkError } = await supabase
      .from('homework')
      .select('class_id')
      .in('class_id', classIds);
    
    if (homeworkError) {
      console.error('获取作业统计失败:', homeworkError);
      return classNames.map(className => ({
        class_name: className,
        homework_count: 0
      }));
    }
    
    // 按班级ID统计作业数量
    const homeworkCount: Record<string, number> = {};
    if (homeworkData) {
      homeworkData.forEach(hw => {
        homeworkCount[hw.class_id] = (homeworkCount[hw.class_id] || 0) + 1;
      });
    }
    
    // 将结果映射回班级名称
    return classNames.map(className => {
      const classId = classNameToId.get(className);
      return {
        class_name: className,
        homework_count: classId ? (homeworkCount[classId] || 0) : 0
      };
    });
    
  } catch (error) {
    console.error('批量获取作业统计异常:', error);
    return classNames.map(className => ({
      class_name: className,
      homework_count: 0
    }));
  }
}

/**
 * 优化的班级统计查询函数
 */
async function getClassStatisticsOptimized(className: string): Promise<{
  studentCount: number;
  homeworkCount: number;
  averageScore: number;
  excellentRate: number;
}> {
  try {
    // 清理过期缓存
    clearExpiredCache();
    
    // 检查缓存
    const cacheKey = `class_stats_${className}`;
    const cached = classStatsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      console.log(`使用缓存数据: ${className}`);
      return cached.data;
    }
    // 并行查询多个统计数据，使用更安全和高效的查询方式
    const [studentResult, gradeResult, homeworkResult] = await Promise.all([
      // 学生数量 - 直接通过class_name查询，避免复杂的OR查询
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("class_name", className),
      
      // 成绩统计 - 优先从grade_data_new查询，添加索引友好的条件
      supabase
        .from("grade_data_new")
        .select("total_score")
        .eq("class_name", className)
        .not("total_score", "is", null)
        .limit(500), // 减少限制数量提升性能
        
      // 作业数量 - 并行查询，通过class_info或classes表关联
      supabase
        .from("homework")
        .select("id", { count: "exact", head: true })
        .in("class_id", function (query) {
          return query
            .select("id")
            .from("classes")
            .eq("name", className);
        })
    ]);

    const studentCount = studentResult.count || 0;
    const homeworkCount = homeworkResult.count || 0;
    
    let averageScore = 0;
    let excellentRate = 0;

    // 处理成绩统计，如果grade_data_new没有数据，尝试grade_data表
    if (gradeResult.data && gradeResult.data.length > 0) {
      const scores = gradeResult.data
        .map(item => item.total_score)
        .filter(score => score !== null && score !== undefined);
      
      if (scores.length > 0) {
        averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        const excellentCount = scores.filter(score => score >= 85).length;
        excellentRate = Math.round((excellentCount / scores.length) * 100);
      }
    } else {
      // 回退到grade_data表查询
      try {
        const { data: fallbackGrades } = await supabase
          .from("grade_data")
          .select("total_score")
          .eq("class_name", className)
          .not("total_score", "is", null)
          .limit(1000);
          
        if (fallbackGrades && fallbackGrades.length > 0) {
          const scores = fallbackGrades
            .map(item => item.total_score)
            .filter(score => score !== null && score !== undefined);
          
          if (scores.length > 0) {
            averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
            const excellentCount = scores.filter(score => score >= 85).length;
            excellentRate = Math.round((excellentCount / scores.length) * 100);
          }
        }
      } catch (error) {
        console.warn(`获取班级${className}成绩统计失败:`, error);
      }
    }

    const result = {
      studentCount,
      homeworkCount,
      averageScore,
      excellentRate,
    };

    // 将结果存入缓存，缓存5分钟
    classStatsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000, // 5分钟
    });

    return result;

  } catch (error) {
    console.warn(`获取班级${className}统计失败:`, error);
    return {
      studentCount: 0,
      homeworkCount: 0,
      averageScore: 0,
      excellentRate: 0,
    };
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
      .from("classes")
      .select("*")
      .eq("id", classId)
      .single();

    if (error) {
      console.error("获取班级详情失败:", error);
      showError(error, { operation: '获取班级详情', classId });
      return null;
    }

    return data;
  } catch (error) {
    console.error("获取班级详情异常:", error);
    showError(error, { operation: '获取班级详情', classId });
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
      .from("classes")
      .insert([classData])
      .select();

    if (error) {
      console.error("创建班级失败:", error);
      showError(error, { operation: '创建班级', className: classData.name });
      return null;
    }

    toast.success("班级创建成功");
    return data?.[0] || null;
  } catch (error) {
    console.error("创建班级异常:", error);
    showError(error, { operation: '创建班级', className: classData.name });
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
      .from("classes")
      .update(classData)
      .eq("id", classId);

    if (error) {
      console.error("更新班级信息失败:", error);
      showError(error, { operation: '更新班级信息', classId });
      return false;
    }

    toast.success("班级信息更新成功");
    return true;
  } catch (error) {
    console.error("更新班级信息异常:", error);
    showError(error, { operation: '更新班级信息', classId });
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
    // 1. 先将该班级学生的class_id设为null
    const { error: studentUpdateError } = await supabase
      .from("students")
      .update({ class_id: null })
      .eq("class_id", classId);

    if (studentUpdateError) {
      console.error("清除学生班级关联失败:", studentUpdateError);
      showError(studentUpdateError, { operation: '删除班级-清除学生关联', classId });
      return false;
    }

    // 2. 删除与班级关联的作业
    const { error: homeworkDeleteError } = await supabase
      .from("homework")
      .delete()
      .eq("class_id", classId);

    if (homeworkDeleteError) {
      console.error("删除班级作业失败:", homeworkDeleteError);
      showError(homeworkDeleteError, { operation: '删除班级-清除作业关联', classId });
      return false;
    }

    // 3. 最后删除班级本身
    const { error } = await supabase.from("classes").delete().eq("id", classId);

    if (error) {
      console.error("删除班级失败:", error);
      showError(error, { operation: '删除班级', classId });
      return false;
    }

    toast.success("班级删除成功");
    return true;
  } catch (error) {
    console.error("删除班级异常:", error);
    showError(error, { operation: '删除班级', classId });
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
      .from("students")
      .select("*")
      .eq("class_id", classId)
      .order("name");

    if (error) {
      console.error("获取班级学生列表失败:", error);
      showError(error, { operation: '获取班级学生列表', classId });
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取班级学生列表异常:", error);
    showError(error, { operation: '获取班级学生列表', classId });
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
      .from("homework")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取班级作业列表失败:", error);
      showError(error, { operation: '获取班级作业列表', classId });
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取班级作业列表异常:", error);
    showError(error, { operation: '获取班级作业列表', classId });
    return [];
  }
}

/**
 * 获取班级的详细分析数据，包括BoxPlot数据、趋势数据和能力维度数据
 */
export async function getClassDetailedAnalysisData(classId: string) {
  try {
    console.log(`开始获取班级 ${classId} 的详细分析数据`);

    // 1. 首先检查班级是否存在
    const { data: classInfo, error: classError } = await supabase
      .from("classes")
      .select("*")
      .eq("id", classId)
      .maybeSingle();

    if (classError || !classInfo) {
      console.error(`获取班级信息失败:`, classError);
      throw new Error(
        `获取班级信息失败: ${classError?.message || "班级不存在"}`
      );
    }

    console.log(`找到班级:`, classInfo);

    // 2. 获取该班级的所有学生 - 修改查询，不再假设average_score列存在
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, name") // 只选择必要的字段
      .eq("class_id", classId);

    if (studentsError) {
      console.error(`获取班级学生失败:`, studentsError);
      throw new Error(`获取班级学生失败: ${studentsError.message}`);
    }

    console.log(`找到学生数量:`, students?.length || 0);

    // 如果班级没有学生，返回空数据
    if (!students || students.length === 0) {
      console.log(`班级 ${classId} 没有学生，返回空数据`);
      return {
        boxPlotData: [],
        trendData: [],
        competencyData: [],
        weaknessAnalysisData: [],
        examComparisonData: {
          examList: [],
          initialSelected: [],
          displayScores: [],
        },
        studentsListData: [],
        scoreDistributionData: [],
        classProfileData: classInfo,
      };
    }

    const studentIds = students.map((s) => s.id);

    // 3. 获取所有考试成绩信息
    const { data: grades, error: gradesError } = await supabase
      .from("grades")
      .select("id, student_id, subject, score, exam_type, exam_date")
      .in("student_id", studentIds);

    if (gradesError) {
      console.error(`获取成绩数据失败:`, gradesError);
      throw new Error(`获取成绩数据失败: ${gradesError.message}`);
    }

    console.log(`找到成绩记录数量:`, grades?.length || 0);

    // 没有成绩记录时，返回简化的空数据结构
    if (!grades || grades.length === 0) {
      console.warn(`班级 ${classId} 没有成绩记录，返回空数据结构`);

      return {
        boxPlotData: [],
        trendData: [],
        competencyData: [],
        weaknessAnalysisData: [],
        examComparisonData: {
          examList: [],
          initialSelected: [],
          displayScores: [],
        },
        studentsListData: students.map(student => ({
          studentId: student.id,
          name: student.name,
          averageScore: 0,
          trend: 0,
        })),
        scoreDistributionData: [
          { range: "90-100分", count: 0, color: "#82ca9d" },
          { range: "80-89分", count: 0, color: "#8884d8" },
          { range: "70-79分", count: 0, color: "#ffc658" },
          { range: "60-69分", count: 0, color: "#ff8042" },
          { range: "<60分", count: 0, color: "#f55656" },
        ],
        classProfileData: classInfo,
      };
    }

    // 4. 计算 BoxPlot 数据 (按学科分组)
    const boxPlotData = calculateBoxPlotData(grades);
    console.log(`计算了BoxPlot数据:`, boxPlotData);

    // 5. 计算趋势数据 (按考试类型和日期分组)
    const trendData = await calculateTrendData(classId, grades);
    console.log(`计算了趋势数据:`, trendData);

    // 6. 计算能力维度数据
    const competencyData = await calculateCompetencyData(classId, grades);
    console.log(`计算了能力维度数据:`, competencyData);

    // 7. 计算班级优劣势分析数据
    const weaknessAnalysisData = await calculateClassWeakness(classId, grades);
    console.log(`计算了优劣势分析数据:`, weaknessAnalysisData);

    // 8. 获取考试对比数据
    const examComparisonData = await getExamComparisonData(classId, grades);
    console.log(`获取了考试对比数据:`, examComparisonData);

    // 9. 准备学生列表数据
    const studentsListData = await prepareStudentsListData(students, grades);
    console.log(`准备了学生列表数据:`, studentsListData);

    // 10. 计算分数分布数据
    const scoreDistributionData = calculateScoreDistribution(grades);
    console.log(`计算了分数分布数据:`, scoreDistributionData);

    return {
      boxPlotData,
      trendData,
      competencyData,
      weaknessAnalysisData,
      examComparisonData,
      studentsListData,
      scoreDistributionData,
      classProfileData: classInfo,
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

  // 从grade_data_new获取总分数据（简化版，只分析总分）
  const totalScores: number[] = [];

  grades.forEach((grade) => {
    if (grade.total_score !== null && grade.total_score !== undefined) {
      totalScores.push(parseFloat(grade.total_score));
    }
  });

  if (totalScores.length === 0) return [];

  // 对总分计算BoxPlot数据
  totalScores.sort((a, b) => a - b);

  const min = Math.min(...totalScores);
  const max = Math.max(...totalScores);
  const median = calculateMedian(totalScores);
  const q1 = calculateQuantile(totalScores, 0.25);
  const q3 = calculateQuantile(totalScores, 0.75);

  return [{
      subject: "总分",
      min,
      q1,
      median,
      q3,
      max,
    }];
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
    return (
      sortedArray[base] + rest * (sortedArray[base + 1] - sortedArray[base])
    );
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
  const examMap = new Map<string, { type: string; date: string }>();

  grades.forEach((grade) => {
    if (!grade.exam_type || !grade.exam_date) return;
    const key = `${grade.exam_type}-${grade.exam_date}`;
    examMap.set(key, { type: grade.exam_type, date: grade.exam_date });
  });

  // 按时间排序的考试列表
  const sortedExams = Array.from(examMap.values()).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // 优化：一次性获取所有年级成绩数据，避免N+1查询
  const examConditions = sortedExams.map(({ type, date }) => ({ exam_type: type, exam_date: date }));

  // 构建批量查询条件 - 使用grade_data_new表
  const { data: allGradesData, error: allGradesError } = await supabase
    .from("grade_data_new")
    .select("total_score, exam_type, exam_date")
    .or(examConditions.map(({ exam_type, exam_date }) =>
      `and(exam_type.eq.${exam_type},exam_date.eq.${exam_date})`
    ).join(','));

  if (allGradesError) {
    console.error("批量获取年级成绩失败:", allGradesError);
    return [];
  }

  // 按考试类型和日期分组年级成绩
  const gradesByExam = new Map<string, number[]>();
  if (allGradesData) {
    allGradesData.forEach((grade) => {
      const key = `${grade.exam_type}-${grade.exam_date}`;
      if (!gradesByExam.has(key)) {
        gradesByExam.set(key, []);
      }
      gradesByExam.get(key)!.push(grade.total_score);
    });
  }

  // 计算每次考试的班级平均分和年级平均分
  const trendData = sortedExams.map(({ type, date }) => {
    // 该班级的分数
    const classScores = grades
      .filter((g) => g.exam_type === type && g.exam_date === date)
      .map((g) => g.total_score);

    // 从预加载的数据中获取年级分数
    const examKey = `${type}-${date}`;
    const gradeScores = gradesByExam.get(examKey) || [];

    const classAvg =
      classScores.length > 0
        ? classScores.reduce((sum, score) => sum + score, 0) /
          classScores.length
        : 0;

    const gradeAvg =
      gradeScores.length > 0
        ? gradeScores.reduce((sum, score) => sum + score, 0) /
          gradeScores.length
        : 0;

    return {
      examName: type,
      classAvg: parseFloat(classAvg.toFixed(1)),
      gradeAvg: parseFloat(gradeAvg.toFixed(1)),
    };
  });

  return trendData.filter(Boolean);
}

/**
 * 计算能力维度数据
 */
async function calculateCompetencyData(classId: string, grades: any[] = []) {
  try {
    // 首先获取该班级的所有学生
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", classId);

    if (studentsError) {
      console.error("获取班级学生失败:", studentsError);
      throw new Error(`获取班级学生失败: ${studentsError.message}`);
    }

    // 如果班级没有学生，返回空数据
    if (!students || students.length === 0) {
      console.warn(`班级 ${classId} 没有学生数据`);
      return [];
    }

    const studentIds = students.map((s) => s.id);

    // 使用传入的成绩数据或获取新的成绩数据
    let gradeData = grades;
    if (!gradeData || gradeData.length === 0) {
      const { data: newGradeData, error: gradeError } = await supabase
        .from("grades")
        .select("subject, score")
        .in("student_id", studentIds);

      if (gradeError) {
        console.error("获取成绩数据失败:", gradeError);
        gradeData = [];
      } else {
        gradeData = newGradeData || [];
      }
    }

    // 如果成功获取到成绩数据
    if (gradeData && gradeData.length > 0) {
      // 按学科分组计算平均分
      const subjectScores = gradeData.reduce((acc, grade) => {
        if (!acc[grade.subject]) {
          acc[grade.subject] = {
            scores: [],
            count: 0,
          };
        }
        if (grade.score !== null && grade.score !== undefined) {
          acc[grade.subject].scores.push(grade.score);
          acc[grade.subject].count++;
        }
        return acc;
      }, {});

      // 将学科分数转换为能力维度
      const subjectToAbility = {
        语文: "语言表达",
        数学: "逻辑思维",
        英语: "外语应用",
        物理: "科学探究",
        化学: "分析能力",
        生物: "观察能力",
        历史: "记忆力",
        地理: "空间思维",
        政治: "思辨能力",
        音乐: "艺术感知",
        体育: "身体素质",
        美术: "创造能力",
      };

      // 将学科成绩转换为能力指标
      const subjectCompetency = Object.entries(subjectScores).map(
        ([subject, data]) => {
          const average =
            data.scores.reduce((sum, score) => sum + score, 0) /
            data.scores.length;
          return {
            name:
              subjectToAbility[subject as keyof typeof subjectToAbility] ||
              `${subject}能力`,
            current: average,
            average: average * 0.9, // 模拟班级平均值
            fullScore: 100,
          };
        }
      );

      return subjectCompetency;
    }

    // 如果没有数据，返回一些模拟的能力维度数据
    console.log(`未找到班级 ${classId} 的真实成绩数据，使用模拟的能力维度数据`);

    return [
      { name: "语言表达", current: 75, average: 70, fullScore: 100 },
      { name: "逻辑思维", current: 82, average: 75, fullScore: 100 },
      { name: "外语应用", current: 78, average: 72, fullScore: 100 },
      { name: "科学探究", current: 80, average: 75, fullScore: 100 },
      { name: "分析能力", current: 85, average: 78, fullScore: 100 },
    ];
  } catch (error) {
    console.error("计算能力维度数据失败:", error);
    // 出错时返回模拟数据
    return [
      { name: "语言表达", current: 75, average: 70, fullScore: 100 },
      { name: "逻辑思维", current: 82, average: 75, fullScore: 100 },
      { name: "外语应用", current: 78, average: 72, fullScore: 100 },
      { name: "科学探究", current: 80, average: 75, fullScore: 100 },
      { name: "分析能力", current: 85, average: 78, fullScore: 100 },
    ];
  }
}

/**
 * 计算分数分布
 */
function calculateScoreDistribution(grades: any[]) {
  if (!grades || grades.length === 0) return [];

  // 分数段定义
  const ranges = [
    { range: "90-100分", min: 90, max: 100, color: "#82ca9d" },
    { range: "80-89分", min: 80, max: 89, color: "#8884d8" },
    { range: "70-79分", min: 70, max: 79, color: "#ffc658" },
    { range: "60-69分", min: 60, max: 69, color: "#ff8042" },
    { range: "<60分", min: 0, max: 59, color: "#f55656" },
  ];

  // 统计各分数段数量
  const distribution = ranges.map((range) => {
    const count = grades.filter(
      (grade) => grade.score >= range.min && grade.score <= range.max
    ).length;

    return {
      range: range.range,
      count,
      color: range.color,
    };
  });

  return distribution;
}

/**
 * 计算班级优劣势
 */
async function calculateClassWeakness(classId: string, grades: any[]) {
  if (!grades || grades.length === 0) return [];

  // 按学科分组计算班级平均分
  const subjectScores = grades.reduce((acc, grade) => {
    if (!grade.subject || grade.score === null || grade.score === undefined)
      return acc;

    if (!acc[grade.subject]) {
      acc[grade.subject] = {
        total: 0,
        count: 0,
      };
    }

    acc[grade.subject].total += grade.score;
    acc[grade.subject].count++;

    return acc;
  }, {});

  // 获取年级平均分
  const { data: allGrades, error } = await supabase
    .from("grades")
    .select("subject, score");

  if (error) {
    console.error("获取年级成绩失败:", error);
    return [];
  }

  // 按学科分组计算年级平均分
  const gradeSubjectScores = allGrades.reduce((acc, grade) => {
    if (!grade.subject || grade.score === null || grade.score === undefined)
      return acc;

    if (!acc[grade.subject]) {
      acc[grade.subject] = {
        total: 0,
        count: 0,
      };
    }

    acc[grade.subject].total += grade.score;
    acc[grade.subject].count++;

    return acc;
  }, {});

  // 比较班级与年级平均分
  return Object.entries(subjectScores).map(([subject, data]) => {
    const classAvg = data.count > 0 ? data.total / data.count : 0;
    const gradeAvg =
      gradeSubjectScores[subject]?.count > 0
        ? gradeSubjectScores[subject].total / gradeSubjectScores[subject].count
        : 0;

    // 计算与年级的差距百分比
    const gap = gradeAvg === 0 ? 0 : ((classAvg - gradeAvg) / gradeAvg) * 100;

    return {
      subject,
      classAvg: parseFloat(classAvg.toFixed(1)),
      gradeAvg: parseFloat(gradeAvg.toFixed(1)),
      gap: gap.toFixed(1) + "%",
      isWeak: gap < -2, // 如果班级平均分比年级平均分低2%以上，视为弱势学科
    };
  });
}

/**
 * 获取考试对比数据
 */
async function getExamComparisonData(classId: string, grades: any[]) {
  if (!grades || grades.length === 0) {
    return {
      examList: [],
      initialSelected: [],
      displayScores: [],
    };
  }

  // 获取所有不同的考试
  const examMap = new Map();

  grades.forEach((grade) => {
    if (!grade.exam_type || !grade.exam_date) return;

    const id = `${grade.exam_type}-${grade.exam_date}`;

    if (!examMap.has(id)) {
      examMap.set(id, {
        id,
        name: grade.exam_type,
        date: grade.exam_date,
      });
    }
  });

  // 按时间排序的考试列表
  const examList = Array.from(examMap.values()).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime(); // 最新的考试在前
  });

  // 选取最近的两次考试作为初始选择
  const initialSelected =
    examList.length >= 2
      ? [examList[0].id, examList[1].id]
      : examList.length === 1
        ? [examList[0].id]
        : [];

  // 如果没有选择考试，返回空数据
  if (initialSelected.length === 0) {
    return {
      examList,
      initialSelected,
      displayScores: [],
    };
  }

  // 生成学科成绩对比数据
  const subjects = [...new Set(grades.map((g) => g.subject))];

  const displayScores = subjects.map((subject) => {
    const result: any = { subject };

    initialSelected.forEach((examId) => {
      const [examType, examDate] = examId.split("-");

      // 获取该学科该考试的所有成绩
      const examScores = grades
        .filter(
          (g) =>
            g.subject === subject &&
            g.exam_type === examType &&
            g.exam_date === examDate
        )
        .map((g) => g.score);

      // 计算平均分
      const average =
        examScores.length > 0
          ? examScores.reduce((sum, score) => sum + score, 0) /
            examScores.length
          : 0;

      const examName = examMap.get(examId)?.name || examType;
      result[examName] = parseFloat(average.toFixed(1));
    });

    return result;
  });

  return {
    examList,
    initialSelected,
    displayScores,
  };
}

/**
 * 准备学生列表数据
 */
async function prepareStudentsListData(students: any[], grades: any[]) {
  if (!students || students.length === 0) return [];

  // 计算每个学生的平均分
  const studentScores = students.map((student) => {
    // 获取该学生的所有成绩
    const studentGrades = grades
      .filter((g) => g.student_id === student.id)
      .map((g) => g.score);

    // 计算平均分，不再依赖可能不存在的average_score列
    const averageScore =
      studentGrades.length > 0
        ? studentGrades.reduce((sum, score) => sum + score, 0) /
          studentGrades.length
        : 0;

    // 计算趋势（通过真实数据计算）
    let trend = 0;
    if (studentGrades.length >= 2) {
      // 如果有至少两次成绩，计算最新两次的差值作为趋势
      const sortedGrades = [...grades]
        .filter((g) => g.student_id === student.id)
        .sort(
          (a, b) =>
            new Date(b.exam_date || 0).getTime() -
            new Date(a.exam_date || 0).getTime()
        );

      if (sortedGrades.length >= 2) {
        trend = sortedGrades[0].score - sortedGrades[1].score;
        // 将趋势值归一化到-2到2的范围
        trend = Math.max(-2, Math.min(2, Math.round(trend / 5)));
      }
    }

    return {
      studentId: student.id,
      name: student.name,
      averageScore: parseFloat(averageScore.toFixed(1)),
      trend,
    };
  });

  return studentScores;
}

/**
 * 获取所有班级的详细分析数据
 */
export async function getAllClassesAnalysisData() {
  try {
    // 从getAllClasses()获取一致的班级数据
    const classes = await getAllClasses();

    if (!classes || classes.length === 0) {
      return { boxPlotData: {}, trendData: {}, competencyData: {} };
    }

    console.log(`开始批量分析 ${classes.length} 个班级的数据`);

    // 获取所有班级名称
    const classNames = classes.map(cls => cls.name);

    // 1. 批量获取所有学生数据 - 使用class_name而不是class_id
    const { data: allStudents, error: studentsError } = await supabase
      .from("students")
      .select("id, name, class_name")
      .in("class_name", classNames)
      .not("class_name", "is", null);

    if (studentsError) {
      console.error("批量获取学生数据失败:", studentsError);
      throw new Error(`批量获取学生数据失败: ${studentsError.message}`);
    }

    // 2. 批量获取所有成绩数据 - 使用grade_data_new表
    const studentIds = allStudents?.map(s => s.id) || [];
    const { data: allGrades, error: gradesError } = await supabase
      .from("grade_data_new")
      .select("student_id, total_score, exam_type, exam_date, class_name")
      .in("student_id", studentIds)
      .not("total_score", "is", null);

    if (gradesError) {
      console.error("批量获取成绩数据失败:", gradesError);
      throw new Error(`批量获取成绩数据失败: ${gradesError.message}`);
    }

    console.log(`批量获取到 ${allStudents?.length || 0} 个学生，${allGrades?.length || 0} 条成绩记录`);

    // 3. 按班级分组数据 - 使用class_name
    const studentsByClass = new Map<string, any[]>();
    const gradesByClass = new Map<string, any[]>();

    // 分组学生
    allStudents?.forEach(student => {
      const className = student.class_name;
      if (!studentsByClass.has(className)) {
        studentsByClass.set(className, []);
      }
      studentsByClass.get(className)!.push(student);
    });

    // 分组成绩（可以直接使用class_name，或通过学生关联）
    allGrades?.forEach(grade => {
      const className = grade.class_name;
      if (className) {
        if (!gradesByClass.has(className)) {
          gradesByClass.set(className, []);
        }
        gradesByClass.get(className)!.push(grade);
      }
    });

    // 4. 为每个班级计算分析数据
    const analysisData: Record<string, any> = {
      boxPlotData: {},
      trendData: {},
      competencyData: {},
    };

    // 现在可以同步处理每个班级，因为数据已经预加载
    for (const cls of classes) {
      try {
        const className = cls.name;
        const classStudents = studentsByClass.get(className) || [];
        const classGrades = gradesByClass.get(className) || [];

        // 使用预加载的数据计算分析结果
        const boxPlotData = calculateBoxPlotData(classGrades);
        const trendData = await calculateTrendData(className, classGrades);
        const competencyData = await calculateCompetencyData(className, classGrades);

        // 使用class.id作为key以保持API兼容性
        analysisData.boxPlotData[cls.id] = boxPlotData;
        analysisData.trendData[cls.id] = trendData;
        analysisData.competencyData[cls.id] = competencyData;
      } catch (error) {
        console.error(`计算班级 ${cls.name} 分析数据失败:`, error);
        // 设置空数据以避免系统崩溃
        analysisData.boxPlotData[cls.id] = [];
        analysisData.trendData[cls.id] = [];
        analysisData.competencyData[cls.id] = [];
      }
    }

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
    const viewExists = await checkViewExists("mv_class_subject_stats");

    if (viewExists) {
      const { data: subjectStats, error: subjectStatsError } = await supabase
        .from("mv_class_subject_stats")
        .select("*")
        .eq("class_id", classId);

      if (!subjectStatsError && subjectStats && subjectStats.length > 0) {
        // 使用物化视图数据
        const subjects = [...new Set(subjectStats.map((item) => item.subject))];

        subjects.forEach((subject) => {
          const subjectData = subjectStats.find(
            (item) => item.subject === subject
          );
          if (subjectData) {
            // 构建分数分布数据
            // 注意：物化视图中没有直接提供分数分布数据，这里需要合成
            // 实际应用中可以考虑增加物化视图中的分数分布信息
            const estimatedDistribution = [
              {
                range: "0-59",
                count: Math.round(
                  subjectData.student_count * (1 - subjectData.pass_rate / 100)
                ),
              },
              {
                range: "60-69",
                count: Math.round(subjectData.student_count * 0.2),
              },
              {
                range: "70-79",
                count: Math.round(subjectData.student_count * 0.2),
              },
              {
                range: "80-89",
                count: Math.round(subjectData.student_count * 0.2),
              },
              {
                range: "90-100",
                count: Math.round(
                  subjectData.student_count * (subjectData.excellent_rate / 100)
                ),
              },
            ];

            result.performance[subject] = [
              {
                subject,
                averageScore: subjectData.average_score,
                medianScore: subjectData.median_score,
                minScore: subjectData.min_score,
                maxScore: subjectData.max_score,
                passRate: subjectData.pass_rate,
                excellentRate: subjectData.excellent_rate,
                scoreDeviation: subjectData.score_deviation,
                scoreDistribution: estimatedDistribution,
              },
            ];
          }
        });
      }
    } else {
      console.warn("物化视图mv_class_subject_stats不存在，降级为基础查询");
      // 如果没有物化视图，降级方案可以使用原始查询
      const { data: grades, error: gradesError } = await supabase
        .from("grades")
        .select("*, students!inner(*)")
        .eq("students.class_id", classId);

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
        Object.entries(subjectGroups).forEach(
          ([subject, grades]: [string, any[]]) => {
            const scores = grades.map((g) => Number(g.score));
            scores.sort((a, b) => a - b);

            // 计算分数分布
            const scoreDistribution = [
              { range: "0-59", count: scores.filter((s) => s < 60).length },
              {
                range: "60-69",
                count: scores.filter((s) => s >= 60 && s < 70).length,
              },
              {
                range: "70-79",
                count: scores.filter((s) => s >= 70 && s < 80).length,
              },
              {
                range: "80-89",
                count: scores.filter((s) => s >= 80 && s < 90).length,
              },
              { range: "90-100", count: scores.filter((s) => s >= 90).length },
            ];

            // 计算统计指标
            const sum = scores.reduce((a, b) => a + b, 0);
            const avg = sum / scores.length;
            const medianIndex = Math.floor(scores.length / 2);
            const median =
              scores.length % 2 === 0
                ? (scores[medianIndex - 1] + scores[medianIndex]) / 2
                : scores[medianIndex];

            result.performance[subject] = [
              {
                subject,
                averageScore: avg,
                medianScore: median,
                minScore: Math.min(...scores),
                maxScore: Math.max(...scores),
                passRate:
                  (scores.filter((s) => s >= 60).length / scores.length) * 100,
                excellentRate:
                  (scores.filter((s) => s >= 90).length / scores.length) * 100,
                scoreDistribution,
              },
            ];
          }
        );
      }
    }

    // 2. 获取学科趋势数据
    const trendsViewExists = await checkViewExists("mv_class_exam_trends");

    if (trendsViewExists) {
      const { data: trendData, error: trendError } = await supabase
        .from("mv_class_exam_trends")
        .select("*")
        .eq("class_id", classId);

      if (!trendError && trendData && trendData.length > 0) {
        // 使用物化视图数据，按学科分组处理
        const subjects = [...new Set(trendData.map((item) => item.subject))];

        subjects.forEach((subject) => {
          const subjectTrends = trendData
            .filter((item) => item.subject === subject)
            .sort(
              (a, b) =>
                new Date(a.exam_date).getTime() -
                new Date(b.exam_date).getTime()
            );

          result.trends[subject] = subjectTrends.map((trend) => ({
            date: trend.exam_date,
            examType: trend.exam_type,
            averageScore: trend.average_score,
            medianScore: trend.median_score,
            passRate: trend.pass_rate,
            excellentRate: trend.excellent_rate,
          }));
        });
      }
    } else {
      console.warn("物化视图mv_class_exam_trends不存在，降级为基础查询");
      // 降级为聚合查询
      const { data: gradesWithDates, error: gradesDateError } = await supabase
        .from("grades")
        .select("*, students!inner(*)")
        .eq("students.class_id", classId)
        .not("exam_date", "is", null)
        .order("exam_date", { ascending: true });

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
        Object.entries(subjectDateGroups).forEach(
          ([subject, dateGroups]: [string, any]) => {
            result.trends[subject] = Object.entries(dateGroups).map(
              ([date, grades]: [string, any[]]) => {
                const scores = grades.map((g) => Number(g.score));
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                return {
                  date,
                  examType: grades[0].exam_type || "未知考试",
                  averageScore: avg,
                  medianScore: calculateMedian(scores.sort((a, b) => a - b)),
                  passRate:
                    (scores.filter((s) => s >= 60).length / scores.length) *
                    100,
                  excellentRate:
                    (scores.filter((s) => s >= 90).length / scores.length) *
                    100,
                };
              }
            );
          }
        );
      }
    }

    // 3. 获取知识点掌握数据
    const competencyViewExists = await checkViewExists(
      "mv_class_subject_competency"
    );

    if (competencyViewExists) {
      const { data: knowledgeData, error: knowledgeError } = await supabase
        .from("mv_class_subject_competency")
        .select("*")
        .eq("class_id", classId);

      if (!knowledgeError && knowledgeData && knowledgeData.length > 0) {
        // 这里使用一个临时方案，尝试从其他地方获取知识点-学科映射
        const { data: knowledgeSubjectMap, error: mapError } = await supabase
          .from("knowledge_points")
          .select("id, subject_id, subject:subject_id(name)");

        // 构建知识点到学科的映射
        const pointToSubject = {};
        if (!mapError && knowledgeSubjectMap) {
          knowledgeSubjectMap.forEach((item) => {
            pointToSubject[item.id] = item.subject?.name || "未知学科";
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
        Object.entries(pointGroups).forEach(
          ([pointId, items]: [string, any[]]) => {
            // 获取该知识点对应的学科
            const subjectName = pointToSubject[pointId] || "未知学科";

            if (!result.knowledgePoints[subjectName]) {
              result.knowledgePoints[subjectName] = [];
            }

            // 使用第一个记录的数据（应该是相同的）
            const item = items[0];
            result.knowledgePoints[subjectName].push({
              id: pointId,
              name: item.knowledge_point_name,
              category: "知识点", // 物化视图中可能没有这个字段
              masteryRate: item.average_mastery,
            });
          }
        );
      }
    } else {
      console.warn("物化视图mv_class_subject_competency不存在，降级为基础查询");
      // 降级为原始查询
      // 首先获取班级学生的所有知识点掌握记录
      const { data: knowledgeMastery, error: knowledgeMasteryError } =
        await supabase
          .from("student_knowledge_mastery")
          .select("*, knowledge_points(*), students!inner(*)")
          .eq("students.class_id", classId);

      if (!knowledgeMasteryError && knowledgeMastery) {
        // 按知识点分组并关联到对应的学科
        const knowledgeBySubject = knowledgeMastery.reduce((acc, record) => {
          // 这里假设在knowledge_points表中有subject_id字段或可通过其他关联获取学科信息
          // 如果结构不同，需要调整查询或此处逻辑
          const subjectName = record.knowledge_points?.subject || "unknown";

          if (!acc[subjectName]) {
            acc[subjectName] = {};
          }

          const pointId = record.knowledge_point_id;
          if (!acc[subjectName][pointId]) {
            acc[subjectName][pointId] = {
              id: pointId,
              name: record.knowledge_points?.name || "未知知识点",
              category: record.knowledge_points?.category || "未分类",
              masteryLevels: [],
              masteryRate: 0,
            };
          }

          acc[subjectName][pointId].masteryLevels.push(record.mastery_level);
          return acc;
        }, {});

        // 计算每个知识点的平均掌握度
        Object.entries(knowledgeBySubject).forEach(
          ([subject, points]: [string, any]) => {
            result.knowledgePoints[subject] = Object.values(points).map(
              (point: any) => {
                const avgMastery =
                  point.masteryLevels.reduce(
                    (a: number, b: number) => a + b,
                    0
                  ) / point.masteryLevels.length;
                return {
                  ...point,
                  masteryRate: avgMastery,
                };
              }
            );
          }
        );
      }
    }

    // 4. 获取学科相关性数据
    const correlationViewExists = await checkViewExists(
      "mv_class_subject_correlation"
    );

    if (correlationViewExists) {
      const { data: correlationData, error: correlationError } = await supabase
        .from("mv_class_subject_correlation")
        .select("*")
        .eq("class_id", classId);

      if (!correlationError && correlationData && correlationData.length > 0) {
        correlationData.forEach((item) => {
          result.correlation[`${item.subject_a}-${item.subject_b}`] =
            item.correlation_coefficient;
        });
      }
    } else {
      console.warn(
        "物化视图mv_class_subject_correlation不存在，降级为基础查询"
      );
      // 这部分较复杂，需要手动计算学科间的相关性
      // 获取班级所有学生的所有学科成绩
      const { data: studentScores, error: scoresError } = await supabase
        .from("grades")
        .select("student_id, subject, score")
        .in("student_id", function (qb) {
          qb.select("id").from("students").eq("class_id", classId);
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
        Object.entries(studentSubjectScores).forEach(
          ([studentId, subjects]: [string, any]) => {
            studentAvgScores[studentId] = {};
            Object.entries(subjects).forEach(
              ([subject, scores]: [string, number[]]) => {
                studentAvgScores[studentId][subject] =
                  scores.reduce((a, b) => a + b, 0) / scores.length;
              }
            );
          }
        );

        // 获取所有学科
        const allSubjects = [
          ...new Set(studentScores.map((record) => record.subject)),
        ];

        // 计算两两学科之间的相关性
        for (let i = 0; i < allSubjects.length; i++) {
          for (let j = i + 1; j < allSubjects.length; j++) {
            const subjectA = allSubjects[i];
            const subjectB = allSubjects[j];

            // 提取同时有这两个学科成绩的学生数据
            const commonStudents = Object.entries(studentAvgScores)
              .filter(
                ([, subjects]: [string, any]) =>
                  subjects[subjectA] && subjects[subjectB]
              )
              .map(([studentId, subjects]: [string, any]) => ({
                scoreA: subjects[subjectA],
                scoreB: subjects[subjectB],
              }));

            if (commonStudents.length >= 3) {
              // 至少需要3个样本才能计算相关性
              // 计算Pearson相关系数
              const n = commonStudents.length;
              const sumA = commonStudents.reduce(
                (sum, student) => sum + student.scoreA,
                0
              );
              const sumB = commonStudents.reduce(
                (sum, student) => sum + student.scoreB,
                0
              );
              const sumAB = commonStudents.reduce(
                (sum, student) => sum + student.scoreA * student.scoreB,
                0
              );
              const sumASq = commonStudents.reduce(
                (sum, student) => sum + student.scoreA * student.scoreA,
                0
              );
              const sumBSq = commonStudents.reduce(
                (sum, student) => sum + student.scoreB * student.scoreB,
                0
              );

              const numerator = n * sumAB - sumA * sumB;
              const denominator = Math.sqrt(
                (n * sumASq - sumA * sumA) * (n * sumBSq - sumB * sumB)
              );

              const correlation =
                denominator === 0 ? 0 : numerator / denominator;

              // 存储相关系数
              result.correlation[`${subjectA}-${subjectB}`] = correlation;
            }
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error("获取学科分析数据失败:", error);
    showError(error, { operation: '获取学科分析数据', classId });
    throw error; // 向上抛出错误以便调用方处理
  }
}

// ========== 新增：标准化班级统计系统 ==========

/**
 * 获取准确的班级统计数据（使用数据库函数）
 * @param className 班级名称（可选，不传则获取所有班级）
 * @returns 班级统计数据
 */
export async function getAccurateClassStatistics(className?: string): Promise<ClassStatistics[]> {
  try {
    console.log('🔍 获取准确班级统计数据:', className || '全部班级');
    
    // 调用数据库函数获取准确统计
    const { data, error } = await supabase.rpc('get_class_statistics', {
      target_class_name: className || null
    });

    if (error) {
      console.error('获取班级统计失败:', error);
      showError(error, { operation: '获取班级统计', className });
      return [];
    }

    console.log('✅ 班级统计数据获取成功:', data?.length || 0, '个班级');
    return data || [];
  } catch (error) {
    console.error('班级统计查询异常:', error);
    showError(error, { operation: '获取班级统计', className });
    return [];
  }
}

/**
 * 手动更新所有班级统计数据
 * @returns 是否成功
 */
export async function updateAllClassStatistics(): Promise<boolean> {
  try {
    console.log('🔄 开始更新所有班级统计数据');
    
    const { data, error } = await supabase.rpc('update_class_statistics');

    if (error) {
      console.error('更新班级统计失败:', error);
      showError(error, { operation: '更新班级统计' });
      return false;
    }

    console.log('✅ 班级统计更新成功');
    toast.success('班级统计数据更新成功');
    
    // 清除相关缓存
    clearExpiredCache();
    
    return true;
  } catch (error) {
    console.error('更新班级统计异常:', error);
    showError(error, { operation: '更新班级统计' });
    return false;
  }
}

/**
 * 检查班级数据完整性
 * @returns 数据完整性报告
 */
export async function checkClassDataIntegrity(): Promise<{
  issues: Array<{
    issue_type: string;
    description: string;
    affected_classes: string[];
    severity: string;
  }>;
  isHealthy: boolean;
}> {
  try {
    console.log('🔍 开始检查班级数据完整性');
    
    const { data, error } = await supabase.rpc('check_class_data_integrity');

    if (error) {
      console.error('数据完整性检查失败:', error);
      return { issues: [], isHealthy: false };
    }

    const issues = data || [];
    const isHealthy = issues.length === 0;
    
    console.log('✅ 数据完整性检查完成:', isHealthy ? '数据健康' : `发现${issues.length}个问题`);
    
    if (!isHealthy) {
      console.warn('⚠️ 发现数据完整性问题:', issues);
    }
    
    return { issues, isHealthy };
  } catch (error) {
    console.error('数据完整性检查异常:', error);
    return { issues: [], isHealthy: false };
  }
}

/**
 * 获取班级统计摘要（用于仪表板）
 * @returns 统计摘要
 */
export async function getClassStatisticsSummary(): Promise<{
  totalClasses: number;
  totalStudents: number;
  averageClassSize: number;
  maxClassSize: number;
  minClassSize: number;
  classesWithGrades: number;
  dataHealthy: boolean;
}> {
  const cacheKey = 'class_statistics_summary';

  return getCachedData(cacheKey, async () => {
    try {
      console.log('🔍 获取班级统计摘要');

      // 获取所有班级统计
      const allStats = await getAccurateClassStatistics();
    
    if (allStats.length === 0) {
      return {
        totalClasses: 0,
        totalStudents: 0,
        averageClassSize: 0,
        maxClassSize: 0,
        minClassSize: 0,
        classesWithGrades: 0,
        dataHealthy: false,
      };
    }
    
    // 计算统计摘要
    const totalStudents = allStats.reduce((sum, cls) => sum + cls.student_count, 0);
    const classesWithGrades = allStats.filter(cls => cls.students_with_grades > 0).length;
    const studentCounts = allStats.map(cls => cls.student_count);
    const dataHealthy = allStats.every(cls => cls.data_consistency_status.includes('✅'));
    
    const summary = {
      totalClasses: allStats.length,
      totalStudents,
      averageClassSize: Math.round(totalStudents / allStats.length * 10) / 10,
      maxClassSize: Math.max(...studentCounts),
      minClassSize: Math.min(...studentCounts),
      classesWithGrades,
      dataHealthy,
    };
    
    console.log('✅ 班级统计摘要:', summary);
    return summary;
  } catch (error) {
    console.error('获取班级统计摘要失败:', error);
    return {
      totalClasses: 0,
      totalStudents: 0,
      averageClassSize: 0,
      maxClassSize: 0,
      minClassSize: 0,
      classesWithGrades: 0,
      dataHealthy: false,
    };
  }
  }, CACHE_CONFIGS.CLASS_STATS);
}

/**
 * 清除班级相关缓存
 * @param pattern 缓存模式，不提供则清除所有班级缓存
 */
export function clearClassCache(pattern?: string) {
  if (pattern) {
    clearCacheByPattern(new RegExp(pattern));
  } else {
    // 清除所有班级相关缓存
    clearCacheByPattern(/^(class_|view_exists_|exam_trends_|grade_analysis_)/);
  }
  console.log('🧹 班级缓存已清理');
}
