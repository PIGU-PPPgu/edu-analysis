
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import IntelligentFileParser from "@/components/analysis/IntelligentFileParser";
import StatisticsOverview from "@/components/analysis/StatisticsOverview";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { calculateStatistics } from "@/utils/chartGenerationUtils";

interface Props {
  onDataParsed: (parsedData: any[]) => void;
  parsingError: string | null;
}

const MOCK_GRADE_DATA = [
  { studentId: "2024001", name: "张三", subject: "语文", score: 92, examDate: "2023-09-01", examType: "期中考试" },
  { studentId: "2024001", name: "张三", subject: "数学", score: 85, examDate: "2023-09-01", examType: "期中考试" },
  { studentId: "2024001", name: "张三", subject: "英语", score: 78, examDate: "2023-09-01", examType: "期中考试" },
  { studentId: "2024002", name: "李四", subject: "语文", score: 88, examDate: "2023-09-01", examType: "期中考试" },
  { studentId: "2024002", name: "李四", subject: "数学", score: 95, examDate: "2023-09-01", examType: "期中考试" },
  { studentId: "2024002", name: "李四", subject: "英语", score: 82, examDate: "2023-09-01", examType: "期中考试" },
  { studentId: "2024003", name: "王五", subject: "语文", score: 75, examDate: "2023-09-01", examType: "期中考试" },
  { studentId: "2024003", name: "王五", subject: "数学", score: 67, examDate: "2023-09-01", examType: "期中考试" },
  { studentId: "2024003", name: "王五", subject: "英语", score: 85, examDate: "2023-09-01", examType: "期中考试" }
];

const GradeOverview: React.FC<Props> = ({ onDataParsed, parsingError }) => {
  const { gradeData, isDataLoaded } = useGradeAnalysis();
  
  // Use actual data or fall back to mock data for statistics
  const dataToUse = isDataLoaded ? gradeData : MOCK_GRADE_DATA;
  const statData = calculateStatistics(dataToUse);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">成绩分析</h1>
        <p className="text-gray-500 mt-1">
          导入和分析学生成绩数据，生成统计图表和报告
        </p>
      </div>
      <IntelligentFileParser onDataParsed={onDataParsed} />
      {parsingError && (
        <Card className="mt-4 border-red-300">
          <CardContent className="p-4">
            <p className="text-red-500 font-medium">解析错误: {parsingError}</p>
            <p className="text-sm text-gray-600 mt-1">
              请检查您的数据格式，确保是纯文本CSV文件，而不是二进制Excel文件。
              如果您有Excel文件，请先在Excel中"另存为" CSV格式。
            </p>
          </CardContent>
        </Card>
      )}
      <StatisticsOverview {...statData} />
    </>
  );
};

export default GradeOverview;
