
import React, { useState, useCallback } from "react";
import Navbar from "@/components/analysis/Navbar";
import { toast } from "sonner";
import GradeOverview from "@/components/analysis/GradeOverview";
import GradeTabs from "@/components/analysis/GradeTabs";

const GradeAnalysisLayout: React.FC = () => {
  // 所有状态与处理逻辑仍集中在这里
  const [data, setData] = useState<any[]>([]);
  const [showCharts, setShowCharts] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState<string[]>(["distribution", "subject"]);
  const [customCharts, setCustomCharts] = useState<any[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);

  // 数据解析回调
  const handleDataParsed = useCallback((parsedData: any[]) => {
    try {
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        toast.error("解析数据无效", {
          description: "数据格式不正确或为空"
        });
        setParsingError("数据格式无效");
        return;
      }
      setData(parsedData);
      setShowCharts(true);
      setParsingError(null);
      generateCustomCharts(parsedData);
    } catch (error: any) {
      console.error("处理数据时出错:", error);
      toast.error("处理数据失败", {
        description: "数据格式可能不符合要求"
      });
      setParsingError(error.message || "未知错误");
    }
  }, []);

  // 自定义图表自动生成逻辑直接搬过来
  const generateCustomCharts = (parsedData: any[]) => {
    if (parsedData.length === 0) return;
    const generatedCharts = [];
    const firstRecord = parsedData[0];
    const fields = Object.keys(firstRecord);

    const scoreField = fields.find(f => 
      f.toLowerCase().includes('score') || 
      f.toLowerCase().includes('分数') || 
      f.toLowerCase().includes('成绩')
    );
    const subjectField = fields.find(f => 
      f.toLowerCase().includes('subject') || 
      f.toLowerCase().includes('科目') || 
      f.toLowerCase().includes('学科')
    );
    const dateField = fields.find(f => 
      f.toLowerCase().includes('date') || 
      f.toLowerCase().includes('日期') || 
      f.toLowerCase().includes('time') || 
      f.toLowerCase().includes('时间')
    );
    const examTypeField = fields.find(f => 
      f.toLowerCase().includes('type') || 
      f.toLowerCase().includes('类型') || 
      f.toLowerCase().includes('exam')
    );

    // 生成各科目均分
    if (scoreField && subjectField) {
      const subjectScores: Record<string, { total: number; count: number }> = {};
      parsedData.forEach(record => {
        const subject = record[subjectField];
        const score = parseFloat(record[scoreField]);
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
        const score = parseFloat(record[scoreField]);
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
        const score = parseFloat(record[scoreField]);
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
        const score = parseFloat(record[scoreField]);
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
    setCustomCharts(generatedCharts);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <GradeOverview
            onDataParsed={handleDataParsed}
            parsingError={parsingError}
          />
          {showCharts && (
            <GradeTabs
              data={data}
              customCharts={customCharts}
              selectedCharts={selectedCharts}
              setSelectedCharts={setSelectedCharts}
            />
          )}
        </div>
      </div>
    </div>
  );
};
export default GradeAnalysisLayout;
