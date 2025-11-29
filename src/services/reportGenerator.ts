/**
 * 📊 报告生成引擎
 * 自动生成成绩分析报告
 */

import { supabase } from "@/integrations/supabase/client";
import {
  AnalysisReport,
  ReportType,
  BasicAnalysis,
  AdvancedAnalysis,
  ReportSection,
  ActionItem,
  ReportGenerationOptions,
} from "@/types/report";
import { aiReportAnalyzer } from "./aiReportAnalyzer";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import {
  calculateBoxPlotStats,
  BoxPlotData,
} from "@/components/analysis/charts/BoxPlotChart";
import { calculateSubjectCorrelations } from "@/components/analysis/charts/CorrelationHeatmap";

export class ReportGenerator {
  /**
   * 生成基础分析报告
   */
  async generateBasicReport(
    examId: string,
    options: Partial<ReportGenerationOptions> = {}
  ): Promise<AnalysisReport | null> {
    return this.generateReport(examId, "basic", options);
  }

  /**
   * 生成高级分析报告
   */
  async generateAdvancedReport(
    examId: string,
    options: Partial<ReportGenerationOptions> = {}
  ): Promise<AnalysisReport | null> {
    return this.generateReport(examId, "advanced", options);
  }

  /**
   * 生成完整分析报告（基础+高级）
   */
  async generateCompleteReport(
    examId: string,
    options: Partial<ReportGenerationOptions> = {}
  ): Promise<AnalysisReport | null> {
    return this.generateReport(examId, "complete", options);
  }

  /**
   * 核心报告生成方法
   */
  private async generateReport(
    examId: string,
    reportType: ReportType,
    options: Partial<ReportGenerationOptions> = {}
  ): Promise<AnalysisReport | null> {
    try {
      console.log(`开始生成${reportType}报告: ${examId}`);

      // 1. 获取成绩数据（包含考试信息）
      const { data: gradeData, error: gradeError } = await supabase
        .from("grade_data")
        .select("*")
        .eq("exam_id", examId);

      if (gradeError || !gradeData || gradeData.length === 0) {
        console.error("获取成绩数据失败:", gradeError);
        toast.error("该考试暂无成绩数据");
        return null;
      }

      // 从成绩数据中提取考试信息
      const exam = {
        id: examId,
        title: gradeData[0]?.exam_title || "未命名考试",
        date: gradeData[0]?.exam_date,
        type: gradeData[0]?.exam_type,
      };

      // 2.5. 🔧 获取科目总分配置
      const { data: subjectScores } = await supabase
        .from("exam_subject_scores")
        .select("*")
        .eq("exam_id", examId);

      console.log(`读取到 ${subjectScores?.length || 0} 个科目总分配置`);

      // 3. 获取当前用户
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("用户未登录");
        return null;
      }

      // 4. 合并选项
      const finalOptions: ReportGenerationOptions = {
        includeAIAnalysis: true,
        includeAdvancedAnalysis: reportType !== "basic",
        maxInsightsPerSection: 5,
        aiMaxTokens: 1500,
        language: "zh-CN",
        ...options,
      };

      // 5. 生成AI洞察（如果启用）- 可选，失败不影响报告生成
      let aiInsights = undefined;
      if (finalOptions.includeAIAnalysis) {
        console.log("正在生成AI洞察...");
        try {
          aiInsights = await aiReportAnalyzer.analyzeGradeData(gradeData);
          console.log("AI洞察生成成功");
        } catch (error) {
          console.warn("AI分析失败，使用纯算法分析:", error);
          // AI失败不影响报告生成，继续
        }
      } else {
        console.log("跳过AI分析，使用纯算法分析");
      }

      // 5.5. 🆕 生成算法化的问题诊断（补充或替代AI分析）
      console.log("正在生成算法化问题诊断...");
      const algorithmicDiagnosis = this.generateProblemDiagnosis(
        gradeData,
        subjectScores || []
      );

      if (aiInsights) {
        // 合并算法诊断到AI洞察的warnings
        aiInsights.warnings = [...aiInsights.warnings, ...algorithmicDiagnosis];
        console.log(`已合并 ${algorithmicDiagnosis.length} 条算法诊断到AI洞察`);
      } else {
        // AI失败或未启用时，创建基础的insights对象
        aiInsights = {
          keyFindings: [],
          recommendations: [],
          warnings: algorithmicDiagnosis,
          summary: "本次报告基于算法分析生成，建议启用AI分析获取更深入的洞察",
          confidence: 0.8,
          generatedAt: new Date(),
          modelUsed: "算法分析",
        };
        console.log(
          `使用算法诊断创建基础洞察 (${algorithmicDiagnosis.length} 条)`
        );
      }

      // 6. 生成报告元数据
      const reportId = nanoid();
      const metadata = {
        reportId,
        examId,
        examTitle: exam.title,
        generatedAt: new Date(),
        generatedBy: user.id,
        reportType,
        dataSnapshot: {
          totalStudents: gradeData.length,
          totalClasses: new Set(gradeData.map((g) => g.class_name)).size,
          examDate: exam.date || new Date().toISOString(),
        },
      };

      // 7. 生成基础分析章节
      const basicAnalysis = this.generateBasicAnalysis(
        gradeData,
        aiInsights,
        subjectScores || []
      );

      // 8. 生成高级分析章节（如果需要）
      let advancedAnalysis: AdvancedAnalysis | undefined = undefined;
      if (finalOptions.includeAdvancedAnalysis) {
        advancedAnalysis = await this.generateAdvancedAnalysis(
          gradeData,
          examId
        );
      }

      // 9. 生成行动项
      const actionItems = this.generateActionItems(aiInsights, gradeData);

      // 10. 组装完整报告
      const report: AnalysisReport = {
        metadata,
        basicAnalysis,
        advancedAnalysis,
        aiInsights,
        actionItems,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log("报告生成成功");
      return report;
    } catch (error) {
      console.error("生成报告失败:", error);
      toast.error("生成报告失败，请重试");
      return null;
    }
  }

