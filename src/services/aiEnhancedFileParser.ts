import { supabase } from '@/integrations/supabase/client';
import { ParsedFileResult, FieldType } from './intelligentFileParser';
import { parseCSV } from '@/utils/fileParsingUtils';
import * as XLSX from 'xlsx';
// 导入AI服务相关功能
import { getAIClient } from './aiService';
import { getUserAIConfig, getUserAPIKey } from '@/utils/userAuth';

// AI分析结果接口
export interface AIAnalysisResult {
  examInfo: {
    title: string;
    type: string;
    date: string;
    grade?: string;
    scope: 'class' | 'grade' | 'school';
  };
  fieldMappings: Record<string, string>;
  subjects: string[];
  dataStructure: 'wide' | 'long' | 'mixed';
  confidence: number;
  processing: {
    requiresUserInput: boolean;
    issues: string[];
    suggestions: string[];
  };
}

// 完整的AI文件分析请求
export interface AIFileAnalysisRequest {
  filename: string;
  headers: string[];
  sampleRows: any[];
  totalRows: number;
}

export class AIEnhancedFileParser {
  
  /**
   * 🚀 一键智能解析 - 主入口方法
   * 实现"拖文件进来，等分析报告出来"的体验
   */
  async oneClickParse(file: File): Promise<ParsedFileResult> {
    console.log(`[AIEnhancedFileParser] 🚀 开始一键智能解析: ${file.name}`);
    
    try {
      // 第一步：基础文件解析
      const { data, headers } = await this.parseRawFile(file);
      console.log(`[AIEnhancedFileParser] ✅ 文件解析完成: ${data.length}行 x ${headers.length}列`);
      
      // 第二步：AI全局分析（核心优化）
      const aiAnalysis = await this.aiAnalyzeCompleteFile({
        filename: file.name,
        headers,
        sampleRows: data.slice(0, 10), // 提供更多样本给AI
        totalRows: data.length
      });
      
      console.log(`[AIEnhancedFileParser] 🤖 AI分析完成，置信度: ${aiAnalysis.confidence}`);
      
      // 第三步：数据转换和验证
      const processedData = await this.processDataWithAIGuidance(data, headers, aiAnalysis);
      
      // 第四步：生成最终结果
      const result: ParsedFileResult = {
        data: processedData,
        headers,
        metadata: {
          fileType: this.detectFileType(file),
          totalRows: data.length,
          detectedStructure: aiAnalysis.dataStructure,
          confidence: aiAnalysis.confidence,
          suggestedMappings: aiAnalysis.fieldMappings,
          detectedSubjects: aiAnalysis.subjects,
          autoProcessed: true,
          examInfo: aiAnalysis.examInfo,
          unknownFields: this.findUnknownFields(headers, aiAnalysis.fieldMappings)
        }
      };
      
      console.log(`[AIEnhancedFileParser] 🎉 一键解析完成！置信度: ${aiAnalysis.confidence}`);
      return result;
      
    } catch (error) {
      console.error('[AIEnhancedFileParser] ❌ AI解析失败，降级到传统解析:', error);
      // 失败时降级到传统解析（算法兜底）
      return this.fallbackToTraditionalParse(file);
    }
  }
  
  /**
   * 🤖 AI全局文件分析 - 核心优化
   * 让AI一次性分析整个文件，提供丰富的上下文信息
   */
  private async aiAnalyzeCompleteFile(request: AIFileAnalysisRequest): Promise<AIAnalysisResult> {
    console.log('[AIEnhancedFileParser] 🧠 开始AI全局分析...');
    
    try {
      // 1. 获取用户AI配置
      const aiConfig = await getUserAIConfig();
      if (!aiConfig || !aiConfig.enabled) {
        throw new Error('AI分析功能未启用，请先在AI设置中配置并启用');
      }
      
      console.log(`[AIEnhancedFileParser] 📋 使用AI配置: ${aiConfig.provider} - ${aiConfig.version}`);
      
      // 2. 获取API密钥
      const apiKey = await getUserAPIKey(aiConfig.provider);
      if (!apiKey) {
        throw new Error(`未找到${aiConfig.provider}的API密钥，请在AI设置中配置`);
      }
      
             // 3. 创建AI客户端
       const client = await getAIClient(aiConfig.provider, aiConfig.version, false);
       if (!client) {
         throw new Error(`无法创建${aiConfig.provider}的AI客户端，请检查配置`);
       }
      
      console.log('[AIEnhancedFileParser] 🤖 AI客户端创建成功，开始分析...');
      
      // 4. 构建提示词
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildComprehensivePrompt(request);
      
      // 5. 发送AI请求
      let response;
      if ('sendRequest' in client) {
        // 使用GenericAIClient
        response = await client.sendRequest([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ], {
          temperature: 0.1,
          maxTokens: 2000
        });
      } else {
        // 使用OpenAI原生客户端
        response = await client.chat.completions.create({
          model: aiConfig.version,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        });
      }
      
      // 6. 解析AI响应
      const content = response.choices[0]?.message?.content || '';
      if (!content) {
        throw new Error('AI返回内容为空');
      }
      
      console.log('[AIEnhancedFileParser] ✅ AI分析完成，解析响应...');
      console.log('[AIEnhancedFileParser] 📄 AI响应预览:', content.substring(0, 200) + '...');
      
      return this.parseAIAnalysisResponse(content);
      
    } catch (error) {
      console.error('[AIEnhancedFileParser] ❌ AI分析过程出错:', error);
      throw error;
    }
  }
  
