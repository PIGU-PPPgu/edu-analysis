/**
 * 小组服务 - 学生小组管理
 *
 * 功能：
 * - 小组CRUD操作
 * - 成员管理
 * - 小组统计分析
 * - 小组成绩追踪
 */

import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/services/errorHandler";
import { toast } from "sonner";
import { cacheManager, CacheTTL } from "@/services/CacheManager";
import type {
  Group,
  GroupMember,
  GroupWithMembers,
  CreateGroupParams,
  UpdateGroupParams,
  GroupStats,
  GroupPerformance,
} from "@/types/group";

// 缓存键前缀
const CACHE_PREFIX = {
  GROUP: "group_",
  CLASS_GROUPS: "class_groups_",
  GROUP_MEMBERS: "group_members_",
  GROUP_STATS: "group_stats_",
};

// ========== 小组CRUD操作 ==========

/**
 * 创建小组
 */
export async function createGroup(
  params: CreateGroupParams
): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from("student_groups")
      .insert([params])
      .select()
      .single();

    if (error) {
      console.error("创建小组失败:", error);
      showError(error, { operation: "创建小组", groupName: params.group_name });
      return null;
    }

    // 清除班级小组列表缓存
    cacheManager.clearByPattern(new RegExp(`^${CACHE_PREFIX.CLASS_GROUPS}`));

    toast.success(`小组"${params.group_name}"创建成功`);
    return data;
  } catch (error) {
    console.error("创建小组异常:", error);
    showError(error, { operation: "创建小组", groupName: params.group_name });
    return null;
  }
}

/**
 * 获取班级的所有小组
 */
export async function getGroupsByClass(
  className: string
): Promise<GroupWithMembers[]> {
  const cacheKey = CACHE_PREFIX.CLASS_GROUPS + className;

  return cacheManager.getOrSet(
    cacheKey,
    async () => {
      try {
        // 获取小组基本信息
        const { data: groups, error: groupsError } = await supabase
          .from("student_groups")
          .select(
            `
            *,
            leader:students!leader_student_id(name)
          `
          )
          .eq("class_name", className)
          .order("created_at", { ascending: false });

        if (groupsError) {
          console.error("获取班级小组失败:", groupsError);
          return [];
        }

        if (!groups || groups.length === 0) {
          return [];
        }

        // 获取每个小组的成员信息
        const groupsWithMembers: GroupWithMembers[] = await Promise.all(
          groups.map(async (group) => {
            const { data: members, error: membersError } = await supabase
              .from("group_members")
              .select(
                `
                *,
                students(name, student_id)
              `
              )
              .eq("group_id", group.id);

            if (membersError) {
              console.error(`获取小组${group.id}成员失败:`, membersError);
            }

            const formattedMembers: GroupMember[] = (members || []).map(
              (m: any) => ({
                id: m.id,
                group_id: m.group_id,
                student_id: m.student_id,
                role: m.role,
                joined_at: m.joined_at,
                student_name: m.students?.name,
                student_number: m.students?.student_id,
              })
            );

            return {
              ...group,
              members: formattedMembers,
              member_count: formattedMembers.length,
              leader_name: group.leader?.name,
            };
          })
        );

        return groupsWithMembers;
      } catch (error) {
        console.error("获取班级小组异常:", error);
        showError(error, { operation: "获取班级小组", className });
        return [];
      }
    },
    {
      ttl: CacheTTL.FIVE_MINUTES,
      persistent: false,
    }
  );
}

/**
 * 获取单个小组详情
 */
export async function getGroupById(
  groupId: string
): Promise<GroupWithMembers | null> {
  const cacheKey = CACHE_PREFIX.GROUP + groupId;

  return cacheManager.getOrSet(
    cacheKey,
    async () => {
      try {
        // 获取小组基本信息
        const { data: group, error: groupError } = await supabase
          .from("student_groups")
          .select(
            `
            *,
            leader:students!leader_student_id(name)
          `
          )
          .eq("id", groupId)
          .single();

        if (groupError || !group) {
          console.error("获取小组详情失败:", groupError);
          return null;
        }

        // 获取成员信息
        const { data: members, error: membersError } = await supabase
          .from("group_members")
          .select(
            `
            *,
            students(name, student_id)
          `
          )
          .eq("group_id", groupId);

        if (membersError) {
          console.error("获取小组成员失败:", membersError);
        }

        const formattedMembers: GroupMember[] = (members || []).map(
          (m: any) => ({
            id: m.id,
            group_id: m.group_id,
            student_id: m.student_id,
            role: m.role,
            joined_at: m.joined_at,
            student_name: m.students?.name,
            student_number: m.students?.student_id,
          })
        );

        return {
          ...group,
          members: formattedMembers,
          member_count: formattedMembers.length,
          leader_name: group.leader?.name,
        };
      } catch (error) {
        console.error("获取小组详情异常:", error);
        showError(error, { operation: "获取小组详情", groupId });
        return null;
      }
    },
    {
      ttl: CacheTTL.FIVE_MINUTES,
      persistent: false,
    }
  );
}

