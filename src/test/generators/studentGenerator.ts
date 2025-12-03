/**
 * 🎓 学生数据生成器
 * 生成符合真实场景的测试学生数据
 */

export interface GeneratedStudent {
  student_id: string;
  name: string;
  class_name: string;
  class_id?: string;
  user_id?: string;
  admission_year?: string;
  gender?: "男" | "女";
  contact_phone?: string;
  contact_email?: string;
}

// 中文姓氏库
const SURNAMES = [
  "王",
  "李",
  "张",
  "刘",
  "陈",
  "杨",
  "黄",
  "赵",
  "周",
  "吴",
  "徐",
  "孙",
  "马",
  "朱",
  "胡",
  "郭",
  "何",
  "林",
  "罗",
  "高",
  "梁",
  "郑",
  "谢",
  "宋",
  "唐",
  "许",
  "韩",
  "冯",
  "邓",
  "曹",
];

// 常见名字
const GIVEN_NAMES = [
  "伟",
  "芳",
  "娜",
  "敏",
  "静",
  "丽",
  "强",
  "磊",
  "军",
  "洋",
  "勇",
  "艳",
  "杰",
  "涛",
  "明",
  "超",
  "秀英",
  "华",
  "玲",
  "桂英",
  "雪",
  "慧",
  "晶",
  "婷",
  "欣",
  "宇",
  "浩",
  "博",
  "文",
  "雨",
];

// 双字名
const DOUBLE_NAMES = [
  "建国",
  "建军",
  "秀兰",
  "桂花",
  "淑珍",
  "翠花",
  "志强",
  "志明",
  "晓明",
  "小红",
  "小芳",
  "小丽",
  "雨晴",
  "梓涵",
  "雨萱",
  "诗涵",
  "欣怡",
  "思琪",
  "浩然",
  "子轩",
  "宇轩",
  "梓豪",
  "俊熙",
  "皓轩",
];

/**
 * 生成随机中文姓名
 */
export const generateChineseName = (): string => {
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];

  // 60% 双字名，40% 单字名
  if (Math.random() < 0.6) {
    return (
      surname + DOUBLE_NAMES[Math.floor(Math.random() * DOUBLE_NAMES.length)]
    );
  } else {
    return (
      surname + GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)]
    );
  }
};

/**
 * 生成学号
 */
export const generateStudentId = (
  prefix: string = "TEST",
  year?: number
): string => {
  const studentYear = year || new Date().getFullYear();
  const sequence = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  return `${prefix}_${studentYear}${sequence}`;
};

/**
 * 生成班级名称
 */
export const generateClassName = (gradeLevel?: string): string => {
  const grade =
    gradeLevel || ["高一", "高二", "高三"][Math.floor(Math.random() * 3)];
  const classNum = Math.floor(Math.random() * 20) + 1; // 1-20班
  return `${grade}(${classNum})班`;
};

/**
 * 生成手机号
 */
export const generatePhoneNumber = (): string => {
  const prefixes = [
    "130",
    "131",
    "132",
    "133",
    "135",
    "136",
    "137",
    "138",
    "139",
    "150",
    "151",
    "152",
    "153",
    "155",
    "156",
    "157",
    "158",
    "159",
    "186",
    "187",
    "188",
    "189",
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, "0");
  return prefix + suffix;
};

/**
 * 生成邮箱
 */
