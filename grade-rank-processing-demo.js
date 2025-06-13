/**
 * 等级和排名字段处理演示
 * 展示学生画像系统如何处理成绩数据中的等级和排名信息
 */

// ==================== 1. 数据库字段结构 ====================

const DATABASE_FIELDS = {
  // 基础成绩字段
  score: 'NUMERIC',           // 原始分数
  total_score: 'NUMERIC',     // 总分
  subject_total_score: 'NUMERIC', // 科目满分
  
  // 等级字段 (支持多种等级表示)
  original_grade: 'TEXT',     // 原始等级 (导入时的等级)
  computed_grade: 'TEXT',     // 计算等级 (系统计算的等级)
  grade: 'TEXT',             // 旧版等级字段 (兼容性)
  
  // 排名字段 (支持多层级排名)
  rank_in_class: 'INTEGER',   // 班级排名
  rank_in_grade: 'INTEGER',   // 年级排名
  rank_in_school: 'INTEGER',  // 校内排名
  
  // 统计分析字段
  percentile: 'NUMERIC',      // 百分位数
  z_score: 'NUMERIC'          // 标准化分数
};

// ==================== 2. 字段映射配置 ====================

const FIELD_MAPPING_CONFIG = {
  // 等级字段的多种表示方式
  gradeFields: {
    '等级': 'original_grade',
    '评级': 'original_grade', 
    '成绩等级': 'original_grade',
    '等第': 'original_grade',
    'Grade': 'original_grade',
    'Level': 'original_grade',
    
    // 计算等级
    '计算等级': 'computed_grade',
    '系统等级': 'computed_grade'
  },
  
  // 排名字段的多种表示方式
  rankFields: {
    '班级排名': 'rank_in_class',
    '班排': 'rank_in_class',
    '班内排名': 'rank_in_class',
    'Class Rank': 'rank_in_class',
    
    '年级排名': 'rank_in_grade', 
    '年排': 'rank_in_grade',
    '年级内排名': 'rank_in_grade',
    'Grade Rank': 'rank_in_grade',
    
    '校排名': 'rank_in_school',
    '学校排名': 'rank_in_school',
    '全校排名': 'rank_in_school',
    'School Rank': 'rank_in_school'
  }
};

// ==================== 3. 等级计算规则 ====================

const GRADE_CALCULATION_RULES = {
  // 标准等级计算 (基于分数百分比)
  standard: {
    'A+': { min: 95, max: 100 },
    'A':  { min: 90, max: 94 },
    'A-': { min: 85, max: 89 },
    'B+': { min: 80, max: 84 },
    'B':  { min: 75, max: 79 },
    'B-': { min: 70, max: 74 },
    'C+': { min: 65, max: 69 },
    'C':  { min: 60, max: 64 },
    'C-': { min: 55, max: 59 },
    'D':  { min: 50, max: 54 },
    'F':  { min: 0,  max: 49 }
  },
  
  // 中文等级计算
  chinese: {
    '优秀': { min: 90, max: 100 },
    '良好': { min: 80, max: 89 },
    '中等': { min: 70, max: 79 },
    '及格': { min: 60, max: 69 },
    '不及格': { min: 0, max: 59 }
  },
  
  // 数字等级计算
  numeric: {
    '5': { min: 90, max: 100 },
    '4': { min: 80, max: 89 },
    '3': { min: 70, max: 79 },
    '2': { min: 60, max: 69 },
    '1': { min: 0, max: 59 }
  }
};

// ==================== 4. 数据处理函数 ====================

/**
 * 计算等级
 * @param {number} score - 分数
 * @param {number} totalScore - 满分
 * @param {string} gradeType - 等级类型
 * @returns {string} 等级
 */
function calculateGrade(score, totalScore = 100, gradeType = 'standard') {
  if (!score || score < 0) return null;
  
  const percentage = (score / totalScore) * 100;
  const rules = GRADE_CALCULATION_RULES[gradeType];
  
  for (const [grade, range] of Object.entries(rules)) {
    if (percentage >= range.min && percentage <= range.max) {
      return grade;
    }
  }
  
  return null;
}

/**
 * 计算排名
 * @param {Array} students - 学生数据数组
 * @param {string} scoreField - 分数字段名
 * @param {string} groupField - 分组字段名 (如 class_name)
 * @returns {Array} 带排名的学生数据
 */
function calculateRanking(students, scoreField = 'score', groupField = null) {
  if (groupField) {
    // 按组分别计算排名
    const groups = students.reduce((acc, student) => {
      const group = student[groupField];
      if (!acc[group]) acc[group] = [];
      acc[group].push(student);
      return acc;
    }, {});
    
    const result = [];
    for (const [group, groupStudents] of Object.entries(groups)) {
      const ranked = groupStudents
        .sort((a, b) => (b[scoreField] || 0) - (a[scoreField] || 0))
        .map((student, index) => ({
          ...student,
          [`rank_in_${groupField.replace('_name', '')}`]: index + 1
        }));
      result.push(...ranked);
    }
    
    return result;
  } else {
    // 全体排名
    return students
      .sort((a, b) => (b[scoreField] || 0) - (a[scoreField] || 0))
      .map((student, index) => ({
        ...student,
        rank_in_school: index + 1
      }));
  }
}

