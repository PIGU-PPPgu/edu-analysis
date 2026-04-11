/**
 * 增强的AI标签生成服务
 *
 * 功能特性：
 * 1. 基于grade_data宽表数据的深度分析
 * 2. 自动集成到AutoSyncService数据同步流程
 * 3. 支持批量生成和渐进式更新
 * 4. 智能数据质量评估和fallback机制
 * 5. 多维度学生特征提取和分析
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StudentLearningProfile {
  studentId: string;
  studentName: string;
  className: string;

  // 成绩维度分析
  gradeAnalysis: {
    overallAverage: number;
    subjectStrengths: Array<{ subject: string; score: number; rank?: number }>;
    subjectWeaknesses: Array<{ subject: string; score: number; rank?: number }>;
    consistencyScore: number;
    improvementTrend: "improving" | "stable" | "declining";
  };

  // 排名维度分析
  rankingAnalysis: {
    classRankTrend: number[];
    subjectRankings: Record<string, number>;
    competitivePosition:
      | "top"
      | "upper-middle"
      | "middle"
      | "lower-middle"
      | "bottom";
  };

  // 学习模式识别
  learningPatterns: {
    examPerformancePattern:
      | "consistent"
      | "volatile"
      | "improving"
      | "declining";
    subjectBalance:
      | "balanced"
      | "science-oriented"
      | "liberal-oriented"
      | "uneven";
    stressResponse: "performs-well" | "struggles" | "neutral";
  };

  // 数据质量指标
  dataQuality: {
    examCount: number;
    subjectCount: number;
    timeSpan: string;
    completeness: number; // 0-100
    reliability: "high" | "medium" | "low";
  };
}

export interface EnhancedAITags {
  learningStyle: string[];
  strengths: string[];
  improvements: string[];
  personalityTraits: string[];
  confidence: number; // 0-100, AI生成的置信度
  version: number; // 标签版本号，用于追踪更新
  generatedAt: string;
  dataSourceCount: number; // 用于生成标签的数据条目数
}

export interface AITagsGenerationConfig {
  provider: "openai" | "deepseek" | "anthropic" | "qwen" | "custom";
  version: string;
  apiKey: string;
  customProviders?: string;
  batchSize?: number;
  enableProgressiveUpdate?: boolean;
  minDataPointsRequired?: number;
}

export class EnhancedAITagsService {
  /**
   * 为新创建的学生批量生成AI标签（集成到AutoSyncService）
   * 这是主要的集成接口
   */
  async generateTagsForNewStudents(
    newStudentIds: string[],
    config: AITagsGenerationConfig
  ): Promise<{
    successful: Array<{ studentId: string; tags: EnhancedAITags }>;
    failed: Array<{ studentId: string; error: string }>;
    skipped: Array<{ studentId: string; reason: string }>;
  }> {
    const result = {
      successful: [] as Array<{ studentId: string; tags: EnhancedAITags }>,
      failed: [] as Array<{ studentId: string; error: string }>,
      skipped: [] as Array<{ studentId: string; reason: string }>,
    };

    const batchSize = config.batchSize || 5; // 控制并发数量，避免API限流

    // 分批处理，避免同时请求过多AI API
    for (let i = 0; i < newStudentIds.length; i += batchSize) {
      const batch = newStudentIds.slice(i, i + batchSize);
      // 并行处理当前批次
      const batchPromises = batch.map(async (studentId) => {
        try {
          const profile = await this.analyzeStudentLearningProfile(studentId);

          if (
            !this.isDataSufficient(profile, config.minDataPointsRequired || 1)
          ) {
            result.skipped.push({
              studentId,
              reason: `数据不足：仅有 ${profile.dataQuality.examCount} 次考试记录`,
            });
            return;
          }

          const aiTags = await this.generateEnhancedAITags(profile, config);
          await this.saveAITags(studentId, aiTags);

          result.successful.push({ studentId, tags: aiTags });
        } catch (error) {
          console.error(`❌ [AI标签] 生成失败: ${studentId}`, error);
          result.failed.push({
            studentId,
            error: error instanceof Error ? error.message : "未知错误",
          });
        }
      });

      await Promise.all(batchPromises);

      // 批次间添加短暂延迟，避免API限流
      if (i + batchSize < newStudentIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return result;
  }

  /**
   * 深度分析学生学习档案
   * 从grade_data表提取丰富的学习特征
   */
  async analyzeStudentLearningProfile(
    studentId: string
  ): Promise<StudentLearningProfile> {
    // 1. 获取学生基本信息
    const { data: studentInfo, error: studentError } = await supabase
      .from("students")
      .select("id, student_id, name, class_id, classes(name)")
      .eq("id", studentId)
      .single();

    if (studentError || !studentInfo) {
      throw new Error(`无法获取学生信息: ${studentError?.message}`);
    }

    // 2. 获取学生的所有成绩记录（使用宽表格式）
    const { data: gradeRecords, error: gradeError } = await supabase
      .from("grade_data")
      .select(
        `
        student_id,
        exam_title,
        exam_type,
        exam_date,
        total_score,
        total_rank_in_class,
        total_rank_in_grade,
        chinese_score, chinese_rank_in_class,
        math_score, math_rank_in_class,
        english_score, english_rank_in_class,
        physics_score, physics_rank_in_class,
        chemistry_score, chemistry_rank_in_class,
        biology_score, biology_rank_in_class,
        politics_score, politics_rank_in_class,
        history_score, history_rank_in_class,
        geography_score, geography_rank_in_class
      `
      )
      .eq("student_id", studentId)
      .order("exam_date", { ascending: true });

    if (gradeError) {
      throw new Error(`获取成绩记录失败: ${gradeError.message}`);
    }

    if (!gradeRecords || gradeRecords.length === 0) {
      // 没有成绩记录时返回基础档案
      return {
        studentId,
        studentName: studentInfo.name,
        className: studentInfo.classes?.name || "未知班级",
        gradeAnalysis: {
          overallAverage: 0,
          subjectStrengths: [],
          subjectWeaknesses: [],
          consistencyScore: 0,
          improvementTrend: "stable",
        },
        rankingAnalysis: {
          classRankTrend: [],
          subjectRankings: {},
          competitivePosition: "middle",
        },
        learningPatterns: {
          examPerformancePattern: "consistent",
          subjectBalance: "balanced",
          stressResponse: "neutral",
        },
        dataQuality: {
          examCount: 0,
          subjectCount: 0,
          timeSpan: "无数据",
          completeness: 0,
          reliability: "low",
        },
      };
    }

    // 3. 进行深度分析
    const gradeAnalysis = this.analyzeGradeData(gradeRecords);
    const rankingAnalysis = this.analyzeRankingData(gradeRecords);
    const learningPatterns = this.identifyLearningPatterns(gradeRecords);
    const dataQuality = this.assessDataQuality(gradeRecords);

    return {
      studentId,
      studentName: studentInfo.name,
      className: studentInfo.classes?.name || "未知班级",
      gradeAnalysis,
      rankingAnalysis,
      learningPatterns,
      dataQuality,
    };
  }

  /**
   * 成绩数据分析
   */
  private analyzeGradeData(
    records: any[]
  ): StudentLearningProfile["gradeAnalysis"] {
    const subjects = [
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "biology",
      "politics",
      "history",
      "geography",
    ];

    // 收集各科目的所有有效成绩
    const subjectScores = new Map<string, number[]>();
    const totalScores: number[] = [];

    records.forEach((record) => {
      if (record.total_score) {
        totalScores.push(record.total_score);
      }

      subjects.forEach((subject) => {
        const score = record[`${subject}_score`];
        if (score !== null && score !== undefined) {
          if (!subjectScores.has(subject)) {
            subjectScores.set(subject, []);
          }
          subjectScores.get(subject)!.push(score);
        }
      });
    });

    // 计算总体平均分
    const overallAverage =
      totalScores.length > 0
        ? totalScores.reduce((sum, score) => sum + score, 0) /
          totalScores.length
        : 0;

    // 分析各科目平均表现
    const subjectAverages = new Map<string, number>();
    subjectScores.forEach((scores, subject) => {
      if (scores.length > 0) {
        const average =
          scores.reduce((sum, score) => sum + score, 0) / scores.length;
        subjectAverages.set(subject, average);
      }
    });

    // 识别优势和劣势学科
    const sortedSubjects = Array.from(subjectAverages.entries()).sort(
      ([, a], [, b]) => b - a
    );

    const subjectStrengths = sortedSubjects
      .slice(0, Math.min(3, sortedSubjects.length))
      .map(([subject, score]) => ({
        subject: this.getSubjectDisplayName(subject),
        score: parseFloat(score.toFixed(1)),
      }));

    const subjectWeaknesses = sortedSubjects
      .slice(-Math.min(3, sortedSubjects.length))
      .reverse()
      .map(([subject, score]) => ({
        subject: this.getSubjectDisplayName(subject),
        score: parseFloat(score.toFixed(1)),
      }));

    // 计算成绩一致性（标准差的倒数）
    const consistencyScore = this.calculateConsistencyScore(totalScores);

    // 分析改进趋势
    const improvementTrend = this.analyzeTrend(totalScores);

    return {
      overallAverage: parseFloat(overallAverage.toFixed(1)),
      subjectStrengths,
      subjectWeaknesses,
      consistencyScore,
      improvementTrend,
    };
  }

  /**
   * 排名数据分析
   */
  private analyzeRankingData(
    records: any[]
  ): StudentLearningProfile["rankingAnalysis"] {
    const classRankTrend: number[] = [];
    const subjectRankings: Record<string, number> = {};

    // 收集班级排名趋势
    records.forEach((record) => {
      if (record.total_rank_in_class) {
        classRankTrend.push(record.total_rank_in_class);
      }
    });

    // 收集各科排名（取最近的排名）
    const subjects = [
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "biology",
      "politics",
      "history",
      "geography",
    ];
    const latestRecord = records[records.length - 1];

    if (latestRecord) {
      subjects.forEach((subject) => {
        const rankField = `${subject}_rank_in_class`;
        if (latestRecord[rankField]) {
          subjectRankings[this.getSubjectDisplayName(subject)] =
            latestRecord[rankField];
        }
      });
    }

    // 判断竞争位置
    const averageRank =
      classRankTrend.length > 0
        ? classRankTrend.reduce((sum, rank) => sum + rank, 0) /
          classRankTrend.length
        : 20;

    let competitivePosition: StudentLearningProfile["rankingAnalysis"]["competitivePosition"] =
      "middle";
    if (averageRank <= 5) competitivePosition = "top";
    else if (averageRank <= 15) competitivePosition = "upper-middle";
    else if (averageRank <= 25) competitivePosition = "middle";
    else if (averageRank <= 35) competitivePosition = "lower-middle";
    else competitivePosition = "bottom";

    return {
      classRankTrend,
      subjectRankings,
      competitivePosition,
    };
  }

  /**
   * 学习模式识别
   */
  private identifyLearningPatterns(
    records: any[]
  ): StudentLearningProfile["learningPatterns"] {
    const totalScores = records
      .map((r) => r.total_score)
      .filter((score) => score !== null && score !== undefined);

    // 分析考试表现模式
    let examPerformancePattern: StudentLearningProfile["learningPatterns"]["examPerformancePattern"] =
      "consistent";
    if (totalScores.length >= 3) {
      const variance = this.calculateVariance(totalScores);
      const trend = this.analyzeTrend(totalScores);

      if (variance > 20) {
        examPerformancePattern = "volatile";
      } else if (trend === "improving") {
        examPerformancePattern = "improving";
      } else if (trend === "declining") {
        examPerformancePattern = "declining";
      }
    }

    // 分析学科平衡性
    const subjects = [
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "biology",
    ];
    const scienceSubjects = ["math", "physics", "chemistry", "biology"];
    const liberalSubjects = ["chinese", "english"];

    let scienceAvg = 0,
      liberalAvg = 0;
    let scienceCount = 0,
      liberalCount = 0;

    // 计算理科和文科平均成绩
    records.forEach((record) => {
      scienceSubjects.forEach((subject) => {
        const score = record[`${subject}_score`];
        if (score !== null && score !== undefined) {
          scienceAvg += score;
          scienceCount++;
        }
      });

      liberalSubjects.forEach((subject) => {
        const score = record[`${subject}_score`];
        if (score !== null && score !== undefined) {
          liberalAvg += score;
          liberalCount++;
        }
      });
    });

    scienceAvg = scienceCount > 0 ? scienceAvg / scienceCount : 0;
    liberalAvg = liberalCount > 0 ? liberalAvg / liberalCount : 0;

    let subjectBalance: StudentLearningProfile["learningPatterns"]["subjectBalance"] =
      "balanced";
    const balanceDiff = Math.abs(scienceAvg - liberalAvg);

    if (balanceDiff > 15) {
      subjectBalance =
        scienceAvg > liberalAvg ? "science-oriented" : "liberal-oriented";
    } else if (balanceDiff > 25) {
      subjectBalance = "uneven";
    }

    // 分析压力应对（基于考试类型的表现差异）
    let stressResponse: StudentLearningProfile["learningPatterns"]["stressResponse"] =
      "neutral";
    const examTypeScores = new Map<string, number[]>();

    records.forEach((record) => {
      if (record.exam_type && record.total_score) {
        if (!examTypeScores.has(record.exam_type)) {
          examTypeScores.set(record.exam_type, []);
        }
        examTypeScores.get(record.exam_type)!.push(record.total_score);
      }
    });

    // 如果有多种考试类型，比较表现
    if (examTypeScores.size >= 2) {
      const averages = Array.from(examTypeScores.entries()).map(
        ([type, scores]) => ({
          type,
          average:
            scores.reduce((sum, score) => sum + score, 0) / scores.length,
        })
      );

      const maxAvg = Math.max(...averages.map((a) => a.average));
      const minAvg = Math.min(...averages.map((a) => a.average));

      if (maxAvg - minAvg > 20) {
        // 如果重要考试（如期中、期末）表现更好，说明抗压能力强
        const importantExams = averages.filter(
          (a) =>
            a.type.includes("期中") ||
            a.type.includes("期末") ||
            a.type.includes("月考")
        );

        if (importantExams.length > 0) {
          const importantAvg =
            importantExams.reduce((sum, exam) => sum + exam.average, 0) /
            importantExams.length;
          const overallAvg =
            averages.reduce((sum, exam) => sum + exam.average, 0) /
            averages.length;

          stressResponse =
            importantAvg > overallAvg ? "performs-well" : "struggles";
        }
      }
    }

    return {
      examPerformancePattern,
      subjectBalance,
      stressResponse,
    };
  }

  /**
   * 评估数据质量
   */
  private assessDataQuality(
    records: any[]
  ): StudentLearningProfile["dataQuality"] {
    const examCount = records.length;
    const subjects = [
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "biology",
      "politics",
      "history",
      "geography",
    ];

    // 计算有数据的科目数量
    const subjectCount = subjects.filter((subject) =>
      records.some((record) => record[`${subject}_score`] !== null)
    ).length;

    // 计算时间跨度
    const dates = records
      .map((r) => r.exam_date)
      .filter((date) => date)
      .sort();

    let timeSpan = "单次考试";
    if (dates.length >= 2) {
      const firstDate = new Date(dates[0]);
      const lastDate = new Date(dates[dates.length - 1]);
      const monthsDiff =
        (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
        (lastDate.getMonth() - firstDate.getMonth());

      if (monthsDiff >= 12) timeSpan = "一年以上";
      else if (monthsDiff >= 6) timeSpan = "半年以上";
      else if (monthsDiff >= 3) timeSpan = "三个月以上";
      else timeSpan = "三个月内";
    }

    // 计算完整性（基于考试次数和科目覆盖度）
    const completeness = Math.min(100, examCount * 10 + subjectCount * 5);

    // 评估可靠性
    let reliability: StudentLearningProfile["dataQuality"]["reliability"] =
      "low";
    if (examCount >= 3 && subjectCount >= 6) reliability = "high";
    else if (examCount >= 2 && subjectCount >= 4) reliability = "medium";

    return {
      examCount,
      subjectCount,
      timeSpan,
      completeness,
      reliability,
    };
  }

  /**
   * 使用增强的AI生成标签
   */
  private async generateEnhancedAITags(
    profile: StudentLearningProfile,
    config: AITagsGenerationConfig
  ): Promise<EnhancedAITags> {
    // 构建增强的分析上下文
    const analysisContext = this.buildEnhancedAnalysisContext(profile);

    try {
      // 调用增强的边缘函数
      const { data, error } = await supabase.functions.invoke(
        "generate-student-profile",
        {
          body: JSON.stringify({
            studentName: profile.studentName,
            studentId: profile.studentId,
            className: profile.className,
            analysisContext, // 新增：丰富的分析上下文
            scores: this.formatScoresForAI(profile), // 优化的成绩格式
            aiConfig: config,
          }),
        }
      );

      if (error) throw error;

      const aiTags = data?.tags;
      if (!aiTags) {
        throw new Error("AI标签生成失败：返回数据为空");
      }

      // 计算置信度
      const confidence = this.calculateTagsConfidence(profile, aiTags);

      return {
        ...aiTags,
        confidence,
        version: 1,
        generatedAt: new Date().toISOString(),
        dataSourceCount: profile.dataQuality.examCount,
      };
    } catch (error) {
      console.error("❌ [AI标签] AI生成失败，使用fallback机制:", error);

      // Fallback：基于规则生成标签
      return this.generateFallbackTags(profile);
    }
  }

  /**
   * 构建增强的分析上下文
   */
  private buildEnhancedAnalysisContext(
    profile: StudentLearningProfile
  ): string {
    const ctx = [];

    // 成绩分析上下文
    ctx.push(`成绩分析：平均分${profile.gradeAnalysis.overallAverage}分`);
    if (profile.gradeAnalysis.subjectStrengths.length > 0) {
      ctx.push(
        `优势学科：${profile.gradeAnalysis.subjectStrengths.map((s) => `${s.subject}(${s.score}分)`).join(", ")}`
      );
    }
    if (profile.gradeAnalysis.subjectWeaknesses.length > 0) {
      ctx.push(
        `薄弱学科：${profile.gradeAnalysis.subjectWeaknesses.map((s) => `${s.subject}(${s.score}分)`).join(", ")}`
      );
    }
    ctx.push(
      `成绩稳定性：${profile.gradeAnalysis.consistencyScore > 80 ? "很稳定" : profile.gradeAnalysis.consistencyScore > 60 ? "较稳定" : "波动较大"}`
    );
    ctx.push(
      `进步趋势：${profile.gradeAnalysis.improvementTrend === "improving" ? "上升" : profile.gradeAnalysis.improvementTrend === "declining" ? "下降" : "平稳"}`
    );

    // 排名分析上下文
    if (profile.rankingAnalysis.classRankTrend.length > 0) {
      const latestRank =
        profile.rankingAnalysis.classRankTrend[
          profile.rankingAnalysis.classRankTrend.length - 1
        ];
      ctx.push(
        `班级排名：第${latestRank}名（${profile.rankingAnalysis.competitivePosition}）`
      );
    }

    // 学习模式上下文
    ctx.push(`考试表现：${profile.learningPatterns.examPerformancePattern}`);
    ctx.push(`学科倾向：${profile.learningPatterns.subjectBalance}`);
    ctx.push(`压力应对：${profile.learningPatterns.stressResponse}`);

    // 数据质量上下文
    ctx.push(
      `数据基础：${profile.dataQuality.examCount}次考试，${profile.dataQuality.subjectCount}个科目，${profile.dataQuality.timeSpan}`
    );

    return ctx.join("\n");
  }

  /**
   * 为AI优化成绩格式
   */
  private formatScoresForAI(
    profile: StudentLearningProfile
  ): Array<{ subject: string; score: number; context?: string }> {
    const scores: Array<{ subject: string; score: number; context?: string }> =
      [];

    // 添加总分
    if (profile.gradeAnalysis.overallAverage > 0) {
      scores.push({
        subject: "总分",
        score: profile.gradeAnalysis.overallAverage,
        context: `趋势：${profile.gradeAnalysis.improvementTrend}`,
      });
    }

    // 添加优势学科
    profile.gradeAnalysis.subjectStrengths.forEach((strength) => {
      scores.push({
        subject: strength.subject,
        score: strength.score,
        context: "优势学科",
      });
    });

    // 添加薄弱学科
    profile.gradeAnalysis.subjectWeaknesses.forEach((weakness) => {
      scores.push({
        subject: weakness.subject,
        score: weakness.score,
        context: "薄弱学科",
      });
    });

    return scores;
  }

  /**
   * 计算标签置信度
   */
  private calculateTagsConfidence(
    profile: StudentLearningProfile,
    aiTags: any
  ): number {
    let confidence = 50; // 基础置信度

    // 基于数据质量调整置信度
    if (profile.dataQuality.reliability === "high") confidence += 30;
    else if (profile.dataQuality.reliability === "medium") confidence += 15;

    // 基于考试次数调整
    confidence += Math.min(20, profile.dataQuality.examCount * 5);

    // 基于科目覆盖度调整
    confidence += Math.min(15, profile.dataQuality.subjectCount * 2);

    // 确保在合理范围内
    return Math.min(100, Math.max(20, confidence));
  }

  /**
   * 生成Fallback标签（基于规则）
   */
  private generateFallbackTags(
    profile: StudentLearningProfile
  ): EnhancedAITags {
    const tags: EnhancedAITags = {
      learningStyle: [],
      strengths: [],
      improvements: [],
      personalityTraits: [],
      confidence: 30, // 规则生成的置信度较低
      version: 1,
      generatedAt: new Date().toISOString(),
      dataSourceCount: profile.dataQuality.examCount,
    };

    // 基于成绩分析生成学习风格
    if (profile.gradeAnalysis.consistencyScore > 80) {
      tags.learningStyle.push("稳定型");
    } else if (profile.gradeAnalysis.consistencyScore < 40) {
      tags.learningStyle.push("波动型");
    }

    if (profile.learningPatterns.subjectBalance === "science-oriented") {
      tags.learningStyle.push("理科思维");
    } else if (profile.learningPatterns.subjectBalance === "liberal-oriented") {
      tags.learningStyle.push("文科思维");
    }

    // 基于排名生成优势
    if (profile.rankingAnalysis.competitivePosition === "top") {
      tags.strengths.push("学业优秀", "竞争力强");
    } else if (profile.rankingAnalysis.competitivePosition === "upper-middle") {
      tags.strengths.push("成绩良好", "潜力较大");
    }

    // 基于改进趋势生成特质
    if (profile.gradeAnalysis.improvementTrend === "improving") {
      tags.personalityTraits.push("进步明显", "积极向上");
    } else if (profile.gradeAnalysis.improvementTrend === "declining") {
      tags.improvements.push("学习方法", "学习动力");
    }

    // 确保每个分类至少有一个标签
    if (tags.learningStyle.length === 0) tags.learningStyle.push("适应型");
    if (tags.strengths.length === 0) tags.strengths.push("基础扎实");
    if (tags.improvements.length === 0) tags.improvements.push("持续努力");
    if (tags.personalityTraits.length === 0)
      tags.personalityTraits.push("认真学习");

    return tags;
  }

  /**
   * 保存AI标签到数据库
   */
  private async saveAITags(
    studentId: string,
    tags: EnhancedAITags
  ): Promise<void> {
    const { error } = await supabase.from("student_ai_tags").upsert(
      {
        student_id: studentId,
        learning_style: tags.learningStyle,
        strengths: tags.strengths,
        improvements: tags.improvements,
        personality_traits: tags.personalityTraits,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "student_id",
      }
    );

    if (error) {
      throw new Error(`保存AI标签失败: ${error.message}`);
    }
  }

  /**
   * 判断数据是否充足
   */
  private isDataSufficient(
    profile: StudentLearningProfile,
    minRequired: number
  ): boolean {
    return (
      profile.dataQuality.examCount >= minRequired &&
      profile.dataQuality.subjectCount >= 2
    );
  }

  // 辅助方法
  private getSubjectDisplayName(subject: string): string {
    const nameMap: Record<string, string> = {
      chinese: "语文",
      math: "数学",
      english: "英语",
      physics: "物理",
      chemistry: "化学",
      biology: "生物",
      politics: "政治",
      history: "历史",
      geography: "地理",
    };
    return nameMap[subject] || subject;
  }

  private calculateConsistencyScore(scores: number[]): number {
    if (scores.length < 2) return 100;

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;
    const stdDev = Math.sqrt(variance);

    // 将标准差转换为一致性分数（标准差越小，一致性越高）
    return Math.max(0, 100 - stdDev * 2);
  }

  private analyzeTrend(scores: number[]): "improving" | "stable" | "declining" {
    if (scores.length < 3) return "stable";

    // 使用简单线性回归分析趋势
    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = scores.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (scores[i] - meanY);
      denominator += (x[i] - meanX) * (x[i] - meanX);
    }

    const slope = numerator / denominator;

    if (slope > 2) return "improving";
    else if (slope < -2) return "declining";
    else return "stable";
  }

  private calculateVariance(scores: number[]): number {
    if (scores.length < 2) return 0;

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return (
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length
    );
  }
}

// 导出单例实例
export const enhancedAITagsService = new EnhancedAITagsService();
