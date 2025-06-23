import { supabase } from '../integrations/supabase/client';
import { warningAnalysisCache } from '../utils/performanceCache';
import { generateAIAnalysis } from './aiService';

// AI分析基础数据接口
export interface BasicAIAnalysis {
  analysisId: string;
  dataType: 'warning_overview' | 'exam_analysis' | 'student_risk' | 'trend_analysis';
  scope: 'global' | 'class' | 'student' | 'exam';
  
  // 核心分析结果
  riskSummary: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number; // 0-100
    primaryConcerns: string[];
    improvementAreas: string[];
  };
  
  // 关键模式识别
  patterns: {
    trendDirection: 'improving' | 'stable' | 'declining';
    anomalies: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      affectedCount: number;
    }>;
    correlations: Array<{
      factor1: string;
      factor2: string;
      strength: number; // -1 to 1
      description: string;
    }>;
  };
  
  // 智能建议
  recommendations: {
    immediate: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      expectedImpact: string;
      timeframe: string;
    }>;
    strategic: Array<{
      action: string;
      rationale: string;
      expectedOutcome: string;
      resources: string[];
    }>;
  };
  
  // 元数据
  metadata: {
    generatedAt: string;
    dataVersion: string;
    confidence: number; // 0-1
    processingTime: number; // ms
    dataPoints: number;
  };
}

// AI分析请求参数
export interface AIAnalysisRequest {
  dataType: BasicAIAnalysis['dataType'];
  scope: BasicAIAnalysis['scope'];
  targetId?: string; // 班级ID、学生ID或考试ID
  timeRange?: string; // '7d', '30d', '90d', '180d', '1y'
  includeHistorical?: boolean;
  analysisDepth?: 'basic' | 'detailed';
}

