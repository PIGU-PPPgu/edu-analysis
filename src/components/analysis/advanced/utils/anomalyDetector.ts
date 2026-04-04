import { GradeRecord, AnomalyData } from "../types/anomaly";

const preprocessAnomalyData = (gradeData: GradeRecord[] | undefined) => {
  if (!gradeData || !Array.isArray(gradeData)) {
    return [];
  }

  return gradeData
    .filter(
      (record) => record.subject && record.score && !isNaN(Number(record.score))
    )
    .map((record) => ({
      ...record,
      score: Number(record.score),
      examDate: new Date(record.exam_date || Date.now()),
      normalizedScore: Number(record.score),
    }))
    .sort((a, b) => a.examDate.getTime() - b.examDate.getTime());
};

const groupDataForAnomalyDetection = (processedData: any[]) => {
  const groups: Record<string, any[]> = {};

  processedData.forEach((record) => {
    if (!groups[record.subject]) {
      groups[record.subject] = [];
    }
    groups[record.subject].push(record);
  });

  return groups;
};

const calculateEnhancedStatistics = (scores: number[]) => {
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = scores.reduce((sum, score) => sum + score, 0) / n;
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];

  const mad =
    scores.reduce((sum, score) => sum + Math.abs(score - median), 0) / n;

  return { mean, median, q1, q3, mad };
};

const calculateModifiedZScore = (
  value: number,
  median: number,
  mad: number
) => {
  if (mad === 0) return 0;
  return (0.6745 * (value - median)) / mad;
};

const detectIQRAnomaly = (value: number, q1: number, q3: number) => {
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return {
    isAnomaly: value < lowerBound || value > upperBound,
    bound: value < lowerBound ? "lower" : "upper",
  };
};

const groupRecordsByStudent = (records: any[]): Record<string, any[]> => {
  return records.reduce(
    (acc, record) => {
      if (!acc[record.student_id]) {
        acc[record.student_id] = [];
      }
      acc[record.student_id].push(record);
      return acc;
    },
    {} as Record<string, any[]>
  );
};

const groupRecordsByExamType = (records: any[]): Record<string, any[]> => {
  return records.reduce(
    (acc, record) => {
      const examType = record.exam_type || "regular";
      if (!acc[examType]) {
        acc[examType] = [];
      }
      acc[examType].push(record);
      return acc;
    },
    {} as Record<string, any[]>
  );
};

const calculateTrendSlope = (scores: number[]) => {
  if (scores.length < 2) return 0;

  const n = scores.length;
  const x = Array.from({ length: n }, (_, i) => i);

  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = scores.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * scores[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
};

const calculateRecentChange = (scores: number[]) => {
  if (scores.length < 2) return 0;
  return scores[scores.length - 1] - scores[scores.length - 2];
};

const findConsecutiveLowScores = (
  scores: number[],
  threshold: number,
  count: number
) => {
  const consecutive = [];
  let current = 0;

  for (let i = 0; i < scores.length; i++) {
    if (scores[i] < threshold) {
      current++;
      if (current >= count) {
        consecutive.push({ start: i - count + 1, end: i });
      }
    } else {
      current = 0;
    }
  }

  return consecutive;
};

const detectStatisticalAnomalies = (
  subject: string,
  records: any[]
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];
  const scores = records.map((r) => r.score);

  const stats = calculateEnhancedStatistics(scores);

  records.forEach((record) => {
    const modifiedZScore = calculateModifiedZScore(
      record.score,
      stats.median,
      stats.mad
    );

    const iqrAnomaly = detectIQRAnomaly(record.score, stats.q1, stats.q3);

    if (Math.abs(modifiedZScore) > 3.5 || iqrAnomaly.isAnomaly) {
      const severity =
        Math.abs(modifiedZScore) > 4.5
          ? "high"
          : Math.abs(modifiedZScore) > 3.5
            ? "medium"
            : "low";

      anomalies.push({
        student_id: record.student_id,
        name: record.name,
        class_name: record.class_name,
        subject,
        score: record.score,
        expected_score: stats.mean,
        deviation: record.score - stats.mean,
        z_score: modifiedZScore,
        anomaly_type:
          record.score > stats.mean ? "outlier_high" : "outlier_low",
        severity,
        description: `${subject}成绩统计异常 (修正Z-Score: ${modifiedZScore.toFixed(2)})`,
      });
    }
  });

  return anomalies;
};

const detectTrendAnomalies = (
  subject: string,
  records: any[]
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];

  const studentGroups = groupRecordsByStudent(records);

  Object.entries(studentGroups).forEach(([studentId, studentRecords]) => {
    if (studentRecords.length < 3) return;

    const sortedRecords = studentRecords.sort(
      (a, b) => a.examDate.getTime() - b.examDate.getTime()
    );
    const scores = sortedRecords.map((r) => r.score);

    const trend = calculateTrendSlope(scores);
    const recentChange = calculateRecentChange(scores);

    if (Math.abs(recentChange) > 20) {
      const latestRecord = sortedRecords[sortedRecords.length - 1];

      anomalies.push({
        student_id: latestRecord.student_id,
        name: latestRecord.name,
        class_name: latestRecord.class_name,
        subject,
        score: latestRecord.score,
        expected_score: scores[scores.length - 2],
        deviation: recentChange,
        z_score: recentChange / 10,
        anomaly_type: recentChange > 0 ? "sudden_rise" : "sudden_drop",
        severity: Math.abs(recentChange) > 30 ? "high" : "medium",
        description: `${subject}成绩出现${recentChange > 0 ? "急剧上升" : "急剧下降"}趋势 (变化: ${recentChange.toFixed(1)}分)`,
      });
    }
  });

  return anomalies;
};

