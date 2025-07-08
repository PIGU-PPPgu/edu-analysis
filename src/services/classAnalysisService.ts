/**
 * 📊 班级数据统计和对比分析服务
 * 提供高性能的班级统计数据获取和对比分析功能
 */

import { supabase } from '@/integrations/supabase/client';

// 班级基础信息接口
export interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  year: string;
  student_count: number;
  created_at: string;
}

// 班级统计数据接口
export interface ClassStatistics {
  class_name: string;
  total_students: number;
  exams_count: number;
  
  // 整体统计
  overall_stats: {
    avg_score: number;
    median_score: number;
    std_deviation: number;
    pass_rate: number;          // 及格率 (≥60分)
    good_rate: number;          // 良好率 (≥80分)
    excellent_rate: number;     // 优秀率 (≥90分)
    coefficient_variation: number; // 变异系数
  };
  
  // 学科统计
  subject_stats: Array<{
    subject: string;
    avg_score: number;
    median_score: number;
    std_deviation: number;
    pass_rate: number;
    excellent_rate: number;
    student_count: number;
    rank_in_grade: number;      // 年级排名
  }>;
  
  // 分数分布
  score_distribution: {
    ranges: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    quartiles: {
      q1: number;
      q2: number;
      q3: number;
      min: number;
      max: number;
      iqr: number;              // 四分位距
    };
  };
  
  // 时间趋势
  time_trends: Array<{
    exam_date: string;
    exam_title: string;
    avg_score: number;
    grade_avg_score: number;    // 年级平均分
    relative_performance: number; // 相对表现 (班级-年级)
  }>;
  
  // 学生表现分组
  student_groups: {
    top_students: Array<{
      name: string;
      student_id: string;
      avg_score: number;
      rank_in_class: number;
    }>;
    struggling_students: Array<{
      name: string;
      student_id: string;
      avg_score: number;
      subjects_below_60: string[];
    }>;
    improved_students: Array<{
      name: string;
      student_id: string;
      improvement_score: number;
      improvement_subjects: string[];
    }>;
  };
}

// 班级对比数据接口
export interface ClassComparison {
  comparison_type: 'all_classes' | 'same_grade' | 'selected_classes';
  classes: Array<{
    class_name: string;
    avg_score: number;
    median_score: number;
    pass_rate: number;
    excellent_rate: number;
    std_deviation: number;
    rank: number;
    score_above_grade_avg: number;
  }>;
  
  // 学科对比
  subject_comparison: Array<{
    subject: string;
    classes: Array<{
      class_name: string;
      avg_score: number;
      rank: number;
      percentile: number;
    }>;
  }>;
  
  // 分布对比
  distribution_comparison: {
    pass_rate_ranking: Array<{
      class_name: string;
      pass_rate: number;
      rank: number;
    }>;
    excellent_rate_ranking: Array<{
      class_name: string;
      excellent_rate: number;
      rank: number;
    }>;
    consistency_ranking: Array<{
      class_name: string;
      std_deviation: number;
      rank: number;  // 1 = 最稳定
    }>;
  };
}

// 缓存配置
const CACHE_TTL = 5 * 60 * 1000; // 5分钟
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

/**
 * 智能缓存管理器
 */
class CacheManager {
  set<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const cached = cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  invalidate(pattern: string): void {
    for (const [key] of cache) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }

  clear(): void {
    cache.clear();
  }
}

const cacheManager = new CacheManager();

/**
 * 获取所有班级基础信息
 */
export async function getAllClassesInfo(): Promise<ClassInfo[]> {
  const cacheKey = 'all_classes_info';
  const cached = cacheManager.get<ClassInfo[]>(cacheKey);
  if (cached) return cached;

  try {
    // 优化查询：一次获取所有班级信息
    const { data, error } = await supabase.rpc('get_all_classes_with_stats');
    
    if (error) throw error;
    
    const classesInfo: ClassInfo[] = data.map((item: any) => ({
      id: item.class_name,
      name: item.class_name,
      grade: extractGrade(item.class_name),
      year: extractYear(item.class_name),
      student_count: item.student_count,
      created_at: item.first_exam_date || new Date().toISOString()
    }));

    cacheManager.set(cacheKey, classesInfo);
    return classesInfo;
  } catch (error) {
    console.error('获取班级信息失败:', error);
    throw error;
  }
}

/**
 * 批量获取班级统计数据 (解决N+1查询问题)
 */
