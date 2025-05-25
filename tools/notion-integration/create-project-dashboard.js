/**
 * 学生画像系统 - 增强版Notion项目仪表盘生成工具
 * 
 * 此脚本用于创建或更新Notion中的项目仪表盘，支持两种模式：
 * 1. create - 创建新数据库（默认行为）
 * 2. update - 更新现有数据库中的数据，不创建新数据库
 * 
 * 使用方法:
 * - 创建模式: node create-project-dashboard.js create
 * - 更新模式: node create-project-dashboard.js update [数据库ID]
 */

// 加载当前目录下的.env文件
require('dotenv').config({ path: __dirname + '/.env' });
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

// 操作模式（默认为创建模式）
let operationMode = 'create';

// 命令行中指定的数据库ID
let databaseIdFromArgs = null;

// 输出环境变量检查
console.log('环境变量检查:');
console.log(`NOTION_API_KEY: ${process.env.NOTION_API_KEY ? '已设置' : '未设置'}`);
console.log(`NOTION_PROJECT_PAGE_ID: ${process.env.NOTION_PROJECT_PAGE_ID ? '已设置' : '未设置'}`);
console.log(`NOTION_DASHBOARD_ID: ${process.env.NOTION_DASHBOARD_ID ? process.env.NOTION_DASHBOARD_ID : '未设置'}`);

/**
 * 从Markdown文件中提取进度数据
 * 增强了细节提取，包括每个模块下的具体功能项
 */
