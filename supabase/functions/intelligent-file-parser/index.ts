import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// 环境变量
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// 字段类型枚举
enum FieldType {
  STUDENT_ID = 'student_id',
  STUDENT_NAME = 'name',
  CLASS_NAME = 'class_name',
  SUBJECT = 'subject',
  SCORE = 'score',
  TOTAL_SCORE = 'total_score',
  GRADE = 'grade',
  RANK_CLASS = 'rank_in_class',
  RANK_GRADE = 'rank_in_grade',
  EXAM_DATE = 'exam_date',
  EXAM_TYPE = 'exam_type',
  EXAM_TITLE = 'exam_title',
  UNKNOWN = 'unknown'
}

// 科目识别模式
const SUBJECT_PATTERNS = {
  '语文': ['语文', '语', 'chinese', 'yuwen'],
  '数学': ['数学', '数', 'math', 'mathematics', 'shuxue'],
  '英语': ['英语', '英', 'english', 'yingyu'],
  '物理': ['物理', '物', 'physics', 'wuli'],
  '化学': ['化学', '化', 'chemistry', 'huaxue'],
  '生物': ['生物', '生', 'biology', 'shengwu'],
  '政治': ['政治', '政', 'politics', 'zhengzhi', '道法', '道德与法治'],
  '历史': ['历史', '史', 'history', 'lishi'],
  '地理': ['地理', '地', 'geography', 'dili'],
  '总分': ['总分', '总', 'total', '合计']
};

// 字段识别模式
const FIELD_PATTERNS = {
  [FieldType.STUDENT_ID]: ['学号', 'student_id', 'id', '编号', '学生编号', '考号'],
  [FieldType.STUDENT_NAME]: ['姓名', 'name', '学生姓名', '学生', '名字'],
  [FieldType.CLASS_NAME]: ['班级', 'class', 'class_name', '班', '年级班级'],
  [FieldType.SCORE]: ['分数', 'score', '成绩', '得分', '分'],
  [FieldType.TOTAL_SCORE]: ['总分', 'total_score', 'total', '总成绩', '合计'],
  [FieldType.GRADE]: ['等级', 'grade', '级别', '评级', '等第'],
  [FieldType.RANK_CLASS]: ['班级排名', 'class_rank', '班名', '班排名', '班级名次'],
  [FieldType.RANK_GRADE]: ['年级排名', 'grade_rank', '校名', '年级名次', '校排名', '级名'],
  [FieldType.EXAM_DATE]: ['考试日期', 'exam_date', 'date', '日期', '时间'],
  [FieldType.EXAM_TYPE]: ['考试类型', 'exam_type', 'type', '类型'],
  [FieldType.EXAM_TITLE]: ['考试名称', 'exam_title', 'title', '标题', '考试']
};

/**
 * 生成字段映射
 */
function generateFieldMappings(headers: string[], data: any[]): Record<string, string> {
  const mappings: Record<string, string> = {};
  
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    
    // 遍历所有字段类型，寻找匹配
    for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS)) {
      for (const pattern of patterns) {
        if (normalizedHeader.includes(pattern.toLowerCase())) {
          mappings[header] = fieldType;
          return;
        }
      }
    }
    
    // 检查是否是科目相关字段
    for (const [subject, patterns] of Object.entries(SUBJECT_PATTERNS)) {
      for (const pattern of patterns) {
        if (normalizedHeader.includes(pattern.toLowerCase())) {
          // 进一步判断是分数、等级还是排名
          if (normalizedHeader.includes('分数') || normalizedHeader.includes('score')) {
            mappings[header] = `${subject}_score`;
          } else if (normalizedHeader.includes('等级') || normalizedHeader.includes('grade')) {
            mappings[header] = `${subject}_grade`;
          } else if (normalizedHeader.includes('班名') || normalizedHeader.includes('class_rank')) {
            mappings[header] = `${subject}_class_rank`;
          } else if (normalizedHeader.includes('校名') || normalizedHeader.includes('级名') || normalizedHeader.includes('grade_rank')) {
            mappings[header] = `${subject}_grade_rank`;
          } else {
            mappings[header] = `${subject}_unknown`;
          }
          return;
        }
      }
    }
    
    // 如果没有匹配到，标记为未知
    mappings[header] = FieldType.UNKNOWN;
  });
  
  return mappings;
}

/**
 * 检测科目
 */
function detectSubjects(headers: string[]): string[] {
  const subjects = new Set<string>();
  
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const [subject, patterns] of Object.entries(SUBJECT_PATTERNS)) {
      for (const pattern of patterns) {
        if (normalizedHeader.includes(pattern.toLowerCase())) {
          subjects.add(subject);
          break;
        }
      }
    }
  });
  
  return Array.from(subjects);
}

/**
 * 推断考试信息
 */
function inferExamInfo(filename: string, headers: string[], data: any[]): any {
  const examInfo: any = {};
  
  // 从文件名推断考试信息
  const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // 检测考试类型
  if (filenameWithoutExt.includes('月考')) {
    examInfo.type = '月考';
  } else if (filenameWithoutExt.includes('期中')) {
    examInfo.type = '期中考试';
  } else if (filenameWithoutExt.includes('期末')) {
    examInfo.type = '期末考试';
  } else if (filenameWithoutExt.includes('模拟')) {
    examInfo.type = '模拟考试';
  } else if (filenameWithoutExt.includes('单元')) {
    examInfo.type = '单元测试';
  } else {
    examInfo.type = '考试';
  }
  
  // 检测年级和时间
  const gradeMatch = filenameWithoutExt.match(/(初|高)?([一二三四五六七八九]|[1-9])(年级|年|级)/);
  if (gradeMatch) {
    examInfo.grade = gradeMatch[0];
  }
  
  const dateMatch = filenameWithoutExt.match(/(\d{4})[年\-\/]?(\d{1,2})[月\-\/]?(\d{1,2})?/);
  if (dateMatch) {
    const [_, year, month, day] = dateMatch;
    examInfo.date = `${year}-${month.padStart(2, '0')}-${(day || '01').padStart(2, '0')}`;
  } else {
    // 如果没有找到日期，使用当前日期
    examInfo.date = new Date().toISOString().split('T')[0];
  }
  
  // 设置考试标题
  examInfo.title = filenameWithoutExt || '未命名考试';
  
  return examInfo;
}

