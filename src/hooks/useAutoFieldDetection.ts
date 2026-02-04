import { useState, useCallback } from "react";
import {
  detectEncoding,
  detectDelimiter,
  detectHeaderRow,
  autoMapHeaders,
} from "@/utils/detection";

export interface AutoDetectionResult {
  encoding: string;
  delimiter: string;
  headers: string[];
  headerRow: number;
  mapping: Record<string, { field: string; confidence: number }>;
}

interface UseAutoFieldDetectionOptions {
  confidenceThreshold?: number;
}

export function useAutoFieldDetection(
  options: UseAutoFieldDetectionOptions = {}
) {
  const { confidenceThreshold = 0.8 } = options;
  const [result, setResult] = useState<AutoDetectionResult | null>(null);

  const detect = useCallback(
    async (file: File): Promise<AutoDetectionResult | null> => {
      try {
        // 1. 检查文件类型 - 跳过 Excel 文件
        const name = file.name.toLowerCase();
        const isExcel =
          name.endsWith(".xlsx") ||
          name.endsWith(".xls") ||
          (file.type || "").toLowerCase().includes("spreadsheet");
        if (isExcel) {
          return null;
        }

        // 读取文件为 ArrayBuffer
        const buffer = new Uint8Array(await file.arrayBuffer());

        // 2. 检查 ZIP 魔术字节 (XLSX 是 ZIP 容器)
        const looksLikeZip = buffer[0] === 0x50 && buffer[1] === 0x4b; // "PK"
        if (looksLikeZip) {
          return null;
        }

        const { encoding } = detectEncoding(buffer);

        // 将前几KB转成字符串用于分隔符/表头检测
        const textDecoder = new TextDecoder(encoding || "utf-8");
        const sampleText = textDecoder.decode(buffer.slice(0, 4096));

        // 3. 计算可打印字符比例,过滤二进制文件
        const printableChars = sampleText
          .split("")
          .filter((c) => c >= " " && c !== "\u007f").length;
        const printableRatio = printableChars / Math.max(sampleText.length, 1);
        if (printableRatio < 0.7) {
          return null;
        }

        const lines = sampleText.split(/\r?\n/).filter(Boolean);

        const { delimiter } = detectDelimiter(lines);
        const { headerRow, headers } = detectHeaderRow(lines, delimiter);

        // 4. 过滤包含控制字符或不可读的 headers
        const cleanHeaders = headers.filter((h) => {
          if (!h || h.trim().length === 0) return false;
          const controlCharCount = h
            .split("")
            .filter((c) => c < " " || c === "\u007f").length;
          return controlCharCount / h.length < 0.1;
        });

        const mapping = autoMapHeaders(cleanHeaders);

        const filteredMapping: AutoDetectionResult["mapping"] = {};
        Object.entries(mapping).forEach(([raw, info]) => {
          if (info.confidence >= confidenceThreshold) {
            filteredMapping[raw] = info;
          }
        });

        const res: AutoDetectionResult = {
          encoding,
          delimiter,
          headers: cleanHeaders,
          headerRow,
          mapping: filteredMapping,
        };

        setResult(res);
        return res;
      } catch (error) {
        console.error("[useAutoFieldDetection] 检测失败:", error);
        setResult(null);
        return null;
      }
    },
    [confidenceThreshold]
  );

  return { result, detect };
}
