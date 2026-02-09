"use client";

/**
 * AI报告查看器组件
 * 用于预览和导出AI生成的分析报告
 */

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Eye, Award } from "lucide-react";
import type { AIInsight } from "@/types/aiInsights";
import {
  AIReportGenerator,
  ReportTemplate,
  type ReportConfig,
  type ReportData,
  generateComprehensiveReport,
  generateExecutiveSummary,
  generateDiagnosticReport,
} from "@/services/ai/reportGenerator";
import { ProfessionalReportViewer } from "./ProfessionalReportViewer";

interface AIReportViewerProps {
  insights: AIInsight[];
  rawData?: any[];
  context?: any;
  defaultTemplate?: ReportTemplate;
  title?: string;
}

export function AIReportViewer({
  insights,
  rawData = [],
  context = {},
  defaultTemplate = ReportTemplate.COMPREHENSIVE,
  title = "AI分析报告",
}: AIReportViewerProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate>(defaultTemplate);
  const [reportConfig, setReportConfig] = useState<Partial<ReportConfig>>({
    title: title,
    date: new Date(),
    includeCharts: true,
    includeRawData: false,
  });

  // 生成报告数据
  const reportData = useMemo(() => {
    const generator = new AIReportGenerator(insights, rawData, context);
    const config: ReportConfig = {
      title: reportConfig.title || title,
      date: reportConfig.date || new Date(),
      includeCharts: reportConfig.includeCharts !== false,
      includeRawData: reportConfig.includeRawData === true,
      template: selectedTemplate,
    };
    return generator.generateReport(config);
  }, [insights, rawData, context, selectedTemplate, reportConfig, title]);

  // 导出为Markdown
  const exportMarkdown = () => {
    const generator = new AIReportGenerator(insights, rawData, context);
    const markdown = generator.exportAsMarkdown(reportData);
    downloadFile(markdown, `${reportData.config.title}.md`, "text/markdown");
  };

  // 导出为HTML
  const exportHTML = () => {
    const generator = new AIReportGenerator(insights, rawData, context);
    const html = generator.exportAsHTML(reportData);
    downloadFile(html, `${reportData.config.title}.html`, "text/html");
  };

  // 下载文件辅助函数
  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 渲染Markdown预览
  const renderMarkdownPreview = () => {
    const generator = new AIReportGenerator(insights, rawData, context);
    const markdown = generator.exportAsMarkdown(reportData);

    return (
      <div className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm font-mono overflow-auto max-h-[600px]">
          {markdown}
        </pre>
      </div>
    );
  };

  // 渲染结构化预览（使用ReactMarkdown渲染）
  const renderStructuredPreview = () => {
    return (
      <div className="space-y-6">
        {reportData.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    // 自定义样式
                    h1: ({ node, ...props }) => (
                      <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-xl font-bold mt-3 mb-2" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="text-lg font-semibold mt-2 mb-1"
                        {...props}
                      />
                    ),
                    h4: ({ node, ...props }) => (
                      <h4
                        className="text-base font-semibold mt-2 mb-1"
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="my-2 leading-relaxed" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul
                        className="list-disc list-inside my-2 space-y-1"
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="list-decimal list-inside my-2 space-y-1"
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="ml-4" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600"
                        {...props}
                      />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-4 w-full">
                        <table
                          className="w-full min-w-full table-auto border-collapse border border-gray-300"
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-gray-100" {...props} />
                    ),
                    tbody: ({ node, ...props }) => <tbody {...props} />,
                    tr: ({ node, ...props }) => (
                      <tr className="border-b border-gray-300" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        className="border border-gray-300 px-4 py-2 text-left font-semibold whitespace-nowrap"
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        className="border border-gray-300 px-4 py-2"
                        {...props}
                      />
                    ),
                    code: ({ node, inline, ...props }: any) =>
                      inline ? (
                        <code
                          className="bg-gray-100 px-1 py-0.5 rounded text-sm"
                          {...props}
                        />
                      ) : (
                        <code
                          className="block bg-gray-100 p-4 rounded text-sm overflow-x-auto"
                          {...props}
                        />
                      ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-bold" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                      <em className="italic" {...props} />
                    ),
                    hr: ({ node, ...props }) => (
                      <hr className="my-4 border-gray-300" {...props} />
                    ),
                  }}
                >
                  {section.content}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>报告设置</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportMarkdown}>
                <Download className="w-4 h-4 mr-2" />
                导出Markdown
              </Button>
              <Button variant="outline" size="sm" onClick={exportHTML}>
                <FileText className="w-4 h-4 mr-2" />
                导出HTML
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 模板选择 */}
            <div>
              <label className="text-sm font-medium mb-2 block">报告模板</label>
              <Select
                value={selectedTemplate}
                onValueChange={(value) =>
                  setSelectedTemplate(value as ReportTemplate)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ReportTemplate.COMPREHENSIVE}>
                    综合报告
                  </SelectItem>
                  <SelectItem value={ReportTemplate.EXECUTIVE_SUMMARY}>
                    执行摘要
                  </SelectItem>
                  <SelectItem value={ReportTemplate.DIAGNOSTIC}>
                    诊断报告
                  </SelectItem>
                  <SelectItem value={ReportTemplate.PROGRESS}>
                    进度报告
                  </SelectItem>
                  <SelectItem value={ReportTemplate.COMPARISON}>
                    对比报告
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 报告信息 */}
            <div>
              <label className="text-sm font-medium mb-2 block">报告信息</label>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>章节数: {reportData.sections.length}</p>
                <p>洞察数: {reportData.metadata.insightCount}</p>
              </div>
            </div>

            {/* 选项 */}
            <div>
              <label className="text-sm font-medium mb-2 block">包含内容</label>
              <div className="space-y-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={reportConfig.includeCharts !== false}
                    onChange={(e) =>
                      setReportConfig({
                        ...reportConfig,
                        includeCharts: e.target.checked,
                      })
                    }
                  />
                  包含图表
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={reportConfig.includeRawData === true}
                    onChange={(e) =>
                      setReportConfig({
                        ...reportConfig,
                        includeRawData: e.target.checked,
                      })
                    }
                  />
                  包含原始数据
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 报告预览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            报告预览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="professional">
            <TabsList>
              <TabsTrigger
                value="professional"
                className="flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                专业视图 (LaTeX风格)
              </TabsTrigger>
              <TabsTrigger value="structured">结构化视图</TabsTrigger>
              <TabsTrigger value="markdown">Markdown源码</TabsTrigger>
            </TabsList>

            <TabsContent value="professional" className="mt-4">
              <ProfessionalReportViewer
                insights={insights}
                rawData={rawData}
                context={context}
                reportData={reportData}
                organizationName="教育数据分析系统"
              />
            </TabsContent>

            <TabsContent value="structured" className="mt-4">
              {renderStructuredPreview()}
            </TabsContent>

            <TabsContent value="markdown" className="mt-4">
              {renderMarkdownPreview()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 快捷生成按钮 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷生成</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => {
                const report = generateComprehensiveReport(insights, rawData, {
                  title: "综合分析报告",
                });
                const generator = new AIReportGenerator(insights, rawData);
                const markdown = generator.exportAsMarkdown(report);
                downloadFile(markdown, "综合分析报告.md", "text/markdown");
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              生成综合报告
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const report = generateExecutiveSummary(insights, {
                  title: "执行摘要",
                });
                const generator = new AIReportGenerator(insights);
                const markdown = generator.exportAsMarkdown(report);
                downloadFile(markdown, "执行摘要.md", "text/markdown");
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              生成执行摘要
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const report = generateDiagnosticReport(insights, {
                  title: "诊断报告",
                });
                const generator = new AIReportGenerator(insights);
                const markdown = generator.exportAsMarkdown(report);
                downloadFile(markdown, "诊断报告.md", "text/markdown");
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              生成诊断报告
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
