/**
 * 🎯 多考试数据对比和趋势分析服务 (ExamComparisonService)
 * 
 * 核心功能：
 * 1. 多考试成绩对比分析
 * 2. 学生个人趋势分析
 * 3. 班级整体对比分析
 * 4. 科目维度趋势分析
 * 5. 排名变化追踪
 * 6. 预警趋势识别
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 考试基本信息接口
export interface ExamInfo {
  id: string;
  exam_id?: string;
  exam_title: string;
  exam_date: string;
  exam_type?: string;
  total_participants?: number;
}

// 成绩记录接口
export interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  exam_id?: string;
  exam_title: string;
  exam_date: string;
  total_score?: number;
  total_rank_in_class?: number;
  total_rank_in_grade?: number;
  chinese_score?: number;
  math_score?: number;
  english_score?: number;
  physics_score?: number;
  chemistry_score?: number;
  biology_score?: number;
  politics_score?: number;
  history_score?: number;
  geography_score?: number;
  [key: string]: any;
}

// 考试对比结果接口
export interface ExamComparisonResult {
  examInfo: ExamInfo;
  classStats: {
    className: string;
    participantCount: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
    passRate: number; // 及格率
    excellentRate: number; // 优秀率 (>=85分)
    standardDeviation: number; // 标准差
  }[];
  subjectStats: {
    subject: string;
    averageScore: number;
    maxScore: number;
    minScore: number;
    passRate: number;
    improvement?: number; // 相比上次考试的变化
  }[];
  topPerformers: {
    studentId: string;
    studentName: string;
    className: string;
    totalScore: number;
    rank: number;
  }[];
  summary: {
    totalParticipants: number;
    overallAverage: number;
    improvementTrend: 'improving' | 'declining' | 'stable';
    keyInsights: string[];
  };
}

// 学生趋势分析结果
export interface StudentTrendResult {
  studentInfo: {
    studentId: string;
    studentName: string;
    className: string;
  };
  examHistory: Array<{
    examId: string;
    examTitle: string;
    examDate: string;
    totalScore: number;
    classRank: number;
    gradeRank?: number;
    subjectScores: Record<string, number>;
  }>;
  trendAnalysis: {
    overallTrend: 'improving' | 'declining' | 'stable';
    trendSlope: number; // 线性回归斜率
    correlation: number; // 相关系数
    volatility: number; // 波动性
    bestExam: { examTitle: string; score: number; };
    worstExam: { examTitle: string; score: number; };
  };
  subjectTrends: Record<string, {
    trend: 'improving' | 'declining' | 'stable';
    slope: number;
    averageScore: number;
    latestScore: number;
    improvement: number;
  }>;
  predictions: {
    nextExamPrediction?: number;
    confidenceInterval: [number, number];
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
}

// 班级对比分析结果
export interface ClassComparisonResult {
  comparisonPeriod: {
    startDate: string;
    endDate: string;
    examCount: number;
  };
  classPerformance: Array<{
    className: string;
    studentCount: number;
    averageScore: number;
    trend: 'improving' | 'declining' | 'stable';
    trendSlope: number;
    consistency: number; // 稳定性指标
    improvement: number;
    rank: number;
    percentile: number;
  }>;
  subjectComparison: Record<string, Array<{
    className: string;
    averageScore: number;
    improvement: number;
    rank: number;
  }>>;
  insights: {
    topPerformingClass: string;
    mostImprovedClass: string;
    needsAttentionClasses: string[];
    keyFindings: string[];
  };
}

export class ExamComparisonService {
  /**
   * 获取可用考试列表
   */
  async getAvailableExams(): Promise<ExamInfo[]> {
    try {
      console.log('📋 [ExamComparison] 获取可用考试列表...');
      
      // 从 grade_data_new 表中获取所有不同的考试
      const { data, error } = await supabase
        .from('grade_data_new')
        .select('exam_id, exam_title, exam_date, exam_type')
        .order('exam_date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('⚠️ [ExamComparison] 未找到考试数据');
        return [];
      }

      // 去重并组织数据
      const examMap = new Map<string, ExamInfo>();
      data.forEach(record => {
        const key = record.exam_title || record.exam_id || 'unknown';
        if (!examMap.has(key)) {
          examMap.set(key, {
            id: record.exam_id || key,
            exam_id: record.exam_id,
            exam_title: record.exam_title || '未知考试',
            exam_date: record.exam_date || new Date().toISOString().split('T')[0],
            exam_type: record.exam_type || '期中考试'
          });
        }
      });

      const exams = Array.from(examMap.values());
      console.log(`✅ [ExamComparison] 找到 ${exams.length} 个考试`);
      
      return exams;
    } catch (error) {
      console.error('❌ [ExamComparison] 获取考试列表失败:', error);
      toast.error('获取考试列表失败');
      return [];
    }
  }

  /**
   * 多考试对比分析
   */
  async compareExams(examIds: string[]): Promise<ExamComparisonResult[]> {
    try {
      console.log('📊 [ExamComparison] 开始多考试对比分析:', examIds);

      const results: ExamComparisonResult[] = [];

      for (const examId of examIds) {
        const result = await this.analyzeExam(examId);
        if (result) {
          results.push(result);
        }
      }

      console.log(`✅ [ExamComparison] 完成 ${results.length} 个考试的对比分析`);
      return results;
    } catch (error) {
      console.error('❌ [ExamComparison] 多考试对比失败:', error);
      toast.error('多考试对比分析失败');
      return [];
    }
  }

  /**
   * 分析单个考试 - 适配 grade_data_new 长表格式
   */
  private async analyzeExam(examId: string): Promise<ExamComparisonResult | null> {
    try {
      // 获取考试数据 - grade_data_new 是长表格式，每行一个学科成绩
      const { data: gradeData, error } = await supabase
        .from('grade_data_new')
        .select('*')
        .or(`exam_id.eq.${examId},exam_title.eq.${examId}`)
        .order('score', { ascending: false });

      if (error) throw error;
      if (!gradeData || gradeData.length === 0) return null;

      // 获取考试基本信息
      const examInfo: ExamInfo = {
        id: examId,
        exam_id: gradeData[0].exam_id,
        exam_title: gradeData[0].exam_title || '未知考试',
        exam_date: gradeData[0].exam_date || new Date().toISOString().split('T')[0],
        exam_type: gradeData[0].exam_type || '期中考试',
        total_participants: new Set(gradeData.map(r => r.student_id)).size // 统计参与学生数
      };

      // 构建学生数据映射 - 将长表转换为学生维度的数据
      const studentDataMap = new Map<string, any>();
      gradeData.forEach(record => {
        const studentKey = record.student_id;
        if (!studentDataMap.has(studentKey)) {
          studentDataMap.set(studentKey, {
            student_id: record.student_id,
            name: record.name,
            class_name: record.class_name,
            subjects: {},
            totalScore: 0,
            subjectCount: 0
          });
        }
        
        const studentData = studentDataMap.get(studentKey)!;
        if (record.subject && record.score) {
          studentData.subjects[record.subject] = record.score;
          studentData.totalScore += record.score;
          studentData.subjectCount++;
        }
      });

      // 计算班级统计数据
      const classStatsMap = new Map<string, any>();
      studentDataMap.forEach(student => {
        const className = student.class_name || '未知班级';
        if (!classStatsMap.has(className)) {
          classStatsMap.set(className, {
            className,
            scores: [],
            participantCount: 0
          });
        }
        
        if (student.totalScore > 0) {
          classStatsMap.get(className)!.scores.push(student.totalScore);
          classStatsMap.get(className)!.participantCount++;
        }
      });

      const classStats = Array.from(classStatsMap.values()).map(classData => {
        const scores = classData.scores;
        if (scores.length === 0) return null;

        const sum = scores.reduce((a: number, b: number) => a + b, 0);
        const average = sum / scores.length;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const passCount = scores.filter((score: number) => score >= 60).length;
        const excellentCount = scores.filter((score: number) => score >= 85).length;
        
        // 计算标准差
        const variance = scores.reduce((acc: number, score: number) => acc + Math.pow(score - average, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);

        return {
          className: classData.className,
          participantCount: classData.participantCount,
          averageScore: Math.round(average * 10) / 10,
          maxScore: max,
          minScore: min,
          passRate: Math.round((passCount / scores.length) * 100 * 10) / 10,
          excellentRate: Math.round((excellentCount / scores.length) * 100 * 10) / 10,
          standardDeviation: Math.round(standardDeviation * 10) / 10
        };
      }).filter(Boolean) as any[];

      // 科目统计 - 从长表中按科目聚合
      const subjectStatsMap = new Map<string, number[]>();
      gradeData.forEach(record => {
        if (record.subject && record.score) {
          if (!subjectStatsMap.has(record.subject)) {
            subjectStatsMap.set(record.subject, []);
          }
          subjectStatsMap.get(record.subject)!.push(record.score);
        }
      });

      const subjectStats = Array.from(subjectStatsMap.entries()).map(([subject, scores]) => {
        if (scores.length === 0) return null;

        const sum = scores.reduce((a, b) => a + b, 0);
        const average = sum / scores.length;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const passCount = scores.filter(score => score >= 60).length;

        return {
          subject: this.getSubjectDisplayName(subject),
          averageScore: Math.round(average * 10) / 10,
          maxScore: max,
          minScore: min,
          passRate: Math.round((passCount / scores.length) * 100 * 10) / 10
        };
      }).filter(Boolean) as any[];

      // 前10名学生 - 基于总分排序
      const topPerformers = Array.from(studentDataMap.values())
        .filter(student => student.totalScore > 0)
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 10)
        .map((student, index) => ({
          studentId: student.student_id,
          studentName: student.name || '未知学生',
          className: student.class_name || '未知班级',
          totalScore: student.totalScore,
          rank: index + 1
        }));

      // 生成总结
      const totalParticipants = gradeData.length;
      const overallAverage = gradeData.reduce((sum, record) => sum + (record.total_score || 0), 0) / totalParticipants;
      
      const summary = {
        totalParticipants,
        overallAverage: Math.round(overallAverage * 10) / 10,
        improvementTrend: 'stable' as 'improving' | 'declining' | 'stable', // 需要对比前一次考试计算
        keyInsights: [
          `共有 ${totalParticipants} 名学生参加考试`,
          `全体平均分为 ${Math.round(overallAverage * 10) / 10} 分`,
          `最高分为 ${topPerformers[0]?.totalScore || 0} 分`,
          `共有 ${classStats.length} 个班级参与`
        ]
      };

      return {
        examInfo,
        classStats,
        subjectStats,
        topPerformers,
        summary
      };
    } catch (error) {
      console.error(`❌ [ExamComparison] 分析考试 ${examId} 失败:`, error);
      return null;
    }
  }

  /**
   * 学生个人趋势分析 - 适配 grade_data_new 长表格式
   */
  async analyzeStudentTrend(studentId: string, examLimit = 10): Promise<StudentTrendResult | null> {
    try {
      console.log(`📈 [ExamComparison] 开始学生趋势分析: ${studentId}`);

      // 获取学生的历史考试数据 - grade_data_new 是长表格式
      const { data: gradeData, error } = await supabase
        .from('grade_data_new')
        .select('*')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      if (!gradeData || gradeData.length === 0) {
        console.log('⚠️ [ExamComparison] 未找到学生考试数据');
        return null;
      }

      // 按考试分组数据 - 长表转换为考试维度
      const examDataMap = new Map<string, any>();
      gradeData.forEach(record => {
        const examKey = record.exam_id || record.exam_title || '未知考试';
        
        if (!examDataMap.has(examKey)) {
          examDataMap.set(examKey, {
            examId: record.exam_id,
            examTitle: record.exam_title || '未知考试',
            examDate: record.exam_date || '',
            subjects: {},
            totalScore: 0,
            subjectCount: 0,
            classRank: record.total_rank_in_class || 0,
            gradeRank: record.total_rank_in_grade || 0,
            studentInfo: {
              student_id: record.student_id,
              name: record.name,
              class_name: record.class_name
            }
          });
        }
        
        const examData = examDataMap.get(examKey)!;
        if (record.subject && record.score) {
          examData.subjects[record.subject] = record.score;
          examData.totalScore += record.score;
          examData.subjectCount++;
        }
      });

      // 获取学生基本信息
      const firstExam = Array.from(examDataMap.values())[0];
      if (!firstExam) return null;

      const studentInfo = {
        studentId: firstExam.studentInfo.student_id,
        studentName: firstExam.studentInfo.name || '未知学生',
        className: firstExam.studentInfo.class_name || '未知班级'
      };

      // 按日期排序并限制数量
      const sortedExams = Array.from(examDataMap.values())
        .sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime())
        .slice(0, examLimit);

      // 整理考试历史
      const examHistory = sortedExams.map(examData => ({
        examId: examData.examId,
        examTitle: examData.examTitle,
        examDate: examData.examDate,
        totalScore: examData.totalScore,
        classRank: examData.classRank,
        gradeRank: examData.gradeRank,
        subjectScores: {
          chinese: examData.subjects['语文'] || 0,
          math: examData.subjects['数学'] || 0,
          english: examData.subjects['英语'] || 0,
          physics: examData.subjects['物理'] || 0,
          chemistry: examData.subjects['化学'] || 0,
          biology: examData.subjects['生物'] || 0,
          politics: examData.subjects['政治'] || 0,
          history: examData.subjects['历史'] || 0,
          geography: examData.subjects['地理'] || 0
        }
      }));

      // 趋势分析
      const scores = examHistory.map(exam => exam.totalScore);
      const trendAnalysis = this.calculateTrendAnalysis(scores);
      
      const bestExam = examHistory.reduce((best, current) => 
        current.totalScore > best.totalScore ? current : best
      );
      const worstExam = examHistory.reduce((worst, current) => 
        current.totalScore < worst.totalScore ? current : worst
      );

      // 科目趋势分析
      const subjects = ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'];
      const subjectTrends: Record<string, any> = {};
      
      subjects.forEach(subject => {
        const subjectScores = examHistory.map(exam => exam.subjectScores[subject]).filter(score => score > 0);
        if (subjectScores.length >= 2) {
          const subjectTrendAnalysis = this.calculateTrendAnalysis(subjectScores);
          subjectTrends[subject] = {
            trend: this.determineTrend(subjectTrendAnalysis.slope, subjectTrendAnalysis.correlation),
            slope: subjectTrendAnalysis.slope,
            averageScore: subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length,
            latestScore: subjectScores[0],
            improvement: subjectScores[0] - subjectScores[subjectScores.length - 1]
          };
        }
      });

      // 预测和建议
      const predictions = this.generatePredictions(examHistory, trendAnalysis);

      return {
        studentInfo,
        examHistory,
        trendAnalysis: {
          overallTrend: this.determineTrend(trendAnalysis.slope, trendAnalysis.correlation),
          trendSlope: trendAnalysis.slope,
          correlation: trendAnalysis.correlation,
          volatility: trendAnalysis.volatility,
          bestExam: { examTitle: bestExam.examTitle, score: bestExam.totalScore },
          worstExam: { examTitle: worstExam.examTitle, score: worstExam.totalScore }
        },
        subjectTrends,
        predictions
      };
    } catch (error) {
      console.error('❌ [ExamComparison] 学生趋势分析失败:', error);
      return null;
    }
  }

  /**
   * 班级对比分析 - 适配 grade_data_new 长表格式
   */
  async compareClasses(startDate?: string, endDate?: string): Promise<ClassComparisonResult | null> {
    try {
      console.log('🏫 [ExamComparison] 开始班级对比分析');

      // 构建查询 - 使用 grade_data_new 表
      let query = supabase.from('grade_data_new').select('*');
      
      if (startDate) {
        query = query.gte('exam_date', startDate);
      }
      if (endDate) {
        query = query.lte('exam_date', endDate);
      }

      const { data: gradeData, error } = await query.order('exam_date', { ascending: false });

      if (error) throw error;
      if (!gradeData || gradeData.length === 0) return null;

      // 数据聚合: 从长表转换为班级-考试-学生维度
      const classStudentExamMap = new Map<string, Map<string, Map<string, {
        totalScore: number;
        subjectCount: number;
        subjects: Record<string, number>;
        examTitle: string;
        examDate: string;
      }>>>();
      const examDates = new Set<string>();

      // 第一步：聚合数据到班级-学生-考试维度
      gradeData.forEach(record => {
        const className = record.class_name || '未知班级';
        const studentKey = record.student_id;
        const examKey = record.exam_id || record.exam_title || '未知考试';
        
        if (record.exam_date) {
          examDates.add(record.exam_date);
        }

        // 初始化班级
        if (!classStudentExamMap.has(className)) {
          classStudentExamMap.set(className, new Map());
        }
        const classMap = classStudentExamMap.get(className)!;

        // 初始化学生
        if (!classMap.has(studentKey)) {
          classMap.set(studentKey, new Map());
        }
        const studentMap = classMap.get(studentKey)!;

        // 初始化考试
        if (!studentMap.has(examKey)) {
          studentMap.set(examKey, {
            totalScore: 0,
            subjectCount: 0,
            subjects: {},
            examTitle: record.exam_title || '未知考试',
            examDate: record.exam_date || ''
          });
        }
        const examData = studentMap.get(examKey)!;

        // 累积学生在该考试中的分数
        if (record.subject && record.score) {
          examData.subjects[record.subject] = record.score;
          examData.totalScore += record.score;
          examData.subjectCount++;
        }
      });

      // 第二步：计算班级表现数据
      const classPerformance = Array.from(classStudentExamMap.entries()).map(([className, studentMap]) => {
        const allStudentScores: number[] = [];
        const examAverages: number[] = [];
        const examStudentCounts: number[] = [];

        // 按考试统计该班级的平均分
        const examScoreMap = new Map<string, number[]>();
        
        studentMap.forEach(examMap => {
          examMap.forEach((examData, examKey) => {
            if (examData.totalScore > 0) {
              if (!examScoreMap.has(examKey)) {
                examScoreMap.set(examKey, []);
              }
              examScoreMap.get(examKey)!.push(examData.totalScore);
              allStudentScores.push(examData.totalScore);
            }
          });
        });

        // 计算每次考试的班级平均分
        examScoreMap.forEach(scores => {
          if (scores.length > 0) {
            const average = scores.reduce((a, b) => a + b, 0) / scores.length;
            examAverages.push(average);
            examStudentCounts.push(scores.length);
          }
        });

        if (examAverages.length === 0) return null;

        const averageScore = allStudentScores.reduce((a, b) => a + b, 0) / allStudentScores.length;
        const trendAnalysis = examAverages.length >= 2 ? this.calculateTrendAnalysis(examAverages) : { slope: 0, correlation: 0, volatility: 0 };
        
        return {
          className,
          studentCount: Math.round(examStudentCounts.reduce((a, b) => a + b, 0) / examStudentCounts.length), // 平均参考人数
          averageScore: Math.round(averageScore * 10) / 10,
          trend: this.determineTrend(trendAnalysis.slope, trendAnalysis.correlation),
          trendSlope: trendAnalysis.slope,
          consistency: Math.max(0, 100 - trendAnalysis.volatility), // 稳定性指标
          improvement: examAverages.length >= 2 ? examAverages[0] - examAverages[examAverages.length - 1] : 0,
          rank: 0, // 将在后面计算
          percentile: 0 // 将在后面计算
        };
      }).filter(Boolean) as any[];

      // 计算排名和百分位
      classPerformance.sort((a, b) => b.averageScore - a.averageScore);
      classPerformance.forEach((classData, index) => {
        classData.rank = index + 1;
        classData.percentile = Math.round(((classPerformance.length - index) / classPerformance.length) * 100);
      });

      // 第三步：科目对比分析 - 基于长表中的subject字段
      const subjectScoreMap = new Map<string, Map<string, number[]>>();
      
      // 按科目和班级分组分数
      gradeData.forEach(record => {
        if (record.subject && record.score && record.class_name) {
          const subject = this.getSubjectDisplayName(record.subject);
          const className = record.class_name;
          
          if (!subjectScoreMap.has(subject)) {
            subjectScoreMap.set(subject, new Map());
          }
          const subjectMap = subjectScoreMap.get(subject)!;
          
          if (!subjectMap.has(className)) {
            subjectMap.set(className, []);
          }
          subjectMap.get(className)!.push(record.score);
        }
      });

      const subjectComparison: Record<string, any[]> = {};
      
      subjectScoreMap.forEach((classScoreMap, subject) => {
        const classSubjectStats = Array.from(classScoreMap.entries()).map(([className, scores]) => {
          if (scores.length === 0) return null;

          const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          return {
            className,
            averageScore: Math.round(averageScore * 10) / 10,
            improvement: 0, // TODO: 可以通过时间序列计算相对于前期的提升
            rank: 0
          };
        }).filter(Boolean) as any[];

        // 计算科目排名
        classSubjectStats.sort((a, b) => b.averageScore - a.averageScore);
        classSubjectStats.forEach((classData, index) => {
          classData.rank = index + 1;
        });

        subjectComparison[subject] = classSubjectStats;
      });

      // 生成洞察
      const insights = {
        topPerformingClass: classPerformance[0]?.className || '无',
        mostImprovedClass: classPerformance.sort((a, b) => b.improvement - a.improvement)[0]?.className || '无',
        needsAttentionClasses: classPerformance.filter(c => c.trend === 'declining').map(c => c.className),
        keyFindings: [
          `共分析了 ${classPerformance.length} 个班级的表现`,
          `表现最好的班级是 ${classPerformance[0]?.className}，平均分 ${classPerformance[0]?.averageScore} 分`,
          `有 ${classPerformance.filter(c => c.trend === 'improving').length} 个班级呈上升趋势`,
          `分析了 ${subjectScoreMap.size} 个科目的班级表现对比`
        ]
      };

      const sortedDates = Array.from(examDates).sort();
      const comparisonPeriod = {
        startDate: sortedDates[0] || '',
        endDate: sortedDates[sortedDates.length - 1] || '',
        examCount: new Set(gradeData.map(r => r.exam_title || r.exam_id)).size
      };

      return {
        comparisonPeriod,
        classPerformance,
        subjectComparison,
        insights
      };
    } catch (error) {
      console.error('❌ [ExamComparison] 班级对比分析失败:', error);
      return null;
    }
  }

  /**
   * 计算线性回归和趋势分析
   */
  private calculateTrendAnalysis(scores: number[]): { slope: number; correlation: number; volatility: number } {
    if (scores.length < 2) return { slope: 0, correlation: 0, volatility: 0 };

    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);
    const y = scores;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    const meanY = sumY / n;
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    // 计算波动性（标准差）
    const variance = y.reduce((sum, score) => sum + Math.pow(score - meanY, 2), 0) / n;
    const volatility = Math.sqrt(variance);

    return { slope, correlation, volatility };
  }

  /**
   * 判断趋势方向
   */
  private determineTrend(slope: number, correlation: number): 'improving' | 'declining' | 'stable' {
    if (slope > 1 && correlation > 0.3) return 'improving';
    if (slope < -1 && correlation < -0.3) return 'declining';
    return 'stable';
  }

  /**
   * 生成预测和建议
   */
  private generatePredictions(examHistory: any[], trendAnalysis: any): any {
    const predictions: any = {
      confidenceInterval: [0, 100],
      riskLevel: 'low' as 'low' | 'medium' | 'high',
      recommendations: []
    };

    // 基于线性回归预测下次考试分数
    if (examHistory.length >= 3) {
      const lastScore = examHistory[0].totalScore;
      const predictedChange = trendAnalysis.slope;
      predictions.nextExamPrediction = Math.max(0, Math.min(100, lastScore + predictedChange));
      
      const uncertainty = trendAnalysis.volatility;
      predictions.confidenceInterval = [
        Math.max(0, predictions.nextExamPrediction - uncertainty),
        Math.min(100, predictions.nextExamPrediction + uncertainty)
      ];
    }

    // 风险评估
    if (trendAnalysis.slope < -2 && trendAnalysis.correlation < -0.4) {
      predictions.riskLevel = 'high';
      predictions.recommendations.push('成绩呈明显下降趋势，需要重点关注');
    } else if (trendAnalysis.volatility > 10) {
      predictions.riskLevel = 'medium';
      predictions.recommendations.push('成绩波动较大，需要加强稳定性');
    } else {
      predictions.riskLevel = 'low';
      predictions.recommendations.push('保持当前学习状态');
    }

    // 根据趋势生成建议
    if (trendAnalysis.slope > 0) {
      predictions.recommendations.push('进步趋势良好，继续保持');
    } else if (trendAnalysis.slope < 0) {
      predictions.recommendations.push('需要分析下降原因，及时调整学习策略');
    }

    return predictions;
  }

  /**
   * 获取科目显示名称
   */
  private getSubjectDisplayName(subject: string): string {
    const subjectMap: Record<string, string> = {
      chinese: '语文',
      math: '数学',
      english: '英语',
      physics: '物理',
      chemistry: '化学',
      biology: '生物',
      politics: '政治',
      history: '历史',
      geography: '地理'
    };
    return subjectMap[subject] || subject;
  }
}

// 导出单例实例
export const examComparisonService = new ExamComparisonService();