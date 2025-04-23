
import { GradeRecord, ChartData } from "../contexts/GradeAnalysisContext";

// Generate charts based on the parsed data
export const generateCustomCharts = (parsedData: GradeRecord[]): ChartData[] => {
  if (parsedData.length === 0) return [];
  
  const generatedCharts: ChartData[] = [];
  const firstRecord = parsedData[0];
  const fields = Object.keys(firstRecord);

  const scoreField = fields.find(f => 
    f.toLowerCase().includes('score') || 
    f.toLowerCase().includes('分数') || 
    f.toLowerCase().includes('成绩')
  ) || 'score';
  
  const subjectField = fields.find(f => 
    f.toLowerCase().includes('subject') || 
    f.toLowerCase().includes('科目') || 
    f.toLowerCase().includes('学科')
  ) || 'subject';
  
  const dateField = fields.find(f => 
    f.toLowerCase().includes('date') || 
    f.toLowerCase().includes('日期') || 
    f.toLowerCase().includes('time') || 
    f.toLowerCase().includes('时间')
  ) || 'examDate';
  
  const examTypeField = fields.find(f => 
    f.toLowerCase().includes('type') || 
    f.toLowerCase().includes('类型') || 
    f.toLowerCase().includes('exam')
  ) || 'examType';

  // 生成各科目均分
  if (scoreField && subjectField) {
    const subjectScores: Record<string, { total: number; count: number }> = {};
    parsedData.forEach(record => {
      const subject = record[subjectField];
      const score = parseFloat(String(record[scoreField]));
      if (!isNaN(score)) {
        if (!subjectScores[subject]) {
          subjectScores[subject] = { total: score, count: 1 };
        } else {
          subjectScores[subject].total += score;
          subjectScores[subject].count += 1;
        }
      }
    });
    
    const subjectAverages = Object.entries(subjectScores).map(([subject, data]) => ({
      subject,
      averageScore: Math.round((data.total / data.count) * 10) / 10
    }));
    
    if (subjectAverages.length > 0) {
      generatedCharts.push({ id: "subjectAverages", data: subjectAverages });
    }
  }

  // 分数段分布
  if (scoreField) {
    const scoreRanges = {
      "0-59": 0,
      "60-69": 0,
      "70-79": 0,
      "80-89": 0,
      "90-100": 0
    };
    
    parsedData.forEach(record => {
      const score = parseFloat(String(record[scoreField]));
      if (!isNaN(score)) {
        if (score < 60) scoreRanges["0-59"]++;
        else if (score < 70) scoreRanges["60-69"]++;
        else if (score < 80) scoreRanges["70-79"]++;
        else if (score < 90) scoreRanges["80-89"]++;
        else scoreRanges["90-100"]++;
      }
    });
    
    const scoreDistribution = Object.entries(scoreRanges).map(([range, count]) => ({
      range, count
    }));
    
    if (scoreDistribution.some(item => item.count > 0)) {
      generatedCharts.push({ id: "scoreDistribution", data: scoreDistribution });
    }
  }

  // 趋势图
  if (scoreField && dateField && subjectField) {
    const dateScores: Record<string, Record<string, { total: number; count: number }>> = {};
    parsedData.forEach(record => {
      const date = record[dateField];
      const subject = record[subjectField];
      const score = parseFloat(String(record[scoreField]));
      
      if (!isNaN(score) && date) {
        if (!dateScores[date]) dateScores[date] = {};
        if (!dateScores[date][subject]) dateScores[date][subject] = { total: score, count: 1 };
        else {
          dateScores[date][subject].total += score;
          dateScores[date][subject].count += 1;
        }
      }
    });
    
    const subjects = Array.from(new Set(parsedData.map(r => r[subjectField])));
    const trendData = Object.entries(dateScores).map(([date, subjectData]) => {
      const result: any = { date };
      subjects.forEach(subject => {
        if (subjectData[subject]) {
          result[subject] = Math.round((subjectData[subject].total / subjectData[subject].count) * 10) / 10;
        } else {
          result[subject] = null;
        }
      });
      return result;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (trendData.length > 1) {
      generatedCharts.push({ id: "scoreTrend", data: trendData });
    }
  }

  // 考试类型
  if (scoreField && examTypeField) {
    const examTypeScores: Record<string, { total: number; count: number }> = {};
    parsedData.forEach(record => {
      const examType = record[examTypeField];
      const score = parseFloat(String(record[scoreField]));
      
      if (!isNaN(score) && examType) {
        if (!examTypeScores[examType]) {
          examTypeScores[examType] = { total: score, count: 1 };
        } else {
          examTypeScores[examType].total += score;
          examTypeScores[examType].count += 1;
        }
      }
    });
    
    const examTypeComparison = Object.entries(examTypeScores).map(([type, data]) => ({
      examType: type,
      averageScore: Math.round((data.total / data.count) * 10) / 10
    }));
    
    if (examTypeComparison.length > 1) {
      generatedCharts.push({ id: "examTypeComparison", data: examTypeComparison });
    }
  }

  return generatedCharts;
};

// Helper function to calculate statistics from grade data
export const calculateStatistics = (data: GradeRecord[]) => {
  const scores = data.map(item => {
    const score = typeof item.score === "number" ? item.score : parseFloat(String(item.score));
    return isNaN(score) ? 0 : score;
  }).filter(score => score > 0);

  const avg = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  const max = scores.length > 0 ? Math.max(...scores) : 0;
  const min = scores.length > 0 ? Math.min(...scores) : 0;
  const passing = scores.filter(score => score >= 60).length;
  const total = scores.length;

  return { avg, max, min, passing, total };
};

// Helper function to ensure safe data for charts
export const getChartData = (chart: ChartData | undefined) => {
  // Check if we have valid data
  if (!chart || !chart.data || !Array.isArray(chart.data) || chart.data.length === 0) {
    return [{ value: 0 }]; // Return safe default data
  }
  return chart.data;
};
