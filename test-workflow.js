/**
 * 测试完整的智能数据处理workflow
 */

const SUPABASE_URL = 'https://giluhqotfjpmofowvogn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

// 模拟测试数据（典型的宽表格式）
const testData = [
  {
    '学号': '2024001',
    '姓名': '张三',
    '班级': '高一(1)班',
    '语文': '85',
    '数学': '92',
    '英语': '78',
    '物理': '88',
    '化学': '90',
    '总分': '433'
  },
  {
    '学号': '2024002',
    '姓名': '李四',
    '班级': '高一(1)班',
    '语文': '78',
    '数学': '85',
    '英语': '82',
    '物理': '76',
    '化学': '81',
    '总分': '402'
  },
  {
    '学号': '2024003',
    '姓名': '王五',
    '班级': '高一(1)班',
    '语文': '90',
    '数学': '88',
    '英语': '85',
    '物理': '92',
    '化学': '87',
    '总分': '442'
  }
];

const testHeaders = ['学号', '姓名', '班级', '语文', '数学', '英语', '物理', '化学', '总分'];

async function testIntelligentFileParser() {
  console.log('🧠 测试智能文件解析器...');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/intelligent-file-parser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        data: testData,
        headers: testHeaders,
        filename: '高一(1)班期中考试成绩.xlsx'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API调用失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ 智能文件解析成功!');
    console.log('📊 解析结果:', {
      success: result.success,
      detectedStructure: result.metadata?.detectedStructure,
      confidence: result.metadata?.confidence,
      totalRows: result.metadata?.totalRows,
      detectedSubjects: result.metadata?.detectedSubjects,
      examInfo: result.metadata?.examInfo
    });

    return result;
  } catch (error) {
    console.error('❌ 智能文件解析失败:', error);
    throw error;
  }
}

async function testSaveExamData(parsedData) {
  console.log('💾 测试保存考试数据...');

  try {
    // 使用解析结果中的examInfo
    const examInfo = parsedData.metadata.examInfo;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/save-exam-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        records: parsedData.data,
        examInfo: examInfo
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`保存数据失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ 保存考试数据成功!');
    console.log('📈 保存结果:', {
      success: result.success,
      errors: result.errors?.length || 0,
      message: result.message,
      examId: result.examId
    });

    return result;
  } catch (error) {
    console.error('❌ 保存考试数据失败:', error);
    throw error;
  }
}

async function testAnalyzeGrades(examId) {
  console.log('🤖 测试AI成绩分析...');

  try {
    // 构造分析请求
    const analysisRequest = {
      exam_title: '高一(1)班期中考试成绩',
      class_name: '高一(1)班',
      analysis_type: 'detailed',
      model: 'deepseek-chat',
      grade_data: testData,
      enabled_bots: [] // 不推送到机器人，仅测试分析功能
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-grades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(analysisRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`分析失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ AI分析成功!');
    console.log('📖 分析结果预览:', {
      success: result.success,
      analysisLength: result.data?.result?.length || 0,
      analysisType: result.data?.analysis_type,
      model: result.data?.model
    });

    // 显示分析内容的前200个字符
    if (result.data?.result) {
      console.log('📝 分析内容预览:', result.data.result.substring(0, 200) + '...');
    }

    return result;
  } catch (error) {
    console.error('❌ AI分析失败:', error);
    throw error;
  }
}

async function runCompleteWorkflowTest() {
  console.log('🚀 开始测试完整的智能数据处理workflow...\n');

  try {
    // 步骤1: 智能文件解析
    console.log('=== 步骤1: 智能文件解析 ===');
    const parseResult = await testIntelligentFileParser();
    console.log('');

    // 步骤2: 保存考试数据
    console.log('=== 步骤2: 保存考试数据 ===');
    const saveResult = await testSaveExamData(parseResult);
    console.log('');

    // 步骤3: AI成绩分析
    console.log('=== 步骤3: AI成绩分析 ===');
    const analysisResult = await testAnalyzeGrades(saveResult.examId);
    console.log('');

    console.log('🎉 完整workflow测试成功!');
    console.log('📊 最终总结:', {
      文件解析: '✅ 成功',
      数据保存: '✅ 成功',
      AI分析: '✅ 成功',
      workflow状态: '✅ 完全正常'
    });

    return {
      parseResult,
      saveResult,
      analysisResult
    };

  } catch (error) {
    console.error('❌ Workflow测试失败:', error);
    throw error;
  }
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runCompleteWorkflowTest,
    testIntelligentFileParser,
    testSaveExamData,
    testAnalyzeGrades
  };
}

// 如果在浏览器中运行
if (typeof window !== 'undefined') {
  window.runCompleteWorkflowTest = runCompleteWorkflowTest;
}

// 如果直接运行这个文件
if (typeof process !== 'undefined' && process.argv && process.argv[0].includes('node')) {
  console.log('🚀 开始执行workflow测试...');
  runCompleteWorkflowTest()
    .then(result => {
      console.log('\n🎯 测试完成，所有功能正常工作!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 测试失败:', error.message);
      console.error('完整错误信息:', error);
      process.exit(1);
    });
}