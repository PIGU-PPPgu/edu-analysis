import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navbar } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IntelligentFileParser from "@/components/analysis/IntelligentFileParser";
import StudentDataImporter from "@/components/analysis/StudentDataImporter";
import { FileText, Users, Loader2 } from "lucide-react";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isAuthReady } = useAuthContext();

  useEffect(() => {
    // 用AuthContext统一处理认证状态，避免重复逻辑
    if (isAuthReady) {
      setIsLoading(false);
    }
  }, [isAuthReady]);

  // 新增，导入成绩后自动跳转
  const handleGradeDataImported = (data: any[]) => {
    toast.success("数据导入成功", {
      description: `已成功导入 ${data.length} 条记录`
    });
    // 跳转到成绩分析页面
    navigate("/grade-analysis");
  };

  const handleStudentDataImported = (data: any[]) => {
    toast.success("数据导入成功", {
      description: `已成功导入 ${data.length} 条记录`
    });
    // 不再需要直接跳转，因为StudentDataImporter组件内部已经处理了导航
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>正在加载...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-2">数据导入中心</h1>
        <p className="text-gray-500 mb-8">导入和管理学生信息与成绩数据</p>
        
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="students" className="gap-2 data-[state=active]:bg-[#F2FCE2]">
              <Users className="h-4 w-4" />
              学生信息导入
            </TabsTrigger>
            <TabsTrigger value="grades" className="gap-2 data-[state=active]:bg-[#E5DEFF]">
              <FileText className="h-4 w-4" />
              成绩数据导入
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="students">
            <div className="grid gap-6">
              <Card className="border-t-4 border-t-green-400">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    学生信息导入
                  </CardTitle>
                  <CardDescription>
                    导入学生基本信息，包括学号、姓名、班级等必填信息及其他选填信息
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StudentDataImporter onDataImported={handleStudentDataImported} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="grades">
            <div className="grid gap-6">
              <Card className="border-t-4 border-t-purple-400">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    成绩数据导入
                  </CardTitle>
                  <CardDescription>
                    通过学号或姓名关联学生，导入各科目成绩数据
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <IntelligentFileParser onDataParsed={handleGradeDataImported} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