  /**
   * 📝 构建全面的AI提示词 - 核心优化
   * 提供丰富的上下文信息，让AI充分发挥语义理解能力
   * 特别优化长表格vs宽表格的识别逻辑
   */
  private buildComprehensivePrompt(request: AIFileAnalysisRequest): string {
    const { filename, headers, sampleRows, totalRows } = request;
    
    return `
# 🎓 教育数据智能分析任务

你是一位专业的教育数据分析专家，擅长识别各种成绩数据格式。请仔细分析以下学生成绩文件并提供完整的解析方案。

## 📁 文件基本信息
- **文件名**: ${filename}
- **数据规模**: ${totalRows} 行 x ${headers.length} 列
- **字段列表**: ${headers.join('、')}

## 📊 样本数据分析
${this.formatSampleData(headers, sampleRows)}

## 🔍 关键分析任务

### 1. 📋 数据结构识别（重点）
**请仔细判断数据组织方式，这直接影响人数统计的准确性：**

**🔸 宽表格式 (Wide Format)**：
- 特征：一行代表一个学生，多列代表不同科目或属性
- 示例：学号 | 姓名 | 班级 | 语文 | 数学 | 英语 | 物理
- 人数计算：总行数 = 学生人数
- 识别要点：
  * 第一列通常是学号/姓名
  * 有多个科目列（语文、数学、英语等）
  * 每行数据代表一个完整的学生记录

**🔸 长表格式 (Long Format)**：
- 特征：多行代表一个学生的不同科目成绩
- 示例：学号 | 姓名 | 班级 | 科目 | 分数
- 人数计算：总行数 ÷ 科目数 = 学生人数
- 识别要点：
  * 有专门的"科目"列
  * 同一学生的学号/姓名会重复出现
  * 每行数据代表一个学生的单科成绩

**🔸 混合格式 (Mixed Format)**：
- 特征：部分宽表 + 部分长表的混合结构
- 需要特殊处理逻辑

### 2. 🎯 考试信息推断
根据文件名和数据内容，推断考试的基本信息：
- **考试名称**：从文件名提取（如：九年级上学期期中考试、907九下月考）
- **考试类型**：月考/期中/期末/模拟/单元测试
- **考试日期**：YYYY-MM-DD格式，如无法确定使用当前日期
- **年级信息**：如：九年级、初三、高一等
- **考试范围**：
  * class: 班级内考试（文件名包含具体班级）
  * grade: 年级考试（文件名包含年级信息）
  * school: 全校考试（文件名包含"全校"或涉及多个年级）

### 3. 🗺️ 字段智能映射
分析每个字段的含义并映射到标准字段：

**基础字段**：
- student_id: 学号/编号/考号
- name: 学生姓名/姓名
- class_name: 班级信息/班级

**成绩字段**：
- [科目]_score: 各科分数（如：语文_score, 数学_score）
- [科目]_grade: 各科等级（如：语文_grade）
- [科目]_rank_class: 班级排名（如：语文_rank_class）
- [科目]_rank_grade: 年级排名（如：语文_rank_grade）
- total_score: 总分/合计

### 4. 📚 科目识别
识别文件中包含的所有科目：
**常见科目**：语文、数学、英语、物理、化学、生物、政治、历史、地理、道德与法治、总分

### 5. 👥 人数统计验证
**根据数据结构计算实际学生人数：**
- 宽表格式：学生人数 = 数据行数
- 长表格式：学生人数 = 数据行数 ÷ 科目数
- 混合格式：需要去重计算唯一学生数

## 📋 输出要求

请以JSON格式返回分析结果，特别注意数据结构的准确识别：

\`\`\`json
{
  "examInfo": {
    "title": "907九下月考成绩",
    "type": "月考",
    "date": "2024-11-15",
    "grade": "九年级",
    "scope": "grade"
  },
  "fieldMappings": {
    "学号": "student_id",
    "姓名": "name",
    "班级": "class_name",
    "语文": "语文_score",
    "数学": "数学_score",
    "语文班名": "语文_rank_class"
  },
  "subjects": ["语文", "数学", "英语", "物理"],
  "dataStructure": "wide",
  "confidence": 0.95,
  "processing": {
    "requiresUserInput": false,
    "issues": [],
    "suggestions": [
      "检测到宽表格式，预计学生人数: ${totalRows}人",
      "数据质量良好，可以直接处理"
    ]
  }
}
\`\`\`

## 🔍 分析重点提醒

1. **数据结构判断是关键**：仔细观察样本数据，判断是宽表还是长表
2. **人数统计要准确**：根据数据结构正确计算学生人数
3. **语义理解优先**：重点关注字段的语义含义，不仅仅是关键词匹配
4. **上下文关联**：结合文件名、字段组合、数据模式进行综合判断
5. **教育领域知识**：运用教育测评和成绩管理的专业知识

请开始分析并返回JSON结果。
`;
  }
  
