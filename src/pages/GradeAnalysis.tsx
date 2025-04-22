import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, AutoChart } from "@/components/ui/chart";
import Navbar from "@/components/analysis/Navbar";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import StatisticsOverview from "@/components/analysis/StatisticsOverview";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import GradeTable from "@/components/analysis/GradeTable";
import IntelligentFileParser from "@/components/analysis/IntelligentFileParser";
import AIDataAnalysis from "@/components/analysis/AIDataAnalysis";
import { toast } from "sonner";
import { FileText, ChartBar, ChartLine } from "lucide-react";

// 预设的图表分析类型
const CHART_PRESETS = [
  { id: "distribution", name: "分数分布", icon: <ChartBar className="h-4 w-4" /> },
  { id: "subject", name: "学科对比", icon: <ChartBar className="h-4 w-4" /> },
  { id: "trend", name: "成绩趋势", icon: <ChartLine className="h-4 w-4" /> },
  { id: "boxplot", name: "箱线图分析", icon: <ChartBar className="h-4 w-4" /> },
  { id: "correlation", name: "相关性分析", icon: <ChartLine className="h-4 w-4" /> },
];

const scoreDistributionData = [
  { range: "90-100分", count: 15, color: "#4CAF50" },
  { range: "80-89分", count: 23, color: "#8BC34A" },
  { range: "70-79分", count: 18, color: "#CDDC39" },
  { range: "60-69分", count: 12, color: "#FFEB3B" },
  { range: "60分以下", count: 7, color: "#F44336" },
];

const boxPlotData = [
  { subject: "语文", min: 52, q1: 68, median: 78, q3: 88, max: 98 },
  { subject: "数学", min: 45, q1: 62, median: 75, q3: 85, max: 97 },
  { subject: "英语", min: 50, q1: 65, median: 76, q3: 86, max: 95 },
  { subject: "物理", min: 48, q1: 60, median: 72, q3: 82, max: 94 },
  { subject: "化学", min: 55, q1: 66, median: 77, q3: 87, max: 96 },
];

interface SubjectScoreData {
  total: number;
  count: number;
}

interface ExamTypeScoreData {
  total: number;
  count: number;
}

