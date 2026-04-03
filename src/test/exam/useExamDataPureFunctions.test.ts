/**
 * useExamData 纯函数单元测试
 * 覆盖：mapExamType、mapExam 映射逻辑
 */

import { describe, it, expect } from "vitest";
import { mapExamType, mapExam } from "@/components/exam/hooks/useExamData";
import type { UIExamType } from "@/components/exam/hooks/useExamData";

// 构造最小 DBExamType
function makeDBExamType(
  overrides: Partial<{
    id: string;
    type_name: string;
    description: string | null;
    is_system: boolean;
  }> = {}
) {
  return {
    id: overrides.id ?? "type-001",
    type_name: overrides.type_name ?? "期末考试",
    description: overrides.description ?? null,
    is_system: overrides.is_system ?? false,
  };
}

// 构造最小 DBExam
function makeDBExam(
  overrides: Partial<{
    id: string;
    title: string;
    type: string;
    date: string;
    subject: string | null;
    scope: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }> = {}
) {
  return {
    id: overrides.id ?? "exam-001",
    title: overrides.title ?? "2024期末考试",
    type: overrides.type ?? "期末考试",
    date: overrides.date ?? "2024-06-15",
    subject: overrides.subject ?? null,
    scope: overrides.scope ?? "class",
    created_by: overrides.created_by ?? null,
    created_at: overrides.created_at ?? "2024-06-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2024-06-01T00:00:00Z",
  };
}

describe("mapExamType", () => {
  it("已知类型映射正确的颜色和 emoji", () => {
    const result = mapExamType(makeDBExamType({ type_name: "期末考试" }));

    expect(result.color).toBe("#EF4444");
    expect(result.emoji).toBe("🎯");
  });

  it("月考映射正确", () => {
    const result = mapExamType(makeDBExamType({ type_name: "月考" }));

    expect(result.color).toBe("#10B981");
    expect(result.emoji).toBe("📊");
  });

  it("未知类型使用默认颜色和 emoji", () => {
    const result = mapExamType(makeDBExamType({ type_name: "未知类型" }));

    expect(result.color).toBe("#6B7280");
    expect(result.emoji).toBe("📄");
  });

  it("description 为 null 时映射为空字符串", () => {
    const result = mapExamType(makeDBExamType({ description: null }));

    expect(result.description).toBe("");
  });

  it("description 有值时正确映射", () => {
    const result = mapExamType(
      makeDBExamType({ description: "学期末综合考试" })
    );

    expect(result.description).toBe("学期末综合考试");
  });

  it("is_system 映射为 isDefault", () => {
    const systemType = mapExamType(makeDBExamType({ is_system: true }));
    const customType = mapExamType(makeDBExamType({ is_system: false }));

    expect(systemType.isDefault).toBe(true);
    expect(customType.isDefault).toBe(false);
  });

  it("id 正确传递", () => {
    const result = mapExamType(makeDBExamType({ id: "type-xyz" }));

    expect(result.id).toBe("type-xyz");
  });
});

describe("mapExam", () => {
  it("subject 有值时 subjects 数组包含该科目", () => {
    const result = mapExam(makeDBExam({ subject: "数学" }));

    expect(result.subjects).toEqual(["数学"]);
  });

  it("subject 为 null 时 subjects 为空数组", () => {
    const result = mapExam(makeDBExam({ subject: null }));

    expect(result.subjects).toEqual([]);
  });

  it("status 默认为 scheduled", () => {
    const result = mapExam(makeDBExam());

    expect(result.status).toBe("scheduled");
  });

  it("created_by 为 null 时 createdBy 为 '系统'", () => {
    const result = mapExam(makeDBExam({ created_by: null }));

    expect(result.createdBy).toBe("系统");
  });

  it("created_by 有值时正确映射", () => {
    const result = mapExam(makeDBExam({ created_by: "teacher-001" }));

    expect(result.createdBy).toBe("teacher-001");
  });

  it("classes 默认为空数组", () => {
    const result = mapExam(makeDBExam());

    expect(result.classes).toEqual([]);
  });

  it("tags 默认为空数组", () => {
    const result = mapExam(makeDBExam());

    expect(result.tags).toEqual([]);
  });

  it("participantCount 默认为 0", () => {
    const result = mapExam(makeDBExam());

    expect(result.participantCount).toBe(0);
  });

  it("匹配 examTypes 时 typeInfo 正确关联", () => {
    const examTypes: UIExamType[] = [
      {
        id: "type-001",
        name: "期末考试",
        description: "",
        color: "#EF4444",
        emoji: "🎯",
        isDefault: true,
      },
    ];

    const result = mapExam(makeDBExam({ type: "期末考试" }), examTypes);

    expect(result.typeInfo?.id).toBe("type-001");
    expect(result.typeInfo?.name).toBe("期末考试");
  });

  it("examTypes 为空时 typeInfo 为 undefined", () => {
    const result = mapExam(makeDBExam({ type: "期末考试" }), []);

    expect(result.typeInfo).toBeUndefined();
  });

  it("createdAt 和 updatedAt 正确映射", () => {
    const result = mapExam(
      makeDBExam({
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      })
    );

    expect(result.createdAt).toBe("2024-01-01T00:00:00Z");
    expect(result.updatedAt).toBe("2024-06-01T00:00:00Z");
  });
});
