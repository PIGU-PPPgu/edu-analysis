import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Grid, TableIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 相关性矩阵数据类型
interface CorrelationData {
  subjects: string[];
  correlations: number[][];  // 相关系数矩阵
  pValues?: number[][];      // P值矩阵（可选）
}

// 等级说明
const CORRELATION_LEVELS = [
  { min: 0.8, max: 1.0, label: "极强正相关", color: "#ef4444" },
  { min: 0.6, max: 0.8, label: "强正相关", color: "#f97316" },
  { min: 0.4, max: 0.6, label: "中等正相关", color: "#f59e0b" },
  { min: 0.2, max: 0.4, label: "弱正相关", color: "#facc15" },
  { min: -0.2, max: 0.2, label: "几乎无相关", color: "#a3e635" },
  { min: -0.4, max: -0.2, label: "弱负相关", color: "#84cc16" },
  { min: -0.6, max: -0.4, label: "中等负相关", color: "#22c55e" },
  { min: -0.8, max: -0.6, label: "强负相关", color: "#10b981" },
  { min: -1.0, max: -0.8, label: "极强负相关", color: "#06b6d4" },
];

// 获取相关性对应的颜色
const getCorrelationColor = (value: number): string => {
  // 处理缺失值
  if (value === null || value === undefined || isNaN(value)) {
    return "#f1f5f9"; // 默认浅灰色
  }
  
  // 处理极端值
  if (value > 1) value = 1;
  if (value < -1) value = -1;
  
  // 查找对应的级别
  const level = CORRELATION_LEVELS.find(level => 
    value >= level.min && value < level.max
  );
  
  return level ? level.color : "#f1f5f9";
};

// 生成模拟相关性数据
const generateMockCorrelationData = (): CorrelationData => {
  const subjects = ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治"];
  
  // 初始化相关系数矩阵，对角线为1.0
  const correlations: number[][] = Array(subjects.length).fill(0)
    .map(() => Array(subjects.length).fill(0));
  
  // 填充相关系数（模拟值）
  for (let i = 0; i < subjects.length; i++) {
    for (let j = 0; j < subjects.length; j++) {
      if (i === j) {
        // 对角线元素为1.0
        correlations[i][j] = 1.0;
      } else if (j > i) {
        // 生成-0.8到0.9范围的相关系数
        const base = Math.random() * 1.7 - 0.8;
        
        // 添加一些科目间的特定模式
        let correlation = base;
        
        // 语文和英语有一定正相关
        if ((subjects[i] === "语文" && subjects[j] === "英语") || 
            (subjects[i] === "英语" && subjects[j] === "语文")) {
          correlation = 0.5 + Math.random() * 0.2;
        }
        
        // 数学和物理有较强正相关
        if ((subjects[i] === "数学" && subjects[j] === "物理") || 
            (subjects[i] === "物理" && subjects[j] === "数学")) {
          correlation = 0.7 + Math.random() * 0.25;
        }
        
        // 化学和生物有中等正相关
        if ((subjects[i] === "化学" && subjects[j] === "生物") || 
            (subjects[i] === "生物" && subjects[j] === "化学")) {
          correlation = 0.5 + Math.random() * 0.2;
        }
        
        // 历史和政治有中等正相关
        if ((subjects[i] === "历史" && subjects[j] === "政治") || 
            (subjects[i] === "政治" && subjects[j] === "历史")) {
          correlation = 0.6 + Math.random() * 0.2;
        }
        
        correlations[i][j] = Number(correlation.toFixed(2));
        
        // 矩阵对称
        correlations[j][i] = correlations[i][j];
      }
    }
  }
  
  return { subjects, correlations };
};

// 格式化相关系数显示
const formatCorrelation = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }
  return value.toFixed(2);
};

