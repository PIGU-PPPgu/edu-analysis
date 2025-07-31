# API接口标准文档 v2.0

## 📋 文档概述

本文档定义了教育管理系统的API接口标准，用于指导多Master协同开发，确保系统各模块间的一致性和可维护性。

**适用范围**: Master-Performance、Master-Frontend、Master-AI-Data三个专业化开发分支  
**版本**: 2.0  
**最后更新**: 2024年12月  
**维护者**: Multi-Master Development Team

---

## 🏗️ 系统架构概览

### 核心架构

```
┌─────────────────────────────────────────┐
│              Frontend Layer             │
│         (React + TypeScript)           │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Service Layer                 │
│    ┌─────────┬─────────┬─────────┐     │
│    │  Core   │   AI    │Education│     │
│    │Services │Services │Services │     │
│    └─────────┴─────────┴─────────┘     │
│    ┌─────────┬─────────────────────┐   │
│    │  Auth   │    Monitoring       │   │
│    │Services │    Services         │   │
│    └─────────┴─────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Data Layer                   │
│         (Supabase PostgreSQL)          │
└─────────────────────────────────────────┘
```

### 多Master协同架构

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Master-Performance │  │  Master-Frontend │  │  Master-AI-Data  │
│                    │  │                  │  │                  │
│ • 数据库优化        │  │ • UI组件开发      │  │ • 智能分析算法    │
│ • 缓存策略         │  │ • 用户体验优化    │  │ • 推荐系统       │
│ • 性能监控         │  │ • 响应式设计      │  │ • 行为追踪       │
└──────────┬───────┘  └──────────┬───────┘  └──────────┬───────┘
           │                     │                     │
           └─────────────────────┼─────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │    Unified API Gateway     │
                    │       统一接口网关          │
                    └───────────────────────────┘
```

---

## 🔧 API设计标准

### 1. RESTful API设计原则

#### URL命名规范
```
✅ 正确示例:
GET    /api/v1/students                    # 获取学生列表
GET    /api/v1/students/{id}               # 获取单个学生
POST   /api/v1/students                    # 创建学生
PUT    /api/v1/students/{id}               # 更新学生
DELETE /api/v1/students/{id}               # 删除学生
GET    /api/v1/students/{id}/grades        # 获取学生成绩

❌ 错误示例:
GET    /api/getStudents                    # 动词命名
POST   /api/student/create                 # 非REST风格
GET    /api/studentsAndGrades             # 混合资源
```

#### HTTP状态码规范
```typescript
// 成功响应
200 OK              // 请求成功
201 Created         // 资源创建成功
204 No Content      // 删除成功，无返回内容

// 客户端错误
400 Bad Request     // 请求参数错误
401 Unauthorized    // 未认证
403 Forbidden       // 权限不足
404 Not Found       // 资源不存在
422 Unprocessable Entity  // 数据验证失败

// 服务器错误
500 Internal Server Error  // 服务器内部错误
502 Bad Gateway           // 网关错误
503 Service Unavailable   // 服务不可用
```

### 2. 统一响应格式

#### 成功响应格式
```typescript
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 示例
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "张三",
    "class": "高三(1)班"
  },
  "message": "获取学生信息成功",
  "timestamp": "2024-12-30T12:00:00.000Z",
  "requestId": "req_123456789"
}
```

#### 错误响应格式
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;  // 字段级错误
  };
  timestamp: string;
  requestId: string;
  path: string;
}

// 示例
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "学生姓名不能为空",
    "field": "name"
  },
  "timestamp": "2024-12-30T12:00:00.000Z",
  "requestId": "req_123456789",
  "path": "/api/v1/students"
}
```

### 3. 请求格式规范

#### 查询参数规范
```typescript
// 分页参数
interface PaginationParams {
  page?: number;        // 页码，从1开始
  pageSize?: number;    // 每页大小，默认20，最大100
}

// 排序参数
interface SortParams {
  sortBy?: string;      // 排序字段
  sortOrder?: 'asc' | 'desc';  // 排序方向
}

// 筛选参数
interface FilterParams {
  filter?: string;      // JSON字符串格式的筛选条件
  search?: string;      // 搜索关键词
  dateRange?: string;   // 日期范围: "2024-01-01,2024-12-31"
}

// 示例URL
GET /api/v1/students?page=1&pageSize=20&sortBy=name&sortOrder=asc&search=张三
```

#### 请求体规范
```typescript
// 创建学生请求
interface CreateStudentRequest {
  name: string;                    // 必填
  studentId: string;              // 必填
  className: string;              // 必填
  gender?: '男' | '女' | '其他';   // 可选
  contactPhone?: string;          // 可选
  contactEmail?: string;          // 可选
}

// 批量操作请求
interface BatchRequest<T> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
  options?: {
    skipDuplicates?: boolean;
    continueOnError?: boolean;
  };
}
```

---

## 📦 核心模块API规范

### 1. Core Services API

