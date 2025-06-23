#!/usr/bin/env node

import fs from 'fs';
import fetch from 'node-fetch';

// 自动更新n8n Code节点
async function updateCodeNode() {
  console.log('🔧 开始更新n8n Code节点...\n');

  try {
    // 读取修复后的代码
    const fixedCode = fs.readFileSync('n8n-Code节点简化修复版.js', 'utf8');
    console.log('✅ 成功读取修复代码');

    // 获取当前工作流
    const workflowId = 'FppT8sCsSxcUnNnj';
    console.log('📥 获取工作流配置...');
    
    const getResponse = await fetch(`http://localhost:5678/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!getResponse.ok) {
      throw new Error(`获取工作流失败: ${getResponse.status} ${getResponse.statusText}`);
    }

    const workflow = await getResponse.json();
    console.log('✅ 成功获取工作流配置');

    // 查找Code节点
    let codeNode = null;
    for (const node of workflow.nodes) {
      if (node.type === 'n8n-nodes-base.code') {
        codeNode = node;
        break;
      }
    }

    if (!codeNode) {
      throw new Error('未找到Code节点');
    }

    console.log('✅ 找到Code节点:', codeNode.name);

    // 更新Code节点的代码
    codeNode.parameters.jsCode = fixedCode;
    console.log('✅ 更新Code节点代码');

    // 保存工作流
    console.log('💾 保存工作流...');
    const updateResponse = await fetch(`http://localhost:5678/api/v1/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow)
    });

    if (!updateResponse.ok) {
      throw new Error(`保存工作流失败: ${updateResponse.status} ${updateResponse.statusText}`);
    }

    console.log('✅ 工作流保存成功！');

    // 测试修复效果
    console.log('\n🧪 测试修复效果...');
    
    // 创建测试数据
    const testCsvData = `学号,姓名,班级,语文,数学,英语,物理,化学,总分
108110907001,张三,初三1班,85,92,78,88,90,433
108110907002,李四,初三1班,90,88,85,92,87,442
108110907003,王五,初三2班,78,85,90,85,88,426`;

    const csvBase64 = Buffer.from(testCsvData).toString('base64');

    const testData = {
      examTitle: "期中考试",
      examType: "期中考试", 
      examDate: "2024-11-15",
      examScope: "grade",
      file: csvBase64
    };

    const testResponse = await fetch('http://localhost:5678/webhook/csv-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📥 测试响应状态:', testResponse.status, testResponse.statusText);
    
    if (testResponse.ok) {
      const result = await testResponse.text();
      console.log('🎉 修复成功！工作流正常运行');
      console.log('响应内容:', result.substring(0, 200) + '...');
    } else {
      const errorText = await testResponse.text();
      console.log('❌ 测试失败');
      console.log('错误响应:', errorText);
      
      if (errorText.includes('SyntaxError') || errorText.includes('already been declared')) {
        console.log('🚨 仍然存在语法错误');
      }
    }

  } catch (error) {
    console.error('❌ 更新失败:', error.message);
    
    // 提供手动操作指南
    console.log('\n📋 手动操作指南:');
    console.log('1. 打开 http://localhost:5678/workflow/FppT8sCsSxcUnNnj');
    console.log('2. 点击Code节点');
    console.log('3. 全选代码 (Ctrl+A)');
    console.log('4. 复制 n8n-Code节点简化修复版.js 文件内容');
    console.log('5. 粘贴替换现有代码');
    console.log('6. 保存工作流 (Ctrl+S)');
  }
}

// 运行更新
updateCodeNode().catch(console.error); 