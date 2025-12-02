/**
 * 🧪 GradeAnalysisService 单元测试
 * 测试成绩分析服务的核心功能
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  gradeAnalysisService,
  type MergeStrategy,
} from "../gradeAnalysisService";
import {
  setupTestDatabase,
  cleanTestData,
  insertTestData,
} from "../../test/db-setup";
import {
  generateStudents,
  generateGradesForStudents,
  generateExam,
} from "../../test/generators";
import type { ExamInfo } from "@/components/analysis/ImportReviewDialog";
import { requestCache } from "@/utils/cacheUtils";

describe("GradeAnalysisService", () => {
  beforeEach(async () => {
    // 清理缓存
    requestCache.clear();
    // 清理测试数据
    await cleanTestData(["grade_data", "exams", "students"]);
  });

  afterEach(async () => {
    // 清理测试数据
    await cleanTestData(["grade_data", "exams", "students"]);
    // 清理缓存
    requestCache.clear();
  });

  describe("saveExamData - replace策略", () => {
    it("应成功保存新考试数据（replace策略）", async () => {
      // 准备测试学生数据
      const students = generateStudents(10, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      // 准备考试信息
      const examInfo: ExamInfo = {
        title: "期中考试",
        type: "期中",
        date: "2024-11-01",
        scope: "class",
      };

      // 准备成绩数据（长表格格式：每行一个学生的一门科目）
      const gradeData = students.flatMap((student) => [
        {
          student_id: student.student_id,
          name: student.name,
          class_name: student.class_name,
          subject: "语文",
          score: 85,
          max_score: 100,
        },
        {
          student_id: student.student_id,
          name: student.name,
          class_name: student.class_name,
          subject: "数学",
          score: 90,
          max_score: 100,
        },
      ]);

      const result = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "replace"
      );

      expect(result.success).toBe(true);
      expect(result.examId).toBeDefined();
      expect(result.message).toContain("成功保存");
    });

    it("应替换已存在的考试数据（replace策略）", async () => {
      const students = generateStudents(5, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "期中考试",
        type: "期中",
        date: "2024-11-01",
        scope: "class",
      };

      // 第一次保存
      const gradeData1 = students.map((student) => ({
        student_id: student.student_id,
        name: student.name,
        class_name: student.class_name,
        subject: "语文",
        score: 70,
        max_score: 100,
      }));

      const result1 = await gradeAnalysisService.saveExamData(
        gradeData1,
        examInfo,
        "replace"
      );
      expect(result1.success).toBe(true);

      // 第二次保存（相同考试，不同分数）
      const gradeData2 = students.map((student) => ({
        student_id: student.student_id,
        name: student.name,
        class_name: student.class_name,
        subject: "语文",
        score: 90, // 分数改变
        max_score: 100,
      }));

      const result2 = await gradeAnalysisService.saveExamData(
        gradeData2,
        examInfo,
        "replace"
      );
      expect(result2.success).toBe(true);
      expect(result2.examId).toBe(result1.examId); // 应该是同一个考试ID

      // TODO: 验证数据库中的数据已被替换（需要查询功能）
    });
  });

  describe("saveExamData - append策略", () => {
    it("应追加新记录，保留已存在的记录（append策略）", async () => {
      const students = generateStudents(5, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "期末考试",
        type: "期末",
        date: "2024-12-01",
        scope: "class",
      };

      // 第一次保存（语文成绩）
      const gradeData1 = students.map((student) => ({
        student_id: student.student_id,
        name: student.name,
        class_name: student.class_name,
        subject: "语文",
        score: 85,
        max_score: 100,
      }));

      const result1 = await gradeAnalysisService.saveExamData(
        gradeData1,
        examInfo,
        "append"
      );
      expect(result1.success).toBe(true);

      // 第二次保存（数学成绩，不同科目）
      const gradeData2 = students.map((student) => ({
        student_id: student.student_id,
        name: student.name,
        class_name: student.class_name,
        subject: "数学",
        score: 90,
        max_score: 100,
      }));

      const result2 = await gradeAnalysisService.saveExamData(
        gradeData2,
        examInfo,
        "append"
      );
      expect(result2.success).toBe(true);

      // 数据库中应该同时包含语文和数学成绩
      // TODO: 验证数据库记录数量（需要查询功能）
    });

    it("应忽略重复记录（append策略）", async () => {
      const students = generateStudents(3, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "测验",
        type: "测验",
        date: "2024-11-15",
        scope: "class",
      };

      const gradeData = students.map((student) => ({
        student_id: student.student_id,
        name: student.name,
        class_name: student.class_name,
        subject: "英语",
        score: 88,
        max_score: 100,
      }));

      // 第一次保存
      const result1 = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "append"
      );
      expect(result1.success).toBe(true);

      // 第二次保存相同数据（应该忽略）
      const result2 = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "append"
      );
      expect(result2.success).toBe(true);

      // TODO: 验证数据库中没有重复记录
    });
  });

  describe("saveExamData - skip策略", () => {
    it("应跳过已存在的考试数据（skip策略）", async () => {
      const students = generateStudents(3, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "月考",
        type: "月考",
        date: "2024-10-15",
        scope: "class",
      };

      const gradeData = students.map((student) => ({
        student_id: student.student_id,
        name: student.name,
        class_name: student.class_name,
        subject: "物理",
        score: 75,
        max_score: 100,
      }));

      // 第一次保存
      const result1 = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "replace"
      );
      expect(result1.success).toBe(true);

      // 第二次使用skip策略保存
      const result2 = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "skip"
      );
      expect(result2.success).toBe(true);
      expect(result2.message).toContain("跳过导入");
    });
  });

  describe("saveExamData - 宽表格转长表格", () => {
    it("应正确转换宽表格数据（一行包含多科目）", async () => {
      const students = generateStudents(3, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "综合考试",
        type: "期末",
        date: "2024-12-15",
        scope: "class",
      };

      // 宽表格格式：每行包含学生的所有科目成绩
      const wideFormatData = students.map((student) => ({
        student_id: student.student_id,
        name: student.name,
        class_name: student.class_name,
        语文: 85,
        数学: 90,
        英语: 88,
        物理: 82,
        化学: 86,
      }));

      const result = await gradeAnalysisService.saveExamData(
        wideFormatData,
        examInfo,
        "replace"
      );

      expect(result.success).toBe(true);
      // 宽表格转换后应该生成 学生数 × 科目数 条记录
      // 3个学生 × 5门科目 = 15条记录
      // TODO: 验证转换后的记录数量
    });

    it("应正确处理包含多维度数据的宽表格（分数+等级+排名）", async () => {
      const students = generateStudents(2, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "期末大考",
        type: "期末",
        date: "2025-01-10",
        scope: "grade",
      };

      // 宽表格包含分数、等级、排名
      const complexWideData = students.map((student, index) => ({
        student_id: student.student_id,
        name: student.name,
        class_name: student.class_name,
        语文分数: 85 + index * 5,
        语文等级: "A",
        语文班名: index + 1,
        数学分数: 90 + index * 5,
        数学等级: "A",
        数学班名: index + 1,
      }));

      const result = await gradeAnalysisService.saveExamData(
        complexWideData,
        examInfo,
        "replace"
      );

      expect(result.success).toBe(true);
      // 应该正确提取分数、等级、排名信息
      // TODO: 验证转换后的数据结构
    });
  });

  describe("saveExamData - 数据验证", () => {
    it("应拒绝空的考试信息", async () => {
      const result = await gradeAnalysisService.saveExamData(
        [],
        {} as ExamInfo,
        "replace"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("考试信息不完整");
    });

    it("应拒绝缺少title的考试信息", async () => {
      const examInfo = {
        type: "期中",
        date: "2024-11-01",
      } as ExamInfo;

      const result = await gradeAnalysisService.saveExamData(
        [],
        examInfo,
        "replace"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("考试信息不完整");
    });

    it("应处理空的成绩数据数组", async () => {
      const examInfo: ExamInfo = {
        title: "空考试",
        type: "测验",
        date: "2024-11-20",
        scope: "class",
      };

      const result = await gradeAnalysisService.saveExamData(
        [],
        examInfo,
        "replace"
      );

      // 应该成功创建考试但没有成绩记录
      expect(result.success).toBe(true);
    });

    it("应处理不支持的合并策略", async () => {
      const students = generateStudents(1, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "测试考试",
        type: "测验",
        date: "2024-11-25",
        scope: "class",
      };

      const gradeData = [
        {
          student_id: students[0].student_id,
          name: students[0].name,
          class_name: students[0].class_name,
          subject: "语文",
          score: 80,
          max_score: 100,
        },
      ];

      const result = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "invalid_strategy" as MergeStrategy
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("不支持的合并策略");
    });
  });

  describe("saveExamData - 性能测试", () => {
    it("应在合理时间内保存大量数据（100个学生×5科目）", async () => {
      const students = generateStudents(100, {
        classNames: ["高一(1)班", "高一(2)班", "高一(3)班"],
      });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "大规模考试",
        type: "期末",
        date: "2024-12-30",
        scope: "grade",
      };

      // 100个学生 × 5门科目 = 500条记录
      const gradeData = students.flatMap((student) => [
        {
          student_id: student.student_id,
          name: student.name,
          class_name: student.class_name,
          subject: "语文",
          score: 70 + Math.random() * 30,
          max_score: 100,
        },
        {
          student_id: student.student_id,
          name: student.name,
          class_name: student.class_name,
          subject: "数学",
          score: 70 + Math.random() * 30,
          max_score: 100,
        },
        {
          student_id: student.student_id,
          name: student.name,
          class_name: student.class_name,
          subject: "英语",
          score: 70 + Math.random() * 30,
          max_score: 100,
        },
        {
          student_id: student.student_id,
          name: student.name,
          class_name: student.class_name,
          subject: "物理",
          score: 70 + Math.random() * 30,
          max_score: 100,
        },
        {
          student_id: student.student_id,
          name: student.name,
          class_name: student.class_name,
          subject: "化学",
          score: 70 + Math.random() * 30,
          max_score: 100,
        },
      ]);

      const startTime = Date.now();
      const result = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "replace"
      );
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    }, 15000); // 设置15秒超时

    it("应使用批处理保存超大数据（>500条记录）", async () => {
      const students = generateStudents(200, {
        classNames: ["高一(1)班", "高一(2)班", "高一(3)班", "高一(4)班"],
      });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "超大规模考试",
        type: "期末",
        date: "2025-01-15",
        scope: "grade",
      };

      // 200个学生 × 3门科目 = 600条记录（超过单批次500条限制）
      const gradeData = students.flatMap((student) => [
        {
          student_id: student.student_id,
          name: student.name,
          class_name: student.class_name,
          subject: "语文",
          score: 80,
          max_score: 100,
        },
        {
          student_id: student.student_id,
          name: student.name,
          class_name: student.class_name,
          subject: "数学",
          score: 85,
          max_score: 100,
        },
        {
          student_id: student.student_id,
          name: student.name,
          class_name: student.class_name,
          subject: "英语",
          score: 82,
          max_score: 100,
        },
      ]);

      const result = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "replace"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("600");
    }, 20000); // 设置20秒超时
  });

  describe("getExamList - 考试列表查询", () => {
    it("应返回按日期降序排列的考试列表", async () => {
      const students = generateStudents(2, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      // 创建多个考试
      const exam1: ExamInfo = {
        title: "期中考试",
        type: "期中",
        date: "2024-11-01",
        scope: "class",
      };

      const exam2: ExamInfo = {
        title: "期末考试",
        type: "期末",
        date: "2024-12-15",
        scope: "class",
      };

      const exam3: ExamInfo = {
        title: "月考",
        type: "月考",
        date: "2024-10-15",
        scope: "class",
      };

      // 保存考试数据
      await gradeAnalysisService.saveExamData([], exam1, "replace");
      await gradeAnalysisService.saveExamData([], exam2, "replace");
      await gradeAnalysisService.saveExamData([], exam3, "replace");

      // 获取考试列表
      const result = await gradeAnalysisService.getExamList();

      if (result.error) {
        console.error("获取考试列表失败:", result.error);
      }

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(3);

      // 验证日期排序（降序：最新的在前）
      if (result.data && result.data.length >= 2) {
        const dates = result.data.map((exam: any) =>
          new Date(exam.date).getTime()
        );
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });

    it("应在没有考试时返回空数组", async () => {
      const result = await gradeAnalysisService.getExamList();

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    });
  });

  describe("Edge Cases - 边界情况", () => {
    it("应处理特殊字符的考试标题", async () => {
      const students = generateStudents(1, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "2024-2025学年第一学期期末考试（高一）",
        type: "期末",
        date: "2025-01-20",
        scope: "grade",
      };

      const gradeData = [
        {
          student_id: students[0].student_id,
          name: students[0].name,
          class_name: students[0].class_name,
          subject: "语文",
          score: 90,
          max_score: 100,
        },
      ];

      const result = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "replace"
      );

      expect(result.success).toBe(true);
    });

    it("应处理分数为0的有效成绩", async () => {
      const students = generateStudents(1, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "补考",
        type: "补考",
        date: "2024-11-30",
        scope: "class",
      };

      const gradeData = [
        {
          student_id: students[0].student_id,
          name: students[0].name,
          class_name: students[0].class_name,
          subject: "数学",
          score: 0, // 0分也是有效成绩
          max_score: 100,
        },
      ];

      const result = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "replace"
      );

      expect(result.success).toBe(true);
    });

    it("应处理满分成绩", async () => {
      const students = generateStudents(1, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const examInfo: ExamInfo = {
        title: "满分测试",
        type: "测验",
        date: "2024-12-01",
        scope: "class",
      };

      const gradeData = [
        {
          student_id: students[0].student_id,
          name: students[0].name,
          class_name: students[0].class_name,
          subject: "英语",
          score: 100,
          max_score: 100,
        },
      ];

      const result = await gradeAnalysisService.saveExamData(
        gradeData,
        examInfo,
        "replace"
      );

      expect(result.success).toBe(true);
    });
  });
});