#### APIClient接口规范
```typescript
interface APIClient {
  // 基础CRUD操作
  query<T>(
    table: string,
    options?: {
      select?: string;
      filter?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      single?: boolean;
    },
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>;

  insert<T>(
    table: string,
    data: any,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>;

  update<T>(
    table: string,
    data: any,
    filter: Record<string, any>,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>;

  delete<T>(
    table: string,
    filter: Record<string, any>,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>;

  // RPC函数调用
  rpc<T>(
    functionName: string,
    params?: Record<string, any>,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>;

  // 批量操作
  batch(operations: Array<() => Promise<any>>): Promise<APIResponse<any[]>>;
}
```

#### Cache接口规范
```typescript
interface CacheManager {
  // 基础缓存操作
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;

  // 批量操作
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  mset<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void>;

  // 缓存统计
  getStats(): Promise<CacheStats>;
}

interface CacheStats {
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  itemCount: number;
}
```

### 2. AI Services API

#### 统一AI网关接口
```typescript
interface AIGateway {
  // 统一AI请求接口
  request(request: UnifiedAIRequest): Promise<UnifiedAIResponse>;
  
  // AI服务健康检查
  healthCheck(): Promise<HealthCheckResult>;
  
  // 性能监控
  getMetrics(): Promise<AIMetrics>;
}

interface UnifiedAIRequest {
  service: 'analysis' | 'chat' | 'recommendation' | 'orchestration';
  method: string;
  data: any;
  options?: {
    timeout?: number;
    retries?: number;
    cache?: boolean;
    priority?: 'low' | 'normal' | 'high';
  };
}

interface UnifiedAIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    service: string;
    method: string;
    executionTime: number;
    provider?: string;
    cached?: boolean;
  };
}
```

#### AI分析服务接口
```typescript
interface AnalysisService {
  // 成绩分析
  analyzeGrades(request: GradeAnalysisRequest): Promise<GradeAnalysisResponse>;
  
  // 学生画像分析
  analyzeStudentProfile(studentId: string): Promise<StudentProfileAnalysis>;
  
  // 班级分析
  analyzeClass(classId: string): Promise<ClassAnalysisResponse>;
  
  // 预警分析
  analyzeWarnings(request: WarningAnalysisRequest): Promise<WarningAnalysisResponse>;
}

interface GradeAnalysisRequest {
  studentIds?: string[];
  classIds?: string[];
  subjects?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  analysisType: 'trend' | 'comparison' | 'prediction' | 'comprehensive';
  options?: {
    includeRecommendations?: boolean;
    includeVisualization?: boolean;
    detailLevel?: 'summary' | 'detailed' | 'comprehensive';
  };
}
```

#### 推荐引擎接口
```typescript
interface RecommendationEngine {
  // 生成个性化推荐
  generateRecommendations(userId: string): Promise<RecommendationItem[]>;
  
  // 获取推荐统计
  getRecommendationStats(userId: string): Promise<RecommendationStats>;
  
  // 用户反馈处理
  recordRecommendationFeedback(
    userId: string,
    recommendationId: string,
    feedback: RecommendationFeedback
  ): Promise<void>;
}

interface RecommendationItem {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  actionUrl?: string;
  priority: number;        // 1-10
  confidence: number;      // 0-1
  reasoning: string;
  metadata: Record<string, any>;
  expiresAt?: string;
}

enum RecommendationType {
  STUDENT_FOCUS = "student_focus",
  ANALYSIS_METHOD = "analysis_method",
  PAGE_NAVIGATION = "page_navigation",
  FILTER_SUGGESTION = "filter_suggestion",
  TIME_RANGE = "time_range",
  SUBJECT_FOCUS = "subject_focus",
  CLASS_ATTENTION = "class_attention",
  WORKFLOW_OPTIMIZATION = "workflow_optimization"
}
```

#### 用户行为追踪接口
```typescript
interface UserBehaviorTracker {
  // 事件追踪
  trackEvent(
    actionType: UserActionType,
    contextData?: Record<string, any>,
    elementId?: string,
    duration?: number
  ): Promise<void>;

  // 页面访问追踪
  trackPageView(pagePath?: string): Promise<void>;
  
  // 特定行为追踪
  trackStudentView(studentId: string, viewType: string): Promise<void>;
  trackFilterUsage(filterType: string, filterValues: any): Promise<void>;
  trackAIAnalysis(analysisType: string, duration: number, success: boolean): Promise<void>;
  
  // 用户偏好分析
  analyzeUserPreferences(userId: string): Promise<UserPreferences>;
  
  // 行为统计
  getUserBehaviorStats(userId: string, days?: number): Promise<UserBehaviorStats>;
}

enum UserActionType {
  PAGE_VIEW = "page_view",
  PAGE_LEAVE = "page_leave",
  VIEW_STUDENT_PROFILE = "view_student_profile",
  VIEW_CLASS_ANALYSIS = "view_class_analysis",
  VIEW_GRADE_ANALYSIS = "view_grade_analysis",
  APPLY_FILTER = "apply_filter",
  SEARCH_STUDENT = "search_student",
  GENERATE_REPORT = "generate_report",
  EXPORT_DATA = "export_data",
  RUN_AI_ANALYSIS = "run_ai_analysis"
}
```

