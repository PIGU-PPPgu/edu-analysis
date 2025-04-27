// 模拟数据，用于前端开发阶段替代实际的数据库调用

// 知识点数据
export const knowledgePoints = [
  { id: 'kp1', name: '变量与数据类型' },
  { id: 'kp2', name: '条件语句' },
  { id: 'kp3', name: '循环结构' },
  { id: 'kp4', name: '函数' },
  { id: 'kp5', name: '数组操作' },
  { id: 'kp6', name: '对象与类' },
  { id: 'kp7', name: '错误处理' },
  { id: 'kp8', name: '异步编程' },
  { id: 'kp9', name: 'DOM操作' },
  { id: 'kp10', name: 'API调用' },
];

// 班级数据
export const classes = [
  { id: 'class1', name: '初级前端班', subject: 'Web开发', teacher_id: 'teacher1' },
  { id: 'class2', name: '高级前端班', subject: '前端框架', teacher_id: 'teacher1' },
  { id: 'class3', name: '后端开发班', subject: 'Node.js', teacher_id: 'teacher1' },
  { id: 'class4', name: '全栈开发班', subject: '全栈技术', teacher_id: 'teacher1' },
];

// 学生数据
export const students = [
  { id: 'student1', name: '张三', class_id: 'class1' },
  { id: 'student2', name: '李四', class_id: 'class1' },
  { id: 'student3', name: '王五', class_id: 'class1' },
  { id: 'student4', name: '赵六', class_id: 'class2' },
  { id: 'student5', name: '钱七', class_id: 'class2' },
  { id: 'student6', name: '孙八', class_id: 'class3' },
  { id: 'student7', name: '周九', class_id: 'class3' },
  { id: 'student8', name: '吴十', class_id: 'class4' },
];

// 作业数据
export const homeworks = [
  {
    id: '1',
    title: 'JavaScript基础练习',
    description: '完成变量声明、条件语句和循环练习',
    class_id: 'class1',
    teacher_id: 'teacher1',
    due_date: '2023-12-15',
    created_at: '2023-12-01',
    classes: classes[0],
    homework_knowledge_point: [
      { knowledge_point_id: 'kp1', knowledge_points: knowledgePoints[0] },
      { knowledge_point_id: 'kp2', knowledge_points: knowledgePoints[1] },
      { knowledge_point_id: 'kp3', knowledge_points: knowledgePoints[2] },
    ],
    homework_submission: [
      { id: 'sub1', student_id: 'student1', status: 'graded', score: 85 },
      { id: 'sub2', student_id: 'student2', status: 'submitted' },
      { id: 'sub3', student_id: 'student3', status: 'pending' },
    ]
  },
  {
    id: '2',
    title: '函数与数组操作',
    description: '实现5个函数，完成指定的数组操作任务',
    class_id: 'class1',
    teacher_id: 'teacher1',
    due_date: '2023-12-20',
    created_at: '2023-12-05',
    classes: classes[0],
    homework_knowledge_point: [
      { knowledge_point_id: 'kp4', knowledge_points: knowledgePoints[3] },
      { knowledge_point_id: 'kp5', knowledge_points: knowledgePoints[4] },
    ],
    homework_submission: [
      { id: 'sub4', student_id: 'student1', status: 'submitted' },
      { id: 'sub5', student_id: 'student2', status: 'pending' },
      { id: 'sub6', student_id: 'student3', status: 'pending' },
    ]
  },
  {
    id: '3',
    title: 'React组件开发',
    description: '创建3个React组件，并实现指定功能',
    class_id: 'class2',
    teacher_id: 'teacher1',
    due_date: '2023-12-25',
    created_at: '2023-12-10',
    classes: classes[1],
    homework_knowledge_point: [
      { knowledge_point_id: 'kp6', knowledge_points: knowledgePoints[5] },
      { knowledge_point_id: 'kp9', knowledge_points: knowledgePoints[8] },
    ],
    homework_submission: [
      { id: 'sub7', student_id: 'student4', status: 'graded', score: 92 },
      { id: 'sub8', student_id: 'student5', status: 'graded', score: 88 },
    ]
  },
  {
    id: '4',
    title: 'Node.js API开发',
    description: '使用Express创建REST API',
    class_id: 'class3',
    teacher_id: 'teacher1',
    due_date: '2023-12-30',
    created_at: '2023-12-15',
    classes: classes[2],
    homework_knowledge_point: [
      { knowledge_point_id: 'kp8', knowledge_points: knowledgePoints[7] },
      { knowledge_point_id: 'kp10', knowledge_points: knowledgePoints[9] },
    ],
    homework_submission: [
      { id: 'sub9', student_id: 'student6', status: 'submitted' },
      { id: 'sub10', student_id: 'student7', status: 'pending' },
    ]
  },
  {
    id: '5',
    title: '全栈项目开发',
    description: '开发一个包含前后端的完整项目',
    class_id: 'class4',
    teacher_id: 'teacher1',
    due_date: '2024-01-15',
    created_at: '2023-12-20',
    classes: classes[3],
    homework_knowledge_point: [
      { knowledge_point_id: 'kp6', knowledge_points: knowledgePoints[5] },
      { knowledge_point_id: 'kp8', knowledge_points: knowledgePoints[7] },
      { knowledge_point_id: 'kp9', knowledge_points: knowledgePoints[8] },
      { knowledge_point_id: 'kp10', knowledge_points: knowledgePoints[9] },
    ],
    homework_submission: [
      { id: 'sub11', student_id: 'student8', status: 'pending' },
    ]
  },
];

