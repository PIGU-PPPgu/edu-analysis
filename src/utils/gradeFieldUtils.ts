/**
 * 统一的成绩数据字段访问工具函数
 * 解决各组件中重复的字段映射逻辑
 */

import { GradeRecord, Subject, GradeLevel } from '@/types/grade';
import type { 
  ClassDataAggregation,
  ClassStatistics,
  ClassComparison,
  GradeStatistics,
  GradeLevelDistribution
} from '../types/grade';

// 科目字段映射配置
export const SUBJECT_FIELD_MAPPING = {
  [Subject.TOTAL]: {
    score: ['score', '总分分数', 'total_score'],
    grade: ['grade_level', '总分等级', 'total_grade'],
    classRank: ['总分班名', 'rank_in_class'],
    schoolRank: ['总分校名', 'rank_in_school'],
    gradeRank: ['总分级名', 'rank_in_grade']
  },
  [Subject.CHINESE]: {
    score: ['语文分数', 'chinese_score'],
    grade: ['语文等级', 'chinese_grade'],
    classRank: ['语文班名', 'chinese_rank_in_class'],
    schoolRank: ['语文校名', 'chinese_rank_in_school'],
    gradeRank: ['语文级名', 'chinese_rank_in_grade']
  },
  [Subject.MATH]: {
    score: ['数学分数', 'math_score'],
    grade: ['数学等级', 'math_grade'],
    classRank: ['数学班名', 'math_rank_in_class'],
    schoolRank: ['数学校名', 'math_rank_in_school'],
    gradeRank: ['数学级名', 'math_rank_in_grade']
  },
  [Subject.ENGLISH]: {
    score: ['英语分数', 'english_score'],
    grade: ['英语等级', 'english_grade'],
    classRank: ['英语班名', 'english_rank_in_class'],
    schoolRank: ['英语校名', 'english_rank_in_school'],
    gradeRank: ['英语级名', 'english_rank_in_grade']
  },
  [Subject.PHYSICS]: {
    score: ['物理分数', 'physics_score'],
    grade: ['物理等级', 'physics_grade'],
    classRank: ['物理班名', 'physics_rank_in_class'],
    schoolRank: ['物理校名', 'physics_rank_in_school'],
    gradeRank: ['物理级名', 'physics_rank_in_grade']
  },
  [Subject.CHEMISTRY]: {
    score: ['化学分数', 'chemistry_score'],
    grade: ['化学等级', 'chemistry_grade'],
    classRank: ['化学班名', 'chemistry_rank_in_class'],
    schoolRank: ['化学校名', 'chemistry_rank_in_school'],
    gradeRank: ['化学级名', 'chemistry_rank_in_grade']
  },
  [Subject.POLITICS]: {
    score: ['道法分数', 'politics_score'],
    grade: ['道法等级', 'politics_grade'],
    classRank: ['道法班名', 'politics_rank_in_class'],
    schoolRank: ['道法校名', 'politics_rank_in_school'],
    gradeRank: ['道法级名', 'politics_rank_in_grade']
  },
  [Subject.HISTORY]: {
    score: ['历史分数', 'history_score'],
    grade: ['历史等级', 'history_grade'],
    classRank: ['历史班名', 'history_rank_in_class'],
    schoolRank: ['历史校名', 'history_rank_in_school'],
    gradeRank: ['历史级名', 'history_rank_in_grade']
  }
};

/**
 * 从记录中获取指定字段的值
 * @param record 成绩记录
 * @param fieldNames 字段名数组（按优先级排序）
 * @returns 字段值
 */
function getFieldValue(record: any, fieldNames: string[]): any {
  for (const fieldName of fieldNames) {
    if (record[fieldName] !== undefined && record[fieldName] !== null && record[fieldName] !== '') {
      return record[fieldName];
    }
  }
  return undefined;
}

/**
 * 获取学生姓名
 * @param record 成绩记录
 * @returns 学生姓名
 */
export function getStudentName(record: GradeRecord): string {
  return getFieldValue(record, ['student_name', 'name', '姓名']) || '';
}