// 科目相关性热力图组件
const CorrelationHeatmap: React.FC<{ data: CorrelationData }> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <Table className="border-collapse">
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold border text-center bg-muted">科目</TableHead>
            {data.subjects.map((subject, index) => (
              <TableHead key={index} className="font-bold border text-center bg-muted min-w-[80px]">
                {subject}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.subjects.map((rowSubject, rowIndex) => (
            <TableRow key={rowIndex}>
              <TableCell className="font-semibold border text-center bg-muted">
                {rowSubject}
              </TableCell>
              {data.subjects.map((colSubject, colIndex) => {
                const correlation = data.correlations[rowIndex][colIndex];
                const backgroundColor = getCorrelationColor(correlation);
                const textColor = Math.abs(correlation) > 0.6 ? "white" : "black";
                
                return (
                  <TableCell
                    key={colIndex}
                    className="border text-center py-4"
                    style={{ 
                      backgroundColor, 
                      color: textColor
                    }}
                  >
                    {formatCorrelation(correlation)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// 相关性强度表格组件
const CorrelationStrengthTable: React.FC<{ data: CorrelationData }> = ({ data }) => {
  // 提取非对角线元素并排序
  const extractCorrelations = () => {
    const result: Array<{ subject1: string; subject2: string; correlation: number }> = [];
    
    for (let i = 0; i < data.subjects.length; i++) {
      for (let j = i + 1; j < data.subjects.length; j++) {
        result.push({
          subject1: data.subjects[i],
          subject2: data.subjects[j],
          correlation: data.correlations[i][j]
        });
      }
    }
    
    // 按相关性绝对值排序
    return result.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  };
  
  const sortedCorrelations = extractCorrelations();
  
  const getCorrelationDescription = (value: number): string => {
    const level = CORRELATION_LEVELS.find(level => 
      value >= level.min && value < level.max
    );
    return level ? level.label : "未知相关性";
  };
  
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted">
          <TableHead className="w-1/4">科目1</TableHead>
          <TableHead className="w-1/4">科目2</TableHead>
          <TableHead className="w-1/4">相关系数</TableHead>
          <TableHead className="w-1/4">相关性描述</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedCorrelations.map((item, index) => (
          <TableRow key={index} className={index % 2 === 0 ? "bg-muted/20" : ""}>
            <TableCell>{item.subject1}</TableCell>
            <TableCell>{item.subject2}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span>{formatCorrelation(item.correlation)}</span>
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: getCorrelationColor(item.correlation) }}
                ></div>
              </div>
            </TableCell>
            <TableCell>{getCorrelationDescription(item.correlation)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// 相关性解释组件
const CorrelationLegend: React.FC = () => {
  return (
    <div className="bg-muted/20 p-4 rounded-lg space-y-2">
      <h3 className="font-medium mb-3">相关系数解释：</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {CORRELATION_LEVELS.map((level, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: level.color }}
            ></div>
            <span className="text-sm">
              {level.label} ({level.min.toFixed(1)} ~ {level.max.toFixed(1)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const GradeCorrelationMatrix: React.FC = () => {
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [examFilter, setExamFilter] = useState("latest");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("heatmap");
  
  useEffect(() => {
    const fetchCorrelationData = async () => {
      setIsLoading(true);
      try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // 生成模拟数据
        const mockData = generateMockCorrelationData();
        setCorrelationData(mockData);
      } catch (error) {
        console.error("获取相关性数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCorrelationData();
  }, [examFilter, gradeFilter]);
  
  const handleExportData = () => {
    // 实际应用中应该导出为CSV或Excel
    console.log("导出相关性数据", correlationData);
    alert("相关性数据导出成功");
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid className="h-5 w-5 text-blue-500" />
          科目相关性分析
        </CardTitle>
        <CardDescription>
          分析不同科目成绩之间的相关关系，发现学科之间的内在联系
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-gray-700">考试选择</label>
            <Select value={examFilter} onValueChange={setExamFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">最新考试</SelectItem>
                <SelectItem value="2023-term1-final">23-24学年第一学期期末</SelectItem>
                <SelectItem value="2023-term1-mid">23-24学年第一学期期中</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-gray-700">年级筛选</label>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部年级</SelectItem>
                <SelectItem value="grade1">高一</SelectItem>
                <SelectItem value="grade2">高二</SelectItem>
                <SelectItem value="grade3">高三</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button 
              variant="outline"
              className="flex items-center gap-2 h-10"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4" />
              导出数据
            </Button>
          </div>
        </div>
        
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Grid className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700">关于相关性分析</AlertTitle>
          <AlertDescription className="text-blue-600">
            <p>相关性系数范围从-1到1，表示两个科目成绩的关联程度。系数越接近1表示正相关越强（一个科目分数高，另一个也高），越接近-1表示负相关越强（一个科目分数高，另一个低）。</p>
          </AlertDescription>
        </Alert>
        
        <Tabs value={viewMode} onValueChange={setViewMode} className="mb-6">
          <TabsList>
            <TabsTrigger value="heatmap" className="flex items-center gap-1">
              <Grid className="h-4 w-4" />
              热力图
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-1">
              <TableIcon className="h-4 w-4" />
              列表视图
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-sm text-gray-500">分析科目相关性数据中...</p>
            </div>
          </div>
        ) : correlationData ? (
          <div className="space-y-6">
            <TabsContent value="heatmap" className="mt-0">
              <CorrelationHeatmap data={correlationData} />
            </TabsContent>
            
            <TabsContent value="table" className="mt-0">
              <CorrelationStrengthTable data={correlationData} />
            </TabsContent>
            
            <CorrelationLegend />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">暂无相关性数据</div>
        )}
      </CardContent>
    </Card>
  );
};

export default GradeCorrelationMatrix; 