export async function getBatchClassStatistics(classNames: string[]): Promise<Map<string, ClassStatistics>> {
  const cacheKey = `batch_class_stats_${classNames.sort().join('_')}`;
  const cached = cacheManager.get<Map<string, ClassStatistics>>(cacheKey);
  if (cached) return cached;

  try {
    console.log('🔍 批量获取班级统计数据:', classNames);
    
    // 一次性查询所有需要的数据
    const [
      overallStats,
      subjectStats,
      distributionData,
      trendData,
      studentGroups
    ] = await Promise.all([
      getBatchOverallStats(classNames),
      getBatchSubjectStats(classNames),
      getBatchDistributionData(classNames),
      getBatchTrendData(classNames),
      getBatchStudentGroups(classNames)
    ]);

    // 构建统计数据映射
    const statsMap = new Map<string, ClassStatistics>();
    
    for (const className of classNames) {
      const classStats: ClassStatistics = {
        class_name: className,
        total_students: overallStats.get(className)?.total_students || 0,
        exams_count: trendData.get(className)?.length || 0,
        overall_stats: overallStats.get(className)?.overall_stats || getDefaultOverallStats(),
        subject_stats: subjectStats.get(className) || [],
        score_distribution: distributionData.get(className) || getDefaultDistribution(),
        time_trends: trendData.get(className) || [],
        student_groups: studentGroups.get(className) || getDefaultStudentGroups()
      };
      
      statsMap.set(className, classStats);
    }

    cacheManager.set(cacheKey, statsMap);
    console.log('✅ 批量班级统计数据获取完成');
    
    return statsMap;
  } catch (error) {
    console.error('批量获取班级统计数据失败:', error);
    throw error;
  }
}

/**
 * 获取单个班级详细统计数据
 */
export async function getClassStatistics(className: string): Promise<ClassStatistics> {
  const batchResult = await getBatchClassStatistics([className]);
  const stats = batchResult.get(className);
  
  if (!stats) {
    throw new Error(`班级 ${className} 的统计数据不存在`);
  }
  
  return stats;
}

/**
 * 获取班级对比分析数据
 */
export async function getClassComparison(
  options: {
    type: 'all_classes' | 'same_grade' | 'selected_classes';
    classNames?: string[];
    grade?: string;
  }
): Promise<ClassComparison> {
  const cacheKey = `class_comparison_${options.type}_${options.grade || 'all'}_${options.classNames?.join('_') || 'all'}`;
  const cached = cacheManager.get<ClassComparison>(cacheKey);
  if (cached) return cached;

  try {
    console.log('🔍 获取班级对比数据:', options);
    
    // 确定要对比的班级
    let targetClasses: string[];
    
    if (options.type === 'selected_classes' && options.classNames) {
      targetClasses = options.classNames;
    } else if (options.type === 'same_grade' && options.grade) {
      const allClasses = await getAllClassesInfo();
      targetClasses = allClasses
        .filter(cls => cls.grade === options.grade)
        .map(cls => cls.name);
    } else {
      const allClasses = await getAllClassesInfo();
      targetClasses = allClasses.map(cls => cls.name);
    }

    // 获取所有班级的统计数据
    const statsMap = await getBatchClassStatistics(targetClasses);
    
    // 构建对比数据
    const comparison: ClassComparison = {
      comparison_type: options.type,
      classes: [],
      subject_comparison: [],
      distribution_comparison: {
        pass_rate_ranking: [],
        excellent_rate_ranking: [],
        consistency_ranking: []
      }
    };

    // 整体对比数据
    const classesData = Array.from(statsMap.entries()).map(([className, stats]) => ({
      class_name: className,
      avg_score: stats.overall_stats.avg_score,
      median_score: stats.overall_stats.median_score,
      pass_rate: stats.overall_stats.pass_rate,
      excellent_rate: stats.overall_stats.excellent_rate,
      std_deviation: stats.overall_stats.std_deviation,
      rank: 0, // 将在后面计算
      score_above_grade_avg: 0 // 将在后面计算
    }));

    // 计算排名
    classesData.sort((a, b) => b.avg_score - a.avg_score);
    classesData.forEach((cls, index) => {
      cls.rank = index + 1;
    });

    comparison.classes = classesData;

    // 学科对比数据
    const subjects = ['语文', '数学', '英语', '物理', '化学', '政治', '历史', '生物', '地理'];
    
    for (const subject of subjects) {
      const subjectData = Array.from(statsMap.entries())
        .map(([className, stats]) => {
          const subjectStats = stats.subject_stats.find(s => s.subject === subject);
          return subjectStats ? {
            class_name: className,
            avg_score: subjectStats.avg_score,
            rank: 0,
            percentile: 0
          } : null;
        })
        .filter(Boolean) as any[];

      if (subjectData.length > 0) {
        // 计算学科排名
        subjectData.sort((a, b) => b.avg_score - a.avg_score);
        subjectData.forEach((cls, index) => {
          cls.rank = index + 1;
          cls.percentile = ((subjectData.length - index) / subjectData.length) * 100;
        });

        comparison.subject_comparison.push({
          subject,
          classes: subjectData
        });
      }
    }

    // 分布对比排名
    const passRateRanking = [...classesData]
      .sort((a, b) => b.pass_rate - a.pass_rate)
      .map((cls, index) => ({
        class_name: cls.class_name,
        pass_rate: cls.pass_rate,
        rank: index + 1
      }));

    const excellentRateRanking = [...classesData]
      .sort((a, b) => b.excellent_rate - a.excellent_rate)
      .map((cls, index) => ({
        class_name: cls.class_name,
        excellent_rate: cls.excellent_rate,
        rank: index + 1
      }));

    const consistencyRanking = [...classesData]
      .sort((a, b) => a.std_deviation - b.std_deviation) // 标准差越小越稳定
      .map((cls, index) => ({
        class_name: cls.class_name,
        std_deviation: cls.std_deviation,
        rank: index + 1
      }));

    comparison.distribution_comparison = {
      pass_rate_ranking: passRateRanking,
      excellent_rate_ranking: excellentRateRanking,
      consistency_ranking: consistencyRanking
    };

    cacheManager.set(cacheKey, comparison);
    console.log('✅ 班级对比数据获取完成');
    
    return comparison;
  } catch (error) {
    console.error('获取班级对比数据失败:', error);
    throw error;
  }
}

