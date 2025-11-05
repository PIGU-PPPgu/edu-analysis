// 统一的成绩数据字段类型定义
// 这个文件是前后端字段统一的基础，所有组件都应该使用这些类型

export interface Student {
  // 学生基本信息 - 数据库标准字段
  student_id: string; // 学号（主键）
  name: string; // 姓名
  class_name: string; // 班级名称
  admission_year?: string; // 入学年份
  gender?: "男" | "女" | "其他"; // 性别
  contact_phone?: string; // 联系电话
  contact_email?: string; // 联系邮箱
  user_id?: string; // 关联用户ID
  created_at?: string; // 创建时间
  updated_at?: string; // 更新时间
}

export interface GradeRecord {
  // 成绩记录 - 数据库标准字段
  id?: string; // 记录ID（UUID）
  student_id: string; // 学号（外键）
  subject: string; // 科目
  score: number; // 分数
  exam_date: string; // 考试日期
  exam_type: string; // 考试类型
  exam_title?: string; // 考试标题
  semester?: string; // 学期
  teacher_id?: string; // 教师ID
  comments?: string; // 备注

  // 扩展字段
  grade?: string; // 等级（A+, A, B+, B, C+, C）
  rank_in_class?: number; // 班级排名
  rank_in_grade?: number; // 年级排名

  // 关联学生信息（用于显示）
  name?: string; // 学生姓名
  class_name?: string; // 班级名称

  created_at?: string; // 创建时间
  updated_at?: string; // 更新时间
}

export interface ClassInfo {
  // 班级信息 - 数据库标准字段
  class_name: string; // 班级名称（主键）
  grade_level: string; // 年级
  academic_year: string; // 学年
  homeroom_teacher?: string; // 班主任
  student_count?: number; // 学生人数
  department?: string; // 所属部门
  created_at?: string; // 创建时间
  updated_at?: string; // 更新时间
}

export interface Subject {
  // 科目信息 - 数据库标准字段
  subject_code: string; // 科目代码（主键）
  subject_name: string; // 科目名称
  credit?: number; // 学分
  category?: string; // 类别
  is_required?: boolean; // 是否必修
  created_at?: string; // 创建时间
  updated_at?: string; // 更新时间
}

export interface ExamInfo {
  // 考试信息
  exam_title: string; // 考试标题
  exam_type: string; // 考试类型
  exam_date: string; // 考试日期
  subject?: string; // 科目（可选，用于单科考试）
}

// CSV导入时的字段映射配置
export interface FieldMapping {
  // 学生信息字段映射
  studentIdFields: string[]; // 学号可能的字段名
  nameFields: string[]; // 姓名可能的字段名
  classFields: string[]; // 班级可能的字段名

  // 成绩字段映射
  subjectMappings: {
    [key: string]: {
      // 科目名称
      scoreFields: string[]; // 分数字段名
      gradeFields: string[]; // 等级字段名
      rankFields: string[]; // 排名字段名
    };
  };
}

