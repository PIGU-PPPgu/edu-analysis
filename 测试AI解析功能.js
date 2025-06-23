// 测试AI字段分析功能
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://giluhqotfjpmofowvogn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAIFieldAnalysis() {
  console.log('🧪 开始测试AI字段分析功能...\n');

  // 测试案例1：标准字段名（AI应该能轻松识别）
  const testCase1 = {
    headers: ['学号', '姓名', '班级', '语文', '数学', '英语', '总分'],
    sampleData: [
      { '学号': '2024001', '姓名': '张三', '班级': '初三1班', '语文': '85', '数学': '92', '英语': '78', '总分': '255' },
      { '学号': '2024002', '姓名': '李四', '班级': '初三1班', '语文': '90', '数学': '88', '英语': '85', '总分': '263' }
    ]
  };

  // 测试案例2：非标准字段名（测试AI智能映射能力）
  const testCase2 = {
    headers: ['Student ID', 'Full Name', 'Class Info', 'Chinese Score', 'Math Grade', 'English Result', 'Total Points'],
    sampleData: [
      { 'Student ID': '2024001', 'Full Name': '王五', 'Class Info': '高二3班', 'Chinese Score': '88', 'Math Grade': 'A', 'English Result': '82', 'Total Points': '268' },
      { 'Student ID': '2024002', 'Full Name': '赵六', 'Class Info': '高二3班', 'Chinese Score': '92', 'Math Grade': 'A+', 'English Result': '79', 'Total Points': '271' }
    ]
  };

  // 测试案例3：复杂混合字段（测试AI的边界处理能力）
  const testCase3 = {
    headers: ['编号', '学生姓名', '所在班级', '语文成绩', '数学分数', '英语得分', '物理成绩', '化学分数', '班级排名', '年级排名'],
    sampleData: [
      { '编号': 'XH001', '学生姓名': '孙七', '所在班级': '初三7班', '语文成绩': '86', '数学分数': '94', '英语得分': '81', '物理成绩': '89', '化学分数': '92', '班级排名': '5', '年级排名': '23' },
      { '编号': 'XH002', '学生姓名': '周八', '所在班级': '初三7班', '语文成绩': '91', '数学分数': '87', '英语得分': '88', '物理成绩': '85', '化学分数': '90', '班级排名': '3', '年级排名': '15' }
    ]
  };

  const testCases = [
    { name: '标准字段测试', data: testCase1 },
    { name: '英文字段映射测试', data: testCase2 },
    { name: '复杂字段智能识别测试', data: testCase3 }
  ];

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`字段: [${testCase.data.headers.join(', ')}]`);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('ai-field-analysis', {
        body: {
          provider: 'doubao', // 或者 'openai'
          data: {
            headers: testCase.data.headers,
            sampleData: testCase.data.sampleData,
            context: `这是一个学生成绩数据文件，测试案例：${testCase.name}`
          }
        }
      });

      if (error) {
        console.error(`❌ ${testCase.name} 失败:`, error);
        continue;
      }

      if (result && result.success) {
        console.log(`✅ ${testCase.name} 成功!`);
        console.log(`置信度: ${result.confidence || 'N/A'}`);
        
        // 显示字段映射结果
        console.log('📊 AI字段映射结果:');
        if (result.mappings && result.mappings.length > 0) {
          result.mappings.forEach(mapping => {
            console.log(`  ${mapping.originalField} → ${mapping.mappedField} (置信度: ${mapping.confidence})`);
          });
        } else {
          console.log('  未返回字段映射结果');
        }

        // 显示识别的科目
        if (result.subjects && result.subjects.length > 0) {
          console.log(`🎯 识别的科目: [${result.subjects.join(', ')}]`);
        }

        // 显示表格结构分析
        if (result.tableStructure) {
          console.log(`📋 表格结构: ${result.tableStructure.type || 'unknown'}`);
          if (result.tableStructure.hasMergedCells) {
            console.log('⚠️  检测到合并单元格');
          }
        }

        // 显示数据质量分析
        if (result.dataQuality) {
          if (result.dataQuality.missingFields && result.dataQuality.missingFields.length > 0) {
            console.log(`⚠️  缺失字段: [${result.dataQuality.missingFields.join(', ')}]`);
          }
          if (result.dataQuality.suspiciousData && result.dataQuality.suspiciousData.length > 0) {
            console.log(`⚠️  可疑数据: [${result.dataQuality.suspiciousData.join(', ')}]`);
          }
        }

        // 显示AI推理过程
        if (result.reasoning) {
          console.log(`🤔 AI推理: ${result.reasoning.substring(0, 100)}...`);
        }

      } else {
        console.log(`❓ ${testCase.name} 返回了结果但success=false:`, result);
      }

    } catch (error) {
      console.error(`💥 ${testCase.name} 抛出异常:`, error);
    }

    console.log('─'.repeat(60));
  }

  // 性能测试
  console.log('\n⏱️  性能测试...');
  const startTime = Date.now();
  
  try {
    const { data: result, error } = await supabase.functions.invoke('ai-field-analysis', {
      body: {
        provider: 'doubao',
        data: testCase1
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (error) {
      console.log(`❌ 性能测试失败: ${duration}ms`);
    } else {
      console.log(`✅ 性能测试成功: ${duration}ms`);
      if (duration > 10000) {
        console.log('⚠️  响应时间超过10秒，可能需要优化');
      } else if (duration > 5000) {
        console.log('⚠️  响应时间超过5秒，建议优化');
      } else {
        console.log('✨ 响应时间良好');
      }
    }
  } catch (error) {
    console.error('💥 性能测试异常:', error);
  }
}

// 运行测试
testAIFieldAnalysis().catch(console.error); 