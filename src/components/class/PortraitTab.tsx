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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>智能画像</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="smart">
                <Sparkles className="h-4 w-4 mr-2" />
                班级画像
              </TabsTrigger>
              <TabsTrigger value="enhanced">
                <Zap className="h-4 w-4 mr-2" />
                学生能力分析
              </TabsTrigger>
              <TabsTrigger value="ai-analysis">
                <Brain className="h-4 w-4 mr-2" />
                AI智能洞察
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