/**
 * 获取班级名称
 * @param record 成绩记录
 * @returns 班级名称
 */
export function getClassName(record: GradeRecord): string {
  return getFieldValue(record, ['class_name', '班级']) || '';
}

/**
 * 获取科目名称
 * @param record 成绩记录
 * @returns 科目名称
 */
export function getSubject(record: GradeRecord): string {
  return getFieldValue(record, ['subject', '科目']) || '';
}

/**
 * 获取指定科目的分数
 * @param record 成绩记录
 * @param subject 科目
 * @returns 分数
 */
export function getSubjectScore(record: GradeRecord, subject: Subject | string): number {
  // 如果记录中有通用的score字段且subject匹配，直接返回
  if (record.subject === subject && record.score !== undefined) {
    return Number(record.score) || 0;
  }
  
  // 否则根据科目查找对应的分数字段
  const fieldMapping = SUBJECT_FIELD_MAPPING[subject as Subject];
  if (fieldMapping) {
    const score = getFieldValue(record, fieldMapping.score);
    return Number(score) || 0;
  }
  
  return 0;
}

/**
 * 获取指定科目的等级
 * @param record 成绩记录
 * @param subject 科目
 * @returns 等级字符串
 */
export function getSubjectGrade(record: GradeRecord, subject: Subject | string): string {
  // 如果记录中有通用的grade_level字段且subject匹配，直接返回
  if (record.subject === subject && record.grade_level) {
    return record.grade_level.toString().trim();
  }
  
  // 否则根据科目查找对应的等级字段
  const fieldMapping = SUBJECT_FIELD_MAPPING[subject as Subject];
  if (fieldMapping) {
    const grade = getFieldValue(record, fieldMapping.grade);
    return grade ? grade.toString().trim() : '';
  }
  
  return '';
}

/**
 * 获取指定科目的班级排名
 * @param record 成绩记录
 * @param subject 科目
 * @returns 班级排名
 */
export function getSubjectClassRank(record: GradeRecord, subject: Subject | string): number {
  const fieldMapping = SUBJECT_FIELD_MAPPING[subject as Subject];
  if (fieldMapping) {
    const rank = getFieldValue(record, fieldMapping.classRank);
    return Number(rank) || 0;
  }
  return 0;
}

/**
 * 获取指定科目的学校排名
 * @param record 成绩记录
 * @param subject 科目
 * @returns 学校排名
 */
export function getSubjectSchoolRank(record: GradeRecord, subject: Subject | string): number {
  const fieldMapping = SUBJECT_FIELD_MAPPING[subject as Subject];
  if (fieldMapping) {
    const rank = getFieldValue(record, fieldMapping.schoolRank);
    return Number(rank) || 0;
  }
  return 0;
}

/**
 * 获取指定科目的年级排名
 * @param record 成绩记录
 * @param subject 科目
 * @returns 年级排名
 */
export function getSubjectGradeRank(record: GradeRecord, subject: Subject | string): number {
  const fieldMapping = SUBJECT_FIELD_MAPPING[subject as Subject];
  if (fieldMapping) {
    const rank = getFieldValue(record, fieldMapping.gradeRank);
    return Number(rank) || 0;
  }
  return 0;
}

/**
 * 过滤指定科目的成绩数据
 * @param records 成绩记录数组
 * @param subject 科目
 * @returns 过滤后的成绩记录数组
 */
export function filterBySubject(records: GradeRecord[], subject: Subject | string): GradeRecord[] {
  return records.filter(record => {
    const recordSubject = getSubject(record);
    return recordSubject === subject;
  });
}

/**
 * 规范化等级名称
 * @param grade 原始等级字符串
 * @returns 规范化的等级名称
 */
export function normalizeGradeLevel(grade: string): GradeLevel | string {
  if (!grade) return '';
  
  const normalized = grade.toString().toUpperCase().trim();
  
  // 映射常见的等级变体
  const gradeMapping: { [key: string]: GradeLevel } = {
    'A+': GradeLevel.A_PLUS,
    'A＋': GradeLevel.A_PLUS,
    'A': GradeLevel.A,
    'B+': GradeLevel.B_PLUS,
    'B＋': GradeLevel.B_PLUS,
    'B': GradeLevel.B,
    'C+': GradeLevel.C_PLUS,
    'C＋': GradeLevel.C_PLUS,
    'C': GradeLevel.C
  };
  
  return gradeMapping[normalized] || normalized;
}