### 3. Education Services API

#### 学生管理服务
```typescript
interface StudentService {
  // 学生CRUD操作
  getStudents(params: GetStudentsParams): Promise<PaginatedResponse<Student>>;
  getStudent(id: string): Promise<Student>;
  createStudent(data: CreateStudentRequest): Promise<Student>;
  updateStudent(id: string, data: UpdateStudentRequest): Promise<Student>;
  deleteStudent(id: string): Promise<void>;
  
  // 批量操作
  batchCreateStudents(students: CreateStudentRequest[]): Promise<BatchOperationResult>;
  batchUpdateStudents(updates: Array<{id: string; data: UpdateStudentRequest}>): Promise<BatchOperationResult>;
  
  // 学生搜索
  searchStudents(query: string, filters?: StudentFilters): Promise<Student[]>;
  
  // 学生统计
  getStudentStats(classId?: string): Promise<StudentStats>;
}

interface Student {
  id: string;
  studentId: string;        // 学号
  name: string;
  className: string;
  gender?: '男' | '女' | '其他';
  contactPhone?: string;
  contactEmail?: string;
  admissionYear?: string;
  createdAt: string;
  updatedAt: string;
}

interface GetStudentsParams extends PaginationParams, SortParams {
  classId?: string;
  search?: string;
  gender?: '男' | '女' | '其他';
  admissionYear?: string;
}
```

#### 成绩管理服务
```typescript
interface GradeService {
  // 成绩CRUD操作
  getGrades(params: GetGradesParams): Promise<PaginatedResponse<Grade>>;
  getGrade(id: string): Promise<Grade>;
  createGrade(data: CreateGradeRequest): Promise<Grade>;
  updateGrade(id: string, data: UpdateGradeRequest): Promise<Grade>;
  deleteGrade(id: string): Promise<void>;
  
  // 成绩导入
  importGrades(data: ImportGradesRequest): Promise<ImportGradesResponse>;
  
  // 成绩分析
  analyzeGrades(params: GradeAnalysisParams): Promise<GradeAnalysisResult>;
  
  // 成绩统计
  getGradeStats(params: GradeStatsParams): Promise<GradeStats>;
}

interface Grade {
  id: string;
  examId: string;
  studentId: string;
  subject: string;
  score: number;
  maxScore: number;
  grade?: string;           // 等级
  rankInClass?: number;
  rankInGrade?: number;
  examDate: string;
  createdAt: string;
  updatedAt: string;
}
```

#### 班级管理服务
```typescript
interface ClassService {
  // 班级CRUD操作
  getClasses(params: GetClassesParams): Promise<PaginatedResponse<Class>>;
  getClass(id: string): Promise<Class>;
  createClass(data: CreateClassRequest): Promise<Class>;
  updateClass(id: string, data: UpdateClassRequest): Promise<Class>;
  deleteClass(id: string): Promise<void>;
  
  // 班级分析
  analyzeClass(classId: string): Promise<ClassAnalysisResult>;
  
  // 班级统计
  getClassStats(classId: string): Promise<ClassStats>;
}

interface Class {
  id: string;
  className: string;
  gradeLevel: string;
  academicYear: string;
  homeroomTeacher?: string;
  studentCount: number;
  department?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. Auth Services API

#### 认证服务
```typescript
interface AuthenticationService {
  // 用户认证
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthResponse>;
  
  // 用户注册
  register(userData: RegisterRequest): Promise<AuthResponse>;
  
  // 密码管理
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  
  // 用户信息
  getCurrentUser(): Promise<User>;
  updateProfile(data: UpdateProfileRequest): Promise<User>;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  userType: 'admin' | 'teacher' | 'student';
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}
```

#### 授权服务
```typescript
interface AuthorizationService {
  // 权限检查
  hasPermission(permission: string): Promise<boolean>;
  hasRole(role: string): Promise<boolean>;
  canAccess(resource: string, action: string): Promise<boolean>;
  
  // 角色管理
  getUserRoles(userId: string): Promise<Role[]>;
  assignRole(userId: string, roleId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
  
  // 权限管理
  getPermissions(userId: string): Promise<Permission[]>;
  grantPermission(userId: string, permission: string): Promise<void>;
  revokePermission(userId: string, permission: string): Promise<void>;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}
```

### 5. Monitoring Services API

#### 预警服务
```typescript
interface WarningService {
  // 预警规则管理
  getWarningRules(): Promise<WarningRule[]>;
  createWarningRule(rule: CreateWarningRuleRequest): Promise<WarningRule>;
  updateWarningRule(id: string, rule: UpdateWarningRuleRequest): Promise<WarningRule>;
  deleteWarningRule(id: string): Promise<void>;
  
  // 预警记录管理
  getWarningRecords(params: GetWarningRecordsParams): Promise<PaginatedResponse<WarningRecord>>;
  getWarningRecord(id: string): Promise<WarningRecord>;
  resolveWarning(id: string, resolution: WarningResolution): Promise<void>;
  dismissWarning(id: string, reason: string): Promise<void>;
  
