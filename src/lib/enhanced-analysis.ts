// 增强数据分析功能库
// 提供智能趋势分析、预测模型、异常检测等高级分析功能

export interface GradeRecord {
  student_id: string;
  name: string;
  class_name: string;
  subject: string;
  score: number;
  exam_date: string;
  exam_title: string;
}

export interface TrendAnalysisResult {
  trend: "up" | "down" | "stable";
  trendStrength: number; // 0-1之间，表示趋势强度
  changeRate: number; // 变化率（百分比）
  confidence: number; // 置信度
  prediction: number; // 预测下次成绩
  suggestion: string; // 建议
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number; // 异常分数，越高越异常
  anomalyType: "high" | "low" | "sudden_change" | "pattern_break";
  description: string;
  context: Record<string, any>;
}

export interface PerformanceInsight {
  type: "strength" | "weakness" | "improvement" | "concern";
  subject?: string;
  description: string;
  data: Record<string, any>;
  actionSuggestion: string;
  priority: "high" | "medium" | "low";
}

// 智能数据分析器
export class EnhancedAnalyzer {
  // 趋势分析 - 分析学生成绩趋势
  static analyzeTrend(
    scores: number[],
    timePoints: string[]
  ): TrendAnalysisResult {
    if (scores.length < 2) {
      return {
        trend: "stable",
        trendStrength: 0,
        changeRate: 0,
        confidence: 0,
        prediction: scores[0] || 0,
        suggestion: "数据不足，无法分析趋势",
      };
    }

    // 计算线性回归
    const n = scores.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = scores;

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 计算相关系数
    const meanX = sumX / n;
    const meanY = sumY / n;
    const numerator = xValues.reduce(
      (sum, x, i) => sum + (x - meanX) * (yValues[i] - meanY),
      0
    );
    const denomX = Math.sqrt(
      xValues.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0)
    );
    const denomY = Math.sqrt(
      yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0)
    );
    const correlation = numerator / (denomX * denomY);

    // 确定趋势
    const trendStrength = Math.abs(correlation);
    let trend: "up" | "down" | "stable";
    if (slope > 1 && trendStrength > 0.3) {
      trend = "up";
    } else if (slope < -1 && trendStrength > 0.3) {
      trend = "down";
    } else {
      trend = "stable";
    }

    // 计算变化率
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const changeRate =
      firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;

    // 预测下次成绩
    const prediction = intercept + slope * n;

    // 生成建议
    let suggestion = "";
    if (trend === "up") {
      suggestion = `成绩呈上升趋势，保持当前学习方法，继续努力！`;
    } else if (trend === "down") {
      suggestion = `成绩呈下降趋势，需要及时调整学习策略，建议寻求帮助。`;
    } else {
      suggestion = `成绩相对稳定，可考虑尝试新的学习方法来突破现有水平。`;
    }

    return {
      trend,
      trendStrength,
      changeRate,
      confidence: trendStrength,
      prediction: Math.max(0, Math.min(100, prediction)),
      suggestion,
    };
  }

  // 异常检测 - 检测异常成绩
  static detectAnomalies(
    scores: number[],
    studentAverage?: number
  ): AnomalyDetectionResult[] {
    if (scores.length < 3) {
      return [];
    }

    const results: AnomalyDetectionResult[] = [];
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
        scores.length
    );

    scores.forEach((score, index) => {
      let isAnomaly = false;
      let anomalyScore = 0;
      let anomalyType: AnomalyDetectionResult["anomalyType"] = "sudden_change";
      let description = "";

      // Z-score异常检测
      const zScore = Math.abs((score - mean) / stdDev);
      if (zScore > 2) {
        isAnomaly = true;
        anomalyScore = zScore / 3; // 标准化到0-1

        if (score > mean + 2 * stdDev) {
          anomalyType = "high";
          description = `异常高分：${score}分，远高于平均水平`;
        } else {
          anomalyType = "low";
          description = `异常低分：${score}分，远低于平均水平`;
        }
      }

      // 突然变化检测（相邻分数差异过大）
      if (index > 0) {
        const prevScore = scores[index - 1];
        const scoreDiff = Math.abs(score - prevScore);
        if (scoreDiff > 20) {
          // 分数变化超过20分
          isAnomaly = true;
          anomalyScore = Math.max(anomalyScore, Math.min(1, scoreDiff / 30));
          anomalyType = "sudden_change";
          description = `突然变化：相比上次考试变化${scoreDiff.toFixed(1)}分`;
        }
      }

      // 与个人平均分对比（如果提供）
      if (studentAverage && Math.abs(score - studentAverage) > 15) {
        isAnomaly = true;
        anomalyScore = Math.max(
          anomalyScore,
          Math.abs(score - studentAverage) / 50
        );
        anomalyType = score > studentAverage ? "high" : "low";
        description += ` 与个人平均分(${studentAverage})差异${Math.abs(score - studentAverage).toFixed(1)}分`;
      }

      if (isAnomaly) {
        results.push({
          isAnomaly,
          anomalyScore: Math.min(1, anomalyScore),
          anomalyType,
          description,
          context: {
            scoreIndex: index,
            score,
            mean,
            stdDev,
            zScore,
          },
        });
      }
    });

    return results;
  }

  // 性能洞察分析
  static generatePerformanceInsights(
    gradeRecords: GradeRecord[]
  ): PerformanceInsight[] {
    if (gradeRecords.length === 0) {
      return [];
    }

    const insights: PerformanceInsight[] = [];

    // 按科目分组
    const subjectGroups = gradeRecords.reduce(
      (groups, record) => {
        if (!groups[record.subject]) {
          groups[record.subject] = [];
        }
        groups[record.subject].push(record);
        return groups;
      },
      {} as Record<string, GradeRecord[]>
    );

    // 分析每个科目
    Object.entries(subjectGroups).forEach(([subject, records]) => {
      const scores = records.map((r) => r.score);
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const variance =
        scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) /
        scores.length;

      // 优势科目检测
      if (average >= 85) {
        insights.push({
          type: "strength",
          subject,
          description: `${subject}是优势科目，平均分${average.toFixed(1)}`,
          data: { average, maxScore, minScore },
          actionSuggestion: "继续保持，可考虑深入学习或帮助其他同学",
          priority: "low",
        });
      }

      // 薄弱科目检测
      if (average < 70) {
        insights.push({
          type: "weakness",
          subject,
          description: `${subject}需要重点关注，平均分仅${average.toFixed(1)}`,
          data: { average, maxScore, minScore },
          actionSuggestion: "建议加强基础练习，寻求老师或同学帮助",
          priority: "high",
        });
      }

      // 进步检测
      if (scores.length >= 3) {
        const recentScores = scores.slice(-3);
        const recentAverage =
          recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const earlyScores = scores.slice(0, 3);
        const earlyAverage =
          earlyScores.reduce((a, b) => a + b, 0) / earlyScores.length;

        if (recentAverage > earlyAverage + 5) {
          insights.push({
            type: "improvement",
            subject,
            description: `${subject}最近表现进步明显，提升${(recentAverage - earlyAverage).toFixed(1)}分`,
            data: {
              recentAverage,
              earlyAverage,
              improvement: recentAverage - earlyAverage,
            },
            actionSuggestion: "保持当前学习方法，继续稳步提升",
            priority: "medium",
          });
        }
      }

      // 不稳定性检测
      if (variance > 100) {
        // 方差过大说明成绩不稳定
        insights.push({
          type: "concern",
          subject,
          description: `${subject}成绩波动较大，最高${maxScore}分，最低${minScore}分`,
          data: {
            variance,
            maxScore,
            minScore,
            scoreRange: maxScore - minScore,
          },
          actionSuggestion: "建议规律学习，查找成绩波动原因",
          priority: "medium",
        });
      }
    });

    // 全局分析
    const allScores = gradeRecords.map((r) => r.score);
    const overallAverage =
      allScores.reduce((a, b) => a + b, 0) / allScores.length;

    if (overallAverage < 75) {
      insights.push({
        type: "concern",
        description: `整体成绩需要提升，平均分${overallAverage.toFixed(1)}`,
        data: {
          overallAverage,
          totalSubjects: Object.keys(subjectGroups).length,
        },
        actionSuggestion: "建议制定系统的学习计划，重点突破薄弱科目",
        priority: "high",
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // 班级对比分析
  static analyzeClassComparison(
    studentScores: GradeRecord[],
    classScores: GradeRecord[]
  ): {
    studentPerformance: "above_average" | "average" | "below_average";
    percentileRank: number;
    comparison: {
      subject: string;
      studentAvg: number;
      classAvg: number;
      ranking: number;
      totalStudents: number;
    }[];
  } {
    // 按科目分组学生成绩
    const studentBySubject = studentScores.reduce(
      (groups, record) => {
        if (!groups[record.subject]) {
          groups[record.subject] = [];
        }
        groups[record.subject].push(record.score);
        return groups;
      },
      {} as Record<string, number[]>
    );

    // 按科目分组班级成绩
    const classBySubject = classScores.reduce(
      (groups, record) => {
        if (!groups[record.subject]) {
          groups[record.subject] = [];
        }
        groups[record.subject].push(record.score);
        return groups;
      },
      {} as Record<string, number[]>
    );

    const comparison = Object.keys(studentBySubject).map((subject) => {
      const studentAvg =
        studentBySubject[subject].reduce((a, b) => a + b, 0) /
        studentBySubject[subject].length;
      const classSubjectScores = classBySubject[subject] || [];
      const classAvg =
        classSubjectScores.length > 0
          ? classSubjectScores.reduce((a, b) => a + b, 0) /
            classSubjectScores.length
          : 0;

      // 计算排名
      const higherScores = classSubjectScores.filter(
        (score) => score > studentAvg
      ).length;
      const ranking = higherScores + 1;

      return {
        subject,
        studentAvg,
        classAvg,
        ranking,
        totalStudents: classSubjectScores.length,
      };
    });

    // 计算整体表现
    const studentOverallAvg =
      Object.values(studentBySubject)
        .flat()
        .reduce((a, b) => a + b, 0) /
      Object.values(studentBySubject).flat().length;

    const classOverallAvg =
      Object.values(classBySubject)
        .flat()
        .reduce((a, b) => a + b, 0) /
      Object.values(classBySubject).flat().length;

    let studentPerformance: "above_average" | "average" | "below_average";
    if (studentOverallAvg > classOverallAvg + 5) {
      studentPerformance = "above_average";
    } else if (studentOverallAvg < classOverallAvg - 5) {
      studentPerformance = "below_average";
    } else {
      studentPerformance = "average";
    }

    // 计算百分位排名
    const allClassScores = Object.values(classBySubject).flat();
    const lowerScores = allClassScores.filter(
      (score) => score < studentOverallAvg
    ).length;
    const percentileRank =
      allClassScores.length > 0
        ? (lowerScores / allClassScores.length) * 100
        : 50;

    return {
      studentPerformance,
      percentileRank,
      comparison,
    };
  }

  // 学习建议生成器
  static generateLearningRecommendations(
    trendAnalysis: TrendAnalysisResult,
    insights: PerformanceInsight[],
    anomalies: AnomalyDetectionResult[]
  ): {
    priority: "urgent" | "high" | "medium" | "low";
    category:
      | "study_method"
      | "time_management"
      | "subject_focus"
      | "exam_strategy";
    recommendation: string;
    reason: string;
  }[] {
    const recommendations = [];

    // 基于趋势的建议
    if (trendAnalysis.trend === "down" && trendAnalysis.trendStrength > 0.5) {
      recommendations.push({
        priority: "urgent" as const,
        category: "study_method" as const,
        recommendation: "立即调整学习方法，寻求老师或家长帮助",
        reason: "成绩持续下降，需要及时干预",
      });
    }

    // 基于洞察的建议
    insights.forEach((insight) => {
      if (insight.type === "weakness" && insight.priority === "high") {
        recommendations.push({
          priority: "high" as const,
          category: "subject_focus" as const,
          recommendation: `重点突破${insight.subject}，建议每天额外练习30分钟`,
          reason: insight.description,
        });
      }

      if (insight.type === "concern") {
        recommendations.push({
          priority: "medium" as const,
          category: "time_management" as const,
          recommendation: "制定规律的学习计划，保持成绩稳定性",
          reason: insight.description,
        });
      }
    });

    // 基于异常的建议
    const recentAnomalies = anomalies.filter((a) => a.anomalyType === "low");
    if (recentAnomalies.length > 0) {
      recommendations.push({
        priority: "high" as const,
        category: "exam_strategy" as const,
        recommendation: "检查考试策略，注意时间分配和答题技巧",
        reason: "出现异常低分，可能存在考试技巧问题",
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}
