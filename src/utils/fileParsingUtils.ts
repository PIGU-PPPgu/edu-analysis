export const standardFields = {
  studentId: ["学号", "id", "student_id", "studentid", "student id", "编号"],
  name: ["姓名", "name", "student_name", "studentname", "student name", "名字"],
  className: ["班级", "class", "class_name", "classname", "class name", "年级班级"],
  grade: ["年级", "grade", "grade_level", "gradelevel", "grade level"],
  subject: ["科目", "subject", "course", "学科"],
  score: ["分数", "成绩", "score", "grade", "mark", "得分"],
  examDate: ["考试日期", "日期", "date", "exam_date", "examdate", "exam date"],
  examType: ["考试类型", "类型", "type", "exam_type", "examtype", "exam type"]
};

export const parseCSV = (content: string): { headers: string[], data: any[] } => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) throw new Error("文件为空");
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    const obj: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || '';
    });
    
    result.push(obj);
  }
  
  return { headers, data: result };
};

import * as XLSX from 'xlsx';

export const detectFieldType = (values: string[]): string => {
  let numberCount = 0;
  let dateCount = 0;
  
  for (const value of values) {
    if (!isNaN(Number(value))) {
      numberCount++;
    }
    
    const datePatterns = [
      /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
      /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/,
      /^\d{4}年\d{1,2}月\d{1,2}日$/
    ];
    
    if (datePatterns.some(pattern => pattern.test(value))) {
      dateCount++;
    }
  }
  
  const total = values.length;
  if (numberCount / total > 0.8) return 'number';
  if (dateCount / total > 0.8) return 'date';
  return 'text';
};

export const generateInitialMappings = (headers: string[]): Record<string, string> => {
  const mappings: Record<string, string> = {};
  const matchedFields = new Set<string>();
  
  headers.forEach(header => {
    for (const [standardField, aliases] of Object.entries(standardFields)) {
      if (aliases.some(alias => 
        header.toLowerCase().includes(alias.toLowerCase())
      )) {
        mappings[header] = standardField;
        matchedFields.add(standardField);
        break;
      }
    }
  });
  
  return mappings;
};

export const parseExcel = async (buffer: ArrayBuffer) => {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
  
  if (data.length < 2) {
    throw new Error("Excel文件为空或格式不正确");
  }

  const headers = data[0] as string[];
  const rows = data.slice(1).map(row => {
    const obj: Record<string, any> = {};
    (row as any[]).forEach((cell, index) => {
      obj[headers[index]] = cell;
    });
    return obj;
  });

  return { headers, data: rows };
};
