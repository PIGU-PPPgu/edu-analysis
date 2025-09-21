/**
 * 🎯 数据校验规则配置
 * 
 * 定义成绩数据的业务规则、阈值和校验标准
 */

// 科目配置
export const SUBJECT_CONFIGS = {
  chinese: { name: '语文', maxScore: 150, passingScore: 90 },
  math: { name: '数学', maxScore: 150, passingScore: 90 },
  english: { name: '英语', maxScore: 150, passingScore: 90 },
  physics: { name: '物理', maxScore: 100, passingScore: 60 },
  chemistry: { name: '化学', maxScore: 100, passingScore: 60 },
  biology: { name: '生物', maxScore: 100, passingScore: 60 },
  politics: { name: '政治', maxScore: 100, passingScore: 60 },
  history: { name: '历史', maxScore: 100, passingScore: 60 },
  geography: { name: '地理', maxScore: 100, passingScore: 60 },
  total: { name: '总分', maxScore: 900, passingScore: 540 }
};

// 等级配置
export const GRADE_CONFIGS = {
  validGrades: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E'],
  gradeToScore: {
    'A+': { min: 95, max: 100 },
    'A': { min: 90, max: 94 },
    'A-': { min: 85, max: 89 },
    'B+': { min: 80, max: 84 },
    'B': { min: 75, max: 79 },
    'B-': { min: 70, max: 74 },
    'C+': { min: 65, max: 69 },
    'C': { min: 60, max: 64 },
    'C-': { min: 55, max: 59 },
    'D+': { min: 50, max: 54 },
    'D': { min: 45, max: 49 },
    'E': { min: 0, max: 44 }
  }
};

// 排名配置
export const RANK_CONFIGS = {
  classRank: { min: 1, max: 100 },
  gradeRank: { min: 1, max: 2000 },
  schoolRank: { min: 1, max: 5000 }
};

// 数据质量阈值
export const QUALITY_THRESHOLDS = {
  // 缺失数据阈值（百分比）
  missingDataThreshold: 10,
  
  // 异常数据阈值（百分比）
  outlierThreshold: 5,
  
  // 数据一致性阈值
  consistencyThreshold: 95,
  
  // 最小记录数
  minRecordsRequired: 5,
  
  // 数据质量等级
  qualityLevels: {
    excellent: { min: 95, color: '#22c55e', label: '优秀' },
    good: { min: 85, color: '#3b82f6', label: '良好' },
    fair: { min: 70, color: '#f59e0b', label: '一般' },
    poor: { min: 50, color: '#ef4444', label: '较差' },
    critical: { min: 0, color: '#dc2626', label: '严重' }
  }
};

// 校验规则类型
export enum ValidationRuleType {
  REQUIRED = 'required',           // 必填字段
  FORMAT = 'format',              // 格式校验
  RANGE = 'range',                // 数值范围
  LOGIC = 'logic',                // 逻辑校验
  CONSISTENCY = 'consistency',     // 一致性校验
  BUSINESS = 'business'           // 业务规则校验
}

// 错误严重程度
export enum ValidationSeverity {
  CRITICAL = 'critical',  // 严重错误，阻止导入
  ERROR = 'error',       // 错误，需要修复
  WARNING = 'warning',   // 警告，建议修复
  INFO = 'info'         // 信息，可忽略
}

// 校验规则接口
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: ValidationRuleType;
  severity: ValidationSeverity;
  field?: string;
  condition: (value: any, record: any, allRecords: any[]) => boolean;
  errorMessage: string;
  suggestion?: string;
  autoFix?: (value: any, record: any) => any;
  enabled: boolean;
}

