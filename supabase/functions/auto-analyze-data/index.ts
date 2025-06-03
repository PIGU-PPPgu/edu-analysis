import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 定义CORS头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

// 处理智能分析数据结构
serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('[auto-analyze-data] 收到请求');
    console.log('[auto-analyze-data] 请求方法:', req.method);
    console.log('[auto-analyze-data] 请求头:', Object.fromEntries(req.headers.entries()));
    
    let requestBody;
    try {
      const requestText = await req.text();
      console.log('[auto-analyze-data] 请求原始文本长度:', requestText.length);
      console.log('[auto-analyze-data] 请求开头100字符:', requestText.substring(0, 100));
      
      if (!requestText.trim()) {
        return new Response(
          JSON.stringify({ 
            error: '请求体为空',
            details: '没有收到任何数据' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      requestBody = JSON.parse(requestText);
      console.log('[auto-analyze-data] JSON解析成功');
    } catch (parseError) {
      console.error('[auto-analyze-data] JSON解析失败:', parseError);
      return new Response(
        JSON.stringify({ 
          error: '请求数据格式不正确，无法解析JSON',
          details: parseError.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data, examInfo } = requestBody;
    console.log('[auto-analyze-data] 请求体解构结果:', {
      hasData: !!data,
      dataType: typeof data,
      dataIsArray: Array.isArray(data),
      dataLength: data?.length,
      hasExamInfo: !!examInfo,
      examInfoType: typeof examInfo
    });
    
    if (!data) {
      return new Response(
        JSON.stringify({ error: '缺少data参数' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!Array.isArray(data)) {
      return new Response(
        JSON.stringify({ 
          error: 'data参数必须是数组格式',
          receivedType: typeof data,
          receivedValue: Array.isArray(data) ? `数组长度: ${data.length}` : String(data).substring(0, 100)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (data.length === 0) {
      return new Response(
        JSON.stringify({ error: '数据数组不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[auto-analyze-data] 开始分析数据，共${data.length}条记录`);
    console.log('[auto-analyze-data] 第一条数据样本:', data[0]);
    console.log('[auto-analyze-data] 数据字段:', Object.keys(data[0] || {}));
    
    // 执行数据分析逻辑
    console.log('[auto-analyze-data] 开始执行分析逻辑...');
    
    // 基础统计分析
    const statistics = {
      totalRecords: data.length,
      subjects: [...new Set(data.map(d => d.subject).filter(Boolean))],
      classes: [...new Set(data.map(d => d.class_name).filter(Boolean))],
      students: [...new Set(data.map(d => d.name || d.student_id).filter(Boolean))],
      scoreRange: {
        min: 0,
        max: 0,
        avg: 0
      }
    };
    
    // 计算分数统计
    const validScores = data
      .map(d => parseFloat(d.score) || 0)
      .filter(s => s > 0);
    
    if (validScores.length > 0) {
      statistics.scoreRange = {
        min: Math.min(...validScores),
        max: Math.max(...validScores),
        avg: validScores.reduce((sum, score) => sum + score, 0) / validScores.length
      };
    }
    
    console.log('[auto-analyze-data] 统计分析完成:', statistics);
    
    // 生成分析报告
    const analysisResult = {
      success: true,
      statistics,
      insights: [
        `共导入${statistics.totalRecords}条成绩记录`,
        `涉及${statistics.subjects.length}个科目: ${statistics.subjects.join(', ')}`,
        `涉及${statistics.classes.length}个班级: ${statistics.classes.join(', ')}`,
        `涉及${statistics.students.length}名学生`,
        validScores.length > 0 ? 
          `成绩范围: ${statistics.scoreRange.min.toFixed(1)} - ${statistics.scoreRange.max.toFixed(1)}分，平均分: ${statistics.scoreRange.avg.toFixed(1)}分` :
          '暂无有效分数数据'
      ],
      recommendations: [
        '数据导入成功，可以进行后续分析',
        statistics.scoreRange.avg < 60 ? '建议关注平均分较低的科目和班级' : '整体成绩表现良好',
        '可以使用成绩分析功能查看详细统计信息'
      ],
      processedAt: new Date().toISOString()
    };
    
    console.log('[auto-analyze-data] 分析完成，返回结果');
    
    return new Response(
      JSON.stringify(analysisResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[auto-analyze-data] 处理过程中发生错误:', error);
    console.error('[auto-analyze-data] 错误堆栈:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: '服务器内部错误',
        message: error.message,
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// 分析数据结构
function analyzeDataStructure(data: any[]) {
  // 取样本数据
  const sampleSize = Math.min(data.length, 10);
  const sample = data.slice(0, sampleSize);
  
  // 获取所有字段
  const allFields = new Set<string>();
  sample.forEach(row => {
    Object.keys(row).forEach(key => allFields.add(key));
  });
  
  // 字段类型分析
  const fieldTypes: Record<string, string> = {};
  const fieldSamples: Record<string, any[]> = {};
  
  allFields.forEach(field => {
    const values = sample
      .map(row => row[field])
      .filter(val => val !== null && val !== undefined);
    
    fieldSamples[field] = values.slice(0, 3); // 保存样本值
    
    if (values.length === 0) {
      fieldTypes[field] = 'unknown';
      return;
    }
    
    // 判断类型
    const firstValue = values[0];
    const firstType = typeof firstValue;
    
    // 检查所有值是否为同一类型
    const sameType = values.every(val => typeof val === firstType);
    
    if (sameType) {
      fieldTypes[field] = firstType;
    } else {
      // 如果类型不一致，尝试确定是否数字和字符串混用
      const allNumbers = values.every(val => !isNaN(Number(val)));
      if (allNumbers) {
        fieldTypes[field] = 'number';
      } else {
        fieldTypes[field] = 'mixed';
      }
    }
    
    // 特殊类型检测
    if (fieldTypes[field] === 'string') {
      // 日期检测
      const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
      if (values.every(val => datePattern.test(String(val)))) {
        fieldTypes[field] = 'date';
      }
      
      // 班级检测
      if (values.every(val => String(val).includes('班') || /^\d+[（(][A-Za-z][)）]?$/.test(String(val)))) {
        fieldTypes[field] = 'class';
      }
    }
  });
  
  // 确定数据格式：宽表 vs 长表
  const dataFormat = determineDataFormat(data, fieldTypes);
  
  // 尝试识别关键字段
  const identifiedFields = identifyFields(data, fieldTypes, dataFormat);
  
  return {
    dataFormat,
    fieldCount: allFields.size,
    fieldTypes,
    fieldSamples,
    identifiedFields,
    rowCount: data.length
  };
}

// 确定数据格式：宽表 vs 长表
function determineDataFormat(data: any[], fieldTypes: Record<string, string>): 'wide' | 'long' {
  // 检查是否有科目字段，这是长表的特征
  const hasSubjectField = Object.keys(fieldTypes).some(field => 
    field.toLowerCase().includes('科目') || 
    field.toLowerCase().includes('subject') ||
    field.toLowerCase() === 'subject'
  );
  
  // 检查是否有多个科目分数列，这是宽表的特征
  const potentialSubjectScoreFields = Object.keys(fieldTypes).filter(field => {
    const lowerField = field.toLowerCase();
    const isScoreField = fieldTypes[field] === 'number';
    const isPotentialSubject = 
      !lowerField.includes('学号') && 
      !lowerField.includes('id') && 
      !lowerField.includes('排名') && 
      !lowerField.includes('rank') && 
      !lowerField.includes('总分');
      
    return isScoreField && isPotentialSubject;
  });
  
  // 如果潜在科目分数字段大于3个，更可能是宽表
  if (potentialSubjectScoreFields.length > 3) {
    return 'wide';
  }
  
  // 如果有明确的科目字段，且每个学生有多条记录，应该是长表
  if (hasSubjectField) {
    // 检查是否存在重复学生记录
    const studentIdField = Object.keys(fieldTypes).find(field => 
      field.toLowerCase().includes('学号') || 
      field.toLowerCase().includes('student_id')
    );
    
    if (studentIdField) {
      const studentIds = data.map(row => row[studentIdField]);
      const uniqueIds = new Set(studentIds);
      
      // 如果唯一ID数量远少于记录数，说明平均每个学生有多条记录
      if (uniqueIds.size < data.length / 1.5) {
        return 'long';
      }
    }
  }
  
  // 默认判断为宽表
  return 'wide';
}

// 识别关键字段
function identifyFields(data: any[], fieldTypes: Record<string, string>, dataFormat: 'wide' | 'long') {
  const fields: Record<string, string | null> = {
    studentId: null,
    name: null,
    className: null,
    subject: null, // 长表格式特有
    score: null,   // 长表格式特有
  };
  
  // 查找学生ID字段
  const studentIdCandidates = Object.keys(fieldTypes).filter(field => {
    const lowerField = field.toLowerCase();
    return lowerField.includes('学号') || 
           lowerField.includes('学生编号') || 
           lowerField.includes('学籍号') || 
           lowerField.includes('id') ||
           lowerField.includes('student_id');
  });
  
  if (studentIdCandidates.length > 0) {
    fields.studentId = studentIdCandidates[0];
  }
  
  // 查找姓名字段
  const nameCandidates = Object.keys(fieldTypes).filter(field => {
    const lowerField = field.toLowerCase();
    return lowerField.includes('姓名') || 
           lowerField.includes('学生姓名') || 
           lowerField.includes('name') ||
           lowerField === 'name';
  });
  
  if (nameCandidates.length > 0) {
    fields.name = nameCandidates[0];
  }
  
  // 查找班级字段
  const classCandidates = Object.keys(fieldTypes).filter(field => {
    const lowerField = field.toLowerCase();
    return lowerField.includes('班级') || 
           lowerField.includes('班') || 
           lowerField.includes('class') ||
           fieldTypes[field] === 'class';
  });
  
  if (classCandidates.length > 0) {
    fields.className = classCandidates[0];
  }
  
  // 如果是长表格式，查找科目和分数字段
  if (dataFormat === 'long') {
    // 查找科目字段
    const subjectCandidates = Object.keys(fieldTypes).filter(field => {
      const lowerField = field.toLowerCase();
      return lowerField.includes('科目') || 
             lowerField.includes('subject') ||
             lowerField === 'subject';
    });
    
    if (subjectCandidates.length > 0) {
      fields.subject = subjectCandidates[0];
    }
    
    // 查找分数字段
    const scoreCandidates = Object.keys(fieldTypes).filter(field => {
      const lowerField = field.toLowerCase();
      return lowerField.includes('分数') || 
             lowerField.includes('成绩') || 
             lowerField.includes('分') || 
             lowerField.includes('score') ||
             lowerField === 'score' ||
             lowerField === 'total_score';
    });
    
    if (scoreCandidates.length > 0) {
      fields.score = scoreCandidates[0];
    } else {
      // 如果没有明确的分数字段，寻找类型为数字的字段
      const numberFields = Object.keys(fieldTypes).filter(field => 
        fieldTypes[field] === 'number' && 
        !field.toLowerCase().includes('学号') &&
        !field.toLowerCase().includes('id') &&
        !field.toLowerCase().includes('排名') &&
        !field.toLowerCase().includes('rank')
      );
      
      if (numberFields.length > 0) {
        fields.score = numberFields[0];
      }
    }
  }
  
  return fields;
}

// 分析数据特征
function analyzeData(data: any[], structure: any) {
  const results: any = {
    rowCount: data.length,
    allSubjects: [],
    allClasses: [],
    avgScore: 0,
    maxScore: 0,
    minScore: 0,
    warnings: []
  };
  
  // 获取班级列表
  if (structure.identifiedFields.className) {
    const classField = structure.identifiedFields.className;
    const classes = data
      .map(row => row[classField])
      .filter(Boolean)
      .map(className => String(className).trim())
      .filter(className => className !== '');
      
    results.allClasses = [...new Set(classes)];
    
    // 检查班级为空的数据
    const emptyClassCount = data.filter(row => !row[classField]).length;
    if (emptyClassCount > 0) {
      results.warnings.push({
        type: 'missing_class',
        message: `发现${emptyClassCount}条数据缺少班级信息`,
        count: emptyClassCount
      });
    }
  }
  
  // 获取科目列表
  if (structure.dataFormat === 'long' && structure.identifiedFields.subject) {
    // 长表格式
    const subjectField = structure.identifiedFields.subject;
    const subjects = data
      .map(row => row[subjectField])
      .filter(Boolean)
      .map(subject => String(subject).trim())
      .filter(subject => subject !== '');
      
    results.allSubjects = [...new Set(subjects)];
  } else if (structure.dataFormat === 'wide') {
    // 宽表格式
    // 尝试识别科目字段
    const potentialSubjectFields = Object.keys(structure.fieldTypes)
      .filter(field => {
        const lowerField = field.toLowerCase();
        // 排除明显不是科目的字段
        return structure.fieldTypes[field] === 'number' && 
               !lowerField.includes('学号') && 
               !lowerField.includes('id') && 
               !lowerField.includes('排名') && 
               !lowerField.includes('rank');
      });
      
    results.allSubjects = potentialSubjectFields.map(normalizeSubjectName);
  }
  
  // 统计分数
  const scores: number[] = [];
  
  if (structure.dataFormat === 'long' && structure.identifiedFields.score) {
    // 长表格式
    const scoreField = structure.identifiedFields.score;
    scores.push(...data
      .map(row => parseFloat(row[scoreField]))
      .filter(score => !isNaN(score))
    );
  } else if (structure.dataFormat === 'wide') {
    // 宽表格式 - 从潜在科目字段收集分数
    Object.keys(structure.fieldTypes)
      .filter(field => structure.fieldTypes[field] === 'number')
      .forEach(field => {
        scores.push(...data
          .map(row => parseFloat(row[field]))
          .filter(score => !isNaN(score))
        );
      });
  }
  
  // 计算统计数据
  if (scores.length > 0) {
    results.avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    results.maxScore = Math.max(...scores);
    results.minScore = Math.min(...scores);
  }
  
  return results;
}

// 生成洞察
function generateInsights(data: any[], structure: any, results: any, examInfo?: any) {
  const insights: Array<{title: string; content: string; type: string}> = [];
  
  // 1. 数据格式洞察
  insights.push({
    title: '数据格式分析',
    content: `系统检测到您的数据是${structure.dataFormat === 'wide' ? '宽表格式' : '长表格式'}，包含${results.rowCount}条记录和${structure.fieldCount}个字段。`,
    type: 'format'
  });
  
  // 2. 班级信息洞察
  if (results.allClasses.length > 0) {
    insights.push({
      title: '班级信息',
      content: `识别到${results.allClasses.length}个班级: ${results.allClasses.join(', ')}`,
      type: 'class'
    });
  } else {
    insights.push({
      title: '缺少班级信息',
      content: '未能识别班级信息，系统将使用"未知班级"作为默认值。',
      type: 'warning'
    });
  }
  
  // 3. 科目信息洞察
  if (results.allSubjects.length > 0) {
    insights.push({
      title: '科目信息',
      content: `识别到${results.allSubjects.length}个科目: ${results.allSubjects.join(', ')}`,
      type: 'subject'
    });
  }
  
  // 4. 数据完整性警告
  if (results.warnings && results.warnings.length > 0) {
    for (const warning of results.warnings) {
      insights.push({
        title: '数据警告',
        content: warning.message,
        type: 'warning'
      });
    }
  }
  
  return insights;
}

// 规范化科目名称
function normalizeSubjectName(subject: string): string {
  if (!subject) return '未知科目';
  
  // 转换为小写并去除空格进行比较
  const normalized = String(subject).toLowerCase().trim();
  
  // 常见科目名称映射
  const subjectMapping: Record<string, string> = {
    // 中文科目
    '语': '语文', '语文': '语文', 'chinese': '语文', 'yuwen': '语文',
    '数': '数学', '数学': '数学', 'math': '数学', 'mathematics': '数学', 'shuxue': '数学',
    '英': '英语', '英语': '英语', 'english': '英语', 'yingyu': '英语',
    '物': '物理', '物理': '物理', 'physics': '物理', 'wuli': '物理',
    '化': '化学', '化学': '化学', 'chemistry': '化学', 'huaxue': '化学',
    '生': '生物', '生物': '生物', 'biology': '生物', 'shengwu': '生物',
    '政': '政治', '政治': '政治', 'politics': '政治', 'zhenzhi': '政治',
    '史': '历史', '历史': '历史', 'history': '历史', 'lishi': '历史',
    '地': '地理', '地理': '地理', 'geography': '地理', 'dili': '地理',
    // 常见组合和缩写
    '文综': '文科综合', '文科综合': '文科综合',
    '理综': '理科综合', '理科综合': '理科综合',
    '总分': '总分', 'total': '总分', '总': '总分',
  };
  
  // 检查科目名称映射
  for (const [key, value] of Object.entries(subjectMapping)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  // 如果没有匹配到，返回原始值
  return subject;
} 