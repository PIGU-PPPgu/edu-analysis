import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, BookOpen, LineChart } from "lucide-react";
import DetailTab from "./DetailTab";
import SubjectAnalysisTab from "./SubjectAnalysisTab";

interface AnalysisTabProps {
  selectedClass: {
    id: string;
    name: string;
    grade: string;
  } | null;
  analysisData: any;
  subjectAnalysisData: any;
  loading?: boolean;
}

const AnalysisTab: React.FC<AnalysisTabProps> = ({
  selectedClass,
  analysisData,
  subjectAnalysisData,
  loading = false,
}) => {
  const [subTab, setSubTab] = useState("detail");
  const [trendData, setTrendData] = useState<any>(null);

  if (!selectedClass) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-semibold">请先选择班级</p>
        <p className="text-sm">选择一个班级以查看详细分析</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>学业分析</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="detail">
                <BarChart3 className="h-4 w-4 mr-2" />
                成绩详情
              </TabsTrigger>
              <TabsTrigger value="subject">
                <BookOpen className="h-4 w-4 mr-2" />
                学科分析
              </TabsTrigger>
              <TabsTrigger value="trend">
                <TrendingUp className="h-4 w-4 mr-2" />
                趋势对比
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="mt-4">
              <DetailTab
                selectedClass={selectedClass}
                analysisData={analysisData}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="subject" className="mt-4">
              <SubjectAnalysisTab
                selectedClass={selectedClass}
                subjectAnalysisData={subjectAnalysisData}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="trend" className="mt-4">
              <div className="space-y-4">
                <div className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    趋势对比分析
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    查看班级成绩随时间的变化趋势，包括平均分、及格率、优秀率等关键指标
                  </p>
                  <p className="text-xs text-[#5E9622]">
                    💡 功能开发中，敬请期待
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisTab;
