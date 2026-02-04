/**
 * 历次追踪数据查询服务
 * 用于查询教师、班级、学生的历次考试表现
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  HistoricalTracking,
  ScoreTrendPoint,
  AbilityTrendPoint,
  ExamInSeries,
} from "@/types/valueAddedTypes";

/**
 * 查询教师历次表现
 */
export async function fetchTeacherHistoricalData(
  teacherId: string,
  subject: string
): Promise<HistoricalTracking | null> {
  try {
    // 1. 查询该教师该科目的所有增值活动缓存
    const { data: cacheData, error: cacheError } = await supabase
      .from("value_added_cache")
      .select("*")
      .eq("dimension", "teacher")
      .eq("target_id", teacherId)
      .order("created_at", { ascending: true });

    if (cacheError) throw cacheError;
    if (!cacheData || cacheData.length === 0) return null;

    // 2. 筛选该科目的数据
    const subjectData = cacheData.filter((cache) => {
      const result = cache.result;
      return result && result.subject === subject;
    });

    if (subjectData.length === 0) return null;

    // 3. 获取关联的活动信息
    const activityIds = subjectData.map((d) => d.activity_id);
    const { data: activities, error: actError } = await supabase
      .from("value_added_activities")
      .select("*")
      .in("id", activityIds)
      .order("created_at", { ascending: true });

    if (actError) throw actError;
    if (!activities) return null;

    // 4. 创建活动Map缓存(性能优化)
    const activityById = new Map(activities.map((a) => [a.id, a]));

    // 5. 构建考试序列
    const examSeries: ExamInSeries[] = activities.map((activity, index) => ({
      exam_id: activity.exit_exam_id,
      exam_title: activity.exit_exam_title,
      exam_date: activity.created_at,
      sequence: index + 1,
    }));

    // 6. 构建分数趋势
    const scoreTrend: ScoreTrendPoint[] = subjectData.map((cache, index) => {
      const result = cache.result;
      const activity = activityById.get(cache.activity_id);

      return {
        exam_id: activity?.exit_exam_id || "",
        exam_title: activity?.exit_exam_title || "",
        exam_date: activity?.created_at || "",
        avg_score: result.avg_score_exit || 0,
        z_score: result.avg_z_score_change || 0,
        value_added_rate: result.avg_score_value_added_rate || 0,
        rank: result.rank_in_subject,
      };
    });

    // 7. 构建能力趋势
    const abilityTrend: AbilityTrendPoint[] = subjectData.map(
      (cache, index) => {
        const result = cache.result;
        const activity = activityById.get(cache.activity_id);
        const total = Number(result.total_students) || 0;
        const excellentRate =
          total > 0 ? Number(result.exit_excellent_count) / total : 0;

        return {
          exam_id: activity?.exit_exam_id || "",
          exam_title: activity?.exit_exam_title || "",
          exam_date: activity?.created_at || "",
          excellent_rate: excellentRate,
          consolidation_rate: result.consolidation_rate || 0,
          transformation_rate: result.transformation_rate || 0,
          contribution_rate: result.contribution_rate || 0,
        };
      }
    );

    const firstResult = subjectData[0].result;

    return {
      target_id: teacherId,
      target_name: firstResult.teacher_name || "",
      target_type: "teacher",
      subject,
      exam_series: examSeries,
      score_trend: scoreTrend,
      ability_trend: abilityTrend,
    };
  } catch (error) {
    console.error("Error fetching teacher historical data:", error);
    return null;
  }
}

/**
 * 查询班级历次表现
 */
