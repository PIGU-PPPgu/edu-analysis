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
        rulesCount: rules.length,
        matchedStudentsCount: totalMatchedStudents,
        newWarningsCount: totalGeneratedWarnings,
        executionDurationMs: totalExecutionTime,
        status: 'completed',
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
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        executionDurationMs: Date.now() - startTime,
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

        default:
          console.warn(`[WarningEngine] 未知规则类型: ${rule.conditions.type}`);
      }

      const executionTime = Date.now() - startTime;

      // 完成规则执行记录
      if (ruleExecutionId) {
        await this.completeRuleExecution(ruleExecutionId, {
          affectedStudentsCount: matchedStudents.length,
          newWarningsCount: generatedWarnings,
          executionTimeMs: executionTime,
          status: 'completed',
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
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          executionTimeMs: Date.now() - startTime,
        });
      }
      throw error;
    }
  }

  /**
   * 检查连续不及格预警
   */
  private async checkConsecutiveFails(rule: WarningRule): Promise<{ students: string[]; warnings: number }> {
    const { count, threshold, subject } = rule.conditions;
    
    // 查询连续不及格的学生
    const { data: students, error } = await this.supabase.rpc('check_consecutive_fails', {
      fail_count: count,
      score_threshold: threshold,
      subject_filter: subject === 'all' ? null : subject,
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
      decline_threshold,
      consecutive_count,
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
      score_threshold: threshold,
      subject_filter: subject === 'all' ? null : subject,
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
      default_count: count,
      include_late_submissions: include_late,
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
    const { data, error } = await this.supabase
      .from('warning_executions')
      .insert({
        execution_type: trigger ? 'triggered' : 'manual',
        trigger_event: trigger,
        status: 'running',
        metadata: { started_at: new Date().toISOString() },
      })
      .select('id')
      .single();

    if (error) {
      console.error('创建执行记录失败:', error);
      return null;
    }

    return data.id;
  }

  private async completeExecution(executionId: string, results: any): Promise<void> {
    const { error } = await this.supabase
      .from('warning_executions')
      .update({
        ...results,
        completed_at: new Date().toISOString(),
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
        ...results,
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

    // 解析请求
    const { action, trigger } = await req.json();

    let result;
    switch (action) {
      case 'execute_all':
        result = await engine.executeAllRules(trigger);
        break;
      default:
        throw new Error(`未知操作: ${action}`);
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