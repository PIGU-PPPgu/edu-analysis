import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, ArrowUpDown, Download, Filter, Ban, BarChart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

// 异常类型定义
type AnomalyType = "sudden_drop" | "sudden_increase" | "outlier_high" | "outlier_low" | "missing_data";

// 异常数据结构
interface Anomaly {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  subject: string;
  score: number;
  exam_date: string;
  exam_title: string;
  anomaly_type: AnomalyType;
  confidence: number; // 置信度
  description: string;
  previous_scores?: number[]; // 历史分数，用于显示趋势
}

// 异常类型映射及展示颜色
const ANOMALY_CONFIG: Record<AnomalyType, { label: string; color: string; description: string }> = {
  sudden_drop: {
    label: "成绩骤降",
    color: "bg-red-500",
    description: "相比历史成绩有显著下降"
  },
  sudden_increase: {
    label: "成绩骤升",
    color: "bg-amber-500",
    description: "相比历史成绩有显著上升"
  },
  outlier_high: {
    label: "异常高分",
    color: "bg-blue-500",
    description: "远高于该生历史水平或班级平均水平"
  },
  outlier_low: {
    label: "异常低分",
    color: "bg-purple-500",
    description: "远低于该生历史水平或班级平均水平"
  },
  missing_data: {
    label: "数据缺失",
    color: "bg-gray-500",
    description: "该生在此次考试中缺少成绩记录"
  }
};

// 模拟生成异常数据
const generateMockAnomalies = (count = 15): Anomaly[] => {
  const anomalyTypes: AnomalyType[] = ["sudden_drop", "sudden_increase", "outlier_high", "outlier_low", "missing_data"];
  const subjects = ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治"];
  const classNames = ["高一(1)班", "高一(2)班", "高二(1)班", "高二(2)班", "高三(1)班"];
  
  return Array.from({ length: count }, (_, i) => {
    const anomalyType = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const className = classNames[Math.floor(Math.random() * classNames.length)];
    
    // 根据异常类型生成不同的分数
    let score = 0;
    let description = "";
    let previousScores: number[] = [];
    
    switch(anomalyType) {
      case "sudden_drop":
        previousScores = [85, 82, 80, 78, 45];
        score = 45;
        description = `${subject}成绩从平均80分骤降到${score}分，下降幅度超过40%`;
        break;
      case "sudden_increase":
        previousScores = [65, 68, 70, 72, 95];
        score = 95;
        description = `${subject}成绩从平均68分骤升到${score}分，上升幅度超过35%`;
        break;
      case "outlier_high":
        score = 98;
        description = `${subject}成绩${score}分，超过班级平均分25分，与个人历史水平不符`;
        previousScores = [70, 72, 75, 68, 98];
        break;
      case "outlier_low":
        score = 35;
        description = `${subject}成绩${score}分，低于班级平均分30分，与个人历史水平不符`;
        previousScores = [70, 68, 65, 72, 35];
        break;
      case "missing_data":
        score = 0;
        description = `${subject}期末考试成绩缺失，建议核实情况`;
        break;
    }
    
    return {
      id: `anomaly-${i + 1}`,
      student_id: `S${10000 + Math.floor(Math.random() * 5000)}`,
      name: `学生${i + 1}`,
      class_name: className,
      subject: subject,
      score: score,
      exam_date: "2024-01-20",
      exam_title: "2023-2024学年第一学期期末考试",
      anomaly_type: anomalyType,
      confidence: 0.7 + Math.random() * 0.25, // 70%-95%的置信度
      description: description,
      previous_scores: previousScores
    };
  });
};

