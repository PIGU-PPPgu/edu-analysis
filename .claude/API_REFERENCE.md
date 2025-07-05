# 📚 API接口完整参考文档

> **多Agent协作必读** - 确保所有开发者使用统一的接口规范

## 🎯 文档使用指南

### 📖 阅读说明
- **每个Agent开工前必须阅读此文档**
- **API调用必须严格按照此文档规范**
- **新增接口必须更新此文档**

### 🔄 更新机制
- 数据库变更 → 立即更新此文档
- API新增 → 立即更新此文档
- 接口修改 → 立即更新此文档

---

## 🗄️ 数据库表结构总览

### 📊 核心业务表 (12个)

#### 1. **students** - 学生信息表
- **主键**: `id` (UUID)
- **用途**: 存储学生基本信息
- **关联**: 被grade_data、homework_submissions等表引用

#### 2. **exams** - 考试信息表  
- **主键**: `id` (UUID)
- **用途**: 存储考试元数据
- **关联**: 被grade_data表引用

#### 3. **grade_data** - 成绩数据表 ⭐️ 核心表
- **主键**: `id` (UUID)
- **唯一约束**: `(exam_id, student_id, subject)` - 支持多科目
- **用途**: 存储学生成绩数据
- **关键字段**: score, grade, rank_in_class, rank_in_grade, rank_in_school

#### 4. **classes** - 班级信息表
- **主键**: `id` (UUID)
- **用途**: 存储班级基本信息

#### 5. **teachers** - 教师信息表
- **主键**: `id` (UUID)
- **用途**: 存储教师基本信息

#### 6. **homework** - 作业信息表
- **主键**: `id` (UUID)
- **用途**: 存储作业基本信息

#### 7. **homework_submissions** - 作业提交表
- **主键**: `id` (UUID)
- **用途**: 存储学生作业提交记录

#### 8. **knowledge_points** - 知识点表
- **主键**: `id` (UUID)
- **用途**: 存储知识点信息

#### 9. **warning_records** - 预警记录表
- **主键**: `id` (UUID)
- **用途**: 存储学生预警信息

#### 10. **warning_rules** - 预警规则表
- **主键**: `id` (UUID)
- **用途**: 存储预警规则配置

#### 11. **ai_analysis_results** - AI分析结果表 ⭐️ 重要
- **主键**: `id` (UUID)
- **用途**: 存储AI分析缓存结果
- **安全**: 启用RLS，用户只能访问自己的数据
- **过期**: 默认7天自动过期

#### 12. **subjects** - 科目表
- **主键**: `subject_code` (TEXT)
- **用途**: 存储科目基本信息

### 🔧 配置管理表 (15个)

#### 系统配置类
- **user_profiles** - 用户配置表 (主键: id)
- **user_settings** - 用户设置表 (主键: id) 
- **user_roles** - 用户角色表 (主键: id)
- **user_ai_configs** - 用户AI配置表 (主键: id)
- **notification_settings** - 通知设置表 (主键: id)
- **onboarding_status** - 入职状态表 (主键: id)

#### 成绩配置类
- **grading_scales** - 评分量表表 (主键: id)
- **grading_scale_levels** - 评分等级表 (主键: id)
- **grading_criteria** - 评分标准表 (主键: id)
- **grade_level_config** - 年级配置表 (主键: id)
- **subject_config** - 科目配置表 (主键: id)
- **exam_types** - 考试类型表 (主键: id)

#### 业务配置类
- **academic_terms** - 学期表 (主键: id)
- **course_classes** - 课程班级表 (主键: id)
- **custom_fields** - 自定义字段表 (主键: id)

### 🎯 分析增强表 (12个)

#### AI分析类
- **ai_analysis_queue** - AI分析队列表 (主键: id)
- **analysis_results_cache** - 分析结果缓存表 (主键: id)

#### 学生画像类  
- **student_portraits** - 学生画像表 (主键: id)
- **student_learning_behaviors** - 学习行为表 (主键: id)
- **student_learning_patterns** - 学习模式表 (主键: id)
- **student_learning_styles** - 学习风格表 (主键: id)
- **student_achievements** - 学生成就表 (主键: id)
- **student_knowledge_mastery** - 知识掌握表 (主键: id)