  // 预警分析
  analyzeWarnings(params: WarningAnalysisParams): Promise<WarningAnalysisResult>;
  
  // 预警统计
  getWarningStats(): Promise<WarningStats>;
}

interface WarningRule {
  id: string;
  name: string;
  description: string;
  conditions: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface WarningRecord {
  id: string;
  studentId: string;
  ruleId: string;
  details: Record<string, any>;
  status: 'active' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}
```

#### 干预服务
```typescript
interface InterventionService {
  // 干预措施管理
  getInterventions(studentId?: string): Promise<Intervention[]>;
  createIntervention(data: CreateInterventionRequest): Promise<Intervention>;
  updateIntervention(id: string, data: UpdateInterventionRequest): Promise<Intervention>;
  completeIntervention(id: string, result: InterventionResult): Promise<void>;
  
  // 干预效果分析
  analyzeInterventionEffectiveness(params: InterventionAnalysisParams): Promise<InterventionAnalysisResult>;
}

interface Intervention {
  id: string;
  studentId: string;
  warningId?: string;
  type: 'academic' | 'behavioral' | 'psychological' | 'other';
  title: string;
  description: string;
  plannedActions: string[];
  assignedTo: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

---

## 🔐 认证授权规范

### 1. JWT Token规范

#### Token结构
```typescript
interface JWTPayload {
  sub: string;          // 用户ID
  email: string;        // 用户邮箱
  roles: string[];      // 用户角色
  permissions: string[]; // 用户权限
  iat: number;          // 签发时间
  exp: number;          // 过期时间
  iss: string;          // 签发者
  aud: string;          // 接收者
}
```

#### Token使用规范
```typescript
// 请求头格式
Authorization: Bearer <access_token>

// Token刷新机制
interface TokenRefreshRequest {
  refreshToken: string;
}

interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### 2. 权限控制规范

#### 基于角色的访问控制(RBAC)
```typescript
// 角色定义
enum UserRole {
  ADMIN = 'admin',           // 系统管理员
  TEACHER = 'teacher',       // 教师
  STUDENT = 'student',       // 学生
  PARENT = 'parent'          // 家长(预留)
}

// 权限定义
enum Permission {
  // 学生管理权限
  STUDENT_READ = 'student:read',
  STUDENT_WRITE = 'student:write',
  STUDENT_DELETE = 'student:delete',
  
  // 成绩管理权限
  GRADE_READ = 'grade:read',
  GRADE_WRITE = 'grade:write',
  GRADE_DELETE = 'grade:delete',
  
  // 班级管理权限
  CLASS_READ = 'class:read',
  CLASS_WRITE = 'class:write',
  CLASS_DELETE = 'class:delete',
  
  // 系统管理权限
  SYSTEM_ADMIN = 'system:admin',
  USER_MANAGEMENT = 'user:management'
}
```

#### API权限装饰器
```typescript
// 权限检查装饰器示例
@RequirePermission('student:read')
async getStudents(params: GetStudentsParams): Promise<PaginatedResponse<Student>> {
  // 实现逻辑
}

@RequireRole('teacher', 'admin')
async createGrade(data: CreateGradeRequest): Promise<Grade> {
  // 实现逻辑
}
```

### 3. 数据访问控制

#### Row Level Security (RLS) 规范
```sql
-- 学生数据访问策略示例
CREATE POLICY student_access_policy ON students
  FOR SELECT
  USING (
    -- 管理员可以访问所有数据
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR
    -- 教师只能访问自己任教班级的学生
    EXISTS (
      SELECT 1 FROM course_classes cc
      JOIN teachers t ON t.id = cc.teacher_id
      WHERE cc.class_name = students.class_name 
      AND t.id = auth.uid()
    )
    OR
    -- 学生只能访问自己的数据
    user_id = auth.uid()
  );
```

---

## ⚡ 性能标准规范

### 1. 响应时间标准

```typescript
// API响应时间要求
interface PerformanceStandards {
  // 基础CRUD操作
  simpleQuery: {
    target: 200;      // 目标响应时间(ms)
    maximum: 500;     // 最大可接受时间(ms)
  };
  
  // 复杂查询
  complexQuery: {
    target: 1000;
    maximum: 3000;
  };
  
  // AI分析操作
  aiAnalysis: {
    target: 5000;
    maximum: 15000;
  };
  
  // 数据导入/导出
  dataImport: {
    target: 10000;
    maximum: 60000;
  };
}
```

### 2. 并发处理标准

```typescript
// 并发处理要求
interface ConcurrencyStandards {
  maxConcurrentRequests: 1000;    // 最大并发请求数
  maxRequestsPerUser: 50;         // 单用户最大并发数
  rateLimitPerMinute: 600;        // 每分钟请求限制
  bulkOperationLimit: 1000;       // 批量操作限制
}
```

### 3. 缓存策略规范

```typescript
// 缓存配置标准
interface CacheStrategy {
  // 用户数据缓存
  userData: {
    ttl: 300;          // 5分钟
    strategy: 'write-through';
  };
  
