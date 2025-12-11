/**
 * Class ID Adapter - UUID ↔ class_name 转换工具
 *
 * 用于 P1-2 迁移过渡期：从 classes (UUID) 迁移到 class_info (TEXT)
 *
 * @deprecated 此文件为临时过渡方案，迁移完成后将被移除
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * 通过 UUID 获取 class_name
 *
 * @param uuid - classes 表的 UUID 主键
 * @returns class_name (TEXT) 或 null
 *
 * @example
 * const className = await getClassNameByUUID('bf5f41cf-fce3-4f3e-8dde-bc0b0383fe41');
 * // 返回: '初三7班'
 */
export async function getClassNameByUUID(uuid: string): Promise<string | null> {
  if (!uuid) return null;

  try {
    const { data, error } = await supabase
      .from("class_id_mapping")
      .select("class_name")
      .eq("old_classes_id", uuid)
      .single();

    if (error) {
      console.error("Failed to get class_name by UUID:", error);
      return null;
    }

    return data?.class_name || null;
  } catch (error) {
    console.error("Exception in getClassNameByUUID:", error);
    return null;
  }
}

/**
 * 通过 class_name 获取 UUID
 *
 * @param className - class_info 表的 TEXT 主键
 * @returns UUID (TEXT) 或 null
 *
 * @example
 * const uuid = await getUUIDByClassName('初三7班');
 * // 返回: 'bf5f41cf-fce3-4f3e-8dde-bc0b0383fe41'
 */
export async function getUUIDByClassName(
  className: string
): Promise<string | null> {
  if (!className) return null;

  try {
    const { data, error } = await supabase
      .from("class_id_mapping")
      .select("old_classes_id")
      .eq("class_name", className)
      .single();

    if (error) {
      console.error("Failed to get UUID by class_name:", error);
      return null;
    }

    return data?.old_classes_id || null;
  } catch (error) {
    console.error("Exception in getUUIDByClassName:", error);
    return null;
  }
}

/**
 * 批量通过 UUID 获取 class_name
 *
 * @param uuids - UUID 数组
 * @returns Map<UUID, class_name>
 */
export async function batchGetClassNamesByUUIDs(
  uuids: string[]
): Promise<Map<string, string>> {
  if (!uuids || uuids.length === 0) return new Map();

  try {
    const { data, error } = await supabase
      .from("class_id_mapping")
      .select("old_classes_id, class_name")
      .in("old_classes_id", uuids);

    if (error) {
      console.error("Failed to batch get class_names:", error);
      return new Map();
    }

    const mapping = new Map<string, string>();
    data?.forEach((item) => {
      mapping.set(item.old_classes_id, item.class_name);
    });

    return mapping;
  } catch (error) {
    console.error("Exception in batchGetClassNamesByUUIDs:", error);
    return new Map();
  }
}

/**
 * 批量通过 class_name 获取 UUID
 *
 * @param classNames - class_name 数组
 * @returns Map<class_name, UUID>
 */
export async function batchGetUUIDsByClassNames(
  classNames: string[]
): Promise<Map<string, string>> {
  if (!classNames || classNames.length === 0) return new Map();

  try {
    const { data, error } = await supabase
      .from("class_id_mapping")
      .select("old_classes_id, class_name")
      .in("class_name", classNames);

    if (error) {
      console.error("Failed to batch get UUIDs:", error);
      return new Map();
    }

    const mapping = new Map<string, string>();
    data?.forEach((item) => {
      mapping.set(item.class_name, item.old_classes_id);
    });

    return mapping;
  } catch (error) {
    console.error("Exception in batchGetUUIDsByClassNames:", error);
    return new Map();
  }
}

/**
 * 验证 UUID 是否有效（是否在映射表中）
 */
export async function isValidClassUUID(uuid: string): Promise<boolean> {
  const className = await getClassNameByUUID(uuid);
  return className !== null;
}

/**
 * 验证 class_name 是否有效（是否在映射表中）
 */
export async function isValidClassName(className: string): Promise<boolean> {
  const uuid = await getUUIDByClassName(className);
  return uuid !== null;
}

/**
 * 获取所有映射关系
 *
 * @returns Array<{uuid: string, className: string}>
 */
export async function getAllClassMappings(): Promise<
  Array<{ uuid: string; className: string; grade: string }>
> {
  try {
    const { data, error } = await supabase
      .from("class_id_mapping")
      .select("old_classes_id, class_name, grade")
      .order("class_name", { ascending: true });

    if (error) {
      console.error("Failed to get all mappings:", error);
      return [];
    }

    return (
      data?.map((item) => ({
        uuid: item.old_classes_id,
        className: item.class_name,
        grade: item.grade,
      })) || []
    );
  } catch (error) {
    console.error("Exception in getAllClassMappings:", error);
    return [];
  }
}

/**
 * 缓存版本：通过 UUID 获取 class_name（带内存缓存）
 *
 * 用于高频查询场景
 */
const classNameCache = new Map<string, string>();
const cacheExpiry = 5 * 60 * 1000; // 5分钟过期
let lastCacheRefresh = 0;

export async function getCachedClassNameByUUID(
  uuid: string
): Promise<string | null> {
  // 刷新缓存
  if (Date.now() - lastCacheRefresh > cacheExpiry) {
    await refreshClassNameCache();
  }

  return classNameCache.get(uuid) || null;
}

async function refreshClassNameCache(): Promise<void> {
  try {
    const mappings = await getAllClassMappings();
    classNameCache.clear();
    mappings.forEach((m) => {
      classNameCache.set(m.uuid, m.className);
    });
    lastCacheRefresh = Date.now();
  } catch (error) {
    console.error("Failed to refresh class name cache:", error);
  }
}

// 预加载缓存
refreshClassNameCache();
