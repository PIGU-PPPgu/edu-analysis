// 测试优化后的AI字段分析功能 (ES模块版本)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAIFieldAnalysis() {
  console.log('🧪 测试优化后的AI字段分析功能...\n');

  try {
    // 模拟包含合并单元格问题的数据
    const testHeaders = ['学号', '姓名', '班级', '语文', '语文等级', '数学', '数学等级', '英语', '英语等级', '班级排名'];
    const testSampleData = [
      ['108110907001', '张三', '初三7班', '85', 'B+', '92', 'A-', '78', 'B', '5'],
      ['108110907002', '李四', '', '88', 'B+', '85', 'B+', '90', 'A-', '3'], // 班级为空，可能是合并单元格
      ['108110907003', '王五', '', '76', 'B-', '88', 'B+', '82', 'B', '8'], // 班级为空，可能是合并单元格
      ['108110907004', '赵六', '初三8班', '95', 'A', '98', 'A+', '93', 'A', '1'],
    ];

    console.log('📊 测试数据:');
    console.log('表头:', testHeaders);
    console.log('样本数据:', testSampleData);
    console.log('');

    // 测试数据包含的问题：
    // 1. 班级字段有空值（模拟合并单元格）
    // 2. 包含科目分数和等级
    // 3. 包含排名信息

    const testData = {
      provider: 'openai', // 或 'doubao'
      data: {
        headers: testHeaders,
        sampleData: testSampleData,
        context: {
          fileName: '907九下月考成绩.xlsx',
          fileType: 'excel',
          hasSuspiciousMerges: true
        }
      }
    };

    console.log('🚀 调用AI字段分析Edge Function...');
    
    const { data: result, error } = await supabase.functions.invoke('ai-field-analysis', {
      body: testData
    });

    if (error) {
      console.error('❌ AI字段分析调用失败:', error);
      return;
    }

    console.log('✅ AI字段分析完成!\n');

    // 分析结果
    if (result.success) {
      console.log('📋 分析结果:');
      console.log(`置信度: ${result.confidence}`);
      console.log(`识别到的科目: ${result.subjects?.join(', ') || '无'}`);
      console.log('');

      console.log('🗂️ 字段映射:');
      result.mappings?.forEach((mapping, index) => {
        console.log(`${index + 1}. ${mapping.originalField} → ${mapping.mappedField}`);
        if (mapping.subject) {
          console.log(`   科目: ${mapping.subject}, 数据类型: ${mapping.dataType}`);
        }
        console.log(`   置信度: ${mapping.confidence}`);
        if (mapping.notes) {
          console.log(`   说明: ${mapping.notes}`);
        }
        console.log('');
      });

      if (result.tableStructure) {
        console.log('📊 表格结构分析:');
        console.log(`类型: ${result.tableStructure.type}`);
        console.log(`是否有合并单元格: ${result.tableStructure.hasMergedCells ? '是' : '否'}`);
        console.log(`是否有多级表头: ${result.tableStructure.hasMultiLevelHeaders ? '是' : '否'}`);
        console.log('');
      }

      if (result.examInfo) {
        console.log('📝 考试信息推断:');
        console.log(`标题: ${result.examInfo.title || '未识别'}`);
        console.log(`类型: ${result.examInfo.type || '未识别'}`);
        console.log(`日期: ${result.examInfo.date || '未识别'}`);
        console.log('');
      }

      if (result.dataQuality) {
        console.log('🔍 数据质量分析:');
        if (result.dataQuality.missingFields?.length > 0) {
          console.log(`缺失字段: ${result.dataQuality.missingFields.join(', ')}`);
        }
        if (result.dataQuality.inconsistentFormats?.length > 0) {
          console.log(`格式不一致: ${result.dataQuality.inconsistentFormats.join(', ')}`);
        }
        if (result.dataQuality.suspiciousData?.length > 0) {
          console.log(`可疑数据: ${result.dataQuality.suspiciousData.join(', ')}`);
        }
        console.log('');
      }

      console.log('💭 AI分析推理:');
      console.log(result.reasoning);

    } else {
      console.error('❌ AI分析失败:', result.error);
      if (result.rawResponse) {
        console.log('原始响应:', result.rawResponse);
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testAIFieldAnalysis(); 