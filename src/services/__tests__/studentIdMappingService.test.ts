import { describe, it, expect } from "vitest";
import {
  getGradeTableId,
  getStudentTableId,
  getMappingStats,
} from "../studentIdMappingService";

describe("studentIdMappingService", () => {
  describe("getGradeTableId", () => {
    it("should return grade table ID for valid student table ID", () => {
      // Using ID with unique 1:1 mapping
      const result = getGradeTableId("000020230142");
      expect(result).toBe("c0799b66-b53a-4684-bbf0-c379db7eabdf");
    });

    it("should return undefined for non-existent student table ID", () => {
      const result = getGradeTableId("INVALID_ID");
      expect(result).toBeUndefined();
    });

    it("should handle multiple valid mappings", () => {
      expect(getGradeTableId("000020230109")).toBe(
        "f0320701-1f6f-4a7d-9679-8496a2b94f04"
      );
      expect(getGradeTableId("000020230104")).toBe(
        "54ac8eb8-49d8-4edd-80f4-bdbaf801f45f"
      );
    });

    it("should return undefined for null input", () => {
      const result = getGradeTableId(null as any);
      expect(result).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      const result = getGradeTableId("");
      expect(result).toBeUndefined();
    });
  });

  describe("getStudentTableId", () => {
    it("should return student table ID for valid grade table ID", () => {
      const result = getStudentTableId("c0799b66-b53a-4684-bbf0-c379db7eabdf");
      expect(result).toBe("000020230142");
    });

    it("should return undefined for non-existent grade table ID", () => {
      const result = getStudentTableId("INVALID_UUID");
      expect(result).toBeUndefined();
    });

    it("should handle multiple valid reverse mappings", () => {
      expect(getStudentTableId("f0320701-1f6f-4a7d-9679-8496a2b94f04")).toBe(
        "000020230109"
      );
      expect(getStudentTableId("54ac8eb8-49d8-4edd-80f4-bdbaf801f45f")).toBe(
        "000020230104"
      );
    });

    it("should return undefined for null input", () => {
      const result = getStudentTableId(null as any);
      expect(result).toBeUndefined();
    });
  });

  describe("getMappingStats", () => {
    it("should return valid mapping statistics", () => {
      const stats = getMappingStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalMappings");
      expect(stats).toHaveProperty("exactMatches");
      expect(stats).toHaveProperty("nameMatches");
      expect(stats).toHaveProperty("mappingRate");
    });

    it("should return correct mapping counts", () => {
      const stats = getMappingStats();

      expect(stats.totalMappings).toBe(759);
      expect(stats.exactMatches).toBe(759);
      expect(stats.nameMatches).toBe(41);
      expect(stats.mappingRate).toBe(80);
    });

    it("should return consistent statistics", () => {
      const stats1 = getMappingStats();
      const stats2 = getMappingStats();

      expect(stats1).toEqual(stats2);
    });
  });

  describe("Bidirectional mapping consistency", () => {
    it("should maintain bidirectional consistency for sample IDs", () => {
      const studentId = "000020230142";
      const gradeId = getGradeTableId(studentId);
      const reversedStudentId = getStudentTableId(gradeId!);

      expect(reversedStudentId).toBe(studentId);
    });

    it("should work for multiple round trips", () => {
      // Using IDs with confirmed 1:1 mappings
      const testCases = ["000020230109", "000020230104", "000020230111"];

      testCases.forEach((studentId) => {
        const gradeId = getGradeTableId(studentId);
        expect(gradeId).toBeDefined();

        const reversedStudentId = getStudentTableId(gradeId!);
        expect(reversedStudentId).toBe(studentId);
      });
    });
  });
});
