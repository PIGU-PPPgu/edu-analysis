#!/usr/bin/env node

/**
 * n8n Information Extractor 自动配置脚本
 * 尝试通过API自动添加71个字段属性
 */

const axios = require('axios');

// n8n配置
const N8N_BASE_URL = 'http://localhost:5678';
const WORKFLOW_ID = 'TX3mvXbjU0z6PdDm'; // 您的工作流ID

// 71个字段配置
const FIELD_ATTRIBUTES = [
  // 基础信息 (已存在的3个)
  { name: 'student_id', description: '学号' },
  { name: 'name', description: '姓名' },
  { name: 'class_name', description: '学生所在的班级名称，如初三7班' },
  
  // 科目成绩 (14个)
  { name: 'chinese', description: '语文成绩分数' },
  { name: 'math', description: '数学成绩分数' },
  { name: 'english', description: '英语成绩分数' },
  { name: 'physics', description: '物理成绩分数' },
  { name: 'chemistry', description: '化学成绩分数' },
  { name: 'politics', description: '政治成绩分数' },
  { name: 'history', description: '历史成绩分数' },
  { name: 'biology', description: '生物成绩分数' },
  { name: 'geography', description: '地理成绩分数' },
  { name: 'pe', description: '体育成绩分数' },
  { name: 'music', description: '音乐成绩分数' },
  { name: 'art', description: '美术成绩分数' },
  { name: 'it', description: '信息技术成绩分数' },
  { name: 'general_tech', description: '通用技术成绩分数' },
  
  // 科目等级 (14个)
  { name: 'chinese_grade', description: '语文等级，如A+、A、B+等' },
  { name: 'math_grade', description: '数学等级' },
  { name: 'english_grade', description: '英语等级' },
  { name: 'physics_grade', description: '物理等级' },
  { name: 'chemistry_grade', description: '化学等级' },
  { name: 'politics_grade', description: '政治等级' },
  { name: 'history_grade', description: '历史等级' },
  { name: 'biology_grade', description: '生物等级' },
  { name: 'geography_grade', description: '地理等级' },
  { name: 'pe_grade', description: '体育等级' },
  { name: 'music_grade', description: '音乐等级' },
  { name: 'art_grade', description: '美术等级' },
  { name: 'it_grade', description: '信息技术等级' },
  { name: 'general_tech_grade', description: '通用技术等级' },
  
  // 班级排名 (14个)
  { name: 'chinese_class_rank', description: '语文班级排名' },
  { name: 'math_class_rank', description: '数学班级排名' },
  { name: 'english_class_rank', description: '英语班级排名' },
  { name: 'physics_class_rank', description: '物理班级排名' },
  { name: 'chemistry_class_rank', description: '化学班级排名' },
  { name: 'politics_class_rank', description: '政治班级排名' },
  { name: 'history_class_rank', description: '历史班级排名' },
  { name: 'biology_class_rank', description: '生物班级排名' },
  { name: 'geography_class_rank', description: '地理班级排名' },
  { name: 'pe_class_rank', description: '体育班级排名' },
  { name: 'music_class_rank', description: '音乐班级排名' },
  { name: 'art_class_rank', description: '美术班级排名' },
  { name: 'it_class_rank', description: '信息技术班级排名' },
  { name: 'general_tech_class_rank', description: '通用技术班级排名' },
  
  // 年级排名 (14个)
  { name: 'chinese_grade_rank', description: '语文年级排名' },
  { name: 'math_grade_rank', description: '数学年级排名' },
  { name: 'english_grade_rank', description: '英语年级排名' },
  { name: 'physics_grade_rank', description: '物理年级排名' },
  { name: 'chemistry_grade_rank', description: '化学年级排名' },
  { name: 'politics_grade_rank', description: '政治年级排名' },
  { name: 'history_grade_rank', description: '历史年级排名' },
  { name: 'biology_grade_rank', description: '生物年级排名' },
  { name: 'geography_grade_rank', description: '地理年级排名' },
  { name: 'pe_grade_rank', description: '体育年级排名' },
  { name: 'music_grade_rank', description: '音乐年级排名' },
  { name: 'art_grade_rank', description: '美术年级排名' },
  { name: 'it_grade_rank', description: '信息技术年级排名' },
  { name: 'general_tech_grade_rank', description: '通用技术年级排名' },
  
  // 统计信息 (6个)
  { name: 'total_score', description: '总分' },
  { name: 'average_score', description: '平均分' },
  { name: 'rank_in_class', description: '班级总排名' },
  { name: 'rank_in_grade', description: '年级总排名' },
  { name: 'rank_in_school', description: '校内总排名' },
  { name: 'total_grade', description: '总分等级' },
  
  // 考试信息 (4个)
  { name: 'exam_title', description: '考试名称' },
  { name: 'exam_type', description: '考试类型，如月考、期中考试' },
  { name: 'exam_date', description: '考试日期' },
  { name: 'exam_scope', description: '考试范围，如class、grade、school' },
  
  // 学生信息 (2个)
  { name: 'grade', description: '年级信息' },
  { name: 'gender', description: '性别' }
];