function extractProgressData() {
  try {
    // 从进度统计文件读取
    const statusContent = fs.readFileSync(PROJECT_STATUS_PATH, 'utf8');
    
    // 提取总体进度
    const overallProgressMatch = statusContent.match(/整体项目完成度.*?(\d+)%/);
    const overallProgress = overallProgressMatch ? parseInt(overallProgressMatch[1]) : 0;
    
    // 提取模块进度
    const moduleProgressMap = {};
    const moduleRegex = /(\w+模块).*?(\d+)%/g;
    let match;
    
    while ((match = moduleRegex.exec(statusContent)) !== null) {
      moduleProgressMap[match[1]] = parseInt(match[2]);
    }
    
    // 从项目分析报告中提取更详细的功能信息
    let reportContent = '';
    try {
      reportContent = fs.readFileSync(PROJECT_ANALYSIS_PATH, 'utf8');
    } catch (err) {
      console.warn('项目分析报告文件不存在，仅使用进度统计文件');
    }

    // 提取文件中的详细功能点
    const moduleFeatures = {};
    
    // 正则表达式用于匹配功能点部分
    const sectionRegex = /### \d+\. ([^模块]+)模块\s*([\s\S]*?)(?=### \d+\.|$)/g;
    let sectionMatch;

    while ((sectionMatch = sectionRegex.exec(statusContent)) !== null) {
      const moduleName = sectionMatch[1] + "模块";
      const sectionContent = sectionMatch[2];
      
      // 提取每个功能点及其完成度
      const featureRegex = /\| ([^|]+) \| (\d+)% \|/g;
      let featureMatch;
      const features = [];
      
      while ((featureMatch = featureRegex.exec(sectionContent)) !== null) {
        features.push({
          name: featureMatch[1].trim(),
          progress: parseInt(featureMatch[2])
        });
      }
      
      moduleFeatures[moduleName] = features;
    }

    // 定义完整的功能模块列表和子功能
    const allModules = {
      "用户认证模块": {
        progress: moduleProgressMap["用户认证模块"] || 53,
        subFeatures: moduleFeatures["用户认证模块"] || [
          { name: "登录功能", progress: 95 },
          { name: "注册功能", progress: 90 },
          { name: "权限管理", progress: 80 },
          { name: "密码找回", progress: 0 },
          { name: "第三方登录", progress: 0 }
        ]
      },
      "数据导入模块": {
        progress: moduleProgressMap["数据导入模块"] || 83,
        subFeatures: moduleFeatures["数据导入模块"] || [
          { name: "学生信息单个添加", progress: 100 },
          { name: "学生信息批量导入", progress: 85 },
          { name: "成绩数据单个添加", progress: 90 },
          { name: "成绩数据批量导入", progress: 85 },
          { name: "导入模板下载", progress: 100 },
          { name: "学生智能匹配", progress: 90 },
          { name: "数据导入历史", progress: 30 }
        ]
      },
      "作业管理模块": {
        progress: moduleProgressMap["作业管理模块"] || 76,
        subFeatures: moduleFeatures["作业管理模块"] || [
          { name: "作业创建发布", progress: 90 },
          { name: "作业列表查看", progress: 95 },
          { name: "作业统计概览", progress: 100 },
          { name: "作业批改功能", progress: 70 },
          { name: "批改设置", progress: 60 },
          { name: "作业分析", progress: 40 },
          { name: "学生提交跟踪", progress: 75 }
        ]
      },
      "成绩分析模块": {
        progress: moduleProgressMap["成绩分析模块"] || 61,
        subFeatures: moduleFeatures["成绩分析模块"] || [
          { name: "数据看板基础统计", progress: 90 },
          { name: "分数段分布分析", progress: 80 },
          { name: "成绩分布箱线图", progress: 85 },
          { name: "班级分析统计", progress: 85 },
          { name: "学生进步分析", progress: 60 },
          { name: "高级分析功能", progress: 40 },
          { name: "交叉分析", progress: 30 },
          { name: "异常检测", progress: 35 },
          { name: "相关性分析", progress: 40 },
          { name: "班级箱线图", progress: 75 },
          { name: "贡献度分析", progress: 50 }
        ]
      },
      "预警分析模块": {
        progress: moduleProgressMap["预警分析模块"] || 66,
        subFeatures: moduleFeatures["预警分析模块"] || [
          { name: "预警统计概览", progress: 90 },
          { name: "风险学生识别", progress: 80 },
          { name: "预警规则管理", progress: 85 },
          { name: "风险因素分析", progress: 75 },
          { name: "班级风险对比", progress: 80 },
          { name: "AI预警分析", progress: 30 },
          { name: "自动干预建议", progress: 25 },
          { name: "预警跟踪记录", progress: 60 }
        ]
      },
      "学生画像模块": {
        progress: moduleProgressMap["学生画像模块"] || 44,
        subFeatures: moduleFeatures["学生画像模块"] || [
          { name: "班级画像生成", progress: 65 },
          { name: "学生个人画像", progress: 55 },
          { name: "多维度分析视图", progress: 45 },
          { name: "画像对比功能", progress: 30 },
          { name: "历史趋势分析", progress: 40 },
          { name: "AI特征提取", progress: 25 },
          { name: "数据导出功能", progress: 50 }
        ]
      },
      "班级管理模块": {
        progress: moduleProgressMap["班级管理模块"] || 68,
        subFeatures: moduleFeatures["班级管理模块"] || [
          { name: "班级创建管理", progress: 85 },
          { name: "班级信息显示", progress: 80 },
          { name: "学生分配管理", progress: 70 },
          { name: "班级数据统计", progress: 65 },
          { name: "班级档案管理", progress: 40 }
        ]
      },
      "AI设置模块": {
        progress: moduleProgressMap["AI设置模块"] || 75,
        subFeatures: moduleFeatures["AI设置模块"] || [
          { name: "AI提供商配置", progress: 90 },
          { name: "API密钥管理", progress: 95 },
          { name: "模型选择配置", progress: 80 },
          { name: "自定义模型添加", progress: 30 },
          { name: "AI分析范围设置", progress: 85 },
          { name: "API测试连接", progress: 70 }
        ]
      }
    };
    
    // 提取完成度分布信息
    const completionLevels = {
      high: [],   // 完成度>80%
      medium: [], // 完成度50-80%
      low: []     // 完成度<50%
    };
    
    for (const [module, data] of Object.entries(allModules)) {
      if (data.progress > 80) {
        completionLevels.high.push({ module, progress: data.progress });
      } else if (data.progress >= 50) {
        completionLevels.medium.push({ module, progress: data.progress });
      } else {
        completionLevels.low.push({ module, progress: data.progress });
      }
    }
    
    return {
      overallProgress,
      moduleProgress: moduleProgressMap,
      allModules,
      completionLevels
    };
  } catch (error) {
    console.error('读取项目状态数据失败:', error);
    return null;
  }
}

