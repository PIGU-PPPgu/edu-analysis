# 智能数据导入系统架构设计

## 📋 项目概述

### 🎯 设计目标
为学生画像系统设计一个智能化的数据导入系统，实现：
- **零配置导入**：AI自动识别字段，无需手动映射
- **智能验证**：自动发现和修复数据问题  
- **用户友好**：直观的向导式界面
- **高可靠性**：事务性导入和完整的错误处理

### 🔍 当前痛点分析
1. **手动字段映射**：教师需要逐个配置字段对应关系
2. **格式兼容性差**：不同Excel/CSV格式处理困难
3. **数据验证不足**：缺乏智能的数据清洗和验证
4. **错误处理简陋**：导入失败时缺乏详细的错误信息
5. **用户体验差**：操作步骤繁琐，学习成本高

## 🏗️ 系统架构设计

### 📊 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     前端用户界面层                            │
├─────────────────────────────────────────────────────────────┤
│  文件上传组件  │  映射配置界面  │  预览确认界面  │  进度跟踪组件  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                     API网关层                               │
├─────────────────────────────────────────────────────────────┤
│  文件上传API  │  解析API  │  映射API  │  验证API  │  导入API   │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   核心处理引擎层                             │
├─────────────────────────────────────────────────────────────┤
│ 文件解析引擎 │ 智能映射引擎 │ 数据验证引擎 │ 导入执行引擎    │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   数据存储层                                │
├─────────────────────────────────────────────────────────────┤
│  文件存储  │  临时数据表  │  业务数据表  │  配置和日志表     │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 核心模块设计

### 1. 文件解析引擎 (File Parser Engine)

**功能职责**：
- 自动检测文件格式和编码
- 解析文件内容和结构
- 提取表头和数据行
- 处理特殊格式（合并单元格、多工作表）

**技术实现**：
```typescript
interface FileParserEngine {
  // 检测文件格式
  detectFormat(file: File): Promise<FileFormat>;
  
  // 解析文件内容
  parseFile(file: File, options?: ParseOptions): Promise<ParsedData>;
  
  // 分析表格结构
  analyzeStructure(data: RawData): TableStructure;
}

interface ParsedData {
  headers: string[];           // 表头信息
  rows: any[][];              // 数据行
  metadata: FileMetadata;      // 文件元数据
  structure: TableStructure;   // 表格结构
}
```

**支持格式**：
- Excel文件：.xlsx, .xls
- CSV文件：.csv (支持多种分隔符)
- TSV文件：.tsv
- 编码支持：UTF-8, GBK, GB2312

### 2. 智能字段映射引擎 (Smart Field Mapping Engine)

**功能职责**：
- AI驱动的字段识别
- 模糊匹配和语义理解
- 历史映射学习
- 置信度评分

**技术实现**：
```typescript
interface SmartMappingEngine {
  // AI字段识别
  identifyFields(headers: string[]): Promise<FieldMapping[]>;
  
  // 模糊匹配
  fuzzyMatch(sourceField: string, targetFields: string[]): MatchResult[];
  
  // 学习用户偏好
  learnFromHistory(userId: string, mappings: FieldMapping[]): void;
  
  // 获取映射建议
  getSuggestions(headers: string[], context: ImportContext): MappingSuggestion[];
}

interface FieldMapping {
  sourceField: string;      // 源字段名
  targetField: string;      // 目标字段名
  confidence: number;       // 置信度 (0-1)
  mappingType: 'exact' | 'fuzzy' | 'ai' | 'manual';
}
```

**AI识别规则**：
```typescript
const FIELD_RECOGNITION_RULES = {
  student_id: ['学号', '学生编号', '学生ID', 'student_id', 'id', '编号'],
  name: ['姓名', '学生姓名', 'name', '名字'],
  class_name: ['班级', '班级名称', 'class', '所在班级'],
  // 科目成绩字段
  chinese: ['语文', '语文成绩', 'chinese'],
  math: ['数学', '数学成绩', 'math'],
  english: ['英语', '英语成绩', 'english'],
  // 更多字段...
};
```

### 3. 数据验证引擎 (Data Validation Engine)

**功能职责**：
- 格式验证（数据类型、范围检查）
- 逻辑验证（重复性、关联性）
- 业务规则验证（班级存在性、学生唯一性）
- 数据清洗和标准化

