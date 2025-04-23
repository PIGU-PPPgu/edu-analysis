
import { ChartData } from "@/contexts/GradeAnalysisContext";

/**
 * 计算成绩统计信息
 * @param {Array} data 成绩数据
 * @returns {Object} 统计信息
 */
export const calculateStatistics = (data: any[]) => {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      avg: 0,
      max: 0,
      min: 0,
      passing: 0,
      total: 0
    };
  }

  // 确保从数据库或不同来源的数据都能正确处理
  const scores = data.map(item => {
    const score = typeof item.score === 'number' ? item.score : Number(item.score);
    return isNaN(score) ? null : score;
  }).filter(score => score !== null) as number[];
  
  const total = scores.length;
  
  if (total === 0) {
    return {
      avg: 0,
      max: 0,
      min: 0,
      passing: 0,
      total: 0
    };
  }

  const sum = scores.reduce((acc, score) => acc + score, 0);
  const avg = sum / total;
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const passing = scores.filter(score => score >= 60).length;

  return {
    avg,
    max,
    min,
    passing,
    total
  };
};

/**
 * 生成基于数据的图表配置
 * @param {Array} data 成绩数据
 * @returns {Array} 图表配置
 */
export const generateCustomCharts = (data: any[]) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const charts = [];

  try {
    // 图表1: 学科平均分
    const subjectScores: Record<string, number[]> = {};
    data.forEach(item => {
      const subject = item.subject;
      if (subject) {
        if (!subjectScores[subject]) {
          subjectScores[subject] = [];
        }
        const score = typeof item.score === 'number' ? item.score : Number(item.score);
        if (!isNaN(score)) {
          subjectScores[subject].push(score);
        }
      }
    });

    const subjectAverages = Object.entries(subjectScores).map(([subject, scores]) => ({
      subject,
      averageScore: scores.reduce((acc, score) => acc + score, 0) / scores.length
    }));

    charts.push({
      id: "subjectAverages",
      data: subjectAverages
    });

    // 图表2: 分数段分布
    const scoreRanges = {
      "90-100分": 0,
      "80-89分": 0,
      "70-79分": 0,
      "60-69分": 0,
      "60分以下": 0
    };

    data.forEach(item => {
      const score = typeof item.score === 'number' ? item.score : Number(item.score);
      if (!isNaN(score)) {
        if (score >= 90) {
          scoreRanges["90-100分"]++;
        } else if (score >= 80) {
          scoreRanges["80-89分"]++;
        } else if (score >= 70) {
          scoreRanges["70-79分"]++;
        } else if (score >= 60) {
          scoreRanges["60-69分"]++;
        } else {
          scoreRanges["60分以下"]++;
        }
      }
    });

    const scoreDistribution = Object.entries(scoreRanges).map(([range, count]) => ({
      range,
      count
    }));

    charts.push({
      id: "scoreDistribution",
      data: scoreDistribution
    });

    // 图表3: 考试类型比较
    if (data.some(item => item.examType || item.exam_type)) {
      const examTypeScores: Record<string, number[]> = {};
      data.forEach(item => {
        const examType = item.examType || item.exam_type;
        if (examType) {
          if (!examTypeScores[examType]) {
            examTypeScores[examType] = [];
          }
          const score = typeof item.score === 'number' ? item.score : Number(item.score);
          if (!isNaN(score)) {
            examTypeScores[examType].push(score);
          }
        }
      });

      const examTypeAverages = Object.entries(examTypeScores).map(([examType, scores]) => ({
        examType,
        averageScore: scores.reduce((acc, score) => acc + score, 0) / scores.length
      }));

      if (examTypeAverages.length > 0) {
        charts.push({
          id: "examTypeComparison",
          data: examTypeAverages
        });
      }
    }

    // 图表4: 成绩趋势 (如果有日期)
    if (data.some(item => item.examDate || item.exam_date)) {
      const dateSubjectScores: Record<string, Record<string, number[]>> = {};
      
      // 按日期和科目分组
      data.forEach(item => {
        const date = item.examDate || item.exam_date;
        const subject = item.subject;
        if (date && subject) {
          if (!dateSubjectScores[date]) {
            dateSubjectScores[date] = {};
          }
          if (!dateSubjectScores[date][subject]) {
            dateSubjectScores[date][subject] = [];
          }
          const score = typeof item.score === 'number' ? item.score : Number(item.score);
          if (!isNaN(score)) {
            dateSubjectScores[date][subject].push(score);
          }
        }
      });

      // 计算每个日期每个科目的平均分
      const trendData = Object.entries(dateSubjectScores).map(([date, subjects]) => {
        const entry: Record<string, any> = { date };
        
        Object.entries(subjects).forEach(([subject, scores]) => {
          entry[subject] = scores.reduce((acc, score) => acc + score, 0) / scores.length;
        });
        
        return entry;
      });

      // 按日期排序
      trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (trendData.length > 0) {
        charts.push({
          id: "scoreTrend",
          data: trendData
        });
      }
    }

  } catch (error) {
    console.error("生成图表时出错:", error);
  }

  return charts;
};

/**
 * 获取图表数据
 * @param {ChartData} chart 图表配置
 * @returns {Array} 图表数据
 */
export const getChartData = (chart: ChartData) => {
  if (!chart || !chart.data) {
    return [];
  }
  return chart.data;
};
