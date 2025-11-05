import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeworkTable } from "@/components/homework/HomeworkTable";
import { HomeworkAnalysisDashboard } from "@/components/analysis";

export default function TeacherHomeworkPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">作业管理</h1>
        <p className="text-muted-foreground">查看、管理和分析学生作业</p>
      </div>

      <Tabs defaultValue="homework" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="homework">作业列表</TabsTrigger>
          <TabsTrigger value="analysis">数据分析</TabsTrigger>
        </TabsList>
        <TabsContent value="homework" className="pt-4">
          <HomeworkTable />
        </TabsContent>
        <TabsContent value="analysis" className="pt-4">
          <HomeworkAnalysisDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
