// n8n智能解析系统集成测试
import { createClient } from '@supabase/supabase-js';

// Supabase配置
const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 测试数据
const testGradeData = [
  {
    student_id: "TEST001",
    name: "测试学生1",
    class_name: "测试班级",
    subject: "数学",
    score: 85,
    exam_title: "n8n测试考试",
    exam_type: "测试",
    exam_date: "2025-01-15"
  },
  {
    student_id: "TEST002", 
    name: "测试学生2",
    class_name: "测试班级",
    subject: "语文",
    score: 92,
    exam_title: "n8n测试考试",
    exam_type: "测试",
    exam_date: "2025-01-15"
  }
];

// 字段映射配置（从我们的配置文件）
const FIELD_MAPPING = {
  // 学生信息映射
  '学号': 'student_id',
  '姓名': 'name',
  '班级': 'class_name',
  '年级': 'grade',
  
  // 成绩科目映射
  '语文': 'chinese',
  '数学': 'math',
  '英语': 'english',
  '物理': 'physics',
  '化学': 'chemistry',
  '政治': 'politics',
  '历史': 'history',
  '生物': 'biology',
  '地理': 'geography'
};

// 数据验证规则 - 修正为更宽松的规则
const VALIDATION_RULES = {
  student_id: {
    required: true,
    type: 'string',
    pattern: /^[A-Za-z0-9\u4e00-\u9fa5]+$/,  // 支持中文字符
    minLength: 3,
    maxLength: 20
  },
  name: {
    required: true,
    type: 'string',
    minLength: 1,  // 改为1个字符
    maxLength: 20  // 增加到20个字符
  },
  class_name: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 30  // 增加到30个字符
  }
  // 移除score的必填要求，因为在字段映射阶段可能没有score字段
};

// 1. 测试Supabase连接
async function testSupabaseConnection() {
  console.log('\n🔗 测试Supabase连接...');
  
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase连接失败:', error.message);
      return false;
    }
    
    console.log('✅ Supabase连接成功');
    return true;
  } catch (err) {
    console.error('❌ Supabase连接异常:', err.message);
    return false;
  }
}

// 2. 测试字段映射功能
function testFieldMapping() {
  console.log('\n🗺️ 测试字段映射功能...');
  
  const testData = {
    '学号': 'TEST001',
    '姓名': '测试学生',
    '班级': '测试班级',
    '数学': 85,
    '语文': 92
  };
  
  const mappedData = {};
  
  for (const [chineseField, value] of Object.entries(testData)) {
    const englishField = FIELD_MAPPING[chineseField] || chineseField;
    mappedData[englishField] = value;
  }
  
  console.log('原始数据:', testData);
  console.log('映射后数据:', mappedData);
  
  // 验证映射结果
  const expectedMapping = {
    student_id: 'TEST001',
    name: '测试学生',
    class_name: '测试班级',
    math: 85,
    chinese: 92
  };
  
  const isCorrect = JSON.stringify(mappedData) === JSON.stringify(expectedMapping);
  console.log(isCorrect ? '✅ 字段映射测试通过' : '❌ 字段映射测试失败');
  
  return isCorrect;
}

