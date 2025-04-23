
// Import the utility modules
import { gradeUtils } from './grades';
import { warningSystem } from './warningSystem';
import { studentWarnings } from './studentWarnings';

// Export individual utility modules for direct access
export { gradeUtils } from './grades';
export { warningSystem } from './warningSystem';
export { studentWarnings } from './studentWarnings';

// Create and export a consolidated db object with all functions
export const db = {
  // Include functions from gradeUtils
  saveGradeData: gradeUtils.saveGradeData,
  getStudentPerformanceOverTime: gradeUtils.getStudentPerformanceOverTime,
  getClassPerformanceBySubject: gradeUtils.getClassPerformanceBySubject,
  
  // Include functions from studentWarnings
  getStudentWarnings: studentWarnings.getStudentWarnings,
  getWarningStatistics: studentWarnings.getWarningStatistics,
  getRiskFactors: studentWarnings.getRiskFactors
};
