import * as XLSX from "xlsx";
import { parseCSV } from "@/utils/fileParsingUtils";
import { supabase } from "@/integrations/supabase/client";
import { analyzeCSVHeaders } from "@/services/intelligentFieldMapper";
import { aiEnhancedFileParser } from "@/services/aiEnhancedFileParser";

// 解析选项接口
export interface ParseOptions {
  useAI?: boolean; // 是否启用AI辅助识别
  aiMode?: "auto" | "force" | "disabled"; // AI模式: auto=自动判断, force=强制使用, disabled=禁用
  minConfidenceForAI?: number; // 算法置信度低于此值时启用AI (默认0.8)
}

// 文件解析结果接口
export interface ParsedFileResult {
  data: any[];
  headers: string[];
  metadata: {
    fileType: string;
    totalRows: number;
    detectedStructure: "wide" | "long" | "mixed";
    confidence: number;
    suggestedMappings: Record<string, string>;
    detectedSubjects: string[];
    autoProcessed: boolean;
    parseMethod?: "algorithm" | "ai-enhanced" | "hybrid"; // 记录使用的解析方法
    examInfo?: {
      title?: string;
      type?: string;
      date?: string;
    };
    unknownFields?: Array<{
      name: string;
      sampleValues: string[];
    }>;
  };
}

// 字段类型枚举
export enum FieldType {
  STUDENT_ID = "student_id",
  NAME = "name",
  CLASS_NAME = "class_name",
  SCORE = "score",
  SUBJECT = "subject",
  EXAM_DATE = "exam_date",
  EXAM_TYPE = "exam_type",
  EXAM_TITLE = "exam_title",
  RANK_IN_CLASS = "rank_in_class",
  RANK_IN_GRADE = "rank_in_grade",
  GRADE = "grade",
  UNKNOWN = "unknown",
}

// 字段识别模式 - 支持更多格式
const FIELD_PATTERNS: Record<FieldType, RegExp[]> = {
  [FieldType.STUDENT_ID]: [/^(学号|学生号|student_?id|id)$/i, /学号/i],
  [FieldType.NAME]: [/^(姓名|学生姓名|name|student_?name)$/i, /姓名/i],
  [FieldType.CLASS_NAME]: [/^(班级|class|class_?name)$/i, /班级/i],
  [FieldType.SCORE]: [
    /^(分数|成绩|得分|score|grade|mark)$/i,
    /分数$/i,
    /成绩$/i,
    /得分$/i,
    // 支持"科目+分数"格式
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)分数$/i,
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)成绩$/i,
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)得分$/i,
  ],
  [FieldType.SUBJECT]: [/^(科目|学科|subject)$/i, /科目/i],
  [FieldType.EXAM_DATE]: [/^(考试日期|日期|date|exam_?date)$/i, /日期/i],
  [FieldType.EXAM_TYPE]: [/^(考试类型|类型|type|exam_?type)$/i, /类型/i],
  [FieldType.EXAM_TITLE]: [/^(考试标题|标题|title|exam_?title)$/i, /标题/i],
  [FieldType.RANK_IN_CLASS]: [
    /^(班级排名|班排|class_?rank|rank_?in_?class)$/i,
    /班级排名/i,
    /班排/i,
    // 支持"科目+班名"格式
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)班名$/i,
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)班级排名$/i,
  ],
  [FieldType.RANK_IN_GRADE]: [
    /^(年级排名|级排|grade_?rank|rank_?in_?grade)$/i,
    /年级排名/i,
    /级排/i,
    // 支持"科目+校名/级名"格式
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)校名$/i,
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)级名$/i,
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)年级排名$/i,
  ],
  [FieldType.GRADE]: [
    /^(等级|评级|level|grade_?level)$/i,
    /等级$/i,
    /评级$/i,
    /级别$/i,
    // 支持"科目+等级"格式 - 增强对等级数据的识别
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)等级$/i,
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)评级$/i,
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)级别$/i,
    // 支持更灵活的等级格式
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治).*?(?:等级|级别|评级)/i,
    /.*?(?:等级|级别|评级).*?(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治)/i,
  ],
  [FieldType.UNKNOWN]: [],
};

