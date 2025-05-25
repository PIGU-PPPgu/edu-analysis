/**
 * 学生画像系统 - Notion可视化仪表盘创建工具
 * 
 * 此脚本用于在Notion页面中创建可视化项目仪表盘
 * 使用方法: node create-visualized-dashboard.js
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
function extractProgressData() {
  try {
    // 从进度统计文件读取
    const statusContent = fs.readFileSync(PROJECT_STATUS_PATH, 'utf8');
    
    // 提取总体进度
    const overallProgressMatch = statusContent.match(/整体项目完成度.*?(\d+)%/);
    const overallProgress = overallProgressMatch ? parseInt(overallProgressMatch[1]) : 0;
    
    // 提取模块进度
    const moduleProgressMap = {};
    const moduleRegex = /(\w+模块):.*?(\d+)%/g;
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

    // 定义完整的功能模块列表和子功能
    const allModules = {
      "用户认证模块": {
        progress: moduleProgressMap["用户认证模块"] || 53,
        subFeatures: [
          { name: "登录功能", progress: 90 },
          { name: "注册功能", progress: 85 },
          { name: "权限管理", progress: 60 },
          { name: "密码重置", progress: 20 },
          { name: "第三方登录", progress: 10 }
        ]
      },
      "数据导入模块": {
        progress: moduleProgressMap["数据导入模块"] || 83,
        subFeatures: [
          { name: "Excel导入", progress: 95 },
          { name: "数据验证", progress: 85 },
          { name: "错误处理", progress: 75 },
          { name: "数据清洗", progress: 80 }
        ]
      },
      "作业管理模块": {
        progress: moduleProgressMap["作业管理模块"] || 76,
        subFeatures: [
          { name: "作业创建", progress: 90 },
          { name: "作业分发", progress: 85 },
          { name: "作业批改", progress: 75 },
          { name: "作业统计", progress: 65 },
          { name: "文件上传", progress: 65 }
        ]
      },
      "成绩分析模块": {
        progress: moduleProgressMap["成绩分析模块"] || 61,
        subFeatures: [
          { name: "成绩录入", progress: 90 },
          { name: "基础统计", progress: 85 },
          { name: "对比分析", progress: 60 },
          { name: "图表可视化", progress: 70 },
          { name: "高级分析算法", progress: 40 },
          { name: "导出报告", progress: 20 }
        ]
      },
      "预警分析模块": {
        progress: moduleProgressMap["预警分析模块"] || 66,
        subFeatures: [
          { name: "预警规则设置", progress: 75 },
          { name: "成绩预警", progress: 80 },
          { name: "学习行为预警", progress: 70 },
          { name: "AI预警分析", progress: 40 }
        ]
      },
      "学生画像模块": {
        progress: moduleProgressMap["学生画像模块"] || 44,
        subFeatures: [
          { name: "基础画像", progress: 70 },
          { name: "特征提取", progress: 55 },
          { name: "学习风格分析", progress: 40 },
          { name: "AI个性化分析", progress: 30 },
          { name: "画像对比", progress: 25 }
        ]
      },
      "班级管理模块": {
        progress: moduleProgressMap["班级管理模块"] || 74,
        subFeatures: [
          { name: "班级创建", progress: 90 },
          { name: "学生管理", progress: 85 },
          { name: "班级统计", progress: 75 },
          { name: "班级对比", progress: 45 }
        ]
      },
      "AI设置模块": {
        progress: moduleProgressMap["AI设置模块"] || 42,
        subFeatures: [
          { name: "模型选择", progress: 65 },
          { name: "参数配置", progress: 50 },
          { name: "自定义提示词", progress: 40 },
          { name: "模型训练", progress: 15 }
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
 * 删除数据库中的所有页面
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
    
    // 检查数据库是否已存在
    let dashboardId = await checkDatabaseExists(pageId, dbName);
    
    // 如果不存在，创建新数据库
    if (!dashboardId) {
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
          "Module": {
            title: {}
          },
          "Completion": {
            number: {
              format: "percent"
            }
          },
          "Progress": {
            select: {
              options: [
                { name: "Not started", color: "red" },
                { name: "In progress", color: "yellow" },
                { name: "Done", color: "green" }
              ]
            }
          },
          "Priority": {
            select: {
              options: [
                { name: "High", color: "red" },
                { name: "Medium", color: "yellow" },
                { name: "Low", color: "green" }
              ]
            }
          },
          "Category": {
            select: {
              options: [
                { name: "Core Module", color: "blue" },
                { name: "Sub Feature", color: "green" },
                { name: "Overview", color: "gray" }
              ]
            }
          },
          "Parent Module": {
            rich_text: {}
          },
          "Remaining": {
            formula: {
              expression: "1 - prop(\"Completion\")"
            }
          }
        }
      });
      
      console.log('成功创建项目总览数据库!');
      console.log('数据库ID:', response.id);
      dashboardId = response.id;
    } else {
      // 如果存在，清空现有条目
      await clearDatabaseEntries(dashboardId);
      console.log('已清空并准备更新现有数据库');
    }
    
    // 填充数据库数据
    if (progressData) {
      console.log('开始填充项目总览数据...');
      
      const moduleNameMap = {
        "数据导入模块": "Data Import",
        "用户认证模块": "User Auth",
        "作业管理模块": "Homework Mgmt",
        "成绩分析模块": "Grade Analysis",
        "预警分析模块": "Warning Analysis",
        "学生画像模块": "Student Profile",
        "班级管理模块": "Class Mgmt",
        "AI设置模块": "AI Settings"
      };
      
      // 1. 添加项目整体进度条目
      await notion.pages.create({
        parent: {
          database_id: dashboardId
        },
        properties: {
          "Module": {
            title: [
              {
                text: {
                  content: "Overall Project"
                }
              }
            ]
          },
          "Completion": {
            number: progressData.overallProgress / 100
          },
          "Progress": {
            select: {
              name: progressData.overallProgress < 70 ? "In progress" : "Done"
            }
          },
          "Priority": {
            select: {
              name: "High"
            }
          },
          "Category": {
            select: {
              name: "Overview"
            }
          }
        }
      });
      
      // 2. 添加主要模块
      for (const [moduleName, moduleData] of Object.entries(progressData.allModules)) {
        const englishName = moduleNameMap[moduleName] || moduleName.replace('模块', '');
        
        // 确定模块状态
        let status;
        let priority;
        if (moduleData.progress < 50) {
          status = "Not started";
          priority = "High";
        } else if (moduleData.progress < 80) {
          status = "In progress";
          priority = "Medium";
        } else {
          status = "Done";
          priority = "Low";
        }
        
        // 创建模块条目
        await notion.pages.create({
          parent: {
            database_id: dashboardId
          },
          properties: {
            "Module": {
              title: [
                {
                  text: {
                    content: englishName
                  }
                }
              ]
            },
            "Completion": {
              number: moduleData.progress / 100
            },
            "Progress": {
              select: {
                name: status
              }
            },
            "Priority": {
              select: {
                name: priority
              }
            },
            "Category": {
              select: {
                name: "Core Module"
              }
            }
          }
        });
        
        // 3. 添加子功能
        for (const subFeature of moduleData.subFeatures) {
          // 确定子功能状态
          let subStatus;
          let subPriority;
          if (subFeature.progress < 50) {
            subStatus = "Not started";
            subPriority = "High";
          } else if (subFeature.progress < 80) {
            subStatus = "In progress";
            subPriority = "Medium";
          } else {
            subStatus = "Done";
            subPriority = "Low";
          }
          
          // 创建子功能条目
          await notion.pages.create({
            parent: {
              database_id: dashboardId
            },
            properties: {
              "Module": {
                title: [
                  {
                    text: {
                      content: subFeature.name
                    }
                  }
                ]
              },
              "Completion": {
                number: subFeature.progress / 100
              },
              "Progress": {
                select: {
                  name: subStatus
                }
              },
              "Priority": {
                select: {
                  name: subPriority
                }
              },
              "Category": {
                select: {
                  name: "Sub Feature"
                }
              },
              "Parent Module": {
                rich_text: [
                  {
                    text: {
                      content: englishName
                    }
                  }
                ]
              }
            }
          });
        }
      }
      
      console.log('成功填充项目总览数据!');
    }
    
    return dashboardId;
  } catch (error) {
    console.error('创建总览数据库失败:', error);
    return null;
  }
}

/**
 * 创建项目任务数据库（增强版）
 */
