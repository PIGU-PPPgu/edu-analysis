"""
前端PDF生成服务集成
在 AIReportViewer 中添加"导出专业PDF"功能
"""

// src/services/pdfService.ts

interface PDFGenerateRequest {
  markdown: string;
  title: string;
  template?: 'simple' | 'bootcamp';
  logo?: string; // base64编码的图片
}

interface PDFGenerateResponse {
  success: boolean;
  error?: string;
  blob?: Blob;
}

/**
 * PDF生成服务
 */
export class PDFGeneratorService {
  private apiUrl: string;

  constructor(apiUrl: string = 'http://localhost:5000/api') {
    this.apiUrl = apiUrl;
  }

  /**
   * 生成专业PDF报告
   */
  async generatePDF(request: PDFGenerateRequest): Promise<PDFGenerateResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || '生成失败' };
      }

      // 获取PDF Blob
      const blob = await response.blob();
      return { success: true, blob };
    } catch (error) {
      console.error('PDF生成错误:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 预览Markdown渲染效果
   */
  async previewMarkdown(markdown: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markdown }),
      });

      if (!response.ok) {
        throw new Error('预览失败');
      }

      const data = await response.json();
      return data.html;
    } catch (error) {
      console.error('预览错误:', error);
      throw error;
    }
  }

  /**
   * 下载PDF文件
   */
  downloadPDF(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl.replace('/api', '')}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 创建单例
export const pdfGenerator = new PDFGeneratorService();


// ============================================================
// 在 AIReportViewer.tsx 中添加按钮
// ============================================================

import { pdfGenerator } from '@/services/pdfService';

// 在 AIReportViewer 组件中添加新按钮
const exportProfessionalPDF = async () => {
  try {
    setLoading(true);

    // 生成Markdown
    const generator = new AIReportGenerator(insights, rawData, context);
    const markdown = generator.exportAsMarkdown(reportData);

    // 调用PDF服务
    const result = await pdfGenerator.generatePDF({
      markdown,
      title: reportData.config.title,
      template: 'simple',
    });

    if (result.success && result.blob) {
      // 下载PDF
      pdfGenerator.downloadPDF(result.blob, reportData.config.title);
      toast.success('专业PDF报告生成成功！');
    } else {
      toast.error(`PDF生成失败: ${result.error}`);
    }
  } catch (error) {
    console.error('导出PDF错误:', error);
    toast.error('PDF导出失败，请重试');
  } finally {
    setLoading(false);
  }
};

// 在界面上添加按钮
<Button variant="outline" size="sm" onClick={exportProfessionalPDF}>
  <FileText className="w-4 h-4 mr-2" />
  导出专业PDF
</Button>
