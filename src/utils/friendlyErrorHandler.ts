// 用户友好的错误处理机制
// 将技术错误转换为用户可理解的信息，并提供解决方案

export interface FriendlyError {
  title: string;
  message: string;
  solutions: string[];
  severity: 'info' | 'warning' | 'error';
  autoFixable?: boolean;
  autoFixAction?: () => Promise<void>;
}

export interface ErrorContext {
  operation: 'file_upload' | 'file_parse' | 'field_mapping' | 'data_validation' | 'data_import';
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  rowCount?: number;
  columnCount?: number;
}

// 常见错误模式和用户友好的解决方案
const ERROR_PATTERNS = {
  // 文件上传错误
  file_too_large: {
    pattern: /(file.*too.*large|exceeded.*size.*limit|file.*size.*maximum)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '文件太大了',
      message: `文件 "${context.fileName}" 超过了 10MB 的大小限制`,
      solutions: [
        '删除不必要的工作表或数据行',
        '将大文件分割成多个小文件分别导入',
        '压缩文件或优化文件格式',
        '联系管理员提高文件大小限制'
      ],
      severity: 'error'
    })
  },

  file_format_unsupported: {
    pattern: /(unsupported.*format|invalid.*file.*type|format.*not.*supported)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '文件格式不支持',
      message: `文件格式 "${context.fileType}" 暂不支持`,
      solutions: [
        '将文件另存为 Excel (.xlsx) 格式',
        '将文件另存为 CSV (.csv) 格式',
        '确保文件没有密码保护',
        '检查文件是否损坏'
      ],
      severity: 'error'
    })
  },

  file_corrupted: {
    pattern: /(corrupted|damaged|cannot.*read|parse.*error|invalid.*structure)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '文件可能已损坏',
      message: '无法正确读取文件内容',
      solutions: [
        '重新下载或获取原始文件',
        '用Excel重新打开并另存一份',
        '检查文件是否完整',
        '尝试用其他软件打开文件确认完整性'
      ],
      severity: 'error'
    })
  },

  // 解析错误
  empty_file: {
    pattern: /(empty.*file|no.*data|file.*contains.*no.*content)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '文件内容为空',
      message: '文件中没有找到可导入的数据',
      solutions: [
        '确认选择了正确的工作表',
        '检查数据是否在第一行开始',
        '确认文件中包含学生成绩数据',
        '检查是否有隐藏的数据行'
      ],
      severity: 'warning'
    })
  },

  missing_headers: {
    pattern: /(missing.*header|no.*column.*names|headers.*not.*found)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '缺少表头信息',
      message: '文件第一行应该包含列名（如：姓名、学号、数学等）',
      solutions: [
        '在文件第一行添加列名',
        '确保表头行没有被删除',
        '检查数据是否从第二行开始',
        '参考示例文件格式'
      ],
      severity: 'error',
      autoFixable: true
    })
  },

  encoding_issue: {
    pattern: /(encoding.*error|character.*encoding|乱码|invalid.*character)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '文件编码问题',
      message: '文件中的中文字符无法正确显示',
      solutions: [
        '将CSV文件用UTF-8编码重新保存',
        '使用Excel打开CSV后另存为Excel格式',
        '检查文件中是否有特殊字符',
        '使用记事本打开并选择UTF-8编码保存'
      ],
      severity: 'warning',
      autoFixable: true
    })
  },

  // 字段映射错误
  required_field_missing: {
    pattern: /(required.*field.*missing|姓名.*not.*found|name.*field.*required)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '缺少必需的字段',
      message: '没有找到学生姓名列，这是导入成绩的必需信息',
      solutions: [
        '确保文件中有"姓名"列',
        '检查列名是否正确（支持：姓名、学生姓名、name）',
        '确认数据格式与示例文件一致',
        '手动指定姓名列的位置'
      ],
      severity: 'error'
    })
  },

  field_mapping_conflict: {
    pattern: /(duplicate.*mapping|field.*mapped.*multiple|mapping.*conflict)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '字段映射冲突',
      message: '同一个系统字段被映射到了多个文件列',
      solutions: [
        '检查是否有重复的列名',
        '确保每个系统字段只映射一个文件列',
        '删除重复或不需要的列',
        '重新配置字段映射关系'
      ],
      severity: 'error',
      autoFixable: true
    })
  },

  subject_detection_failed: {
    pattern: /(subject.*not.*detected|科目.*识别.*失败|no.*subjects.*found)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '未能识别科目列',
      message: '系统无法自动识别哪些列是科目成绩',
      solutions: [
        '确保科目列名清晰（如：数学、语文、英语）',
        '检查列名中是否有多余的空格或特殊字符',
        '手动选择科目列',
        '参考标准的科目命名规范'
      ],
      severity: 'warning',
      autoFixable: true
    })
  },

  // 数据验证错误
  invalid_score_format: {
    pattern: /(invalid.*score|score.*format|分数.*格式.*错误)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '分数格式错误',
      message: '发现一些分数不是有效的数字格式',
      solutions: [
        '确保分数列只包含数字（如：85、90.5）',
        '删除分数中的文字（如"分"、"优秀"等）',
        '空白分数请用空格或0表示',
        '检查是否有全角数字，改为半角数字'
      ],
      severity: 'warning',
      autoFixable: true
    })
  },

  score_out_of_range: {
    pattern: /(score.*out.*of.*range|分数.*超出.*范围|invalid.*score.*range)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '分数超出合理范围',
      message: '发现一些分数超出了0-150的合理范围',
      solutions: [
        '检查分数是否输入错误（如：985应该是98.5）',
        '确认分数制（百分制、150分制等）',
        '修正明显错误的分数',
        '如使用特殊分数制，请在备注中说明'
      ],
      severity: 'warning',
      autoFixable: true
    })
  },

  duplicate_students: {
    pattern: /(duplicate.*student|学生.*重复|student.*already.*exists)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '发现重复的学生',
      message: '同一个学生出现了多次记录',
      solutions: [
        '删除重复的学生记录',
        '确认学号或姓名是否输入错误',
        '如果是不同考试，请分别导入',
        '使用合并重复记录功能'
      ],
      severity: 'warning',
      autoFixable: true
    })
  },

  missing_student_info: {
    pattern: /(missing.*student.*info|学生.*信息.*不完整|incomplete.*student.*data)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '学生信息不完整',
      message: '部分学生缺少姓名或关键信息',
      solutions: [
        '补充缺失的学生姓名',
        '检查是否有空行或格式错误',
        '确保每行都有完整的学生信息',
        '删除无效的数据行'
      ],
      severity: 'error'
    })
  },

  // AI解析错误
  ai_service_unavailable: {
    pattern: /(ai.*service.*unavailable|ai.*error|智能解析.*失败)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: 'AI智能解析暂时不可用',
      message: '系统将使用基础解析功能，可能需要手动调整',
      solutions: [
        '继续使用基础解析功能',
        '稍后重试AI智能解析',
        '手动配置字段映射',
        '联系技术支持检查AI服务状态'
      ],
      severity: 'info'
    })
  },

  confidence_too_low: {
    pattern: /(low.*confidence|置信度.*过低|parsing.*uncertain)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '自动识别置信度较低',
      message: 'AI对文件结构的识别不够确定，建议人工确认',
      solutions: [
        '仔细检查字段映射是否正确',
        '使用标准的文件格式和列名',
        '手动调整映射关系',
        '参考示例文件重新整理数据'
      ],
      severity: 'warning'
    })
  },

  // 导入错误
  database_connection_failed: {
    pattern: /(database.*connection|connection.*failed|数据库.*连接.*失败)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '数据库连接失败',
      message: '无法连接到数据库，请稍后重试',
      solutions: [
        '检查网络连接是否正常',
        '稍后重新尝试导入',
        '联系技术支持检查系统状态',
        '确认是否有系统维护通知'
      ],
      severity: 'error'
    })
  },

  import_timeout: {
    pattern: /(timeout|import.*failed|导入.*超时|processing.*timeout)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '导入超时',
      message: '文件较大，导入时间超过了系统限制',
      solutions: [
        '将大文件分割成较小的文件',
        '减少数据量（如按班级分批导入）',
        '在网络良好时重新尝试',
        '联系管理员调整系统超时设置'
      ],
      severity: 'error'
    })
  },

  permission_denied: {
    pattern: /(permission.*denied|access.*denied|权限.*不足|unauthorized)/i,
    getFriendlyError: (context: ErrorContext): FriendlyError => ({
      title: '权限不足',
      message: '您没有权限执行此导入操作',
      solutions: [
        '联系系统管理员开通导入权限',
        '确认您的账户角色是否正确',
        '检查是否登录了正确的账户',
        '联系技术支持获取帮助'
      ],
      severity: 'error'
    })
  }
};

