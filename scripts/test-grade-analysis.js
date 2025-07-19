#!/usr/bin/env node

/**
 * 测试成绩分析功能
 * 使用907九下月考成绩.csv的数据进行分析
 */

import https from 'https';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env.hooks') });

// 读取CSV文件并转换为JSON
function parseCSV(filePath) {
    try {
        const csvContent = fs.readFileSync(filePath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error('CSV文件内容不足');
        }
        
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            return obj;
        });
        
        return data;
    } catch (error) {
        console.error('解析CSV文件失败:', error);
        return null;
    }
}

// 测试AI分析功能
async function testGradeAnalysis() {
    console.log('🚀 开始测试成绩分析功能');
    console.log('='.repeat(50));
    
    // 检查环境变量
    const doubaoApiKey = process.env.DOUBAO_API_KEY;
    const doubaoApiUrl = process.env.DOUBAO_API_URL;
    const doubaoModel = process.env.DOUBAO_MODEL;
    const wechatWebhook = process.env.WECHAT_WORK_WEBHOOK;
    
    if (!doubaoApiKey) {
        console.error('❌ 未配置DOUBAO_API_KEY');
        return;
    }
    
    console.log('🔑 API配置检查:');
    console.log(`   豆包API: ${doubaoApiKey ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   企业微信: ${wechatWebhook ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   模型: ${doubaoModel}`);
    console.log('');
    
    // 读取成绩数据
    const csvPath = path.join(__dirname, '..', '907九下月考成绩.csv');
    console.log('📄 读取成绩数据:', csvPath);
    
    const gradeData = parseCSV(csvPath);
    if (!gradeData) {
        console.error('❌ 无法读取成绩数据');
        return;
    }
    
    console.log(`✅ 读取成功，共 ${gradeData.length} 条记录`);
    console.log('');
    
    // 构建分析提示词
    const analysisPrompt = `作为教育数据分析专家，请深度分析以下成绩数据。数据包含总分和7个科目(语文、数学、英语、物理、化学、道法、历史)的分数、等级、排名三个维度。

## 📊 基础分析部分
### 整体成绩概况
- 总分分布情况(最高分、最低分、平均分)
- 各科目平均分排序
- 等级分布统计(A+、A、B+、B、C+等)

### 排名体系分析
- 班级排名与校排名、年级排名的关联性
- 各科目排名差异较大的学生识别
- 总分排名与单科排名的匹配度

### 分数-等级-排名三维分析
- 分数区间与等级对应关系
- 等级分布是否合理
- 排名梯度是否正常

## 🎯 高级分析部分
### 多维度异常识别
- 总分与单科成绩不匹配的学生
- 等级与排名不符的异常情况
- 同等级学生分数差异过大的科目

### 科目相关性分析
- 强相关科目组合(如理科三科、文科组合)
- 学科优势互补学生识别
- 偏科严重程度分析

### 班级竞争力评估
- 各科目在校内/年级内的相对位置
- 班级整体优势科目和薄弱科目
- 尖子生、中等生、后进生的分布特征

## 💡 精准教学建议
### 个性化学生指导
- 根据三维数据识别需要重点关注的学生
- 偏科学生的补强建议
- 优等生的进一步提升方向

### 科目教学策略
- 各科目教学重点调整建议
- 基于等级分布的教学难度调整
- 跨科目知识整合建议

### 班级管理建议
- 基于排名分析的班级管理策略
- 学习小组搭配建议
- 竞争激励机制设计

数据：
${JSON.stringify(gradeData, null, 2)}

注意：
1. 重点关注分数、等级、排名三个维度的深层关系
2. 输出要具有教育专业性和实用性
3. 每部分控制在150字以内，保持简洁专业`;

    console.log('🤖 调用豆包AI分析...');
    console.log('提示词长度:', analysisPrompt.length);
    console.log('');
    
    // 调用豆包AI
    const requestData = {
        model: doubaoModel,
        max_tokens: 3000,
        messages: [{
            role: 'user',
            content: analysisPrompt
        }]
    };
    
    try {
        const aiResponse = await fetch(doubaoApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${doubaoApiKey}`
            },
            body: JSON.stringify(requestData)
        });
        
        if (!aiResponse.ok) {
            throw new Error(`API调用失败: ${aiResponse.status} ${aiResponse.statusText}`);
        }
        
        const aiResult = await aiResponse.json();
        const analysis = aiResult.choices?.[0]?.message?.content;
        
        if (!analysis) {
            throw new Error('AI返回结果为空');
        }
        
        console.log('✅ AI分析完成');
        console.log('='.repeat(50));
        console.log('📊 分析结果:');
        console.log('='.repeat(50));
        console.log(analysis);
        console.log('='.repeat(50));
        console.log('');
        
        // 推送到企业微信
        if (wechatWebhook) {
            console.log('💬 推送到企业微信...');
            await sendToWechatWork(analysis, wechatWebhook);
        }
        
        // 保存分析结果
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultPath = path.join(__dirname, '..', 'logs', `analysis-${timestamp}.txt`);
        
        // 确保logs目录存在
        const logsDir = path.dirname(resultPath);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        fs.writeFileSync(resultPath, analysis, 'utf8');
        console.log('💾 分析结果已保存:', resultPath);
        
        console.log('');
        console.log('🎉 测试完成！');
        
    } catch (error) {
        console.error('❌ 分析失败:', error.message);
    }
}

// 企业微信推送函数
async function sendToWechatWork(analysis, webhook) {
    const timestamp = new Date().toLocaleString('zh-CN');
    
    // 分段逻辑
    const segments = [
        analysis.match(/## 📊 基础分析部分([\s\S]*?)(?=## 🎯 高级分析部分|$)/)?.[0] || '',
        analysis.match(/## 🎯 高级分析部分([\s\S]*?)(?=## 💡 精准教学建议|$)/)?.[0] || '',
        analysis.match(/## 💡 精准教学建议([\s\S]*?)$/)?.[0] || ''
    ];

    const titles = [
        '📊 基础分析部分',
        '🎯 高级分析部分',
        '💡 精准教学建议'
    ];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const title = titles[i];
        
        if (segment.trim()) {
            const message = {
                msgtype: 'markdown',
                markdown: {
                    content: `# ${title}

**分析时间：** ${timestamp}
**数据来源：** 907九下月考成绩.csv

${segment}

---
*第${i+1}部分/共${segments.length}部分*`
                }
            };

            try {
                const response = await fetch(webhook, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(message)
                });

                if (response.ok) {
                    console.log(`✅ 企业微信第${i+1}部分推送成功`);
                } else {
                    console.log(`❌ 企业微信第${i+1}部分推送失败: ${response.status}`);
                }
                
                // 避免推送过快
                if (i < segments.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.log(`❌ 企业微信第${i+1}部分推送异常:`, error.message);
            }
        }
    }
}

// 使用fetch polyfill for Node.js
if (!global.fetch) {
    global.fetch = (url, options) => {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const postData = options.body;
            
            const reqOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname,
                method: options.method || 'GET',
                headers: options.headers || {}
            };
            
            const req = https.request(reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        json: () => Promise.resolve(JSON.parse(data))
                    });
                });
            });
            
            req.on('error', reject);
            
            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    };
}

// 运行测试
testGradeAnalysis().catch(console.error);