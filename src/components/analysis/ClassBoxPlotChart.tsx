import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Rectangle,
  ReferenceLine,
  ErrorBar
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// 箱线图数据类型
interface BoxPlotData {
  subject: string;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  mean: number;
  outliers: Array<{
    value: number;
    studentName: string;
    studentId: string;
  }>;
}

interface ClassBoxPlotChartProps {
  examId?: string;
}

// 自定义箱线图组件
const BoxPlot = (props: any) => {
  const { x, y, width, height, q1, q3, median, min, max } = props;
  const strokeWidth = 2;

  return (
    <>
      {/* 最小值到最大值的垂直线 */}
      <line
        stroke="#666"
        strokeWidth={strokeWidth}
        strokeDasharray="3 3"
        x1={x + width / 2}
        y1={y + height - (height * min) / 100}
        x2={x + width / 2}
        y2={y + height - (height * max) / 100}
      />
      
      {/* 箱体 */}
      <rect
        fill="#8884d8"
        opacity={0.6}
        x={x + width * 0.25}
        y={y + height - (height * q3) / 100}
        width={width * 0.5}
        height={(height * (q3 - q1)) / 100}
      />
      
      {/* 中位数线 */}
      <line
        stroke="#333"
        strokeWidth={strokeWidth + 1}
        x1={x + width * 0.25}
        y1={y + height - (height * median) / 100}
        x2={x + width * 0.75}
        y2={y + height - (height * median) / 100}
      />
      
      {/* 最小值横线 */}
      <line
        stroke="#666"
        strokeWidth={strokeWidth}
        x1={x + width * 0.35}
        y1={y + height - (height * min) / 100}
        x2={x + width * 0.65}
        y2={y + height - (height * min) / 100}
      />
      
      {/* 最大值横线 */}
      <line
        stroke="#666"
        strokeWidth={strokeWidth}
        x1={x + width * 0.35}
        y1={y + height - (height * max) / 100}
        x2={x + width * 0.65}
        y2={y + height - (height * max) / 100}
      />
      
      {/* 平均值点 */}
      {props.mean && (
        <circle
          fill="red"
          cx={x + width * 0.5}
          cy={y + height - (height * props.mean) / 100}
          r={3}
        />
      )}
    </>
  );
};

