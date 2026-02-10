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
    onProgress?.({ step: "start", progress: 0, message: "开始计算..." });

    // 3. 获取入口和出口考试数据
    onProgress?.({ step: "fetch", progress: 10, message: "获取考试数据..." });

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

    onProgress?.({ step: "prepare", progress: 20, message: "准备计算数据..." });

    // 4. 获取教师映射关系（从teacher_student_subjects表）
    console.log("🔍 查询教师映射关系...");

    // ✅ 修复：使用班级名称查询，不依赖可能不一致的config_id
    const uniqueClasses = Array.from(
      new Set(entryData.map((d) => d.class_name))
    );

    console.log(
      `📚 涉及班级: ${uniqueClasses.length}个`,
      uniqueClasses.slice(0, 5)
    );

    // 直接用班级名称查询所有教学关系
    // ⚠️ 重要：Supabase的.in()结合查询会被限制在1000条，需要分页查询
    let teacherMappingData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("teacher_student_subjects")
        .select("class_name, subject, teacher_id, teacher_name, student_id")
        .in("class_name", uniqueClasses)
        .range(from, from + batchSize - 1);

      if (error) {
        console.warn(`⚠️ 查询教师映射失败 (offset ${from}):`, error);
        break;
      }

      if (data && data.length > 0) {
        teacherMappingData = teacherMappingData.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize; // 如果返回数据少于batchSize，说明已经到末尾
        console.log(`  已获取 ${teacherMappingData.length} 条记录...`);
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ 查询到 ${teacherMappingData?.length || 0} 条教师映射记录`);

    // 建立 class_name + subject -> teacher_name 的映射
    const teacherMap = new Map<
      string,
      { teacher_id: string; teacher_name: string }
    >();

    // ✅ 动态提取所有存在的科目（从数据库数据中自动识别）
    const availableSubjects = new Set<string>();

    if (teacherMappingData && teacherMappingData.length > 0) {
      console.log(
        `📊 教师映射原始数据样本 (前3条):`,
        teacherMappingData.slice(0, 3)
      );

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

      console.log(`✅ 成功建立教师映射，共 ${teacherMap.size} 个班级-科目组合`);
      console.log(
        `📊 映射键样本 (前8个):`,
        Array.from(teacherMap.keys()).slice(0, 8)
      );
      console.log(`📊 动态识别的科目:`, Array.from(availableSubjects));
      console.log(`📊 数据库中的科目分布:`, Object.fromEntries(subjectCounts));
    } else {
      console.warn("⚠️ 未找到教师映射数据，将使用默认命名");
    }

    // 5. 获取等级配置
    const levelConfig = await getDefaultLevelConfig();

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
    const subjects = Array.from(availableSubjects)
      .map((chineseName) => subjectNameToKey[chineseName])
      .filter((key) => key !== undefined); // 过滤未知科目

    console.log(`✅ 动态识别科目: ${availableSubjects.size}个`, {
      中文: Array.from(availableSubjects),
      英文: subjects,
      映射: subjects.map((key) => `${key} -> ${subjectKeyToName[key]}`),
    });

    if (subjects.length === 0) {
      throw new Error("未识别到任何科目数据，请检查数据导入");
    }

    // 🔍 数据完整性校验：检查班级-科目组合是否都有教师信息
    console.log("\n🔍 开始数据完整性校验...");
    // uniqueClasses 已在前面声明，此处直接使用

    const missingTeachers: Array<{ class: string; subject: string }> = [];
    const expectedMappings: Array<{ class: string; subject: string }> = [];

    for (const className of uniqueClasses) {
      for (const subject of Array.from(availableSubjects)) {
        const key = `${className}_${subject}`;
        expectedMappings.push({ class: className, subject });

        if (!teacherMap.has(key)) {
          missingTeachers.push({ class: className, subject });
        }
      }
    }

    console.log(`📊 校验结果:`);
    console.log(
      `   期望映射数: ${expectedMappings.length} (${uniqueClasses.length}个班级 × ${availableSubjects.size}个科目)`
    );
    console.log(`   实际映射数: ${teacherMap.size}`);
    console.log(`   缺失映射数: ${missingTeachers.length}`);

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
    } else {
      console.log(`✅ 数据完整性检查通过：所有班级-科目组合都有教师信息\n`);
    }

    // 7. 按科目计算班级和学生增值
    onProgress?.({
      step: "calculate",
      progress: 30,
      message: "计算增值数据...",
    });

    let progressStep = 30;
    const progressIncrement = 50 / subjects.length;

    // ✅ 收集所有结果，最后批量插入
    const allClassResults: any[] = [];
    const allTeacherResults: any[] = [];
    const allStudentResults: any[] = [];

    for (const subject of subjects) {
      const scoreField = `${subject}_score`;
      const absentField = `${subject}_absent`; // ✅ 缺考标记字段

      // 构建学生成绩数据
      const studentGrades = entryData
        .map((entryRecord) => {
          const exitRecord = exitData.find(
            (e) => e.student_id === entryRecord.student_id
          );
          if (!exitRecord) return null;

          const entryScore = entryRecord[scoreField];
          const exitScore = exitRecord[scoreField];
          const entryAbsent = entryRecord[absentField]; // ✅ 入口是否缺考
          const exitAbsent = exitRecord[absentField]; // ✅ 出口是否缺考

          // ✅ 跳过无效数据：null/undefined
          if (entryScore == null || exitScore == null) {
            return null;
          }

          // ✅ 强化缺考判断：absent字段 OR 0分（混合模式）
          // 理由：K12教育场景中，真实考0分几乎不存在，0分基本等同缺考
          const isEntryAbsent = entryAbsent === true || entryScore === 0;
          const isExitAbsent = exitAbsent === true || exitScore === 0;

          if (isEntryAbsent || isExitAbsent) {
            console.log(
              `跳过缺考/0分学生: ${entryRecord.name} (${subjectKeyToName[subject]}, 入口:${entryScore}, 出口:${exitScore})`
            );
            return null;
          }

          // ✅ 此时所有进入计算的成绩都是有效分数
          return {
            student_id: entryRecord.student_id,
            student_name: entryRecord.name,
            class_name: entryRecord.class_name,
            subject: subjectKeyToName[subject],
            entry_score: entryScore,
            exit_score: exitScore,
          };
        })
        .filter(Boolean);

      if (studentGrades.length === 0) {
        console.log(`${subjectKeyToName[subject]} 无有效数据，跳过`);
        continue;
      }

      console.log(
        `开始计算 ${subjectKeyToName[subject]}，学生数: ${studentGrades.length}`
      );

      try {
        // 计算班级增值
        const classResults = await calculateClassValueAdded({
          studentGrades: studentGrades as any,
          subject: subjectKeyToName[subject],
          levelDefinitions: levelConfig,
          gradeStudents: studentGrades as any,
        });

        console.log(
          `${subjectKeyToName[subject]} 班级增值计算完成，班级数: ${classResults.length}`
        );

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

          // ✅ 保存教师增值（使用真实教师信息）
          const teacherKey = `${classResult.class_name}_${subjectKeyToName[subject]}`;
          const teacherInfo = teacherMap.get(teacherKey);

          // 如果找到真实教师，使用真实信息；否则使用班级+科目作为唯一标识
          let teacherId: string;
          let teacherName: string;

          if (teacherInfo) {
            // 有真实教师信息
            teacherId = teacherInfo.teacher_id;
            teacherName = teacherInfo.teacher_name;
          } else {
            // 没有教师信息，使用唯一标识避免错误聚合（已在前面统一提示）
            teacherId = `unknown_${classResult.class_name}_${subjectKeyToName[subject]}`;
            teacherName = `${classResult.class_name} ${subjectKeyToName[subject]}教师`;
          }

          allTeacherResults.push({
            activity_id: activityId,
            report_type: "teacher_value_added",
            dimension: "teacher",
            target_id: `${teacherId}_${classResult.class_name}_${subjectKeyToName[subject]}`, // 包含班级，确保细粒度存储
            target_name: teacherName,
            result: {
              teacher_id: teacherId,
              teacher_name: teacherName,
              subject: classResult.subject,
              class_name: classResult.class_name, // 单个班级名称（细粒度存储）
              ...classResult,
            } as any,
          });
        }

        // ✅ 计算学生增值（使用正确的Z分数和等级计算）
        const studentResults = await calculateStudentValueAdded({
          allStudents: studentGrades as any,
          subject: subjectKeyToName[subject],
          levelDefinitions: levelConfig,
        });

        console.log(
          `${subjectKeyToName[subject]} 学生增值计算完成，学生数: ${studentResults.length}`
        );

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
        console.error(`计算 ${subjectKeyToName[subject]} 时出错:`, error);
        // 继续处理其他科目
      }

      progressStep += progressIncrement;
      onProgress?.({
        step: "calculate",
        progress: Math.min(progressStep, 80),
        message: `计算${subjectKeyToName[subject]}增值...`,
      });
    }

    // 7. 【已移除聚合逻辑】保持细粒度存储：每个(教师, 班级, 科目)组合一条记录
    // 教师数据将以原始细粒度形式存储，不再聚合
    console.log(
      `✅ 教师数据准备完成: ${allTeacherResults.length} 条记录（细粒度存储）`
    );

    // 8. 计算学科均衡（新增）
    console.log("🔍 开始计算学科均衡...");
    onProgress?.({
      step: "calculate",
      progress: 82,
      message: "计算学科均衡...",
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

        console.log(`✅ 学科均衡计算完成，班级数: ${balanceAnalyses.length}`);

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
      message: "保存班级增值结果...",
    });

    if (allClassResults.length > 0) {
      console.log(`批量插入 ${allClassResults.length} 条班级结果`);
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
      message: "保存教师增值结果...",
    });

    if (allTeacherResults.length > 0) {
      console.log(
        `批量插入 ${allTeacherResults.length} 条教师结果（细粒度存储：每个教师-班级-科目组合一条）`
      );
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
      message: "保存学生增值结果...",
    });

    if (allStudentResults.length > 0) {
      console.log(`批量插入 ${allStudentResults.length} 条学生结果`);
      const { error: studentError } = await supabase
        .from("value_added_cache")
        .insert(allStudentResults);

      if (studentError) {
        console.error("保存学生结果失败:", studentError);
        throw new Error(`保存学生结果失败: ${studentError.message}`);
      }
    }

    onProgress?.({
      step: "save",
      progress: 95,
      message: "保存学科均衡结果...",
    });

    if (subjectBalanceResults.length > 0) {
      console.log(`批量插入 ${subjectBalanceResults.length} 条学科均衡结果`);
      const { error: balanceError } = await supabase
        .from("value_added_cache")
        .insert(subjectBalanceResults);

      if (balanceError) {
        console.error("保存学科均衡结果失败:", balanceError);
        throw new Error(`保存学科均衡结果失败: ${balanceError.message}`);
      }
    }

    // 10. 更新活动状态为完成
    await updateActivityStatus(activityId, "completed");
    onProgress?.({ step: "complete", progress: 100, message: "计算完成！" });

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
