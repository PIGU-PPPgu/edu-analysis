/**
 * 预警规则服务
 * 管理和执行自动预警规则
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WarningRule {
  id: string;
  name: string;
  description: string;
  conditions: WarningCondition[];
  severity: "low" | "medium" | "high";
  is_active: boolean;
  is_system: boolean;
  created_by?: string;
  created_at: string;
}

export interface WarningCondition {
  type:
    | "grade_decline"
    | "homework_missing"
    | "knowledge_gap"
    | "attendance"
    | "composite";
  operator: "gt" | "lt" | "eq" | "gte" | "lte";
  value: number;
  timeframe?: string; // '1week', '1month', '1semester'
  subject?: string;
  description: string;
}

export interface RuleExecutionResult {
  ruleId: string;
  matchedStudents: string[];
  warningsGenerated: number;
  executionTime: number;
  errors: string[];
}

/**
 * 获取所有预警规则
 */
export async function getWarningRules(): Promise<WarningRule[]> {
  try {
    const { data, error } = await supabase
      .from("warning_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取预警规则失败:", error);
      return getDefaultWarningRules();
    }

    if (!data || data.length === 0) {
      console.log("数据库中无预警规则，返回默认规则");
      return getDefaultWarningRules();
    }

    return data.map((rule) => {
      let conditions = [];

      try {
        let rawConditions = rule.conditions;

        // 处理字符串格式的JSON
        if (typeof rawConditions === "string") {
          rawConditions = JSON.parse(rawConditions);
        }

        if (Array.isArray(rawConditions)) {
          // 已经是数组格式
          conditions = rawConditions;
        } else if (rawConditions && typeof rawConditions === "object") {
          // 单个对象格式，转换为标准WarningCondition格式
          conditions = [convertToWarningCondition(rawConditions)];
        }

        // 过滤掉无效的条件
        conditions = conditions.filter(
          (condition) => condition && typeof condition === "object"
        );
      } catch (error) {
        console.warn(`规则 ${rule.id} 的条件解析失败:`, error);
        conditions = [];
      }

      return {
        ...rule,
        conditions,
      };
    });
  } catch (error) {
    console.error("获取预警规则失败:", error);
    return getDefaultWarningRules();
  }
}

/**
 * 将旧格式的条件转换为标准WarningCondition格式
 */
function convertToWarningCondition(rawCondition: any): WarningCondition {
  const {
    type,
    threshold,
    times,
    score_threshold,
    sensitivity,
    min_data_points,
  } = rawCondition;

  // 根据不同类型生成标准条件格式
  switch (type) {
    case "consecutive_fails":
      return {
        type: "grade_decline",
        operator: "gte",
        value: times || 2,
        timeframe: "1semester",
        description: `连续${times || 2}次考试不及格（低于${score_threshold || 60}分）`,
      };

    case "score_drop":
      return {
        type: "grade_decline",
        operator: "gte",
        value: threshold || 20,
        timeframe: "1month",
        description: `成绩下降超过${threshold || 20}分`,
      };

    case "attendance":
      return {
        type: "attendance",
        operator: "lt",
        value: Math.round((threshold || 0.8) * 100),
        timeframe: "1month",
        description: `出勤率低于${Math.round((threshold || 0.8) * 100)}%`,
      };

    case "failed_subjects":
      return {
        type: "composite",
        operator: "gte",
        value: threshold || 2,
        timeframe: "1semester",
        description: `不及格科目数达到${threshold || 2}门`,
      };

    case "ml_risk_prediction":
      return {
        type: "composite",
        operator: "gte",
        value: threshold || 10,
        description: `AI风险预测评分超过${threshold || 10}分（敏感度${sensitivity || 0.3}）`,
      };

    default:
      return {
        type: "composite",
        operator: "gte",
        value: threshold || 0,
        description: `${type}条件触发（阈值：${threshold || "未设置"}）`,
      };
  }
}

/**
 * 获取默认预警规则
 */
