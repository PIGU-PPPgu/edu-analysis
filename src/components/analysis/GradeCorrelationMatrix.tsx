import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Grid, TableIcon, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import useCachedQuery from '@/hooks/useCachedQuery';

// 相关性矩阵数据类型
interface CorrelationItem {
  class_id: string;
  subject_a: string;
  subject_b: string;
  correlation_coefficient: number;
}

interface ProcessedCorrelationData {
  subjects: string[];
  correlations: number[][];
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

// 格式化相关系数显示
const formatCorrelation = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }
  return value.toFixed(2);
};

// 处理原始数据，转换为热力图可用格式
const processCorrelationData = (data: CorrelationItem[]): ProcessedCorrelationData => {
  // 提取所有唯一学科
  const uniqueSubjects = Array.from(
    new Set([
      ...data.map(item => item.subject_a),
      ...data.map(item => item.subject_b)
    ])
  ).sort();
  
  // 创建相关性矩阵
  const correlations = Array(uniqueSubjects.length).fill(0)
    .map(() => Array(uniqueSubjects.length).fill(0));
  
  // 填充矩阵
  for (let i = 0; i < uniqueSubjects.length; i++) {
    for (let j = 0; j < uniqueSubjects.length; j++) {
      if (i === j) {
        // 对角线上的值为1（自相关）
        correlations[i][j] = 1;
      } else {
        // 查找相关性记录
        const record = data.find(
          item => 
            (item.subject_a === uniqueSubjects[i] && item.subject_b === uniqueSubjects[j]) ||
            (item.subject_a === uniqueSubjects[j] && item.subject_b === uniqueSubjects[i])
        );
        
        if (record) {
          correlations[i][j] = record.correlation_coefficient;
        }
      }
    }
  }
  
  return { subjects: uniqueSubjects, correlations };
};

// 导出数据为CSV
const exportToCSV = (subjects: string[], correlations: number[][]): void => {
  // 创建CSV内容
  let csvContent = "科目,";
  csvContent += subjects.join(",") + "\n";
  
  for (let i = 0; i < subjects.length; i++) {
    csvContent += subjects[i] + ",";
    csvContent += correlations[i].map(val => formatCorrelation(val)).join(",") + "\n";
  }
  
  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `学科相关性矩阵_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast.success("相关性数据导出成功");
};

interface GradeCorrelationMatrixProps {
  classId: string;
}

const GradeCorrelationMatrix: React.FC<GradeCorrelationMatrixProps> = ({ classId }) => {
  const [activeTab, setActiveTab] = useState<string>("matrix");
  const [processedData, setProcessedData] = useState<ProcessedCorrelationData | null>(null);

  // 使用缓存钩子获取相关性数据
  const {
    data: correlationData,
    loading,
    error,
    refetch
  } = useCachedQuery<CorrelationItem[]>({
    cacheKey: `subject_correlation_${classId}`,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_class_subject_correlation')
        .select('*')
        .eq('class_id', classId);
      
      if (error) throw error;
      return data || [];
    },
    cacheDuration: 30 * 60 * 1000, // 30分钟缓存
    useServerCache: true
  });

  // 处理数据
  useEffect(() => {
    if (correlationData && correlationData.length > 0) {
      setProcessedData(processCorrelationData(correlationData));
    }
  }, [correlationData]);

  // 骨架屏
  const renderSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-[250px]" />
      <Skeleton className="h-4 w-[300px]" />
      <Skeleton className="h-[300px] mt-4 rounded-lg" />
    </div>
  );

  // 渲染相关性矩阵表格
  const renderCorrelationMatrix = () => {
    if (!processedData) return null;
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 border bg-gray-50">学科</th>
              {processedData.subjects.map(subject => (
                <th key={subject} className="p-2 border bg-gray-50">{subject}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedData.subjects.map((subjectRow, rowIndex) => (
              <tr key={subjectRow}>
                <th className="p-2 border bg-gray-50 text-left">{subjectRow}</th>
                {processedData.subjects.map((subjectCol, colIndex) => {
                  const value = processedData.correlations[rowIndex][colIndex];
                  const backgroundColor = getCorrelationColor(value);
                  const textColor = Math.abs(value) > 0.6 ? "white" : "black";
                  
                  return (
                    <td 
                      key={`${subjectRow}-${subjectCol}`} 
                      className="p-2 border text-center"
                      style={{ backgroundColor, color: textColor }}
                      title={`${subjectRow} 与 ${subjectCol} 的相关系数: ${formatCorrelation(value)}`}
                    >
                      {formatCorrelation(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 渲染相关性强度表格
  const renderCorrelationStrengthTable = () => {
    if (!processedData) return null;
    
    // 提取非对角线元素并排序
    const correlationPairs = [];
    
    for (let i = 0; i < processedData.subjects.length; i++) {
      for (let j = i + 1; j < processedData.subjects.length; j++) {
        correlationPairs.push({
          subject1: processedData.subjects[i],
          subject2: processedData.subjects[j],
          correlation: processedData.correlations[i][j]
        });
      }
    }
    
    // 按相关性绝对值排序
    correlationPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    
    const getCorrelationDescription = (value: number): string => {
      const level = CORRELATION_LEVELS.find(level => 
        value >= level.min && value < level.max
      );
      return level ? level.label : "未知相关性";
    };
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left w-1/4">科目1</th>
              <th className="p-2 text-left w-1/4">科目2</th>
              <th className="p-2 text-left w-1/4">相关系数</th>
              <th className="p-2 text-left w-1/4">相关性描述</th>
            </tr>
          </thead>
          <tbody>
            {correlationPairs.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                <td className="p-2">{item.subject1}</td>
                <td className="p-2">{item.subject2}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span>{formatCorrelation(item.correlation)}</span>
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: getCorrelationColor(item.correlation) }}
                    ></div>
                  </div>
                </td>
                <td className="p-2">{getCorrelationDescription(item.correlation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 渲染相关性图例
  const renderCorrelationLegend = () => (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
      {CORRELATION_LEVELS.map((level, index) => (
        <div key={index} className="flex items-center">
          <div 
            className="w-4 h-4 mr-1 rounded-sm" 
            style={{ backgroundColor: level.color }}
          ></div>
          <span>{level.label} ({level.min.toFixed(1)}~{level.max.toFixed(1)})</span>
        </div>
      ))}
    </div>
  );
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>学科相关性分析</CardTitle>
          <CardDescription>
            展示各学科成绩之间的相关程度，相关系数范围：-1（完全负相关）到 1（完全正相关）
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {!loading && processedData && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportToCSV(processedData.subjects, processedData.correlations)}
            >
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          renderSkeleton()
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>获取数据失败</AlertTitle>
            <AlertDescription>
              {error.message || '无法加载学科相关性数据，请稍后重试'}
            </AlertDescription>
          </Alert>
        ) : !processedData || processedData.subjects.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-gray-500">
            暂无相关性数据
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="matrix">
                  <Grid className="h-4 w-4 mr-2" />
                  相关性矩阵
                </TabsTrigger>
                <TabsTrigger value="table">
                  <TableIcon className="h-4 w-4 mr-2" />
                  相关性排序
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="matrix" className="mt-0">
                {renderCorrelationMatrix()}
              </TabsContent>
              
              <TabsContent value="table" className="mt-0">
                {renderCorrelationStrengthTable()}
              </TabsContent>
            </Tabs>
            
            {renderCorrelationLegend()}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GradeCorrelationMatrix; 