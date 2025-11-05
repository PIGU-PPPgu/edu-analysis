/**
 * 代码质量和架构深度分析
 */
import fs from 'fs';
import path from 'path';

class CodeQualityAnalyzer {
  constructor() {
    this.issues = [];
    this.strengths = [];
    this.suggestions = [];
    this.metrics = {
      totalFiles: 0,
      totalLines: 0,
      duplicateCode: 0,
      complexFunctions: 0,
      missingErrorHandling: 0
    };
  }

  addIssue(category, severity, file, description, impact, solution) {
    this.issues.push({ category, severity, file, description, impact, solution });
  }

  addStrength(category, file, description, value) {
    this.strengths.push({ category, file, description, value });
  }

  addSuggestion(category, priority, description, benefit) {
    this.suggestions.push({ category, priority, description, benefit });
  }

  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const fileName = path.basename(filePath);
      
      this.metrics.totalFiles++;
      this.metrics.totalLines += lines.length;

      // 1. 检查函数复杂度
      this.analyzeFunctionComplexity(content, fileName);
      
      // 2. 检查错误处理
      this.analyzeErrorHandling(content, fileName);
      
      // 3. 检查代码结构
      this.analyzeCodeStructure(content, fileName);
      
      // 4. 检查性能问题
      this.analyzePerformanceIssues(content, fileName);
      
