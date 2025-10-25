import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

interface WarningHeatmapProps {
  data?: {
    students: string[];
    subjects: string[];
    values: number[][];
  };
  className?: string;
  onRefresh?: () => void;
}

// 生成模拟热力图数据
const generateMockHeatmapData = () => {
  const students = Array.from({ length: 20 }, (_, i) => `学生${i + 1}`);
  const subjects = [
    "语文",
    "数学",
    "英语",
    "物理",
    "化学",
    "生物",
    "政治",
    "历史",
    "地理",
  ];
  const values: number[][] = [];

  students.forEach((_, i) => {
    subjects.forEach((_, j) => {
      const warningLevel = Math.floor(Math.random() * 4); // 0-3 预警等级
      values.push([j, i, warningLevel]);
    });
  });

  return { students, subjects, values };
};

const WarningHeatmap: React.FC<WarningHeatmapProps> = ({
  data,
  className,
  onRefresh,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化或获取图表实例
    chartInstance.current = echarts.init(chartRef.current);

    // 使用传入的数据或生成模拟数据
    const heatmapData = data || generateMockHeatmapData();

    const option: echarts.EChartsOption = {
      tooltip: {
        position: "top",
        formatter: (params: any) => {
          const subjectIndex = params.data[0];
          const studentIndex = params.data[1];
          const value = params.data[2];
          const levelNames = ["正常", "低风险", "中风险", "高风险"];

          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">
                ${heatmapData.students[studentIndex]} - ${heatmapData.subjects[subjectIndex]}
              </div>
              <div style="color: ${params.color};">
                预警等级: ${levelNames[value]}
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 60,
        left: 80,
        right: 40,
        bottom: 60,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: heatmapData.subjects,
        splitArea: {
          show: true,
        },
        axisLabel: {
          rotate: 0,
          fontSize: 12,
          fontWeight: "bold",
          color: "#191A23",
        },
      },
      yAxis: {
        type: "category",
        data: heatmapData.students,
        splitArea: {
          show: true,
        },
        axisLabel: {
          fontSize: 11,
          color: "#191A23",
        },
      },
      visualMap: {
        min: 0,
        max: 3,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 10,
        inRange: {
          color: ["#B9FF66", "#F59E0B", "#FB923C", "#EF4444"],
        },
        text: ["高风险", "正常"],
        textStyle: {
          color: "#191A23",
          fontWeight: "bold",
        },
        formatter: (value: number) => {
          const levelNames = ["正常", "低风险", "中风险", "高风险"];
          return levelNames[Math.floor(value)];
        },
      },
      series: [
        {
          name: "预警热力图",
          type: "heatmap",
          data: heatmapData.values,
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
              borderColor: "#000",
              borderWidth: 2,
            },
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    // 响应式调整
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.dispose();
    };
  }, [data]);

  const handleExport = () => {
    if (chartInstance.current) {
      const url = chartInstance.current.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: "#fff",
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = `预警热力图_${new Date().toISOString().split("T")[0]}.png`;
      link.click();
    }
  };

  return (
    <Card
      className={`border-2 border-black shadow-[4px_4px_0px_0px_#191A23] ${className}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-black text-[#191A23]">
              学生×科目预警热力图
            </CardTitle>
            <CardDescription className="font-medium text-[#191A23]/70 mt-1">
              可视化展示每个学生在各科目的预警情况
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="border-2 border-black bg-white hover:bg-gray-50 text-black font-bold shadow-[2px_2px_0px_0px_#000]"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                刷新
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="border-2 border-black bg-white hover:bg-gray-50 text-black font-bold shadow-[2px_2px_0px_0px_#000]"
            >
              <Download className="h-4 w-4 mr-1" />
              导出
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={chartRef}
          className="w-full h-[600px] bg-white rounded-lg border-2 border-gray-200"
        />
        <div className="mt-4 p-4 bg-[#B9FF66]/20 rounded-lg border-2 border-black">
          <p className="text-sm font-medium text-[#191A23]">
            <strong>使用提示:</strong>{" "}
            颜色越深表示预警风险越高。点击单元格查看详细信息。
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WarningHeatmap;
