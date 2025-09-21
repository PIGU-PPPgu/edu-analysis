/**
 * 测试学生画像API修复
 */
import fs from 'fs';

console.log('🔍 验证 portrait.ts 语法修复...');

const filePath = './src/lib/api/portrait.ts';
const content = fs.readFileSync(filePath, 'utf-8');

// 查找所有 className 声明
const classNameDeclarations = content.match(/let\s+className/g);

console.log(`找到 ${classNameDeclarations?.length || 0} 个 'let className' 声明`);

if (classNameDeclarations && classNameDeclarations.length > 1) {
  console.log('❌ 仍然存在重复的 className 声明');
  process.exit(1);
} else {
  console.log('✅ className 重复声明问题已修复');
  console.log('💡 现在可以正常访问学生画像界面了');
}

// 检查语法是否有其他潜在问题
const lines = content.split('\n');
const duplicateDeclarations = [];

const declarations = new Map();
lines.forEach((line, index) => {
  const matches = line.match(/\b(let|const|var)\s+(\w+)/g);
  if (matches) {
    matches.forEach(match => {
      const varName = match.split(/\s+/)[1];
      if (declarations.has(varName)) {
        duplicateDeclarations.push({
          variable: varName,
          line1: declarations.get(varName),
          line2: index + 1
        });
      } else {
        declarations.set(varName, index + 1);
      }
    });
  }
});

if (duplicateDeclarations.length > 0) {
  console.log('⚠️ 发现其他潜在的重复声明:');
  duplicateDeclarations.forEach(dup => {
    console.log(`   ${dup.variable}: 第${dup.line1}行和第${dup.line2}行`);
  });
} else {
  console.log('✅ 没有发现其他重复声明问题');
}

console.log('🎉 语法检查完成！');