/**
 * 检查记录是否包含指定科目的数据
 * @param record 成绩记录
 * @param subject 科目
 * @returns 是否包含该科目数据
 */
export function hasSubjectData(record: GradeRecord, subject: Subject | string): boolean {
  // 检查通用字段
  if (record.subject === subject) {
    return true;
  }
  
  // 检查科目特定字段
  const fieldMapping = SUBJECT_FIELD_MAPPING[subject as Subject];
  if (fieldMapping) {
    return fieldMapping.score.some(field => record[field] !== undefined);
  }
  
  return false;
}

/**
 * 获取记录中所有可用的科目
 * @param record 成绩记录
 * @returns 科目数组
 */
export function getAvailableSubjects(record: GradeRecord): Subject[] {
  const subjects: Subject[] = [];
  
  for (const subject of Object.values(Subject)) {
    if (hasSubjectData(record, subject)) {
      subjects.push(subject);
    }
  }
  
  return subjects;
}

/**
 * 创建标准化的成绩记录
 * @param rawRecord 原始记录
 * @param subject 科目
 * @returns 标准化的成绩记录
 */
export function createStandardGradeRecord(rawRecord: any, subject: Subject | string): GradeRecord {
  return {
    id: rawRecord.id,
    student_id: rawRecord.student_id || rawRecord.学号 || '',
    student_name: getStudentName(rawRecord),
    class_name: getClassName(rawRecord),
    subject: subject,
    score: getSubjectScore(rawRecord, subject),
    grade_level: getSubjectGrade(rawRecord, subject),
    exam_id: rawRecord.exam_id,
    exam_name: rawRecord.exam_name,
    exam_date: rawRecord.exam_date,
    created_at: rawRecord.created_at,
    updated_at: rawRecord.updated_at,
    ...rawRecord // 保留所有原始字段以确保兼容性
  };
}

/**
 * 班级数据分组和统计工具函数
 */

/**
 * 按班级分组数据
 */
export function groupDataByClass(data: GradeRecord[]): ClassDataAggregation {
  const byClass = new Map<string, GradeRecord[]>();
  const classStudentCounts = new Map<string, number>();
  
  data.forEach(record => {
    const className = getClassName(record);
    if (!className) return;
    
    if (!byClass.has(className)) {
      byClass.set(className, []);
    }
    byClass.get(className)!.push(record);
  });
  
  // 计算每个班级的学生数
  byClass.forEach((records, className) => {
    classStudentCounts.set(className, records.length);
  });
  
  return {
    byClass,
    classNames: Array.from(byClass.keys()).sort(),
    totalStudents: data.length,
    classStudentCounts
  };
}

/**
 * 获取指定班级的数据
 */
export function getClassData(data: GradeRecord[], className: string): GradeRecord[] {
  return data.filter(record => getClassName(record) === className);
}

/**
 * 获取多个班级的数据
 */
export function getMultipleClassesData(data: GradeRecord[], classNames: string[]): GradeRecord[] {
  return data.filter(record => {
    const recordClassName = getClassName(record);
    return recordClassName && classNames.includes(recordClassName);
  });
}

/**
 * 计算班级统计数据
 */
