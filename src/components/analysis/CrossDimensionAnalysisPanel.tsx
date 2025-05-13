import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Loader2, Grid, BarChart3, Table as TableIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { gradeAnalysisService, ANALYSIS_DIMENSIONS, ANALYSIS_METRICS } from "@/services/gradeAnalysisService";
import PivotTable from "./utils/PivotTable";

// 模拟颜色方案
const COLORS = ["#4ade80", "#60a5fa", "#f97316", "#8b5cf6", "#ec4899", "#facc15"];

// 热力图组件
const HeatMap = ({ data, xField, yField, colorField }) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-500">暂无数据</div>;
  }

  const maxValue = Math.max(...data.map(d => d[colorField]));
  
  // 提取唯一的X和Y值
  const xValues = [...new Set(data.map(item => item[xField]))].sort();
  const yValues = [...new Set(data.map(item => item[yField]))].sort();
  
  return (
    <div className="overflow-x-auto">
      <Table className="border-collapse border border-gray-200">
        <TableHeader>
          <TableRow>
            <TableHead className="border bg-muted font-semibold">{getDimensionName(yField)} / {getDimensionName(xField)}</TableHead>
            {xValues.map(x => (
              <TableHead key={x} className="border bg-muted font-semibold text-center">{x}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {yValues.map(y => (
            <TableRow key={y}>
              <TableCell className="border font-medium bg-muted/50">{y}</TableCell>
              {xValues.map(x => {
                const item = data.find(d => d[xField] === x && d[yField] === y);
                const value = item ? item[colorField] : null;
                const intensity = value !== null ? value / maxValue : 0;
                const bgColor = `rgba(76, 175, 80, ${intensity.toFixed(2)})`;
                
                return (
                  <TableCell 
                    key={x} 
                    className="border text-center" 
                    style={{backgroundColor: bgColor}}
                  >
                    {value !== null ? formatValue(value, colorField) : '-'}
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

// 柱状图组件
const BarChartComponent = ({ data, xField, yField, groupField }) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-500">暂无数据</div>;
  }

  // 重新构造适合柱状图的数据格式
  const chartData = [];
  const xValues = [...new Set(data.map(item => item[xField]))];
  const groupValues = groupField ? [...new Set(data.map(item => item[groupField]))] : [];

  xValues.forEach(x => {
    const entry = { name: x };
    
    if (groupField) {
      // 分组柱状图
      groupValues.forEach(group => {
        const item = data.find(d => d[xField] === x && d[groupField] === group);
        entry[group] = item ? item[yField] : 0;
      });
    } else {
      // 普通柱状图
      const item = data.find(d => d[xField] === x);
      entry[yField] = item ? item[yField] : 0;
    }
    
    chartData.push(entry);
  });

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={80} 
            tick={{ fontSize: 12 }} 
          />
          <YAxis />
          <Tooltip formatter={(value) => [formatValue(value, yField), getMetricName(yField)]} />
          <Legend />
          
          {groupField ? (
            // 分组柱状图
            groupValues.map((group, index) => (
              <Bar 
                key={group} 
                dataKey={group} 
                name={group} 
                fill={COLORS[index % COLORS.length]} 
                barSize={20}
              />
            ))
          ) : (
            // 普通柱状图
            <Bar 
              dataKey={yField} 
              name={getMetricName(yField)} 
              fill="#4ade80" 
              barSize={30}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 辅助函数
const getDimensionName = (dimId) => {
  const dim = ANALYSIS_DIMENSIONS.find(d => d.id === dimId);
  return dim ? dim.name : dimId;
};

const getMetricName = (metricId) => {
  const metric = ANALYSIS_METRICS.find(m => m.id === metricId);
  return metric ? metric.name : metricId;
};

const formatValue = (value, metricId) => {
  if (metricId.includes('rate')) {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (typeof value === 'number') {
    return value.toFixed(1);
  }
  return value;
};

// 主组件
const CrossDimensionAnalysisPanel = () => {
  const [rowDimension, setRowDimension] = useState("class_name");
  const [colDimension, setColDimension] = useState("subject");
  const [metric, setMetric] = useState("avg_score");
  const [chartType, setChartType] = useState("pivot");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);

  // 获取交叉分析数据
  useEffect(() => {
    const fetchCrossDimensionData = async () => {
      setIsLoading(true);
      try {
        // 调用服务获取数据
        const result = await gradeAnalysisService.getCrossDimensionData(
          rowDimension,
          colDimension,
          metric
        );
        setData(result);
      } catch (error) {
        console.error("获取交叉维度分析数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCrossDimensionData();
  }, [rowDimension, colDimension, metric]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>多维交叉分析</CardTitle>
        <CardDescription>
          选择不同维度和指标进行交叉分析，探索数据间的关联关系
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="w-full md:w-[calc(33%-1rem)]">
            <label className="block text-sm font-medium mb-1 text-gray-700">行维度</label>
            <Select value={rowDimension} onValueChange={setRowDimension}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_DIMENSIONS.map(dim => (
                  <SelectItem key={dim.id} value={dim.id}>{dim.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-[calc(33%-1rem)]">
            <label className="block text-sm font-medium mb-1 text-gray-700">列维度</label>
            <Select value={colDimension} onValueChange={setColDimension}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_DIMENSIONS.filter(d => d.id !== rowDimension).map(dim => (
                  <SelectItem key={dim.id} value={dim.id}>{dim.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-[calc(33%-1rem)]">
            <label className="block text-sm font-medium mb-1 text-gray-700">分析指标</label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_METRICS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Tabs value={chartType} onValueChange={setChartType}>
          <TabsList className="mb-4">
            <TabsTrigger value="pivot" className="flex items-center gap-1">
              <TableIcon className="h-4 w-4" />
              <span>数据表</span>
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span>柱状图</span>
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-1">
              <Grid className="h-4 w-4" />
              <span>热力图</span>
            </TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                <p className="text-sm text-gray-500">加载中...</p>
              </div>
            </div>
          ) : (
            <>
              <TabsContent value="pivot" className="pt-2">
                <PivotTable 
                  data={data} 
                  rowKey={rowDimension} 
                  colKey={colDimension} 
                  valueKey={metric} 
                  formatFn={(val) => formatValue(val, metric)}
                />
              </TabsContent>
              
              <TabsContent value="bar" className="pt-2">
                <BarChartComponent 
                  data={data} 
                  xField={rowDimension} 
                  yField={metric} 
                  groupField={colDimension} 
                />
              </TabsContent>
              
              <TabsContent value="heatmap" className="pt-2">
                <HeatMap 
                  data={data} 
                  xField={colDimension} 
                  yField={rowDimension} 
                  colorField={metric} 
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CrossDimensionAnalysisPanel; 