#### 标签系统类
- **student_ai_tags** - AI标签表 (主键: id)
- **student_custom_tags** - 自定义标签表 (主键: id)
- **grade_tags** - 成绩标签表 (主键: id)
- **grade_data_tags** - 成绩数据标签表 (主键: id)

### 🔄 系统管理表 (11个)

#### 监控类
- **system_monitoring** - 系统监控表 (主键: id)
- **cache_control** - 缓存控制表 (主键: cache_key)
- **migrations_log** - 迁移日志表 (主键: id)

#### 预警系统类
- **warning_statistics** - 预警统计表 (主键: id)

#### 干预系统类
- **intervention_plans** - 干预计划表 (主键: id)
- **intervention_activities** - 干预活动表 (主键: id)
- **intervention_assessments** - 干预评估表 (主键: id)

#### 学习资源类
- **learning_progress** - 学习进度表 (主键: id)
- **learning_resources** - 学习资源表 (主键: id)
- **knowledge_point_thresholds** - 知识点阈值表 (主键: id)
- **submission_knowledge_points** - 提交知识点表 (主键: id)

#### 其他系统表
- **help_content** - 帮助内容表 (主键: id)
- **modules** - 功能模块表 (主键: id)
- **class_info** - 班级信息表 (主键: class_name)

---

## 🛠️ 服务层API接口

### 📊 成绩分析服务

#### gradeAnalysisService.ts
```typescript
// 核心成绩分析接口
export interface GradeAnalysisAPI {
  // 获取成绩统计
  getGradeStats(examId: string, filters?: GradeFilters): Promise<GradeStats>
  
  // 获取成绩分布
  getGradeDistribution(examId: string, subject?: string): Promise<GradeDistribution[]>
  
  // 获取班级对比数据
  getClassComparison(examId: string): Promise<ClassComparisonData[]>
  
  // 获取学生详细成绩
  getStudentGrades(studentId: string, examId?: string): Promise<StudentGrade[]>
}

// 使用示例
import { gradeAnalysisService } from '@/services'
const stats = await gradeAnalysisService.getGradeStats('exam-uuid')
```

#### examService.ts
```typescript
// 考试管理接口
export interface ExamAPI {
  // 创建考试
  createExam(examData: CreateExamData): Promise<Exam>
  
  // 获取考试列表
  getExams(filters?: ExamFilters): Promise<Exam[]>
  
  // 获取考试详情
  getExamById(examId: string): Promise<Exam | null>
  
  // 更新考试信息
  updateExam(examId: string, updates: Partial<Exam>): Promise<Exam>
  
  // 删除考试
  deleteExam(examId: string): Promise<boolean>
}
```

### 🏠 作业管理服务

#### homeworkService.ts
```typescript
// 作业管理接口
export interface HomeworkAPI {
  // 创建作业
  createHomework(homeworkData: CreateHomeworkData): Promise<Homework>
  
  // 获取作业列表
  getHomeworkList(filters?: HomeworkFilters): Promise<Homework[]>
  
  // 提交作业
  submitHomework(submissionData: HomeworkSubmissionData): Promise<HomeworkSubmission>
  
  // 批改作业
  gradeHomework(submissionId: string, gradeData: GradeData): Promise<boolean>
}
```

#### gradingService.ts
```typescript
// 评分服务接口
export interface GradingAPI {
  // 自动评分
  autoGrade(submissionId: string): Promise<AutoGradeResult>
  
  // 手动评分
  manualGrade(submissionId: string, gradeData: ManualGradeData): Promise<boolean>
  
  // 获取评分标准
  getGradingCriteria(homeworkId: string): Promise<GradingCriteria[]>
}
```

### 🤖 AI服务集成

