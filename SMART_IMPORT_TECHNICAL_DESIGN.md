# 智能数据导入系统 - 技术实现设计

## 📋 技术架构概览

### 🎯 核心技术选型

| 层级 | 技术栈 | 选择理由 |
|------|--------|----------|
| **前端框架** | React 18 + TypeScript | 项目现有技术栈，类型安全 |
| **UI组件库** | Shadcn UI + Tailwind CSS | 统一设计系统，响应式支持 |
| **状态管理** | React Query + Context | 服务端状态管理，缓存优化 |
| **文件处理** | Papa Parse + SheetJS | CSV/Excel解析，成熟稳定 |
| **后端服务** | Supabase Edge Functions | 无服务器架构，自动扩展 |
| **数据库** | PostgreSQL (Supabase) | 关系型数据库，事务支持 |
| **AI服务** | OpenAI + 豆包 API | 多模型支持，智能映射 |
| **文件存储** | Supabase Storage | 集成存储，权限控制 |

## 🏗️ 系统模块设计

### 1. 前端组件架构

```
src/components/smart-import/
├── core/
│   ├── SmartImportWizard.tsx          # 主导入向导
│   ├── ImportProvider.tsx             # 状态管理Context
│   └── ImportTypes.ts                 # TypeScript类型定义
├── steps/
│   ├── FileUploadStep.tsx             # 步骤1：文件上传
│   ├── FieldMappingStep.tsx           # 步骤2：字段映射
│   ├── DataPreviewStep.tsx            # 步骤3：数据预览
│   ├── ImportConfirmStep.tsx          # 步骤4：确认导入
│   └── ImportResultStep.tsx           # 步骤5：导入结果
├── components/
│   ├── FileDropZone.tsx               # 文件拖拽上传
│   ├── MappingTable.tsx               # 字段映射表格
│   ├── ValidationSummary.tsx          # 验证结果摘要
│   ├── ProgressTracker.tsx            # 进度跟踪
│   └── ErrorReport.tsx                # 错误报告
├── hooks/
│   ├── useFileParser.ts               # 文件解析Hook
│   ├── useFieldMapping.ts             # 字段映射Hook
│   ├── useDataValidation.ts           # 数据验证Hook
│   └── useImportExecution.ts          # 导入执行Hook
└── utils/
    ├── fileUtils.ts                   # 文件处理工具
    ├── mappingUtils.ts                # 映射工具函数
    └── validationUtils.ts             # 验证工具函数
```

### 2. 后端服务架构

```
supabase/functions/
├── smart-import/
│   ├── parse-file/
│   │   ├── index.ts                   # 文件解析入口
│   │   ├── parsers/
│   │   │   ├── excelParser.ts         # Excel解析器
│   │   │   ├── csvParser.ts           # CSV解析器
│   │   │   └── formatDetector.ts      # 格式检测器
│   │   └── utils/
│   │       ├── encoding.ts            # 编码处理
│   │       └── structure.ts           # 结构分析
│   ├── smart-field-mapping/
│   │   ├── index.ts                   # 字段映射入口
│   │   ├── aiMapping.ts               # AI映射引擎
│   │   ├── fuzzyMatch.ts              # 模糊匹配
│   │   └── historyLearning.ts         # 历史学习
│   ├── validate-import-data/
│   │   ├── index.ts                   # 数据验证入口
│   │   ├── validators/
│   │   │   ├── formatValidator.ts     # 格式验证器
│   │   │   ├── logicValidator.ts      # 逻辑验证器
│   │   │   └── businessValidator.ts   # 业务验证器
│   │   └── cleaners/
│   │       ├── dataCleaner.ts         # 数据清洗
│   │       └── normalizer.ts          # 数据标准化
│   └── execute-import/
│       ├── index.ts                   # 导入执行入口
│       ├── transactionManager.ts      # 事务管理
│       ├── conflictResolver.ts        # 冲突解决
│       └── progressTracker.ts         # 进度跟踪
└── _shared/
    ├── database.ts                    # 数据库工具
    ├── storage.ts                     # 存储工具
    ├── ai.ts                          # AI服务工具
    └── types.ts                       # 共享类型定义
```

