const axios = require('axios');

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5ODg3NDc2LCJleHAiOjE3NTI0NjU2MDB9.hsRUMthJk6MGh4tSuGChUorBbvQY75IBOKa9wNNsOng';
const N8N_BASE_URL = 'http://localhost:5678/api/v1';
const WORKFLOW_ID = 'TX3mvXbjU0z6PdDm';

const headers = {
  'Authorization': `Bearer ${N8N_API_KEY}`,
  'Content-Type': 'application/json'
};

async function getWorkflowDetails() {
  try {
    console.log('🔍 获取工作流详细信息...');
    const response = await axios.get(`${N8N_BASE_URL}/workflows/${WORKFLOW_ID}`, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ 获取工作流失败:', error.response?.data || error.message);
    return null;
  }
}

async function fixInformationExtractor() {
  console.log('🔧 开始修复Information Extractor节点配置...\n');
  
  // 1. 获取当前工作流配置
  const workflow = await getWorkflowDetails();
  if (!workflow) {
    console.error('❌ 无法获取工作流配置');
    return;
  }
  
  console.log('✅ 工作流获取成功');
  console.log(`📋 工作流名称: ${workflow.name}`);
  console.log(`🔢 节点数量: ${workflow.nodes.length}`);
  
  // 2. 查找Information Extractor节点
  const infoExtractorNode = workflow.nodes.find(node => 
    node.type === '@n8n/n8n-nodes-langchain.informationExtractor'
  );
  
  if (!infoExtractorNode) {
    console.error('❌ 未找到Information Extractor节点');
    return;
  }
  
  console.log('✅ 找到Information Extractor节点');
  console.log(`📋 节点名称: ${infoExtractorNode.name}`);
  console.log(`🔧 当前参数:`, JSON.stringify(infoExtractorNode.parameters, null, 2));
  
  // 3. 查找OpenAI Chat Model节点
  const openaiNode = workflow.nodes.find(node => 
    node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi'
  );
  
  if (!openaiNode) {
    console.error('❌ 未找到OpenAI Chat Model节点');
    return;
  }
  
  console.log('✅ 找到OpenAI Chat Model节点');
  console.log(`📋 节点ID: ${openaiNode.id}`);
  
  // 4. 修复Information Extractor配置
  console.log('\n🔧 开始修复配置...');
  
  // 确保Information Extractor正确连接到OpenAI模型
  infoExtractorNode.parameters = {
    ...infoExtractorNode.parameters,
    model: {
      __rl: true,
      mode: "list",
      value: openaiNode.name,
      cachedResultName: openaiNode.name,
      cachedResultUrl: `/workflows/${WORKFLOW_ID}/nodes/${openaiNode.name}`
    },
    // 配置提取的属性 - 使用我们的71个字段映射
    attributes: {
      attributes: [
        // 基本信息字段
        { name: "student_id", description: "学号", type: "string" },
        { name: "name", description: "姓名", type: "string" },
        { name: "class_name", description: "班级", type: "string" },
        { name: "grade", description: "年级", type: "string" },
        { name: "gender", description: "性别", type: "string" },
        
        // 科目分数字段
        { name: "chinese", description: "语文分数", type: "number" },
        { name: "math", description: "数学分数", type: "number" },
        { name: "english", description: "英语分数", type: "number" },
        { name: "physics", description: "物理分数", type: "number" },
        { name: "chemistry", description: "化学分数", type: "number" },
        { name: "politics", description: "政治分数", type: "number" },
        { name: "history", description: "历史分数", type: "number" },
        { name: "biology", description: "生物分数", type: "number" },
        { name: "geography", description: "地理分数", type: "number" },
        { name: "pe", description: "体育分数", type: "number" },
        { name: "music", description: "音乐分数", type: "number" },
        { name: "art", description: "美术分数", type: "number" },
        { name: "it", description: "信息技术分数", type: "number" },
        { name: "general_tech", description: "通用技术分数", type: "number" },
        
        // 科目等级字段
        { name: "chinese_grade", description: "语文等级", type: "string" },
        { name: "math_grade", description: "数学等级", type: "string" },
        { name: "english_grade", description: "英语等级", type: "string" },
        { name: "physics_grade", description: "物理等级", type: "string" },
        { name: "chemistry_grade", description: "化学等级", type: "string" },
        { name: "politics_grade", description: "政治等级", type: "string" },
        { name: "history_grade", description: "历史等级", type: "string" },
        { name: "biology_grade", description: "生物等级", type: "string" },
        { name: "geography_grade", description: "地理等级", type: "string" },
        { name: "pe_grade", description: "体育等级", type: "string" },
        { name: "music_grade", description: "音乐等级", type: "string" },
        { name: "art_grade", description: "美术等级", type: "string" },
        { name: "it_grade", description: "信息技术等级", type: "string" },
        { name: "general_tech_grade", description: "通用技术等级", type: "string" },
        
        // 科目班级排名字段
        { name: "chinese_class_rank", description: "语文班级排名", type: "number" },
        { name: "math_class_rank", description: "数学班级排名", type: "number" },
        { name: "english_class_rank", description: "英语班级排名", type: "number" },
        { name: "physics_class_rank", description: "物理班级排名", type: "number" },
        { name: "chemistry_class_rank", description: "化学班级排名", type: "number" },
        { name: "politics_class_rank", description: "政治班级排名", type: "number" },
        { name: "history_class_rank", description: "历史班级排名", type: "number" },
        { name: "biology_class_rank", description: "生物班级排名", type: "number" },
        { name: "geography_class_rank", description: "地理班级排名", type: "number" },
        { name: "pe_class_rank", description: "体育班级排名", type: "number" },
        { name: "music_class_rank", description: "音乐班级排名", type: "number" },
        { name: "art_class_rank", description: "美术班级排名", type: "number" },
        { name: "it_class_rank", description: "信息技术班级排名", type: "number" },
        { name: "general_tech_class_rank", description: "通用技术班级排名", type: "number" },
        
        // 科目年级排名字段
        { name: "chinese_grade_rank", description: "语文年级排名", type: "number" },
        { name: "math_grade_rank", description: "数学年级排名", type: "number" },
        { name: "english_grade_rank", description: "英语年级排名", type: "number" },
        { name: "physics_grade_rank", description: "物理年级排名", type: "number" },
        { name: "chemistry_grade_rank", description: "化学年级排名", type: "number" },
        { name: "politics_grade_rank", description: "政治年级排名", type: "number" },
        { name: "history_grade_rank", description: "历史年级排名", type: "number" },
        { name: "biology_grade_rank", description: "生物年级排名", type: "number" },
        { name: "geography_grade_rank", description: "地理年级排名", type: "number" },
        { name: "pe_grade_rank", description: "体育年级排名", type: "number" },
        { name: "music_grade_rank", description: "音乐年级排名", type: "number" },
        { name: "art_grade_rank", description: "美术年级排名", type: "number" },
        { name: "it_grade_rank", description: "信息技术年级排名", type: "number" },
        { name: "general_tech_grade_rank", description: "通用技术年级排名", type: "number" },
        
        // 统计字段
        { name: "total_score", description: "总分", type: "number" },
        { name: "average_score", description: "平均分", type: "number" },
        { name: "rank_in_class", description: "班级排名", type: "number" },
        { name: "rank_in_grade", description: "年级排名", type: "number" },
        { name: "rank_in_school", description: "校内排名", type: "number" },
        { name: "total_grade", description: "总分等级", type: "string" },
        
        // 考试信息字段
        { name: "exam_title", description: "考试名称", type: "string" },
        { name: "exam_type", description: "考试类型", type: "string" },
        { name: "exam_date", description: "考试日期", type: "string" },
        { name: "exam_scope", description: "考试范围", type: "string" }
      ]
    },
    // 设置提取指令
    extractionInstruction: `请从提供的学生成绩数据中提取以下信息：
1. 学生基本信息：学号、姓名、班级、年级、性别
2. 各科目分数：语文、数学、英语、物理、化学、政治、历史、生物、地理、体育、音乐、美术、信息技术、通用技术
3. 各科目等级：对应科目的等级评定
4. 各科目班级排名：对应科目在班级中的排名
5. 各科目年级排名：对应科目在年级中的排名
6. 统计信息：总分、平均分、班级排名、年级排名、校内排名、总分等级
7. 考试信息：考试名称、考试类型、考试日期、考试范围

请确保提取的数据准确无误，数字类型的字段请返回数字，字符串类型的字段请返回字符串。`
  };
  
  // 5. 更新工作流
  try {
    console.log('💾 保存更新的工作流配置...');
    const updateResponse = await axios.put(
      `${N8N_BASE_URL}/workflows/${WORKFLOW_ID}`,
      workflow,
      { headers }
    );
    
    console.log('✅ 工作流配置更新成功!');
    console.log('🎯 Information Extractor节点已正确配置');
    console.log('📊 已配置71个字段的提取规则');
    
    return true;
  } catch (error) {
    console.error('❌ 更新工作流失败:', error.response?.data || error.message);
    return false;
  }
}

async function testWorkflowActivation() {
  console.log('\n🧪 测试工作流激活...');
  
  try {
    const response = await axios.post(
      `${N8N_BASE_URL}/workflows/${WORKFLOW_ID}/activate`,
      {},
      { headers }
    );
    
    console.log('✅ 工作流激活成功!');
    return true;
  } catch (error) {
    console.error('❌ 工作流激活失败:', error.response?.data || error.message);
    return false;
  }
}

// 主执行函数
async function main() {
  console.log('🚀 开始修复n8n Information Extractor节点...\n');
  
  const success = await fixInformationExtractor();
  
  if (success) {
    console.log('\n🎉 修复完成! 现在尝试激活工作流...');
    await testWorkflowActivation();
  } else {
    console.log('\n❌ 修复失败，请检查错误信息');
  }
}

main().catch(console.error); 