const detectPersonalAnomalies = (
  subject: string,
  records: any[]
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];
  const studentGroups = groupRecordsByStudent(records);

  Object.entries(studentGroups).forEach(([studentId, studentRecords]) => {
    if (studentRecords.length < 4) return;

    const scores = studentRecords.map((r) => r.score);
    const personalStats = calculateEnhancedStatistics(scores);

    studentRecords.forEach((record) => {
      const personalZScore = calculateModifiedZScore(
        record.score,
        personalStats.median,
        personalStats.mad
      );

      if (Math.abs(personalZScore) > 2.5) {
        anomalies.push({
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          subject,
          score: record.score,
          expected_score: personalStats.mean,
          deviation: record.score - personalStats.mean,
          z_score: personalZScore,
          anomaly_type:
            record.score > personalStats.mean ? "sudden_rise" : "sudden_drop",
          severity: Math.abs(personalZScore) > 3.0 ? "high" : "medium",
          description: `${subject}成绩与个人历史表现差异较大 (个人Z-Score: ${personalZScore.toFixed(2)})`,
        });
      }
    });
  });

  return anomalies;
};

const detectContextualAnomalies = (
  subject: string,
  records: any[]
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];
  const examTypeGroups = groupRecordsByExamType(records);

  Object.entries(examTypeGroups).forEach(([examType, typeRecords]) => {
    if (typeRecords.length < 3) return;

    const scores = typeRecords.map((r) => r.score);
    const typeStats = calculateEnhancedStatistics(scores);

    typeRecords.forEach((record) => {
      const contextualZScore = calculateModifiedZScore(
        record.score,
        typeStats.median,
        typeStats.mad
      );

      if (Math.abs(contextualZScore) > 3.0) {
        anomalies.push({
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          subject,
          score: record.score,
          expected_score: typeStats.mean,
          deviation: record.score - typeStats.mean,
          z_score: contextualZScore,
          anomaly_type:
            record.score > typeStats.mean ? "outlier_high" : "outlier_low",
          severity: Math.abs(contextualZScore) > 4.0 ? "high" : "medium",
          description: `${subject}在${examType}类型考试中表现异常 (上下文Z-Score: ${contextualZScore.toFixed(2)})`,
        });
      }
    });
  });

  return anomalies;
};

const detectPatternAnomalies = (
  subject: string,
  records: any[]
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];
  const studentGroups = groupRecordsByStudent(records);

  Object.entries(studentGroups).forEach(([studentId, studentRecords]) => {
    if (studentRecords.length < 3) return;

    const sortedRecords = studentRecords.sort(
      (a, b) => a.examDate.getTime() - b.examDate.getTime()
    );
    const scores = sortedRecords.map((r) => r.score);

    const consecutiveLowScores = findConsecutiveLowScores(scores, 60, 3);
    if (consecutiveLowScores.length > 0) {
      const latestRecord = sortedRecords[sortedRecords.length - 1];

      anomalies.push({
        student_id: latestRecord.student_id,
        name: latestRecord.name,
        class_name: latestRecord.class_name,
        subject,
        score: latestRecord.score,
        expected_score: 60,
        deviation: latestRecord.score - 60,
        z_score: -2.0,
        anomaly_type: "missing_pattern",
        severity: "high",
        description: `${subject}出现连续低分模式，需要重点关注`,
      });
    }
  });

  return anomalies;
};

const deduplicateAndScore = (anomalies: AnomalyData[]) => {
  const deduped = new Map<string, AnomalyData>();

  anomalies.forEach((anomaly) => {
    const key = `${anomaly.student_id}-${anomaly.subject}`;
    const existing = deduped.get(key);

    if (
      !existing ||
      getAnomalyPriority(anomaly) > getAnomalyPriority(existing)
    ) {
      deduped.set(key, anomaly);
    }
  });

  return Array.from(deduped.values());
};

const getAnomalyPriority = (anomaly: AnomalyData) => {
  const severityWeight = { high: 3, medium: 2, low: 1 };
  const typeWeight = {
    outlier_high: 1.2,
    outlier_low: 1.5,
    sudden_drop: 1.4,
    sudden_rise: 1.1,
    missing_pattern: 1.6,
  };

  return (
    Math.abs(anomaly.z_score) *
    severityWeight[anomaly.severity] *
    typeWeight[anomaly.anomaly_type]
  );
};

export const detectAnomalies = (
  gradeData: GradeRecord[] | undefined
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];

  const processedData = preprocessAnomalyData(gradeData);
  const subjectGroups = groupDataForAnomalyDetection(processedData);

  Object.entries(subjectGroups).forEach(([subject, records]) => {
    if (records.length < 5) return;

    const statisticalAnomalies = detectStatisticalAnomalies(subject, records);
    const trendAnomalies = detectTrendAnomalies(subject, records);
    const personalAnomalies = detectPersonalAnomalies(subject, records);
    const contextualAnomalies = detectContextualAnomalies(subject, records);
    const patternAnomalies = detectPatternAnomalies(subject, records);

    const allAnomalies = [
      ...statisticalAnomalies,
      ...trendAnomalies,
      ...personalAnomalies,
      ...contextualAnomalies,
      ...patternAnomalies,
    ];

    const deduplicatedAnomalies = deduplicateAndScore(allAnomalies);
    anomalies.push(...deduplicatedAnomalies);
  });

  return anomalies.sort(
    (a, b) => getAnomalyPriority(b) - getAnomalyPriority(a)
  );
};
