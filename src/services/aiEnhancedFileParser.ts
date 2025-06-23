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
   * 融合n8n配置文件的详细字段映射规则
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
- **考试类型**：月考/期中考试/期末考试/模拟考试/单元测试
- **考试日期**：YYYY-MM-DD格式，如无法确定使用当前日期
- **年级信息**：如：九年级、初三、高一等
- **考试范围**：
  * class: 班级内考试（文件名包含具体班级）
  * grade: 年级考试（文件名包含年级信息）
  * school: 全校考试（文件名包含"全校"或涉及多个年级）

### 3. 🗺️ 精准字段映射（基于n8n配置规则）

**🔸 学生身份识别字段（必需）**：
- **学号/编号** → student_id：
  * 候选模式：学号、student_id、学生学号、学生编号、id、studentId、考生号、准考证号、学籍号、编号、学生ID
  * 验证规则：必须非空，1-50个字符，字母数字组合，格式如：20230101、S001等
  * 识别特征：通常为第一列，格式统一的标识符
  
- **姓名** → name：
  * 候选模式：name、姓名、学生姓名、名称、studentName、考生姓名、学生、真实姓名、学员姓名
  * 验证规则：必须非空，1-100个字符，通常为中文姓名
  * 识别特征：人名格式，如"张三"、"李小明"等

**🔸 班级信息字段（可选但重要）**：
- **班级** → class_name：
  * 候选模式：class_name、班级、行政班级、教学班、现班、所在班级、class、className、classname、班级名称、班次、班别、年级班级、班组、分班、班
  * 标准化规则：统一为"初三7班"、"高二3班"格式

**🔸 科目成绩字段（核心数据）**：

**主要科目（满分150分，宽表时映射到[科目]_score）**：
- **语文**：候选模式：语文、语文分数、语文成绩、chinese、chinese_score
  * 验证：0-150分，数值类型
  * 宽表映射：chinese_score，长表映射：subject="语文", score=[分数值]
- **数学**：候选模式：数学、数学分数、数学成绩、math、math_score  
  * 验证：0-150分，数值类型
  * 宽表映射：math_score，长表映射：subject="数学", score=[分数值]
- **英语**：候选模式：英语、英语分数、英语成绩、english、english_score
  * 验证：0-150分，数值类型
  * 宽表映射：english_score，长表映射：subject="英语", score=[分数值]

**理科科目（满分100分）**：
- **物理**：候选模式：物理、物理分数、物理成绩、physics、physics_score
  * 验证：0-100分，数值类型
- **化学**：候选模式：化学、化学分数、化学成绩、chemistry、chemistry_score
  * 验证：0-100分，数值类型
- **生物**：候选模式：生物、生物分数、生物成绩、biology、biology_score
  * 验证：0-100分，数值类型

**文科科目（满分100分）**：
- **政治**：候选模式：政治、政治分数、政治成绩、道法、道法分数、道法成绩、politics、politics_score
  * 验证：0-100分，数值类型
- **历史**：候选模式：历史、历史分数、历史成绩、history、history_score
  * 验证：0-100分，数值类型
- **地理**：候选模式：地理、地理分数、地理成绩、geography、geography_score
  * 验证：0-100分，数值类型

**统计字段**：
- **总分** → total_score：总分、总分分数、总成绩、total、total_score、总计、合计
  * 验证：0-1000分，数值类型
  * 识别特征：通常是所有科目分数的总和

**🔸 等级字段**：
- **[科目]等级** → [科目]_grade：如"语文等级" → chinese_grade
  * 有效等级：A+、A、A-、B+、B、B-、C+、C、C-、D+、D、E
  * 验证：文本类型，必须是有效等级值
  * 识别特征：包含字母和可能的+/-符号

**🔸 排名字段**：
- **班级排名** → rank_in_class：班级排名、班名、班内排名、class_rank、班排名、[科目]班级排名
  * 验证：正整数，1-100范围内（常见班级人数）
  * 识别特征：包含"班"字且为数值
- **年级排名** → rank_in_grade：年级排名、年名、年级内排名、grade_rank、年排名、[科目]年级排名
  * 验证：正整数，1-1000范围内（常见年级人数）
  * 识别特征：包含"年级"字且为数值
