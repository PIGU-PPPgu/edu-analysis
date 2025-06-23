# n8n Information Extractor 节点手动配置指南

> 🎯 **目标**: 解决CSV成绩数据智能提取和Supabase对接问题

## 📋 配置步骤总览

1. **添加Information Extractor节点**
2. **配置AI模型连接**
3. **设置JSON Schema结构**
4. **配置AI提示词**
5. **添加数据处理Code节点**
6. **配置Supabase连接**
7. **测试和调试**

---

## 🔧 详细配置步骤

### 步骤1: 添加Information Extractor节点

1. 在n8n工作流编辑器中，点击 **"+"** 添加新节点
2. 搜索 **"Information Extractor"**
3. 选择 **"@n8n/n8n-nodes-langchain.informationExtractor"**
4. 将节点拖拽到Webhook节点和Response节点之间

### 步骤2: 配置AI模型连接

在Information Extractor节点中：

#### 2.1 模型设置
- **Model**: 选择 "Chat Model"
- **Chat Model**: 选择 "OpenAI Chat Model" 或创建自定义模型

#### 2.2 DeepSeek API配置
```
API Key: 你的DeepSeek API密钥
Base URL: https://api.deepseek.com/v1
Model Name: deepseek-chat
Temperature: 0.1
Max Tokens: 4000
```

### 步骤3: 设置JSON Schema结构

在 **"Schema"** 字段中输入以下JSON：

```json
{
  "type": "object",
  "properties": {
    "exam_info": {
      "type": "object",
      "description": "考试基本信息",
      "properties": {
        "title": {
          "type": "string",
          "description": "考试标题，如'907九下月考成绩'"
        },
        "type": {
          "type": "string",
          "description": "考试类型：月考、期中考试、期末考试、模拟考试等"
        },
        "date": {
          "type": "string",
          "description": "考试日期，格式：YYYY-MM-DD"
        },
        "scope": {
          "type": "string",
          "description": "考试范围：class(班级)或grade(年级)",
          "default": "class"
        }
      },
      "required": ["title", "type"]
    },
    "students": {
      "type": "array",
      "description": "学生成绩数据数组",
      "items": {
        "type": "object",
        "properties": {
          "student_id": {
            "type": "string",
            "description": "学号，必须唯一"
          },
          "name": {
            "type": "string",
            "description": "学生姓名"
          },
          "class_name": {
            "type": "string",
            "description": "班级名称，如'初三7班'"
          },
          "total_score": {
            "type": ["number", "null"],
            "description": "总分"
          },
          "chinese_score": {
            "type": ["number", "null"],
            "description": "语文成绩"
          },
          "math_score": {
            "type": ["number", "null"],
            "description": "数学成绩"
          },
          "english_score": {
            "type": ["number", "null"],
            "description": "英语成绩"
          },
          "physics_score": {
            "type": ["number", "null"],
            "description": "物理成绩"
          },
          "chemistry_score": {
            "type": ["number", "null"],
            "description": "化学成绩"
          },
          "politics_score": {
            "type": ["number", "null"],
            "description": "政治成绩"
          },
          "history_score": {
            "type": ["number", "null"],
            "description": "历史成绩"
          },
          "biology_score": {
            "type": ["number", "null"],
            "description": "生物成绩"
          },
          "geography_score": {
            "type": ["number", "null"],
            "description": "地理成绩"
          },
          "rank_in_class": {
            "type": ["integer", "null"],
            "description": "班级排名"
          },
          "rank_in_grade": {
            "type": ["integer", "null"],
            "description": "年级排名"
          },
          "rank_in_school": {
            "type": ["integer", "null"],
            "description": "学校排名"
          }
        },
        "required": ["student_id", "name"]
      }
    }
  },
  "required": ["exam_info", "students"]
}
```

### 步骤4: 配置AI提示词

在 **"Prompt"** 字段中输入：

```
你是一个专业的教育数据分析师，需要从CSV格式的学生成绩数据中提取结构化信息。

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
- 班级排名 → rank_in_class：班级排名、班排名、班内排名、班排
- 年级排名 → rank_in_grade：年级排名、级排名、年级内排名、级排
- 学校排名 → rank_in_school：学校排名、校排名、全校排名、校排

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

现在请分析以下CSV数据：
```

