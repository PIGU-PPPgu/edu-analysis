/**
 * 增值活动管理服务
 * 用于创建、管理和执行增值评价活动
 */

import { supabase } from "@/lib/supabase";
import type {
  ValueAddedActivity,
  ActivityStatus,
} from "@/types/valueAddedTypes";

import { calculateClassValueAdded } from "./classValueAddedService";
import { calculateTeacherValueAdded } from "./teacherValueAddedService";
import { calculateSubjectBalance } from "./subjectBalanceService";
import { calculateStudentValueAdded } from "./studentValueAddedService";
import {
  generateOverallDiagnostics,
  generateSubjectDiagnostics,
  generateClassDiagnostics,
  detectAnomalies,
  type AIAnalysisSummary,
  type AnalysisStats,
} from "./ai/diagnosticEngine";

// ============================================
// 活动创建和管理
// ============================================

export interface CreateActivityParams {
  name: string;
  description?: string;
  entryExamId: string;
  entryExamTitle: string;
  exitExamId: string;
  exitExamTitle: string;
  gradeLevel: string;
  studentYear: string;
  academicYear: string;
  semester: string;
  gradeLevelConfigId?: string;
}

export interface ActivityResult {
  success: boolean;
  activityId?: string;
  error?: string;
}

const SUBJECT_SCORE_FIELD_MAP: Record<string, string> = {
  total: "total_score",
  chinese: "chinese_score",
  math: "math_score",
  english: "english_score",
  physics: "physics_score",
  chemistry: "chemistry_score",
  biology: "biology_score",
  politics: "politics_score",
  history: "history_score",
  geography: "geography_score",
};

function isFiniteScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function countComparablePairs(params: {
  entryData: any[];
  exitDataByStudentId: Map<string, any>;
  scoreField: string;
  absentField: string;
}) {
  const { entryData, exitDataByStudentId, scoreField, absentField } = params;

  let count = 0;

  for (const entryRecord of entryData) {
    const exitRecord = exitDataByStudentId.get(entryRecord.student_id);
    if (!exitRecord) continue;

    const entryScore = entryRecord[scoreField];
    const exitScore = exitRecord[scoreField];

    if (!isFiniteScore(entryScore) || !isFiniteScore(exitScore)) {
      continue;
    }

    const isEntryAbsent = entryRecord[absentField] === true || entryScore === 0;
    const isExitAbsent = exitRecord[absentField] === true || exitScore === 0;

    if (isEntryAbsent || isExitAbsent) {
      continue;
    }

    count += 1;
  }

  return count;
}

/**
 * 创建增值活动
 */