/**
 * 将技术错误转换为用户友好的错误信息
 */
export function convertToFriendlyError(
  error: Error | string,
  context: ErrorContext
): FriendlyError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? '' : error.stack || '';
  const fullErrorText = `${errorMessage} ${errorStack}`.toLowerCase();

  // 遍历错误模式，找到匹配的处理方案
  for (const [patternName, patternConfig] of Object.entries(ERROR_PATTERNS)) {
    if (patternConfig.pattern.test(fullErrorText)) {
      return patternConfig.getFriendlyError(context);
    }
  }

  // 如果没有匹配的模式，返回通用错误信息
  return getGenericFriendlyError(errorMessage, context);
}

/**
 * 生成通用的用户友好错误信息
 */
function getGenericFriendlyError(errorMessage: string, context: ErrorContext): FriendlyError {
  const operationNames = {
    file_upload: '文件上传',
    file_parse: '文件解析',
    field_mapping: '字段映射',
    data_validation: '数据验证',
    data_import: '数据导入'
  };

  return {
    title: `${operationNames[context.operation]}遇到问题`,
    message: '系统处理时遇到了意外情况',
    solutions: [
      '请检查文件格式是否正确',
      '确认数据内容符合要求',
      '尝试重新操作',
      '如问题持续，请联系技术支持',
      `错误详情: ${errorMessage.substring(0, 100)}...`
    ],
    severity: 'error'
  };
}