// 自定义提示框
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border shadow-md rounded-md">
        <p className="font-bold">{data.subject}</p>
        <p>最小值: {data.min}</p>
        <p>第一四分位数 (Q1): {data.q1}</p>
        <p>中位数: {data.median}</p>
        <p>第三四分位数 (Q3): {data.q3}</p>
        <p>最大值: {data.max}</p>
        <p className="text-red-500">平均值: {data.mean.toFixed(1)}</p>
        {data.outliers && data.outliers.length > 0 && (
          <div className="mt-2">
            <p className="font-semibold">异常值 ({data.outliers.length}):</p>
            <ul className="pl-4 text-sm text-gray-600">
              {data.outliers.map((outlier: any, index: number) => (
                <li key={index}>
                  {outlier.studentName}: {outlier.value}分
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const ClassBoxPlotChart: React.FC<ClassBoxPlotChartProps> = ({ examId }) => {
  const [selectedClass, setSelectedClass] = useState<string>("全部班级");
  const [boxPlotData, setBoxPlotData] = useState<BoxPlotData[]>([]);
  const [outliersList, setOutliersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [classOptions, setClassOptions] = useState<string[]>([]);

  // 模拟生成箱线图数据
  const generateMockBoxPlotData = (className: string) => {
    const subjects = ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治"];
    
    return subjects.map(subject => {
      // 基础分数范围，使不同科目有特色
      let baseMin, baseMax;
      
      switch (subject) {
        case "语文":
          baseMin = 65;
          baseMax = 85;
          break;
        case "数学":
          baseMin = 60;
          baseMax = 90;
          break;
        case "英语":
          baseMin = 70;
          baseMax = 95;
          break;
        case "物理":
        case "化学":
          baseMin = 55;
          baseMax = 88;
          break;
        default:
          baseMin = 60;
          baseMax = 85;
      }
      
      // 随机生成箱线图所需数据
      const min = Math.max(baseMin - Math.random() * 15, 20);
      const max = Math.min(baseMax + Math.random() * 10, 100);
      const q1 = min + (max - min) * 0.25 + Math.random() * 5;
      const median = min + (max - min) * 0.5 + Math.random() * 5;
      const q3 = min + (max - min) * 0.75 + Math.random() * 5;
      const mean = (min + max) / 2 + (Math.random() - 0.5) * 5;
      
      // 生成一些异常值
      const outliers = [];
      const outlierCount = Math.floor(Math.random() * 4); // 0到3个异常值
      
      for (let i = 0; i < outlierCount; i++) {
        // 50%的概率是高分异常，50%是低分异常
        const isHighOutlier = Math.random() > 0.5;
        const outlierValue = isHighOutlier 
          ? Math.min(max + 5 + Math.random() * 10, 100) 
          : Math.max(min - 5 - Math.random() * 20, 0);
          
        outliers.push({
          value: Math.round(outlierValue),
          studentName: `学生${Math.floor(Math.random() * 50) + 1}`,
          studentId: `S${10000 + Math.floor(Math.random() * 1000)}`
        });
      }
      
      return {
        subject,
        min: Math.round(min),
        max: Math.round(max),
        median: Math.round(median),
        q1: Math.round(q1),
        q3: Math.round(q3),
        mean: Math.round(mean * 10) / 10,
        outliers
      };
    });
  };

  // 加载数据
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 模拟班级列表
        const classes = ["全部班级", "高一(1)班", "高一(2)班", "高二(1)班", "高二(2)班", "高三(1)班"];
        setClassOptions(classes);
        
        // 生成箱线图数据
        const mockData = generateMockBoxPlotData(selectedClass);
        setBoxPlotData(mockData);
        
        // 提取所有异常值到列表
        const allOutliers = mockData.reduce((acc, subject) => {
          return acc.concat(
            subject.outliers.map(outlier => ({
              ...outlier,
              subject: subject.subject
            }))
          );
        }, []);
        
        setOutliersList(allOutliers);
      } catch (error) {
        console.error("获取箱线图数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [examId, selectedClass]);

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
  };

  const handleExportData = () => {
    // 实际应用中应该导出为CSV或Excel
    console.log("导出箱线图数据", boxPlotData);
    alert("箱线图数据导出成功");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>班级学科箱线图分析</CardTitle>
        <CardDescription>
          展示各科目成绩分布，帮助发现数据异常和极端值
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="w-full md:w-[calc(50%-1rem)]">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              选择班级
            </label>
            <Select value={selectedClass} onValueChange={handleClassChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map(className => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[calc(50%-1rem)] flex items-end">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4" />
              导出分析数据
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-sm text-gray-500">加载班级成绩分析数据中...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={boxPlotData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="subject"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine y={60} stroke="red" strokeWidth={1} strokeDasharray="3 3">
                    <Label value="及格线" position="insideBottomRight" />
                  </ReferenceLine>
                  <Bar
                    dataKey="median"
                    name="中位数"
                    fill="rgba(0,0,0,0)"
                    shape={<BoxPlot />}
                  />
                  <Line
                    dataKey="mean"
                    name="平均分"
                    stroke="red"
                    dot={{ fill: 'red', r: 4 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 箱线图解释 */}
            <div className="bg-gray-50 p-4 rounded-lg flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-12 bg-[#8884d8] opacity-60"></div>
                <span className="text-sm">
                  箱体 (Q1-Q3: 中间50%的数据)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-8 border-t-2 border-black"></div>
                <span className="text-sm">中位数</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-0 border-l border-dashed border-gray-600"></div>
                <span className="text-sm">数据范围 (最小值-最大值)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full w-3 h-3 bg-red-500"></div>
                <span className="text-sm">平均分</span>
              </div>
            </div>

            {/* 异常值表格 */}
            {outliersList.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-3">异常值分析</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>学生</TableHead>
                      <TableHead>学号</TableHead>
                      <TableHead>科目</TableHead>
                      <TableHead>分数</TableHead>
                      <TableHead>异常类型</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outliersList.map((outlier, index) => {
                      const isHighOutlier = outlier.value > boxPlotData.find(
                        (subject) => subject.subject === outlier.subject
                      ).q3 + 15;
                      return (
                        <TableRow key={index}>
                          <TableCell>{outlier.studentName}</TableCell>
                          <TableCell>{outlier.studentId}</TableCell>
                          <TableCell>{outlier.subject}</TableCell>
                          <TableCell>{outlier.value}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                isHighOutlier 
                                  ? "bg-blue-100 text-blue-800 border-blue-300" 
                                  : "bg-red-100 text-red-800 border-red-300"
                              }
                            >
                              {isHighOutlier ? "异常高分" : "异常低分"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassBoxPlotChart; 