// 预定义校验规则
export const VALIDATION_RULES: ValidationRule[] = [
  // 必填字段规则
  {
    id: 'required-student-id',
    name: '学号必填',
    description: '学生学号不能为空',
    type: ValidationRuleType.REQUIRED,
    severity: ValidationSeverity.CRITICAL,
    field: 'student_id',
    condition: (value) => value !== null && value !== undefined && String(value).trim() !== '',
    errorMessage: '学号不能为空',
    suggestion: '请确保每个学生都有唯一的学号',
    enabled: true
  },
  {
    id: 'required-name',
    name: '姓名必填',
    description: '学生姓名不能为空',
    type: ValidationRuleType.REQUIRED,
    severity: ValidationSeverity.CRITICAL,
    field: 'name',
    condition: (value) => value !== null && value !== undefined && String(value).trim() !== '',
    errorMessage: '学生姓名不能为空',
    suggestion: '请确保每个学生都有姓名',
    enabled: true
  },
  {
    id: 'required-class-name',
    name: '班级必填',
    description: '班级名称不能为空',
    type: ValidationRuleType.REQUIRED,
    severity: ValidationSeverity.CRITICAL,
    field: 'class_name',
    condition: (value) => value !== null && value !== undefined && String(value).trim() !== '',
    errorMessage: '班级名称不能为空',
    suggestion: '请确保每个学生都有所属班级',
    enabled: true
  },

  // 格式校验规则
  {
    id: 'format-student-id',
    name: '学号格式',
    description: '学号应为数字或字母数字组合',
    type: ValidationRuleType.FORMAT,
    severity: ValidationSeverity.ERROR,
    field: 'student_id',
    condition: (value) => !value || /^[A-Za-z0-9]{4,20}$/.test(String(value)),
    errorMessage: '学号格式不正确，应为4-20位字母数字组合',
    suggestion: '学号格式建议：数字编号或字母+数字组合',
    enabled: true
  },
  {
    id: 'format-name',
    name: '姓名格式',
    description: '姓名应为中文或英文',
    type: ValidationRuleType.FORMAT,
    severity: ValidationSeverity.WARNING,
    field: 'name',
    condition: (value) => !value || /^[\u4e00-\u9fa5a-zA-Z\s]{2,20}$/.test(String(value)),
    errorMessage: '姓名格式不正确',
    suggestion: '姓名应为2-20位中文或英文字符',
    enabled: true
  },

  // 分数范围校验
  ...Object.entries(SUBJECT_CONFIGS).map(([subject, config]) => ({
    id: `range-${subject}-score`,
    name: `${config.name}分数范围`,
    description: `${config.name}分数应在0-${config.maxScore}之间`,
    type: ValidationRuleType.RANGE,
    severity: ValidationSeverity.ERROR,
    field: `${subject}_score`,
    condition: (value: any) => value === null || value === undefined || (Number(value) >= 0 && Number(value) <= config.maxScore),
    errorMessage: `${config.name}分数超出范围(0-${config.maxScore})`,
    suggestion: `${config.name}满分为${config.maxScore}分`,
    autoFix: (value: any) => {
      if (value === null || value === undefined) return value;
      const num = Number(value);
      return Math.min(Math.max(num, 0), config.maxScore);
    },
    enabled: true
  } as ValidationRule)),

  // 等级格式校验
  ...Object.keys(SUBJECT_CONFIGS).map(subject => ({
    id: `format-${subject}-grade`,
    name: `${SUBJECT_CONFIGS[subject].name}等级格式`,
    description: `${SUBJECT_CONFIGS[subject].name}等级应为有效等级`,
    type: ValidationRuleType.FORMAT,
    severity: ValidationSeverity.WARNING,
    field: `${subject}_grade`,
    condition: (value: any) => !value || GRADE_CONFIGS.validGrades.includes(String(value).toUpperCase()),
    errorMessage: `${SUBJECT_CONFIGS[subject].name}等级格式不正确`,
    suggestion: `有效等级：${GRADE_CONFIGS.validGrades.join(', ')}`,
    autoFix: (value: any) => value ? String(value).toUpperCase() : value,
    enabled: true
  } as ValidationRule)),

  // 排名范围校验
  {
    id: 'range-class-rank',
    name: '班级排名范围',
    description: '班级排名应为正整数',
    type: ValidationRuleType.RANGE,
    severity: ValidationSeverity.WARNING,
    field: 'total_rank_in_class',
    condition: (value) => value === null || value === undefined || (Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= RANK_CONFIGS.classRank.max),
    errorMessage: `班级排名应为1-${RANK_CONFIGS.classRank.max}的正整数`,
    suggestion: '班级排名从1开始，表示在班级中的名次',
    enabled: true
  },
  {
    id: 'range-grade-rank',
    name: '年级排名范围',
    description: '年级排名应为正整数',
    type: ValidationRuleType.RANGE,
    severity: ValidationSeverity.WARNING,
    field: 'total_rank_in_grade',
    condition: (value) => value === null || value === undefined || (Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= RANK_CONFIGS.gradeRank.max),
    errorMessage: `年级排名应为1-${RANK_CONFIGS.gradeRank.max}的正整数`,
    suggestion: '年级排名从1开始，表示在年级中的名次',
    enabled: true
  },

  // 逻辑校验规则
  {
    id: 'logic-total-score',
    name: '总分逻辑校验',
    description: '总分应与各科分数和相符',
    type: ValidationRuleType.LOGIC,
    severity: ValidationSeverity.WARNING,
    condition: (value, record) => {
      if (!record.total_score) return true;
      
      const subjects = ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'];
      const subjectScores = subjects
        .map(subject => record[`${subject}_score`])
        .filter(score => score !== null && score !== undefined)
        .map(Number);
      
      if (subjectScores.length === 0) return true;
      
      const calculatedTotal = subjectScores.reduce((sum, score) => sum + score, 0);
      const actualTotal = Number(record.total_score);
      
      // 允许5分的误差
      return Math.abs(calculatedTotal - actualTotal) <= 5;
    },
    errorMessage: '总分与各科分数之和不匹配',
    suggestion: '检查总分是否为各科分数的正确汇总',
    enabled: true
  },
  {
    id: 'logic-score-grade-consistency',
    name: '分数等级一致性',
    description: '分数应与对应等级匹配',
    type: ValidationRuleType.CONSISTENCY,
    severity: ValidationSeverity.INFO,
    condition: (value, record) => {
      const subjects = ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography', 'total'];
      
      for (const subject of subjects) {
        const score = record[`${subject}_score`];
        const grade = record[`${subject}_grade`];
        
        if (score !== null && score !== undefined && grade) {
          const gradeRange = GRADE_CONFIGS.gradeToScore[grade.toUpperCase()];
          if (gradeRange) {
            const normalizedScore = (Number(score) / SUBJECT_CONFIGS[subject].maxScore) * 100;
            if (normalizedScore < gradeRange.min || normalizedScore > gradeRange.max) {
              return false;
            }
          }
        }
      }
      
      return true;
    },
    errorMessage: '分数与等级不匹配',
    suggestion: '检查分数和等级是否对应',
    enabled: true
  },

  // 业务规则校验
  {
    id: 'business-unique-student-id',
    name: '学号唯一性',
    description: '同一考试中学号应唯一',
    type: ValidationRuleType.BUSINESS,
    severity: ValidationSeverity.CRITICAL,
    condition: (value, record, allRecords) => {
      if (!value) return true;
      const duplicates = allRecords.filter(r => 
        r.student_id === value && 
        r.exam_title === record.exam_title
      );
      return duplicates.length <= 1;
    },
    errorMessage: '发现重复学号',
    suggestion: '同一考试中每个学生的学号应唯一',
    enabled: true
  },
  {
    id: 'business-rank-consistency',
    name: '排名一致性',
    description: '同一考试中排名应无重复',
    type: ValidationRuleType.BUSINESS,
    severity: ValidationSeverity.WARNING,
    condition: (value, record, allRecords) => {
      if (!record.total_rank_in_class || !record.class_name || !record.exam_title) return true;
      
      const sameClassRecords = allRecords.filter(r => 
        r.class_name === record.class_name && 
        r.exam_title === record.exam_title &&
        r.total_rank_in_class === record.total_rank_in_class
      );
      
      return sameClassRecords.length <= 1;
    },
    errorMessage: '同班级内发现重复排名',
    suggestion: '检查班级内排名是否正确',
    enabled: true
  }
];