## 🔧 核心功能实现

### 1. 文件解析引擎

#### Excel解析器实现
```typescript
// supabase/functions/smart-import/parse-file/parsers/excelParser.ts
import * as XLSX from 'xlsx';

export class ExcelParser {
  async parse(fileBuffer: ArrayBuffer): Promise<ParsedData> {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON格式
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null,
      raw: false 
    });
    
    // 分析表格结构
    const structure = this.analyzeStructure(jsonData);
    
    return {
      headers: structure.headers,
      rows: structure.dataRows,
      metadata: {
        fileName: 'uploaded.xlsx',
        sheetCount: workbook.SheetNames.length,
        totalRows: jsonData.length,
        totalCols: structure.headers.length
      },
      structure
    };
  }
  
  private analyzeStructure(data: any[][]): TableStructure {
    // 查找表头行
    const headerRowIndex = this.findHeaderRow(data);
    const headers = data[headerRowIndex] || [];
    const dataRows = data.slice(headerRowIndex + 1);
    
    return {
      headerRowIndex,
      headers: headers.map(h => String(h || '')),
      dataRows: dataRows.filter(row => row.some(cell => cell !== null)),
      hasHeader: headerRowIndex >= 0,
      columnTypes: this.detectColumnTypes(dataRows)
    };
  }
  
  private findHeaderRow(data: any[][]): number {
    // 启发式算法查找表头行
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (this.isLikelyHeaderRow(row)) {
        return i;
      }
    }
    return 0; // 默认第一行为表头
  }
  
  private isLikelyHeaderRow(row: any[]): boolean {
    // 检查是否包含常见的表头关键词
    const headerKeywords = ['学号', '姓名', '班级', '成绩', 'name', 'id', 'class'];
    const rowText = row.join('').toLowerCase();
    return headerKeywords.some(keyword => rowText.includes(keyword));
  }
}
```

#### CSV解析器实现
```typescript
// supabase/functions/smart-import/parse-file/parsers/csvParser.ts
import { parse } from 'csv-parse/sync';

export class CSVParser {
  async parse(fileBuffer: ArrayBuffer, encoding: string = 'utf-8'): Promise<ParsedData> {
    // 检测编码
    const detectedEncoding = await this.detectEncoding(fileBuffer);
    const text = new TextDecoder(detectedEncoding).decode(fileBuffer);
    
    // 检测分隔符
    const delimiter = this.detectDelimiter(text);
    
    // 解析CSV
    const records = parse(text, {
      delimiter,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
    
    // 分析结构
    const structure = this.analyzeStructure(records);
    
    return {
      headers: structure.headers,
      rows: structure.dataRows,
      metadata: {
        fileName: 'uploaded.csv',
        encoding: detectedEncoding,
        delimiter,
        totalRows: records.length,
        totalCols: structure.headers.length
      },
      structure
    };
  }
  
  private async detectEncoding(buffer: ArrayBuffer): Promise<string> {
    // 简单的编码检测逻辑
    const sample = new Uint8Array(buffer.slice(0, 1024));
    
    // 检查BOM
    if (sample[0] === 0xEF && sample[1] === 0xBB && sample[2] === 0xBF) {
      return 'utf-8';
    }
    
    // 尝试UTF-8解码
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(sample);
      return 'utf-8';
    } catch {
      // 如果UTF-8失败，尝试GBK
      return 'gbk';
    }
  }
  
  private detectDelimiter(text: string): string {
    const delimiters = [',', ';', '\t', '|'];
    const sample = text.split('\n').slice(0, 5).join('\n');
    
    let bestDelimiter = ',';
    let maxCount = 0;
    
    for (const delimiter of delimiters) {
      const count = (sample.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  }
}
```

