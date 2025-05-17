import { gradeAnalysisService } from './src/services/gradeAnalysisService.js';

// 修复数据库结构
async function fixDatabase() {
  console.log('开始修复数据库结构...');
  
  try {
    // 1. 创建RPC辅助函数
    console.log('第 1 步: 创建RPC辅助函数');
    const helperResult = await gradeAnalysisService.createHelperFunctions();
    console.log('创建RPC辅助函数结果:', helperResult.success ? '成功' : '失败', helperResult.error || '');
    
    // 2. 修复exams表
    console.log('第 2 步: 修复exams表');
    const examsResult = await gradeAnalysisService.fixExamsTable();
    console.log('修复exams表结果:', examsResult.success ? '成功' : '失败', examsResult.modified ? '(已添加scope字段)' : '(表结构正常)', examsResult.error || '');
    
    // 3. 修复grade_data表
    console.log('第 3 步: 修复grade_data表');
    const gradeDataResult = await gradeAnalysisService.fixGradeDataTable();
    console.log('修复grade_data表结果:', gradeDataResult.success ? '成功' : '失败', gradeDataResult.modified ? '(已添加exam_scope字段)' : '(表结构正常)', gradeDataResult.error || '');
    
    console.log('数据库结构修复完成!');
    process.exit(0);
  } catch (error) {
    console.error('修复数据库结构时出错:', error);
    process.exit(1);
  }
}

// 执行修复函数
fixDatabase(); 