/**
 * 报告生成服务 - 统一报告管理
 *
 * 功能：
 * - 学生学习报告
 * - 班级分析报告
 * - 教学效果报告
 * - 自定义报告模板
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { dataCache } from "../core/cache";
import { analysisService } from "./analysis";
import { gradeService } from "./grades";
import { studentService } from "./students";
import { classService } from "./classes";
import { knowledgeService } from "./knowledge";
import type { APIResponse } from "../core/api";

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: "student" | "class" | "teacher" | "custom";
  sections: Array<{
    id: string;
    title: string;
    type: "chart" | "table" | "text" | "analysis";
    config: any;
    order: number;
  }>;
  created_by: string;
  is_default: boolean;
  created_at: string;
}

export interface StudentReport {
  report_id: string;
  student_id: string;
  student_name: string;
  report_period: {
    start_date: string;
    end_date: string;
  };
  generated_at: string;
  sections: {
    academic_performance: {
      overall_grade: string;
      subject_breakdown: Array<{
        subject: string;
        current_score: number;
        trend: "improving" | "stable" | "declining";
        rank_in_class: number;
      }>;
      improvement_areas: string[];
      strengths: string[];
    };
    learning_behavior: {
      attendance_rate: number;
      homework_completion: number;
      participation_score: number;
      engagement_metrics: {
        active_days: number;
        study_time_estimate: number;
        help_requests: number;
      };
    };
    knowledge_mastery: {
      total_points_covered: number;
      mastered_points: number;
      struggling_points: Array<{
        name: string;
        mastery_level: number;
        recommended_actions: string[];
      }>;
      learning_path: Array<{
        knowledge_point: string;
        priority: "high" | "medium" | "low";
      }>;
    };
    ai_insights: {
      learning_style: string;
      personalized_recommendations: string[];
      risk_assessment: {
        level: "low" | "medium" | "high";
        factors: string[];
      };
    };
  };
  visualizations: Array<{
    type: string;
    title: string;
    data: any;
  }>;
}

export interface ClassReport {
  report_id: string;
  class_name: string;
  report_period: {
    start_date: string;
    end_date: string;
  };
  generated_at: string;
  sections: {
    class_overview: {
      total_students: number;
      average_performance: number;
      class_rank: number;
      improvement_rate: number;
    };
    performance_distribution: {
      excellent: number;
      good: number;
      average: number;
      needs_improvement: number;
      grade_distribution: Array<{
        grade_range: string;
        count: number;
        percentage: number;
      }>;
    };
    subject_analysis: Array<{
      subject: string;
      class_average: number;
      pass_rate: number;
      top_performers: string[];
      struggling_students: string[];
    }>;
    behavioral_patterns: {
      homework_completion_rate: number;
      participation_trends: string;
      engagement_score: number;
    };
    recommendations: {
      teaching_adjustments: string[];
      student_interventions: Array<{
        student_name: string;
        recommended_actions: string[];
      }>;
      resource_needs: string[];
    };
  };
  comparative_analysis: {
    vs_grade_average: {
      better: boolean;
      difference: number;
    };
    vs_previous_period: {
      improvement: boolean;
      change_percentage: number;
    };
  };
}

export interface TeachingEffectivenessReport {
  report_id: string;
  teacher_id: string;
  teacher_name: string;
  report_period: {
    start_date: string;
    end_date: string;
  };
  classes_covered: string[];
  sections: {
    student_outcomes: {
      total_students_taught: number;
      average_improvement: number;
      success_rate: number;
      grade_distribution: any;
    };
    teaching_metrics: {
      homework_effectiveness: number;
      student_engagement: number;
      knowledge_transfer_rate: number;
      differentiation_success: number;
    };
    feedback_analysis: {
      student_satisfaction: number;
      parent_feedback_score: number;
      peer_evaluation: number;
      common_themes: string[];
    };
    professional_development: {
      areas_of_strength: string[];
      improvement_opportunities: string[];
      recommended_training: string[];
    };
  };
}

export interface CustomReport {
  report_id: string;
  template_id: string;
  title: string;
  generated_for: {
    entity_type: "student" | "class" | "teacher" | "school";
    entity_ids: string[];
  };
  parameters: Record<string, any>;
  content: {
    sections: Array<{
      title: string;
      content_type: string;
      data: any;
    }>;
    summary: string;
    recommendations: string[];
  };
  generated_at: string;
  generated_by: string;
}

/**
 * 报告生成服务类
 */
