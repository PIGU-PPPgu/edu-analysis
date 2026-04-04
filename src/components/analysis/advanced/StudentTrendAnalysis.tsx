import React, { useMemo, memo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { User, AlertTriangle } from "lucide-react";
import TrendFilters from "./trend/TrendFilters";
import TrendChart from "./trend/TrendChart";
import TrendAnalysisDetails from "./trend/TrendAnalysisDetails";
import {
  SUBJECT_CONFIG,
  processStudentTrendData,
  analyzeAllSubjectTrends,
  type WideGradeRecord,
} from "./trend/trendUtils";

interface StudentTrendAnalysisProps {
  gradeData: WideGradeRecord[];
  className?: string;
}

const StudentTrendAnalysis: React.FC<StudentTrendAnalysisProps> = ({
  gradeData,
  className = "",
}) => {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [viewMode, setViewMode] = useState<"line" | "area" | "radar">("line");
  const [analysisPage, setAnalysisPage] = useState(0);
  const analysisPageSize = 6;

  const studentOptions = useMemo(() => {
    const students = new Map<string, string>();
    gradeData.forEach((record) => {
      students.set(record.student_id, record.name);
    });
    return Array.from(students.entries()).map(([id, name]) => ({ id, name }));
  }, [gradeData]);

  const studentTrendData = useMemo(() => {
    if (!selectedStudent) return [];
    return processStudentTrendData(gradeData, selectedStudent);
  }, [gradeData, selectedStudent]);

  const trendAnalysis = useMemo(
    () => analyzeAllSubjectTrends(studentTrendData),
    [studentTrendData]
  );

  const chartData = useMemo(
    () =>
      studentTrendData.map((data, index) => ({
        ...data,
        examIndex: index + 1,
        examLabel: `考试${index + 1}`,
      })),
    [studentTrendData]
  );

  const radarData = useMemo(() => {
    if (studentTrendData.length === 0) return [];
    const latestData = studentTrendData[studentTrendData.length - 1];
    return Object.entries(SUBJECT_CONFIG)
      .filter(
        ([_, config]) => latestData[config.field as keyof typeof latestData]
      )
      .map(([subject, config]) => ({
        subject,
        score: latestData[config.field as keyof typeof latestData] as number,
        fullMark: config.fullScore,
      }));
  }, [studentTrendData]);

  useEffect(() => {
    setAnalysisPage(0);
  }, [selectedStudent]);

  if (studentOptions.length === 0) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#6B7280] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <User className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
            暂无学生数据
          </p>
          <p className="text-[#191A23]/70 font-medium">
            请先导入学生成绩数据进行趋势分析
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <TrendFilters
        studentOptions={studentOptions}
        selectedStudent={selectedStudent}
        viewMode={viewMode}
        onStudentChange={setSelectedStudent}
        onViewModeChange={setViewMode}
      />

      {selectedStudent && studentTrendData.length > 0 && (
        <>
          {/* 概览统计 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                value: studentTrendData.length,
                label: "考试次数",
                shadow: "#B9FF66",
              },
              {
                value:
                  studentTrendData[studentTrendData.length - 1]?.totalScore ||
                  0,
                label: "最新总分",
                shadow: "#6B7280",
              },
              {
                value: trendAnalysis.filter((t) => t.trend === "improving")
                  .length,
                label: "进步科目数",
                shadow: "#6B7280",
              },
              {
                value:
                  studentTrendData[studentTrendData.length - 1]?.classRank || 0,
                label: "班级排名",
                shadow: "#6B7280",
              },
            ].map(({ value, label, shadow }) => (
              <Card
                key={label}
                className={`border-2 border-black shadow-[4px_4px_0px_0px_${shadow}] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_${shadow}]`}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-black text-[#191A23] mb-2">
                    {value}
                  </div>
                  <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
                    {label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <TrendChart
            chartData={chartData}
            radarData={radarData}
            viewMode={viewMode}
          />

          <TrendAnalysisDetails
            trendAnalysis={trendAnalysis}
            analysisPage={analysisPage}
            analysisPageSize={analysisPageSize}
            onPageChange={setAnalysisPage}
          />
        </>
      )}

      {selectedStudent && studentTrendData.length === 0 && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-12 text-center">
            <div className="p-4 bg-[#6B7280] rounded-full border-2 border-black mx-auto mb-6 w-fit">
              <AlertTriangle className="h-16 w-16 text-white" />
            </div>
            <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
              该学生暂无考试数据
            </p>
            <p className="text-[#191A23]/70 font-medium">
              请确保该学生至少参加了一次考试
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(StudentTrendAnalysis);