  /**
   * 生成基础分析章节
   */
  private generateBasicAnalysis(
    gradeData: any[],
    aiInsights: any,
    subjectScores: any[]
  ): BasicAnalysis {
    // 1. 考试概览
    const totalScores = gradeData
      .map((r) => parseFloat(r.total_score))
      .filter((s) => !isNaN(s));
    const avgScore =
      totalScores.reduce((a, b) => a + b, 0) / totalScores.length;

    // 🔧 动态获取总分满分
    let totalMaxScore = gradeData[0]?.total_max_score;

    // 如果数据库中没有total_max_score，则从科目满分累加计算
    if (!totalMaxScore || totalMaxScore === 0) {
      // 定义各科目默认满分
      const subjectDefaultScores: Record<string, number> = {
        chinese: 120, // 语文 120
        math: 100, // 数学 100
        english: 100, // 英语 100
        physics: 100, // 物理 100
        chemistry: 100, // 化学 100
        politics: 100, // 政治 100
        history: 100, // 历史 100
        biology: 100, // 生物 100
        geography: 100, // 地理 100
      };

      // 检测数据中存在哪些科目（有成绩的科目）
      totalMaxScore = 0;
      const detectedSubjects: string[] = [];

      Object.entries(subjectDefaultScores).forEach(
        ([subjectKey, defaultScore]) => {
          const hasScores = gradeData.some((record) => {
            const score = parseFloat(record[`${subjectKey}_score`]);
            return !isNaN(score) && score > 0;
          });

          if (hasScores) {
            totalMaxScore += defaultScore;
            detectedSubjects.push(subjectKey);
          }
        }
      );

      console.log(`⚠️  数据库中无total_max_score，根据检测到的科目计算：`, {
        detectedSubjects,
        calculatedTotal: totalMaxScore,
        breakdown: detectedSubjects
          .map((s) => `${s}=${subjectDefaultScores[s]}`)
          .join(", "),
      });

      console.log(
        `💡 提示：如需修改各科目满分，请在考试设置中配置 exam_subject_scores 表`
      );
    }

    const passLine = totalMaxScore * 0.6; // 60%及格
    const excellentLine = totalMaxScore * 0.85; // 85%优秀

    console.log(
      `📊 分数标准: 总分=${totalMaxScore}, 及格线=${passLine.toFixed(1)}, 优秀线=${excellentLine.toFixed(1)}`
    );

    const passRate =
      (totalScores.filter((s) => s >= passLine).length / totalScores.length) *
      100;
    const excellentRate =
      (totalScores.filter((s) => s >= excellentLine).length /
        totalScores.length) *
      100;

    const summary: ReportSection = {
      id: "summary",
      title: "考试概览",
      order: 1,
      insights: [
        `参考人数：${gradeData.length}人`,
        `平均分：${avgScore.toFixed(1)}分（满分${totalMaxScore}）`,
        `及格率：${passRate.toFixed(1)}%（≥${passLine.toFixed(0)}分）`,
        `优秀率：${excellentRate.toFixed(1)}%（≥${excellentLine.toFixed(0)}分）`,
      ],
      highlights: [
        {
          text:
            passRate >= 85
              ? "及格率达标✓"
              : `及格率${passRate.toFixed(1)}%，低于目标（85%）`,
          type: passRate >= 85 ? "success" : "warning",
        },
      ],
      aiGenerated: false,
    };

    // 2. 成绩分布
    const boxPlotData = this.calculateBoxPlotData(gradeData, subjectScores);
    const scoreDistribution: ReportSection = {
      id: "score-distribution",
      title: "成绩分布分析",
      order: 2,
      chartComponent: "ScoreDistributionChart",
      chartData: this.calculateScoreDistribution(totalScores, totalMaxScore),
      insights: this.generateScoreDistributionInsights(
        totalScores,
        totalMaxScore
      ),
      highlights: [],
      aiGenerated: false,
      // 🆕 添加箱线图数据
      rawData: {
        boxPlotData,
        totalScores,
        totalMaxScore,
      },
    };

    // 3. 班级对比
    const classComparison: ReportSection = {
      id: "class-comparison",
      title: "班级对比分析",
      order: 3,
      chartComponent: "ClassComparisonChart",
      chartData: this.calculateClassData(gradeData),
      insights: this.generateClassComparisonInsights(gradeData),
      highlights: [],
      aiGenerated: false,
    };

    // 4. 科目分析
    const subjectData = this.calculateSubjectData(gradeData, subjectScores);
    const subjectAnalysis: ReportSection = {
      id: "subject-analysis",
      title: "科目分析",
      order: 4,
      chartComponent: "SubjectRadarChart",
      chartData: subjectData,
      insights: this.generateSubjectInsights(gradeData, subjectScores),
      highlights: [],
      aiGenerated: false,
      // 添加详细统计表格数据
      detailedStats: subjectData,
      // 添加分数段分布数据
      scoreDistributionBySubject: this.calculateSubjectScoreDistribution(
        gradeData,
        subjectScores
      ),
      // 添加典型学生数据
      typicalStudents: this.getTypicalStudents(gradeData),
    };

    return {
      summary,
      scoreDistribution,
      classComparison,
      subjectAnalysis,
    };
  }