// 数据清洗规则
export const DATA_CLEANING_RULES = [
  // 去除前后空格
  {
    field: 'all_text_fields',
    rule: (value: any) => typeof value === 'string' ? value.trim() : value,
    description: '去除文本字段的前后空格'
  },
  
  // 标准化等级格式
  {
    field: 'all_grade_fields',
    rule: (value: any) => {
      if (!value) return value;
      const grade = String(value).toUpperCase().replace(/\s/g, '');
      return GRADE_CONFIGS.validGrades.includes(grade) ? grade : value;
    },
    description: '标准化等级字段格式'
  },
  
  // 数值字段类型转换
  {
    field: 'all_number_fields',
    rule: (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return isNaN(num) ? value : num;
    },
    description: '转换数值字段类型'
  },
  
  // 日期格式标准化
  {
    field: 'exam_date',
    rule: (value: any) => {
      if (!value) return value;
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toISOString().split('T')[0];
    },
    description: '标准化日期格式为YYYY-MM-DD'
  }
];

// 获取字段的校验规则
export function getValidationRules(field?: string): ValidationRule[] {
  if (!field) return VALIDATION_RULES.filter(rule => rule.enabled);
  return VALIDATION_RULES.filter(rule => rule.enabled && (!rule.field || rule.field === field));
}