// 科目识别模式 - 扩展更多科目
const SUBJECT_PATTERNS = [
  // 主要科目
  { pattern: /语文|chinese/i, subject: "语文" },
  { pattern: /数学|math/i, subject: "数学" },
  { pattern: /英语|english/i, subject: "英语" },
  { pattern: /物理|physics/i, subject: "物理" },
  { pattern: /化学|chemistry/i, subject: "化学" },
  { pattern: /生物|biology/i, subject: "生物" },
  { pattern: /政治|politics/i, subject: "政治" },
  { pattern: /历史|history/i, subject: "历史" },
  { pattern: /地理|geography/i, subject: "地理" },

  // 特殊科目
  { pattern: /道法|道德与法治|思想品德|品德/i, subject: "道德与法治" },
  // 注意：总分不再作为科目处理，而是作为total_score字段

  // 综合科目
  { pattern: /文综|文科综合/i, subject: "文科综合" },
  { pattern: /理综|理科综合/i, subject: "理科综合" },

  // 其他可能的科目
  { pattern: /信息|计算机|computer/i, subject: "信息技术" },
  { pattern: /体育|pe|physical/i, subject: "体育" },
  { pattern: /音乐|music/i, subject: "音乐" },
  { pattern: /美术|art/i, subject: "美术" },
];

