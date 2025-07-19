#!/usr/bin/env node

/**
 * 🧪 测试AI连接和分析功能
 */

import https from 'https';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env.hooks') });

// 测试AI连接
async function testAIConnection() {
    console.log('🧪 测试AI连接...');
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.log('❌ 未配置ANTHROPIC_API_KEY');
        return false;
    }
    
    if (!apiKey.startsWith('sk-ant-api03-')) {
        console.log('❌ ANTHROPIC_API_KEY格式不正确');
        console.log('💡 正确格式应该是: sk-ant-api03-[字符串]');
        return false;
    }
    
    // 测试AI分析
    const testPrompt = `请分析以下模拟成绩数据：
    
学生: 张三, 班级: 七年级1班, 考试: 期中考试, 总分: 85, 班级排名: 12
学生: 李四, 班级: 七年级1班, 考试: 期中考试, 总分: 92, 班级排名: 8
学生: 王五, 班级: 七年级1班, 考试: 期中考试, 总分: 78, 班级排名: 18

请重点关注：
1. 异常成绩和排名变化
2. 需要关注的学生
3. 班级整体表现趋势
4. 具体的教学建议`;
    
    const requestData = {
        model: process.env.AI_ANALYSIS_MODEL || 'claude-3-sonnet-20240229',
        max_tokens: 1500,
        messages: [{
            role: 'user',
            content: testPrompt
        }]
    };
    
    return new Promise((resolve) => {
        const postData = JSON.stringify(requestData);
        
        const options = {
            hostname: 'api.anthropic.com',
            port: 443,
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    if (result.content && result.content[0] && result.content[0].text) {
                        console.log('✅ AI连接成功');
                        console.log('📊 AI分析结果示例:');
                        console.log('─'.repeat(50));
                        console.log(result.content[0].text);
                        console.log('─'.repeat(50));
                        resolve(true);
                    } else if (result.error) {
                        console.log('❌ AI分析失败:', result.error.message);
                        resolve(false);
                    } else {
                        console.log('❌ AI响应格式异常:', result);
                        resolve(false);
                    }
                } catch (error) {
                    console.log('❌ AI响应解析失败:', error.message);
                    console.log('原始响应:', data);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ AI请求失败:', error.message);
            resolve(false);
        });
        
        req.write(postData);
        req.end();
    });
}

// 主函数
async function main() {
    console.log('🚀 开始AI连接测试');
    console.log('='.repeat(50));
    
    const result = await testAIConnection();
    
    console.log('');
    console.log('='.repeat(50));
    if (result) {
        console.log('🎉 AI分析功能测试成功！');
        console.log('现在可以使用自动化成绩分析功能了。');
    } else {
        console.log('❌ AI分析功能测试失败');
        console.log('请检查ANTHROPIC_API_KEY配置。');
    }
}

main().catch(console.error);