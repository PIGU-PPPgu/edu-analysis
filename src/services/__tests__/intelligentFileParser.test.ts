/**
 * 🧪 IntelligentFileParser 单元测试
 * 测试智能文件解析器的各种场景
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as XLSX from "xlsx";
import {
  IntelligentFileParser,
  ParseOptions,
  FieldType,
} from "../intelligentFileParser";
import { aiEnhancedFileParser } from "@/services/aiEnhancedFileParser";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/services/intelligentFieldMapper", () => ({
  analyzeCSVHeaders: vi.fn((headers) => ({
    mappings: headers.map((h: string) => ({
      originalField: h,
      mappedField: h,
      confidence: 0.9,
    })),
    subjects: ["语文", "数学", "英语"],
    confidence: 0.9,
    studentFields: [],
  })),
}));

vi.mock("@/services/aiEnhancedFileParser", () => ({
  aiEnhancedFileParser: {
    oneClickParse: vi.fn(),
  },
}));

vi.mock("@/utils/fileParsingUtils", () => ({
  parseCSV: vi.fn(),
}));

describe("IntelligentFileParser", () => {
  let parser: IntelligentFileParser;

  beforeEach(() => {
    parser = new IntelligentFileParser();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("文件类型检测", () => {
    it("应正确识别Excel文件 (.xlsx)", () => {
      const file = new File([], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fileType = parser.detectFileType(file);
      expect(fileType).toBe("xlsx");
    });

    it("应正确识别旧版Excel文件 (.xls)", () => {
      const file = new File([], "test.xls", {
        type: "application/vnd.ms-excel",
      });
      const fileType = parser.detectFileType(file);
      expect(fileType).toBe("xls");
    });

    it("应正确识别CSV文件", () => {
      const file = new File([], "test.csv", { type: "text/csv" });
      const fileType = parser.detectFileType(file);
      expect(fileType).toBe("csv");
    });

    it("应拒绝不支持的文件类型", () => {
      const file = new File([], "test.pdf", { type: "application/pdf" });
      expect(() => parser.detectFileType(file)).toThrow("不支持的文件类型");
    });
  });

  describe("标准单行表头Excel解析", () => {
    it("应正确解析标准格式Excel文件", async () => {
      // 创建模拟Excel数据
      const mockData = [
        ["学号", "姓名", "班级", "语文", "数学", "英语"],
        ["TEST_001", "张三", "高一(1)班", "85", "90", "88"],
        ["TEST_002", "李四", "高一(1)班", "78", "82", "85"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const result = await parser.parseFile(file);

      expect(result.data).toHaveLength(2);
      expect(result.headers).toContain("学号");
      expect(result.headers).toContain("姓名");
      expect(result.metadata.fileType).toBe("xlsx");
      expect(result.metadata.totalRows).toBe(2);
      expect(result.metadata.confidence).toBeGreaterThan(0.7);
    });

    it("应正确识别学生字段", async () => {
      const mockData = [
        ["学号", "姓名", "班级", "总分"],
        ["001", "张三", "高一(1)班", "250"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const result = await parser.parseFile(file);

      expect(result.metadata.suggestedMappings).toHaveProperty("学号");
      expect(result.metadata.suggestedMappings).toHaveProperty("姓名");
      expect(result.metadata.suggestedMappings).toHaveProperty("班级");
    });
  });

  describe("多级表头Excel解析", () => {
    it("应正确合并多级表头", async () => {
      // 多级表头示例:
      // | 学号 | 姓名 |  语文  |  数学  |  英语  |
      // |      |      | 分数 等级 | 分数 等级 | 分数 等级 |
      const mockData = [
        ["学号", "姓名", "语文", "", "数学", "", "英语", ""],
        ["", "", "分数", "等级", "分数", "等级", "分数", "等级"],
        ["001", "张三", "85", "A", "90", "A", "88", "B"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "multilevel.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const result = await parser.parseFile(file);

      expect(result.data).toHaveLength(1);
      // 多级表头应该被合并为"语文分数"、"语文等级"等
      expect(result.headers.some((h) => h.includes("语文"))).toBe(true);
      expect(result.metadata.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("CSV文件解析", () => {
    it("应正确解析CSV文件", async () => {
      const { parseCSV } = await import("@/utils/fileParsingUtils");

      const mockCSVData = {
        data: [
          { 学号: "001", 姓名: "张三", 总分: "250" },
          { 学号: "002", 姓名: "李四", 总分: "240" },
        ],
        headers: ["学号", "姓名", "总分"],
      };

      vi.mocked(parseCSV).mockReturnValue(mockCSVData as any);

      const csvContent = "学号,姓名,总分\n001,张三,250\n002,李四,240";
      const file = new File([csvContent], "test.csv", { type: "text/csv" });

      const result = await parser.parseFile(file);

      expect(result.data).toHaveLength(2);
      expect(result.headers).toEqual(["学号", "姓名", "总分"]);
      expect(result.metadata.fileType).toBe("csv");
    });
  });

  describe("数据结构检测", () => {
    it("应识别宽表格式(wide format)", async () => {
      // 宽表: 每个学生一行,科目分散在多列
      const mockData = [
        ["学号", "姓名", "语文", "数学", "英语"],
        ["001", "张三", "85", "90", "88"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "wide.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const result = await parser.parseFile(file);

      expect(result.metadata.detectedStructure).toBe("wide");
    });

    it("应识别长表格式(long format)", async () => {
      // 长表: 每个学生-科目组合一行
      const mockData = [
        ["学号", "姓名", "科目", "分数"],
        ["001", "张三", "语文", "85"],
        ["001", "张三", "数学", "90"],
        ["001", "张三", "英语", "88"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "long.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const result = await parser.parseFile(file);

      expect(result.metadata.detectedStructure).toBe("long");
    });
  });

  describe("AI模式测试", () => {
    it("禁用AI模式时应只使用算法解析", async () => {
      const mockData = [
        ["学号", "姓名", "总分"],
        ["001", "张三", "250"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const options: ParseOptions = { aiMode: "disabled" };
      const result = await parser.parseFile(file, options);

      expect(result.metadata.parseMethod).toBe("algorithm");
    });

    it("强制AI模式应调用AI增强解析", async () => {
      const mockData = [
        ["学号", "姓名", "总分"],
        ["001", "张三", "250"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      vi.mocked(aiEnhancedFileParser.oneClickParse).mockResolvedValue({
        data: [{ student_id: "001", name: "张三", total_score: 250 }],
        headers: ["student_id", "name", "total_score"],
        metadata: {
          fileType: "xlsx",
          totalRows: 1,
          detectedStructure: "wide",
          confidence: 0.95,
          suggestedMappings: {
            学号: "student_id",
            姓名: "name",
            总分: "total_score",
          },
          detectedSubjects: [],
          autoProcessed: true,
        },
      } as any);

      const options: ParseOptions = { aiMode: "force" };
      const result = await parser.parseFile(file, options);

      expect(aiEnhancedFileParser.oneClickParse).toHaveBeenCalled();
      expect(result.metadata.parseMethod).toBe("ai-enhanced");
    });

    it("自动AI模式应在置信度低时启用AI", async () => {
      const { analyzeCSVHeaders } = await import(
        "@/services/intelligentFieldMapper"
      );

      // Mock低置信度的算法分析结果
      vi.mocked(analyzeCSVHeaders).mockReturnValue({
        mappings: [],
        subjects: [],
        confidence: 0.5, // 低置信度
        studentFields: [],
        cacheHits: 0,
      });

      const mockData = [
        ["col1", "col2", "col3"], // 难以识别的表头
        ["001", "张三", "250"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const options: ParseOptions = { aiMode: "auto", minConfidenceForAI: 0.8 };
      await parser.parseFile(file, options);

      // 应该尝试使用AI辅助(虽然可能失败,但会尝试)
      // 实际测试需要根据具体实现调整
    });
  });

  describe("错误处理", () => {
    it("应处理空文件", async () => {
      const file = new File([], "empty.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      await expect(parser.parseFile(file)).rejects.toThrow();
    });

    it("应处理损坏的Excel文件", async () => {
      const corruptedData = new Uint8Array([0x00, 0x01, 0x02]);
      const file = new File([corruptedData], "corrupted.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      await expect(parser.parseFile(file)).rejects.toThrow();
    });

    it("应处理没有表头的文件", async () => {
      const mockData = [
        ["001", "张三", "250"], // 直接是数据，没有表头
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "noheader.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const result = await parser.parseFile(file);

      // 应该能处理(可能使用列索引作为表头)
      expect(result.data.length).toBeGreaterThan(0);
    });

    it("应处理包含空行的文件", async () => {
      const mockData = [
        ["学号", "姓名", "总分"],
        ["001", "张三", "250"],
        [], // 空行
        ["002", "李四", "240"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "emptyrows.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const result = await parser.parseFile(file);

      // 应该过滤掉空行
      expect(result.data).toHaveLength(2);
      expect(result.data.every((row) => row["学号"])).toBe(true);
    });
  });

  describe("性能测试", () => {
    it("应在合理时间内解析大文件(1000行)", async () => {
      const mockData = [["学号", "姓名", "总分"]];

      // 生成1000行测试数据
      for (let i = 1; i <= 1000; i++) {
        mockData.push([
          `${i}`.padStart(3, "0"),
          `学生${i}`,
          `${200 + Math.random() * 100}`,
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "large.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const startTime = performance.now();
      const result = await parser.parseFile(file, { aiMode: "disabled" }); // 禁用AI加快速度
      const endTime = performance.now();

      expect(result.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // 应在5秒内完成
    }, 10000); // 设置10秒超时
  });

  describe("特殊字段识别", () => {
    it("应识别带单位的分数字段", async () => {
      const mockData = [
        ["学号", "语文(分)", "数学(分)", "总分(分)"],
        ["001", "85", "90", "175"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const result = await parser.parseFile(file);

      expect(result.metadata.detectedSubjects).toContain("语文");
      expect(result.metadata.detectedSubjects).toContain("数学");
    });

    it("应识别等级字段", async () => {
      const mockData = [
        ["学号", "语文分数", "语文等级", "数学分数", "数学等级"],
        ["001", "85", "A", "90", "A"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "grades.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const result = await parser.parseFile(file);

      const gradeFields = Object.keys(result.metadata.suggestedMappings).filter(
        (k) => k.includes("等级")
      );
      expect(gradeFields.length).toBeGreaterThan(0);
    });

    it("应识别排名字段", async () => {
      const mockData = [
        ["学号", "总分", "班级排名", "年级排名"],
        ["001", "250", "5", "25"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const file = new File([buffer], "rankings.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const result = await parser.parseFile(file);

      expect(result.metadata.suggestedMappings).toHaveProperty("班级排名");
      expect(result.metadata.suggestedMappings).toHaveProperty("年级排名");
    });
  });
});
