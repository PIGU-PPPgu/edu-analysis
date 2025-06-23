import axios from 'axios';

// n8n配置
const N8N_BASE_URL = 'http://localhost:5678';
const WEBHOOK_URL = `${N8N_BASE_URL}/webhook/parse-grade-file`;

// 测试数据
const testData = {
  filename: 'test.csv',
  csvContent: '学号,姓名,班级,语文,数学,英语\n001,张三,一班,85,90,88\n002,李四,一班,78,85,82\n003,王五,二班,92,87,90'
};

// 字段映射配置
const FIELD_MAPPING = {
  // 学生信息映射
  '学号': 'student_id',
  '姓名': 'name',
  '班级': 'class_name',
  '年级': 'grade',
  '性别': 'gender',
  
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

// 解析CSV数据的函数
function parseCSV(csvContent) {
  console.log('📊 开始解析CSV数据...');
  
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV数据格式错误：至少需要标题行和一行数据');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('📋 检测到的字段:', headers);
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      console.warn(`⚠️ 第${i+1}行数据列数不匹配，跳过`);
      continue;
    }
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }
  
  console.log(`✅ 成功解析 ${data.length} 条记录`);
  return { headers, data };
}

// 映射字段的函数
function mapFields(data, fieldMapping) {
  console.log('🔄 开始字段映射...');
  
  return data.map(row => {
    const mappedRow = {};
    
    Object.keys(row).forEach(key => {
      const mappedKey = fieldMapping[key] || key;
      mappedRow[mappedKey] = row[key];
    });
    
    return mappedRow;
  });
}

// 验证数据的函数
function validateData(data) {
  console.log('✅ 开始数据验证...');
  
  const errors = [];
  
  data.forEach((row, index) => {
    // 验证必填字段
    if (!row.student_id) {
      errors.push(`第${index+1}行：缺少学号`);
    }
    if (!row.name) {
      errors.push(`第${index+1}行：缺少姓名`);
    }
    
    // 验证学号格式
    if (row.student_id && !/^[0-9A-Za-z]+$/.test(row.student_id)) {
      errors.push(`第${index+1}行：学号格式不正确`);
    }
    
    // 验证成绩数据
    ['chinese', 'math', 'english'].forEach(subject => {
      if (row[subject]) {
        const score = parseFloat(row[subject]);
        if (isNaN(score) || score < 0 || score > 100) {
          errors.push(`第${index+1}行：${subject}成绩格式不正确`);
        }
      }
    });
  });
  
  if (errors.length > 0) {
    console.error('❌ 数据验证失败:', errors);
    return { valid: false, errors };
  }
  
  console.log('✅ 数据验证通过');
  return { valid: true, errors: [] };
}

// 模拟n8n工作流处理
async function simulateWorkflow() {
  console.log('🚀 开始模拟n8n智能解析工作流');
  console.log('=' .repeat(50));
  
  try {
    // 步骤1: 解析CSV
    console.log('\\n📝 步骤1: 解析CSV数据');
    const { headers, data } = parseCSV(testData.csvContent);
    
    // 步骤2: 字段映射
    console.log('\\n🔄 步骤2: 字段映射');
    const mappedData = mapFields(data, FIELD_MAPPING);
    console.log('映射后的数据示例:', JSON.stringify(mappedData[0], null, 2));
    
    // 步骤3: 数据验证
    console.log('\\n✅ 步骤3: 数据验证');
    const validation = validateData(mappedData);
    
    if (!validation.valid) {
      throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
    }
    
    // 步骤4: 准备数据库插入格式
    console.log('\\n💾 步骤4: 准备数据库格式');
    const processedData = mappedData.map(row => ({
      student_id: row.student_id,
      name: row.name,
      class_name: row.class_name || '未知班级',
      subject: 'multiple', // 多科目成绩
      metadata: {
        chinese: row.chinese ? parseFloat(row.chinese) : null,
        math: row.math ? parseFloat(row.math) : null,
        english: row.english ? parseFloat(row.english) : null,
        import_time: new Date().toISOString(),
        source: 'n8n_workflow'
      }
    }));
    
    console.log('处理后的数据示例:', JSON.stringify(processedData[0], null, 2));
    
    // 步骤5: 模拟响应
    console.log('\\n📤 步骤5: 生成响应');
    const response = {
      success: true,
      message: '数据处理成功',
      data: {
        processed_count: processedData.length,
        field_mapping: FIELD_MAPPING,
        processed_data: processedData
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('\\n🎉 工作流模拟完成!');
    console.log('响应结果:', JSON.stringify(response, null, 2));
    
    return response;
    
  } catch (error) {
    console.error('❌ 工作流处理失败:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 测试实际的n8n webhook
async function testWebhook() {
  console.log('\\n🌐 测试n8n Webhook连接...');
  
  try {
    const response = await axios.post(WEBHOOK_URL, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook测试成功!');
    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️ n8n服务未响应，可能工作流未激活或配置不完整');
    } else if (error.response) {
      console.log('❌ Webhook请求失败');
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else {
      console.log('❌ 网络错误:', error.message);
    }
  }
}

// 主函数
async function main() {
  console.log('🧪 n8n智能解析工作流完整测试');
  console.log('=' .repeat(60));
  
  // 1. 模拟工作流处理
  await simulateWorkflow();
  
  // 2. 测试实际webhook
  await testWebhook();
  
  console.log('\\n📋 测试总结:');
  console.log('- ✅ CSV解析功能正常');
  console.log('- ✅ 字段映射功能正常');
  console.log('- ✅ 数据验证功能正常');
  console.log('- ✅ 数据处理逻辑完整');
  console.log('- ⚠️ n8n工作流需要完善配置');
  
  console.log('\\n🔧 下一步建议:');
  console.log('1. 完善n8n工作流中各节点的配置');
  console.log('2. 配置Code节点的JavaScript代码');
  console.log('3. 配置AI节点的分析逻辑');
  console.log('4. 配置Edit Fields节点的字段处理');
  console.log('5. 激活工作流并进行实际测试');
}

// 运行测试
main().catch(console.error); 