/**
 * 智能字段映射服务
 * 专门处理复杂的CSV表头识别和数据转换
 */

export interface FieldMapping {
  originalField: string;
  mappedField: string;
  subject?: string;
  dataType: 'score' | 'grade' | 'rank_class' | 'rank_school' | 'rank_grade' | 'student_info';
  confidence: number;
}

/**
 * 科目成绩数据结构（已废弃，使用 Record<string, any> 替代）
 * @deprecated 改用 Record<string, any> 以支持更灵活的数据结构
 */
export interface SubjectData {
  subject: string;
  score?: number;
  grade?: string;
  rank_in_class?: number;
  rank_in_school?: number;
  rank_in_grade?: number;
}

/**
 * 完整的成绩记录接口
 * 用于宽表格转换后的长表格数据
 */
export interface CompleteGradeRecord {
  // 主键
  id?: string;
  
  // 学生信息
  student_id: string;
  name: string;
  class_name: string;
  grade?: string;
  
  // 考试信息
  exam_id: string;
  exam_title: string;
  exam_type: string;
  exam_date: string;
  exam_scope?: string;
  
  // 科目成绩
  subject: string;
  score?: number;
  original_grade?: string;
  grade?: string;
  computed_grade?: string;
  
  // 排名信息
  rank_in_class?: number;
  rank_in_grade?: number;
  rank_in_school?: number;
  
  // 其他字段
  subject_total_score?: number;
  percentile?: number;
  z_score?: number;
  
  // 状态字段
  is_analyzed?: boolean;
  analyzed_at?: string;
  
  // 元数据
  import_strategy?: string;
  match_type?: string;
  multiple_matches?: boolean;
  metadata?: Record<string, any>;
  
  // 时间戳
  created_at?: string;
  updated_at?: string;
}

/**
 * 增强的科目识别模式
 */
const SUBJECT_PATTERNS = {
  '语文': {
    keywords: ['语文', '语', 'chinese', 'yuwen'],
    aliases: ['语文分数', '语文等级', '语文班名', '语文校名', '语文级名']
  },
  '数学': {
    keywords: ['数学', '数', 'math', 'mathematics', 'shuxue'],
    aliases: ['数学分数', '数学等级', '数学班名', '数学校名', '数学级名']
  },
  '英语': {
    keywords: ['英语', '英', 'english', 'yingyu'],
    aliases: ['英语分数', '英语等级', '英语班名', '英语校名', '英语级名']
  },
  '物理': {
    keywords: ['物理', '物', 'physics', 'wuli'],
    aliases: ['物理分数', '物理等级', '物理班名', '物理校名', '物理级名']
  },
  '化学': {
    keywords: ['化学', '化', 'chemistry', 'huaxue'],
    aliases: ['化学分数', '化学等级', '化学班名', '化学校名', '化学级名']
  },
  '生物': {
    keywords: ['生物', '生', 'biology', 'shengwu'],
    aliases: ['生物分数', '生物等级', '生物班名', '生物校名', '生物级名']
  },
  '政治': {
    keywords: ['政治', '政', 'politics', 'zhengzhi', '道法', '道德与法治', '道德法治'],
    aliases: ['政治分数', '政治等级', '政治班名', '政治校名', '政治级名', '道法分数', '道法等级', '道法班名', '道法校名', '道法级名']
  },
  '历史': {
    keywords: ['历史', '史', 'history', 'lishi'],
    aliases: ['历史分数', '历史等级', '历史班名', '历史校名', '历史级名']
  },
  '地理': {
    keywords: ['地理', '地', 'geography', 'dili'],
    aliases: ['地理分数', '地理等级', '地理班名', '地理校名', '地理级名']
  },
  '总分': {
    keywords: ['总分', '总', 'total', '合计', '总成绩'],
    aliases: ['总分分数', '总分等级', '总分班名', '总分校名', '总分级名']
  }
};

/**
 * 字段类型识别模式
 */
const FIELD_TYPE_PATTERNS = {
  score: ['分数', 'score', '成绩', '得分'],
  grade: ['等级', 'grade', '级别', '档次'],
  rank_class: ['班名', 'class_rank', '班级排名', '班排'],
  rank_school: ['校名', 'school_rank', '学校排名', '校排'],
  rank_grade: ['级名', 'grade_rank', '年级排名', '级排']
};

