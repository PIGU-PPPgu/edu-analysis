/**
 * 成绩分析 - 年级视角 & 班主任视角
 * 数据源：ph七上期末成绩
 */
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import {
  getProviderApiKey,
  getApiBaseURL,
  getGlobalAIConfig,
} from "@/utils/apiKeyManager";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Cell,
} from "recharts";

// ---- 类型 ----
interface StudentRow {
  student_id: string;
  name: string;
  class_name: string;
  total_score: number | null;
  total_rank_in_class: number | null;
  total_rank_in_grade: number | null;
  chinese_score: number | null;
  math_score: number | null;
  english_score: number | null;
  history_score: number | null;
  geography_score: number | null;
  politics_score: number | null;
  biology_score: number | null;
  chinese_grade: string | null;
  math_grade: string | null;
  english_grade: string | null;
  history_grade: string | null;
  geography_grade: string | null;
  politics_grade: string | null;
  biology_grade: string | null;
}

interface ClassStat {
  class_name: string;
  student_count: number;
  avg_total: number;
  avg_chinese: number;
  avg_math: number;
  avg_english: number;
  avg_history: number;
  avg_geo: number;
  avg_politics: number;
  avg_bio: number;
  at_risk_count: number;
  pass_rate: number; // 各科合格率均值 %（B及以上）
  excellent_rate: number; // 各科优秀率均值 %（A及以上）
  composite_score: number; // 综合分 = (avg_total/7)*0.4 + avg_subject_pass*0.3 + avg_subject_excellent*0.3
  grade: "A" | "B" | "C" | "D";
}

// 综合分阈值（七上期末，满分580）
const NUM_SUBJECTS = 7; // 语数英史地政生

// 等级判断
const PASS_GRADES = new Set(["B", "B+", "A", "A+"]); // 合格：B及以上
const EXCELLENT_GRADES = new Set(["A", "A+"]); // 优秀：A及以上

// 综合分 = (avg_total/NUM_SUBJECTS)*0.4 + avg_per_subject_pass_rate*0.3 + avg_per_subject_excellent_rate*0.3
function calcComposite(
  avgTotal: number,
  avgSubjectPassRate: number,
  avgSubjectExcellentRate: number
) {
  return (
    (avgTotal / NUM_SUBJECTS) * 0.4 +
    avgSubjectPassRate * 0.3 +
    avgSubjectExcellentRate * 0.3
  );
}

// 计算一个班级的各科等级合格率/优良率均值
const GRADE_KEYS = [
  "chinese_grade",
  "math_grade",
  "english_grade",
  "history_grade",
  "geography_grade",
  "politics_grade",
  "biology_grade",
] as const;

function calcSubjectRates(students: StudentRow[]): {
  avgPassRate: number;
  avgExcellentRate: number;
} {
  const passRates: number[] = [];
  const excellentRates: number[] = [];
  for (const key of GRADE_KEYS) {
    const grades = students
      .map((s) => s[key])
      .filter((g): g is string => g != null);
    if (grades.length === 0) continue;
    passRates.push(
      (grades.filter((g) => PASS_GRADES.has(g)).length / grades.length) * 100
    );
    excellentRates.push(
      (grades.filter((g) => EXCELLENT_GRADES.has(g)).length / grades.length) *
        100
    );
  }
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  return { avgPassRate: avg(passRates), avgExcellentRate: avg(excellentRates) };
}

function compositeGrade(score: number): "A" | "B" | "C" | "D" {
  if (score >= 55) return "A";
  if (score >= 45) return "B";
  if (score >= 35) return "C";
  return "D";
}

const GRADE_STYLE: Record<string, string> = {
  A: "bg-[#B9FF66] text-[#191A23] border-[#191A23]",
  B: "bg-blue-100 text-blue-900 border-blue-400",
  C: "bg-yellow-100 text-yellow-900 border-yellow-400",
  D: "bg-red-100 text-red-800 border-red-400",
};

// 科目配置
const SUBJECTS = [
  { key: "chinese", label: "语文", max: 120 },
  { key: "math", label: "数学", max: 120 },
  { key: "english", label: "英语", max: 120 },
  { key: "history", label: "历史", max: 70 },
  { key: "geography", label: "地理", max: 50 },
  { key: "politics", label: "政治", max: 50 },
  { key: "biology", label: "生物", max: 50 },
] as const;

const EXAM_TITLE = "ph七上期末成绩";

// ---- 工具函数 ----
function pct(score: number, max: number) {
  return Math.round((score / max) * 100);
}

function heatColor(p: number) {
  if (p >= 80) return "bg-emerald-500 text-white";
  if (p >= 65) return "bg-emerald-200 text-emerald-900";
  if (p >= 50) return "bg-yellow-200 text-yellow-900";
  return "bg-red-200 text-red-900";
}

