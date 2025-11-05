/**
 * 🚀 HybridParsingEngine - 高性能AI+算法混合解析引擎
 *
 * 核心设计原则：
 * 1. 性能优先：算法先行，AI辅助，避免不必要的AI调用
 * 2. 智能选择：根据数据特征选择最佳解析策略
 * 3. 分层处理：简单数据用算法，复杂数据用AI
 * 4. 置信度融合：多种方法结果权重合并
 */

interface ParsedField {
  originalName: string;
  mappedName: string;
  confidence: number;
  method: "algorithm" | "ai" | "hybrid";
  dataType: "string" | "number" | "grade" | "rank";
}

interface ParsingResult {
  fields: ParsedField[];
  overallConfidence: number;
  method: "fast" | "standard" | "comprehensive";
  performanceMs: number;
}

// 预定义模式库（高性能算法识别）
const FIELD_PATTERNS = {
  student: {
    patterns: [/姓名|name|学生/i, /学号|id|编号/i, /班级|class/i],
    confidence: 0.95,
  },
  scores: {
    chinese: [/语文|chinese|语/i],
    math: [/数学|math|数/i],
    english: [/英语|english|英/i],
    physics: [/物理|physics|理/i],
    chemistry: [/化学|chemistry|化/i],
    biology: [/生物|biology|生/i],
    politics: [/政治|politics|政|道法/i],
    history: [/历史|history|史/i],
    geography: [/地理|geography|地/i],
    total: [/总分|total|合计|总成绩/i],
  },
  types: {
    score: [/分数|成绩|score|分/i],
    grade: [/等级|级别|grade|等/i],
    rank: [/排名|名次|rank/i],
    classRank: [/班级排名|班排|班名次/i],
    gradeRank: [/年级排名|级排|年排|区排/i],
    schoolRank: [/校排名|校排|学校排名/i],
  },
} as const;

class HybridParsingEngine {
  private performanceCache = new Map<string, ParsingResult>();

  /**
   * 主要解析入口 - 智能选择解析策略
   */
  async parseHeaders(
    headers: string[],
    sampleData?: any[]
  ): Promise<ParsingResult> {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(headers);

    // 缓存检查
    if (this.performanceCache.has(cacheKey)) {
      return this.performanceCache.get(cacheKey)!;
    }

    // 根据数据复杂度选择策略
    const complexity = this.analyzeComplexity(headers, sampleData);
    let result: ParsingResult;

    if (complexity === "simple") {
      result = await this.fastAlgorithmParsing(headers);
    } else if (complexity === "medium") {
      result = await this.standardHybridParsing(headers, sampleData);
    } else {
      result = await this.comprehensiveAIParsing(headers, sampleData);
    }

    result.performanceMs = performance.now() - startTime;

    // 性能优化：只缓存高置信度结果
    if (result.overallConfidence > 0.8) {
      this.performanceCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * 快速算法解析 - 标准模式数据
   */
  private async fastAlgorithmParsing(
    headers: string[]
  ): Promise<ParsingResult> {
    const fields: ParsedField[] = [];

    for (const header of headers) {
      const field = this.algorithmMatch(header);
      if (field) {
        fields.push(field);
      }
    }

    return {
      fields,
      overallConfidence: this.calculateConfidence(fields),
      method: "fast",
      performanceMs: 0,
    };
  }

  /**
   * 标准混合解析 - AI辅助算法
   */
  private async standardHybridParsing(
    headers: string[],
    sampleData?: any[]
  ): Promise<ParsingResult> {
    // 先用算法快速识别明确的字段
    const algorithmFields = headers
      .map((h) => this.algorithmMatch(h))
      .filter(Boolean) as ParsedField[];
    const unmatched = headers.filter(
      (h) => !algorithmFields.some((f) => f.originalName === h)
    );

    // 只对未匹配的字段使用AI
    const aiFields =
      unmatched.length > 0
        ? await this.smartAIAnalysis(unmatched, sampleData)
        : [];

    const allFields = [...algorithmFields, ...aiFields];

    return {
      fields: allFields,
      overallConfidence: this.calculateConfidence(allFields),
      method: "standard",
      performanceMs: 0,
    };
  }

  /**
   * 全面AI解析 - 复杂数据处理
   */
  private async comprehensiveAIParsing(
    headers: string[],
    sampleData?: any[]
  ): Promise<ParsingResult> {
    // 使用AI分析所有字段，但仍然保留算法验证
    const aiResult = await this.smartAIAnalysis(headers, sampleData);
    const algorithmResult = headers
      .map((h) => this.algorithmMatch(h))
      .filter(Boolean) as ParsedField[];

    // 融合结果：AI结果为主，算法结果验证
    const hybridFields = this.fuseResults(aiResult, algorithmResult);

    return {
      fields: hybridFields,
      overallConfidence: this.calculateConfidence(hybridFields),
      method: "comprehensive",
      performanceMs: 0,
    };
  }

  /**
   * 高性能算法匹配
   */
  private algorithmMatch(header: string): ParsedField | null {
    const lowerHeader = header.toLowerCase();

    // 学生信息字段
    for (const pattern of FIELD_PATTERNS.student.patterns) {
      if (pattern.test(lowerHeader)) {
        return {
          originalName: header,
          mappedName: "student_name",
          confidence: FIELD_PATTERNS.student.confidence,
          method: "algorithm",
          dataType: "string",
        };
      }
    }

    // 科目分数字段
    for (const [subject, patterns] of Object.entries(FIELD_PATTERNS.scores)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerHeader)) {
          // 进一步判断是分数、等级还是排名
          const fieldType = this.detectFieldType(lowerHeader);
          return {
            originalName: header,
            mappedName: `${subject}_${fieldType}`,
            confidence: 0.9,
            method: "algorithm",
            dataType:
              fieldType === "score"
                ? "number"
                : fieldType === "grade"
                  ? "grade"
                  : "rank",
          };
        }
      }
    }

