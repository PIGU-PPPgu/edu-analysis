import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { gradeAnalysisService } from '@/services/gradeAnalysisService';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function InitTables() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const handleInitializeTables = async () => {
    setIsInitializing(true);
    try {
      // 调用初始化函数
      const result = await gradeAnalysisService.initializeTables();
      setResult(result);
      
      if (result.success) {
        toast.success("数据库表初始化成功！");
      } else {
        toast.error("数据库表初始化失败");
        console.error("初始化失败:", result);
      }
    } catch (error) {
      console.error("初始化过程中发生错误:", error);
      toast.error("初始化过程中发生错误");
      setResult({ success: false, error });
    } finally {
      setIsInitializing(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>数据库表初始化工具</CardTitle>
          <CardDescription>
            用于创建成绩分析系统所需的数据库表
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            点击下方的按钮来初始化数据库表。这将创建以下表：
          </p>
          
          <ul className="list-disc pl-6 mb-4">
            <li>exams - 考试信息表</li>
            <li>grade_data - 成绩数据表</li>
            <li>grade_tags - 成绩标签表</li>
            <li>grade_data_tags - 成绩标签关联表</li>
          </ul>
          
          {result && (
            <div className="mt-6 p-4 rounded-md border">
              <h3 className="text-lg font-medium mb-2">
                初始化结果: {result.success ? '成功' : '失败'}
              </h3>
              
              {result.message && (
                <p className="text-sm mb-2">{result.message}</p>
              )}
              
              {result.needsManualExecution && result.manualSqlScripts && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">请在Supabase管理面板中手动执行以下SQL:</p>
                  <pre className="p-3 bg-slate-100 rounded text-xs overflow-x-auto">
                    {result.manualSqlScripts}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleInitializeTables} 
            disabled={isInitializing}
            size="lg"
            className="w-full"
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在初始化...
              </>
            ) : "初始化数据库表"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 