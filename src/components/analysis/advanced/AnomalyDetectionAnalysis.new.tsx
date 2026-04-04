import React, { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Info,
  Download,
  ExternalLink,
  Users,
  ArrowRight,
} from "lucide-react";
import { GradeRecord } from "./types/anomaly";
import { detectAnomalies } from "./utils/anomalyDetector";
import AnomalyStats from "./components/AnomalyStats";
import AnomalyChart from "./components/AnomalyChart";
import AnomalyList from "./components/AnomalyList";

interface AnomalyDetectionAnalysisProps {
  gradeData: GradeRecord[];
  title?: string;
  className?: string;
}

const AnomalyDetectionAnalysis: React.FC<AnomalyDetectionAnalysisProps> = ({
  gradeData,
  title = "成绩异常检测",
  className = "",
}) => {
  const anomalies = useMemo(() => detectAnomalies(gradeData), [gradeData]);

  const subjects = useMemo(() => {
    if (!gradeData || !Array.isArray(gradeData)) {
      return [];
    }
    return Array.from(
      new Set(gradeData.map((record) => record.subject).filter(Boolean))
    );
  }, [gradeData]);

  const stats = useMemo(() => {
    if (!gradeData || !Array.isArray(gradeData)) {
      return {
        totalStudents: 0,
        totalRecords: 0,
        anomalyRate: 0,
        affectedStudents: 0,
        affectedRate: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        totalAnomalies: 0,
      };
    }
    const totalStudents = new Set(gradeData.map((r) => r.student_id)).size;
    const affectedStudents = new Set(anomalies.map((a) => a.student_id)).size;
    const highRiskCount = anomalies.filter((a) => a.severity === "high").length;
    const mediumRiskCount = anomalies.filter(
      (a) => a.severity === "medium"
    ).length;

    return {
      totalStudents,
      affectedStudents,
      affectedRate:
        totalStudents > 0 ? (affectedStudents / totalStudents) * 100 : 0,
      highRiskCount,
      mediumRiskCount,
      totalAnomalies: anomalies.length,
    };
  }, [anomalies, gradeData]);

  const subjectAnomalies = useMemo(() => {
    const subjectStats = subjects.map((subject) => {
      const subjectAnomaliesCount = anomalies.filter(
        (a) => a.subject === subject
      ).length;
      const subjectStudentsCount = new Set(
        gradeData.filter((r) => r.subject === subject).map((r) => r.student_id)
      ).size;

      return {
        subject,
        anomalies: subjectAnomaliesCount,
        students: subjectStudentsCount,
        rate:
          subjectStudentsCount > 0
            ? (subjectAnomaliesCount / subjectStudentsCount) * 100
            : 0,
      };
    });

    return subjectStats.sort((a, b) => b.rate - a.rate);
  }, [anomalies, subjects, gradeData]);

  const handleJumpToWarningAnalysis = () => {
    const currentExam = gradeData?.[0]?.exam_title || "";
    const examDate = gradeData?.[0]?.exam_date || "";

    const queryParams = new URLSearchParams();
    if (currentExam) queryParams.set("exam", currentExam);
    if (examDate) queryParams.set("date", examDate);
    queryParams.set("from", "anomaly-detection");

    window.location.href = `/warning-analysis?${queryParams.toString()}`;
  };

  const handleExportData = () => {
    const csvContent = [
      [
        "学号",
        "姓名",
        "班级",
        "科目",
        "实际分数",
        "预期分数",
        "偏差",
        "Z分数",
        "异常类型",
        "风险等级",
        "描述",
      ],
      ...anomalies.map((a) => [
        a.student_id,
        a.name,
        a.class_name || "",
        a.subject,
        a.score.toString(),
        a.expected_score.toFixed(2),
        a.deviation.toFixed(2),
        a.z_score.toFixed(3),
        a.anomaly_type === "outlier_high"
          ? "异常偏高"
          : a.anomaly_type === "outlier_low"
            ? "异常偏低"
            : a.anomaly_type === "sudden_rise"
              ? "突然上升"
              : a.anomaly_type === "sudden_drop"
                ? "突然下降"
                : "其他异常",
        a.severity === "high"
          ? "高风险"
          : a.severity === "medium"
            ? "中风险"
            : "低风险",
        a.description,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "成绩异常检测报告.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (subjects.length === 0) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <AlertTriangle className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
            暂无成绩数据
          </p>
          <p className="text-[#191A23]/70 font-medium">
            请先导入学生成绩数据进行异常检测
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-white uppercase tracking-wide">
                  {title}
                </CardTitle>
                <p className="text-white/90 font-medium mt-1">
                  检测 {stats.totalStudents} 名学生在 {subjects.length}{" "}
                  个科目中的异常表现
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge className="bg-[#B9FF66] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {stats.totalAnomalies} 个异常
              </Badge>
              {stats.totalAnomalies > 0 && (
                <Button
                  onClick={handleJumpToWarningAnalysis}
                  className="border-2 border-black bg-[#9C88FF] hover:bg-[#8B77E8] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  转到预警分析
                </Button>
              )}
              <Button
                onClick={handleExportData}
                className="border-2 border-black bg-[#B9FF66] hover:bg-[#A8E055] text-[#191A23] font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
              >
                <Download className="h-4 w-4 mr-2" />
                导出报告
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]">
        <CardHeader className="bg-[#9C88FF] border-b-2 border-black py-4">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Info className="h-4 w-4 text-white" />
            </div>
            异常检测说明
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#9C88FF]/10 border-2 border-[#9C88FF] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">检测方法</p>
              <p className="text-sm text-[#191A23]/80">
                基于Z分数统计方法，识别偏离正常范围的成绩
              </p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">异常阈值</p>
              <p className="text-sm text-[#191A23]/80">
                Z分数绝对值 &gt; 2.5 为异常，&gt; 3.0 为极端异常
              </p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">风险等级</p>
              <p className="text-sm text-[#191A23]/80">
                高风险需要立即关注，中风险建议跟进
              </p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">应用建议</p>
              <p className="text-sm text-[#191A23]/80">
                结合学生具体情况分析，避免单纯依赖数据判断
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnomalyStats stats={stats} />

      <AnomalyChart subjectAnomalies={subjectAnomalies} />

      <AnomalyList anomalies={anomalies} />

      {stats.totalAnomalies > 0 && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
                <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                  <Users className="h-5 w-5 text-white" />
                </div>
                快速处理建议
              </CardTitle>
              <Button
                onClick={handleJumpToWarningAnalysis}
                size="sm"
                className="border-2 border-black bg-[#9C88FF] hover:bg-[#8B77E8] text-white font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
              >
                详细处理
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.highRiskCount > 0 && (
                <div className="p-4 bg-[#B9FF66]/20 border-2 border-[#B9FF66] rounded-lg">
                  <p className="font-black text-[#191A23] mb-2">
                    高风险: {stats.highRiskCount} 个
                  </p>
                  <p className="text-sm text-[#191A23]/80">
                    需要立即关注和干预处理
                  </p>
                </div>
              )}

              {stats.mediumRiskCount > 0 && (
                <div className="p-4 bg-[#9C88FF]/20 border-2 border-[#9C88FF] rounded-lg">
                  <p className="font-black text-[#191A23] mb-2">
                    中风险: {stats.mediumRiskCount} 个
                  </p>
                  <p className="text-sm text-[#191A23]/80">
                    建议持续关注和跟进
                  </p>
                </div>
              )}

              <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg md:col-span-2">
                <p className="font-black text-[#191A23] mb-2 flex items-center gap-2">
                  建议操作
                  <Badge className="bg-[#9C88FF] text-white border-2 border-black text-xs font-bold">
                    点击上方"详细处理"进行深度分析
                  </Badge>
                </p>
                <p className="text-sm text-[#191A23]/80">
                  结合学生具体情况分析，建议跳转到预警分析界面进行完整的学生预警管理和干预措施制定
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(AnomalyDetectionAnalysis);