/**
 * 学生信息字段模式
 */
const STUDENT_INFO_PATTERNS = {
  name: ['姓名', '名字', 'name', '学生姓名'],
  student_id: ['学号', 'student_id', 'id', '学生编号'],
  class_name: ['班级', 'class', 'class_name', '所在班级']
};

/**
 * 智能分析CSV表头，识别字段映射
 */
export function analyzeCSVHeaders(headers: string[]): {
  mappings: FieldMapping[];
  subjects: string[];
  studentFields: FieldMapping[];
  confidence: number;
} {
  console.log('[智能字段映射] 开始分析CSV表头:', headers);
  
  const mappings: FieldMapping[] = [];
  const subjects = new Set<string>();
  const studentFields: FieldMapping[] = [];
  
  headers.forEach(header => {
    const mapping = identifyField(header);
    if (mapping) {
      mappings.push(mapping);
      
      if (mapping.subject) {
        subjects.add(mapping.subject);
      }
      
      if (mapping.dataType === 'student_info') {
        studentFields.push(mapping);
      }
    }
  });
  
  // 计算整体置信度
  const totalFields = headers.length;
  const mappedFields = mappings.length;
  const confidence = mappedFields / totalFields;
  
  console.log('[智能字段映射] 分析结果:', {
    总字段数: totalFields,
    已映射字段数: mappedFields,
    识别的科目: Array.from(subjects),
    置信度: confidence
  });
  
  return {
    mappings,
    subjects: Array.from(subjects),
    studentFields,
    confidence
  };
}

/**
 * 识别单个字段的类型和映射
 */
function identifyField(header: string): FieldMapping | null {
  const normalizedHeader = header.trim();
  
  // 1. 检查学生信息字段
  for (const [field, patterns] of Object.entries(STUDENT_INFO_PATTERNS)) {
    for (const pattern of patterns) {
      if (normalizedHeader.includes(pattern)) {
        return {
          originalField: header,
          mappedField: field,
          dataType: 'student_info',
          confidence: 0.9
        };
      }
    }
  }
  
  // 2. 检查科目相关字段
  // 按关键词长度排序，优先匹配更长更具体的关键词
  const sortedSubjects = Object.entries(SUBJECT_PATTERNS).sort((a, b) => {
    const maxLengthA = Math.max(...a[1].keywords.map(k => k.length));
    const maxLengthB = Math.max(...b[1].keywords.map(k => k.length));
    return maxLengthB - maxLengthA; // 降序排列，长的在前
  });
  
  for (const [subject, config] of sortedSubjects) {
    // 检查是否包含科目关键词，优先匹配更长的关键词
    const matchedKeyword = config.keywords
      .sort((a, b) => b.length - a.length) // 按长度降序排列
      .find(keyword => {
        // 更精确的匹配逻辑
        if (keyword.length === 1) {
          // 对于单字符关键词（如"数"、"语"），需要更严格的匹配
          // 确保不是作为其他词的一部分出现
          const regex = new RegExp(`(?:^|[^\\u4e00-\\u9fa5])${keyword}(?:[^\\u4e00-\\u9fa5]|$)`);
          return regex.test(normalizedHeader) || normalizedHeader === keyword;
        } else {
          // 对于多字符关键词，直接包含匹配
          return normalizedHeader.includes(keyword);
        }
      });
    
    if (matchedKeyword) {
      console.log(`[字段识别] "${header}" 匹配到科目 "${subject}" (关键词: "${matchedKeyword}")`);
      
      // 确定字段类型
      let dataType: FieldMapping['dataType'] = 'score'; // 默认为分数
      let confidence = 0.7;
      
      for (const [type, patterns] of Object.entries(FIELD_TYPE_PATTERNS)) {
        if (patterns.some(pattern => normalizedHeader.includes(pattern))) {
          dataType = type as FieldMapping['dataType'];
          confidence = 0.9;
          break;
        }
      }
      
      // 如果没有明确的类型标识，根据位置和内容推断
      if (confidence === 0.7) {
        if (normalizedHeader.includes('分数') || normalizedHeader.endsWith(subject) || normalizedHeader.startsWith(subject)) {
          dataType = 'score';
          confidence = 0.9;
        } else if (normalizedHeader.includes('等级')) {
          dataType = 'grade';
          confidence = 0.9;
        } else if (normalizedHeader.includes('班名') || normalizedHeader.includes('班级排名')) {
          dataType = 'rank_class';
          confidence = 0.9;
        } else if (normalizedHeader.includes('校名') || normalizedHeader.includes('学校排名')) {
          dataType = 'rank_school';
          confidence = 0.9;
        } else if (normalizedHeader.includes('级名') || normalizedHeader.includes('年级排名')) {
          dataType = 'rank_grade';
          confidence = 0.9;
        } else {
          // 如果包含科目关键词但没有明确类型，默认为分数
          dataType = 'score';
          confidence = 0.8;
        }
      }
      
      // 根据数据类型映射到正确的系统字段
      let mappedField: string;
      switch (dataType) {
        case 'grade':
          mappedField = 'original_grade'; // 映射到等级字段
          break;
        case 'score':
          mappedField = subject === '总分' ? 'total_score' : 'score';
          break;
        case 'rank_class':
          mappedField = 'rank_in_class';
          break;
        case 'rank_school':
        case 'rank_grade':
          mappedField = 'rank_in_grade';
          break;
        default:
          mappedField = `${subject}_${dataType}`;
      }
      
      return {
        originalField: header,
        mappedField,
        subject,
        dataType,
        confidence
      };
    }
  }
  
  return null;
}