### 2. 智能字段映射引擎

#### AI映射实现
```typescript
// supabase/functions/smart-import/smart-field-mapping/aiMapping.ts
export class AIFieldMapper {
  private aiClient: AIClient;
  
  constructor(aiClient: AIClient) {
    this.aiClient = aiClient;
  }
  
  async mapFields(headers: string[], context?: ImportContext): Promise<FieldMapping[]> {
    // 构建AI提示
    const prompt = this.buildMappingPrompt(headers, context);
    
    // 调用AI服务
    const response = await this.aiClient.complete({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的教育数据字段映射专家。请分析表格字段并提供最佳的字段映射建议。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1
    });
    
    // 解析AI响应
    return this.parseAIResponse(response.content, headers);
  }
  
  private buildMappingPrompt(headers: string[], context?: ImportContext): string {
    const targetFields = [
      'student_id (学号)',
      'name (姓名)', 
      'class_name (班级)',
      'chinese (语文)',
      'math (数学)',
      'english (英语)',
      'physics (物理)',
      'chemistry (化学)',
      'biology (生物)',
      'politics (政治)',
      'history (历史)',
      'geography (地理)'
    ];
    
    return `
请分析以下表格字段，并将它们映射到目标字段：

源字段：${headers.join(', ')}

目标字段：${targetFields.join(', ')}

请以JSON格式返回映射结果，包含以下信息：
- sourceField: 源字段名
- targetField: 目标字段名（如果无法映射则为null）
- confidence: 置信度（0-1）
- reason: 映射理由

示例：
[
  {
    "sourceField": "学号",
    "targetField": "student_id",
    "confidence": 0.95,
    "reason": "完全匹配学号字段"
  }
]
`;
  }
  
  private parseAIResponse(content: string, headers: string[]): FieldMapping[] {
    try {
      const mappings = JSON.parse(content);
      return mappings.map((mapping: any) => ({
        sourceField: mapping.sourceField,
        targetField: mapping.targetField,
        confidence: mapping.confidence || 0.5,
        mappingType: 'ai' as const,
        reason: mapping.reason
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // 回退到规则映射
      return this.fallbackRuleMapping(headers);
    }
  }
  
  private fallbackRuleMapping(headers: string[]): FieldMapping[] {
    const rules = {
      student_id: ['学号', '学生编号', '学生ID', 'student_id', 'id', '编号'],
      name: ['姓名', '学生姓名', 'name', '名字'],
      class_name: ['班级', '班级名称', 'class', '所在班级'],
      chinese: ['语文', '语文成绩', 'chinese'],
      math: ['数学', '数学成绩', 'math'],
      english: ['英语', '英语成绩', 'english']
    };
    
    const mappings: FieldMapping[] = [];
    
    for (const header of headers) {
      for (const [targetField, patterns] of Object.entries(rules)) {
        for (const pattern of patterns) {
          if (header.toLowerCase().includes(pattern.toLowerCase())) {
            mappings.push({
              sourceField: header,
              targetField,
              confidence: 0.8,
              mappingType: 'fuzzy'
            });
            break;
          }
        }
      }
    }
    
    return mappings;
  }
}
```

### 3. 数据验证引擎