  /**
   * 生成高级分析章节
   */
  private async generateAdvancedAnalysis(
    gradeData: any[],
    currentExamId: string
  ): Promise<AdvancedAnalysis> {
    console.log("🚀 开始生成高级分析章节...");

    // 1. 等级流动分析（桑基图）- 需要历史数据
    let gradeFlowSection: ReportSection | undefined = undefined;
    const sankeyData = await this.generateGradeFlowData(
      currentExamId,
      gradeData
    );

    if (sankeyData) {
      console.log("✅ 桑基图数据已生成");
      gradeFlowSection = {
        id: "grade-flow",
        title: "等级流动分析",
        order: 1,
        chartComponent: "GradeFlowSankeyChart",
        chartData: sankeyData,
        insights: this.generateGradeFlowInsights(sankeyData),
        highlights: [],
        aiGenerated: false,
      };
    } else {
      console.log("⚠️  桑基图数据生成失败（可能缺少历史数据）");
    }

    // 2. 趋势分析（简化版，仅基于当前数据）
    const trends: ReportSection = {
      id: "trends",
      title: "成绩趋势分析",
      order: 2,
      chartComponent: "TrendChart",
      insights: ["当前考试数据分析"],
      highlights: [],
      aiGenerated: false,
    };

    // 3. 学科关联分析（相关性热力图）
    console.log("📊 正在计算学科相关性矩阵...");
    const correlationData = this.calculateSubjectCorrelationMatrix(gradeData);
    console.log(
      `✅ 相关性矩阵计算完成：${correlationData.subjects.length} 个科目，${correlationData.correlations.length} 条关系`
    );
    const correlations: ReportSection = {
      id: "correlations",
      title: "学科关联分析",
      order: 3,
      chartComponent: "CorrelationHeatmap",
      chartData: correlationData,
      insights: this.generateCorrelationInsights(correlationData),
      highlights: [],
      aiGenerated: false,
    };

    // 4. 🆕 多维排名分析（包含新图表）
    console.log("📊 正在生成排名相关图表数据...");

    // 计算总分满分
    const totalMaxScore = parseFloat(gradeData[0]?.total_max_score) || 523;

    // 生成绩效漏斗图数据
    const funnelData = this.generatePerformanceFunnelData(
      gradeData,
      totalMaxScore
    );

    // 🆕 生成排名分布数据（替代气泡图）
    const rankDistributionData = this.generateRankDistributionData(gradeData);

    // 🆕 生成SBI雷达图数据
    const sbiRadarData = this.generateSBIRadarData(gradeData);

    // 计算API和SBI指标样例（针对所有学生）
    const studentMetrics = gradeData.map((record) => {
      const totalStudents = gradeData.length;
      const currentScore = parseFloat(record.total_score) || 0;
      const currentRank = record.total_rank_in_class || 0;

      // 提取各科成绩计算SBI
      const subjectScores = [
        {
          subject: "语文",
          score: parseFloat(record.chinese_score) || 0,
          fullScore: 120,
        },
        {
          subject: "数学",
          score: parseFloat(record.math_score) || 0,
          fullScore: 100,
        },
        {
          subject: "英语",
          score: parseFloat(record.english_score) || 0,
          fullScore: 100,
        },
        {
          subject: "物理",
          score: parseFloat(record.physics_score) || 0,
          fullScore: 100,
        },
        {
          subject: "化学",
          score: parseFloat(record.chemistry_score) || 0,
          fullScore: 100,
        },
      ].filter((s) => s.score > 0);

      const api = this.calculateAPI(
        currentScore,
        totalMaxScore,
        currentRank,
        totalStudents
      );
      const sbi = this.calculateSBI(subjectScores);

      return {
        studentId: record.student_id,
        studentName: record.name,
        className: record.class_name,
        api,
        sbi,
        score: currentScore,
        rank: currentRank,
      };
    });

    // 计算平均API和SBI
    const avgAPI =
      studentMetrics.reduce((sum, s) => sum + s.api, 0) / studentMetrics.length;
    const avgSBI =
      studentMetrics.reduce((sum, s) => sum + s.sbi, 0) / studentMetrics.length;

    console.log(
      `✅ 排名图表数据生成完成: API平均=${avgAPI.toFixed(1)}, SBI平均=${avgSBI.toFixed(1)}`
    );

    const rankings: ReportSection = {
      id: "rankings",
      title: "多维度排名与综合指标分析",
      order: 4,
      chartComponent: "MultiDimensionalRanking",
      insights: [
        `📊 学业表现指数(API)平均值：${avgAPI.toFixed(1)}分（满分100分）`,
        `📐 学科均衡度(SBI)平均值：${avgSBI.toFixed(1)}分（100分表示完全均衡）`,
        `🏆 绩效分布：优秀${funnelData[0].count}人、良好${funnelData[1].count}人、中等${funnelData[2].count}人、待提高${funnelData[3].count}人`,
        `📍 排名分段：${rankDistributionData.map((r) => `${r.segment}${r.count}人`).join("、")}`,
        avgSBI < 60
          ? "⚠️ 学科发展不够均衡，建议关注薄弱科目"
          : "✅ 学科发展较为均衡",
      ],
      highlights: [],
      aiGenerated: false,
      rawData: {
        funnelData, // 绩效漏斗图
        rankDistributionData, // 🆕 排名分布图
        sbiRadarData, // 🆕 SBI雷达图
        apiSbiScatterData: studentMetrics, // 🆕 API-SBI散点图
        avgAPI,
        avgSBI,
        totalMaxScore,
      },
    };

    const result = {
      gradeFlow: gradeFlowSection,
      trends,
      correlations,
      rankings,
    };

    console.log("✅ 高级分析章节生成完成:", {
      hasGradeFlow: !!gradeFlowSection,
      hasCorrelations: !!correlations.chartData,
    });

    return result;
  }

  /**
   * 生成行动项
   */
  private generateActionItems(aiInsights: any, gradeData: any[]): ActionItem[] {
    const actions: ActionItem[] = [];

    // 从AI洞察中提取行动项
    if (aiInsights?.recommendations) {
      aiInsights.recommendations.forEach((rec: any, index: number) => {
        actions.push({
          id: `action-ai-${index}`,
          priority: index < 2 ? "immediate" : "short-term",
          title: rec.title,
          description: rec.description,
          targetClasses: rec.targetGroup ? [rec.targetGroup] : undefined,
          completed: false,
        });
      });
    }

    // 基于数据生成默认行动项
    const failedStudents = gradeData.filter(
      (g) => parseFloat(g.total_score) < 60
    );
    if (failedStudents.length > 0) {
      actions.push({
        id: "action-failed-students",
        priority: "immediate",
        title: "学困生辅导",
        description: `对${failedStudents.length}名不及格学生安排专项辅导`,
        targetStudents: failedStudents.map((s) => s.student_id),
        completed: false,
      });
    }

    return actions;
  }

  /**
   * 保存报告到数据库
   */
  async saveReport(report: AnalysisReport): Promise<boolean> {
    try {
      const { error } = await supabase.from("analysis_reports").insert({
        id: report.metadata.reportId,
        exam_id: report.metadata.examId,
        exam_title: report.metadata.examTitle,
        report_type: report.metadata.reportType,
        report_data: report,
        generated_by: report.metadata.generatedBy,
      });

      if (error) {
        console.error("保存报告失败:", error);
        toast.error("保存报告失败");
        return false;
      }

      console.log("报告已保存到数据库:", report.metadata.reportId);
      return true;
    } catch (error) {
      console.error("保存报告异常:", error);
      return false;
    }
  }

  /**
   * 从数据库加载报告
   */
  async loadReport(reportId: string): Promise<AnalysisReport | null> {
    try {
      const { data, error } = await supabase
        .from("analysis_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error || !data) {
        console.error("加载报告失败:", error);
        return null;
      }

      return data.report_data as AnalysisReport;
    } catch (error) {
      console.error("加载报告异常:", error);
      return null;
    }
  }

  // === 辅助计算方法 ===

  private calculateScoreDistribution(
    scores: number[],
    fullScore: number = 100
  ) {
    // 🔧 根据满分动态生成5个分数段
    const ranges = [
      {
        label: `不及格(0-${Math.floor(fullScore * 0.6 - 1)})`,
        min: 0,
        max: fullScore * 0.6 - 0.01,
      },
      {
        label: `及格(${Math.floor(fullScore * 0.6)}-${Math.floor(fullScore * 0.7 - 1)})`,
        min: fullScore * 0.6,
        max: fullScore * 0.7 - 0.01,
      },
      {
        label: `中等(${Math.floor(fullScore * 0.7)}-${Math.floor(fullScore * 0.8 - 1)})`,
        min: fullScore * 0.7,
        max: fullScore * 0.8 - 0.01,
      },
      {
        label: `良好(${Math.floor(fullScore * 0.8)}-${Math.floor(fullScore * 0.85 - 1)})`,
        min: fullScore * 0.8,
        max: fullScore * 0.85 - 0.01,
      },
      {
        label: `优秀(${Math.floor(fullScore * 0.85)}-${fullScore})`,
        min: fullScore * 0.85,
        max: fullScore,
      },
    ];

    return ranges.map((range) => ({
      range: range.label,
      count: scores.filter((s) => s >= range.min && s <= range.max).length,
      percentage: (
        (scores.filter((s) => s >= range.min && s <= range.max).length /
          scores.length) *
        100
      ).toFixed(1),
    }));
  }

