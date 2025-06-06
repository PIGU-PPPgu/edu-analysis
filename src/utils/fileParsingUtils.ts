export const standardFields = {
  studentId: ["学号", "id", "student_id", "studentid", "student id", "编号", "序号"],
  name: ["姓名", "name", "student_name", "studentname", "student name", "名字", "学生姓名"],
  className: ["班级", "class", "class_name", "classname", "class name", "年级班级", "班级名称"],
  grade: ["年级", "grade", "grade_level", "gradelevel", "grade level", "学年"],
  subject: ["科目", "subject", "course", "学科", "课程", "课程名称"],
  score: ["分数", "成绩", "score", "grade", "mark", "得分", "考试成绩", "考分"],
  examDate: ["考试日期", "日期", "date", "exam_date", "examdate", "exam date", "测试日期"],
  examType: ["考试类型", "类型", "type", "exam_type", "examtype", "exam type", "测试类型"],
  semester: ["学期", "semester", "term", "学期名称"],
  teacher: ["教师", "老师", "teacher", "instructor", "教师姓名", "任课教师"]
};

export const fieldTypes = [
  { id: "text", name: "文本" },
  { id: "number", name: "数字" },
  { id: "date", name: "日期" },
  { id: "enum", name: "枚举值" }
];

// 检测二进制内容，防止解析非文本文件
export const isBinaryContent = (content: string): boolean => {
  // 检查前500个字符是否有二进制特征
  const sample = content.slice(0, 500);
  
  // 检查是否包含控制字符 (ASCII 0-31，除了常见的 \t, \n, \r)
  const hasBinaryChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(sample);
  
  // 检查是否有常见二进制文件头签名
  const binarySignatures = [
    'PK\x03\x04',    // ZIP (Excel, DOCX等)
    '\x25\x50\x44\x46', // PDF
    '\xFF\xD8\xFF',   // JPEG
    '\x89\x50\x4E\x47'  // PNG
  ];
  
  const hasSignature = binarySignatures.some(sig => sample.includes(sig));
  
  return hasBinaryChars || hasSignature;
};

/**
 * 根据表头，自动完成与系统字段的初步匹配（AI别名/模糊搜索）。
 */
export const generateInitialMappings = (headers: string[]): Record<string, string> => {
  const mappings: Record<string, string> = {};
  const matchedFields = new Set<string>();
  
  // 先尝试完全匹配
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const [standardField, aliases] of Object.entries(standardFields)) {
      // 如果这个标准字段已经被映射，跳过
      if (matchedFields.has(standardField)) continue;
      
      // 检查完全匹配
      if (aliases.some(alias => alias.toLowerCase() === normalizedHeader)) {
        mappings[header] = standardField;
        matchedFields.add(standardField);
        return;
      }
    }
  });
  
  // 再尝试部分匹配
  headers.forEach(header => {
    if (mappings[header]) return; // 已有映射，跳过
    
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const [standardField, aliases] of Object.entries(standardFields)) {
      // 如果这个标准字段已经被映射，跳过
      if (matchedFields.has(standardField)) continue;
      
      if (aliases.some(alias => 
        normalizedHeader.includes(alias.toLowerCase()) ||
        alias.toLowerCase().includes(normalizedHeader)
      )) {
        mappings[header] = standardField;
        matchedFields.add(standardField);
        break;
      }
    }
  });
  
  // 智能推断 - 基于列位置的启发式匹配
  // 常见的列顺序: 学号, 姓名, 班级, 科目, 分数
  const commonPosition = {
    0: 'studentId',
    1: 'name',
    2: 'className',
    3: 'subject',
    4: 'score'
  };
  
  // 对于未匹配的字段，尝试基于位置匹配
  headers.forEach((header, index) => {
    if (!mappings[header] && index in commonPosition) {
      const potentialField = commonPosition[index as keyof typeof commonPosition];
      if (!matchedFields.has(potentialField)) {
        mappings[header] = potentialField;
        matchedFields.add(potentialField);
      }
    }
  });
  
  // 对于未匹配的字段，设置为ignore
  headers.forEach(header => {
    if (!mappings[header]) {
      mappings[header] = "ignore";
    }
  });
  
  return mappings;
};

