/**
 * 🧪 IntelligentFieldMapper 单元测试
 * 测试智能字段映射服务
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  analyzeCSVHeaders,
  analyzeCSVHeadersWithCache,
  FieldMapping,
} from "../intelligentFieldMapper";

describe("IntelligentFieldMapper", () => {
  describe("analyzeCSVHeaders - 基础字段识别", () => {
    it("应识别标准学生信息字段", () => {
      const headers = ["学号", "姓名", "班级"];
      const result = analyzeCSVHeaders(headers);

      expect(result.mappings).toContainEqual(
        expect.objectContaining({
          originalField: "学号",
          dataType: "student_info",
        })
      );
      expect(result.mappings).toContainEqual(
        expect.objectContaining({
          originalField: "姓名",
          dataType: "student_info",
        })
      );
      expect(result.mappings).toContainEqual(
        expect.objectContaining({
          originalField: "班级",
          dataType: "student_info",
        })
      );
    });

    it("应识别英文字段名", () => {
      const headers = ["student_id", "name", "class"];
      const result = analyzeCSVHeaders(headers);

      expect(result.mappings.length).toBeGreaterThan(0);
      expect(result.mappings.some((m) => m.dataType === "student_info")).toBe(
        true
      );
    });

    it("应识别带特殊字符的字段名", () => {
      const headers = ["学号(ID)", "姓名/名字", "班级_class"];
      const result = analyzeCSVHeaders(headers);

      expect(result.mappings.length).toBe(3);
      expect(result.mappings.every((m) => m.confidence > 0)).toBe(true);
    });
  });

  describe("analyzeCSVHeaders - 科目识别", () => {
    it("应识别单科目成绩字段", () => {
      const headers = ["学号", "姓名", "语文", "数学", "英语"];
      const result = analyzeCSVHeaders(headers);

      expect(result.subjects).toContain("语文");
      expect(result.subjects).toContain("数学");
      expect(result.subjects).toContain("英语");
      expect(result.subjects.length).toBe(3);
    });

    it("应识别带后缀的科目字段", () => {
      const headers = ["学号", "语文分数", "数学分数", "英语分数"];
      const result = analyzeCSVHeaders(headers);

      expect(result.subjects).toContain("语文");
      expect(result.subjects).toContain("数学");
      expect(result.subjects).toContain("英语");

      const chineseMapping = result.mappings.find(
        (m) => m.originalField === "语文分数"
      );
      expect(chineseMapping?.subject).toBe("语文");
      expect(chineseMapping?.dataType).toBe("score");
    });

    it("应识别多维度科目数据(分数+等级+排名)", () => {
      const headers = [
        "学号",
        "语文分数",
        "语文等级",
        "语文班名",
        "语文校名",
        "数学分数",
        "数学等级",
      ];
      const result = analyzeCSVHeaders(headers);

      const chineseFields = result.mappings.filter((m) => m.subject === "语文");
      expect(chineseFields).toHaveLength(4);

      const scoreField = chineseFields.find((m) => m.dataType === "score");
      const gradeField = chineseFields.find((m) => m.dataType === "grade");
      const classRankField = chineseFields.find(
        (m) => m.dataType === "rank_class"
      );
      const schoolRankField = chineseFields.find(
        (m) => m.dataType === "rank_school"
      );

      expect(scoreField).toBeDefined();
      expect(gradeField).toBeDefined();
      expect(classRankField).toBeDefined();
      expect(schoolRankField).toBeDefined();
    });

    it("应识别所有支持的科目", () => {
      const headers = [
        "学号",
        "语文",
        "数学",
        "英语",
        "物理",
        "化学",
        "生物",
        "政治",
        "历史",
        "地理",
      ];
      const result = analyzeCSVHeaders(headers);

      expect(result.subjects).toEqual(
        expect.arrayContaining([
          "语文",
          "数学",
          "英语",
          "物理",
          "化学",
          "生物",
          "政治",
          "历史",
          "地理",
        ])
      );
    });

    it("应识别道法/道德与法治作为政治", () => {
      const headers = ["学号", "道法", "道德与法治"];
      const result = analyzeCSVHeaders(headers);

      // 道法和道德与法治都应该映射到政治
      const politicsFields = result.mappings.filter(
        (m) => m.subject === "政治"
      );
      expect(politicsFields.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("analyzeCSVHeaders - 排名字段识别", () => {
    it("应识别总分排名字段", () => {
      const headers = ["学号", "总分", "班级排名", "年级排名", "学校排名"];
      const result = analyzeCSVHeaders(headers);

      const classRank = result.mappings.find(
        (m) => m.originalField === "班级排名"
      );
      const gradeRank = result.mappings.find(
        (m) => m.originalField === "年级排名"
      );

      expect(classRank?.dataType).toBe("rank_class");
      expect(gradeRank?.dataType).toBe("rank_grade");
    });

    it("应识别别名排名字段(班名/级名/校名)", () => {
      const headers = ["学号", "总分班名", "总分级名", "总分校名"];
      const result = analyzeCSVHeaders(headers);

      const hasClassRank = result.mappings.some(
        (m) => m.dataType === "rank_class"
      );
      const hasGradeRank = result.mappings.some(
        (m) => m.dataType === "rank_grade"
      );
      const hasSchoolRank = result.mappings.some(
        (m) => m.dataType === "rank_school"
      );

      expect(hasClassRank).toBe(true);
      expect(hasGradeRank).toBe(true);
      expect(hasSchoolRank).toBe(true);
    });

    it("应识别科目特定排名", () => {
      const headers = ["学号", "语文班名", "语文级名", "数学班名"];
      const result = analyzeCSVHeaders(headers);

      const chineseClassRank = result.mappings.find(
        (m) => m.subject === "语文" && m.dataType === "rank_class"
      );
      const chineseGradeRank = result.mappings.find(
        (m) => m.subject === "语文" && m.dataType === "rank_grade"
      );
      const mathClassRank = result.mappings.find(
        (m) => m.subject === "数学" && m.dataType === "rank_class"
      );

      expect(chineseClassRank).toBeDefined();
      expect(chineseGradeRank).toBeDefined();
      expect(mathClassRank).toBeDefined();
    });
  });

  describe("analyzeCSVHeaders - 等级字段识别", () => {
    it("应识别等级字段", () => {
      const headers = ["学号", "语文等级", "数学评级", "英语级别"];
      const result = analyzeCSVHeaders(headers);

      const chineseGrade = result.mappings.find(
        (m) => m.originalField === "语文等级"
      );
      const mathGrade = result.mappings.find(
        (m) => m.originalField === "数学评级"
      );
      const englishGrade = result.mappings.find(
        (m) => m.originalField === "英语级别"
      );

      expect(chineseGrade?.dataType).toBe("grade");
      expect(mathGrade?.dataType).toBe("grade");
      expect(englishGrade?.dataType).toBe("grade");
    });
  });

  describe("analyzeCSVHeaders - 置信度评分", () => {
    it("标准字段应有高置信度(>0.9)", () => {
      const headers = ["学号", "姓名", "班级", "语文", "数学"];
      const result = analyzeCSVHeaders(headers);

      expect(result.confidence).toBeGreaterThan(0.9);
      result.mappings.forEach((mapping) => {
        expect(mapping.confidence).toBeGreaterThan(0.8);
      });
    });

    it("模糊字段应有中等置信度(0.5-0.8)", () => {
      const headers = ["学号", "成绩1", "成绩2"]; // 模糊的科目名
      const result = analyzeCSVHeaders(headers);

      // 整体置信度应该下降
      expect(result.confidence).toBeLessThan(0.9);
    });

    it("未知字段应有低置信度(<0.5)", () => {
      const headers = ["unknown_field_1", "mystery_column", "random_data"];
      const result = analyzeCSVHeaders(headers);

      expect(result.confidence).toBeLessThan(0.5);
    });

    it("越多标准字段,整体置信度应越高", () => {
      const fewStandard = analyzeCSVHeaders(["学号", "col1", "col2"]);
      const manyStandard = analyzeCSVHeaders([
        "学号",
        "姓名",
        "班级",
        "语文",
        "数学",
      ]);

      expect(manyStandard.confidence).toBeGreaterThan(fewStandard.confidence);
    });
  });

  describe("analyzeCSVHeaders - 边界情况", () => {
    it("应处理空表头数组", () => {
      const result = analyzeCSVHeaders([]);

      expect(result.mappings).toEqual([]);
      expect(result.subjects).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it("应处理重复表头", () => {
      const headers = ["学号", "语文", "语文", "数学"];
      const result = analyzeCSVHeaders(headers);

      // 应该能处理重复,并返回结果
      expect(result.mappings.length).toBeGreaterThan(0);
    });

    it("应处理全部为空字符串的表头", () => {
      const headers = ["", "", ""];
      const result = analyzeCSVHeaders(headers);

      // 空字段应被忽略或给予低置信度
      expect(result.confidence).toBeLessThan(0.3);
    });

    it("应处理包含特殊字符的表头", () => {
      const headers = ["学号@#$", "语文(满分150)", "数学[必修]"];
      const result = analyzeCSVHeaders(headers);

      // 应该能提取有效部分
      expect(result.mappings.length).toBeGreaterThan(0);
    });

    it("应处理超长表头", () => {
      const longHeader =
        "这是一个非常长的表头名称包含了很多无用的信息但实际上就是学号";
      const headers = [longHeader, "姓名"];
      const result = analyzeCSVHeaders(headers);

      // 应该能识别其中的关键词"学号"
      const studentIdMapping = result.mappings.find(
        (m) => m.originalField === longHeader
      );
      expect(studentIdMapping).toBeDefined();
    });

    it("应处理混合大小写", () => {
      const headers = ["Student_ID", "NAME", "ChINeSe", "MATH"];
      const result = analyzeCSVHeaders(headers);

      // 大小写不敏感
      expect(result.mappings.length).toBe(4);
    });
  });

  describe("analyzeCSVHeadersWithCache - 缓存功能", () => {
    it("相同表头第二次调用应使用缓存", () => {
      const headers = ["学号", "姓名", "语文", "数学"];

      const result1 = analyzeCSVHeadersWithCache(headers);
      const result2 = analyzeCSVHeadersWithCache(headers);

      expect(result1.cacheHits).toBe(0); // 第一次没有缓存
      expect(result2.cacheHits).toBeGreaterThan(0); // 第二次使用缓存
      expect(result1.mappings).toEqual(result2.mappings);
    });

    it("不同表头应分别缓存", () => {
      const headers1 = ["学号", "语文"];
      const headers2 = ["学号", "数学"];

      const result1 = analyzeCSVHeadersWithCache(headers1);
      const result2 = analyzeCSVHeadersWithCache(headers2);

      // 两个结果应该不同
      expect(result1.subjects).not.toEqual(result2.subjects);
    });
  });

  describe("analyzeCSVHeaders - 实际场景测试", () => {
    it("场景1: 标准期末考试成绩表", () => {
      const headers = [
        "学号",
        "姓名",
        "班级",
        "语文",
        "数学",
        "英语",
        "物理",
        "化学",
        "总分",
        "班级排名",
        "年级排名",
      ];
      const result = analyzeCSVHeaders(headers);

      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.subjects).toEqual(
        expect.arrayContaining(["语文", "数学", "英语", "物理", "化学"])
      );
      expect(result.mappings.length).toBeGreaterThan(10);
    });

    it("场景2: 多维度成绩表(分数+等级+排名)", () => {
      const headers = [
        "学号",
        "姓名",
        "语文分数",
        "语文等级",
        "语文班名",
        "数学分数",
        "数学等级",
        "数学班名",
        "总分",
        "总分班名",
      ];
      const result = analyzeCSVHeaders(headers);

      expect(result.subjects).toContain("语文");
      expect(result.subjects).toContain("数学");

      // 每个科目应有3个维度的映射
      const chineseMappings = result.mappings.filter(
        (m) => m.subject === "语文"
      );
      expect(chineseMappings.length).toBe(3);
    });

    it("场景3: 简化成绩表(仅学号+科目分数)", () => {
      const headers = ["学号", "语文", "数学", "英语"];
      const result = analyzeCSVHeaders(headers);

      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.subjects).toHaveLength(3);
    });

    it("场景4: 含总分和单科的混合表", () => {
      const headers = ["学号", "姓名", "总分", "语文", "数学"];
      const result = analyzeCSVHeaders(headers);

      expect(result.subjects).toContain("语文");
      expect(result.subjects).toContain("数学");
      // 总分不应作为科目
      expect(result.subjects).not.toContain("总分");
    });

    it("场景5: 英文表头", () => {
      const headers = [
        "student_id",
        "name",
        "class",
        "chinese",
        "math",
        "english",
      ];
      const result = analyzeCSVHeaders(headers);

      expect(result.subjects.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe("analyzeCSVHeaders - 数据类型分类", () => {
    it("应正确分类所有数据类型", () => {
      const headers = [
        "学号", // student_info
        "姓名", // student_info
        "语文分数", // score
        "语文等级", // grade
        "语文班名", // rank_class
        "语文级名", // rank_grade
      ];
      const result = analyzeCSVHeaders(headers);

      const types = result.mappings.map((m) => m.dataType);
      expect(types).toContain("student_info");
      expect(types).toContain("score");
      expect(types).toContain("grade");
      expect(types).toContain("rank_class");
      expect(types).toContain("rank_grade");
    });
  });

  describe("analyzeCSVHeaders - studentFields 识别", () => {
    it("应正确识别学生字段列表", () => {
      const headers = ["学号", "姓名", "班级", "年级", "语文"];
      const result = analyzeCSVHeaders(headers);

      expect(result.studentFields).toBeDefined();
      expect(Array.isArray(result.studentFields)).toBe(true);
      expect(result.studentFields.length).toBeGreaterThan(0);

      // 学生字段应该包含学号、姓名、班级
      const studentFieldNames = result.studentFields.map(
        (f) => f.originalField
      );
      expect(studentFieldNames).toContain("学号");
      expect(studentFieldNames).toContain("姓名");
    });
  });
});
