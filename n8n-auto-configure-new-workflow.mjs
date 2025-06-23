#!/usr/bin/env node

/**
 * n8n Information Extractor 自动配置脚本 (新工作流版本)
 * 针对工作流 hdvsS4C8zIFfruqD 进行配置
 */

import axios from 'axios';

// n8n配置
const N8N_BASE_URL = 'http://localhost:5678';
const WORKFLOW_ID = 'hdvsS4C8zIFfruqD'; // 新的工作流ID
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5OTE2MDM3LCJleHAiOjE3NTI0NjU2MDB9.sIc0OGZbAevld3vGNlwT_UGh5sOINJMk2ABktcqiuag';

// 71个字段配置
const FIELD_ATTRIBUTES = [
  // 基础信息 (5个)
  { name: 'student_id', description: '学号' },
  { name: 'name', description: '姓名' },
  { name: 'class_name', description: '学生所在的班级名称，如初三7班' },
  { name: 'grade', description: '年级信息' },
  { name: 'gender', description: '性别' },
  
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
  { name: 'exam_scope', description: '考试范围，如class、grade、school' }
];

// 创建axios实例
const api = axios.create({
  baseURL: N8N_BASE_URL,
  headers: {
    'X-N8N-API-KEY': API_KEY,
    'Content-Type': 'application/json'
  }
});

async function main() {
  try {
    console.log('🚀 开始配置n8n工作流...');
    console.log(`📋 工作流ID: ${WORKFLOW_ID}`);
    console.log(`🔧 需要配置字段数: ${FIELD_ATTRIBUTES.length}`);
    
    // 1. 获取当前工作流
    console.log('\n📖 获取当前工作流配置...');
    const workflowResponse = await api.get(`/api/v1/workflows/${WORKFLOW_ID}`);
    const workflow = workflowResponse.data;
    
    console.log(`✅ 工作流名称: ${workflow.name}`);
    console.log(`📊 当前节点数: ${workflow.nodes.length}`);
    
    // 2. 查找Information Extractor节点
    const extractorNode = workflow.nodes.find(node => 
      node.type === '@n8n/n8n-nodes-langchain.informationExtractor'
    );
    
    if (!extractorNode) {
      console.error('❌ 未找到Information Extractor节点');
      return;
    }
    
    console.log(`🎯 找到Information Extractor节点: ${extractorNode.name}`);
    console.log(`📝 当前属性数: ${extractorNode.parameters?.attributes?.length || 0}`);
    
    // 3. 更新节点配置
    console.log('\n🔧 更新Information Extractor配置...');
    
    // 构建新的属性配置
    const newAttributes = FIELD_ATTRIBUTES.map(attr => ({
      name: attr.name,
      description: attr.description,
      type: 'string'
    }));
    
    // 更新节点参数
    extractorNode.parameters = {
      ...extractorNode.parameters,
      attributes: newAttributes,
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
      userMessage: `请从以下CSV数据中提取学生成绩信息：

{{ $json.csvContent }}

请准确识别并提取所有可用的字段信息。`
    };
    
    // 4. 更新工作流
    console.log('\n💾 保存工作流配置...');
    
    // 移除只读字段
    const updateData = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
      staticData: workflow.staticData || {},
      tags: workflow.tags || []
    };
    
    const updateResponse = await api.put(`/api/v1/workflows/${WORKFLOW_ID}`, updateData);
    
    console.log('✅ 工作流配置更新成功！');
    console.log(`📊 Information Extractor现在有 ${newAttributes.length} 个属性字段`);
    
    // 5. 激活工作流
    console.log('\n🔄 激活工作流...');
    try {
      await api.post(`/api/v1/workflows/${WORKFLOW_ID}/activate`);
      console.log('✅ 工作流激活成功！');
    } catch (activateError) {
      console.log('⚠️ 工作流激活可能有问题，但配置已保存');
      console.log('请手动检查工作流状态');
    }
    
    // 6. 显示配置摘要
    console.log('\n🎉 配置完成摘要:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 工作流ID: ${WORKFLOW_ID}`);
    console.log(`✅ 配置字段数: ${FIELD_ATTRIBUTES.length}`);
    console.log(`✅ 基础信息字段: 5个`);
    console.log(`✅ 科目成绩字段: 14个`);
    console.log(`✅ 科目等级字段: 14个`);
    console.log(`✅ 班级排名字段: 14个`);
    console.log(`✅ 年级排名字段: 14个`);
    console.log(`✅ 统计信息字段: 6个`);
    console.log(`✅ 考试信息字段: 4个`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🧪 测试命令:');
    console.log('curl -X POST http://localhost:5678/webhook/083f9843-c404-4c8f-8210-e64563608f57 \\');
    console.log('  -H "Content-Type: multipart/form-data" \\');
    console.log('  -F "file=@907九下月考成绩.csv"');
    
  } catch (error) {
    console.error('❌ 配置过程中出现错误:');
    console.error('错误信息:', error.message);
    
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.log('\n💡 建议:');
    console.log('1. 检查API密钥是否正确');
    console.log('2. 确认工作流ID是否存在');
    console.log('3. 检查n8n服务是否正常运行');
    console.log('4. 查看n8n日志获取更多信息');
  }
}

// 运行主函数
main().catch(console.error); 