async function createEnhancedTaskDatabase(pageId) {
  try {
    console.log('开始处理项目任务数据库...');
    
    // 数据库名称
    const dbName = "学生画像系统 - 项目任务";
    
    // 检查数据库是否已存在
    let taskDbId = await checkDatabaseExists(pageId, dbName);
    
    // 如果不存在，创建新数据库
    if (!taskDbId) {
      console.log('创建新的项目任务数据库...');
      
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
          "Task": {
            title: {}
          },
          "Module": {
            select: {
              options: [
                { name: "User Auth", color: "blue" },
                { name: "Data Import", color: "green" },
                { name: "Homework Mgmt", color: "orange" },
                { name: "Grade Analysis", color: "purple" },
                { name: "Warning Analysis", color: "red" },
                { name: "Student Profile", color: "yellow" },
                { name: "Class Mgmt", color: "pink" },
                { name: "AI Settings", color: "gray" }
              ]
            }
          },
          "Priority": {
            select: {
              options: [
                { name: "High", color: "red" },
                { name: "Medium", color: "yellow" },
                { name: "Low", color: "green" }
              ]
            }
          },
          "Progress": {
            select: {
              options: [
                { name: "Not started", color: "gray" },
                { name: "Planning", color: "default" },
                { name: "In progress", color: "blue" },
                { name: "Done", color: "green" },
                { name: "On hold", color: "orange" }
              ]
            }
          },
          "Completion": {
            number: {
              format: "percent"
            }
          },
          "Start Date": {
            date: {}
          },
          "Due Date": {
            date: {}
          },
          "Assignee": {
            rich_text: {}
          },
          "Tags": {
            multi_select: {
              options: [
                { name: "Frontend", color: "blue" },
                { name: "Backend", color: "green" },
                { name: "UI", color: "pink" },
                { name: "Database", color: "orange" },
                { name: "API", color: "purple" },
                { name: "AI", color: "gray" }
              ]
            }
          },
          "Estimated Hours": {
            number: {
              format: "number"
            }
          }
        }
      });
      
      console.log('成功创建增强版项目任务数据库!');
      console.log('数据库ID:', response.id);
      taskDbId = response.id;
    } else {
      // 如果存在，清空现有条目
      await clearDatabaseEntries(taskDbId);
      console.log('已清空并准备更新现有任务数据库');
    }
    
    // 添加任务
    await addTaskData(taskDbId);
    
    return taskDbId;
  } catch (error) {
    console.error('创建增强版任务数据库失败:', error);
    return null;
  }
}

