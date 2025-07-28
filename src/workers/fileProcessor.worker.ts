// Web Worker for processing large Excel/CSV files
// 解决大文件处理时的UI卡顿问题

import * as XLSX from "xlsx";
import Papa from "papaparse";

// Worker消息类型定义
export interface WorkerMessage {
  type: "PARSE_FILE" | "PARSE_PROGRESS" | "PARSE_COMPLETE" | "PARSE_ERROR";
  payload?: any;
}

export interface ParseFileRequest {
  file: ArrayBuffer;
  fileName: string;
  fileType: "excel" | "csv";
  options?: {
    sheetName?: string;
    encoding?: string;
    delimiter?: string;
    chunkSize?: number;
  };
}

export interface ParseProgress {
  phase: "reading" | "parsing" | "validating" | "formatting";
  progress: number; // 0-100
  message: string;
  currentRow?: number;
  totalRows?: number;
}

export interface ParseResult {
  success: boolean;
  data: any[];
  headers: string[];
  metadata: {
    fileName: string;
    fileSize: number;
    totalRows: number;
    totalColumns: number;
    parseTime: number;
    encoding?: string;
    sheetNames?: string[];
  };
  errors: string[];
  warnings: string[];
}

// 主处理函数
self.onmessage = async function (e: MessageEvent<WorkerMessage>) {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "PARSE_FILE":
        await parseFile(payload as ParseFileRequest);
        break;
      default:
        throw new Error(`未知的消息类型: ${type}`);
    }
  } catch (error) {
    postMessage({
      type: "PARSE_ERROR",
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    } as WorkerMessage);
  }
};

async function parseFile(request: ParseFileRequest): Promise<void> {
  const startTime = Date.now();
  const { file, fileName, fileType, options = {} } = request;

  try {
    // 阶段1: 读取文件
    postProgress({
      phase: "reading",
      progress: 10,
      message: "正在读取文件内容...",
    });

    let parseResult: ParseResult;

    if (fileType === "excel") {
      parseResult = await parseExcelFile(file, fileName, options);
    } else {
      parseResult = await parseCsvFile(file, fileName, options);
    }

    // 计算处理时间
    parseResult.metadata.parseTime = Date.now() - startTime;

    // 发送完成消息
    postMessage({
      type: "PARSE_COMPLETE",
      payload: parseResult,
    } as WorkerMessage);
  } catch (error) {
    postMessage({
      type: "PARSE_ERROR",
      payload: {
        error: error instanceof Error ? error.message : String(error),
        fileName,
      },
    } as WorkerMessage);
  }
}

async function parseExcelFile(
  buffer: ArrayBuffer,
  fileName: string,
  options: any
): Promise<ParseResult> {
  postProgress({
    phase: "parsing",
    progress: 30,
    message: "正在解析Excel文件...",
  });

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  // 获取工作表名称
  const sheetNames = workbook.SheetNames;
  const sheetName = options.sheetName || sheetNames[0];

  if (!sheetNames.includes(sheetName)) {
    throw new Error(
      `工作表 "${sheetName}" 不存在。可用工作表: ${sheetNames.join(", ")}`
    );
  }

  const worksheet = workbook.Sheets[sheetName];

  postProgress({
    phase: "parsing",
    progress: 50,
    message: "正在转换数据格式...",
  });

  // 获取数据范围
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const totalRows = range.e.r + 1;
  const totalColumns = range.e.c + 1;

  // 转换为JSON格式，保持空值
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1, // 使用数组格式，保持原始结构
    defval: "", // 空单元格默认值
    blankrows: false, // 跳过空行
  }) as any[][];

  postProgress({
    phase: "validating",
    progress: 70,
    message: "正在验证数据质量...",
  });

  // 数据验证和清理
  const { cleanData, headers, errors, warnings } = await validateAndCleanData(
    jsonData,
    fileName
  );

  postProgress({
    phase: "formatting",
    progress: 90,
    message: "正在格式化数据...",
  });

  // 最终格式化
  const formattedData = await formatDataForImport(cleanData, headers);

  return {
    success: true,
    data: formattedData,
    headers,
    metadata: {
      fileName,
      fileSize: buffer.byteLength,
      totalRows: cleanData.length,
      totalColumns,
      parseTime: 0, // 将在外部计算
      sheetNames,
    },
    errors,
    warnings,
  };
}

