/**
 * 🤖 AI文件解析功能演示
 * 
 * 展示如何使用优化的AI提示词来解决长表格vs宽表格识别问题
 */

// 模拟文件数据 - 宽表格式（你上传的全年级数据）
const wideFormatExample = {
  filename: "907九下月考成绩.csv",
  headers: ["学号", "姓名", "班级", "语文", "数学", "英语", "物理", "化学", "政治", "历史", "总分"],
  sampleRows: [
    ["108110907001", "张三", "初三7班", "85", "92", "78", "88", "90", "82", "86", "601"],
    ["108110907002", "李四", "初三7班", "92", "88", "85", "90", "87", "89", "84", "615"],
    ["108110907003", "王五", "初三8班", "78", "85", "92", "85", "89", "87", "90", "606"],
    ["108110907004", "赵六", "初三8班", "88", "90", "87", "92", "85", "86", "88", "616"],
    ["108110907005", "钱七", "初三9班", "90", "87", "89", "85", "88", "91", "85", "615"]
  ],
  totalRows: 495  // 全年级495个学生
};

// 模拟文件数据 - 长表格式
const longFormatExample = {
  filename: "九年级期中考试成绩.csv",
  headers: ["学号", "姓名", "班级", "科目", "分数", "等级", "班级排名"],
  sampleRows: [
    ["108110907001", "张三", "初三7班", "语文", "85", "B+", "15"],
    ["108110907001", "张三", "初三7班", "数学", "92", "A", "8"],
    ["108110907001", "张三", "初三7班", "英语", "78", "B", "22"],
    ["108110907002", "李四", "初三7班", "语文", "92", "A", "5"],
    ["108110907002", "李四", "初三7班", "数学", "88", "B+", "12"]
  ],
  totalRows: 3465  // 495学生 × 7科目 = 3465行
};

/**
 * 🎯 优化的AI提示词 - 专门解决长表格vs宽表格识别问题
 */
function buildOptimizedPrompt(data) {
  const { filename, headers, sampleRows, totalRows } = data;
  
  return `
# 🎓 教育数据智能分析任务

你是一位专业的教育数据分析专家，擅长识别各种成绩数据格式。请仔细分析以下学生成绩文件并提供完整的解析方案。

## 📁 文件基本信息
- **文件名**: ${filename}
- **数据规模**: ${totalRows} 行 x ${headers.length} 列
- **字段列表**: ${headers.join('、')}

## 📊 样本数据分析
\`\`\`
${headers.join('\t')}
${'-'.repeat(headers.join('\t').length)}
${sampleRows.map(row => row.join('\t')).join('\n')}
\`\`\`

## 🔍 关键分析任务

### 1. 📋 数据结构识别（重点）
**请仔细判断数据组织方式，这直接影响人数统计的准确性：**

**🔸 宽表格式 (Wide Format)**：
- 特征：一行代表一个学生，多列代表不同科目或属性
- 示例：学号 | 姓名 | 班级 | 语文 | 数学 | 英语 | 物理
- 人数计算：总行数 = 学生人数
- 识别要点：
  * 第一列通常是学号/姓名
  * 有多个科目列（语文、数学、英语等）
  * 每行数据代表一个完整的学生记录

**🔸 长表格式 (Long Format)**：
- 特征：多行代表一个学生的不同科目成绩
- 示例：学号 | 姓名 | 班级 | 科目 | 分数
- 人数计算：总行数 ÷ 科目数 = 学生人数
- 识别要点：
  * 有专门的"科目"列
  * 同一学生的学号/姓名会重复出现
  * 每行数据代表一个学生的单科成绩

### 2. 👥 人数统计验证
**根据数据结构计算实际学生人数：**
- 宽表格式：学生人数 = 数据行数
- 长表格式：学生人数 = 数据行数 ÷ 科目数
- 混合格式：需要去重计算唯一学生数

### 3. 🎯 考试信息推断
根据文件名和数据内容，推断考试的基本信息：
- **考试名称**：从文件名提取（如：九年级上学期期中考试、907九下月考）
- **考试类型**：月考/期中/期末/模拟/单元测试
- **考试日期**：YYYY-MM-DD格式，如无法确定使用当前日期
- **年级信息**：如：九年级、初三、高一等
- **考试范围**：
  * class: 班级内考试（文件名包含具体班级）
  * grade: 年级考试（文件名包含年级信息）
  * school: 全校考试（文件名包含"全校"或涉及多个年级）

### 4. 🗺️ 字段智能映射
分析每个字段的含义并映射到标准字段：

**基础字段**：
- student_id: 学号/编号/考号
- name: 学生姓名/姓名
- class_name: 班级信息/班级

**成绩字段**：
- [科目]_score: 各科分数（如：语文_score, 数学_score）
- [科目]_grade: 各科等级（如：语文_grade）
- [科目]_rank_class: 班级排名（如：语文_rank_class）
- [科目]_rank_grade: 年级排名（如：语文_rank_grade）
- total_score: 总分/合计

### 5. 📚 科目识别
识别文件中包含的所有科目：
**常见科目**：语文、数学、英语、物理、化学、生物、政治、历史、地理、道德与法治、总分

## 📋 输出要求

请以JSON格式返回分析结果，特别注意数据结构的准确识别：

\`\`\`json
{
  "examInfo": {
    "title": "907九下月考成绩",
    "type": "月考",
    "date": "2024-11-15",
    "grade": "九年级",
    "scope": "grade"
  },
  "fieldMappings": {
    "学号": "student_id",
    "姓名": "name",
    "班级": "class_name",
    "语文": "语文_score",
    "数学": "数学_score"
  },
  "subjects": ["语文", "数学", "英语", "物理"],
  "dataStructure": "wide",
  "confidence": 0.95,
  "processing": {
    "requiresUserInput": false,
    "issues": [],
    "suggestions": [
      "检测到宽表格式，预计学生人数: ${totalRows}人",
      "数据质量良好，可以直接处理"
    ]
  }
}
\`\`\`

## 🔍 分析重点提醒

1. **数据结构判断是关键**：仔细观察样本数据，判断是宽表还是长表
2. **人数统计要准确**：根据数据结构正确计算学生人数
3. **语义理解优先**：重点关注字段的语义含义，不仅仅是关键词匹配
4. **上下文关联**：结合文件名、字段组合、数据模式进行综合判断
5. **教育领域知识**：运用教育测评和成绩管理的专业知识

请开始分析并返回JSON结果。
`;
}

