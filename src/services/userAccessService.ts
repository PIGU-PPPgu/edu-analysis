/**
 * 用户班级访问权限管理服务
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AccessType = "owner" | "teacher" | "student" | "readonly";

export interface UserClassAccess {
  id: string;
  user_id: string;
  class_name: string;
  access_type: AccessType;
  created_at: string;
}

/**
 * 获取当前用户可访问的班级列表
 */
export async function getUserAccessibleClasses(): Promise<string[]> {
  try {
    // 检查是否是管理员
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    // 如果是管理员，返回所有班级
    if (roleData?.role === "admin") {
      const { data: allClasses } = await supabase
        .from("class_info")
        .select("class_name");

      return allClasses?.map((c) => c.class_name) || [];
    }

    // 否则，返回用户有权限的班级
    const { data, error } = await supabase
      .from("user_class_access")
      .select("class_name")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

    if (error) {
      console.error("获取用户可访问班级失败:", error);
      return [];
    }

    return data?.map((item) => item.class_name) || [];
  } catch (error) {
    console.error("获取用户可访问班级时出错:", error);
    return [];
  }
}

/**
 * 授予用户对某个班级的访问权限
 * @param userId 用户ID
 * @param className 班级名称
 * @param accessType 访问类型
 */
export async function grantClassAccess(
  userId: string,
  className: string,
  accessType: AccessType
): Promise<{ success: boolean; message?: string }> {
  try {
    const { error } = await supabase.from("user_class_access").insert({
      user_id: userId,
      class_name: className,
      access_type: accessType,
    });

    if (error) {
      if (error.code === "23505") {
        // 唯一约束冲突
        return { success: false, message: "该用户已有此班级的访问权限" };
      }
      console.error("授予班级访问权限失败:", error);
      return { success: false, message: error.message };
    }

    toast.success("授予权限成功");
    return { success: true };
  } catch (error: any) {
    console.error("授予班级访问权限时出错:", error);
    return { success: false, message: error.message || "未知错误" };
  }
}

/**
 * 撤销用户对某个班级的访问权限
 * @param userId 用户ID
 * @param className 班级名称
 */
export async function revokeClassAccess(
  userId: string,
  className: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { error } = await supabase
      .from("user_class_access")
      .delete()
      .eq("user_id", userId)
      .eq("class_name", className);

    if (error) {
      console.error("撤销班级访问权限失败:", error);
      return { success: false, message: error.message };
    }

    toast.success("撤销权限成功");
    return { success: true };
  } catch (error: any) {
    console.error("撤销班级访问权限时出错:", error);
    return { success: false, message: error.message || "未知错误" };
  }
}

/**
 * 获取用户的所有班级访问权限
 * @param userId 用户ID（可选，默认为当前用户）
 */
export async function getUserClassAccess(
  userId?: string
): Promise<UserClassAccess[]> {
  try {
    const targetUserId =
      userId || (await supabase.auth.getUser()).data.user?.id;

    if (!targetUserId) {
      return [];
    }

    const { data, error } = await supabase
      .from("user_class_access")
      .select("*")
      .eq("user_id", targetUserId)
      .order("class_name");

    if (error) {
      console.error("获取用户班级访问权限失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取用户班级访问权限时出错:", error);
    return [];
  }
}

/**
 * 批量授予用户班级访问权限
 * @param userId 用户ID
 * @param classNames 班级名称列表
 * @param accessType 访问类型
 */
export async function batchGrantClassAccess(
  userId: string,
  classNames: string[],
  accessType: AccessType
): Promise<{ success: boolean; message?: string }> {
  try {
    const records = classNames.map((className) => ({
      user_id: userId,
      class_name: className,
      access_type: accessType,
    }));

    const { error } = await supabase.from("user_class_access").upsert(records, {
      onConflict: "user_id,class_name",
    });

    if (error) {
      console.error("批量授予班级访问权限失败:", error);
      return { success: false, message: error.message };
    }

    toast.success(`成功授予 ${classNames.length} 个班级的访问权限`);
    return { success: true };
  } catch (error: any) {
    console.error("批量授予班级访问权限时出错:", error);
    return { success: false, message: error.message || "未知错误" };
  }
}

/**
 * 获取某个班级的所有授权用户
 * @param className 班级名称
 */
export async function getClassAccessUsers(className: string): Promise<
  Array<{
    user_id: string;
    email: string;
    access_type: AccessType;
    created_at: string;
  }>
> {
  try {
    const { data, error } = await supabase
      .from("user_class_access")
      .select(
        `
        user_id,
        access_type,
        created_at,
        user:user_id (
          email
        )
      `
      )
      .eq("class_name", className);

    if (error) {
      console.error("获取班级授权用户失败:", error);
      return [];
    }

    return (
      data?.map((item: any) => ({
        user_id: item.user_id,
        email: item.user?.email || "未知用户",
        access_type: item.access_type,
        created_at: item.created_at,
      })) || []
    );
  } catch (error) {
    console.error("获取班级授权用户时出错:", error);
    return [];
  }
}

/**
 * 检查当前用户是否有访问某个班级的权限
 * @param className 班级名称
 */
export async function hasClassAccess(className: string): Promise<boolean> {
  try {
    const accessibleClasses = await getUserAccessibleClasses();
    return accessibleClasses.includes(className);
  } catch (error) {
    console.error("检查班级访问权限时出错:", error);
    return false;
  }
}
