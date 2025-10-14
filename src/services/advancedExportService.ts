import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExportOptions {
  format: "csv" | "xlsx" | "pdf" | "json";
  fields: string[];
  filters?: Record<string, any>;
  fileName?: string;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  recordCount?: number;
  error?: string;
}

class AdvancedExportService {
  // CSV导出实现
  private generateCSV(data: any[], fields: string[]): string {
    if (data.length === 0) return "";

    const headers = fields.length > 0 ? fields : Object.keys(data[0]);
    const csvRows = [headers.join(",")];

    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header] || "";
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    });

    return csvRows.join("\n");
  }

  // Excel导出实现（基于CSV格式，浏览器兼容）
  private generateExcel(data: any[], fields: string[]): Blob {
    const csvContent = this.generateCSV(data, fields);
    const bom = "\uFEFF"; // UTF-8 BOM for proper Excel encoding
    return new Blob([bom + csvContent], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
  }

  // PDF导出实现（简化HTML转PDF）
  private async generatePDF(
    data: any[],
    fields: string[],
    title: string
  ): Promise<Blob> {
    const headers = fields.length > 0 ? fields : Object.keys(data[0] || {});

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
          th { background-color: #f8fafc; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .summary { margin: 20px 0; padding: 15px; background: #eff6ff; border-radius: 8px; }
          .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="summary">
          <strong>数据摘要:</strong> 共 ${data.length} 条记录，生成时间: ${new Date().toLocaleString("zh-CN")}
        </div>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) =>
                  `<tr>${headers.map((h) => `<td>${row[h] || ""}</td>`).join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
        <div class="footer">
          由系统自动生成 - ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `;

    return new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  }

  // 从grade_data_new表导出学生成绩数据
  async exportStudentGrades(options: ExportOptions): Promise<ExportResult> {
    try {
      let query = supabase
        .from("grade_data_new")
        .select("*")
        .order("created_at", { ascending: false });

      // 应用过滤器
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error } = await query;
      if (error) throw error;

      return await this.processExport(data || [], options, "学生成绩数据");
    } catch (error) {
      console.error("导出学生成绩失败:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "导出失败",
      };
    }
  }

  // 从exams表导出考试数据
  async exportExams(options: ExportOptions): Promise<ExportResult> {
    try {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      return await this.processExport(data || [], options, "考试数据");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "导出考试数据失败",
      };
    }
  }

  // 导出学生学习报告
  async exportStudentReport(
    studentId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // 获取学生基本信息
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("student_id", studentId)
        .single();

      if (studentError) throw studentError;

      // 获取学生成绩数据
      const { data: gradeData, error: gradeError } = await supabase
        .from("grade_data_new")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (gradeError) throw gradeError;

      // 组装报告数据
      const reportData = {
        学生信息: studentData,
        成绩记录: gradeData || [],
        统计信息: {
          总考试次数: gradeData?.length || 0,
          平均分: gradeData?.length
            ? (
                gradeData.reduce((sum, g) => sum + (g.total_score || 0), 0) /
                gradeData.length
              ).toFixed(2)
            : 0,
          最高分: Math.max(
            ...(gradeData?.map((g) => g.total_score || 0) || [0])
          ),
          最低分: Math.min(
            ...(gradeData?.map((g) => g.total_score || 0) || [100])
          ),
        },
      };

      return await this.processExport(
        [reportData],
        options,
        `${studentData.name}学习报告`
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "导出学习报告失败",
      };
    }
  }

  // 导出班级分析报告
  async exportClassAnalysis(
    className: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const { data, error } = await supabase
        .from("grade_data_new")
        .select("*")
        .eq("class_name", className)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 计算班级统计
      const classStats = this.calculateClassStats(data || []);

      const analysisData = {
        班级名称: className,
        学生人数: new Set(data?.map((d) => d.student_id)).size,
        考试统计: classStats,
        详细数据: data || [],
      };

      return await this.processExport(
        [analysisData],
        options,
        `${className}班级分析报告`
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "导出班级分析失败",
      };
    }
  }

  // 通用导出处理
  private async processExport(
    data: any[],
    options: ExportOptions,
    title: string
  ): Promise<ExportResult> {
    const fileName =
      options.fileName || `${title}_${new Date().toISOString().split("T")[0]}`;

    try {
      let blob: Blob;
      let mimeType: string;
      let extension: string;

      switch (options.format) {
        case "csv":
          const csvContent = this.generateCSV(data, options.fields);
          blob = new Blob(["\uFEFF" + csvContent], {
            type: "text/csv;charset=utf-8",
          });
          mimeType = "text/csv";
          extension = "csv";
          break;

        case "xlsx":
          blob = this.generateExcel(data, options.fields);
          mimeType = "application/vnd.ms-excel";
          extension = "xlsx";
          break;

        case "pdf":
          blob = await this.generatePDF(data, options.fields, title);
          mimeType = "text/html";
          extension = "html"; // 浏览器兼容的PDF预览
          break;

        case "json":
        default:
          blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          mimeType = "application/json";
          extension = "json";
          break;
      }

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        downloadUrl: url,
        fileName: `${fileName}.${extension}`,
        recordCount: data.length,
      };
    } catch (error) {
      console.error("处理导出失败:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "处理导出失败",
      };
    }
  }

  // 计算班级统计数据
  private calculateClassStats(data: any[]): any {
    if (data.length === 0) return {};

    const scores = data.map((d) => d.total_score || 0).filter((s) => s > 0);
    const subjects = ["chinese", "math", "english", "physics", "chemistry"];

    return {
      总分统计: {
        平均分: scores.length
          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
          : 0,
        最高分: Math.max(...scores),
        最低分: Math.min(...scores),
        及格率: scores.length
          ? (
              (scores.filter((s) => s >= 60).length / scores.length) *
              100
            ).toFixed(1) + "%"
          : "0%",
      },
      科目统计: subjects.reduce(
        (acc, subject) => {
          const subjectScores = data
            .map((d) => d[`${subject}_score`])
            .filter((s) => s != null && s > 0);
          if (subjectScores.length > 0) {
            acc[subject] = {
              平均分: (
                subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length
              ).toFixed(2),
              最高分: Math.max(...subjectScores),
              最低分: Math.min(...subjectScores),
            };
          }
          return acc;
        },
        {} as Record<string, any>
      ),
    };
  }

  // 批量导出多个班级
  async exportMultipleClasses(
    classNames: string[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const { data, error } = await supabase
        .from("grade_data_new")
        .select("*")
        .in("class_name", classNames)
        .order("class_name", { ascending: true });

      if (error) throw error;

      return await this.processExport(data || [], options, "多班级数据对比");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "批量导出失败",
      };
    }
  }

  // 按考试导出成绩
  async exportByExam(
    examTitle: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const { data, error } = await supabase
        .from("grade_data_new")
        .select("*")
        .eq("exam_title", examTitle)
        .order("total_score", { ascending: false });

      if (error) throw error;

      return await this.processExport(
        data || [],
        options,
        `${examTitle}_成绩单`
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "按考试导出失败",
      };
    }
  }
}

export const advancedExportService = new AdvancedExportService();
