/**
 * 📄 报告PDF导出服务
 * 使用 html2pdf.js 支持中文导出
 */

import html2pdf from "html2pdf.js";
import { AnalysisReport } from "@/types/report";

export interface PdfExportOptions {
  filename?: string;
  includeCharts?: boolean;
  format?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
}

export class ReportPdfExporter {
  /**
   * 从DOM元素直接导出PDF（推荐，包含所有图表和样式）
   */
  async exportFromElement(
    element: HTMLElement,
    report: AnalysisReport,
    options: PdfExportOptions = {}
  ): Promise<void> {
    const {
      filename = `${report.metadata.examTitle}_分析报告_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.pdf`,
      format = "a4",
      orientation = "portrait",
    } = options;

    try {
      // 克隆元素以避免修改原始DOM
      const clonedElement = element.cloneNode(true) as HTMLElement;

      // ⚠️ 关键：创建一个包装容器，确保元素在正确位置
      const wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.left = "0";
      wrapper.style.top = window.scrollY + "px"; // 🔧 与当前滚动位置对齐
      wrapper.style.width = "210mm"; // A4 宽度
      wrapper.style.zIndex = "99999"; // 🔧 确保在最顶层
      wrapper.style.background = "white";
      wrapper.style.overflow = "visible";
      wrapper.style.margin = "0 auto"; // 🔧 居中

      clonedElement.style.width = "100%";
      clonedElement.style.padding = "10mm"; // 🔧 减小内边距，让PDF边距控制
      clonedElement.style.background = "white";
      clonedElement.style.position = "relative";
      clonedElement.style.overflow = "visible";
      clonedElement.style.height = "auto";
      clonedElement.style.maxHeight = "none";
      clonedElement.style.opacity = "1";
      clonedElement.style.boxSizing = "border-box";

      wrapper.appendChild(clonedElement);

      // 🔧 添加分页控制样式
      const style = document.createElement("style");
      style.textContent = `
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
        }

        * {
          box-sizing: border-box;
        }

        .no-page-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .page-break-before {
          page-break-before: always !important;
          break-before: page !important;
        }

        /* 确保图表容器不被截断 */
        .recharts-wrapper,
        .recharts-surface,
        .recharts-responsive-container {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-bottom: 10px;
        }

        /* 确保卡片不被截断 */
        [class*="Card"],
        [class*="card"],
        section,
        article {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-bottom: 10px;
        }

        /* 标题不要单独在页尾 */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }

        /* 表格不被截断 */
        table {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `;
      wrapper.appendChild(style);

      // 🔧 关键: 移除所有子元素的高度限制，确保完整内容可见
      const allChildren = clonedElement.querySelectorAll("*");
      allChildren.forEach((child) => {
        const el = child as HTMLElement;
        // 移除 ScrollArea 和其他容器的高度限制
        if (el.style.maxHeight || el.style.height) {
          el.style.height = "auto";
          el.style.maxHeight = "none";
        }
        // 确保所有内容可见
        if (
          el.style.overflow === "hidden" ||
          el.style.overflow === "scroll" ||
          el.style.overflow === "auto"
        ) {
          el.style.overflow = "visible";
        }
      });

      // 隐藏滚动条和按钮
      const scrollbars = clonedElement.querySelectorAll(
        "[data-radix-scroll-area-viewport]"
      );
      scrollbars.forEach((sb) => {
        (sb as HTMLElement).style.overflow = "visible";
        (sb as HTMLElement).style.height = "auto";
        (sb as HTMLElement).style.maxHeight = "none";
      });

      const buttons = clonedElement.querySelectorAll("button");
      buttons.forEach((btn) => {
        (btn as HTMLElement).style.display = "none";
      });

      // 添加到DOM
      document.body.appendChild(wrapper);

      // 🔑 等待图表渲染完成（关键！）
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 🔧 获取实际内容高度（等待渲染后）
      let actualHeight = wrapper.scrollHeight;
      let actualWidth = wrapper.scrollWidth;

      // 🔧 如果高度为0，使用 offsetHeight 作为后备
      if (actualHeight === 0) {
        actualHeight = wrapper.offsetHeight;
      }
      if (actualWidth === 0) {
        actualWidth = wrapper.offsetWidth || 794; // A4宽度约794px
      }

      // 确保至少有最小尺寸
      actualHeight = Math.max(actualHeight, 500);
      actualWidth = Math.max(actualWidth, 794);

      // 配置PDF选项
      const opt = {
        margin: [8, 8, 8, 8], // 🔧 四周均匀边距 8mm，充分利用A4页面
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2, // 高清晰度
          useCORS: true,
          logging: false, // 关闭日志减少干扰
          letterRendering: true,
          backgroundColor: "#ffffff",
          scrollY: -window.scrollY, // 🔧 补偿当前滚动位置
          scrollX: -window.scrollX,
          width: actualWidth,
          height: actualHeight,
          x: 0,
          y: 0,
          windowWidth: actualWidth,
          windowHeight: actualHeight,
        },
        jsPDF: {
          unit: "mm",
          format,
          orientation,
          compress: true,
        },
        pagebreak: {
          mode: ["css", "legacy"],
          before: [".page-break-before"],
          after: [".page-break-after"],
          avoid: [
            ".no-page-break",
            ".recharts-wrapper",
            ".recharts-surface",
            ".recharts-responsive-container",
            "[class*='Card']",
            "table",
            "section",
            "article",
          ],
        },
      };

      console.log("📄 开始生成PDF，元素尺寸:", {
        width: actualWidth,
        height: actualHeight,
      });

      // 生成PDF（从wrapper生成）
      await html2pdf().set(opt).from(wrapper).save();

      // 清理
      document.body.removeChild(wrapper);

      console.log("✅ PDF导出成功:", filename);
    } catch (error) {
      console.error("❌ PDF导出失败:", error);
      throw new Error("PDF导出失败，请重试");
    }
  }

  /**
   * 导出报告为PDF（使用自定义HTML模板）
   */
  async exportReportToPdf(
    report: AnalysisReport,
    options: PdfExportOptions = {}
  ): Promise<void> {
    const {
      filename = `${report.metadata.examTitle}_分析报告_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.pdf`,
      includeCharts = true,
      format = "a4",
      orientation = "portrait",
    } = options;

    try {
      // 1. 创建打印友好的HTML内容
      const printContent = this.generatePrintHtml(report, includeCharts);

      // 2. 创建临时容器
      const container = document.createElement("div");
      container.innerHTML = printContent;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "210mm"; // A4宽度
      document.body.appendChild(container);

      // 3. 配置pdf选项
      const opt = {
        margin: [10, 10, 10, 10], // 上右下左边距（mm）
        filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: 2, // 提高清晰度
          useCORS: true,
          logging: false,
          letterRendering: true,
        },
        jsPDF: {
          unit: "mm",
          format,
          orientation,
          compress: true,
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      // 4. 生成PDF
      await html2pdf().set(opt).from(container).save();

      // 5. 清理临时容器
      document.body.removeChild(container);

      console.log("✅ PDF导出成功:", filename);
    } catch (error) {
      console.error("❌ PDF导出失败:", error);
      throw new Error("PDF导出失败，请重试");
    }
  }

  /**
   * 生成打印友好的HTML
   */
  private generatePrintHtml(
    report: AnalysisReport,
    includeCharts: boolean
  ): string {
    const { metadata, basicAnalysis, aiInsights } = report;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #191A23;
      background: white;
      padding: 20px;
    }

    .report-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #B9FF66;
    }

    .report-title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .report-meta {
      font-size: 14px;
      color: #666;
      margin-top: 10px;
    }

    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      padding-left: 10px;
      border-left: 4px solid #B9FF66;
    }

    .subsection-title {
      font-size: 16px;
      font-weight: bold;
      margin: 20px 0 10px 0;
      color: #191A23;
    }

    .insight-list {
      list-style: none;
      padding: 0;
    }

    .insight-item {
      padding: 10px 15px;
      margin-bottom: 8px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid #B9FF66;
    }

    .highlight {
      padding: 12px 16px;
      margin: 10px 0;
      border-radius: 6px;
      font-weight: 500;
    }

    .highlight-warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      color: #856404;
    }

    .highlight-success {
      background: #d1e7dd;
      border-left: 4px solid #28a745;
      color: #0f5132;
    }

    .highlight-info {
      background: #d1ecf1;
      border-left: 4px solid #17a2b8;
      color: #0c5460;
    }

    .finding-card {
      padding: 15px;
      margin: 15px 0;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      page-break-inside: avoid;
    }

    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .finding-message {
      font-size: 16px;
      font-weight: bold;
    }

    .severity-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }

    .severity-high {
      background: #dc3545;
      color: white;
    }

    .severity-medium {
      background: #ffc107;
      color: #856404;
    }

    .severity-low {
      background: #6c757d;
      color: white;
    }

    .recommendation-card {
      padding: 15px;
      margin: 15px 0;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #B9FF66;
      page-break-inside: avoid;
    }

    .recommendation-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .recommendation-desc {
      margin: 8px 0;
      color: #495057;
    }

    .recommendation-meta {
      display: flex;
      gap: 15px;
      margin-top: 10px;
      font-size: 13px;
      color: #6c757d;
    }

    .priority-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }

    .priority-immediate {
      background: #dc3545;
      color: white;
    }

    .priority-short-term {
      background: #ffc107;
      color: #856404;
    }

    .priority-long-term {
      background: #28a745;
      color: white;
    }

    .summary-text {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      line-height: 1.8;
      white-space: pre-wrap;
    }

    strong {
      font-weight: bold;
      color: #191A23;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <!-- 报告头部 -->
  <div class="report-header">
    <div class="report-title">${metadata.examTitle} - 成绩分析报告</div>
    <div class="report-meta">
      <div>生成时间: ${new Date(metadata.generatedAt).toLocaleString("zh-CN")}</div>
      <div>参考人数: ${metadata.dataSnapshot.totalStudents}人 | 班级数: ${metadata.dataSnapshot.totalClasses}</div>
      ${metadata.dataSnapshot.examDate ? `<div>考试日期: ${metadata.dataSnapshot.examDate}</div>` : ""}
    </div>
  </div>

  <!-- 考试概览 -->
  <div class="section">
    <div class="section-title">📊 考试概览</div>
    <ul class="insight-list">
      ${basicAnalysis.summary.insights.map((insight) => `<li class="insight-item">${insight}</li>`).join("")}
    </ul>
    ${basicAnalysis.summary.highlights.map((h) => `<div class="highlight highlight-${h.type}">${h.text}</div>`).join("")}
  </div>

  <!-- 成绩分布 -->
  <div class="section">
    <div class="section-title">📈 成绩分布分析</div>
    <ul class="insight-list">
      ${basicAnalysis.scoreDistribution.insights.map((insight) => `<li class="insight-item">${insight}</li>`).join("")}
    </ul>
  </div>

  <!-- 班级对比 -->
  <div class="section">
    <div class="section-title">🏫 班级对比分析</div>
    <ul class="insight-list">
      ${basicAnalysis.classComparison.insights.map((insight) => `<li class="insight-item">${insight}</li>`).join("")}
    </ul>
  </div>

  <!-- 科目分析 -->
  <div class="section">
    <div class="section-title">📚 科目分析</div>
    <ul class="insight-list">
      ${basicAnalysis.subjectAnalysis.insights.map((insight) => `<li class="insight-item">${insight}</li>`).join("")}
    </ul>
  </div>

  ${
    aiInsights
      ? `
  <!-- AI分析洞察 -->
  <div class="section">
    <div class="section-title">🤖 AI智能分析</div>

    <!-- 总体概述 -->
    <div class="subsection-title">总体概述</div>
    <div class="summary-text">${this.formatMarkdownForPrint(aiInsights.summary)}</div>

    <!-- 核心发现 -->
    ${
      aiInsights.keyFindings && aiInsights.keyFindings.length > 0
        ? `
    <div class="subsection-title">核心发现</div>
    ${aiInsights.keyFindings
      .map(
        (finding) => `
      <div class="finding-card">
        <div class="finding-header">
          <div class="finding-message">${finding.message}</div>
          <span class="severity-badge severity-${finding.severity}">
            ${finding.severity === "high" ? "高" : finding.severity === "medium" ? "中" : "低"}
          </span>
        </div>
        ${finding.details ? `<div style="color: #6c757d; margin-top: 8px;">${finding.details}</div>` : ""}
      </div>
    `
      )
      .join("")}
    `
        : ""
    }

    <!-- 教学建议 -->
    ${
      aiInsights.recommendations && aiInsights.recommendations.length > 0
        ? `
    <div class="subsection-title">教学建议</div>
    ${aiInsights.recommendations
      .map(
        (rec) => `
      <div class="recommendation-card">
        <div class="recommendation-title">${rec.title}</div>
        <div class="recommendation-desc">${rec.description}</div>
        <div class="recommendation-meta">
          ${rec.targetGroup ? `<span>目标: ${rec.targetGroup}</span>` : ""}
          ${
            rec.priority
              ? `<span class="priority-badge priority-${rec.priority}">
              ${rec.priority === "immediate" ? "立即执行" : rec.priority === "short-term" ? "短期" : "长期"}
            </span>`
              : ""
          }
        </div>
      </div>
    `
      )
      .join("")}
    `
        : ""
    }

    <!-- 预警信息 -->
    ${
      aiInsights.warnings && aiInsights.warnings.length > 0
        ? `
    <div class="subsection-title">⚠️ 预警信息</div>
    ${aiInsights.warnings
      .map(
        (warning) => `
      <div class="finding-card">
        <div class="finding-header">
          <div class="finding-message">${warning.message}</div>
          <span class="severity-badge severity-${warning.severity}">
            ${warning.severity === "high" ? "高" : warning.severity === "medium" ? "中" : "低"}
          </span>
        </div>
        <div style="margin-top: 8px; color: #6c757d;">
          影响学生: ${warning.affectedStudents}人
          ${warning.affectedClasses && warning.affectedClasses.length > 0 ? ` | 涉及班级: ${warning.affectedClasses.join(", ")}` : ""}
        </div>
        ${warning.suggestedAction ? `<div style="margin-top: 8px; color: #495057;">建议措施: ${warning.suggestedAction}</div>` : ""}
      </div>
    `
      )
      .join("")}
    `
        : ""
    }
  </div>
  `
      : ""
  }

  <!-- 报告尾部 -->
  <div class="footer">
    <div>本报告由AI智能分析系统自动生成</div>
    <div>生成时间: ${new Date().toLocaleString("zh-CN")}</div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * 将markdown格式转换为HTML（简化版）
   */
  private formatMarkdownForPrint(text: string): string {
    if (!text) return "";

    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") // **加粗**
      .replace(/\*(.+?)\*/g, "<em>$1</em>"); // *斜体*
  }
}

// 导出单例
export const reportPdfExporter = new ReportPdfExporter();