  // 成绩数据缓存
  gradeData: {
    ttl: 900;          // 15分钟
    strategy: 'write-behind';
  };
  
  // 分析结果缓存
  analysisResults: {
    ttl: 3600;         // 1小时
    strategy: 'cache-aside';
  };
  
  // 静态数据缓存
  staticData: {
    ttl: 86400;        // 24小时
    strategy: 'cache-first';
  };
}
```

---

## 🔧 错误处理标准

### 1. 统一错误码规范

```typescript
// 错误码分类
enum ErrorCategory {
  VALIDATION = 'VALIDATION',        // 1000-1999: 验证错误
  AUTHENTICATION = 'AUTH',          // 2000-2999: 认证错误
  AUTHORIZATION = 'AUTHZ',          // 3000-3999: 授权错误
  BUSINESS = 'BUSINESS',            // 4000-4999: 业务逻辑错误
  SYSTEM = 'SYSTEM',               // 5000-5999: 系统错误
  EXTERNAL = 'EXTERNAL'            // 6000-6999: 外部服务错误
}

// 具体错误码定义
enum ErrorCode {
  // 验证错误 (1000-1999)
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_1001',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_1002',
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_1003',
  VALIDATION_DUPLICATE_VALUE = 'VALIDATION_1004',
  
  // 认证错误 (2000-2999)
  AUTH_INVALID_CREDENTIALS = 'AUTH_2001',
  AUTH_TOKEN_EXPIRED = 'AUTH_2002',
  AUTH_TOKEN_INVALID = 'AUTH_2003',
  AUTH_USER_NOT_FOUND = 'AUTH_2004',
  
  // 授权错误 (3000-3999)
  AUTHZ_INSUFFICIENT_PERMISSIONS = 'AUTHZ_3001',
  AUTHZ_RESOURCE_ACCESS_DENIED = 'AUTHZ_3002',
  AUTHZ_ROLE_REQUIRED = 'AUTHZ_3003',
  
  // 业务错误 (4000-4999)
  BUSINESS_STUDENT_NOT_FOUND = 'BUSINESS_4001',
  BUSINESS_CLASS_FULL = 'BUSINESS_4002',
  BUSINESS_GRADE_ALREADY_EXISTS = 'BUSINESS_4003',
  BUSINESS_INVALID_OPERATION = 'BUSINESS_4004',
  
  // 系统错误 (5000-5999)
  SYSTEM_DATABASE_ERROR = 'SYSTEM_5001',
  SYSTEM_CACHE_ERROR = 'SYSTEM_5002',
  SYSTEM_SERVICE_UNAVAILABLE = 'SYSTEM_5003',
  SYSTEM_INTERNAL_ERROR = 'SYSTEM_5004',
  
