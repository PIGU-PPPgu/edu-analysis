/**
 * n8n智能解析服务
 * 用于通过n8n工作流处理学生成绩文件的智能解析
 */

export interface N8nParseResult {
  success: boolean;
  message: string;
  summary: {
    totalRows: number;
    processedRows: number;
    errorRows: number;
    subjects: string[];
    confidence: number;
  };
  errors: string[];
  data?: any[];
}

export interface N8nParseOptions {
  webhook_url?: string;
  ai_provider?: "openai" | "doubao" | "deepseek";
  batch_size?: number;
  enable_validation?: boolean;
}

class N8nGradeParserService {
  private readonly DEFAULT_WEBHOOK_URL =
    "http://localhost:5678/webhook/parse-grade-file";

  /**
   * 通过n8n工作流解析成绩文件
   */
  async parseGradeFile(
    file: File,
    options: N8nParseOptions = {}
  ): Promise<N8nParseResult> {
    try {
      const webhookUrl = options.webhook_url || this.DEFAULT_WEBHOOK_URL;

      // 创建FormData用于文件上传
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "options",
        JSON.stringify({
          ai_provider: options.ai_provider || "openai",
          batch_size: options.batch_size || 50,
          enable_validation: options.enable_validation !== false,
        })
      );

      console.log("📤 开始上传文件到n8n工作流...", {
        fileName: file.name,
        fileSize: file.size,
        webhookUrl,
      });

      // 发送请求到n8n webhook
      const response = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
        headers: {
          // 不设置Content-Type，让浏览器自动设置multipart边界
        },
      });

      if (!response.ok) {
        throw new Error(
          `n8n工作流请求失败: ${response.status} ${response.statusText}`
        );
      }

      const result = (await response.json()) as N8nParseResult;

      console.log("✅ n8n工作流处理完成", {
        success: result.success,
        processedRows: result.summary?.processedRows,
        errors: result.errors?.length || 0,
      });

      return result;
    } catch (error) {
      console.error("❌ n8n智能解析失败:", error);

      return {
        success: false,
        message: `解析失败: ${error instanceof Error ? error.message : "未知错误"}`,
        summary: {
          totalRows: 0,
          processedRows: 0,
          errorRows: 0,
          subjects: [],
          confidence: 0,
        },
        errors: [error instanceof Error ? error.message : "未知错误"],
      };
    }
  }

  /**
   * 检查n8n工作流健康状态
   */
  async checkHealth(webhookUrl?: string): Promise<boolean> {
    try {
      const testUrl =
        webhookUrl ||
        this.DEFAULT_WEBHOOK_URL.replace("/parse-grade-file", "/health");

      const response = await fetch(testUrl, {
        method: "GET",
        timeout: 5000,
      } as RequestInit);

      return response.ok;
    } catch (error) {
      console.warn("⚠️ n8n健康检查失败:", error);
      return false;
    }
  }

  /**
   * 获取支持的文件格式
   */
  getSupportedFormats(): string[] {
    return [".csv", ".xlsx", ".xls"];
  }

  /**
   * 验证文件格式
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const supportedFormats = this.getSupportedFormats();
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!supportedFormats.includes(fileExtension)) {
      return {
        valid: false,
        error: `不支持的文件格式: ${fileExtension}。支持的格式: ${supportedFormats.join(", ")}`,
      };
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB限制
      return {
        valid: false,
        error: "文件大小不能超过10MB",
      };
    }

    return { valid: true };
  }
}

// 导出单例实例
export const n8nGradeParser = new N8nGradeParserService();

// 向后兼容的函数接口
export async function parseGradeFileWithN8n(
  file: File,
  options?: N8nParseOptions
): Promise<N8nParseResult> {
  return n8nGradeParser.parseGradeFile(file, options);
}

export default n8nGradeParser;
