
// 测试修复后的功能
import { adaptedFieldValidator } from './src/services/adaptedFieldValidator.ts';
import { checkExamDuplicate, insertGradeData } from './src/services/fixedQueryLogic.ts';

// 测试字段验证
const testHeaders = ['姓名', '学号', '班级', '语文', '数学', '总分'];
const testMappings = {};
const testData = [{ '姓名': '张三', '学号': '001', '班级': '高一1班', '语文': '85', '数学': '92', '总分': '450' }];

const validationResult = adaptedFieldValidator.validateMapping(testHeaders, testMappings, testData);
console.log('验证结果:', validationResult);

// 测试考试查询
const testExam = { title: '测试考试', type: '月考', date: '2025-06-26' };
checkExamDuplicate(testExam).then(result => {
  console.log('考试查询结果:', result.error ? '失败' : '成功');
});
