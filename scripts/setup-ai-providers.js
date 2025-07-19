#!/usr/bin/env node

/**
 * 🤖 AI服务提供商设置向导
 * 支持多种AI服务：Anthropic、OpenAI、Google、Perplexity等
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

// AI服务提供商配置
const AI_PROVIDERS = {
    anthropic: {
        name: 'Anthropic Claude',
        apiUrl: 'https://api.anthropic.com/v1/messages',
        models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
        keyFormat: 'sk-ant-api03-',
        testModel: 'claude-3-haiku-20240307', // 使用更便宜的模型测试
        setupUrl: 'https://console.anthropic.com/account/keys'
    },
    openai: {
        name: 'OpenAI GPT',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
        keyFormat: 'sk-',
        testModel: 'gpt-4o-mini',
        setupUrl: 'https://platform.openai.com/api-keys'
    },
    google: {
        name: 'Google Gemini',
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
        keyFormat: 'AI',
        testModel: 'gemini-1.5-flash',
        setupUrl: 'https://ai.google.dev/tutorials/setup'
    },
    perplexity: {
        name: 'Perplexity AI',
        apiUrl: 'https://api.perplexity.ai/chat/completions',
        models: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online'],
        keyFormat: 'pplx-',
        testModel: 'llama-3.1-sonar-small-128k-online',
        setupUrl: 'https://www.perplexity.ai/settings/api'
    }
};

// 测试Anthropic API
async function testAnthropic(apiKey) {
    const requestData = {
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{
            role: 'user',
            content: '请用中文回答：你好吗？'
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
                        resolve({ success: true, response: result.content[0].text });
                    } else if (result.error) {
                        resolve({ success: false, error: result.error.message });
                    } else {
                        resolve({ success: false, error: '响应格式异常' });
                    }
                } catch (error) {
                    resolve({ success: false, error: error.message });
                }
            });
        });
        
        req.on('error', (error) => {
            resolve({ success: false, error: error.message });
        });
        
        req.write(postData);
        req.end();
    });
}

// 测试OpenAI API
async function testOpenAI(apiKey) {
    const requestData = {
        model: 'gpt-4o-mini',
        max_tokens: 100,
        messages: [{
            role: 'user',
            content: '请用中文回答：你好吗？'
        }]
    };
    
    return new Promise((resolve) => {
        const postData = JSON.stringify(requestData);
        
        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.choices && result.choices[0] && result.choices[0].message) {
                        resolve({ success: true, response: result.choices[0].message.content });
                    } else if (result.error) {
                        resolve({ success: false, error: result.error.message });
                    } else {
                        resolve({ success: false, error: '响应格式异常' });
                    }
                } catch (error) {
                    resolve({ success: false, error: error.message });
                }
            });
        });
        
        req.on('error', (error) => {
            resolve({ success: false, error: error.message });
        });
        
        req.write(postData);
        req.end();
    });
}

// 更新环境变量文件
function updateEnvFile(updates) {
    const envPath = path.join(__dirname, '..', '.env.hooks');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ 环境变量文件已更新');
}

// 更新成绩分析脚本以支持多种AI服务
function updateGradeAnalysisScript(provider) {
    const scriptPath = path.join(__dirname, 'grade-analysis-hook.sh');
    let scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    let newAIFunction = '';
    
    if (provider === 'openai') {
        newAIFunction = `    # 调用OpenAI分析
    local analysis_result=$(curl -s -X POST "https://api.openai.com/v1/chat/completions" \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer $OPENAI_API_KEY" \\
        -d '{
            "model": "'"${AI_ANALYSIS_MODEL:-gpt-4o-mini}"'",
            "max_tokens": 1500,
            "messages": [{
                "role": "user", 
                "content": "'"$analysis_prompt"'"
            }]
        }' 2>/dev/null | jq -r '.choices[0].message.content // "分析失败"')`;
    } else {
        // 保持原有的Anthropic配置
        newAIFunction = `    # 调用AI分析
    local analysis_result=$(curl -s -X POST "https://api.anthropic.com/v1/messages" \\
        -H "Content-Type: application/json" \\
        -H "x-api-key: $ANTHROPIC_API_KEY" \\
        -H "anthropic-version: 2023-06-01" \\
        -d '{
            "model": "'"${AI_ANALYSIS_MODEL:-claude-3-sonnet-20240229}"'",
            "max_tokens": 1500,
            "messages": [{
                "role": "user", 
                "content": "'"$analysis_prompt"'"
            }]
        }' 2>/dev/null | jq -r '.content[0].text // "分析失败"')`;
    }
    
    // 替换AI调用部分
    scriptContent = scriptContent.replace(
        /# 调用AI分析[\s\S]*?2>\/dev\/null \| jq -r[^)]*\)/,
        newAIFunction
    );
    
    fs.writeFileSync(scriptPath, scriptContent);
    console.log('✅ 成绩分析脚本已更新');
}

// 主函数
async function main() {
    console.log('🚀 AI服务提供商设置向导');
    console.log('='.repeat(50));
    
    // 检查当前配置
    const currentAnthropicKey = process.env.ANTHROPIC_API_KEY;
    const currentOpenAIKey = process.env.OPENAI_API_KEY;
    
    console.log('📋 当前配置状态:');
    console.log(`Anthropic API Key: ${currentAnthropicKey ? '已配置' : '未配置'}`);
    console.log(`OpenAI API Key: ${currentOpenAIKey ? '已配置' : '未配置'}`);
    console.log('');
    
    let workingProvider = null;
    
    // 测试现有的API密钥
    if (currentAnthropicKey && currentAnthropicKey.startsWith('sk-ant-api03-')) {
        console.log('🧪 测试Anthropic API...');
        const anthropicResult = await testAnthropic(currentAnthropicKey);
        if (anthropicResult.success) {
            console.log('✅ Anthropic API正常工作');
            console.log('📝 响应示例:', anthropicResult.response);
            workingProvider = 'anthropic';
        } else {
            console.log('❌ Anthropic API失败:', anthropicResult.error);
        }
    }
    
    if (currentOpenAIKey && currentOpenAIKey.startsWith('sk-')) {
        console.log('🧪 测试OpenAI API...');
        const openaiResult = await testOpenAI(currentOpenAIKey);
        if (openaiResult.success) {
            console.log('✅ OpenAI API正常工作');
            console.log('📝 响应示例:', openaiResult.response);
            workingProvider = 'openai';
        } else {
            console.log('❌ OpenAI API失败:', openaiResult.error);
        }
    }
    
    console.log('');
    console.log('='.repeat(50));
    
    if (workingProvider) {
        console.log('🎉 找到可用的AI服务:', AI_PROVIDERS[workingProvider].name);
        console.log('自动化成绩分析功能已准备就绪！');
        
        // 更新脚本以使用可用的provider
        updateGradeAnalysisScript(workingProvider);
        
        // 更新环境变量
        const updates = {
            'AI_PROVIDER': workingProvider,
            'AI_ANALYSIS_MODEL': AI_PROVIDERS[workingProvider].testModel
        };
        updateEnvFile(updates);
    } else {
        console.log('❌ 未找到可用的AI服务');
        console.log('');
        console.log('📖 设置指南:');
        console.log('');
        
        for (const [key, provider] of Object.entries(AI_PROVIDERS)) {
            console.log(`🔹 ${provider.name}:`);
            console.log(`   - 获取API密钥: ${provider.setupUrl}`);
            console.log(`   - 密钥格式: ${provider.keyFormat}...`);
            console.log(`   - 推荐模型: ${provider.testModel}`);
            console.log('');
        }
        
        console.log('⚠️  配置完成后，请重新运行此脚本进行测试。');
    }
}

main().catch(console.error);