export async function fetchClassHistoricalData(
  className: string,
  subject: string
): Promise<HistoricalTracking | null> {
  try {
    const { data: cacheData, error: cacheError } = await supabase
      .from("value_added_cache")
      .select("*")
      .eq("dimension", "class")
      .eq("target_name", className)
      .order("created_at", { ascending: true });

    if (cacheError) throw cacheError;
    if (!cacheData || cacheData.length === 0) return null;

    const subjectData = cacheData.filter((cache) => {
      const result = cache.result;
      return result && result.subject === subject;
    });

    if (subjectData.length === 0) return null;

    const activityIds = subjectData.map((d) => d.activity_id);
    const { data: activities, error: actError } = await supabase
      .from("value_added_activities")
      .select("*")
      .in("id", activityIds)
      .order("created_at", { ascending: true });

    if (actError) throw actError;
    if (!activities) return null;

    // 创建活动Map缓存
    const activityById = new Map(activities.map((a) => [a.id, a]));

    const examSeries: ExamInSeries[] = activities.map((activity, index) => ({
      exam_id: activity.exit_exam_id,
      exam_title: activity.exit_exam_title,
      exam_date: activity.created_at,
      sequence: index + 1,
    }));

    const scoreTrend: ScoreTrendPoint[] = subjectData.map((cache) => {
      const result = cache.result;
      const activity = activityById.get(cache.activity_id);

      return {
        exam_id: activity?.exit_exam_id || "",
        exam_title: activity?.exit_exam_title || "",
        exam_date: activity?.created_at || "",
        avg_score: result.avg_score_exit || 0,
        z_score: result.avg_z_score_change || 0,
        value_added_rate: result.avg_score_value_added_rate || 0,
        rank: result.rank_in_grade,
      };
    });

    const abilityTrend: AbilityTrendPoint[] = subjectData.map((cache) => {
      const result = cache.result;
      const activity = activityById.get(cache.activity_id);
      const total = Number(result.total_students) || 0;
      const excellentRate =
        total > 0 ? Number(result.exit_excellent_count) / total : 0;

      return {
        exam_id: activity?.exit_exam_id || "",
        exam_title: activity?.exit_exam_title || "",
        exam_date: activity?.created_at || "",
        excellent_rate: excellentRate,
        consolidation_rate: result.consolidation_rate || 0,
        transformation_rate: result.transformation_rate || 0,
        contribution_rate: result.contribution_rate || 0,
      };
    });

    return {
      target_id: className,
      target_name: className,
      target_type: "class",
      subject,
      exam_series: examSeries,
      score_trend: scoreTrend,
      ability_trend: abilityTrend,
    };
  } catch (error) {
    console.error("Error fetching class historical data:", error);
    return null;
  }
}

/**
 * 查询学生历次表现
 */
export async function fetchStudentHistoricalData(
  studentId: string,
  subject: string
): Promise<HistoricalTracking | null> {
  try {
    const { data: cacheData, error: cacheError } = await supabase
      .from("value_added_cache")
      .select("*")
      .eq("dimension", "student")
      .eq("target_id", studentId)
      .order("created_at", { ascending: true });

    if (cacheError) throw cacheError;
    if (!cacheData || cacheData.length === 0) return null;

    // 从结果中筛选该科目的数据
    const subjectData = cacheData.filter((cache) => {
      const result = cache.result;
      return (
        result &&
        Array.isArray(result) &&
        result.some((r: any) => r.subject === subject)
      );
    });

    if (subjectData.length === 0) return null;

    const activityIds = subjectData.map((d) => d.activity_id);
    const { data: activities, error: actError } = await supabase
      .from("value_added_activities")
      .select("*")
      .in("id", activityIds)
      .order("created_at", { ascending: true });

    if (actError) throw actError;
    if (!activities) return null;

    // 创建活动Map缓存
    const activityById = new Map(activities.map((a) => [a.id, a]));

    const examSeries: ExamInSeries[] = activities.map((activity, index) => ({
      exam_id: activity.exit_exam_id,
      exam_title: activity.exit_exam_title,
      exam_date: activity.created_at,
      sequence: index + 1,
    }));

    const scoreTrend: ScoreTrendPoint[] = subjectData.map((cache) => {
      const result = cache.result;
      const activity = activityById.get(cache.activity_id);
      const subjectRecord = Array.isArray(result)
        ? result.find((r: any) => r.subject === subject)
        : null;

      if (!subjectRecord) {
        return {
          exam_id: activity?.exit_exam_id || "",
          exam_title: activity?.exit_exam_title || "",
          exam_date: activity?.created_at || "",
          avg_score: 0,
          z_score: 0,
          value_added_rate: 0,
        };
      }

      return {
        exam_id: activity?.exit_exam_id || "",
        exam_title: activity?.exit_exam_title || "",
        exam_date: activity?.created_at || "",
        avg_score: subjectRecord.exit_score || 0,
        z_score: subjectRecord.exit_z_score || 0,
        value_added_rate: subjectRecord.score_value_added_rate || 0,
        rank: subjectRecord.exit_rank_in_class,
      };
    });

    const abilityTrend: AbilityTrendPoint[] = subjectData.map((cache) => {
      const result = cache.result;
      const activity = activityById.get(cache.activity_id);
      const subjectRecord = Array.isArray(result)
        ? result.find((r: any) => r.subject === subject)
        : null;

      if (!subjectRecord) {
        return {
          exam_id: activity?.exit_exam_id || "",
          exam_title: activity?.exit_exam_title || "",
          exam_date: activity?.created_at || "",
          excellent_rate: 0,
        };
      }

      return {
        exam_id: activity?.exit_exam_id || "",
        exam_title: activity?.exit_exam_title || "",
        exam_date: activity?.created_at || "",
        excellent_rate: subjectRecord.exit_level === "A+" ? 1 : 0,
      };
    });

    const firstResult = subjectData[0].result;
    const firstRecord = Array.isArray(firstResult) ? firstResult[0] : null;

    return {
      target_id: studentId,
      target_name: firstRecord?.student_name || "",
      target_type: "student",
      subject,
      exam_series: examSeries,
      score_trend: scoreTrend,
      ability_trend: abilityTrend,
    };
  } catch (error) {
    console.error("Error fetching student historical data:", error);
    return null;
  }
}

