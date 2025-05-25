/**
 * 学生画像系统 - 模块数据导入到Supabase
 * 
 * 此脚本读取进度统计.md文件，提取功能模块数据，并导入到Supabase的modules表中
 * 使用方法: node import-modules-to-supabase.js
 */

require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('错误: 请在.env文件中设置SUPABASE_URL和SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// 初始化Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 项目状态数据路径
const PROJECT_STATUS_PATH = path.join(__dirname, '../../进度统计.md');

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
    const moduleRegex = /(\w+模块).*?(\d+)%/g;
    let match;
    
    while ((match = moduleRegex.exec(statusContent)) !== null) {
      moduleProgressMap[match[1]] = parseInt(match[2]);
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

    return {
      overallProgress,
      moduleProgress: moduleProgressMap,
      moduleFeatures: moduleFeatures
    };
  } catch (error) {
    console.error('读取项目状态数据失败:', error);
    return null;
  }
}

/**
 * 将模块数据导入到Supabase
 */
async function importModulesToSupabase() {
  try {
    console.log('开始提取项目模块数据...');
    
    const progressData = extractProgressData();
    if (!progressData) {
      console.error('无法提取项目数据');
      return;
    }
    
    // 添加项目总体条目
    console.log('添加项目总体条目...');
    const { data: overallModule, error: overallError } = await supabase
      .from('modules')
      .upsert({
        name: '项目总体',
        description: '学生画像系统整体进度',
        progress: progressData.overallProgress,
        status: progressData.overallProgress < 50 ? '未开始' : 
               progressData.overallProgress < 80 ? '进行中' : '已完成',
        type: '概览',
        priority: '高'
      }, { onConflict: 'name' })
      .select('id')
      .single();
    
    if (overallError) {
      console.error('添加项目总体条目失败:', overallError);
    } else {
      console.log('成功添加项目总体条目, ID:', overallModule.id);
    }
    
    // 添加主要模块
    console.log('添加主要模块...');
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
    
    // 存储模块ID以便后续添加子功能
    const moduleIds = {};
    
    for (const [moduleName, progress] of Object.entries(progressData.moduleProgress)) {
      try {
        const displayName = moduleNameMap[moduleName] || moduleName;
        
        // 确定模块状态
        let status;
        let priority;
        if (progress < 50) {
          status = "未开始";
          priority = "高";
        } else if (progress < 80) {
          status = "进行中";
          priority = "中";
        } else {
          status = "已完成";
          priority = "低";
        }
        
        const { data: module, error } = await supabase
          .from('modules')
          .upsert({
            name: displayName,
            description: `${moduleName}功能与进度`,
            progress: progress,
            status: status,
            type: '核心模块',
            priority: priority
          }, { onConflict: 'name' })
          .select('id')
          .single();
        
        if (error) {
          console.error(`添加模块 "${moduleName}" 失败:`, error);
        } else {
          console.log(`成功添加模块 "${displayName}", ID: ${module.id}`);
          moduleIds[moduleName] = module.id;
        }
      } catch (error) {
        console.error(`处理模块 "${moduleName}" 失败:`, error);
      }
    }
    
    // 添加子功能
    console.log('添加子功能...');
    
    for (const [moduleName, features] of Object.entries(progressData.moduleFeatures)) {
      const parentId = moduleIds[moduleName];
      if (!parentId) {
        console.warn(`警告: 找不到模块 "${moduleName}" 的ID，跳过添加子功能`);
        continue;
      }
      
      for (const feature of features) {
        try {
          // 确定子功能状态
          let status;
          let priority;
          if (feature.progress < 50) {
            status = "未开始";
            priority = "高";
          } else if (feature.progress < 80) {
            status = "进行中";
            priority = "中";
          } else {
            status = "已完成";
            priority = "低";
          }
          
          const { error } = await supabase
            .from('modules')
            .upsert({
              name: feature.name,
              progress: feature.progress,
              status: status,
              parent_module: parentId,
              type: '子功能',
              priority: priority
            }, { onConflict: 'name' });
          
          if (error) {
            console.error(`添加子功能 "${feature.name}" 失败:`, error);
          } else {
            console.log(`成功添加子功能 "${feature.name}"`);
          }
        } catch (error) {
          console.error(`处理子功能 "${feature.name}" 失败:`, error);
        }
      }
    }
    
    console.log('所有模块和子功能已成功导入到Supabase!');
  } catch (error) {
    console.error('导入模块数据失败:', error);
  }
}

// 执行导入函数
importModulesToSupabase().catch(console.error); 