export function calculateClassStatistics(
  classData: GradeRecord[], 
  className: string,
  subjects: Subject[] = Object.values(Subject)
): ClassStatistics {
  const statistics: { [subject: string]: GradeStatistics } = {};
  const gradeLevelDistribution: { [subject: string]: GradeLevelDistribution } = {};
  
  subjects.forEach(subject => {
    // 获取该科目的所有分数
    const scores = classData
      .map(record => getSubjectScore(record, subject))
      .filter((score): score is number => score !== null);
    
    if (scores.length > 0) {
      // 基础统计
      const sum = scores.reduce((a, b) => a + b, 0);
      const average = sum / scores.length;
      const sortedScores = [...scores].sort((a, b) => a - b);
      
      statistics[subject] = {
        total: scores.length,
        average: Math.round(average * 10) / 10,
        max: Math.max(...scores),
        min: Math.min(...scores),
        median: scores.length % 2 === 0 
          ? (sortedScores[scores.length / 2 - 1] + sortedScores[scores.length / 2]) / 2
          : sortedScores[Math.floor(scores.length / 2)],
        standardDeviation: calculateStandardDeviation(scores, average),
        passRate: calculatePassRate(scores, subject),
        excellentRate: calculateExcellentRate(scores, subject),
        distribution: []
      };
      
      // 等级分布统计
      const gradeDistribution: GradeLevelDistribution[] = [];
      const gradeCounts: { [key: string]: number } = {};
      
      // 初始化计数
      Object.values(GradeLevel).forEach(level => {
        gradeCounts[level] = 0;
      });
      
      // 统计各等级人数
      classData.forEach(record => {
        const grade = getSubjectGrade(record, subject);
        if (grade && gradeCounts.hasOwnProperty(grade)) {
          gradeCounts[grade]++;
        }
      });
      
      // 转换为分布数组格式
      Object.entries(gradeCounts).forEach(([level, count]) => {
        gradeDistribution.push({
          level: level as GradeLevel,
          name: level,
          count,
          percentage: Math.round((count / classData.length) * 100 * 10) / 10,
          color: '#3B82F6', // 默认蓝色，可以后续配置
          icon: '📊' // 默认图标，可以后续配置
        });
      });
      
      gradeLevelDistribution[subject] = gradeDistribution as any;
    }
  });
  
  return {
    className,
    studentCount: classData.length,
    statistics,
    gradeLevelDistribution: gradeLevelDistribution as any // 临时解决类型不匹配问题
  };
}

/**
 * 标准差计算
 */
