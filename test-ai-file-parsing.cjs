const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 模拟文件数据 - 宽表格式
const wideFormatData = {
  filename: "907九下月考成绩.csv",
  headers: ["学号", "姓名", "班级", "语文", "数学", "英语", "物理", "化学", "总分"],
  sampleRows: [
    ["108110907001", "张三", "初三7班", "85", "92", "78", "88", "90", "433"],
    ["108110907002", "李四", "初三7班", "92", "88", "85", "90", "87", "442"],
    ["108110907003", "王五", "初三8班", "78", "85", "92", "85", "89", "429"],
    ["108110907004", "赵六", "初三8班", "88", "90", "87", "92", "85", "442"],
    ["108110907005", "钱七", "初三9班", "90", "87", "89", "85", "88", "439"]
  ],
  totalRows: 200
};

// 模拟文件数据 - 长表格式
const longFormatData = {
  filename: "九年级期中考试成绩.csv",
  headers: ["学号", "姓名", "班级", "科目", "分数", "等级"],
  sampleRows: [
    ["108110907001", "张三", "初三7班", "语文", "85", "B+"],
    ["108110907001", "张三", "初三7班", "数学", "92", "A"],
    ["108110907001", "张三", "初三7班", "英语", "78", "B"],
    ["108110907002", "李四", "初三7班", "语文", "92", "A"],
    ["108110907002", "李四", "初三7班", "数学", "88", "B+"]
  ],
  totalRows: 1000
};

/**
 * 构建优化的AI提示词
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

请开始分析并返回JSON结果。
`;
}

/**
 * 测试AI文件解析功能
 */
async function testAIFileParsing() {
  console.log('🤖 测试AI文件解析功能...\n');

  try {
    // 测试宽表格式
    console.log('📊 测试宽表格式解析...');
    const widePrompt = buildOptimizedPrompt(wideFormatData);
    
    const { data: wideResult, error: wideError } = await supabase.functions.invoke('proxy-ai-request', {
      body: {
        messages: [
          {
            role: 'system',
            content: '你是一位资深的教育数据分析专家，具备丰富的数据格式识别和教育领域专业知识。'
          },
          {
            role: 'user',
            content: widePrompt
          }
        ],
        model: 'gpt-4',
        temperature: 0.1,
        max_tokens: 2000
      }
    });

    if (wideError) {
      console.error('❌ 宽表格式AI解析失败:', wideError);
    } else {
      console.log('✅ 宽表格式AI解析成功:');
      console.log(wideResult.content);
      
      // 尝试解析JSON结果
      try {
        const jsonMatch = wideResult.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         wideResult.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          console.log('📋 解析结果:');
          console.log('- 数据结构:', result.dataStructure);
          console.log('- 识别科目:', result.subjects);
          console.log('- 置信度:', result.confidence);
          console.log('- 建议:', result.processing.suggestions);
        }
      } catch (parseError) {
        console.log('⚠️ JSON解析失败，但AI响应正常');
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // 测试长表格式
    console.log('📊 测试长表格式解析...');
    const longPrompt = buildOptimizedPrompt(longFormatData);
    
    const { data: longResult, error: longError } = await supabase.functions.invoke('proxy-ai-request', {
      body: {
        messages: [
          {
            role: 'system',
            content: '你是一位资深的教育数据分析专家，具备丰富的数据格式识别和教育领域专业知识。'
          },
          {
            role: 'user',
            content: longPrompt
          }
        ],
        model: 'gpt-4',
        temperature: 0.1,
        max_tokens: 2000
      }
    });

    if (longError) {
      console.error('❌ 长表格式AI解析失败:', longError);
    } else {
      console.log('✅ 长表格式AI解析成功:');
      console.log(longResult.content);
      
      // 尝试解析JSON结果
      try {
        const jsonMatch = longResult.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         longResult.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          console.log('📋 解析结果:');
          console.log('- 数据结构:', result.dataStructure);
          console.log('- 识别科目:', result.subjects);
          console.log('- 置信度:', result.confidence);
          console.log('- 建议:', result.processing.suggestions);
        }
      } catch (parseError) {
        console.log('⚠️ JSON解析失败，但AI响应正常');
      }
    }

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
}

// 运行测试
testAIFileParsing().then(() => {
  console.log('\n🎉 AI文件解析测试完成！');
}).catch(error => {
  console.error('❌ 测试失败:', error);
}); 