/**
 * 将宽表格数据转换为长表格格式
 * 修复版本：确保返回完整的grade_data记录，包含学生信息和考试信息
 */
export function convertWideToLongFormatEnhanced(
  rowData: Record<string, any>,
  headerAnalysis: {
    mappings: FieldMapping[];
    subjects: string[];
    studentFields: FieldMapping[];
    confidence: number;
  },
  examInfo?: {
    title: string;
    type: string;
    date: string;
    exam_id: string;
  }
): Record<string, any>[] {
  console.log('[增强转换] 开始转换数据行:', rowData);
  
  // 提取学生基本信息
  const studentInfo: Record<string, any> = {};
  
  // 处理学生信息字段映射
  headerAnalysis.studentFields.forEach(mapping => {
    const value = rowData[mapping.originalField];
    if (value !== undefined && value !== null && value !== '') {
      // 标准化字段名
      let fieldName = mapping.mappedField;
      if (fieldName === 'student_id') {
        studentInfo.student_id = String(value).trim();
      } else if (fieldName === 'name') {
        studentInfo.name = String(value).trim();
      } else if (fieldName === 'class_name') {
        studentInfo.class_name = String(value).trim();
      } else if (fieldName === 'grade') {
        studentInfo.grade = String(value).trim();
      } else {
        studentInfo[fieldName] = value;
      }
    }
  });
  
  // 确保必要字段有默认值
  if (!studentInfo.student_id) {
    // 如果没有学号，尝试从其他字段获取
    studentInfo.student_id = rowData['学号'] || rowData['student_id'] || rowData['id'] || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }
  if (!studentInfo.name) {
    studentInfo.name = rowData['姓名'] || rowData['name'] || rowData['名字'] || '未知学生';
  }
  if (!studentInfo.class_name) {
    studentInfo.class_name = rowData['班级'] || rowData['class_name'] || rowData['班级名称'] || '未知班级';
  }
  
  console.log('[增强转换] 提取的学生信息:', studentInfo);
  
  // 提取考试信息
  const examData: Record<string, any> = {};
  if (examInfo) {
    examData.exam_id = examInfo.exam_id;
    examData.exam_title = examInfo.title;
    examData.exam_type = examInfo.type;
    examData.exam_date = examInfo.date;
    examData.exam_scope = 'class'; // 默认班级范围
  }
  
  // 按科目分组数据
  const subjectGroups: Record<string, Record<string, any>> = {};
  const subjectMappings = headerAnalysis.mappings.filter(m => m.subject);
  
  subjectMappings.forEach(mapping => {
    const value = rowData[mapping.originalField];
    console.log(`[增强转换] 处理字段 ${mapping.originalField} (${mapping.subject}-${mapping.dataType}): ${value}`);
    
    // 改进值检查逻辑：允许数值0，但排除null、undefined和空字符串
    if (value !== undefined && value !== null && value !== '') {
      if (!subjectGroups[mapping.subject!]) {
        subjectGroups[mapping.subject!] = {};
      }
      
      // 根据数据类型存储值
      switch (mapping.dataType) {
        case 'score':
          const numericValue = parseFloat(value);
          if (!isNaN(numericValue)) {
            subjectGroups[mapping.subject!].score = numericValue;
            console.log(`[增强转换] 设置 ${mapping.subject} 分数: ${numericValue}`);
          }
          break;
        case 'grade':
          subjectGroups[mapping.subject!].original_grade = String(value).trim();
          subjectGroups[mapping.subject!].grade = String(value).trim(); // 向后兼容
          console.log(`[增强转换] 设置 ${mapping.subject} 等级: ${value}`);
          break;
        case 'rank_class':
          const classRank = parseInt(value);
          if (!isNaN(classRank)) {
            subjectGroups[mapping.subject!].rank_in_class = classRank;
            console.log(`[增强转换] 设置 ${mapping.subject} 班级排名: ${classRank}`);
          }
          break;
        case 'rank_school':
          const schoolRank = parseInt(value);
          if (!isNaN(schoolRank)) {
            subjectGroups[mapping.subject!].rank_in_school = schoolRank;
            console.log(`[增强转换] 设置 ${mapping.subject} 学校排名: ${schoolRank}`);
          }
          break;
        case 'rank_grade':
          const gradeRank = parseInt(value);
          if (!isNaN(gradeRank)) {
            subjectGroups[mapping.subject!].rank_in_grade = gradeRank;
            console.log(`[增强转换] 设置 ${mapping.subject} 年级排名: ${gradeRank}`);
          }
          break;
      }
    } else {
      console.log(`[增强转换] 跳过空值字段 ${mapping.originalField}: ${value}`);
    }
  });
  
  // 生成完整的成绩记录（每个科目一条记录）
  const result: Record<string, any>[] = [];
  
  Object.entries(subjectGroups).forEach(([subject, subjectData]) => {
    // 只有当有分数或等级时才创建记录
    if (subjectData.score !== undefined || subjectData.original_grade !== undefined || subjectData.grade !== undefined) {
      const record: Record<string, any> = {
        // 学生基本信息
        ...studentInfo,
        
        // 考试信息
        ...examData,
        
        // 科目信息
        subject,
        
        // 科目成绩数据
        ...subjectData,
        
        // 默认字段
        subject_total_score: subjectData.subject_total_score || 100, // 默认满分100
        computed_grade: null, // 计算等级（由系统自动计算）
        is_analyzed: false,
        analyzed_at: null,
        
        // 元数据
        import_strategy: 'wide_table_conversion',
        match_type: 'enhanced',
        multiple_matches: false,
        metadata: {
          source: 'wide_table',
          original_row: Object.keys(rowData).length,
          conversion_time: new Date().toISOString()
        },
        
        // 时间戳
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      result.push(record);
    }
  });
  
  console.log('[增强转换] 转换结果:', {
    原始行: 1,
    生成记录数: result.length,
    科目列表: result.map(r => r.subject),
    学生信息: {
      student_id: studentInfo.student_id,
      name: studentInfo.name,
      class_name: studentInfo.class_name
    }
  });
  
  return result;
}

/**
 * 生成字段映射建议
 */
export function generateMappingSuggestions(headers: string[]): {
  suggestions: Record<string, string>;
  confidence: number;
  issues: string[];
} {
  const analysis = analyzeCSVHeaders(headers);
  const suggestions: Record<string, string> = {};
  const issues: string[] = [];
  
  // 生成映射建议
  analysis.mappings.forEach(mapping => {
    if (mapping.dataType === 'student_info') {
      suggestions[mapping.originalField] = mapping.mappedField;
    } else if (mapping.subject && mapping.dataType === 'score') {
      // 对于科目分数，映射为 subject 字段
      suggestions[mapping.originalField] = 'subject_score';
    }
  });
  
  // 检查必要字段
  const hasName = analysis.studentFields.some(f => f.mappedField === 'name');
  const hasClass = analysis.studentFields.some(f => f.mappedField === 'class_name');
  const hasSubjects = analysis.subjects.length > 0;
  
  if (!hasName) {
    issues.push('未找到学生姓名字段');
  }
  if (!hasClass) {
    issues.push('未找到班级字段');
  }
  if (!hasSubjects) {
    issues.push('未找到任何科目字段');
  }
  
  return {
    suggestions,
    confidence: analysis.confidence,
    issues
  };
} 