/**
 * 获取可用的教师列表(有历史数据)
 */
export async function fetchTeachersWithHistory(): Promise<
  Array<{
    teacher_id: string;
    teacher_name: string;
    subjects: string[];
  }>
> {
  try {
    const { data: cacheData, error } = await supabase
      .from("value_added_cache")
      .select("target_id, result")
      .eq("dimension", "teacher");

    if (error) throw error;
    if (!cacheData) return [];

    const teacherMap = new Map<
      string,
      { name: string; subjects: Set<string> }
    >();

    cacheData.forEach((cache) => {
      const result = cache.result;
      if (!result) return;

      const teacherId = cache.target_id;
      const teacherName = result.teacher_name || "";
      const subject = result.subject || "";

      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, { name: teacherName, subjects: new Set() });
      }

      teacherMap.get(teacherId)!.subjects.add(subject);
    });

    return Array.from(teacherMap.entries()).map(([id, data]) => ({
      teacher_id: id,
      teacher_name: data.name,
      subjects: Array.from(data.subjects).sort(),
    }));
  } catch (error) {
    console.error("Error fetching teachers with history:", error);
    return [];
  }
}

/**
 * 获取可用的班级列表(有历史数据)
 */
export async function fetchClassesWithHistory(): Promise<
  Array<{
    class_name: string;
    subjects: string[];
  }>
> {
  try {
    const { data: cacheData, error } = await supabase
      .from("value_added_cache")
      .select("target_name, result")
      .eq("dimension", "class");

    if (error) throw error;
    if (!cacheData) return [];

    const classMap = new Map<string, Set<string>>();

    cacheData.forEach((cache) => {
      const result = cache.result;
      if (!result) return;

      const className = cache.target_name || "";
      const subject = result.subject || "";

      if (!classMap.has(className)) {
        classMap.set(className, new Set());
      }

      classMap.get(className)!.add(subject);
    });

    return Array.from(classMap.entries()).map(([name, subjects]) => ({
      class_name: name,
      subjects: Array.from(subjects).sort(),
    }));
  } catch (error) {
    console.error("Error fetching classes with history:", error);
    return [];
  }
}

/**
 * 查询全年级历次表现（别名函数，用于年级对比）
 */
export async function fetchGradeHistoricalData(
  className: string,
  subject: string
): Promise<HistoricalTracking | null> {
  return fetchClassHistoricalData(className, subject);
}