// 数据聚合器 - 收集分析所需的数据
class AnalysisDataAggregator {
  // 获取预警概览数据
  async getWarningOverviewData(scope: string, targetId?: string): Promise<any> {
    // 先检查表是否存在和字段是否存在
    const { data: tableCheck } = await supabase
      .from('warning_records')
      .select('id')
      .limit(1);

    // 如果表不存在或查询失败，返回空数据
    if (!tableCheck && tableCheck !== null) {
      console.warn('warning_records表不存在或无法访问');
      return [];
    }

    let query = supabase
      .from('warning_records')
      .select(`
        id,
        status,
        created_at,
        resolved_at,
        student_id,
        warning_rules!inner(name, description, severity),
        students!inner(name, class_id, classes!inner(grade))
      `)
      .in('status', ['active', 'resolved', 'dismissed']); // 包含所有状态来显示更完整的数据

    // 根据范围过滤
    if (scope === 'class' && targetId) {
      query = query.eq('students.class_id', targetId);
    } else if (scope === 'student' && targetId) {
      query = query.eq('student_id', targetId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  // 获取考试分析数据
  async getExamAnalysisData(examId: string): Promise<any> {
    // 先获取考试信息
    const examData = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (examData.error) throw examData.error;

    // 使用考试标题获取成绩数据
    const gradeData = await supabase
      .from('grade_data')
      .select(`
        total_score,
        student_id,
        name,
        class_name
      `)
      .eq('exam_title', examData.data?.title || '');

    if (gradeData.error) {
      console.warn('获取成绩数据失败:', gradeData.error);
      return {
        exam: examData.data,
        grades: []
      };
    }

    return {
      exam: examData.data,
      grades: gradeData.data || []
    };
  }

  // 获取学生风险数据
  async getStudentRiskData(studentId: string): Promise<any> {
    const [warningData, gradeData, attendanceData] = await Promise.all([
      supabase
        .from('warning_records')
        .select(`
          id,
          status,
          severity,
          created_at,
          warning_rules!inner(name, description)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50),

      supabase
        .from('grade_data')
        .select(`
          total_score,
          exam_title,
          created_at
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(20),

      // 如果有考勤数据表的话
      Promise.resolve(null)
    ]);

    return {
      warnings: warningData.data || [],
      grades: gradeData.data || [],
      attendance: attendanceData || []
    };
  }

  // 获取趋势分析数据
  async getTrendAnalysisData(scope: string, timeRange: string): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    
    // 根据时间范围计算开始日期
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '180d':
        startDate.setDate(endDate.getDate() - 180);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const { data, error } = await supabase
      .from('warning_records')
      .select(`
        id,
        status,
        severity,
        created_at,
        resolved_at,
        warning_rules!inner(name)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

// AI分析处理器 - 核心分析逻辑
class AIAnalysisProcessor {
  private dataAggregator = new AnalysisDataAggregator();

  // 处理预警概览分析
  async processWarningOverview(scope: string, targetId?: string): Promise<BasicAIAnalysis> {
    const startTime = performance.now();
    
    try {
      const warningData = await this.dataAggregator.getWarningOverviewData(scope, targetId);
      
      // 计算风险评分
      const riskScore = this.calculateRiskScore(warningData);
      const overallRisk = this.determineRiskLevel(riskScore);
      
      // 识别主要问题和改进领域
      const primaryConcerns = this.identifyPrimaryConcerns(warningData);
      const improvementAreas = this.identifyImprovementAreas(warningData);
      
      // 模式识别
      const patterns = this.identifyPatterns(warningData);
      
      // 生成建议
      const recommendations = await this.generateRecommendations(warningData, riskScore);
      
      const processingTime = performance.now() - startTime;
      
      return {
        analysisId: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dataType: 'warning_overview',
        scope: scope as any,
        riskSummary: {
          overallRisk,
          riskScore,
          primaryConcerns,
          improvementAreas
        },
        patterns,
        recommendations,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataVersion: '1.0',
          confidence: this.calculateConfidence(warningData.length),
          processingTime: Math.round(processingTime),
          dataPoints: warningData.length
        }
      };
    } catch (error) {
      console.error('[AIAnalysisProcessor] 预警概览分析失败:', error);
      throw error;
    }
  }

  // 处理考试分析
  async processExamAnalysis(examId: string): Promise<BasicAIAnalysis> {
    const startTime = performance.now();
    
    try {
      const { exam, grades } = await this.dataAggregator.getExamAnalysisData(examId);
      
      // 计算考试表现指标
      const scores = grades.map(g => g.total_score).filter(s => s !== null && s !== undefined);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const passRate = scores.length > 0 ? scores.filter(s => s >= 60).length / scores.length : 0;
      
      // 风险评估
      const riskScore = this.calculateExamRiskScore(avgScore, passRate, scores);
      const overallRisk = this.determineRiskLevel(riskScore);
      
      // 识别异常和模式
      const patterns = this.identifyExamPatterns(grades, exam);
      
      // 生成针对性建议
      const recommendations = await this.generateExamRecommendations(exam, grades, riskScore);
      
      const processingTime = performance.now() - startTime;
      
      return {
        analysisId: `ea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dataType: 'exam_analysis',
        scope: 'exam',
        riskSummary: {
          overallRisk,
          riskScore,
          primaryConcerns: this.identifyExamConcerns(grades, avgScore, passRate),
          improvementAreas: this.identifyExamImprovements(grades, exam)
        },
        patterns,
        recommendations,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataVersion: '1.0',
          confidence: this.calculateConfidence(grades.length),
          processingTime: Math.round(processingTime),
          dataPoints: grades.length
        }
      };
    } catch (error) {
      console.error('[AIAnalysisProcessor] 考试分析失败:', error);
      throw error;
    }
  }

  // 计算风险评分 (0-100)
  private calculateRiskScore(warningData: any[]): number {
    const weights = { low: 1, medium: 3, high: 5, critical: 10 };
    let score = 0;
    
    warningData.forEach(warning => {
      const severity = warning.warning_rules?.severity || 'low';
      score += weights[severity as keyof typeof weights] || 1;
    });
    
    // 归一化到0-100
    const maxPossibleScore = warningData.length * 10;
    return Math.min(100, (score / maxPossibleScore) * 100);
  }

  // 确定风险等级
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  // 识别主要关注点
  private identifyPrimaryConcerns(warningData: any[]): string[] {
    const categoryCounts = new Map<string, number>();
    warningData.forEach(w => {
      const category = w.warning_rules?.name;
      if (category) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    });

    if (categoryCounts.size === 0) return ['暂无明显问题'];

    const sortedCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
    
    return sortedCategories.slice(0, 3).map(([category]) => 
      `主要问题集中在 "${this.getCategoryDisplayName(category)}"`
    );
  }

  // 识别改进领域
  private identifyImprovementAreas(warningData: any[]): string[] {
    const categoryCounts = new Map<string, { total: number, highSeverity: number }>();
    
    warningData.forEach(w => {
      const category = w.warning_rules?.name;
      const severity = w.warning_rules?.severity || 'low';
      if (category) {
        if (!categoryCounts.has(category)) {
          categoryCounts.set(category, { total: 0, highSeverity: 0 });
        }
        const counts = categoryCounts.get(category)!;
        counts.total++;
        if (severity === 'high' || severity === 'critical') {
          counts.highSeverity++;
        }
      }
    });

    if (categoryCounts.size === 0) return ['整体情况良好，继续保持'];

    const sortedCategories = [...categoryCounts.entries()].sort((a, b) => {
      // 优先看高风险数量，其次看总数
      if (b[1].highSeverity !== a[1].highSeverity) {
        return b[1].highSeverity - a[1].highSeverity;
      }
      return b[1].total - a[1].total;
    });

    return sortedCategories.slice(0, 3).map(([category, counts]) => 
      `需关注 "${this.getCategoryDisplayName(category)}" 方面 (高风险: ${counts.highSeverity}, 总数: ${counts.total})`
    );
  }

  // 识别模式
  private identifyPatterns(warningData: any[]): BasicAIAnalysis['patterns'] {
    return {
      trendDirection: this.analyzeTrendDirection(warningData),
      anomalies: this.identifyAnomalies(warningData),
      correlations: this.identifyCorrelations(warningData)
    };
  }

  // 生成建议
  private async generateRecommendations(warningData: any[], riskScore: number): Promise<BasicAIAnalysis['recommendations']> {
    const immediate = [];
    const strategic = [];
    
    if (riskScore > 70) {
      immediate.push({
        action: '立即关注高风险学生',
        priority: 'high' as const,
        expectedImpact: '快速降低严重风险',
        timeframe: '1-3天'
      });
    }
    
    if (riskScore > 40) {
      strategic.push({
        action: '制定系统性预警干预计划',
        rationale: '多个领域出现问题，需要综合干预',
        expectedOutcome: '全面改善学生表现',
        resources: ['班主任', '学科老师', '家长配合']
      });
    }
    
    return { immediate, strategic };
  }

  // 计算考试风险评分
  private calculateExamRiskScore(avgScore: number, passRate: number, scores: number[]): number {
    let riskScore = 0;
    
    // 平均分因子 (40% 权重)
    if (avgScore < 50) riskScore += 40;
    else if (avgScore < 70) riskScore += 20;
    else if (avgScore < 80) riskScore += 10;
    
    // 及格率因子 (35% 权重)
    if (passRate < 0.5) riskScore += 35;
    else if (passRate < 0.7) riskScore += 20;
    else if (passRate < 0.8) riskScore += 10;
    
    // 分数分布因子 (25% 权重)
    const std = this.calculateStandardDeviation(scores);
    if (std > 25) riskScore += 25; // 分化严重
    else if (std > 15) riskScore += 15;
    else if (std > 10) riskScore += 5;
    
    return Math.min(100, riskScore);
  }

  // 识别考试模式
  private identifyExamPatterns(grades: any[], exam: any): BasicAIAnalysis['patterns'] {
    const scores = grades.map(g => g.total_score).filter(s => s !== null && s !== undefined);
    
    return {
      trendDirection: 'stable', // 需要历史数据对比
      anomalies: this.identifyScoreAnomalies(scores),
      correlations: this.identifyGradeCorrelations(grades)
    };
  }

  // 生成考试建议
  private async generateExamRecommendations(exam: any, grades: any[], riskScore: number): Promise<BasicAIAnalysis['recommendations']> {
    const immediate = [];
    const strategic = [];
    
    const scores = grades.map(g => g.total_score).filter(s => s !== null && s !== undefined);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passRate = scores.length > 0 ? scores.filter(s => s >= 60).length / scores.length : 0;
    
    if (passRate < 0.6) {
      immediate.push({
        action: '组织补救教学',
        priority: 'high' as const,
        expectedImpact: '提升不及格学生成绩',
        timeframe: '1-2周'
      });
    }
    
    if (avgScore < 70) {
      strategic.push({
        action: '调整教学策略和难度',
        rationale: '整体成绩偏低，需要检视教学方法',
        expectedOutcome: '提升整体教学效果',
        resources: ['教研组', '教学资源', '额外辅导时间']
      });
    }
    
    return { immediate, strategic };
  }

  // 辅助方法
  private getCategoryDisplayName(category: string): string {
    const map = {
      grade: '成绩相关',
      attendance: '出勤问题',
      behavior: '行为表现',
      homework: '作业完成',
      progress: '学习进度',
      composite: '综合表现'
    };
    return map[category] || category;
  }

  private analyzeTrendDirection(warningData: any[]): 'improving' | 'stable' | 'declining' {
    // 简化版本：根据最近的创建时间分布判断
    if (warningData.length === 0) return 'stable';
    
    const now = new Date();
    const recentWarnings = warningData.filter(w => {
      const createdAt = new Date(w.created_at);
      const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });
    
    const recentRatio = recentWarnings.length / warningData.length;
    
    if (recentRatio > 0.6) return 'declining';
    if (recentRatio < 0.3) return 'improving';
    return 'stable';
  }

  private identifyAnomalies(warningData: any[]): BasicAIAnalysis['patterns']['anomalies'] {
    const anomalies = [];
    
    // 检查严重程度异常集中
    const severityCounts = {};
    warningData.forEach(w => {
      const severity = w.warning_rules?.severity || 'low';
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    });
    
    if (severityCounts['high'] > 5) {
      anomalies.push({
        type: 'high_severity_cluster',
        description: '高严重程度预警集中出现',
        severity: 'high' as const,
        affectedCount: severityCounts['high']
      });
    }
    
    return anomalies;
  }

  private identifyCorrelations(warningData: any[]): BasicAIAnalysis['patterns']['correlations'] {
    // 简化版本的相关性分析
    return [];
  }

  private identifyScoreAnomalies(scores: number[]): BasicAIAnalysis['patterns']['anomalies'] {
    const anomalies = [];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const std = this.calculateStandardDeviation(scores);
    
    // 检查极端低分
    const lowScores = scores.filter(s => s < avg - 2 * std);
    if (lowScores.length > scores.length * 0.1) {
      anomalies.push({
        type: 'extreme_low_scores',
        description: '存在异常低分群体',
        severity: 'medium' as const,
        affectedCount: lowScores.length
      });
    }
    
    return anomalies;
  }

  private identifyGradeCorrelations(grades: any[]): BasicAIAnalysis['patterns']['correlations'] {
    // 简化版本
    return [];
  }

  private identifyExamConcerns(grades: any[], avgScore: number, passRate: number): string[] {
    const concerns = [];
    
    if (avgScore < 60) concerns.push('整体成绩偏低');
    if (passRate < 0.6) concerns.push('及格率不达标');
    
    const scores = grades.map(g => g.score).filter(s => s !== null);
    const std = this.calculateStandardDeviation(scores);
    if (std > 20) concerns.push('成绩分化严重');
    
    return concerns;
  }

  private identifyExamImprovements(grades: any[], exam: any): string[] {
    const improvements = [];
    
    const scores = grades.map(g => g.score).filter(s => s !== null);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (avgScore < 70) improvements.push('提升整体教学质量');
    
    const lowScoreCount = scores.filter(s => s < 40).length;
    if (lowScoreCount > 0) improvements.push('加强后进生辅导');
    
    return improvements;
  }

  private calculateStandardDeviation(numbers: number[]): number {
    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateConfidence(dataPoints: number): number {
    // 基于数据点数量计算置信度
    if (dataPoints >= 100) return 0.95;
    if (dataPoints >= 50) return 0.85;
    if (dataPoints >= 20) return 0.75;
    if (dataPoints >= 10) return 0.65;
    return 0.5;
  }
}

// 导出的主要服务类
export class AIAnalysisService {
  private processor = new AIAnalysisProcessor();

  // 获取AI分析结果
  async getAIAnalysis(request: AIAnalysisRequest): Promise<BasicAIAnalysis> {
    const cacheKey = this.generateCacheKey(request);
    
    return warningAnalysisCache.getAIAnalysis(
      async () => {
        console.log(`[AIAnalysisService] 生成AI分析: ${request.dataType}`);
        
        switch (request.dataType) {
          case 'warning_overview':
            return this.processor.processWarningOverview(request.scope, request.targetId);
          
          case 'exam_analysis':
            if (!request.targetId) {
              throw new Error('考试分析需要提供考试ID');
            }
            return this.processor.processExamAnalysis(request.targetId);
          
          case 'student_risk':
            if (!request.targetId) {
              throw new Error('学生风险分析需要提供学生ID');
            }
            // TODO: 实现学生风险分析
            throw new Error('学生风险分析功能正在开发中');
          
          case 'trend_analysis':
            // TODO: 实现趋势分析
            throw new Error('趋势分析功能正在开发中');
          
          default:
            throw new Error(`不支持的分析类型: ${request.dataType}`);
        }
      },
      request.dataType,
      cacheKey
    );
  }

  // 生成缓存键
  private generateCacheKey(request: AIAnalysisRequest): string {
    const parts = [
      request.dataType,
      request.scope,
      request.targetId || 'global',
      request.timeRange || '30d'
    ];
    return btoa(JSON.stringify(parts)).replace(/[^a-zA-Z0-9]/g, '_');
  }

  // 批量预热分析缓存
  async preloadAnalysisCache(): Promise<void> {
    const commonRequests: AIAnalysisRequest[] = [
      { dataType: 'warning_overview', scope: 'global' },
      { dataType: 'warning_overview', scope: 'global', timeRange: '7d' },
      { dataType: 'warning_overview', scope: 'global', timeRange: '30d' }
    ];

    await Promise.allSettled(
      commonRequests.map(request => this.getAIAnalysis(request))
    );
  }
}

// 导出单例实例
export const aiAnalysisService = new AIAnalysisService(); 