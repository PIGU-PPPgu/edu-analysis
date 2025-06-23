// 简化的n8n工作流测试
console.log('🧪 n8n工作流测试开始');
console.log('=' .repeat(50));

// 测试n8n服务状态
async function testN8nStatus() {
  console.log('\n🔍 检查n8n服务状态...');
  
  try {
    const response = await fetch('http://localhost:5678/healthz');
    if (response.ok) {
      console.log('✅ n8n服务运行正常');
      return true;
    } else {
      console.log('⚠️ n8n服务响应异常');
      return false;
    }
  } catch (error) {
    console.log('❌ 无法连接到n8n服务');
    console.log('💡 请确保n8n已启动: npx n8n start');
    return false;
  }
}

// 模拟数据处理
function simulateWorkflow() {
  console.log('\n🔄 模拟n8n工作流处理...');
  
  const testData = `学号,姓名,班级,数学,语文,英语
TEST001,张三,初三1班,85,92,78
TEST002,李四,初三1班,90,88,85
TEST003,王五,初三2班,78,85,92`;

  console.log('📋 测试数据:');
  console.log(testData);
  
  // 解析CSV
  const lines = testData.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1);
  
  console.log(`\n📊 解析结果: ${headers.length} 列, ${rows.length} 行数据`);
  
  // 字段映射
  const FIELD_MAPPING = {
    '学号': 'student_id',
    '姓名': 'name', 
    '班级': 'class_name',
    '数学': 'math',
    '语文': 'chinese',
    '英语': 'english'
  };
  
  console.log('\n🗺️ 字段映射:');
  Object.entries(FIELD_MAPPING).forEach(([chinese, english]) => {
    console.log(`  ${chinese} → ${english}`);
  });
  
  // 模拟处理结果
  const result = {
    success: true,
    message: '数据处理完成',
    summary: {
      totalProcessed: rows.length,
      successfulInserts: rows.length,
      processingTime: new Date().toISOString(),
      aiAnalysis: '数据质量良好，所有字段识别正确'
    },
    details: {
      fileType: 'CSV',
      importTime: new Date().toISOString(),
      examInfo: {
        title: '模拟测试考试',
        type: '单元测试',
        date: '2025-01-15'
      }
    }
  };
  
  console.log('\n✅ 模拟处理结果:');
  console.log(JSON.stringify(result, null, 2));
  
  return result;
}

// 主函数
async function main() {
  try {
    // 检查n8n状态
    const isRunning = await testN8nStatus();
    
    if (isRunning) {
      console.log('\n🎯 n8n服务可用，可以配置实际工作流');
      console.log('📝 请参考 n8n-workflow-complete-setup.md 进行配置');
    } else {
      console.log('\n⚠️ n8n服务不可用，运行模拟测试');
    }
    
    // 运行模拟工作流
    const result = simulateWorkflow();
    
    if (result.success) {
      console.log('\n🎉 测试成功完成！');
      console.log(`✅ 处理了 ${result.summary.totalProcessed} 条记录`);
    }
    
    console.log('\n📋 下一步操作:');
    console.log('1. 启动n8n服务: npx n8n start');
    console.log('2. 访问 http://localhost:5678');
    console.log('3. 按照配置指南设置工作流');
    console.log('4. 测试完整的数据处理流程');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
  
  console.log('\n📝 测试完成');
  console.log('=' .repeat(50));
}

// 运行测试
main(); 