// 标准字段映射配置
export const STANDARD_FIELD_MAPPING: FieldMapping = {
  studentIdFields: [
    "student_id",
    "学号",
    "学生学号",
    "学生编号",
    "id",
    "studentId",
    "考生号",
    "准考证号",
    "学籍号",
    "编号",
  ],
  nameFields: [
    "name",
    "姓名",
    "学生姓名",
    "姓名",
    "名称",
    "studentName",
    "考生姓名",
    "学生",
    "真实姓名",
  ],
  classFields: [
    "class_name",
    "班级",
    "行政班级",
    "教学班",
    "现班",
    "所在班级",
    "class",
    "className",
    "classname",
    "班级名称",
    "班次",
    "班别",
    "年级班级",
    "班组",
    "分班",
    "班",
  ],
  subjectMappings: {
    语文: {
      scoreFields: ["语文", "语文分数", "语文成绩", "chinese", "chinese_score"],
      gradeFields: ["语文等级", "语文级别", "chinese_grade"],
      rankFields: ["语文排名", "语文班名", "chinese_rank"],
    },
    数学: {
      scoreFields: ["数学", "数学分数", "数学成绩", "math", "math_score"],
      gradeFields: ["数学等级", "数学级别", "math_grade"],
      rankFields: ["数学排名", "数学班名", "math_rank"],
    },
    英语: {
      scoreFields: ["英语", "英语分数", "英语成绩", "english", "english_score"],
      gradeFields: ["英语等级", "英语级别", "english_grade"],
      rankFields: ["英语排名", "英语班名", "english_rank"],
    },
    物理: {
      scoreFields: ["物理", "物理分数", "物理成绩", "physics", "physics_score"],
      gradeFields: ["物理等级", "物理级别", "physics_grade"],
      rankFields: ["物理排名", "物理班名", "physics_rank"],
    },
    化学: {
      scoreFields: [
        "化学",
        "化学分数",
        "化学成绩",
        "chemistry",
        "chemistry_score",
      ],
      gradeFields: ["化学等级", "化学级别", "chemistry_grade"],
      rankFields: ["化学排名", "化学班名", "chemistry_rank"],
    },
    生物: {
      scoreFields: ["生物", "生物分数", "生物成绩", "biology", "biology_score"],
      gradeFields: ["生物等级", "生物级别", "biology_grade"],
      rankFields: ["生物排名", "生物班名", "biology_rank"],
    },
    政治: {
      scoreFields: [
        "政治",
        "政治分数",
        "政治成绩",
        "道法",
        "道法分数",
        "politics",
        "politics_score",
      ],
      gradeFields: ["政治等级", "政治级别", "道法等级", "politics_grade"],
      rankFields: ["政治排名", "政治班名", "道法排名", "politics_rank"],
    },
    历史: {
      scoreFields: ["历史", "历史分数", "历史成绩", "history", "history_score"],
      gradeFields: ["历史等级", "历史级别", "history_grade"],
      rankFields: ["历史排名", "历史班名", "history_rank"],
    },
    地理: {
      scoreFields: [
        "地理",
        "地理分数",
        "地理成绩",
        "geography",
        "geography_score",
      ],
      gradeFields: ["地理等级", "地理级别", "geography_grade"],
      rankFields: ["地理排名", "地理班名", "geography_rank"],
    },
    总分: {
      scoreFields: [
        "总分",
        "总分分数",
        "总成绩",
        "total",
        "total_score",
        "总计",
      ],
      gradeFields: ["总分等级", "总体等级", "total_grade"],
      rankFields: ["总分排名", "总体排名", "班名", "total_rank", "排名"],
    },
  },
};

// 数据验证函数
export const validateGradeRecord = (record: Partial<GradeRecord>): string[] => {
  const errors: string[] = [];

  if (!record.student_id) {
    errors.push("学号不能为空");
  }

  if (!record.subject) {
    errors.push("科目不能为空");
  }

  if (record.score === undefined || record.score === null) {
    errors.push("分数不能为空");
  } else if (record.score < 0 || record.score > 100) {
    errors.push("分数必须在0-100之间");
  }

  if (!record.exam_date) {
    errors.push("考试日期不能为空");
  }

  if (!record.exam_type) {
    errors.push("考试类型不能为空");
  }

  return errors;
};

// 字段转换工具函数
export const convertToStandardFields = (rawData: any): Partial<GradeRecord> => {
  const result: Partial<GradeRecord> = {};

  // 转换学号字段
  for (const field of STANDARD_FIELD_MAPPING.studentIdFields) {
    if (
      rawData[field] !== undefined &&
      rawData[field] !== null &&
      String(rawData[field]).trim()
    ) {
      result.student_id = String(rawData[field]).trim();
      break;
    }
  }

  // 转换姓名字段
  for (const field of STANDARD_FIELD_MAPPING.nameFields) {
    if (
      rawData[field] !== undefined &&
      rawData[field] !== null &&
      String(rawData[field]).trim()
    ) {
      result.name = String(rawData[field]).trim();
      break;
    }
  }

  // 转换班级字段
  for (const field of STANDARD_FIELD_MAPPING.classFields) {
    if (
      rawData[field] !== undefined &&
      rawData[field] !== null &&
      String(rawData[field]).trim()
    ) {
      result.class_name = String(rawData[field]).trim();
      break;
    }
  }

  return result;
};

// 导出类型，供其他文件使用
export type {
  Student,
  GradeRecord,
  ClassInfo,
  Subject,
  ExamInfo,
  FieldMapping,
};