export async function createValueAddedActivity(
  params: CreateActivityParams
): Promise<ActivityResult> {
  try {
    // 1. 验证入口和出口考试存在
    const { data: entryExam, error: entryError } = await supabase
      .from("grade_data")
      .select("exam_id")
      .eq("exam_id", params.entryExamId)
      .limit(1)
      .maybeSingle();

    if (entryError || !entryExam) {
      return {
        success: false,
        error: `入口考试不存在或无数据：${params.entryExamTitle}`,
      };
    }

    const { data: exitExam, error: exitError } = await supabase
      .from("grade_data")
      .select("exam_id")
      .eq("exam_id", params.exitExamId)
      .limit(1)
      .maybeSingle();

    if (exitError || !exitExam) {
      return {
        success: false,
        error: `出口考试不存在或无数据：${params.exitExamTitle}`,
      };
    }

    // 2. 检查是否已存在相同的活动
    const { data: existing } = await supabase
      .from("value_added_activities")
      .select("id")
      .eq("entry_exam_id", params.entryExamId)
      .eq("exit_exam_id", params.exitExamId)
      .eq("student_year", params.studentYear)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "已存在相同的增值活动（相同的入口、出口考试和年级）",
      };
    }

    // 3. 创建活动记录
    const { data: activity, error: createError } = await supabase
      .from("value_added_activities")
      .insert({
        name: params.name,
        description: params.description,
        entry_exam_id: params.entryExamId,
        entry_exam_title: params.entryExamTitle,
        exit_exam_id: params.exitExamId,
        exit_exam_title: params.exitExamTitle,
        grade_level: params.gradeLevel,
        student_year: params.studentYear,
        academic_year: params.academicYear,
        semester: params.semester,
        status: "pending",
        grade_level_config_id: params.gradeLevelConfigId,
      })
      .select()
      .single();

    if (createError || !activity) {
      return {
        success: false,
        error: `创建活动失败：${createError?.message}`,
      };
    }

    return {
      success: true,
      activityId: activity.id,
    };
  } catch (error) {
    console.error("创建增值活动失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 获取活动列表
 */
export async function getValueAddedActivities(filters?: {
  status?: ActivityStatus;
  gradeLevel?: string;
  academicYear?: string;
}): Promise<ValueAddedActivity[]> {
  try {
    let query = supabase
      .from("value_added_activities")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.gradeLevel) {
      query = query.eq("grade_level", filters.gradeLevel);
    }

    if (filters?.academicYear) {
      query = query.eq("academic_year", filters.academicYear);
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取活动列表失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取活动列表失败:", error);
    return [];
  }
}

/**
 * 获取单个活动详情
 */
export async function getActivityById(
  activityId: string
): Promise<ValueAddedActivity | null> {
  try {
    const { data, error } = await supabase
      .from("value_added_activities")
      .select("*")
      .eq("id", activityId)
      .single();

    if (error) {
      console.error("获取活动详情失败:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("获取活动详情失败:", error);
    return null;
  }
}

/**
 * 更新活动状态
 */
export async function updateActivityStatus(
  activityId: string,
  status: ActivityStatus,
  errorMessage?: string
): Promise<boolean> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from("value_added_activities")
      .update(updateData)
      .eq("id", activityId);

    if (error) {
      console.error("更新活动状态失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("更新活动状态失败:", error);
    return false;
  }
}

/**
 * 删除活动
 */
export async function deleteActivity(activityId: string): Promise<boolean> {
  try {
    // 1. 删除缓存数据
    await supabase
      .from("value_added_cache")
      .delete()
      .eq("activity_id", activityId);

    // 2. 删除活动记录
    const { error } = await supabase
      .from("value_added_activities")
      .delete()
      .eq("id", activityId);

    if (error) {
      console.error("删除活动失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("删除活动失败:", error);
    return false;
  }
}

/**
 * 清除活动缓存数据并重置状态（用于重新计算）
 */
export async function clearActivityCache(activityId: string): Promise<boolean> {
  try {
    // 1. 删除缓存数据
    const { error: cacheError } = await supabase
      .from("value_added_cache")
      .delete()
      .eq("activity_id", activityId);

    if (cacheError) {
      console.error("清除缓存失败:", cacheError);
      return false;
    }

    // 2. 重置活动状态为pending
    const { error: updateError } = await supabase
      .from("value_added_activities")
      .update({
        status: "pending",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activityId);

    if (updateError) {
      console.error("重置活动状态失败:", updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("清除缓存失败:", error);
    return false;
  }
}

// ============================================
// 增值计算执行
// ============================================

export interface CalculationProgress {
  step: string;
  progress: number;
  message: string;
}

export type ProgressCallback = (progress: CalculationProgress) => void;

/**
 * 执行增值计算
 */
export async function executeValueAddedCalculation(
  activityId: string,
  onProgress?: ProgressCallback
): Promise<ActivityResult> {
  try {
    // 1. 获取活动信息
    const activity = await getActivityById(activityId);
    if (!activity) {
      return { success: false, error: "活动不存在" };
    }

    // 2. 更新状态为计算中
    await updateActivityStatus(activityId, "analyzing");
    onProgress?.({
      step: "start",
      progress: 5,
      message: "正在准备计算环境...",
    });

    // 3. 获取入口和出口考试数据
    onProgress?.({
      step: "fetch",
      progress: 10,
      message: "正在读取考试数据...",
    });

    const { data: entryData, error: entryError } = await supabase
      .from("grade_data")
      .select("*")
      .eq("exam_id", activity.entry_exam_id);

    if (entryError || !entryData || entryData.length === 0) {
      await updateActivityStatus(activityId, "failed", "获取入口考试数据失败");
      return { success: false, error: "获取入口考试数据失败或无数据" };
    }

    const { data: exitData, error: exitError } = await supabase
      .from("grade_data")
      .select("*")
      .eq("exam_id", activity.exit_exam_id);

    if (exitError || !exitData || exitData.length === 0) {
      await updateActivityStatus(activityId, "failed", "获取出口考试数据失败");
      return { success: false, error: "获取出口考试数据失败或无数据" };
    }

    const exitDataByStudentId = new Map(
      exitData.map((record) => [record.student_id, record])
    );

    onProgress?.({
      step: "prepare",
      progress: 20,
      message: "正在分析教师和班级信息...",
    });

    // 4. 获取教师映射关系（从teacher_student_subjects表）

    // ✅ 修复：使用班级名称查询，不依赖可能不一致的config_id
    const uniqueClasses = Array.from(
      new Set(entryData.map((d) => d.class_name))
    );

    // 直接用班级名称查询所有教学关系
    // ⚠️ 重要：Supabase的.in()结合查询会被限制在1000条，需要分页查询
    let teacherMappingData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let tssQuery = supabase
        .from("teacher_student_subjects")
        .select("class_name, subject, teacher_id, teacher_name, student_id")
        .in("class_name", uniqueClasses);

      // ✅ 按学年筛选，避免跨年级教师数据混入
      // 格式归一化：活动可能存 "25-26"，表里存 "2024-2025"，两种都尝试
      if (activity.academic_year) {
        const normalizeYear = (y: string) => {
          // "25-26" -> "2024-2025"
          const m = y.match(/^(\d{2})-(\d{2})$/);
          if (m) return `20${m[1]}-20${m[2]}`;
          return y;
        };
        const normalizedYear = normalizeYear(activity.academic_year);
        // 用 OR 兼容两种格式
        tssQuery = tssQuery.or(
          `academic_year.eq.${activity.academic_year},academic_year.eq.${normalizedYear}`
        );
      }

      const { data, error } = await tssQuery.range(from, from + batchSize - 1);

      if (error) {
        console.warn(`⚠️ 查询教师映射失败 (offset ${from}):`, error);
        break;
      }

      if (data && data.length > 0) {
        teacherMappingData = teacherMappingData.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize; // 如果返回数据少于batchSize，说明已经到末尾
      } else {
        hasMore = false;
      }
    }

    // 建立 class_name + subject -> teacher_name 的映射
    const teacherMap = new Map<
      string,
      { teacher_id: string; teacher_name: string }
    >();

    // ✅ 动态提取所有存在的科目（从数据库数据中自动识别）
    const availableSubjects = new Set<string>();

    if (teacherMappingData && teacherMappingData.length > 0) {
      // 🔍 统计每个科目的映射数量
      const subjectCounts = new Map<string, number>();

      teacherMappingData.forEach((mapping) => {
        const key = `${mapping.class_name}_${mapping.subject}`;
        if (!teacherMap.has(key)) {
          teacherMap.set(key, {
            teacher_id: mapping.teacher_id,
            teacher_name: mapping.teacher_name,
          });
        }
        // 统计科目并收集所有存在的科目
        availableSubjects.add(mapping.subject);
        subjectCounts.set(
          mapping.subject,
          (subjectCounts.get(mapping.subject) || 0) + 1
        );
      });
    } else {
      console.warn("⚠️ 未找到教师映射数据，将使用默认命名");
    }

    // 5. 获取等级配置（优先使用活动绑定的配置，fallback 到默认）
    const levelConfig = await getLevelConfig(activity.grade_level_config_id);

    // 6. 动态构建科目映射（支持未来添加新科目）
    // 中文科目名 -> 英文key（用于grade_data表字段名）
    const subjectNameToKey: Record<string, string> = {
      语文: "chinese",
      数学: "math",
      英语: "english",
      物理: "physics",
      化学: "chemistry",
      生物: "biology",
      道法: "politics",
      政治: "politics", // 兼容两种命名
      历史: "history",
      地理: "geography",
    };

    // 英文key -> 中文名称（用于显示）
    const subjectKeyToName: Record<string, string> = {
      total: "总分", // ✅ 新增总分
      chinese: "语文",
      math: "数学",
      english: "英语",
      physics: "物理",
      chemistry: "化学",
      biology: "生物",
      politics: "道法",
      history: "历史",
      geography: "地理",
    };

    // ✅ 从数据库中动态识别的科目，转换为英文key
    const subjectCandidates = Array.from(availableSubjects).reduce<
      Array<{ key: string; teacherSubjectName: string }>
    >((items, chineseName) => {
      const key = subjectNameToKey[chineseName];
      if (!key || items.some((item) => item.key === key)) {
        return items;
      }

      items.push({ key, teacherSubjectName: chineseName });
      return items;
    }, []);

    const subjectTeacherNameMap = new Map<string, string>(
      subjectCandidates.map((item) => [item.key, item.teacherSubjectName])
    );

    const subjectSupport = [
      {
        key: "total",
        label: subjectKeyToName.total,
        teacherSubjectName: subjectKeyToName.total,
        comparablePairs: countComparablePairs({
          entryData,
          exitDataByStudentId,
          scoreField: SUBJECT_SCORE_FIELD_MAP.total,
          absentField: "total_absent",
        }),
      },
      ...subjectCandidates.map((subject) => ({
        key: subject.key,
        label: subjectKeyToName[subject.key] || subject.teacherSubjectName,
        teacherSubjectName: subject.teacherSubjectName,
        comparablePairs: countComparablePairs({
          entryData,
          exitDataByStudentId,
          scoreField:
            SUBJECT_SCORE_FIELD_MAP[subject.key] || `${subject.key}_score`,
          absentField: `${subject.key}_absent`,
        }),
      })),
    ];

    const subjects = subjectSupport
      .filter((subject) => subject.comparablePairs > 0)
      .map((subject) => subject.key);

    const unsupportedSubjects = subjectSupport.filter(
      (subject) => subject.comparablePairs === 0
    );

    if (unsupportedSubjects.length > 0) {
      console.warn(
        "⚠️ 以下科目因入口/出口缺少同科可比分数，已跳过增值计算：",
        unsupportedSubjects.map((subject) => subject.label)
      );
    }

    if (subjects.length === 0) {
      throw new Error("未识别到任何科目数据，请检查数据导入");
    }

    // 🔍 数据完整性校验：检查班级-科目组合是否都有教师信息
    // uniqueClasses 已在前面声明，此处直接使用

    const missingTeachers: Array<{ class: string; subject: string }> = [];
    const expectedMappings: Array<{ class: string; subject: string }> = [];

    const comparableTeachingSubjects = subjectSupport
      .filter(
        (subject) => subject.key !== "total" && subject.comparablePairs > 0
      )
      .map((subject) => subject.teacherSubjectName);

    for (const className of uniqueClasses) {
      for (const subject of comparableTeachingSubjects) {
        const key = `${className}_${subject}`;
        expectedMappings.push({ class: className, subject });

        if (!teacherMap.has(key)) {
          missingTeachers.push({ class: className, subject });
        }
      }
    }

    if (missingTeachers.length > 0) {
      console.warn(
        `\n⚠️ 数据完整性警告：${missingTeachers.length}个班级-科目组合缺少教师信息`
      );

      // 按科目分组显示缺失情况
      const missingBySubject = new Map<string, string[]>();
      missingTeachers.forEach(({ class: cls, subject }) => {
        if (!missingBySubject.has(subject)) {
          missingBySubject.set(subject, []);
        }
        missingBySubject.get(subject)!.push(cls);
      });

      console.warn(`\n缺失详情（按科目）:`);
      Array.from(missingBySubject.entries()).forEach(([subject, classes]) => {
        console.warn(
          `   ${subject}: ${classes.length}个班级 - ${classes.slice(0, 3).join(", ")}${classes.length > 3 ? "..." : ""}`
        );
      });

      console.warn(
        `\n💡 建议：请检查教学编排数据（TeachingArrangement）是否完整导入`
      );
      console.warn(
        `   这些班级-科目组合将使用"未知教师"标识，但不影响增值计算\n`
      );
    }

    // 7. 按科目计算班级和学生增值
    onProgress?.({
      step: "calculate",
      progress: 30,
      message: `开始分析 ${subjects.length} 个科目的增值情况...`,
    });

    let progressStep = 30;
    const progressIncrement = 50 / subjects.length;

    // ✅ 收集所有结果，最后批量插入
    const allClassResults: any[] = [];
    const allTeacherResults: any[] = [];
    const allStudentResults: any[] = [];

    for (const subject of subjects) {
      // ✅ 总分特殊处理：直接使用total_score字段
      const scoreField =
        subject === "total" ? "total_score" : `${subject}_score`;
      const absentField =
        subject === "total" ? "total_absent" : `${subject}_absent`; // ✅ 缺考标记字段

      // 构建学生成绩数据
      const studentGrades = entryData
        .map((entryRecord) => {
          const exitRecord = exitDataByStudentId.get(entryRecord.student_id);
          if (!exitRecord) return null;

          const entryScore = entryRecord[scoreField];
          const exitScore = exitRecord[scoreField];
          const entryAbsent = entryRecord[absentField]; // ✅ 入口是否缺考
          const exitAbsent = exitRecord[absentField]; // ✅ 出口是否缺考

          // ✅ 跳过无效数据：null/undefined
          if (
            entryScore === null ||
            entryScore === undefined ||
            exitScore === null ||
            exitScore === undefined
          ) {
            return null;
          }

          // ✅ 强化缺考判断：absent字段 OR 0分（混合模式）
          // 理由：K12教育场景中，真实考0分几乎不存在，0分基本等同缺考
          const isEntryAbsent = entryAbsent === true || entryScore === 0;
          const isExitAbsent = exitAbsent === true || exitScore === 0;

          if (isEntryAbsent || isExitAbsent) {
            return null;
          }

          // ✅ 此时所有进入计算的成绩都是有效分数
          // 注入教师信息（用于教师增值计算）
          let teacherId: string;
          let teacherName: string;

          if (subject === "total") {
            teacherId = `class_${entryRecord.class_name}`;
            teacherName = entryRecord.class_name;
          } else {
            const teacherSubjectName =
              subjectTeacherNameMap.get(subject) || subjectKeyToName[subject];
            const teacherKey = `${entryRecord.class_name}_${teacherSubjectName}`;
            const teacherInfo = teacherMap.get(teacherKey);
            teacherId =
              teacherInfo?.teacher_id ??
              `unknown_${entryRecord.class_name}_${subjectKeyToName[subject]}`;
            teacherName =
              teacherInfo?.teacher_name ??
              `${entryRecord.class_name} ${subjectKeyToName[subject]}教师`;
          }

          return {
            student_id: entryRecord.student_id,
            student_name: entryRecord.name,
            class_name: entryRecord.class_name,
            teacher_id: teacherId,
            teacher_name: teacherName,
            subject: subjectKeyToName[subject],
            entry_score: entryScore,
            exit_score: exitScore,
          };
        })
        .filter(Boolean);

      if (studentGrades.length === 0) {
        continue;
      }

      try {
        // 计算班级增值
        const classResults = await calculateClassValueAdded({
          studentGrades: studentGrades as any,
          subject: subjectKeyToName[subject],
          levelDefinitions: levelConfig,
          gradeStudents: studentGrades as any,
        });

        // 收集班级结果
        for (const classResult of classResults) {
          allClassResults.push({
            activity_id: activityId,
            report_type: "class_value_added",
            dimension: "class",
            target_id: `${classResult.class_name}_${subjectKeyToName[subject]}`,
            target_name: classResult.class_name,
            result: classResult as any,
          });
        }

        // 计算教师增值（使用真实教师分组，而非复制班级数据）
        const teacherResults = await calculateTeacherValueAdded({
          studentGrades: studentGrades as any,
          subject: subjectKeyToName[subject],
          levelDefinitions: levelConfig,
          allSubjectStudents: studentGrades as any,
        });

        for (const teacherResult of teacherResults) {
          allTeacherResults.push({
            activity_id: activityId,
            report_type: "teacher_value_added",
            dimension: "teacher",
            target_id: `${teacherResult.teacher_id}_${teacherResult.class_name}_${subjectKeyToName[subject]}`,
            target_name: teacherResult.teacher_name,
            result: teacherResult as any,
          });
        }

        // ✅ 计算学生增值（使用正确的Z分数和等级计算）
        const studentResults = await calculateStudentValueAdded({
          allStudents: studentGrades as any,
          subject: subjectKeyToName[subject],
          levelDefinitions: levelConfig,
        });

        // 收集学生结果
        for (const studentResult of studentResults) {
          allStudentResults.push({
            activity_id: activityId,
            report_type: "student_value_added",
            dimension: "student",
            target_id: `${studentResult.student_id}_${subjectKeyToName[subject]}`,
            target_name: studentResult.student_name,
            result: studentResult as any,
          });
        }
      } catch (error) {
        console.error(
          `❌ [学生计算] ${subjectKeyToName[subject]} 出错:`,
          error
        );
        // 继续处理其他科目
      }

      progressStep += progressIncrement;
      onProgress?.({
        step: "calculate",
        progress: Math.min(progressStep, 80),
        message: `正在分析${subjectKeyToName[subject]}的班级、教师和学生表现...`,
      });
    }

    // 7. 【已移除聚合逻辑】保持细粒度存储：每个(教师, 班级, 科目)组合一条记录
    // 教师数据将以原始细粒度形式存储，不再聚合

    // 8. 计算学科均衡（新增）
    onProgress?.({
      step: "calculate",
      progress: 82,
      message: "正在分析各科目发展均衡度...",
    });

    const subjectBalanceResults: any[] = [];

    if (allClassResults.length > 0) {
      // 从班级结果中提取班级-科目数据
      const classSubjectData = allClassResults.map((item) => {
        const result = item.result;
        return {
          class_name: result.class_name,
          subject: result.subject,
          entry_score: result.avg_score_entry || 0, // 使用正确的字段名
          exit_score: result.avg_score_exit || 0,
        };
      });

      try {
        // 调用学科均衡计算服务
        const balanceAnalyses = await calculateSubjectBalance({
          classSubjectData,
        });

        // 包装结果
        for (const analysis of balanceAnalyses) {
          subjectBalanceResults.push({
            activity_id: activityId,
            report_type: "subject_balance",
            dimension: "class",
            target_id: analysis.class_name,
            target_name: analysis.class_name,
            result: analysis as any,
          });
        }
      } catch (error) {
        console.error("计算学科均衡失败:", error);
        // 不中断流程，继续保存其他结果
      }
    }

    // 9. 批量保存计算结果
    onProgress?.({
      step: "save",
      progress: 85,
      message: "正在保存班级增值分析结果...",
    });

    if (allClassResults.length > 0) {
      const { error: classError } = await supabase
        .from("value_added_cache")
        .insert(allClassResults);

      if (classError) {
        console.error("保存班级结果失败:", classError);
        throw new Error(`保存班级结果失败: ${classError.message}`);
      }
    }

    onProgress?.({
      step: "save",
      progress: 87,
      message: "正在保存教师增值分析结果...",
    });

    if (allTeacherResults.length > 0) {
      const { error: teacherError } = await supabase
        .from("value_added_cache")
        .insert(allTeacherResults);

      if (teacherError) {
        console.error("保存教师结果失败:", teacherError);
        throw new Error(`保存教师结果失败: ${teacherError.message}`);
      }
    }

    onProgress?.({
      step: "save",
      progress: 90,
      message: "正在保存学生增值分析结果...",
    });

    if (allStudentResults.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < allStudentResults.length; i += BATCH_SIZE) {
        const batch = allStudentResults.slice(i, i + BATCH_SIZE);
        const { error: studentError } = await supabase
          .from("value_added_cache")
          .insert(batch);

        if (studentError) {
          console.error(
            `保存学生结果批次 ${i / BATCH_SIZE + 1} 失败:`,
            studentError
          );
          throw new Error(`保存学生结果失败: ${studentError.message}`);
        }
      }
    }

    onProgress?.({
      step: "save",
      progress: 95,
      message: "正在保存学科均衡分析结果...",
    });

    if (subjectBalanceResults.length > 0) {
      const { error: balanceError } = await supabase
        .from("value_added_cache")
        .insert(subjectBalanceResults);

      if (balanceError) {
        console.error("保存学科均衡结果失败:", balanceError);
        throw new Error(`保存学科均衡结果失败: ${balanceError.message}`);
      }
    }

    // 10. AI智能分析摘要预计算（Phase 1新增）
    onProgress?.({
      step: "ai_analysis",
      progress: 97,
      message: "正在生成AI智能分析摘要...",
    });

    try {
      const aiSummary = await generateAIAnalysisSummary(
        activityId,
        allStudentResults,
        allClassResults
      );

      if (aiSummary) {
        const { error: aiError } = await supabase
          .from("value_added_cache")
          .insert({
            activity_id: activityId,
            report_type: "ai_analysis_summary",
            dimension: "activity",
            target_id: activityId,
            target_name: activity.name,
            result: aiSummary as any,
          });

        if (aiError) {
          console.error("保存AI分析摘要失败:", aiError);
          // 不阻断流程，仅记录错误
        }
      }
    } catch (error) {
      console.error("生成AI分析摘要失败:", error);
      // 不阻断流程，仅记录错误
    }

    // 11. 更新活动状态为完成
    await updateActivityStatus(activityId, "completed");
    onProgress?.({
      step: "complete",
      progress: 100,
      message: "✓ 所有分析已完成！",
    });

    return { success: true, activityId };
  } catch (error) {
    console.error("执行增值计算失败:", error);
    await updateActivityStatus(
      activityId,
      "failed",
      error instanceof Error ? error.message : "未知错误"
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取等级配置：优先使用活动绑定的 configId，fallback 到 is_default=true
 */
async function getLevelConfig(configId?: string | null) {
  if (configId) {
    const { data } = await supabase
      .from("grade_levels_config")
      .select("*")
      .eq("id", configId)
      .single();
    if (data) return data.levels;
  }
  return getDefaultLevelConfig();
}

/**
 * 获取默认等级配置
 */
async function getDefaultLevelConfig() {
  const { data } = await supabase
    .from("grade_levels_config")
    .select("*")
    .eq("is_default", true)
    .single();

  if (data) {
    return data.levels;
  }

  // 返回默认配置
  return [
    {
      level: "A+",
      label: "优秀+",
      percentile: { min: 0, max: 0.05 },
      color: "#10b981",
      description: "前5%",
    },
    {
      level: "A",
      label: "优秀",
      percentile: { min: 0.05, max: 0.25 },
      color: "#3b82f6",
      description: "5-25%",
    },
    {
      level: "B+",
      label: "良好+",
      percentile: { min: 0.25, max: 0.5 },
      color: "#8b5cf6",
      description: "25-50%",
    },
    {
      level: "B",
      label: "良好",
      percentile: { min: 0.5, max: 0.75 },
      color: "#f59e0b",
      description: "50-75%",
    },
    {
      level: "C+",
      label: "合格+",
      percentile: { min: 0.75, max: 0.95 },
      color: "#ef4444",
      description: "75-95%",
    },
    {
      level: "C",
      label: "合格",
      percentile: { min: 0.95, max: 1.0 },
      color: "#6b7280",
      description: "95-100%",
    },
  ];
}

/**
 * 获取活动统计信息
 */
export async function getActivityStatistics() {
  try {
    const { data, error } = await supabase
      .from("value_added_activities")
      .select("status");

    if (error) {
      console.error("获取活动统计失败:", error);
      return {
        total: 0,
        pending: 0,
        analyzing: 0,
        completed: 0,
        failed: 0,
      };
    }

    const stats = {
      total: data.length,
      pending: data.filter((a) => a.status === "pending").length,
      analyzing: data.filter((a) => a.status === "analyzing").length,
      completed: data.filter((a) => a.status === "completed").length,
      failed: data.filter((a) => a.status === "failed").length,
    };

    return stats;
  } catch (error) {
    console.error("获取活动统计失败:", error);
    return {
      total: 0,
      pending: 0,
      analyzing: 0,
      completed: 0,
      failed: 0,
    };
  }
}

// ============================================
// AI智能分析摘要生成（Phase 1新增）
// ============================================

/**
 * 生成AI智能分析摘要
 * 从已缓存的学生和班级结果中提取统计数据，生成诊断建议
 */
async function generateAIAnalysisSummary(
  activityId: string,
  allStudentResults: any[],
  allClassResults: any[]
): Promise<AIAnalysisSummary | null> {
  const startTime = Date.now();

  try {
    if (allStudentResults.length === 0) {
      console.warn("学生结果为空，跳过AI分析摘要生成");
      return null;
    }

    // 1. 提取所有学生数据（从result字段）
    const students = allStudentResults.map((item) => item.result);

    // 2. 计算整体统计
    const totalStudents = new Set(students.map((s) => s.student_id)).size;
    const progressCount = students.filter(
      (s) => s.score_value_added > 0
    ).length;
    const consolidatedCount = students.filter((s) => s.is_consolidated).length;
    const transformedCount = students.filter((s) => s.is_transformed).length;
    const avgScoreChange =
      students.reduce((sum, s) => sum + (s.score_value_added || 0), 0) /
      students.length;

    const overallStats = {
      totalStudents,
      avgScoreChange,
      progressRate: (progressCount / students.length) * 100,
      consolidationRate: (consolidatedCount / students.length) * 100,
      transformationRate: (transformedCount / students.length) * 100,
    };

    // 3. 按科目统计
    const subjectMap = new Map<string, any[]>();
    students.forEach((s) => {
      if (!subjectMap.has(s.subject)) {
        subjectMap.set(s.subject, []);
      }
      subjectMap.get(s.subject)!.push(s);
    });

    const subjectStats: AnalysisStats["subjectStats"] = [];
    const subjectSummaries: AIAnalysisSummary["subjectSummaries"] = [];

    for (const [subject, subjectStudents] of subjectMap) {
      const subjectProgressCount = subjectStudents.filter(
        (s) => s.score_value_added > 0
      ).length;
      const subjectAvgChange =
        subjectStudents.reduce(
          (sum, s) => sum + (s.score_value_added || 0),
          0
        ) / subjectStudents.length;

      // 计算优秀生和后进生占比
      const highAchieverCount = subjectStudents.filter(
        (s) => s.exit_level === "A+" || s.exit_level === "A"
      ).length;
      const lowAchieverCount = subjectStudents.filter(
        (s) => s.exit_level === "C+" || s.exit_level === "C"
      ).length;

      const stats = {
        subject,
        studentCount: subjectStudents.length,
        avgScoreChange: subjectAvgChange,
        progressRate: (subjectProgressCount / subjectStudents.length) * 100,
        highAchieverRate: (highAchieverCount / subjectStudents.length) * 100,
        lowAchieverRate: (lowAchieverCount / subjectStudents.length) * 100,
      };

      subjectStats.push(stats);

      // 找出该科目进步最快的班级（Top 3）
      const classBySubject = new Map<string, any[]>();
      subjectStudents.forEach((s) => {
        if (!classBySubject.has(s.class_name)) {
          classBySubject.set(s.class_name, []);
        }
        classBySubject.get(s.class_name)!.push(s);
      });

      const classAvgChanges = Array.from(classBySubject.entries())
        .map(([className, classStudents]) => ({
          className,
          avgChange:
            classStudents.reduce((sum, s) => sum + s.score_value_added, 0) /
            classStudents.length,
        }))
        .sort((a, b) => b.avgChange - a.avgChange);

      const topClasses = classAvgChanges.slice(0, 3).map((c) => c.className);

      // 生成科目诊断建议
      const diagnostics = generateSubjectDiagnostics(stats);

      subjectSummaries.push({
        subject,
        studentCount: subjectStudents.length,
        avgScoreChange: subjectAvgChange,
        progressRate: stats.progressRate,
        topClasses,
        diagnostics,
      });
    }

    // 4. 按班级统计
    const classMap = new Map<string, any[]>();
    students.forEach((s) => {
      if (!classMap.has(s.class_name)) {
        classMap.set(s.class_name, []);
      }
      classMap.get(s.class_name)!.push(s);
    });

    const classStats: AnalysisStats["classStats"] = [];
    const classSummaries: AIAnalysisSummary["classSummaries"] = [];

    for (const [className, classStudents] of classMap) {
      const classProgressCount = classStudents.filter(
        (s) => s.score_value_added > 0
      ).length;
      const classAvgChange =
        classStudents.reduce((sum, s) => sum + (s.score_value_added || 0), 0) /
        classStudents.length;

      // 计算学科均衡度（使用标准差倒数）
      const subjectAvgs = Array.from(
        new Set(classStudents.map((s) => s.subject))
      ).map((subject) => {
        const subjectStudents = classStudents.filter(
          (s) => s.subject === subject
        );
        return (
          subjectStudents.reduce((sum, s) => sum + s.score_value_added, 0) /
          subjectStudents.length
        );
      });

      const mean =
        subjectAvgs.reduce((sum, v) => sum + v, 0) / subjectAvgs.length;
      const variance =
        subjectAvgs.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
        subjectAvgs.length;
      const stdDev = Math.sqrt(variance);
      const subjectBalance = stdDev === 0 ? 1 : 1 / (1 + stdDev);

      const stats = {
        className,
        studentCount: new Set(classStudents.map((s) => s.student_id)).size,
        avgScoreChange: classAvgChange,
        progressRate: (classProgressCount / classStudents.length) * 100,
        subjectBalance,
      };

      classStats.push(stats);

      // 找出该班级表现最好的科目（Top 3）
      const subjectByClass = new Map<string, any[]>();
      classStudents.forEach((s) => {
        if (!subjectByClass.has(s.subject)) {
          subjectByClass.set(s.subject, []);
        }
        subjectByClass.get(s.subject)!.push(s);
      });

      const subjectAvgChanges = Array.from(subjectByClass.entries())
        .map(([subject, subjectStudents]) => ({
          subject,
          avgChange:
            subjectStudents.reduce((sum, s) => sum + s.score_value_added, 0) /
            subjectStudents.length,
        }))
        .sort((a, b) => b.avgChange - a.avgChange);

      const topSubjects = subjectAvgChanges.slice(0, 3).map((s) => s.subject);

      // 生成班级诊断建议
      const diagnostics = generateClassDiagnostics(stats);

      classSummaries.push({
        className,
        studentCount: stats.studentCount,
        avgScoreChange: classAvgChange,
        progressRate: stats.progressRate,
        subjectBalance,
        topSubjects,
        diagnostics,
      });
    }

    // 5. 异常检测
    const analysisStats: AnalysisStats = {
      ...overallStats,
      subjectStats,
      classStats,
    };
    const anomalies = detectAnomalies(analysisStats);
    analysisStats.anomalies = anomalies;

    // 6. 生成整体诊断建议
    const overallDiagnostics = generateOverallDiagnostics(analysisStats);

    // 7. 计算性能指标
    const calculationTime = Date.now() - startTime;
    const dataPoints = students.length;
    const cacheSize = JSON.stringify({
      overallStats,
      subjectSummaries,
      classSummaries,
      overallDiagnostics,
    }).length;

    const aiSummary: AIAnalysisSummary = {
      activityId,
      generatedAt: new Date().toISOString(),
      overallStats,
      subjectSummaries,
      classSummaries,
      overallDiagnostics,
      performanceMetrics: {
        calculationTime,
        dataPoints,
        cacheSize,
      },
    };

    return aiSummary;
  } catch (error) {
    console.error("生成AI分析摘要失败:", error);
    return null;
  }
}
