
import React, { useState } from "react";
import Navbar from "@/components/analysis/Navbar";
import WarningDashboard from "@/components/warning/WarningDashboard";
import WarningRules from "@/components/warning/WarningRules";
import WarningList from "@/components/warning/WarningList";
import { Button } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Settings, AlertTriangle, Users, School } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const WarningAnalysis = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 在实际应用中，这里会根据页码加载对应的数据
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">预警分析</h1>
            <p className="text-gray-500 mt-1">
              基于多维度数据的学生学习预警系统，整合成绩、出勤、作业和参与度等数据
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/ai-settings">
                <Settings className="mr-2 h-4 w-4" />
                AI配置
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/student-management">
                <Users className="mr-2 h-4 w-4" />
                学生管理
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/class-management">
                <School className="mr-2 h-4 w-4" />
                班级管理
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
            <div>
              <h4 className="font-medium">预警系统说明</h4>
              <p className="text-sm mt-1">
                本系统通过分析多种维度的学生数据，识别潜在风险因素并生成预警。
                您可以设置基于不同数据维度（成绩、出勤率、作业完成情况等）的预警规则，
                系统将自动评估并向您提供学生风险分析。
              </p>
            </div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="mb-4 grid w-full grid-cols-3 lg:max-w-[400px]">
            <TabsTrigger value="dashboard">预警总览</TabsTrigger>
            <TabsTrigger value="students">风险学生</TabsTrigger>
            <TabsTrigger value="rules">预警规则</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <WarningDashboard />
          </TabsContent>
          
          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>预警学生列表</CardTitle>
                  <div className="w-64">
                    <Input 
                      placeholder="搜索学生姓名或学号..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <WarningList />
                
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) handlePageChange(currentPage - 1);
                        }} 
                      />
                    </PaginationItem>
                    {[1, 2, 3].map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink 
                          href="#" 
                          isActive={currentPage === page}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(currentPage + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rules" className="space-y-6">
            <WarningRules />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WarningAnalysis;
