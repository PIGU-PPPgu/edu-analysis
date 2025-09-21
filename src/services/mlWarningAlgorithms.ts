/**
 * 机器学习预警算法集合
 * 基于学生成绩数据的智能预警分析
 */

// 学生数据接口
interface StudentMLData {
  student_id: string;
  name: string;
  class_name: string;
  grades: GradeRecord[];
}

interface GradeRecord {
  exam_title: string;
  exam_date: string;
  total_score: number;
  total_rank_in_class: number;
  total_rank_in_school: number;
  subject_scores: { [key: string]: number };
}

// ML预警结果接口
interface MLWarningResult {
  student_id: string;
  algorithm_type: string;
  risk_score: number; // 0-100
  confidence: number; // 0-1
  explanation: string;
  recommended_actions: string[];
  similar_cases?: string[]; // 相似学生ID
}

/**
 * 算法1：成绩趋势预测 - 基于线性回归
 */
export class GradeTrendPredictor {
  
  /**
   * 预测学生成绩趋势
   */
  static predictTrend(studentData: StudentMLData): MLWarningResult {
    const grades = studentData.grades
      .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
      .map(g => g.total_score);
    
    if (grades.length < 3) {
      return {
        student_id: studentData.student_id,
        algorithm_type: 'trend_prediction',
        risk_score: 50,
        confidence: 0.3,
        explanation: '数据点不足，无法准确预测趋势',
        recommended_actions: ['收集更多考试数据']
      };
    }

    // 简单线性回归
    const { slope, r_squared } = this.linearRegression(grades);
    
    // 计算风险分数
    let risk_score = 50;
    if (slope < -2) risk_score = 85; // 强下降趋势
    else if (slope < -1) risk_score = 70; // 中度下降
    else if (slope < 0) risk_score = 55; // 轻微下降
    else if (slope > 1) risk_score = 30; // 上升趋势
    
    // 预测下次考试分数
    const predictedScore = grades[grades.length - 1] + slope;
    
    return {
      student_id: studentData.student_id,
      algorithm_type: 'trend_prediction',
      risk_score: Math.min(100, Math.max(0, risk_score)),
      confidence: Math.min(0.9, r_squared),
      explanation: `基于${grades.length}次考试数据，成绩${slope > 0 ? '上升' : '下降'}趋势${Math.abs(slope).toFixed(1)}分/次。预测下次考试约${predictedScore.toFixed(0)}分`,
      recommended_actions: slope < -1 ? [
        '及时进行学业辅导',
        '分析成绩下降原因',
        '制定针对性学习计划'
      ] : ['继续保持', '适当挑战更高目标']
    };
  }

  /**
   * 简单线性回归实现
   */
  private static linearRegression(y: number[]): { slope: number; intercept: number; r_squared: number } {
    const n = y.length;
    const x = Array.from({length: n}, (_, i) => i + 1);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 计算R²
    const meanY = sumY / n;
    const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const residualSumSquares = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const r_squared = 1 - (residualSumSquares / totalSumSquares);

    return { slope, intercept, r_squared };
  }
}

/**
 * 算法2：异常检测 - 基于Z-score
 */
export class AnomalyDetector {
  
  /**
   * 检测学生成绩异常
   */
  static detectAnomalies(studentData: StudentMLData, classAverage: number[]): MLWarningResult {
    const grades = studentData.grades.map(g => g.total_score);
    const recentGrades = grades.slice(-3); // 最近3次成绩
    
    if (recentGrades.length < 2) {
      return {
        student_id: studentData.student_id,
        algorithm_type: 'anomaly_detection',
        risk_score: 40,
        confidence: 0.2,
        explanation: '数据不足，无法进行异常检测',
        recommended_actions: ['持续观察']
      };
    }

    // 计算Z-score
    const mean = grades.reduce((a, b) => a + b, 0) / grades.length;
    const std = Math.sqrt(grades.reduce((sum, grade) => sum + Math.pow(grade - mean, 2), 0) / grades.length);
    
    const latestGrade = recentGrades[recentGrades.length - 1];
    const zScore = Math.abs((latestGrade - mean) / std);
    
    // 检测异常程度
    let risk_score = 40;
    let explanation = '';
    
    if (zScore > 2.5) {
      risk_score = 90;
      explanation = `最近成绩${latestGrade}分严重偏离个人平均水平${mean.toFixed(1)}分 (Z-score: ${zScore.toFixed(2)})`;
    } else if (zScore > 1.5) {
      risk_score = 70;
      explanation = `最近成绩${latestGrade}分明显偏离个人平均水平${mean.toFixed(1)}分 (Z-score: ${zScore.toFixed(2)})`;
    } else if (zScore > 1) {
      risk_score = 55;
      explanation = `最近成绩${latestGrade}分轻微偏离个人平均水平${mean.toFixed(1)}分`;
    } else {
      explanation = `成绩${latestGrade}分在正常范围内，个人平均${mean.toFixed(1)}分`;
    }

    return {
      student_id: studentData.student_id,
      algorithm_type: 'anomaly_detection',
      risk_score,
      confidence: Math.min(0.9, zScore / 3),
      explanation,
      recommended_actions: zScore > 1.5 ? [
        '深入了解最近学习状态',
        '检查是否有外界干扰因素',
        '考虑个别辅导'
      ] : ['继续正常关注']
    };
  }
}