/**
 * 添加任务数据
 */
async function addTaskData(databaseId) {
  try {
    console.log('开始添加优先任务数据...');
    
    // 高优先级任务
    const priorityTasks = [
      {
        name: "学生个人画像生成",
        module: "Student Profile",
        priority: "High",
        status: "Not started",
        completion: 55,
        tags: ["AI", "Backend"],
        hours: 40,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 两周后
      },
      {
        name: "完善高级分析算法",
        module: "Grade Analysis",
        priority: "High",
        status: "In progress",
        completion: 40,
        tags: ["Backend", "Database"],
        hours: 30,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 三周后
      },
      {
        name: "实现AI预警分析",
        module: "Warning Analysis",
        priority: "High",
        status: "Not started",
        completion: 30,
        tags: ["AI", "Backend"],
        hours: 50,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 一个月后
      },
      {
        name: "自定义模型功能实现",
        module: "AI Settings",
        priority: "Medium",
        status: "Planning",
        completion: 30,
        tags: ["AI", "Frontend"],
        hours: 25,
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45天后
      },
      {
        name: "密码找回功能实现",
        module: "User Auth",
        priority: "Medium",
        status: "Not started",
        completion: 0,
        tags: ["Frontend", "API"],
        hours: 10,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 一周后
      },
      {
        name: "学习风格分析功能",
        module: "Student Profile",
        priority: "Medium",
        status: "Planning",
        completion: 20,
        tags: ["AI", "Backend"],
        hours: 35,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60天后
      },
      {
        name: "班级对比分析报告",
        module: "Class Mgmt",
        priority: "Medium",
        status: "Not started",
        completion: 15,
        tags: ["Frontend", "Data Visualization"],
        hours: 20,
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000) // 25天后
      },
      {
        name: "数据导出PDF格式",
        module: "Grade Analysis",
        priority: "Low",
        status: "Not started",
        completion: 0,
        tags: ["Frontend"],
        hours: 15,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后
      },
      {
        name: "第三方登录集成",
        module: "User Auth",
        priority: "Low",
        status: "Not started",
        completion: 0,
        tags: ["API", "Frontend"],
        hours: 25,
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90天后
      },
      {
        name: "移动端适配",
        module: "User Auth",
        priority: "Medium",
        status: "Not started",
        completion: 0,
        tags: ["Frontend", "UI"],
        hours: 40,
        dueDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000) // 75天后
      }
    ];
    
    // 添加任务到数据库
    for (const task of priorityTasks) {
      await notion.pages.create({
        parent: {
          database_id: databaseId
        },
        properties: {
          "Task": {
            title: [
              {
                text: {
                  content: task.name
                }
              }
            ]
          },
          "Module": {
            select: {
              name: task.module
            }
          },
          "Priority": {
            select: {
              name: task.priority
            }
          },
          "Progress": {
            select: {
              name: task.status
            }
          },
          "Completion": {
            number: task.completion / 100
          },
          "Estimated Hours": {
            number: task.hours
          },
          "Tags": {
            multi_select: task.tags.map(tag => ({ name: tag }))
          },
          "Due Date": task.dueDate ? {
            date: {
              start: task.dueDate.toISOString().split('T')[0]
            }
          } : null
        }
      });
    }
    
    console.log('成功添加任务数据!');
  } catch (error) {
    console.error('添加任务数据失败:', error);
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
  
  console.log('开始创建/更新可视化项目仪表盘...');
  
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
  
  // 创建/更新增强版任务数据库
  const taskDbId = await createEnhancedTaskDatabase(process.env.NOTION_PROJECT_PAGE_ID);
  
  if (taskDbId) {
    console.log('请在Notion中查看任务数据库，并选择以下视图：');
    console.log('1. 看板视图 - 按状态跟踪任务进展');
    console.log('2. 日历视图 - 按时间查看任务计划');
    console.log('3. 列表视图 - 按优先级查看任务');
  }
  
  // 保存数据库ID到.env文件
  if (dashboardId && taskDbId) {
    // 注意：我们不直接修改.env文件，而是打印出ID让用户手动添加
    console.log('\n请将以下行添加到您的.env文件中（如果不存在）:');
    console.log(`NOTION_DASHBOARD_ID=${dashboardId}`);
    console.log(`NOTION_TASK_DB_ID=${taskDbId}`);
  }
  
  console.log('\n重要提示：');
  console.log('数据库创建/更新后，您需要在Notion界面手动为数据库添加不同视图（看板、日历、进度条等）');
  console.log('Notion API只能创建数据库，但无法直接创建复杂视图');
}

// 执行主函数
main().catch(console.error); 