- **学校排名** → rank_in_school：学校排名、校排名、全校排名
  * 验证：正整数，1-5000范围内（常见学校人数）
  * 识别特征：包含"校"字且为数值

### 4. 📚 智能科目识别
识别文件中包含的所有科目（基于字段模式匹配）：
**核心科目**：语文、数学、英语、物理、化学、生物、政治、历史、地理
**其他科目**：体育、音乐、美术、信息技术、通用技术
**特殊字段**：总分、平均分

### 5. 🔧 数据清洗和验证规则（关键质量控制）

**🔸 分数范围智能验证**：
- **主科（语文/数学/英语）**：0-150分，超出范围标记为异常
- **副科（物理/化学/生物/政治/历史/地理）**：0-100分，超出范围标记为异常
- **总分**：0-1000分，应约等于各科目分数之和
- **无效数据处理**：
  * 空值、"-"、"缺考"、"作弊"、"N/A" → 设为null
  * 非数值文本（如"优秀"、"良好"） → 识别为等级字段，不是分数
  * 明显错误数据（如999999） → 标记为异常

**🔸 排名逻辑验证**：
- **班级排名**：1-100范围（常见班级规模），必须为正整数
- **年级排名**：1-1000范围（常见年级规模），必须为正整数
- **学校排名**：1-5000范围（常见学校规模），必须为正整数
- **排名一致性**：班级排名 ≤ 年级排名 ≤ 学校排名

**🔸 班级名称智能标准化**：
- "1班"、"一班" → "初三1班"（需结合文件名推断年级）
- "七年级1班" → "初一1班"
- "八年级1班" → "初二1班" 
- "九年级1班" → "初三1班"
- "高一1班"、"高二1班"、"高三1班" → 保持不变
- 缺失班级信息 → 标记为"未知班级"

**🔸 学号格式验证**：
- 长度：1-50个字符
- 格式：字母数字组合，如"20230101"、"S001"、"9年1班001"
- 唯一性：同一文件中学号不应重复

### 6. 👥 人数统计验证
**根据数据结构计算实际学生人数：**
- 宽表格式：学生人数 = 数据行数
- 长表格式：学生人数 = 数据行数 ÷ 科目数
- 混合格式：需要去重计算唯一学生数

## 📋 输出要求

请以JSON格式返回分析结果，严格按照以下格式：

