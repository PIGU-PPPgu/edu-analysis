import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Zap, Brain } from "lucide-react";
import ClassPortraitDashboard from "./ClassPortraitDashboard";
import { IntelligentPortraitAnalysis } from "@/components/portrait/advanced";
import EnhancedStudentPortrait from "@/components/portrait/advanced/EnhancedStudentPortrait";

interface PortraitTabProps {
  selectedClass: {
    id: string;
    name: string;
    grade: string;
  } | null;
}

const PortraitTab: React.FC<PortraitTabProps> = ({ selectedClass }) => {
  const [subTab, setSubTab] = useState("smart");

  if (!selectedClass) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Brain className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-semibold">请先选择班级</p>
        <p className="text-sm">选择一个班级以查看智能画像</p>
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
              <Brain className="h-8 w-8 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-black mb-1">
                {selectedClass.name}
              </h2>
              <p className="text-[#5E9622] text-sm font-medium">
                {selectedClass.grade} · 智能画像
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
          <CardTitle>智能画像</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="smart">
                <Sparkles className="h-4 w-4 mr-2" />
                画像生成
              </TabsTrigger>
              <TabsTrigger value="enhanced">
                <Zap className="h-4 w-4 mr-2" />
                能力画像
              </TabsTrigger>
              <TabsTrigger value="ai-analysis">
                <Brain className="h-4 w-4 mr-2" />
                学习分析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="smart" className="mt-4">
              <ClassPortraitDashboard
                classId={selectedClass.id}
                className={selectedClass.name}
              />
            </TabsContent>

            <TabsContent value="enhanced" className="mt-4">
              <EnhancedStudentPortrait classId={selectedClass.id} />
            </TabsContent>

            <TabsContent value="ai-analysis" className="mt-4">
              <IntelligentPortraitAnalysis classId={selectedClass.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortraitTab;
