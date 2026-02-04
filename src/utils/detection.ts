import jschardet from "jschardet";

export type DetectedEncoding = {
  encoding: string;
  confidence: number;
};

export type DetectedDelimiter = {
  delimiter: string;
  confidence: number;
};

export type DetectedHeader = {
  headerRow: number;
  headers: string[];
};

// 检测编码，默认UTF-8
export function detectEncoding(buffer: Uint8Array): DetectedEncoding {
  try {
    const detection = jschardet.detect(buffer);
    if (!detection.encoding) {
      return { encoding: "UTF-8", confidence: 1 };
    }
    return {
      encoding: detection.encoding.toUpperCase(),
      confidence: detection.confidence || 0,
    };
  } catch {
    return { encoding: "UTF-8", confidence: 0 };
  }
}

// 基于前几行文本检测分隔符
export function detectDelimiter(
  lines: string[],
  candidates = [",", "\t", ";"]
): DetectedDelimiter {
  const sample = lines.slice(0, 5);
  let best: DetectedDelimiter = { delimiter: ",", confidence: 0 };

  for (const delimiter of candidates) {
    const splits = sample.map((l) => l.split(delimiter).length);
    const avg = splits.reduce((a, b) => a + b, 0) / splits.length;
    const variance =
      splits.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / splits.length;

    // 行拆分数稳定且列数>1，置信度较高
    const confidence = avg > 1 ? 1 / (1 + variance) : 0;
    if (confidence > best.confidence) {
      best = { delimiter, confidence };
    }
  }

  if (best.confidence === 0) {
    return { delimiter: ",", confidence: 0 };
  }
  return best;
}

// 检测表头行：找到包含最多非空列的行
export function detectHeaderRow(
  lines: string[],
  delimiter: string
): DetectedHeader {
  let bestRow = 0;
  let bestScore = 0;
  let headers: string[] = [];

  lines.slice(0, 10).forEach((line, idx) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    const nonEmpty = cols.filter(Boolean).length;
    if (nonEmpty > bestScore) {
      bestScore = nonEmpty;
      bestRow = idx;
      headers = cols;
    }
  });

  return { headerRow: bestRow, headers };
}

// 字段别名词典
const FIELD_ALIASES: Record<string, string[]> = {
  name: ["姓名", "名字", "学生姓名", "学生"],
  student_id: ["学号", "学生ID", "学生编号", "id"],
  class_name: ["班级", "班级名称", "班级名", "class"],
  subject: ["科目", "学科", "课程", "科目名称"],
  score: ["分数", "成绩", "总分", "得分"],
  exam_title: ["考试名称", "考试", "考试标题", "试卷名称"],
  exam_date: ["考试日期", "日期", "考日期", "exam_date"],
};

// 根据表头自动映射字段，并计算置信度
export function autoMapHeaders(headers: string[]) {
  const mapping: Record<string, { field: string; confidence: number }> = {};

  headers.forEach((header) => {
    const h = header.trim().toLowerCase();
    let bestField = "";
    let bestScore = 0;

    Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
      aliases.forEach((alias) => {
        const score = similarity(h, alias.toLowerCase());
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      });
    });

    if (bestField) {
      mapping[header] = { field: bestField, confidence: bestScore };
    }
  });

  return mapping;
}

// 简单相似度：重叠子串比例
function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const min = Math.min(a.length, b.length);
  let match = 0;
  for (let i = 0; i < min; i++) {
    if (a[i] === b[i]) match++;
  }
  return match / Math.max(a.length, b.length);
}
