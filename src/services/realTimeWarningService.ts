import { supabase } from "@/integrations/supabase/client";
import type { WarningFilter, WarningStatistics } from "./warningService";

// 实时预警计算服务 - 基于原始数据
export class RealTimeWarningService {
  /**
   * 基于成绩数据实时计算预警统计
   * 这是正确的架构：筛选器直接作用于原始数据，然后计算预警指标
   */
  async calculateWarningStatistics(
    filter?: WarningFilter
  ): Promise<WarningStatistics> {
    console.log("🚀 实时预警计算 - 基于原始数据", filter);

    try {
      // 1. 构建成绩数据查询
      let gradesQuery = supabase.from("grades").select(`
          student_id,
          subject,
          score,
          exam_title,
          exam_date,
          exam_type,
          students!inner(
            student_id,
            name,
            class_name
          )
        `);

      // 2. 应用筛选条件到原始数据
      if (filter?.classNames && filter.classNames.length > 0) {
        console.log("📚 筛选班级:", filter.classNames);
        gradesQuery = gradesQuery.in("students.class_name", filter.classNames);
      }

      if (filter?.examTitles && filter.examTitles.length > 0) {
        console.log("📊 筛选考试:", filter.examTitles);
        gradesQuery = gradesQuery.in("exam_title", filter.examTitles);
      }

      // 时间范围筛选
      if (filter?.timeRange && filter.timeRange !== "semester") {
        const now = new Date();
        let startDate: Date;

        switch (filter.timeRange) {
          case "month":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "quarter":
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          case "custom":
            if (filter.startDate) {
              startDate = new Date(filter.startDate);
              gradesQuery = gradesQuery.gte(
                "exam_date",
                startDate.toISOString().split("T")[0]
              );
            }
            if (filter.endDate) {
              const endDate = new Date(filter.endDate);
              gradesQuery = gradesQuery.lte(
                "exam_date",
                endDate.toISOString().split("T")[0]
              );
            }
            break;
          default:
            startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        }

        if (filter.timeRange !== "custom" && startDate) {
          gradesQuery = gradesQuery.gte(
            "exam_date",
            startDate.toISOString().split("T")[0]
          );
        }
      }

      const { data: gradesData, error: gradesError } = await gradesQuery;

      if (gradesError) {
        console.error("❌ 获取成绩数据失败:", gradesError);
        throw gradesError;
      }

      console.log("✅ 获取到成绩数据:", gradesData?.length || 0, "条记录");

      // 3. 基于真实数据实时计算预警指标
      const warningAnalysis = this.analyzeWarnings(gradesData || []);

      return warningAnalysis;
    } catch (error) {
      console.error("❌ 实时预警计算失败:", error);
      throw error;
    }
  }

