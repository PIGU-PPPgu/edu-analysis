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
    <div className="space-y-6">
      {/* 班级标识头部 - Neo-brutalism green theme */}
      <div className="border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-lg p-6 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[#B9FF66] border-2 border-black rounded-2xl p-3">
              <LineChart className="h-8 w-8 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-black mb-1">
                {selectedClass.name}
              </h2>
              <p className="text-[#5E9622] text-sm font-medium">
                {selectedClass.grade} · 学业分析
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-[#B9FF66]/10 border-2 border-black rounded-lg px-4 py-2">
              <p className="text-xs text-[#5E9622] mb-1">当前查看</p>
              <p className="text-lg font-bold text-black">
                {selectedClass.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>学业分析</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="detail">
                <TrendingUp className="h-4 w-4 mr-2" />
                成绩详情
              </TabsTrigger>
              <TabsTrigger value="subject">
                <BookOpen className="h-4 w-4 mr-2" />
                学科分析
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisTab;