/**
 * 算法3：综合风险评分 - 多因子模型
 */
export class RiskScoreCalculator {
  
  /**
   * 计算学生综合风险分数
   */
  static calculateRisk(studentData: StudentMLData, classStats: any): MLWarningResult {
    const grades = studentData.grades;
    if (grades.length === 0) {
      return {
        student_id: studentData.student_id,
        algorithm_type: 'risk_score',
        risk_score: 50,
        confidence: 0.1,
        explanation: '无成绩数据',
        recommended_actions: ['收集基础数据']
      };
    }

    let riskFactors = [];
    let totalRisk = 0;

    // 因子1：绝对成绩水平 (权重30%)
    const avgScore = grades.reduce((sum, g) => sum + g.total_score, 0) / grades.length;
    let scoreRisk = 0;
    if (avgScore < 200) scoreRisk = 80;
    else if (avgScore < 300) scoreRisk = 60;
    else if (avgScore < 400) scoreRisk = 40;
    else scoreRisk = 20;
    
    totalRisk += scoreRisk * 0.3;
    if (scoreRisk > 60) riskFactors.push(`平均分${avgScore.toFixed(0)}分较低`);

    // 因子2：成绩波动性 (权重20%)
    const scores = grades.map(g => g.total_score);
    const std = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length);
    const volatilityRisk = Math.min(80, (std / avgScore) * 100 * 2);
    
    totalRisk += volatilityRisk * 0.2;
    if (volatilityRisk > 40) riskFactors.push(`成绩波动较大(标准差${std.toFixed(1)})`);

    // 因子3：排名趋势 (权重25%)
    const ranks = grades.map(g => g.total_rank_in_class).filter(r => r > 0);
    let rankRisk = 50;
    if (ranks.length >= 2) {
      const rankTrend = ranks[ranks.length - 1] - ranks[0];
      if (rankTrend > 5) rankRisk = 70; // 排名下降
      else if (rankTrend > 2) rankRisk = 55;
      else if (rankTrend < -2) rankRisk = 35; // 排名上升
      else rankRisk = 45;
      
      if (rankTrend > 3) riskFactors.push(`班级排名下降${rankTrend}位`);
    }
    totalRisk += rankRisk * 0.25;

    // 因子4：科目平衡度 (权重25%)
    let balanceRisk = 50;
    if (grades.length > 0 && grades[0].subject_scores) {
      const subjectScores = Object.values(grades[0].subject_scores);
      const subjectAvg = subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length;
      const subjectStd = Math.sqrt(subjectScores.reduce((sum, s) => sum + Math.pow(s - subjectAvg, 2), 0) / subjectScores.length);
      
      balanceRisk = Math.min(80, (subjectStd / subjectAvg) * 100);
      if (balanceRisk > 50) riskFactors.push(`科目发展不均衡`);
    }
    totalRisk += balanceRisk * 0.25;

    const finalRisk = Math.min(100, Math.max(0, totalRisk));
    
    return {
      student_id: studentData.student_id,
      algorithm_type: 'risk_score',
      risk_score: finalRisk,
      confidence: 0.8,
      explanation: `综合评估风险分数${finalRisk.toFixed(0)}分。主要风险因素：${riskFactors.join(', ') || '各项指标正常'}`,
      recommended_actions: finalRisk > 70 ? [
        '重点关注，建立个人档案',
        '制定个性化学习计划',
        '加强家校沟通',
        '考虑心理健康评估'
      ] : finalRisk > 50 ? [
        '适度关注',
        '定期跟踪进展',
        '鼓励均衡发展'
      ] : [
        '继续保持',
        '发掘更大潜力'
      ]
    };
  }
}

