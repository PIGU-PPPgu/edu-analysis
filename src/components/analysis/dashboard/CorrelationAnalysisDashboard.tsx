import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Filter,
  Settings,
  Zap,
  BarChart3,
  TrendingUp,
  Grid,
  Eye,
  Download,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useModernGradeAnalysis } from "@/contexts/ModernGradeAnalysisContext";
import EnhancedSubjectCorrelationMatrix from "../advanced/EnhancedSubjectCorrelationMatrix";
import SubjectCorrelationAnalysis from "../advanced/SubjectCorrelationAnalysis";

interface CorrelationAnalysisDashboardProps {
  className?: string;
}

const CorrelationAnalysisDashboard: React.FC<
  CorrelationAnalysisDashboardProps
> = ({ className = "" }) => {
  const {
    wideGradeData,
    longGradeData,
    loading,
    selectedExamId,
    selectedClass,
    examOptions,
    classOptions,
  } = useModernGradeAnalysis();

  const [activeTab, setActiveTab] = useState<"enhanced" | "traditional">(
    "enhanced"
  );
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [filterSignificance, setFilterSignificance] = useState<
    "all" | "significant" | "strong"
  >("all");

  // 数据统计
  const dataStats = useMemo(() => {
    const wideCount = wideGradeData?.length || 0;
    const longCount = longGradeData?.length || 0;
    const examCount = examOptions?.length || 0;
    const classCount = classOptions?.length || 0;

    return {
      students: wideCount,
      records: longCount,
      exams: examCount,
      classes: classCount,
    };
  }, [wideGradeData, longGradeData, examOptions, classOptions]);

  if (loading) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#9C88FF] rounded-full border-2 border-black mx-auto mb-6 w-fit animate-pulse">
            <BarChart3 className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
            ⏳ 数据加载中...
          </p>
          <p className="text-[#191A23]/70 font-medium">
            正在准备相关性分析数据
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!wideGradeData || wideGradeData.length === 0) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#FF6B6B] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#FF6B6B] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <Grid className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
            {" "}
            暂无数据
          </p>
          <p className="text-[#191A23]/70 font-medium">
            请先导入成绩数据以进行相关性分析
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Positivus风格主控制面板 */}
      <Card className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_#B9FF66]">
        <CardHeader className="bg-gradient-to-r from-[#B9FF66] to-[#A8E055] border-b-2 border-black">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-[#191A23] rounded-full border-2 border-black">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black text-[#191A23] uppercase tracking-wide">
                  🔬 科目相关性分析仪表板
                </CardTitle>
                <p className="text-[#191A23]/80 font-medium mt-2 text-lg">
                  智能分析科目间关联性 • AI驱动的教学洞察 • Wide-Table性能优化
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 数据概览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-black text-[#191A23] mb-2">
              {dataStats.students}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              {" "}
              分析学生数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#F7931E] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#F7931E]">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-black text-[#191A23] mb-2">
              {dataStats.records}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              成绩记录数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#9C88FF]">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-black text-[#191A23] mb-2">
              {dataStats.exams}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              {" "}
              考试批次数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#FF6B6B] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#FF6B6B]">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-black text-[#191A23] mb-2">
              {dataStats.classes}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              🏫 班级数量
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选控制面板 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#F7931E]">
        <CardHeader className="bg-[#F7931E] border-b-2 border-black">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Settings className="h-5 w-5 text-white" />
            </div>
            分析控制设置
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 分析模式切换 */}
            <div className="space-y-3">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">
                {" "}
                分析模式
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setActiveTab("enhanced")}
                  className={`border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] transition-all ${
                    activeTab === "enhanced"
                      ? "bg-[#B9FF66] text-[#191A23] translate-x-[-1px] translate-y-[-1px] shadow-[3px_3px_0px_0px_#191A23]"
                      : "bg-white text-[#191A23] hover:bg-[#B9FF66]/20"
                  }`}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  增强版
                </Button>
                <Button
                  onClick={() => setActiveTab("traditional")}
                  className={`border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] transition-all ${
                    activeTab === "traditional"
                      ? "bg-[#F7931E] text-white translate-x-[-1px] translate-y-[-1px] shadow-[3px_3px_0px_0px_#191A23]"
                      : "bg-white text-[#191A23] hover:bg-[#F7931E]/20"
                  }`}
                >
                  <Grid className="h-4 w-4 mr-2" />
                  传统版
                </Button>
              </div>
            </div>

            {/* 显著性筛选 */}
            <div className="space-y-3">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">
                {" "}
                显著性筛选
              </label>
              <div className="flex gap-2">
                {[
                  { value: "all", label: "全部", color: "bg-[#9C88FF]" },
                  {
                    value: "significant",
                    label: "显著",
                    color: "bg-[#F7931E]",
                  },
                  { value: "strong", label: "强相关", color: "bg-[#B9FF66]" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    onClick={() => setFilterSignificance(option.value as any)}
                    className={`border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] transition-all ${
                      filterSignificance === option.value
                        ? `${option.color} ${option.value === "strong" ? "text-[#191A23]" : "text-white"} translate-x-[-1px] translate-y-[-1px] shadow-[3px_3px_0px_0px_#191A23]`
                        : "bg-white text-[#191A23] hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 显示选项 */}
            <div className="space-y-3">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">
                显示选项
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="heatmap"
                    checked={showHeatMap}
                    onCheckedChange={setShowHeatMap}
                  />
                  <label
                    htmlFor="heatmap"
                    className="text-sm font-medium text-[#191A23]"
                  >
                    热力图显示
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 当前筛选状态显示 */}
      <div className="flex flex-wrap gap-3">
        <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] px-3 py-1">
          <Eye className="h-4 w-4 mr-2" />
          当前模式: {activeTab === "enhanced" ? "增强版分析" : "传统版分析"}
        </Badge>
        <Badge className="bg-[#F7931E] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] px-3 py-1">
          <Filter className="h-4 w-4 mr-2" />
          筛选条件:{" "}
          {filterSignificance === "all"
            ? "显示全部"
            : filterSignificance === "significant"
              ? "仅显示显著相关"
              : "仅显示强相关"}
        </Badge>
        {selectedExamId && (
          <Badge className="bg-[#9C88FF] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] px-3 py-1">
            考试:{" "}
            {examOptions?.find((e) => e.value === selectedExamId)?.label ||
              "全部"}
          </Badge>
        )}
        {selectedClass && (
          <Badge className="bg-[#FF6B6B] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] px-3 py-1">
            🏫 班级: {selectedClass}
          </Badge>
        )}
      </div>

      {/* 分析内容区域 */}
      <div className="min-h-[600px]">
        {activeTab === "enhanced" ? (
          <EnhancedSubjectCorrelationMatrix
            gradeData={wideGradeData}
            showHeatMap={showHeatMap}
            filterSignificance={filterSignificance}
            title="AI增强版科目相关性矩阵"
            className="space-y-6"
          />
        ) : (
          <SubjectCorrelationAnalysis
            gradeData={longGradeData}
            title="传统科目相关性分析"
            className="space-y-6"
          />
        )}
      </div>

      {/* 性能对比提示 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            性能优化说明
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-[#B9FF66]/20 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2"> 增强版优势</p>
              <ul className="text-sm text-[#191A23]/80 space-y-1">
                <li>• Wide-table原生支持，性能提升30%+</li>
                <li>• 增强统计信息（置信区间、协方差等）</li>
                <li>• 智能教学建议和洞察分析</li>
                <li>• 实时筛选和高级数据导出</li>
              </ul>
            </div>
            <div className="p-4 bg-[#F7931E]/20 border-2 border-[#F7931E] rounded-lg">
              <p className="font-black text-[#191A23] mb-2"> 传统版特点</p>
              <ul className="text-sm text-[#191A23]/80 space-y-1">
                <li>• 基于Long-table数据结构</li>
                <li>• 向后兼容现有数据格式</li>
                <li>• 标准统计分析功能</li>
                <li>• 稳定成熟的分析算法</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CorrelationAnalysisDashboard;