function getDefaultWarningRules(): WarningRule[] {
  return [
    {
      id: "default_grade_decline",
      name: "成绩下降预警",
      description: "检测学生连续3次考试成绩下降",
      conditions: [
        {
          type: "grade_decline",
          operator: "gte",
          value: 3,
          timeframe: "1semester",
          description: "连续3次成绩下降",
        },
      ],
      severity: "high",
      is_active: true,
      is_system: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "default_homework_missing",
      name: "作业缺交预警",
      description: "检测学生作业提交率低于70%",
      conditions: [
        {
          type: "homework_missing",
          operator: "lt",
          value: 70,
          timeframe: "1month",
          description: "作业提交率低于70%",
        },
      ],
      severity: "medium",
      is_active: true,
      is_system: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "default_knowledge_gap",
      name: "知识点薄弱预警",
      description: "检测学生多个知识点掌握不足",
      conditions: [
        {
          type: "knowledge_gap",
          operator: "gte",
          value: 5,
          description: "5个以上知识点掌握度低于60%",
        },
      ],
      severity: "medium",
      is_active: true,
      is_system: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "default_failing_grades",
      name: "不及格预警",
      description: "检测学生连续2次不及格",
      conditions: [
        {
          type: "grade_decline",
          operator: "gte",
          value: 2,
          timeframe: "1semester",
          description: "连续2次考试不及格（<60分）",
        },
      ],
      severity: "high",
      is_active: true,
      is_system: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "default_comprehensive_risk",
      name: "综合风险预警",
      description: "综合多个维度的学习表现评估",
      conditions: [
        {
          type: "composite",
          operator: "gte",
          value: 15,
          description: "综合风险分数≥15分",
        },
      ],
      severity: "high",
      is_active: true,
      is_system: true,
      created_at: new Date().toISOString(),
    },
  ];
}

/**
 * 创建预警规则
 */
export async function createWarningRule(
  rule: Omit<WarningRule, "id" | "created_at">
): Promise<WarningRule | null> {
  try {
    const ruleData = {
      name: rule.name,
      description: rule.description,
      conditions: JSON.stringify(rule.conditions),
      severity: rule.severity,
      is_active: rule.is_active,
      is_system: rule.is_system,
      created_by: rule.created_by,
    };

    const { data, error } = await supabase
      .from("warning_rules")
      .insert([ruleData])
      .select()
      .single();

    if (error) {
      console.error("创建预警规则失败:", error);
      toast.error("创建预警规则失败");
      return null;
    }

    toast.success("预警规则创建成功");
    return {
      ...data,
      conditions: JSON.parse(data.conditions),
    };
  } catch (error) {
    console.error("创建预警规则失败:", error);
    toast.error("创建预警规则失败");
    return null;
  }
}

/**
 * 更新预警规则
 */
export async function updateWarningRule(
  id: string,
  updates: Partial<WarningRule>
): Promise<boolean> {
  try {
    const updateData: any = { ...updates };
    if (updateData.conditions) {
      updateData.conditions = JSON.stringify(updateData.conditions);
    }
    delete updateData.id;
    delete updateData.created_at;

    const { error } = await supabase
      .from("warning_rules")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("更新预警规则失败:", error);
      toast.error("更新预警规则失败");
      return false;
    }

    toast.success("预警规则更新成功");
    return true;
  } catch (error) {
    console.error("更新预警规则失败:", error);
    toast.error("更新预警规则失败");
    return false;
  }
}

/**
 * 删除预警规则
 */
export async function deleteWarningRule(id: string): Promise<boolean> {
  try {
    // 系统规则不允许删除
    const { data: rule } = await supabase
      .from("warning_rules")
      .select("is_system")
      .eq("id", id)
      .single();

    if (rule?.is_system) {
      toast.error("系统规则不能删除");
      return false;
    }

    const { error } = await supabase
      .from("warning_rules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("删除预警规则失败:", error);
      toast.error("删除预警规则失败");
      return false;
    }

    toast.success("预警规则删除成功");
    return true;
  } catch (error) {
    console.error("删除预警规则失败:", error);
    toast.error("删除预警规则失败");
    return false;
  }
}

/**
 * 执行单个预警规则
 */