const GradeAnalysis: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [showCharts, setShowCharts] = useState(false);
  const [selectedCharts, setSelectedCharts] = useState<string[]>(["distribution", "subject"]);
  const [customCharts, setCustomCharts] = useState<any[]>([]);

  const handleDataParsed = (parsedData: any[]) => {
    setData(parsedData);
    setShowCharts(true);
    
    // 自动生成基于数据的图表
    generateCustomCharts(parsedData);
  };

  // 根据导入的数据智能生成图表
  const generateCustomCharts = (parsedData: any[]) => {
    if (parsedData.length === 0) return;
    
    const generatedCharts = [];
    
    // 检查数据结构，识别可能的图表类型
    const firstRecord = parsedData[0];
    const fields = Object.keys(firstRecord);
    
    // 检查是否包含分数字段
    const scoreField = fields.find(f => 
      f.toLowerCase().includes('score') || 
      f.toLowerCase().includes('分数') || 
      f.toLowerCase().includes('成绩')
    );
    
    // 检查是否包含学科字段
    const subjectField = fields.find(f => 
      f.toLowerCase().includes('subject') || 
      f.toLowerCase().includes('科目') || 
      f.toLowerCase().includes('学科')
    );
    
    // 检查是否包含日期字段
    const dateField = fields.find(f => 
      f.toLowerCase().includes('date') || 
      f.toLowerCase().includes('日期') || 
      f.toLowerCase().includes('time') || 
      f.toLowerCase().includes('时间')
    );
    
    // 检查是否包含考试类型字段
    const examTypeField = fields.find(f => 
      f.toLowerCase().includes('type') || 
      f.toLowerCase().includes('类型') || 
      f.toLowerCase().includes('exam')
    );
    
    // 如果有分数和学科，生成学科成绩对比图
    if (scoreField && subjectField) {
      // 计算每个学科的平均分
      const subjectScores: Record<string, SubjectScoreData> = {};
      parsedData.forEach(record => {
        const subject = record[subjectField];
        const score = parseFloat(record[scoreField]);
        if (!isNaN(score)) {
          if (!subjectScores[subject]) {
            subjectScores[subject] = { total: score, count: 1 };
          } else {
            subjectScores[subject].total += score;
            subjectScores[subject].count += 1;
          }
        }
      });
      
      const subjectAverages = Object.entries(subjectScores).map(([subject, data]) => ({
        subject,
        averageScore: Math.round((data.total / data.count) * 10) / 10
      }));
      
      if (subjectAverages.length > 0) {
        generatedCharts.push({
          id: "subjectAverages",
          title: "各科目平均分",
          description: "各学科的平均成绩对比",
          component: (
            <AutoChart 
              data={subjectAverages}
              xKey="subject"
              yKeys={["averageScore"]}
              colors={["#B9FF66"]}
              chartType="bar"
              height={300}
            />
          )
        });
      }
    }
    
    // 如果有分数，生成分数分布图
    if (scoreField) {
      // 计算分数分布
      const scoreRanges = {
        "0-59": 0,
        "60-69": 0,
        "70-79": 0,
        "80-89": 0,
        "90-100": 0
      };
      
      parsedData.forEach(record => {
        const score = parseFloat(record[scoreField]);
        if (!isNaN(score)) {
          if (score < 60) scoreRanges["0-59"]++;
          else if (score < 70) scoreRanges["60-69"]++;
          else if (score < 80) scoreRanges["70-79"]++;
          else if (score < 90) scoreRanges["80-89"]++;
          else scoreRanges["90-100"]++;
        }
      });
      
      const scoreDistribution = Object.entries(scoreRanges).map(([range, count]) => ({
        range,
        count
      }));
      
      if (scoreDistribution.some(item => item.count > 0)) {
        generatedCharts.push({
          id: "scoreDistribution",
          title: "分数段分布",
          description: "学生成绩在各分数段的分布情况",
          component: (
            <AutoChart 
              data={scoreDistribution}
              xKey="range"
              yKeys={["count"]}
              colors={["#B9FF66"]}
              chartType="bar"
              height={300}
            />
          )
        });
      }
    }
    
    // 如果有分数和日期，生成成绩趋势图
    if (scoreField && dateField && subjectField) {
      // 按日期和学科分组，计算平均分趋势
      const dateScores: Record<string, Record<string, SubjectScoreData>> = {};
      
      parsedData.forEach(record => {
        const date = record[dateField];
        const subject = record[subjectField];
        const score = parseFloat(record[scoreField]);
        
        if (!isNaN(score) && date) {
          if (!dateScores[date]) {
            dateScores[date] = {};
          }
          
          if (!dateScores[date][subject]) {
            dateScores[date][subject] = { total: score, count: 1 };
          } else {
            dateScores[date][subject].total += score;
            dateScores[date][subject].count += 1;
          }
        }
      });
      
      // 提取唯一的学科
      const subjects = Array.from(new Set(parsedData.map(r => r[subjectField])));
      
      // 创建趋势数据
      const trendData = Object.entries(dateScores).map(([date, subjectData]) => {
        const result: any = { date };
        
        subjects.forEach(subject => {
          if (subjectData[subject]) {
            result[subject] = Math.round((subjectData[subject].total / subjectData[subject].count) * 10) / 10;
          } else {
            result[subject] = null; // 缺失数据
          }
        });
        
        return result;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (trendData.length > 1) {
        generatedCharts.push({
          id: "scoreTrend",
          title: "成绩趋势变化",
          description: "各学科成绩随时间的变化趋势",
          component: (
            <AutoChart 
              data={trendData}
              xKey="date"
              yKeys={subjects}
              chartType="line"
              height={300}
            />
          )
        });
      }
    }
    
    // 如果有分数和考试类型，生成考试类型对比图
    if (scoreField && examTypeField) {
      // 计算每种考试类型的平均分
      const examTypeScores: Record<string, ExamTypeScoreData> = {};
      
      parsedData.forEach(record => {
        const examType = record[examTypeField];
        const score = parseFloat(record[scoreField]);
        
        if (!isNaN(score) && examType) {
          if (!examTypeScores[examType]) {
            examTypeScores[examType] = { total: score, count: 1 };
          } else {
            examTypeScores[examType].total += score;
            examTypeScores[examType].count += 1;
          }
        }
      });
      
      const examTypeComparison = Object.entries(examTypeScores).map(([type, data]) => ({
        examType: type,
        averageScore: Math.round((data.total / data.count) * 10) / 10
      }));
      
      if (examTypeComparison.length > 1) {
        generatedCharts.push({
          id: "examTypeComparison",
          title: "考试类型成绩对比",
          description: "不同考试类型的平均成绩对比",
          component: (
            <AutoChart 
              data={examTypeComparison}
              xKey="examType"
              yKeys={["averageScore"]}
              colors={["#B9FF66"]}
              chartType="bar"
              height={300}
            />
          )
        });
      }
    }
    
    setCustomCharts(generatedCharts);
  };

  // 模拟成绩数据
  const mockGradeData = data.length > 0 ? data : [
    { studentId: "2024001", name: "张三", subject: "语文", score: 92, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024001", name: "张三", subject: "数学", score: 85, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024001", name: "张三", subject: "英语", score: 78, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024002", name: "李四", subject: "语文", score: 88, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024002", name: "李四", subject: "数学", score: 95, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024002", name: "李四", subject: "英语", score: 82, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024003", name: "王五", subject: "语文", score: 75, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024003", name: "王五", subject: "数学", score: 67, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024003", name: "王五", subject: "英语", score: 85, examDate: "2023-09-01", examType: "期中考试" },
  ];

  // 统计数据
  const scores = mockGradeData.map(item => item.score);
  const statData = {
    avg: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    max: Math.max(...scores),
    min: Math.min(...scores),
    passing: scores.filter(score => score >= 60).length,
    total: scores.length,
  };

  // 生成的图表组件
  const chartComponents = [
    <ScoreDistribution key="distribution" data={scoreDistributionData} />,
    <ScoreBoxPlot key="boxplot" data={boxPlotData} />
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">成绩分析</h1>
            <p className="text-gray-500 mt-1">
              导入和分析学生成绩数据，生成统计图表和报告
            </p>
          </div>
          
          <IntelligentFileParser onDataParsed={handleDataParsed} />
          
          {showCharts && (
            <>
              <StatisticsOverview {...statData} />
              
              <Tabs defaultValue="auto" className="mt-6">
                <TabsList>
                  <TabsTrigger value="auto">
                    <ChartBar className="h-4 w-4 mr-2" />
                    自动分析
                  </TabsTrigger>
                  <TabsTrigger value="custom">
                    <ChartBar className="h-4 w-4 mr-2" />
                    自定义图表
                  </TabsTrigger>
                  <TabsTrigger value="data">
                    <FileText className="h-4 w-4 mr-2" />
                    原始数据
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="auto" className="space-y-6 mt-4">
                  {customCharts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {customCharts.map((chart, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle>{chart.title}</CardTitle>
                            <CardDescription>{chart.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {chart.component}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ScoreDistribution data={scoreDistributionData} />
                      <ScoreBoxPlot data={boxPlotData} />
                    </div>
                  )}
                  
                  <AIDataAnalysis data={mockGradeData} charts={chartComponents} />
                </TabsContent>
                
                <TabsContent value="custom" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>自定义图表</CardTitle>
                      <CardDescription>选择您想要的图表类型进行分析</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                        {CHART_PRESETS.map(preset => (
                          <Button
                            key={preset.id}
                            variant={selectedCharts.includes(preset.id) ? "default" : "outline"}
                            className="justify-start gap-2"
                            onClick={() => {
                              if (selectedCharts.includes(preset.id)) {
                                setSelectedCharts(selectedCharts.filter(id => id !== preset.id));
                              } else {
                                setSelectedCharts([...selectedCharts, preset.id]);
                              }
                            }}
                          >
                            {preset.icon}
                            {preset.name}
                          </Button>
                        ))}
                      </div>
                      
                      <div className="space-y-4 mt-4">
                        {selectedCharts.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            请选择至少一种图表类型
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedCharts.includes('distribution') && (
                              <ScoreDistribution data={scoreDistributionData} />
                            )}
                            {selectedCharts.includes('boxplot') && (
                              <ScoreBoxPlot data={boxPlotData} />
                            )}
                            {/* 其他图表类型可以在这里添加 */}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="data" className="mt-4">
                  <GradeTable data={mockGradeData} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradeAnalysis;
