/**
 * 学生画像系统 - Notion数据库创建工具
 * 
 * 此脚本用于在Notion页面中创建项目任务数据库
 * 使用方法: node create-database.js
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// 初始化Notion客户端
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

/**
 * 创建项目任务数据库
 */
async function createTaskDatabase(pageId) {
  try {
    console.log('开始创建项目任务数据库...');
    
    // 创建数据库
    const response = await notion.databases.create({
      parent: {
        type: "page_id",
        page_id: pageId
      },
      title: [
        {
          type: "text",
          text: {
            content: "学生画像系统 - 项目任务"
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
        "Due Date": {
          date: {}
        },
        "Assignee": {
          rich_text: {}
        },
        "Notes": {
          rich_text: {}
        }
      }
    });
    
    console.log('成功创建项目任务数据库!');
    console.log('数据库ID:', response.id);
    
    // 将数据库ID保存到.env文件中
    // 注意：这里我们避免直接写入.env文件，而是打印出来让用户手动添加
    console.log('\n请将以下行添加到您的.env文件中:');
    console.log(`NOTION_DATABASE_ID=${response.id}`);
    
    return response.id;
  } catch (error) {
    console.error('创建数据库失败:', error);
    return null;
  }
}

/**
 * 添加初始任务
 */
async function addInitialTasks(databaseId) {
  try {
    console.log('开始添加初始任务...');
    
    // 从进度统计文件提取关键任务
    const priorityTasks = [
      {
        module: "Student Profile",
        name: "学生个人画像生成",
        priority: "High",
        status: "Not started",
        completion: 55
      },
      {
        module: "Grade Analysis",
        name: "完善高级分析算法",
        priority: "High",
        status: "In progress",
        completion: 40
      },
      {
        module: "Warning Analysis",
        name: "实现AI预警分析",
        priority: "High",
        status: "Not started",
        completion: 30
      },
      {
        module: "AI Settings",
        name: "自定义模型功能实现",
        priority: "Medium",
        status: "Planning",
        completion: 30
      },
      {
        module: "User Auth",
        name: "密码找回功能实现",
        priority: "Medium",
        status: "Not started",
        completion: 0
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
          }
        }
      });
    }
    
    console.log('成功添加初始任务!');
  } catch (error) {
    console.error('添加任务失败:', error);
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
  
  // 创建数据库
  const databaseId = await createTaskDatabase(process.env.NOTION_PROJECT_PAGE_ID);
  
  if (databaseId) {
    // 添加初始任务
    await addInitialTasks(databaseId);
  }
}

// 执行主函数
main().catch(console.error); 