/**
 * 转换宽表为长表格式
 */
function convertWideToLong(data: any[], mappings: Record<string, string>, examInfo: any): any[] {
  const result: any[] = [];
  
  data.forEach(row => {
    // 提取学生基本信息
    const studentInfo: any = {};
    const subjectData: Record<string, any> = {};
    
    Object.entries(row).forEach(([header, value]) => {
      const mapping = mappings[header];
      
      if (mapping === FieldType.STUDENT_ID) {
        studentInfo.student_id = value;
      } else if (mapping === FieldType.STUDENT_NAME) {
        studentInfo.name = value;
      } else if (mapping === FieldType.CLASS_NAME) {
        studentInfo.class_name = value;
      } else if (mapping.includes('_score') || mapping.includes('_grade') || mapping.includes('_rank')) {
        // 科目相关数据
        const [subject, type] = mapping.split('_');
        if (!subjectData[subject]) {
          subjectData[subject] = {};
        }
        
        if (type === 'score') {
          subjectData[subject].score = parseFloat(value) || null;
        } else if (type === 'grade') {
          subjectData[subject].grade = value;
        } else if (type === 'class_rank') {
          subjectData[subject].rank_in_class = parseInt(value) || null;
        } else if (type === 'grade_rank') {
          subjectData[subject].rank_in_grade = parseInt(value) || null;
        }
      }
    });
    
    // 为每个科目创建一条记录
    Object.entries(subjectData).forEach(([subject, data]) => {
      if (data.score !== undefined || data.grade !== undefined) {
        const record = {
          ...studentInfo,
          subject,
          score: data.score || null,
          grade: data.grade || null,
          rank_in_class: data.rank_in_class || null,
          rank_in_grade: data.rank_in_grade || null,
          exam_title: examInfo.title,
          exam_type: examInfo.type,
          exam_date: examInfo.date,
          exam_scope: 'class'
        };
        
        result.push(record);
      }
    });
  });
  
  return result;
}

serve(async (req) => {
  // 处理CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: rawData, headers, filename } = await req.json();
    
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return new Response(
        JSON.stringify({ error: '未提供有效数据' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!Array.isArray(headers) || headers.length === 0) {
      return new Response(
        JSON.stringify({ error: '未提供有效表头信息' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`[intelligent-file-parser] 开始解析文件: ${filename}`);
    console.log(`[intelligent-file-parser] 数据行数: ${rawData.length}, 列数: ${headers.length}`);
    
    // 生成字段映射
    const mappings = generateFieldMappings(headers, rawData);
    console.log('[intelligent-file-parser] 字段映射:', mappings);
    
    // 检测科目
    const detectedSubjects = detectSubjects(headers);
    console.log('[intelligent-file-parser] 检测到的科目:', detectedSubjects);
    
    // 推断考试信息
    const examInfo = inferExamInfo(filename || '未知文件', headers, rawData);
    console.log('[intelligent-file-parser] 推断的考试信息:', examInfo);
    
    // 分析数据结构
    const subjectColumns = headers.filter(header => {
      return Object.keys(SUBJECT_PATTERNS).some(subject => 
        SUBJECT_PATTERNS[subject as keyof typeof SUBJECT_PATTERNS].some(pattern => 
          header.toLowerCase().includes(pattern.toLowerCase())
        )
      );
    });
    
    const hasSubjectColumn = headers.some(header => 
      FIELD_PATTERNS[FieldType.SUBJECT].some(pattern => 
        header.toLowerCase().includes(pattern.toLowerCase())
      )
    );
    
    let detectedStructure: 'wide' | 'long' | 'mixed';
    if (subjectColumns.length > 2) {
      detectedStructure = 'wide';
    } else if (hasSubjectColumn) {
      detectedStructure = 'long';
    } else {
      detectedStructure = 'mixed';
    }
    
    // 计算置信度
    const mappedFields = Object.values(mappings).filter(v => v !== FieldType.UNKNOWN);
    const mappingRatio = mappedFields.length / Object.keys(mappings).length;
    let confidence = 0.3 + mappingRatio * 0.4;
    
    if (detectedSubjects.length > 0) {
      confidence += Math.min(detectedSubjects.length / 5, 1) * 0.2;
    }
    
    if (detectedStructure !== 'mixed') {
      confidence += 0.1;
    }
    
    confidence = Math.min(confidence, 1);
    
    // 如果是宽表格式，转换为长表
    let processedData = rawData;
    if (detectedStructure === 'wide') {
      processedData = convertWideToLong(rawData, mappings, examInfo);
      console.log(`[intelligent-file-parser] 宽表转长表完成，生成 ${processedData.length} 条记录`);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: processedData,
        metadata: {
          originalHeaders: headers,
          detectedStructure,
          confidence,
          suggestedMappings: mappings,
          detectedSubjects,
          examInfo,
          totalRows: processedData.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('智能文件解析失败:', error);
    
    return new Response(
      JSON.stringify({ 
        error: '智能文件解析失败', 
        message: error instanceof Error ? error.message : '发生未知错误' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 