#### 验证器实现
```typescript
// supabase/functions/smart-import/validate-import-data/validators/formatValidator.ts
export class FormatValidator {
  validate(data: any[], mappings: FieldMapping[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      
      for (const mapping of mappings) {
        if (!mapping.targetField) continue;
        
        const value = row[mapping.sourceField];
        const validationResult = this.validateField(
          mapping.targetField,
          value,
          rowIndex + 1
        );
        
        errors.push(...validationResult.errors);
        warnings.push(...validationResult.warnings);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cleanedData: this.cleanData(data, mappings)
    };
  }
  
  private validateField(fieldName: string, value: any, rowNumber: number): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    switch (fieldName) {
      case 'student_id':
        if (!value) {
          errors.push({
            row: rowNumber,
            field: fieldName,
            value,
            message: '学号不能为空',
            type: 'required'
          });
        } else if (!/^\d{8,12}$/.test(String(value))) {
          errors.push({
            row: rowNumber,
            field: fieldName,
            value,
            message: '学号格式不正确，应为8-12位数字',
            type: 'format'
          });
        }
        break;
        
      case 'name':
        if (!value) {
          errors.push({
            row: rowNumber,
            field: fieldName,
            value,
            message: '姓名不能为空',
            type: 'required'
          });
        } else if (!/^[\u4e00-\u9fa5a-zA-Z\s]{2,10}$/.test(String(value))) {
          warnings.push({
            row: rowNumber,
            field: fieldName,
            value,
            message: '姓名格式可能不正确',
            type: 'format'
          });
        }
        break;
        
      default:
        // 成绩字段验证
        if (this.isScoreField(fieldName)) {
          const score = Number(value);
          if (value !== null && value !== '' && (isNaN(score) || score < 0 || score > 100)) {
            errors.push({
              row: rowNumber,
              field: fieldName,
              value,
              message: '成绩必须在0-100之间',
              type: 'range'
            });
          }
        }
    }
    
    return { errors, warnings };
  }
  
  private isScoreField(fieldName: string): boolean {
    const scoreFields = ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'];
    return scoreFields.includes(fieldName);
  }
  
  private cleanData(data: any[], mappings: FieldMapping[]): any[] {
    return data.map(row => {
      const cleanedRow: any = {};
      
      for (const mapping of mappings) {
        if (!mapping.targetField) continue;
        
        let value = row[mapping.sourceField];
        
        // 数据清洗
        if (typeof value === 'string') {
          value = value.trim();
          
          // 处理成绩字段
          if (this.isScoreField(mapping.targetField)) {
            // 移除非数字字符（除了小数点）
            value = value.replace(/[^\d.]/g, '');
            if (value && !isNaN(Number(value))) {
              value = Number(value);
            }
          }
        }
        
        cleanedRow[mapping.targetField] = value;
      }
      
      return cleanedRow;
    });
  }
}
```

### 4. 导入执行引擎