/**
 * 批量获取班级整体统计数据
 */
async function getBatchOverallStats(classNames: string[]): Promise<Map<string, { total_students: number; overall_stats: ClassStatistics['overall_stats'] }>> {
  const { data, error } = await supabase.rpc('get_batch_class_overall_stats', {
    class_names: classNames
  });

  if (error) throw error;

  const statsMap = new Map();
  
  data.forEach((item: any) => {
    statsMap.set(item.class_name, {
      total_students: item.total_students,
      overall_stats: {
        avg_score: parseFloat(item.avg_score) || 0,
        median_score: parseFloat(item.median_score) || 0,
        std_deviation: parseFloat(item.std_deviation) || 0,
        pass_rate: parseFloat(item.pass_rate) || 0,
        good_rate: parseFloat(item.good_rate) || 0,
        excellent_rate: parseFloat(item.excellent_rate) || 0,
        coefficient_variation: parseFloat(item.coefficient_variation) || 0
      }
    });
  });

  return statsMap;
}

/**
 * 批量获取班级学科统计数据
 */
async function getBatchSubjectStats(classNames: string[]): Promise<Map<string, ClassStatistics['subject_stats']>> {
  const { data, error } = await supabase.rpc('get_batch_class_subject_stats', {
    class_names: classNames
  });

  if (error) throw error;

  const statsMap = new Map<string, ClassStatistics['subject_stats']>();
  
  // 按班级分组
  const groupedData = data.reduce((acc: any, item: any) => {
    if (!acc[item.class_name]) {
      acc[item.class_name] = [];
    }
    acc[item.class_name].push({
      subject: item.subject,
      avg_score: parseFloat(item.avg_score) || 0,
      median_score: parseFloat(item.median_score) || 0,
      std_deviation: parseFloat(item.std_deviation) || 0,
      pass_rate: parseFloat(item.pass_rate) || 0,
      excellent_rate: parseFloat(item.excellent_rate) || 0,
      student_count: parseInt(item.student_count) || 0,
      rank_in_grade: parseInt(item.rank_in_grade) || 0
    });
    return acc;
  }, {});

  for (const [className, subjects] of Object.entries(groupedData)) {
    statsMap.set(className, subjects as ClassStatistics['subject_stats']);
  }

  return statsMap;
}

/**
 * 批量获取班级分数分布数据
 */
async function getBatchDistributionData(classNames: string[]): Promise<Map<string, ClassStatistics['score_distribution']>> {
  const { data, error } = await supabase.rpc('get_batch_class_distribution', {
    class_names: classNames
  });

  if (error) throw error;

  const statsMap = new Map<string, ClassStatistics['score_distribution']>();
  
  // 按班级分组处理分布数据
  const groupedData = data.reduce((acc: any, item: any) => {
    if (!acc[item.class_name]) {
      acc[item.class_name] = {
        ranges: [],
        quartiles: {
          q1: parseFloat(item.q1) || 0,
          q2: parseFloat(item.q2) || 0,
          q3: parseFloat(item.q3) || 0,
          min: parseFloat(item.min_score) || 0,
          max: parseFloat(item.max_score) || 0,
          iqr: (parseFloat(item.q3) || 0) - (parseFloat(item.q1) || 0)
        }
      };
    }
    
    if (item.score_range) {
      acc[item.class_name].ranges.push({
        range: item.score_range,
        count: parseInt(item.count) || 0,
        percentage: parseFloat(item.percentage) || 0
      });
    }
    
    return acc;
  }, {});

  for (const [className, distribution] of Object.entries(groupedData)) {
    statsMap.set(className, distribution as ClassStatistics['score_distribution']);
  }

  return statsMap;
}