export const parseCSV = (content: string): { headers: string[], data: any[] } => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) throw new Error("文件为空");
  
  // 检测分隔符：逗号、制表符或分号
  const firstLine = lines[0];
  let separator = ',';
  
  if (firstLine.includes('\t') && firstLine.split('\t').length > 1) {
    separator = '\t';
  } else if (firstLine.includes(';') && !firstLine.includes(',')) {
    separator = ';';
  }
  
  const headers = firstLine.split(separator).map(h => h.trim());
  const dataTypes = detectDataTypes(lines.slice(1, Math.min(10, lines.length)), headers, separator);
  
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // 处理引号包裹的字段（可能包含分隔符）
    let values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // 添加最后一个值
    values.push(currentValue);
    
    // 如果未检测到复杂字段，使用简单分割
    if (values.length <= 1) {
      values = line.split(separator);
    }
    
    const obj: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      let value = values[index]?.trim() || '';
      
      // 移除包裹值的引号
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      if (dataTypes[index] === 'number') {
        obj[header] = isNaN(parseFloat(value)) ? value : parseFloat(value);
      } else if (dataTypes[index] === 'date') {
        obj[header] = value;
      } else {
        obj[header] = value;
      }
    });
    
    result.push(obj);
  }
  
  return { headers, data: result };
};

export const detectDataTypes = (sampleLines: string[], headers: string[], separator: string = ','): string[] => {
  const dataTypes = headers.map(() => ({ type: 'string', confidence: 0 }));
  
  sampleLines.forEach(line => {
    const values = line.split(separator);
    values.forEach((value, index) => {
      if (index >= dataTypes.length) return;
      const trimmedValue = value.trim();
      
      if (!isNaN(parseFloat(trimmedValue)) && isFinite(Number(trimmedValue))) {
        dataTypes[index].confidence += 1;
        if (dataTypes[index].type !== 'number') {
          dataTypes[index].type = 'number';
        }
      }
      
      const datePatterns = [
        /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
        /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/,
        /^\d{4}年\d{1,2}月\d{1,2}日$/
      ];
      
      if (datePatterns.some(pattern => pattern.test(trimmedValue))) {
        dataTypes[index].confidence += 1;
        dataTypes[index].type = 'date';
      }
    });
  });
  
  return dataTypes.map(dt => dt.type);
};

import * as XLSX from 'xlsx';

export const parseExcel = async (buffer: ArrayBuffer) => {
  try {
    console.log('[parseExcel] 开始解析Excel文件，buffer大小:', buffer.byteLength);
    
    // 检查文件大小
    if (buffer.byteLength === 0) {
      throw new Error("Excel文件为空");
    }
    
    // 使用arraybuffer类型读取
    const workbook = XLSX.read(buffer, { 
      type: 'array',
      cellDates: true,  // 自动解析日期
      cellNF: false,    // 不包含格式信息
      cellText: false   // 不转换为文本
    });
    
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Excel文件格式不正确或不包含工作表");
    }

    console.log('[parseExcel] 工作表列表:', workbook.SheetNames);

    // 默认使用第一个工作表
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    
    if (!firstSheet) {
      throw new Error(`工作表 "${firstSheetName}" 不存在`);
    }
    
    // 转换为JSON格式，使用第一行作为表头
    const options = { 
      header: 1, 
      defval: '',
      raw: false,  // 格式化数值
      dateNF: 'yyyy-mm-dd'  // 日期格式
    };
    const data = XLSX.utils.sheet_to_json(firstSheet, options);
    
    console.log('[parseExcel] 原始数据行数:', data.length);
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Excel表格为空或无法读取数据");
    }
    
    if (data.length < 2) {
      throw new Error("Excel表格至少需要包含表头行和一行数据");
    }

    // 处理表头，确保所有表头都是字符串且不为空
    const rawHeaders = data[0] as any[];
    const headers = rawHeaders.map((h, index) => {
      let header = String(h || '').trim();
      if (!header) {
        header = `未命名列${index + 1}`;
      }
      return header;
    }).filter(h => h !== '未命名列' && h.length > 0);
    
    console.log('[parseExcel] 处理后的表头:', headers);
    
    // 检查是否有有效表头
    if (headers.length === 0) {
      throw new Error("表格没有有效的列标题");
    }
    
    // 转换数据行，过滤空行
    const rows = data.slice(1)
      .filter(row => {
        // 过滤完全空白的行
        const rowArray = row as any[];
        return rowArray.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
      })
      .map((row, rowIndex) => {
        const obj: Record<string, any> = {};
        const rowArray = row as any[];
        
        headers.forEach((header, index) => {
          if (index < rowArray.length) {
            let cellValue = rowArray[index];
            
            // 处理不同数据类型
            if (cellValue !== undefined && cellValue !== null) {
              // 如果是日期对象，转换为字符串
              if (cellValue instanceof Date) {
                cellValue = cellValue.toISOString().split('T')[0];
              } else {
                cellValue = String(cellValue).trim();
              }
            } else {
              cellValue = '';
            }
            
            obj[header] = cellValue;
          } else {
            obj[header] = '';
          }
        });
        
        return obj;
      });

    console.log('[parseExcel] 处理后的数据行数:', rows.length);
    
    if (rows.length === 0) {
      throw new Error("Excel表格不包含有效数据行");
    }

    return { 
      headers, 
      data: rows,
      sheetNames: workbook.SheetNames 
    };
  } catch (error) {
    console.error('[parseExcel] Excel解析失败:', error);
    if (error.message?.includes('Unsupported file')) {
      throw new Error("不支持的Excel文件格式，请使用.xlsx或.xls文件");
    }
    throw error;
  }
};

