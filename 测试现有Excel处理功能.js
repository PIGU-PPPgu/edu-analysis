#!/usr/bin/env node

/**
 * 测试现有Excel处理功能
 * 验证项目中的智能文件解析器和数据去重功能
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 测试现有Excel处理功能');
console.log('================================');

// 1. 检查关键文件是否存在
console.log('📁 1. 检查关键文件...');

const keyFiles = [
  'src/services/intelligentFileParser.ts',
  'src/services/gradeAnalysisService.ts', 
  'src/components/analysis/core/grade-importer/',
  'src/utils/fileParsingUtils.ts',
  'src/lib/export-utils.ts'
];

keyFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file} - 存在`);
  } else {
    console.log(`❌ ${file} - 不存在`);
  }
});

// 2. 检查package.json中的Excel相关依赖
console.log('\n📦 2. 检查Excel处理依赖...');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const excelDeps = [
    'xlsx',
    'papaparse',
    '@types/papaparse'
  ];
  
  excelDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep} - v${dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep} - 未安装`);
    }
  });
  
} catch (error) {
  console.log('❌ 无法读取package.json');
}

// 3. 检查测试文件
console.log('\n📄 3. 检查测试文件...');

const testFiles = [
  '907九下月考成绩.csv',
  'test_grades.csv',
  'test_upload.csv'
];

testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`✅ ${file} - ${stats.size} 字节`);
  } else {
    console.log(`❌ ${file} - 不存在`);
  }
});

// 4. 分析智能文件解析器的功能
console.log('\n🔍 4. 分析智能文件解析器功能...');

try {
  const parserContent = fs.readFileSync('src/services/intelligentFileParser.ts', 'utf8');
  
  // 检查支持的文件格式
  const formatMatches = parserContent.match(/case\s+['"]([^'"]+)['"]/g);
  if (formatMatches) {
    console.log('支持的文件格式:');
    formatMatches.forEach(match => {
      const format = match.match(/['"]([^'"]+)['"]/)[1];
      console.log(`  - ${format}`);
    });
  }
  
  // 检查科目识别模式
  const subjectPatterns = parserContent.match(/pattern:\s*\/([^\/]+)\/i,\s*subject:\s*['"]([^'"]+)['"]/g);
  if (subjectPatterns) {
    console.log('\n支持的科目识别:');
    subjectPatterns.slice(0, 5).forEach(pattern => {
      const matches = pattern.match(/subject:\s*['"]([^'"]+)['"]/);
      if (matches) {
        console.log(`  - ${matches[1]}`);
      }
    });
    if (subjectPatterns.length > 5) {
      console.log(`  ... 还有 ${subjectPatterns.length - 5} 个科目`);
    }
  }
  
} catch (error) {
  console.log('❌ 无法分析智能文件解析器');
}

// 5. 分析数据去重功能
console.log('\n🔄 5. 分析数据去重功能...');

try {
  const gradeServiceContent = fs.readFileSync('src/services/gradeAnalysisService.ts', 'utf8');
  
  // 检查合并策略
  const mergeStrategies = gradeServiceContent.match(/type\s+MergeStrategy\s*=\s*([^;]+);/);
  if (mergeStrategies) {
    console.log('支持的合并策略:');
    const strategies = mergeStrategies[1].match(/'([^']+)'/g);
    if (strategies) {
      strategies.forEach(strategy => {
        console.log(`  - ${strategy.replace(/'/g, '')}`);
      });
    }
  }
  
  // 检查重复数据检测
  const duplicateChecks = gradeServiceContent.match(/重复数据|duplicate|去重/gi);
  if (duplicateChecks) {
    console.log(`\n重复数据处理: 发现 ${duplicateChecks.length} 处相关代码`);
  }
  
} catch (error) {
  console.log('❌ 无法分析数据去重功能');
}

// 6. 检查导入组件
console.log('\n🎨 6. 检查导入组件...');

const importerPath = 'src/components/analysis/core/grade-importer';
if (fs.existsSync(importerPath)) {
  const files = fs.readdirSync(importerPath, { recursive: true });
  const componentFiles = files.filter(file => file.endsWith('.tsx') || file.endsWith('.ts'));
  
  console.log(`发现 ${componentFiles.length} 个组件文件:`);
  componentFiles.slice(0, 8).forEach(file => {
    console.log(`  - ${file}`);
  });
  if (componentFiles.length > 8) {
    console.log(`  ... 还有 ${componentFiles.length - 8} 个文件`);
  }
} else {
  console.log('❌ 导入组件目录不存在');
}

// 7. 生成功能测试建议
console.log('\n💡 7. 功能测试建议...');

console.log(`
基于分析结果，建议进行以下测试：

📊 Excel文件处理测试:
  1. 创建包含学生成绩的Excel文件 (.xlsx)
  2. 测试包含合并单元格的Excel文件
  3. 测试包含公式的Excel文件
  4. 测试不同编码的CSV文件

🔄 数据去重测试:
  1. 上传包含重复学生记录的文件
  2. 测试不同的合并策略 (replace, update, skip, append)
  3. 验证学生匹配算法的准确性
  4. 测试跨文件的重复数据处理

🎯 用户体验测试:
  1. 测试文件上传流程的用户友好性
  2. 验证错误提示和恢复建议
  3. 测试进度指示和反馈机制
  4. 验证移动端兼容性

🚀 性能测试:
  1. 测试大文件处理能力 (1000+ 行数据)
  2. 验证内存使用情况
  3. 测试并发文件处理
  4. 验证处理速度和响应时间
`);

// 8. 创建简单的Excel测试文件
console.log('\n📝 8. 创建测试数据...');

const testData = `学号,姓名,班级,语文,数学,英语,总分
108110907001,张三,初三1班,85,90,88,263
108110907002,李四,初三1班,78,85,82,245
108110907003,王五,初三2班,92,88,90,270
108110907001,张三,初三1班,87,92,89,268
108110907004,赵六,初三2班,80,83,85,248`;

fs.writeFileSync('test_excel_data.csv', testData, 'utf8');
console.log('✅ 创建测试文件: test_excel_data.csv');
console.log('   - 包含5条记录，其中1条重复数据');
console.log('   - 可用于测试数据去重功能');

console.log('\n🎉 测试准备完成！');
console.log('================================');
console.log('下一步建议:');
console.log('1. 启动开发服务器: npm run dev');
console.log('2. 访问成绩导入页面');
console.log('3. 上传 test_excel_data.csv 测试去重功能');
console.log('4. 验证Excel文件处理能力'); 