/**
 * 处理导入的等级和排名数据
 * @param {Array} rawData - 原始数据
 * @param {Object} fieldMapping - 字段映射
 * @returns {Array} 处理后的数据
 */
function processGradeAndRankData(rawData, fieldMapping) {
  return rawData.map(row => {
    const processedRow = { ...row };
    
    // 1. 处理等级字段
    for (const [originalField, mappedField] of Object.entries(fieldMapping)) {
      if (mappedField.includes('grade') && row[originalField]) {
        processedRow[mappedField] = row[originalField];
        
        // 如果是原始等级，同时计算系统等级
        if (mappedField === 'original_grade' && row.score) {
          processedRow.computed_grade = calculateGrade(
            row.score, 
            row.subject_total_score || 100
          );
        }
      }
      
      // 2. 处理排名字段
      if (mappedField.includes('rank') && row[originalField]) {
        processedRow[mappedField] = parseInt(row[originalField]);
      }
    }
    
    // 3. 如果没有等级但有分数，自动计算等级
    if (!processedRow.original_grade && !processedRow.grade && processedRow.score) {
      processedRow.computed_grade = calculateGrade(
        processedRow.score,
        processedRow.subject_total_score || 100
      );
    }
    
    return processedRow;
  });
}

// ==================== 5. AI解析增强 ====================

const AI_GRADE_RANK_PROMPT = `
你是一个教育数据分析专家，请分析这个成绩表格中的等级和排名字段：

分析要求：
1. 识别等级字段：
   - 字母等级 (A+, A, B+, B, C, D, F)
   - 中文等级 (优秀, 良好, 中等, 及格, 不及格)
   - 数字等级 (5, 4, 3, 2, 1)
   - 其他自定义等级

2. 识别排名字段：
   - 班级排名 (1, 2, 3...)
   - 年级排名 (1, 2, 3...)
   - 学校排名 (1, 2, 3...)

3. 数据一致性检查：
   - 等级与分数是否匹配
   - 排名是否连续且合理
   - 是否存在重复排名

4. 字段映射建议：
   - 推荐最佳字段映射
   - 标识需要特殊处理的字段
   - 提供数据清洗建议

请以JSON格式返回分析结果。
`;

/**
 * AI增强的等级排名分析
 * @param {Array} headers - 表头
 * @param {Array} sampleData - 样本数据
 * @returns {Object} AI分析结果
 */
async function aiEnhancedGradeRankAnalysis(headers, sampleData) {
  // 模拟AI分析结果
  const mockAIResult = {
    gradeFields: {
      detected: ['等级', '评级'],
      mapping: {
        '等级': 'original_grade',
        '评级': 'computed_grade'
      },
      gradeType: 'chinese', // 检测到的等级类型
      consistency: {
        scoreGradeMatch: 0.95, // 分数与等级匹配度
        issues: ['第15行等级与分数不匹配']
      }
    },
    
    rankFields: {
      detected: ['班级排名', '年级排名'],
      mapping: {
        '班级排名': 'rank_in_class',
        '年级排名': 'rank_in_grade'
      },
      consistency: {
        continuity: 0.98, // 排名连续性
        duplicates: 2, // 重复排名数量
        issues: ['班级排名存在跳号', '年级排名有重复']
      }
    },
    
    recommendations: [
      '建议使用original_grade存储导入的等级',
      '建议重新计算班级排名以确保连续性',
      '建议添加computed_grade字段存储系统计算的等级'
    ],
    
    confidence: 0.92
  };
  
  return mockAIResult;
}

// ==================== 6. 实际使用示例 ====================

/**
 * 完整的等级排名处理流程演示
 */