const AnomalyDetection: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [filteredAnomalies, setFilteredAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("latest");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedAnomalyType, setSelectedAnomalyType] = useState("all");
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);
  
  // 模拟加载异常数据
  useEffect(() => {
    const fetchAnomalies = async () => {
      setIsLoading(true);
      try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 生成模拟数据
        const mockData = generateMockAnomalies();
        setAnomalies(mockData);
        setFilteredAnomalies(mockData);
      } catch (error) {
        console.error("获取异常数据失败", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnomalies();
  }, []);
  
  // 应用筛选条件
  useEffect(() => {
    let filtered = [...anomalies];
    
    // 按班级筛选
    if (selectedClass !== "all") {
      filtered = filtered.filter(item => item.class_name === selectedClass);
    }
    
    // 按科目筛选
    if (selectedSubject !== "all") {
      filtered = filtered.filter(item => item.subject === selectedSubject);
    }
    
    // 按异常类型筛选
    if (selectedAnomalyType !== "all") {
      filtered = filtered.filter(item => item.anomaly_type === selectedAnomalyType);
    }
    
    // 按置信度筛选
    filtered = filtered.filter(item => item.confidence * 100 >= confidenceThreshold);
    
    // 只显示严重异常（成绩骤降和异常低分）
    if (showOnlyCritical) {
      filtered = filtered.filter(item => 
        item.anomaly_type === "sudden_drop" || item.anomaly_type === "outlier_low"
      );
    }
    
    setFilteredAnomalies(filtered);
  }, [
    anomalies,
    selectedClass,
    selectedSubject,
    selectedAnomalyType,
    confidenceThreshold,
    showOnlyCritical
  ]);
  
  // 获取唯一的班级列表
  const getUniqueClasses = () => {
    const classes = new Set(anomalies.map(item => item.class_name));
    return Array.from(classes);
  };
  
  // 获取唯一的科目列表
  const getUniqueSubjects = () => {
    const subjects = new Set(anomalies.map(item => item.subject));
    return Array.from(subjects);
  };
  
  // 导出异常报告
  const handleExportReport = () => {
    // 实际应用中这里应该生成并下载Excel或PDF报告
    console.log("导出异常报告", filteredAnomalies);
    // 导出成功提示
    alert("异常报告导出成功！");
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <span>成绩异常检测</span>
        </CardTitle>
        <CardDescription>
          智能分析识别成绩数据中的异常情况，帮助及时发现学生学习问题
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 筛选器部分 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <Label htmlFor="exam-filter">考试选择</Label>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger id="exam-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">最新考试</SelectItem>
                <SelectItem value="2023-term1-final">23-24学年第一学期期末</SelectItem>
                <SelectItem value="2023-term1-mid">23-24学年第一学期期中</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="class-filter">班级筛选</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger id="class-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有班级</SelectItem>
                {getUniqueClasses().map(className => (
                  <SelectItem key={className} value={className}>{className}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="subject-filter">科目筛选</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id="subject-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有科目</SelectItem>
                {getUniqueSubjects().map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="anomaly-type-filter">异常类型</Label>
            <Select value={selectedAnomalyType} onValueChange={setSelectedAnomalyType}>
              <SelectTrigger id="anomaly-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                {Object.entries(ANOMALY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="confidence-threshold">置信度阈值: {confidenceThreshold}%</Label>
            </div>
            <Slider
              id="confidence-threshold"
              defaultValue={[confidenceThreshold]}
              max={100}
              min={50}
              step={5}
              onValueChange={values => setConfidenceThreshold(values[0])}
              className="py-2"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Switch 
              id="critical-only" 
              checked={showOnlyCritical} 
              onCheckedChange={setShowOnlyCritical} 
            />
            <Label htmlFor="critical-only">只显示需要关注的严重异常</Label>
          </div>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleExportReport}
          >
            <Download className="h-4 w-4" />
            导出异常报告
          </Button>
        </div>
        
        {/* 统计摘要 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">成绩骤降</p>
                  <p className="text-2xl font-bold">
                    {filteredAnomalies.filter(a => a.anomaly_type === "sudden_drop").length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <ArrowUpDown className="h-4 w-4 text-red-500 transform rotate-180" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">成绩骤升</p>
                  <p className="text-2xl font-bold">
                    {filteredAnomalies.filter(a => a.anomaly_type === "sudden_increase").length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <ArrowUpDown className="h-4 w-4 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">异常分数</p>
                  <p className="text-2xl font-bold">
                    {filteredAnomalies.filter(a => 
                      a.anomaly_type === "outlier_high" || a.anomaly_type === "outlier_low"
                    ).length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Ban className="h-4 w-4 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">数据缺失</p>
                  <p className="text-2xl font-bold">
                    {filteredAnomalies.filter(a => a.anomaly_type === "missing_data").length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Filter className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredAnomalies.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {filteredAnomalies.map((anomaly, index) => (
                <Card key={anomaly.id} className="overflow-hidden">
                  <div className={`h-1 w-full ${ANOMALY_CONFIG[anomaly.anomaly_type].color}`} />
                  <CardContent className="p-4 pt-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{anomaly.class_name}</Badge>
                          <h3 className="font-semibold">{anomaly.name}</h3>
                          <span className="text-sm text-gray-500">{anomaly.student_id}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={`${ANOMALY_CONFIG[anomaly.anomaly_type].color} text-white`}
                          >
                            {ANOMALY_CONFIG[anomaly.anomaly_type].label}
                          </Badge>
                          <span className="font-medium">{anomaly.subject}</span>
                          {anomaly.score > 0 && (
                            <span className="font-medium">{anomaly.score}分</span>
                          )}
                          <Badge variant="outline" className="text-gray-500">
                            置信度: {Math.round(anomaly.confidence * 100)}%
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600">{anomaly.description}</p>
                      </div>
                      
                      {anomaly.previous_scores && anomaly.previous_scores.length > 0 && (
                        <div className="flex items-end gap-1 h-14 min-w-[150px]">
                          {anomaly.previous_scores.map((score, i) => {
                            const height = `${Math.min(Math.max(score, 10), 100) / 100 * 100}%`;
                            const isLast = i === anomaly.previous_scores!.length - 1;
                            return (
                              <div key={i} className="flex flex-col items-center">
                                <div 
                                  className={`w-4 ${isLast 
                                    ? anomaly.anomaly_type === 'sudden_drop' || anomaly.anomaly_type === 'outlier_low'
                                      ? 'bg-red-500'
                                      : 'bg-green-500'
                                    : 'bg-blue-400'
                                  }`}
                                  style={{ height }}
                                ></div>
                                <span className="text-[10px] text-gray-500 mt-1">{score}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700">未发现异常</h3>
            <p className="text-gray-500 max-w-md mt-2">
              {selectedClass !== 'all' || selectedSubject !== 'all' || selectedAnomalyType !== 'all' 
                ? '当前筛选条件下未发现异常数据，请尝试调整筛选条件' 
                : '当前考试中未发现需要关注的异常数据'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnomalyDetection; 