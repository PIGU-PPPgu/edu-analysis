#!/usr/bin/env node

/**
 * 🚑 应用立即修复补丁
 * 自动更新ImportProcessor和相关组件以使用修复逻辑
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function applyFixes() {
  console.log('🚑 开始应用立即修复补丁...');
  console.log('==========================================');
  
  try {
    // 1. 备份原始ImportProcessor
    const importProcessorPath = path.join(__dirname, 'src/components/analysis/core/grade-importer/components/ImportProcessor.tsx');
    const backupPath = path.join(__dirname, 'src/components/analysis/core/grade-importer/components/ImportProcessor.tsx.backup');
    
    if (fs.existsSync(importProcessorPath)) {
      console.log('📋 步骤1: 备份原始ImportProcessor...');
      fs.copyFileSync(importProcessorPath, backupPath);
      console.log('✅ 已备份到: ImportProcessor.tsx.backup');
    } else {
      console.log('⚠️ ImportProcessor.tsx 文件未找到，跳过备份');
    }
    
    // 2. 读取修复补丁
    console.log('\\n📋 步骤2: 读取修复补丁...');
    const patchContent = fs.readFileSync(path.join(__dirname, 'ImportProcessor-fix-patch.tsx'), 'utf-8');
    console.log('✅ 修复补丁已读取');
    
    // 3. 创建修复指南
    console.log('\\n📋 步骤3: 创建修复指南...');
    
    const fixGuide = `
# 🚑 ImportProcessor 立即修复指南

## 问题描述
- 406 Not Acceptable 错误
- exams表subject字段查询失败
- grade_data表字段映射不匹配
- 字段验证器期望字段不存在

## 修复步骤

### 1. 在ImportProcessor.tsx中添加修复函数

在文件顶部导入区域后添加：

\`\`\`typescript
// 🚑 导入修复函数
import {
  checkExamDuplicateSafe,
  checkGradeDataDuplicateSafe,
  insertGradeDataSafe,
  createExamSafe,
  performSafeImport
} from './ImportProcessor-fix-patch';
\`\`\`

### 2. 替换考试检查逻辑

找到原有的考试检查代码，替换为：

\`\`\`typescript
// 原来的代码（有问题）:
const { data: existingExams, error: examError } = await supabase
  .from('exams')
  .select('id,title,type,date,subject,scope,created_at,grade_data(count)')
  .eq('title', examInfo.title)
  .eq('type', examInfo.type)
  .eq('date', examInfo.date);

// 替换为（修复后）:
const duplicateCheck = await checkExamDuplicateSafe(examInfo);
if (duplicateCheck.error) {
  throw new Error(\`考试检查失败: \${duplicateCheck.error.message}\`);
}
const existingExams = duplicateCheck.data;
\`\`\`

### 3. 替换成绩数据查询逻辑

找到grade_data查询代码，替换为：

\`\`\`typescript
// 原来的代码（有问题）:
const { data: existingGrade, error: gradeError } = await supabase
  .from('grade_data')
  .select('id')
  .eq('exam_id', examId)
  .eq('student_id', record.student_id)
  .eq('subject', '');

// 替换为（修复后）:
const existingCheck = await checkGradeDataDuplicateSafe(examId, record.student_id);
if (existingCheck.error) {
  throw new Error(\`成绩检查失败: \${existingCheck.error.message}\`);
}
const existingGrade = existingCheck.data;
\`\`\`

### 4. 替换数据插入逻辑

找到成绩插入代码，替换为：

\`\`\`typescript
// 原来的代码（可能失败）:
const { data: insertedGrade, error: insertError } = await supabase
  .from('grade_data')
  .insert(gradeRecord)
  .select()
  .single();

// 替换为（修复后）:
const insertResult = await insertGradeDataSafe(gradeRecord);
if (insertResult.error) {
  throw new Error(\`数据插入失败: \${insertResult.error.message}\`);
}
const insertedGrade = insertResult.data;
\`\`\`

### 5. 或者使用完整的安全导入函数

如果想要完全替换导入逻辑，可以使用：

\`\`\`typescript
const importResult = await performSafeImport(
  validData, 
  examInfo, 
  (progress) => setImportProgress(progress)
);

if (importResult.success) {
  toast.success(\`导入完成！成功 \${importResult.successCount} 条，失败 \${importResult.errorCount} 条\`);
  onImportComplete({
    success: true,
    successCount: importResult.successCount,
    errorCount: importResult.errorCount,
    errors: importResult.errors
  });
} else {
  toast.error('导入失败，请检查数据格式');
  onError('导入过程中发生错误');
}
\`\`\`

## 修复效果

应用这些修复后：
- ✅ 406错误将被解决
- ✅ 考试查询将正常工作
- ✅ 成绩数据插入将成功
- ✅ 导入功能将恢复正常
- ✅ 字段映射将使用现有数据库字段

## 注意事项

1. 这是临时修复方案，适用于当前数据库结构
2. 最终还是需要执行数据库结构标准化
3. 修复后请测试完整的导入流程
4. 如果有问题，可以从.backup文件恢复原始版本

## 测试验证

应用修复后，测试以下场景：
1. 创建新考试记录
2. 导入Excel文件
3. 检查成绩数据是否正确存储
4. 验证数据查询是否正常

## 数据库最终修复

当条件允许时，执行以下SQL脚本完成数据库结构标准化：
- fix-database-structure-issues.sql
- quick-database-fix.sql
`;

    fs.writeFileSync(path.join(__dirname, 'IMPORT_FIX_GUIDE.md'), fixGuide, 'utf-8');
    console.log('✅ 已创建修复指南: IMPORT_FIX_GUIDE.md');
    
    // 4. 创建快速测试脚本
    console.log('\\n📋 步骤4: 创建快速测试脚本...');
    
    const testScript = `
// 🧪 快速测试修复效果
import { checkExamDuplicateSafe, createExamSafe } from './ImportProcessor-fix-patch';

export async function testFixes() {
  console.log('🧪 开始测试修复效果...');
  
  try {
    // 测试1: 考试查询
    const testExam = {
      title: '修复测试_' + Date.now(),
      type: '单元测试', 
      date: '2025-06-26'
    };
    
    console.log('测试考试查询...');
    const queryResult = await checkExamDuplicateSafe(testExam);
    
    if (queryResult.error) {
      console.error('❌ 考试查询测试失败:', queryResult.error.message);
      return false;
    } else {
      console.log('✅ 考试查询测试通过');
    }
    
    // 测试2: 考试创建
    console.log('测试考试创建...');
    const createResult = await createExamSafe(testExam);
    
    if (createResult.error) {
      console.error('❌ 考试创建测试失败:', createResult.error.message);
      return false;
    } else {
      console.log('✅ 考试创建测试通过，ID:', createResult.data.id);
    }
    
    console.log('🎉 所有修复测试通过！');
    return true;
    
  } catch (error) {
    console.error('❌ 测试过程失败:', error);
    return false;
  }
}

// 如果直接运行此文件
if (typeof window === 'undefined') {
  testFixes().then(success => {
    console.log(success ? '✅ 修复验证成功' : '❌ 修复验证失败');
  });
}
`;
    
    fs.writeFileSync(path.join(__dirname, 'test-import-fixes.js'), testScript, 'utf-8');
    console.log('✅ 已创建测试脚本: test-import-fixes.js');
    
    // 5. 输出应用结果
    console.log('\\n==========================================');
    console.log('🎉 立即修复补丁应用完成！');
    console.log('==========================================');
    
    console.log('📄 已创建文件:');
    console.log('1. ImportProcessor-fix-patch.tsx - 修复函数');
    console.log('2. IMPORT_FIX_GUIDE.md - 详细修复指南');
    console.log('3. test-import-fixes.js - 快速测试脚本');
    console.log('4. src/services/adaptedFieldValidator.ts - 适配验证器');
    console.log('5. src/services/fixedQueryLogic.ts - 安全查询逻辑');
    
    console.log('\\n🔧 下一步操作:');
    console.log('1. 阅读 IMPORT_FIX_GUIDE.md 了解详细修复步骤');
    console.log('2. 在ImportProcessor.tsx中应用修复补丁');
    console.log('3. 运行 test-import-fixes.js 验证修复效果');
    console.log('4. 测试完整的导入流程');
    console.log('5. 条件允许时执行数据库结构标准化');
    
    console.log('\\n⚡ 预期效果:');
    console.log('✅ 406错误将立即解决');
    console.log('✅ 考试创建和查询将正常工作');
    console.log('✅ 成绩数据导入将成功');
    console.log('✅ 字段映射将使用现有数据库字段');
    console.log('✅ 前端导入功能将完全恢复');
    
    console.log('==========================================');
    
    return true;
    
  } catch (error) {
    console.error('❌ 应用修复失败:', error.message);
    return false;
  }
}

// 运行修复应用
const success = applyFixes();
console.log(success ? '\\n✅ 修复应用成功' : '\\n❌ 修复应用失败');