    return null;
  }

  /**
   * 字段类型检测
   */
  private detectFieldType(header: string): string {
    for (const [type, patterns] of Object.entries(FIELD_PATTERNS.types)) {
      for (const pattern of patterns) {
        if (pattern.test(header)) {
          return type;
        }
      }
    }
    return "score"; // 默认为分数
  }

  /**
   * 智能AI分析 - 只在必要时调用
   */
  private async smartAIAnalysis(
    headers: string[],
    sampleData?: any[]
  ): Promise<ParsedField[]> {
    // 这里集成现有的AI服务，但加入性能优化
    try {
      // 模拟AI调用（实际项目中替换为真实AI服务）
      const response = await this.callAIService(headers, sampleData);
      return this.parseAIResponse(response);
    } catch (error) {
      console.warn("AI分析失败，使用算法回退:", error);
      return headers
        .map((h) => this.algorithmMatch(h))
        .filter(Boolean) as ParsedField[];
    }
  }

  /**
   * 结果融合 - 多重验证提升置信度
   */
  private fuseResults(
    aiResults: ParsedField[],
    algorithmResults: ParsedField[]
  ): ParsedField[] {
    const fused: ParsedField[] = [];

    for (const aiField of aiResults) {
      const algorithmField = algorithmResults.find(
        (f) => f.originalName === aiField.originalName
      );

      if (algorithmField) {
        // AI和算法都识别到的字段 - 高置信度
        if (algorithmField.mappedName === aiField.mappedName) {
          fused.push({
            ...aiField,
            confidence: Math.min(
              0.98,
              (aiField.confidence + algorithmField.confidence) / 2 + 0.1
            ),
            method: "hybrid",
          });
        } else {
          // 结果不一致 - 选择置信度更高的
          fused.push(
            aiField.confidence > algorithmField.confidence
              ? aiField
              : algorithmField
          );
        }
      } else {
        // 只有AI识别到的字段
        fused.push(aiField);
      }
    }

    // 添加只有算法识别到的字段
    for (const algorithmField of algorithmResults) {
      if (
        !aiResults.some((f) => f.originalName === algorithmField.originalName)
      ) {
        fused.push(algorithmField);
      }
    }

    return fused;
  }

  /**
   * 数据复杂度分析 - 选择合适的解析策略
   */
  private analyzeComplexity(
    headers: string[],
    sampleData?: any[]
  ): "simple" | "medium" | "complex" {
    // 快速启发式判断
    const standardFieldCount = headers.filter((h) =>
      this.algorithmMatch(h)
    ).length;
    const coverage = standardFieldCount / headers.length;

    if (coverage > 0.8) return "simple"; // 标准格式
    if (coverage > 0.5) return "medium"; // 部分标准
    return "complex"; // 复杂格式
  }

  /**
   * 置信度计算
   */
  private calculateConfidence(fields: ParsedField[]): number {
    if (fields.length === 0) return 0;

    const totalConfidence = fields.reduce(
      (sum, field) => sum + field.confidence,
      0
    );
    return Math.min(0.99, totalConfidence / fields.length);
  }

  /**
   * 缓存键生成
   */
  private getCacheKey(headers: string[]): string {
    return headers.sort().join("|");
  }

  /**
   * AI服务调用（占位符 - 实际项目中实现）
   */
  private async callAIService(
    headers: string[],
    sampleData?: any[]
  ): Promise<any> {
    // 这里应该调用实际的AI服务
    // 为了示例，返回模拟数据
    return {
      fields: headers.map((header) => ({
        original: header,
        mapped: `unknown_${header.toLowerCase()}`,
        confidence: 0.6,
      })),
    };
  }

  /**
   * AI响应解析
   */
  private parseAIResponse(response: any): ParsedField[] {
    return response.fields.map((field: any) => ({
      originalName: field.original,
      mappedName: field.mapped,
      confidence: field.confidence,
      method: "ai" as const,
      dataType: "string" as const,
    }));
  }

  /**
   * 性能统计
   */
  getPerformanceStats() {
    return {
      cacheSize: this.performanceCache.size,
      cacheHitRate: 0.85, // 模拟值，实际项目中计算
    };
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.performanceCache.clear();
  }
}

// 单例实例
export const hybridParsingEngine = new HybridParsingEngine();

// 简化的使用接口
export async function parseFieldsWithHighConfidence(
  headers: string[],
  sampleData?: any[]
): Promise<ParsingResult> {
  return hybridParsingEngine.parseHeaders(headers, sampleData);
}

export default HybridParsingEngine;
