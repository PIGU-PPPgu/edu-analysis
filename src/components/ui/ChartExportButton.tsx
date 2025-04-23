
import React from "react";
import { toast } from "sonner";

/**
 * 导出传入的SVG DOM为图片或导出数据为CSV
 */
const exportChartAsImage = (svgNode?: SVGElement) => {
  if (!svgNode) {
    toast.error("导出失败: 未找到图表SVG");
    return;
  }
  // SVG转Canvas
  const svgData = new XMLSerializer().serializeToString(svgNode);
  const svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(svgBlob);
  const img = new window.Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    // Use getBoundingClientRect to get width and height from SVG element
    const svgRect = svgNode.getBoundingClientRect();
    canvas.width = svgRect.width || 600;
    canvas.height = svgRect.height || 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "chart.png";
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  };
  img.src = url;
};

const exportChartAsCSV = (data: any[], xKey: string, yKeys: string[]) => {
  if (!Array.isArray(data) || data.length === 0) {
    toast.error("暂无数据可导出");
    return;
  }
  const headers = [xKey, ...yKeys];
  const rows = data.map(entry =>
    headers.map(k => (entry[k] !== undefined ? entry[k] : "")).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "chart-data.csv";
  a.click();
};

interface ChartExportButtonProps {
  svgContainerRef: React.RefObject<HTMLDivElement>;
  data: any[];
  xKey: string;
  yKeys: string[];
}
const ChartExportButton: React.FC<ChartExportButtonProps> = ({
  svgContainerRef,
  data,
  xKey,
  yKeys
}) => {
  return (
    <div className="absolute z-10 left-3 top-3 bg-white/80 rounded shadow-sm flex gap-2 p-1 animate-fade-in" style={{backdropFilter:'blur(3px)'}}>
      <button
        onClick={() => {
          // 找第一个SVG
          const svg = svgContainerRef.current?.querySelector("svg") as SVGElement | undefined;
          exportChartAsImage(svg);
        }}
        className="p-1 hover-scale rounded text-xs text-gray-700 hover:bg-[#B9FF66]/30"
      >导出图片</button>
      <button
        onClick={() => exportChartAsCSV(data, xKey, yKeys)}
        className="p-1 hover-scale rounded text-xs text-gray-700 hover:bg-[#B9FF66]/30"
      >导出CSV</button>
    </div>
  );
};

export default ChartExportButton;
