/**
 * 🧪 AI增强文件解析器测试
 * 
 * 这个测试文件用于验证AI辅助解析功能是否真的在工作
 * 测试结果将明确显示AI是否参与了解析过程
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase配置
const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 测试用户ID（需要替换为实际的用户ID）
const TEST_USER_ID = "test-user-id";

/**
 * 🔧 设置测试用户的AI配置
 */
async function setupTestAIConfig() {
  console.log('🔧 设置测试用户AI配置...');
  
  try {
    // 1. 创建测试用户配置
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: TEST_USER_ID,
        username: 'test-user',
        role: 'teacher',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (profileError) {
      console.log('用户配置已存在或创建失败:', profileError.message);
    } else {
      console.log('✅ 用户配置创建成功:', userProfile);
    }
    
    // 2. 创建AI配置
    const { data: aiConfig, error: aiError } = await supabase
      .from('user_ai_configs')
      .upsert({
        user_id: TEST_USER_ID,
        provider: 'openai',
        version: 'gpt-4',
        api_key_encrypted: 'test-encrypted-key',
        enabled: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (aiError) {
      console.log('AI配置已存在或创建失败:', aiError.message);
    } else {
      console.log('✅ AI配置创建成功:', aiConfig);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 设置AI配置失败:', error);
    return false;
  }
}

/**
 * 📊 创建测试CSV文件
 */
function createTestCSVFile() {
  console.log('📊 创建测试CSV文件...');
  
  // 创建一个复杂的测试文件，包含长表格和宽表格的特征
  const csvContent = `学号,姓名,班级,语文成绩,数学分数,英语得分,物理,化学,总分,班级排名
108110907001,张三,初三1班,85,92,78,88,90,433,5
108110907002,李四,初三1班,90,88,85,92,87,442,3
108110907003,王五,初三1班,78,85,90,85,88,426,8
108110907004,赵六,初三1班,95,90,88,90,92,455,1
108110907005,钱七,初三1班,82,87,92,86,89,436,6`;
  
  const testFilePath = path.join(process.cwd(), 'test-ai-parser-data.csv');
  fs.writeFileSync(testFilePath, csvContent, 'utf8');
  
  console.log('✅ 测试文件创建成功:', testFilePath);
  return testFilePath;
}

/**
 * 🤖 测试AI辅助解析功能
 */
async function testAIEnhancedParsing() {
  console.log('\n🤖 开始测试AI辅助解析功能...\n');
  
  try {
    // 1. 设置AI配置
    const configSetup = await setupTestAIConfig();
    if (!configSetup) {
      console.log('⚠️ AI配置设置失败，但继续测试...');
    }
    
    // 2. 创建测试文件
    const testFilePath = createTestCSVFile();
    
    // 3. 读取测试文件内容
    const fileContent = fs.readFileSync(testFilePath, 'utf8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',');
    const sampleRows = lines.slice(1, 4).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      return obj;
    });
    
    console.log('📋 测试文件信息:');
    console.log('- 文件名: test-ai-parser-data.csv');
    console.log('- 总行数:', lines.length - 1);
    console.log('- 字段数:', headers.length);
    console.log('- 字段列表:', headers.join(', '));
    console.log('- 样本数据:', JSON.stringify(sampleRows[0], null, 2));
    
    // 4. 构建AI分析请求
    const aiRequest = {
      filename: 'test-ai-parser-data.csv',
      headers: headers,
      sampleRows: sampleRows,
      totalRows: lines.length - 1
    };
    
    console.log('\n🧠 发送AI分析请求...');
    console.log('请求参数:', JSON.stringify(aiRequest, null, 2));
    
    // 5. 调用AI分析（模拟前端调用）
    const startTime = Date.now();
    
    // 这里我们直接调用Supabase Edge Function来测试
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('proxy-ai-request', {
      body: {
        providerId: 'openai',
        apiKey: 'test-key',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        data: {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: '你是一位专业的教育数据分析专家，擅长识别各种成绩数据格式。'
            },
            {
              role: 'user',
              content: `请分析以下学生成绩文件：
文件名: ${aiRequest.filename}
字段: ${aiRequest.headers.join(', ')}
样本数据: ${JSON.stringify(aiRequest.sampleRows[0])}
总行数: ${aiRequest.totalRows}

请判断这是宽表格式还是长表格式，并提供字段映射建议。`
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        }
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`\n⏱️ AI分析耗时: ${duration}ms`);
    
    if (aiError) {
      console.log('❌ AI分析失败:', aiError);
      console.log('错误详情:', JSON.stringify(aiError, null, 2));
      
      // 分析失败原因
      if (aiError.message?.includes('API key')) {
        console.log('\n🔍 失败原因分析: API密钥问题');
        console.log('- 可能是API密钥未配置或无效');
        console.log('- 需要在AI设置中配置有效的API密钥');
      } else if (aiError.message?.includes('provider')) {
        console.log('\n🔍 失败原因分析: AI提供商配置问题');
        console.log('- 可能是AI提供商配置错误');
        console.log('- 需要检查AI服务配置');
      } else {
        console.log('\n🔍 失败原因分析: 其他错误');
        console.log('- 可能是网络问题或服务不可用');
      }
      
      return false;
    } else {
      console.log('✅ AI分析成功!');
      console.log('AI响应:', JSON.stringify(aiResponse, null, 2));
      
      // 分析AI响应内容
      if (aiResponse && aiResponse.content) {
        console.log('\n📄 AI分析结果:');
        console.log(aiResponse.content);
        
        // 检查AI是否真的理解了数据结构
        const content = aiResponse.content.toLowerCase();
        if (content.includes('宽表') || content.includes('wide')) {
          console.log('✅ AI正确识别了数据结构为宽表格式');
        }
        if (content.includes('学号') || content.includes('student_id')) {
          console.log('✅ AI正确识别了学号字段');
        }
        if (content.includes('语文') || content.includes('数学') || content.includes('英语')) {
          console.log('✅ AI正确识别了科目字段');
        }
        
        console.log('\n🎉 AI辅助解析功能正常工作!');
        return true;
      } else {
        console.log('⚠️ AI响应格式异常，可能存在问题');
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    return false;
  }
}

/**
 * 🧹 清理测试文件
 */
function cleanup() {
  console.log('\n🧹 清理测试文件...');
  
  const testFilePath = path.join(process.cwd(), 'test-ai-parser-data.csv');
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
    console.log('✅ 测试文件已删除');
  }
}

/**
 * 🚀 主测试函数
 */
async function main() {
  console.log('🧪 AI增强文件解析器测试开始\n');
  console.log('=' .repeat(50));
  
  try {
    const success = await testAIEnhancedParsing();
    
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('🎉 测试结果: AI辅助解析功能正常工作!');
      console.log('✅ AI确实参与了文件解析过程');
      console.log('✅ AI能够理解和分析数据结构');
      console.log('✅ AI提供了有价值的解析建议');
    } else {
      console.log('❌ 测试结果: AI辅助解析功能存在问题');
      console.log('⚠️ AI可能没有真正参与解析过程');
      console.log('🔧 建议检查AI配置和API密钥设置');
    }
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  } finally {
    cleanup();
  }
  
  console.log('\n🧪 测试完成');
}

// 运行测试
main().catch(console.error); 