### 步骤5: 添加数据处理Code节点

1. 在Information Extractor节点后添加 **Code节点**
2. 节点名称设为：**"数据格式转换"**
3. 在Code字段中输入以下代码：

```javascript
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
      id: crypto.randomUUID(), // 生成UUID
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
        id: crypto.randomUUID(),
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
        throw new Error(`第${index + 1}行学生数据缺少学号`);
      }
      if (!cleanStudent.name) {
        throw new Error(`第${index + 1}行学生数据缺少姓名`);
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
```

### 步骤6: 配置Supabase连接

#### 6.1 添加Supabase节点
1. 在Code节点后添加 **Supabase节点**
2. 节点名称：**"保存考试信息"**

#### 6.2 Supabase连接配置
```
Host: giluhqotfjpmofowvogn.supabase.co
Service Key: 你的Supabase Service Key
```

#### 6.3 考试表插入配置
```
Operation: Insert
Table: exams
Data: {{ $json.exam }}
Options:
  - Upsert: true
  - On Conflict: title,date,type
```

#### 6.4 添加第二个Supabase节点
1. 节点名称：**"保存成绩数据"**
2. 配置：
```
Operation: Insert
Table: grade_data
Data: {{ $json.students }}
Options:
  - Upsert: true
  - On Conflict: exam_id,student_id
```

### 步骤7: 连接节点流程

确保节点连接顺序：
```
Webhook → Information Extractor → Code(数据转换) → Supabase(考试) → Supabase(成绩) → Response
```

---

## 🔍 常见问题解决

### 问题1: AI模型连接失败
**解决方案**:
- 检查DeepSeek API密钥是否正确
- 确认Base URL格式：`https://api.deepseek.com/v1`
- 检查网络连接

### 问题2: JSON Schema验证失败
**解决方案**:
- 确保JSON格式正确，没有语法错误
- 检查字段类型定义是否匹配
- 验证required字段设置

### 问题3: Supabase插入失败
**解决方案**:
- 检查Supabase连接配置
- 确认表结构与数据格式匹配
- 检查RLS策略是否允许插入

### 问题4: 数据格式转换错误
**解决方案**:
- 检查Code节点中的数据处理逻辑
- 确认AI提取的数据结构
- 添加更多错误处理和日志

---

## 🧪 测试步骤

### 1. 准备测试数据
创建一个简单的CSV文件：
```csv
学号,姓名,班级,语文,数学,英语,总分,班级排名
108110907001,张三,初三7班,85,90,88,263,5
108110907002,李四,初三7班,92,87,91,270,3
```

### 2. 测试工作流
1. 激活工作流
2. 使用Postman或curl发送POST请求到Webhook URL
3. 检查每个节点的输出
4. 验证Supabase中的数据

### 3. 调试技巧
- 在每个节点后添加临时的"Edit Fields"节点查看数据
- 使用n8n的执行历史功能查看详细日志
- 检查Supabase的实时日志

---

## 📝 配置检查清单

- [ ] Information Extractor节点已添加
- [ ] DeepSeek API配置正确
- [ ] JSON Schema格式正确
- [ ] AI提示词已设置
- [ ] Code节点数据处理逻辑正确
- [ ] Supabase连接配置正确
- [ ] 节点连接顺序正确
- [ ] 工作流已激活
- [ ] 测试数据准备完成

---

## 🚀 优化建议

1. **性能优化**：
   - 批量插入数据而不是逐条插入
   - 使用Supabase的upsert功能避免重复数据

2. **错误处理**：
   - 添加重试机制
   - 详细的错误日志记录
   - 失败数据的备份存储

3. **数据验证**：
   - 更严格的数据格式验证
   - 业务规则检查（如成绩范围）
   - 重复数据检测

4. **监控告警**：
   - 设置工作流执行状态监控
   - 数据质量检查告警
   - 性能指标监控

---

> 💡 **提示**: 配置完成后，建议先用小量测试数据验证整个流程，确认无误后再处理大批量数据。 