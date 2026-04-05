/**
 * 成绩分析 - 年级视角 & 班主任视角
 * 数据源：ph七上期末成绩
 */
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
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
  pass_rate: number; // 合格率 %（总分≥300）
  excellent_rate: number; // 优良率 %（总分≥400）
  composite_score: number; // 综合分 = 平均分/580×100×40% + 合格率×30% + 优良率×30%
  grade: "A" | "B" | "C" | "D";
}

// 综合分阈值（七上期末，满分580）
const TOTAL_MAX = 580;
const PASS_LINE = 300; // 合格线
const EXCELLENT_LINE = 400; // 优良线

function calcComposite(avg: number, passRate: number, excellentRate: number) {
  return (avg / TOTAL_MAX) * 100 * 0.4 + passRate * 0.3 + excellentRate * 0.3;
}

function compositeGrade(score: number): "A" | "B" | "C" | "D" {
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 45) return "C";
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
            综合分 = 平均分/580×100 × 40% + 合格率 × 30% + 优良率 × 30%
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
              <YAxis domain={[0, 80]} tick={{ fontSize: 11 }} />
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
                合格≥300分 · 优良≥400分 · 各科格显示得分率
              </p>
            </div>
            {/* 等级图例 */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400 font-bold">
                综合分等级：
              </span>
              {[
                {
                  g: "A",
                  range: "≥75",
                  style: "bg-[#B9FF66] text-[#191A23] border-[#191A23]",
                },
                {
                  g: "B",
                  range: "60–74",
                  style: "bg-blue-100 text-blue-900 border-blue-400",
                },
                {
                  g: "C",
                  range: "45–59",
                  style: "bg-yellow-100 text-yellow-900 border-yellow-400",
                },
                {
                  g: "D",
                  range: "<45",
                  style: "bg-red-100 text-red-800 border-red-400",
                },
              ].map(({ g, range, style }) => (
                <span key={g} className="flex items-center gap-1">
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 rounded text-xs font-black border-2",
                      style
                    )}
                  >
                    {g}
                  </span>
                  <span className="text-xs text-gray-400">{range}</span>
                </span>
              ))}
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
                  等级
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
                    <td className="px-3 py-2 text-center">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-black border-2",
                          GRADE_STYLE[cls.grade]
                        )}
                      >
                        {cls.grade}
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

  const makeH = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: 28 })],
      spacing: { before: 240, after: 120 },
    });

  const makeP = (text: string, bold = false) =>
    new Paragraph({
      children: [new TextRun({ text, bold, size: 24 })],
      spacing: { before: 80, after: 80 },
    });

  const download = async (doc: Document, filename: string) => {
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateDoc1 = async () => {
    setGenerating("doc1");
    try {
      const sorted = [...classStats].sort(
        (a, b) => b.composite_score - a.composite_score
      );
      const top3 = sorted.slice(0, 3);
      const bottom3 = sorted.slice(-3).reverse();
      const n = classStats.length || 1;
      const gradeAvg = classStats.reduce((s, c) => s + c.avg_total, 0) / n;
      const gradePass = classStats.reduce((s, c) => s + c.pass_rate, 0) / n;
      const gradeExc = classStats.reduce((s, c) => s + c.excellent_rate, 0) / n;
      const totalStudents = classStats.reduce((s, c) => s + c.student_count, 0);
      const totalAtRisk = classStats.reduce((s, c) => s + c.at_risk_count, 0);
      const subjectAvgs = SUBJECTS.map((s) => {
        const k =
          `avg_${s.key === "geography" ? "geo" : s.key}` as keyof ClassStat;
        const avg =
          classStats.reduce((sum, c) => sum + (c[k] as number), 0) / n;
        return { label: s.label, pct: (avg / s.max) * 100 };
      }).sort((a, b) => a.pct - b.pct);
      const weak2 = subjectAvgs.slice(0, 2);
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "港中深附属知新学校教学质量精准提升方案",
                    bold: true,
                    size: 36,
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
              makeH("一、学情分析"),
              makeP("（一）成绩现状", true),
              makeP(
                `本次期末考试共 ${totalStudents} 名学生参考，年级平均分 ${gradeAvg.toFixed(1)} 分（满分580分），合格率 ${gradePass.toFixed(1)}%，优良率 ${gradeExc.toFixed(1)}%，学困生 ${totalAtRisk} 人。`
              ),
              makeP(
                `综合分排名前三班级：${top3.map((c) => `${c.class_name}（${c.composite_score.toFixed(1)}分，${c.grade}级）`).join("、")}。`
              ),
              makeP(
                `综合分排名后三班级：${bottom3.map((c) => `${c.class_name}（${c.composite_score.toFixed(1)}分，${c.grade}级）`).join("、")}，需重点关注。`
              ),
              makeP("（二）核心问题", true),
              makeP(
                `1. 学科短板：${weak2.map((s) => `${s.label}（得分率${s.pct.toFixed(1)}%）`).join("、")} 得分率偏低，是本年级的薄弱学科。`
              ),
              makeP(
                `2. 班级差距：最高综合分班级（${top3[0]?.class_name}，${top3[0]?.composite_score.toFixed(1)}分）与最低综合分班级（${bottom3[0]?.class_name}，${bottom3[0]?.composite_score.toFixed(1)}分）相差 ${((top3[0]?.composite_score ?? 0) - (bottom3[0]?.composite_score ?? 0)).toFixed(1)} 分，班级间差距明显。`
              ),
              makeP(
                `3. 学困生问题：全年级共 ${totalAtRisk} 名学困生（总分低于200分），需要个性化辅导。`
              ),
              makeH("二、本学期目标"),
              makeP(
                `1. 年级合格率提升至 ${Math.min(100, gradePass + 5).toFixed(0)}% 以上。`
              ),
              makeP(
                `2. 年级优良率提升至 ${Math.min(100, gradeExc + 5).toFixed(0)}% 以上。`
              ),
              makeP(
                `3. 学困生人数减少 30% 以上，重点关注 ${bottom3.map((c) => c.class_name).join("、")} 等班级。`
              ),
              makeP(
                `4. 薄弱学科（${weak2.map((s) => s.label).join("、")}）得分率提升 5 个百分点以上。`
              ),
              makeH("三、教学改进措施"),
              makeP("（一）培优补弱", true),
              makeP(
                "1. 建立学困生档案，每班班主任与科任教师共同制定个性化辅导计划，每周至少开展一次针对性辅导。"
              ),
              makeP(
                "2. 对优秀学生实施拔高训练，通过竞赛题、拓展题等方式提升综合能力。"
              ),
              makeP('3. 建立"一对一"帮扶机制，优秀学生结对帮扶学困生。'),
              makeP("（二）课堂质量提升", true),
              makeP(
                '1. 推行"精讲多练"教学模式，减少无效讲授，增加学生自主练习时间。'
              ),
              makeP(
                "2. 加强课堂提问的针对性，重点关注中等生和学困生的课堂参与度。"
              ),
              makeP("3. 每节课设置明确的学习目标，课后及时检测达成情况。"),
              makeP("（三）学科短板攻坚", true),
              makeP(
                `1. 针对 ${weak2[0]?.label} 学科，组织专项教研，分析失分原因，制定针对性训练方案。`
              ),
              makeP(
                `2. 针对 ${weak2[1]?.label} 学科，加强基础知识巩固，增加课堂练习频次。`
              ),
              makeP("3. 各学科组每月开展一次质量分析会，及时调整教学策略。"),
              makeP("（四）班级差距缩小", true),
              makeP(
                `1. 对 ${bottom3.map((c) => c.class_name).join("、")} 等后进班级，安排骨干教师进行教学指导和示范课。`
              ),
              makeP("2. 推广优秀班级的教学经验，组织跨班级教研交流活动。"),
              makeP("3. 加强班主任与科任教师的协同配合，形成教育合力。"),
              makeP("（五）常规管理强化", true),
              makeP("1. 严格执行作业管理制度，确保作业质量和批改及时性。"),
              makeP("2. 加强课堂纪律管理，营造良好的学习氛围。"),
              makeP("3. 定期开展家校沟通，争取家长配合，形成家校共育合力。"),
              makeH("四、保障机制"),
              makeP(
                "1. 组织保障：成立年级教学质量提升工作小组，由年级组长负责统筹协调。"
              ),
              makeP(
                "2. 制度保障：建立月度质量分析制度，每月召开一次年级教学质量分析会。"
              ),
              makeP("3. 资源保障：优先保障薄弱班级和薄弱学科的教学资源配置。"),
              makeP(
                "4. 考核保障：将教学质量提升情况纳入教师绩效考核，激励教师积极参与。"
              ),
              new Paragraph({ spacing: { before: 480 } }),
              new Paragraph({
                children: [
                  new TextRun({ text: "港中深附属知新学校七年级组", size: 24 }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: new Date().toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          },
        ],
      });
      await download(doc, "教学质量精准提升方案.docx");
    } finally {
      setGenerating(null);
    }
  };

  const generateDoc2 = async () => {
    setGenerating("doc2");
    try {
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
        const avg =
          classStats.reduce((sum, c) => sum + (c[k] as number), 0) / n;
        return { label: s.label, pct: (avg / s.max) * 100 };
      }).sort((a, b) => a.pct - b.pct);
      const weak2 = subjectAvgs.slice(0, 2);
      const gap = (
        (sorted[0]?.composite_score ?? 0) -
        (sorted[sorted.length - 1]?.composite_score ?? 0)
      ).toFixed(1);
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "知新学校质量分析会指导意见",
                    bold: true,
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
              makeH("一、会前准备"),
              makeP("（一）数据准备", true),
              makeP("各班主任和科任教师在会前须完成以下数据整理工作："),
              makeP(
                "1. 本班成绩汇总：平均分、合格率、优良率、综合分等核心指标。"
              ),
              makeP(
                "2. 学生分层名单：优秀生（总分≥400分）、合格生（300–399分）、待提升生（200–299分）、学困生（<200分）。"
              ),
              makeP(
                "3. 与上次考试对比：各指标的变化情况，进步和退步学生名单。"
              ),
              makeP("4. 学科失分分析：各科目主要失分点和典型错误类型。"),
              makeP("（二）归因准备", true),
              makeP("各教师须对本班/本学科成绩进行初步归因，从以下维度思考："),
              makeP(
                "1. 教学因素：教学内容覆盖是否全面、教学方法是否适当、作业布置是否合理。"
              ),
              makeP("2. 学生因素：学习态度、学习习惯、基础差异等。"),
              makeP("3. 管理因素：课堂纪律、作业完成情况、家校配合等。"),
              makeH("二、会中研讨"),
              makeP("（一）数据呈现与解读", true),
              makeP(
                `年级整体情况：参考 ${totalStudents} 人，年级平均分 ${gradeAvg.toFixed(1)} 分，合格率 ${gradePass.toFixed(1)}%，优良率 ${gradeExc.toFixed(1)}%，学困生 ${totalAtRisk} 人。`
              ),
              makeP(
                `薄弱学科：${weak2.map((s) => `${s.label}（得分率${s.pct.toFixed(1)}%）`).join("、")}，需重点关注。`
              ),
              makeP("（二）靶向研讨议题", true),
              makeP("本次质量分析会重点研讨以下议题："),
              makeP(
                `议题1：如何缩小班级间差距（最高与最低综合分相差 ${gap} 分）？`
              ),
              makeP(
                `议题2：薄弱学科（${weak2.map((s) => s.label).join("、")}）的教学改进策略？`
              ),
              makeP(`议题3：学困生（${totalAtRisk}人）的精准帮扶方案？`),
              makeP("（三）经验分享", true),
              makeP(
                `请 ${sorted[0]?.class_name} 等优秀班级的班主任和科任教师分享成功经验，重点介绍：`
              ),
              makeP("1. 课堂教学的有效策略。"),
              makeP("2. 学困生帮扶的具体做法。"),
              makeP("3. 家校沟通的有效方式。"),
              makeH("三、会后落地"),
              makeP("（一）整改清单", true),
              makeP(
                "各班主任和科任教师须在会后3天内提交《教学整改清单》，内容包括："
              ),
              makeP("1. 本班/本学科存在的主要问题（不超过3条）。"),
              makeP("2. 针对每个问题的具体改进措施。"),
              makeP("3. 预期改进效果和时间节点。"),
              makeP("4. 需要学校/年级组提供的支持。"),
              makeP("（二）跟踪验收", true),
              makeP(
                "1. 月度检查：每月末由年级组长对整改情况进行检查，填写《整改进度跟踪表》。"
              ),
              makeP("2. 阶段性测试：下次月考后对比数据，评估整改效果。"),
              makeP(
                "3. 期末总结：学期末对本次质量分析会的整改落实情况进行全面总结。"
              ),
              makeH("四、复盘迭代（PDCA循环）"),
              makeP("Plan（计划）：根据本次分析结果，制定下阶段教学改进计划。"),
              makeP("Do（执行）：按计划落实各项改进措施，做好过程记录。"),
              makeP("Check（检查）：通过月考、作业检查等方式评估改进效果。"),
              makeP(
                "Act（处理）：总结有效经验，固化为教学常规；对未达预期的措施进行调整优化。"
              ),
              makeH("附录：质量分析工具包"),
              makeP("1. 班级成绩分析模板（含各指标计算公式）"),
              makeP("2. 学生分层名单模板"),
              makeP("3. 教学整改清单模板"),
              makeP("4. 整改进度跟踪表"),
              makeP("5. 家校沟通记录表"),
              makeP("6. 学困生帮扶档案"),
              makeP("7. 优秀经验分享记录表"),
              makeP("8. 月度质量分析报告模板"),
              makeP("9. 学科教研活动记录表"),
              makeP("10. 学期质量总结报告模板"),
              new Paragraph({ spacing: { before: 480 } }),
              new Paragraph({
                children: [new TextRun({ text: "知新学校教务处", size: 24 })],
                alignment: AlignmentType.RIGHT,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: new Date().toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          },
        ],
      });
      await download(doc, "质量分析会指导意见.docx");
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
          基于当前成绩数据，一键生成 Word 文档
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#B9FF66] p-6 space-y-4">
          <div>
            <h3 className="font-black text-[#191A23] text-lg">
              教学质量精准提升方案
            </h3>
            <p className="text-xs text-[#6B7280] mt-1">
              包含学情分析、目标设定、改进措施、保障机制
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
            {generating === "doc1" ? "生成中…" : "下载 Word 文档"}
          </button>
        </div>
        <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#191A23] p-6 space-y-4">
          <div>
            <h3 className="font-black text-[#191A23] text-lg">
              质量分析会指导意见
            </h3>
            <p className="text-xs text-[#6B7280] mt-1">
              包含会前准备、会中研讨、会后落地、PDCA循环
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
            {generating === "doc2" ? "生成中…" : "下载 Word 文档"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- 主页面 ----
const GradeReportPage: React.FC = () => {
  const [perspective, setPerspective] = useState<"grade" | "class" | "report">(
    "grade"
  );
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("grade_data")
          .select(
            "student_id,name,class_name,total_score,total_rank_in_class,total_rank_in_grade," +
              "chinese_score,math_score,english_score,history_score,geography_score,politics_score,biology_score"
          )
          .eq("exam_title", EXAM_TITLE);

        if (err) throw err;
        const rows = (data ?? []) as unknown as StudentRow[];
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
            const validTotal = ss.filter((s) => s.total_score != null);
            const n = validTotal.length || 1;
            const passCount = validTotal.filter(
              (s) => s.total_score! >= PASS_LINE
            ).length;
            const excellentCount = validTotal.filter(
              (s) => s.total_score! >= EXCELLENT_LINE
            ).length;
            const avgTotalVal = avg(ss.map((s) => s.total_score));
            const passRate = (passCount / n) * 100;
            const excellentRate = (excellentCount / n) * 100;
            const composite = calcComposite(
              avgTotalVal,
              passRate,
              excellentRate
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
              pass_rate: passRate,
              excellent_rate: excellentRate,
              composite_score: composite,
              grade: compositeGrade(composite),
            };
          }
        );

        setClassStats(
          stats.sort((a, b) => a.class_name.localeCompare(b.class_name))
        );
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页头 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
              成绩分析
            </h1>
            <p className="text-sm text-[#6B7280] font-medium mt-1">
              {EXAM_TITLE}
            </p>
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
