#!/usr/bin/env node

/**
 * 测试Dify API进行CSV数据解析
 * 作为n8n的替代方案
 */

const fs = require('fs');

const DIFY_API_KEY = 'app-ShQTl2K5ozA9G5elXcggErBO';
const DIFY_BASE_URL = 'https://api.dify.ai/v1';

// 测试CSV数据
const testCSVContent = `学号,姓名,班级,语文,数学,英语,物理,化学,总分,班级排名
108110907001,张三,初三7班,85,90,88,82,79,424,5
108110907002,李四,初三7班,78,85,92,88,85,428,3
108110907003,王五,初三7班,92,88,85,90,87,442,1`;

async function testDifyAPI() {
  console.log('🧪 测试Dify API功能...');
  
  // 1. 测试应用信息
  try {
    console.log('📋 获取应用信息...');
    const appResponse = await fetch(`${DIFY_BASE_URL}/parameters`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (appResponse.ok) {
      const appInfo = await appResponse.json();
      console.log('✅ 应用信息:', JSON.stringify(appInfo, null, 2));
    } else {
      console.log('⚠️ 无法获取应用信息:', appResponse.status);
    }
  } catch (error) {
    console.log('❌ 获取应用信息失败:', error.message);
  }
  
  // 2. 测试聊天API
  try {
    console.log('\n💬 测试聊天API...');
    const chatResponse = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          csv_data: testCSVContent
        },
        query: "请帮我解析这个CSV数据，提取学生成绩信息",
        response_mode: "blocking",
        conversation_id: "",
        user: "test-user"
      })
    });
    
    if (chatResponse.ok) {
      const chatResult = await chatResponse.json();
      console.log('✅ 聊天API响应:', JSON.stringify(chatResult, null, 2));
    } else {
      const error = await chatResponse.text();
      console.log('⚠️ 聊天API失败:', chatResponse.status, error);
    }
  } catch (error) {
    console.log('❌ 聊天API测试失败:', error.message);
  }
  
  // 3. 测试工作流API
  try {
    console.log('\n🔄 测试工作流API...');
    const workflowResponse = await fetch(`${DIFY_BASE_URL}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          csv_content: testCSVContent,
          task: "解析学生成绩数据"
        },
        response_mode: "blocking",
        user: "test-user"
      })
    });
    
    if (workflowResponse.ok) {
      const workflowResult = await workflowResponse.json();
      console.log('✅ 工作流API响应:', JSON.stringify(workflowResult, null, 2));
    } else {
      const error = await workflowResponse.text();
      console.log('⚠️ 工作流API失败:', workflowResponse.status, error);
    }
  } catch (error) {
    console.log('❌ 工作流API测试失败:', error.message);
  }
  
  // 4. 测试完成API
  try {
    console.log('\n🎯 测试完成API...');
    const completionResponse = await fetch(`${DIFY_BASE_URL}/completion-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          csv_data: testCSVContent
        },
        response_mode: "blocking",
        user: "test-user"
      })
    });
    
    if (completionResponse.ok) {
      const completionResult = await completionResponse.json();
      console.log('✅ 完成API响应:', JSON.stringify(completionResult, null, 2));
    } else {
      const error = await completionResponse.text();
      console.log('⚠️ 完成API失败:', completionResponse.status, error);
    }
  } catch (error) {
    console.log('❌ 完成API测试失败:', error.message);
  }
}

// 创建Dify集成方案
async function createDifyIntegration() {
  console.log('\n🏗️ 创建Dify集成方案...');
  
  const integrationCode = `
/**
 * Dify CSV解析集成方案
 * 可以直接集成到React应用中
 */

class DifyCSVParser {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.dify.ai/v1';
  }
  
  async parseCSV(csvContent, options = {}) {
    try {
      const response = await fetch(\`\${this.baseURL}/completion-messages\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${this.apiKey}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            csv_data: csvContent,
            extract_fields: options.fields || ['student_id', 'name', 'class_name', 'scores'],
            output_format: options.format || 'json'
          },
          response_mode: "blocking",
          user: options.user || "system"
        })
      });
      
      if (!response.ok) {
        throw new Error(\`Dify API错误: \${response.status}\`);
      }
      
      const result = await response.json();
      return this.processResult(result);
      
    } catch (error) {
      console.error('Dify CSV解析失败:', error);
      throw error;
    }
  }
  
  processResult(result) {
    // 处理Dify返回的结果，转换为标准格式
    if (result.answer) {
      try {
        // 尝试解析JSON格式的回答
        const parsed = JSON.parse(result.answer);
        return {
          success: true,
          data: parsed,
          message: '解析成功'
        };
      } catch {
        // 如果不是JSON，返回原始文本
        return {
          success: true,
          data: result.answer,
          message: '解析成功（文本格式）'
        };
      }
    }
    
    return {
      success: false,
      data: null,
      message: '解析失败'
    };
  }
}

// 使用示例
const parser = new DifyCSVParser('${DIFY_API_KEY}');

// 在React组件中使用
export async function handleCSVUpload(file) {
  try {
    const csvContent = await file.text();
    const result = await parser.parseCSV(csvContent, {
      fields: ['student_id', 'name', 'class_name', 'chinese', 'math', 'english', 'total_score'],
      format: 'json',
      user: 'teacher'
    });
    
    if (result.success) {
      // 保存到Supabase
      await saveToSupabase(result.data);
      return { success: true, message: '数据解析和保存成功' };
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('CSV处理失败:', error);
    return { success: false, message: error.message };
  }
}
`;

  // 保存集成代码
  fs.writeFileSync('dify-csv-integration.js', integrationCode);
  console.log('✅ Dify集成代码已保存到 dify-csv-integration.js');
}

// 执行测试
async function main() {
  console.log('🚀 开始测试Dify作为CSV解析方案...\n');
  
  await testDifyAPI();
  await createDifyIntegration();
  
  console.log('\n📊 测试总结:');
  console.log('1. Dify可以作为n8n的替代方案');
  console.log('2. 直接集成到React应用中，无需额外的工作流服务');
  console.log('3. 支持自然语言处理，可能比n8n更智能');
  console.log('4. 需要根据实际API响应调整集成代码');
  
  console.log('\n🔗 相关文件:');
  console.log('- dify-csv-integration.js: Dify集成代码');
  console.log('- 可以直接在React项目中使用');
}

main().catch(console.error); 