      // 5. 检查类型安全
      this.analyzeTypeSafety(content, fileName);

    } catch (error) {
      this.addIssue('文件访问', 'LOW', filePath, `无法读取文件: ${error.message}`, 
        '影响代码质量分析完整性', '检查文件权限');
    }
  }

  analyzeFunctionComplexity(content, fileName) {
    // 检查过长的函数
    const functionMatches = content.match(/(?:function\s+\w+|const\s+\w+\s*=.*?=>|\w+\s*\([^)]*\)\s*{)/g) || [];
    
    if (functionMatches.length > 20) {
      this.addIssue('代码结构', 'MEDIUM', fileName, 
        `函数数量过多 (${functionMatches.length}个)`, 
        '文件过于复杂，难以维护', '考虑拆分为多个模块');
    }

    // 检查嵌套深度
    const maxNesting = this.calculateMaxNesting(content);
    if (maxNesting > 5) {
      this.addIssue('代码复杂度', 'MEDIUM', fileName,
        `嵌套层级过深 (${maxNesting}层)`,
        '代码难以理解和维护', '重构复杂逻辑，减少嵌套');
      this.metrics.complexFunctions++;
    }

    // 检查超长行
    const longLines = content.split('\n').filter(line => line.length > 120).length;
    if (longLines > 10) {
      this.addIssue('代码风格', 'LOW', fileName,
        `${longLines}行代码过长`,
        '影响代码可读性', '分割长行或提取变量');
    }
  }

  analyzeErrorHandling(content, fileName) {
    const asyncFunctions = (content.match(/async\s+\w+/g) || []).length;
    const tryBlocks = (content.match(/try\s*{/g) || []).length;
    const errorHandling = (content.match(/catch\s*\([^)]*\)/g) || []).length;

    if (asyncFunctions > 0 && tryBlocks === 0) {
      this.addIssue('错误处理', 'HIGH', fileName,
        '异步函数缺少错误处理',
        '可能导致未捕获的Promise异常', '添加try-catch块或.catch()处理');
      this.metrics.missingErrorHandling++;
    }

    if (tryBlocks > errorHandling) {
      this.addIssue('错误处理', 'MEDIUM', fileName,
        'try块没有对应的catch处理',
        '错误可能未被适当处理', '确保每个try块都有相应的catch');
    }

    // 检查是否有良好的错误处理
    if (content.includes('showError') || content.includes('handleError') || 
        content.includes('toast.error')) {
      this.addStrength('错误处理', fileName, '实现了用户友好的错误提示', 
        '提升用户体验');
    }
  }

  analyzeCodeStructure(content, fileName) {
    // 检查导入语句组织
    const imports = content.match(/^import\s+.+$/gm) || [];
    if (imports.length > 15) {
      this.addSuggestion('代码组织', 'LOW', 
        `${fileName} 导入过多依赖 (${imports.length}个)`,
        '考虑模块化或按需导入以减少bundle大小');
    }

    // 检查是否有重复代码
    const functionBodies = content.match(/{[\s\S]*?}/g) || [];
    const duplicatePatterns = this.findDuplicatePatterns(functionBodies);
    if (duplicatePatterns.length > 0) {
      this.addIssue('代码重复', 'MEDIUM', fileName,
        `发现${duplicatePatterns.length}处可能的重复代码`,
        '增加维护成本', '提取公共函数或组件');
      this.metrics.duplicateCode += duplicatePatterns.length;
    }

    // 检查组件设计
    if (fileName.includes('.tsx') || fileName.includes('.jsx')) {
      this.analyzeReactComponent(content, fileName);
    }
  }

  analyzeReactComponent(content, fileName) {
    // 检查组件大小
    const componentLines = content.split('\n').length;
    if (componentLines > 300) {
      this.addIssue('组件设计', 'MEDIUM', fileName,
        `组件过大 (${componentLines}行)`,
        '难以测试和维护', '拆分为更小的子组件');
    }

    // 检查Hook使用
    const hookUsage = content.match(/use[A-Z]\w+/g) || [];
    if (hookUsage.length > 8) {
      this.addSuggestion('React设计', 'MEDIUM',
        `${fileName} 使用过多Hook (${hookUsage.length}个)`,
        '考虑使用自定义Hook或状态管理库');
    }

    // 检查memo使用
    if (content.includes('React.memo') || content.includes('memo(')) {
      this.addStrength('性能优化', fileName, '使用了React.memo优化渲染', 
        '避免不必要的重渲染');
    }

    // 检查useCallback/useMemo使用
    if (content.includes('useCallback') || content.includes('useMemo')) {
      this.addStrength('性能优化', fileName, '使用了React性能优化Hook', 
        '优化计算和回调性能');
    }
  }

  analyzePerformanceIssues(content, fileName) {
    // 检查循环中的函数调用
    if (content.match(/for\s*\([^)]*\)\s*{[\s\S]*?supabase/g) ||
        content.match(/forEach[\s\S]*?supabase/g)) {
      this.addIssue('性能问题', 'HIGH', fileName,
        '循环中包含数据库调用',
        '可能导致N+1查询问题', '使用批量查询或缓存策略');
    }

    // 检查大量DOM操作
    if ((content.match(/document\./g) || []).length > 10) {
      this.addIssue('性能问题', 'MEDIUM', fileName,
        '过多DOM直接操作',
        '可能影响渲染性能', '考虑使用React状态管理');
    }

    // 检查缓存使用
    if (content.includes('cache') || content.includes('Cache') || content.includes('缓存')) {
      this.addStrength('性能优化', fileName, '实现了缓存机制', 
        '提升数据获取效率');
    }
  }

  analyzeTypeSafety(content, fileName) {
    if (fileName.includes('.ts') || fileName.includes('.tsx')) {
      // 检查any类型使用
      const anyUsage = (content.match(/:\s*any/g) || []).length;
      if (anyUsage > 5) {
        this.addIssue('类型安全', 'MEDIUM', fileName,
          `过多使用any类型 (${anyUsage}处)`,
          '失去TypeScript类型检查优势', '定义具体的类型接口');
      }

      // 检查interface定义
      const interfaces = (content.match(/interface\s+\w+/g) || []).length;
      if (interfaces > 0) {
        this.addStrength('类型安全', fileName, `定义了${interfaces}个类型接口`, 
          '提供良好的类型支持');
      }

      // 检查类型断言
      const assertions = (content.match(/as\s+\w+/g) || []).length;
      if (assertions > 10) {
        this.addSuggestion('类型安全', 'MEDIUM',
          `${fileName} 过多类型断言 (${assertions}处)`,
          '考虑改进类型定义以减少断言');
      }
    }
  }

  calculateMaxNesting(content) {
    let maxNesting = 0;
    let currentNesting = 0;
    
    for (let char of content) {
      if (char === '{') currentNesting++;
      if (char === '}') currentNesting--;
      maxNesting = Math.max(maxNesting, currentNesting);
    }
    
    return maxNesting;
  }

  findDuplicatePatterns(functionBodies) {
    const duplicates = [];
    const patterns = {};
    
    functionBodies.forEach(body => {
      if (body.length > 50) { // 只检查较长的代码块
        const normalized = body.replace(/\s+/g, ' ').trim();
        if (patterns[normalized]) {
          patterns[normalized]++;
        } else {
          patterns[normalized] = 1;
        }
      }
    });
    
    Object.entries(patterns).forEach(([pattern, count]) => {
      if (count > 1) {
        duplicates.push({ pattern: pattern.substring(0, 100) + '...', count });
      }
    });
    
    return duplicates;
  }

  analyzeKeyFiles() {
    console.log('🔍 分析关键文件...\n');
    
    const keyFiles = [
      'src/pages/ClassManagement.tsx',
      'src/components/portrait/StudentCard.tsx',
      'src/lib/api/portrait.ts',
      'src/services/classService.ts',
      'src/components/class/OverviewTab.tsx',
      'src/services/intelligentPortraitService.ts'
    ];

    keyFiles.forEach(file => {
      const fullPath = `/Users/iguppp/Library/Mobile Documents/com~apple~CloudDocs/代码备份/figma-frame-faithful-front/${file}`;
      if (fs.existsSync(fullPath)) {
        console.log(`📁 分析 ${file}...`);
        this.analyzeFile(fullPath);
      } else {
        console.log(`⚠️ 文件不存在: ${file}`);
      }
    });
  }

  generateDetailedReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 代码质量分析报告');
    console.log('='.repeat(80));

    // 代码指标
    console.log('\n📈 代码指标:');
    console.log('-'.repeat(50));
    console.log(`📂 分析文件数: ${this.metrics.totalFiles}`);
    console.log(`📏 总代码行数: ${this.metrics.totalLines}`);
    console.log(`🔄 重复代码段: ${this.metrics.duplicateCode}`);
    console.log(`🏗️ 复杂函数: ${this.metrics.complexFunctions}`);
    console.log(`⚠️ 缺失错误处理: ${this.metrics.missingErrorHandling}`);

    // 代码质量评分
    let qualityScore = 100;
    qualityScore -= this.issues.filter(i => i.severity === 'HIGH').length * 15;
    qualityScore -= this.issues.filter(i => i.severity === 'MEDIUM').length * 10;
    qualityScore -= this.issues.filter(i => i.severity === 'LOW').length * 5;
    qualityScore += this.strengths.length * 5;
    qualityScore = Math.max(0, Math.min(100, qualityScore));

    console.log(`\n🎯 代码质量评分: ${qualityScore}/100`);
    
    if (qualityScore >= 85) {
      console.log('✅ 优秀 - 代码质量很高，可以直接投入生产');
    } else if (qualityScore >= 70) {
      console.log('✅ 良好 - 代码质量不错，少量优化后可投入生产');
    } else if (qualityScore >= 55) {
      console.log('⚠️ 一般 - 需要一些改进，建议优化后再投入生产');
    } else {
      console.log('❌ 需改进 - 代码质量较差，需要重构部分代码');
    }

    // 按严重程度分类问题
    if (this.issues.length > 0) {
      console.log('\n❌ 代码问题:');
      console.log('-'.repeat(50));
      
      const issuesBySeverity = {
        HIGH: this.issues.filter(i => i.severity === 'HIGH'),
        MEDIUM: this.issues.filter(i => i.severity === 'MEDIUM'),
        LOW: this.issues.filter(i => i.severity === 'LOW')
      };

      Object.entries(issuesBySeverity).forEach(([severity, issues]) => {
        if (issues.length > 0) {
          console.log(`\n🔴 ${severity} 级问题 (${issues.length}个):`);
          issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. [${issue.file}] ${issue.description}`);
            console.log(`      分类: ${issue.category}`);
            console.log(`      影响: ${issue.impact}`);
            console.log(`      解决: ${issue.solution}\n`);
          });
        }
      });
    }

    // 代码优势
    if (this.strengths.length > 0) {
      console.log('\n✅ 代码优势:');
      console.log('-'.repeat(50));
      
      const strengthsByCategory = {};
      this.strengths.forEach(strength => {
        if (!strengthsByCategory[strength.category]) {
          strengthsByCategory[strength.category] = [];
        }
        strengthsByCategory[strength.category].push(strength);
      });

      Object.entries(strengthsByCategory).forEach(([category, strengths]) => {
        console.log(`\n💚 ${category} (${strengths.length}个):`);
        strengths.forEach((strength, index) => {
          console.log(`   ${index + 1}. [${strength.file}] ${strength.description}`);
          console.log(`      价值: ${strength.value}\n`);
        });
      });
    }

    // 改进建议
    if (this.suggestions.length > 0) {
      console.log('\n💡 优化建议:');
      console.log('-'.repeat(50));
      
      const suggestionsByPriority = {
        HIGH: this.suggestions.filter(s => s.priority === 'HIGH'),
        MEDIUM: this.suggestions.filter(s => s.priority === 'MEDIUM'),
        LOW: this.suggestions.filter(s => s.priority === 'LOW')
      };

      Object.entries(suggestionsByPriority).forEach(([priority, suggestions]) => {
        if (suggestions.length > 0) {
          console.log(`\n🔵 ${priority} 优先级 (${suggestions.length}个):`);
          suggestions.forEach((suggestion, index) => {
            console.log(`   ${index + 1}. [${suggestion.category}] ${suggestion.description}`);
            console.log(`      收益: ${suggestion.benefit}\n`);
          });
        }
      });
    }

    // 架构建议
    console.log('\n🏗️ 架构建议:');
    console.log('-'.repeat(50));
    
    if (this.metrics.totalLines > 10000) {
      console.log('📦 考虑微前端架构 - 代码量较大，可考虑模块化拆分');
    }
    
    if (this.metrics.duplicateCode > 5) {
      console.log('🔄 建立公共组件库 - 减少代码重复，提升维护效率');
    }
    
    if (this.issues.filter(i => i.category === '性能问题').length > 0) {
      console.log('⚡ 性能优化策略 - 建立性能监控和优化流程');
    }
    
    console.log('🧪 单元测试覆盖 - 建议添加关键功能的单元测试');
    console.log('📚 文档完善 - 建议补充API文档和组件文档');
    console.log('🔒 安全审查 - 定期进行安全漏洞检查');
  }
}

async function runCodeQualityAnalysis() {
  console.log('🚀 开始代码质量分析...\n');
  
  const analyzer = new CodeQualityAnalyzer();
  
  try {
    analyzer.analyzeKeyFiles();
    analyzer.generateDetailedReport();
    
  } catch (error) {
    console.error('❌ 代码质量分析过程中出现异常:', error);
  }
}

runCodeQualityAnalysis().catch(console.error);