async function demonstrateGradeRankProcessing() {
  console.log('🎯 等级和排名字段处理演示');
  console.log('=====================================\n');
  
  // 1. 模拟导入数据
  const rawData = [
    {
      '学号': '108110907001',
      '姓名': '张三',
      '班级': '初三7班',
      '语文': 85,
      '数学': 92,
      '英语': 78,
      '总分': 255,
      '等级': 'B+',
      '班级排名': 15,
      '年级排名': 45
    },
    {
      '学号': '108110907002', 
      '姓名': '李四',
      '班级': '初三7班',
      '语文': 92,
      '数学': 88,
      '英语': 85,
      '总分': 265,
      '等级': 'A-',
      '班级排名': 12,
      '年级排名': 38
    },
    {
      '学号': '108110907003',
      '姓名': '王五', 
      '班级': '初三8班',
      '语文': 78,
      '数学': 85,
      '英语': 82,
      '总分': 245,
      '等级': 'B',
      '班级排名': 18,
      '年级排名': 52
    }
  ];
  
  console.log('📊 原始数据样本:');
  console.table(rawData);
  
  // 2. AI分析字段
  const headers = Object.keys(rawData[0]);
  const aiAnalysis = await aiEnhancedGradeRankAnalysis(headers, rawData);
  
  console.log('\n🤖 AI字段分析结果:');
  console.log(JSON.stringify(aiAnalysis, null, 2));
  
  // 3. 字段映射
  const fieldMapping = {
    '学号': 'student_id',
    '姓名': 'name',
    '班级': 'class_name',
    '总分': 'total_score',
    '等级': 'original_grade',
    '班级排名': 'rank_in_class',
    '年级排名': 'rank_in_grade'
  };
  
  console.log('\n🗺️ 字段映射配置:');
  console.log(JSON.stringify(fieldMapping, null, 2));
  
  // 4. 处理数据
  const processedData = processGradeAndRankData(rawData, fieldMapping);
  
  console.log('\n✅ 处理后的数据:');
  console.table(processedData.map(row => ({
    student_id: row.student_id,
    name: row.name,
    class_name: row.class_name,
    total_score: row.total_score,
    original_grade: row.original_grade,
    computed_grade: row.computed_grade,
    rank_in_class: row.rank_in_class,
    rank_in_grade: row.rank_in_grade
  })));
  
  // 5. 数据验证
  console.log('\n🔍 数据验证结果:');
  
  const validation = {
    gradeConsistency: processedData.every(row => {
      if (!row.total_score || !row.original_grade) return true;
      const expectedGrade = calculateGrade(row.total_score, 300); // 假设满分300
      return row.original_grade === expectedGrade;
    }),
    
    rankContinuity: (() => {
      const classRanks = processedData
        .filter(row => row.class_name === '初三7班')
        .map(row => row.rank_in_class)
        .sort((a, b) => a - b);
      
      for (let i = 1; i < classRanks.length; i++) {
        if (classRanks[i] - classRanks[i-1] !== 1) {
          return false;
        }
      }
      return true;
    })(),
    
    duplicateRanks: (() => {
      const ranks = processedData.map(row => `${row.class_name}-${row.rank_in_class}`);
      return ranks.length === new Set(ranks).size;
    })()
  };
  
  console.log('等级一致性:', validation.gradeConsistency ? '✅ 通过' : '❌ 失败');
  console.log('排名连续性:', validation.rankContinuity ? '✅ 通过' : '❌ 失败');
  console.log('排名唯一性:', validation.duplicateRanks ? '✅ 通过' : '❌ 失败');
  
  // 6. 数据库存储格式
  console.log('\n💾 数据库存储格式:');
  const dbFormat = processedData.map(row => ({
    student_id: row.student_id,
    name: row.name,
    class_name: row.class_name,
    exam_title: '907九下月考成绩',
    exam_type: '月考',
    exam_date: '2024-05-14',
    total_score: row.total_score,
    original_grade: row.original_grade,
    computed_grade: row.computed_grade,
    rank_in_class: row.rank_in_class,
    rank_in_grade: row.rank_in_grade,
    rank_in_school: null, // 需要全校数据计算
    created_at: new Date().toISOString()
  }));
  
  console.table(dbFormat);
  
  return {
    rawData,
    processedData,
    aiAnalysis,
    validation,
    dbFormat
  };
}

// ==================== 7. 系统集成说明 ====================

const SYSTEM_INTEGRATION_NOTES = `
📋 等级和排名字段处理 - 系统集成说明

1. 🗃️ 数据库层面:
   - grade_data表支持多种等级字段 (original_grade, computed_grade, grade)
   - 支持三级排名 (rank_in_class, rank_in_grade, rank_in_school)
   - 自动索引优化查询性能

2. 🔄 导入流程:
   - FileUploader组件 → AI字段识别 → 字段映射 → 数据验证 → 数据库存储
   - 支持等级和排名的自动识别和映射
   - 提供数据一致性检查和修复建议

3. 🤖 AI增强:
   - 智能识别等级类型 (字母/中文/数字)
   - 自动检测排名字段和层级
   - 提供数据质量评估和改进建议

4. 📊 分析应用:
   - 成绩分析模块可以基于等级进行统计
   - 排名信息用于班级对比和学生进步分析
   - 支持等级分布图表和排名趋势分析

5. 🔧 配置管理:
   - 支持自定义等级计算规则
   - 可配置排名计算策略
   - 提供字段映射模板管理

6. ⚠️ 注意事项:
   - 优先使用original_grade保存导入的等级
   - computed_grade用于系统计算的等级
   - 排名字段需要考虑数据完整性和一致性
   - 支持等级和分数的双向验证
`;

console.log(SYSTEM_INTEGRATION_NOTES);

// 运行演示
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    demonstrateGradeRankProcessing,
    calculateGrade,
    calculateRanking,
    processGradeAndRankData,
    FIELD_MAPPING_CONFIG,
    GRADE_CALCULATION_RULES
  };
} else {
  // 浏览器环境下直接运行演示
  demonstrateGradeRankProcessing().then(result => {
    console.log('\n🎉 演示完成！');
    console.log('详细结果已保存在result对象中');
  });
} 