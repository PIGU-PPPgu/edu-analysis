/**
 * 实时预警计算引擎
 * 支持规则动态匹配、即时预警生成和事件驱动架构
 */

import { supabase } from '../integrations/supabase/client';
import { warningAnalysisCache } from '../utils/performanceCache';

// 数据变更事件类型
export enum DataChangeEventType {
  GRADE_DATA_INSERTED = 'grade_data_inserted',
  GRADE_DATA_UPDATED = 'grade_data_updated',
  STUDENT_DATA_UPDATED = 'student_data_updated',
  ATTENDANCE_DATA_UPDATED = 'attendance_data_updated',
  EXAM_COMPLETED = 'exam_completed',
  HOMEWORK_SUBMITTED = 'homework_submitted',
  MANUAL_TRIGGER = 'manual_trigger'
}

// 数据变更事件
export interface DataChangeEvent {
  type: DataChangeEventType;
  entityId: string; // 学生ID、考试ID等
  entityType: 'student' | 'exam' | 'class' | 'homework';
  changeData: Record<string, any>;
  timestamp: string;
  metadata?: Record<string, any>;
}

// 预警规则执行上下文
export interface RuleExecutionContext {
  studentId: string;
  ruleId: string;
  eventType: DataChangeEventType;
  triggerData: Record<string, any>;
  timestamp: string;
}

// 预警计算结果
export interface WarningCalculationResult {
  ruleId: string;
  studentId: string;
  triggered: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  message: string;
  details: Record<string, any>;
  suggestedActions: string[];
  expiredAt?: string;
  metadata: {
    calculatedAt: string;
    processingTimeMs: number;
    ruleVersion: string;
    confidence: number;
  };
}

// 规则条件表达式解析器
class RuleExpressionParser {
  // 解析规则条件表达式
  parseCondition(expression: string, context: Record<string, any>): boolean {
    try {
      // 安全的表达式解析 - 只支持基本的比较操作
      return this.evaluateExpression(expression, context);
    } catch (error) {
      console.error('[RuleExpressionParser] 条件解析失败:', error);
      return false;
    }
  }

  // 计算规则得分
  calculateScore(scoreExpression: string, context: Record<string, any>): number {
    try {
      const result = this.evaluateExpression(scoreExpression, context);
      return typeof result === 'number' ? Math.max(0, Math.min(100, result)) : 0;
    } catch (error) {
      console.error('[RuleExpressionParser] 得分计算失败:', error);
      return 0;
    }
  }

  // 简化的表达式计算器（安全版本）
  private evaluateExpression(expression: string, context: Record<string, any>): any {
    // 替换变量
    let processedExpression = expression;
    
    // 支持的变量替换
    Object.entries(context).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      processedExpression = processedExpression.replace(regex, String(value));
    });

    // 支持的操作符映射
    const operators = {
      '>=': (a: number, b: number) => a >= b,
      '<=': (a: number, b: number) => a <= b,
      '>': (a: number, b: number) => a > b,
      '<': (a: number, b: number) => a < b,
      '==': (a: any, b: any) => a == b,
      '!=': (a: any, b: any) => a != b,
      '&&': (a: boolean, b: boolean) => a && b,
      '||': (a: boolean, b: boolean) => a || b,
    };

    // 简单的表达式解析
    return this.parseSimpleExpression(processedExpression, operators);
  }

  private parseSimpleExpression(expr: string, operators: Record<string, Function>): any {
    // 移除空格
    expr = expr.replace(/\s+/g, ' ').trim();
    
    // 数字检测
    if (/^-?\d+\.?\d*$/.test(expr)) {
      return parseFloat(expr);
    }
    
    // 布尔值检测
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    
    // 简单比较操作
    for (const [op, func] of Object.entries(operators)) {
      if (expr.includes(op)) {
        const parts = expr.split(op);
        if (parts.length === 2) {
          const left = this.parseSimpleExpression(parts[0].trim(), operators);
          const right = this.parseSimpleExpression(parts[1].trim(), operators);
          return func(left, right);
        }
      }
    }
    
    return expr; // 返回原始字符串
  }
}