// 增强AI识别力的启发式规则
export const intelligentFieldDetection = (headers: string[], sampleData: any[]): Record<string, string> => {
  const mappings: Record<string, string> = {};
  const matchedFields = new Set<string>();
  
  // 1. 使用复杂启发式规则进行标题识别
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    
    // 1.1 学号识别 - 基于数据特征
    if (!matchedFields.has('studentId') && 
        (normalizedHeader.includes('学') && normalizedHeader.includes('号') || 
         normalizedHeader.includes('id') ||
         normalizedHeader.includes('编号'))) {
      const samples = sampleData.map(row => String(row[header]));
      // 学号通常是数字或固定模式的字符串
      const isIdLike = samples.every(s => /^\d+$/.test(s) || /^[A-Za-z]\d+$/.test(s));
      if (isIdLike) {
        mappings[header] = 'studentId';
        matchedFields.add('studentId');
        return;
      }
    }
    
    // 1.2 姓名识别 - 基于数据特征
    if (!matchedFields.has('name') && 
        (normalizedHeader.includes('姓名') || 
         normalizedHeader.includes('名字') || 
         normalizedHeader.includes('name'))) {
      const samples = sampleData.map(row => String(row[header]));
      // 名字通常是2-4个中文字符或不含数字的字符串
      const isNameLike = samples.every(s => /^[\u4e00-\u9fa5]{2,4}$/.test(s) || !/\d/.test(s));
      if (isNameLike) {
        mappings[header] = 'name';
        matchedFields.add('name');
        return;
      }
    }
    
    // 1.3 成绩识别 - 基于数据特征
    if (!matchedFields.has('score') &&
        (normalizedHeader.includes('分数') || 
         normalizedHeader.includes('成绩') || 
         normalizedHeader.includes('得分') ||
         normalizedHeader.includes('score') ||
         normalizedHeader.includes('mark'))) {
      const samples = sampleData.map(row => Number(row[header]));
      // 成绩通常是0-100之间的数字
      const isScoreLike = samples.every(s => !isNaN(s) && s >= 0 && s <= 150);
      if (isScoreLike) {
        mappings[header] = 'score';
        matchedFields.add('score');
        return;
      }
    }
    
    // 1.4 科目识别 - 基于值域特征
    if (!matchedFields.has('subject') &&
        (normalizedHeader.includes('科目') || 
         normalizedHeader.includes('学科') || 
         normalizedHeader.includes('课程') ||
         normalizedHeader.includes('subject'))) {
      const uniqueValues = new Set(sampleData.map(row => String(row[header])));
      // 科目通常是有限的几个值：语文、数学、英语等
      const commonSubjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
      const matchesCommonSubjects = Array.from(uniqueValues).some(v => 
        commonSubjects.some(s => String(v).includes(s))
      );
      
      if (matchesCommonSubjects || uniqueValues.size < 10) {
        mappings[header] = 'subject';
        matchedFields.add('subject');
        return;
      }
    }
    
    // 1.5 班级识别
    if (!matchedFields.has('className') &&
        (normalizedHeader.includes('班级') || 
         normalizedHeader.includes('班')  || 
         normalizedHeader.includes('class'))) {
      const uniqueValues = new Set(sampleData.map(row => String(row[header])));
      // 班级通常包含"班"字或有特定格式
      const isClassLike = Array.from(uniqueValues).some(v => 
        String(v).includes('班') || /^\d+级\d+班$/.test(String(v)) || /^[高初]\d+[班\(\d+\)]/.test(String(v))
      );
      
      if (isClassLike) {
        mappings[header] = 'className';
        matchedFields.add('className');
        return;
      }
    }
  });
  
  // 2. 基于位置和模式的推断
  if (!matchedFields.has('studentId') || !matchedFields.has('name')) {
    // 查找学号和姓名（通常是前两列）
    for (let i = 0; i < Math.min(headers.length, 2); i++) {
      const header = headers[i];
      if (mappings[header]) continue; // 已有映射，跳过
      
      const samples = sampleData.map(row => String(row[header]));
      
      // 第一列通常是学号
      if (i === 0 && !matchedFields.has('studentId')) {
        // 学号通常是纯数字或有固定格式
        const isIdLike = samples.every(s => /^\d+$/.test(s) || /^[A-Za-z]\d+$/.test(s));
        if (isIdLike) {
          mappings[header] = 'studentId';
          matchedFields.add('studentId');
          continue;
        }
      }
      
      // 第二列通常是姓名
      if (i === 1 && !matchedFields.has('name')) {
        // 名字通常是2-4个中文字符
        const isNameLike = samples.every(s => /^[\u4e00-\u9fa5]{2,4}$/.test(s));
        if (isNameLike) {
          mappings[header] = 'name';
          matchedFields.add('name');
          continue;
        }
      }
    }
  }
  
  // 3. 使用原有别名方法进行补充匹配
  headers.forEach(header => {
    if (mappings[header]) return; // 已有映射，跳过
    
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const [standardField, aliases] of Object.entries(standardFields)) {
      // 如果这个标准字段已经被映射，跳过
      if (matchedFields.has(standardField)) continue;
      
      // 检查完全匹配和部分匹配
      if (aliases.some(alias => 
        alias.toLowerCase() === normalizedHeader ||
        normalizedHeader.includes(alias.toLowerCase()) ||
        alias.toLowerCase().includes(normalizedHeader)
      )) {
        mappings[header] = standardField;
        matchedFields.add(standardField);
        break;
      }
    }
  });
  
  // 4. 对于未匹配的字段，设置为ignore
  headers.forEach(header => {
    if (!mappings[header]) {
      mappings[header] = "ignore";
    }
  });
  
  return mappings;
};