/**
 * 检查数据库是否存在
 */
async function checkDatabaseExists(pageId, databaseName) {
  try {
    // 使用search API查找已有数据库
    const response = await notion.search({
      query: databaseName,
      filter: {
        property: "object",
        value: "database"
      }
    });
    
    // 检查是否在所需页面下找到匹配的数据库
    if (response.results && response.results.length > 0) {
      for (const db of response.results) {
        if (db.parent && db.parent.type === "page_id" && db.parent.page_id === pageId) {
          console.log(`找到已存在的数据库: ${databaseName}, ID: ${db.id}`);
          return db.id;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('检查数据库时出错:', error);
    return null;
  }
}

/**
 * 清空数据库中的所有条目
 */
async function clearDatabaseEntries(databaseId) {
  try {
    // 查询数据库中的所有条目
    const response = await notion.databases.query({
      database_id: databaseId
    });
    
    // 删除所有页面
    for (const page of response.results) {
      await notion.pages.update({
        page_id: page.id,
        archived: true
      });
    }
    
    console.log(`已清空数据库 ${databaseId} 中的所有条目`);
  } catch (error) {
    console.error('清空数据库条目时出错:', error);
  }
}

/**
 * 创建项目总览数据库
 */
async function createDashboardDatabase(pageId, progressData) {
  try {
    console.log('开始处理项目总览数据库...');
    
    // 数据库名称
    const dbName = "学生画像系统 - 项目总览";
    
    // 如果命令行参数中提供了数据库ID，优先使用它
    let dashboardId = databaseIdFromArgs || process.env.NOTION_DASHBOARD_ID;
    
    // 如果没有指定数据库ID，尝试查找现有数据库
    if (!dashboardId) {
      dashboardId = await checkDatabaseExists(pageId, dbName);
    } else {
      console.log(`使用指定的数据库ID: ${dashboardId}`);
    }
    
    // 如果不存在且处于创建模式，创建新数据库
    if (!dashboardId && operationMode === 'create') {
      console.log('创建新的项目总览数据库...');
      
      const response = await notion.databases.create({
        parent: {
          type: "page_id",
          page_id: pageId
        },
        title: [
          {
            type: "text",
            text: {
              content: dbName
            }
          }
        ],
        properties: {
          "模块": {
            title: {}
          },
          "完成度": {
            number: {
              format: "percent"
            }
          },
          "进度状态": {
            select: {
              options: [
                { name: "未开始", color: "red" },
                { name: "进行中", color: "yellow" },
                { name: "已完成", color: "green" }
              ]
            }
          },
          "优先级": {
            select: {
              options: [
                { name: "高", color: "red" },
                { name: "中", color: "yellow" },
                { name: "低", color: "green" }
              ]
            }
          },
          "类别": {
            select: {
              options: [
                { name: "核心模块", color: "blue" },
                { name: "子功能", color: "green" },
                { name: "概览", color: "gray" }
              ]
            }
          },
          "父模块": {
            rich_text: {}
          },
          "剩余工作": {
            formula: {
              expression: "1 - prop(\"完成度\")"
            }
          }
        }
      });
      
      console.log('成功创建项目总览数据库!');
      console.log('数据库ID:', response.id);
      dashboardId = response.id;
    } else if (!dashboardId && operationMode === 'update') {
      console.error('错误: 无法找到现有数据库进行更新。请先使用create模式创建数据库，或者提供数据库ID作为参数。');
      console.error('用法: node create-project-dashboard.js update [数据库ID]');
      return null;
    } else if (dashboardId) {
      // 验证数据库是否存在
      try {
        await notion.databases.retrieve({
          database_id: dashboardId
        });
        console.log(`成功连接到数据库: ${dashboardId}`);
      } catch (error) {
        console.error(`错误: 无法连接到指定的数据库 ${dashboardId}，请检查数据库ID是否正确。`);
        return null;
      }
      
      if (operationMode === 'create') {
        // 如果处于创建模式，清空现有条目
        await clearDatabaseEntries(dashboardId);
        console.log('已清空并准备更新现有数据库');
      } else {
        console.log('更新模式 - 将添加或更新条目但不清空数据库');
      }
    }
    
    if (!dashboardId) {
      return null;
    }
    
    // 获取数据库结构，以确保我们使用正确的属性
    const dbInfo = await notion.databases.retrieve({
      database_id: dashboardId
    });
    
    console.log('获取数据库结构成功');
    
    // 创建属性ID映射表
    const propertyMap = {};
    console.log('数据库属性:');
    for (const [key, value] of Object.entries(dbInfo.properties)) {
      propertyMap[value.name] = {
        id: value.id,
        type: value.type
      };
      console.log(`- ${value.name}(${value.type}): ID=${value.id}`);
    }
    
    // 验证必要的属性是否存在
    const requiredProperties = ['模块', '完成度', '进度状态', '优先级', '类别'];
    const missingProperties = requiredProperties.filter(prop => !propertyMap[prop]);
    
    if (missingProperties.length > 0) {
      console.warn(`警告: 数据库缺少以下属性: ${missingProperties.join(', ')}`);
      console.warn('将尝试使用可用的属性继续...');
    }

    // 填充数据库数据
    if (progressData) {
      console.log('开始填充项目总览数据...');
      
      const moduleNameMap = {
        "数据导入模块": "数据导入",
        "用户认证模块": "用户认证",
        "作业管理模块": "作业管理",
        "成绩分析模块": "成绩分析",
        "预警分析模块": "预警分析",
        "学生画像模块": "学生画像", 
        "班级管理模块": "班级管理",
        "AI设置模块": "AI设置"
      };
      
      // 查询数据库中现有条目
      const existingEntries = {};
      if (operationMode === 'update') {
        const response = await notion.databases.query({
          database_id: dashboardId
        });
        
        // 将现有条目按模块名索引
        for (const page of response.results) {
          try {
            // 找到标题属性
            const titleProp = Object.values(page.properties).find(prop => prop.type === 'title');
            if (titleProp && titleProp.title.length > 0) {
              const moduleName = titleProp.title[0].text.content;
              existingEntries[moduleName] = page.id;
            }
          } catch (e) {
            // 跳过无法解析的条目
            console.warn('跳过解析错误的条目:', e.message);
          }
        }
      }
      
      // 为每个属性创建请求数据的辅助函数
      function createPropertyData(name, value, type) {
        if (!propertyMap[name]) {
          console.warn(`警告: 属性 "${name}" 不存在于数据库中，已跳过`);
          return null;
        }
        
        const propData = {};
        
        switch (type) {
          case 'title':
            propData[propertyMap[name].id] = {
              title: [
                {
                  text: {
                    content: value
                  }
                }
              ]
            };
            break;
          case 'number':
            propData[propertyMap[name].id] = {
              number: value
            };
            break;
          case 'select':
            propData[propertyMap[name].id] = {
              select: {
                name: value
              }
            };
            break;
          case 'rich_text':
            propData[propertyMap[name].id] = {
              rich_text: [
                {
                  text: {
                    content: value
                  }
                }
              ]
            };
            break;
          default:
            console.warn(`警告: 不支持的属性类型 "${type}" (属性: ${name})`);
            return null;
        }
        
        return propData;
      }
      
      // 1. 添加项目整体进度条目
      if (operationMode === 'create' || !existingEntries["项目总体"]) {
        try {
          const properties = {};
          
          // 添加各属性
          const titleProp = createPropertyData('模块', '项目总体', 'title');
          const completionProp = createPropertyData('完成度', progressData.overallProgress / 100, 'number');
          const statusProp = createPropertyData('进度状态', progressData.overallProgress < 70 ? "进行中" : "已完成", 'select');
          const priorityProp = createPropertyData('优先级', "高", 'select');
          const categoryProp = createPropertyData('类别', "概览", 'select');
          
          // 合并有效的属性
          if (titleProp) Object.assign(properties, titleProp);
          if (completionProp) Object.assign(properties, completionProp);
          if (statusProp) Object.assign(properties, statusProp);
          if (priorityProp) Object.assign(properties, priorityProp);
          if (categoryProp) Object.assign(properties, categoryProp);
          
          await notion.pages.create({
            parent: {
              database_id: dashboardId
            },
            properties: properties
          });
          
          console.log('已添加项目总体条目');
        } catch (error) {
          console.error('添加项目总体条目失败:', error);
        }
      } else {
        try {
          // 更新模式 - 更新现有条目
          const properties = {};
          
          // 添加各属性
          const completionProp = createPropertyData('完成度', progressData.overallProgress / 100, 'number');
          const statusProp = createPropertyData('进度状态', progressData.overallProgress < 70 ? "进行中" : "已完成", 'select');
          
          // 合并有效的属性
          if (completionProp) Object.assign(properties, completionProp);
          if (statusProp) Object.assign(properties, statusProp);
          
          await notion.pages.update({
            page_id: existingEntries["项目总体"],
            properties: properties
          });
          
          console.log('已更新项目总体条目');
        } catch (error) {
          console.error('更新项目总体条目失败:', error);
        }
      }
      
      // 2. 添加主要模块
      let successCount = 0;
      let failCount = 0;
      
      for (const [moduleName, moduleData] of Object.entries(progressData.allModules)) {
        try {
          const displayName = moduleNameMap[moduleName] || moduleName.replace('模块', '');
          
          // 确定模块状态
          let status;
          let priority;
          if (moduleData.progress < 50) {
            status = "未开始";
            priority = "高";
          } else if (moduleData.progress < 80) {
            status = "进行中";
            priority = "中";
          } else {
            status = "已完成";
            priority = "低";
          }
          
          if (operationMode === 'create' || !existingEntries[displayName]) {
            // 创建模块条目
            const properties = {};
            
            // 添加各属性
            const titleProp = createPropertyData('模块', displayName, 'title');
            const completionProp = createPropertyData('完成度', moduleData.progress / 100, 'number');
            const statusProp = createPropertyData('进度状态', status, 'select');
            const priorityProp = createPropertyData('优先级', priority, 'select');
            const categoryProp = createPropertyData('类别', "核心模块", 'select');
            
            // 合并有效的属性
            if (titleProp) Object.assign(properties, titleProp);
            if (completionProp) Object.assign(properties, completionProp);
            if (statusProp) Object.assign(properties, statusProp);
            if (priorityProp) Object.assign(properties, priorityProp);
            if (categoryProp) Object.assign(properties, categoryProp);
            
            await notion.pages.create({
              parent: {
                database_id: dashboardId
              },
              properties: properties
            });
            successCount++;
          } else {
            // 更新模式 - 更新现有条目
            const properties = {};
            
            // 添加各属性
            const completionProp = createPropertyData('完成度', moduleData.progress / 100, 'number');
            const statusProp = createPropertyData('进度状态', status, 'select');
            const priorityProp = createPropertyData('优先级', priority, 'select');
            
            // 合并有效的属性
            if (completionProp) Object.assign(properties, completionProp);
            if (statusProp) Object.assign(properties, statusProp);
            if (priorityProp) Object.assign(properties, priorityProp);
            
            await notion.pages.update({
              page_id: existingEntries[displayName],
              properties: properties
            });
            successCount++;
          }
          
          // 3. 添加子功能
          for (const subFeature of moduleData.subFeatures) {
            try {
              // 确定子功能状态
              let subStatus;
              let subPriority;
              if (subFeature.progress < 50) {
                subStatus = "未开始";
                subPriority = "高";
              } else if (subFeature.progress < 80) {
                subStatus = "进行中";
                subPriority = "中";
              } else {
                subStatus = "已完成";
                subPriority = "低";
              }
              
              const properties = {};
              
              // 添加各属性
              const titleProp = createPropertyData('模块', subFeature.name, 'title');
              const completionProp = createPropertyData('完成度', subFeature.progress / 100, 'number');
              const statusProp = createPropertyData('进度状态', subStatus, 'select');
              const priorityProp = createPropertyData('优先级', subPriority, 'select');
              const categoryProp = createPropertyData('类别', "子功能", 'select');
              const parentProp = createPropertyData('父模块', displayName, 'rich_text');
              
              // 合并有效的属性
              if (titleProp) Object.assign(properties, titleProp);
              if (completionProp) Object.assign(properties, completionProp);
              if (statusProp) Object.assign(properties, statusProp);
              if (priorityProp) Object.assign(properties, priorityProp);
              if (categoryProp) Object.assign(properties, categoryProp);
              if (parentProp) Object.assign(properties, parentProp);
              
              // 创建子功能条目
              await notion.pages.create({
                parent: {
                  database_id: dashboardId
                },
                properties: properties
              });
              successCount++;
            } catch (error) {
              console.error(`添加子功能 "${subFeature.name}" 失败:`, error.message);
              failCount++;
            }
          }
        } catch (error) {
          console.error(`处理模块 "${moduleName}" 失败:`, error.message);
          failCount++;
        }
      }
      
      console.log(`成功${operationMode === 'update' ? '更新' : '填充'}项目总览数据! 成功: ${successCount}, 失败: ${failCount}`);
    }
    
    return dashboardId;
  } catch (error) {
    console.error('处理总览数据库失败:', error);
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  // 从命令行参数获取操作模式和可能的数据库ID
  const args = process.argv.slice(2);
  if (args.length > 0) {
    if (args[0] === 'create' || args[0] === 'update') {
      operationMode = args[0];
      
      // 检查是否提供了数据库ID作为第二个参数
      if (args.length > 1 && operationMode === 'update') {
        databaseIdFromArgs = args[1];
        console.log(`从命令行参数获取数据库ID: ${databaseIdFromArgs}`);
      }
    }
  }
  
  console.log(`开始${operationMode === 'update' ? '更新' : '创建'}可视化项目仪表盘，模式: ${operationMode}...`);
  
  // 检查环境变量
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_PROJECT_PAGE_ID) {
    console.error('错误: 请在.env文件中设置NOTION_API_KEY和NOTION_PROJECT_PAGE_ID');
    process.exit(1);
  }
  
  // 提取项目状态数据
  const progressData = extractProgressData();
  
  // 创建/更新项目总览数据库
  const dashboardId = await createDashboardDatabase(process.env.NOTION_PROJECT_PAGE_ID, progressData);
  
  if (dashboardId) {
    console.log('请在Notion中查看总览数据库，并选择以下视图：');
    console.log('1. 看板视图 - 按状态分组查看各模块');
    console.log('2. 进度条视图 - 可视化完成度');
    console.log('3. 表格视图 - 查看详细数据');
  }
  
  // 保存数据库ID到.env文件
  if (dashboardId) {
    // 注意：我们不直接修改.env文件，而是打印出ID让用户手动添加
    console.log('\n请将以下行添加到您的.env文件中（如果不存在）:');
    console.log(`NOTION_DASHBOARD_ID=${dashboardId}`);
  }
  
  console.log('\n重要提示：');
  console.log('数据库创建/更新后，您需要在Notion界面手动为数据库添加不同视图（看板、日历、进度条等）');
  console.log('Notion API只能创建数据库，但无法直接创建复杂视图');
}

// 执行主函数
main().catch(console.error);