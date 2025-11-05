// 合并单元格处理工具
import * as XLSX from "xlsx";

export interface MergedCellInfo {
  range: string;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  value: any;
}

export interface ProcessedTableData {
  data: any[][];
  mergedCells: MergedCellInfo[];
  hasProcessedMerges: boolean;
  warnings: string[];
}

export class MergedCellsProcessor {
  /**
   * 检测并处理合并单元格
   */
  static processMergedCells(worksheet: XLSX.WorkSheet): ProcessedTableData {
    const mergedCells: MergedCellInfo[] = [];
    const warnings: string[] = [];
    let hasProcessedMerges = false;

    // 获取工作表范围
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");

    // 转换为二维数组
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    // 获取合并单元格信息
    if (worksheet["!merges"] && worksheet["!merges"].length > 0) {
      hasProcessedMerges = true;

      worksheet["!merges"].forEach((merge) => {
        const startRow = merge.s.r;
        const endRow = merge.e.r;
        const startCol = merge.s.c;
        const endCol = merge.e.c;

        // 获取合并单元格的值（通常在左上角单元格）
        const cellAddress = XLSX.utils.encode_cell({
          r: startRow,
          c: startCol,
        });
        const cellValue =
          worksheet[cellAddress]?.v || worksheet[cellAddress]?.w || "";

        const mergedCell: MergedCellInfo = {
          range: `${XLSX.utils.encode_cell(merge.s)}:${XLSX.utils.encode_cell(merge.e)}`,
          startRow,
          endRow,
          startCol,
          endCol,
          value: cellValue,
        };

        mergedCells.push(mergedCell);

        // 填充合并单元格的空值
        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            if (!data[row]) data[row] = [];
            if (
              data[row][col] === "" ||
              data[row][col] === null ||
              data[row][col] === undefined
            ) {
              data[row][col] = cellValue;
            }
          }
        }

        warnings.push(
          `检测到合并单元格 ${mergedCell.range}，已自动填充值: "${cellValue}"`
        );
      });
    }

    return {
      data,
      mergedCells,
      hasProcessedMerges,
      warnings,
    };
  }

  /**
   * 智能检测可能的合并单元格模式
   */
  static detectSuspiciousMergePatterns(data: any[][]): {
    suspiciousColumns: number[];
    suspiciousRows: number[];
    patterns: string[];
  } {
    const suspiciousColumns: number[] = [];
    const suspiciousRows: number[] = [];
    const patterns: string[] = [];

    if (!data || data.length === 0) {
      return { suspiciousColumns, suspiciousRows, patterns };
    }

    // 检测列中的空值模式
    const maxCols = Math.max(...data.map((row) => row?.length || 0));

    for (let col = 0; col < maxCols; col++) {
      let emptyCount = 0;
      let nonEmptyCount = 0;
      let lastNonEmptyValue = "";

      for (let row = 0; row < data.length; row++) {
        const cellValue = data[row]?.[col];

        if (cellValue === "" || cellValue === null || cellValue === undefined) {
          emptyCount++;
        } else {
          nonEmptyCount++;
          lastNonEmptyValue = String(cellValue);
        }
      }

      // 如果某列有大量空值但也有非空值，可能是合并单元格
      if (emptyCount > 0 && nonEmptyCount > 0 && emptyCount > nonEmptyCount) {
        suspiciousColumns.push(col);
        patterns.push(
          `列 ${col + 1} 可能存在合并单元格（${emptyCount}个空值，${nonEmptyCount}个非空值）`
        );
      }
    }

    // 检测行中的空值模式
    for (let row = 0; row < data.length; row++) {
      if (!data[row]) continue;

      let emptyCount = 0;
      let nonEmptyCount = 0;

      for (let col = 0; col < data[row].length; col++) {
        const cellValue = data[row][col];

        if (cellValue === "" || cellValue === null || cellValue === undefined) {
          emptyCount++;
        } else {
          nonEmptyCount++;
        }
      }

      // 如果某行大部分为空但有少量非空值，可能是合并单元格
      if (
        emptyCount > 0 &&
        nonEmptyCount > 0 &&
        emptyCount > nonEmptyCount * 2
      ) {
        suspiciousRows.push(row);
        patterns.push(
          `行 ${row + 1} 可能存在合并单元格（${emptyCount}个空值，${nonEmptyCount}个非空值）`
        );
      }
    }

    return { suspiciousColumns, suspiciousRows, patterns };
  }

  /**
   * 智能填充可疑的空值
   */
  static smartFillEmptyValues(
    data: any[][],
    suspiciousColumns: number[]
  ): {
    filledData: any[][];
    fillActions: string[];
  } {
    const filledData = data.map((row) => [...(row || [])]);
    const fillActions: string[] = [];

    suspiciousColumns.forEach((col) => {
      let lastNonEmptyValue = "";
      let fillStartRow = -1;

      for (let row = 0; row < filledData.length; row++) {
        if (!filledData[row]) filledData[row] = [];

        const cellValue = filledData[row][col];

        if (cellValue && cellValue !== "") {
          // 如果之前有空值需要填充
          if (fillStartRow !== -1) {
            for (let fillRow = fillStartRow; fillRow < row; fillRow++) {
              if (!filledData[fillRow]) filledData[fillRow] = [];
              filledData[fillRow][col] = lastNonEmptyValue;
            }
            fillActions.push(
              `列 ${col + 1} 行 ${fillStartRow + 1}-${row} 填充为: "${lastNonEmptyValue}"`
            );
            fillStartRow = -1;
          }

          lastNonEmptyValue = String(cellValue);
        } else {
          // 记录空值的开始位置
          if (fillStartRow === -1 && lastNonEmptyValue) {
            fillStartRow = row;
          }
        }
      }

      // 处理末尾的空值
      if (fillStartRow !== -1 && lastNonEmptyValue) {
        for (
          let fillRow = fillStartRow;
          fillRow < filledData.length;
          fillRow++
        ) {
          if (!filledData[fillRow]) filledData[fillRow] = [];
          filledData[fillRow][col] = lastNonEmptyValue;
        }
        fillActions.push(
          `列 ${col + 1} 行 ${fillStartRow + 1}-${filledData.length} 填充为: "${lastNonEmptyValue}"`
        );
      }
    });

    return { filledData, fillActions };
  }

  /**
   * 完整的合并单元格处理流程
   */
  static processExcelFile(file: File): Promise<{
    originalData: any[][];
    processedData: any[][];
    mergedCells: MergedCellInfo[];
    suspiciousPatterns: string[];
    fillActions: string[];
    warnings: string[];
    hasIssues: boolean;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          // 处理合并单元格
          const mergedResult = this.processMergedCells(worksheet);

          // 检测可疑模式
          const suspiciousResult = this.detectSuspiciousMergePatterns(
            mergedResult.data
          );

          // 智能填充
          const fillResult = this.smartFillEmptyValues(
            mergedResult.data,
            suspiciousResult.suspiciousColumns
          );

          const hasIssues =
            mergedResult.hasProcessedMerges ||
            suspiciousResult.suspiciousColumns.length > 0 ||
            suspiciousResult.suspiciousRows.length > 0;

          resolve({
            originalData: XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: "",
              raw: false,
            }),
            processedData: fillResult.filledData,
            mergedCells: mergedResult.mergedCells,
            suspiciousPatterns: suspiciousResult.patterns,
            fillActions: fillResult.fillActions,
            warnings: [...mergedResult.warnings, ...suspiciousResult.patterns],
            hasIssues,
          });
        } catch (error) {
          reject(new Error(`Excel文件处理失败: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error("文件读取失败"));
      };

      reader.readAsArrayBuffer(file);
    });
  }
}

// 导出工具函数
export const processMergedCells = MergedCellsProcessor.processMergedCells;
export const detectSuspiciousMergePatterns =
  MergedCellsProcessor.detectSuspiciousMergePatterns;
export const smartFillEmptyValues = MergedCellsProcessor.smartFillEmptyValues;
export const processExcelFile = MergedCellsProcessor.processExcelFile;
