/**
 * 学生画像系统 - Notion同步工具
 * 
 * 此脚本用于将项目状态同步到Notion页面
 * 使用方法: node sync.js
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// 初始化Notion客户端
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// 项目状态数据路径
const PROJECT_STATUS_PATH = path.join(__dirname, '../../进度统计.md');
const PROJECT_ANALYSIS_PATH = path.join(__dirname, '../../学生画像系统项目分析报告.md');

/**
 * 从Markdown文件中提取进度数据
 */
function extractProgressData(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 提取总体进度
    const overallProgressMatch = content.match(/整体项目完成度.*?(\d+)%/);
    const overallProgress = overallProgressMatch ? overallProgressMatch[1] : 'N/A';
    
    // 提取模块进度
    const moduleProgressMap = {};
    const moduleRegex = /(\w+模块):.*?(\d+)%/g;
    let match;
    
    while ((match = moduleRegex.exec(content)) !== null) {
      moduleProgressMap[match[1]] = match[2];
    }
    
    return {
      overallProgress,
      moduleProgress: moduleProgressMap
    };
  } catch (error) {
    console.error('读取项目状态数据失败:', error);
    return null;
  }
}

/**
 * 更新Notion页面
 */
async function updateNotionPage(pageId, progressData) {
  if (!progressData) return;
  
  try {
    const { overallProgress, moduleProgress } = progressData;
    
    // 更新页面
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: `项目状态更新时间: ${new Date().toLocaleString('zh-CN')}`
                }
              }
            ]
          }
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: `当前整体完成度: ${overallProgress}%`
                }
              }
            ]
          }
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "模块完成度:"
                }
              }
            ]
          }
        }
      ]
    });
    
    // 添加模块进度
    const moduleBlocks = Object.entries(moduleProgress).map(([module, progress]) => ({
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: `${module}: ${progress}%`
            }
          }
        ]
      }
    }));
    
    if (moduleBlocks.length > 0) {
      await notion.blocks.children.append({
        block_id: pageId,
        children: moduleBlocks
      });
    }
    
    console.log('成功更新Notion页面!');
  } catch (error) {
    console.error('更新Notion页面失败:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  // 检查环境变量
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_PROJECT_PAGE_ID) {
    console.error('错误: 请在.env文件中设置NOTION_API_KEY和NOTION_PROJECT_PAGE_ID');
    process.exit(1);
  }
  
  console.log('开始同步项目状态到Notion...');
  
  // 提取项目状态数据
  const progressData = extractProgressData(PROJECT_STATUS_PATH);
  
  // 更新Notion页面
  await updateNotionPage(process.env.NOTION_PROJECT_PAGE_ID, progressData);
}

// 执行主函数
main().catch(console.error); 