#### aiService.ts
```typescript
// AI服务主接口
export interface AIServiceAPI {
  // 成绩分析
  analyzeGrades(gradeData: GradeData[]): Promise<AIAnalysisResult>
  
  // 学生诊断
  diagnoseStudent(studentId: string): Promise<StudentDiagnosis>
  
  // 班级诊断
  diagnoseClass(classId: string): Promise<ClassDiagnosis>
  
  // 个性化建议
  getPersonalizedRecommendations(studentId: string): Promise<Recommendation[]>
}
```

#### aiProviderManager.ts
```typescript
// AI提供商管理接口
export interface AIProviderManagerAPI {
  // 获取可用提供商
  getAvailableProviders(): Promise<AIProvider[]>
  
  // 设置默认提供商
  setDefaultProvider(providerId: string): Promise<boolean>
  
  // 测试提供商连接
  testProvider(providerId: string): Promise<boolean>
}
```

### ⚠️ 预警系统服务

#### warningService.ts
```typescript
// 预警服务接口
export interface WarningAPI {
  // 创建预警规则
  createWarningRule(ruleData: WarningRuleData): Promise<WarningRule>
  
  // 检查学生预警
  checkStudentWarnings(studentId: string): Promise<Warning[]>
  
  // 获取预警统计
  getWarningStatistics(timeRange?: TimeRange): Promise<WarningStats>
  
  // 处理预警
  handleWarning(warningId: string, action: WarningAction): Promise<boolean>
}
```

#### autoWarningService.ts
```typescript
// 自动预警服务接口
export interface AutoWarningAPI {
  // 启动自动预警
  startAutoWarning(): Promise<boolean>
  
  // 停止自动预警
  stopAutoWarning(): Promise<boolean>
  
  // 获取预警状态
  getWarningStatus(): Promise<WarningStatus>
}
```

### 👥 学生管理服务

#### classService.ts
```typescript
// 班级服务接口
export interface ClassAPI {
  // 创建班级
  createClass(classData: CreateClassData): Promise<Class>
  
  // 获取班级列表
  getClasses(filters?: ClassFilters): Promise<Class[]>
  
  // 获取班级学生
  getClassStudents(classId: string): Promise<Student[]>
  
  // 添加学生到班级
  addStudentToClass(classId: string, studentId: string): Promise<boolean>
}
```

### 📊 数据导入服务

#### intelligentFileParser.ts
```typescript
// 智能文件解析接口
export interface FileParserAPI {
  // 解析上传的文件
  parseFile(file: File): Promise<ParseResult>
  
  // 智能字段映射
  intelligentMapping(headers: string[]): Promise<FieldMapping>
  
  // 验证数据格式
  validateData(data: any[]): Promise<ValidationResult>
}
```

#### aiEnhancedFileParser.ts
```typescript
// AI增强文件解析接口
export interface AIFileParserAPI {
  // AI辅助解析
  aiAssistedParse(file: File): Promise<AIParseResult>
  
  // 智能字段识别
  intelligentFieldRecognition(data: any[]): Promise<FieldRecognitionResult>
  
  // 数据质量检查
  dataQualityCheck(data: any[]): Promise<QualityReport>
}
```

---

## 🔧 数据库函数接口

### 📈 成绩分析函数

#### get_student_subject_scores()
```sql
-- 获取学生各科成绩
SELECT * FROM get_student_subject_scores(exam_id, student_id);

-- 返回字段
-- subject: 科目名称
-- score: 成绩分数
-- grade: 等级
-- rank_in_class: 班级排名
-- rank_in_grade: 年级排名
-- rank_in_school: 学校排名
```

#### get_subject_analysis()
```sql
-- 获取科目分析统计
SELECT * FROM get_subject_analysis(exam_id);

-- 返回字段
-- subject: 科目名称
-- student_count: 学生数量
-- avg_score: 平均分
-- max_score: 最高分
-- min_score: 最低分
-- std_dev: 标准差
-- pass_rate: 及格率
```

#### get_grade_distribution()
```sql
-- 获取等级分布
SELECT * FROM get_grade_distribution(exam_id, subject);

-- 返回字段
-- grade: 等级
-- count: 人数
-- percentage: 百分比
```

