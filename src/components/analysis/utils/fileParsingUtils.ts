import * as XLSX from "xlsx";

export const standardFields = {
  studentId: ["学号", "id", "student_id", "studentid", "student id", "编号"],
  name: ["姓名", "name", "student_name", "studentname", "student name", "名字"],
  className: [
    "班级",
    "class",
    "class_name",
    "classname",
    "class name",
    "年级班级",
  ],
  subject: ["科目", "subject", "course", "学科"],
  score: ["分数", "成绩", "score", "grade", "mark", "得分"],
  examDate: ["考试日期", "日期", "date", "exam_date", "examdate", "exam date"],
  examType: ["考试类型", "类型", "type", "exam_type", "examtype", "exam type"],
  semester: ["学期", "semester", "term"],
  teacher: ["教师", "老师", "teacher", "instructor"],
};

export const fieldTypes = [
  { id: "text", name: "文本" },
  { id: "number", name: "数字" },
  { id: "date", name: "日期" },
  { id: "enum", name: "枚举值" },
];

export const isBinaryContent = (content: string): boolean => {
  const binarySignatures = [
    "PK\x03\x04",
    "\x25\x50\x44\x46",
    "\xFF\xD8\xFF",
    "\x89\x50\x4E\x47",
  ];

  const hasBinaryChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(
    content.slice(0, 500)
  );
  const hasSignature = binarySignatures.some((sig) =>
    content.slice(0, 20).includes(sig)
  );

  return hasBinaryChars || hasSignature;
};

/**
 * 根据表头，自动完成与系统字段的初步匹配（AI别名/模糊搜索）。
 */
export const generateInitialMappings = (
  headers: string[]
): Record<string, string> => {
  const mappings: Record<string, string> = {};
  const normalized = (str: string) => str.toLowerCase().replace(/[_\s\-]/g, "");

  headers.forEach((header) => {
    let matched = false;
    for (const [standardField, aliases] of Object.entries(standardFields)) {
      // 别名模糊匹配
      if (
        aliases.some(
          (alias) =>
            normalized(header).includes(normalized(alias)) ||
            // 也允许别名包含header
            normalized(alias).includes(normalized(header))
        )
      ) {
        mappings[header] = standardField;
        matched = true;
        break;
      }
    }
    // 如无法识别，留空（后续弹窗手动映射）
    if (!matched) {
      mappings[header] = "";
    }
  });
  return mappings;
};

export const parseCSV = (
  content: string
): { headers: string[]; data: any[] } => {
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) throw new Error("文件为空");

  const headers = lines[0].split(",").map((h) => h.trim());
  const dataTypes = detectDataTypes(
    lines.slice(1, Math.min(10, lines.length)),
    headers
  );

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",");
    const obj: Record<string, any> = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || "";

      if (dataTypes[index] === "number") {
        obj[header] = isNaN(parseFloat(value)) ? value : parseFloat(value);
      } else if (dataTypes[index] === "date") {
        obj[header] = value;
      } else {
        obj[header] = value;
      }
    });

    result.push(obj);
  }

  return { headers, data: result };
};

export const detectDataTypes = (
  sampleLines: string[],
  headers: string[]
): string[] => {
  const dataTypes = headers.map(() => ({ type: "string", confidence: 0 }));

  sampleLines.forEach((line) => {
    const values = line.split(",");
    values.forEach((value, index) => {
      if (index >= dataTypes.length) return;
      const trimmedValue = value.trim();

      if (!isNaN(parseFloat(trimmedValue)) && isFinite(Number(trimmedValue))) {
        dataTypes[index].confidence += 1;
        if (dataTypes[index].type !== "number") {
          dataTypes[index].type = "number";
        }
      }

      const datePatterns = [
        /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
        /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/,
        /^\d{4}年\d{1,2}月\d{1,2}日$/,
      ];

      if (datePatterns.some((pattern) => pattern.test(trimmedValue))) {
        dataTypes[index].confidence += 1;
        dataTypes[index].type = "date";
      }
    });
  });

  return dataTypes.map((dt) => dt.type);
};

export const parseExcel = async (buffer: ArrayBuffer) => {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  if (data.length < 2) {
    throw new Error("Excel文件为空或格式不正确");
  }

  const headers = data[0] as string[];
  const rows = data.slice(1).map((row) => {
    const obj: Record<string, any> = {};
    (row as any[]).forEach((cell, index) => {
      obj[headers[index]] = cell;
    });
    return obj;
  });

  return { headers, data: rows };
};