  private generateScoreDistributionInsights(
    scores: number[],
    fullScore: number = 100
  ): string[] {
    const dist = this.calculateScoreDistribution(scores, fullScore);
    const maxRange = dist.reduce((prev, curr) =>
      curr.count > prev.count ? curr : prev
    );

    const excellentLine = Math.floor(fullScore * 0.85);
    const passLine = Math.floor(fullScore * 0.6);

    return [
      `最集中分数段：${maxRange.range}分（${maxRange.count}人，${maxRange.percentage}%）`,
      `优秀生（≥${excellentLine}分）：${dist[4].count}人`,
      `不及格（<${passLine}分）：${dist[0].count}人`,
    ];
  }

  private calculateClassData(gradeData: any[]) {
    const classMap: Record<string, { total: number; count: number }> = {};

    gradeData.forEach((record) => {
      if (record.class_name && record.total_score) {
        if (!classMap[record.class_name]) {
          classMap[record.class_name] = { total: 0, count: 0 };
        }
        classMap[record.class_name].total += parseFloat(record.total_score);
        classMap[record.class_name].count += 1;
      }
    });

    return Object.entries(classMap).map(([name, data]) => ({
      className: name,
      avgScore: data.total / data.count,
      studentCount: data.count,
    }));
  }

  private generateClassComparisonInsights(gradeData: any[]): string[] {
    const classData = this.calculateClassData(gradeData);
    if (classData.length === 0) return [];

    // 🔧 只有一个班级时，不生成对比信息
    if (classData.length === 1) {
      return [
        `本次考试仅有${classData[0].className}参加`,
        `班级平均分：${classData[0].avgScore.toFixed(1)}分`,
        `参与学生数：${classData[0].studentCount}人`,
      ];
    }

    classData.sort((a, b) => b.avgScore - a.avgScore);
    const topClass = classData[0];
    const bottomClass = classData[classData.length - 1];

    return [
      `表现最优：${topClass.className}（${topClass.avgScore.toFixed(1)}分）`,
      `需要关注：${bottomClass.className}（${bottomClass.avgScore.toFixed(1)}分）`,
      `班级差距：${(topClass.avgScore - bottomClass.avgScore).toFixed(1)}分`,
    ];
  }