// ---- 班主任视角 ----
const ClassTeacherView: React.FC<{
  classStats: ClassStat[];
  students: StudentRow[];
}> = ({ classStats, students }) => {
  const [selectedClass, setSelectedClass] = useState<string>(
    classStats[0]?.class_name ?? ""
  );

  const cls = classStats.find((c) => c.class_name === selectedClass);
  const classStudents = students
    .filter((s) => s.class_name === selectedClass)
    .sort(
      (a, b) => (a.total_rank_in_class ?? 999) - (b.total_rank_in_class ?? 999)
    );

  const radarData = cls
    ? SUBJECTS.map((s) => {
        const avgMap: Record<string, number> = {
          chinese: cls.avg_chinese,
          math: cls.avg_math,
          english: cls.avg_english,
          history: cls.avg_history,
          geography: cls.avg_geo,
          politics: cls.avg_politics,
          biology: cls.avg_bio,
        };
        return {
          subject: s.label,
          pct: pct(avgMap[s.key], s.max),
          fullMark: 100,
        };
      })
    : [];

  const atRisk = classStudents.filter(
    (s) => s.total_score != null && s.total_score < 200
  );

  return (
    <div className="space-y-6">
      {/* 班级选择器 */}
      <div className="flex flex-wrap gap-2">
        {[...classStats]
          .sort((a, b) => a.class_name.localeCompare(b.class_name))
          .map((c) => (
            <button
              key={c.class_name}
              onClick={() => setSelectedClass(c.class_name)}
              className={cn(
                "px-3 py-1.5 text-sm font-bold border-2 border-black transition-all",
                selectedClass === c.class_name
                  ? "bg-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23]"
                  : "bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_#D1D5DB]"
              )}
            >
              {c.class_name.replace("初一", "")}
            </button>
          ))}
      </div>

      {cls && (
        <>
          {/* 班级概览 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "班级人数", value: cls.student_count, unit: "人" },
              {
                label: "综合分",
                value: cls.composite_score.toFixed(1),
                unit: `(${cls.grade}级)`,
              },
              {
                label: "合格率",
                value: `${cls.pass_rate.toFixed(1)}`,
                unit: "%",
              },
              {
                label: "优良率",
                value: `${cls.excellent_rate.toFixed(1)}`,
                unit: "%",
              },
            ].map(({ label, value, unit }) => (
              <div
                key={label}
                className="border-2 border-black p-5 bg-white shadow-[4px_4px_0px_0px_#191A23]"
              >
                <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-3xl font-black mt-1 text-[#191A23]">
                  {value}
                  <span className="text-base font-bold ml-1">{unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* 科目雷达图 + 学困生 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#B9FF66]">
              <div className="bg-[#B9FF66] border-b-2 border-black px-6 py-4">
                <h2 className="font-black text-[#191A23] uppercase tracking-wide">
                  科目得分率
                </h2>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 12, fontWeight: 700 }}
                    />
                    <Radar
                      dataKey="pct"
                      stroke="#191A23"
                      fill="#B9FF66"
                      fillOpacity={0.6}
                    />
                    <Tooltip formatter={(v: number) => [`${v}%`, "得分率"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#191A23]">
              <div className="bg-[#191A23] border-b-2 border-black px-6 py-4">
                <h2 className="font-black text-white uppercase tracking-wide">
                  学困生预警
                  {atRisk.length > 0 && (
                    <span className="ml-2 text-red-400">{atRisk.length}人</span>
                  )}
                </h2>
              </div>
              <div className="p-4 space-y-2 max-h-[240px] overflow-y-auto">
                {atRisk.length === 0 ? (
                  <p className="text-center text-sm text-[#6B7280] py-8 font-bold">
                    暂无学困生 ✓
                  </p>
                ) : (
                  atRisk.map((s) => (
                    <div
                      key={s.student_id}
                      className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-200 rounded"
                    >
                      <span className="font-bold text-sm text-[#191A23]">
                        {s.name}
                      </span>
                      <span className="text-xs font-bold text-red-600">
                        {s.total_score}分 #{s.total_rank_in_class}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 学生成绩表 */}
          <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#191A23]">
            <div className="bg-[#191A23] border-b-2 border-black px-6 py-4">
              <h2 className="font-black text-white uppercase tracking-wide">
                全班成绩明细
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black bg-gray-50">
                    <th className="text-left px-4 py-3 font-black text-[#191A23] w-8">
                      #
                    </th>
                    <th className="text-left px-4 py-3 font-black text-[#191A23]">
                      姓名
                    </th>
                    <th className="px-3 py-3 font-black text-[#191A23] text-center">
                      总分
                    </th>
                    {SUBJECTS.map((s) => (
                      <th
                        key={s.key}
                        className="px-2 py-3 font-black text-[#191A23] text-center text-xs"
                      >
                        {s.label}
                      </th>
                    ))}
                    <th className="px-3 py-3 font-black text-[#191A23] text-center">
                      年级名次
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s, i) => {
                    const isAtRisk =
                      s.total_score != null && s.total_score < 200;
                    const subjectScores: Record<string, number | null> = {
                      chinese: s.chinese_score,
                      math: s.math_score,
                      english: s.english_score,
                      history: s.history_score,
                      geography: s.geography_score,
                      politics: s.politics_score,
                      biology: s.biology_score,
                    };
                    return (
                      <tr
                        key={s.student_id}
                        className={cn(
                          "border-b border-gray-100",
                          isAtRisk && "bg-red-50"
                        )}
                      >
                        <td className="px-4 py-2 text-xs text-[#6B7280] font-bold">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2 font-bold text-[#191A23]">
                          {s.name}
                          {isAtRisk && (
                            <span className="ml-1 text-red-500 text-xs">
                              ⚠
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-black text-[#191A23]">
                          {s.total_score ?? "—"}
                        </td>
                        {SUBJECTS.map((subj) => {
                          const score = subjectScores[subj.key];
                          const p = score != null ? pct(score, subj.max) : null;
                          return (
                            <td
                              key={subj.key}
                              className="px-2 py-2 text-center"
                            >
                              {p != null ? (
                                <span
                                  className={cn(
                                    "inline-block px-1.5 py-0.5 rounded text-xs font-bold",
                                    heatColor(p)
                                  )}
                                >
                                  {score}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center text-xs font-bold text-[#6B7280]">
                          {s.total_rank_in_grade ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ---- 年级视角 ----
const GradeView: React.FC<{ classStats: ClassStat[] }> = ({ classStats }) => {
  const gradeAvg = useMemo(() => {
    if (!classStats.length) return null;
    const n = classStats.length;
    return {
      avg_total: classStats.reduce((s, c) => s + c.avg_total, 0) / n,
      avg_chinese: classStats.reduce((s, c) => s + c.avg_chinese, 0) / n,
      avg_math: classStats.reduce((s, c) => s + c.avg_math, 0) / n,
      avg_english: classStats.reduce((s, c) => s + c.avg_english, 0) / n,
      avg_history: classStats.reduce((s, c) => s + c.avg_history, 0) / n,
      avg_geo: classStats.reduce((s, c) => s + c.avg_geo, 0) / n,
      avg_politics: classStats.reduce((s, c) => s + c.avg_politics, 0) / n,
      avg_bio: classStats.reduce((s, c) => s + c.avg_bio, 0) / n,
      pass_rate: classStats.reduce((s, c) => s + c.pass_rate, 0) / n,
      excellent_rate: classStats.reduce((s, c) => s + c.excellent_rate, 0) / n,
    };
  }, [classStats]);

  const totalAtRisk = classStats.reduce((s, c) => s + c.at_risk_count, 0);
  const totalStudents = classStats.reduce((s, c) => s + c.student_count, 0);
  const overallAvg = gradeAvg ? Math.round(gradeAvg.avg_total) : 0;
  const gradePassRate = gradeAvg ? gradeAvg.pass_rate.toFixed(1) : "—";
  const gradeExcellentRate = gradeAvg
    ? gradeAvg.excellent_rate.toFixed(1)
    : "—";

  const sortedByComposite = [...classStats].sort(
    (a, b) => b.composite_score - a.composite_score
  );

  return (
    <div className="space-y-8">
      {/* 年级概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "参考人数", value: totalStudents, unit: "人" },
          { label: "年级平均分", value: overallAvg, unit: "分" },
          { label: "年级合格率", value: `${gradePassRate}`, unit: "%" },
          { label: "学困生", value: totalAtRisk, unit: "人", warn: true },
        ].map(({ label, value, unit, warn }) => (
          <div
            key={label}
            className={cn(
              "border-2 border-black p-5 bg-white shadow-[4px_4px_0px_0px_#191A23]",
              warn && totalAtRisk > 0 && "shadow-[4px_4px_0px_0px_#EF4444]"
            )}
          >
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">
              {label}
            </p>
            <p
              className={cn(
                "text-3xl font-black mt-1",
                warn && totalAtRisk > 0 ? "text-red-600" : "text-[#191A23]"
              )}
            >
              {value}
              <span className="text-base font-bold ml-1">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 综合分排名柱状图 */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#B9FF66]">
        <div className="bg-[#B9FF66] border-b-2 border-black px-6 py-4">
          <h2 className="font-black text-[#191A23] uppercase tracking-wide">
            班级综合分排名
          </h2>
          <p className="text-xs text-[#191A23]/60 mt-1">
            综合分 = (平均分/7) × 40% + 各科合格率均值 × 30% + 各科优秀率均值 ×
            30%
          </p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={sortedByComposite}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="class_name"
                tick={{ fontSize: 11, fontWeight: 700 }}
                tickFormatter={(v) => v.replace("初一", "")}
              />
              <YAxis domain={[0, 70]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => [
                  `${(v as number).toFixed(1)}`,
                  "综合分",
                ]}
                labelFormatter={(l) => l}
              />
              <Bar dataKey="composite_score" radius={[2, 2, 0, 0]}>
                {sortedByComposite.map((entry, i) => (
                  <Cell
                    key={entry.class_name}
                    fill={
                      i === 0
                        ? "#B9FF66"
                        : i < 3
                          ? "#86EFAC"
                          : i >= classStats.length - 3
                            ? "#FCA5A5"
                            : "#D1D5DB"
                    }
                    stroke="#191A23"
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 综合排名表（含两率 + 等级 + 各科热力图） */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#191A23]">
        <div className="bg-[#191A23] border-b-2 border-black px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-white uppercase tracking-wide">
                班级综合排名详情
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                合格≥B · 优秀≥A · 各科格显示得分率
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-center px-3 py-3 font-black text-[#191A23] w-8">
                  #
                </th>
                <th className="text-left px-4 py-3 font-black text-[#191A23]">
                  班级
                </th>
                <th className="px-3 py-3 font-black text-[#191A23] text-center">
                  综合分
                </th>
                <th className="px-3 py-3 font-black text-[#191A23] text-center">
                  平均分
                </th>
                <th className="px-3 py-3 font-black text-[#191A23] text-center">
                  合格率
                </th>
                <th className="px-3 py-3 font-black text-[#191A23] text-center">
                  优良率
                </th>
                {SUBJECTS.map((s) => (
                  <th
                    key={s.key}
                    className="px-2 py-3 font-black text-[#191A23] text-center text-xs"
                  >
                    {s.label}
                  </th>
                ))}
                <th className="px-3 py-3 font-black text-[#191A23] text-center">
                  学困生
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedByComposite.map((cls, i) => {
                const scores: Record<string, number> = {
                  chinese: cls.avg_chinese,
                  math: cls.avg_math,
                  english: cls.avg_english,
                  history: cls.avg_history,
                  geography: cls.avg_geo,
                  politics: cls.avg_politics,
                  biology: cls.avg_bio,
                };
                return (
                  <tr key={cls.class_name} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-center font-black text-[#6B7280] text-xs">
                      {i + 1}
                    </td>
                    <td className="px-4 py-2 font-bold text-[#191A23]">
                      <span className="inline-flex items-center gap-1">
                        {i === 0 && (
                          <span className="text-yellow-500 text-xs">▲</span>
                        )}
                        {i === classStats.length - 1 && (
                          <span className="text-red-400 text-xs">▼</span>
                        )}
                        {cls.class_name.replace("初一", "")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-black text-[#191A23]">
                      {cls.composite_score.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-[#191A23]">
                      {Math.round(cls.avg_total)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-bold",
                          cls.pass_rate >= 80
                            ? "bg-emerald-100 text-emerald-800"
                            : cls.pass_rate >= 60
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        )}
                      >
                        {cls.pass_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-bold",
                          cls.excellent_rate >= 30
                            ? "bg-emerald-100 text-emerald-800"
                            : cls.excellent_rate >= 15
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {cls.excellent_rate.toFixed(1)}%
                      </span>
                    </td>
                    {SUBJECTS.map((s) => {
                      const p = pct(scores[s.key], s.max);
                      return (
                        <td key={s.key} className="px-2 py-2 text-center">
                          <span
                            className={cn(
                              "inline-block px-2 py-1 rounded text-xs font-bold min-w-[36px]",
                              heatColor(p)
                            )}
                          >
                            {p}%
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      {cls.at_risk_count > 0 ? (
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold border border-red-300">
                          {cls.at_risk_count}人
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-xs font-bold">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {gradeAvg && (
              <tfoot>
                <tr className="border-t-2 border-black bg-gray-50">
                  <td
                    colSpan={2}
                    className="px-4 py-2 font-black text-[#191A23] text-xs uppercase"
                  >
                    年级均值
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-[#6B7280]">
                    —
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-[#6B7280]">
                    {calcComposite(
                      gradeAvg.avg_total,
                      gradeAvg.pass_rate,
                      gradeAvg.excellent_rate
                    ).toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-[#6B7280]">
                    {Math.round(gradeAvg.avg_total)}
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-[#6B7280]">
                    {gradePassRate}%
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-bold text-[#6B7280]">
                    {gradeExcellentRate}%
                  </td>
                  {SUBJECTS.map((s) => {
                    const avgMap: Record<string, number> = {
                      chinese: gradeAvg.avg_chinese,
                      math: gradeAvg.avg_math,
                      english: gradeAvg.avg_english,
                      history: gradeAvg.avg_history,
                      geography: gradeAvg.avg_geo,
                      politics: gradeAvg.avg_politics,
                      biology: gradeAvg.avg_bio,
                    };
                    const p = pct(avgMap[s.key], s.max);
                    return (
                      <td key={s.key} className="px-2 py-2 text-center">
                        <span className="text-xs font-bold text-[#6B7280]">
                          {p}%
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center text-xs font-bold text-red-600">
                    {totalAtRisk}人
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

// ---- 报告生成 ----
const ReportGeneratorTab: React.FC<{ classStats: ClassStat[] }> = ({
  classStats,
}) => {
  const [generating, setGenerating] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");

  // 获取 AI Settings 里第一个配置了 key 的 provider
  const getAIConfig = (): {
    apiKey: string;
    baseURL: string;
    model: string;
  } | null => {
    // 按优先级尝试各 provider
    const candidates = [
      "doubao",
      "openai",
      "anthropic",
      "deepseek",
      "moonshot",
      "openrouter",
    ];
    const globalModel = getGlobalAIConfig().defaultModel;
    for (const pid of candidates) {
      const cfg = getProviderApiKey(pid);
      if (cfg?.apiKey) {
        const baseURL = cfg.baseURL || getApiBaseURL(pid);
        // 优先使用全局配置的 defaultModel，其次尝试从 baseURL 末尾提取（兼容旧版 endpoint 格式）
        const modelFromURL = cfg.baseURL?.split("/").pop();
        const isValidModelId = (s?: string) =>
          !!s && !["v1", "v2", "v3", "v4"].includes(s);
        const model =
          globalModel && globalModel !== "gpt-4o-mini"
            ? globalModel
            : isValidModelId(modelFromURL)
              ? modelFromURL!
              : pid === "doubao"
                ? "doubao-seed-1.8"
                : "gpt-4o";
        return {
          apiKey: cfg.apiKey,
          baseURL: baseURL.replace(/\/$/, ""),
          model,
        };
      }
    }
    return null;
  };

  const callAI = async (prompt: string): Promise<string> => {
    const cfg = getAIConfig();
    if (!cfg)
      throw new Error("未找到可用的 AI 配置，请先在 AI 设置页面配置 API Key");

    const resp = await fetch(`${cfg.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`AI 请求失败 (${resp.status}): ${err.slice(0, 200)}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI 返回内容为空");
    return content;
  };

  // 构建数据摘要供 AI 使用
  const buildDataSummary = () => {
    const sorted = [...classStats].sort(
      (a, b) => b.composite_score - a.composite_score
    );
    const n = classStats.length || 1;
    const gradeAvg = classStats.reduce((s, c) => s + c.avg_total, 0) / n;
    const gradePass = classStats.reduce((s, c) => s + c.pass_rate, 0) / n;
    const gradeExc = classStats.reduce((s, c) => s + c.excellent_rate, 0) / n;
    const totalStudents = classStats.reduce((s, c) => s + c.student_count, 0);
    const totalAtRisk = classStats.reduce((s, c) => s + c.at_risk_count, 0);
    const subjectAvgs = SUBJECTS.map((s) => {
      const k =
        `avg_${s.key === "geography" ? "geo" : s.key}` as keyof ClassStat;
      const avg = classStats.reduce((sum, c) => sum + (c[k] as number), 0) / n;
      return { label: s.label, pct: (avg / s.max) * 100 };
    }).sort((a, b) => a.pct - b.pct);

    const classRows = sorted
      .map(
        (c, i) =>
          `  ${i + 1}. ${c.class_name}：综合分${c.composite_score.toFixed(1)}，平均分${Math.round(c.avg_total)}，合格率${c.pass_rate.toFixed(1)}%，优良率${c.excellent_rate.toFixed(1)}%，学困生${c.at_risk_count}人`
      )
      .join("\n");

    return {
      sorted,
      top3: sorted.slice(0, 3),
      bottom3: sorted.slice(-3).reverse(),
      gradeAvg,
      gradePass,
      gradeExc,
      totalStudents,
      totalAtRisk,
      subjectAvgs,
      weak2: subjectAvgs.slice(0, 2),
      strong2: subjectAvgs.slice(-2).reverse(),
      classRows,
      gap: (
        (sorted[0]?.composite_score ?? 0) -
        (sorted[sorted.length - 1]?.composite_score ?? 0)
      ).toFixed(1),
    };
  };

  const download = async (doc: Document, filename: string) => {
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 清除 markdown 符号
  const stripMarkdown = (line: string): string => {
    return line
      .replace(/^#{1,6}\s+/, "") // ## 标题
      .replace(/\*\*(.+?)\*\*/g, "$1") // **粗体**
      .replace(/\*(.+?)\*/g, "$1") // *斜体*
      .replace(/^[-*+]\s+/, "") // 列表符号
      .replace(/^>\s+/, "") // 引用
      .replace(/`(.+?)`/g, "$1") // 行内代码
      .trim();
  };

  // 将 AI 返回的文本按行转换为 docx 段落
  // 字体规范：主标题-方正小标宋简体小二；小标题-黑体三号；正文-仿宋_GB2312三号
  const textToParas = (text: string): Paragraph[] => {
    // 先把行内数字序号（如"1. xxx 2. xxx"）拆成多行
    const expandedLines: string[] = [];
    for (const raw of text.split("\n")) {
      const line = raw.trimEnd();
      if (!line) {
        expandedLines.push(line);
        continue;
      }
      // 检测行内是否含有 " 2. " " 3. " 等中间序号（排除行首序号，那是正常换行）
      // 匹配模式：非行首位置出现 数字+点+空格
      const parts = line.split(/(?<=\S)\s+(?=\d+[.．]\s)/);
      if (parts.length > 1) {
        parts.forEach((p) => expandedLines.push(p.trim()));
      } else {
        expandedLines.push(line);
      }
    }

    return expandedLines
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0)
      .map((line) => {
        const clean = stripMarkdown(line);
        if (!clean) return null;

        // 一级标题：一、二、三…
        const isH1 = /^[一二三四五六七八九十]+[、．.]/.test(clean);
        // 二级标题：（一）（二）…
        const isH2 = /^（[一二三四五六七八九十]+）/.test(clean);

        if (isH1) {
          return new Paragraph({
            children: [
              new TextRun({
                text: clean,
                bold: true,
                font: { name: "黑体" },
                size: 32, // 三号 = 16pt = 32 half-points
              }),
            ],
            spacing: {
              before: 240,
              after: 120,
              line: 360,
              lineRule: "auto" as any,
            },
          });
        }
        if (isH2) {
          return new Paragraph({
            children: [
              new TextRun({
                text: clean,
                bold: true,
                font: { name: "黑体" },
                size: 32,
              }),
            ],
            spacing: {
              before: 160,
              after: 80,
              line: 360,
              lineRule: "auto" as any,
            },
          });
        }
        // 正文：仿宋_GB2312，三号，首行缩进2字符，1.5倍行距
        return new Paragraph({
          children: [
            new TextRun({
              text: clean,
              font: { name: "仿宋_GB2312" },
              size: 32,
            }),
          ],
          indent: { firstLine: 640 }, // 2字符 × 三号(16pt) × 20 = 640 twips
          spacing: { line: 360, lineRule: "auto" as any, before: 0, after: 0 },
        });
      })
      .filter((p): p is Paragraph => p !== null);
  };

  const generateDoc1 = async () => {
    setGenerating("doc1");
    setStatusMsg("正在调用 AI 生成内容，请稍候…");
    try {
      const d = buildDataSummary();

      const prompt = `你是一位经验丰富的教务主任，请根据以下真实考试数据，撰写一份《教学质量精准提升方案》正文内容。

【考试数据】
考试名称：ph七上期末成绩（满分580分，合格线300分，优良线400分）
参考人数：${d.totalStudents}人，共${classStats.length}个班级
年级平均分：${d.gradeAvg.toFixed(1)}分
年级合格率：${d.gradePass.toFixed(1)}%
年级优良率：${d.gradeExc.toFixed(1)}%
学困生总数：${d.totalAtRisk}人（总分低于200分）

班级综合分排名（综合分=平均分/7×40%+各科合格率均值×30%+各科优良率均值×30%）：
${d.classRows}

各科目年级平均得分率（从低到高）：
${d.subjectAvgs.map((s) => `  ${s.label}：${s.pct.toFixed(1)}%`).join("\n")}

【写作要求】
请严格按照以下结构撰写，每个章节内容要充分展开，结合上述真实数据深入分析，语言专业、具体、有针对性，避免空话套话。每个子章节不少于150字，措施要具体可操作：

一、学情分析
（一）成绩现状
深入分析年级整体成绩分布，结合各班综合分排名，指出头部班级与尾部班级的差距，分析各科得分率高低，点名薄弱学科及其具体数据。
（二）核心问题
从学生学习习惯、课堂效率、教学方法、学困生比例等多个维度，结合数据归纳出3-5个核心问题，每个问题要有数据支撑。

二、本学期目标
列出4-5条量化目标，基于当前数据设定合理提升幅度，包括：年级平均分目标、合格率目标、优良率目标、学困生转化目标、薄弱学科提升目标。

三、教学改进措施
（一）质量分析会改进
说明如何优化质量分析会的频次、形式、内容，如何让数据真正驱动教学决策，包括会前准备、会中研讨、会后跟踪的具体做法。
（二）课堂质量提升
针对薄弱学科提出具体的课堂改进策略，包括教学方法创新、分层教学设计、课堂互动优化、作业设计改进等。
（三）教学常规强化
从备课、上课、作业批改、辅导、考试等环节提出具体规范要求，说明如何通过常规管理提升整体教学质量。
（四）培优补弱
针对学困生（总分低于200分的${d.totalAtRisk}人）制定具体帮扶方案；针对优秀生制定拔尖培养计划，包括具体措施和时间节点。

四、落款
（右对齐：七年级组，${new Date().toLocaleDateString("zh-CN")}）

【格式要求】
1. 直接输出正文内容，不要输出文档标题
2. 严禁使用任何Markdown格式符号（#、*、**、-、>、\`等）
3. 标题格式：一级标题用"一、二、三"，二级标题用"（一）（二）"
4. 不要有多余说明或前言`;

      const aiContent = await callAI(prompt);
      setStatusMsg("AI 内容生成完成，正在生成 Word 文档…");

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "教学质量精准提升方案",
                    bold: true,
                    font: { name: "方正小标宋简体" },
                    size: 36, // 小二 = 18pt = 36 half-points
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "（七年级上学期期末考试）", size: 28 }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 360 },
              }),
              ...textToParas(aiContent),
            ],
          },
        ],
      });
      await download(doc, "教学质量精准提升方案.docx");
      setStatusMsg("");
    } catch (e: unknown) {
      setStatusMsg(`生成失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenerating(null);
    }
  };

  const generateDoc2 = async () => {
    setGenerating("doc2");
    setStatusMsg("正在调用 AI 生成内容，请稍候…");
    try {
      const d = buildDataSummary();

      const prompt = `你是一位经验丰富的教务主任，请根据以下真实考试数据，撰写一份《质量分析会指导意见》正文内容。

【考试数据】
考试名称：ph七上期末成绩（满分580分，合格线300分，优良线400分）
参考人数：${d.totalStudents}人，共${classStats.length}个班级
年级平均分：${d.gradeAvg.toFixed(1)}分
年级合格率：${d.gradePass.toFixed(1)}%
年级优良率：${d.gradeExc.toFixed(1)}%
学困生总数：${d.totalAtRisk}人

班级综合分排名：
${d.classRows}

薄弱学科（得分率最低）：${d.weak2.map((s) => `${s.label}（${s.pct.toFixed(1)}%）`).join("、")}
优势学科（得分率最高）：${d.strong2.map((s) => `${s.label}（${s.pct.toFixed(1)}%）`).join("、")}
最高与最低综合分班级差距：${d.gap}分

【写作要求】
请严格按照以下结构撰写，每个章节内容要充分展开，结合上述真实数据深入分析，语言专业、具体、有针对性，每个子章节不少于150字，指导要具体可操作：

一、会前准备
（一）数据分层
结合本次考试数据，说明如何按成绩层次（优秀/良好/合格/待提升）对学生进行分组，各层次的具体划分标准，以及针对不同层次学生的分析重点。
（二）对比参照
说明如何与上次考试数据进行横向对比，重点关注哪些指标的变化（平均分、合格率、优良率、各科得分率），如何识别进步班级和退步班级。
（三）活材料准备
指导教师如何收集典型错题、优秀作业、学生学习案例等活材料，如何整理成有说服力的分析素材。

二、会中研讨
（一）归因归策
针对本次数据中的主要问题（薄弱学科${d.weak2.map((s) => s.label).join("、")}得分率偏低，班级间差距${d.gap}分等），从教师教学、学生学习、课程设计等多维度进行深入归因，并提出对应策略。
（二）靶向研讨
结合具体数据提出3-4个重点研讨议题，每个议题要有数据支撑，引导教师聚焦核心问题展开讨论。
（三）案例说话
说明如何组织综合分排名靠前的班级分享成功经验，如何提炼可复制的教学方法，促进班级间的经验交流。

三、会后落地
（一）整改清单
明确会议形成的整改事项清单，包括具体整改内容、责任人、完成时间节点，以及可量化的验收标准。
（二）验收反馈
建立跟踪机制，说明如何定期检查整改落实情况，如何通过数据变化验证改进效果，形成闭环管理。

四、复盘迭代（PDCA循环）
结合本次考试数据，详细说明Plan（计划）、Do（执行）、Check（检查）、Act（改进）四个环节的具体内容，如何通过PDCA循环持续提升教学质量。

附录：质量分析工具包
（列出10项实用工具，每项一行，包括工具名称和简要说明）

落款（右对齐：教务处，${new Date().toLocaleDateString("zh-CN")}）

【格式要求】
1. 直接输出正文内容，不要输出文档标题
2. 严禁使用任何Markdown格式符号（#、*、**、-、>、\`等）
3. 标题格式：一级标题用"一、二、三"，二级标题用"（一）（二）"
4. 不要有多余说明或前言`;

      const aiContent2 = await callAI(prompt);
      setStatusMsg("AI 内容生成完成，正在生成 Word 文档…");

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "质量分析会指导意见",
                    bold: true,
                    font: { name: "方正小标宋简体" },
                    size: 36,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "——七年级上学期期末考试质量分析",
                    size: 28,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 360 },
              }),
              ...textToParas(aiContent2),
            ],
          },
        ],
      });
      await download(doc, "质量分析会指导意见.docx");
      setStatusMsg("");
    } catch (e: unknown) {
      setStatusMsg(`生成失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#B9FF66] p-6">
        <h2 className="font-black text-[#191A23] uppercase tracking-wide mb-1">
          报告生成
        </h2>
        <p className="text-sm text-[#6B7280]">
          基于当前成绩数据，调用 AI 生成专业分析内容，导出 Word 文档
        </p>
        {statusMsg && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-bold text-[#191A23]">{statusMsg}</p>
            {generating && (
              <p className="text-xs text-amber-600 font-medium">
                ⚠️ 生成期间请勿离开此页面，否则可能导致生成失败
              </p>
            )}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#B9FF66] rounded-full"
                style={{
                  width: "40%",
                  animation: "slide 1.4s ease-in-out infinite",
                }}
              />
            </div>
            <style>{`
              @keyframes slide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(350%); }
              }
            `}</style>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#B9FF66] p-6 space-y-4">
          <div>
            <h3 className="font-black text-[#191A23] text-lg">
              教学质量精准提升方案
            </h3>
            <p className="text-xs text-[#6B7280] mt-1">
              AI 根据真实数据生成：学情分析、目标设定、改进措施、保障机制
            </p>
          </div>
          <ul className="text-sm text-[#191A23] space-y-1">
            <li>• 年级整体成绩现状分析</li>
            <li>• 班级综合分排名（前三/后三）</li>
            <li>• 薄弱学科识别与攻坚策略</li>
            <li>• 培优补弱、课堂质量提升措施</li>
            <li>• 四项保障机制</li>
          </ul>
          <button
            onClick={generateDoc1}
            disabled={generating !== null}
            className="w-full py-3 bg-[#B9FF66] border-2 border-black font-black text-[#191A23] shadow-[4px_4px_0px_0px_#191A23] hover:shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating === "doc1" ? "AI 生成中…" : "AI 生成并下载"}
          </button>
        </div>
        <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#191A23] p-6 space-y-4">
          <div>
            <h3 className="font-black text-[#191A23] text-lg">
              质量分析会指导意见
            </h3>
            <p className="text-xs text-[#6B7280] mt-1">
              AI 根据真实数据生成：会前准备、会中研讨、会后落地、PDCA循环
            </p>
          </div>
          <ul className="text-sm text-[#191A23] space-y-1">
            <li>• 数据准备与归因分析指引</li>
            <li>• 靶向研讨议题（含真实数据）</li>
            <li>• 整改清单与跟踪验收机制</li>
            <li>• PDCA 复盘迭代框架</li>
            <li>• 10 项质量分析工具包</li>
          </ul>
          <button
            onClick={generateDoc2}
            disabled={generating !== null}
            className="w-full py-3 bg-[#191A23] border-2 border-black font-black text-white shadow-[4px_4px_0px_0px_#B9FF66] hover:shadow-[2px_2px_0px_0px_#B9FF66] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating === "doc2" ? "AI 生成中…" : "AI 生成并下载"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- 主页面 ----
const GradeReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // 优先读 URL 参数，兜底用硬编码（向后兼容）
  const examTitle = searchParams.get("exam") ?? EXAM_TITLE;

  const [perspective, setPerspective] = useState<"grade" | "class" | "report">(
    "grade"
  );
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // 检查 sessionStorage 缓存（key 含 examTitle，TTL 5分钟）
      const cacheKey = `grade_report_cache_${examTitle}`;
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const { rows, ts } = JSON.parse(raw);
          if (Date.now() - ts < 5 * 60 * 1000) {
            applyRows(rows);
            return;
          }
        }
      } catch {
        // 缓存损坏，忽略
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("grade_data")
          .select(
            "student_id,name,class_name,total_score,total_rank_in_class,total_rank_in_grade," +
              "chinese_score,math_score,english_score,history_score,geography_score,politics_score,biology_score," +
              "chinese_grade,math_grade,english_grade,history_grade,geography_grade,politics_grade,biology_grade"
          )
          .eq("exam_title", examTitle);

        if (err) throw err;
        const rows = (data ?? []) as unknown as StudentRow[];

        // 写缓存
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ rows, ts: Date.now() })
          );
        } catch {
          /* 忽略 */
        }

        applyRows(rows);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "加载失败");
        setLoading(false);
      }
    }

    function applyRows(rows: StudentRow[]) {
      setStudents(rows);

      // 按班级聚合
      const map = new Map<string, StudentRow[]>();
      rows.forEach((r) => {
        if (!map.has(r.class_name)) map.set(r.class_name, []);
        map.get(r.class_name)!.push(r);
      });

      const avg = (arr: (number | null)[]) => {
        const valid = arr.filter((v): v is number => v != null);
        return valid.length
          ? valid.reduce((a, b) => a + b, 0) / valid.length
          : 0;
      };

      const stats: ClassStat[] = Array.from(map.entries()).map(
        ([class_name, ss]) => {
          const avgTotalVal = avg(ss.map((s) => s.total_score));
          const { avgPassRate, avgExcellentRate } = calcSubjectRates(ss);
          const composite = calcComposite(
            avgTotalVal,
            avgPassRate,
            avgExcellentRate
          );
          return {
            class_name,
            student_count: ss.length,
            avg_total: avgTotalVal,
            avg_chinese: avg(ss.map((s) => s.chinese_score)),
            avg_math: avg(ss.map((s) => s.math_score)),
            avg_english: avg(ss.map((s) => s.english_score)),
            avg_history: avg(ss.map((s) => s.history_score)),
            avg_geo: avg(ss.map((s) => s.geography_score)),
            avg_politics: avg(ss.map((s) => s.politics_score)),
            avg_bio: avg(ss.map((s) => s.biology_score)),
            at_risk_count: ss.filter(
              (s) => s.total_score != null && s.total_score < 200
            ).length,
            pass_rate: avgPassRate,
            excellent_rate: avgExcellentRate,
            composite_score: composite,
            grade: compositeGrade(composite),
          };
        }
      );

      setClassStats(
        stats.sort((a, b) => a.class_name.localeCompare(b.class_name))
      );
      setLoading(false);
    }

    load();
  }, [examTitle]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页头 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-9 h-9 border-2 border-black bg-white shadow-[3px_3px_0px_0px_#191A23] hover:shadow-[1px_1px_0px_0px_#191A23] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              title="返回"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 3L5 8L10 13"
                  stroke="#191A23"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
                成绩分析
              </h1>
              <p className="text-sm text-[#6B7280] font-medium mt-1">
                {examTitle}
              </p>
            </div>
          </div>
          {/* 视角切换 */}
          <div className="flex border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_#191A23]">
            {(
              [
                { key: "grade", label: "年级视角" },
                { key: "class", label: "班主任视角" },
                { key: "report", label: "报告生成" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPerspective(key)}
                className={cn(
                  "px-5 py-2.5 text-sm font-black uppercase tracking-wide transition-colors",
                  perspective === key
                    ? "bg-[#191A23] text-white"
                    : "bg-white text-[#191A23] hover:bg-gray-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区 */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-[#6B7280] font-bold animate-pulse">
              加载中…
            </div>
          </div>
        )}
        {error && (
          <div className="border-2 border-red-400 bg-red-50 p-6 text-red-700 font-bold">
            {error}
          </div>
        )}
        {!loading && !error && classStats.length > 0 && (
          <>
            {perspective === "grade" && <GradeView classStats={classStats} />}
            {perspective === "class" && (
              <ClassTeacherView classStats={classStats} students={students} />
            )}
            {perspective === "report" && (
              <ReportGeneratorTab classStats={classStats} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GradeReportPage;
