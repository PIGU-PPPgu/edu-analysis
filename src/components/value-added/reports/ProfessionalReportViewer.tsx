"use client";

/**
 * Positivus风格AI报告查看器
 * 采用新布鲁塔主义设计风格：荧光绿 + 深黑 + 粗边框 + 平移阴影
 */

import { useState, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Download, Printer, FileText } from "lucide-react";
import type { AIInsight } from "@/types/aiInsights";
import {
  AIReportGenerator,
  type ReportData,
} from "@/services/ai/reportGenerator";
import html2pdf from "html2pdf.js";

// Positivus设计标准颜色
const POSITIVUS_COLORS = {
  primary: "#B9FF66", // 荧光绿
  secondary: "#191A23", // 深黑
  accent: "#F7931E", // 橙色
  white: "#FFFFFF",
};

// 将章节内容按【标题】拆分为独立渲染块
// 每个【】标记和其后续内容组成一个卡片块，其余为普通文本块
type ContentBlock =
  | { type: "card"; title: string; content: string }
  | { type: "text"; content: string };

function splitIntoBlocks(content: string): ContentBlock[] {
  const lines = content.split("\n");
  const blocks: ContentBlock[] = [];
  let currentCard: { title: string; lines: string[] } | null = null;
  let textBuffer: string[] = [];

  const flushText = () => {
    const text = textBuffer.join("\n").trim();
    if (text) blocks.push({ type: "text", content: text });
    textBuffer = [];
  };

  const flushCard = () => {
    if (currentCard) {
      blocks.push({
        type: "card",
        title: currentCard.title,
        content: currentCard.lines.join("\n").trim(),
      });
      currentCard = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const bracketMatch = trimmed.match(/^【(.+?)】(.*)$/);
    const isSectionTitle = /^[一二三四五六七八九十]+、/.test(trimmed);

    if (isSectionTitle) {
      flushCard();
      flushText();
      textBuffer.push(line);
    } else if (bracketMatch) {
      flushCard();
      flushText();
      currentCard = { title: bracketMatch[1], lines: [] };
      if (bracketMatch[2]?.trim())
        currentCard.lines.push(bracketMatch[2].trim());
    } else if (currentCard) {
      currentCard.lines.push(line);
    } else {
      textBuffer.push(line);
    }
  }
  flushCard();
  flushText();

  return blocks;
}

interface ProfessionalReportViewerProps {
  insights: AIInsight[];
  rawData?: any[];
  context?: any;
  reportData: ReportData;
  organizationLogo?: string;
  organizationName?: string;
}

export function ProfessionalReportViewer({
  insights,
  rawData = [],
  context = {},
  reportData,
  organizationLogo,
  organizationName = "教育数据分析系统",
}: ProfessionalReportViewerProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // 生成目录
  const tableOfContents = useMemo(() => {
    return reportData.sections.map((section, index) => ({
      id: section.id,
      title: section.title,
      number: index + 1,
    }));
  }, [reportData.sections]);

  // 生成PDF - 参考LaTeX分页算法
  const generatePDF = async () => {
    if (!reportRef.current) return;

    setIsGeneratingPDF(true);
    try {
      // LaTeX级别的分页控制配置
      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `${reportData.config.title}.pdf`,
        image: {
          type: "jpeg" as const,
          quality: 0.98,
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          // 允许更多时间渲染复杂内容
          timeout: 30000,
          // 确保背景色正确渲染
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
          compress: true,
        },
        // 智能分页策略 - 模拟LaTeX
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          before: [".page-break-before"],
          after: [".page-break-after", ".cover-section", ".table-of-contents"],
          avoid: [
            ".page-break-avoid",
            ".positivus-card",
            ".section-title-block",
            "h1",
            "h2",
            "h3",
            "h4",
            "table",
            "pre",
            "blockquote",
            "ul",
            "ol",
            ".list-item-group",
          ],
        },
      };

      await html2pdf().set(opt).from(reportRef.current).save();
    } catch (error) {
      console.error("PDF生成失败:", error);
      alert("PDF生成失败，请重试");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // 导出HTML
  const exportHTML = () => {
    const generator = new AIReportGenerator(insights, rawData, context);
    const markdown = generator.exportAsMarkdown(reportData);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${reportData.config.title}</title>
  <style>
    body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
    /* Positivus样式... */
  </style>
</head>
<body>${reportRef.current?.innerHTML || ""}</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportData.config.title}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const markdownComponents = useMemo(
    () => ({
      h2: ({ node, children, ...props }: any) => (
        <h2
          className="text-3xl font-black text-[#191A23] mt-16 mb-8 pb-4 border-b-4 border-[#B9FF66] uppercase tracking-wide"
          {...props}
        >
          {children}
        </h2>
      ),
      h3: ({ node, children, ...props }: any) => (
        <h3
          className="text-2xl font-bold text-[#191A23] mt-12 mb-6 flex items-center"
          {...props}
        >
          <span className="w-2 h-8 bg-[#B9FF66] rounded-full mr-3"></span>
          {children}
        </h3>
      ),
      h4: ({ node, children, ...props }: any) => (
        <h4 className="text-xl font-bold text-[#191A23] mt-8 mb-4" {...props}>
          {children}
        </h4>
      ),
      p: ({ node, children, ...props }: any) => (
        <p
          className="my-5 leading-relaxed text-[#191A23] text-base font-medium indent-[2em]"
          {...props}
        >
          {children}
        </p>
      ),
      ul: ({ node, ...props }: any) => (
        <ul
          className="my-8 space-y-3 ml-0 list-none page-break-avoid list-item-group"
          {...props}
        />
      ),
      ol: ({ node, ...props }: any) => (
        <ol
          className="my-8 space-y-3 ml-8 list-decimal list-outside font-bold page-break-avoid list-item-group"
          {...props}
        />
      ),
      li: ({ node, children, ...props }: any) => (
        <li
          className="flex items-start gap-3 text-[#191A23] leading-relaxed font-medium page-break-avoid [&_p]:my-0 [&_p]:indent-0"
          {...props}
        >
          <span className="w-6 h-6 bg-[#B9FF66] rounded-full flex items-center justify-center text-[#191A23] font-black text-sm border-2 border-[#191A23] mt-0.5 shrink-0">
            ✓
          </span>
          <div className="flex-1">{children}</div>
        </li>
      ),
      strong: ({ node, ...props }: any) => (
        <strong
          className="text-[#191A23] font-black bg-[#B9FF66] px-1.5 py-0.5 rounded border border-[#191A23]"
          {...props}
        />
      ),
      em: ({ node, ...props }: any) => (
        <em className="text-[#F7931E] not-italic font-bold" {...props} />
      ),
      hr: ({ node, ...props }: any) => (
        <div className="my-16 flex items-center gap-4">
          <div className="flex-1 h-1 bg-[#191A23] rounded-full"></div>
          <div className="w-4 h-4 bg-[#B9FF66] rounded-full border-2 border-[#191A23]"></div>
          <div className="flex-1 h-1 bg-[#191A23] rounded-full"></div>
        </div>
      ),
      blockquote: ({ node, ...props }: any) => (
        <blockquote
          className="my-8 bg-[#F7931E]/10 border-l-8 border-[#F7931E] pl-8 pr-6 py-6 rounded-r-xl font-bold text-[#191A23] border-2 border-[#191A23] shadow-[4px_4px_0px_0px_#F7931E] page-break-avoid keep-together"
          {...props}
        />
      ),
      table: ({ node, ...props }: any) => (
        <div className="my-10 overflow-hidden rounded-xl border-4 border-[#191A23] shadow-[6px_6px_0px_0px_#B9FF66] page-break-avoid keep-together">
          <table className="w-full border-collapse" {...props} />
        </div>
      ),
      thead: ({ node, ...props }: any) => (
        <thead className="bg-[#191A23] text-white" {...props} />
      ),
      th: ({ node, ...props }: any) => (
        <th
          className="px-6 py-4 text-left font-black uppercase tracking-wide text-sm border-b-2 border-[#B9FF66]"
          {...props}
        />
      ),
      td: ({ node, ...props }: any) => (
        <td
          className="px-6 py-4 text-[#191A23] font-medium border-b-2 border-gray-200"
          {...props}
        />
      ),
      tbody: ({ node, ...props }: any) => (
        <tbody className="bg-white" {...props} />
      ),
      tr: ({ node, ...props }: any) => (
        <tr className="hover:bg-[#B9FF66]/10 transition-colors" {...props} />
      ),
      code: ({ node, inline, ...props }: any) =>
        inline ? (
          <code
            className="bg-[#191A23] text-[#B9FF66] px-2 py-1 rounded font-mono text-sm font-bold border-2 border-[#191A23]"
            {...props}
          />
        ) : (
          <code
            className="block bg-[#191A23] text-[#B9FF66] p-6 rounded-xl text-sm font-mono border-4 border-[#191A23] shadow-[4px_4px_0px_0px_#B9FF66] overflow-x-auto my-8 page-break-avoid keep-together"
            {...props}
          />
        ),
    }),
    []
  );

  return (
    <div className="positivus-report-wrapper bg-gray-50 min-h-screen py-8">
      {/* 工具栏 - Positivus风格按钮 */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-3">
        <Button
          onClick={generatePDF}
          disabled={isGeneratingPDF}
          className="bg-[#B9FF66] text-[#191A23] border-2 border-[#191A23] rounded-xl font-black uppercase tracking-wide shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#191A23] transition-all duration-200"
        >
          <FileText className="w-4 h-4 mr-2" />
          {isGeneratingPDF ? "生成中..." : "生成PDF"}
        </Button>
        <Button
          onClick={exportHTML}
          variant="outline"
          className="bg-white text-[#191A23] border-2 border-[#191A23] rounded-xl font-bold shadow-[4px_4px_0px_0px_#B9FF66] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#B9FF66] transition-all duration-200"
        >
          <Download className="w-4 h-4 mr-2" />
          导出HTML
        </Button>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="bg-white text-[#191A23] border-2 border-[#191A23] rounded-xl font-bold shadow-[4px_4px_0px_0px_#F7931E] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#F7931E] transition-all duration-200"
        >
          <Printer className="w-4 h-4 mr-2" />
          打印
        </Button>
      </div>

      {/* 报告容器 - A4纸张 */}
      <div
        ref={reportRef}
        className="report-page bg-white mx-auto shadow-[8px_8px_0px_0px_#191A23] print:shadow-none border-2 border-[#191A23]"
        style={{
          width: "21cm",
          minHeight: "29.7cm",
          padding: "2.5cm",
          fontFamily:
            '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
        }}
      >
        {/* 封面 - Positivus风格 */}
        <div className="cover-section min-h-[25cm] flex flex-col items-center justify-center border-b-8 border-[#191A23] pb-16 mb-12 page-break-after">
          {/* Logo */}
          <div className="cover-logo w-40 h-40 mb-12 rounded-[30px] bg-[#191A23] flex items-center justify-center text-[#B9FF66] text-8xl shadow-[8px_8px_0px_0px_#B9FF66] border-2 border-[#191A23]">
            {organizationLogo || "📊"}
          </div>

          {/* 标题 */}
          <h1 className="text-6xl font-black text-[#191A23] mb-6 text-center leading-tight tracking-tight uppercase">
            {reportData.config.title}
          </h1>

          {/* 副标题 */}
          <div className="bg-[#B9FF66] px-8 py-3 rounded-xl border-2 border-[#191A23] shadow-[4px_4px_0px_0px_#191A23] mb-16">
            <p className="text-xl font-bold text-[#191A23]">
              {organizationName}
            </p>
          </div>

          {/* 元信息卡片 */}
          <div className="bg-white border-2 border-[#191A23] rounded-[20px] shadow-[6px_6px_0px_0px_#F7931E] px-12 py-8">
            <div className="space-y-3 text-[#191A23] font-medium text-base">
              <p>
                <span className="font-black">生成日期：</span>
                {reportData.config.date.toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p>
                <span className="font-black">包含洞察：</span>
                {reportData.metadata.insightCount} 项
              </p>
              <p>
                <span className="font-black">章节数量：</span>
                {reportData.sections.length} 章
              </p>
            </div>
          </div>
        </div>

        {/* 目录 - Positivus风格 */}
        <div className="table-of-contents my-16 bg-[#191A23] p-10 rounded-[30px] border-2 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] page-break-after">
          <h2 className="text-4xl font-black text-[#B9FF66] mb-10 flex items-center uppercase tracking-wide">
            <span className="w-14 h-14 bg-[#B9FF66] text-[#191A23] rounded-xl flex items-center justify-center mr-4 text-3xl border-2 border-[#B9FF66] shadow-[3px_3px_0px_0px_rgba(185,255,102,0.3)]">
              📑
            </span>
            目录
          </h2>
          <div className="space-y-3">
            {tableOfContents.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-5 py-4 px-5 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border-l-4 border-[#B9FF66]"
              >
                <span className="text-[#B9FF66] font-black text-2xl min-w-[2.5rem] bg-[#191A23] w-10 h-10 rounded-lg flex items-center justify-center border-2 border-[#B9FF66]">
                  {item.number}
                </span>
                <span className="text-white text-lg font-bold flex-1">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 章节内容 */}
        {reportData.sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            className="section-content mb-20 page-break-avoid"
          >
            {/* 页眉条 */}
            <div className="page-header flex justify-between items-center pb-3 mb-10 border-b-4 border-[#191A23] page-break-avoid keep-together">
              <span className="font-black text-[#191A23] uppercase text-sm tracking-wider">
                {reportData.config.title}
              </span>
              <span className="bg-[#B9FF66] text-[#191A23] px-4 py-1 rounded-lg font-black text-sm border-2 border-[#191A23]">
                第 {sectionIndex + 1} 章
              </span>
            </div>

            {/* 章节标题 - Positivus风格 */}
            <div className="mb-12 page-break-avoid section-title-block">
              <div className="flex items-start gap-4 keep-together">
                <span className="bg-[#B9FF66] text-[#191A23] px-6 py-3 rounded-xl font-black text-4xl border-2 border-[#191A23] shadow-[4px_4px_0px_0px_#191A23] min-w-[5rem] text-center">
                  {sectionIndex + 1}
                </span>
                <h1 className="flex-1 text-5xl font-black text-[#191A23] leading-tight pt-2 uppercase tracking-tight">
                  {section.title}
                </h1>
              </div>
              <div className="h-2 bg-[#B9FF66] mt-6 rounded-full"></div>
            </div>

            {/* 章节内容 - Positivus排版 */}
            <div className="prose prose-lg max-w-none positivus-content">
              {splitIntoBlocks(section.content).map((block, blockIdx) =>
                block.type === "card" ? (
                  <div
                    key={blockIdx}
                    className="my-10 page-break-avoid keep-together highlight-card"
                  >
                    <div className="bg-white border-4 border-[#191A23] rounded-[20px] shadow-[6px_6px_0px_0px_#B9FF66] p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#B9FF66] transition-all duration-200 positivus-card">
                      {/* 标题栏 */}
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-[#191A23] page-break-avoid">
                        <span className="w-10 h-10 bg-[#B9FF66] text-[#191A23] rounded-lg flex items-center justify-center font-black text-xl border-2 border-[#191A23] shadow-[2px_2px_0px_0px_#191A23]">
                          📌
                        </span>
                        <h4 className="text-xl font-black text-[#191A23] uppercase">
                          {block.title}
                        </h4>
                      </div>
                      {/* 卡片内容 - 用ReactMarkdown渲染以保留格式 */}
                      <div className="space-y-2 text-[#191A23] leading-relaxed pl-2">
                        <ReactMarkdown components={markdownComponents}>
                          {block.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ReactMarkdown key={blockIdx} components={markdownComponents}>
                    {block.content}
                  </ReactMarkdown>
                )
              )}
            </div>

            {/* 页脚 */}
            <div className="page-footer text-center mt-16 pt-6 border-t-4 border-[#191A23] page-break-avoid keep-together">
              <div className="inline-flex items-center gap-3 bg-[#B9FF66] px-6 py-2 rounded-full border-2 border-[#191A23] shadow-[3px_3px_0px_0px_#191A23]">
                <span className="font-black text-[#191A23] text-sm">
                  {organizationName} • {reportData.config.date.getFullYear()}
                </span>
                <span className="w-2 h-2 bg-[#191A23] rounded-full"></span>
                <span className="font-black text-[#191A23] text-sm">
                  第 {sectionIndex + 1} / {reportData.sections.length} 页
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* 报告结束标记 - Positivus风格 */}
        <div className="report-end text-center py-16 border-t-8 border-[#191A23] mt-20">
          <div className="inline-block">
            <div className="bg-[#191A23] text-[#B9FF66] px-12 py-6 rounded-[30px] border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66]">
              <div className="text-5xl font-black mb-3 uppercase tracking-wider">
                报告完
              </div>
              <div className="text-sm font-bold">
                本报告由 {organizationName} 自动生成
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 打印和PDF生成样式 - LaTeX级别分页控制 */}
      <style jsx global>{`
        /* === LaTeX风格分页控制 === */
        @media print {
          /* 隐藏非打印元素 */
          .no-print {
            display: none !important;
          }

          /* 页面设置 */
          @page {
            size: A4;
            margin: 15mm;
            /* 防止空白页 */
            orphans: 3;
            widows: 3;
          }

          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          .positivus-report-wrapper {
            background: white;
          }

          .report-page {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }

          /* === 强制分页点 === */
          .page-break-before {
            page-break-before: always !important;
            break-before: always !important;
          }

          .page-break-after {
            page-break-after: always !important;
            break-after: always !important;
          }

          /* 封面和目录后强制分页 */
          .cover-section,
          .table-of-contents {
            page-break-after: always !important;
            break-after: always !important;
          }

          /* === 避免分页的元素（LaTeX核心规则）=== */

          /* 1. 标题后至少保持2行内容 */
          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            orphans: 3;
            widows: 3;
          }

          /* 标题与后续内容保持在一起 */
          h1 + *,
          h2 + *,
          h3 + * {
            page-break-before: avoid !important;
            break-before: avoid !important;
          }

          /* 2. 内容块完整性保护 */
          .page-break-avoid,
          .page-break-inside-avoid,
          .section-title-block,
          .positivus-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* 3. 【】标记的重点卡片 - 绝对不允许截断 */
          .highlight-card,
          .data-card {
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
            display: block;
            position: relative;
          }

          /* 4. 列表完整性 */
          ul,
          ol {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          li {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            orphans: 3;
            widows: 3;
          }

          /* 5. 表格完整性 - 永不截断 */
          table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          thead {
            display: table-header-group;
          }

          tbody {
            display: table-row-group;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* 6. 引用块和代码块 */
          blockquote,
          pre,
          code {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* 7. 图片和媒体 */
          img,
          svg,
          figure {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* 8. 章节内容保护 */
          .section-content {
            orphans: 3;
            widows: 3;
          }

          /* 9. 页眉页脚保护 */
          .page-header,
          .page-footer {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* === 段落优化（LaTeX标准）=== */
          p {
            orphans: 3; /* 页底至少3行 */
            widows: 3; /* 页顶至少3行 */
            line-height: 1.6;
          }

          /* === 特殊元素处理 === */

          /* 分隔线前后保持内容 */
          hr {
            page-break-before: avoid !important;
            break-before: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* 确保阴影和边框在PDF中正确显示 */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* 背景色强制显示 */
          .bg-\\[\\#B9FF66\\],
          .bg-\\[\\#191A23\\],
          .bg-\\[\\#F7931E\\] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        /* === 屏幕显示优化 === */
        @media screen {
          .positivus-content {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* 悬停效果平滑 */
          .hover\\:translate-x-1 {
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease;
          }
        }

        /* === 通用分页优化 === */
        .keep-together {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* 章节之间留白 */
        .section-content + .section-content {
          margin-top: 3rem;
        }
      `}</style>
    </div>
  );
}
