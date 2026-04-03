/**
 * examScoreCalculationService 单元测试
 * 覆盖：及格率、优秀率、平均分、自定义科目配置、边界值、错误场景
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ExamScoreCalculationService,
  type SubjectScoreConfig,
} from "@/services/examScoreCalculationService";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock sonner toast（服务内部可能调用）
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

import { supabase } from "@/integrations/supabase/client";

// 构造 supabase 链式 mock
function mockSubjectConfig(configs: Partial<SubjectScoreConfig>[]) {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: configs.map((c) => ({
        subject_code: c.subject_code ?? "chinese",
        subject_name: c.subject_name ?? "语文",
        total_score: c.total_score ?? 100,
        passing_score: c.passing_score ?? 60,
        excellent_score: c.excellent_score ?? 90,
        is_required: c.is_required ?? true,
        weight: c.weight ?? 1.0,
      })),
      error: null,
    }),
  } as any);
}

function mockSubjectConfigError() {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    }),
  } as any);
}

// 生成成绩数据的辅助函数
function makeGrades(scores: number[], subject = "chinese") {
  return scores.map((s) => ({
    total_score: s,
    [`${subject}_score`]: s,
  }));
}

describe("ExamScoreCalculationService", () => {
  let service: ExamScoreCalculationService;

  beforeEach(() => {
    vi.clearAllMocks();
    // 每次测试用新实例，绕过单例缓存
    // @ts-ignore 访问私有构造函数用于测试
    service = new (ExamScoreCalculationService as any)();
  });

  // ----------------------------------------------------------------
  // 及格率计算
  // ----------------------------------------------------------------
  describe("及格率计算", () => {
    it("全部及格 → passRate=100", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const grades = makeGrades([70, 80, 90, 100]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.passRate).toBe(100);
    });

    it("全部不及格 → passRate=0", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const grades = makeGrades([10, 20, 30, 59]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.passRate).toBe(0);
    });

    it("一半及格 → passRate=50", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const grades = makeGrades([40, 50, 60, 70]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.passRate).toBe(50);
    });

    it("边界值：恰好等于及格线 → 算及格", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const grades = makeGrades([60]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.passCount).toBe(1);
      expect(result.passRate).toBe(100);
    });

    it("空数组 → passRate=0, totalParticipants=0", async () => {
      mockSubjectConfig([]);

      const result = await service.calculateExamStatistics("exam-1", []);

      expect(result.passRate).toBe(0);
      expect(result.totalParticipants).toBe(0);
    });

    it("0分 → 不及格", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const grades = makeGrades([0]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.passCount).toBe(0);
    });

    it("满分 → 及格且优秀", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const grades = makeGrades([100]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.passCount).toBe(1);
      expect(result.excellentCount).toBe(1);
    });
  });

  // ----------------------------------------------------------------
  // 优秀率计算
  // ----------------------------------------------------------------
  describe("优秀率计算", () => {
    it("全部优秀 → excellentRate=100", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const grades = makeGrades([90, 95, 100]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.excellentRate).toBe(100);
    });

    it("无人优秀 → excellentRate=0", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const grades = makeGrades([60, 70, 80, 89]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.excellentRate).toBe(0);
      expect(result.excellentCount).toBe(0);
    });

    it("边界值：恰好等于优秀线 → 算优秀", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const grades = makeGrades([90]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.excellentCount).toBe(1);
    });
  });

  // ----------------------------------------------------------------
  // 平均分计算
  // ----------------------------------------------------------------
  describe("平均分计算", () => {
    it("正常计算平均分", async () => {
      mockSubjectConfig([]);

      const grades = makeGrades([60, 70, 80, 90]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.averageScore).toBe(75);
    });

    it("单个学生 → 平均分等于该学生分数", async () => {
      mockSubjectConfig([]);

      const grades = makeGrades([83]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.averageScore).toBe(83);
    });

    it("空数组 → 平均分=0", async () => {
      mockSubjectConfig([]);

      const result = await service.calculateExamStatistics("exam-1", []);

      expect(result.averageScore).toBe(0);
    });

    it("过滤 null/undefined/NaN 分数", async () => {
      mockSubjectConfig([]);

      const grades = [
        { total_score: 80 },
        { total_score: null },
        { total_score: undefined },
        { total_score: NaN },
        { total_score: 60 },
      ];
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.totalParticipants).toBe(2);
      expect(result.averageScore).toBe(70);
    });

    it("结果精确到小数点后2位", async () => {
      mockSubjectConfig([]);

      const grades = makeGrades([100, 0, 0]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      // 100/3 ≈ 33.33
      expect(result.averageScore).toBeCloseTo(33.33, 1);
    });
  });

  // ----------------------------------------------------------------
  // 自定义科目配置
  // ----------------------------------------------------------------
  describe("自定义科目配置", () => {
    it("使用数据库配置的及格线（非默认60分）", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 75, // 自定义及格线
          excellent_score: 95,
          is_required: true,
        },
      ]);

      const grades = makeGrades([70, 80]); // 70 < 75 不及格，80 >= 75 及格
      const result = await service.calculateExamStatistics("exam-1", grades);

      // 总分及格阈值由 required 科目的 passing_score 平均决定 = 75
      expect(result.passCount).toBe(1);
      expect(result.passRate).toBe(50);
    });

    it("数据库查询失败时回退到默认配置（60分及格线）", async () => {
      mockSubjectConfigError();

      const grades = makeGrades([65, 55]);
      const result = await service.calculateExamStatistics("exam-1", grades);

      // 默认及格线 60，65 及格，55 不及格
      expect(result.passCount).toBe(1);
    });

    it("各科目统计独立计算", async () => {
      mockSubjectConfig([
        {
          subject_code: "math",
          passing_score: 70,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const grades = [
        { total_score: 80, math_score: 75, chinese_score: 55 },
        { total_score: 60, math_score: 65, chinese_score: 80 },
      ];

      const result = await service.calculateExamStatistics("exam-1", grades);

      // math: 75 >= 70 及格，65 < 70 不及格 → passRate=50
      expect(result.subjectStats.math.passCount).toBe(1);
      expect(result.subjectStats.math.passRate).toBe(50);
    });

    it("科目无成绩数据时 subjectStats 返回全零", async () => {
      mockSubjectConfig([]);

      const grades = [{ total_score: 80 }]; // 无 physics_score
      const result = await service.calculateExamStatistics("exam-1", grades);

      expect(result.subjectStats.physics.totalParticipants).toBe(0);
      expect(result.subjectStats.physics.passRate).toBe(0);
      expect(result.subjectStats.physics.averageScore).toBe(0);
    });
  });

  // ----------------------------------------------------------------
  // isPass / isExcellent / getGradeLevel
  // ----------------------------------------------------------------
  describe("分数判断辅助方法", () => {
    it("isPass: 分数 >= 及格线 → true", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const result = await service.isPass("exam-1", "chinese", 60);
      expect(result).toBe(true);
    });

    it("isPass: 分数 < 及格线 → false", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const result = await service.isPass("exam-1", "chinese", 59);
      expect(result).toBe(false);
    });

    it("isExcellent: 分数 >= 优秀线 → true", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const result = await service.isExcellent("exam-1", "chinese", 90);
      expect(result).toBe(true);
    });

    it("getGradeLevel: 优秀 → '优秀'", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const level = await service.getGradeLevel("exam-1", "chinese", 95);
      expect(level).toBe("优秀");
    });

    it("getGradeLevel: 及格但非优秀 → '及格'", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const level = await service.getGradeLevel("exam-1", "chinese", 75);
      expect(level).toBe("及格");
    });

    it("getGradeLevel: 不及格 → '不及格'", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      const level = await service.getGradeLevel("exam-1", "chinese", 40);
      expect(level).toBe("不及格");
    });

    it("科目不存在时使用默认及格线60", async () => {
      mockSubjectConfig([]); // 空配置

      const passingScore = await service.getPassingScore(
        "exam-1",
        "unknown_subject"
      );
      expect(passingScore).toBe(60);
    });
  });

  // ----------------------------------------------------------------
  // 缓存机制
  // ----------------------------------------------------------------
  describe("缓存机制", () => {
    it("clearCache(examId) 清除指定考试缓存", async () => {
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);

      // 第一次加载（写入缓存）
      await service.getExamSubjectConfig("exam-cache-1");
      const callCountAfterFirst = vi.mocked(supabase.from).mock.calls.length;

      // 清除缓存后再次加载（应重新查询）
      service.clearCache("exam-cache-1");
      mockSubjectConfig([
        {
          subject_code: "chinese",
          passing_score: 60,
          excellent_score: 90,
          is_required: true,
        },
      ]);
      await service.getExamSubjectConfig("exam-cache-1");

      expect(vi.mocked(supabase.from).mock.calls.length).toBeGreaterThan(
        callCountAfterFirst
      );
    });

    it("clearCache() 无参数清除所有缓存", () => {
      // 不抛出错误即可
      expect(() => service.clearCache()).not.toThrow();
    });
  });
});
