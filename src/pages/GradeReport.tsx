/**
 * 成绩分析 - 年级视角 & 班主任视角
 * 数据源：ph七上期末成绩
 */
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { AIGateway } from "@/services/ai/unified/AIGateway";
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

  // 将 AI 返回的文本按行转换为 docx 段落
  const textToParas = (text: string): Paragraph[] => {
    return text
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0)
      .map((line) => {
        // 识别标题行（一、二、三 或 （一）（二）等）
        const isSection = /^[一二三四五六七八九十]+[、．.]/.test(line);
        const isSubSection = /^（[一二三四五六七八九十]+）/.test(line);
        const isBold = isSection || isSubSection;
        return new Paragraph({
          children: [new TextRun({ text: line, bold: isBold, size: 24 })],
          spacing: { before: isBold ? 200 : 80, after: 80 },
        });
      });
  };

  const generateDoc1 = async () => {
    setGenerating("doc1");
    setStatusMsg("正在调用 AI 生成内容，请稍候…");
    try {
      const d = buildDataSummary();

      const prompt = `你是一位经验丰富的教务主任，请根据以下真实考试数据，撰写一份《港中深附属知新学校教学质量精准提升方案》正文内容。

【考试数据】
考试名称：ph七上期末成绩（满分580分，合格线300分，优良线400分）
参考人数：${d.totalStudents}人，共${classStats.length}个班级
年级平均分：${d.gradeAvg.toFixed(1)}分
年级合格率：${d.gradePass.toFixed(1)}%
年级优良率：${d.gradeExc.toFixed(1)}%
学困生总数：${d.totalAtRisk}人（总分低于200分）

班级综合分排名（综合分=平均分/580×100×40%+合格率×30%+优良率×30%）：
${d.classRows}

各科目年级平均得分率（从低到高）：
${d.subjectAvgs.map((s) => `  ${s.label}：${s.pct.toFixed(1)}%`).join("\n")}

【写作要求】
请严格按照以下结构撰写，每个章节内容要结合上述真实数据，语言专业、具体、有针对性，避免空话套话：

一、学情分析
（一）成绩现状
（二）核心问题

二、本学期目标
（列出3-4条量化目标，基于当前数据设定合理提升幅度）

三、教学改进措施
（一）质量分析会改进
（二）课堂质量提升
（三）教学常规强化
（四）培优补弱

四、落款
（右对齐：港中深附属知新学校七年级组，以及今天日期${new Date().toLocaleDateString("zh-CN")}）

注意：直接输出正文内容，不要输出标题"港中深附属知新学校教学质量精准提升方案"，不要有多余说明。`;

      const gateway = AIGateway.getInstance();
      const resp = await gateway.processRequest({
        content: prompt,
        requestType: "analysis",
        options: { temperature: 0.7, maxTokens: 2000, priority: "high" },
      });

      if (!resp.success || !resp.content) {
        throw new Error(resp.error || "AI 生成失败");
      }

      setStatusMsg("AI 内容生成完成，正在生成 Word 文档…");

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
              ...textToParas(resp.content),
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

      const prompt = `你是一位经验丰富的教务主任，请根据以下真实考试数据，撰写一份《知新学校质量分析会指导意见》正文内容。

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
请严格按照以下结构撰写，内容要结合上述真实数据，具体指导教师如何开好质量分析会：

一、会前准备
（一）数据分层（按成绩层次分组，结合本次数据说明如何分层）
（二）对比参照（与上次考试对比，说明关注哪些变化）
（三）活材料准备（收集典型案例、错题等）

二、会中研讨
（一）归因归策（针对本次数据的主要问题进行归因）
（二）靶向研讨（结合具体数据提出3个重点研讨议题）
（三）案例说话（请优秀班级分享经验）

三、会后落地
（一）整改清单（明确整改事项和时间节点）
（二）验收反馈（跟踪机制）

四、复盘迭代（PDCA循环）
（Plan/Do/Check/Act 四个环节，结合本次数据说明）

附录：质量分析工具包
（列出10项工具，每项一行）

落款（右对齐：知新学校教务处，${new Date().toLocaleDateString("zh-CN")}）

注意：直接输出正文内容，不要输出标题"知新学校质量分析会指导意见"，不要有多余说明。`;

      const gateway = AIGateway.getInstance();
      const resp = await gateway.processRequest({
        content: prompt,
        requestType: "analysis",
        options: { temperature: 0.7, maxTokens: 2000, priority: "high" },
      });

      if (!resp.success || !resp.content) {
        throw new Error(resp.error || "AI 生成失败");
      }

      setStatusMsg("AI 内容生成完成，正在生成 Word 文档…");

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
              ...textToParas(resp.content),
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
          <p className="mt-3 text-sm font-bold text-[#191A23] animate-pulse">
            {statusMsg}
          </p>
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