\`\`\`json
{
  "examInfo": {
    "title": "九年级下学期月考",
    "type": "月考",
    "date": "2024-11-15",
    "grade": "九年级",
    "scope": "grade"
  },
  "fieldMappings": {
    "学号": "student_id",
    "姓名": "name", 
    "班级": "class_name",
    "语文": "chinese_score",
    "数学": "math_score",
    "英语": "english_score",
    "物理": "physics_score",
    "化学": "chemistry_score",
    "政治": "politics_score",
    "历史": "history_score",
    "生物": "biology_score",
    "地理": "geography_score",
    "总分": "total_score",
    "班级排名": "rank_in_class",
    "年级排名": "rank_in_grade"
  },
  "subjects": ["语文", "数学", "英语", "物理", "化学", "政治", "历史", "生物", "地理"],
  "dataStructure": "wide",
  "confidence": 0.95,
  "processing": {
    "requiresUserInput": false,
    "issues": [],
    "suggestions": [
      "检测到宽表格式，预计学生人数: ${totalRows}人",
      "识别到9个科目，数据结构清晰",
      "字段映射置信度高，建议直接处理"
    ]
  }
}
\`\`\`

## 🎯 分析质量要求

1. **精准字段识别**：使用上述详细的字段模式进行匹配，优先语义理解
2. **数据结构判断**：准确区分宽表、长表、混合格式
3. **完整性检查**：确保所有重要字段都被正确映射
4. **置信度评估**：
   - 0.9-1.0：字段完全匹配，数据结构清晰
   - 0.7-0.9：大部分字段匹配，结构基本清晰
   - 0.5-0.7：部分字段匹配，需要用户确认
   - 0-0.5：字段匹配度低，需要人工干预
5. **错误预防**：标记可能的数据质量问题和异常情况

请开始分析并返回JSON结果。
`;
  }
  
  /**
   * 🤖 系统提示词 - 定义AI角色和能力
   */
  private getSystemPrompt(): string {
    return `
你是一位资深的教育数据分析专家，专门负责成绩数据的智能解析和处理，具备以下核心专业能力：

## 🎓 教育领域专业知识
- **考试体系**：深度理解中小学月考、期中、期末、模拟考试等评价体系
- **成绩管理**：熟悉学生成绩记录、班级排名、年级排名的管理模式
- **教育评价**：掌握分数制、等级制、百分位等多种评价方法
- **学校组织**：了解班级、年级、学校的组织结构和数据关联关系

## 📊 数据处理专业技能
- **格式识别**：精通Excel、CSV等文件格式的结构分析
- **数据结构**：能够准确区分宽表格式、长表格式、混合格式
- **字段映射**：基于语义理解进行精准的字段识别和映射
- **数据清洗**：识别和处理缺失值、异常值、格式错误等数据质量问题
- **验证规则**：应用教育数据的业务规则进行数据验证

## 🧠 智能分析能力
- **上下文理解**：从文件名、表头、数据内容综合推断考试信息
- **模式识别**：识别隐含的数据组织模式和关联关系
- **质量评估**：准确评估数据质量并给出置信度分数
- **建议生成**：提供专业的数据处理建议和改进方案

## 🎯 分析标准和要求
- **准确性优先**：确保字段映射的准确性，避免数据误解
- **完整性保证**：全面识别所有重要字段，不遗漏关键信息  
- **一致性维护**：保持字段命名和数据格式的一致性
- **可用性优化**：生成易于系统处理的标准化结果

请运用这些专业能力，对教育数据文件进行深度分析，确保结果的准确性和可用性。
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
   * 基于n8n配置规则进行二次验证和优化
   */
  private validateAndEnhanceAIResult(result: any): AIAnalysisResult {
    console.log('[AIEnhancedFileParser] 🔍 开始验证和增强AI结果...');
    
    // 标准字段映射表（基于n8n配置）
    const standardFieldMappings: Record<string, string> = {
      // 学生信息
      '学号': 'student_id', '姓名': 'name', '班级': 'class_name',
      'student_id': 'student_id', 'name': 'name', 'class_name': 'class_name',
      
      // 主要科目
      '语文': 'chinese_score', '数学': 'math_score', '英语': 'english_score',
      'chinese': 'chinese_score', 'math': 'math_score', 'english': 'english_score',
      
      // 理科科目
      '物理': 'physics_score', '化学': 'chemistry_score', '生物': 'biology_score',
      'physics': 'physics_score', 'chemistry': 'chemistry_score', 'biology': 'biology_score',
      
      // 文科科目
      '政治': 'politics_score', '历史': 'history_score', '地理': 'geography_score',
      'politics': 'politics_score', 'history': 'history_score', 'geography': 'geography_score',
      '道法': 'politics_score', '道德与法治': 'politics_score',
      
      // 统计字段
      '总分': 'total_score', '合计': 'total_score', '总成绩': 'total_score',
      'total': 'total_score', 'total_score': 'total_score',
      
      // 排名字段
      '班级排名': 'rank_in_class', '年级排名': 'rank_in_grade', '学校排名': 'rank_in_school',
      '班排名': 'rank_in_class', '年排名': 'rank_in_grade', '校排名': 'rank_in_school',
      
      // 等级字段
      '等级': 'original_grade', '评级': 'original_grade', '成绩等级': 'original_grade',
      '语文等级': 'chinese_grade', '数学等级': 'math_grade', '英语等级': 'english_grade',
      '物理等级': 'physics_grade', '化学等级': 'chemistry_grade', '生物等级': 'biology_grade',
      '政治等级': 'politics_grade', '历史等级': 'history_grade', '地理等级': 'geography_grade'
    };
    
    // 科目列表
    const standardSubjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理'];
    
    // 验证和修正字段映射
    const validatedMappings: Record<string, string> = {};
    const detectedSubjects: string[] = [];
    let mappingScore = 0;
    let totalFields = 0;
    
    if (result.fieldMappings) {
      Object.entries(result.fieldMappings).forEach(([originalField, mappedField]) => {
        totalFields++;
        
        // 检查是否为标准映射
        const standardMapping = standardFieldMappings[originalField.toLowerCase()] || 
                               standardFieldMappings[originalField];
        
        if (standardMapping) {
          validatedMappings[originalField] = standardMapping;
          mappingScore++;
          
          // 检测科目
          if (standardMapping.endsWith('_score')) {
            const subject = this.extractSubjectFromField(originalField);
            if (subject && standardSubjects.includes(subject) && !detectedSubjects.includes(subject)) {
              detectedSubjects.push(subject);
            }
          }
        } else if (typeof mappedField === 'string' && mappedField.length > 0) {
          // 保留AI的映射，但标记为需要验证
          validatedMappings[originalField] = mappedField as string;
          mappingScore += 0.5; // 部分分数
        }
      });
    }
    
    // 计算置信度
    const baseMappingConfidence = totalFields > 0 ? mappingScore / totalFields : 0;
    const originalConfidence = result.confidence || 0.5;
    const adjustedConfidence = Math.min(Math.max(
      (baseMappingConfidence * 0.7) + (originalConfidence * 0.3), 0
    ), 1);
    
    // 生成处理建议
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // 检查必需字段
    const hasStudentId = Object.values(validatedMappings).includes('student_id');
    const hasName = Object.values(validatedMappings).includes('name');
    
    if (!hasName) {
      issues.push('缺少学生姓名字段，这是必需的字段');
    }
    if (!hasStudentId) {
      suggestions.push('建议提供学号字段以提高学生匹配准确性');
    }
    
    // 检查科目数量
    if (detectedSubjects.length === 0) {
      issues.push('未检测到任何科目成绩字段');
    } else if (detectedSubjects.length < 3) {
      suggestions.push(`检测到${detectedSubjects.length}个科目，数据可能不完整`);
    } else {
      suggestions.push(`检测到${detectedSubjects.length}个科目: ${detectedSubjects.join('、')}`);
    }
    
    // 数据结构验证
    const dataStructure = result.dataStructure || 'wide';
    if (detectedSubjects.length > 3 && dataStructure === 'wide') {
      suggestions.push('检测到宽表格式，将自动转换为标准格式');
    }
    
    // 置信度建议
    if (adjustedConfidence > 0.85) {
      suggestions.push('字段映射置信度高，建议自动处理');
    } else if (adjustedConfidence > 0.6) {
      suggestions.push('字段映射基本准确，建议用户确认后处理');
    } else {
      issues.push('字段映射置信度较低，需要用户手动调整');
    }
    
    const enhanced: AIAnalysisResult = {
      examInfo: {
        title: result.examInfo?.title || '未命名考试',
        type: result.examInfo?.type || '考试',
        date: result.examInfo?.date || new Date().toISOString().split('T')[0],
        grade: result.examInfo?.grade,
        scope: result.examInfo?.scope || 'class'
      },
      fieldMappings: validatedMappings,
      subjects: detectedSubjects.length > 0 ? detectedSubjects : (result.subjects || []),
      dataStructure: dataStructure,
      confidence: adjustedConfidence,
      processing: {
        requiresUserInput: adjustedConfidence < 0.8 || issues.length > 0,
        issues,
        suggestions
      }
    };
    
    console.log('[AIEnhancedFileParser] ✅ AI结果验证完成:', {
      originalConfidence: originalConfidence,
      adjustedConfidence: adjustedConfidence,
      mappingScore: `${mappingScore}/${totalFields}`,
      detectedSubjects: detectedSubjects.length,
      issues: issues.length,
      suggestions: suggestions.length
    });
    
    return enhanced;
  }
  
  /**
   * 🔍 从字段名提取科目名称
   */
  private extractSubjectFromField(fieldName: string): string | null {
    const subjectPatterns: Record<string, string> = {
      '语文': '语文', 'chinese': '语文',
      '数学': '数学', 'math': '数学',
      '英语': '英语', 'english': '英语',
      '物理': '物理', 'physics': '物理',
      '化学': '化学', 'chemistry': '化学',
      '生物': '生物', 'biology': '生物',
      '政治': '政治', 'politics': '政治', '道法': '政治',
      '历史': '历史', 'history': '历史',
      '地理': '地理', 'geography': '地理'
    };
    
    const lowerField = fieldName.toLowerCase();
    for (const [pattern, subject] of Object.entries(subjectPatterns)) {
      if (lowerField.includes(pattern.toLowerCase())) {
        return subject;
      }
    }
    
    return null;
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

// 创建并导出实例
export const aiEnhancedFileParser = new AIEnhancedFileParser(); 