async function parseCsvFile(
  buffer: ArrayBuffer,
  fileName: string,
  options: any
): Promise<ParseResult> {
  postProgress({
    phase: "parsing",
    progress: 30,
    message: "正在解析CSV文件...",
  });

  // 检测编码
  const encoding = options.encoding || detectEncoding(buffer);

  // 转换为文本
  const decoder = new TextDecoder(encoding);
  const text = decoder.decode(buffer);

  postProgress({
    phase: "parsing",
    progress: 50,
    message: "正在分析文件结构...",
  });

  // 解析CSV
  const parseConfig: Papa.ParseConfig = {
    delimiter: options.delimiter || detectDelimiter(text),
    header: false,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
    chunk: options.chunkSize
      ? (results: Papa.ParseResult<any>) => {
          // 分块处理进度回调
          postProgress({
            phase: "parsing",
            progress: 50 + ((results.meta.cursor || 0) / text.length) * 20,
            message: `正在处理数据... ${Math.round(((results.meta.cursor || 0) / text.length) * 100)}%`,
          });
        }
      : undefined,
  };

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      ...parseConfig,
      complete: async (results: Papa.ParseResult<any>) => {
        try {
          postProgress({
            phase: "validating",
            progress: 70,
            message: "正在验证数据质量...",
          });

          const { cleanData, headers, errors, warnings } =
            await validateAndCleanData(results.data, fileName);

          postProgress({
            phase: "formatting",
            progress: 90,
            message: "正在格式化数据...",
          });

          const formattedData = await formatDataForImport(cleanData, headers);

          resolve({
            success: true,
            data: formattedData,
            headers,
            metadata: {
              fileName,
              fileSize: buffer.byteLength,
              totalRows: cleanData.length,
              totalColumns: headers.length,
              parseTime: 0,
              encoding,
            },
            errors: [...errors, ...results.errors.map((e) => e.message)],
            warnings,
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error: Papa.ParseError) => {
        reject(new Error(`CSV解析失败: ${error.message}`));
      },
    });
  });
}

async function validateAndCleanData(
  rawData: any[][],
  fileName: string
): Promise<{
  cleanData: any[][];
  headers: string[];
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawData || rawData.length === 0) {
    throw new Error("文件中没有找到数据");
  }

  // 检测表头
  let headers: string[] = [];
  let dataStartRow = 0;

  // 简单启发式检测：第一行是否为表头
  const firstRow = rawData[0];
  const secondRow = rawData[1];

  if (firstRow && secondRow) {
    const firstRowIsNumbers = firstRow.some(
      (cell) =>
        typeof cell === "number" ||
        (typeof cell === "string" && /^\d+\.?\d*$/.test(cell))
    );

    if (firstRowIsNumbers) {
      // 第一行看起来像数据，自动生成表头
      headers = firstRow.map((_, index) => `列${index + 1}`);
      dataStartRow = 0;
      warnings.push("文件缺少表头，已自动生成列名");
    } else {
      // 第一行是表头
      headers = firstRow.map((cell) => String(cell || "").trim());
      dataStartRow = 1;
    }
  } else {
    headers = firstRow?.map((_, index) => `列${index + 1}`) || [];
    dataStartRow = firstRow ? 1 : 0;
  }

  // 清理数据
  const cleanData = rawData
    .slice(dataStartRow)
    .filter((row) => {
      // 过滤完全空白的行
      return (
        row &&
        row.some(
          (cell) =>
            cell !== null && cell !== undefined && String(cell).trim() !== ""
        )
      );
    })
    .map((row) => {
      // 确保每行的列数与表头一致
      const cleanRow = [...row];
      while (cleanRow.length < headers.length) {
        cleanRow.push("");
      }
      return cleanRow.slice(0, headers.length);
    });

  // 数据质量检查
  if (cleanData.length === 0) {
    throw new Error("文件中没有找到有效数据");
  }

  if (cleanData.length > 10000) {
    warnings.push(`数据量较大 (${cleanData.length} 行)，建议分批导入`);
  }

  // 检查列名重复
  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index && header.trim() !== ""
  );
  if (duplicateHeaders.length > 0) {
    warnings.push(`发现重复的列名: ${duplicateHeaders.join(", ")}`);
  }

  // 检查数据一致性
  const inconsistentRows = cleanData.filter(
    (row) => row.length !== headers.length
  );
  if (inconsistentRows.length > 0) {
    warnings.push(`${inconsistentRows.length} 行数据的列数与表头不一致`);
  }

  return { cleanData, headers, errors, warnings };
}

async function formatDataForImport(
  data: any[][],
  headers: string[]
): Promise<any[]> {
  return data.map((row) => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || "";
    });
    return obj;
  });
}

function detectEncoding(buffer: ArrayBuffer): string {
  // 简单的编码检测
  const uint8Array = new Uint8Array(buffer.slice(0, 1024)); // 检查前1KB

  // 检查BOM
  if (
    uint8Array[0] === 0xef &&
    uint8Array[1] === 0xbb &&
    uint8Array[2] === 0xbf
  ) {
    return "utf-8";
  }
  if (uint8Array[0] === 0xff && uint8Array[1] === 0xfe) {
    return "utf-16le";
  }
  if (uint8Array[0] === 0xfe && uint8Array[1] === 0xff) {
    return "utf-16be";
  }

  // 尝试UTF-8解码，如果失败则使用GBK
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    decoder.decode(uint8Array);
    return "utf-8";
  } catch {
    return "gbk";
  }
}

function detectDelimiter(text: string): string {
  const sample = text.substring(0, 1024); // 检查前1KB
  const delimiters = [",", "\t", ";", "|"];

  let maxCount = 0;
  let bestDelimiter = ",";

  for (const delimiter of delimiters) {
    const count = (sample.match(new RegExp(`\\${delimiter}`, "g")) || [])
      .length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function postProgress(progress: ParseProgress): void {
  postMessage({
    type: "PARSE_PROGRESS",
    payload: progress,
  } as WorkerMessage);
}

// 导出类型供主线程使用
export type { ParseFileRequest, ParseProgress, ParseResult };
