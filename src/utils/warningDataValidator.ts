/**
 * 预警数据校验工具
 */

export interface ValidationError {
  field: string;
  message: string;
  severity: "warning" | "error";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * 校验预警统计数据
 */
export const validateWarningStatistics = (data: any): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 检查必要字段
  if (!data) {
    errors.push({
      field: "root",
      message: "预警统计数据为空",
      severity: "error",
    });
    return { isValid: false, errors, warnings };
  }

  // 学生数据校验
  if (!data.students) {
    errors.push({
      field: "students",
      message: "缺少学生统计数据",
      severity: "error",
    });
  } else {
    if (typeof data.students.total !== "number" || data.students.total < 0) {
      errors.push({
        field: "students.total",
        message: "学生总数必须为非负数",
        severity: "error",
      });
    }

    if (
      typeof data.students.at_risk !== "number" ||
      data.students.at_risk < 0
    ) {
      errors.push({
        field: "students.at_risk",
        message: "风险学生数必须为非负数",
        severity: "error",
      });
    }

    // 逻辑校验
    if (data.students.at_risk > data.students.total) {
      warnings.push({
        field: "students",
        message: "风险学生数不应超过总学生数",
        severity: "warning",
      });
    }
  }

  // 预警数据校验
  if (!data.warnings) {
    errors.push({
      field: "warnings",
      message: "缺少预警统计数据",
      severity: "error",
    });
  } else {
    if (typeof data.warnings.total !== "number" || data.warnings.total < 0) {
      errors.push({
        field: "warnings.total",
        message: "预警总数必须为非负数",
        severity: "error",
      });
    }

    // 按严重程度校验
    if (!Array.isArray(data.warnings.by_severity)) {
      errors.push({
        field: "warnings.by_severity",
        message: "预警严重程度数据必须为数组",
        severity: "error",
      });
    } else {
      const requiredSeverities = ["high", "medium", "low"];
      const foundSeverities = data.warnings.by_severity.map(
        (s: any) => s.severity
      );

      requiredSeverities.forEach((severity) => {
        if (!foundSeverities.includes(severity)) {
          warnings.push({
            field: "warnings.by_severity",
            message: `缺少${severity}级别的预警数据`,
            severity: "warning",
          });
        }
      });

      // 计数校验
      const totalBySeverity = data.warnings.by_severity.reduce(
        (sum: number, item: any) => sum + (item.count || 0),
        0
      );

      if (Math.abs(totalBySeverity - data.warnings.total) > 0.01) {
        warnings.push({
          field: "warnings",
          message: "按严重程度统计的总数与总预警数不匹配",
          severity: "warning",
        });
      }
    }
  }

  // 风险因素校验
  if (!Array.isArray(data.risk_factors)) {
    warnings.push({
      field: "risk_factors",
      message: "风险因素数据应为数组格式",
      severity: "warning",
    });
  } else {
    data.risk_factors.forEach((factor: any, index: number) => {
      if (!factor.factor) {
        warnings.push({
          field: `risk_factors[${index}].factor`,
          message: "风险因素名称不能为空",
          severity: "warning",
        });
      }

      if (typeof factor.count !== "number" || factor.count < 0) {
        warnings.push({
          field: `risk_factors[${index}].count`,
          message: "风险因素计数必须为非负数",
          severity: "warning",
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * 校验预警记录数据
 */
export const validateWarningRecord = (record: any): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!record) {
    errors.push({
      field: "root",
      message: "预警记录数据为空",
      severity: "error",
    });
    return { isValid: false, errors, warnings };
  }

  // 必要字段校验
  const requiredFields = ["id", "student_id", "rule_id", "status"];
  requiredFields.forEach((field) => {
    if (!record[field]) {
      errors.push({
        field,
        message: `缺少必要字段: ${field}`,
        severity: "error",
      });
    }
  });

  // 状态校验
  const validStatuses = ["active", "resolved", "dismissed"];
  if (record.status && !validStatuses.includes(record.status)) {
    errors.push({
      field: "status",
      message: "预警记录状态无效",
      severity: "error",
    });
  }

  // 日期校验
  if (record.created_at) {
    const createdDate = new Date(record.created_at);
    if (isNaN(createdDate.getTime())) {
      warnings.push({
        field: "created_at",
        message: "创建时间格式无效",
        severity: "warning",
      });
    } else if (createdDate > new Date()) {
      warnings.push({
        field: "created_at",
        message: "创建时间不应晚于当前时间",
        severity: "warning",
      });
    }
  }

  // 解决时间逻辑校验
  if (record.status === "resolved" && !record.resolved_at) {
    warnings.push({
      field: "resolved_at",
      message: "已解决的预警记录应有解决时间",
      severity: "warning",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * 校验预警规则数据
 */
export const validateWarningRule = (rule: any): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!rule) {
    errors.push({
      field: "root",
      message: "预警规则数据为空",
      severity: "error",
    });
    return { isValid: false, errors, warnings };
  }

  // 必要字段校验
  if (!rule.name || rule.name.trim() === "") {
    errors.push({
      field: "name",
      message: "规则名称不能为空",
      severity: "error",
    });
  }

  if (!rule.conditions) {
    errors.push({
      field: "conditions",
      message: "规则条件不能为空",
      severity: "error",
    });
  }

  // 严重程度校验
  const validSeverities = ["low", "medium", "high"];
  if (!rule.severity || !validSeverities.includes(rule.severity)) {
    errors.push({
      field: "severity",
      message: "规则严重程度必须为 low、medium 或 high",
      severity: "error",
    });
  }

  // 范围校验
  const validScopes = ["global", "exam", "class", "student"];
  if (!rule.scope || !validScopes.includes(rule.scope)) {
    errors.push({
      field: "scope",
      message: "规则范围必须为 global、exam、class 或 student",
      severity: "error",
    });
  }

  // 类别校验
  const validCategories = [
    "grade",
    "attendance",
    "behavior",
    "progress",
    "homework",
    "composite",
  ];
  if (!rule.category || !validCategories.includes(rule.category)) {
    errors.push({
      field: "category",
      message: "规则类别无效",
      severity: "error",
    });
  }

  // 优先级校验
  if (
    typeof rule.priority !== "number" ||
    rule.priority < 1 ||
    rule.priority > 10
  ) {
    warnings.push({
      field: "priority",
      message: "规则优先级应为1-10的数字",
      severity: "warning",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * 批量校验数据
 */
export const batchValidate = (
  data: any[],
  validator: (item: any) => ValidationResult
): ValidationResult => {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  data.forEach((item, index) => {
    const result = validator(item);

    // 为每个错误添加索引信息
    result.errors.forEach((error) => {
      allErrors.push({
        ...error,
        field: `[${index}].${error.field}`,
      });
    });

    result.warnings.forEach((warning) => {
      allWarnings.push({
        ...warning,
        field: `[${index}].${warning.field}`,
      });
    });
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};