export class ReportService {
  private readonly cachePrefix = "reports_";
  private readonly cacheTTL = 2 * 60 * 60 * 1000; // 2小时

  /**
   * 生成学生学习报告
   */
  async generateStudentReport(
    studentId: string,
    reportPeriod: {
      startDate: string;
      endDate: string;
    },
    options: {
      includeAIInsights?: boolean;
      includeComparisons?: boolean;
      templateId?: string;
    } = {}
  ): Promise<APIResponse<StudentReport>> {
    try {
      logInfo("生成学生学习报告", { studentId, reportPeriod, options });

      const cacheKey = `${this.cachePrefix}student_${studentId}_${reportPeriod.startDate}_${reportPeriod.endDate}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取学生基本信息
      const studentResponse = await studentService.getStudent(studentId);
      if (!studentResponse.success || !studentResponse.data) {
        return {
          success: false,
          error: "未找到学生信息",
        };
      }

      const student = studentResponse.data;
      const reportId = `student_report_${studentId}_${Date.now()}`;

      // 获取学术表现数据
      const academicPerformance = await this.getStudentAcademicPerformance(
        studentId,
        reportPeriod
      );

      // 获取学习行为数据
      const learningBehavior = await this.getStudentLearningBehavior(
        studentId,
        reportPeriod
      );

      // 获取知识点掌握情况
      const knowledgeMastery = await this.getStudentKnowledgeMastery(
        studentId,
        reportPeriod
      );

      // 获取AI洞察（如果启用）
      let aiInsights = null;
      if (options.includeAIInsights) {
        aiInsights = await this.getStudentAIInsights(studentId, reportPeriod);
      }

      // 生成可视化数据
      const visualizations = await this.generateStudentVisualizations(
        studentId,
        reportPeriod
      );

      const report: StudentReport = {
        report_id: reportId,
        student_id: studentId,
        student_name: student.name,
        report_period: {
          start_date: reportPeriod.startDate,
          end_date: reportPeriod.endDate,
        },
        generated_at: new Date().toISOString(),
        sections: {
          academic_performance: academicPerformance,
          learning_behavior: learningBehavior,
          knowledge_mastery: knowledgeMastery,
          ai_insights: aiInsights || {
            learning_style: "需要更多数据分析",
            personalized_recommendations: [],
            risk_assessment: { level: "low", factors: [] },
          },
        },
        visualizations,
      };

      dataCache.set(cacheKey, report, this.cacheTTL);
      return { success: true, data: report };
    } catch (error) {
      logError("生成学生学习报告失败", { studentId, error });
      return {
        success: false,
        error: error.message || "生成学生报告失败",
      };
    }
  }

  /**
   * 生成班级分析报告
   */
  async generateClassReport(
    className: string,
    reportPeriod: {
      startDate: string;
      endDate: string;
    },
    options: {
      includeComparisons?: boolean;
      includeRecommendations?: boolean;
    } = {}
  ): Promise<APIResponse<ClassReport>> {
    try {
      logInfo("生成班级分析报告", { className, reportPeriod, options });

      const cacheKey = `${this.cachePrefix}class_${className}_${reportPeriod.startDate}_${reportPeriod.endDate}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const reportId = `class_report_${className}_${Date.now()}`;

      // 获取班级概览
      const classOverview = await this.getClassOverview(className);

      // 获取成绩分布
      const performanceDistribution =
        await this.getClassPerformanceDistribution(className, reportPeriod);

      // 获取科目分析
      const subjectAnalysis = await this.getClassSubjectAnalysis(
        className,
        reportPeriod
      );

      // 获取行为模式分析
      const behavioralPatterns = await this.getClassBehavioralPatterns(
        className,
        reportPeriod
      );

      // 生成建议（如果启用）
      let recommendations = null;
      if (options.includeRecommendations) {
        recommendations = await this.generateClassRecommendations(className, {
          classOverview,
          performanceDistribution,
          subjectAnalysis,
        });
      }

      // 获取比较分析（如果启用）
      let comparativeAnalysis = null;
      if (options.includeComparisons) {
        comparativeAnalysis = await this.getClassComparativeAnalysis(
          className,
          reportPeriod
        );
      }

      const report: ClassReport = {
        report_id: reportId,
        class_name: className,
        report_period: {
          start_date: reportPeriod.startDate,
          end_date: reportPeriod.endDate,
        },
        generated_at: new Date().toISOString(),
        sections: {
          class_overview: classOverview,
          performance_distribution: performanceDistribution,
          subject_analysis: subjectAnalysis,
          behavioral_patterns: behavioralPatterns,
          recommendations: recommendations || {
            teaching_adjustments: [],
            student_interventions: [],
            resource_needs: [],
          },
        },
        comparative_analysis: comparativeAnalysis || {
          vs_grade_average: { better: false, difference: 0 },
          vs_previous_period: { improvement: false, change_percentage: 0 },
        },
      };

      dataCache.set(cacheKey, report, this.cacheTTL);
      return { success: true, data: report };
    } catch (error) {
      logError("生成班级分析报告失败", { className, error });
      return {
        success: false,
        error: error.message || "生成班级报告失败",
      };
    }
  }