  // 外部服务错误 (6000-6999)
  EXTERNAL_AI_SERVICE_ERROR = 'EXTERNAL_6001',
  EXTERNAL_NOTIFICATION_ERROR = 'EXTERNAL_6002',
  EXTERNAL_STORAGE_ERROR = 'EXTERNAL_6003'
}
```

### 2. 错误处理模式

```typescript
// 错误处理装饰器
function handleErrors(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// 统一错误处理函数
function handleApiError(error: any): ErrorResponse {
  let errorCode = ErrorCode.SYSTEM_INTERNAL_ERROR;
  let message = '系统内部错误';
  
  // 根据错误类型映射错误码
  if (error.code === '23505') {  // PostgreSQL唯一约束错误
    errorCode = ErrorCode.VALIDATION_DUPLICATE_VALUE;
    message = '数据已存在，无法重复添加';
  } else if (error.code === '23503') {  // 外键约束错误
    errorCode = ErrorCode.BUSINESS_INVALID_OPERATION;
    message = '数据关联错误，请检查相关数据';
  } else if (error.message?.includes('permission')) {
    errorCode = ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS;
    message = '权限不足，无法执行此操作';
  }
  
  return {
    success: false,
    error: {
      code: errorCode,
      message,
      details: error.details
    },
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    path: getCurrentPath()
  };
}
```

### 3. 客户端错误处理

```typescript
// 客户端错误处理示例
class APIErrorHandler {
  static handle(error: ErrorResponse): void {
    switch (error.error.code) {
      case ErrorCode.AUTH_TOKEN_EXPIRED:
        // 刷新Token或跳转登录
        this.handleTokenExpiry();
        break;
        
      case ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS:
        // 显示权限不足提示
        toast.error('权限不足，请联系管理员');
        break;
        
      case ErrorCode.VALIDATION_REQUIRED_FIELD:
        // 显示字段验证错误
        this.showFieldError(error.error.field, error.error.message);
        break;
        
      case ErrorCode.SYSTEM_SERVICE_UNAVAILABLE:
        // 显示服务不可用提示
        toast.error('服务暂时不可用，请稍后重试');
        break;
        
      default:
        // 显示通用错误信息
        toast.error(error.error.message || '操作失败');
    }
  }
}
```

---

## 🔄 版本控制策略

### 1. API版本控制

#### URL版本控制
```
✅ 推荐方式: URL路径版本控制
GET /api/v1/students
GET /api/v2/students

❌ 不推荐: 查询参数版本控制
GET /api/students?version=1

❌ 不推荐: Header版本控制
GET /api/students
API-Version: 1
```

#### 版本生命周期
```typescript
interface APIVersion {
  version: string;
  status: 'alpha' | 'beta' | 'stable' | 'deprecated' | 'retired';
  releaseDate: string;
  deprecationDate?: string;
  retirementDate?: string;
  supportLevel: 'full' | 'maintenance' | 'security-only' | 'none';
}

// 版本支持策略
const versionPolicy = {
  simultaneousVersions: 3,      // 同时支持的最大版本数
  deprecationPeriod: 365,       // 废弃期(天)
  retirementPeriod: 180,        // 淘汰期(天)
  maintenancePeriod: 730        // 维护期(天)
};
```

### 2. 向后兼容性

#### 兼容性规则
```typescript
// 兼容的变更
interface CompatibleChanges {
  addNewEndpoint: true;           // 添加新端点
  addOptionalParameter: true;     // 添加可选参数
  addResponseField: true;         // 添加响应字段
  relaxValidation: true;          // 放松验证规则
}

// 不兼容的变更
interface BreakingChanges {
  removeEndpoint: false;          // 删除端点
  removeResponseField: false;     // 删除响应字段
  changeParameterType: false;     // 改变参数类型
  makeParameterRequired: false;   // 参数变为必填
  changeErrorFormat: false;       // 改变错误格式
}
```

#### 版本迁移支持
```typescript
// API版本迁移工具
class APIVersionMigrator {
  // 自动转换请求格式
  static migrateRequest(request: any, fromVersion: string, toVersion: string): any {
    const migrationRules = this.getMigrationRules(fromVersion, toVersion);
    return this.applyMigrationRules(request, migrationRules);
  }
  
  // 自动转换响应格式
  static migrateResponse(response: any, fromVersion: string, toVersion: string): any {
    const migrationRules = this.getMigrationRules(fromVersion, toVersion);
    return this.applyMigrationRules(response, migrationRules);
  }
}
```

---

## 🏆 多Master协同规范

### 1. Master专业化分工

#### Master-Performance专责接口
```typescript
// 性能优化相关API
interface PerformanceAPIs {
  // 数据库查询优化
  '/api/v1/performance/query-optimization': {
    POST: (query: OptimizationRequest) => OptimizationResult;
  };
  
  // 缓存管理
  '/api/v1/performance/cache': {
    GET: () => CacheStats;
    DELETE: (keys: string[]) => void;
    POST: (config: CacheConfig) => void;
  };
  
  // 性能监控
  '/api/v1/performance/metrics': {
    GET: (timeRange: TimeRange) => PerformanceMetrics;
  };
  
  // 资源使用监控
  '/api/v1/performance/resources': {
    GET: () => ResourceUsage;
  };
}
```

#### Master-Frontend专责接口
```typescript
// 前端相关API
interface FrontendAPIs {
  // UI状态管理
  '/api/v1/frontend/ui-state': {
    GET: (userId: string) => UIState;
    PUT: (userId: string, state: UIState) => void;
  };
  
  // 用户偏好设置
  '/api/v1/frontend/preferences': {
    GET: (userId: string) => UserPreferences;
    PUT: (userId: string, preferences: UserPreferences) => void;
  };
  
  // 主题配置
  '/api/v1/frontend/theme': {
    GET: () => ThemeConfig;
    PUT: (config: ThemeConfig) => void;
  };
  
  // 响应式配置
  '/api/v1/frontend/responsive': {
    GET: () => ResponsiveConfig;
    PUT: (config: ResponsiveConfig) => void;
  };
}
```

#### Master-AI-Data专责接口
```typescript
// AI和数据相关API
interface AIDataAPIs {
  // 用户行为分析
  '/api/v1/ai-data/behavior': {
    POST: (event: UserBehaviorEvent) => void;
    GET: (userId: string) => UserBehaviorStats;
  };
  
  // 智能推荐
  '/api/v1/ai-data/recommendations': {
    GET: (userId: string) => RecommendationItem[];
    POST: (feedback: RecommendationFeedback) => void;
  };
  
  // AI分析服务
  '/api/v1/ai-data/analysis': {
    POST: (request: AIAnalysisRequest) => AIAnalysisResponse;
  };
  
  // 数据洞察
  '/api/v1/ai-data/insights': {
    GET: (params: InsightParams) => DataInsights;
  };
}
```

### 2. 跨Master通信协议

#### 消息格式标准
```typescript
interface InterMasterMessage {
  id: string;
  from: 'performance' | 'frontend' | 'ai-data';
  to: 'performance' | 'frontend' | 'ai-data' | 'broadcast';
  type: 'request' | 'response' | 'notification' | 'event';
  timestamp: string;
  data: any;
  correlationId?: string;  // 用于请求-响应关联
}

// 消息类型定义
enum MessageType {
  // 性能相关消息
  PERFORMANCE_METRIC_UPDATE = 'performance:metric_update',
  CACHE_INVALIDATION = 'performance:cache_invalidation',
  RESOURCE_THRESHOLD_ALERT = 'performance:resource_alert',
  
  // 前端相关消息
  UI_STATE_CHANGE = 'frontend:ui_state_change',
  USER_PREFERENCE_UPDATE = 'frontend:preference_update',
  THEME_CHANGE = 'frontend:theme_change',
  
  // AI数据相关消息
  USER_BEHAVIOR_EVENT = 'ai-data:behavior_event',
  RECOMMENDATION_GENERATED = 'ai-data:recommendation_generated',
  ANALYSIS_COMPLETED = 'ai-data:analysis_completed'
}
```

#### 通信API网关
```typescript
interface MasterCommunicationGateway {
  // 发送消息
  sendMessage(message: InterMasterMessage): Promise<void>;
  
  // 发送请求并等待响应
  sendRequest<T>(
    to: string,
    type: string,
    data: any,
    timeout?: number
  ): Promise<T>;
  
  // 广播消息
  broadcast(type: string, data: any): Promise<void>;
  
  // 订阅消息
  subscribe(
    type: string,
    handler: (message: InterMasterMessage) => void
  ): void;
  
  // 取消订阅
  unsubscribe(type: string, handler: Function): void;
}
```

### 3. 数据同步协议

#### 数据同步规范
```typescript
interface DataSyncProtocol {
  // 数据版本控制
  version: string;
  timestamp: string;
  checksum: string;
  
  // 同步操作
  operation: 'create' | 'update' | 'delete' | 'batch';
  
  // 数据负载
  data: any;
  
  // 同步目标
  targets: Array<'performance' | 'frontend' | 'ai-data'>;
  
  // 冲突解决策略
  conflictResolution: 'overwrite' | 'merge' | 'manual';
}

// 数据同步管理器
interface DataSyncManager {
  // 发起数据同步
  sync(protocol: DataSyncProtocol): Promise<SyncResult>;
  
  // 检查数据一致性
  checkConsistency(dataType: string): Promise<ConsistencyReport>;
  
  // 解决数据冲突
  resolveConflict(
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<void>;
  
  // 获取同步状态
  getSyncStatus(): Promise<SyncStatus>;
}
```

---

## 🛠️ 开发工具和测试

### 1. API文档生成

#### OpenAPI规范
```yaml
# swagger.yaml 示例
openapi: 3.0.3
info:
  title: 教育管理系统API
  description: 统一的教育管理系统接口文档
  version: 2.0.0
  contact:
    name: Multi-Master Development Team
    email: dev@example.com

servers:
  - url: https://api.example.com/v1
    description: 生产环境
  - url: https://api-staging.example.com/v1
    description: 测试环境

paths:
  /students:
    get:
      summary: 获取学生列表
      description: 分页获取学生信息列表
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: pageSize
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: 成功获取学生列表
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedStudentResponse'
```

### 2. API测试规范

#### 单元测试标准
```typescript
// API单元测试示例
describe('StudentService', () => {
  describe('getStudents', () => {
    it('should return paginated students', async () => {
      // Arrange
      const params: GetStudentsParams = {
        page: 1,
        pageSize: 20
      };
      
      // Act
      const result = await studentService.getStudents(params);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(20);
      expect(result.data.pagination.page).toBe(1);
      expect(result.data.pagination.pageSize).toBe(20);
    });
    
    it('should handle validation errors', async () => {
      // Arrange
      const params: GetStudentsParams = {
        page: -1,  // 无效页码
        pageSize: 200  // 超出限制
      };
      
      // Act
      const result = await studentService.getStudents(params);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ErrorCode.VALIDATION_OUT_OF_RANGE);
    });
  });
});
```

#### 集成测试标准
```typescript
// API集成测试示例
describe('Student Management Integration', () => {
  it('should complete full student lifecycle', async () => {
    // 创建学生
    const createResponse = await apiClient.post('/api/v1/students', {
      name: '测试学生',
      studentId: 'TEST001',
      className: '测试班级'
    });
    expect(createResponse.status).toBe(201);
    
    const studentId = createResponse.data.id;
    
    // 获取学生信息
    const getResponse = await apiClient.get(`/api/v1/students/${studentId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.name).toBe('测试学生');
    
    // 更新学生信息
    const updateResponse = await apiClient.put(`/api/v1/students/${studentId}`, {
      name: '更新后的学生姓名'
    });
    expect(updateResponse.status).toBe(200);
    
    // 删除学生
    const deleteResponse = await apiClient.delete(`/api/v1/students/${studentId}`);
    expect(deleteResponse.status).toBe(204);
  });
});
```

### 3. API监控和日志

#### 监控指标
```typescript
interface APIMetrics {
  // 请求统计
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  
  // 响应时间统计
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // 错误统计
  errorRate: number;
  errorsByCode: Record<string, number>;
  
  // 并发统计
  currentConcurrency: number;
  maxConcurrency: number;
  
  // 资源使用
  memoryUsage: number;
  cpuUsage: number;
}
```

#### 日志格式
```typescript
interface APILogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  requestId: string;
  userId?: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  clientIP?: string;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

// 日志示例
{
  "timestamp": "2024-12-30T12:00:00.000Z",
  "level": "info",
  "requestId": "req_123456789",
  "userId": "user_987654321",
  "method": "GET",
  "path": "/api/v1/students",
  "statusCode": 200,
  "responseTime": 150,
  "userAgent": "Mozilla/5.0...",
  "clientIP": "192.168.1.100",
  "metadata": {
    "page": 1,
    "pageSize": 20,
    "totalResults": 1520
  }
}
```

---

## 📈 持续改进机制

### 1. API性能监控

#### 性能基准测试
```typescript
interface PerformanceBenchmark {
  endpoint: string;
  method: string;
  expectedResponseTime: number;
  maxResponseTime: number;
  minThroughput: number;
  testDuration: number;
  testResults: {
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    throughput: number;
    errorRate: number;
    passedCriteria: boolean;
  };
}
```

### 2. API使用分析

#### 使用统计报告
```typescript
interface APIUsageReport {
  reportPeriod: {
    start: string;
    end: string;
  };
  
  topEndpoints: Array<{
    endpoint: string;
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
  
  userBehavior: {
    activeUsers: number;
    averageRequestsPerUser: number;
    peakUsageHours: number[];
  };
  
  performanceInsights: {
    slowestEndpoints: string[];
    mostErrorProneEndpoints: string[];
    improvementSuggestions: string[];
  };
}
```

### 3. 版本升级策略

#### 渐进式升级流程
```typescript
interface VersionUpgradeStrategy {
  phases: Array<{
    name: string;
    description: string;
    duration: number;
    criteria: string[];
    rollbackPlan: string;
  }>;
  
  monitoring: {
    keyMetrics: string[];
    alertThresholds: Record<string, number>;
    rollbackTriggers: string[];
  };
  
  communication: {
    userNotificationPlan: string;
    documentationUpdates: string[];
    trainingMaterials: string[];
  };
}
```

---

## 📚 附录

### A. 快速参考

#### 常用HTTP状态码
```
200 OK - 请求成功
201 Created - 资源创建成功
204 No Content - 成功但无返回内容
400 Bad Request - 请求参数错误
401 Unauthorized - 未认证
403 Forbidden - 权限不足
404 Not Found - 资源不存在
422 Unprocessable Entity - 数据验证失败
500 Internal Server Error - 服务器错误
```

#### 常用错误码速查
```
VALIDATION_1001 - 缺少必填字段
AUTH_2001 - 登录凭据无效
AUTHZ_3001 - 权限不足
BUSINESS_4001 - 学生不存在
SYSTEM_5001 - 数据库错误
```

### B. 示例代码

#### 完整API调用示例
```typescript
// 服务类示例
class StudentService {
  constructor(private apiClient: APIClient) {}
  
  async getStudents(params: GetStudentsParams): Promise<PaginatedResponse<Student>> {
    const response = await this.apiClient.query<Student[]>('students', {
      filter: params.classId ? { class_id: params.classId } : undefined,
      orderBy: params.sortBy ? { 
        column: params.sortBy, 
        ascending: params.sortOrder === 'asc' 
      } : undefined,
      limit: params.pageSize
    });
    
    if (!response.success) {
      throw new APIError(response.error, response.code);
    }
    
    return {
      success: true,
      data: {
        items: response.data || [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: response.data?.length || 0,
          totalPages: Math.ceil((response.data?.length || 0) / (params.pageSize || 20))
        }
      }
    };
  }
}
```

### C. 工具推荐

#### 开发工具
- **API文档**: Swagger/OpenAPI 3.0
- **API测试**: Postman, Insomnia
- **性能测试**: k6, Artillery
- **监控**: Grafana, DataDog
- **日志**: ELK Stack, Loki

#### 代码质量
- **类型检查**: TypeScript
- **代码格式**: Prettier
- **代码规范**: ESLint
- **测试框架**: Jest, Vitest
- **测试覆盖率**: c8, istanbul

---

## 📝 变更日志

### v2.0.0 (2024-12-30)
- ✨ 新增多Master协同开发规范
- ✨ 新增AI服务接口标准
- ✨ 新增用户行为追踪API规范
- ✨ 新增推荐系统接口标准
- 🔄 重构错误处理标准
- 🔄 优化认证授权规范
- 📚 完善API文档结构

### v1.0.0 (2024-11-01)
- 🎉 初版API接口标准发布
- ✨ 基础CRUD接口规范
- ✨ 认证授权标准
- ✨ 错误处理规范
- ✨ 性能标准定义

---

**维护团队**: Multi-Master Development Team  
**联系方式**: dev@example.com  
**最后更新**: 2024年12月30日