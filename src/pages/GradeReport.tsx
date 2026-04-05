/**
 * 成绩分析 - 年级视角 & 班主任视角
 * 数据源：ph七上期末成绩
 */
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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
                label: "班级平均分",
                value: Math.round(cls.avg_total),
                unit: "分",
              },
              {
                label: "学困生",
                value: atRisk.length,
                unit: "人",
                warn: true,
              },
              {
                label: "年级排名",
                value:
                  [...classStats]
                    .sort((a, b) => b.avg_total - a.avg_total)
                    .findIndex((c) => c.class_name === selectedClass) + 1,
                unit: `/ ${classStats.length}`,
              },
            ].map(({ label, value, unit, warn }) => (
              <div
                key={label}
                className={cn(
                  "border-2 border-black p-5 bg-white",
                  warn && atRisk.length > 0
                    ? "shadow-[4px_4px_0px_0px_#EF4444]"
                    : "shadow-[4px_4px_0px_0px_#191A23]"
                )}
              >
                <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">
                  {label}
                </p>
                <p
                  className={cn(
                    "text-3xl font-black mt-1",
                    warn && atRisk.length > 0
                      ? "text-red-600"
                      : "text-[#191A23]"
                  )}
                >
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
    };
  }, [classStats]);

  const totalAtRisk = classStats.reduce((s, c) => s + c.at_risk_count, 0);
  const totalStudents = classStats.reduce((s, c) => s + c.student_count, 0);
  const overallAvg = gradeAvg ? Math.round(gradeAvg.avg_total) : 0;

  return (
    <div className="space-y-8">
      {/* 年级概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "参考人数", value: totalStudents, unit: "人" },
          { label: "班级数", value: classStats.length, unit: "班" },
          { label: "年级平均分", value: overallAvg, unit: "分" },
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

      {/* 班级总分排名 */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#B9FF66]">
        <div className="bg-[#B9FF66] border-b-2 border-black px-6 py-4">
          <h2 className="font-black text-[#191A23] uppercase tracking-wide">
            班级总分排名
          </h2>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[...classStats].sort((a, b) => b.avg_total - a.avg_total)}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="class_name"
                tick={{ fontSize: 11, fontWeight: 700 }}
                tickFormatter={(v) => v.replace("初一", "")}
              />
              <YAxis
                domain={[250, 380]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(1)} 分`, "平均分"]}
                labelFormatter={(l) => l}
              />
              <Bar dataKey="avg_total" radius={[2, 2, 0, 0]}>
                {[...classStats]
                  .sort((a, b) => b.avg_total - a.avg_total)
                  .map((entry, i) => (
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

      {/* 各科热力图 */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#191A23]">
        <div className="bg-[#191A23] border-b-2 border-black px-6 py-4">
          <h2 className="font-black text-white uppercase tracking-wide">
            各科得分率热力图
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            数值为得分率（%），颜色越深表现越好
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left px-4 py-3 font-black text-[#191A23] w-24">
                  班级
                </th>
                {SUBJECTS.map((s) => (
                  <th
                    key={s.key}
                    className="px-3 py-3 font-black text-[#191A23] text-center"
                  >
                    {s.label}
                    <span className="block text-xs font-normal text-[#6B7280]">
                      满分{s.max}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3 font-black text-[#191A23] text-center">
                  学困生
                </th>
              </tr>
            </thead>
            <tbody>
              {[...classStats]
                .sort((a, b) => b.avg_total - a.avg_total)
                .map((cls, i) => {
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
                    <tr
                      key={cls.class_name}
                      className="border-b border-gray-100"
                    >
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
                      {SUBJECTS.map((s) => {
                        const p = pct(scores[s.key], s.max);
                        return (
                          <td key={s.key} className="px-2 py-2 text-center">
                            <span
                              className={cn(
                                "inline-block px-2 py-1 rounded text-xs font-bold min-w-[40px]",
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
                  <td className="px-4 py-2 font-black text-[#191A23] text-xs uppercase">
                    年级均值
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

// ---- 主页面 ----
const GradeReportPage: React.FC = () => {
  const [perspective, setPerspective] = useState<"grade" | "class">("grade");
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
        const rows = (data ?? []) as StudentRow[];
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
          ([class_name, ss]) => ({
            class_name,
            student_count: ss.length,
            avg_total: avg(ss.map((s) => s.total_score)),
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
          })
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
          </>
        )}
      </div>
    </div>
  );
};

export default GradeReportPage;