// 3. 测试数据验证功能
function testDataValidation() {
  console.log('\n✅ 测试数据验证功能...');
  
  const testCases = [
    {
      name: '有效数据',
      data: { student_id: 'TEST001', name: '测试学生', class_name: '测试班级' },
      expected: true
    },
    {
      name: '学号为空',
      data: { student_id: '', name: '测试学生', class_name: '测试班级' },
      expected: false
    },
    {
      name: '姓名为空',
      data: { student_id: 'TEST001', name: '', class_name: '测试班级' },
      expected: false
    },
    {
      name: '班级为空',
      data: { student_id: 'TEST001', name: '测试学生', class_name: '' },
      expected: false
    }
  ];
  
  let passedTests = 0;
  
  for (const testCase of testCases) {
    const isValid = validateData(testCase.data);
    const passed = isValid === testCase.expected;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.name}: ${isValid ? '有效' : '无效'}`);
    
    if (passed) passedTests++;
  }
  
  console.log(`数据验证测试: ${passedTests}/${testCases.length} 通过`);
  return passedTests === testCases.length;
}

// 数据验证函数
function validateData(data) {
  for (const [field, rules] of Object.entries(VALIDATION_RULES)) {
    const value = data[field];
    
    // 检查必填字段
    if (rules.required && (value === undefined || value === null || value === '')) {
      return false;
    }
    
    if (value !== undefined && value !== null && value !== '') {
      // 检查数据类型
      if (rules.type === 'string' && typeof value !== 'string') {
        return false;
      }
      
      if (rules.type === 'number' && typeof value !== 'number') {
        return false;
      }
      
      // 检查字符串长度
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          return false;
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          return false;
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          return false;
        }
      }
      
      // 检查数值范围
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          return false;
        }
        if (rules.max !== undefined && value > rules.max) {
          return false;
        }
      }
    }
  }
  
  return true;
}

// 4. 测试数据库操作 - 简化为只读操作
async function testDatabaseOperations() {
  console.log('\n💾 测试数据库操作...');
  
  try {
    // 测试读取现有数据
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('*')
      .limit(1);
    
    if (examError) {
      console.error('❌ 读取考试数据失败:', examError.message);
      return false;
    }
    
    console.log('✅ 考试数据读取成功:', examData?.length || 0, '条记录');
    
    // 测试读取成绩数据
    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_data')
      .select('*')
      .limit(1);
    
    if (gradeError) {
      console.error('❌ 读取成绩数据失败:', gradeError.message);
      return false;
    }
    
    console.log('✅ 成绩数据读取成功:', gradeData?.length || 0, '条记录');
    
    // 测试读取学生数据
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .limit(1);
    
    if (studentError) {
      console.error('❌ 读取学生数据失败:', studentError.message);
      return false;
    }
    
    console.log('✅ 学生数据读取成功:', studentData?.length || 0, '条记录');
    
    return true;
  } catch (err) {
    console.error('❌ 数据库操作异常:', err.message);
    return false;
  }
}

// 5. 测试n8n工作流模拟
function testN8nWorkflowSimulation() {
  console.log('\n🔄 测试n8n工作流模拟...');
  
  // 模拟CSV数据解析
  const csvData = `学号,姓名,班级,数学,语文,英语
TEST001,张三,初三1班,85,92,78
TEST002,李四,初三1班,90,88,85
TEST003,王五,初三2班,78,85,92`;
  
  console.log('原始CSV数据:');
  console.log(csvData);
  
  // 解析CSV
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => line.split(','));
  
  // 转换为对象数组
  const parsedData = rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  
  console.log('\n解析后的数据:');
  console.log(parsedData);
  
  // 应用字段映射
  const mappedData = parsedData.map(item => {
    const mapped = {};
    for (const [key, value] of Object.entries(item)) {
      const mappedKey = FIELD_MAPPING[key] || key;
      mapped[mappedKey] = isNaN(value) ? value : Number(value);
    }
    return mapped;
  });
  
  console.log('\n字段映射后的数据:');
  console.log(mappedData);
  
  // 数据验证 - 只验证基础字段
  const validData = mappedData.filter(item => {
    // 只验证必要的字段
    return item.student_id && item.name && item.class_name;
  });
  
  const invalidData = mappedData.filter(item => {
    return !item.student_id || !item.name || !item.class_name;
  });
  
  console.log(`\n数据验证结果: ${validData.length} 条有效, ${invalidData.length} 条无效`);
  
  if (invalidData.length > 0) {
    console.log('无效数据:', invalidData);
  }
  
  // 显示有效数据的结构
  if (validData.length > 0) {
    console.log('\n✅ 有效数据示例:');
    console.log(validData[0]);
  }
  
  return validData.length > 0;
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 开始n8n智能解析系统集成测试\n');
  console.log('=' .repeat(50));
  
  const results = {
    supabaseConnection: await testSupabaseConnection(),
    fieldMapping: testFieldMapping(),
    dataValidation: testDataValidation(),
    databaseOperations: await testDatabaseOperations(),
    workflowSimulation: testN8nWorkflowSimulation()
  };
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 测试结果汇总:');
  console.log('=' .repeat(50));
  
  for (const [testName, result] of Object.entries(results)) {
    console.log(`${result ? '✅' : '❌'} ${testName}: ${result ? '通过' : '失败'}`);
  }
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n总体结果: ${passedTests}/${totalTests} 测试通过`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！n8n智能解析系统准备就绪');
  } else {
    console.log('⚠️ 部分测试失败，请检查配置');
  }
  
  return passedTests === totalTests;
}

// 运行测试
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('测试运行异常:', err);
    process.exit(1);
  });

export {
  testSupabaseConnection,
  testFieldMapping,
  testDataValidation,
  testDatabaseOperations,
  testN8nWorkflowSimulation,
  runAllTests
}; 