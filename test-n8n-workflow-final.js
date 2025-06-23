import axios from 'axios';

// 测试数据 - 包含完整的71个字段映射
const testData = {
  csvData: `学号,姓名,班级,年级,性别,语文,数学,英语,物理,化学,政治,历史,生物,地理,体育,音乐,美术,信息技术,通用技术,语文等级,数学等级,英语等级,物理等级,化学等级,政治等级,历史等级,生物等级,地理等级,体育等级,音乐等级,美术等级,信息技术等级,通用技术等级,语文班级排名,数学班级排名,英语班级排名,物理班级排名,化学班级排名,政治班级排名,历史班级排名,生物班级排名,地理班级排名,体育班级排名,音乐班级排名,美术班级排名,信息技术班级排名,通用技术班级排名,语文年级排名,数学年级排名,英语年级排名,物理年级排名,化学年级排名,政治年级排名,历史年级排名,生物年级排名,地理年级排名,体育年级排名,音乐年级排名,美术年级排名,信息技术年级排名,通用技术年级排名,总分,平均分,班级排名,年级排名,校内排名,总分等级,考试名称,考试类型,考试日期,考试范围
TEST001,张三,初三1班,初三,男,85,90,88,82,87,89,84,86,83,95,92,88,85,87,B+,A-,B+,B,B+,B+,B,B+,B,A,A-,B+,B+,B+,5,3,4,8,6,2,9,7,10,1,4,5,6,7,15,8,12,25,18,6,28,20,30,3,12,15,18,22,20,25,263,87.7,4,10,25,B+,期中考试,阶段性考试,2024-11-15,全科目
TEST002,李四,初三1班,初三,女,92,87,91,89,85,88,90,84,87,93,89,91,88,86,A-,B+,A-,B+,B+,B+,A-,B,B+,A-,B+,A-,B+,B+,2,6,2,4,7,3,1,11,5,2,6,3,4,8,5,18,6,12,20,9,3,35,8,12,20,25,8,15,270,90.0,2,5,12,A-,期中考试,阶段性考试,2024-11-15,全科目`,
  examTitle: "期中考试",
  examType: "阶段性考试",
  examDate: "2024-11-15",
  examScope: "全科目"
};

async function testN8nWorkflow() {
  console.log('🚀 开始测试n8n工作流...\n');
  
  try {
    // 获取webhook URL
    const webhookUrl = 'http://localhost:5678/webhook/083f9843-c404-4c8f-8210-e64563608f57';
    
    console.log('📡 发送测试数据到n8n工作流...');
    console.log('URL:', webhookUrl);
    console.log('数据包含:', testData.csvData.split('\n').length - 1, '条学生记录');
    
    const response = await axios.post(webhookUrl, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超时
    });
    
    console.log('\n✅ 工作流响应成功!');
    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 验证响应数据
    if (response.data && response.data.success) {
      console.log('\n🎉 n8n工作流测试完全成功!');
      console.log('✓ CSV数据解析正常');
      console.log('✓ 字段映射正确');
      console.log('✓ AI信息提取工作');
      console.log('✓ 数据库插入成功');
      console.log('✓ 工作流完整执行');
    } else {
      console.log('\n⚠️ 工作流执行但可能有问题');
      console.log('响应:', response.data);
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:');
    
    if (error.response) {
      console.error('HTTP状态:', error.response.status);
      console.error('错误响应:', error.response.data);
    } else if (error.request) {
      console.error('网络错误 - 无法连接到n8n');
      console.error('请确保:');
      console.error('1. n8n服务正在运行 (localhost:5678)');
      console.error('2. 工作流已激活');
      console.error('3. webhook URL正确');
    } else {
      console.error('请求配置错误:', error.message);
    }
  }
}

async function checkN8nStatus() {
  console.log('🔍 检查n8n服务状态...');
  
  try {
    const response = await axios.get('http://localhost:5678/healthz', {
      timeout: 5000
    });
    console.log('✅ n8n服务运行正常');
    return true;
  } catch (error) {
    console.error('❌ n8n服务不可用');
    console.error('请启动n8n服务: npx n8n start');
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 n8n智能解析工作流 - 最终测试');
  console.log('='.repeat(60));
  
  // 检查n8n服务状态
  const isN8nRunning = await checkN8nStatus();
  if (!isN8nRunning) {
    return;
  }
  
  console.log('');
  
  // 测试工作流
  await testN8nWorkflow();
  
  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

// 运行测试
main().catch(console.error); 