/**
 * 更新小组信息
 */
export async function updateGroup(
  groupId: string,
  params: UpdateGroupParams
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("student_groups")
      .update({
        ...params,
        updated_at: new Date().toISOString(),
      })
      .eq("id", groupId);

    if (error) {
      console.error("更新小组失败:", error);
      showError(error, { operation: "更新小组", groupId });
      return false;
    }

    // 清除相关缓存
    cacheManager.delete(CACHE_PREFIX.GROUP + groupId);
    cacheManager.clearByPattern(new RegExp(`^${CACHE_PREFIX.CLASS_GROUPS}`));

    toast.success("小组信息更新成功");
    return true;
  } catch (error) {
    console.error("更新小组异常:", error);
    showError(error, { operation: "更新小组", groupId });
    return false;
  }
}

/**
 * 删除小组
 */
export async function deleteGroup(groupId: string): Promise<boolean> {
  try {
    // 删除小组会级联删除成员（数据库ON DELETE CASCADE）
    const { error } = await supabase
      .from("student_groups")
      .delete()
      .eq("id", groupId);

    if (error) {
      console.error("删除小组失败:", error);
      showError(error, { operation: "删除小组", groupId });
      return false;
    }

    // 清除相关缓存
    cacheManager.delete(CACHE_PREFIX.GROUP + groupId);
    cacheManager.clearByPattern(new RegExp(`^${CACHE_PREFIX.CLASS_GROUPS}`));
    cacheManager.clearByPattern(new RegExp(`^${CACHE_PREFIX.GROUP_MEMBERS}`));

    toast.success("小组删除成功");
    return true;
  } catch (error) {
    console.error("删除小组异常:", error);
    showError(error, { operation: "删除小组", groupId });
    return false;
  }
}

// ========== 成员管理 ==========

/**
 * 添加成员到小组
 */
export async function addMemberToGroup(
  groupId: string,
  studentId: string,
  role: "leader" | "member" = "member"
): Promise<boolean> {
  try {
    const { error } = await supabase.from("group_members").insert([
      {
        group_id: groupId,
        student_id: studentId,
        role,
      },
    ]);

    if (error) {
      console.error("添加小组成员失败:", error);
      showError(error, { operation: "添加小组成员", groupId, studentId });
      return false;
    }

    // 清除相关缓存
    cacheManager.delete(CACHE_PREFIX.GROUP + groupId);
    cacheManager.delete(CACHE_PREFIX.GROUP_MEMBERS + groupId);
    cacheManager.clearByPattern(new RegExp(`^${CACHE_PREFIX.CLASS_GROUPS}`));

    toast.success("成员添加成功");
    return true;
  } catch (error) {
    console.error("添加小组成员异常:", error);
    showError(error, { operation: "添加小组成员", groupId, studentId });
    return false;
  }
}

/**
 * 从小组移除成员
 */
export async function removeMemberFromGroup(
  groupId: string,
  studentId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("student_id", studentId);

    if (error) {
      console.error("移除小组成员失败:", error);
      showError(error, { operation: "移除小组成员", groupId, studentId });
      return false;
    }

    // 清除相关缓存
    cacheManager.delete(CACHE_PREFIX.GROUP + groupId);
    cacheManager.delete(CACHE_PREFIX.GROUP_MEMBERS + groupId);
    cacheManager.clearByPattern(new RegExp(`^${CACHE_PREFIX.CLASS_GROUPS}`));

    toast.success("成员移除成功");
    return true;
  } catch (error) {
    console.error("移除小组成员异常:", error);
    showError(error, { operation: "移除小组成员", groupId, studentId });
    return false;
  }
}

/**
 * 更新成员角色
 */
export async function updateMemberRole(
  groupId: string,
  studentId: string,
  role: "leader" | "member"
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("group_members")
      .update({ role })
      .eq("group_id", groupId)
      .eq("student_id", studentId);

    if (error) {
      console.error("更新成员角色失败:", error);
      showError(error, { operation: "更新成员角色", groupId, studentId });
      return false;
    }

    // 清除相关缓存
    cacheManager.delete(CACHE_PREFIX.GROUP + groupId);
    cacheManager.delete(CACHE_PREFIX.GROUP_MEMBERS + groupId);

    toast.success("成员角色更新成功");
    return true;
  } catch (error) {
    console.error("更新成员角色异常:", error);
    showError(error, { operation: "更新成员角色", groupId, studentId });
    return false;
  }
}

