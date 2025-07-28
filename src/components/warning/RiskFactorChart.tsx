import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LabelList,
  LineChart,
  Line,
  PieChart,
  Pie,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SlidersHorizontal,
  Info,
  ArrowUpDown,
  Download,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Filter,
  Expand,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// 组件属性接口
interface RiskFactorChartProps {
  data?: Array<{
    factor: string;
    count: number;
    percentage: number;
    trend?: number[];
    category?: string;
    severity?: string;
  }>;
  className?: string;
  enableDrillDown?: boolean;
  enableExport?: boolean;
  showTrendAnalysis?: boolean;
  onFactorClick?: (factor: string) => void;
}

// 图表类型枚举
type ChartType = "bar" | "line" | "pie";

// 默认模拟数据（增强版）
const defaultRiskFactorData = [
  {
    factor: "期中考试成绩下降",
    count: 27,
    percentage: 35,
    trend: [20, 25, 32, 35, 38, 35],
    category: "学业表现",
    severity: "high",
  },
  {
    factor: "作业完成率低",
    count: 24,
    percentage: 31,
    trend: [28, 30, 29, 31, 33, 31],
    category: "学习习惯",
    severity: "high",
  },
  {
    factor: "课堂参与度不足",
    count: 18,
    percentage: 23,
    trend: [25, 24, 22, 23, 24, 23],
    category: "课堂表现",
    severity: "medium",
  },
  {
    factor: "缺交作业次数增加",
    count: 12,
    percentage: 15,
    trend: [18, 16, 14, 15, 16, 15],
    category: "学习习惯",
    severity: "medium",
  },
  {
    factor: "考试科目成绩不均衡",
    count: 8,
    percentage: 10,
    trend: [12, 11, 10, 10, 9, 10],
    category: "学业表现",
    severity: "low",
  },
];