#### 事务管理实现
```typescript
// supabase/functions/smart-import/execute-import/transactionManager.ts
export class TransactionManager {
  private supabase: SupabaseClient;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  
  async executeImport(session: ImportSession): Promise<ImportResult> {
    const startTime = Date.now();
    let importedCount = 0;
    let errorCount = 0;
    const errors: ImportError[] = [];
    
    try {
      // 开始事务
      await this.supabase.rpc('begin_transaction');
      
      // 检测冲突
      const conflicts = await this.detectConflicts(session.data);
      
      if (conflicts.length > 0 && session.options.conflictStrategy === 'abort') {
        throw new Error(`发现${conflicts.length}个数据冲突`);
      }
      
      // 批量导入数据
      for (let i = 0; i < session.data.length; i += 100) {
        const batch = session.data.slice(i, i + 100);
        const batchResult = await this.importBatch(batch, session.options);
        
        importedCount += batchResult.successCount;
        errorCount += batchResult.errorCount;
        errors.push(...batchResult.errors);
        
        // 更新进度
        await this.updateProgress(session.id, i + batch.length, session.data.length);
      }
      
      // 提交事务
      await this.supabase.rpc('commit_transaction');
      
      return {
        success: true,
        importedCount,
        errorCount,
        errors,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      // 回滚事务
      await this.supabase.rpc('rollback_transaction');
      
      return {
        success: false,
        importedCount: 0,
        errorCount: session.data.length,
        errors: [{
          row: 0,
          message: error.message,
          type: 'system'
        }],
        duration: Date.now() - startTime
      };
    }
  }
  
  private async detectConflicts(data: any[]): Promise<Conflict[]> {
    const studentIds = data.map(row => row.student_id).filter(Boolean);
    
    if (studentIds.length === 0) return [];
    
    // 查询现有学生
    const { data: existingStudents } = await this.supabase
      .from('students')
      .select('student_id, name')
      .in('student_id', studentIds);
    
    const conflicts: Conflict[] = [];
    
    for (const student of existingStudents || []) {
      const importRow = data.find(row => row.student_id === student.student_id);
      if (importRow && importRow.name !== student.name) {
        conflicts.push({
          type: 'name_mismatch',
          studentId: student.student_id,
          existingName: student.name,
          importName: importRow.name
        });
      }
    }
    
    return conflicts;
  }
  
  private async importBatch(batch: any[], options: ImportOptions): Promise<BatchResult> {
    let successCount = 0;
    let errorCount = 0;
    const errors: ImportError[] = [];
    
    for (const row of batch) {
      try {
        // 导入学生信息
        if (row.student_id && row.name) {
          await this.upsertStudent(row);
        }
        
        // 导入成绩数据
        if (options.importType === 'grades' && options.examId) {
          await this.importGradeData(row, options.examId);
        }
        
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          row: batch.indexOf(row) + 1,
          message: error.message,
          type: 'import'
        });
      }
    }
    
    return { successCount, errorCount, errors };
  }
  
  private async upsertStudent(row: any): Promise<void> {
    const { error } = await this.supabase
      .from('students')
      .upsert({
        student_id: row.student_id,
        name: row.name,
        class_name: row.class_name,
        // 其他字段...
      }, {
        onConflict: 'student_id'
      });
    
    if (error) throw error;
  }
  
  private async importGradeData(row: any, examId: string): Promise<void> {
    const gradeData = {
      exam_id: examId,
      student_id: row.student_id,
      name: row.name,
      class_name: row.class_name,
      // 动态添加成绩字段
      ...this.extractScoreFields(row)
    };
    
    const { error } = await this.supabase
      .from('grade_data')
      .insert(gradeData);
    
    if (error) throw error;
  }
  
  private extractScoreFields(row: any): Record<string, any> {
    const scoreFields = ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'];
    const scores: Record<string, any> = {};
    
    for (const field of scoreFields) {
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        scores[field] = row[field];
      }
    }
    
    return scores;
  }
  
  private async updateProgress(sessionId: string, processed: number, total: number): Promise<void> {
    await this.supabase
      .from('import_sessions')
      .update({
        processed_rows: processed,
        progress: Math.round((processed / total) * 100)
      })
      .eq('id', sessionId);
  }
}
```

## 🎨 前端组件实现

### 主导入向导组件
```typescript
// src/components/smart-import/core/SmartImportWizard.tsx
import React, { useState } from 'react';
import { ImportProvider } from './ImportProvider';
import { FileUploadStep } from '../steps/FileUploadStep';
import { FieldMappingStep } from '../steps/FieldMappingStep';
import { DataPreviewStep } from '../steps/DataPreviewStep';
import { ImportConfirmStep } from '../steps/ImportConfirmStep';
import { ImportResultStep } from '../steps/ImportResultStep';

export const SmartImportWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const steps = [
    { id: 1, title: '文件上传', component: FileUploadStep },
    { id: 2, title: '字段映射', component: FieldMappingStep },
    { id: 3, title: '数据预览', component: DataPreviewStep },
    { id: 4, title: '确认导入', component: ImportConfirmStep },
    { id: 5, title: '导入结果', component: ImportResultStep },
  ];
  
  const CurrentStepComponent = steps.find(step => step.id === currentStep)?.component;
  
  return (
    <ImportProvider>
      <div className="max-w-6xl mx-auto p-6">
        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {step.id}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* 当前步骤内容 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {CurrentStepComponent && (
            <CurrentStepComponent
              onNext={() => setCurrentStep(prev => Math.min(prev + 1, steps.length))}
              onPrev={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
              sessionId={sessionId}
              onSessionCreated={setSessionId}
            />
          )}
        </div>
      </div>
    </ImportProvider>
  );
};
```

