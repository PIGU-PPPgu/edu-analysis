/**
 * 📊 报告查看器
 * 显示已生成的分析报告
 */

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
  Users,
  BookOpen,
  X,
  Download,
  FileDown,
  Loader2,
  Calendar,
  User,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { AnalysisReport, AIInsights, ActionItem } from "@/types/report";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { reportGenerator } from "@/services/reportGenerator";
import { renderMarkdown, MarkdownParagraph } from "@/utils/markdownRenderer";
import { reportPdfExporter } from "@/services/reportPdfExporter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LabelList,
} from "recharts";
import BoxPlotChart from "@/components/analysis/charts/BoxPlotChart";
import GradeFlowSankeyChart from "@/components/analysis/charts/GradeFlowSankeyChart";
import CorrelationHeatmap from "@/components/analysis/charts/CorrelationHeatmap";
import PerformanceFunnelChart from "@/components/analysis/charts/PerformanceFunnelChart";
import RankDistributionChart from "@/components/analysis/charts/RankDistributionChart";
import SBIRadarChart from "@/components/analysis/charts/SBIRadarChart";
import APISBIScatterChart from "@/components/analysis/charts/APISBIScatterChart";

interface ReportViewerProps {
  examId?: string;
  onClose?: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ examId, onClose }) => {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportContentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReport();
  }, [examId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("analysis_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (examId) {
        query = query.eq("exam_id", examId);
      }

      const { data, error: fetchError } = await query.limit(1);

      if (fetchError) {
        throw fetchError;
      }

      if (!data || data.length === 0) {
        // 没有报告，显示生成按钮而不是错误
        setError("no-report");
        return;
      }

      const loadedReport = data[0].report_data as AnalysisReport;
      console.log("📋 报告加载成功:", {
        examId: loadedReport.metadata.examId,
        reportType: loadedReport.metadata.reportType,
        hasAdvancedAnalysis: !!loadedReport.advancedAnalysis,
        hasGradeFlow: !!loadedReport.advancedAnalysis?.gradeFlow,
        hasCorrelations: !!loadedReport.advancedAnalysis?.correlations,
        correlationsHasData:
          !!loadedReport.advancedAnalysis?.correlations?.chartData,
      });
      setReport(loadedReport);
    } catch (err) {
      console.error("加载报告失败:", err);
      setError("加载报告失败，请稍后重试");
      toast.error("加载报告失败");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (force = false) => {
    if (!examId) {
      toast.error("缺少考试ID");
      return;
    }

    try {
      setIsGenerating(true);

      if (force) {
        toast.info("正在重新生成分析报告...");
        // 删除旧报告
        await supabase.from("analysis_reports").delete().eq("exam_id", examId);
      } else {
        toast.info("正在生成分析报告，这可能需要几秒钟...");
      }

      const generatedReport =
        await reportGenerator.generateCompleteReport(examId);

      if (!generatedReport) {
        toast.error("报告生成失败，请检查是否有成绩数据");
        return;
      }

      const saved = await reportGenerator.saveReport(generatedReport);

      if (saved) {
        toast.success(force ? "报告重新生成成功！" : "报告生成成功！");
        setReport(generatedReport);
        setError(null);
      } else {
        toast.error("报告保存失败");
      }
    } catch (err) {
      console.error("生成报告失败:", err);
      toast.error("生成报告失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!report) {
      toast.error("暂无报告可导出");
      return;
    }

    if (!reportContentRef.current) {
      toast.error("报告内容未加载完成");
      return;
    }

    try {
      toast.info("正在生成PDF，请稍候...", { duration: 2000 });

      // 使用 exportFromElement 方法直接从DOM导出（包含所有图表和样式）
      await reportPdfExporter.exportFromElement(
        reportContentRef.current,
        report,
        {
          format: "a4",
          orientation: "portrait",
        }
      );

      toast.success("✅ PDF导出成功！");
    } catch (error) {
      console.error("PDF导出失败:", error);
      toast.error("PDF导出失败，请重试");
    }
  };

  const handleExportHtml = async () => {
    if (!report) {
      toast.error("暂无报告可导出");
      return;
    }

    if (!reportContentRef.current) {
      toast.error("报告内容未加载完成");
      return;
    }

    try {
      toast.info("正在生成离线HTML...", { duration: 2000 });

      // 从本地public目录读取预打包的库文件（无需网络）
      let reactCode = "";
      let reactDomCode = "";
      let propTypesCode = "";
      let rechartsCode = "";

      try {
        const [reactResp, reactDomResp, propTypesResp, rechartsResp] =
          await Promise.all([
            fetch("/libs/react.production.min.js"),
            fetch("/libs/react-dom.production.min.js"),
            fetch("/libs/prop-types.min.js"),
            fetch("/libs/recharts.min.js"),
          ]);

        if (
          !reactResp.ok ||
          !reactDomResp.ok ||
          !propTypesResp.ok ||
          !rechartsResp.ok
        ) {
          throw new Error("库文件加载失败");
        }

        reactCode = await reactResp.text();
        reactDomCode = await reactDomResp.text();
        propTypesCode = await propTypesResp.text();
        rechartsCode = await rechartsResp.text();

        console.log("✅ 库文件加载完成（本地，含PropTypes）");
      } catch (err) {
        console.error("库文件加载失败:", err);
        toast.error("库文件加载失败，请确保public/libs目录存在");
        return;
      }

      // 克隆报告内容（深度克隆，包含所有子元素）
      const clonedContent = reportContentRef.current.cloneNode(
        true
      ) as HTMLElement;

      // 移除不需要导出的元素（如返回按钮、导出按钮等）
      const buttonsToRemove = clonedContent.querySelectorAll("button");
      buttonsToRemove.forEach((btn) => {
        if (
          btn.textContent?.includes("返回") ||
          btn.textContent?.includes("导出") ||
          btn.textContent?.includes("PDF") ||
          btn.textContent?.includes("HTML")
        ) {
          btn.remove();
        }
      });

      // 先进行全局清理 - 移除所有可能重复的BoxPlot和API-SBI元素
      console.log("🧹 开始全局清理重复图表元素...");

      // 1. 更彻底地查找和清理所有BoxPlot相关内容
      console.log("🔍 开始查找BoxPlot容器...");

      // 方法1: 通过SVG特征查找
      const allSvgs = clonedContent.querySelectorAll("svg");
      let boxPlotContainers = new Set<HTMLElement>();

      allSvgs.forEach((svg) => {
        // BoxPlot的特征：包含foreignObject或有特定的SVG结构
        const hasForeignObject = svg.querySelector("foreignObject");
        const hasBoxStructure = svg.querySelector('rect[fill="#B9FF66"]'); // 箱体颜色
        const svgWidth = svg.getAttribute("width");

        // BoxPlot必须同时具备多个特征才能确认
        if (
          hasForeignObject &&
          hasBoxStructure &&
          svgWidth &&
          parseInt(svgWidth) > 700
        ) {
          // 找到可能的BoxPlot SVG，向上查找最外层容器
          let container = svg.parentElement;
          while (container && container !== clonedContent) {
            // 更严格的检查：必须同时包含箱线图特有的关键词
            const text = container.textContent || "";
            const hasBoxPlotTitle =
              text.includes("箱线图") ||
              text.includes("分科目成绩分布（箱线图）");
            const hasBoxPlotElements =
              text.includes("箱体表示Q1-Q3") ||
              (text.includes("中位数") &&
                text.includes("Q1") &&
                text.includes("Q3") &&
                text.includes("箱体"));

            if (hasBoxPlotTitle || hasBoxPlotElements) {
              // 再次确认不是其他图表
              if (
                !text.includes("分数段人数分布") &&
                !text.includes("班级情况概览") &&
                !text.includes("典型学生成绩对比") &&
                !text.includes("多维度排名")
              ) {
                boxPlotContainers.add(container as HTMLElement);
                break;
              }
            }
            container = container.parentElement;
          }
        }
      });

      // 方法2: 通过标题精确查找 - 只查找确定是BoxPlot的标题
      const titles = clonedContent.querySelectorAll("h3, h4");
      titles.forEach((title) => {
        const text = title.textContent || "";
        // 只匹配明确的箱线图标题，避免误删其他图表
        if (
          (text === "📊 分科目成绩分布（箱线图）" ||
            text === "分科目成绩分布（箱线图）" ||
            text === "箱线图" ||
            (text.includes("箱线图") && !text.includes("分数段"))) &&
          title.parentElement
        ) {
          const container = title.parentElement;
          // 验证容器确实包含BoxPlot特征
          const hasSvg = container.querySelector("svg");
          const hasForeignObject = container.querySelector("foreignObject");
          if (hasSvg && hasForeignObject) {
            boxPlotContainers.add(container as HTMLElement);
          }
        }
      });

      // 清理所有找到的BoxPlot容器
      let boxPlotIndex = 0;
      boxPlotContainers.forEach((container) => {
        // 【重要】检查容器是否包含离线图表，如果包含则跳过
        const hasOfflineChart =
          container.querySelector('[data-offline-chart="true"]') ||
          container.querySelector('[id^="offline-"]');
        if (hasOfflineChart) {
          console.log("  ⚠️ 跳过BoxPlot容器（包含离线图表）");
          return;
        }

        console.log("  清理BoxPlot容器 " + boxPlotIndex);
        // 保存容器引用用于后续渲染
        container.setAttribute("data-boxplot-container", String(boxPlotIndex));
        container.setAttribute("data-chart-type", "boxplot");
        container.setAttribute("id", "chart-container-boxplot-" + boxPlotIndex);

        // 只清空recharts-wrapper，不清空整个容器
        const rechartsWrapper = container.querySelector(".recharts-wrapper");
        if (rechartsWrapper && rechartsWrapper.parentElement) {
          const parent = rechartsWrapper.parentElement;
          parent.innerHTML =
            '<div style="padding: 40px; text-align: center; color: #666; background: #f5f5f5; border: 1px dashed #ccc;">📊 BoxPlot图表加载中...</div>';
        } else {
          // 如果没有找到recharts-wrapper，清空整个容器
          container.innerHTML =
            '<div style="padding: 40px; text-align: center; color: #666; background: #f5f5f5; border: 1px dashed #ccc;">📊 BoxPlot图表加载中...</div>';
        }

        boxPlotIndex++;
      });

      // 2. 更彻底地查找和清理API-SBI的四象限卡片区域
      console.log("🔍 开始查找API-SBI四象限卡片...");

      // 方法1: 查找包含所有四个象限的容器
      const allDivs = clonedContent.querySelectorAll("div");
      let apiSbiQuadrantContainers = new Set<HTMLElement>();

      allDivs.forEach((el) => {
        const text = el.textContent || "";
        // 检查是否包含四个象限的关键词
        const hasQuadrant1 =
          text.includes("🌟 优秀且均衡") || text.includes("优秀且均衡");
        const hasQuadrant2 =
          text.includes("⚠️ 优秀但偏科") || text.includes("优秀但偏科");
        const hasQuadrant3 =
          text.includes("📐 均衡但待提高") || text.includes("均衡但待提高");
        const hasQuadrant4 =
          text.includes("🚨 需重点关注") || text.includes("需重点关注");

        // 如果包含至少3个象限的文字，认为这是四象限区域
        const quadrantCount = [
          hasQuadrant1,
          hasQuadrant2,
          hasQuadrant3,
          hasQuadrant4,
        ].filter(Boolean).length;
        if (quadrantCount >= 3) {
          console.log("  找到包含四象限的容器，象限数:", quadrantCount);
          apiSbiQuadrantContainers.add(el as HTMLElement);
        }
      });

      // 方法2: 查找单个象限卡片
      allDivs.forEach((div) => {
        // 【重要】跳过离线图表容器及其祖先/后代
        if (
          div.hasAttribute("data-offline-chart") ||
          div.id?.startsWith("offline-") ||
          div.querySelector("[data-offline-chart]") ||
          div.closest("[data-offline-chart]")
        ) {
          return;
        }

        const text = div.textContent || "";
        const style = div.getAttribute("style") || "";

        // 检查是否是单个象限卡片（背景色、边框等特征）
        const isQuadrantCard =
          (text.includes("API≥70") || text.includes("API<70")) &&
          (text.includes("SBI≥70") || text.includes("SBI<70")) &&
          (style.includes("background-color") || style.includes("border"));

        if (isQuadrantCard) {
          console.log("  找到单个象限卡片:", text.substring(0, 30));
          // 直接移除单个卡片
          div.remove();
        }
      });

      // 清理找到的四象限容器
      apiSbiQuadrantContainers.forEach((container) => {
        // 【重要】跳过包含离线图表的容器
        if (
          container.querySelector("[data-offline-chart]") ||
          container.querySelector('[id^="offline-"]')
        ) {
          console.log("  ⚠️ 跳过四象限容器（包含离线图表）");
          return;
        }

        console.log("  清理四象限容器");
        // 查找容器内的所有象限卡片并移除
        const cards = container.querySelectorAll("div");
        let removedCount = 0;

        cards.forEach((card) => {
          // 【重要】跳过离线图表容器
          if (
            card.hasAttribute("data-offline-chart") ||
            card.id?.startsWith("offline-") ||
            card.querySelector("[data-offline-chart]")
          ) {
            return;
          }

          const cardText = card.textContent || "";
          if (
            cardText.includes("优秀且均衡") ||
            cardText.includes("优秀但偏科") ||
            cardText.includes("均衡但待提高") ||
            cardText.includes("需重点关注") ||
            cardText.includes("API≥70") ||
            cardText.includes("API<70")
          ) {
            card.remove();
            removedCount++;
          }
        });

        console.log("    移除了 " + removedCount + " 个象限卡片");
      });

      // 【重要】首先处理带有 data-offline-chart 属性的容器
      // 这些是我们明确标记的多维度分析图表，优先处理
      let chartIndex = boxPlotIndex;

      // 调试：检查原始DOM中是否有这些属性
      const originalOfflineContainers =
        reportContentRef.current?.querySelectorAll(
          '[data-offline-chart="true"]'
        );
      console.log(
        "🔍 原始DOM中的离线图表容器数量:",
        originalOfflineContainers?.length || 0
      );

      // 调试：检查是否有offline-开头的ID
      const offlineIdContainers =
        clonedContent.querySelectorAll('[id^="offline-"]');
      console.log(
        "🔍 克隆内容中offline-开头ID的元素数量:",
        offlineIdContainers.length
      );
      offlineIdContainers.forEach((el) => {
        console.log(
          "   - ID:",
          el.getAttribute("id"),
          "| data-chart-type:",
          el.getAttribute("data-chart-type")
        );
      });

      const offlineChartContainers = clonedContent.querySelectorAll(
        '[data-offline-chart="true"]'
      );
      console.log(
        "🎯 找到 " + offlineChartContainers.length + " 个离线图表容器"
      );

      const processedContainerIds = new Set<string>();

      offlineChartContainers.forEach((container) => {
        const chartType = container.getAttribute("data-chart-type");
        const containerId = container.getAttribute("id");

        console.log(`📊 处理离线图表: ${chartType} (${containerId})`);

        // 清空容器，准备重新渲染
        container.innerHTML =
          '<div style="text-align: center; padding: 40px; color: #666; min-height: 300px;">⏳ 正在加载交互式图表...</div>';

        // 设置chart-index用于渲染
        container.setAttribute("data-chart-index", String(chartIndex));
        if (containerId) {
          processedContainerIds.add(containerId);
        }
        chartIndex++;
      });

      // 然后处理其他recharts容器（跳过已处理的）
      const rechartContainers =
        clonedContent.querySelectorAll(".recharts-wrapper");
      rechartContainers.forEach((container) => {
        const parent = container.parentElement;
        if (!parent) return;

        // 通过上下文识别图表类型 - 使用更近的父元素来精确定位
        let chartType = "unknown";
        let targetParent = parent;

        // 1. 首先检查直接父级的div（更精确）
        const immediateParent = targetParent.closest(
          "div.mb-6, div.space-y-4, div.mb-8, div.mb-12"
        );
        const immediateText = immediateParent?.textContent || "";

        // 2. 然后检查更大的section
        const sectionElement = targetParent.closest('[class*="space-y"]');
        const sectionText = sectionElement?.textContent || "";

        // 3. 检查前面的标题（h3或h4）
        let precedingTitle = "";
        let sibling = targetParent.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === "H3" || sibling.tagName === "H4") {
            precedingTitle = sibling.textContent || "";
            break;
          }
          sibling = sibling.previousElementSibling;
        }

        // 识别图表类型（优先使用最近的标题）
        const combinedText = precedingTitle + " " + immediateText;

        // 跳过BoxPlot，因为已经在前面处理过了
        if (
          precedingTitle.includes("箱线图") ||
          combinedText.includes("成绩统计分布") ||
          combinedText.includes("BoxPlot")
        ) {
          console.log("⏭️ 跳过BoxPlot（已在前面处理）");
          return; // 跳过这个容器
        } else if (
          precedingTitle.includes("分数段人数分布") &&
          !precedingTitle.includes("分数段分布分析")
        ) {
          chartType = "score-range-bar";
        } else if (
          combinedText.includes("班级对比") ||
          combinedText.includes("班级情况概览")
        ) {
          chartType = "class-comparison-bar";
        } else if (
          precedingTitle.includes("分数段分布分析") ||
          combinedText.includes("堆积条形图")
        ) {
          chartType = "stacked-subject-bar";
        } else if (combinedText.includes("典型学生成绩对比")) {
          chartType = "typical-students-radar";
        } else if (combinedText.includes("等级流动")) {
          chartType = "grade-flow-sankey";
        } else if (combinedText.includes("相关性热力图")) {
          chartType = "correlation-heatmap";
        } else if (
          combinedText.includes("绩效分布漏斗") ||
          combinedText.includes("学生绩效分布漏斗")
        ) {
          chartType = "performance-funnel";
        } else if (
          combinedText.includes("排名分布情况") ||
          precedingTitle.includes("年级排名分布")
        ) {
          chartType = "rank-distribution";
        } else if (combinedText.includes("学科均衡度雷达图")) {
          chartType = "sbi-radar";
        } else if (
          combinedText.includes("学业表现指数") &&
          combinedText.includes("学科均衡度") &&
          combinedText.includes("SBI")
        ) {
          chartType = "api-sbi-scatter";
        } else if (precedingTitle.includes("多维度排名与综合指标分析")) {
          // 多维度排名容器不应该被清空，它包含了多个子组件
          chartType = "multi-dimension-container";
          console.log("🏆 识别到多维度排名与综合指标分析容器，跳过清空处理");
        }

        // 为目标容器添加唯一ID和类型标记
        targetParent.setAttribute("id", `chart-container-${chartIndex}`);
        targetParent.setAttribute("data-chart-index", String(chartIndex));
        targetParent.setAttribute("data-chart-type", chartType);
        targetParent.setAttribute("data-debug-title", precedingTitle); // 用于调试

        console.log(
          `📍 图表 ${chartIndex}: ${chartType} | 标题: "${precedingTitle}"`
        );

        // 分类处理：
        // 1. 复杂D3图表 - 保留静态快照
        // 2. 简单Recharts图表 - 清空并重新渲染
        if (chartType === "api-sbi-scatter") {
          // API-SBI散点图也需要特殊处理
          targetParent.innerHTML = "";
          const placeholder = document.createElement("div");
          placeholder.id = `api-sbi-placeholder-${chartIndex}`;
          placeholder.style.cssText =
            "width: 100%; min-height: 600px; padding: 20px; text-align: center; color: #999;";
          placeholder.innerHTML = "正在加载API-SBI散点图...";
          targetParent.appendChild(placeholder);
          console.log("✓ API-SBI散点图已标记为重新渲染");
        } else if (
          chartType !== "grade-flow-sankey" &&
          chartType !== "correlation-heatmap" &&
          chartType !== "unknown" &&
          chartType !== "multi-dimension-container"
        ) {
          // 不清空multi-dimension-container，因为它包含多个子组件
          targetParent.innerHTML = `<div style="text-align: center; padding: 40px; color: #999;">正在加载图表...</div>`;
        }

        chartIndex++;
      });

      // 离线图表容器已在前面优先处理，这里不再重复

      console.log(`✅ 报告内容克隆完成，找到 ${chartIndex} 个图表容器`);

      // 展开所有Collapsible组件（使数据表格在HTML中可见）
      const collapsibleContents = clonedContent.querySelectorAll(
        '[data-state="closed"]'
      );
      collapsibleContents.forEach((element) => {
        element.setAttribute("data-state", "open");
        if (element instanceof HTMLElement) {
          element.style.display = "block";
          element.style.height = "auto";
          element.style.overflow = "visible";
        }
      });

      // 确保所有隐藏内容都展开
      const hiddenElements = clonedContent.querySelectorAll(
        '[style*="display: none"], [style*="display:none"]'
      );
      hiddenElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.display = "block";
        }
      });

      // 注：不再需要手动生成数据表格，因为已在克隆的HTML中
      /* 生成数据表格HTML
      const generateDataTables = () => {
        let tablesHtml = '<div style="margin-top: 50px; padding: 30px; background: #f9f9f9; border: 2px solid #191A23; border-radius: 12px;"><h2 style="font-size: 1.8rem; font-weight: 900; color: #191A23; margin-bottom: 30px; text-align: center;">📊 详细数据表格</h2>';

        // 1. 绩效漏斗数据
        if (report.advancedAnalysis?.performanceFunnel) {
          tablesHtml += `
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 1.3rem; font-weight: bold; color: #191A23; margin-bottom: 15px;">📉 绩效分布数据</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; border: 2px solid #191A23;">
                <thead style="background: #B9FF66;">
                  <tr>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">等级</th>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">分数段</th>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">人数</th>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">占比</th>
                  </tr>
                </thead>
                <tbody>
                  ${report.advancedAnalysis.performanceFunnel.map((item: any, idx: number) => `
                    <tr style="${idx % 2 === 0 ? 'background: #f9f9f9;' : ''}">
                      <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${item.level}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${item.scoreRange || '-'}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${item.count}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.percentage.toFixed(1)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // 2. 排名分布数据
        if (report.advancedAnalysis?.rankings?.rankDistribution) {
          tablesHtml += `
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 1.3rem; font-weight: bold; color: #191A23; margin-bottom: 15px;">🏆 年级排名分布</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; border: 2px solid #191A23;">
                <thead style="background: #4ECDC4;">
                  <tr>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">排名段</th>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">范围</th>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">人数</th>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">占比</th>
                  </tr>
                </thead>
                <tbody>
                  ${report.advancedAnalysis.rankings.rankDistribution.map((item: any, idx: number) => `
                    <tr style="${idx % 2 === 0 ? 'background: #f9f9f9;' : ''}">
                      <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${item.segment}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${item.range}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${item.count}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.percentage.toFixed(1)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        // 3. API和SBI数据
        if (report.advancedAnalysis?.rankings?.rawData) {
          const data = report.advancedAnalysis.rankings.rawData;
          tablesHtml += `
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 1.3rem; font-weight: bold; color: #191A23; margin-bottom: 15px;">📊 综合指标数据</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; border: 2px solid #191A23;">
                <thead style="background: #FFD93D;">
                  <tr>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">指标名称</th>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">平均值</th>
                    <th style="padding: 12px; border: 2px solid #191A23; font-weight: 900;">说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">学业表现指数 (API)</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 1.2rem;">${data.avgAPI?.toFixed(1) || '-'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">综合成绩、排名和进步趋势的复合指标</td>
                  </tr>
                  <tr style="background: #f9f9f9;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">学科均衡度 (SBI)</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 1.2rem;">${data.avgSBI?.toFixed(1) || '-'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">各科目成绩的均衡程度，越高越均衡</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }

        // 4. 学科相关性数据
        if (report.advancedAnalysis?.correlations?.chartData && Array.isArray(report.advancedAnalysis.correlations.chartData)) {
          const correlations = report.advancedAnalysis.correlations.chartData;
          tablesHtml += `
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 1.3rem; font-weight: bold; color: #191A23; margin-bottom: 15px;">🔗 学科相关性矩阵</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; border: 2px solid #191A23; font-size: 0.85rem;">
                <thead style="background: #FF6B6B;">
                  <tr>
                    <th style="padding: 8px; border: 2px solid #191A23; font-weight: 900;">科目</th>
                    ${correlations.map((row: any) => `<th style="padding: 8px; border: 2px solid #191A23; font-weight: 900;">${row.subject}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${correlations.map((row: any, rowIdx: number) => `
                    <tr style="${rowIdx % 2 === 0 ? 'background: #f9f9f9;' : ''}">
                      <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${row.subject}</td>
                      ${correlations.map((col: any) => {
                        const value = row[col.subject];
                        const bgColor = value === 1 ? '#B9FF66' : value > 0.7 ? '#4ECDC4' : value > 0.4 ? '#FFD93D' : '#FFF';
                        return `<td style="padding: 8px; border: 1px solid #ddd; text-align: center; background: ${bgColor}; font-weight: ${value === 1 ? 'bold' : 'normal'};">${typeof value === 'number' ? value.toFixed(2) : '-'}</td>`;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <p style="margin-top: 10px; font-size: 0.9rem; color: #666; text-align: center;">
                注：相关系数范围 -1 到 1，越接近 1 表示正相关越强，越接近 -1 表示负相关越强
              </p>
            </div>
          `;
        }

        tablesHtml += '</div>';
        return tablesHtml;
      };
      */

      // 获取所有样式表（包括内联样式和外部样式）
      let allStyles = "";

      // 1. 提取所有<style>标签
      const styleTags = Array.from(document.querySelectorAll("style"));
      styleTags.forEach((tag) => {
        allStyles += tag.textContent + "\n";
      });

      // 2. 提取所有CSS规则
      try {
        Array.from(document.styleSheets).forEach((styleSheet) => {
          try {
            const rules = Array.from(styleSheet.cssRules);
            rules.forEach((rule) => {
              allStyles += rule.cssText + "\n";
            });
          } catch (e) {
            // 跨域样式表无法访问，跳过
            console.warn("无法访问样式表:", e);
          }
        });
      } catch (e) {
        console.warn("提取样式失败:", e);
      }

      // 序列化报告数据（用于重新渲染Recharts图表）
      const reportDataJson = JSON.stringify(report, null, 2)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");

      // 创建完整的离线交互式HTML文档（使用克隆的完整内容）
      const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.metadata.examTitle} - 分析报告（离线版）</title>

  <!-- 内联React和Recharts库（完全离线可用） -->
  <script>${reactCode}</script>
  <script>${reactDomCode}</script>
  <script>${propTypesCode}</script>
  <script>${rechartsCode}</script>

  <!-- 内联所有样式 -->
  <style>
    ${allStyles}

    /* 确保打印样式 */
    @media print {
      body { padding: 0; }
      button { display: none !important; }
      .no-print { display: none !important; }
    }

    /* 添加离线标识样式 */
    .offline-banner {
      background: linear-gradient(135deg, #B9FF66 0%, #4ECDC4 100%);
      color: #191A23;
      padding: 15px;
      text-align: center;
      font-weight: bold;
      border-bottom: 3px solid #191A23;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <!-- 离线标识横幅 -->
  <div class="offline-banner">
    📊 ${report.metadata.examTitle} - 智能分析报告（离线版）
    <span style="margin-left: 20px; font-size: 0.9em; opacity: 0.8;">
      🔒 完全离线可用 · 图表完全交互 · 生成于 ${new Date(report.metadata.generatedAt).toLocaleString("zh-CN")}
    </span>
  </div>

  <!-- 完整的报告内容（克隆自原页面） -->
  ${clonedContent.outerHTML}

  <script>
    // 报告数据（完整数据，用于重新渲染交互式图表）
    const reportData = ${reportDataJson};

    // 页面加载完成后重新渲染所有图表
    window.addEventListener('DOMContentLoaded', () => {
      console.log('✅ 报告已加载，开始渲染交互式图表');
      console.log('📊 数据快照:', {
        考试: reportData.metadata.examTitle,
        学生数: reportData.metadata.dataSnapshot.totalStudents,
        生成时间: reportData.metadata.generatedAt
      });

      const React = window.React;
      const ReactDOM = window.ReactDOM;
      const Recharts = window.Recharts;

      if (!React || !ReactDOM || !Recharts) {
        console.error('React或Recharts未加载');
        alert('图表库加载失败，图表无法显示交互效果');
        return;
      }

      const {
        BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
        ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area,
        PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
        FunnelChart, Funnel, LabelList, ScatterChart, Scatter, ZAxis,
        ReferenceLine, Sankey, Rectangle
      } = Recharts;

      // 颜色配置
      const COLORS = {
        green: '#B9FF66',
        cyan: '#4ECDC4',
        yellow: '#FFD93D',
        orange: '#FFA726',
        red: '#FF6B6B',
        darkRed: '#E53935',
        blue: '#2196F3',
        purple: '#9C27B0'
      };

      // ========== BoxPlot完全重新渲染 ==========
      // BoxPlot的SVG在cloneNode时内容丢失，需要完全重新创建
      function renderBoxPlotFromScratch(containerId, data) {
        console.log('🎨 开始渲染BoxPlot - 容器ID:', containerId);
        console.log('🎨 数据:', data?.length + '个科目');

        const container = document.getElementById(containerId);
        if (!container) {
          console.error('❌ BoxPlot容器未找到! ID:', containerId);
          // 尝试查找所有可能的容器
          const allContainers = document.querySelectorAll('[data-chart-type="boxplot"]');
          console.log('🔍 找到的所有BoxPlot容器:', allContainers.length);
          allContainers.forEach((c, i) => {
            console.log('  容器' + i + ': ID=' + c.id + ', data-chart-index=' + c.getAttribute('data-chart-index'));
          });
          return;
        }

        if (!data || data.length === 0) {
          console.warn('⚠️ 数据未找到或为空');
          return;
        }

        console.log('✅ 找到容器，当前内容长度:', container.innerHTML.length);
        console.log('✅ 容器当前子元素数量:', container.childElementCount);

        // 渲染前的最终清理 - 确保移除所有可能的旧内容
        // 1. 移除所有包含BoxPlot特征的元素
        const elementsToRemove = container.querySelectorAll('*');
        elementsToRemove.forEach(el => {
          const text = el.textContent || '';
          if (text.includes('箱线图') ||
              text.includes('箱体表示Q1-Q3') ||
              text.includes('中位数') ||
              text.includes('BoxPlot图表加载中')) {
            el.remove();
          }
        });

        // 2. 完全清空容器
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.innerHTML = '';
        container.textContent = '';

        // 3. 重置容器样式
        container.style.cssText = 'width: 100%; padding: 0; margin: 0; background: transparent; position: relative;';

        // 创建主包装器
        const mainWrapper = document.createElement('div');
        mainWrapper.style.cssText = 'width: 100%; background: white; padding: 16px; border-radius: 8px;';

        // 添加标题到主包装器
        const title = document.createElement('h4');
        title.style.cssText = 'font-weight: bold; font-size: 1.125rem; color: #191A23; margin: 0 0 16px 0;';
        title.textContent = '📊 成绩统计分布（箱线图）';
        mainWrapper.appendChild(title);

        // 创建图表wrapper并添加到主包装器
        const chartWrapper = document.createElement('div');
        chartWrapper.style.cssText = 'width: 100%; overflow-x: auto; display: flex; justify-content: center;';
        mainWrapper.appendChild(chartWrapper);

        // 将主包装器添加到容器
        container.appendChild(mainWrapper);

        // SVG配置
        const svgWidth = Math.max(800, data.length * 120);
        const svgHeight = 400;
        const margin = { top: 30, right: 30, bottom: 80, left: 80 };
        const plotWidth = svgWidth - margin.left - margin.right;
        const plotHeight = svgHeight - margin.top - margin.bottom;

        // 创建SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        svg.style.border = '1px solid #e5e7eb';
        chartWrapper.appendChild(svg);

        // 计算Y轴范围（百分比模式）
        const yMin = 0;
        const yMax = 105;
        const scaleY = (value) => {
          const ratio = (value - yMin) / (yMax - yMin);
          return margin.top + plotHeight * (1 - ratio);
        };

        // X轴位置计算
        const bandWidth = plotWidth / data.length;
        const getXPosition = (index) => margin.left + bandWidth * (index + 0.5);

        // 绘制Y轴
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', margin.left);
        yAxis.setAttribute('y1', margin.top);
        yAxis.setAttribute('x2', margin.left);
        yAxis.setAttribute('y2', margin.top + plotHeight);
        yAxis.setAttribute('stroke', '#191A23');
        yAxis.setAttribute('stroke-width', '2');
        svg.appendChild(yAxis);

        // Y轴刻度和标签
        [0, 25, 50, 75, 100].forEach(value => {
          const y = scaleY(value);

          // 刻度线
          const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          tick.setAttribute('x1', margin.left - 5);
          tick.setAttribute('y1', y);
          tick.setAttribute('x2', margin.left);
          tick.setAttribute('y2', y);
          tick.setAttribute('stroke', '#191A23');
          svg.appendChild(tick);

          // 网格线
          const grid = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          grid.setAttribute('x1', margin.left);
          grid.setAttribute('y1', y);
          grid.setAttribute('x2', margin.left + plotWidth);
          grid.setAttribute('y2', y);
          grid.setAttribute('stroke', '#191A23');
          grid.setAttribute('stroke-opacity', '0.1');
          grid.setAttribute('stroke-dasharray', '3 3');
          svg.appendChild(grid);

          // 标签
          const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          label.setAttribute('x', margin.left - 10);
          label.setAttribute('y', y + 5);
          label.setAttribute('text-anchor', 'end');
          label.setAttribute('font-size', '14');
          label.setAttribute('font-weight', 'bold');
          label.setAttribute('fill', '#191A23');
          label.textContent = value;
          svg.appendChild(label);
        });

        // Y轴标题
        const yTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yTitle.setAttribute('x', 25);
        yTitle.setAttribute('y', margin.top + plotHeight / 2);
        yTitle.setAttribute('text-anchor', 'middle');
        yTitle.setAttribute('font-size', '16');
        yTitle.setAttribute('font-weight', 'bold');
        yTitle.setAttribute('fill', '#191A23');
        yTitle.setAttribute('transform', 'rotate(-90, 25, ' + (margin.top + plotHeight / 2) + ')');
        yTitle.textContent = '百分比(%)';
        svg.appendChild(yTitle);

        // 创建tooltip容器
        const tooltip = document.createElement('div');
        tooltip.style.cssText = \`
          position: fixed;
          display: none;
          background: white;
          border: 2px solid #191A23;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 4px 4px 0px 0px #191A23;
          z-index: 10000;
          pointer-events: none;
          max-width: 280px;
        \`;
        document.body.appendChild(tooltip);

        // 绘制每个科目的箱线图
        data.forEach((item, index) => {
          const x = getXPosition(index);
          const fullScore = item.fullScore || 100;

          // 转换为百分比
          const toPercent = (v) => (v / fullScore) * 100;

          const minY = scaleY(toPercent(item.min));
          const q1Y = scaleY(toPercent(item.q1));
          const medianY = scaleY(toPercent(item.median));
          const q3Y = scaleY(toPercent(item.q3));
          const maxY = scaleY(toPercent(item.max));
          const meanY = scaleY(toPercent(item.mean));

          const boxWidth = 50;

          // 须线（垂直线）
          const whisker = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          whisker.setAttribute('x1', x);
          whisker.setAttribute('y1', maxY);
          whisker.setAttribute('x2', x);
          whisker.setAttribute('y2', minY);
          whisker.setAttribute('stroke', '#191A23');
          whisker.setAttribute('stroke-width', '2');
          svg.appendChild(whisker);

          // 最小值横线
          const minLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          minLine.setAttribute('x1', x - 10);
          minLine.setAttribute('y1', minY);
          minLine.setAttribute('x2', x + 10);
          minLine.setAttribute('y2', minY);
          minLine.setAttribute('stroke', '#191A23');
          minLine.setAttribute('stroke-width', '2');
          svg.appendChild(minLine);

          // 最大值横线
          const maxLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          maxLine.setAttribute('x1', x - 10);
          maxLine.setAttribute('y1', maxY);
          maxLine.setAttribute('x2', x + 10);
          maxLine.setAttribute('y2', maxY);
          maxLine.setAttribute('stroke', '#191A23');
          maxLine.setAttribute('stroke-width', '2');
          svg.appendChild(maxLine);

          // 箱体（Q1-Q3）
          const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          box.setAttribute('x', x - boxWidth / 2);
          box.setAttribute('y', q3Y);
          box.setAttribute('width', boxWidth);
          box.setAttribute('height', q1Y - q3Y);
          box.setAttribute('fill', '#B9FF66');
          box.setAttribute('stroke', '#191A23');
          box.setAttribute('stroke-width', '2');
          svg.appendChild(box);

          // 中位数线
          const medianLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          medianLine.setAttribute('x1', x - boxWidth / 2);
          medianLine.setAttribute('y1', medianY);
          medianLine.setAttribute('x2', x + boxWidth / 2);
          medianLine.setAttribute('y2', medianY);
          medianLine.setAttribute('stroke', '#191A23');
          medianLine.setAttribute('stroke-width', '4');
          svg.appendChild(medianLine);

          // 平均值点
          const meanCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          meanCircle.setAttribute('cx', x);
          meanCircle.setAttribute('cy', meanY);
          meanCircle.setAttribute('r', 5);
          meanCircle.setAttribute('fill', '#FF6B6B');
          meanCircle.setAttribute('stroke', '#191A23');
          meanCircle.setAttribute('stroke-width', '2');
          svg.appendChild(meanCircle);

          // X轴标签
          const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          xLabel.setAttribute('x', x);
          xLabel.setAttribute('y', margin.top + plotHeight + 25);
          xLabel.setAttribute('text-anchor', 'middle');
          xLabel.setAttribute('font-size', '14');
          xLabel.setAttribute('font-weight', 'bold');
          xLabel.setAttribute('fill', '#191A23');
          xLabel.textContent = item.subject;
          svg.appendChild(xLabel);

          // 添加交互触发区域
          const trigger = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          trigger.setAttribute('x', x - boxWidth / 2 - 10);
          trigger.setAttribute('y', Math.min(maxY, q3Y) - 10);
          trigger.setAttribute('width', boxWidth + 20);
          trigger.setAttribute('height', Math.max(minY - maxY, q1Y - q3Y) + 20);
          trigger.setAttribute('fill', 'transparent');
          trigger.style.cursor = 'pointer';

          trigger.addEventListener('mouseenter', () => {
            tooltip.innerHTML = \`
              <p style="font-weight: 900; color: #191A23; margin-bottom: 8px; font-size: 1.125rem;">\${item.subject}</p>
              <div style="font-size: 0.875rem; line-height: 1.6;">
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px;">
                  <span style="color: rgba(25, 26, 35, 0.7);">样本数:</span>
                  <span style="font-weight: bold; color: #191A23;">\${item.count}人</span>
                  <span style="color: rgba(25, 26, 35, 0.7);">满分:</span>
                  <span style="font-weight: bold; color: #191A23;">\${item.fullScore}分</span>
                </div>
                <hr style="margin: 8px 0; border-color: rgba(25, 26, 35, 0.2); border-style: solid;" />
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px;">
                  <span style="color: rgba(25, 26, 35, 0.7);">最高分:</span>
                  <span style="font-weight: bold; color: #B9FF66;">\${item.max.toFixed(1)}</span>
                  <span style="color: rgba(25, 26, 35, 0.7);">Q3 (75%):</span>
                  <span style="font-weight: bold; color: #191A23;">\${item.q3.toFixed(1)}</span>
                  <span style="color: rgba(25, 26, 35, 0.7);">中位数:</span>
                  <span style="font-weight: bold; color: #191A23;">\${item.median.toFixed(1)}</span>
                  <span style="color: rgba(25, 26, 35, 0.7);">Q1 (25%):</span>
                  <span style="font-weight: bold; color: #191A23;">\${item.q1.toFixed(1)}</span>
                  <span style="color: rgba(25, 26, 35, 0.7);">最低分:</span>
                  <span style="font-weight: bold; color: #FF6B6B;">\${item.min.toFixed(1)}</span>
                </div>
                <hr style="margin: 8px 0; border-color: rgba(25, 26, 35, 0.2); border-style: solid;" />
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px;">
                  <span style="color: rgba(25, 26, 35, 0.7);">平均分:</span>
                  <span style="font-weight: bold; color: #191A23;">\${item.mean.toFixed(1)}</span>
                </div>
              </div>
            \`;
            tooltip.style.display = 'block';
          });

          trigger.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
          });

          trigger.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
          });

          svg.appendChild(trigger);
        });

        // 添加图例
        const legendContainer = document.createElement('div');
        legendContainer.style.cssText = 'display: flex; justify-content: center; gap: 32px; margin-top: 24px; font-size: 1rem;';
        legendContainer.innerHTML = \`
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 20px; background: #B9FF66; border: 2px solid #191A23;"></div>
            <span style="color: #191A23; font-weight: 600;">箱体 (Q1-Q3)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 2px; background: #191A23;"></div>
            <span style="color: #191A23; font-weight: 600;">中位数</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 16px; height: 16px; border-radius: 50%; background: #FF6B6B; border: 2px solid #191A23;"></div>
            <span style="color: #191A23; font-weight: 600;">平均值</span>
          </div>
        \`;
        mainWrapper.appendChild(legendContainer);

        // 添加说明文字
        const description = document.createElement('p');
        description.style.cssText = 'text-align: center; color: #6b7280; font-size: 0.75rem; margin-top: 8px;';
        description.textContent = '箱体表示Q1-Q3区间（中间50%学生），横线为中位数，红点为平均值。各科目已按百分比归一化，便于对比。';
        mainWrapper.appendChild(description);

        // 最终确认
        console.log('✅ BoxPlot渲染完成！');
        console.log('  - 容器ID:', containerId);
        console.log('  - 科目数量:', data.length);
        console.log('  - 最终子元素数量:', container.childElementCount);
        console.log('  - 主包装器已添加:', mainWrapper !== null);
      }

      // ========== 旧的BoxPlot恢复函数（已废弃） ==========
      function restoreBoxPlotInteraction(containerId, boxPlotData) {
        console.log('🔧 开始为BoxPlot添加交互:', containerId);

        const container = document.getElementById(containerId);
        if (!container) {
          console.warn('⚠️ BoxPlot容器未找到:', containerId);
          return;
        }

        const svg = container.querySelector('svg');
        if (!svg) {
          console.warn('⚠️ BoxPlot SVG未找到');
          return;
        }

        console.log('✓ 找到SVG，开始添加tooltip');

        // 创建浮动tooltip容器
        const tooltipDiv = document.createElement('div');
        tooltipDiv.id = 'boxplot-tooltip';
        tooltipDiv.style.cssText = \`
          position: fixed;
          display: none;
          background: white;
          border: 2px solid #191A23;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 4px 4px 0px 0px #191A23;
          z-index: 10000;
          pointer-events: none;
          max-width: 280px;
        \`;
        document.body.appendChild(tooltipDiv);

        // 查找所有科目的箱体（绿色矩形）
        const boxRects = Array.from(svg.querySelectorAll('rect[fill="#B9FF66"]'));
        console.log('📊 找到', boxRects.length, '个箱体');

        if (boxRects.length === 0 || !boxPlotData) {
          console.warn('⚠️ 未找到箱体或数据');
          return;
        }

        // 为每个箱体添加交互
        boxRects.forEach((rect, index) => {
          if (index >= boxPlotData.length) return;

          const data = boxPlotData[index];

          // 创建透明的触发区域（覆盖整个箱线图）
          const trigger = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          const bbox = rect.getBBox();

          // 扩大触发区域，包含须线
          trigger.setAttribute('x', bbox.x - 30);
          trigger.setAttribute('y', Math.max(0, bbox.y - 50));
          trigger.setAttribute('width', bbox.width + 60);
          trigger.setAttribute('height', bbox.height + 100);
          trigger.setAttribute('fill', 'transparent');
          trigger.setAttribute('stroke', 'none');
          trigger.style.cursor = 'pointer';

          // 鼠标事件
          trigger.addEventListener('mouseenter', (e) => {
            tooltipDiv.innerHTML = \`
              <p style="font-weight: 900; color: #191A23; margin-bottom: 8px; font-size: 1.125rem;">\${data.subject}</p>
              <div style="font-size: 0.875rem; line-height: 1.6;">
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px;">
                  <span style="color: rgba(25, 26, 35, 0.7);">样本数:</span>
                  <span style="font-weight: bold; color: #191A23;">\${data.count}人</span>

                  <span style="color: rgba(25, 26, 35, 0.7);">满分:</span>
                  <span style="font-weight: bold; color: #191A23;">\${data.fullScore}分</span>
                </div>
                <hr style="margin: 8px 0; border-color: rgba(25, 26, 35, 0.2);" />
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px;">
                  <span style="color: rgba(25, 26, 35, 0.7);">最高分:</span>
                  <span style="font-weight: bold; color: #B9FF66;">\${data.max.toFixed(1)}</span>

                  <span style="color: rgba(25, 26, 35, 0.7);">Q3 (75%):</span>
                  <span style="font-weight: bold; color: #191A23;">\${data.q3.toFixed(1)}</span>

                  <span style="color: rgba(25, 26, 35, 0.7);">中位数:</span>
                  <span style="font-weight: bold; color: #191A23;">\${data.median.toFixed(1)}</span>

                  <span style="color: rgba(25, 26, 35, 0.7);">Q1 (25%):</span>
                  <span style="font-weight: bold; color: #191A23;">\${data.q1.toFixed(1)}</span>

                  <span style="color: rgba(25, 26, 35, 0.7);">最低分:</span>
                  <span style="font-weight: bold; color: #FF6B6B;">\${data.min.toFixed(1)}</span>
                </div>
                <hr style="margin: 8px 0; border-color: rgba(25, 26, 35, 0.2);" />
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px;">
                  <span style="color: rgba(25, 26, 35, 0.7);">平均分:</span>
                  <span style="font-weight: bold; color: #191A23;">\${data.mean.toFixed(1)}</span>

                  \${data.outliers && data.outliers.length > 0 ? \`
                    <span style="color: rgba(25, 26, 35, 0.7);">异常值:</span>
                    <span style="color: #FF6B6B;">\${data.outliers.length}个</span>
                  \` : ''}
                </div>
              </div>
            \`;
            tooltipDiv.style.display = 'block';
          });

          trigger.addEventListener('mousemove', (e) => {
            tooltipDiv.style.left = (e.clientX + 15) + 'px';
            tooltipDiv.style.top = (e.clientY + 15) + 'px';
          });

          trigger.addEventListener('mouseleave', () => {
            tooltipDiv.style.display = 'none';
          });

          svg.appendChild(trigger);
        });

        console.log('✅ BoxPlot交互已添加: ' + boxRects.length + '个科目');
      }

      // 辅助函数：渲染箱线图（简化版，已弃用）
      function renderBoxPlotChart(containerId, data) {
        if (!data || data.length === 0) return;

        const chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: 400 },
          React.createElement(BarChart, {
            data: data,
            margin: { top: 20, right: 30, left: 20, bottom: 80 }
          },
            React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
            React.createElement(XAxis, {
              dataKey: 'subject',
              angle: -45,
              textAnchor: 'end',
              height: 100
            }),
            React.createElement(YAxis, {
              label: { value: '分数', angle: -90, position: 'insideLeft' }
            }),
            React.createElement(Tooltip, {
              content: (props) => {
                if (!props.active || !props.payload || props.payload.length === 0) return null;
                const data = props.payload[0].payload;
                return React.createElement('div', {
                  style: {
                    background: 'white',
                    border: '2px solid #191A23',
                    padding: '10px',
                    borderRadius: '8px'
                  }
                },
                  React.createElement('p', { style: { fontWeight: 'bold', marginBottom: '5px' } }, data.subject),
                  React.createElement('p', {}, \`最小值: \${data.min.toFixed(1)}\`),
                  React.createElement('p', {}, \`Q1: \${data.q1.toFixed(1)}\`),
                  React.createElement('p', {}, \`中位数: \${data.median.toFixed(1)}\`),
                  React.createElement('p', {}, \`Q3: \${data.q3.toFixed(1)}\`),
                  React.createElement('p', {}, \`最大值: \${data.max.toFixed(1)}\`),
                  React.createElement('p', {}, \`满分: \${data.fullScore}\`)
                );
              }
            }),
            React.createElement(Bar, { dataKey: 'median', fill: COLORS.cyan, name: '中位数' })
          )
        );

        const root = ReactDOM.createRoot(document.getElementById(containerId));
        root.render(chartElement);
      }

      // 渲染绩效漏斗图
      function renderFunnelChart(containerId, data) {
        if (!data || data.length === 0) return;

        const colors = [COLORS.green, COLORS.cyan, COLORS.yellow, COLORS.red];

        const chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: 500 },
          React.createElement(FunnelChart, {},
            React.createElement(Tooltip, {
              formatter: (value, name) => {
                if (name === 'count') return [value + ' 人', '人数'];
                return [value, name];
              }
            }),
            React.createElement(Funnel, {
              dataKey: 'count',
              data: data,
              isAnimationActive: true
            }, data.map((entry, index) =>
              React.createElement(Cell, { key: 'cell-' + index, fill: colors[index] })
            ))
          )
        );

        const root = ReactDOM.createRoot(document.getElementById(containerId));
        root.render(chartElement);
      }

      // 渲染排名分布图
      function renderRankDistributionChart(containerId, data) {
        if (!data || data.length === 0) return;

        const colors = [COLORS.green, COLORS.cyan, COLORS.yellow, COLORS.orange, COLORS.red, COLORS.darkRed];

        const chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: 400 },
          React.createElement(BarChart, {
            data: data,
            margin: { top: 20, right: 30, left: 20, bottom: 80 }
          },
            React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
            React.createElement(XAxis, {
              dataKey: 'segment',
              angle: -15,
              textAnchor: 'end',
              height: 80
            }),
            React.createElement(YAxis, {
              label: { value: '学生人数', angle: -90, position: 'insideLeft' }
            }),
            React.createElement(Tooltip, {
              formatter: (value, name) => {
                if (name === 'count') return [value + ' 人', '人数'];
                return [value, name];
              }
            }),
            React.createElement(Legend, {}),
            React.createElement(Bar, {
              dataKey: 'count',
              name: '人数',
              fill: COLORS.cyan
            }, data.map((entry, index) =>
              React.createElement(Cell, { key: 'cell-' + index, fill: colors[index % colors.length] })
            ),
              React.createElement(LabelList, { dataKey: 'count', position: 'top' })
            )
          )
        );

        const root = ReactDOM.createRoot(document.getElementById(containerId));
        root.render(chartElement);
      }

      // 渲染SBI雷达图（完整版，包含标题、SBI值显示和解读说明）
      function renderSBIRadarChart(containerId, data, sbiValue) {
        if (!data || data.length === 0) return;

        const container = document.getElementById(containerId);
        container.innerHTML = '';
        container.style.width = '100%';

        // 创建标题栏（包含SBI值）
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;';

        const title = document.createElement('h3');
        title.style.cssText = 'font-weight: bold; font-size: 1.125rem; color: #191A23;';
        title.textContent = '📐 学科均衡度雷达图';

        const sbiDisplay = document.createElement('div');
        sbiDisplay.style.cssText = 'display: flex; align-items: center; gap: 8px;';

        const sbiLabel = document.createElement('span');
        sbiLabel.style.cssText = 'font-size: 0.875rem; color: rgba(25, 26, 35, 0.7);';
        sbiLabel.textContent = '学科均衡度(SBI):';

        const sbiValueSpan = document.createElement('span');
        sbiValueSpan.style.cssText = \`font-size: 1.5rem; font-weight: 900; \${
          sbiValue >= 80 ? 'color: #16a34a;' :
          sbiValue >= 60 ? 'color: #ca8a04;' :
          'color: #dc2626;'
        }\`;
        sbiValueSpan.textContent = sbiValue.toFixed(1);

        const sbiUnit = document.createElement('span');
        sbiUnit.style.cssText = 'font-size: 0.875rem; color: rgba(25, 26, 35, 0.7);';
        sbiUnit.textContent = '/ 100';

        sbiDisplay.appendChild(sbiLabel);
        sbiDisplay.appendChild(sbiValueSpan);
        sbiDisplay.appendChild(sbiUnit);
        titleDiv.appendChild(title);
        titleDiv.appendChild(sbiDisplay);
        container.appendChild(titleDiv);

        // 创建图表容器
        const chartDiv = document.createElement('div');
        chartDiv.id = containerId + '-chart';
        chartDiv.style.width = '100%';
        chartDiv.style.height = '450px';
        container.appendChild(chartDiv);

        // 渲染Recharts雷达图
        const chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: 450 },
          React.createElement(RadarChart, { data: data },
            React.createElement(PolarGrid, { stroke: '#191A23', strokeOpacity: 0.3 }),
            React.createElement(PolarAngleAxis, {
              dataKey: 'subject',
              stroke: '#191A23',
              style: { fontSize: '14px', fontWeight: '600' }
            }),
            React.createElement(PolarRadiusAxis, {
              angle: 90,
              domain: [0, 100],
              stroke: '#191A23',
              style: { fontSize: '12px', fontWeight: '600' }
            }),
            React.createElement(Tooltip, {
              content: (props) => {
                if (!props.active || !props.payload || props.payload.length === 0) return null;
                const data = props.payload[0].payload;
                return React.createElement('div', {
                  style: {
                    backgroundColor: 'white',
                    border: '2px solid #191A23',
                    borderRadius: '8px',
                    boxShadow: '4px 4px 0px 0px #191A23',
                    padding: '12px'
                  }
                },
                  React.createElement('p', { style: { fontWeight: 'bold', color: '#191A23', marginBottom: '4px' } }, data.subject),
                  React.createElement('p', { style: { fontSize: '0.875rem' } },
                    React.createElement('span', { style: { fontWeight: '600' } }, '得分: '),
                    data.actualScore + ' / ' + data.fullScore
                  ),
                  React.createElement('p', { style: { fontSize: '0.875rem' } },
                    React.createElement('span', { style: { fontWeight: '600' } }, '得分率: '),
                    data.scoreRate.toFixed(1) + '%'
                  )
                );
              }
            }),
            React.createElement(Radar, {
              name: '得分率(%)',
              dataKey: 'scoreRate',
              stroke: COLORS.green,
              fill: COLORS.green,
              fillOpacity: 0.6,
              strokeWidth: 3
            }),
            React.createElement(Legend, {})
          )
        );

        const root = ReactDOM.createRoot(chartDiv);
        root.render(chartElement);

        // 添加底部解读说明
        const interpretationDiv = document.createElement('div');
        interpretationDiv.style.cssText = 'margin-top: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px;';
        interpretationDiv.innerHTML = \`
          <p style="font-size: 0.875rem; color: #374151; font-weight: 500; margin-bottom: 8px;">💡 学科均衡度解读：</p>
          <ul style="font-size: 0.75rem; color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.5;">
            <li>雷达图越接近正多边形，学科发展越均衡</li>
            <li>SBI ≥ 80：学科发展非常均衡</li>
            <li>SBI 60-80：较为均衡，个别科目需加强</li>
            <li>SBI < 60：存在明显偏科，需重点关注薄弱科目</li>
          </ul>
        \`;
        container.appendChild(interpretationDiv);
      }

      // 渲染API-SBI散点图（完整版，包含标题、参考线、象限着色和四象限解读）
      function renderAPISBIScatterChart(containerId, data) {
        console.log('🎨 重新渲染API-SBI散点图:', containerId, data?.length + '个数据点');

        if (!data || data.length === 0) return;

        const container = document.getElementById(containerId);
        if (!container) {
          console.error('API-SBI容器未找到:', containerId);
          return;
        }

        // 渲染前的最终清理 - 确保移除所有四象限卡片
        console.log('🧹 清理API-SBI容器内的旧内容...');

        // 1. 移除所有可能的四象限卡片
        const allElements = container.querySelectorAll('*');
        let removedCount = 0;
        allElements.forEach(el => {
          const text = el.textContent || '';
          const style = el.getAttribute('style') || '';

          // 检查是否包含四象限相关文字
          if (text.includes('优秀且均衡') ||
              text.includes('优秀但偏科') ||
              text.includes('均衡但待提高') ||
              text.includes('需重点关注') ||
              text.includes('API≥') ||
              text.includes('API<') ||
              text.includes('SBI≥') ||
              text.includes('SBI<') ||
              text.includes('四象限解读')) {
            el.remove();
            removedCount++;
          }
        });

        if (removedCount > 0) {
          console.log('  移除了 ' + removedCount + ' 个旧元素');
        }

        // 2. 完全清空容器
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.innerHTML = '';
        container.textContent = '';

        // 3. 重置容器样式
        container.style.cssText = 'width: 100%; padding: 0; margin: 0; background: transparent; position: relative;';

        // 创建标题
        const titleH3 = document.createElement('h3');
        titleH3.style.cssText = 'font-weight: bold; font-size: 1.125rem; color: #191A23; margin-bottom: 16px;';
        titleH3.textContent = '🔷 学业表现指数(API) vs 学科均衡度(SBI)';
        container.appendChild(titleH3);

        // 创建图表容器
        const chartDiv = document.createElement('div');
        chartDiv.id = containerId + '-chart';
        chartDiv.style.width = '100%';
        chartDiv.style.height = '500px';
        container.appendChild(chartDiv);

        // 根据API和SBI分类着色函数
        const getColor = (api, sbi) => {
          if (api >= 70 && sbi >= 70) return COLORS.green; // 优秀且均衡
          if (api >= 70 && sbi < 70) return COLORS.yellow; // 优秀但偏科
          if (api < 70 && sbi >= 70) return COLORS.cyan; // 均衡但成绩待提高
          return COLORS.red; // 需重点关注
        };

        // 渲染Recharts散点图
        const chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: 500 },
          React.createElement(ScatterChart, { margin: { top: 20, right: 30, bottom: 60, left: 20 } },
            React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: '#191A23', opacity: 0.1 }),
            React.createElement(XAxis, {
              type: 'number',
              dataKey: 'api',
              name: 'API',
              domain: [0, 100],
              label: {
                value: '学业表现指数 (API)',
                position: 'insideBottom',
                offset: -10,
                style: { fontSize: '14px', fontWeight: 'bold' }
              },
              stroke: '#191A23',
              style: { fontSize: '12px', fontWeight: '600' }
            }),
            React.createElement(YAxis, {
              type: 'number',
              dataKey: 'sbi',
              name: 'SBI',
              domain: [0, 100],
              label: {
                value: '学科均衡度 (SBI)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: '14px', fontWeight: 'bold' }
              },
              stroke: '#191A23',
              style: { fontSize: '12px', fontWeight: '600' }
            }),
            React.createElement(ZAxis, { type: 'number', dataKey: 'score', range: [100, 400], name: '总分' }),
            // 参考线: API=70 和 SBI=70
            React.createElement(ReferenceLine, { x: 70, stroke: '#191A23', strokeDasharray: '5 5', strokeOpacity: 0.5 }),
            React.createElement(ReferenceLine, { y: 70, stroke: '#191A23', strokeDasharray: '5 5', strokeOpacity: 0.5 }),
            React.createElement(Tooltip, {
              cursor: { strokeDasharray: '3 3' },
              content: (props) => {
                if (!props.active || !props.payload || props.payload.length === 0) return null;
                const data = props.payload[0].payload;
                return React.createElement('div', {
                  style: {
                    backgroundColor: 'white',
                    border: '2px solid #191A23',
                    borderRadius: '8px',
                    boxShadow: '4px 4px 0px 0px #191A23',
                    padding: '12px'
                  }
                },
                  React.createElement('p', { style: { fontWeight: 'bold', color: '#191A23', marginBottom: '4px' } }, data.studentName || '学生'),
                  data.className && React.createElement('p', { style: { fontSize: '0.875rem', color: 'rgba(25, 26, 35, 0.7)', marginBottom: '8px' } }, data.className),
                  React.createElement('p', { style: { fontSize: '0.875rem' } },
                    React.createElement('span', { style: { fontWeight: '600' } }, 'API: '),
                    data.api.toFixed(1)
                  ),
                  React.createElement('p', { style: { fontSize: '0.875rem' } },
                    React.createElement('span', { style: { fontWeight: '600' } }, 'SBI: '),
                    data.sbi.toFixed(1)
                  ),
                  React.createElement('p', { style: { fontSize: '0.875rem' } },
                    React.createElement('span', { style: { fontWeight: '600' } }, '总分: '),
                    data.score.toFixed(1)
                  )
                );
              }
            }),
            React.createElement(Scatter, { name: '学生', data: data, stroke: '#191A23', strokeWidth: 2 },
              data.map((entry, index) =>
                React.createElement(Cell, { key: 'cell-' + index, fill: getColor(entry.api, entry.sbi) })
              )
            )
          )
        );

        const root = ReactDOM.createRoot(chartDiv);
        root.render(chartElement);

        // 创建四象限解读的包装容器
        const quadrantWrapper = document.createElement('div');
        quadrantWrapper.style.cssText = 'width: 100%; margin-top: 24px; padding: 0;';

        // 添加四象限解读标题
        const quadrantTitle = document.createElement('h4');
        quadrantTitle.style.cssText = 'font-weight: bold; font-size: 1rem; color: #191A23; margin-bottom: 12px;';
        quadrantTitle.textContent = '📊 四象限解读';
        quadrantWrapper.appendChild(quadrantTitle);

        // 创建四象限网格容器
        const quadrantGrid = document.createElement('div');
        quadrantGrid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%;';

        // 对于小屏幕，改为单列布局
        const mediaQuery = document.createElement('style');
        mediaQuery.textContent = '@media (max-width: 768px) { #' + containerId + '-quadrants { grid-template-columns: 1fr !important; } }';
        document.head.appendChild(mediaQuery);
        quadrantGrid.id = containerId + '-quadrants';

        const quadrants = [
          {
            title: '🌟 优秀且均衡',
            subtitle: '(API≥70, SBI≥70)',
            desc: '成绩优秀，学科发展均衡，继续保持',
            bgColor: COLORS.green
          },
          {
            title: '⚠️ 优秀但偏科',
            subtitle: '(API≥70, SBI<70)',
            desc: '总体成绩好，但需关注薄弱科目',
            bgColor: COLORS.yellow
          },
          {
            title: '📐 均衡但待提高',
            subtitle: '(API<70, SBI≥70)',
            desc: '学科均衡，需整体提升学习效率',
            bgColor: COLORS.cyan
          },
          {
            title: '🚨 需重点关注',
            subtitle: '(API<70, SBI<70)',
            desc: '成绩和均衡度都需改善，需针对性辅导',
            bgColor: COLORS.red
          }
        ];

        quadrants.forEach((q, index) => {
          const card = document.createElement('div');
          card.style.cssText = \`
            padding: 12px;
            border-radius: 6px;
            border: 2px solid #191A23;
            background-color: \${q.bgColor};
            min-height: 100px;
            box-sizing: border-box;
          \`;

          // 使用表格布局来确保对齐
          const cardContent = document.createElement('div');
          cardContent.style.cssText = 'display: flex; flex-direction: column; gap: 8px; height: 100%;';

          // 标题行
          const titleRow = document.createElement('div');
          titleRow.style.cssText = 'font-weight: bold; color: #191A23; font-size: 0.9rem; line-height: 1.2;';
          titleRow.textContent = q.title;

          // 副标题行
          const subtitleRow = document.createElement('div');
          subtitleRow.style.cssText = 'font-size: 0.65rem; color: rgba(25, 26, 35, 0.6); line-height: 1.2;';
          subtitleRow.textContent = q.subtitle;

          // 分隔线
          const divider = document.createElement('div');
          divider.style.cssText = 'height: 1px; background: rgba(25, 26, 35, 0.2); margin: 4px 0;';

          // 描述行
          const descRow = document.createElement('div');
          descRow.style.cssText = 'font-size: 0.75rem; color: rgba(25, 26, 35, 0.8); line-height: 1.3; flex-grow: 1;';
          descRow.textContent = q.desc;

          cardContent.appendChild(titleRow);
          cardContent.appendChild(subtitleRow);
          cardContent.appendChild(divider);
          cardContent.appendChild(descRow);
          card.appendChild(cardContent);
          quadrantGrid.appendChild(card);
        });

        quadrantWrapper.appendChild(quadrantGrid);
        container.appendChild(quadrantWrapper);
      }

      // 渲染分数段人数分布柱状图
      function renderScoreRangeBarChart(containerId, data) {
        if (!data || data.length === 0) return;

        const chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: 300 },
          React.createElement(BarChart, { data: data },
            React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
            React.createElement(XAxis, { dataKey: 'range' }),
            React.createElement(YAxis, {}),
            React.createElement(Tooltip, {}),
            React.createElement(Bar, {
              dataKey: 'count',
              fill: COLORS.green,
              stroke: '#191A23',
              strokeWidth: 2
            },
              React.createElement(LabelList, {
                dataKey: 'count',
                position: 'top',
                style: { fontSize: 12, fontWeight: 'bold', fill: '#191A23' }
              })
            )
          )
        );

        const root = ReactDOM.createRoot(document.getElementById(containerId));
        root.render(chartElement);
      }

      // 渲染班级对比柱状图
      function renderClassComparisonBarChart(containerId, data) {
        if (!data || data.length === 0) return;

        const chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: 300 },
          React.createElement(BarChart, { data: data },
            React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
            React.createElement(XAxis, { dataKey: 'className' }),
            React.createElement(YAxis, {}),
            React.createElement(Tooltip, {}),
            React.createElement(Bar, {
              dataKey: 'avgScore',
              fill: '#60a5fa',
              stroke: '#191A23',
              strokeWidth: 2
            })
          )
        );

        const root = ReactDOM.createRoot(document.getElementById(containerId));
        root.render(chartElement);
      }

      // 渲染分数段分布分析堆积柱状图
      function renderStackedSubjectBarChart(containerId, data) {
        if (!data || data.length === 0) return;

        // 转换数据格式
        const chartData = data.map(item => {
          const distObj = { subject: item.subject };
          item.distribution.forEach(d => {
            distObj[d.key] = d.count;
            if (!distObj._labels) distObj._labels = {};
            distObj._labels[d.key] = d.range;
          });
          return distObj;
        });

        const chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: 400 },
          React.createElement(BarChart, { data: chartData },
            React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
            React.createElement(XAxis, {
              dataKey: 'subject',
              angle: -15,
              textAnchor: 'end',
              height: 80
            }),
            React.createElement(YAxis, {
              label: { value: '人数', angle: -90, position: 'insideLeft' }
            }),
            React.createElement(Tooltip, {
              formatter: (value, name, props) => {
                const labels = props.payload._labels;
                const label = labels?.[name] || name;
                return [value, label];
              }
            }),
            React.createElement(Legend, {}),
            React.createElement(Bar, { dataKey: 'fail', stackId: 'a', fill: '#ff6384', name: '不及格' }),
            React.createElement(Bar, { dataKey: 'pass', stackId: 'a', fill: '#ff9f40', name: '及格' }),
            React.createElement(Bar, { dataKey: 'medium', stackId: 'a', fill: '#ffcd56', name: '中等' }),
            React.createElement(Bar, { dataKey: 'good', stackId: 'a', fill: '#4bc0c0', name: '良好' }),
            React.createElement(Bar, { dataKey: 'excellent', stackId: 'a', fill: COLORS.green, name: '优秀' })
          )
        );

        const root = ReactDOM.createRoot(document.getElementById(containerId));
        root.render(chartElement);
      }

      // 渲染典型学生对比雷达图
      function renderTypicalStudentsRadarChart(containerId, typicalStudents) {
        if (!typicalStudents || typicalStudents.length < 3) return;

        // 构建雷达图数据
        const subjects = [
          { key: 'chinese_score', name: '语文' },
          { key: 'math_score', name: '数学' },
          { key: 'english_score', name: '英语' },
          { key: 'physics_score', name: '物理' },
          { key: 'chemistry_score', name: '化学' },
          { key: 'politics_score', name: '政治' },
          { key: 'history_score', name: '历史' },
          { key: 'biology_score', name: '生物' },
          { key: 'geography_score', name: '地理' },
        ];

        const radarData = subjects.map(sub => {
          const excellent = parseFloat(typicalStudents[0][sub.key] || 0);
          const middle = parseFloat(typicalStudents[1][sub.key] || 0);
          const poor = parseFloat(typicalStudents[2][sub.key] || 0);

          if (excellent > 0 || middle > 0 || poor > 0) {
            return {
              subject: sub.name,
              '优秀学生': excellent,
              '中等学生': middle,
              '后进学生': poor,
            };
          }
          return null;
        }).filter(d => d !== null);

        // 动态计算最大值
        const allScores = radarData.flatMap(d => [d['优秀学生'], d['中等学生'], d['后进学生']]);
        const maxScore = Math.max(...allScores, 100);
        const domainMax = maxScore > 100 ? (maxScore <= 120 ? 120 : 150) : 100;

        const chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: 400 },
          React.createElement(RadarChart, { data: radarData },
            React.createElement(PolarGrid, { stroke: '#e5e7eb' }),
            React.createElement(PolarAngleAxis, {
              dataKey: 'subject',
              tick: { fill: '#666', fontSize: 12 }
            }),
            React.createElement(PolarRadiusAxis, { angle: 90, domain: [0, domainMax] }),
            React.createElement(Tooltip, {}),
            React.createElement(Legend, {}),
            React.createElement(Radar, {
              name: typicalStudents[0].name + '(总分' + typicalStudents[0].total_score + ')',
              dataKey: '优秀学生',
              stroke: COLORS.green,
              fill: COLORS.green,
              fillOpacity: 0.5
            }),
            React.createElement(Radar, {
              name: typicalStudents[1].name + '(总分' + typicalStudents[1].total_score + ')',
              dataKey: '中等学生',
              stroke: '#ff9f40',
              fill: '#ff9f40',
              fillOpacity: 0.5
            }),
            React.createElement(Radar, {
              name: typicalStudents[2].name + '(总分' + typicalStudents[2].total_score + ')',
              dataKey: '后进学生',
              stroke: '#ff6384',
              fill: '#ff6384',
              fillOpacity: 0.5
            })
          )
        );

        const root = ReactDOM.createRoot(document.getElementById(containerId));
        root.render(chartElement);
      }

      // 根据data-chart-type渲染所有图表
      // 同时查找两种类型的容器：新的BoxPlot容器和普通Recharts容器
      const allContainers = document.querySelectorAll('[data-chart-type], [data-boxplot-container]');
      let renderedCount = 0;
      let skippedCount = 0;

      console.log('📊 找到 ' + allContainers.length + ' 个图表容器需要处理');

      allContainers.forEach((container) => {
        try {
          const containerId = container.getAttribute('id');
          const chartType = container.getAttribute('data-chart-type');
          const chartIndex = container.getAttribute('data-chart-index') || container.getAttribute('data-boxplot-container');

          console.log('🎨 处理图表:', chartType, '| 容器ID:', containerId);

          switch (chartType) {
            case 'boxplot':
              // BoxPlot需要完全重新渲染（SVG内容在克隆时丢失）
              if (reportData.basicAnalysis?.scoreDistribution?.rawData?.boxPlotData) {
                console.log('📦 渲染BoxPlot - 容器ID:', containerId);
                // 容器已经在克隆阶段清空，直接渲染
                renderBoxPlotFromScratch(containerId, reportData.basicAnalysis.scoreDistribution.rawData.boxPlotData);
                renderedCount++;
              } else {
                console.warn('⚠️ BoxPlot数据未找到');
              }
              break;

            case 'score-range-bar':
              if (reportData.basicAnalysis?.scoreDistribution?.chartData) {
                renderScoreRangeBarChart(containerId, reportData.basicAnalysis.scoreDistribution.chartData);
                renderedCount++;
              }
              break;

            case 'class-comparison-bar':
              if (reportData.basicAnalysis?.classComparison?.chartData) {
                renderClassComparisonBarChart(containerId, reportData.basicAnalysis.classComparison.chartData);
                renderedCount++;
              }
              break;

            case 'stacked-subject-bar':
              if (reportData.basicAnalysis?.subjectAnalysis?.scoreDistributionBySubject) {
                renderStackedSubjectBarChart(containerId, reportData.basicAnalysis.subjectAnalysis.scoreDistributionBySubject);
                renderedCount++;
              }
              break;

            case 'typical-students-radar':
              if (reportData.basicAnalysis?.subjectAnalysis?.typicalStudents) {
                renderTypicalStudentsRadarChart(containerId, reportData.basicAnalysis.subjectAnalysis.typicalStudents);
                renderedCount++;
              }
              break;

            case 'performance-funnel':
              if (reportData.advancedAnalysis?.rankings?.rawData?.funnelData) {
                renderFunnelChart(containerId, reportData.advancedAnalysis.rankings.rawData.funnelData);
                renderedCount++;
              }
              break;

            case 'rank-distribution':
              console.log('📊 尝试渲染排名分布图 - 容器ID:', containerId);
              console.log('   数据存在:', !!reportData.advancedAnalysis?.rankings?.rawData?.rankDistributionData);
              if (reportData.advancedAnalysis?.rankings?.rawData?.rankDistributionData) {
                renderRankDistributionChart(containerId, reportData.advancedAnalysis.rankings.rawData.rankDistributionData);
                renderedCount++;
                console.log('   ✅ 排名分布图渲染成功');
              } else {
                console.warn('   ⚠️ 排名分布数据未找到');
              }
              break;

            case 'sbi-radar':
              console.log('📐 尝试渲染SBI雷达图 - 容器ID:', containerId);
              console.log('   数据存在:', !!reportData.advancedAnalysis?.rankings?.rawData?.sbiRadarData);
              if (reportData.advancedAnalysis?.rankings?.rawData?.sbiRadarData) {
                renderSBIRadarChart(containerId, reportData.advancedAnalysis.rankings.rawData.sbiRadarData, reportData.advancedAnalysis.rankings.rawData.avgSBI);
                renderedCount++;
                console.log('   ✅ SBI雷达图渲染成功');
              } else {
                console.warn('   ⚠️ SBI雷达图数据未找到');
              }
              break;

            case 'api-sbi-scatter':
              console.log('📈 尝试渲染API-SBI散点图 - 容器ID:', containerId);
              console.log('   数据存在:', !!reportData.advancedAnalysis?.rankings?.rawData?.apiSbiScatterData);
              if (reportData.advancedAnalysis?.rankings?.rawData?.apiSbiScatterData) {
                renderAPISBIScatterChart(containerId, reportData.advancedAnalysis.rankings.rawData.apiSbiScatterData);
                renderedCount++;
                console.log('   ✅ API-SBI散点图渲染成功');
              } else {
                console.warn('   ⚠️ API-SBI数据未找到');
              }
              break;

            case 'grade-flow-sankey':
            case 'correlation-heatmap':
              // 复杂图表(使用D3.js)，跳过重新渲染，保留静态快照
              console.log('⚠️ 跳过复杂图表:', chartType);
              skippedCount++;
              break;

            case 'unknown':
            default:
              console.warn('⚠️ 未知图表类型:', chartType);
              skippedCount++;
              break;
          }
        } catch (err) {
          console.error('渲染图表失败:', err);
        }
      });

      console.log(\`✅ 已渲染 \${renderedCount} 个交互式图表，跳过 \${skippedCount} 个复杂图表\`);

      // 添加页脚信息
      const footer = document.createElement('div');
      footer.style.cssText = 'text-align: center; padding: 30px 0; margin-top: 50px; border-top: 2px solid #eee; color: #999; font-size: 0.85rem;';
      footer.innerHTML = \`
        <p>本报告由智能分析系统自动生成 · 🔒 完全离线可用 · 图表完全交互（\${renderedCount}个交互图表）</p>
        <p style="margin-top: 5px; color: #B9FF66; font-weight: bold;">✓ 所有库文件已内置（React + ReactDOM + PropTypes + Recharts）</p>
        \${skippedCount > 0 ? '<p style="margin-top: 5px; color: #FFA726;">注：复杂图表（Sankey、Heatmap）保留为静态截图</p>' : ''}
        <p style="margin-top: 5px;">© \${new Date().getFullYear()} 教学质量分析平台</p>
      \`;
      document.body.appendChild(footer);

      console.log('✅ 离线报告初始化完成');
    });
  </script>
</body>
</html>`;

      // 创建Blob并下载
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.metadata.examTitle}_分析报告_${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("✅ HTML导出成功！与系统内报告完全一致，🔒 完全离线可用", {
        duration: 5000,
      });
    } catch (error) {
      console.error("HTML导出失败:", error);
      toast.error("HTML导出失败，请重试");
    }
  };

  const getSeverityBadge = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return (
          <Badge className="bg-red-500 text-white">
            <AlertTriangle className="h-3 w-3 mr-1" />高
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-500 text-white">
            <AlertCircle className="h-3 w-3 mr-1" />中
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />低
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#B9FF66]" />
      </div>
    );
  }

  if (error === "no-report") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 space-y-4">
        <FileText className="h-16 w-16 text-gray-300" />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-gray-700">暂无分析报告</h3>
          <p className="text-sm text-gray-500">
            该考试还没有生成分析报告，点击下方按钮自动生成
          </p>
        </div>
        <Button
          onClick={(e) => {
            e.preventDefault();
            generateReport();
          }}
          disabled={isGenerating}
          className="border-2 border-black bg-[#B9FF66] hover:bg-[#a3e052] text-[#191A23] shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] transition-all duration-200 font-bold"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              生成分析报告
            </>
          )}
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>未找到报告</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 报告头部 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-[#B9FF66]" />
              <h1 className="text-3xl font-black text-[#191A23]">
                智能分析报告
              </h1>
              <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black">
                {report.metadata.reportType === "complete"
                  ? "完整"
                  : report.metadata.reportType === "advanced"
                    ? "高级"
                    : "基础"}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{report.metadata.examTitle}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(report.metadata.generatedAt).toLocaleString(
                    "zh-CN"
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{report.metadata.dataSnapshot.totalStudents} 名学生</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-2 border-black"
              onClick={(e) => {
                e.preventDefault();
                generateReport(true);
              }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              重新生成
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-2 border-black">
                  <FileDown className="h-4 w-4 mr-2" />
                  导出报告
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-2 border-black"
              >
                <DropdownMenuItem
                  onClick={handleExportHtml}
                  className="cursor-pointer"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  导出为 HTML（🔒 完全离线，图表交互）
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportPdf}
                  className="cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出为 PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="border-2 border-black"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 🆕 功能更新提示 - 如果报告缺少新图表，提示用户重新生成 */}
      {report.metadata.reportType !== "basic" &&
        !report.advancedAnalysis?.gradeFlow &&
        !report.advancedAnalysis?.correlations?.chartData && (
          <Alert className="m-6 mb-0 border-2 border-blue-500 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <div className="flex items-center justify-between">
                <div>
                  <strong>🎉 新功能上线！</strong>
                  <span className="ml-2">
                    当前报告版本较旧，点击"重新生成"按钮可体验新增的{" "}
                    <strong>等级流动桑基图</strong> 和{" "}
                    <strong>学科相关性热力图</strong> 分析！
                  </span>
                </div>
                <Button
                  size="sm"
                  className="ml-4 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    generateReport(true);
                  }}
                  disabled={isGenerating}
                >
                  {isGenerating ? "生成中..." : "立即更新"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div ref={reportContentRef} className="p-6 space-y-6">
          {/* AI 洞察分析 - 核心摘要 */}
          {report.aiInsights && (
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23] no-page-break">
              <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  AI 洞察分析 - 核心摘要
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-base leading-relaxed whitespace-pre-wrap">
                  {renderMarkdown(report.aiInsights.summary)}
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  使用模型: {report.aiInsights.modelUsed} | 置信度:{" "}
                  {(report.aiInsights.confidence * 100).toFixed(0)}%
                </div>
              </CardContent>
            </Card>
          )}

          {/* 步骤2：关键发现提取 */}
          {report.aiInsights?.keyFindings &&
            report.aiInsights.keyFindings.length > 0 && (
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23] no-page-break">
                <CardHeader className="bg-white border-b-2 border-black">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    关键发现提取 ({report.aiInsights.keyFindings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {report.aiInsights.keyFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg"
                    >
                      {getSeverityBadge(finding.severity)}
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {renderMarkdown(finding.message)}
                        </div>
                        {finding.details && (
                          <div className="text-sm text-gray-600 mt-2">
                            {renderMarkdown(finding.details)}
                          </div>
                        )}
                        {finding.relatedCharts &&
                          finding.relatedCharts.length > 0 && (
                            <div className="mt-2 text-xs text-blue-600">
                              💡 相关图表: {finding.relatedCharts.join(", ")}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          {/* 步骤3：详细分析 - 数据概览与可视化 */}
          {report.basicAnalysis && (
            <>
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23] no-page-break">
                <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                  <CardTitle className="flex items-center gap-2">
                    📊 详细分析 - 数据概览与可视化
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* 数据统计表格 */}
                  {report.basicAnalysis.subjectAnalysis?.detailedStats && (
                    <div className="space-y-4 no-page-break">
                      <h3 className="font-bold text-lg text-[#191A23]">
                        📈 数据概览与描述性统计
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-gray-100 border-b-2 border-black">
                              <th className="p-3 text-left font-semibold">
                                科目
                              </th>
                              <th className="p-3 text-right font-semibold">
                                平均分
                              </th>
                              <th className="p-3 text-right font-semibold">
                                最高分
                              </th>
                              <th className="p-3 text-right font-semibold">
                                最低分
                              </th>
                              <th className="p-3 text-right font-semibold">
                                及格率(%)
                              </th>
                              <th className="p-3 text-right font-semibold">
                                优秀率(%)
                              </th>
                              <th className="p-3 text-right font-semibold">
                                标准差
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.basicAnalysis.subjectAnalysis.detailedStats.map(
                              (stat: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className="border-b hover:bg-gray-50"
                                >
                                  <td className="p-3 font-medium">
                                    {stat.subject}
                                  </td>
                                  <td className="p-3 text-right">
                                    {stat.avgScore.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-right">
                                    {stat.maxScore}
                                  </td>
                                  <td className="p-3 text-right">
                                    {stat.minScore}
                                  </td>
                                  <td className="p-3 text-right">
                                    <span
                                      className={
                                        stat.passRate >= 85
                                          ? "text-green-600 font-semibold"
                                          : stat.passRate >= 60
                                            ? "text-orange-600"
                                            : "text-red-600 font-semibold"
                                      }
                                    >
                                      {stat.passRate.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <span
                                      className={
                                        stat.excellentRate >= 30
                                          ? "text-green-600 font-semibold"
                                          : "text-gray-700"
                                      }
                                    >
                                      {stat.excellentRate.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    {stat.stdDev.toFixed(2)}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-sm text-gray-600 mt-4">
                        从统计数据可以看出，各科目的表现存在明显差异。及格率和优秀率反映了整体掌握水平，标准差反映了成绩分布的离散程度。
                      </p>
                    </div>
                  )}
                  {/* 成绩分布分析 */}
                  {report.basicAnalysis.scoreDistribution?.chartData && (
                    <div className="space-y-4 no-page-break">
                      <h3 className="font-bold text-lg text-[#191A23]">
                        📈 整体分布分析
                      </h3>

                      {/* 🆕 箱线图 - 展示统计分布 */}
                      {report.basicAnalysis.scoreDistribution.rawData
                        ?.boxPlotData && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-[#191A23] mb-3">
                            📊 成绩统计分布（箱线图）
                          </h4>
                          <BoxPlotChart
                            data={
                              report.basicAnalysis.scoreDistribution.rawData
                                .boxPlotData
                            }
                            height={350}
                            showOutliers={true}
                            showMean={true}
                            normalizeByPercent={true}
                          />
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            箱体表示Q1-Q3区间（中间50%学生），横线为中位数，红点为平均值。各科目已按百分比归一化，便于对比。
                          </p>
                        </div>
                      )}

                      {/* 原有柱状图 - 展示分数段人数 */}
                      <div>
                        <h4 className="text-sm font-semibold text-[#191A23] mb-3">
                          📊 分数段人数分布
                        </h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={
                              report.basicAnalysis.scoreDistribution.chartData
                            }
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar
                              dataKey="count"
                              fill="#B9FF66"
                              stroke="#191A23"
                              strokeWidth={2}
                            >
                              <LabelList
                                dataKey="count"
                                position="top"
                                style={{
                                  fontSize: 12,
                                  fontWeight: "bold",
                                  fill: "#191A23",
                                }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                        {report.basicAnalysis.scoreDistribution.insights.map(
                          (insight, idx) => (
                            <div key={idx} className="text-sm text-gray-700">
                              • {insight}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* 学科均衡性分析 - 班级对比 */}
                  {report.basicAnalysis.classComparison?.chartData &&
                    report.basicAnalysis.classComparison.chartData.length >
                      0 && (
                      <div className="space-y-4 pt-4 border-t no-page-break">
                        <h3 className="font-bold text-lg text-[#191A23]">
                          {report.basicAnalysis.classComparison.chartData
                            .length === 1
                            ? "🏫 班级情况概览"
                            : "🏫 学科均衡性 - 班级对比"}
                        </h3>
                        {/* 🔧 只有多个班级时才显示对比图表 */}
                        {report.basicAnalysis.classComparison.chartData.length >
                          1 && (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              data={
                                report.basicAnalysis.classComparison.chartData
                              }
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="className" />
                              <YAxis />
                              <Tooltip />
                              <Bar
                                dataKey="avgScore"
                                fill="#60a5fa"
                                stroke="#191A23"
                                strokeWidth={2}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                        <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                          {report.basicAnalysis.classComparison.insights.map(
                            (insight, idx) => (
                              <div key={idx} className="text-sm text-gray-700">
                                • {insight}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* 分数段分布分析 - 堆积条形图 */}
                  {report.basicAnalysis.subjectAnalysis
                    ?.scoreDistributionBySubject &&
                    report.basicAnalysis.subjectAnalysis
                      .scoreDistributionBySubject.length > 0 && (
                      <div className="space-y-4 pt-4 border-t no-page-break">
                        <h3 className="font-bold text-lg text-[#191A23]">
                          📊 分数段分布分析
                        </h3>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={report.basicAnalysis.subjectAnalysis.scoreDistributionBySubject.map(
                              (item: any) => {
                                const distObj: any = { subject: item.subject };
                                // 使用固定的key来映射数据
                                item.distribution.forEach((d: any) => {
                                  distObj[d.key] = d.count;
                                  // 同时保存标签用于显示
                                  if (!distObj._labels) distObj._labels = {};
                                  distObj._labels[d.key] = d.range;
                                });
                                return distObj;
                              }
                            )}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="subject"
                              angle={-15}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis
                              label={{
                                value: "人数",
                                angle: -90,
                                position: "insideLeft",
                              }}
                            />
                            <Tooltip
                              formatter={(
                                value: any,
                                name: string,
                                props: any
                              ) => {
                                const labels = props.payload._labels;
                                const label = labels?.[name] || name;
                                return [value, label];
                              }}
                            />
                            <Legend
                              formatter={(value: string) => {
                                // 从第一条数据中获取标签
                                const firstItem =
                                  report.basicAnalysis.subjectAnalysis
                                    .scoreDistributionBySubject[0];
                                const dist = firstItem?.distribution?.find(
                                  (d: any) => d.key === value
                                );
                                return dist?.range || value;
                              }}
                            />
                            <Bar
                              dataKey="fail"
                              stackId="a"
                              fill="#ff6384"
                              name="fail"
                            />
                            <Bar
                              dataKey="pass"
                              stackId="a"
                              fill="#ff9f40"
                              name="pass"
                            />
                            <Bar
                              dataKey="medium"
                              stackId="a"
                              fill="#ffcd56"
                              name="medium"
                            />
                            <Bar
                              dataKey="good"
                              stackId="a"
                              fill="#4bc0c0"
                              name="good"
                            />
                            <Bar
                              dataKey="excellent"
                              stackId="a"
                              fill="#B9FF66"
                              name="excellent"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                          <p>
                            从堆积条形图可以看出各科目不同分数段的学生分布情况：
                          </p>
                          <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>绿色区域代表优秀学生（85%以上）</li>
                            <li>青色区域代表良好学生（80%-85%）</li>
                            <li>黄色区域代表中等学生（70%-80%）</li>
                            <li>橙色区域代表刚及格学生（60%-70%）</li>
                            <li>
                              红色区域代表需要重点关注的不及格学生（60%以下）
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                  {/* 典型学生成绩对比 */}
                  {report.basicAnalysis.subjectAnalysis?.typicalStudents &&
                    report.basicAnalysis.subjectAnalysis.typicalStudents
                      .length >= 3 &&
                    (() => {
                      // 🔧 构建雷达图数据（所有科目）
                      const subjects = [
                        { key: "chinese_score", name: "语文" },
                        { key: "math_score", name: "数学" },
                        { key: "english_score", name: "英语" },
                        { key: "physics_score", name: "物理" },
                        { key: "chemistry_score", name: "化学" },
                        { key: "politics_score", name: "政治" },
                        { key: "history_score", name: "历史" },
                        { key: "biology_score", name: "生物" },
                        { key: "geography_score", name: "地理" },
                      ];

                      const radarData = subjects
                        .map((sub) => {
                          const excellent = parseFloat(
                            report.basicAnalysis.subjectAnalysis
                              .typicalStudents[0][sub.key] || 0
                          );
                          const middle = parseFloat(
                            report.basicAnalysis.subjectAnalysis
                              .typicalStudents[1][sub.key] || 0
                          );
                          const poor = parseFloat(
                            report.basicAnalysis.subjectAnalysis
                              .typicalStudents[2][sub.key] || 0
                          );

                          // 只返回至少有一个学生有成绩的科目
                          if (excellent > 0 || middle > 0 || poor > 0) {
                            return {
                              subject: sub.name,
                              优秀学生: excellent,
                              中等学生: middle,
                              后进学生: poor,
                            };
                          }
                          return null;
                        })
                        .filter((d) => d !== null);

                      // 🔧 动态计算最大分数范围
                      const allScores = radarData.flatMap((d) => [
                        d!.优秀学生,
                        d!.中等学生,
                        d!.后进学生,
                      ]);
                      const maxScore = Math.max(...allScores, 100);
                      const domainMax =
                        maxScore > 100 ? (maxScore <= 120 ? 120 : 150) : 100;

                      return (
                        <div className="space-y-4 pt-4 border-t no-page-break">
                          <h3 className="font-bold text-lg text-[#191A23]">
                            👥 典型学生成绩对比
                          </h3>
                          <ResponsiveContainer width="100%" height={400}>
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="#e5e7eb" />
                              <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: "#666", fontSize: 12 }}
                              />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, domainMax]}
                              />
                              <Tooltip />
                              <Legend />
                              {/* 优秀学生 */}
                              <Radar
                                name={`${report.basicAnalysis.subjectAnalysis.typicalStudents[0].name || "优秀学生"}（总分${report.basicAnalysis.subjectAnalysis.typicalStudents[0].total_score}）`}
                                dataKey="优秀学生"
                                stroke="#B9FF66"
                                fill="#B9FF66"
                                fillOpacity={0.5}
                              />
                              {/* 中等学生 */}
                              <Radar
                                name={`${report.basicAnalysis.subjectAnalysis.typicalStudents[1].name || "中等学生"}（总分${report.basicAnalysis.subjectAnalysis.typicalStudents[1].total_score}）`}
                                dataKey="中等学生"
                                stroke="#ff9f40"
                                fill="#ff9f40"
                                fillOpacity={0.5}
                              />
                              {/* 后进学生 */}
                              <Radar
                                name={`${report.basicAnalysis.subjectAnalysis.typicalStudents[2].name || "后进学生"}（总分${report.basicAnalysis.subjectAnalysis.typicalStudents[2].total_score}）`}
                                dataKey="后进学生"
                                stroke="#ff6384"
                                fill="#ff6384"
                                fillOpacity={0.5}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                            <p className="mb-2">
                              雷达图展示了三位典型学生的成绩表现：
                            </p>
                            <ul className="space-y-2">
                              <li className="flex items-start">
                                <Badge className="bg-[#B9FF66] text-[#191A23] mr-2">
                                  {report.basicAnalysis.subjectAnalysis
                                    .typicalStudents[0].name || "优秀学生"}
                                </Badge>
                                <span>各科目成绩均衡且优秀</span>
                              </li>
                              <li className="flex items-start">
                                <Badge className="bg-[#ff9f40] text-white mr-2">
                                  {report.basicAnalysis.subjectAnalysis
                                    .typicalStudents[1].name || "中等学生"}
                                </Badge>
                                <span>成绩中等，可能存在个别薄弱科目</span>
                              </li>
                              <li className="flex items-start">
                                <Badge className="bg-[#ff6384] text-white mr-2">
                                  {report.basicAnalysis.subjectAnalysis
                                    .typicalStudents[2].name || "后进学生"}
                                </Badge>
                                <span>整体成绩偏低，需要重点关注和帮扶</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      );
                    })()}
                </CardContent>
              </Card>
            </>
          )}

          {/* 🆕 高级分析：等级流动桑基图 */}
          {report.advancedAnalysis?.gradeFlow &&
            report.advancedAnalysis.gradeFlow.chartData && (
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23] no-page-break">
                <CardHeader className="bg-purple-50 border-b-2 border-black">
                  <CardTitle className="flex items-center gap-2">
                    🌊 等级流动分析 - 两次考试对比
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <GradeFlowSankeyChart
                    data={report.advancedAnalysis.gradeFlow.chartData}
                    height={500}
                    sourceLabel="前一次考试"
                    targetLabel="本次考试"
                  />
                  <div className="mt-4 space-y-2 bg-gray-50 p-4 rounded-lg">
                    {report.advancedAnalysis.gradeFlow.insights.map(
                      (insight, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          {insight}
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* 🆕 高级分析：科目相关性热力图 */}
          {report.advancedAnalysis?.correlations &&
            report.advancedAnalysis.correlations.chartData && (
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23] no-page-break">
                <CardHeader className="bg-blue-50 border-b-2 border-black">
                  <CardTitle className="flex items-center gap-2">
                    🔗 学科关联分析 - 相关性热力图
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <CorrelationHeatmap
                    data={
                      report.advancedAnalysis.correlations.chartData
                        .correlations
                    }
                    subjects={
                      report.advancedAnalysis.correlations.chartData.subjects
                    }
                    threshold={0.7}
                    width={800}
                    height={600}
                  />
                  <div className="mt-4 space-y-2 bg-gray-50 p-4 rounded-lg">
                    {report.advancedAnalysis.correlations.insights.map(
                      (insight, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          {insight}
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* 🆕 高级分析：多维排名与综合指标 */}
          {report.advancedAnalysis?.rankings &&
            report.advancedAnalysis.rankings.rawData && (
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23] no-page-break">
                <CardHeader className="bg-purple-50 border-b-2 border-black">
                  <CardTitle className="flex items-center gap-2">
                    🏆 多维度排名与综合指标分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* 洞察文本 */}
                  <div className="space-y-2 bg-purple-50 p-4 rounded-lg">
                    {report.advancedAnalysis.rankings.insights.map(
                      (insight, idx) => (
                        <div
                          key={idx}
                          className="text-sm text-gray-700 font-medium"
                        >
                          {insight}
                        </div>
                      )
                    )}
                  </div>

                  {/* 绩效漏斗图 */}
                  {report.advancedAnalysis.rankings.rawData.funnelData && (
                    <div className="mb-12">
                      <PerformanceFunnelChart
                        data={
                          report.advancedAnalysis.rankings.rawData.funnelData
                        }
                        title="📉 学生绩效分布漏斗"
                        height={600}
                      />

                      {/* 📊 图表数据详情 */}
                      <Collapsible className="mt-4">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-center p-3 bg-[#f9f9f9] border-2 border-[#191A23] rounded-lg cursor-pointer hover:bg-[#B9FF66] transition-colors">
                            <FileText className="h-4 w-4 mr-2" />
                            <span className="font-bold text-sm">
                              查看详细数据表格
                            </span>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                          <div className="p-4 bg-white border-2 border-[#191A23] rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
                            <h4 className="font-bold text-lg mb-3">
                              📉 绩效分布详细数据
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead className="bg-[#B9FF66]">
                                  <tr>
                                    <th className="p-3 border-2 border-[#191A23] font-black text-left">
                                      等级
                                    </th>
                                    <th className="p-3 border-2 border-[#191A23] font-black text-left">
                                      分数段
                                    </th>
                                    <th className="p-3 border-2 border-[#191A23] font-black text-center">
                                      人数
                                    </th>
                                    <th className="p-3 border-2 border-[#191A23] font-black text-center">
                                      占比
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.advancedAnalysis.rankings.rawData.funnelData.map(
                                    (item: any, idx: number) => (
                                      <tr
                                        key={idx}
                                        className={
                                          idx % 2 === 0 ? "bg-[#f9f9f9]" : ""
                                        }
                                      >
                                        <td className="p-3 border border-[#ddd] font-bold">
                                          {item.level}
                                        </td>
                                        <td className="p-3 border border-[#ddd]">
                                          {item.scoreRange || "-"}
                                        </td>
                                        <td className="p-3 border border-[#ddd] text-center font-bold">
                                          {item.count}
                                        </td>
                                        <td className="p-3 border border-[#ddd] text-center">
                                          {item.percentage.toFixed(1)}%
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}

                  {/* 🆕 排名分布图 */}
                  {report.advancedAnalysis.rankings.rawData
                    .rankDistributionData &&
                    report.advancedAnalysis.rankings.rawData
                      .rankDistributionData.length > 0 && (
                      <div
                        className="mb-8"
                        data-chart-type="rank-distribution"
                        data-offline-chart="true"
                        id="offline-rank-distribution"
                      >
                        <RankDistributionChart
                          data={
                            report.advancedAnalysis.rankings.rawData
                              .rankDistributionData
                          }
                          title="📊 年级排名分布情况"
                          height={400}
                        />

                        {/* 📊 图表数据详情 */}
                        <Collapsible className="mt-4">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-center p-3 bg-[#f9f9f9] border-2 border-[#191A23] rounded-lg cursor-pointer hover:bg-[#4ECDC4] transition-colors">
                              <FileText className="h-4 w-4 mr-2" />
                              <span className="font-bold text-sm">
                                查看详细数据表格
                              </span>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3">
                            <div className="p-4 bg-white border-2 border-[#191A23] rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
                              <h4 className="font-bold text-lg mb-3">
                                🏆 年级排名分布详细数据
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                  <thead className="bg-[#4ECDC4]">
                                    <tr>
                                      <th className="p-3 border-2 border-[#191A23] font-black text-left">
                                        排名段
                                      </th>
                                      <th className="p-3 border-2 border-[#191A23] font-black text-left">
                                        范围
                                      </th>
                                      <th className="p-3 border-2 border-[#191A23] font-black text-center">
                                        人数
                                      </th>
                                      <th className="p-3 border-2 border-[#191A23] font-black text-center">
                                        占比
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {report.advancedAnalysis.rankings.rawData.rankDistributionData.map(
                                      (item: any, idx: number) => (
                                        <tr
                                          key={idx}
                                          className={
                                            idx % 2 === 0 ? "bg-[#f9f9f9]" : ""
                                          }
                                        >
                                          <td className="p-3 border border-[#ddd] font-bold">
                                            {item.segment}
                                          </td>
                                          <td className="p-3 border border-[#ddd]">
                                            {item.range}
                                          </td>
                                          <td className="p-3 border border-[#ddd] text-center font-bold">
                                            {item.count}
                                          </td>
                                          <td className="p-3 border border-[#ddd] text-center">
                                            {item.percentage.toFixed(1)}%
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}

                  {/* 🆕 SBI雷达图 */}
                  {report.advancedAnalysis.rankings.rawData.sbiRadarData &&
                    report.advancedAnalysis.rankings.rawData.sbiRadarData
                      .length > 0 && (
                      <div
                        className="mb-8"
                        data-chart-type="sbi-radar"
                        data-offline-chart="true"
                        id="offline-sbi-radar"
                      >
                        <SBIRadarChart
                          data={
                            report.advancedAnalysis.rankings.rawData
                              .sbiRadarData
                          }
                          sbiValue={
                            report.advancedAnalysis.rankings.rawData.avgSBI
                          }
                          title="📐 学科均衡度雷达图"
                          height={450}
                        />
                      </div>
                    )}

                  {/* 🆕 API-SBI散点图 */}
                  {report.advancedAnalysis.rankings.rawData.apiSbiScatterData &&
                    report.advancedAnalysis.rankings.rawData.apiSbiScatterData
                      .length > 0 && (
                      <div
                        className="mb-8"
                        data-chart-type="api-sbi-scatter"
                        data-offline-chart="true"
                        id="offline-api-sbi-scatter"
                      >
                        <APISBIScatterChart
                          data={
                            report.advancedAnalysis.rankings.rawData
                              .apiSbiScatterData
                          }
                          title="🔷 学业表现指数(API) vs 学科均衡度(SBI)"
                          height={500}
                        />
                      </div>
                    )}

                  {/* API/SBI 综合指标说明 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div
                      className="p-4 border-2 border-[#191A23] rounded-lg shadow-[4px_4px_0px_0px_#191A23]"
                      style={{ backgroundColor: "#B9FF66" }}
                    >
                      <h4 className="font-bold text-lg text-[#191A23] mb-2">
                        📊 学业表现指数 (API)
                      </h4>
                      <p className="text-sm text-[#191A23] mb-2">
                        平均值:{" "}
                        <span className="font-black text-2xl text-[#191A23]">
                          {report.advancedAnalysis.rankings.rawData.avgAPI?.toFixed(
                            1
                          )}
                        </span>{" "}
                        / 100
                      </p>
                      <p className="text-xs text-[#191A23]/70 font-semibold">
                        综合分数(40%)、班级排名(40%)、进步幅度(20%)三个维度计算，
                        数值越高表示学业表现越好。
                      </p>
                    </div>

                    <div
                      className="p-4 border-2 border-[#191A23] rounded-lg shadow-[4px_4px_0px_0px_#191A23]"
                      style={{ backgroundColor: "#4ECDC4" }}
                    >
                      <h4 className="font-bold text-lg text-[#191A23] mb-2">
                        📐 学科均衡度 (SBI)
                      </h4>
                      <p className="text-sm text-[#191A23] mb-2">
                        平均值:{" "}
                        <span className="font-black text-2xl text-[#191A23]">
                          {report.advancedAnalysis.rankings.rawData.avgSBI?.toFixed(
                            1
                          )}
                        </span>{" "}
                        / 100
                      </p>
                      <p className="text-xs text-[#191A23]/70 font-semibold">
                        衡量各科目得分率的标准差，100分表示完全均衡，
                        分数越低表示学科发展越不均衡（有明显偏科）。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* 步骤4：核心问题诊断 */}
          {report.aiInsights?.warnings &&
            report.aiInsights.warnings.length > 0 && (
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23] no-page-break">
                <CardHeader className="bg-red-50 border-b-2 border-black">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    核心问题诊断 ({report.aiInsights.warnings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {report.aiInsights.warnings.map((warning) => (
                    <div
                      key={warning.id}
                      className="p-4 border-2 border-[#191A23] rounded-lg shadow-[4px_4px_0px_0px_#191A23]"
                      style={{ backgroundColor: "#FFE5E5" }}
                    >
                      <div className="flex items-start gap-3">
                        {getSeverityBadge(warning.severity)}
                        <div className="flex-1">
                          <div className="font-bold text-[#191A23] mb-2">
                            {renderMarkdown(warning.message)}
                          </div>
                          <div className="text-sm text-[#191A23]/70 space-y-1 font-semibold">
                            <div>
                              📊 影响学生:{" "}
                              <span className="font-black">
                                {warning.affectedStudents}
                              </span>{" "}
                              人
                            </div>
                            {warning.affectedClasses &&
                              warning.affectedClasses.length > 0 && (
                                <div>
                                  🏫 涉及班级:{" "}
                                  {warning.affectedClasses.join(", ")}
                                </div>
                              )}
                            {warning.suggestedAction && (
                              <div className="mt-2 p-3 bg-white rounded-lg border-2 border-[#191A23] shadow-[2px_2px_0px_0px_#191A23]">
                                <div className="text-xs text-[#FF6B6B] font-black mb-1">
                                  💡 建议措施:
                                </div>
                                <div className="text-sm text-[#191A23]">
                                  {renderMarkdown(warning.suggestedAction)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          {/* 步骤5：具体改进建议 */}
          {report.aiInsights?.recommendations &&
            report.aiInsights.recommendations.length > 0 && (
              <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23] no-page-break">
                <CardHeader className="bg-green-50 border-b-2 border-black">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    具体改进建议 ({report.aiInsights.recommendations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {report.aiInsights.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 border-2 border-[#191A23] rounded-lg shadow-[4px_4px_0px_0px_#191A23]"
                      style={{ backgroundColor: "#E5F9E5" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="border-2 border-[#191A23] font-bold"
                        >
                          {rec.category}
                        </Badge>
                        {rec.aiGenerated && (
                          <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-[#191A23] font-bold">
                            AI 生成
                          </Badge>
                        )}
                        {rec.priority && (
                          <Badge
                            className={
                              rec.priority === "immediate"
                                ? "bg-[#FF6B6B] text-white border-2 border-[#191A23] font-bold"
                                : rec.priority === "short-term"
                                  ? "bg-[#FFD93D] text-[#191A23] border-2 border-[#191A23] font-bold"
                                  : "bg-[#4ECDC4] text-white border-2 border-[#191A23] font-bold"
                            }
                          >
                            {rec.priority === "immediate"
                              ? "立即执行"
                              : rec.priority === "short-term"
                                ? "短期"
                                : "长期"}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-[#191A23] mb-2">
                        {renderMarkdown(rec.title)}
                      </h4>
                      <div className="text-sm text-[#191A23]/80 font-semibold">
                        {renderMarkdown(rec.description)}
                      </div>
                      {rec.targetGroup && (
                        <div className="mt-2 text-xs text-[#191A23]/70 font-bold">
                          🎯 目标群体: {rec.targetGroup}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ReportViewer;
