/**
 * 系统深度分析测试 - 班级管理和学生画像
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

class SystemAnalyzer {
  constructor() {
    this.issues = [];
    this.strengths = [];
    this.suggestions = [];
  }

  addIssue(category, severity, description, impact, solution) {
    this.issues.push({ category, severity, description, impact, solution });
  }

  addStrength(category, description, value) {
    this.strengths.push({ category, description, value });
  }

  addSuggestion(category, priority, description, benefit) {
    this.suggestions.push({ category, priority, description, benefit });
  }

  async analyzeDataConsistency() {
    console.log('🔍 数据一致性分析...\n');
    
    try {
      // 1. 检查表之间的关联一致性
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, name, class_id')
        .limit(10);

      const { data: grades, error: gradeError } = await supabase
        .from('grade_data_new')  
        .select('student_id, name, class_name')
        .limit(10);

      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .limit(10);

      if (studentError || gradeError || classError) {
        this.addIssue('数据访问', 'HIGH', '基础数据表查询失败', 
          '系统核心功能无法正常运行', '检查数据库权限和表结构');
        return;
      }

      // 2. 分析数据关联问题
      const studentIdMismatch = [];
      const classMismatch = [];

      if (students && grades) {
        grades.forEach(grade => {
          const matchingStudent = students.find(s => s.student_id === grade.student_id);
          if (!matchingStudent) {
            studentIdMismatch.push(grade.student_id);
          } else if (matchingStudent.name !== grade.name) {
            // 姓名不匹配问题
            console.log(`⚠️ 姓名不匹配: ${matchingStudent.name} vs ${grade.name}`);
          }
        });
      }

      console.log(`✅ 学生数据表: ${students?.length || 0} 条记录`);
      console.log(`✅ 成绩数据表: ${grades?.length || 0} 条记录`);
      console.log(`✅ 班级数据表: ${classes?.length || 0} 条记录`);

      if (studentIdMismatch.length > 0) {
        this.addIssue('数据一致性', 'MEDIUM', 
          `${studentIdMismatch.length}个成绩记录找不到对应学生`, 
          '学生画像数据不完整', '清理孤立的成绩记录或补充学生信息');
      } else {
        this.addStrength('数据一致性', '学生-成绩关联完整', '数据关联性良好');
      }

    } catch (error) {
      this.addIssue('系统稳定性', 'HIGH', `数据一致性检查异常: ${error.message}`, 
        '系统可能存在严重问题', '检查数据库连接和表结构');
    }
  }

  async analyzePerformanceIssues() {
    console.log('\n⚡ 性能分析...\n');
    
    try {
      // 1. 检查大表查询性能
      const startTime = Date.now();
      
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_data_new')
        .select('student_id, class_name, total_score')
        .limit(100);

      const queryTime = Date.now() - startTime;
      
      console.log(`📊 成绩数据查询时间: ${queryTime}ms`);

      if (queryTime > 2000) {
        this.addIssue('性能优化', 'MEDIUM', '大表查询响应慢', 
          '用户体验差，页面加载慢', '添加数据库索引，优化查询语句');
      } else if (queryTime > 500) {
        this.addSuggestion('性能优化', 'MEDIUM', '查询性能可优化', 
          '提升用户体验，减少等待时间');
      } else {
        this.addStrength('性能', '数据库查询响应快', `${queryTime}ms内完成查询`);
      }

      // 2. 检查数据量规模
      const { count: totalGrades } = await supabase
        .from('grade_data_new')
        .select('*', { count: 'exact', head: true });

      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      console.log(`📈 数据规模: ${totalStudents || 0} 学生, ${totalGrades || 0} 成绩记录`);

      if ((totalGrades || 0) > 10000) {
        this.addSuggestion('架构设计', 'LOW', '考虑数据分区策略', 
          '支持更大规模数据，提升长期性能');
      }

      this.addStrength('数据规模', '数据量充足', `${totalGrades || 0}条成绩记录支持完整分析`);

    } catch (error) {
      this.addIssue('性能测试', 'HIGH', `性能分析失败: ${error.message}`, 
        '无法评估系统性能', '检查数据库连接和查询权限');
    }
  }

  async analyzeFunctionalCompleteness() {
    console.log('\n🎯 功能完整性分析...\n');
    
    try {
      // 1. 检查关键功能表的存在性
      const criticalTables = [
        'students', 'grade_data_new', 'classes', 'homework', 
        'warning_rules', 'warning_records', 'knowledge_points'
      ];

      for (const table of criticalTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (error) {
            this.addIssue('功能完整性', 'HIGH', `${table}表访问失败`, 
              '相关功能可能无法使用', '检查表权限配置');
          } else {
            console.log(`✅ ${table}表正常`);
          }
        } catch (err) {
          this.addIssue('功能完整性', 'HIGH', `${table}表不存在或无权限`, 
            '核心功能缺失', '创建缺失的表或配置权限');
        }
      }

      // 2. 检查数据完整性
      const { data: classWithoutGrades, error } = await supabase
        .from('classes')
        .select('name')
        .not('name', 'in', 
          supabase.from('grade_data_new').select('class_name'));

      if (error) {
        console.log('⚠️ 无法检查班级-成绩关联性');
      }

      // 3. 检查预警系统
      const { data: warningRules, error: warningError } = await supabase
        .from('warning_rules')
        .select('*')
        .eq('is_active', true);

      if (warningError) {
        this.addIssue('预警系统', 'MEDIUM', '预警规则查询失败', 
          '预警功能可能异常', '检查预警系统配置');
      } else {
        console.log(`✅ 预警系统: ${warningRules?.length || 0} 条活跃规则`);
        
        if ((warningRules?.length || 0) === 0) {
          this.addIssue('预警系统', 'MEDIUM', '无活跃预警规则', 
            '系统无法自动预警', '配置基础预警规则');
        } else {
          this.addStrength('预警系统', '预警规则完善', `${warningRules.length}条规则覆盖各种风险`);
        }
      }

    } catch (error) {
      this.addIssue('系统检查', 'HIGH', `功能完整性分析异常: ${error.message}`, 
        '无法全面评估系统状态', '系统环境检查');
    }
  }

  async analyzeUserExperience() {
    console.log('\n👥 用户体验分析...\n');
    
    try {
      // 1. 数据可视化评估
      const { data: sampleGrades, error } = await supabase
        .from('grade_data_new')
        .select('class_name, total_score, chinese_score, math_score, english_score')
        .not('total_score', 'is', null)
        .limit(20);

      if (!error && sampleGrades && sampleGrades.length > 0) {
        const scoreRanges = {
          excellent: sampleGrades.filter(g => g.total_score >= 450).length,
          good: sampleGrades.filter(g => g.total_score >= 400 && g.total_score < 450).length,
          average: sampleGrades.filter(g => g.total_score >= 350 && g.total_score < 400).length,
          poor: sampleGrades.filter(g => g.total_score < 350).length
        };

        console.log(`📊 成绩分布样本 (${sampleGrades.length}条):`);
        console.log(`   优秀(450+): ${scoreRanges.excellent}人`);
        console.log(`   良好(400-449): ${scoreRanges.good}人`);
        console.log(`   一般(350-399): ${scoreRanges.average}人`);
        console.log(`   待提升(<350): ${scoreRanges.poor}人`);

        if (scoreRanges.excellent + scoreRanges.good > sampleGrades.length * 0.6) {
          this.addStrength('数据质量', '学生整体表现良好', '60%以上学生成绩优良');
        }

        // 检查数据是否支持多维分析
        const subjects = ['chinese_score', 'math_score', 'english_score'];
        const validSubjectData = subjects.reduce((count, subject) => {
          const validCount = sampleGrades.filter(g => g[subject] != null).length;
          return count + (validCount > sampleGrades.length * 0.8 ? 1 : 0);
        }, 0);

        if (validSubjectData >= 3) {
          this.addStrength('功能支持', '支持多科目分析', '各科目数据完整度高');
        } else {
          this.addIssue('数据质量', 'MEDIUM', '部分科目数据不完整', 
            '影响多维度分析效果', '完善科目成绩数据录入');
        }
      }

      // 2. 系统易用性评估
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('name, grade')
        .order('grade')
        .order('name');

      if (!classError && classes) {
        const gradeGroups = {};
        classes.forEach(cls => {
          gradeGroups[cls.grade] = (gradeGroups[cls.grade] || 0) + 1;
        });

        console.log(`📚 年级班级分布:`);
        Object.entries(gradeGroups).forEach(([grade, count]) => {
          console.log(`   ${grade}: ${count}个班级`);
        });

        if (Object.keys(gradeGroups).length > 1) {
          this.addStrength('系统架构', '支持多年级管理', '数据组织结构合理');
        }

        if (classes.length > 20) {
          this.addSuggestion('用户体验', 'LOW', '班级较多，建议添加筛选功能', 
            '提升大规模班级管理的操作效率');
        }
      }

    } catch (error) {
      this.addIssue('用户体验', 'MEDIUM', `用户体验分析异常: ${error.message}`, 
        '无法评估用户体验质量', '检查前端与后端的数据交互');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 系统分析报告');
    console.log('='.repeat(80));

    // 问题汇总
    if (this.issues.length > 0) {
      console.log('\n❌ 发现的问题:');
      console.log('-'.repeat(50));
      
      const issuesBySeverity = {
        HIGH: this.issues.filter(i => i.severity === 'HIGH'),
        MEDIUM: this.issues.filter(i => i.severity === 'MEDIUM'),
        LOW: this.issues.filter(i => i.severity === 'LOW')
      };

      Object.entries(issuesBySeverity).forEach(([severity, issuesForSeverity]) => {
        if (issuesForSeverity.length > 0) {
          console.log(`\n🔴 ${severity} 级问题 (${issuesForSeverity.length}个):`);
          issuesForSeverity.forEach((issue, index) => {
            console.log(`   ${index + 1}. [${issue.category}] ${issue.description}`);
            console.log(`      影响: ${issue.impact}`);
            console.log(`      建议: ${issue.solution}\n`);
          });
        }
      });
    }

    // 系统优势
    if (this.strengths.length > 0) {
      console.log('\n✅ 系统优势:');
      console.log('-'.repeat(50));
      this.strengths.forEach((strength, index) => {
        console.log(`   ${index + 1}. [${strength.category}] ${strength.description}`);
        console.log(`      价值: ${strength.value}\n`);
      });
    }

    // 改进建议
    if (this.suggestions.length > 0) {
      console.log('\n💡 改进建议:');
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
            console.log(`      预期收益: ${suggestion.benefit}\n`);
          });
        }
      });
    }

    // 总体评估
    console.log('\n🎯 总体评估:');
    console.log('-'.repeat(50));
    const highIssues = this.issues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM').length;
    
    if (highIssues === 0 && mediumIssues <= 2) {
      console.log('✅ 系统整体健康，可以投入生产使用');
    } else if (highIssues <= 2) {
      console.log('⚠️ 系统基本可用，建议解决关键问题后投入使用');
    } else {
      console.log('❌ 系统存在严重问题，需要优先解决后再使用');
    }

    console.log(`\n📊 统计: ${this.issues.length}个问题, ${this.strengths.length}个优势, ${this.suggestions.length}个建议`);
  }
}

async function runSystemAnalysis() {
  console.log('🚀 开始系统深度分析...\n');
  
  const analyzer = new SystemAnalyzer();
  
  try {
    await analyzer.analyzeDataConsistency();
    await analyzer.analyzePerformanceIssues();
    await analyzer.analyzeFunctionalCompleteness();
    await analyzer.analyzeUserExperience();
    
    analyzer.generateReport();
    
  } catch (error) {
    console.error('❌ 系统分析过程中出现异常:', error);
  }
}

runSystemAnalysis().catch(console.error);