// API请求配置
const apiConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000
};

/**
 * 获取工作流详情
 */
async function getWorkflow() {
  try {
    console.log('🔍 获取工作流详情...');
    const response = await axios.get(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, apiConfig);
    return response.data;
  } catch (error) {
    console.error('❌ 获取工作流失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return null;
  }
}

/**
 * 更新工作流配置
 */
async function updateWorkflow(workflowData) {
  try {
    console.log('💾 更新工作流配置...');
    const response = await axios.put(
      `${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`,
      workflowData,
      apiConfig
    );
    return response.data;
  } catch (error) {
    console.error('❌ 更新工作流失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return null;
  }
}

/**
 * 配置Information Extractor节点
 */
function configureInformationExtractor(workflow) {
  console.log('🔧 配置Information Extractor节点...');
  
  // 查找Information Extractor节点
  const nodes = workflow.nodes || [];
  const extractorNode = nodes.find(node => 
    node.type === '@n8n/n8n-nodes-langchain.informationExtractor' ||
    node.name.includes('Information Extractor')
  );
  
  if (!extractorNode) {
    console.error('❌ 未找到Information Extractor节点');
    return false;
  }
  
  console.log('✅ 找到Information Extractor节点:', extractorNode.name);
  
  // 配置属性
  const attributes = FIELD_ATTRIBUTES.map(attr => ({
    name: attr.name,
    description: attr.description,
    type: 'string' // 默认类型
  }));
  
  // 更新节点参数
  extractorNode.parameters = {
    ...extractorNode.parameters,
    attributes: attributes,
    systemMessage: `你是一个专业的教育数据解析专家。请从CSV数据中准确提取学生成绩信息。

重要规则：
1. 学号(student_id)是必填字段，不能为空
2. 姓名(name)是必填字段，不能为空
3. 分数字段应该是数字，如果无法解析则返回null
4. 等级字段通常是A+、A、A-、B+、B、B-、C+、C、C-、D+、D、E等
5. 排名字段应该是正整数，如果无法解析则返回null
6. 班级名称应该标准化，如"初三7班"、"高二3班"等
7. 如果某个字段在数据中不存在，请返回null而不是空字符串

科目对应关系：
- 语文 → chinese
- 数学 → math  
- 英语 → english
- 物理 → physics
- 化学 → chemistry
- 政治/道法 → politics
- 历史 → history
- 生物 → biology
- 地理 → geography
- 体育 → pe
- 音乐 → music
- 美术 → art
- 信息技术 → it
- 通用技术 → general_tech

请仔细分析CSV的列标题，智能匹配对应的字段。`,
    userMessage: `请从以下CSV数据中提取学生成绩信息。CSV可能包含以下类型的列：
- 学生基本信息：学号、姓名、班级、年级、性别
- 各科成绩分数：语文、数学、英语、物理、化学等
- 各科等级：A+、A、B+等等级制评价
- 各科排名：班级排名、年级排名
- 统计信息：总分、平均分、总排名
- 考试信息：考试名称、类型、日期

请准确识别并提取所有可用的字段信息。`
  };
  
  console.log(`✅ 已配置${attributes.length}个属性字段`);
  return true;
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始自动配置n8n Information Extractor...');
  console.log(`📋 准备配置${FIELD_ATTRIBUTES.length}个字段属性`);
  
  try {
    // 1. 获取当前工作流
    const workflow = await getWorkflow();
    if (!workflow) {
      console.error('❌ 无法获取工作流，请检查n8n是否运行在localhost:5678');
      return;
    }
    
    console.log('✅ 成功获取工作流:', workflow.name);
    
    // 2. 配置Information Extractor节点
    const configured = configureInformationExtractor(workflow);
    if (!configured) {
      console.error('❌ 配置Information Extractor节点失败');
      return;
    }
    
    // 3. 更新工作流
    const updated = await updateWorkflow(workflow);
    if (!updated) {
      console.error('❌ 更新工作流失败');
      return;
    }
    
    console.log('🎉 自动配置完成！');
    console.log('📋 配置摘要:');
    console.log(`   - 总字段数: ${FIELD_ATTRIBUTES.length}`);
    console.log(`   - 科目成绩: 14个`);
    console.log(`   - 科目等级: 14个`);
    console.log(`   - 班级排名: 14个`);
    console.log(`   - 年级排名: 14个`);
    console.log(`   - 统计信息: 6个`);
    console.log(`   - 考试信息: 4个`);
    console.log(`   - 学生信息: 5个`);
    console.log('');
    console.log('✅ 请在n8n界面中验证配置是否正确');
    console.log('🔗 访问: http://localhost:5678');
    
  } catch (error) {
    console.error('❌ 自动配置过程中发生错误:', error.message);
    console.log('');
    console.log('💡 如果自动配置失败，请手动配置:');
    console.log('   1. 打开 http://localhost:5678');
    console.log('   2. 双击 Information Extractor 节点');
    console.log('   3. 按照配置指南逐个添加字段');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  FIELD_ATTRIBUTES,
  configureInformationExtractor
}; 