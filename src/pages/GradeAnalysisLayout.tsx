
import React, { useCallback } from "react";
import Navbar from "@/components/analysis/Navbar";
import { toast } from "sonner";
import GradeOverview from "@/components/analysis/GradeOverview";
import GradeTabs from "@/components/analysis/GradeTabs";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { generateCustomCharts } from "@/utils/chartGenerationUtils";

const GradeAnalysisLayout: React.FC = () => {
  const { 
    gradeData, 
    setGradeData, 
    customCharts, 
    setCustomCharts, 
    selectedCharts, 
    setSelectedCharts,
    parsingError, 
    setParsingError,
    isDataLoaded
  } = useGradeAnalysis();

  // Data parsing callback
  const handleDataParsed = useCallback((parsedData: any[]) => {
    try {
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        toast.error("解析数据无效", {
          description: "数据格式不正确或为空"
        });
        setParsingError("数据格式无效");
        return;
      }
      
      setGradeData(parsedData);
      setParsingError(null);
      
      // Generate charts based on the data
      const charts = generateCustomCharts(parsedData);
      setCustomCharts(charts);
    } catch (error: any) {
      console.error("处理数据时出错:", error);
      toast.error("处理数据失败", {
        description: "数据格式可能不符合要求"
      });
      setParsingError(error.message || "未知错误");
    }
  }, [setGradeData, setParsingError, setCustomCharts]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <GradeOverview
            onDataParsed={handleDataParsed}
            parsingError={parsingError}
          />
          {isDataLoaded && (
            <GradeTabs
              data={gradeData}
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