export class IntelligentFileParser {
  /**
   * 🚀 解析文件的主入口方法 - 支持AI辅助增强
   * @param file 要解析的文件
   * @param options 解析选项 (可选AI辅助)
   */
  async parseFile(file: File, options?: ParseOptions): Promise<ParsedFileResult> {
    console.log(
      `[IntelligentFileParser] 开始解析文件: ${file.name} (${file.type})`
    );

    // 默认选项
    const opts: ParseOptions = {
      useAI: options?.useAI ?? false,
      aiMode: options?.aiMode ?? "auto",
      minConfidenceForAI: options?.minConfidenceForAI ?? 0.8,
    };

    console.log(`[IntelligentFileParser] 解析模式:`, {
      useAI: opts.useAI,
      aiMode: opts.aiMode,
    });

    const fileType = this.detectFileType(file);
    let rawData: any[] = [];
    let headers: string[] = [];

    // 根据文件类型选择解析方法
    switch (fileType) {
      case "xlsx":
      case "xls":
        console.log(`[IntelligentFileParser] 解析Excel文件: ${fileType}`);
        ({ data: rawData, headers } = await this.parseExcelFile(file));
        break;
      case "csv":
        console.log(`[IntelligentFileParser] 解析CSV文件`);
        ({ data: rawData, headers } = await this.parseCSVFile(file));
        break;
      default:
        throw new Error(
          `不支持的文件类型: ${fileType}。支持的格式：CSV (.csv), Excel (.xlsx, .xls)`
        );
    }

    console.log(
      `[IntelligentFileParser] 文件解析完成: ${rawData.length}行数据, ${headers.length}个字段`
    );
    console.log(`[IntelligentFileParser] 字段列表:`, headers);

    // 数据清洗
    const cleanedData = this.cleanData(rawData);
    console.log(
      `[IntelligentFileParser] 数据清洗完成: ${cleanedData.length}行有效数据`
    );

    // 结构分析
    const structure = this.analyzeDataStructure(headers, cleanedData);
    console.log(`[IntelligentFileParser] 数据结构分析: ${structure}`);

    // 使用增强的智能字段映射
    console.log("[IntelligentFileParser] 开始智能字段映射分析...");
    const intelligentAnalysis = analyzeCSVHeaders(headers);

    // 🚀 智能分析策略: 算法+AI混合模式
    let finalAnalysis = intelligentAnalysis;
    let parseMethod: "algorithm" | "ai-enhanced" | "hybrid" = "algorithm";

    console.log("[IntelligentFileParser] 算法分析结果:", {
      confidence: intelligentAnalysis.confidence,
      mappedFields: intelligentAnalysis.mappings.length,
      subjects: intelligentAnalysis.subjects,
    });

    // 决定是否使用AI辅助
    const shouldUseAI = this.shouldUseAI(opts, intelligentAnalysis.confidence);

    if (shouldUseAI) {
      console.log(`[IntelligentFileParser] 🤖 启用AI辅助解析 (模式: ${opts.aiMode})`);

      try {
        // 模式1: 强制使用完整的AI增强解析
        if (opts.aiMode === "force") {
          console.log("[IntelligentFileParser] 🧠 使用完整AI增强解析引擎...");
          const aiResult = await aiEnhancedFileParser.oneClickParse(file);

          // 使用AI结果,但保留我们的数据清洗和结构分析
          finalAnalysis = {
            mappings: this.convertAIMappingsToIntelligent(aiResult.metadata.suggestedMappings),
            subjects: aiResult.metadata.detectedSubjects,
            confidence: aiResult.metadata.confidence,
            studentFields: intelligentAnalysis.studentFields,
          };
          parseMethod = "ai-enhanced";
          console.log("[IntelligentFileParser] ✅ AI增强解析完成, 置信度:", aiResult.metadata.confidence);
        }
        // 模式2: 自动模式 - AI辅助算法无法识别的字段
        else {
          console.log("[IntelligentFileParser] 🤝 使用混合协同模式...");
          const aiAnalysis = await this.performAIAnalysis(
            headers,
            cleanedData.slice(0, 3)
          );

          if (aiAnalysis && aiAnalysis.confidence > 0.8) {
            // AI只辅助算法无法确定的字段
            const enhancedMappings = this.mergeAlgorithmAndAI(
              intelligentAnalysis,
              aiAnalysis
            );
            finalAnalysis = {
              mappings: enhancedMappings,
              subjects: [
                ...new Set([
                  ...intelligentAnalysis.subjects,
                  ...aiAnalysis.subjects,
                ]),
              ],
              confidence: Math.max(
                intelligentAnalysis.confidence,
                aiAnalysis.confidence * 0.9
              ), // AI辅助结果置信度略降
              studentFields: intelligentAnalysis.studentFields,
            };
            parseMethod = "hybrid";
            console.log("[IntelligentFileParser] ✅ AI辅助增强了算法分析结果");
          } else {
            console.log(
              "[IntelligentFileParser] ⚠️ AI辅助效果不佳，保持算法分析结果"
            );
          }
        }
      } catch (error) {
        console.warn(
          "[IntelligentFileParser] ❌ AI辅助服务不可用，自动降级到纯算法:",
          error instanceof Error ? error.message : "未知AI服务错误"
        );
        // 优雅降级，不影响整体解析流程
        parseMethod = "algorithm";
      }
    } else {
      console.log("[IntelligentFileParser] ⚡ 算法分析置信度足够高或AI已禁用");
    }

    console.log("[IntelligentFileParser] 最终分析结果:", {
      confidence: finalAnalysis.confidence,
      mappedFields: finalAnalysis.mappings.length,
      totalFields: headers.length,
      subjects: finalAnalysis.subjects,
      mappings: finalAnalysis.mappings,
    });

    // 转换映射格式
    const suggestedMappings: Record<string, string> = {};
    finalAnalysis.mappings.forEach((mapping) => {
      suggestedMappings[mapping.originalField] = mapping.mappedField;
    });

    // 科目检测（使用最终分析结果）
    const detectedSubjects = finalAnalysis.subjects;

    // 考试信息推断
    const examInfo = this.inferExamInfo(file.name, headers, cleanedData);

    // 识别未知字段（基于最终分析结果）
    const unknownFields = this.identifyUnknownFields(
      headers,
      cleanedData,
      suggestedMappings
    );

    // 使用最终分析的置信度
    const confidence = finalAnalysis.confidence;

    // 判断是否可以自动处理（置信度高于80%且包含基本字段）
    const hasBasicFields = this.checkBasicFields(suggestedMappings);
    const autoProcessed = confidence >= 0.8 && hasBasicFields;

    console.log(
      `[IntelligentFileParser] 自动处理判断: 置信度=${confidence}, 基本字段完整=${hasBasicFields}, 可自动处理=${autoProcessed}`
    );

    return {
      data: cleanedData,
      headers,
      metadata: {
        fileType,
        totalRows: cleanedData.length,
        detectedStructure: structure,
        confidence,
        suggestedMappings,
        detectedSubjects,
        autoProcessed,
        parseMethod, // 记录使用的解析方法
        examInfo,
        unknownFields,
      },
    };
  }