export async function executeWarningRule(
  rule: WarningRule
): Promise<RuleExecutionResult> {
  const startTime = Date.now();
  const result: RuleExecutionResult = {
    ruleId: rule.id,
    matchedStudents: [],
    warningsGenerated: 0,
    executionTime: 0,
    errors: [],
  };

  try {
    console.log(`🚀 执行预警规则: ${rule.name}`);

    if (!rule.is_active) {
      result.errors.push("规则未激活");
      return result;
    }

    // 获取所有学生
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("student_id, name, class_name");

    if (studentsError) {
      result.errors.push(`获取学生数据失败: ${studentsError.message}`);
      return result;
    }

    if (!students || students.length === 0) {
      result.errors.push("未找到学生数据");
      return result;
    }

    // 根据规则类型执行检查
    for (const student of students) {
      try {
        const isMatch = await checkStudentAgainstRule(student.student_id, rule);
        if (isMatch) {
          result.matchedStudents.push(student.student_id);

          // 生成预警记录
          const warningCreated = await createWarningRecord(student, rule);
          if (warningCreated) {
            result.warningsGenerated++;
          }
        }
      } catch (error) {
        result.errors.push(`检查学生 ${student.student_id} 失败: ${error}`);
      }
    }

    result.executionTime = Date.now() - startTime;

    console.log(`✅ 规则执行完成: ${rule.name}`, result);
    return result;
  } catch (error) {
    result.errors.push(`规则执行失败: ${error}`);
    result.executionTime = Date.now() - startTime;
    console.error(`❌ 规则执行失败: ${rule.name}`, error);
    return result;
  }
}

/**
 * 检查学生是否匹配规则条件
 */
async function checkStudentAgainstRule(
  studentId: string,
  rule: WarningRule
): Promise<boolean> {
  try {
    for (const condition of rule.conditions) {
      const matches = await checkCondition(studentId, condition);
      if (!matches) {
        return false; // 所有条件都必须满足
      }
    }
    return rule.conditions.length > 0; // 至少要有一个条件
  } catch (error) {
    console.error(`检查学生 ${studentId} 条件失败:`, error);
    return false;
  }
}

/**
 * 检查单个条件
 */
async function checkCondition(
  studentId: string,
  condition: WarningCondition
): Promise<boolean> {
  try {
    switch (condition.type) {
      case "grade_decline":
        return await checkGradeDeclineCondition(studentId, condition);

      case "homework_missing":
        return await checkHomeworkMissingCondition(studentId, condition);

      case "knowledge_gap":
        return await checkKnowledgeGapCondition(studentId, condition);

      case "composite":
        return await checkCompositeCondition(studentId, condition);

      default:
        console.warn(`未知的条件类型: ${condition.type}`);
        return false;
    }
  } catch (error) {
    console.error(`检查条件失败:`, error);
    return false;
  }
}

/**
 * 检查成绩下降条件
 */
async function checkGradeDeclineCondition(
  studentId: string,
  condition: WarningCondition
): Promise<boolean> {
  try {
    // 获取学生最近的成绩记录
    const { data: grades, error } = await supabase
      .from("grade_data")
      .select("total_score, exam_date")
      .eq("student_id", studentId)
      .order("exam_date", { ascending: false })
      .limit(10);

    if (error || !grades || grades.length < 2) {
      return false;
    }

    // 检查连续下降次数
    let consecutiveDeclines = 0;
    let failingGrades = 0;

    for (let i = 1; i < grades.length; i++) {
      if (grades[i - 1].total_score < grades[i].total_score) {
        consecutiveDeclines++;
      } else {
        break;
      }
    }

    // 检查不及格次数
    failingGrades = grades.filter((g) => g.total_score < 60).length;

    const testValue = condition.description.includes("不及格")
      ? failingGrades
      : consecutiveDeclines;

    return evaluateCondition(testValue, condition.operator, condition.value);
  } catch (error) {
    console.error("检查成绩下降条件失败:", error);
    return false;
  }
}

/**
 * 检查作业缺交条件
 */
async function checkHomeworkMissingCondition(
  studentId: string,
  condition: WarningCondition
): Promise<boolean> {
  try {
    // 获取最近的作业提交记录
    const { data: submissions, error } = await supabase
      .from("homework_submissions")
      .select("status")
      .eq("student_id", studentId)
      .gte("created_at", getTimeframeCutoff(condition.timeframe || "1month"));

    if (error || !submissions || submissions.length === 0) {
      return false;
    }

    const submittedCount = submissions.filter(
      (s) => s.status === "submitted"
    ).length;
    const submissionRate = (submittedCount / submissions.length) * 100;

    return evaluateCondition(
      submissionRate,
      condition.operator,
      condition.value
    );
  } catch (error) {
    console.error("检查作业缺交条件失败:", error);
    return false;
  }
}