## 📊 性能优化实现

### 1. 大文件分块处理
```typescript
// src/components/smart-import/utils/fileUtils.ts
export class FileChunkProcessor {
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  
  static async processLargeFile(
    file: File, 
    onProgress: (progress: number) => void
  ): Promise<ProcessedFileData> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    let processedChunks = 0;
    const results: any[] = [];
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      // 处理chunk
      const chunkResult = await this.processChunk(chunk, i === 0);
      results.push(...chunkResult);
      
      processedChunks++;
      onProgress((processedChunks / totalChunks) * 100);
    }
    
    return {
      data: results,
      totalRows: results.length,
      processingTime: Date.now()
    };
  }
  
  private static async processChunk(chunk: Blob, isFirstChunk: boolean): Promise<any[]> {
    // 实现chunk处理逻辑
    return [];
  }
}
```

### 2. 缓存优化
```typescript
// src/components/smart-import/hooks/useFieldMapping.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useFieldMapping = (headers: string[], userId: string) => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['field-mapping', headers, userId],
    queryFn: async () => {
      // 先检查缓存的映射历史
      const cachedMappings = await getCachedMappings(headers, userId);
      if (cachedMappings.length > 0) {
        return cachedMappings;
      }
      
      // 调用AI映射服务
      const aiMappings = await getAIMappings(headers);
      
      // 缓存结果
      await cacheMappings(headers, aiMappings, userId);
      
      return aiMappings;
    },
    staleTime: 1000 * 60 * 30, // 30分钟缓存
    cacheTime: 1000 * 60 * 60, // 1小时保留
  });
};
```

## 🔒 安全实现

### 1. 文件验证
```typescript
// src/components/smart-import/utils/securityUtils.ts
export class FileSecurityValidator {
  private static readonly ALLOWED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
  ];
  
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  
  static validateFile(file: File): ValidationResult {
    const errors: string[] = [];
    
    // 检查文件类型
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      errors.push('不支持的文件类型，请上传Excel或CSV文件');
    }
    
    // 检查文件大小
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push('文件大小超过限制（最大10MB）');
    }
    
    // 检查文件名
    if (!this.isValidFileName(file.name)) {
      errors.push('文件名包含非法字符');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private static isValidFileName(fileName: string): boolean {
    // 检查文件名是否包含危险字符
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    return !dangerousChars.test(fileName);
  }
  
  static async scanFileContent(file: File): Promise<boolean> {
    // 简单的内容扫描，检查是否包含可疑内容
    const text = await file.text();
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i
    ];
    
    return !suspiciousPatterns.some(pattern => pattern.test(text));
  }
}
```

## 📈 监控和日志

### 1. 性能监控
```typescript
// src/components/smart-import/utils/performanceMonitor.ts
export class PerformanceMonitor {
  private static metrics: Map<string, number> = new Map();
  
  static startTimer(operation: string): string {
    const timerId = `${operation}_${Date.now()}_${Math.random()}`;
    this.metrics.set(timerId, performance.now());
    return timerId;
  }
  
  static endTimer(timerId: string): number {
    const startTime = this.metrics.get(timerId);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    this.metrics.delete(timerId);
    
    // 发送性能数据到监控服务
    this.reportMetric(timerId.split('_')[0], duration);
    
    return duration;
  }
  
  private static async reportMetric(operation: string, duration: number): Promise<void> {
    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          duration,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.warn('Failed to report metric:', error);
    }
  }
}
```

---

这个技术实现设计提供了智能数据导入系统的详细技术方案，涵盖了从前端组件到后端服务的完整实现路径，确保系统的可靠性、性能和安全性。 