  /**
   * 🤔 判断是否应该使用AI辅助
   */
  private shouldUseAI(opts: ParseOptions, algorithmConfidence: number): boolean {
    // 模式1: 明确禁用AI
    if (opts.aiMode === "disabled" || opts.useAI === false) {
      return false;
    }

    // 模式2: 强制使用AI
    if (opts.aiMode === "force") {
      return true;
    }

    // 模式3: 自动模式 - 根据算法置信度决定
    const threshold = opts.minConfidenceForAI ?? 0.8;
    return algorithmConfidence < threshold;
  }

  /**
   * 🔄 转换AI映射格式到intelligentFieldMapper格式
   */
  private convertAIMappingsToIntelligent(aiMappings: Record<string, string>): any[] {
    return Object.entries(aiMappings).map(([originalField, mappedField]) => ({
      originalField,
      mappedField,
      dataType: "string", // AI结果默认类型
      confidence: 0.9, // AI结果默认置信度
    }));
  }

  /**
   * 合并算法和AI分析结果：算法为主，AI为辅
   */
  private mergeAlgorithmAndAI(algorithmResult: any, aiResult: any): any[] {
    const mergedMappings = [...algorithmResult.mappings];
    const algorithmFields = new Set(
      algorithmResult.mappings.map((m: any) => m.originalField)
    );

    // AI只辅助算法无法确定的字段
    aiResult.mappings.forEach((aiMapping: any) => {
      if (!algorithmFields.has(aiMapping.originalField)) {
        // 算法没有识别的字段，AI可以补充
        console.log(
          `[AI辅助] 补充算法未识别的字段: ${aiMapping.originalField} -> ${aiMapping.mappedField}`
        );
        mergedMappings.push({
          ...aiMapping,
          confidence: aiMapping.confidence * 0.8, // AI辅助的置信度略降
        });
      } else {
        // 算法已识别的字段，保持算法结果
        console.log(`[算法优先] 保持算法识别结果: ${aiMapping.originalField}`);
      }
    });

    return mergedMappings;
  }

  /**
   * 使用AI进行字段分析（真正的AI调用）
   * 注意：当前AI服务不可用时直接返回null，优雅降级到算法分析
   */
  private async performAIAnalysis(
    headers: string[],
    sampleData: any[]
  ): Promise<{
    mappings: Array<{
      originalField: string;
      mappedField: string;
      subject?: string;
      dataType: string;
      confidence: number;
    }>;
    subjects: string[];
    confidence: number;
  } | null> {
    // 临时禁用AI分析，直接返回null使用算法分析
    // 原因：AI Edge Function存在CORS配置问题或服务不可用
    console.log("[AI分析] AI服务暂时不可用，使用算法分析");
    return null;

    /* 
    // 以下是原AI分析代码，当AI服务修复后可重新启用
    try {
      // 检查是否有AI配置
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[AI分析] 用户未登录，跳过AI分析');
        return null;
      }

      // 获取用户AI配置
      const { data: aiConfig } = await supabase
        .from('user_ai_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('enabled', true)
        .single();

      if (!aiConfig) {
        console.log('[AI分析] 未找到AI配置，跳过AI分析');
        return null;
      }

      console.log('[AI分析] 开始调用AI服务进行字段分析...');

      // 准备AI分析的数据
      const analysisData = {
        headers,
        sampleData: sampleData.slice(0, 3), // 只取前3行作为样本
        context: '这是一个学生成绩数据文件，请分析字段含义并映射到标准字段'
      };

      // 调用Supabase Edge Function进行AI分析
      const { data: aiResult, error } = await supabase.functions.invoke('ai-field-analysis', {
        body: {
          provider: aiConfig.provider,
          data: analysisData
        }
      });

      if (error) {
        console.error('[AI分析] AI服务调用失败:', error);
        return null;
      }

      if (aiResult && aiResult.success) {
        console.log('[AI分析] AI分析成功:', aiResult);
        return {
          mappings: aiResult.mappings || [],
          subjects: aiResult.subjects || [],
          confidence: aiResult.confidence || 0.7
        };
      }

      return null;
    } catch (error) {
      console.error('[AI分析] AI分析过程出错:', error);
      return null;
    }
    */
  }

