import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, BarChart3, Users, PieChart } from "lucide-react";
import SubjectCorrelationAnalysis from "@/components/analysis/advanced/SubjectCorrelationAnalysis";
import ClassComparisonChart from "@/components/analysis/comparison/ClassComparisonChart";
import ClassBoxPlotChart from "@/components/analysis/comparison/ClassBoxPlotChart";
import { LearningBehaviorAnalysis } from "@/components/analysis/advanced/LearningBehaviorAnalysis";
import ContributionAnalysis from "@/components/analysis/advanced/ContributionAnalysis";
import EnhancedSubjectCorrelationMatrix from "@/components/analysis/advanced/EnhancedSubjectCorrelationMatrix";
import StudentTrendAnalysis from "@/components/analysis/advanced/StudentTrendAnalysis";
import MultiDimensionalRankingSystem from "@/components/analysis/advanced/MultiDimensionalRankingSystem";
import ChartGallery from "@/components/analysis/charts/ChartGallery";
import type { GradeRecord as LegacyGradeRecord } from "@/types/grade";
import type { WideGradeRecord } from "@/components/analysis/advanced/trend/trendUtils";

interface DeepAnalysisTabProps {
  filteredGradeData: any[];
  wideGradeData: WideGradeRecord[];
  comparisonGradeData: LegacyGradeRecord[];
}

const DeepAnalysisTab: React.FC<DeepAnalysisTabProps> = ({
  filteredGradeData,
  wideGradeData,
  comparisonGradeData,
}) => {
  return (
    <Tabs defaultValue="data-analysis" className="w-full space-y-8">
      <div className="overflow-x-auto">
        <TabsList className="grid w-fit grid-cols-3 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1">
          <TabsTrigger
            value="data-analysis"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-2"
          >
            <BarChart3 className="w-4 h-4" />
            数据分析
          </TabsTrigger>
          <TabsTrigger
            value="student-analysis"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-2"
          >
            <Users className="w-4 h-4" />
            学生对比
          </TabsTrigger>
          <TabsTrigger
            value="chart-gallery"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-2"
          >
            <PieChart className="w-4 h-4" />
            图表展示
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="data-analysis" className="space-y-6">
        <EnhancedSubjectCorrelationMatrix
          gradeData={(wideGradeData || []).slice(0, 2000)}
          title="科目相关性分析"
          className="w-full"
          showHeatMap={true}
          filterSignificance="all"
        />
        <StudentTrendAnalysis
          gradeData={(wideGradeData || []).slice(0, 3000)}
          className="w-full"
        />
        <MultiDimensionalRankingSystem
          gradeData={(wideGradeData || []).slice(0, 1000)}
          className="w-full"
        />
        <SubjectCorrelationAnalysis
          gradeData={filteredGradeData}
          className=""
        />
      </TabsContent>

      <TabsContent value="student-analysis" className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ClassComparisonChart
            data={comparisonGradeData}
            filterState={{ selectedClasses: [], viewMode: "all" }}
            className=""
          />
          <ClassBoxPlotChart gradeData={comparisonGradeData} className="" />
        </div>
        <LearningBehaviorAnalysis />
        <ContributionAnalysis
          gradeData={filteredGradeData}
          title="学生科目贡献度分析"
          className=""
        />
      </TabsContent>

      <TabsContent value="chart-gallery" className="space-y-6">
        {filteredGradeData.length > 5000 && (
          <Card className="border-l-4 border-l-orange-500 bg-orange-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-semibold text-orange-800">
                    数据量较大 ({filteredGradeData.length.toLocaleString()}{" "}
                    条记录)
                  </p>
                  <p className="text-sm text-orange-600">
                    为保证性能，图表将只显示前 5,000
                    条数据。建议使用筛选功能缩小数据范围以获得更准确的分析。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <ChartGallery
          gradeData={filteredGradeData.slice(0, 5000)}
          className=""
        />
      </TabsContent>
    </Tabs>
  );
};

export default DeepAnalysisTab;