/**
 * 检查知识点薄弱条件
 */
async function checkKnowledgeGapCondition(
  studentId: string,
  condition: WarningCondition
): Promise<boolean> {
  try {
    // 获取知识点掌握记录
    const { data: masteryRecords, error } = await supabase
      .from("student_knowledge_mastery")
      .select("mastery_level")
      .eq("student_id", studentId);

    if (error || !masteryRecords || masteryRecords.length === 0) {
      return false;
    }

    const weakPoints = masteryRecords.filter(
      (record) => record.mastery_level < 60
    ).length;

    return evaluateCondition(weakPoints, condition.operator, condition.value);
  } catch (error) {
    console.error("检查知识点薄弱条件失败:", error);
    return false;
  }
}

/**
 * 检查综合风险条件
 */
async function checkCompositeCondition(
  studentId: string,
  condition: WarningCondition
): Promise<boolean> {
  try {
    // 计算综合风险分数
    const [gradeRisk, homeworkRisk, knowledgeRisk] = await Promise.all([
      calculateGradeRiskScore(studentId),
      calculateHomeworkRiskScore(studentId),
      calculateKnowledgeRiskScore(studentId),
    ]);

    const compositeScore = gradeRisk + homeworkRisk + knowledgeRisk;

    return evaluateCondition(
      compositeScore,
      condition.operator,
      condition.value
    );
  } catch (error) {
    console.error("检查综合风险条件失败:", error);
    return false;
  }
}

/**
 * 计算成绩风险分数
 */
async function calculateGradeRiskScore(studentId: string): Promise<number> {
  try {
    const { data: grades } = await supabase
      .from("grade_data")
      .select("total_score")
      .eq("student_id", studentId)
      .order("exam_date", { ascending: false })
      .limit(5);

    if (!grades || grades.length === 0) return 0;

    let score = 0;
    const avgScore =
      grades.reduce((sum, g) => sum + g.total_score, 0) / grades.length;

    if (avgScore < 60) score += 6;
    else if (avgScore < 80) score += 3;

    // 检查下降趋势
    let declines = 0;
    for (let i = 1; i < grades.length; i++) {
      if (grades[i - 1].total_score < grades[i].total_score) declines++;
    }
    score += Math.min(declines * 2, 6);

    return score;
  } catch (error) {
    return 0;
  }
}

/**
 * 计算作业风险分数
 */
async function calculateHomeworkRiskScore(studentId: string): Promise<number> {
  try {
    const { data: submissions } = await supabase
      .from("homework_submissions")
      .select("status, score")
      .eq("student_id", studentId)
      .gte("created_at", getTimeframeCutoff("1month"));

    if (!submissions || submissions.length === 0) return 0;

    const submissionRate =
      submissions.filter((s) => s.status === "submitted").length /
      submissions.length;
    const gradedSubmissions = submissions.filter(
      (s) => s.score !== null && s.score !== undefined
    );
    const avgScore =
      gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) /
          gradedSubmissions.length
        : 100;

    let score = 0;
    if (submissionRate < 0.5) score += 6;
    else if (submissionRate < 0.8) score += 3;

    if (avgScore < 60) score += 4;
    else if (avgScore < 80) score += 2;

    return score;
  } catch (error) {
    return 0;
  }
}

/**
 * 计算知识点风险分数
 */
async function calculateKnowledgeRiskScore(studentId: string): Promise<number> {
  try {
    const { data: mastery } = await supabase
      .from("student_knowledge_mastery")
      .select("mastery_level")
      .eq("student_id", studentId);

    if (!mastery || mastery.length === 0) return 0;

    const weakPoints = mastery.filter((m) => m.mastery_level < 60).length;
    const criticalPoints = mastery.filter((m) => m.mastery_level < 40).length;

    return Math.min(weakPoints + criticalPoints * 2, 8);
  } catch (error) {
    return 0;
  }
}