  /**
   * 基于成绩数据分析预警情况
   */
  private analyzeWarnings(gradesData: any[]): WarningStatistics {
    console.log("🔍 开始分析预警情况...");

    // 按学生分组数据
    const studentData = new Map<
      string,
      {
        studentInfo: any;
        grades: any[];
      }
    >();

    gradesData.forEach((grade) => {
      const studentId = grade.student_id;
      if (!studentData.has(studentId)) {
        studentData.set(studentId, {
          studentInfo: grade.students,
          grades: [],
        });
      }
      studentData.get(studentId)!.grades.push(grade);
    });

    const students = Array.from(studentData.values());
    console.log("👥 分析学生数:", students.length);

    // 计算各种预警指标
    let warningStudents = 0;
    let highRiskStudents = 0;
    let totalWarnings = 0;
    let activeWarnings = 0;

    const riskDistribution = { low: 0, medium: 0, high: 0 };
    const categoryDistribution = {
      grade: 0,
      attendance: 0,
      behavior: 0,
      progress: 0,
      homework: 0,
      composite: 0,
    };
    const warningsByType: Array<{
      type: string;
      count: number;
      percentage: number;
      trend?: string;
    }> = [];
    const commonRiskFactors: Array<{
      factor: string;
      count: number;
      percentage: number;
      trend?: string;
    }> = [];

    // 按班级统计风险学生
    const riskByClass = new Map<
      string,
      {
        className: string;
        atRiskCount: number;
        studentCount: number;
      }
    >();

    // 风险因素统计
    const riskFactorCounts = new Map<string, number>();

    students.forEach((student) => {
      let studentWarningCount = 0;
      let studentRiskLevel = "low";

      // 1. 分析不及格情况
      const failingGrades = student.grades.filter((g) => g.score < 60);
      if (failingGrades.length >= 2) {
        studentWarningCount++;
        categoryDistribution.grade++;
        studentRiskLevel = "high";
        riskFactorCounts.set(
          "成绩不及格",
          (riskFactorCounts.get("成绩不及格") || 0) + 1
        );
      }

      // 2. 分析成绩波动
      const scores = student.grades.map((g) => g.score).sort((a, b) => a - b);
      const avgScore =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      if (avgScore < 70) {
        studentWarningCount++;
        categoryDistribution.progress++;
        if (studentRiskLevel === "low") studentRiskLevel = "medium";
        riskFactorCounts.set(
          "平均分过低",
          (riskFactorCounts.get("平均分过低") || 0) + 1
        );
      }

      // 3. 分析单科严重不及格
      const severeFailures = student.grades.filter((g) => g.score < 40);
      if (severeFailures.length > 0) {
        studentWarningCount++;
        categoryDistribution.grade++;
        studentRiskLevel = "high";
        riskFactorCounts.set(
          "严重不及格",
          (riskFactorCounts.get("严重不及格") || 0) + 1
        );
      }

      // 更新学生统计
      if (studentWarningCount > 0) {
        warningStudents++;
        totalWarnings += studentWarningCount;
        activeWarnings += studentWarningCount; // 实时计算都是活跃的

        // 统计风险等级
        if (studentRiskLevel === "high") {
          highRiskStudents++;
          riskDistribution.high++;
        } else if (studentRiskLevel === "medium") {
          riskDistribution.medium++;
        } else {
          riskDistribution.low++;
        }
      }

      // 按班级统计
      const className = student.studentInfo?.class_name || "未知班级";
      if (!riskByClass.has(className)) {
        riskByClass.set(className, {
          className,
          atRiskCount: 0,
          studentCount: 0,
        });
      }
      const classData = riskByClass.get(className)!;
      classData.studentCount++;
      if (studentWarningCount > 0) {
        classData.atRiskCount++;
      }
    });

    // 构建预警类型分布
    const totalWarningCount = totalWarnings || 1;
    warningsByType.push(
      {
        type: "学业预警",
        count: categoryDistribution.grade,
        percentage: Math.round(
          (categoryDistribution.grade / totalWarningCount) * 100
        ),
        trend: "up",
      },
      {
        type: "进步预警",
        count: categoryDistribution.progress,
        percentage: Math.round(
          (categoryDistribution.progress / totalWarningCount) * 100
        ),
        trend: "down",
      }
    );

    // 构建班级风险分布
    const riskByClassArray = Array.from(riskByClass.values())
      .map((classData) => ({
        className: classData.className,
        count: classData.atRiskCount,
        atRiskCount: classData.atRiskCount,
        studentCount: classData.studentCount,
        percentage:
          classData.studentCount > 0
            ? Math.round((classData.atRiskCount / classData.studentCount) * 100)
            : 0,
      }))
      .sort((a, b) => b.atRiskCount - a.atRiskCount)
      .slice(0, 5);

    // 构建风险因素分布
    Array.from(riskFactorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([factor, count]) => {
        commonRiskFactors.push({
          factor,
          count,
          percentage:
            warningStudents > 0
              ? Math.round((count / warningStudents) * 100)
              : 0,
          trend: "unchanged",
        });
      });

    const result: WarningStatistics = {
      totalStudents: students.length,
      warningStudents,
      atRiskStudents: warningStudents,
      warningRatio:
        students.length > 0
          ? parseFloat(((warningStudents / students.length) * 100).toFixed(1))
          : 0,
      highRiskStudents,
      totalWarnings,
      activeWarnings,
      riskDistribution,
      categoryDistribution,
      scopeDistribution: {
        global: totalWarnings,
        exam: 0,
        class: 0,
        student: 0,
      },
      warningsByType,
      riskByClass: riskByClassArray,
      commonRiskFactors,
    };

    console.log("✅ 实时预警分析完成:", {
      totalStudents: result.totalStudents,
      warningStudents: result.warningStudents,
      warningRatio: result.warningRatio,
      totalWarnings: result.totalWarnings,
    });

    return result;
  }

  /**
   * 获取作业相关预警数据
   */
  async calculateHomeworkWarnings(filter?: WarningFilter) {
    // 基于homework_submissions表计算作业相关预警
    // 这里可以实现作业迟交、未提交、质量差等预警指标
    console.log("📝 计算作业预警数据...");

    // TODO: 实现基于作业数据的预警计算
    return {
      lateSubmissions: 0,
      missingSubmissions: 0,
      lowQualitySubmissions: 0,
    };
  }
}

export const realTimeWarningService = new RealTimeWarningService();