function calculateStandardDeviation(scores: number[], average: number): number {
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

/**
 * 计算及格率
 */
function calculatePassRate(scores: number[], subject: Subject): number {
  const passThreshold = getPassThreshold(subject);
  const passCount = scores.filter(score => score >= passThreshold).length;
  return Math.round((passCount / scores.length) * 100 * 10) / 10;
}

/**
 * 计算优秀率
 */
function calculateExcellentRate(scores: number[], subject: Subject): number {
  const excellentThreshold = getExcellentThreshold(subject);
  const excellentCount = scores.filter(score => score >= excellentThreshold).length;
  return Math.round((excellentCount / scores.length) * 100 * 10) / 10;
}

/**
 * 获取及格线
 */
function getPassThreshold(subject: Subject): number {
  // 基于科目设置不同的及格线
  switch (subject) {
    case Subject.TOTAL:
      return 360; // 总分及格线
    case Subject.CHINESE:
    case Subject.MATH:
    case Subject.ENGLISH:
      return 60; // 主科及格线
    case Subject.PHYSICS:
    case Subject.CHEMISTRY:
      return 48; // 理科及格线 (按80分满分的60%)
    case Subject.POLITICS:
    case Subject.HISTORY:
      return 36; // 文科及格线 (按60分满分的60%)
    default:
      return 60;
  }
}

/**
 * 获取优秀线
 */
function getExcellentThreshold(subject: Subject): number {
  // 基于科目设置不同的优秀线
  switch (subject) {
    case Subject.TOTAL:
      return 450; // 总分优秀线
    case Subject.CHINESE:
    case Subject.MATH:
    case Subject.ENGLISH:
      return 85; // 主科优秀线
    case Subject.PHYSICS:
    case Subject.CHEMISTRY:
      return 68; // 理科优秀线 (按80分满分的85%)
    case Subject.POLITICS:
    case Subject.HISTORY:
      return 51; // 文科优秀线 (按60分满分的85%)
    default:
      return 85;
  }
}

/**
 * 计算班级排名
 */
export function calculateClassRankings(
  classesStats: ClassStatistics[], 
  subject: Subject
): Array<{ className: string; average: number; rank: number }> {
  const classAverages = classesStats
    .map(classStats => ({
      className: classStats.className,
      average: classStats.statistics[subject]?.average || 0
    }))
    .sort((a, b) => b.average - a.average); // 降序排列
  
  return classAverages.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
}

/**
 * 生成班级对比数据
 */
export function generateClassComparison(
  data: GradeRecord[],
  selectedClasses?: string[],
  subjects: Subject[] = Object.values(Subject)
): ClassComparison {
  const aggregation = groupDataByClass(data);
  
  // 确定要分析的班级
  const targetClasses = selectedClasses && selectedClasses.length > 0 
    ? selectedClasses 
    : aggregation.classNames;
  
  // 计算各班级统计
  const classesStats: ClassStatistics[] = targetClasses.map(className => {
    const classData = aggregation.byClass.get(className) || [];
    return calculateClassStatistics(classData, className, subjects);
  });
  
  // 计算年级整体统计
  const gradeData = selectedClasses && selectedClasses.length > 0
    ? getMultipleClassesData(data, selectedClasses)
    : data;
  
  const gradeOverall: { [subject: string]: GradeStatistics } = {};
  subjects.forEach(subject => {
    const scores = gradeData
      .map(record => getSubjectScore(record, subject))
      .filter((score): score is number => score !== null);
    
    if (scores.length > 0) {
      const sum = scores.reduce((a, b) => a + b, 0);
      const average = sum / scores.length;
      const sortedScores = [...scores].sort((a, b) => a - b);
      
      gradeOverall[subject] = {
        total: scores.length,
        average: Math.round(average * 10) / 10,
        max: Math.max(...scores),
        min: Math.min(...scores),
        median: scores.length % 2 === 0 
          ? (sortedScores[scores.length / 2 - 1] + sortedScores[scores.length / 2]) / 2
          : sortedScores[Math.floor(scores.length / 2)],
        standardDeviation: calculateStandardDeviation(scores, average),
        passRate: calculatePassRate(scores, subject),
        excellentRate: calculateExcellentRate(scores, subject),
        distribution: []
      };
    }
  });
  
  // 生成对比指标
  const comparisonMetrics = subjects.map(subject => {
    const classRankings = calculateClassRankings(classesStats, subject);
    const gradeAverage = gradeOverall[subject]?.average || 0;
    
    return {
      subject,
      classRankings,
      gradeAverage,
      bestClass: classRankings[0]?.className || '',
      worstClass: classRankings[classRankings.length - 1]?.className || ''
    };
  });
  
  return {
    classes: classesStats,
    gradeOverall: gradeOverall as any, // 临时解决类型不匹配问题
    comparisonMetrics
  };
}

/**
 * 筛选指定班级的数据
 */
export function filterDataByClasses(
  data: GradeRecord[], 
  selectedClasses: string[]
): GradeRecord[] {
  if (selectedClasses.length === 0) {
    return data;
  }
  
  return data.filter(record => {
    const className = getClassName(record);
    return className && selectedClasses.includes(className);
  });
}

/**
 * 获取所有可用的班级列表
 */
export function getAvailableClasses(data: GradeRecord[]): string[] {
  const classes = new Set<string>();
  
  data.forEach(record => {
    const className = getClassName(record);
    if (className) {
      classes.add(className);
    }
  });
  
  return Array.from(classes).sort();
}

/**
 * 班级数据验证
 */
export function validateClassData(data: GradeRecord[]): {
  isValid: boolean;
  classCount: number;
  totalStudents: number;
  issues: string[];
} {
  const issues: string[] = [];
  const aggregation = groupDataByClass(data);
  
  // 检查是否有班级数据
  if (aggregation.classNames.length === 0) {
    issues.push('未找到有效的班级信息');
  }
  
  // 检查班级学生数是否合理
  aggregation.classStudentCounts.forEach((count, className) => {
    if (count < 1) {
      issues.push(`班级 ${className} 学生数为0`);
    } else if (count > 100) {
      issues.push(`班级 ${className} 学生数过多 (${count}人)，请检查数据`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    classCount: aggregation.classNames.length,
    totalStudents: aggregation.totalStudents,
    issues
  };
} 