// 按学生ID过滤作业提交
export const getHomeworkSubmissionsByStudentId = (studentId: string) => {
  const result = [];
  for (const homework of homeworks) {
    const submission = homework.homework_submission.find(sub => sub.student_id === studentId);
    if (submission) {
      result.push({
        ...homework,
        homework_submissions: [submission]
      });
    }
  }
  return result;
};

// 按班级ID过滤作业
export const getHomeworksByClassId = (classId: string) => {
  return homeworks.filter(hw => hw.class_id === classId);
};

// 获取当前登录用户ID（模拟函数）
export const getCurrentUserId = () => {
  return 'teacher1'; // 模拟返回教师ID
};

// 获取用户角色（模拟函数）
export const getUserRoles = (): string[] => {
  return ['teacher', 'student']; // 模拟返回角色
};

// 获取学生所在班级（模拟函数）
export const getStudentClassId = (studentId: string) => {
  const student = students.find(s => s.id === studentId);
  return student ? student.class_id : null;
};

// 延迟函数，模拟异步操作 - 减少默认延迟时间
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟API调用
export const mockApi = {
  // 教师相关API
  teacher: {
    // 获取教师所有班级
    getClasses: async () => {
      await delay(300); // 从800减至300
      return classes;
    },
    
    // 获取教师所有作业
    getHomeworks: async () => {
      await delay(300); // 从1000减至300
      return homeworks;
    },
    
    // 创建新作业
    createHomework: async (homeworkData: any) => {
      await delay(300); // 从1200减至300
      const newHomework = {
        id: `hw${homeworks.length + 1}`,
        ...homeworkData,
        created_at: new Date().toISOString().split('T')[0],
        classes: classes.find(c => c.id === homeworkData.class_id),
        homework_knowledge_point: [],
        homework_submission: []
      };
      
      return newHomework;
    },
    
    // 删除作业
    deleteHomework: async (homeworkId: string) => {
      await delay(300); // 从800减至300
      return { success: true };
    },

    getHomeworkById: async (id: string) => {
      const homeworks = [
        {
          id: "1",
          title: "JavaScript基础练习",
          description: "完成课本P23-P25的练习题，要求规范书写和注释。\n\n知识点包括：变量声明、数据类型、条件语句、循环语句以及基本函数定义。\n\n注意代码格式和命名规范。",
          due_date: "2023-12-15",
          created_at: "2023-12-01",
          classes: { id: "1", name: "初级前端班", subject: "Web开发" },
          teachers: { name: "张老师" },
        },
        {
          id: "2",
          title: "函数与数组操作",
          description: "实现数组的排序、过滤和映射函数，并编写测试用例。\n\n要求：\n1. 手写一个排序算法（冒泡、选择或插入排序）\n2. 实现数组filter、map和reduce方法\n3. 使用ES6语法",
          due_date: "2023-12-20",
          created_at: "2023-12-05",
          classes: { id: "1", name: "初级前端班", subject: "Web开发" },
          teachers: { name: "李老师" },
        },
        {
          id: "3",
          title: "React组件开发",
          description: "创建一个计数器组件和一个待办事项列表组件，实现基本功能。\n\n要求：\n1. 使用函数组件和Hooks\n2. 实现状态管理\n3. 添加适当的样式\n4. 提交源代码和截图",
          due_date: "2023-12-25",
          created_at: "2023-12-10",
          classes: { id: "2", name: "高级前端班", subject: "前端框架" },
          teachers: { name: "王老师" },
        },
        {
          id: "4",
          title: "Node.js API开发",
          description: "使用Express框架创建一个简单的REST API，包含GET和POST请求处理。\n\n要求：\n1. 创建至少3个API端点\n2. 实现基本的数据验证\n3. 使用中间件处理错误\n4. 编写API文档",
          due_date: "2023-12-30",
          created_at: "2023-12-15",
          classes: { id: "3", name: "后端开发班", subject: "Node.js" },
          teachers: { name: "赵老师" },
        },
        {
          id: "5",
          title: "全栈项目开发",
          description: "创建一个包含前后端的完整项目，实现用户认证和数据持久化。\n\n要求：\n1. 前端使用React或Vue\n2. 后端使用Node.js\n3. 数据库使用MongoDB或MySQL\n4. 实现用户注册、登录和个人资料功能",
          due_date: "2024-01-15",
          created_at: "2023-12-20",
          classes: { id: "3", name: "全栈开发班", subject: "全栈技术" },
          teachers: { name: "钱老师" },
        },
      ];
      
      // 根据ID返回匹配的作业数据
      const homework = homeworks.find(hw => hw.id === id);
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 200)); // 保持较短的延迟
      
      return homework || null;
    },
    getSubmissions: async (homeworkId: string) => {
      // 模拟不同作业的提交情况
      const submissionsMap: {[key: string]: any[]} = {
        "1": [
          {
            id: "s1",
            status: "graded",
            score: 85,
            submit_date: "2023-12-12",
            students: { id: "student1", name: "张三" },
            teacher_feedback: "基础概念掌握良好，但代码命名不够规范。",
            knowledge_point_evaluation: [
              { id: "ke1", knowledge_point_id: "kp1", mastery_level: 85, knowledge_points: { id: "kp1", name: "变量声明" } },
              { id: "ke2", knowledge_point_id: "kp2", mastery_level: 70, knowledge_points: { id: "kp2", name: "条件语句" } },
              { id: "ke3", knowledge_point_id: "kp3", mastery_level: 90, knowledge_points: { id: "kp3", name: "函数定义" } },
            ]
          },
          {
            id: "s2",
            status: "submitted",
            submit_date: "2023-12-13",
            students: { id: "student2", name: "李四" }
          },
          {
            id: "s3",
            status: "pending",
            students: { id: "student3", name: "王五" }
          }
        ],
        "2": [
          {
            id: "s4",
            status: "graded",
            score: 92,
            submit_date: "2023-12-18",
            students: { id: "student1", name: "张三" },
            teacher_feedback: "数组操作理解深入，代码结构清晰。",
            knowledge_point_evaluation: [
              { id: "ke4", knowledge_point_id: "kp4", mastery_level: 95, knowledge_points: { id: "kp4", name: "数组方法" } },
              { id: "ke5", knowledge_point_id: "kp5", mastery_level: 90, knowledge_points: { id: "kp5", name: "ES6语法" } },
            ]
          },
          {
            id: "s5",
            status: "submitted",
            submit_date: "2023-12-17",
            students: { id: "student2", name: "李四" }
          }
        ],
        "3": [
          {
            id: "s6",
            status: "graded",
            score: 88,
            submit_date: "2023-12-22",
            students: { id: "student4", name: "赵六" },
            teacher_feedback: "组件设计合理，但状态管理可以优化。",
            knowledge_point_evaluation: [
              { id: "ke6", knowledge_point_id: "kp6", mastery_level: 85, knowledge_points: { id: "kp6", name: "React Hooks" } },
              { id: "ke7", knowledge_point_id: "kp7", mastery_level: 75, knowledge_points: { id: "kp7", name: "组件设计" } },
              { id: "ke8", knowledge_point_id: "kp8", mastery_level: 90, knowledge_points: { id: "kp8", name: "JSX语法" } },
            ]
          },
          {
            id: "s7",
            status: "submitted",
            submit_date: "2023-12-23",
            students: { id: "student5", name: "钱七" }
          }
        ],
        "4": [
          {
            id: "s8",
            status: "submitted",
            submit_date: "2023-12-28",
            students: { id: "student6", name: "孙八" }
          }
        ],
        "5": [] // 暂无提交
      };
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 200)); // 保持较短的延迟
      
      return submissionsMap[homeworkId] || [];
    },
    gradeHomework: async (data: {
      submissionId: string;
      score: number;
      feedback: string;
      knowledgePointEvaluations: Array<{
        id: string;
        masteryLevel: number;
      }>;
    }) => {
      console.log("批改作业数据:", data);
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 200)); // 从500减至200
      
      // 模拟成功响应
      return { success: true };
    }
  },
  
  // 学生相关API
  student: {
    // 获取学生作业列表
    getHomeworks: async (studentId: string = 'student1') => {
      await delay(300); // 从1000减至300
      return getHomeworkSubmissionsByStudentId(studentId);
    },
    
    // 提交作业
    submitHomework: async (submissionData: any) => {
      await delay(300); // 从1200减至300
      return { success: true, submissionId: `sub${Date.now()}` };
    }
  },
  
  // 知识点相关API
  knowledgePoints: {
    // 获取所有知识点
    getAll: async () => {
      await delay(200); // 从600减至200
      return knowledgePoints;
    },
    getKnowledgePoints: async (homeworkId: string) => {
      // 不同作业关联的知识点
      const knowledgePointsMap: {[key: string]: any[]} = {
        "1": [
          { id: "kp1", name: "变量声明", description: "学习如何使用var, let, const声明变量" },
          { id: "kp2", name: "条件语句", description: "if-else, switch等条件语句的使用" },
          { id: "kp3", name: "函数定义", description: "函数声明与函数表达式" },
        ],
        "2": [
          { id: "kp4", name: "数组方法", description: "数组的常用方法如filter, map, reduce" },
          { id: "kp5", name: "ES6语法", description: "ES6新增语法特性" },
        ],
        "3": [
          { id: "kp6", name: "React Hooks", description: "React函数组件中的Hooks使用" },
          { id: "kp7", name: "组件设计", description: "React组件的设计原则与实践" },
          { id: "kp8", name: "JSX语法", description: "JSX语法规则与模式" },
        ],
        "4": [
          { id: "kp9", name: "Express框架", description: "Express框架基础与路由" },
          { id: "kp10", name: "REST API", description: "REST API设计规范" },
          { id: "kp11", name: "中间件", description: "Express中间件开发与使用" },
        ],
        "5": [
          { id: "kp12", name: "用户认证", description: "用户登录与认证系统实现" },
          { id: "kp13", name: "数据库操作", description: "MongoDB/MySQL数据库操作" },
          { id: "kp14", name: "前后端交互", description: "前后端数据交互与API对接" },
        ],
      };
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 100)); // 从200减至100
      
      return knowledgePointsMap[homeworkId] || [];
    }
  }
};

