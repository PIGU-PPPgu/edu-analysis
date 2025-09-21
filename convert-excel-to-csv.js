/**
 * Excel到CSV转换工具
 * 将Excel文件转换为CSV格式以便于处理
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

/**
 * 转换Excel文件为CSV
 */
function convertExcelToCSV(excelFilePath, csvOutputPath) {
  console.log(`📄 读取Excel文件: ${excelFilePath}`);
  
  try {
    // 读取Excel文件
    const workbook = XLSX.readFile(excelFilePath);
    
    // 获取第一个工作表名称
    const sheetNames = workbook.SheetNames;
    console.log(`📋 工作表: ${sheetNames.join(', ')}`);
    
    // 读取第一个工作表
    const firstSheet = workbook.Sheets[sheetNames[0]];
    
    // 转换为CSV格式
    const csvData = XLSX.utils.sheet_to_csv(firstSheet);
    
    // 写入CSV文件
    fs.writeFileSync(csvOutputPath, csvData, 'utf-8');
    
    console.log(`✅ 转换成功: ${csvOutputPath}`);
    
    // 显示前几行预览
    const lines = csvData.split('\n');
    console.log(`📊 数据预览 (前5行):`);
    lines.slice(0, 5).forEach((line, index) => {
      console.log(`   ${index + 1}: ${line.slice(0, 100)}${line.length > 100 ? '...' : ''}`);
    });
    
    console.log(`📈 总行数: ${lines.length - 1} 条记录`);
    
    return csvOutputPath;
    
  } catch (error) {
    console.error(`❌ 转换失败: ${error.message}`);
    return null;
  }
}

// 主函数
function main() {
  const excelFile = './九下二模学生成绩.xlsx';
  const csvFile = './九下二模学生成绩.csv';
  
  console.log('🚀 开始Excel转CSV转换\n');
  
  // 检查输入文件是否存在
  if (!fs.existsSync(excelFile)) {
    console.error(`❌ 文件不存在: ${excelFile}`);
    process.exit(1);
  }
  
  // 执行转换
  const result = convertExcelToCSV(excelFile, csvFile);
  
  if (result) {
    console.log('\n🎉 转换完成！');
    console.log(`💡 接下来可以使用: node test-csv-import.js`);
  } else {
    console.log('\n❌ 转换失败！');
    process.exit(1);
  }
}

// 运行主函数
main();