import puppeteer from 'puppeteer';

async function checkN8nNodes() {
  console.log('🔍 检查n8n工作流节点配置状态...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:5678/workflow/TX3mvXbjU0z6PdDm');
    await page.waitForTimeout(3000);
    
    // 检查所有节点
    const nodes = await page.$$eval('[data-test-id="canvas-node"]', nodes => 
      nodes.map(node => ({
        name: node.getAttribute('data-node-name') || 'Unknown',
        type: node.getAttribute('data-node-type') || 'Unknown',
        hasError: node.classList.contains('has-issues'),
        isConfigured: !node.classList.contains('node-box-title-color-default')
      }))
    );
    
    console.log('\n📊 节点状态检查结果:');
    nodes.forEach(node => {
      const status = node.hasError ? '❌ 有错误' : 
                    node.isConfigured ? '✅ 已配置' : '⚠️ 未配置';
      console.log(`  ${node.name} (${node.type}): ${status}`);
    });
    
    // 尝试双击Code节点打开配置
    console.log('\n🔧 尝试打开Code节点配置...');
    const codeButton = await page.$('button:has-text("Code")');
    if (codeButton) {
      await codeButton.dblclick();
      await page.waitForTimeout(2000);
      
      // 检查是否打开了配置面板
      const configPanel = await page.$('[data-test-id="node-parameters"]');
      if (configPanel) {
        console.log('✅ Code节点配置面板已打开');
        
        // 检查代码内容
        const codeEditor = await page.$('.monaco-editor');
        if (codeEditor) {
          console.log('✅ 代码编辑器已加载');
        } else {
          console.log('❌ 代码编辑器未加载');
        }
      } else {
        console.log('❌ Code节点配置面板未打开');
      }
    } else {
      console.log('❌ 未找到Code节点');
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  } finally {
    await browser.close();
  }
}

checkN8nNodes().catch(console.error); 