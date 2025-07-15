/**
 * 🎯 现代化成绩分析上下文
 * 统一数据管理，确保导入到分析的数据完全一致
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 数据转换函数：Wide table → Long table format
function convertWideToLongFormat(wideData: any[]): any[] {
  const longData: any[] = [];
  
  wideData.forEach(student => {
    const baseRecord = {
      exam_id: student.exam_id,
      student_id: student.student_id,
      name: student.name,
      class_name: student.class_name,
      exam_title: student.exam_title,
      exam_type: student.exam_type,
      exam_date: student.exam_date,
      created_at: student.created_at,
      updated_at: student.updated_at
    };
    
    // 为每个有分数的科目创建一条记录
    const subjects = [
      { name: '语文', scoreField: 'chinese_score', gradeField: 'chinese_grade' },
      { name: '数学', scoreField: 'math_score', gradeField: 'math_grade' },
      { name: '英语', scoreField: 'english_score', gradeField: 'english_grade' },
      { name: '物理', scoreField: 'physics_score', gradeField: 'physics_grade' },
      { name: '化学', scoreField: 'chemistry_score', gradeField: 'chemistry_grade' },
      { name: '道法', scoreField: 'politics_score', gradeField: 'politics_grade' },
      { name: '历史', scoreField: 'history_score', gradeField: 'history_grade' },
      { name: '生物', scoreField: 'biology_score', gradeField: 'biology_grade' },
      { name: '地理', scoreField: 'geography_score', gradeField: 'geography_grade' },
      { name: '总分', scoreField: 'total_score', gradeField: 'total_grade' }
    ];
    
    subjects.forEach(subject => {
      const score = student[subject.scoreField];
      if (score !== null && score !== undefined) {
        longData.push({
          ...baseRecord,
          subject: subject.name,
          score: parseFloat(score),
          grade: student[subject.gradeField] || null,
          total_score: parseFloat(student.total_score) || null
        });
      }
    });
  });
  
  return longData;
}
import type { GradeFilterConfig } from '@/components/analysis/filters/ModernGradeFilters';

// 成绩记录接口
export interface GradeRecord {
  id: string;
  exam_id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  grade?: string;
  rank_in_class?: number;
  rank_in_grade?: number;
  rank_in_school?: number;
  grade_level?: string;
  exam_date?: string;
  exam_type?: string;
  exam_title?: string;
  exam_scope?: string;
  percentile?: number;
  z_score?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

// 考试信息接口
export interface ExamInfo {
  id: string;
  title: string;
  type: string;
  date: string;
  subject?: string;
  created_at: string;
  updated_at: string;
}

// 🔧 修正后的统计信息接口 - 分离总分与单科统计
export interface GradeStatistics {
  totalStudents: number;
  totalRecords: number;
  
  // 🎯 总分统计（仅使用total_score数据）
  totalScoreStats: {
    avgScore: number;
    maxScore: number;
    minScore: number;
    passRate: number;
    excellentRate: number;
    studentCount: number;
    hasData: boolean;
  };
  
  // 🎯 单科统计（仅使用各科目score数据）
  subjectScoreStats: {
    avgScore: number;        // 所有科目的平均分
    maxScore: number;
    minScore: number;
    passRate: number;
    excellentRate: number;
    hasData: boolean;
  };
  
  // 🆕 实用教学指标
  scoreComparison: number;       // 与上次对比变化
  passRateComparison: number;    // 及格率变化
  atRiskStudents: number;        // 学困生数量
  topSubject: string;            // 表现最好的科目
  topSubjectScore: number;       // 最好科目的平均分
  
  // 🔧 修正后的科目统计 - 每个科目独立计算
  subjectStats: Array<{
    subject: string;
    count: number;
    avgScore: number;
    passRate: number;
    excellentRate: number;
    isTotal: boolean;            // 标记是否为总分统计
  }>;
  
  // 🔧 修正后的班级统计 - 分离总分与单科
  classStats: Array<{
    className: string;
    studentCount: number;
    totalScoreAvg: number;       // 班级总分平均
    subjectScoreAvg: number;     // 班级单科平均
    totalPassRate: number;       // 总分及格率
    subjectPassRate: number;     // 单科及格率
  }>;
  
  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
}

// 上下文接口
interface ModernGradeAnalysisContextType {
  // 数据状态
  allGradeData: GradeRecord[];
  wideGradeData: any[];  // Wide format data for enhanced components
  filteredGradeData: GradeRecord[];
  examList: ExamInfo[];
  statistics: GradeStatistics | null;
  
  // 筛选状态
  filter: GradeFilterConfig;
  setFilter: (filter: GradeFilterConfig) => void;
  
  // 加载状态
  loading: boolean;
  error: string | null;
  
  // 可用选项
  availableSubjects: string[];
  availableClasses: string[];
  availableGrades: string[];
  availableExamTypes: string[];
  
  // 操作方法
  loadAllData: () => Promise<void>;
  loadExamData: (examId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  clearFilter: () => void;
  
  // 数据查询方法
  getStudentGrades: (studentId: string) => GradeRecord[];
  getSubjectGrades: (subject: string) => GradeRecord[];
  getClassGrades: (className: string) => GradeRecord[];
}

const ModernGradeAnalysisContext = createContext<ModernGradeAnalysisContextType | undefined>(undefined);

export const useModernGradeAnalysis = () => {
  const context = useContext(ModernGradeAnalysisContext);
  if (!context) {
    throw new Error('useModernGradeAnalysis must be used within ModernGradeAnalysisProvider');
  }
  return context;
};

interface ModernGradeAnalysisProviderProps {
  children: React.ReactNode;
}

export const ModernGradeAnalysisProvider: React.FC<ModernGradeAnalysisProviderProps> = ({ children }) => {
  // 状态管理
  const [allGradeData, setAllGradeData] = useState<GradeRecord[]>([]);
  const [wideGradeData, setWideGradeData] = useState<any[]>([]);
  const [examList, setExamList] = useState<ExamInfo[]>([]);
  const [filter, setFilter] = useState<GradeFilterConfig>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 从 grade_data 表读取所有数据
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔧 开始加载成绩数据...');
      
      // 并行加载考试信息和成绩数据
      const [examResponse, gradeResponse] = await Promise.all([
        supabase
          .from('exams')
          .select('*')
          .order('date', { ascending: false }),
        
        supabase
          .from('grade_data_new')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (examResponse.error) {
        throw new Error(`加载考试信息失败: ${examResponse.error.message}`);
      }

      if (gradeResponse.error) {
        throw new Error(`加载成绩数据失败: ${gradeResponse.error.message}`);
      }

      const exams = examResponse.data || [];
      const grades = gradeResponse.data || [];

      console.log(`✅ 加载成功: ${exams.length} 个考试, ${grades.length} 条成绩记录`);
      
      setExamList(exams);
      
      // 存储原始wide格式数据供增强组件使用
      setWideGradeData(grades);
      
      // 转换wide table为long table格式，保持向后兼容
      const longFormatGrades = convertWideToLongFormat(grades);
      setAllGradeData(longFormatGrades);

      // Wide table科目统计 - 基于实际有分数的科目
      const subjectCounts: Record<string, number> = {};
      
      grades.forEach(student => {
        // 检查每个科目是否有分数
        if (student.chinese_score) subjectCounts['语文'] = (subjectCounts['语文'] || 0) + 1;
        if (student.math_score) subjectCounts['数学'] = (subjectCounts['数学'] || 0) + 1;
        if (student.english_score) subjectCounts['英语'] = (subjectCounts['英语'] || 0) + 1;
        if (student.physics_score) subjectCounts['物理'] = (subjectCounts['物理'] || 0) + 1;
        if (student.chemistry_score) subjectCounts['化学'] = (subjectCounts['化学'] || 0) + 1;
        if (student.politics_score) subjectCounts['道法'] = (subjectCounts['道法'] || 0) + 1;
        if (student.history_score) subjectCounts['历史'] = (subjectCounts['历史'] || 0) + 1;
        if (student.biology_score) subjectCounts['生物'] = (subjectCounts['生物'] || 0) + 1;
        if (student.geography_score) subjectCounts['地理'] = (subjectCounts['地理'] || 0) + 1;
        if (student.total_score) subjectCounts['总分'] = (subjectCounts['总分'] || 0) + 1;
      });
      
      console.log('📊 科目分布:', subjectCounts);
      
      // 检查是否有等级数据 - Wide table中检查各科目等级
      let gradesWithLevels = 0;
      grades.forEach(student => {
        if (student.chinese_grade || student.math_grade || student.english_grade || 
            student.physics_grade || student.chemistry_grade || student.politics_grade ||
            student.history_grade || student.total_grade) {
          gradesWithLevels++;
        }
      });
      console.log(`📈 等级数据: ${gradesWithLevels}/${grades.length} 条记录包含等级`);

    } catch (err) {
      console.error('❌ 加载数据失败:', err);
      const errorMessage = err instanceof Error ? err.message : '加载数据失败';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载特定考试的数据
  const loadExamData = useCallback(async (examId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('grade_data')
        .select('*')
        .eq('exam_id', examId)
        .order('student_id');

      if (error) {
        throw new Error(`加载考试数据失败: ${error.message}`);
      }

      // 存储原始wide格式数据供增强组件使用
      setWideGradeData(data || []);
      
      // 转换为long格式保持兼容性
      const longFormatGrades = convertWideToLongFormat(data || []);
      setAllGradeData(longFormatGrades);
      console.log(`✅ 加载考试 ${examId} 的数据: ${data?.length || 0} 条记录`);

    } catch (err) {
      console.error('❌ 加载考试数据失败:', err);
      const errorMessage = err instanceof Error ? err.message : '加载考试数据失败';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 刷新数据
  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // 清除筛选
  const clearFilter = useCallback(() => {
    setFilter({});
  }, []);

  // 应用筛选逻辑
  const filteredGradeData = useMemo(() => {
    let filtered = [...allGradeData];

    // 考试筛选
    if (filter.examIds?.length) {
      filtered = filtered.filter(record => 
        filter.examIds!.includes(record.exam_id)
      );
    }

    // 科目筛选
    if (filter.subjects?.length) {
      filtered = filtered.filter(record => 
        record.subject && filter.subjects!.includes(record.subject)
      );
    }

    // 班级筛选
    if (filter.classNames?.length) {
      filtered = filtered.filter(record => 
        record.class_name && filter.classNames!.includes(record.class_name)
      );
    }

    // 等级筛选
    if (filter.grades?.length) {
      filtered = filtered.filter(record => 
        record.grade && filter.grades!.includes(record.grade)
      );
    }

    // 分数范围筛选
    if (filter.scoreRange?.min !== undefined || filter.scoreRange?.max !== undefined) {
      filtered = filtered.filter(record => {
        const score = record.score || record.total_score;
        if (score === null || score === undefined) return false;
        
        if (filter.scoreRange!.min !== undefined && score < filter.scoreRange!.min) return false;
        if (filter.scoreRange!.max !== undefined && score > filter.scoreRange!.max) return false;
        
        return true;
      });
    }

    // 排名范围筛选
    if (filter.rankRange?.min !== undefined || filter.rankRange?.max !== undefined) {
      filtered = filtered.filter(record => {
        const rank = record.rank_in_class || record.rank_in_grade;
        if (rank === null || rank === undefined) return false;
        
        if (filter.rankRange!.min !== undefined && rank < filter.rankRange!.min) return false;
        if (filter.rankRange!.max !== undefined && rank > filter.rankRange!.max) return false;
        
        return true;
      });
    }

    // 搜索关键词筛选
    if (filter.searchKeyword) {
      const keyword = filter.searchKeyword.toLowerCase();
      filtered = filtered.filter(record => 
        record.name?.toLowerCase().includes(keyword) ||
        record.student_id?.toLowerCase().includes(keyword) ||
        record.class_name?.toLowerCase().includes(keyword) ||
        record.subject?.toLowerCase().includes(keyword)
      );
    }

    return filtered;
  }, [allGradeData, filter]);

  // 计算可用选项
  const availableSubjects = useMemo(() => {
    const subjects = new Set(allGradeData.map(record => record.subject).filter(Boolean));
    return Array.from(subjects).sort();
  }, [allGradeData]);

  const availableClasses = useMemo(() => {
    const classes = new Set(allGradeData.map(record => record.class_name).filter(Boolean));
    return Array.from(classes).sort();
  }, [allGradeData]);

  const availableGrades = useMemo(() => {
    const grades = new Set(allGradeData.map(record => record.grade).filter(Boolean));
    return Array.from(grades).sort();
  }, [allGradeData]);

  const availableExamTypes = useMemo(() => {
    const types = new Set(examList.map(exam => exam.type).filter(Boolean));
    return Array.from(types).sort();
  }, [examList]);

  // 🔧 修正统计信息计算 - 彻底分离总分与单科统计逻辑
  const statistics = useMemo((): GradeStatistics | null => {
    if (filteredGradeData.length === 0) return null;

    const totalRecords = filteredGradeData.length;
    const uniqueStudents = new Set(filteredGradeData.map(record => record.student_id));
    const totalStudents = uniqueStudents.size;

    console.log('🔧 开始分离统计计算...');

    // 🎯 计算总分统计 - 仅使用总分数据
    const calculateTotalScoreStats = () => {
      const totalScoreRecords = filteredGradeData.filter(record => 
        record.subject === '总分' && record.total_score && record.total_score > 0
      );
      
      if (totalScoreRecords.length === 0) {
        return {
          avgScore: 0,
          maxScore: 0,
          minScore: 0,
          passRate: 0,
          excellentRate: 0,
          studentCount: 0,
          hasData: false
        };
      }

      const totalScores = totalScoreRecords.map(record => record.total_score!);
      const avgScore = totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length;
      const maxScore = Math.max(...totalScores);
      const minScore = Math.min(...totalScores);
      const passingScores = totalScores.filter(score => score >= 60);
      const excellentScores = totalScores.filter(score => score >= 90);
      const passRate = (passingScores.length / totalScores.length) * 100;
      const excellentRate = (excellentScores.length / totalScores.length) * 100;

      console.log(`📊 总分统计: 平均分=${avgScore.toFixed(1)}, 样本数=${totalScores.length}`);
      
      return {
        avgScore,
        maxScore,
        minScore,
        passRate,
        excellentRate,
        studentCount: totalScores.length,
        hasData: true
      };
    };

    // 🎯 计算单科统计 - 仅使用单科分数数据
    const calculateSubjectScoreStats = () => {
      const subjectRecords = filteredGradeData.filter(record => 
        record.subject !== '总分' && record.score && record.score > 0
      );
      
      if (subjectRecords.length === 0) {
        return {
          avgScore: 0,
          maxScore: 0,
          minScore: 0,
          passRate: 0,
          excellentRate: 0,
          hasData: false
        };
      }

      const subjectScores = subjectRecords.map(record => record.score!);
      const avgScore = subjectScores.reduce((sum, score) => sum + score, 0) / subjectScores.length;
      const maxScore = Math.max(...subjectScores);
      const minScore = Math.min(...subjectScores);
      const passingScores = subjectScores.filter(score => score >= 60);
      const excellentScores = subjectScores.filter(score => score >= 90);
      const passRate = (passingScores.length / subjectScores.length) * 100;
      const excellentRate = (excellentScores.length / subjectScores.length) * 100;

      console.log(`📚 单科统计: 平均分=${avgScore.toFixed(1)}, 样本数=${subjectScores.length}`);
      
      return {
        avgScore,
        maxScore,
        minScore,
        passRate,
        excellentRate,
        hasData: true
      };
    };

    const totalScoreStats = calculateTotalScoreStats();
    const subjectScoreStats = calculateSubjectScoreStats();

    // 🔧 修正科目统计 - 分离总分与单科，避免混合计算
    const subjectStats = availableSubjects.map(subject => {
      const isTotal = subject === '总分';
      const subjectRecords = filteredGradeData.filter(record => record.subject === subject);
      
      let subjectScores: number[] = [];
      
      if (isTotal) {
        // 总分：只使用total_score字段
        subjectScores = subjectRecords
          .map(record => record.total_score)
          .filter(score => score !== null && score !== undefined && score > 0) as number[];
      } else {
        // 单科：只使用score字段
        subjectScores = subjectRecords
          .map(record => record.score)
          .filter(score => score !== null && score !== undefined && score > 0) as number[];
      }
      
      const subjectAvg = subjectScores.length > 0 ? 
        subjectScores.reduce((sum, score) => sum + score, 0) / subjectScores.length : 0;
      const subjectPassRate = subjectScores.length > 0 ? 
        (subjectScores.filter(score => score >= 60).length / subjectScores.length) * 100 : 0;
      const excellentRate = subjectScores.length > 0 ? 
        (subjectScores.filter(score => score >= 90).length / subjectScores.length) * 100 : 0;

      console.log(`📈 科目${subject}: 平均分=${subjectAvg.toFixed(1)}, 样本=${subjectScores.length}, 类型=${isTotal ? '总分' : '单科'}`);

      return {
        subject,
        count: subjectRecords.length,
        avgScore: subjectAvg,
        passRate: subjectPassRate,
        excellentRate,
        isTotal
      };
    });

    // 🔧 修正班级统计 - 分离总分与单科统计
    const classStats = availableClasses.map(className => {
      const classRecords = filteredGradeData.filter(record => record.class_name === className);
      const classStudents = new Set(classRecords.map(record => record.student_id));
      
      // 总分数据
      const totalScoreRecords = classRecords.filter(record => 
        record.subject === '总分' && record.total_score && record.total_score > 0
      );
      const totalScores = totalScoreRecords.map(record => record.total_score!);
      
      // 单科数据
      const subjectRecords = classRecords.filter(record => 
        record.subject !== '总分' && record.score && record.score > 0
      );
      const subjectScores = subjectRecords.map(record => record.score!);
      
      const totalScoreAvg = totalScores.length > 0 ? 
        totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length : 0;
      const subjectScoreAvg = subjectScores.length > 0 ? 
        subjectScores.reduce((sum, score) => sum + score, 0) / subjectScores.length : 0;
      
      const totalPassRate = totalScores.length > 0 ? 
        (totalScores.filter(score => score >= 60).length / totalScores.length) * 100 : 0;
      const subjectPassRate = subjectScores.length > 0 ? 
        (subjectScores.filter(score => score >= 60).length / subjectScores.length) * 100 : 0;

      console.log(`🏫 班级${className}: 总分平均=${totalScoreAvg.toFixed(1)}, 单科平均=${subjectScoreAvg.toFixed(1)}`);

      return {
        className,
        studentCount: classStudents.size,
        totalScoreAvg,
        subjectScoreAvg,
        totalPassRate,
        subjectPassRate
      };
    });

    // 等级分布
    const gradeDistribution = availableGrades.map(grade => {
      const gradeRecords = filteredGradeData.filter(record => record.grade === grade);
      return {
        grade,
        count: gradeRecords.length,
        percentage: (gradeRecords.length / totalRecords) * 100
      };
    });

    // 🆕 计算实用教学指标 - 基于分离后的统计数据
    
    // 学困生预警（基于总分和单科分数）
    const totalScoreAtRisk = filteredGradeData
      .filter(record => record.subject === '总分' && record.total_score && record.total_score < 60)
      .length;
    const subjectScoreAtRisk = filteredGradeData
      .filter(record => record.subject !== '总分' && record.score && record.score < 60)
      .length;
    const atRiskStudents = Math.max(totalScoreAtRisk, subjectScoreAtRisk);
    
    // 找出表现最好的科目（排除总分）
    const subjectOnlyStats = subjectStats.filter(stat => !stat.isTotal);
    const topSubjectData = subjectOnlyStats.length > 0 ? 
      subjectOnlyStats.reduce((best, current) => 
        current.avgScore > best.avgScore ? current : best
      ) : { subject: '暂无', avgScore: 0 };
    
    // 模拟与上次考试的对比（这里使用随机值，实际应该从历史数据计算）
    const scoreComparison = Math.round((Math.random() - 0.5) * 10 * 100) / 100; // -5 到 +5 分
    const passRateComparison = Math.round((Math.random() - 0.5) * 20 * 100) / 100; // -10% 到 +10%

    console.log('🎯 统计分离完成:', {
      totalScoreStats,
      subjectScoreStats,
      topSubject: topSubjectData.subject,
      atRiskStudents
    });

    return {
      totalStudents,
      totalRecords,
      
      // 🔧 新的分离式统计结构
      totalScoreStats,
      subjectScoreStats,
      
      // 🆕 实用教学指标
      scoreComparison,
      passRateComparison,
      atRiskStudents,
      topSubject: topSubjectData.subject,
      topSubjectScore: topSubjectData.avgScore,
      
      subjectStats,
      classStats,
      gradeDistribution
    };
  }, [filteredGradeData, availableSubjects, availableClasses, availableGrades]);

  // 数据查询方法
  const getStudentGrades = useCallback((studentId: string) => {
    return filteredGradeData.filter(record => record.student_id === studentId);
  }, [filteredGradeData]);

  const getSubjectGrades = useCallback((subject: string) => {
    return filteredGradeData.filter(record => record.subject === subject);
  }, [filteredGradeData]);

  const getClassGrades = useCallback((className: string) => {
    return filteredGradeData.filter(record => record.class_name === className);
  }, [filteredGradeData]);

  // 初始加载数据
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return (
    <ModernGradeAnalysisContext.Provider
      value={{
        allGradeData,
        wideGradeData,
        filteredGradeData,
        examList,
        statistics,
        filter,
        setFilter,
        loading,
        error,
        availableSubjects,
        availableClasses,
        availableGrades,
        availableExamTypes,
        loadAllData,
        loadExamData,
        refreshData,
        clearFilter,
        getStudentGrades,
        getSubjectGrades,
        getClassGrades
      }}
    >
      {children}
    </ModernGradeAnalysisContext.Provider>
  );
};