/**
 * 获取小组成员列表
 */
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const cacheKey = CACHE_PREFIX.GROUP_MEMBERS + groupId;

  return cacheManager.getOrSet(
    cacheKey,
    async () => {
      try {
        const { data: members, error } = await supabase
          .from("group_members")
          .select(
            `
            *,
            students(name, student_id)
          `
          )
          .eq("group_id", groupId);

        if (error) {
          console.error("获取小组成员失败:", error);
          return [];
        }

        return (members || []).map((m: any) => ({
          id: m.id,
          group_id: m.group_id,
          student_id: m.student_id,
          role: m.role,
          joined_at: m.joined_at,
          student_name: m.students?.name,
          student_number: m.students?.student_id,
        }));
      } catch (error) {
        console.error("获取小组成员异常:", error);
        showError(error, { operation: "获取小组成员", groupId });
        return [];
      }
    },
    {
      ttl: CacheTTL.FIVE_MINUTES,
      persistent: false,
    }
  );
}

// ========== 统计分析 ==========

/**
 * 获取小组统计信息
 */
export async function getGroupStats(
  groupId: string
): Promise<GroupStats | null> {
  const cacheKey = CACHE_PREFIX.GROUP_STATS + groupId;

  return cacheManager.getOrSet(
    cacheKey,
    async () => {
      try {
        // 获取小组基本信息
        const group = await getGroupById(groupId);
        if (!group) return null;

        // 获取小组成员的成绩
        const memberIds = group.members.map((m) => m.student_id);

        if (memberIds.length === 0) {
          return {
            group_id: groupId,
            group_name: group.group_name,
            member_count: 0,
            average_score: 0,
            highest_score: 0,
            lowest_score: 0,
            grade_distribution: [],
          };
        }

        // 从grade_data_new查询成绩
        const { data: grades, error } = await supabase
          .from("grade_data_new")
          .select("student_id, total_score, total_grade")
          .in("student_id", memberIds)
          .not("total_score", "is", null);

        if (error) {
          console.error("获取小组成绩失败:", error);
          return null;
        }

        if (!grades || grades.length === 0) {
          return {
            group_id: groupId,
            group_name: group.group_name,
            member_count: group.member_count,
            average_score: 0,
            highest_score: 0,
            lowest_score: 0,
            grade_distribution: [],
          };
        }

        // 计算统计数据
        const scores = grades.map((g) => g.total_score);
        const average_score = Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length
        );
        const highest_score = Math.max(...scores);
        const lowest_score = Math.min(...scores);

        // 统计等级分布
        const gradeCount: Record<string, number> = {};
        grades.forEach((g) => {
          const grade = g.total_grade || "Unknown";
          gradeCount[grade] = (gradeCount[grade] || 0) + 1;
        });

        const grade_distribution = Object.entries(gradeCount).map(
          ([grade, count]) => ({
            grade,
            count,
          })
        );

        return {
          group_id: groupId,
          group_name: group.group_name,
          member_count: group.member_count,
          average_score,
          highest_score,
          lowest_score,
          grade_distribution,
        };
      } catch (error) {
        console.error("获取小组统计信息异常:", error);
        showError(error, { operation: "获取小组统计", groupId });
        return null;
      }
    },
    {
      ttl: CacheTTL.FIVE_MINUTES,
      persistent: false,
    }
  );
}

/**
 * 获取小组成绩表现
 */