// 数据收集器 - 收集学生相关数据
class StudentDataCollector {
  async collectStudentData(studentId: string, eventType?: DataChangeEventType): Promise<Record<string, any>> {
    const startTime = performance.now();
    
    try {
      // 并行收集不同类型的数据
      const [
        studentInfo,
        recentGrades,
        attendanceData,
        behaviorData,
        homeworkData
      ] = await Promise.all([
        this.getStudentBasicInfo(studentId),
        this.getRecentGrades(studentId),
        this.getAttendanceData(studentId),
        this.getBehaviorData(studentId),
        this.getHomeworkData(studentId)
      ]);

      // 计算派生指标
      const derivedMetrics = this.calculateDerivedMetrics({
        studentInfo,
        recentGrades,
        attendanceData,
        behaviorData,
        homeworkData
      });

      const processingTime = performance.now() - startTime;
      
      return {
        ...studentInfo,
        ...derivedMetrics,
        recentGrades,
        attendanceData,
        behaviorData,
        homeworkData,
        _metadata: {
          collectedAt: new Date().toISOString(),
          processingTimeMs: Math.round(processingTime),
          eventType
        }
      };
    } catch (error) {
      console.error('[StudentDataCollector] 数据收集失败:', error);
      throw error;
    }
  }

  // 获取学生基本信息
  private async getStudentBasicInfo(studentId: string) {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        name,
        class_id,
        student_id,
        created_at,
        classes!inner(name, grade)
      `)
      .eq('id', studentId)
      .single();

    if (error) throw error;
    return data || {};
  }

  // 获取最近成绩数据
  private async getRecentGrades(studentId: string) {
    const { data, error } = await supabase
      .from('grade_data')
      .select(`
        score,
        rank,
        percentile,
        exam_id,
        created_at,
        exams!inner(name, exam_date, subject, total_score)
      `)
      .eq('student_id', studentId)
      .order('exams.exam_date', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  // 获取考勤数据（如果有相关表）
  private async getAttendanceData(studentId: string) {
    // 模拟考勤数据，实际应该从考勤表获取
    return {
      attendanceRate: 0.95,
      lateCount: 2,
      absentCount: 1,
      period: 'last_30_days'
    };
  }

  // 获取行为数据
  private async getBehaviorData(studentId: string) {
    // 可以从预警记录中统计行为相关问题
    const { data, error } = await supabase
      .from('warning_records')
      .select(`
        id,
        severity,
        created_at,
        warning_rules!inner(category)
      `)
      .eq('student_id', studentId)
      .eq('warning_rules.category', 'behavior')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[StudentDataCollector] 行为数据获取失败:', error);
      return { behaviorIssues: 0 };
    }

    return {
      behaviorIssues: data?.length || 0,
      recentBehaviorIssues: data || []
    };
  }

  // 获取作业数据
  private async getHomeworkData(studentId: string) {
    // 模拟作业数据，实际应该从作业表获取
    return {
      completionRate: 0.88,
      averageScore: 82.5,
      lateSubmissions: 3,
      period: 'last_30_days'
    };
  }

  // 计算派生指标
  private calculateDerivedMetrics(data: any): Record<string, any> {
    const { recentGrades } = data;
    
    if (!recentGrades || recentGrades.length === 0) {
      return {
        avgScore: 0,
        scoreStdDev: 0,
        scoreTrend: 'stable',
        lowScoreCount: 0,
        gradeCount: 0
      };
    }

    // 计算平均分
    const scores = recentGrades.map(g => g.score).filter(s => s !== null);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    // 计算标准差
    const scoreStdDev = scores.length > 1 ? 
      Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length) : 0;
    
    // 计算趋势（简化版本）
    let scoreTrend = 'stable';
    if (scores.length >= 3) {
      const recent3 = scores.slice(0, 3);
      const earlier3 = scores.slice(3, 6);
      if (earlier3.length > 0) {
        const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
        const earlierAvg = earlier3.reduce((a, b) => a + b, 0) / earlier3.length;
        
        if (recentAvg > earlierAvg + 5) scoreTrend = 'improving';
        else if (recentAvg < earlierAvg - 5) scoreTrend = 'declining';
      }
    }
    
    // 低分次数
    const lowScoreCount = scores.filter(s => s < 60).length;

    return {
      avgScore: Math.round(avgScore * 100) / 100,
      scoreStdDev: Math.round(scoreStdDev * 100) / 100,
      scoreTrend,
      lowScoreCount,
      gradeCount: scores.length,
      passRate: scores.length > 0 ? scores.filter(s => s >= 60).length / scores.length : 0
    };
  }
}

// 实时预警计算引擎
export class RealTimeWarningEngine {
  private expressionParser = new RuleExpressionParser();
  private dataCollector = new StudentDataCollector();
  private isProcessing = false;
  private eventQueue: DataChangeEvent[] = [];

  // 处理数据变更事件
  async processDataChangeEvent(event: DataChangeEvent): Promise<void> {
    console.log(`[RealTimeWarningEngine] 处理事件: ${event.type}, 实体: ${event.entityId}`);
    
    // 添加到队列
    this.eventQueue.push(event);
    
    // 如果没有在处理，开始处理队列
    if (!this.isProcessing) {
      await this.processEventQueue();
    }
  }

  // 处理事件队列
  private async processEventQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      
      try {
        await this.handleSingleEvent(event);
      } catch (error) {
        console.error('[RealTimeWarningEngine] 事件处理失败:', error);
      }
    }
    
    this.isProcessing = false;
  }

  // 处理单个事件
  private async handleSingleEvent(event: DataChangeEvent): Promise<void> {
    const startTime = performance.now();
    
    try {
      // 根据事件类型确定需要检查的学生
      const studentIds = await this.getAffectedStudents(event);
      
      // 获取相关的预警规则
      const activeRules = await this.getActiveWarningRules(event.type);
      
      // 为每个学生执行规则检查
      const checkPromises = studentIds.flatMap(studentId =>
        activeRules.map(rule => this.executeRuleForStudent(studentId, rule, event))
      );
      
      const results = await Promise.allSettled(checkPromises);
      
      // 处理结果
      const successfulResults = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<WarningCalculationResult>).value)
        .filter(result => result.triggered);
      
      // 保存新的预警记录
      if (successfulResults.length > 0) {
        await this.saveWarningResults(successfulResults);
      }
      
      // 清理缓存
      this.invalidateRelatedCache(studentIds);
      
      const processingTime = performance.now() - startTime;
      console.log(`[RealTimeWarningEngine] 事件处理完成，耗时 ${Math.round(processingTime)}ms，生成 ${successfulResults.length} 个预警`);
      
    } catch (error) {
      console.error('[RealTimeWarningEngine] 事件处理异常:', error);
      throw error;
    }
  }

  // 获取受影响的学生列表
  private async getAffectedStudents(event: DataChangeEvent): Promise<string[]> {
    switch (event.entityType) {
      case 'student':
        return [event.entityId];
      
      case 'exam':
        // 获取参加该考试的所有学生
        const { data: examGrades, error } = await supabase
          .from('grade_data')
          .select('student_id')
          .eq('exam_id', event.entityId);
        
        if (error) throw error;
        return Array.from(new Set(examGrades?.map(g => g.student_id) || []));
      
      case 'class':
        // 获取班级所有学生
        const { data: classStudents, error: classError } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', event.entityId);
        
        if (classError) throw classError;
        return classStudents?.map(s => s.id) || [];
      
      default:
        return [];
    }
  }

  // 获取活跃的预警规则
  private async getActiveWarningRules(eventType: DataChangeEventType) {
    return warningAnalysisCache.getRuleData(
      async () => {
        const { data, error } = await supabase
          .from('warning_rules')
          .select(`
            id,
            name,
            category,
            scope,
            priority,
            severity,
            condition_expression,
            score_expression,
            message_template,
            suggested_actions,
            trigger_events,
            cooldown_hours,
            is_active
          `)
          .eq('is_active', true);

        if (error) throw error;
        
        // 过滤支持当前事件类型的规则
        return data?.filter(rule => 
          !rule.trigger_events || 
          rule.trigger_events.includes(eventType) ||
          rule.trigger_events.includes('all')
        ) || [];
      }
    );
  }

  // 为学生执行特定规则
  private async executeRuleForStudent(
    studentId: string, 
    rule: any, 
    event: DataChangeEvent
  ): Promise<WarningCalculationResult> {
    const startTime = performance.now();
    
    try {
      // 检查冷却期
      if (await this.isInCooldownPeriod(studentId, rule.id, rule.cooldown_hours)) {
        return this.createNonTriggeredResult(studentId, rule, startTime, '处于冷却期');
      }
      
      // 收集学生数据
      const studentData = await this.dataCollector.collectStudentData(studentId, event.type);
      
      // 创建规则执行上下文
      const context = {
        ...studentData,
        eventType: event.type,
        eventData: event.changeData,
        currentTime: new Date(),
        rule: rule
      };
      
      // 检查规则条件
      const conditionMet = this.expressionParser.parseCondition(rule.condition_expression, context);
      
      if (!conditionMet) {
        return this.createNonTriggeredResult(studentId, rule, startTime, '条件不满足');
      }
      
      // 计算预警得分
      const score = rule.score_expression ? 
        this.expressionParser.calculateScore(rule.score_expression, context) : 
        this.getDefaultScore(rule.severity);
      
      // 生成预警消息
      const message = this.generateWarningMessage(rule.message_template, context);
      
      // 解析建议行动
      const suggestedActions = Array.isArray(rule.suggested_actions) ? 
        rule.suggested_actions : [rule.suggested_actions].filter(Boolean);
      
      const processingTime = performance.now() - startTime;
      
      return {
        ruleId: rule.id,
        studentId,
        triggered: true,
        severity: rule.severity,
        score,
        message,
        details: {
          ruleName: rule.name,
          category: rule.category,
          triggerEvent: event.type,
          studentData: this.sanitizeDataForStorage(studentData)
        },
        suggestedActions,
        expiredAt: this.calculateExpirationTime(rule),
        metadata: {
          calculatedAt: new Date().toISOString(),
          processingTimeMs: Math.round(processingTime),
          ruleVersion: '1.0',
          confidence: this.calculateConfidence(context, rule)
        }
      };
      
    } catch (error) {
      console.error('[RealTimeWarningEngine] 规则执行失败:', error);
      return this.createNonTriggeredResult(studentId, rule, startTime, '执行异常');
    }
  }

  // 检查是否在冷却期
  private async isInCooldownPeriod(studentId: string, ruleId: string, cooldownHours: number): Promise<boolean> {
    if (!cooldownHours || cooldownHours <= 0) return false;
    
    const cooldownTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('warning_records')
      .select('id')
      .eq('student_id', studentId)
      .eq('rule_id', ruleId)
      .gte('created_at', cooldownTime.toISOString())
      .limit(1);
    
    if (error) {
      console.warn('[RealTimeWarningEngine] 冷却期检查失败:', error);
      return false;
    }
    
    return (data?.length || 0) > 0;
  }

  // 创建未触发的结果
  private createNonTriggeredResult(
    studentId: string, 
    rule: any, 
    startTime: number, 
    reason: string
  ): WarningCalculationResult {
    return {
      ruleId: rule.id,
      studentId,
      triggered: false,
      severity: rule.severity,
      score: 0,
      message: '',
      details: { reason },
      suggestedActions: [],
      metadata: {
        calculatedAt: new Date().toISOString(),
        processingTimeMs: Math.round(performance.now() - startTime),
        ruleVersion: '1.0',
        confidence: 0
      }
    };
  }

  // 获取默认分数
  private getDefaultScore(severity: string): number {
    switch (severity) {
      case 'critical': return 90;
      case 'high': return 75;
      case 'medium': return 50;
      case 'low': return 25;
      default: return 50;
    }
  }

  // 生成预警消息
  private generateWarningMessage(template: string, context: any): string {
    if (!template) return '检测到预警情况';
    
    let message = template;
    
    // 替换模板变量
    const variables = {
      studentName: context.name || '学生',
      avgScore: context.avgScore || 0,
      className: context.classes?.name || '未知班级',
      gradeCount: context.gradeCount || 0,
      lowScoreCount: context.lowScoreCount || 0
    };
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      message = message.replace(regex, String(value));
    });
    
    return message;
  }

  // 计算过期时间
  private calculateExpirationTime(rule: any): string | undefined {
    // 默认30天过期
    const expirationDays = rule.expiration_days || 30;
    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() + expirationDays);
    return expirationTime.toISOString();
  }

  // 计算置信度
  private calculateConfidence(context: any, rule: any): number {
    // 基于数据完整性和规则复杂度计算置信度
    let confidence = 0.8;
    
    // 数据完整性检查
    if (context.gradeCount > 5) confidence += 0.1;
    if (context._metadata?.processingTimeMs < 1000) confidence += 0.05;
    
    return Math.min(1.0, confidence);
  }

  // 清理数据用于存储
  private sanitizeDataForStorage(data: any): any {
    // 移除敏感信息和大型数据对象
    const sanitized = { ...data };
    delete sanitized._metadata;
    delete sanitized.recentGrades;
    delete sanitized.behaviorData;
    return sanitized;
  }

  // 保存预警结果
  private async saveWarningResults(results: WarningCalculationResult[]): Promise<void> {
    const records = results.map(result => ({
      student_id: result.studentId,
      rule_id: result.ruleId,
      severity: result.severity,
      score: result.score,
      message: result.message,
      details: result.details,
      suggested_actions: result.suggestedActions,
      status: 'active',
      expired_at: result.expiredAt,
      created_at: result.metadata.calculatedAt
    }));

    const { error } = await supabase
      .from('warning_records')
      .insert(records);

    if (error) {
      console.error('[RealTimeWarningEngine] 保存预警记录失败:', error);
      throw error;
    }

    console.log(`[RealTimeWarningEngine] 成功保存 ${records.length} 条预警记录`);
  }

  // 清理相关缓存
  private invalidateRelatedCache(studentIds: string[]): void {
    // 清理预警相关缓存
    warningAnalysisCache.invalidateWarningData();
    
    // 可以根据需要添加更细粒度的缓存清理
    console.log(`[RealTimeWarningEngine] 已清理 ${studentIds.length} 个学生的相关缓存`);
  }

  // 手动触发预警计算
  async triggerWarningCalculation(studentId: string, reason: string = '手动触发'): Promise<WarningCalculationResult[]> {
    const event: DataChangeEvent = {
      type: DataChangeEventType.MANUAL_TRIGGER,
      entityId: studentId,
      entityType: 'student',
      changeData: { reason },
      timestamp: new Date().toISOString(),
      metadata: { source: 'manual' }
    };

    await this.processDataChangeEvent(event);
    
    // 返回最近生成的预警
    return this.getRecentWarningsForStudent(studentId);
  }

  // 获取学生最近的预警
  private async getRecentWarningsForStudent(studentId: string): Promise<WarningCalculationResult[]> {
    const { data, error } = await supabase
      .from('warning_records')
      .select(`
        rule_id,
        severity,
        score,
        message,
        details,
        suggested_actions,
        created_at
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 最近1小时
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[RealTimeWarningEngine] 获取最近预警失败:', error);
      return [];
    }

    return data?.map(record => ({
      ruleId: record.rule_id,
      studentId,
      triggered: true,
      severity: record.severity,
      score: record.score,
      message: record.message,
      details: record.details || {},
      suggestedActions: record.suggested_actions || [],
      metadata: {
        calculatedAt: record.created_at,
        processingTimeMs: 0,
        ruleVersion: '1.0',
        confidence: 1.0
      }
    })) || [];
  }

  // 批量处理多个事件
  async processBatchEvents(events: DataChangeEvent[]): Promise<void> {
    console.log(`[RealTimeWarningEngine] 批量处理 ${events.length} 个事件`);
    
    // 添加所有事件到队列
    this.eventQueue.push(...events);
    
    // 处理队列
    if (!this.isProcessing) {
      await this.processEventQueue();
    }
  }

  // 获取引擎状态
  getEngineStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.eventQueue.length,
      lastProcessedAt: new Date().toISOString()
    };
  }
}

// 导出单例实例
export const realTimeWarningEngine = new RealTimeWarningEngine(); 