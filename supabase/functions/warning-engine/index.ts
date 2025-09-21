/**
 * 预警引擎 Edge Function
 * 服务端预警规则执行和处理
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// 预警规则接口
interface WarningRule {
  id: string;
  name: string;
  conditions: any;
  severity: "low" | "medium" | "high";
  scope: "global" | "exam" | "class" | "student";
  category: "grade" | "attendance" | "behavior" | "progress" | "homework" | "composite";
  is_active: boolean;
}

// 执行结果接口
interface ExecutionResult {
  ruleId: string;
  matchedStudents: string[];
  generatedWarnings: number;
  executionTimeMs: number;
  error?: string;
}

// 预警引擎类
class WarningEngine {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 执行所有活跃的预警规则
   */
  async executeAllRules(trigger?: string): Promise<{
    executionId: string;
    results: ExecutionResult[];
    summary: {
      totalRules: number;
      matchedStudents: number;
      generatedWarnings: number;
      totalExecutionTime: number;
    };
  }> {
    const startTime = Date.now();
    console.log(`[WarningEngine] 开始执行预警规则，触发器: ${trigger || '手动'}`);

    // 1. 创建执行记录
    const executionId = await this.startExecution(trigger);
    if (!executionId) {
      throw new Error("创建执行记录失败");
    }

    try {
      // 2. 获取所有活跃规则
      const rules = await this.getActiveRules();
      console.log(`[WarningEngine] 获取到 ${rules.length} 个活跃规则`);

      // 3. 执行每个规则
      const results: ExecutionResult[] = [];
      let totalMatchedStudents = 0;
      let totalGeneratedWarnings = 0;

      for (const rule of rules) {
        try {
          const result = await this.executeRule(rule, executionId);
          results.push(result);
          totalMatchedStudents += result.matchedStudents.length;
          totalGeneratedWarnings += result.generatedWarnings;
        } catch (error) {
          console.error(`[WarningEngine] 规则 ${rule.id} 执行失败:`, error);
          results.push({
            ruleId: rule.id,
            matchedStudents: [],
            generatedWarnings: 0,
            executionTimeMs: 0,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const totalExecutionTime = Date.now() - startTime;

      // 4. 完成执行记录
      await this.completeExecution(executionId, {
        total_rules: rules.length,
        executed_rules: rules.length,
        matched_students: totalMatchedStudents,
        generated_warnings: totalGeneratedWarnings,
        execution_duration_ms: totalExecutionTime,
        execution_status: 'completed',
        summary: {
          totalRules: rules.length,
          matchedStudents: totalMatchedStudents,
          generatedWarnings: totalGeneratedWarnings,
          totalExecutionTime,
          message: '预警引擎执行完成'
        }
      });

      console.log(`[WarningEngine] 执行完成，共 ${totalGeneratedWarnings} 个新预警`);

      return {
        executionId,
        results,
        summary: {
          totalRules: rules.length,
          matchedStudents: totalMatchedStudents,
          generatedWarnings: totalGeneratedWarnings,
          totalExecutionTime,
        },
      };
    } catch (error) {
      // 标记执行失败
      await this.completeExecution(executionId, {
        execution_status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
        execution_duration_ms: Date.now() - startTime,
        total_rules: 0,
        executed_rules: 0,
        matched_students: 0,
        generated_warnings: 0
      });
      throw error;
    }
  }

  /**
   * 执行单个预警规则
   */
  private async executeRule(rule: WarningRule, executionId: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    console.log(`[WarningEngine] 执行规则: ${rule.name} (${rule.id})`);

    // 记录规则执行开始
    const ruleExecutionId = await this.startRuleExecution(executionId, rule);

    try {
      const matchedStudents: string[] = [];
      let generatedWarnings = 0;

      // 根据规则类型执行不同的逻辑
      switch (rule.conditions.type) {
        case 'consecutive_fails':
          const consecutiveFailsResult = await this.checkConsecutiveFails(rule);
          matchedStudents.push(...consecutiveFailsResult.students);
          generatedWarnings = consecutiveFailsResult.warnings;
          break;

        case 'grade_decline':
          const gradeDeclineResult = await this.checkGradeDecline(rule);
          matchedStudents.push(...gradeDeclineResult.students);
          generatedWarnings = gradeDeclineResult.warnings;
          break;

        case 'exam_fail':
          const examFailResult = await this.checkExamFail(rule);
          matchedStudents.push(...examFailResult.students);
          generatedWarnings = examFailResult.warnings;
          break;

        case 'homework_default':
          const homeworkResult = await this.checkHomeworkDefault(rule);
          matchedStudents.push(...homeworkResult.students);
          generatedWarnings = homeworkResult.warnings;
          break;

        // ML增强预警规则
        case 'ml_risk_prediction':
          const mlRiskResult = await this.mlRiskPrediction(rule);
          matchedStudents.push(...mlRiskResult.students);
          generatedWarnings = mlRiskResult.warnings;
          break;

        case 'ml_anomaly_detection':
          const mlAnomalyResult = await this.mlAnomalyDetection(rule);
          matchedStudents.push(...mlAnomalyResult.students);
          generatedWarnings = mlAnomalyResult.warnings;
          break;

        case 'ml_trend_analysis':
          const mlTrendResult = await this.mlTrendAnalysis(rule);
          matchedStudents.push(...mlTrendResult.students);
          generatedWarnings = mlTrendResult.warnings;
          break;

        default:
          console.warn(`[WarningEngine] 未知规则类型: ${rule.conditions.type}`);
      }

      const executionTime = Date.now() - startTime;

      // 完成规则执行记录
      if (ruleExecutionId) {
        await this.completeRuleExecution(ruleExecutionId, {
          affected_students_count: matchedStudents.length,
          new_warnings_count: generatedWarnings,
          execution_time_ms: executionTime,
          execution_status: 'completed',
        });
      }

      console.log(`[WarningEngine] 规则 ${rule.name} 完成，匹配 ${matchedStudents.length} 学生，生成 ${generatedWarnings} 预警`);

      return {
        ruleId: rule.id,
        matchedStudents,
        generatedWarnings,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      // 标记规则执行失败
      if (ruleExecutionId) {
        await this.completeRuleExecution(ruleExecutionId, {
          execution_status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          execution_time_ms: Date.now() - startTime,
        });
      }
      throw error;
    }
  }

  /**
   * 检查连续不及格预警
   */
  private async checkConsecutiveFails(rule: WarningRule): Promise<{ students: string[]; warnings: number }> {
    const { times, score_threshold, subject } = rule.conditions;
    
    // 查询连续不及格的学生
    const { data: students, error } = await this.supabase.rpc('check_consecutive_fails', {
      p_fail_count: times,
      p_score_threshold: score_threshold || 60,
      p_subject_filter: subject === 'all' ? null : subject,
    });

    if (error) {
      throw new Error(`连续不及格检查失败: ${error.message}`);
    }

    const matchedStudents = students || [];
    let generatedWarnings = 0;

    // 为每个匹配的学生创建预警记录
    for (const student of matchedStudents) {
      const existingWarning = await this.checkExistingWarning(student.student_id, rule.id);
      if (!existingWarning) {
        await this.createWarningRecord(student.student_id, rule.id, {
          type: 'consecutive_fails',
          failCount: student.fail_count,
          subjects: student.subjects,
        });
        generatedWarnings++;
      }
    }

    return {
      students: matchedStudents.map(s => s.student_id),
      warnings: generatedWarnings,
    };
  }

  /**
   * 检查成绩下降预警
   */
  private async checkGradeDecline(rule: WarningRule): Promise<{ students: string[]; warnings: number }> {
    const { decline_threshold, consecutive_count } = rule.conditions;
    
    const { data: students, error } = await this.supabase.rpc('check_grade_decline', {
      p_decline_threshold: decline_threshold,
      p_consecutive_count: consecutive_count,
    });

    if (error) {
      throw new Error(`成绩下降检查失败: ${error.message}`);
    }

    const matchedStudents = students || [];
    let generatedWarnings = 0;

    for (const student of matchedStudents) {
      const existingWarning = await this.checkExistingWarning(student.student_id, rule.id);
      if (!existingWarning) {
        await this.createWarningRecord(student.student_id, rule.id, {
          type: 'grade_decline',
          decline: student.decline_amount,
          periods: student.decline_periods,
        });
        generatedWarnings++;
      }
    }

    return {
      students: matchedStudents.map(s => s.student_id),
      warnings: generatedWarnings,
    };
  }

  /**
   * 检查考试不及格预警
   */
  private async checkExamFail(rule: WarningRule): Promise<{ students: string[]; warnings: number }> {
    const { threshold, subject } = rule.conditions;
    
    const { data: students, error } = await this.supabase.rpc('check_exam_fail', {
      p_score_threshold: threshold,
      p_subject_filter: subject === 'all' ? null : subject,
    });

    if (error) {
      throw new Error(`考试不及格检查失败: ${error.message}`);
    }

    const matchedStudents = students || [];
    let generatedWarnings = 0;

    for (const student of matchedStudents) {
      const existingWarning = await this.checkExistingWarning(student.student_id, rule.id);
      if (!existingWarning) {
        await this.createWarningRecord(student.student_id, rule.id, {
          type: 'exam_fail',
          score: student.score,
          subject: student.subject,
          exam_title: student.exam_title,
        });
        generatedWarnings++;
      }
    }

    return {
      students: matchedStudents.map(s => s.student_id),
      warnings: generatedWarnings,
    };
  }

  /**
   * 检查作业拖欠预警
   */
  private async checkHomeworkDefault(rule: WarningRule): Promise<{ students: string[]; warnings: number }> {
    const { count, include_late } = rule.conditions;
    
    const { data: students, error } = await this.supabase.rpc('check_homework_default', {
      p_default_count: count,
      p_include_late_submissions: include_late,
    });

    if (error) {
      throw new Error(`作业拖欠检查失败: ${error.message}`);
    }

    const matchedStudents = students || [];
    let generatedWarnings = 0;

    for (const student of matchedStudents) {
      const existingWarning = await this.checkExistingWarning(student.student_id, rule.id);
      if (!existingWarning) {
        await this.createWarningRecord(student.student_id, rule.id, {
          type: 'homework_default',
          default_count: student.default_count,
          late_count: student.late_count,
        });
        generatedWarnings++;
      }
    }

    return {
      students: matchedStudents.map(s => s.student_id),
      warnings: generatedWarnings,
    };
  }

  /**
   * ML算法1：风险预测
   */
  private async mlRiskPrediction(rule: WarningRule): Promise<{ students: string[]; warnings: number }> {
    const { threshold = 70, sensitivity = 0.8 } = rule.conditions;
    
    try {
      // 获取学生数据
      const { data: studentsData, error } = await this.supabase
        .from('grade_data_new')
        .select('student_id, name, class_name, total_score, exam_date, total_rank_in_class')
        .order('exam_date', { ascending: true });
      
      if (error) {
        console.error('获取ML数据失败:', error);
        return { students: [], warnings: 0 };
      }

      // 数据清洗：确保分数字段为数值型
      const cleanedData = (studentsData || []).map(record => ({
        ...record,
        total_score: parseFloat(record.total_score) || 0
      })).filter(record => record.total_score > 0);
      
      const studentGroups = this.groupByStudent(cleanedData);
      const riskStudents: string[] = [];
      let generatedWarnings = 0;
      
      for (const [studentId, grades] of Object.entries(studentGroups)) {
        if (grades.length < 2) continue;
        
        const riskScore = this.calculateMLRiskScore(grades);
        
        if (riskScore >= threshold * sensitivity) {
          const existingWarning = await this.checkExistingWarning(studentId, rule.id);
          if (!existingWarning) {
            await this.createWarningRecord(studentId, rule.id, {
              type: 'ml_risk_prediction',
              risk_score: riskScore,
              algorithm: 'multi_factor_risk_model',
              confidence: this.calculateConfidence(grades),
              factors: this.identifyRiskFactors(grades)
            });
            generatedWarnings++;
            riskStudents.push(studentId);
          }
        }
      }
      
      return { students: riskStudents, warnings: generatedWarnings };
    } catch (error) {
      console.error('ML风险预测失败:', error);
      return { students: [], warnings: 0 };
    }
  }

  /**
   * ML算法2：异常检测
   */
  private async mlAnomalyDetection(rule: WarningRule): Promise<{ students: string[]; warnings: number }> {
    const { z_threshold = 2.0, sensitivity = 0.8 } = rule.conditions;
    
    try {
      const { data: studentsData, error } = await this.supabase
        .from('grade_data_new')
        .select('student_id, name, total_score, exam_date')
        .order('exam_date', { ascending: true });
      
      if (error) return { students: [], warnings: 0 };

      // 数据清洗：确保分数字段为数值型
      const cleanedData = (studentsData || []).map(record => ({
        ...record,
        total_score: parseFloat(record.total_score) || 0
      })).filter(record => record.total_score > 0);

      const studentGroups = this.groupByStudent(cleanedData);
      const anomalyStudents: string[] = [];
      let generatedWarnings = 0;
      
      for (const [studentId, grades] of Object.entries(studentGroups)) {
        if (grades.length < 3) continue;
        
        const anomalyScore = this.detectScoreAnomaly(grades, z_threshold);
        
        if (anomalyScore.isAnomaly && anomalyScore.severity >= sensitivity) {
          const existingWarning = await this.checkExistingWarning(studentId, rule.id);
          if (!existingWarning) {
            await this.createWarningRecord(studentId, rule.id, {
              type: 'ml_anomaly_detection',
              z_score: anomalyScore.zScore,
              anomaly_type: anomalyScore.type,
              confidence: anomalyScore.confidence,
              recent_score: grades[grades.length - 1].total_score
            });
            generatedWarnings++;
            anomalyStudents.push(studentId);
          }
        }
      }
      
      return { students: anomalyStudents, warnings: generatedWarnings };
    } catch (error) {
      console.error('ML异常检测失败:', error);
      return { students: [], warnings: 0 };
    }
  }

  /**
   * ML算法3：趋势分析
   */
  private async mlTrendAnalysis(rule: WarningRule): Promise<{ students: string[]; warnings: number }> {
    const { decline_rate = -2.0, confidence_threshold = 0.7 } = rule.conditions;
    
    try {
      const { data: studentsData, error } = await this.supabase
        .from('grade_data_new')
        .select('student_id, name, total_score, exam_date')
        .order('exam_date', { ascending: true });
      
      if (error) return { students: [], warnings: 0 };

      // 数据清洗：确保分数字段为数值型
      const cleanedData = (studentsData || []).map(record => ({
        ...record,
        total_score: parseFloat(record.total_score) || 0
      })).filter(record => record.total_score > 0);

      const studentGroups = this.groupByStudent(cleanedData);
      const trendRiskStudents: string[] = [];
      let generatedWarnings = 0;
      
      for (const [studentId, grades] of Object.entries(studentGroups)) {
        if (grades.length < 3) continue;
        
        const trendAnalysis = this.analyzeTrend(grades);
        
        if (trendAnalysis.slope <= decline_rate && trendAnalysis.confidence >= confidence_threshold) {
          const existingWarning = await this.checkExistingWarning(studentId, rule.id);
          if (!existingWarning) {
            await this.createWarningRecord(studentId, rule.id, {
              type: 'ml_trend_analysis',
              trend_slope: trendAnalysis.slope,
              r_squared: trendAnalysis.rSquared,
              predicted_next: trendAnalysis.predictedNext,
              confidence: trendAnalysis.confidence
            });
            generatedWarnings++;
            trendRiskStudents.push(studentId);
          }
        }
      }
      
      return { students: trendRiskStudents, warnings: generatedWarnings };
    } catch (error) {
      console.error('ML趋势分析失败:', error);
      return { students: [], warnings: 0 };
    }
  }

  // ML辅助方法
  private groupByStudent(data: any[]): { [key: string]: any[] } {
    return data.reduce((groups, record) => {
      const key = record.student_id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
      return groups;
    }, {});
  }

  private calculateMLRiskScore(grades: any[]): number {
    if (grades.length === 0) return 0;
    
    // 多因子风险模型
    let risk = 0;
    
    // 因子1：平均成绩 (权重40%)
    const avgScore = grades.reduce((sum: number, g: any) => sum + g.total_score, 0) / grades.length;
    let scoreRisk = 0;
    if (avgScore < 200) scoreRisk = 80;
    else if (avgScore < 300) scoreRisk = 60;
    else if (avgScore < 400) scoreRisk = 30;
    else scoreRisk = 10;
    risk += scoreRisk * 0.4;
    
    // 因子2：成绩波动性 (权重30%)
    const variance = grades.reduce((sum: number, g: any) => sum + Math.pow(g.total_score - avgScore, 2), 0) / grades.length;
    const volatility = Math.sqrt(variance) / avgScore;
    const volatilityRisk = Math.min(80, volatility * 100);
    risk += volatilityRisk * 0.3;
    
    // 因子3：下降趋势 (权重30%)
    if (grades.length >= 3) {
      const trend = this.analyzeTrend(grades);
      const trendRisk = trend.slope < 0 ? Math.min(80, Math.abs(trend.slope) * 10) : 0;
      risk += trendRisk * 0.3;
    }
    
    return Math.min(100, Math.max(0, risk));
  }

  private detectScoreAnomaly(grades: any[], threshold: number) {
    const scores = grades.map((g: any) => g.total_score);
    const mean = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    const std = Math.sqrt(scores.reduce((sum: number, s: number) => sum + Math.pow(s - mean, 2), 0) / scores.length);
    
    const latestScore = scores[scores.length - 1];
    const zScore = Math.abs((latestScore - mean) / std);
    
    return {
      isAnomaly: zScore >= threshold,
      zScore,
      severity: Math.min(1, zScore / 3),
      confidence: Math.min(0.95, zScore / 4),
      type: latestScore < mean ? 'performance_drop' : 'performance_spike'
    };
  }

  private analyzeTrend(grades: any[]) {
    const scores = grades.map((g: any) => g.total_score);
    const n = scores.length;
    const x = Array.from({length: n}, (_, i) => i + 1);
    
    // 线性回归
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * scores[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 计算R²
    const meanY = sumY / n;
    const totalSumSquares = scores.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const residualSumSquares = scores.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    
    return {
      slope,
      intercept,
      rSquared,
      confidence: Math.min(0.95, rSquared),
      predictedNext: slope * (n + 1) + intercept
    };
  }

  private calculateConfidence(grades: any[]): number {
    const dataPoints = grades.length;
    const baseConfidence = Math.min(0.9, dataPoints / 10);
    
    if (dataPoints >= 3) {
      const scores = grades.map((g: any) => g.total_score);
      const mean = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum: number, s: number) => sum + Math.pow(s - mean, 2), 0) / scores.length;
      const cv = Math.sqrt(variance) / mean;
      const consistencyFactor = Math.max(0.3, 1 - cv);
      return baseConfidence * consistencyFactor;
    }
    
    return baseConfidence;
  }

  private identifyRiskFactors(grades: any[]): string[] {
    const factors = [];
    const scores = grades.map((g: any) => g.total_score);
    const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    
    if (avgScore < 300) factors.push('low_average_score');
    
    if (grades.length >= 2) {
      const trend = this.analyzeTrend(grades);
      if (trend.slope < -1) factors.push('declining_trend');
    }
    
    const variance = scores.reduce((sum: number, s: number) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    if (Math.sqrt(variance) > avgScore * 0.2) factors.push('high_volatility');
    
    return factors;
  }

  // 辅助方法
  private async getActiveRules(): Promise<WarningRule[]> {
    const { data, error } = await this.supabase
      .from('warning_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      throw new Error(`获取活跃规则失败: ${error.message}`);
    }

    return data || [];
  }

  private async startExecution(trigger?: string): Promise<string | null> {
    console.log('开始创建执行记录...');
    const { data, error } = await this.supabase
      .from('warning_executions')
      .insert({
        trigger_type: 'manual',
        trigger_source: trigger || 'edge_function',
        execution_status: 'running'
      })
      .select('id')
      .single();

    if (error) {
      console.error('创建执行记录失败:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
      return null;
    }

    return data.id;
  }

  private async completeExecution(executionId: string, results: any): Promise<void> {
    const { error } = await this.supabase
      .from('warning_executions')
      .update({
        ...results,
        end_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    if (error) {
      console.error('完成执行记录失败:', error);
    }
  }

  private async startRuleExecution(executionId: string, rule: WarningRule): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('warning_rule_executions')
      .insert({
        execution_id: executionId,
        rule_id: rule.id,
        rule_snapshot: rule,
        status: 'running',
      })
      .select('id')
      .single();

    if (error) {
      console.error('创建规则执行记录失败:', error);
      return null;
    }

    return data.id;
  }

  private async completeRuleExecution(ruleExecutionId: string, results: any): Promise<void> {
    const { error } = await this.supabase
      .from('warning_rule_executions')
      .update({
        affected_students_count: results.affected_students_count,
        new_warnings_count: results.new_warnings_count,
        execution_time_ms: results.execution_time_ms,
        status: results.execution_status || results.status,
        error_message: results.error_message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', ruleExecutionId);

    if (error) {
      console.error('完成规则执行记录失败:', error);
    }
  }

  private async checkExistingWarning(studentId: string, ruleId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('warning_records')
      .select('id')
      .eq('student_id', studentId)
      .eq('rule_id', ruleId)
      .eq('status', 'active')
      .limit(1);

    if (error) {
      console.error('检查现有预警失败:', error);
      return false;
    }

    return (data || []).length > 0;
  }

  private async createWarningRecord(studentId: string, ruleId: string, details: any): Promise<void> {
    const { error } = await this.supabase
      .from('warning_records')
      .insert({
        student_id: studentId,
        rule_id: ruleId,
        details,
        status: 'active',
      });

    if (error) {
      console.error('创建预警记录失败:', error);
      throw error;
    }
  }
}

// Edge Function 主函数
Deno.serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('缺少必要的环境变量');
    }

    const engine = new WarningEngine(supabaseUrl, supabaseServiceKey);

    let result;
    
    // 处理GET请求 - 直接执行预警规则
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const trigger = url.searchParams.get('trigger') || 'api_call';
      result = await engine.executeAllRules(trigger);
    } else {
      // 处理POST请求 - 解析JSON中的操作
      const { action, trigger } = await req.json();
      switch (action) {
        case 'execute_all':
          result = await engine.executeAllRules(trigger);
          break;
        default:
          throw new Error(`未知操作: ${action}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('预警引擎执行失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});