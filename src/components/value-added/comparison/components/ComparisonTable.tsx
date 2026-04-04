"use client";

import { Badge } from "@/components/ui/badge";
import { safeToFixed } from "@/utils/formatUtils";
import type {
  TimePeriodData,
  ClassComparisonData,
  SubjectComparisonData,
  TeacherComparisonData,
} from "@/services/comparisonAnalysisService";
import type { ComparisonType, SUBJECTS } from "./ComparisonFilters";

interface ComparisonTableProps {
  comparisonType: ComparisonType;
  timeData: TimePeriodData[];
  classData: ClassComparisonData[];
  subjectData: SubjectComparisonData[];
  teacherData: TeacherComparisonData[];
}

export function ComparisonTable({
  comparisonType,
  timeData,
  classData,
  subjectData,
  teacherData,
}: ComparisonTableProps) {
  if (comparisonType === "time") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left">时间段</th>
              <th className="px-3 py-2 text-right">平均分</th>
              <th className="px-3 py-2 text-right">增值率</th>
              <th className="px-3 py-2 text-right">优秀率</th>
              <th className="px-3 py-2 text-right">及格率</th>
              <th className="px-3 py-2 text-right">巩固率</th>
              <th className="px-3 py-2 text-right">转化率</th>
            </tr>
          </thead>
          <tbody>
            {timeData.map((row, idx) => (
              <tr
                key={idx}
                className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-3 py-3 font-medium">{row.name}</td>
                <td className="px-3 py-3 text-right">
                  {safeToFixed(row.avgScore, 1)}
                </td>
                <td className="px-3 py-3 text-right">
                  <span
                    style={{
                      color: row.valueAddedRate >= 12 ? "#B9FF66" : undefined,
                      fontWeight: row.valueAddedRate >= 12 ? 700 : undefined,
                    }}
                  >
                    {safeToFixed(row.valueAddedRate, 1)}%
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {safeToFixed(row.excellentRate, 1)}%
                </td>
                <td className="px-3 py-3 text-right">
                  {safeToFixed(row.passRate, 1)}%
                </td>
                <td className="px-3 py-3 text-right">
                  {safeToFixed(row.consolidationRate, 1)}%
                </td>
                <td className="px-3 py-3 text-right">
                  {safeToFixed(row.transformationRate, 1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (comparisonType === "class") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left">排名</th>
              <th className="px-3 py-2 text-left">班级</th>
              <th className="px-3 py-2 text-right">入口分</th>
              <th className="px-3 py-2 text-right">出口分</th>
              <th className="px-3 py-2 text-right">增值率</th>
              <th className="px-3 py-2 text-right">入口标准分</th>
              <th className="px-3 py-2 text-right">出口标准分</th>
              <th className="px-3 py-2 text-right">优秀率</th>
              <th className="px-3 py-2 text-right">及格率</th>
              <th className="px-3 py-2 text-right">学生数</th>
              <th className="px-3 py-2 text-center">评价</th>
            </tr>
          </thead>
          <tbody>
            {classData.map((cls, idx) => (
              <tr
                key={idx}
                className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-3 py-3">
                  <Badge variant={idx === 0 ? "default" : "outline"}>
                    #{idx + 1}
                  </Badge>
                </td>
                <td className="px-3 py-3 font-medium">{cls.className}</td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {safeToFixed(cls.entryScore, 1)}
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  {safeToFixed(cls.exitScore, 1)}
                </td>
                <td className="px-3 py-3 text-right">
                  <span
                    style={{
                      color:
                        cls.valueAddedRate >= 12
                          ? "#B9FF66"
                          : cls.valueAddedRate >= 10
                            ? "#3b82f6"
                            : undefined,
                      fontWeight:
                        cls.valueAddedRate >= 12
                          ? 700
                          : cls.valueAddedRate >= 10
                            ? 600
                            : undefined,
                    }}
                  >
                    {safeToFixed(cls.valueAddedRate, 1)}%
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                  {safeToFixed(cls.entryStandardScore, 2)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                  {safeToFixed(cls.exitStandardScore, 2)}
                </td>
                <td className="px-3 py-3 text-right">
                  <span
                    style={{
                      color: cls.excellentRate >= 30 ? "#B9FF66" : undefined,
                      fontWeight: cls.excellentRate >= 30 ? 600 : undefined,
                    }}
                  >
                    {safeToFixed(cls.excellentRate, 1)}%
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <span
                    style={{
                      color:
                        cls.passRate >= 90
                          ? "#B9FF66"
                          : cls.passRate >= 80
                            ? "#3b82f6"
                            : undefined,
                    }}
                  >
                    {safeToFixed(cls.passRate, 1)}%
                  </span>
                </td>
                <td className="px-3 py-3 text-right">{cls.students}</td>
                <td className="px-3 py-3 text-center">
                  {cls.valueAddedRate >= 12 ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                      优秀
                    </Badge>
                  ) : cls.valueAddedRate >= 10 ? (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                      良好
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      一般
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (comparisonType === "subject") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left">科目</th>
              <th className="px-3 py-2 text-right">入口分</th>
              <th className="px-3 py-2 text-right">出口分</th>
              <th className="px-3 py-2 text-right">增值率</th>
              <th className="px-3 py-2 text-right">优秀率</th>
              <th className="px-3 py-2 text-right">入口标准分</th>
              <th className="px-3 py-2 text-right">出口标准分</th>
            </tr>
          </thead>
          <tbody>
            {subjectData.map((sub, idx) => (
              <tr
                key={idx}
                className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-3 py-3 font-medium">{sub.subject}</td>
                <td className="px-3 py-3 text-right text-muted-foreground">
                  {safeToFixed(sub.entryScore, 1)}
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  {safeToFixed(sub.exitScore, 1)}
                </td>
                <td className="px-3 py-3 text-right">
                  <span
                    style={{
                      color: sub.valueAddedRate >= 12 ? "#B9FF66" : undefined,
                      fontWeight: sub.valueAddedRate >= 12 ? 700 : undefined,
                    }}
                  >
                    {safeToFixed(sub.valueAddedRate, 1)}%
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {safeToFixed(sub.excellentRate, 1)}%
                </td>
                <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                  {safeToFixed(sub.entryStandardScore, 2)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                  {safeToFixed(sub.exitStandardScore, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (comparisonType === "teacher") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left">教师</th>
              <th className="px-3 py-2 text-right">平均分</th>
              <th className="px-3 py-2 text-right">增值率</th>
              <th className="px-3 py-2 text-right">巩固率</th>
              <th className="px-3 py-2 text-right">转化率</th>
              <th className="px-3 py-2 text-right">贡献率</th>
              <th className="px-3 py-2 text-right">学生数</th>
            </tr>
          </thead>
          <tbody>
            {teacherData.map((teacher, idx) => (
              <tr
                key={idx}
                className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-3 py-3 font-medium">{teacher.teacherName}</td>
                <td className="px-3 py-3 text-right">
                  {safeToFixed(teacher.avgScore, 1)}
                </td>
                <td className="px-3 py-3 text-right">
                  <span
                    style={{
                      color:
                        teacher.valueAddedRate >= 12 ? "#B9FF66" : undefined,
                      fontWeight:
                        teacher.valueAddedRate >= 12 ? 700 : undefined,
                    }}
                  >
                    {safeToFixed(teacher.valueAddedRate, 1)}%
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {safeToFixed(teacher.consolidationRate, 1)}%
                </td>
                <td className="px-3 py-3 text-right">
                  {safeToFixed(teacher.transformationRate, 1)}%
                </td>
                <td className="px-3 py-3 text-right font-semibold">
                  {safeToFixed(teacher.contributionRate, 1)}%
                </td>
                <td className="px-3 py-3 text-right">{teacher.students}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}