// 获取校验规则的错误级别统计
export function getValidationSummary(results: any[]): {
  critical: number;
  errors: number;
  warnings: number;
  info: number;
  total: number;
} {
  const summary = { critical: 0, errors: 0, warnings: 0, info: 0, total: 0 };
  
  results.forEach(result => {
    summary.total++;
    switch (result.severity) {
      case ValidationSeverity.CRITICAL:
        summary.critical++;
        break;
      case ValidationSeverity.ERROR:
        summary.errors++;
        break;
      case ValidationSeverity.WARNING:
        summary.warnings++;
        break;
      case ValidationSeverity.INFO:
        summary.info++;
        break;
    }
  });
  
  return summary;
}

// 计算数据质量分数
export function calculateDataQualityScore(
  totalRecords: number,
  validationResults: any[]
): {
  score: number;
  level: string;
  color: string;
  label: string;
} {
  if (totalRecords === 0) {
    return {
      score: 0,
      level: 'critical',
      color: QUALITY_THRESHOLDS.qualityLevels.critical.color,
      label: QUALITY_THRESHOLDS.qualityLevels.critical.label
    };
  }
  
  const summary = getValidationSummary(validationResults);
  
  // 基础分数100分
  let score = 100;
  
  // 扣分规则
  score -= summary.critical * 10;  // 严重错误扣10分
  score -= summary.errors * 5;     // 错误扣5分
  score -= summary.warnings * 2;   // 警告扣2分
  score -= summary.info * 1;       // 信息扣1分
  
  // 确保分数不低于0
  score = Math.max(0, score);
  
  // 确定质量等级
  for (const [level, config] of Object.entries(QUALITY_THRESHOLDS.qualityLevels)) {
    if (score >= config.min) {
      return {
        score: Math.round(score),
        level,
        color: config.color,
        label: config.label
      };
    }
  }
  
  return {
    score: Math.round(score),
    level: 'critical',
    color: QUALITY_THRESHOLDS.qualityLevels.critical.color,
    label: QUALITY_THRESHOLDS.qualityLevels.critical.label
  };
}