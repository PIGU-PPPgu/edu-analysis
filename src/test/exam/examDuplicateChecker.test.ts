/**
 * examDuplicateChecker 单元测试
 * 覆盖：精确冲突、相似冲突、四种解决策略、无冲突场景
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ExamDuplicateChecker,
  type ExamInfo,
  type ExistingExam,
} from "@/services/examDuplicateChecker";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";

// 构造链式 mock 的辅助函数
function mockSupabaseQuery(returnValue: { data: any; error: any }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    then: undefined as any,
  };
  // 让非 single 结尾的链也能 resolve（用于 findSimilarMatch）
  chain.lte = vi.fn().mockResolvedValue(returnValue);
  vi.mocked(supabase.from).mockReturnValue(chain as any);
  return chain;
}

const BASE_EXAM: ExamInfo = {
  title: "2024学年上学期高一期末考试",
  type: "期末考试",
  date: "2024-06-15",
};

const EXISTING_EXAM: ExistingExam = {
  id: "exam-001",
  title: "2024学年上学期高一期末考试",
  type: "期末考试",
  date: "2024-06-15",
  created_at: "2024-06-01T00:00:00Z",
  grade_count: 0,
};

describe("ExamDuplicateChecker", () => {
  let checker: ExamDuplicateChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    checker = new ExamDuplicateChecker("ask_user");
  });

  // ----------------------------------------------------------------
  // 精确冲突检测
  // ----------------------------------------------------------------
  describe("精确冲突检测 (exact)", () => {
    it("相同标题+类型+日期 → isDuplicate=true, conflictType=exact", async () => {
      // findExactMatch 返回已有考试
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...EXISTING_EXAM, grade_data: [{ count: 0 }] },
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const result = await checker.checkDuplicate(BASE_EXAM);

      expect(result.isDuplicate).toBe(true);
      expect(result.conflictType).toBe("exact");
      expect(result.similarity).toBe(1.0);
      expect(result.existingExam?.id).toBe("exam-001");
    });

    it("精确冲突时 suggestions 包含 merge、rename、skip", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...EXISTING_EXAM, grade_data: [{ count: 0 }] },
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const result = await checker.checkDuplicate(BASE_EXAM);
      const actions = result.suggestions.map((s) => s.action);

      expect(actions).toContain("merge");
      expect(actions).toContain("rename");
      expect(actions).toContain("skip");
    });

    it("精确冲突且有成绩数据时 suggestions 包含 replace", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...EXISTING_EXAM,
            grade_count: 30,
            grade_data: [{ count: 30 }],
          },
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const result = await checker.checkDuplicate(BASE_EXAM);
      const actions = result.suggestions.map((s) => s.action);

      expect(actions).toContain("replace");
    });

    it("suggestions 按 confidence 降序排列", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...EXISTING_EXAM, grade_data: [{ count: 0 }] },
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const result = await checker.checkDuplicate(BASE_EXAM);
      const confidences = result.suggestions.map((s) => s.confidence);

      for (let i = 1; i < confidences.length; i++) {
        expect(confidences[i - 1]).toBeGreaterThanOrEqual(confidences[i]);
      }
    });
  });

  // ----------------------------------------------------------------
  // 相似冲突检测 (similar)
  // ----------------------------------------------------------------
  describe("相似冲突检测 (similar)", () => {
    it("标题高度相似+同类型+日期接近 → isDuplicate=true, conflictType=similar", async () => {
      // findExactMatch 返回空（PGRST116），findSimilarMatch 返回相似考试
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // findExactMatch: .select().eq().eq().eq().single()
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          } as any;
        }
        // findSimilarMatch: .select().gte().lte().eq() → Promise
        const similarData = [
          {
            ...EXISTING_EXAM,
            title: "2024学年上学期高一期末考试",
            grade_data: [{ count: 5 }],
          },
        ];
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: similarData, error: null }),
        } as any;
      });

      const similarExam: ExamInfo = {
        title: "2024学年上学期高一期末考试",
        type: "期末考试",
        date: "2024-06-16", // 差1天
      };

      const result = await checker.checkDuplicate(similarExam);

      expect(result.isDuplicate).toBe(true);
      expect(result.conflictType).toBe("similar");
    });

    it("相似度低于0.8时不触发冲突", async () => {
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          } as any;
        }
        const lowSimilarityData = [
          {
            id: "exam-002",
            title: "完全不同的考试名称ABCDEFG",
            type: "期末考试",
            date: "2024-06-20",
            created_at: "2024-06-01T00:00:00Z",
            grade_data: [{ count: 0 }],
          },
        ];
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          eq: vi
            .fn()
            .mockResolvedValue({ data: lowSimilarityData, error: null }),
        } as any;
      });

      const result = await checker.checkDuplicate({
        title: "高一月考",
        type: "期末考试",
        date: "2024-06-15",
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.conflictType).toBe("none");
    });
  });

  // ----------------------------------------------------------------
  // 无冲突场景
  // ----------------------------------------------------------------
  describe("无冲突场景", () => {
    it("全新考试 → isDuplicate=false, conflictType=none, suggestions=[]", async () => {
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      });

      const result = await checker.checkDuplicate({
        title: "全新考试2025",
        type: "月考",
        date: "2025-03-01",
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.conflictType).toBe("none");
      expect(result.suggestions).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // 四种解决策略
  // ----------------------------------------------------------------
  describe("resolveDuplicate 策略", () => {
    const duplicateResult = {
      isDuplicate: true,
      existingExam: EXISTING_EXAM,
      conflictType: "exact" as const,
      similarity: 1.0,
      suggestions: [],
    };

    it("merge 策略 → action=merged, 返回现有 examId", async () => {
      const result = await checker.resolveDuplicate(
        BASE_EXAM,
        duplicateResult,
        "merge"
      );

      expect(result.action).toBe("merged");
      expect(result.examId).toBe("exam-001");
    });

    it("skip 策略 → action=skipped, 返回现有 examId", async () => {
      const result = await checker.resolveDuplicate(
        BASE_EXAM,
        duplicateResult,
        "skip"
      );

      expect(result.action).toBe("skipped");
      expect(result.examId).toBe("exam-001");
    });

    it("replace 策略 → 删除旧考试并创建新考试", async () => {
      const newExamId = "exam-new-001";
      let callCount = 0;

      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // delete
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          } as any;
        }
        // insert (createExam)
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: newExamId },
            error: null,
          }),
        } as any;
      });

      const result = await checker.resolveDuplicate(
        BASE_EXAM,
        duplicateResult,
        "replace"
      );

      expect(result.action).toBe("replaced");
      expect(result.examId).toBe(newExamId);
    });

    it("rename 策略 → 创建新考试并返回 action=renamed", async () => {
      const newExamId = "exam-renamed-001";
      let callCount = 0;

      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // findExactMatch for renamed title → no conflict
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          } as any;
        }
        // createExam
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: newExamId },
            error: null,
          }),
        } as any;
      });

      const result = await checker.resolveDuplicate(
        BASE_EXAM,
        duplicateResult,
        "rename"
      );

      expect(result.action).toBe("renamed");
      expect(result.examId).toBe(newExamId);
    });

    it("skip_duplicates 自动策略 → action=skipped", async () => {
      const autoChecker = new ExamDuplicateChecker("skip_duplicates");
      const result = await autoChecker.resolveDuplicate(
        BASE_EXAM,
        duplicateResult
      );

      expect(result.action).toBe("skipped");
      expect(result.examId).toBe("exam-001");
    });

    it("auto_merge 自动策略 → action=merged", async () => {
      const autoChecker = new ExamDuplicateChecker("auto_merge");
      const result = await autoChecker.resolveDuplicate(
        BASE_EXAM,
        duplicateResult
      );

      expect(result.action).toBe("merged");
    });

    it("无重复时直接创建考试 → action=created", async () => {
      const newExamId = "exam-brand-new";
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: newExamId },
          error: null,
        }),
      } as any);

      const noDuplicate = {
        isDuplicate: false,
        conflictType: "none" as const,
        suggestions: [],
      };

      const result = await checker.resolveDuplicate(BASE_EXAM, noDuplicate);

      expect(result.action).toBe("created");
      expect(result.examId).toBe(newExamId);
    });

    it("ask_user 策略但未提供 userChoice → 抛出错误", async () => {
      await expect(
        checker.resolveDuplicate(BASE_EXAM, duplicateResult)
      ).rejects.toThrow("需要用户选择解决方案");
    });
  });

  // ----------------------------------------------------------------
  // 策略 getter/setter
  // ----------------------------------------------------------------
  describe("策略管理", () => {
    it("getStrategy 返回当前策略", () => {
      expect(checker.getStrategy()).toBe("ask_user");
    });

    it("setStrategy 更新策略", () => {
      checker.setStrategy("auto_merge");
      expect(checker.getStrategy()).toBe("auto_merge");
    });
  });
});
