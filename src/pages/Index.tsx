
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/analysis/Navbar";
import FileUploader from "@/components/analysis/FileUploader";
import { Button } from "@/components/ui/button";
import IntelligentFileParser from "@/components/analysis/IntelligentFileParser";
import { AlertTriangle, ChartBar } from "lucide-react";

const Index = () => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-4">
          <h1 className="text-4xl font-bold">教师数据分析平台</h1>
          <p className="text-xl text-muted-foreground">
            轻松导入成绩数据，获取智能分析报告
          </p>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <Button 
              onClick={() => navigate("/grade-analysis")} 
              className="flex items-center gap-2"
            >
              <ChartBar className="h-4 w-4" />
              成绩分析
            </Button>
            <Button 
              onClick={() => navigate("/warning-analysis")} 
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600"
            >
              <AlertTriangle className="h-4 w-4" />
              预警分析系统
            </Button>
          </div>
        </div>

        <div
          className={`relative rounded-lg border-2 border-dashed p-12 transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }`}
        >
          <FileUploader setDragActive={setDragActive} dragActive={dragActive} />
        </div>
        
        <div className="mt-12">
          <IntelligentFileParser />
        </div>
      </div>
    </div>
  );
};

export default Index;