#### check_grade_data_integrity()
```sql
-- 检查数据完整性
SELECT * FROM check_grade_data_integrity();

-- 返回字段
-- check_name: 检查项目名称
-- status: 状态 (OK/WARNING/ERROR)
-- description: 描述
-- count: 问题数量
```

#### cleanup_expired_ai_analysis()
```sql
-- 清理过期AI分析记录
SELECT cleanup_expired_ai_analysis();
```

---

## 🔒 安全和权限

### 🛡️ RLS策略

#### ai_analysis_results表
- **策略**: 用户只能访问自己的AI分析结果
- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id`
- **UPDATE**: `auth.uid() = user_id`

### 🔑 API密钥管理

#### AI提供商配置
```typescript
// 在user_ai_configs表中存储
interface AIConfig {
  provider: 'openai' | 'claude' | 'deepseek' | 'ollama'
  api_key: string // 加密存储
  model: string
  endpoint?: string
}
```

---

## 📝 数据类型定义

### 🎯 核心类型

#### 成绩相关类型
```typescript
interface GradeData {
  id: string
  exam_id: string
  student_id: string
  name: string
  class_name?: string
  subject?: string
  score?: number
  grade?: string
  rank_in_class?: number
  rank_in_grade?: number
  rank_in_school?: number
}

interface Exam {
  id: string
  title: string
  type: string
  date: string
  subject?: string
  scope?: string
}

interface Student {
  id: string
  name: string
  class_id?: string
  student_number?: string
}
```

#### AI分析类型
```typescript
interface AIAnalysisResult {
  id: string
  user_id: string
  data_hash: string
  exam_id?: string
  analysis_type: 'class_diagnosis' | 'student_guidance'
  analysis_data: Record<string, any>
  grade_data_summary?: Record<string, any>
  expires_at: string
}
```

#### 预警相关类型
```typescript
interface Warning {
  id: string
  student_id: string
  type: 'grade_drop' | 'attendance' | 'behavior'
  severity: 'low' | 'medium' | 'high'
  message: string
  created_at: string
}

interface WarningRule {
  id: string
  name: string
  condition: Record<string, any>
  action: Record<string, any>
  enabled: boolean
}
```

---

## 🚨 重要约定

### ⚡ 性能约定
1. **大数据查询必须使用分页**
2. **复杂分析必须使用缓存**
3. **AI分析结果必须缓存7天**

### 🔒 安全约定
1. **所有用户数据必须通过RLS保护**
2. **API密钥必须加密存储**
3. **敏感操作必须记录日志**

### 📊 数据约定
1. **grade_data表使用 (exam_id, student_id, subject) 唯一约束**
2. **UUID作为主键，TEXT用于自然标识符**
3. **时间字段统一使用 TIMESTAMP WITH TIME ZONE**

### 🔄 更新约定
1. **数据库结构变更必须通过migration**
2. **API接口变更必须更新此文档**
3. **新增功能必须添加相应测试**

---

## 📞 常用API调用示例

### 🎯 成绩查询
```typescript
// 获取考试成绩统计
const stats = await gradeAnalysisService.getGradeStats('exam-uuid', {
  class_name: '三年级1班',
  subject: '数学'
})

// 获取学生成绩详情
const grades = await gradeAnalysisService.getStudentGrades('student-uuid')

// 获取班级对比数据
const comparison = await gradeAnalysisService.getClassComparison('exam-uuid')
```

### 🤖 AI分析
```typescript
// 分析学生成绩
const analysis = await aiService.analyzeGrades(gradeData)

// 获取个性化建议
const recommendations = await aiService.getPersonalizedRecommendations('student-uuid')
```

### ⚠️ 预警检查
```typescript
// 检查学生预警
const warnings = await warningService.checkStudentWarnings('student-uuid')

// 获取预警统计
const stats = await warningService.getWarningStatistics({
  start_date: '2024-01-01',
  end_date: '2024-12-31'
})
```

---

**📌 重要提醒**: 
- 此文档是多Agent协作的核心参考
- 任何API变更都必须立即更新此文档
- 开发前必须确认接口的最新状态
- 遇到接口问题请及时沟通协调

**🔄 文档版本**: v1.0 | **最后更新**: 2025-01-04