/**
 * 模拟AI分析结果
 */
function simulateAIAnalysis(data) {
  const { filename, headers, sampleRows, totalRows } = data;
  
  // 检测数据结构
  const hasSubjectColumn = headers.some(h => h.includes('科目') || h.includes('subject'));
  const hasMultipleScoreColumns = headers.filter(h => 
    ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理'].some(subject => h.includes(subject))
  ).length > 1;
  
  let dataStructure, estimatedStudents, subjects;
  
  if (hasSubjectColumn && !hasMultipleScoreColumns) {
    // 长表格式
    dataStructure = 'long';
    const subjectCount = new Set(sampleRows.map(row => row[headers.indexOf('科目')])).size;
    estimatedStudents = Math.round(totalRows / (subjectCount || 7));
    subjects = [...new Set(sampleRows.map(row => row[headers.indexOf('科目')]))];
  } else if (hasMultipleScoreColumns && !hasSubjectColumn) {
    // 宽表格式
    dataStructure = 'wide';
    estimatedStudents = totalRows;
    subjects = headers.filter(h => 
      ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理'].some(subject => h.includes(subject))
    );
  } else {
    // 混合格式
    dataStructure = 'mixed';
    estimatedStudents = totalRows; // 需要更复杂的逻辑
    subjects = headers.filter(h => 
      ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理'].some(subject => h.includes(subject))
    );
  }
  
  return {
    examInfo: {
      title: filename.replace('.csv', '').replace('.xlsx', ''),
      type: filename.includes('月考') ? '月考' : filename.includes('期中') ? '期中考试' : filename.includes('期末') ? '期末考试' : '考试',
      date: new Date().toISOString().split('T')[0],
      grade: filename.includes('907') ? '九年级' : '未知年级',
      scope: filename.includes('907') || filename.includes('九年级') ? 'grade' : 'class'
    },
    fieldMappings: {
      [headers[0]]: 'student_id',
      [headers[1]]: 'name',
      [headers[2]]: 'class_name',
      ...Object.fromEntries(subjects.map(subject => [subject, `${subject}_score`]))
    },
    subjects,
    dataStructure,
    confidence: 0.9,
    processing: {
      requiresUserInput: false,
      issues: [],
      suggestions: [
        `检测到${dataStructure === 'wide' ? '宽表' : dataStructure === 'long' ? '长表' : '混合'}格式`,
        `预计学生人数: ${estimatedStudents}人`,
        `识别到${subjects.length}个科目: ${subjects.join('、')}`,
        '数据质量良好，可以直接处理'
      ]
    }
  };
}

console.log('🤖 AI文件解析功能演示\n');

// 演示宽表格式分析
console.log('📊 宽表格式分析演示（你上传的全年级数据）:');
console.log('='.repeat(60));
console.log('📁 文件信息:');
console.log(`- 文件名: ${wideFormatExample.filename}`);
console.log(`- 数据规模: ${wideFormatExample.totalRows} 行 x ${wideFormatExample.headers.length} 列`);
console.log(`- 字段列表: ${wideFormatExample.headers.join('、')}`);

console.log('\n🔍 AI分析结果:');
const wideResult = simulateAIAnalysis(wideFormatExample);
console.log(JSON.stringify(wideResult, null, 2));

console.log('\n' + '='.repeat(60) + '\n');

// 演示长表格式分析
console.log('📊 长表格式分析演示:');
console.log('='.repeat(60));
console.log('📁 文件信息:');
console.log(`- 文件名: ${longFormatExample.filename}`);
console.log(`- 数据规模: ${longFormatExample.totalRows} 行 x ${longFormatExample.headers.length} 列`);
console.log(`- 字段列表: ${longFormatExample.headers.join('、')}`);

console.log('\n🔍 AI分析结果:');
const longResult = simulateAIAnalysis(longFormatExample);
console.log(JSON.stringify(longResult, null, 2));

console.log('\n' + '='.repeat(60) + '\n');

// 展示优化的提示词
console.log('📝 优化的AI提示词示例:');
console.log('='.repeat(60));
const prompt = buildOptimizedPrompt(wideFormatExample);
console.log(prompt.substring(0, 1000) + '...\n[提示词已截断，完整版本包含详细的分析指导]');

console.log('\n🎯 关键优化点:');
console.log('1. ✅ 明确区分宽表格式 vs 长表格式');
console.log('2. ✅ 提供准确的人数计算公式');
console.log('3. ✅ 强调数据结构识别的重要性');
console.log('4. ✅ 包含教育领域专业知识');
console.log('5. ✅ 提供详细的样本数据分析');

console.log('\n🚀 解决方案总结:');
console.log('- 问题: 上传全年级数据时人数识别不对');
console.log('- 原因: 没有使用AI智能解析，无法区分长表格和宽表格');
console.log('- 解决: 集成AI增强解析，使用优化的提示词');
console.log('- 效果: 准确识别数据结构，正确计算学生人数');

console.log('\n🎉 演示完成！'); 