export async function getGroupPerformance(
  groupId: string
): Promise<GroupPerformance | null> {
  try {
    const group = await getGroupById(groupId);
    if (!group) return null;

    const stats = await getGroupStats(groupId);
    if (!stats) return null;

    const memberIds = group.members.map((m) => m.student_id);
    if (memberIds.length === 0) {
      return {
        group_id: groupId,
        group_name: group.group_name,
        overall_rank: 0,
        average_score: 0,
        improvement_rate: 0,
        subject_performance: [],
        top_performers: [],
        struggling_students: [],
      };
    }

    // 1. 计算班级排名
    let overall_rank = 0;
    try {
      // 获取同班级所有小组的平均分进行排名
      const { data: allGroups } = await supabase
        .from("student_groups")
        .select("id, group_name")
        .eq("class_name", group.class_name);

      if (allGroups && allGroups.length > 0) {
        // 计算每个小组的平均分
        const groupScores = await Promise.all(
          allGroups.map(async (g) => {
            const gStats = await getGroupStats(g.id);
            return {
              id: g.id,
              average: gStats?.average_score || 0,
            };
          })
        );

        // 排序并找出当前小组的排名
        groupScores.sort((a, b) => b.average - a.average);
        overall_rank = groupScores.findIndex((g) => g.id === groupId) + 1;
      }
    } catch (error) {
      console.error("计算班级排名失败:", error);
    }

    // 2. 计算进步率（对比最近两次考试）
    let improvement_rate = 0;
    try {
      const { data: recentExams } = await supabase
        .from("grade_data_new")
        .select("exam_id, exam_date, total_score")
        .in("student_id", memberIds)
        .not("total_score", "is", null)
        .order("exam_date", { ascending: false })
        .limit(memberIds.length * 2); // 取最近两次考试

      if (recentExams && recentExams.length > 0) {
        // 按考试分组
        const examGroups = new Map<string, number[]>();
        recentExams.forEach((record) => {
          if (!examGroups.has(record.exam_id)) {
            examGroups.set(record.exam_id, []);
          }
          examGroups.get(record.exam_id)!.push(record.total_score);
        });

        const examAverages = Array.from(examGroups.entries()).map(
          ([examId, scores]) => ({
            examId,
            average: scores.reduce((sum, s) => sum + s, 0) / scores.length,
          })
        );

        if (examAverages.length >= 2) {
          const [latest, previous] = examAverages;
          improvement_rate =
            ((latest.average - previous.average) / previous.average) * 100;
        }
      }
    } catch (error) {
      console.error("计算进步率失败:", error);
    }

    // 3. 分析科目表现
    const subject_performance: {
      subject: string;
      average_score: number;
      rank_in_class: number;
    }[] = [];

    try {
      const subjects = [
        "chinese",
        "math",
        "english",
        "physics",
        "chemistry",
        "politics",
        "history",
        "biology",
        "geography",
      ];

      for (const subject of subjects) {
        const { data: subjectGrades } = await supabase
          .from("grade_data_new")
          .select(`${subject}_score, class_name`)
          .in("student_id", memberIds)
          .not(`${subject}_score`, "is", null)
          .eq("class_name", group.class_name);

        if (subjectGrades && subjectGrades.length > 0) {
          const scores = subjectGrades.map((g: any) => g[`${subject}_score`]);
          const average =
            scores.reduce((sum: number, s: number) => sum + s, 0) /
            scores.length;

          // 简化排名计算：与班级其他小组对比
          subject_performance.push({
            subject,
            average_score: Math.round(average),
            rank_in_class: 0, // 简化处理，实际需要查询所有小组
          });
        }
      }
    } catch (error) {
      console.error("分析科目表现失败:", error);
    }

    // 4. 找出表现突出的学生（Top 3）
    const top_performers: {
      student_id: string;
      student_name: string;
      score: number;
    }[] = [];

    try {
      const { data: topStudents } = await supabase
        .from("grade_data_new")
        .select("student_id, name, total_score")
        .in("student_id", memberIds)
        .not("total_score", "is", null)
        .order("total_score", { ascending: false })
        .limit(3);

      if (topStudents) {
        topStudents.forEach((s: any) => {
          top_performers.push({
            student_id: s.student_id,
            student_name: s.name,
            score: s.total_score,
          });
        });
      }
    } catch (error) {
      console.error("获取优秀学生失败:", error);
    }

    // 5. 找出需要帮助的学生（成绩低于小组平均分20%以上）
    const struggling_students: {
      student_id: string;
      student_name: string;
      score: number;
    }[] = [];

    try {
      const threshold = stats.average_score * 0.8; // 低于平均分80%
      const { data: strugglingStudents } = await supabase
        .from("grade_data_new")
        .select("student_id, name, total_score")
        .in("student_id", memberIds)
        .not("total_score", "is", null)
        .lt("total_score", threshold)
        .order("total_score", { ascending: true });

      if (strugglingStudents) {
        strugglingStudents.forEach((s: any) => {
          struggling_students.push({
            student_id: s.student_id,
            student_name: s.name,
            score: s.total_score,
          });
        });
      }
    } catch (error) {
      console.error("获取待提升学生失败:", error);
    }

    return {
      group_id: groupId,
      group_name: group.group_name,
      overall_rank,
      average_score: stats.average_score,
      improvement_rate: Math.round(improvement_rate * 10) / 10, // 保留1位小数
      subject_performance,
      top_performers,
      struggling_students,
    };
  } catch (error) {
    console.error("获取小组表现异常:", error);
    showError(error, { operation: "获取小组表现", groupId });
    return null;
  }
}