  /**
   * 检查是否包含基本必需字段
   */
  private checkBasicFields(mappings: Record<string, string>): boolean {
    const mappedFields = Object.values(mappings);

    // 必需字段：学号或姓名至少有一个，且有分数相关字段
    const hasStudentIdentifier =
      mappedFields.includes("student_id") || mappedFields.includes("name");
    const hasScoreField = mappedFields.some(
      (field) =>
        field.includes("score") || field === "score" || field.endsWith("_score")
    );

    console.log(
      `[IntelligentFileParser] 基本字段检查: 学生标识=${hasStudentIdentifier}, 分数字段=${hasScoreField}`
    );

    return hasStudentIdentifier && hasScoreField;
  }

  /**
   * 检测文件类型
   */
  private detectFileType(file: File): string {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    // 优先根据MIME类型判断
    if (fileType.includes("spreadsheet") || fileType.includes("excel")) {
      return "xlsx";
    }

    if (fileType.includes("csv") || fileType === "text/csv") {
      return "csv";
    }

    // 根据文件扩展名判断
    if (fileName.endsWith(".xlsx")) {
      return "xlsx";
    } else if (fileName.endsWith(".xls")) {
      return "xls";
    } else if (fileName.endsWith(".csv")) {
      return "csv";
    }

    // 默认尝试作为CSV处理
    console.warn(
      `[IntelligentFileParser] 无法确定文件类型，默认作为CSV处理: ${fileName} (${fileType})`
    );
    return "csv";
  }

  /**
   * 检测并处理多级表头
   * 示例: 第1行: 语文 | 数学
   *      第2行: 分数 | 等级 | 分数 | 等级
   * 合并为: 语文分数 | 语文等级 | 数学分数 | 数学等级
   */
  private detectAndMergeMultiLevelHeaders(
    jsonData: any[][],
    worksheet: XLSX.WorkSheet
  ): { headers: string[]; dataStartRow: number } {
    if (jsonData.length < 2) {
      // 只有一行,直接返回
      const headers = jsonData[0]
        ?.map((h: any) => String(h || "").trim())
        .filter((h) => h !== "") || [];
      return { headers, dataStartRow: 1 };
    }

    // 检查是否存在合并单元格信息
    const merges = worksheet["!merges"] || [];
    console.log(`[多级表头检测] 发现 ${merges.length} 个合并单元格`);

    // 检测前两行是否为多级表头
    const row1 = jsonData[0] || [];
    const row2 = jsonData[1] || [];

    // 判断标准: 第2行包含"分数、等级、排名"等子字段关键词
    const row2Keywords = ["分数", "成绩", "得分", "等级", "评级", "排名", "班排", "级排", "校排"];
    const hasRow2Keywords = row2.some((cell: any) =>
      row2Keywords.some(keyword => String(cell || "").includes(keyword))
    );

    const row1HasBlanks = row1.some((cell: any, index: number) =>
      !cell && row2[index] // 第1行为空但第2行有值
    );

    const isMultiLevel = merges.length > 0 || hasRow2Keywords || row1HasBlanks;

    if (!isMultiLevel) {
      // 单级表头,直接使用第一行
      const headers = row1
        .map((h: any) => String(h || "").trim())
        .filter((h) => h !== "");
      console.log(`[多级表头检测] 单级表头,使用第1行 (${headers.length}个字段)`);
      return { headers, dataStartRow: 1 };
    }

    // 多级表头处理
    console.log(`[多级表头检测] 检测到多级表头,开始合并...`);

    // 构建合并表头
    const mergedHeaders: string[] = [];
    let currentParent = "";

    for (let colIndex = 0; colIndex < Math.max(row1.length, row2.length); colIndex++) {
      const parentCell = String(row1[colIndex] || "").trim();
      const childCell = String(row2[colIndex] || "").trim();

      // 如果第1行有值,更新当前父字段
      if (parentCell) {
        currentParent = parentCell;
      }

      // 合并父子字段
      if (childCell) {
        if (currentParent && !this.isBasicField(childCell)) {
          // 子字段不是基础字段(姓名、学号等),需要加上父字段前缀
          mergedHeaders.push(`${currentParent}${childCell}`);
        } else {
          // 子字段是基础字段,直接使用
          mergedHeaders.push(childCell);
        }
      } else if (parentCell) {
        // 只有父字段,没有子字段
        mergedHeaders.push(parentCell);
      }
    }

    const filteredHeaders = mergedHeaders.filter(h => h !== "");
    console.log(`[多级表头检测] 合并后表头 (${filteredHeaders.length}个):`, filteredHeaders);

    return { headers: filteredHeaders, dataStartRow: 2 };
  }