/**
 * 错误恢复建议生成器
 */
export class ErrorRecoveryGuide {
  static getRecoverySteps(error: FriendlyError, context: ErrorContext): string[] {
    const baseSteps = [
      '1. 保存当前工作进度',
      '2. 查看错误详情和解决方案',
      '3. 按照建议修改文件或配置'
    ];

    if (error.autoFixable) {
      baseSteps.push('4. 尝试自动修复功能');
      baseSteps.push('5. 重新执行操作');
    } else {
      baseSteps.push('4. 手动修正问题');
      baseSteps.push('5. 重新上传或重新配置');
    }

    baseSteps.push('6. 如问题依然存在，联系技术支持');

    return baseSteps;
  }

  static getPrevention Tips(context: ErrorContext): string[] {
    const tips = [
      '使用标准的Excel模板',
      '确保文件格式正确（.xlsx, .csv）',
      '第一行包含清晰的列名',
      '数据从第二行开始'
    ];

    if (context.operation === 'data_validation') {
      tips.push(
        '分数使用数字格式',
        '学生姓名完整且无重复',
        '科目列名规范统一'
      );
    }

    if (context.fileSize && context.fileSize > 5 * 1024 * 1024) { // > 5MB
      tips.push(
        '大文件建议分批导入',
        '删除不必要的工作表',
        '优化文件大小'
      );
    }

    return tips;
  }
}

/**
 * 自动修复功能
 */
export class AutoErrorFixer {
  static async fixMissingHeaders(data: any[][]): Promise<any[][]> {
    if (!data || data.length === 0) return data;

    // 如果第一行看起来像数据而不是表头，自动添加表头
    const firstRow = data[0];
    const looksLikeData = firstRow.some(cell => 
      typeof cell === 'number' || 
      (typeof cell === 'string' && /^\d+\.?\d*$/.test(cell))
    );

    if (looksLikeData) {
      const headers = firstRow.map((_, index) => `列${index + 1}`);
      return [headers, ...data];
    }

    return data;
  }

  static async fixScoreFormat(scores: any[]): Promise<number[]> {
    return scores.map(score => {
      if (typeof score === 'number') return score;
      if (typeof score !== 'string') return NaN;

      // 移除常见的非数字字符
      let cleaned = score
        .replace(/[分点]/g, '') // 移除"分"、"点"
        .replace(/[优秀良好中等及格不及格]/g, '') // 移除等级文字
        .replace(/\s+/g, '') // 移除空格
        .replace(/[，,]/g, '.'); // 统一小数点

      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    });
  }

  static async fixDuplicateStudents(students: any[]): Promise<any[]> {
    const seen = new Set();
    return students.filter(student => {
      const key = `${student.name}_${student.class || ''}`;
      if (seen.has(key)) {
        return false; // 跳过重复的学生
      }
      seen.add(key);
      return true;
    });
  }

  static async fixEncodingIssues(text: string): Promise<string> {
    // 尝试修复常见的编码问题
    return text
      .replace(/锟斤拷/g, '') // 移除乱码
      .replace(/\uFFFD/g, '') // 移除替换字符
      .replace(/[Ã¢â‚¬Å¡]/g, '') // 修复UTF-8编码问题
      .trim();
  }
}

/**
 * 错误统计和报告
 */
export class ErrorAnalytics {
  private static errorLog: Array<{
    timestamp: Date;
    error: FriendlyError;
    context: ErrorContext;
    resolved: boolean;
  }> = [];

  static logError(error: FriendlyError, context: ErrorContext): void {
    this.errorLog.push({
      timestamp: new Date(),
      error,
      context,
      resolved: false
    });
  }

  static markResolved(errorIndex: number): void {
    if (this.errorLog[errorIndex]) {
      this.errorLog[errorIndex].resolved = true;
    }
  }

  static getErrorSummary(): {
    total: number;
    resolved: number;
    pending: number;
    byOperation: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const total = this.errorLog.length;
    const resolved = this.errorLog.filter(log => log.resolved).length;
    const pending = total - resolved;

    const byOperation: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errorLog.forEach(log => {
      byOperation[log.context.operation] = (byOperation[log.context.operation] || 0) + 1;
      bySeverity[log.error.severity] = (bySeverity[log.error.severity] || 0) + 1;
    });

    return { total, resolved, pending, byOperation, bySeverity };
  }
}