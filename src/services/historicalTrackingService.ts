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
 * 🔧 P1修复：分页查询辅助函数，解除Supabase 1000条限制
 */
async function fetchAllData<T = any>(
  table: string,
  filters: Record<string, any> = {},
  orderBy?: { column: string; ascending?: boolean }
): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(table)
      .select("*")
      .range(from, from + batchSize - 1);

    // 应用过滤条件
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    });

    // 应用排序
    if (orderBy) {
      query = query.order(orderBy.column, {
        ascending: orderBy.ascending ?? true,
      });
    }

    const { data, error } = await query;

    if (error) {
      console.warn(`⚠️ 分页查询失败 (offset ${from}):`, error);
      break;
    }

    if (data && data.length > 0) {
      allData = allData.concat(data as T[]);
      from += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/**
 * 查询教师历次表现
 */
export async function fetchTeacherHistoricalData(
  teacherId: string,
  subject: string
): Promise<HistoricalTracking | null> {
  try {
    // 1. 🔧 使用分页查询获取该教师该科目的所有增值活动缓存
    const cacheData = await fetchAllData(
      "value_added_cache",
      {
        dimension: "teacher",
        target_id: teacherId,
      },
      { column: "created_at", ascending: true }
    );

    if (!cacheData || cacheData.length === 0) return null;

    // 2. 筛选该科目的数据
    const subjectData = cacheData.filter((cache) => {
      const result = cache.result;
      return result && result.subject === subject;
    });

    if (subjectData.length === 0) return null;

    // 3. 🔧 使用分页查询获取关联的活动信息
    const activityIds = subjectData.map((d) => d.activity_id);
    const activities = await fetchAllData(
      "value_added_activities",
      {
        id: activityIds,
      },
      { column: "created_at", ascending: true }
    );

    if (!activities || activities.length === 0) return null;

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
    // 🔧 使用分页查询
    const cacheData = await fetchAllData(
      "value_added_cache",
      {
        dimension: "class",
        target_name: className,
      },
      { column: "created_at", ascending: true }
    );

    if (!cacheData || cacheData.length === 0) return null;

    const subjectData = cacheData.filter((cache) => {
      const result = cache.result;
      return result && result.subject === subject;
    });

    if (subjectData.length === 0) return null;

    // 🔧 使用分页查询
    const activityIds = subjectData.map((d) => d.activity_id);
    const activities = await fetchAllData(
      "value_added_activities",
      {
        id: activityIds,
      },
      { column: "created_at", ascending: true }
    );

    if (!activities || activities.length === 0) return null;

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
    // 🔧 使用分页查询
    const cacheData = await fetchAllData(
      "value_added_cache",
      {
        dimension: "student",
        target_id: studentId,
      },
      { column: "created_at", ascending: true }
    );

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

    // 🔧 使用分页查询
    const activityIds = subjectData.map((d) => d.activity_id);
    const activities = await fetchAllData(
      "value_added_activities",
      {
        id: activityIds,
      },
      { column: "created_at", ascending: true }
    );

    if (!activities || activities.length === 0) return null;

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
    // 🔧 使用分页查询
    const cacheData = await fetchAllData("value_added_cache", {
      dimension: "teacher",
    });

    if (!cacheData || cacheData.length === 0) return [];

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
    // 🔧 使用分页查询
    const cacheData = await fetchAllData("value_added_cache", {
      dimension: "class",
    });

    if (!cacheData || cacheData.length === 0) return [];

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