/**
 * 批量获取班级时间趋势数据
 */
async function getBatchTrendData(classNames: string[]): Promise<Map<string, ClassStatistics['time_trends']>> {
  const { data, error } = await supabase.rpc('get_batch_class_trends', {
    class_names: classNames
  });

  if (error) throw error;

  const statsMap = new Map<string, ClassStatistics['time_trends']>();
  
  // 按班级分组
  const groupedData = data.reduce((acc: any, item: any) => {
    if (!acc[item.class_name]) {
      acc[item.class_name] = [];
    }
    acc[item.class_name].push({
      exam_date: item.exam_date,
      exam_title: item.exam_title,
      avg_score: parseFloat(item.class_avg_score) || 0,
      grade_avg_score: parseFloat(item.grade_avg_score) || 0,
      relative_performance: parseFloat(item.relative_performance) || 0
    });
    return acc;
  }, {});

  for (const [className, trends] of Object.entries(groupedData)) {
    // 按日期排序
    (trends as any[]).sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
    statsMap.set(className, trends as ClassStatistics['time_trends']);
  }

  return statsMap;
}

/**
 * 批量获取班级学生分组数据
 */
async function getBatchStudentGroups(classNames: string[]): Promise<Map<string, ClassStatistics['student_groups']>> {
  const { data, error } = await supabase.rpc('get_batch_class_student_groups', {
    class_names: classNames
  });

  if (error) throw error;

  const statsMap = new Map<string, ClassStatistics['student_groups']>();
  
  // 按班级和类型分组
  const groupedData = data.reduce((acc: any, item: any) => {
    if (!acc[item.class_name]) {
      acc[item.class_name] = {
        top_students: [],
        struggling_students: [],
        improved_students: []
      };
    }
    
    const student = {
      name: item.student_name,
      student_id: item.student_id,
      avg_score: parseFloat(item.avg_score) || 0,
      rank_in_class: parseInt(item.rank_in_class) || 0,
      subjects_below_60: item.subjects_below_60 ? item.subjects_below_60.split(',') : [],
      improvement_score: parseFloat(item.improvement_score) || 0,
      improvement_subjects: item.improvement_subjects ? item.improvement_subjects.split(',') : []
    };
    
    if (item.group_type === 'top') {
      acc[item.class_name].top_students.push(student);
    } else if (item.group_type === 'struggling') {
      acc[item.class_name].struggling_students.push(student);
    } else if (item.group_type === 'improved') {
      acc[item.class_name].improved_students.push(student);
    }
    
    return acc;
  }, {});

  for (const [className, groups] of Object.entries(groupedData)) {
    statsMap.set(className, groups as ClassStatistics['student_groups']);
  }

  return statsMap;
}

/**
 * 工具函数：从班级名称提取年级
 */
function extractGrade(className: string): string {
  const match = className.match(/([高中初][\w]*)/);
  return match ? match[1] : '未知';
}

/**
 * 工具函数：从班级名称提取年份
 */
function extractYear(className: string): string {
  const currentYear = new Date().getFullYear();
  return currentYear.toString();
}

/**
 * 默认数据生成函数
 */
function getDefaultOverallStats(): ClassStatistics['overall_stats'] {
  return {
    avg_score: 0,
    median_score: 0,
    std_deviation: 0,
    pass_rate: 0,
    good_rate: 0,
    excellent_rate: 0,
    coefficient_variation: 0
  };
}

function getDefaultDistribution(): ClassStatistics['score_distribution'] {
  return {
    ranges: [],
    quartiles: {
      q1: 0,
      q2: 0,
      q3: 0,
      min: 0,
      max: 0,
      iqr: 0
    }
  };
}

function getDefaultStudentGroups(): ClassStatistics['student_groups'] {
  return {
    top_students: [],
    struggling_students: [],
    improved_students: []
  };
}

/**
 * 缓存管理函数
 */
export function invalidateClassCache(pattern?: string): void {
  if (pattern) {
    cacheManager.invalidate(pattern);
  } else {
    cacheManager.clear();
  }
  console.log('📦 班级数据缓存已清理:', pattern || 'all');
}

/**
 * 实时数据订阅
 */
export function subscribeToClassDataChanges(callback: () => void): () => void {
  const channel = supabase.channel('class_data_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'grade_data' 
    }, () => {
      console.log('📡 检测到成绩数据变化，清理缓存');
      invalidateClassCache();
      callback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}