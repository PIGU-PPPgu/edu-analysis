/**
 * 各科分数-等级对照表组件
 * 显示每个科目在当前考试中的等级分数线
 *
 * 使用说明：
 * - 从grade_data表查询指定考试的成绩数据
 * - 计算每个科目按排名百分比的分数阈值
 * - 只显示有成绩数据的科目
 *
 * 等级标准（按排名百分位）：
 * A+: 前5% | A: 5-25% | B+: 25-50% | B: 50-75% | C+: 75-95% | C: 95-100%
 */

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GradeThresholdTableProps {
  examId: string;
  className?: string;
}

interface SubjectThresholds {
  subjectName: string;
  thresholds: {
    "A+": number | null;
    A: number | null;
    "B+": number | null;
    B: number | null;
    "C+": number | null;
    C: number | null;
  };
  studentCount: number;
}

// 科目字段映射（中文名 -> grade_data字段名）
const SUBJECT_FIELD_MAP: Record<string, string> = {
  总分: "total_score",
  语文: "chinese_score",
  数学: "math_score",
  英语: "english_score",
  物理: "physics_score",
  化学: "chemistry_score",
  生物: "biology_score",
  政治: "politics_score",
  历史: "history_score",
  地理: "geography_score",
};

// 等级百分位定义（从高到低排序）
const GRADE_PERCENTILES = [
  { grade: "A+", minPercentile: 0, maxPercentile: 5 },
  { grade: "A", minPercentile: 5, maxPercentile: 25 },
  { grade: "B+", minPercentile: 25, maxPercentile: 50 },
  { grade: "B", minPercentile: 50, maxPercentile: 75 },
  { grade: "C+", minPercentile: 75, maxPercentile: 95 },
  { grade: "C", minPercentile: 95, maxPercentile: 100 },
];

/**
 * 计算指定百分位的分数阈值
 * @param scores 排序后的分数数组（从高到低）
 * @param percentile 百分位（0-100）
 */
function calculatePercentileScore(
  scores: number[],
  percentile: number
): number | null {
  if (scores.length === 0) return null;

  const index = Math.floor((percentile / 100) * scores.length);
  return scores[Math.min(index, scores.length - 1)];
}

export const GradeThresholdTable: React.FC<GradeThresholdTableProps> = ({
  examId,
  className = "",
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<SubjectThresholds[]>([]);

  useEffect(() => {
    loadGradeThresholds();
  }, [examId]);

  const loadGradeThresholds = async () => {
    if (!examId) {
      setError("未提供考试ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 从grade_data表查询该考试的所有成绩
      const { data: gradeData, error: queryError } = await supabase
        .from("grade_data")
        .select("*")
        .eq("exam_id", examId);

      if (queryError) {
        throw new Error(`查询失败: ${queryError.message}`);
      }

      if (!gradeData || gradeData.length === 0) {
        setError("该考试暂无成绩数据");
        setLoading(false);
        return;
      }

      // 计算每个科目的等级分数线
      const subjectThresholdsArray: SubjectThresholds[] = [];

      for (const [subjectName, fieldName] of Object.entries(
        SUBJECT_FIELD_MAP
      )) {
        // 提取该科目的所有有效成绩（排除null、0、缺考）
        const scores = gradeData
          .map((row) => row[fieldName])
          .filter(
            (score) => score !== null && score !== undefined && score > 0
          ) as number[];

        if (scores.length === 0) {
          // 该科目没有有效数据，跳过
          continue;
        }

        // 从高到低排序
        scores.sort((a, b) => b - a);

        // 计算各等级的分数线
        const thresholds: SubjectThresholds["thresholds"] = {
          "A+": calculatePercentileScore(scores, 5), // 前5%的最低分
          A: calculatePercentileScore(scores, 25), // 前25%的最低分
          "B+": calculatePercentileScore(scores, 50),
          B: calculatePercentileScore(scores, 75),
          "C+": calculatePercentileScore(scores, 95),
          C: calculatePercentileScore(scores, 100), // 最低分
        };

        subjectThresholdsArray.push({
          subjectName,
          thresholds,
          studentCount: scores.length,
        });
      }

      if (subjectThresholdsArray.length === 0) {
        setError("未找到有效的科目成绩数据");
      } else {
        setThresholds(subjectThresholdsArray);
      }
    } catch (err) {
      console.error("加载等级分数线失败:", err);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          正在计算等级分数线...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (thresholds.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          📊 各科分数-等级对照表
          <span className="text-xs text-muted-foreground font-normal">
            （本次考试等级分数线）
          </span>
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          根据本次考试实际分数分布计算，显示达到各等级所需的最低分数
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border px-3 py-2 text-left font-semibold">
                等级
              </th>
              {thresholds.map((subject) => (
                <th
                  key={subject.subjectName}
                  className="border border-border px-3 py-2 text-center font-semibold"
                >
                  {subject.subjectName}
                  <div className="text-xs text-muted-foreground font-normal">
                    ({subject.studentCount}人)
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRADE_PERCENTILES.map(
              ({ grade, minPercentile, maxPercentile }) => {
                // 获取等级对应的颜色
                const gradeColors: Record<string, string> = {
                  "A+": "bg-green-50 text-green-700 font-bold",
                  A: "bg-blue-50 text-blue-700 font-semibold",
                  "B+": "bg-purple-50 text-purple-700",
                  B: "bg-orange-50 text-orange-700",
                  "C+": "bg-red-50 text-red-700",
                  C: "bg-gray-50 text-gray-700",
                };

                return (
                  <tr key={grade} className="hover:bg-muted/50">
                    <td
                      className={`border border-border px-3 py-2 ${gradeColors[grade]}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{grade}</span>
                        <span className="text-xs text-muted-foreground">
                          (前{maxPercentile}%)
                        </span>
                      </div>
                    </td>
                    {thresholds.map((subject) => {
                      const threshold =
                        subject.thresholds[
                          grade as keyof typeof subject.thresholds
                        ];
                      return (
                        <td
                          key={`${grade}-${subject.subjectName}`}
                          className="border border-border px-3 py-2 text-center"
                        >
                          {threshold !== null ? (
                            <span className="font-mono">
                              {threshold.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          💡 <strong>使用说明</strong>
          ：表中分数为达到该等级的最低分数（排名边界分数）
        </p>
        <p>
          📌 <strong>举例</strong>
          ：如果语文A+等级分数线为140分，表示本次考试排名前5%的学生语文分数≥140分
        </p>
      </div>
    </div>
  );
};