  /**
   * 🤖 系统提示词 - 定义AI角色和能力
   */
  private getSystemPrompt(): string {
    return `
你是一位资深的教育数据分析专家，具备以下专业能力：

1. **教育领域专业知识**
   - 熟悉中小学教学体系和考试制度
   - 了解成绩管理和学生评价方法
   - 掌握教育统计和数据分析技术

2. **数据处理专业技能**
   - 精通各种数据格式和结构分析
   - 能够识别数据质量问题
   - 擅长字段语义理解和映射

3. **智能分析能力**
   - 能够从文件名和数据中推断考试信息
   - 善于识别隐含的数据关系和模式
   - 可以提供数据处理的最佳实践建议

请基于这些专业能力，对用户提供的教育数据文件进行全面、准确的分析。
`;
  }
  
  /**
   * 📊 格式化样本数据用于AI分析
   */
  private formatSampleData(headers: string[], sampleRows: any[]): string {
    if (sampleRows.length === 0) return '无样本数据';
    
    let result = '```\n';
    result += headers.join('\t') + '\n';
    result += '-'.repeat(headers.join('\t').length) + '\n';
    
    sampleRows.slice(0, 5).forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return value !== undefined && value !== null ? String(value) : '';
      });
      result += values.join('\t') + '\n';
    });
    
    result += '```';
    return result;
  }
  
  /**
   * 🔍 解析AI分析响应
   */
  private parseAIAnalysisResponse(content: string): AIAnalysisResult {
    console.log('[AIEnhancedFileParser] 🔍 解析AI响应...');
    
    try {
      // 提取JSON部分
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI响应中未找到JSON格式的结果');
      }
      
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const result = JSON.parse(jsonStr);
      
      // 验证和补充结果
      return this.validateAndEnhanceAIResult(result);
      
    } catch (error) {
      console.error('[AIEnhancedFileParser] ❌ AI响应解析失败:', error);
      console.log('[AIEnhancedFileParser] 原始响应:', content);
      
      // 返回默认结果
      return this.getDefaultAIResult();
    }
  }
  
  /**
   * ✅ 验证和增强AI分析结果
   */
  private validateAndEnhanceAIResult(result: any): AIAnalysisResult {
    const enhanced: AIAnalysisResult = {
      examInfo: {
        title: result.examInfo?.title || '未命名考试',
        type: result.examInfo?.type || '考试',
        date: result.examInfo?.date || new Date().toISOString().split('T')[0],
        grade: result.examInfo?.grade,
        scope: result.examInfo?.scope || 'class'
      },
      fieldMappings: result.fieldMappings || {},
      subjects: result.subjects || [],
      dataStructure: result.dataStructure || 'wide',
      confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
      processing: {
        requiresUserInput: result.processing?.requiresUserInput || false,
        issues: result.processing?.issues || [],
        suggestions: result.processing?.suggestions || []
      }
    };
    
    console.log('[AIEnhancedFileParser] ✅ AI结果验证完成:', enhanced);
    return enhanced;
  }
  
  /**
   * 🔄 基础文件解析（支持Excel和CSV）
   */
  private async parseRawFile(file: File): Promise<{ data: any[], headers: string[] }> {
    const fileType = this.detectFileType(file);
    
    if (fileType === 'csv') {
      const text = await this.readFileAsText(file);
      const { data, headers } = parseCSV(text);
      return { data, headers };
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      return this.parseExcelFile(file);
    } else {
      throw new Error(`不支持的文件类型: ${fileType}`);
    }
  }
  
  /**
   * 📊 Excel文件解析
   */
  private async parseExcelFile(file: File): Promise<{ data: any[], headers: string[] }> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('Excel文件为空');
    }
    
    const headers = jsonData[0] as string[];
    const data = jsonData.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = (row as any[])[index];
      });
      return obj;
    });
    
    return { data, headers };
  }
  
  /**
   * 🔍 文件类型检测
   */
  private detectFileType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }
  
  /**
   * 📖 文件内容读取
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, 'utf-8');
    });
  }
  
  /**
   * 🔧 基于AI指导处理数据
   */
  private async processDataWithAIGuidance(
    data: any[],
    headers: string[],
    aiAnalysis: AIAnalysisResult
  ): Promise<any[]> {
    console.log('[AIEnhancedFileParser] 🔧 基于AI指导处理数据...');
    
    // 数据清洗
    const cleanedData = data.filter(row => {
      // 过滤空行和无效行
      return Object.values(row).some(value => value !== null && value !== undefined && value !== '');
    });
    
    // 根据AI分析的数据结构处理数据
    if (aiAnalysis.dataStructure === 'wide') {
      return this.processWideFormat(cleanedData, aiAnalysis);
    } else if (aiAnalysis.dataStructure === 'long') {
      return this.processLongFormat(cleanedData, aiAnalysis);
    } else {
      return cleanedData; // 混合格式暂时直接返回
    }
  }
  
  /**
   * 📊 处理宽表格式数据
   */
  private processWideFormat(data: any[], aiAnalysis: AIAnalysisResult): any[] {
    return data.map(row => {
      const processedRow: any = { ...row };
      
      // 基于AI的字段映射重命名字段
      Object.entries(aiAnalysis.fieldMappings).forEach(([originalField, mappedField]) => {
        if (row[originalField] !== undefined) {
          processedRow[mappedField] = row[originalField];
          // 如果是新字段名，删除原字段
          if (originalField !== mappedField) {
            delete processedRow[originalField];
          }
        }
      });
      
      // 添加考试信息
      processedRow._examInfo = aiAnalysis.examInfo;
      
      return processedRow;
    });
  }
  
  /**
   * 📋 处理长表格式数据
   */
  private processLongFormat(data: any[], aiAnalysis: AIAnalysisResult): any[] {
    // 长表格式的处理逻辑
    return data.map(row => {
      const processedRow: any = { ...row };
      processedRow._examInfo = aiAnalysis.examInfo;
      return processedRow;
    });
  }
  
  /**
   * ❓ 查找未知字段
   */
  private findUnknownFields(headers: string[], mappings: Record<string, string>): Array<{ name: string; sampleValues: string[] }> {
    return headers
      .filter(header => !mappings[header] || mappings[header] === 'unknown')
      .map(header => ({
        name: header,
        sampleValues: [] // 可以添加样本值
      }));
  }
  
  /**
   * 🔄 传统解析降级方案（算法兜底）
   */
  private async fallbackToTraditionalParse(file: File): Promise<ParsedFileResult> {
    console.log('[AIEnhancedFileParser] 🔄 使用传统解析方案...');
    
    // 导入并使用原有的智能解析器
    const { IntelligentFileParser } = await import('./intelligentFileParser');
    const traditionalParser = new IntelligentFileParser();
    
    return traditionalParser.parseFile(file);
  }
  
  /**
   * 🛡️ 默认AI结果（兜底方案）
   */
  private getDefaultAIResult(): AIAnalysisResult {
    return {
      examInfo: {
        title: '未命名考试',
        type: '考试',
        date: new Date().toISOString().split('T')[0],
        scope: 'class'
      },
      fieldMappings: {},
      subjects: [],
      dataStructure: 'wide',
      confidence: 0.3,
      processing: {
        requiresUserInput: true,
        issues: ['AI分析失败，需要用户手动配置'],
        suggestions: ['请手动检查字段映射']
      }
    };
  }
} 