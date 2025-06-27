
// 🧪 快速测试修复效果
import { checkExamDuplicateSafe, createExamSafe } from './ImportProcessor-fix-patch';

export async function testFixes() {
  console.log('🧪 开始测试修复效果...');
  
  try {
    // 测试1: 考试查询
    const testExam = {
      title: '修复测试_' + Date.now(),
      type: '单元测试', 
      date: '2025-06-26'
    };
    
    console.log('测试考试查询...');
    const queryResult = await checkExamDuplicateSafe(testExam);
    
    if (queryResult.error) {
      console.error('❌ 考试查询测试失败:', queryResult.error.message);
      return false;
    } else {
      console.log('✅ 考试查询测试通过');
    }
    
    // 测试2: 考试创建
    console.log('测试考试创建...');
    const createResult = await createExamSafe(testExam);
    
    if (createResult.error) {
      console.error('❌ 考试创建测试失败:', createResult.error.message);
      return false;
    } else {
      console.log('✅ 考试创建测试通过，ID:', createResult.data.id);
    }
    
    console.log('🎉 所有修复测试通过！');
    return true;
    
  } catch (error) {
    console.error('❌ 测试过程失败:', error);
    return false;
  }
}

// 如果直接运行此文件
if (typeof window === 'undefined') {
  testFixes().then(success => {
    console.log(success ? '✅ 修复验证成功' : '❌ 修复验证失败');
  });
}