// AI知识点分析模拟函数
export async function mockAiAnalysis(content: string, existingKnowledgePoints: any[]) {
  // 模拟网络请求延迟
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 预设的知识点库 - 在实际应用中会从后端获取或通过真实AI服务生成
  const knowledgePointsLibrary = [
    { name: "方程式解法", description: "使用代数方法解一元或多元方程式" },
    { name: "分数运算", description: "进行分数的加减乘除运算" },
    { name: "因式分解", description: "将代数式分解为若干因式的乘积" },
    { name: "函数图像", description: "了解函数图像的绘制和性质分析" },
    { name: "集合论基础", description: "理解集合的概念和基本运算" },
    { name: "数列求和", description: "求解等差、等比或其他类型数列的和" },
    { name: "坐标系应用", description: "利用坐标系解决几何问题" },
    { name: "三角函数", description: "应用三角函数解决问题" },
    { name: "概率计算", description: "计算简单随机事件的概率" },
    { name: "逻辑推理", description: "使用逻辑方法推理解决问题" },
    { name: "数学建模", description: "将实际问题抽象为数学模型" },
    { name: "向量运算", description: "进行向量的加减乘除和叉乘点乘" },
    { name: "数据分析", description: "统计和分析数据，计算平均值、方差等" },
    { name: "参数方程", description: "使用参数方程表示曲线" },
    { name: "极限计算", description: "计算函数或数列的极限" }
  ];
  
  // 分析文本，提取关键词模拟AI处理
  const keywords = content.toLowerCase().split(/\s+|,|\.|\?|!|;|:|-|\(|\)|\[|\]|\{|\}|"|'|`/);
  
  // 根据内容长度确定要返回的知识点数量，但至少返回1个
  const contentLength = content.length;
  const numberOfPointsToReturn = Math.max(1, Math.min(5, Math.floor(contentLength / 100)));
  
  // 准备结果
  let result: { knowledgePoints: any[] } = {
    knowledgePoints: []
  };
  
  // 首先添加已有的知识点（如果在内容中找到相关关键词）
  const existingKnowledgePointsMatched = existingKnowledgePoints
    .filter(kp => {
      const name = kp.name.toLowerCase();
      return keywords.some(keyword => keyword.includes(name) || name.includes(keyword));
    })
    .map(kp => ({
      ...kp,
      confidence: Math.floor(Math.random() * 30) + 70, // 70-99的置信度
      masteryLevel: Math.floor(Math.random() * 60) + 40, // 40-99的掌握度
      isNew: false
    }));
  
  result.knowledgePoints = [...existingKnowledgePointsMatched];
  
  // 如果已匹配的知识点不够，则从知识点库添加更多
  if (result.knowledgePoints.length < numberOfPointsToReturn) {
    // 过滤掉已添加的知识点
    const existingNames = new Set(result.knowledgePoints.map(kp => kp.name));
    const remainingKnowledgePoints = knowledgePointsLibrary.filter(kp => !existingNames.has(kp.name));
    
    // 随机选择剩余所需数量的知识点
    const additionalNeeded = numberOfPointsToReturn - result.knowledgePoints.length;
    const shuffled = remainingKnowledgePoints.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, additionalNeeded).map(kp => ({
      ...kp,
      id: `new-${Math.random().toString(36).substr(2, 9)}`, // 生成临时ID
      confidence: Math.floor(Math.random() * 30) + 60, // 60-89的置信度
      masteryLevel: Math.floor(Math.random() * 60) + 20, // 20-79的掌握度
      isNew: true
    }));
    
    result.knowledgePoints = [...result.knowledgePoints, ...selected];
  }
  
  // 模拟错误场景 (随机概率为5%)
  if (Math.random() < 0.05) {
    throw new Error("模拟的AI服务暂时不可用");
  }
  
  return result;
} 