// n8n Information Extractor 节点配置
// 用于CSV成绩数据的AI智能提取和格式转换

const informationExtractorConfig = {
  // 1. 节点基础配置
  nodeConfig: {
    name: "AI成绩数据提取器",
    type: "@n8n/n8n-nodes-langchain.informationExtractor",
    position: [640, 300],
    parameters: {
      // AI模型配置
      model: {
        apiKey: "{{ $vars.DEEPSEEK_API_KEY }}", // 从环境变量获取
        baseURL: "https://api.deepseek.com/v1",
        modelName: "deepseek-chat",
        temperature: 0.1, // 降低随机性，提高准确性
        maxTokens: 4000
      },
      
      // JSON Schema定义 - 与grade_data表结构对应
      schema: {
        type: "object",
        properties: {
          exam_info: {
            type: "object",
            description: "考试基本信息",
            properties: {
              title: {
                type: "string", 
                description: "考试标题，如'907九下月考成绩'"
              },
              type: {
                type: "string", 
                description: "考试类型：月考、期中考试、期末考试、模拟考试等"
              },
              date: {
                type: "string", 
                description: "考试日期，格式：YYYY-MM-DD"
              },
              scope: {
                type: "string",
                description: "考试范围：class(班级)或grade(年级)",
                default: "class"
              }
            },
            required: ["title", "type"]
          },
          students: {
            type: "array",
            description: "学生成绩数据数组",
            items: {
              type: "object",
              properties: {
                // 学生基本信息
                student_id: {
                  type: "string", 
                  description: "学号，必须唯一"
                },
                name: {
                  type: "string", 
                  description: "学生姓名"
                },
                class_name: {
                  type: "string", 
                  description: "班级名称，如'初三7班'"
                },
                
                // 各科目成绩 - 对应grade_data表字段
                total_score: {
                  type: ["number", "null"], 
                  description: "总分"
                },
                chinese_score: {
                  type: ["number", "null"], 
                  description: "语文成绩"
                },
                math_score: {
                  type: ["number", "null"], 
                  description: "数学成绩"
                },
                english_score: {
                  type: ["number", "null"], 
                  description: "英语成绩"
                },
                physics_score: {
                  type: ["number", "null"], 
                  description: "物理成绩"
                },
                chemistry_score: {
                  type: ["number", "null"], 
                  description: "化学成绩"
                },
                politics_score: {
                  type: ["number", "null"], 
                  description: "政治成绩"
                },
                history_score: {
                  type: ["number", "null"], 
                  description: "历史成绩"
                },
                biology_score: {
                  type: ["number", "null"], 
                  description: "生物成绩"
                },
                geography_score: {
                  type: ["number", "null"], 
                  description: "地理成绩"
                },
                
                // 排名信息
                rank_in_class: {
                  type: ["integer", "null"], 
                  description: "班级排名"
                },
                rank_in_grade: {
                  type: ["integer", "null"], 
                  description: "年级排名"
                },
                rank_in_school: {
                  type: ["integer", "null"], 
                  description: "学校排名"
                }
              },
              required: ["student_id", "name"]
            }
          }
        },
        required: ["exam_info", "students"]
      },
      
      // AI提示词
      prompt: `你是一个专业的教育数据分析师，需要从CSV格式的学生成绩数据中提取结构化信息。

## 数据提取任务：

### 1. 考试信息识别
- 从文件名、表头或数据中识别考试标题
- 判断考试类型：月考、期中考试、期末考试、模拟考试等
- 提取考试日期（如果存在）
- 判断考试范围：班级级别还是年级级别

### 2. 字段映射规则
请按照以下映射规则识别CSV列：

**学生信息字段：**
- 学号 → student_id：学号、student_id、考生号、编号、学生编号
- 姓名 → name：姓名、name、学生姓名、考生姓名
- 班级 → class_name：班级、class_name、现班、所在班级、行政班级

**成绩字段：**
- 语文 → chinese_score：语文、语文成绩、语文分数
- 数学 → math_score：数学、数学成绩、数学分数
- 英语 → english_score：英语、英语成绩、英语分数
- 物理 → physics_score：物理、物理成绩、物理分数
- 化学 → chemistry_score：化学、化学成绩、化学分数
- 政治 → politics_score：政治、政治成绩、道法、道法成绩
- 历史 → history_score：历史、历史成绩、历史分数
- 生物 → biology_score：生物、生物成绩、生物分数
- 地理 → geography_score：地理、地理成绩、地理分数
- 总分 → total_score：总分、总成绩、合计、总计

**排名字段：**
- 班级排名 → rank_in_class：班级排名、班排名、班内排名
- 年级排名 → rank_in_grade：年级排名、级排名、年级内排名
- 学校排名 → rank_in_school：学校排名、校排名、全校排名

### 3. 数据清洗规则
1. **数值转换**：将成绩和排名转换为数字，无效数据设为null
2. **学号处理**：保持字符串格式，去除前后空格
3. **班级标准化**：统一格式如"初三7班"、"高二3班"
4. **缺失值处理**：空值、"-"、"缺考"等设为null

### 4. 数据验证
- 学号必须唯一且非空
- 姓名必须非空
- 成绩范围：0-150（语数英），0-100（其他科目）
- 排名必须为正整数

请严格按照JSON Schema格式输出，确保数据类型和结构正确。

现在请分析以下CSV数据：`
    }
  },

  // 2. 数据处理Code节点配置
  dataProcessorCode: `
// 数据处理和格式转换
const processExtractedData = () => {
  try {
    // 获取AI提取的数据
    const extractedData = $input.first().json;
    
    if (!extractedData || !extractedData.exam_info || !extractedData.students) {
      throw new Error('AI提取的数据格式不正确');
    }

    const { exam_info, students } = extractedData;
    
    // 1. 创建考试记录
    const examRecord = {
      id: $jmespath($now(), 'uuid_generate_v4()'), // 生成UUID
      title: exam_info.title || '未知考试',
      type: exam_info.type || '月考',
      date: exam_info.date || new Date().toISOString().split('T')[0],
      scope: exam_info.scope || 'class',
      created_at: new Date().toISOString()
    };

    // 2. 处理学生成绩数据
    const processedStudents = students.map((student, index) => {
      // 数据验证和清洗
      const cleanStudent = {
        id: $jmespath($now(), 'uuid_generate_v4()'),
        exam_id: examRecord.id,
        student_id: String(student.student_id || '').trim(),
        name: String(student.name || '').trim(),
        class_name: student.class_name || '未知班级',
        
        // 考试信息冗余存储（便于查询）
        exam_title: examRecord.title,
        exam_type: examRecord.type,
        exam_date: examRecord.date,
        exam_scope: examRecord.scope,
        
        // 各科目成绩
        total_score: parseFloat(student.total_score) || null,
        chinese_score: parseFloat(student.chinese_score) || null,
        math_score: parseFloat(student.math_score) || null,
        english_score: parseFloat(student.english_score) || null,
        physics_score: parseFloat(student.physics_score) || null,
        chemistry_score: parseFloat(student.chemistry_score) || null,
        politics_score: parseFloat(student.politics_score) || null,
        history_score: parseFloat(student.history_score) || null,
        biology_score: parseFloat(student.biology_score) || null,
        geography_score: parseFloat(student.geography_score) || null,
        
        // 排名信息
        rank_in_class: parseInt(student.rank_in_class) || null,
        rank_in_grade: parseInt(student.rank_in_grade) || null,
        rank_in_school: parseInt(student.rank_in_school) || null,
        
        // 元数据
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 数据验证
      if (!cleanStudent.student_id) {
        throw new Error(\`第\${index + 1}行学生数据缺少学号\`);
      }
      if (!cleanStudent.name) {
        throw new Error(\`第\${index + 1}行学生数据缺少姓名\`);
      }

      return cleanStudent;
    });

    // 3. 返回处理后的数据
    return [
      {
        json: {
          success: true,
          exam: examRecord,
          students: processedStudents,
          summary: {
            total_students: processedStudents.length,
            exam_title: examRecord.title,
            processing_time: new Date().toISOString()
          }
        }
      }
    ];

  } catch (error) {
    return [
      {
        json: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }
    ];
  }
};

// 执行数据处理
return processExtractedData();
`,

  // 3. Supabase插入配置
  supabaseConfig: {
    // 考试表插入配置
    examInsert: {
      operation: "insert",
      table: "exams",
      data: "={{ $json.exam }}",
      options: {
        upsert: true,
        onConflict: "title,date,type"
      }
    },
    
    // 成绩数据插入配置
    gradeDataInsert: {
      operation: "insert", 
      table: "grade_data",
      data: "={{ $json.students }}",
      options: {
        upsert: true,
        onConflict: "exam_id,student_id,subject"
      }
    }
  },

  // 4. 错误处理配置
  errorHandling: {
    retryAttempts: 3,
    retryDelay: 1000,
    fallbackResponse: {
      success: false,
      message: "数据处理失败，请检查CSV格式和内容"
    }
  }
};

// 导出配置
module.exports = informationExtractorConfig;

// 使用说明：
// 1. 将此配置应用到n8n工作流中
// 2. 设置环境变量 DEEPSEEK_API_KEY
// 3. 确保Supabase连接配置正确
// 4. 测试工作流处理CSV文件 