export const generateEmail = (name: string): string => {
  const domains = ["163.com", "126.com", "qq.com", "gmail.com", "outlook.com"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const username =
    name.toLowerCase().replace(/\s+/g, "") + Math.floor(Math.random() * 1000);
  return `${username}@${domain}`;
};

/**
 * 生成单个学生数据
 */
export const generateStudent = (options?: {
  studentId?: string;
  className?: string;
  gradeLevel?: string;
  admissionYear?: number;
  includeContact?: boolean;
}): GeneratedStudent => {
  const name = generateChineseName();
  const year =
    options?.admissionYear ||
    new Date().getFullYear() - Math.floor(Math.random() * 3);

  const student: GeneratedStudent = {
    student_id: options?.studentId || generateStudentId("TEST", year),
    name,
    class_name: options?.className || generateClassName(options?.gradeLevel),
    admission_year: year.toString(),
    gender: Math.random() < 0.5 ? "男" : "女",
  };

  if (options?.includeContact) {
    student.contact_phone = generatePhoneNumber();
    student.contact_email = generateEmail(name);
  }

  return student;
};

/**
 * 批量生成学生数据
 */
export const generateStudents = (
  count: number,
  options?: {
    className?: string;
    gradeLevel?: string;
    admissionYear?: number;
    includeContact?: boolean;
    allowDuplicateNames?: boolean;
  }
): GeneratedStudent[] => {
  const students: GeneratedStudent[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let student = generateStudent(options);

    // 如果不允许重复姓名，确保唯一
    if (!options?.allowDuplicateNames) {
      while (usedNames.has(student.name)) {
        student = generateStudent(options);
      }
      usedNames.add(student.name);
    }

    students.push(student);
  }

  return students;
};

/**
 * 生成完整班级的学生数据
 */
export const generateClassStudents = (options: {
  className: string;
  studentCount: number;
  startingNumber?: number;
  admissionYear?: number;
}): GeneratedStudent[] => {
  const {
    className,
    studentCount,
    startingNumber = 1,
    admissionYear,
  } = options;
  const students: GeneratedStudent[] = [];

  for (let i = 0; i < studentCount; i++) {
    const seqNum = (startingNumber + i).toString().padStart(2, "0");
    const year = admissionYear || new Date().getFullYear();

    students.push({
      student_id: `TEST_${year}${seqNum}`,
      name: generateChineseName(),
      class_name: className,
      admission_year: year.toString(),
      gender: Math.random() < 0.5 ? "男" : "女",
    });
  }

  return students;
};

/**
 * 生成多个班级的学生数据
 */
export const generateMultipleClasses = (options: {
  gradeLevel: string;
  classCount: number;
  studentsPerClass: number;
  admissionYear?: number;
}): GeneratedStudent[] => {
  const { gradeLevel, classCount, studentsPerClass, admissionYear } = options;
  const allStudents: GeneratedStudent[] = [];

  for (let classNum = 1; classNum <= classCount; classNum++) {
    const className = `${gradeLevel}(${classNum})班`;
    const students = generateClassStudents({
      className,
      studentCount: studentsPerClass,
      startingNumber: (classNum - 1) * studentsPerClass + 1,
      admissionYear,
    });
    allStudents.push(...students);
  }

  return allStudents;
};

/**
 * 批量生成多个班级的学生数据（兼容旧测试API）
 * @deprecated 推荐使用 generateMultipleClasses
 */
export const generateStudentsByClassNames = (
  count: number,
  options?: {
    classNames?: string[]; // 支持多个班级
    className?: string; // 支持单个班级
    gradeLevel?: string;
    admissionYear?: number;
    includeContact?: boolean;
    allowDuplicateNames?: boolean;
  }
): GeneratedStudent[] => {
  // 如果提供了 classNames（复数），平均分配学生到各班级
  if (options?.classNames && options.classNames.length > 0) {
    const allStudents: GeneratedStudent[] = [];
    const studentsPerClass = Math.floor(count / options.classNames.length);
    const remainder = count % options.classNames.length;

    options.classNames.forEach((className, index) => {
      const classCount = studentsPerClass + (index < remainder ? 1 : 0);
      const students = generateStudents(classCount, {
        ...options,
        className, // 使用单个 className
        classNames: undefined, // 移除 classNames
      });
      allStudents.push(...students);
    });

    return allStudents;
  }

  // 回退到标准单班级生成
  return generateStudents(count, options);
};

/**
 * 生成带有特殊情况的学生数据（用于边界测试）
 */
export const generateEdgeCaseStudents = (): GeneratedStudent[] => {
  return [
    // 同名学生（不同班级）
    {
      student_id: "TEST_2024001",
      name: "张三",
      class_name: "高一(1)班",
      gender: "男",
    },
    {
      student_id: "TEST_2024002",
      name: "张三",
      class_name: "高一(2)班",
      gender: "男",
    },
    // 同名同姓（同班级）
    {
      student_id: "TEST_2024003",
      name: "李四",
      class_name: "高一(1)班",
      gender: "女",
    },
    {
      student_id: "TEST_2024004",
      name: "李四",
      class_name: "高一(1)班",
      gender: "男",
    },
    // 生僻字姓名
    {
      student_id: "TEST_2024005",
      name: "龘靐齉爩",
      class_name: "高一(3)班",
      gender: "女",
    },
    // 超长姓名
    {
      student_id: "TEST_2024006",
      name: "爱新觉罗·玄烨康熙帝",
      class_name: "高一(3)班",
      gender: "男",
    },
    // 单字姓名
    {
      student_id: "TEST_2024007",
      name: "王",
      class_name: "高一(4)班",
      gender: "女",
    },
  ];
};
