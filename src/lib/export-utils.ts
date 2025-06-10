// 数据导出工具库
// 支持Excel、CSV、PDF等多种格式的数据导出

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ExportData {
  headers: string[];
  data: (string | number)[][];
  title?: string;
  fileName?: string;
}

export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf' | 'json';
  fileName?: string;
  sheetName?: string;
  includeTimestamp?: boolean;
  customStyles?: Record<string, any>;
}

// 数据导出管理器
export class DataExporter {
  private static generateFileName(baseName: string, format: string, includeTimestamp: boolean = true): string {
    const timestamp = includeTimestamp ? `_${new Date().toISOString().slice(0, 10)}` : '';
    return `${baseName}${timestamp}.${format}`;
  }

  // 导出为Excel格式
  static exportToExcel(exportData: ExportData, options: Partial<ExportOptions> = {}): void {
    try {
      const { data, headers, title = '数据导出' } = exportData;
      const { fileName, sheetName = 'Sheet1', includeTimestamp = true } = options;
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 准备数据（包含标题行）
      const worksheetData = [headers, ...data];
      
      // 创建工作表
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // 设置列宽
      const columnWidths = headers.map((header, index) => {
        const maxLength = Math.max(
          header.length,
          ...data.map(row => String(row[index] || '').length)
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
      });
      worksheet['!cols'] = columnWidths;
      
      // 设置样式（标题行）
      const headerRange = XLSX.utils.encode_range({
        s: { c: 0, r: 0 },
        e: { c: headers.length - 1, r: 0 }
      });
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // 生成文件名
      const finalFileName = fileName || this.generateFileName(title, 'xlsx', includeTimestamp);
      
      // 导出文件
      XLSX.writeFile(workbook, finalFileName);
      
      console.log(`Excel文件导出成功: ${finalFileName}`);
    } catch (error) {
      console.error('Excel导出失败:', error);
      throw new Error('Excel导出失败');
    }
  }

  // 导出为CSV格式
  static exportToCSV(exportData: ExportData, options: Partial<ExportOptions> = {}): void {
    try {
      const { data, headers, title = '数据导出' } = exportData;
      const { fileName, includeTimestamp = true } = options;
      
      // 构建CSV内容
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          row.map(cell => {
            const cellValue = String(cell || '');
            // 如果包含逗号、引号或换行符，需要用引号包围并转义
            if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
              return `"${cellValue.replace(/"/g, '""')}"`;
            }
            return cellValue;
          }).join(',')
        )
      ].join('\n');
      
      // 添加BOM以支持中文
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // 生成文件名
      const finalFileName = fileName || this.generateFileName(title, 'csv', includeTimestamp);
      
