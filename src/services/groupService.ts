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

    // 这里可以扩展更多的性能分析逻辑
    // 比如科目表现、进步率等

    return {
      group_id: groupId,
      group_name: group.group_name,
      overall_rank: 0, // TODO: 实现班级排名计算
      average_score: stats.average_score,
      improvement_rate: 0, // TODO: 实现进步率计算
      subject_performance: [], // TODO: 实现科目表现分析
      top_performers: [], // TODO: 实现top学生分析
      struggling_students: [], // TODO: 实现待提升学生分析
    };
  } catch (error) {
    console.error("获取小组表现异常:", error);
    showError(error, { operation: "获取小组表现", groupId });
    return null;
  }
}