  /**
   * 判断是否为基础字段(姓名、学号、班级等)
   */
  private isBasicField(fieldName: string): boolean {
    const basicPatterns = [
      /^(姓名|学生姓名|name)$/i,
      /^(学号|学生号|student_?id|id)$/i,
      /^(班级|class)$/i,
    ];
    return basicPatterns.some(pattern => pattern.test(fieldName));
  }

  /**
   * 解析Excel文件 (支持.xlsx和.xls) - 增强支持多级表头
   */
  private async parseExcelFile(
    file: File
  ): Promise<{ data: any[]; headers: string[] }> {
    try {
      console.log(`[IntelligentFileParser] 开始解析Excel文件: ${file.name}`);

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      // 获取第一个工作表
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error("Excel文件中没有找到工作表");
      }

      console.log(`[IntelligentFileParser] 使用工作表: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];

      // 转换为JSON格式，保持原始数据类型
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // 使用数组格式，第一行作为表头
        defval: "", // 空单元格的默认值
        raw: false, // 不使用原始值，进行格式化
        dateNF: "yyyy-mm-dd", // 日期格式
      }) as any[][];

      if (jsonData.length === 0) {
        throw new Error("Excel文件中没有数据");
      }

      // 🆕 检测并处理多级表头
      const { headers, dataStartRow } = this.detectAndMergeMultiLevelHeaders(
        jsonData,
        worksheet
      );

      if (headers.length === 0) {
        throw new Error("Excel文件中没有有效的表头");
      }

      console.log(`[IntelligentFileParser] 表头解析完成: ${headers.length}个字段, 数据从第${dataStartRow + 1}行开始`);

      // 剩余行作为数据，转换为对象格式
      const data = jsonData
        .slice(dataStartRow)
        .filter(
          (row) =>
            row &&
            row.some(
              (cell) => cell !== null && cell !== undefined && cell !== ""
            )
        )
        .map((row) => {
          const rowObj: any = {};
          headers.forEach((header, index) => {
            const cellValue = row[index];
            // 处理不同类型的数据
            if (cellValue !== null && cellValue !== undefined) {
              if (typeof cellValue === "number") {
                rowObj[header] = cellValue;
              } else if (cellValue instanceof Date) {
                rowObj[header] = cellValue.toISOString().split("T")[0]; // 转换为YYYY-MM-DD格式
              } else {
                rowObj[header] = String(cellValue).trim();
              }
            } else {
              rowObj[header] = "";
            }
          });
          return rowObj;
        });

      console.log(
        `[IntelligentFileParser] Excel解析完成: ${data.length}行数据, ${headers.length}个字段`
      );
      console.log(`[IntelligentFileParser] 示例数据:`, data.slice(0, 2));

      return { data, headers };
    } catch (error) {
      console.error("[IntelligentFileParser] Excel文件解析失败:", error);
      throw new Error(
        `Excel文件解析失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 解析CSV文件
   */
  private async parseCSVFile(
    file: File
  ): Promise<{ data: any[]; headers: string[] }> {
    try {
      const text = await this.readFileAsText(file);
      const result = parseCSV(text);

      if (result.data.length === 0) {
        throw new Error("CSV文件为空或格式不正确");
      }

      return result;
    } catch (error) {
      throw new Error(
        `CSV解析失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  /**
   * 将文件读取为文本
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsText(file);
    });
  }

  /**
   * 数据清洗
   */
  private cleanData(data: any[]): any[] {
    return data
      .map((row) => {
        const cleanedRow: any = {};

        Object.keys(row).forEach((key) => {
          let value = row[key];

          // 去除前后空格
          if (typeof value === "string") {
            value = value.trim();
          }

          // 处理数值
          if (typeof value === "string" && /^\d+\.?\d*$/.test(value)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              value = numValue;
            }
          }

          cleanedRow[key] = value;
        });

        return cleanedRow;
      })
      .filter((row) => {
        // 过滤掉完全空的行
        return Object.values(row).some(
          (val) => val !== "" && val !== null && val !== undefined
        );
      });
  }

  /**
   * 分析数据结构（宽表 vs 长表）
   */
  private analyzeDataStructure(
    headers: string[],
    data: any[]
  ): "wide" | "long" | "mixed" {
    // 检查是否有多个科目列（宽表特征）
    const subjectColumns = headers.filter((header) => {
      return SUBJECT_PATTERNS.some((subjectPattern) =>
        subjectPattern.pattern.test(header.trim())
      );
    });

    // 检查是否有单独的科目列（长表特征）
    const hasSubjectColumn = headers.some((header) =>
      FIELD_PATTERNS[FieldType.SUBJECT].some((pattern) =>
        pattern.test(header.trim())
      )
    );

    if (subjectColumns.length > 2) {
      return "wide"; // 多个科目列，宽表格式
    } else if (hasSubjectColumn) {
      return "long"; // 有科目列，长表格式
    } else {
      return "mixed"; // 混合或不确定
    }
  }

  /**
   * 识别未知字段
   */
  private identifyUnknownFields(
    headers: string[],
    data: any[],
    mappings: Record<string, string>
  ): Array<{ name: string; sampleValues: string[] }> {
    const unknownFields: Array<{ name: string; sampleValues: string[] }> = [];

    headers.forEach((header) => {
      const mapping = mappings[header];

      // 如果字段被标记为未知，收集样本数据
      if (mapping === FieldType.UNKNOWN) {
        const sampleValues: string[] = [];

        // 收集前5个非空值作为样本
        for (
          let i = 0;
          i < Math.min(data.length, 10) && sampleValues.length < 5;
          i++
        ) {
          const value = data[i][header];
          if (value !== null && value !== undefined && value !== "") {
            const stringValue = String(value).trim();
            if (stringValue && !sampleValues.includes(stringValue)) {
              sampleValues.push(stringValue);
            }
          }
        }

        unknownFields.push({
          name: header,
          sampleValues,
        });
      }
    });

    return unknownFields;
  }

  /**
   * 推断考试信息
   */
  private inferExamInfo(filename: string, headers: string[], data: any[]): any {
    const examInfo: any = {};

    // 从文件名推断考试信息
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, "");

    // 检测考试类型
    if (filenameWithoutExt.includes("月考")) {
      examInfo.type = "月考";
    } else if (filenameWithoutExt.includes("期中")) {
      examInfo.type = "期中考试";
    } else if (filenameWithoutExt.includes("期末")) {
      examInfo.type = "期末考试";
    } else if (filenameWithoutExt.includes("模拟")) {
      examInfo.type = "模拟考试";
    } else if (filenameWithoutExt.includes("单元")) {
      examInfo.type = "单元测试";
    }

    // 检测年级和时间
    const gradeMatch = filenameWithoutExt.match(
      /(初|高)?([一二三四五六七八九]|[1-9])(年级|年|级)/
    );
    if (gradeMatch) {
      examInfo.grade = gradeMatch[0];
    }

    const dateMatch = filenameWithoutExt.match(
      /(\d{4})[年\-\/]?(\d{1,2})[月\-\/]?(\d{1,2})?/
    );
    if (dateMatch) {
      const [_, year, month, day] = dateMatch;
      examInfo.date = `${year}-${month.padStart(2, "0")}-${(day || "01").padStart(2, "0")}`;
    }

    // 设置考试标题
    examInfo.title = filenameWithoutExt || "未命名考试";

    return examInfo;
  }
}

// 导出单例实例
export const intelligentFileParser = new IntelligentFileParser();

// 导出便捷函数供其他模块使用
export const parseExcelFile = async (
  file: File
): Promise<{ data: any[]; headers: string[] }> => {
  const parser = new IntelligentFileParser();
  return parser["parseExcelFile"](file);
};

export const parseCSVFile = async (
  file: File
): Promise<{ data: any[]; headers: string[] }> => {
  const parser = new IntelligentFileParser();
  return parser["parseCSVFile"](file);
};
