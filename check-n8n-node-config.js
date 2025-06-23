const puppeteer = require('puppeteer');

async function checkN8nNodeConfig() {
  console.log('🔍 检查n8n工作流节点配置...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    
    // 导航到工作流页面
    console.log('📍 导航到工作流页面...');
    await page.goto('http://localhost:5678/workflow/TX3mvXbjU0z6PdDm');
    await page.waitForTimeout(3000);
    
    // 查找所有节点
    console.log('🔍 查找工作流节点...');
    const nodes = await page.$$('[data-test-id*="node-"]');
    console.log(`找到 ${nodes.length} 个节点`);
    
    // 查找Model* Information Extractor节点
    console.log('🎯 查找Model* Information Extractor节点...');
    const modelNode = await page.$('button:has-text("Model* Information Extractor")');
    
    if (modelNode) {
      console.log('✅ 找到Model* Information Extractor节点');
      
      // 双击节点打开配置
      console.log('🖱️ 双击节点打开配置...');
      await modelNode.dblclick();
      await page.waitForTimeout(2000);
      
      // 检查是否有配置面板打开
      const configPanel = await page.$('[data-test-id="node-parameters-panel"]');
      if (configPanel) {
        console.log('✅ 配置面板已打开');
        
        // 查找错误信息
        const errorMessages = await page.$$eval('.el-form-item__error', 
          elements => elements.map(el => el.textContent)
        );
        
        if (errorMessages.length > 0) {
          console.log('❌ 发现配置错误:');
          errorMessages.forEach((msg, i) => {
            console.log(`   ${i + 1}. ${msg}`);
          });
        } else {
          console.log('✅ 未发现明显的配置错误');
        }
        
        // 查找必填字段
        const requiredFields = await page.$$eval('label:has(.required)', 
          elements => elements.map(el => el.textContent)
        );
        
        if (requiredFields.length > 0) {
          console.log('📋 必填字段:');
          requiredFields.forEach((field, i) => {
            console.log(`   ${i + 1}. ${field}`);
          });
        }
        
      } else {
        console.log('❌ 配置面板未打开');
      }
      
    } else {
      console.log('❌ 未找到Model* Information Extractor节点');
    }
    
    // 检查工作流激活状态
    console.log('🔍 检查工作流激活状态...');
    const activateSwitch = await page.$('[data-test-id="workflow-activate-switch"]');
    if (activateSwitch) {
      const isActive = await activateSwitch.evaluate(el => el.checked);
      console.log(`工作流状态: ${isActive ? '已激活' : '未激活'}`);
      
      if (!isActive) {
        console.log('🔄 尝试激活工作流...');
        await activateSwitch.click();
        await page.waitForTimeout(2000);
        
        // 检查是否有错误消息
        const errorToast = await page.$('.el-message--error');
        if (errorToast) {
          const errorText = await errorToast.textContent();
          console.log(`❌ 激活失败: ${errorText}`);
        } else {
          console.log('✅ 工作流激活成功');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  } finally {
    await browser.close();
  }
}

// 运行检查
checkN8nNodeConfig().catch(console.error); 