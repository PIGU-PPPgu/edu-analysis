/**
 * 🧪 测试数据生成器导出
 */

export * from "./studentGenerator";
export * from "./gradeGenerator";
export * from "./examGenerator";

// 便捷导出
export {
  generateStudents,
  generateStudent,
  generateEdgeCaseStudents,
} from "./studentGenerator";
export {
  generateGradesForStudents,
  generateGradeForStudent,
  generateMultipleExams,
  generateEdgeCaseGrades,
} from "./gradeGenerator";
export {
  generateExam,
  generateSemesterExams,
  generateMultiGradeExams,
  generateTimeSeriesExams,
  generateEdgeCaseExams,
} from "./examGenerator";
