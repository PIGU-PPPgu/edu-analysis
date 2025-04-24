import * as XLSX from 'xlsx';

/**
 * 将数据导出为Excel文件
 * @param data 要导出的数据数组
 * @param fileName 文件名（不含扩展名）
 */
export function exportToExcel(data: any[], fileName: string): void {
  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  
  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // 设置列宽
  const maxWidth = 20;
  const colWidth: { [key: string]: { wch: number } } = {};
  
  // 为每列设置宽度
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    headers.forEach(header => {
      // 获取该列最长字符串的长度
      const maxLength = Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      );
      // 限制最大宽度，避免过宽
      colWidth[header] = { wch: Math.min(maxLength + 2, maxWidth) };
    });
  }
  
  // 应用列宽
  worksheet['!cols'] = Object.values(colWidth);
  
  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, '作业批改结果');
  
  // 导出Excel文件
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * 将数据导出为CSV文件
 * @param data 要导出的数据数组
 * @param fileName 文件名（不含扩展名）
 */
export function exportToCSV(data: any[], fileName: string): void {
  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // 创建CSV
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  
  // 创建Blob对象
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${fileName}.csv`);
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  
  // 清理
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出PDF文件（通过打印API实现）
 * @param elementId 要打印的DOM元素ID
 * @param fileName 文件名（不含扩展名）
 */
export function printToPDF(elementId: string, fileName: string): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found`);
    return;
  }
  
  const originalContent = document.body.innerHTML;
  const printContent = element.innerHTML;
  
  document.body.innerHTML = `
    <div style="padding: 20px;">
      <h1 style="text-align: center; margin-bottom: 20px;">${fileName}</h1>
      ${printContent}
    </div>
  `;
  
  window.print();
  
  // 恢复原始内容
  document.body.innerHTML = originalContent;
} 