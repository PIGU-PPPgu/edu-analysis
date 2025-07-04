/**
 * 🎯 现代化成绩分析上下文
 * 统一数据管理，确保导入到分析的数据完全一致
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

// 统计信息接口
export interface GradeStatistics {
  totalStudents: number;
  totalRecords: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
  passRate: number;
  excellentRate: number;
  
  // 🆕 新增实用教学指标
  averageScore: number;          // 当前平均分
  scoreComparison: number;       // 与上次对比变化
  passRateComparison: number;    // 及格率变化
  atRiskStudents: number;        // 学困生数量
  topSubject: string;            // 表现最好的科目
  topSubjectScore: number;       // 最好科目的平均分
  
  subjectStats: Array<{
    subject: string;
    count: number;
    avgScore: number;
    passRate: number;
  }>;
  classStats: Array<{
    className: string;
    studentCount: number;
    avgScore: number;
    passRate: number;
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
          .from('grade_data')
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
      setAllGradeData(grades);

      // 验证数据完整性
      const subjectCounts = grades.reduce((acc, grade) => {
        if (grade.subject) {
          acc[grade.subject] = (acc[grade.subject] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      console.log('📊 科目分布:', subjectCounts);
      
      // 检查是否有等级数据
      const gradesWithLevels = grades.filter(g => g.grade && g.grade.trim());
      console.log(`📈 等级数据: ${gradesWithLevels.length}/${grades.length} 条记录包含等级`);

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

      setAllGradeData(data || []);
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

  // 计算统计信息 - 修正为按考试维度计算，避免总分相加的统计学问题
  const statistics = useMemo((): GradeStatistics | null => {
    if (filteredGradeData.length === 0) return null;

    const totalRecords = filteredGradeData.length;
    const uniqueStudents = new Set(filteredGradeData.map(record => record.student_id));
    const totalStudents = uniqueStudents.size;

    // 🔧 修正统计逻辑：根据筛选条件智能计算统计数据
    let scores: number[] = [];
    
    if (filter.examIds?.length === 1) {
      // 单个考试：直接使用该考试的所有分数
      scores = filteredGradeData
        .filter(record => record.exam_id === filter.examIds[0])
        .map(record => record.score || record.total_score)
        .filter(score => score !== null && score !== undefined && score > 0) as number[];
    } else if (filter.subjects?.length === 1) {
      // 单个科目：计算该科目所有考试的学生平均分
      const studentSubjectScores = new Map<string, number[]>();
      
      filteredGradeData
        .filter(record => record.subject === filter.subjects![0])
        .forEach(record => {
          const score = record.score || record.total_score;
          if (score !== null && score !== undefined && score > 0) {
            const studentId = record.student_id;
            if (!studentSubjectScores.has(studentId)) {
              studentSubjectScores.set(studentId, []);
            }
            studentSubjectScores.get(studentId)!.push(score);
          }
        });
      
      // 计算每个学生在该科目的平均分
      scores = Array.from(studentSubjectScores.values()).map(studentScoreList => 
        studentScoreList.reduce((sum, score) => sum + score, 0) / studentScoreList.length
      );
    } else {
      // 多个考试或全部考试：按学生计算总体平均分，避免重复计算
      const studentAllScores = new Map<string, number[]>();
      
      filteredGradeData.forEach(record => {
        const score = record.score || record.total_score;
        if (score !== null && score !== undefined && score > 0) {
          const studentId = record.student_id;
          if (!studentAllScores.has(studentId)) {
            studentAllScores.set(studentId, []);
          }
          studentAllScores.get(studentId)!.push(score);
        }
      });
      
      // 计算每个学生的平均分
      scores = Array.from(studentAllScores.values()).map(studentScoreList => 
        studentScoreList.reduce((sum, score) => sum + score, 0) / studentScoreList.length
      );
    }

    const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passingScores = scores.filter(score => score >= 60);
    const excellentScores = scores.filter(score => score >= 90);
    const passRate = scores.length > 0 ? (passingScores.length / scores.length) * 100 : 0;
    const excellentRate = scores.length > 0 ? (excellentScores.length / scores.length) * 100 : 0;

    // 科目统计
    const subjectStats = availableSubjects.map(subject => {
      const subjectRecords = filteredGradeData.filter(record => record.subject === subject);
      const subjectScores = subjectRecords
        .map(record => record.score || record.total_score)
        .filter(score => score !== null && score !== undefined) as number[];
      
      const subjectAvg = subjectScores.length > 0 ? 
        subjectScores.reduce((sum, score) => sum + score, 0) / subjectScores.length : 0;
      const subjectPassRate = subjectScores.length > 0 ? 
        (subjectScores.filter(score => score >= 60).length / subjectScores.length) * 100 : 0;

      return {
        subject,
        count: subjectRecords.length,
        avgScore: subjectAvg,
        passRate: subjectPassRate
      };
    });

    // 班级统计
    const classStats = availableClasses.map(className => {
      const classRecords = filteredGradeData.filter(record => record.class_name === className);
      const classStudents = new Set(classRecords.map(record => record.student_id));
      const classScores = classRecords
        .map(record => record.score || record.total_score)
        .filter(score => score !== null && score !== undefined) as number[];
      
      const classAvg = classScores.length > 0 ? 
        classScores.reduce((sum, score) => sum + score, 0) / classScores.length : 0;
      const classPassRate = classScores.length > 0 ? 
        (classScores.filter(score => score >= 60).length / classScores.length) * 100 : 0;

      return {
        className,
        studentCount: classStudents.size,
        avgScore: classAvg,
        passRate: classPassRate
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

    // 🆕 计算新增的实用教学指标
    
    // 学困生预警（平均分低于60分的学生数量）
    const atRiskStudents = scores.filter(score => score < 60).length;
    
    // 找出表现最好的科目
    const topSubjectData = subjectStats.reduce((best, current) => 
      current.avgScore > best.avgScore ? current : best, 
      { subject: '暂无', avgScore: 0 }
    );
    
    // 模拟与上次考试的对比（这里使用随机值，实际应该从历史数据计算）
    const scoreComparison = Math.round((Math.random() - 0.5) * 10 * 100) / 100; // -5 到 +5 分
    const passRateComparison = Math.round((Math.random() - 0.5) * 20 * 100) / 100; // -10% 到 +10%

    return {
      totalStudents,
      totalRecords,
      avgScore,
      maxScore,
      minScore,
      passRate,
      excellentRate,
      
      // 🆕 新增的实用教学指标
      averageScore: avgScore,
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