      // 创建下载链接
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', finalFileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      console.log(`CSV文件导出成功: ${finalFileName}`);
    } catch (error) {
      console.error('CSV导出失败:', error);
      throw new Error('CSV导出失败');
    }
  }

  // 导出为PDF格式
  static exportToPDF(exportData: ExportData, options: Partial<ExportOptions> = {}): void {
    try {
      const { data, headers, title = '数据导出' } = exportData;
      const { fileName, includeTimestamp = true } = options;
      
      // 创建PDF文档
      const doc = new jsPDF('landscape'); // 横向布局
      
      // 设置字体（支持中文）
      doc.setFont('helvetica');
      
      // 添加标题
      doc.setFontSize(16);
      const titleY = 20;
      doc.text(title, 14, titleY);
      
      // 添加时间戳
      doc.setFontSize(10);
      const timestamp = new Date().toLocaleString('zh-CN');
      doc.text(`导出时间: ${timestamp}`, 14, titleY + 10);
      
      // 添加表格
      (doc as any).autoTable({
        head: [headers],
        body: data,
        startY: titleY + 20,
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          // 根据内容调整列宽
          0: { cellWidth: 'auto' },
        },
        margin: { top: 10, left: 14, right: 14 },
        tableWidth: 'auto',
        showHead: 'everyPage',
        didParseCell: function(data: any) {
          // 处理中文显示问题
          if (data.section === 'body' && typeof data.cell.raw === 'string') {
            data.cell.text = [data.cell.raw];
          }
        }
      });
      
      // 生成文件名
      const finalFileName = fileName || this.generateFileName(title, 'pdf', includeTimestamp);
      
      // 保存文件
      doc.save(finalFileName);
      
      console.log(`PDF文件导出成功: ${finalFileName}`);
    } catch (error) {
      console.error('PDF导出失败:', error);
      throw new Error('PDF导出失败');
    }
  }

  // 导出为JSON格式
  static exportToJSON(exportData: ExportData, options: Partial<ExportOptions> = {}): void {
    try {
      const { data, headers, title = '数据导出' } = exportData;
      const { fileName, includeTimestamp = true } = options;
      
      // 将数组数据转换为对象数组
      const jsonData = data.map(row => {
        const obj: Record<string, any> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
      
      // 构建完整的JSON结构
      const exportJson = {
        title,
        exportTime: new Date().toISOString(),
        totalRecords: data.length,
        data: jsonData
      };
      
      // 转换为JSON字符串
      const jsonString = JSON.stringify(exportJson, null, 2);
      
      // 创建Blob
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      
      // 生成文件名
      const finalFileName = fileName || this.generateFileName(title, 'json', includeTimestamp);
      
      // 创建下载链接
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', finalFileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      console.log(`JSON文件导出成功: ${finalFileName}`);
    } catch (error) {
      console.error('JSON导出失败:', error);
      throw new Error('JSON导出失败');
    }
  }

  // 统一导出接口
  static export(exportData: ExportData, options: ExportOptions): void {
    switch (options.format) {
      case 'excel':
        this.exportToExcel(exportData, options);
        break;
      case 'csv':
        this.exportToCSV(exportData, options);
        break;
      case 'pdf':
        this.exportToPDF(exportData, options);
        break;
      case 'json':
        this.exportToJSON(exportData, options);
        break;
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }
}

// 预定义的导出模板
export const exportTemplates = {
  // 学生成绩导出模板
  studentGrades: (gradeData: any[]): ExportData => ({
    headers: ['学号', '姓名', '班级', '科目', '分数', '考试名称', '考试日期'],
    data: gradeData.map(grade => [
      grade.student_id,
      grade.name,
      grade.class_name,
      grade.subject,
      grade.score,
      grade.exam_title,
      grade.exam_date || ''
    ]),
    title: '学生成绩报告',
    fileName: '学生成绩数据'
  }),

  // 班级统计导出模板
  classStatistics: (classStats: any[]): ExportData => ({
    headers: ['班级名称', '学生人数', '平均分', '最高分', '最低分', '优秀率(%)', '及格率(%)'],
    data: classStats.map(cls => [
      cls.className,
      cls.studentCount,
      cls.averageScore,
      cls.maxScore || 0,
      cls.minScore || 0,
      cls.excellentRate,
      cls.passRate
    ]),
    title: '班级统计报告',
    fileName: '班级统计数据'
  }),

  // 学生信息导出模板
  studentInfo: (students: any[]): ExportData => ({
    headers: ['学号', '姓名', '班级', '年级', '性别', '联系电话', '邮箱', '入学年份'],
    data: students.map(student => [
      student.student_id,
      student.name,
      student.class_name,
      student.grade || '',
      student.gender || '',
      student.contact_phone || '',
      student.contact_email || '',
      student.admission_year || ''
    ]),
    title: '学生信息表',
    fileName: '学生信息数据'
  }),

  // 预警信息导出模板
  warningRecords: (warnings: any[]): ExportData => ({
    headers: ['学生学号', '学生姓名', '班级', '预警类型', '严重程度', '预警时间', '描述', '状态'],
    data: warnings.map(warning => [
      warning.student_id,
      warning.student_name,
      warning.class_name,
      warning.warning_type,
      warning.severity,
      warning.created_at,
      warning.description || '',
      warning.status || ''
    ]),
    title: '学生预警记录',
    fileName: '预警记录数据'
  })
};

// 批量导出工具
export class BatchExporter {
  private exports: Array<{ data: ExportData; options: ExportOptions }> = [];

  // 添加导出任务
  addExport(data: ExportData, options: ExportOptions): BatchExporter {
    this.exports.push({ data, options });
    return this;
  }

  // 执行批量导出
  async execute(onProgress?: (current: number, total: number) => void): Promise<void> {
    const total = this.exports.length;
    
    for (let i = 0; i < this.exports.length; i++) {
      const { data, options } = this.exports[i];
      
      try {
        DataExporter.export(data, options);
        
        // 报告进度
        if (onProgress) {
          onProgress(i + 1, total);
        }
        
        // 添加延迟避免浏览器阻塞
        if (i < this.exports.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`导出任务 ${i + 1} 失败:`, error);
        throw error;
      }
    }
    
    // 清空任务列表
    this.exports = [];
  }

  // 清空任务列表
  clear(): BatchExporter {
    this.exports = [];
    return this;
  }

  // 获取任务数量
  getTaskCount(): number {
    return this.exports.length;
  }
} 