/**
 * 算法4：相似学生匹配 - 基于余弦相似度
 */
export class SimilarStudentFinder {
  
  /**
   * 找到表现相似的学生
   */
  static findSimilarStudents(targetStudent: StudentMLData, allStudents: StudentMLData[]): MLWarningResult {
    const targetVector = this.createFeatureVector(targetStudent);
    const similarities = [];

    for (const student of allStudents) {
      if (student.student_id === targetStudent.student_id) continue;
      
      const studentVector = this.createFeatureVector(student);
      const similarity = this.cosineSimilarity(targetVector, studentVector);
      
      if (similarity > 0.7) { // 相似度阈值
        similarities.push({
          student_id: student.student_id,
          name: student.name,
          similarity
        });
      }
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    const topSimilar = similarities.slice(0, 3);

    return {
      student_id: targetStudent.student_id,
      algorithm_type: 'similar_students',
      risk_score: 45, // 中性分数，主要用于参考
      confidence: 0.7,
      explanation: `找到${topSimilar.length}名表现相似的学生，可作为对比参考`,
      recommended_actions: [
        '分析相似学生的成功经验',
        '组织同类学生互助学习',
        '参考相似案例制定干预方案'
      ],
      similar_cases: topSimilar.map(s => s.student_id)
    };
  }

  /**
   * 创建学生特征向量
   */
  private static createFeatureVector(student: StudentMLData): number[] {
    if (student.grades.length === 0) return [0, 0, 0, 0];
    
    // 特征：平均分、分数方差、排名趋势、最近表现
    const scores = student.grades.map(g => g.total_score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    
    const ranks = student.grades.map(g => g.total_rank_in_class).filter(r => r > 0);
    const rankTrend = ranks.length >= 2 ? ranks[ranks.length - 1] - ranks[0] : 0;
    
    const recentPerf = scores.length >= 3 ? 
      scores.slice(-3).reduce((a, b) => a + b, 0) / 3 - 
      scores.slice(0, -3).reduce((a, b) => a + b, 0) / (scores.length - 3) : 0;

    return [
      avgScore / 100, // 标准化到0-5范围
      Math.sqrt(variance) / 50,
      Math.max(-1, Math.min(1, rankTrend / 10)), // 限制在-1到1范围
      recentPerf / 50
    ];
  }

  /**
   * 计算余弦相似度
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

// 导出统一的ML预警接口
export interface MLAlgorithmConfig {
  type: 'trend_prediction' | 'anomaly_detection' | 'risk_score' | 'similar_students';
  enabled: boolean;
  sensitivity: number; // 0.1-1.0 敏感度调节
  min_confidence: number; // 最小置信度要求
}

/**
 * ML预警算法统一调度器
 */
export class MLWarningEngine {
  
  static async runMLAnalysis(
    studentData: StudentMLData,
    allStudents: StudentMLData[],
    config: MLAlgorithmConfig[]
  ): Promise<MLWarningResult[]> {
    const results: MLWarningResult[] = [];
    
    for (const cfg of config.filter(c => c.enabled)) {
      let result: MLWarningResult;
      
      switch (cfg.type) {
        case 'trend_prediction':
          result = GradeTrendPredictor.predictTrend(studentData);
          break;
        case 'anomaly_detection':
          const classAvg = allStudents
            .filter(s => s.class_name === studentData.class_name)
            .map(s => s.grades.map(g => g.total_score))
            .flat();
          result = AnomalyDetector.detectAnomalies(studentData, classAvg);
          break;
        case 'risk_score':
          result = RiskScoreCalculator.calculateRisk(studentData, {});
          break;
        case 'similar_students':
          result = SimilarStudentFinder.findSimilarStudents(studentData, allStudents);
          break;
        default:
          continue;
      }
      
      // 应用敏感度调节
      result.risk_score = result.risk_score * cfg.sensitivity;
      
      // 过滤低置信度结果
      if (result.confidence >= cfg.min_confidence) {
        results.push(result);
      }
    }
    
    return results;
  }
}