**技术实现**：
```typescript
interface ValidationEngine {
  // 执行验证
  validate(data: ImportData, rules: ValidationRule[]): ValidationResult;
  
  // 数据清洗
  cleanData(data: any[]): CleanedData;
  
  // 获取验证规则
  getValidationRules(dataType: string): ValidationRule[];
}

interface ValidationRule {
  field: string;
  type: 'format' | 'range' | 'unique' | 'required' | 'custom';
  rule: any;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  cleanedData: any[];
}
```

**验证规则示例**：
```typescript
const VALIDATION_RULES = {
  student_id: {
    required: true,
    format: /^\d{8,12}$/,
    unique: true,
    message: '学号必须是8-12位数字且唯一'
  },
  name: {
    required: true,
    format: /^[\u4e00-\u9fa5a-zA-Z\s]{2,10}$/,
    message: '姓名必须是2-10个字符'
  },
  score: {
    type: 'number',
    range: [0, 100],
    message: '成绩必须在0-100之间'
  }
};
```

### 4. 导入执行引擎 (Import Execution Engine)

**功能职责**：
- 事务性数据导入
- 冲突检测和解决
- 回滚机制
- 进度跟踪

**技术实现**：
```typescript
interface ImportExecutionEngine {
  // 执行导入
  executeImport(session: ImportSession): Promise<ImportResult>;
  
  // 检测冲突
  detectConflicts(data: any[], existingData: any[]): Conflict[];
  
  // 回滚导入
  rollbackImport(sessionId: string): Promise<void>;
  
  // 获取导入进度
  getProgress(sessionId: string): ImportProgress;
}

interface ImportSession {
  id: string;
  userId: string;
  data: any[];
  mappings: FieldMapping[];
  options: ImportOptions;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
```

## 🗄️ 数据库设计

### 新增表结构

```sql
-- 导入会话表
CREATE TABLE import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  status TEXT DEFAULT 'pending',
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  mappings JSONB,
  options JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 字段映射历史表
CREATE TABLE import_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  confidence DECIMAL(3,2),
  mapping_type TEXT,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 验证规则配置表
CREATE TABLE import_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  rule_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 导入日志表
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES import_sessions(id),
  level TEXT NOT NULL, -- 'info', 'warning', 'error'
  message TEXT NOT NULL,
  details JSONB,
  row_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 临时导入数据表
CREATE TABLE temp_import_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES import_sessions(id),
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  mapped_data JSONB,
  validation_status TEXT DEFAULT 'pending',
  validation_errors JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 🔌 API接口设计

### Edge Functions

#### 1. parse-file
```typescript
// 文件解析接口
POST /functions/v1/parse-file
Content-Type: multipart/form-data

Request:
- file: File (Excel/CSV文件)
- options?: ParseOptions

Response:
{
  success: boolean;
  data: {
    sessionId: string;
    headers: string[];
    preview: any[][];
    metadata: FileMetadata;
    structure: TableStructure;
  };
  error?: string;
}
```

#### 2. smart-field-mapping
```typescript
// 智能字段映射接口
POST /functions/v1/smart-field-mapping

Request:
{
  sessionId: string;
  headers: string[];
  context?: ImportContext;
}

Response:
{
  success: boolean;
  data: {
    mappings: FieldMapping[];
    suggestions: MappingSuggestion[];
    confidence: number;
  };
  error?: string;
}
```

#### 3. validate-import-data
```typescript
// 数据验证接口
POST /functions/v1/validate-import-data

Request:
{
  sessionId: string;
  mappings: FieldMapping[];
  validationRules?: ValidationRule[];
}

Response:
{
  success: boolean;
  data: {
    validationResult: ValidationResult;
    preview: any[];
    statistics: ValidationStatistics;
  };
  error?: string;
}
```

#### 4. execute-import
```typescript
// 执行导入接口
POST /functions/v1/execute-import

Request:
{
  sessionId: string;
  options: ImportOptions;
}

Response:
{
  success: boolean;
  data: {
    importResult: ImportResult;
    statistics: ImportStatistics;
  };
  error?: string;
}
```

## 🎨 用户界面设计

### 导入向导流程

#### 第1步：文件选择
```tsx
<FileUploadStep>
  <DropZone 
    accept=".xlsx,.xls,.csv"
    maxSize={10 * 1024 * 1024} // 10MB
    onUpload={handleFileUpload}
  />
  <FileFormatGuide />
  <TemplateDownload />
</FileUploadStep>
```

#### 第2步：字段映射
```tsx
<FieldMappingStep>
  <MappingPreview 
    suggestions={aiSuggestions}
    onMappingChange={handleMappingChange}
  />
  <ConfidenceIndicator />
  <ManualAdjustment />