  private calculateSubjectData(gradeData: any[], subjectScores?: any[]) {
    const subjects = [
      { key: "chinese", name: "语文" },
      { key: "math", name: "数学" },
      { key: "english", name: "英语" },
      { key: "physics", name: "物理" },
      { key: "chemistry", name: "化学" },
      { key: "politics", name: "政治" },
      { key: "history", name: "历史" },
      { key: "biology", name: "生物" },
      { key: "geography", name: "地理" },
    ];

    return subjects
      .map((subject) => {
        const scores = gradeData
          .map((r) => parseFloat(r[`${subject.key}_score`]))
          .filter((s) => !isNaN(s) && s > 0);

        if (scores.length === 0) return null;

        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);

        // 🔧 优先使用配置的满分，否则动态推断
        const config = subjectScores?.find(
          (s) => s.subject_code === subject.key
        );
        let fullScore = 100; // 默认100分制
        let passingScore = 60;
        let excellentScore = 85;

        if (config && config.total_score) {
          // 使用配置的满分
          fullScore = config.total_score;
          passingScore = config.passing_score || fullScore * 0.6;
          excellentScore = config.excellent_score || fullScore * 0.85;
          console.log(`${subject.name} 使用配置满分: ${fullScore}分`);
        } else {
          // 动态推断（向上取整到常见分值：100, 120, 150）
          if (maxScore > 100) {
            fullScore = maxScore <= 120 ? 120 : 150;
          }
          passingScore = fullScore * 0.6; // 60%及格
          excellentScore = fullScore * 0.85; // 85%优秀
          console.log(`${subject.name} 推断满分: ${fullScore}分`);
        }

        const passingCount = scores.filter((s) => s >= passingScore).length;
        const excellentCount = scores.filter((s) => s >= excellentScore).length;
        const passRate = (passingCount / scores.length) * 100;
        const excellentRate = (excellentCount / scores.length) * 100;

        // 计算标准差
        const variance =
          scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) /
          scores.length;
        const stdDev = Math.sqrt(variance);

        return {
          subject: subject.name,
          avgScore,
          maxScore,
          minScore,
          passRate,
          excellentRate,
          stdDev,
          studentCount: scores.length,
          fullScore, // 添加满分信息
        };
      })
      .filter((s) => s !== null);
  }

  private generateSubjectInsights(
    gradeData: any[],
    subjectScores?: any[]
  ): string[] {
    const subjectData = this.calculateSubjectData(gradeData, subjectScores);
    if (subjectData.length === 0) return [];

    const sorted = [...subjectData].sort((a, b) => b.avgScore - a.avgScore);

    return [
      `最强科目：${sorted[0].subject}（${sorted[0].avgScore.toFixed(1)}分）`,
      `需要加强：${sorted[sorted.length - 1].subject}（${sorted[sorted.length - 1].avgScore.toFixed(1)}分）`,
    ];
  }

  /**
   * 计算各科目分数段分布（动态适配科目满分）
   */
  private calculateSubjectScoreDistribution(
    gradeData: any[],
    subjectScores?: any[]
  ) {
    const subjects = [
      { key: "chinese", name: "语文" },
      { key: "math", name: "数学" },
      { key: "english", name: "英语" },
      { key: "physics", name: "物理" },
      { key: "chemistry", name: "化学" },
      { key: "politics", name: "政治" },
      { key: "history", name: "历史" },
      { key: "biology", name: "生物" },
      { key: "geography", name: "地理" },
    ];

    const result: any[] = [];

    subjects.forEach((subject) => {
      const scores = gradeData
        .map((r) => parseFloat(r[`${subject.key}_score`]))
        .filter((s) => !isNaN(s) && s > 0);

      if (scores.length === 0) return;

      // 🔧 优先使用配置的满分，否则动态推断
      const config = subjectScores?.find((s) => s.subject_code === subject.key);
      const maxScore = Math.max(...scores);
      let fullScore = 100;

      if (config && config.total_score) {
        fullScore = config.total_score;
      } else if (maxScore > 100) {
        fullScore = maxScore <= 120 ? 120 : 150;
      }

      // 🔧 根据满分动态生成分数段（5个档次）
      const ranges = [
        {
          key: "fail",
          label: `不及格(0-${(fullScore * 0.6 - 1).toFixed(0)})`,
          min: 0,
          max: fullScore * 0.6 - 0.01,
        },
        {
          key: "pass",
          label: `及格(${(fullScore * 0.6).toFixed(0)}-${(fullScore * 0.7 - 1).toFixed(0)})`,
          min: fullScore * 0.6,
          max: fullScore * 0.7 - 0.01,
        },
        {
          key: "medium",
          label: `中等(${(fullScore * 0.7).toFixed(0)}-${(fullScore * 0.8 - 1).toFixed(0)})`,
          min: fullScore * 0.7,
          max: fullScore * 0.8 - 0.01,
        },
        {
          key: "good",
          label: `良好(${(fullScore * 0.8).toFixed(0)}-${(fullScore * 0.85 - 1).toFixed(0)})`,
          min: fullScore * 0.8,
          max: fullScore * 0.85 - 0.01,
        },
        {
          key: "excellent",
          label: `优秀(${(fullScore * 0.85).toFixed(0)}-${fullScore})`,
          min: fullScore * 0.85,
          max: fullScore,
        },
      ];

      const distribution = ranges.map((range) => ({
        key: range.key,
        range: range.label,
        count: scores.filter((s) => s >= range.min && s <= range.max).length,
      }));

      result.push({
        subject: subject.name,
        distribution,
        fullScore, // 添加满分信息
      });
    });

    return result;
  }

  /**
   * 获取典型学生（优秀、中等、后进各一名）
   */
  private getTypicalStudents(gradeData: any[]) {
    const sorted = [...gradeData].sort(
      (a, b) => parseFloat(b.total_score) - parseFloat(a.total_score)
    );

    if (sorted.length < 3) return [];

    return [
      sorted[0], // 优秀学生
      sorted[Math.floor(sorted.length / 2)], // 中等学生
      sorted[sorted.length - 1], // 后进学生
    ];
  }

  /**
   * 🆕 计算科目相关性矩阵
   */
  private calculateSubjectCorrelationMatrix(gradeData: any[]): {
    correlations: any[];
    subjects: string[];
  } {
    const subjects = [
      "语文",
      "数学",
      "英语",
      "物理",
      "化学",
      "政治",
      "历史",
      "生物",
      "地理",
    ];

    // 过滤出有成绩数据的科目
    const availableSubjects = subjects.filter((subject) => {
      const key = this.getSubjectKey(subject);
      const scores = gradeData
        .map((r) => parseFloat(r[`${key}_score`]))
        .filter((s) => !isNaN(s) && s > 0);
      return scores.length > 0;
    });

    // 使用CorrelationHeatmap的工具函数计算相关性
    const correlations = calculateSubjectCorrelations(
      gradeData,
      availableSubjects
    );

    return {
      correlations,
      subjects: availableSubjects,
    };
  }

  /**
   * 生成相关性分析洞察（基于计算结果）
   */
  private generateCorrelationInsights(correlationData: {
    correlations: any[];
    subjects: string[];
  }): string[] {
    const insights: string[] = [];
    const threshold = 0.7; // 强相关阈值

    // 找出强正相关的科目对
    const strongPositive = correlationData.correlations.filter(
      (c) =>
        c.correlation >= threshold &&
        c.correlation < 1 &&
        c.subject1 !== c.subject2
    );

    // 找出强负相关的科目对
    const strongNegative = correlationData.correlations.filter(
      (c) => c.correlation <= -threshold
    );

    if (strongPositive.length > 0) {
      strongPositive.slice(0, 3).forEach((c) => {
        insights.push(
          `📈 ${c.subject1}和${c.subject2}呈现强正相关（r=${c.correlation.toFixed(2)}），成绩趋势一致`
        );
      });
    }

    if (strongNegative.length > 0) {
      strongNegative.slice(0, 2).forEach((c) => {
        insights.push(
          `📉 ${c.subject1}和${c.subject2}呈现负相关（r=${c.correlation.toFixed(2)}），需注意学习时间分配`
        );
      });
    }

    if (insights.length === 0) {
      insights.push("各科目成绩相关性适中，学生学习较为均衡");
    }

    return insights;
  }

  /**
   * 获取科目在数据中的键名
   */
  private getSubjectKey(subjectName: string): string {
    const subjectMap: Record<string, string> = {
      语文: "chinese",
      数学: "math",
      英语: "english",
      物理: "physics",
      化学: "chemistry",
      政治: "politics",
      历史: "history",
      生物: "biology",
      地理: "geography",
    };

    return subjectMap[subjectName] || subjectName.toLowerCase();
  }

  /**
   * 🆕 生成算法化的问题诊断（按科目合并）
   * 通过数据分析识别具体问题和改进方向
   */
  private generateProblemDiagnosis(
    gradeData: any[],
    subjectScores?: any[]
  ): any[] {
    const warnings: any[] = [];
    const subjectData = this.calculateSubjectData(gradeData, subjectScores);
    const classData = this.calculateClassData(gradeData);

    // 1. 按科目合并诊断（避免同一科目分散显示）
    subjectData.forEach((subject: any) => {
      const issues: string[] = []; // 问题列表
      const suggestions: string[] = []; // 建议列表
      const metrics: any[] = []; // 相关指标
      let maxAffected = subject.studentCount; // 受影响学生数（取最大值）
      let highestSeverity: "high" | "medium" | "low" = "low";

      // 检查1：平均分过低（<55%满分）
      const scoreRatio = subject.avgScore / subject.fullScore;
      if (scoreRatio < 0.55) {
        issues.push(
          `平均分${subject.avgScore.toFixed(1)}分，仅达到满分的${(scoreRatio * 100).toFixed(1)}%`
        );
        suggestions.push("针对该科目进行专项复习，重点讲解基础知识点");
        metrics.push({
          metric: "平均分",
          value: subject.avgScore,
          threshold: subject.fullScore * 0.6,
        });
        highestSeverity = "high";
      }

      // 检查2：及格率过低（<50%）
      if (subject.passRate < 50) {
        const failCount = Math.floor(
          subject.studentCount * (1 - subject.passRate / 100)
        );
        issues.push(
          `及格率仅${subject.passRate.toFixed(1)}%，超过半数学生未达及格线`
        );
        suggestions.push("调整教学难度，加强基础知识训练，提供差异化辅导");
        metrics.push({
          metric: "及格率",
          value: subject.passRate,
          threshold: 60,
        });
        maxAffected = Math.max(maxAffected, failCount);
        if (highestSeverity !== "high") highestSeverity = "high";
      }

      // 检查3：优秀率过低（<10%）
      if (subject.excellentRate < 10) {
        issues.push(`优秀率${subject.excellentRate.toFixed(1)}%，缺少拔尖学生`);
        suggestions.push("为优秀学生提供拓展性学习资源，培养学科尖子生");
        metrics.push({
          metric: "优秀率",
          value: subject.excellentRate,
          threshold: 15,
        });
        if (highestSeverity === "low") highestSeverity = "medium";
      }

      // 检查4：成绩分布不均（标准差>20%满分）
      if (subject.stdDev > subject.fullScore * 0.2) {
        issues.push(`标准差${subject.stdDev.toFixed(1)}，成绩两极分化明显`);
        suggestions.push("关注学困生群体，实施分层教学");
        metrics.push({
          metric: "标准差",
          value: subject.stdDev,
          threshold: subject.fullScore * 0.15,
        });
        if (highestSeverity === "low") highestSeverity = "medium";
      }

      // 如果该科目有问题，生成合并后的warning
      if (issues.length > 0) {
        warnings.push({
          id: `subject-issues-${subject.subject}`,
          severity: highestSeverity,
          message: `${subject.subject}${issues.length > 1 ? "多项指标偏低" : issues[0].includes("平均分") ? "平均分偏低" : issues[0].includes("及格率") ? "及格率偏低" : "学习困难"}`,
          details: `${subject.subject}存在以下问题：\n${issues.map((issue, idx) => `${idx + 1}. ${issue}`).join("\n")}`,
          affectedStudents: maxAffected,
          relatedMetrics: metrics,
          suggestedAction: suggestions.join("；"),
        });
      }
    });

    // 2. 诊断班级间差距过大（>15分）
    if (classData.length > 1) {
      const sortedClasses = [...classData].sort(
        (a, b) => b.avgScore - a.avgScore
      );
      const gap =
        sortedClasses[0].avgScore -
        sortedClasses[sortedClasses.length - 1].avgScore;
      if (gap > 15) {
        warnings.push({
          id: "large-class-gap",
          severity: "medium",
          message: "班级间成绩差距较大",
          details: `${sortedClasses[0].className}和${sortedClasses[sortedClasses.length - 1].className}平均分相差${gap.toFixed(1)}分，差距明显`,
          affectedStudents:
            sortedClasses[sortedClasses.length - 1].studentCount,
          affectedClasses: [sortedClasses[sortedClasses.length - 1].className],
          relatedMetrics: [
            {
              metric: "班级差距",
              value: gap,
              threshold: 10,
            },
          ],
          suggestedAction: `分析${sortedClasses[sortedClasses.length - 1].className}的教学方式，加强班级间教研交流`,
        });
      }
    }

    // 3. 如果没有诊断出任何问题，添加一条正面反馈
    if (warnings.length === 0) {
      warnings.push({
        id: "no-major-issues",
        severity: "low",
        message: "整体表现良好",
        details: "本次考试各项指标正常，各科目成绩较为均衡",
        affectedStudents: 0,
        relatedMetrics: [],
        suggestedAction: "继续保持当前教学节奏，注重个性化发展",
      });
    }

    console.log(`算法诊断完成，生成 ${warnings.length} 条诊断信息`);
    return warnings;
  }

  /**
   * 🆕 生成等级流动桑基图数据（需要历史考试数据）
   */
  private async generateGradeFlowData(
    currentExamId: string,
    currentGradeData: any[]
  ): Promise<any | null> {
    try {
      // 从当前成绩数据中获取考试信息
      if (currentGradeData.length === 0) {
        console.log("当前考试无成绩数据");
        return null;
      }

      const currentExamDate = currentGradeData[0]?.exam_date;
      const currentExamTitle = currentGradeData[0]?.exam_title || "本次考试";

      if (!currentExamDate) {
        console.log("无法获取当前考试日期");
        return null;
      }

      // 🔧 提取当前考试涉及的所有班级
      const currentClasses = [
        ...new Set(currentGradeData.map((r) => r.class_name).filter(Boolean)),
      ];
      console.log(`📊 当前考试班级: ${currentClasses.join(", ")}`);

      if (currentClasses.length === 0) {
        console.log("⚠️ 当前考试数据中没有班级信息");
        return null;
      }

      // 🔧 获取历史考试列表（同班级 + 早于当前考试）
      const { data: historicalData } = await supabase
        .from("grade_data")
        .select("exam_id, exam_title, exam_date, class_name")
        .lt("exam_date", currentExamDate)
        .in("class_name", currentClasses)
        .order("exam_date", { ascending: false })
        .limit(100);

      if (!historicalData || historicalData.length === 0) {
        console.log("📊 未找到历史考试数据，无法生成等级流动分析");
        return null;
      }

      // 🔧 找出最近的一次不同的考试（需包含相同班级）
      const examGroups = new Map<string, any>();
      historicalData.forEach((record) => {
        if (record.exam_id && record.exam_id !== currentExamId) {
          if (!examGroups.has(record.exam_id)) {
            examGroups.set(record.exam_id, {
              exam_id: record.exam_id,
              exam_title: record.exam_title,
              exam_date: record.exam_date,
              classes: new Set<string>(),
            });
          }
          if (record.class_name) {
            examGroups.get(record.exam_id).classes.add(record.class_name);
          }
        }
      });

      if (examGroups.size === 0) {
        console.log("📊 未找到同班级的历史考试数据");
        return null;
      }

      // 🔧 筛选出包含当前所有班级的考试
      const validExams = Array.from(examGroups.values()).filter((exam) => {
        const hasAllClasses = currentClasses.every((cls) =>
          exam.classes.has(cls)
        );
        return hasAllClasses;
      });

      if (validExams.length === 0) {
        console.log(
          `📊 未找到包含班级 [${currentClasses.join(", ")}] 的历史考试`
        );
        return null;
      }

      // 取最近的一次考试
      const previousExam = validExams[0];
      console.log(
        `📊 找到前一次考试: ${previousExam.exam_title} (${previousExam.exam_date})`
      );

      // 🔧 获取前一次考试的成绩数据（仅当前班级）
      const { data: previousGradeData } = await supabase
        .from("grade_data")
        .select("*")
        .eq("exam_id", previousExam.exam_id)
        .in("class_name", currentClasses);

      if (!previousGradeData || previousGradeData.length === 0) {
        console.log("前一次考试无成绩数据");
        return null;
      }

      // 导入桑基图数据生成函数
      const { generateGradeFlowData } = await import(
        "@/components/analysis/charts/GradeFlowSankeyChart"
      );

      const sankeyData = generateGradeFlowData(
        previousGradeData,
        currentGradeData,
        previousExam.exam_title || "前一次考试",
        currentExamTitle
      );

      console.log(
        `✅ 等级流动数据生成成功: ${sankeyData.nodes.length} 个等级，${sankeyData.links.length} 条流动`
      );
      return sankeyData;
    } catch (error) {
      console.error("生成等级流动数据失败:", error);
      return null;
    }
  }

  /**
   * 🆕 生成等级流动分析洞察
   */
  private generateGradeFlowInsights(sankeyData: any): string[] {
    const insights: string[] = [];

    if (!sankeyData || !sankeyData.links || sankeyData.links.length === 0) {
      return ["暂无等级流动数据"];
    }

    // 分析上升和下降的学生数
    let upgradedCount = 0;
    let downgradedCount = 0;
    let stableCount = 0;

    const gradeOrder = ["A+", "A", "B+", "B", "C+", "C", "缺考"];
    const gradeRank: Record<string, number> = {};
    gradeOrder.forEach((grade, index) => {
      gradeRank[grade] = index;
    });

    sankeyData.links.forEach((link: any) => {
      const sourceRank = gradeRank[link.source] ?? 999;
      const targetRank = gradeRank[link.target] ?? 999;

      if (targetRank < sourceRank) {
        upgradedCount += link.value; // 等级上升
      } else if (targetRank > sourceRank) {
        downgradedCount += link.value; // 等级下降
      } else {
        stableCount += link.value; // 等级保持
      }
    });

    const totalStudents = upgradedCount + downgradedCount + stableCount;

    insights.push(
      `📈 等级上升：${upgradedCount}人（${((upgradedCount / totalStudents) * 100).toFixed(1)}%）`
    );
    insights.push(
      `📉 等级下降：${downgradedCount}人（${((downgradedCount / totalStudents) * 100).toFixed(1)}%）`
    );
    insights.push(
      `➡️ 等级稳定：${stableCount}人（${((stableCount / totalStudents) * 100).toFixed(1)}%）`
    );

    // 添加建议
    if (downgradedCount > upgradedCount) {
      insights.push("⚠️ 成绩下滑学生较多，需重点关注学习状态和辅导措施");
    } else if (upgradedCount > downgradedCount * 1.5) {
      insights.push("✅ 整体成绩呈上升趋势，教学效果显著");
    }

    return insights;
  }

  /**
   * 🆕 计算箱线图数据（各科目+总分）
   * 展示分数的统计分布：Q1、中位数、Q3、最小值、最大值、异常值
   */
  private calculateBoxPlotData(
    gradeData: any[],
    subjectScores?: any[]
  ): BoxPlotData[] {
    const subjects = [
      { key: "total", name: "总分", defaultFullScore: 0 }, // 动态计算
      { key: "chinese", name: "语文", defaultFullScore: 120 },
      { key: "math", name: "数学", defaultFullScore: 100 },
      { key: "english", name: "英语", defaultFullScore: 100 },
      { key: "physics", name: "物理", defaultFullScore: 100 },
      { key: "chemistry", name: "化学", defaultFullScore: 100 },
      { key: "politics", name: "政治", defaultFullScore: 100 },
      { key: "history", name: "历史", defaultFullScore: 100 },
      { key: "biology", name: "生物", defaultFullScore: 100 },
      { key: "geography", name: "地理", defaultFullScore: 100 },
    ];

    console.log(`\n📊 开始计算箱线图数据，共 ${gradeData.length} 条成绩记录`);

    const boxPlotData: BoxPlotData[] = [];
    const addedSubjects = new Set<string>(); // 🔧 防止重复添加

    subjects.forEach((subject) => {
      // 🔧 检查是否已添加过该科目
      if (addedSubjects.has(subject.key)) {
        console.warn(`⚠️ 跳过重复科目: ${subject.name}`);
        return;
      }

      // 获取分数数据（🔧 与 calculateSubjectData 保持一致的过滤条件）
      let scores: number[];
      if (subject.key === "total") {
        scores = gradeData
          .map((r) => parseFloat(r.total_score))
          .filter((s) => !isNaN(s) && s > 0);
      } else {
        scores = gradeData
          .map((r) => parseFloat(r[`${subject.key}_score`]))
          .filter((s) => !isNaN(s) && s > 0);
      }

      console.log(
        `  • ${subject.name} (${subject.key}): ${scores.length} 条有效数据`
      );

      if (scores.length === 0) {
        console.log(`    ⏭️  跳过 ${subject.name}（无数据）`);
        return;
      }

      // 获取满分配置
      let fullScore = subject.defaultFullScore;
      if (subject.key === "total") {
        // 总分使用配置中所有科目的满分之和，或者从数据中推断
        const totalMaxFromData = gradeData[0]?.total_max_score;
        if (totalMaxFromData && totalMaxFromData > 0) {
          fullScore = totalMaxFromData;
        } else {
          // 动态计算总分满分
          const subjectDefaultScores: Record<string, number> = {
            chinese: 120,
            math: 100,
            english: 100,
            physics: 100,
            chemistry: 100,
            politics: 100,
            history: 100,
            biology: 100,
            geography: 100,
          };

          fullScore = 0;
          Object.entries(subjectDefaultScores).forEach(
            ([subjectKey, defaultScore]) => {
              const hasScores = gradeData.some((record) => {
                const score = parseFloat(record[`${subjectKey}_score`]);
                return !isNaN(score) && score > 0;
              });

              if (hasScores) {
                fullScore += defaultScore;
              }
            }
          );
        }
      } else {
        const config = subjectScores?.find(
          (s) => s.subject_code === subject.key
        );
        if (config && config.total_score) {
          fullScore = config.total_score;
        } else {
          // 🔧 使用默认满分，如果默认为0则动态推断
          if (subject.defaultFullScore === 0) {
            // 从实际分数推断满分（与 calculateSubjectData 保持一致）
            const maxInData = Math.max(...scores);
            if (maxInData > 100) {
              fullScore = maxInData <= 120 ? 120 : 150;
            } else {
              fullScore = 100;
            }
          } else {
            fullScore = subject.defaultFullScore;
          }
        }
      }

      // 计算箱线图统计数据
      const stats = calculateBoxPlotStats(scores, fullScore);

      const boxStats = {
        subject: subject.name,
        ...stats,
      };

      boxPlotData.push(boxStats);

      // 🔧 标记该科目已添加
      addedSubjects.add(subject.key);
      console.log(
        `    ✅ 已添加 ${subject.name}，满分: ${fullScore}，中位数: ${stats.median.toFixed(1)}`
      );
    });

    console.log(
      `\n✅ 箱线图数据计算完成，共 ${boxPlotData.length} 个科目:`,
      boxPlotData.map((d) => d.subject).join(", ")
    );
    console.log(
      `📊 返回的箱线图数据:`,
      JSON.stringify(
        boxPlotData.map((d) => ({
          subject: d.subject,
          count: d.count,
          min: d.min,
          q1: d.q1,
          median: d.median,
          q3: d.q3,
          max: d.max,
          fullScore: d.fullScore,
        })),
        null,
        2
      )
    );

    return boxPlotData;
  }

  /**
   * 🆕 计算学业表现指数（Academic Performance Index, API）
   * 综合分数、排名、进步的综合评分（0-100）
   */
  private calculateAPI(
    currentScore: number,
    maxScore: number,
    currentRank: number,
    totalStudents: number,
    previousScore?: number
  ): number {
    // 1. 分数维度（权重40%）：标准化到0-100
    const scoreRatio = (currentScore / maxScore) * 100;
    const scoreComponent = scoreRatio * 0.4;

    // 2. 排名维度（权重40%）：排名越靠前分数越高
    const rankPercentile =
      ((totalStudents - currentRank + 1) / totalStudents) * 100;
    const rankComponent = rankPercentile * 0.4;

    // 3. 进步维度（权重20%）：与上次考试对比
    let progressComponent = 50; // 默认50分（无历史数据）
    if (previousScore !== undefined && previousScore > 0) {
      const improvement = ((currentScore - previousScore) / maxScore) * 100;
      // 进步10%得满分，退步10%得0分
      progressComponent = Math.max(0, Math.min(100, 50 + improvement * 5));
    }
    const progressWeight = progressComponent * 0.2;

    const api = scoreComponent + rankComponent + progressWeight;
    return Math.round(api * 10) / 10; // 保留1位小数
  }

  /**
   * 🆕 计算学科均衡度指数（Subject Balance Index, SBI）
   * 衡量各科发展是否均衡（0-100，100表示完全均衡）
   */
  private calculateSBI(
    subjectScores: { subject: string; score: number; fullScore: number }[]
  ): number {
    if (subjectScores.length === 0) return 0;

    // 标准化各科得分率
    const scoreRatios = subjectScores.map((s) => (s.score / s.fullScore) * 100);

    // 计算平均得分率
    const avgRatio =
      scoreRatios.reduce((sum, r) => sum + r, 0) / scoreRatios.length;

    // 计算标准差
    const variance =
      scoreRatios.reduce((sum, r) => sum + Math.pow(r - avgRatio, 2), 0) /
      scoreRatios.length;
    const stdDev = Math.sqrt(variance);

    // SBI = 100 - (标准差 × 权重)
    // 标准差为0时，SBI为100（完全均衡）
    // 标准差为30时，SBI约为0（极度不均衡）
    const sbi = Math.max(0, 100 - stdDev * 3.33);
    return Math.round(sbi * 10) / 10;
  }

  /**
   * 🆕 生成绩效漏斗图数据
   */
  private generatePerformanceFunnelData(
    gradeData: any[],
    maxScore: number
  ): any[] {
    const levels = [
      {
        name: "优秀",
        min: 0.85,
        max: 1.0,
        scoreRange: `${Math.round(maxScore * 0.85)}-${maxScore}分`,
      },
      {
        name: "良好",
        min: 0.7,
        max: 0.85,
        scoreRange: `${Math.round(maxScore * 0.7)}-${Math.round(maxScore * 0.85)}分`,
      },
      {
        name: "中等",
        min: 0.6,
        max: 0.7,
        scoreRange: `${Math.round(maxScore * 0.6)}-${Math.round(maxScore * 0.7)}分`,
      },
      {
        name: "待提高",
        min: 0,
        max: 0.6,
        scoreRange: `0-${Math.round(maxScore * 0.6)}分`,
      },
    ];

    const totalStudents = gradeData.length;

    return levels.map((level) => {
      const count = gradeData.filter((r) => {
        const score = parseFloat(r.total_score);
        const ratio = score / maxScore;
        return ratio >= level.min && ratio < level.max;
      }).length;

      return {
        level: level.name,
        count,
        percentage: (count / totalStudents) * 100,
        scoreRange: level.scoreRange,
      };
    });
  }

  /**
   * 🆕 生成排名分布数据（按段位）
   */
  private generateRankDistributionData(gradeData: any[]): any[] {
    // 检查是否有年级排名数据
    const hasGradeRank = gradeData.some(
      (r) => r.total_rank_in_grade != null && r.total_rank_in_grade > 0
    );

    if (!hasGradeRank) {
      console.warn("⚠️ 没有年级排名数据，无法生成排名分布图");
      return []; // 如果没有年级排名，返回空数组
    }

    const segments = [
      { segment: "前50名", min: 1, max: 50, range: "1-50" },
      { segment: "50-100名", min: 51, max: 100, range: "51-100" },
      { segment: "100-250名", min: 101, max: 250, range: "101-250" },
      { segment: "250-350名", min: 251, max: 350, range: "251-350" },
      { segment: "350-600名", min: 351, max: 600, range: "351-600" },
      { segment: "600名后", min: 601, max: 99999, range: "600+" },
    ];

    const totalStudents = gradeData.length;

    return segments
      .map((seg) => {
        const count = gradeData.filter((r) => {
          const rank = r.total_rank_in_grade; // 只使用年级排名
          return rank && rank >= seg.min && rank <= seg.max;
        }).length;

        return {
          segment: seg.segment,
          range: seg.range,
          count,
          percentage: totalStudents > 0 ? (count / totalStudents) * 100 : 0,
        };
      })
      .filter((s) => s.count > 0); // 只返回有数据的段位
  }

  /**
   * 🆕 生成SBI雷达图数据（单个学生或班级平均）
   */
  private generateSBIRadarData(gradeData: any[]): any[] {
    const subjects = [
      { key: "chinese", name: "语文", defaultFullScore: 120 },
      { key: "math", name: "数学", defaultFullScore: 100 },
      { key: "english", name: "英语", defaultFullScore: 100 },
      { key: "physics", name: "物理", defaultFullScore: 100 },
      { key: "chemistry", name: "化学", defaultFullScore: 100 },
      { key: "politics", name: "政治", defaultFullScore: 100 },
      { key: "history", name: "历史", defaultFullScore: 100 },
    ];

    const radarData: any[] = [];

    subjects.forEach((subject) => {
      const scores = gradeData
        .map((r) => parseFloat(r[`${subject.key}_score`]))
        .filter((s) => !isNaN(s) && s > 0);

      if (scores.length === 0) return;

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const scoreRate = (avgScore / subject.defaultFullScore) * 100;

      radarData.push({
        subject: subject.name,
        scoreRate: Math.round(scoreRate * 10) / 10,
        fullScore: subject.defaultFullScore,
        actualScore: Math.round(avgScore * 10) / 10,
      });
    });

    return radarData;
  }

  /**
   * 🆕 生成排名趋势数据（需要历史数据）
   */
  private async generateRankTrendData(studentId: string): Promise<any[]> {
    const { data: historicalGrades } = await supabase
      .from("grade_data")
      .select("*")
      .eq("student_id", studentId)
      .order("exam_date", { ascending: true })
      .limit(10);

    if (!historicalGrades || historicalGrades.length === 0) {
      return [];
    }

    return historicalGrades.map((record) => ({
      examTitle: record.exam_title || "未命名",
      examDate: record.exam_date,
      classRank: record.total_rank_in_class,
      gradeRank: record.total_rank_in_grade,
      schoolRank: record.total_rank_in_school,
      totalStudents: 50, // 可以从数据库查询
    }));
  }

  /**
   * 🆕 生成成绩-排名组合图数据
   */
  private async generateScoreRankComboData(studentId: string): Promise<any[]> {
    const { data: historicalGrades } = await supabase
      .from("grade_data")
      .select("*")
      .eq("student_id", studentId)
      .order("exam_date", { ascending: true })
      .limit(10);

    if (!historicalGrades || historicalGrades.length === 0) {
      return [];
    }

    return historicalGrades.map((record) => ({
      examTitle: record.exam_title || "未命名",
      examDate: record.exam_date,
      score: parseFloat(record.total_score) || 0,
      rank: record.total_rank_in_class || 0,
      maxScore: parseFloat(record.total_max_score) || 100,
      totalStudents: 50, // 可以从数据库查询班级人数
    }));
  }
}

// 导出单例
export const reportGenerator = new ReportGenerator();