// 增强的自定义工具提示组件
const CustomTooltip = ({ active, payload, label, showTrend = false }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg text-sm max-w-xs">
        <p className="font-medium text-gray-800 mb-2">{`${label}`}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-gray-700">
            <span>发生次数:</span>
            <span className="font-medium">{data.count}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-gray-700">
            <span>影响占比:</span>
            <span className="font-medium">{payload[0].value}%</span>
          </div>
          {data.category && (
            <div className="flex items-center justify-between gap-4 text-gray-700">
              <span>分类:</span>
              <Badge variant="outline" className="text-xs">
                {data.category}
              </Badge>
            </div>
          )}
          {data.severity && (
            <div className="flex items-center justify-between gap-4 text-gray-700">
              <span>严重程度:</span>
              <Badge
                variant={
                  data.severity === "high"
                    ? "destructive"
                    : data.severity === "medium"
                      ? "default"
                      : "secondary"
                }
                className="text-xs"
              >
                {data.severity === "high"
                  ? "高"
                  : data.severity === "medium"
                    ? "中"
                    : "低"}
              </Badge>
            </div>
          )}
          {showTrend && data.trend && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-500">最近6周趋势</span>
              <div className="flex items-center gap-1 mt-1">
                {data.trend.map((value: number, index: number) => (
                  <div
                    key={index}
                    className="h-1 w-4 bg-gray-200 rounded"
                    style={{
                      backgroundColor: `rgba(99, 102, 241, ${value / Math.max(...data.trend)})`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-500 flex items-center">
            <Info className="h-3 w-3 mr-1" />
            {getRiskLevelText(payload[0].value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// 获取风险级别文本
const getRiskLevelText = (value: number) => {
  if (value >= 30) return "高影响因素，需优先干预";
  if (value >= 20) return "中等影响因素，需关注";
  return "低影响因素，建议监控";
};

// 获取风险级别颜色
const getRiskLevelColor = (value: number) => {
  if (value >= 30) return "#ef4444";
  if (value >= 20) return "#f59e0b";
  if (value >= 10) return "#3b82f6";
  return "#a3a3a3";
};

// 风险级别图例组件
const RiskLevelLegend = () => (
  <div className="flex flex-wrap justify-center gap-3 mt-4">
    <Badge className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
      <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
      高影响因素
    </Badge>
    <Badge className="bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100">
      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
      中影响因素
    </Badge>
    <Badge className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100">
      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
      低影响因素
    </Badge>
  </div>
);

// 数据导出功能
const exportData = (data: any[], filename: string) => {
  const csvContent = [
    ["风险因素", "发生次数", "影响占比(%)", "分类", "严重程度"].join(","),
    ...data.map((item) =>
      [
        `"${item.factor}"`,
        item.count,
        item.percentage,
        item.category || "",
        item.severity || "",
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 趋势分析组件
const TrendAnalysis = ({ data }: { data: any[] }) => {
  const trendData = useMemo(() => {
    const maxLength = Math.max(...data.map((item) => item.trend?.length || 0));
    return Array.from({ length: maxLength }, (_, index) => ({
      week: `第${index + 1}周`,
      ...data.reduce(
        (acc, item) => ({
          ...acc,
          [item.factor]: item.trend?.[index] || 0,
        }),
        {}
      ),
    }));
  }, [data]);

  const colors = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          {data.slice(0, 5).map((item, index) => (
            <Line
              key={item.factor}
              type="monotone"
              dataKey={item.factor}
              stroke={colors[index]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// 饼图视图组件
const PieChartView = ({ data }: { data: any[] }) => {
  const pieData = data.map((item, index) => ({
    name: item.factor,
    value: item.percentage,
    fill: getRiskLevelColor(item.percentage),
  }));

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 数据钻取对话框
const DrillDownDialog = ({
  factor,
  data,
  isOpen,
  onClose,
}: {
  factor: string;
  data: any;
  isOpen: boolean;
  onClose: () => void;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{factor} - 详细分析</DialogTitle>
          <DialogDescription>
            深入了解该风险因素的影响和变化趋势
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">发生次数:</span>
                  <span className="font-medium">{data?.count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">影响占比:</span>
                  <span className="font-medium">{data?.percentage || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">分类:</span>
                  <Badge variant="outline">{data?.category || "未分类"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">严重程度:</span>
                  <Badge
                    variant={
                      data?.severity === "high"
                        ? "destructive"
                        : data?.severity === "medium"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {data?.severity === "high"
                      ? "高"
                      : data?.severity === "medium"
                        ? "中"
                        : "低"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">建议措施</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 制定针对性干预方案</li>
                  <li>• 加强监控频率</li>
                  <li>• 与相关教师沟通</li>
                  <li>• 定期评估改善效果</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          {data?.trend && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">趋势变化</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendAnalysis data={[data]} />
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const RiskFactorChart: React.FC<RiskFactorChartProps> = ({
  data,
  className,
  enableDrillDown = true,
  enableExport = true,
  showTrendAnalysis = true,
  onFactorClick,
}) => {
  // 使用传入的数据或默认数据
  const chartData = data || defaultRiskFactorData;

  // 状态管理
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null);
  const [drillDownOpen, setDrillDownOpen] = useState(false);

  // 获取所有分类和严重程度选项
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(chartData.map((item) => item.category).filter(Boolean))
    );
    return cats;
  }, [chartData]);

  const severities = useMemo(() => {
    const sevs = Array.from(
      new Set(chartData.map((item) => item.severity).filter(Boolean))
    );
    return sevs;
  }, [chartData]);

  // 过滤和排序数据
  const filteredData = useMemo(() => {
    const filtered = chartData.filter((item) => {
      if (filterCategory !== "all" && item.category !== filterCategory)
        return false;
      if (filterSeverity !== "all" && item.severity !== filterSeverity)
        return false;
      return true;
    });

    return filtered.sort((a, b) =>
      sortOrder === "desc"
        ? b.percentage - a.percentage
        : a.percentage - b.percentage
    );
  }, [chartData, sortOrder, filterCategory, filterSeverity]);

  // 切换排序顺序
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };

  // 处理因素点击
  const handleFactorClick = (factor: string) => {
    if (enableDrillDown) {
      setSelectedFactor(factor);
      setDrillDownOpen(true);
    }
    onFactorClick?.(factor);
  };

  // 导出数据
  const handleExport = () => {
    exportData(
      filteredData,
      `风险因素分析_${new Date().toISOString().split("T")[0]}`
    );
  };

  // 映射数据以符合图表要求
  const formattedData = filteredData.map((item) => ({
    name: item.factor,
    value: item.percentage,
    count: item.count,
    color: getRiskLevelColor(item.percentage),
    ...item,
  }));

  // 获取选中因素的详细数据
  const selectedFactorData = selectedFactor
    ? chartData.find((item) => item.factor === selectedFactor)
    : null;

  return (
    <div className={className}>
      {/* 控制面板 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-medium text-gray-800">
          风险因素可视化分析
        </h3>
        <div className="flex items-center gap-2">
          {/* 图表类型选择 */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={chartType === "bar" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setChartType("bar")}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === "line" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setChartType("line")}
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === "pie" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setChartType("pie")}
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* 排序按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={toggleSortOrder}
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            {sortOrder === "desc" ? "降序" : "升序"}
          </Button>

          {/* 导出按钮 */}
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleExport}
            >
              <Download className="h-3 w-3 mr-1" />
              导出
            </Button>
          )}
        </div>
      </div>

      {/* 过滤器 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">筛选:</span>
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="严重程度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部程度</SelectItem>
            {severities.map((sev) => (
              <SelectItem key={sev} value={sev}>
                {sev === "high" ? "高" : sev === "medium" ? "中" : "低"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 主图表区域 */}
      <Tabs
        value={chartType === "line" && showTrendAnalysis ? "trend" : "main"}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="main">主要分析</TabsTrigger>
          {showTrendAnalysis && (
            <TabsTrigger value="trend">趋势分析</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="main" className="space-y-4">
          <div className="h-[400px]">
            {chartType === "bar" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={formattedData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  barSize={24}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    type="number"
                    domain={[
                      0,
                      Math.max(
                        100,
                        Math.ceil(formattedData[0]?.value || 0) + 10
                      ),
                    ]}
                    tickFormatter={(value) => `${value}%`}
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#4b5563" }}
                  />
                  <Tooltip
                    content={<CustomTooltip showTrend={showTrendAnalysis} />}
                  />
                  <Bar
                    dataKey="value"
                    name="影响占比"
                    radius={[0, 4, 4, 0]}
                    background={{ fill: "#f3f4f6" }}
                    animationDuration={750}
                    onClick={(data) => handleFactorClick(data.name)}
                    style={{ cursor: enableDrillDown ? "pointer" : "default" }}
                  >
                    {formattedData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="hover:opacity-80 transition-opacity duration-200"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartType === "pie" && <PieChartView data={formattedData} />}
          </div>
        </TabsContent>

        {showTrendAnalysis && (
          <TabsContent value="trend" className="space-y-4">
            <TrendAnalysis data={filteredData} />
          </TabsContent>
        )}
      </Tabs>

      <RiskLevelLegend />

      <div className="mt-4 pt-4 border-t text-xs text-gray-500 flex justify-between items-center">
        <span className="flex items-center">
          <Info className="h-3.5 w-3.5 mr-1" />
          显示{formattedData.length}个风险因素，总计
          {formattedData.reduce((sum, item) => sum + item.count, 0)}个预警事件
        </span>
        <span className="flex items-center">
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
          {enableDrillDown && "点击柱状图查看详情"}
        </span>
      </div>

      {/* 数据钻取对话框 */}
      {enableDrillDown && selectedFactorData && (
        <DrillDownDialog
          factor={selectedFactor!}
          data={selectedFactorData}
          isOpen={drillDownOpen}
          onClose={() => setDrillDownOpen(false)}
        />
      )}
    </div>
  );
};

export default RiskFactorChart;