</FieldMappingStep>
```

#### 第3步：数据预览
```tsx
<DataPreviewStep>
  <ValidationSummary />
  <DataTable 
    data={previewData}
    errors={validationErrors}
    warnings={validationWarnings}
  />
  <ErrorResolution />
</DataPreviewStep>
```

#### 第4步：确认导入
```tsx
<ImportConfirmationStep>
  <ImportSummary />
  <ImportOptions />
  <ConflictResolution />
  <ImportButton />
</ImportConfirmationStep>
```

#### 第5步：导入结果
```tsx
<ImportResultStep>
  <ProgressIndicator />
  <ResultSummary />
  <ErrorReport />
  <SuccessActions />
</ImportResultStep>
```

## ⚡ 性能优化策略

### 1. 大文件处理
- **分块上传**：大文件分块上传，避免超时
- **流式处理**：使用流式解析，减少内存占用
- **异步处理**：后台异步处理，前端轮询进度

### 2. 缓存策略
- **解析结果缓存**：缓存文件解析结果
- **映射配置缓存**：缓存用户的映射偏好
- **验证规则缓存**：缓存验证规则配置

### 3. 数据库优化
- **批量操作**：使用批量插入减少数据库连接
- **索引优化**：为查询字段添加适当索引
- **分区表**：大数据量时使用分区表

## 🔒 安全考虑

### 1. 文件安全
- **文件类型验证**：严格验证文件类型和内容
- **文件大小限制**：限制上传文件大小
- **病毒扫描**：集成病毒扫描功能

### 2. 数据安全
- **数据隔离**：用户数据严格隔离
- **敏感信息处理**：对敏感信息进行脱敏
- **访问控制**：基于角色的访问控制

### 3. 系统安全
- **SQL注入防护**：使用参数化查询
- **XSS防护**：输入输出过滤
- **CSRF防护**：使用CSRF令牌

## 📈 监控和日志

### 1. 性能监控
- **导入耗时统计**：监控各步骤耗时
- **成功率统计**：监控导入成功率
- **错误率统计**：监控各类错误发生率

### 2. 业务监控
- **用户行为分析**：分析用户使用模式
- **功能使用统计**：统计各功能使用频率
- **错误模式分析**：分析常见错误模式

### 3. 系统日志
- **操作日志**：记录用户操作
- **错误日志**：记录系统错误
- **性能日志**：记录性能指标

## 🚀 实施计划

### 阶段1：基础架构 (1-2周)
- [ ] 设计和创建数据库表结构
- [ ] 创建基础Edge Functions框架
- [ ] 实现文件上传组件
- [ ] 建立基础的错误处理机制

### 阶段2：核心功能 (2-3周)
- [ ] 实现文件解析引擎
- [ ] 开发基础字段映射功能
- [ ] 建立数据验证规则体系
- [ ] 实现数据预览功能

### 阶段3：智能化功能 (2-3周)
- [ ] 集成AI字段映射
- [ ] 实现智能数据清洗
- [ ] 开发冲突检测和解决
- [ ] 优化用户体验

### 阶段4：完善和测试 (1-2周)
- [ ] 完善错误处理和回滚机制
- [ ] 性能优化和压力测试
- [ ] 全面功能测试
- [ ] 用户体验测试

## 📊 成功指标

### 技术指标
- **导入成功率** > 95%
- **字段映射准确率** > 90%
- **数据验证准确率** > 95%
- **系统响应时间** < 3秒

### 用户体验指标
- **用户操作步骤减少** 50%
- **导入时间缩短** 60%
- **用户满意度** > 4.5/5
- **错误率降低** 80%

### 业务指标
- **用户采用率** > 80%
- **功能使用频率**提升 200%
- **技术支持请求减少** 70%

## 🔗 相关技术栈

### 前端技术
- **React 18** + TypeScript
- **Shadcn UI** + Tailwind CSS
- **React Query** 状态管理
- **Papa Parse** CSV解析
- **SheetJS** Excel解析

### 后端技术
- **Supabase Edge Functions** (Deno)
- **PostgreSQL** 数据库
- **Supabase Storage** 文件存储
- **OpenAI/豆包 API** AI服务

### 开发工具
- **Vite** 构建工具
- **ESLint** + **Prettier** 代码规范
- **Jest** 单元测试
- **Playwright** E2E测试

---

这个智能数据导入系统将显著提升学生画像系统的数据导入体验，让教师能够更轻松、更准确地导入各种格式的学生数据，为后续的数据分析和学生画像生成提供高质量的数据基础。 