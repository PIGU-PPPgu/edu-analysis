import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = "admin" | "teacher" | "student";

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// 获取当前用户的所有角色
export const getCurrentUserRoles = async (): Promise<AppRole[]> => {
  try {
    console.log("调用getCurrentUserRoles...");

    // 先尝试从RPC获取角色
    try {
      const { data, error } = await supabase.rpc("get_user_roles");

      if (error) {
        console.error("通过RPC获取用户角色失败:", error);
        throw error;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        console.log("通过RPC成功获取到角色:", data);
        return data;
      }

      console.warn("RPC返回空数据，尝试从user_roles表获取");
    } catch (rpcError) {
      console.error("RPC调用出错，尝试从user_roles表获取:", rpcError);
    }

    // 尝试从表中直接获取角色信息
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.error("获取当前用户信息失败");
        throw new Error("未登录");
      }

      console.log("当前用户ID:", userData.user.id);

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);

      if (rolesError) {
        console.error("从表中获取角色失败:", rolesError);
        throw rolesError;
      }

      if (rolesData && rolesData.length > 0) {
        const roles = rolesData.map((r) => r.role) as AppRole[];
        console.log("从user_roles表获取到角色:", roles);
        return roles;
      }

      console.warn("user_roles表中无数据，检查本地存储");
    } catch (dbError) {
      console.error("从数据库获取角色出错:", dbError);
    }

    // 尝试从本地存储获取
    const defaultRoles = localStorage.getItem("userDefaultRoles");
    if (defaultRoles) {
      const roles = JSON.parse(defaultRoles) as AppRole[];
      console.log("从本地存储获取到角色:", roles);
      return roles;
    }

    // 如果之前都失败，设置默认角色
    console.warn("所有获取角色方法都失败，使用默认角色");
    const defaultRoleArray: AppRole[] = ["teacher", "student"];
    localStorage.setItem("userDefaultRoles", JSON.stringify(defaultRoleArray));
    return defaultRoleArray;
  } catch (error) {
    console.error("获取用户角色过程中发生未处理错误:", error);

    // 最终兜底方案：返回默认角色
    const fallbackRoles: AppRole[] = ["teacher", "student"];
    console.warn("返回默认角色:", fallbackRoles);
    return fallbackRoles;
  }
};

// 检查当前用户是否为管理员
export const checkIsAdmin = async (): Promise<boolean> => {
  try {
    const roles = await getCurrentUserRoles();
    return roles.includes("admin");
  } catch (error) {
    console.error("检查管理员权限失败:", error);
    return false;
  }
};

// 为用户分配新角色
export const assignRole = async (
  userId: string,
  role: AppRole
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("user_roles")
      .insert([{ user_id: userId, role }]);

    if (error) throw error;
    toast.success(`成功分配${role}角色`);
    return true;
  } catch (error) {
    console.error("分配角色失败:", error);
    toast.error("分配角色失败");
    return false;
  }
};

// 移除用户角色
export const removeRole = async (
  userId: string,
  role: AppRole
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);

    if (error) throw error;
    toast.success(`成功移除${role}角色`);
    return true;
  } catch (error) {
    console.error("移除角色失败:", error);
    toast.error("移除角色失败");
    return false;
  }
};
