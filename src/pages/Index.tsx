import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navbar } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Loader2, List, BarChart3, ListFilter, Download, FileSpreadsheet, FileInput, Plus, Settings, BookOpen, AlertTriangle, User, Upload, TrendingUp, Brain, Construction, CheckCircle, RotateCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gradeAnalysisService } from "@/services/gradeAnalysisService";
import StudentDataImporter from "@/components/analysis/core/StudentDataImporter";
// 导入重构后的成绩导入组件
import GradeImporter from "@/components/analysis/core/grade-importer/GradeImporter";
import { FileUploader } from "@/components/analysis/core/grade-importer";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// import Footer from "@/components/shared/Footer"; // 暂时移除

// 使用AI增强的成绩导入组件 - 包含完整的AI解析功能

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializingTables, setIsInitializingTables] = useState(false);
  const [tablesExist, setTablesExist] = useState<boolean>(true);
  const navigate = useNavigate();
  const { user, isAuthReady } = useAuthContext();

  // 整合GradeDataImport的状态
  const [gradesActiveTab, setGradesActiveTab] = useState('import');
  const [importedData, setImportedData] = useState<any[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  // 检查必要的数据表是否存在，并在需要时创建
  useEffect(() => {
    const checkAndInitializeTables = async () => {
      try {
        setIsInitializingTables(true);
        
        // 检查数据表是否存在
        const requiredTables = ['exams', 'grade_data', 'grade_tags', 'grade_data_tags'];
        let allTablesExist = true;
        
        for (const table of requiredTables) {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error && error.code === '42P01') { // 表不存在的错误代码
            allTablesExist = false;
            break;
          }
        }
        
        // 如果有表不存在，初始化所有表
        if (!allTablesExist) {
          console.log("检测到数据表不完整，准备初始化...");
          const result = await gradeAnalysisService.initializeTables();
          
          if (result.success) {
            toast.success("数据表初始化成功", {
              description: "成绩分析所需的数据表已成功创建"
            });
          } else if (result.needsManualExecution) {
            toast.warning("无法自动创建数据表", {
              description: "请联系管理员在Supabase控制台手动执行SQL脚本"
            });
            console.error("需要手动执行的SQL:", result.manualSqlScripts);
          } else {
            toast.error("数据表初始化失败", {
              description: result.message || "请查看控制台了解详情"
            });
          }
        } else {
          console.log("所有必要的数据表已存在");
        }
      } catch (error) {
        console.error("检查和初始化数据表时出错:", error);
        toast.error("数据表检查失败", {
          description: "无法确认必要的数据表是否存在"
        });
      } finally {
        setIsInitializingTables(false);
      }
    };
    
    if (isAuthReady && user) {
      checkAndInitializeTables();
    }
  }, [isAuthReady, user]);

  useEffect(() => {
    // 用AuthContext统一处理认证状态，避免重复逻辑
    if (isAuthReady) {
      setIsLoading(false);
    }
  }, [isAuthReady]);

  // 处理成绩分析跳转
  const handleGoToAnalysis = () => {
    setIsAnalysisLoading(true);
    
    // 模拟加载过程
    setTimeout(() => {
      navigate('/grade-analysis');
      setIsAnalysisLoading(false);
    }, 800);
  };

  // 整合GradeDataImport的处理函数
  const handleDataImported = (data: any[]) => {
    setImportedData(data);
    setGradesActiveTab('preview');
    
    toast.success('数据导入成功', {
      description: `已成功导入 ${data.length} 条成绩记录`
    });
  };

  const handleStudentDataImported = (data: any[]) => {
    toast.success("数据导入成功", {
      description: `已成功导入 ${data.length} 条记录`
    });
  };

  useEffect(() => {
    // 检查数据库表是否存在
    const checkTablesExist = async () => {
      try {
        // 尝试获取考试列表，如果失败可能是表不存在
        const { data, error } = await gradeAnalysisService.getExamList();
        if (error) {
          console.error('检查表是否存在出错:', error);
          // 如果错误消息包含表不存在的提示，则设置状态
          if (error.message.includes('不存在')) {
            setTablesExist(false);
          }
        } else {
          setTablesExist(true);
        }
      } catch (error) {
        console.error('检查表是否存在时发生异常:', error);
        setTablesExist(false);
      }
    };

    checkTablesExist();
  }, []);

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
        
        {!tablesExist && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>数据库表不存在</AlertTitle>
            <AlertDescription>
              成绩分析系统需要的数据库表尚未创建。请先
              <Link to="/tools/init-tables" className="ml-1 font-medium underline">
                初始化数据库表
              </Link>
              ，然后再继续操作。
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs key="main-tabs" defaultValue="students" className="w-full">
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
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={() => navigate('/student-management')}
                    >
                      <List className="h-4 w-4" />
                      查看学生列表
                    </Button>
                  </div>
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
                  {/* 简化的成绩导入 */}
                  <Tabs key="grades-tabs" defaultValue="import" className="w-full" onValueChange={setGradesActiveTab} value={gradesActiveTab}>
                    <TabsList className="mb-6 w-full justify-start">
                      <TabsTrigger value="import" className="flex items-center gap-1">
                        <FileInput className="h-4 w-4" />
                        <span>数据导入</span>
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex items-center gap-1">
                        <ListFilter className="h-4 w-4" />
                        <span>数据预览</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="import" className="space-y-6">
                      <GradeImporter onDataImported={handleDataImported} />
                    </TabsContent>
                    
                    <TabsContent value="preview">
                      {importedData.length > 0 ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">导入数据总量</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">{importedData.length}</div>
                                <p className="text-xs text-gray-500 mt-1">条成绩记录</p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">数据完整率</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">100%</div>
                                <Progress value={100} className="h-1 mt-1" />
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">班级覆盖</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">
                                  {new Set(importedData.map(item => item.class_name)).size}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">个班级</p>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">科目类型</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">
                                  {new Set(importedData.map(item => item.subject)).size}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">个科目</p>
                              </CardContent>
                            </Card>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">导入数据预览</h2>
                            <Button variant="outline" className="flex items-center gap-1">
                              <Download className="h-4 w-4" />
                              <span>导出数据</span>
                            </Button>
                          </div>
                          
                          <div className="flex justify-end gap-4">
                            <Button variant="outline" onClick={() => setGradesActiveTab('import')}>
                              返回导入
                            </Button>
                            <Button 
                              onClick={handleGoToAnalysis} 
                              className="bg-[#c0ff3f] text-black hover:bg-[#a8e85c]"
                              disabled={isAnalysisLoading}
                            >
                              {isAnalysisLoading ? (
                                <>
                                  <BarChart3 className="mr-2 h-4 w-4 animate-pulse" />
                                  正在准备分析...
                                </>
                              ) : (
                                <>
                                  <BarChart3 className="mr-2 h-4 w-4" />
                                  前往成绩分析
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-24 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                          <FileSpreadsheet className="h-16 w-16 text-slate-300 mb-4" />
                          <h3 className="text-xl font-medium mb-2">暂无导入数据</h3>
                          <p className="text-slate-500 mb-6 text-center max-w-md">
                            请先使用数据导入功能导入成绩数据，导入后的数据将在此处预览
                          </p>
                          <Button 
                            onClick={() => setGradesActiveTab('import')}
                            className="bg-[#c0ff3f] text-black hover:bg-[#a8e85c]"
                          >
                            <FileInput className="mr-2 h-4 w-4" />
                            去导入数据
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
              {/* <Footer /> */}
    </div>
  );
};

export default Index;