  /**
   * 生成教学效果报告
   */
  async generateTeachingEffectivenessReport(
    teacherId: string,
    reportPeriod: {
      startDate: string;
      endDate: string;
    }
  ): Promise<APIResponse<TeachingEffectivenessReport>> {
    try {
      logInfo("生成教学效果报告", { teacherId, reportPeriod });

      const cacheKey = `${this.cachePrefix}teaching_${teacherId}_${reportPeriod.startDate}_${reportPeriod.endDate}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取教师信息
      const teacherResponse = await apiClient.query("teachers", {
        filters: { id: teacherId },
        select: ["name"],
        limit: 1,
      });

      const teacherName =
        teacherResponse.success && teacherResponse.data?.length
          ? teacherResponse.data[0].name
          : "未知教师";

      // 获取教师教授的班级
      const classesResponse = await apiClient.query("course_classes", {
        filters: { teacher_id: teacherId },
        select: ["class_name"],
      });

      const classesCovered =
        classesResponse.success && classesResponse.data
          ? classesResponse.data.map((c) => c.class_name)
          : [];

      const reportId = `teaching_report_${teacherId}_${Date.now()}`;

      // 分析学生成果
      const studentOutcomes = await this.analyzeStudentOutcomes(
        teacherId,
        classesCovered,
        reportPeriod
      );

      // 分析教学指标
      const teachingMetrics = await this.analyzeTeachingMetrics(
        teacherId,
        classesCovered,
        reportPeriod
      );

      // 反馈分析（模拟数据，实际需要连接反馈系统）
      const feedbackAnalysis = {
        student_satisfaction: 85,
        parent_feedback_score: 88,
        peer_evaluation: 90,
        common_themes: ["讲解清晰", "耐心细致", "方法有效"],
      };

      // 专业发展建议
      const professionalDevelopment =
        await this.generateProfessionalDevelopmentAdvice(teacherId, {
          studentOutcomes,
          teachingMetrics,
          feedbackAnalysis,
        });

      const report: TeachingEffectivenessReport = {
        report_id: reportId,
        teacher_id: teacherId,
        teacher_name: teacherName,
        report_period: {
          start_date: reportPeriod.startDate,
          end_date: reportPeriod.endDate,
        },
        classes_covered: classesCovered,
        sections: {
          student_outcomes: studentOutcomes,
          teaching_metrics: teachingMetrics,
          feedback_analysis: feedbackAnalysis,
          professional_development: professionalDevelopment,
        },
      };

      dataCache.set(cacheKey, report, this.cacheTTL);
      return { success: true, data: report };
    } catch (error) {
      logError("生成教学效果报告失败", { teacherId, error });
      return {
        success: false,
        error: error.message || "生成教学效果报告失败",
      };
    }
  }

  /**
   * 创建自定义报告模板
   */
  async createReportTemplate(
    templateData: Omit<ReportTemplate, "id" | "created_at">
  ): Promise<APIResponse<ReportTemplate>> {
    try {
      logInfo("创建自定义报告模板", { name: templateData.name });

      // 验证模板数据
      const validation = this.validateTemplateData(templateData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      const template: ReportTemplate = {
        ...templateData,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      };

      // 这里应该保存到数据库，暂时存储在缓存中
      dataCache.set(
        `${this.cachePrefix}template_${template.id}`,
        template,
        24 * 60 * 60 * 1000
      );

      return { success: true, data: template };
    } catch (error) {
      logError("创建自定义报告模板失败", error);
      return {
        success: false,
        error: error.message || "创建模板失败",
      };
    }
  }

  /**
   * 使用模板生成自定义报告
   */
  async generateCustomReport(
    templateId: string,
    parameters: {
      entityType: "student" | "class" | "teacher" | "school";
      entityIds: string[];
      reportPeriod: {
        startDate: string;
        endDate: string;
      };
      customParams?: Record<string, any>;
    },
    generatedBy: string
  ): Promise<APIResponse<CustomReport>> {
    try {
      logInfo("生成自定义报告", { templateId, parameters });

      // 获取模板
      const template = dataCache.get(
        `${this.cachePrefix}template_${templateId}`
      ) as ReportTemplate;
      if (!template) {
        return {
          success: false,
          error: "未找到报告模板",
        };
      }

      const reportId = `custom_report_${templateId}_${Date.now()}`;
      const sections: CustomReport["content"]["sections"] = [];

      // 根据模板配置生成各个部分
      for (const sectionConfig of template.sections) {
        const sectionData = await this.generateCustomReportSection(
          sectionConfig,
          parameters
        );

        sections.push({
          title: sectionConfig.title,
          content_type: sectionConfig.type,
          data: sectionData,
        });
      }

      // 生成摘要和建议
      const summary = this.generateCustomReportSummary(sections);
      const recommendations =
        this.generateCustomReportRecommendations(sections);

      const report: CustomReport = {
        report_id: reportId,
        template_id: templateId,
        title: `${template.name} - ${new Date().toLocaleDateString()}`,
        generated_for: {
          entity_type: parameters.entityType,
          entity_ids: parameters.entityIds,
        },
        parameters: {
          ...parameters,
          ...parameters.customParams,
        },
        content: {
          sections,
          summary,
          recommendations,
        },
        generated_at: new Date().toISOString(),
        generated_by: generatedBy,
      };

      return { success: true, data: report };
    } catch (error) {
      logError("生成自定义报告失败", { templateId, error });
      return {
        success: false,
        error: error.message || "生成自定义报告失败",
      };
    }
  }

  /**
   * 获取学生学术表现
   */
  private async getStudentAcademicPerformance(
    studentId: string,
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<StudentReport["sections"]["academic_performance"]> {
    try {
      // 获取学生成绩
      const gradesResponse = await gradeService.getStudentGrades(studentId, {
        startDate: reportPeriod.startDate,
        endDate: reportPeriod.endDate,
      });

      if (!gradesResponse.success || !gradesResponse.data?.length) {
        return {
          overall_grade: "N/A",
          subject_breakdown: [],
          improvement_areas: [],
          strengths: [],
        };
      }

      const grades = gradesResponse.data;

      // 计算总体成绩
      const averageScore =
        grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length;
      const overall_grade = this.scoreToGrade(averageScore);

      // 按科目分析
      const subjectMap = new Map<
        string,
        { scores: number[]; ranks: number[] }
      >();
      grades.forEach((grade) => {
        if (!subjectMap.has(grade.subject)) {
          subjectMap.set(grade.subject, { scores: [], ranks: [] });
        }
        subjectMap.get(grade.subject)!.scores.push(grade.score);
        if (grade.rank_in_class) {
          subjectMap.get(grade.subject)!.ranks.push(grade.rank_in_class);
        }
      });

      const subject_breakdown = Array.from(subjectMap.entries()).map(
        ([subject, data]) => {
          const avgScore =
            data.scores.reduce((sum, score) => sum + score, 0) /
            data.scores.length;
          const avgRank =
            data.ranks.length > 0
              ? data.ranks.reduce((sum, rank) => sum + rank, 0) /
                data.ranks.length
              : 0;

          // 简单的趋势计算
          let trend: "improving" | "stable" | "declining" = "stable";
          if (data.scores.length >= 2) {
            const recent = data.scores.slice(-2);
            const previous = data.scores.slice(0, -2);
            if (previous.length > 0) {
              const recentAvg =
                recent.reduce((sum, score) => sum + score, 0) / recent.length;
              const previousAvg =
                previous.reduce((sum, score) => sum + score, 0) /
                previous.length;
              if (recentAvg > previousAvg + 5) trend = "improving";
              else if (recentAvg < previousAvg - 5) trend = "declining";
            }
          }

          return {
            subject,
            current_score: Math.round(avgScore * 100) / 100,
            trend,
            rank_in_class: Math.round(avgRank),
          };
        }
      );

      // 识别优势和改进领域
      const sortedSubjects = [...subject_breakdown].sort(
        (a, b) => b.current_score - a.current_score
      );
      const strengths = sortedSubjects.slice(0, 2).map((s) => s.subject);
      const improvement_areas = sortedSubjects.slice(-2).map((s) => s.subject);

      return {
        overall_grade,
        subject_breakdown,
        improvement_areas,
        strengths,
      };
    } catch (error) {
      logError("获取学生学术表现失败", { studentId, error });
      return {
        overall_grade: "N/A",
        subject_breakdown: [],
        improvement_areas: [],
        strengths: [],
      };
    }
  }

  /**
   * 获取学生学习行为
   */
  private async getStudentLearningBehavior(
    studentId: string,
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<StudentReport["sections"]["learning_behavior"]> {
    try {
      // 获取作业提交数据
      const homeworkResponse = await apiClient.query("homework_submissions", {
        filters: {
          student_id: studentId,
          submitted_at: {
            gte: reportPeriod.startDate,
            lte: reportPeriod.endDate,
          },
        },
      });

      const submissions = homeworkResponse.success
        ? homeworkResponse.data || []
        : [];

      // 计算作业完成率
      const totalHomework = submissions.length;
      const completedHomework = submissions.filter(
        (s) => s.status !== "missing"
      ).length;
      const homework_completion =
        totalHomework > 0
          ? Math.round((completedHomework / totalHomework) * 100)
          : 0;

      // 模拟其他指标（实际应用中需要更多数据源）
      const attendance_rate = 95; // 需要考勤系统数据
      const participation_score = Math.min(100, homework_completion + 10); // 基于作业完成情况推算

      const engagement_metrics = {
        active_days: submissions.length, // 简化为提交次数
        study_time_estimate: submissions.length * 30, // 估算学习时间（分钟）
        help_requests: 0, // 需要额外的帮助请求数据
      };

      return {
        attendance_rate,
        homework_completion,
        participation_score,
        engagement_metrics,
      };
    } catch (error) {
      logError("获取学生学习行为失败", { studentId, error });
      return {
        attendance_rate: 0,
        homework_completion: 0,
        participation_score: 0,
        engagement_metrics: {
          active_days: 0,
          study_time_estimate: 0,
          help_requests: 0,
        },
      };
    }
  }

  /**
   * 获取学生知识点掌握情况
   */
  private async getStudentKnowledgeMastery(
    studentId: string,
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<StudentReport["sections"]["knowledge_mastery"]> {
    try {
      // 获取学生掌握度记录
      const masteryResponse =
        await knowledgeService.getStudentMastery(studentId);

      if (!masteryResponse.success || !masteryResponse.data?.length) {
        return {
          total_points_covered: 0,
          mastered_points: 0,
          struggling_points: [],
          learning_path: [],
        };
      }

      const masteryRecords = masteryResponse.data;
      const total_points_covered = masteryRecords.length;
      const mastered_points = masteryRecords.filter(
        (record) => record.mastery_level >= 70
      ).length;

      // 找出困难的知识点
      const strugglingRecords = masteryRecords
        .filter((record) => record.mastery_level < 60)
        .slice(0, 5); // 限制数量

      const struggling_points = await Promise.all(
        strugglingRecords.map(async (record) => {
          // 获取知识点信息
          const kpResponse = await apiClient.query("knowledge_points", {
            filters: { id: record.knowledge_point_id },
            select: ["name"],
            limit: 1,
          });

          const name =
            kpResponse.success && kpResponse.data?.length
              ? kpResponse.data[0].name
              : "未知知识点";

          return {
            name,
            mastery_level: record.mastery_level,
            recommended_actions: [
              "增加相关练习",
              "复习基础概念",
              "寻求教师帮助",
            ],
          };
        })
      );

      // 生成学习路径（简化版）
      const learning_path = struggling_points.map((point) => ({
        knowledge_point: point.name,
        priority:
          point.mastery_level < 40 ? ("high" as const) : ("medium" as const),
      }));

      return {
        total_points_covered,
        mastered_points,
        struggling_points,
        learning_path,
      };
    } catch (error) {
      logError("获取学生知识点掌握情况失败", { studentId, error });
      return {
        total_points_covered: 0,
        mastered_points: 0,
        struggling_points: [],
        learning_path: [],
      };
    }
  }

  /**
   * 获取学生AI洞察
   */
  private async getStudentAIInsights(
    studentId: string,
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<StudentReport["sections"]["ai_insights"]> {
    try {
      // 获取学习行为分析
      const behaviorAnalysis = await analysisService.analyzeLearningBehavior(
        studentId,
        reportPeriod
      );

      if (!behaviorAnalysis.success || !behaviorAnalysis.data) {
        return {
          learning_style: "需要更多数据分析",
          personalized_recommendations: [],
          risk_assessment: { level: "low", factors: [] },
        };
      }

      const analysis = behaviorAnalysis.data;

      // 确定主要学习风格
      const styleScores = analysis.learning_style_indicators;
      const dominantStyle = Object.entries(styleScores).reduce(
        (max, [style, score]) => (score > max.score ? { style, score } : max),
        { style: "", score: 0 }
      );

      const learning_style = this.formatLearningStyle(dominantStyle.style);

      // 生成个性化建议
      const personalized_recommendations = analysis.intervention_suggestions
        .map((suggestion) => suggestion.intervention)
        .slice(0, 3);

      // 风险评估
      const riskLevel =
        analysis.behavior_patterns.study_consistency < 0.5
          ? "high"
          : analysis.behavior_patterns.engagement_level < 0.7
            ? "medium"
            : "low";

      const riskFactors = [];
      if (analysis.behavior_patterns.study_consistency < 0.5) {
        riskFactors.push("学习缺乏规律性");
      }
      if (analysis.behavior_patterns.engagement_level < 0.7) {
        riskFactors.push("学习参与度偏低");
      }
      if (analysis.behavior_patterns.submission_patterns.on_time_rate < 70) {
        riskFactors.push("作业提交不及时");
      }

      return {
        learning_style,
        personalized_recommendations,
        risk_assessment: {
          level: riskLevel,
          factors: riskFactors,
        },
      };
    } catch (error) {
      logError("获取学生AI洞察失败", { studentId, error });
      return {
        learning_style: "需要更多数据分析",
        personalized_recommendations: [],
        risk_assessment: { level: "low", factors: [] },
      };
    }
  }

  /**
   * 生成学生可视化数据
   */
  private async generateStudentVisualizations(
    studentId: string,
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<StudentReport["visualizations"]> {
    const visualizations: StudentReport["visualizations"] = [];

    try {
      // 成绩趋势图
      const trendAnalysis = await analysisService.performTrendAnalysis(
        "individual",
        studentId,
        reportPeriod
      );

      if (trendAnalysis.success && trendAnalysis.data.data_points.length > 0) {
        visualizations.push({
          type: "line_chart",
          title: "成绩趋势",
          data: {
            labels: trendAnalysis.data.data_points.map((point) => point.date),
            datasets: [
              {
                label: "成绩",
                data: trendAnalysis.data.data_points.map(
                  (point) => point.value
                ),
                borderColor: "rgb(75, 192, 192)",
                backgroundColor: "rgba(75, 192, 192, 0.2)",
              },
            ],
          },
        });
      }

      // 科目雷达图（需要成绩数据）
      const gradesResponse = await gradeService.getStudentGrades(studentId, {
        startDate: reportPeriod.startDate,
        endDate: reportPeriod.endDate,
      });

      if (gradesResponse.success && gradesResponse.data?.length) {
        const subjectScores = new Map<string, number[]>();
        gradesResponse.data.forEach((grade) => {
          if (!subjectScores.has(grade.subject)) {
            subjectScores.set(grade.subject, []);
          }
          subjectScores.get(grade.subject)!.push(grade.score);
        });

        const subjects = Array.from(subjectScores.keys());
        const averages = subjects.map((subject) => {
          const scores = subjectScores.get(subject)!;
          return scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });

        if (subjects.length > 2) {
          visualizations.push({
            type: "radar_chart",
            title: "科目表现",
            data: {
              labels: subjects,
              datasets: [
                {
                  label: "平均分",
                  data: averages,
                  borderColor: "rgb(255, 99, 132)",
                  backgroundColor: "rgba(255, 99, 132, 0.2)",
                },
              ],
            },
          });
        }
      }
    } catch (error) {
      logError("生成学生可视化数据失败", { studentId, error });
    }

    return visualizations;
  }

  /**
   * 其他辅助方法的简化实现
   */
  private async getClassOverview(
    className: string
  ): Promise<ClassReport["sections"]["class_overview"]> {
    const classStats = await classService.getClassStatistics(className);

    if (classStats.success && classStats.data) {
      return {
        total_students: classStats.data.basic_info.total_students,
        average_performance: classStats.data.performance_metrics.average_score,
        class_rank:
          classStats.data.performance_metrics.grade_comparison.rank_in_grade,
        improvement_rate: 0, // 需要历史数据计算
      };
    }

    return {
      total_students: 0,
      average_performance: 0,
      class_rank: 0,
      improvement_rate: 0,
    };
  }

  private async getClassPerformanceDistribution(
    className: string,
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<ClassReport["sections"]["performance_distribution"]> {
    // 简化实现
    return {
      excellent: 10,
      good: 15,
      average: 12,
      needs_improvement: 3,
      grade_distribution: [
        { grade_range: "90-100", count: 10, percentage: 25 },
        { grade_range: "80-89", count: 15, percentage: 37.5 },
        { grade_range: "70-79", count: 12, percentage: 30 },
        { grade_range: "60-69", count: 3, percentage: 7.5 },
      ],
    };
  }

  private async getClassSubjectAnalysis(
    className: string,
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<ClassReport["sections"]["subject_analysis"]> {
    // 简化实现
    return [
      {
        subject: "数学",
        class_average: 85.5,
        pass_rate: 92.5,
        top_performers: ["张三", "李四"],
        struggling_students: ["王五"],
      },
      // ... 其他科目
    ];
  }

  private async getClassBehavioralPatterns(
    className: string,
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<ClassReport["sections"]["behavioral_patterns"]> {
    return {
      homework_completion_rate: 88.5,
      participation_trends: "整体参与度良好，部分学生需要鼓励",
      engagement_score: 82,
    };
  }

  private async generateClassRecommendations(
    className: string,
    analysisData: any
  ): Promise<ClassReport["sections"]["recommendations"]> {
    return {
      teaching_adjustments: ["增加互动式教学环节", "针对薄弱科目加强练习"],
      student_interventions: [
        {
          student_name: "王五",
          recommended_actions: ["个别辅导", "增加基础练习"],
        },
      ],
      resource_needs: ["多媒体教学设备", "补充练习材料"],
    };
  }

  private async getClassComparativeAnalysis(
    className: string,
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<ClassReport["comparative_analysis"]> {
    return {
      vs_grade_average: { better: true, difference: 3.5 },
      vs_previous_period: { improvement: true, change_percentage: 2.8 },
    };
  }

  private async analyzeStudentOutcomes(
    teacherId: string,
    classesCovered: string[],
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<TeachingEffectivenessReport["sections"]["student_outcomes"]> {
    return {
      total_students_taught: 120,
      average_improvement: 12.5,
      success_rate: 88.3,
      grade_distribution: {
        excellent: 30,
        good: 45,
        average: 35,
        needs_improvement: 10,
      },
    };
  }

  private async analyzeTeachingMetrics(
    teacherId: string,
    classesCovered: string[],
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<TeachingEffectivenessReport["sections"]["teaching_metrics"]> {
    return {
      homework_effectiveness: 85,
      student_engagement: 88,
      knowledge_transfer_rate: 82,
      differentiation_success: 78,
    };
  }

  private async generateProfessionalDevelopmentAdvice(
    teacherId: string,
    analysisData: any
  ): Promise<
    TeachingEffectivenessReport["sections"]["professional_development"]
  > {
    return {
      areas_of_strength: ["学生互动", "课程设计", "知识传授"],
      improvement_opportunities: ["差异化教学", "技术整合"],
      recommended_training: ["现代教学技术培训", "个性化教学方法"],
    };
  }

  private validateTemplateData(
    templateData: Omit<ReportTemplate, "id" | "created_at">
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!templateData.name?.trim()) {
      errors.push("模板名称不能为空");
    }

    if (!templateData.category) {
      errors.push("模板类别不能为空");
    }

    if (!templateData.sections || templateData.sections.length === 0) {
      errors.push("模板必须包含至少一个部分");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async generateCustomReportSection(
    sectionConfig: ReportTemplate["sections"][0],
    parameters: any
  ): Promise<any> {
    // 根据配置生成报告部分的具体实现
    // 这里是简化版本
    return {
      type: sectionConfig.type,
      config: sectionConfig.config,
      generated_data: `Generated content for ${sectionConfig.title}`,
    };
  }

  private generateCustomReportSummary(
    sections: CustomReport["content"]["sections"]
  ): string {
    return `基于${sections.length}个分析部分生成的综合报告摘要。`;
  }

  private generateCustomReportRecommendations(
    sections: CustomReport["content"]["sections"]
  ): string[] {
    return [
      "基于数据分析的改进建议1",
      "基于数据分析的改进建议2",
      "基于数据分析的改进建议3",
    ];
  }

  private scoreToGrade(score: number): string {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  private formatLearningStyle(style: string): string {
    const styleMap: Record<string, string> = {
      visual_learner: "视觉学习者",
      auditory_learner: "听觉学习者",
      kinesthetic_learner: "动觉学习者",
      reading_writing_learner: "读写学习者",
    };

    return styleMap[style] || "综合学习者";
  }
}

// 导出服务实例
export const reportService = new ReportService();