/**
 * 评估条件
 */
function evaluateCondition(
  value: number,
  operator: string,
  target: number
): boolean {
  switch (operator) {
    case "gt":
      return value > target;
    case "gte":
      return value >= target;
    case "lt":
      return value < target;
    case "lte":
      return value <= target;
    case "eq":
      return value === target;
    default:
      return false;
  }
}

/**
 * 获取时间范围的截止日期
 */
function getTimeframeCutoff(timeframe: string): string {
  const now = new Date();
  switch (timeframe) {
    case "1week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "1month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "1semester":
      return new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

/**
 * 创建预警记录
 */
async function createWarningRecord(
  student: any,
  rule: WarningRule
): Promise<boolean> {
  try {
    // 检查是否已存在相同的活跃预警
    const { data: existing } = await supabase
      .from("warning_records")
      .select("id")
      .eq("student_id", student.student_id)
      .eq("rule_id", rule.id)
      .eq("status", "active")
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ); // 7天内

    if (existing && existing.length > 0) {
      console.log(`学生 ${student.student_id} 已有相同预警，跳过`);
      return false;
    }

    const warningRecord = {
      student_id: student.student_id,
      rule_id: rule.id,
      details: {
        ruleName: rule.name,
        ruleDescription: rule.description,
        severity: rule.severity,
        studentName: student.name,
        className: student.class_name,
        triggeredConditions: rule.conditions.map((c) => c.description),
        generatedAt: new Date().toISOString(),
      },
      status: "active",
    };

    const { error } = await supabase
      .from("warning_records")
      .insert([warningRecord]);

    if (error) {
      console.error("创建预警记录失败:", error);
      return false;
    }

    console.log(`✅ 为学生 ${student.name} 创建预警记录: ${rule.name}`);
    return true;
  } catch (error) {
    console.error("创建预警记录失败:", error);
    return false;
  }
}

/**
 * 执行所有激活的预警规则
 */
export async function executeAllWarningRules(): Promise<{
  totalRules: number;
  executedRules: number;
  totalMatchedStudents: number;
  totalWarningsGenerated: number;
  executionTime: number;
  results: RuleExecutionResult[];
}> {
  const startTime = Date.now();

  try {
    console.log("🚀 开始执行所有预警规则...");

    const rules = await getWarningRules();
    const activeRules = rules.filter((rule) => rule.is_active);

    console.log(
      `找到 ${rules.length} 条规则，其中 ${activeRules.length} 条处于激活状态`
    );

    const results: RuleExecutionResult[] = [];
    let totalMatchedStudents = 0;
    let totalWarningsGenerated = 0;

    // 顺序执行规则以避免数据库负载过高
    for (const rule of activeRules) {
      try {
        const result = await executeWarningRule(rule);
        results.push(result);
        totalMatchedStudents += result.matchedStudents.length;
        totalWarningsGenerated += result.warningsGenerated;
      } catch (error) {
        console.error(`执行规则 ${rule.name} 失败:`, error);
        results.push({
          ruleId: rule.id,
          matchedStudents: [],
          warningsGenerated: 0,
          executionTime: 0,
          errors: [`执行失败: ${error}`],
        });
      }
    }

    const executionTime = Date.now() - startTime;

    const summary = {
      totalRules: rules.length,
      executedRules: activeRules.length,
      totalMatchedStudents,
      totalWarningsGenerated,
      executionTime,
      results,
    };

    console.log("✅ 预警规则执行完成:", summary);

    if (totalWarningsGenerated > 0) {
      toast.success(`预警规则执行完成，生成 ${totalWarningsGenerated} 条预警`, {
        description: `执行了 ${activeRules.length} 条规则，匹配 ${totalMatchedStudents} 名学生`,
      });
    } else {
      toast.info("预警规则执行完成，当前无需要预警的情况", {
        description: `已执行 ${activeRules.length} 条规则`,
      });
    }

    return summary;
  } catch (error) {
    console.error("执行预警规则失败:", error);
    toast.error("预警规则执行失败");

    return {
      totalRules: 0,
      executedRules: 0,
      totalMatchedStudents: 0,
      totalWarningsGenerated: 0,
      executionTime: Date.now() - startTime,
      results: [],
    };
  }
}