// 增强文件解析函数，使用AI增强功能
export const enhancedGenerateInitialMappings = (headers: string[], sampleData: any[]): Record<string, string> => {
  console.log('[enhancedGenerateInitialMappings] 开始字段映射，表头:', headers);
  console.log('[enhancedGenerateInitialMappings] 样本数据:', sampleData?.slice(0, 2));
  
  // 基本映射
  const basicMappings = generateInitialMappings(headers);
  console.log('[enhancedGenerateInitialMappings] 基础映射结果:', basicMappings);
  
  // 增强映射
  if (sampleData && sampleData.length > 0) {
    // 使用智能检测
    const intelligentMappings = intelligentFieldDetection(headers, sampleData);
    console.log('[enhancedGenerateInitialMappings] 智能映射结果:', intelligentMappings);
    
    // 合并结果，智能检测优先
    const finalMappings = { ...basicMappings, ...intelligentMappings };
    
    // 清理映射结果，移除无意义的映射
    const cleanedMappings: Record<string, string> = {};
    const usedStandardFields = new Set<string>();
    
    // 关键字段优先级
    const requiredFields = ['student_id', 'name', 'class_name', 'score'];
    const priorityFields = [...requiredFields, 'subject', 'exam_date', 'exam_type'];
    
    headers.forEach(header => {
      const mapping = finalMappings[header];
      
      // 如果是高优先级字段且未被使用，保留
      if (priorityFields.includes(mapping) && !usedStandardFields.has(mapping)) {
        cleanedMappings[header] = mapping;
        usedStandardFields.add(mapping);
      }
      // 如果是其他有效字段且未被使用
      else if (mapping && mapping !== 'ignore' && !usedStandardFields.has(mapping)) {
        cleanedMappings[header] = mapping;
        usedStandardFields.add(mapping);
      }
      // 其他情况设为ignore
      else {
        cleanedMappings[header] = 'ignore';
      }
    });
    
    console.log('[enhancedGenerateInitialMappings] 清理后的映射结果:', cleanedMappings);
    return cleanedMappings;
  }
  
  console.log('[enhancedGenerateInitialMappings] 使用基础映射结果:', basicMappings);
  return basicMappings;
};
