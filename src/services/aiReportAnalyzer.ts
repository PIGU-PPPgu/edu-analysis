/**
 * 🤖 AI报告分析服务
 * 使用用户配置的AI接口生成成绩分析报告
 */

import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { GenericAIClient } from "./aiService";
import {
  AIInsights,
  KeyFinding,
  Recommendation,
  Warning,
} from "@/types/report";
import { toast } from "sonner";

interface GradeDataSummary {
  totalStudents: number;
  averageScore: number;
  passRate: number;
  excellentRate: number;
  lowestScore: number;
  highestScore: number;
  classSummaries: Array<{
    className: string;
    avgScore: number;
    studentCount: number;
  }>;
  subjectSummaries: Array<{
    subject: string;
    avgScore: number;
  }>;
  // 🆕 排名数据
  rankingData: {
    topStudentsCount: number; // 前10%学生数
    bottomStudentsCount: number; // 后20%学生数
    subjectRankingAnalysis: Array<{
      subject: string;
      topStudents: string[]; // 前5名学生姓名
      averageRank: number; // 平均排名
    }>;
    unbalancedStudents: Array<{
      name: string;
      totalRank: number;
      worstSubject: string;
      worstRank: number;
      gap: number; // 最差科目排名 - 总排名
    }>;
  };
}

export class AIReportAnalyzer {
  private aiClient: GenericAIClient | null = null;
  private isInitialized = false;
  private lastConfigVersion: string | null = null;

  /**
   * 重置AI客户端（用于配置更新时）
   */
  reset(): void {
    console.log("🔄 重置AI报告分析器");
    this.aiClient = null;
    this.isInitialized = false;
    this.lastConfigVersion = null;
  }

  /**
   * 初始化AI客户端
   */
  async initialize(): Promise<boolean> {
    // 检查配置是否更新
    const configJson = localStorage.getItem("user_ai_config");
    const currentConfigVersion = configJson
      ? JSON.stringify(JSON.parse(configJson))
      : null;

    // 如果配置版本变化，重新初始化
    if (this.isInitialized && this.lastConfigVersion !== currentConfigVersion) {
      console.log("⚠️ 检测到AI配置变更，重新初始化...");
      this.reset();
    }

    if (this.isInitialized && this.aiClient) {
      console.log("AI客户端已初始化，使用现有实例");
      return true;
    }

    // 保存当前配置版本
    this.lastConfigVersion = currentConfigVersion;

    try {
      console.log("🔍 开始初始化AI报告分析器...");

      // 从localStorage直接读取，避免缓存问题
      const configJson = localStorage.getItem("user_ai_config");
      console.log("📦 localStorage原始数据:", configJson);

      // 获取用户配置的AI设置
      const config = await getUserAIConfig();
      console.log("📋 获取到的AI配置:", config);
      console.log(
        "🔧 配置详情 - provider:",
        config?.provider,
        "version:",
        config?.version,
        "enabled:",
        config?.enabled
      );

      if (!config) {
        console.warn("⚠️ 未找到AI配置，将使用默认分析");
        return false;
      }

      if (!config.enabled) {
        console.warn("⚠️ AI功能未启用 (enabled: false)，将使用默认分析");
        return false;
      }

      // 获取API密钥
      console.log(`🔑 尝试获取 ${config.provider} 的API密钥...`);
      const apiKey = await getUserAPIKey(config.provider);

      if (!apiKey) {
        console.error(`❌ 未找到${config.provider}的API密钥`);
        toast.error("AI功能未配置，使用默认分析");
        return false;
      }

      console.log(
        `✓ 成功获取API密钥（前10字符）: ${apiKey.substring(0, 10)}...`
      );

      // 初始化AI客户端
      console.log("🤖 初始化AI客户端...");

      // 根据provider设置正确的baseUrl
      let baseUrl: string | undefined = undefined;
      if (config.provider === "doubao") {
        baseUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
        console.log("📍 使用豆包ARK API endpoint:", baseUrl);
      }

      this.aiClient = new GenericAIClient({
        providerId: config.provider,
        apiKey,
        modelId: config.version,
        baseUrl,
      });

      this.isInitialized = true;
      console.log(
        `✅ AI报告分析器已初始化成功: ${config.provider}/${config.version}`
      );
      return true;
    } catch (error) {
      console.error("❌ 初始化AI报告分析器失败:", error);
      toast.error("AI初始化失败，将使用默认分析");
      return false;
    }
  }

  /**
   * 分析成绩数据并生成AI洞察
   */
  async analyzeGradeData(gradeData: any[]): Promise<AIInsights> {
    // 🔍 调试：检查输入数据
    console.log(`🔍 aiReportAnalyzer 收到 ${gradeData.length} 条数据`);
    if (gradeData.length > 0) {
      const sampleNames = gradeData
        .slice(0, 5)
        .map((r) => r.name)
        .filter(Boolean);
      console.log(`📝 学生姓名样本: ${sampleNames.join(", ") || "无姓名数据"}`);
    }

    // 尝试初始化AI
    const aiAvailable = await this.initialize();

    if (!aiAvailable || !this.aiClient) {
      // 返回默认分析（无AI）
      return this.generateDefaultInsights(gradeData);
    }

    try {
      // 计算数据摘要
      const summary = this.calculateDataSummary(gradeData);

      // 构建AI分析提示词
      const prompt = this.buildAnalysisPrompt(summary);

      console.log("正在调用AI生成报告分析...");

      // 调用AI API（使用sendRequest方法）
      const response = await this.aiClient.sendRequest([
        {
          role: "system",
          content: `你是一位资深的教育数据分析专家，擅长从考试成绩中发现问题并提供可行的改进建议。
你的分析应该：
1. 基于数据事实，不主观臆断
2. 重点突出，抓住关键问题
3. 建议具体可行，可操作性强
4. 语言简洁专业，避免冗余`,
        },
        { role: "user", content: prompt },
      ]);

      // 解析AI返回的分析结果
      const aiInsights = this.parseAIResponse(response, summary);

      console.log("AI报告分析完成");
      return aiInsights;
    } catch (error) {
      console.error("AI分析失败:", error);
      toast.error("AI分析失败，使用默认分析");
      // 降级到默认分析
      return this.generateDefaultInsights(gradeData);
    }
  }

  /**
   * 获取空摘要（安全降级）
   */
  private getEmptySummary(): GradeDataSummary {
    return {
      totalStudents: 0,
      averageScore: 0,
      passRate: 0,
      excellentRate: 0,
      lowestScore: 0,
      highestScore: 0,
      classSummaries: [],
      subjectSummaries: [],
      rankingData: {
        topStudentsCount: 0,
        bottomStudentsCount: 0,
        subjectRankingAnalysis: [],
        unbalancedStudents: [],
      },
    };
  }

  /**
   * 计算数据摘要
   */
  private calculateDataSummary(gradeData: any[]): GradeDataSummary {
    const totalStudents = gradeData.length;

    // 🔧 安全检查：如果没有数据，返回空摘要
    if (totalStudents === 0) {
      console.warn("⚠️ calculateDataSummary: 没有成绩数据");
      return this.getEmptySummary();
    }

    // 计算总分相关统计
    const totalScores = gradeData
      .map((r) => parseFloat(r.total_score))
      .filter((s) => !isNaN(s));

    // 🔧 安全检查：如果没有有效分数
    if (totalScores.length === 0) {
      console.warn("⚠️ calculateDataSummary: 没有有效的总分数据");
      return this.getEmptySummary();
    }

    const averageScore =
      totalScores.reduce((a, b) => a + b, 0) / totalScores.length;

    // 🔧 动态获取总分满分
    let totalMaxScore = gradeData[0]?.total_max_score;

    // 如果数据库中没有total_max_score，则从科目满分累加计算
    if (!totalMaxScore || totalMaxScore === 0) {
      // 定义各科目默认满分
      const subjectDefaultScores: Record<string, number> = {
        chinese: 120, // 语文 120
        math: 100, // 数学 100
        english: 100, // 英语 100
        physics: 100, // 物理 100
        chemistry: 100, // 化学 100
        politics: 100, // 政治 100
        history: 100, // 历史 100
        biology: 100, // 生物 100
        geography: 100, // 地理 100
      };

      // 检测数据中存在哪些科目（有成绩的科目）
      totalMaxScore = 0;

      Object.entries(subjectDefaultScores).forEach(
        ([subjectKey, defaultScore]) => {
          const hasScores = gradeData.some((record) => {
            const score = parseFloat(record[`${subjectKey}_score`]);
            return !isNaN(score) && score > 0;
          });

          if (hasScores) {
            totalMaxScore += defaultScore;
          }
        }
      );
    }

    const passLine = totalMaxScore * 0.6; // 60%及格
    const excellentLine = totalMaxScore * 0.85; // 85%优秀

    const passRate =
      (totalScores.filter((s) => s >= passLine).length / totalScores.length) *
      100;
    const excellentRate =
      (totalScores.filter((s) => s >= excellentLine).length /
        totalScores.length) *
      100;
    const lowestScore = Math.min(...totalScores);
    const highestScore = Math.max(...totalScores);

    // 按班级分组统计
    const classSummaryMap: Record<
      string,
      { totalScore: number; count: number }
    > = {};
    gradeData.forEach((record) => {
      if (
        record.class_name &&
        record.total_score !== null &&
        record.total_score !== undefined
      ) {
        if (!classSummaryMap[record.class_name]) {
          classSummaryMap[record.class_name] = { totalScore: 0, count: 0 };
        }
        classSummaryMap[record.class_name].totalScore += parseFloat(
          record.total_score
        );
        classSummaryMap[record.class_name].count += 1;
      }
    });

    const classSummaries = Object.entries(classSummaryMap)
      .map(([className, data]) => ({
        className,
        avgScore: data.totalScore / data.count,
        studentCount: data.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    // 科目统计
    const subjects = [
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "politics",
      "history",
      "biology",
      "geography",
    ];
    const subjectNames = {
      chinese: "语文",
      math: "数学",
      english: "英语",
      physics: "物理",
      chemistry: "化学",
      politics: "政治",
      history: "历史",
      biology: "生物",
      geography: "地理",
    };

    const subjectSummaries = subjects
      .map((subject) => {
        const scores = gradeData
          .map((r) => parseFloat(r[`${subject}_score`]))
          .filter((s) => !isNaN(s));
        if (scores.length === 0) return null;
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        return {
          subject: subjectNames[subject] || subject,
          avgScore,
        };
      })
      .filter((s) => s !== null) as Array<{
      subject: string;
      avgScore: number;
    }>;

    // 🆕 计算排名数据
    const rankingData = this.calculateRankingData(gradeData);

    return {
      totalStudents,
      averageScore,
      passRate,
      excellentRate,
      lowestScore,
      highestScore,
      classSummaries,
      subjectSummaries,
      rankingData,
    };
  }

  /**
   * 🆕 计算排名相关数据
   */
  private calculateRankingData(gradeData: any[]): any {
    const totalStudents = gradeData.length;

    // 🔍 调试：检查排名数据
    const hasRankData = gradeData.filter(
      (r) => r.total_rank_in_class || r.total_rank_in_school
    ).length;
    console.log(`🔍 排名数据检查: ${hasRankData}/${totalStudents} 条有排名`);

    // 1. 计算前10%和后20%学生数
    const topStudentsCount = Math.ceil(totalStudents * 0.1);
    const bottomStudentsCount = Math.ceil(totalStudents * 0.2);

    // 2. 按总分排名排序
    const sortedByTotal = [...gradeData].sort((a, b) => {
      const rankA = a.total_rank_in_class || a.total_rank_in_school || 999;
      const rankB = b.total_rank_in_class || b.total_rank_in_school || 999;
      return rankA - rankB;
    });

    // 3. 各科目排名分析
    const subjects = [
      { key: "chinese", name: "语文" },
      { key: "math", name: "数学" },
      { key: "english", name: "英语" },
      { key: "physics", name: "物理" },
      { key: "chemistry", name: "化学" },
      { key: "politics", name: "政治" },
      { key: "history", name: "历史" },
      { key: "biology", name: "生物" },
      { key: "geography", name: "地理" },
    ];

    const subjectRankingAnalysis = subjects
      .map((subject) => {
        const rankKey = `${subject.key}_rank_in_class`;
        const validRanks = gradeData
          .map((r) => ({
            name: r.name || "未知",
            rank: r[rankKey] || 999,
          }))
          .filter((r) => r.rank < 900)
          .sort((a, b) => a.rank - b.rank);

        if (validRanks.length === 0) return null;

        const topStudents = validRanks.slice(0, 5).map((r) => r.name);
        const averageRank =
          validRanks.reduce((sum, r) => sum + r.rank, 0) / validRanks.length;

        return {
          subject: subject.name,
          topStudents,
          averageRank,
        };
      })
      .filter((s) => s !== null);

    // 4. 识别偏科学生（总排名vs单科排名差距大的学生）
    const unbalancedStudents: Array<{
      name: string;
      totalRank: number;
      worstSubject: string;
      worstRank: number;
      gap: number;
    }> = [];

    sortedByTotal.slice(0, Math.min(20, totalStudents)).forEach((student) => {
      const totalRank =
        student.total_rank_in_class || student.total_rank_in_school || 999;
      if (totalRank >= 900) return;

      // 找出最差科目排名
      let worstSubject = "";
      let worstRank = 0;
      let maxGap = 0;

      subjects.forEach((subject) => {
        const rankKey = `${subject.key}_rank_in_class`;
        const subjectRank = student[rankKey] || 999;

        if (subjectRank < 900) {
          const gap = subjectRank - totalRank;
          if (gap > maxGap) {
            maxGap = gap;
            worstSubject = subject.name;
            worstRank = subjectRank;
          }
        }
      });

      // 如果差距>=10，视为偏科
      if (maxGap >= 10) {
        unbalancedStudents.push({
          name: student.name || "未知",
          totalRank,
          worstSubject,
          worstRank,
          gap: maxGap,
        });
      }
    });

    return {
      topStudentsCount,
      bottomStudentsCount,
      subjectRankingAnalysis,
      unbalancedStudents: unbalancedStudents.slice(0, 5), // 最多5个
    };
  }

  /**
   * 构建AI分析提示词（优化版 - 增强学生名单）
   */
  private buildAnalysisPrompt(summary: GradeDataSummary): string {
    // 提取各科前3名学生名单
    const topStudentsBySubject = summary.rankingData.subjectRankingAnalysis
      .map((s) => `- **${s.subject}**：${s.topStudents.slice(0, 3).join("、")}`)
      .join("\n");

    // 偏科学生详细列表
    const unbalancedStudentsList =
      summary.rankingData.unbalancedStudents.length > 0
        ? summary.rankingData.unbalancedStudents
            .map(
              (s) =>
                `${s.name}（总排名${s.totalRank}，${s.worstSubject}排名${s.worstRank}，落后${s.gap}名）`
            )
            .join("、")
        : "无";

    return `你是一位资深的教育数据分析专家，请执行以下多步骤的班级成绩数据分析任务：

## 📊 基础数据

**整体概况：**
- 参考人数：${summary.totalStudents}人
- 平均分：${summary.averageScore.toFixed(1)}分
- 及格率：${summary.passRate.toFixed(1)}%
- 优秀率：${summary.excellentRate.toFixed(1)}%
- 最高分：${summary.highestScore}分
- 最低分：${summary.lowestScore}分
- 分数区间：${summary.highestScore - summary.lowestScore}分

**班级表现（按平均分排序）：**
${summary.classSummaries
  .map(
    (cls, i) =>
      `${i + 1}. ${cls.className}: ${cls.avgScore.toFixed(1)}分 (${cls.studentCount}人)`
  )
  .join("\n")}

**各科平均分：**
${summary.subjectSummaries
  .map((subj) => `- ${subj.subject}: ${subj.avgScore.toFixed(1)}分`)
  .join("\n")}

**🏆 排名分布分析：**
- 前10%优秀学生：${summary.rankingData.topStudentsCount}人
- 后20%需关注学生：${summary.rankingData.bottomStudentsCount}人

**🌟 各科优秀学生（前3名）：**
${topStudentsBySubject}

**⚠️ 偏科学生名单：**
${unbalancedStudentsList}

---

## 🎯 分析任务（请严格按以下步骤执行）

### 步骤1：数据概览与描述性统计
请基于上述数据，深入分析：
- 整体水平判断（优秀/良好/一般/较差）
- 成绩离散程度（集中/分散）
- 及格率和优秀率是否达标（目标：及格率≥85%，优秀率≥20%）
- 各科目之间的均衡性
- 各班级表现对比（列出最强班级和最弱班级）

### 步骤2：核心问题诊断
请识别班级成绩存在的**主要问题**：
- ⚠️ **两极分化**：是否存在成绩严重分化现象？
- 📉 **薄弱科目**：哪个科目是明显短板？差距多大？
- 🚨 **危险群体**：是否有大量学生集中在及格线边缘（55-65分）？
- 📊 **稳定性问题**：成绩波动是否过大？
- 👥 **班级差距**：班级之间差距是否合理？
- 🎯 **偏科现象**：重点关注偏科学生名单，这些学生需要特别辅导

**⚠️ CRITICAL：计算"影响学生"数量时，请基于实际数据精确统计，确保affectedStudents字段的数值真实准确！**

### 步骤3：关键发现提取
请提取5-8个**最重要的发现**（比之前更多），每个发现包含：
- 严重程度：high（需立即关注）/medium（需要改进）/low（建议优化）
- 类别：performance（整体表现）/disparity（差距问题）/subject（科目问题）/risk（风险预警）/excellence（优秀表现）
- 描述：一句话说明问题，**如有学生名单，必须列出具体姓名**（如"张三、李四等3名学生..."）
- 详细说明：具体数据支撑，包括学生姓名
- 影响范围：**必须精确统计**受影响的学生数量（不能瞎编！）

### 步骤4：具体改进建议
请针对发现的问题，给出**4-6条具体可操作的建议**（比之前更多）：
- 薄弱科目的教学方法调整
- 后进生的帮扶策略（如分层教学、一对一辅导）
- 优秀生的拔高培养方案（**列出需要重点培养的优秀学生名字**）
- 偏科学生的针对性辅导（**列出偏科学生名字和薄弱科目**）
- 课堂管理或家校沟通改进措施

每条建议需包含：
- 标题：简明扼要（15字以内）
- 描述：具体操作方法（150字以内），**包含具体学生名单**
- 目标群体：针对哪些学生/班级（**列出具体姓名，如果超过5人只列前3-5人并标注"等X人"**）
- 优先级：immediate（立即执行）/short-term（1-2周内）/long-term（1个月以上）

### 步骤5：总体概述
用**300-500字**总结本次考试的整体情况、主要问题和改进方向（比之前更详细），要求：
- 语言专业、简洁
- 使用markdown格式优化排版：
  * 使用**加粗**强调关键信息
  * 使用分段提高可读性
  * 使用列表呈现要点
  * 提及具体学生姓名时，用**加粗**突出
- 客观、基于数据
- 给出明确的行动方向
- **必须提及表扬的优秀学生（列出2-3个姓名）和需要关注的学生（列出2-3个姓名）**

---

## 📋 返回格式要求

请严格按照以下JSON格式返回（确保是有效的JSON）：

\`\`\`json
{
  "summary": "**整体评价：**\n\n本次考试整体水平良好，平均分XX分...\n\n**优秀表现：**\n- **张三、李四、王五**等同学表现突出...\n\n**需要关注：**\n- **赵六、钱七**等同学成绩有待提高...\n\n**改进方向：**\n1. 加强XX科目教学\n2. 关注偏科学生辅导",
  "keyFindings": [
    {
      "id": "finding-1",
      "severity": "high",
      "category": "performance",
      "message": "**${summary.passRate.toFixed(1)}%及格率**低于目标值85%，**张三、李四、王五**等12名学生不及格",
      "details": "**不及格学生分布：**\n- XX班：**张三、李四**等5人\n- YY班：**王五、赵六**等7人",
      "relatedCharts": ["score-distribution"],
      "affectedCount": 12
    },
    {
      "id": "finding-2",
      "severity": "medium",
      "category": "excellence",
      "message": "**优秀学生表现：****张三、李四、王五**等同学总分前三，值得表扬",
      "details": "前10%优秀学生中，**张三**总分最高...",
      "relatedCharts": [],
      "affectedCount": ${summary.rankingData.topStudentsCount}
    }
  ],
  "recommendations": [
    {
      "id": "rec-1",
      "category": "优秀生培养",
      "title": "重点培养尖子生",
      "description": "**针对张三、李四、王五**等前10%优秀学生：\n\n1. **拔高训练**：提供竞赛级题目，培养创新思维\n2. **导师制**：安排一对一学科指导\n3. **自主学习**：鼓励深度探索，培养学术兴趣",
      "targetGroup": "**张三、李四、王五**等${summary.rankingData.topStudentsCount}名优秀学生",
      "priority": "short-term",
      "aiGenerated": true
    },
    {
      "id": "rec-2",
      "category": "偏科辅导",
      "title": "针对性补弱辅导",
      "description": "**偏科学生重点关注：**\n\n${unbalancedStudentsList ? `- **${unbalancedStudentsList.split("、")[0]}**：需加强${summary.rankingData.unbalancedStudents[0]?.worstSubject}科目辅导\n- 建立专项辅导小组\n- 每周安排2次额外练习` : "暂无明显偏科学生"}",
      "targetGroup": "${unbalancedStudentsList || "全体学生"}",
      "priority": "immediate",
      "aiGenerated": true
    }
  ],
  "warnings": [
    {
      "id": "warn-1",
      "severity": "high",
      "message": "**不及格学生预警：****张三、李四、王五**等12名学生总分不及格，需紧急干预",
      "affectedStudents": 12,
      "suggestedAction": "建立**一对一辅导**机制，每周跟踪进度"
    }
  ]
}
\`\`\`

**⚠️ CRITICAL 重要提示：**
1. **返回的必须是纯JSON**，不要包含markdown代码块标记（去掉\`\`\`json和\`\`\`）
2. 所有文本**必须使用markdown格式**：
   - 使用**加粗**强调学生姓名、关键数据
   - 使用\n换行符优化排版
   - 使用列表（-）和编号（1.）呈现要点
3. **affectedStudents数值必须基于实际数据精确统计**，例如：
   - 不及格学生数 = Math.round(总人数 × (100 - 及格率) / 100)
   - 优秀学生数 = 前10%学生数（已提供）
   - 不能随意编造数字！
4. **必须列出具体学生姓名**（已在数据中提供）：
   - 表扬优秀学生时列出姓名
   - 指出待改进学生时列出姓名（如果超过5人只列3-5人+"等X人"）
   - 偏科学生必须列出姓名和薄弱科目
5. 建议要具体、可操作，避免空泛
6. 总体概述控制在**300-500字**（增加了篇幅）
7. keyFindings提取**5-8个**发现（之前是3-5个）
8. recommendations提供**4-6条**建议（之前是3-4条）
9. 基于数据事实，不要主观臆断`;
  }

  /**
   * 清洗 JSON 字符串，处理字符串内部的控制字符
   * 问题：AI 返回的 JSON 字符串值内部可能包含原始换行符，而不是转义的 \n
   */
  private sanitizeJsonString(jsonStr: string): string {
    // 方案1：先尝试直接解析，如果成功就不需要清洗
    try {
      JSON.parse(jsonStr);
      return jsonStr; // 能解析就直接返回
    } catch {
      // 继续清洗
    }

    // 方案2：处理 JSON 字符串字面量内的原始换行符
    // 策略：在字符串内部将原始 \n \r \t 转换为转义序列
    let result = "";
    let inString = false;
    let escape = false;

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];

      if (escape) {
        // 前一个字符是反斜杠，当前字符是转义序列的一部分
        result += char;
        escape = false;
        continue;
      }

      if (char === "\\") {
        result += char;
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      if (inString) {
        // 在字符串内部，需要转义控制字符
        if (char === "\n") {
          result += "\\n";
        } else if (char === "\r") {
          result += "\\r";
        } else if (char === "\t") {
          result += "\\t";
        } else if (char.charCodeAt(0) < 32) {
          // 其他控制字符，移除或转义
          result += "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0");
        } else {
          result += char;
        }
      } else {
        // 不在字符串内部，直接保留（包括格式化用的换行）
        result += char;
      }
    }

    return result;
  }

  /**
   * 解析AI返回的分析结果
   */
  private parseAIResponse(
    response: any,
    summary: GradeDataSummary
  ): AIInsights {
    try {
      // 提取AI返回的文本内容
      let aiText = "";
      if (response.choices && response.choices[0]) {
        aiText =
          response.choices[0].message?.content ||
          response.choices[0].text ||
          "";
      }

      // 🔍 调试：打印AI原始返回内容
      console.log("🤖 AI原始返回内容（前500字符）:", aiText.substring(0, 500));

      // 尝试解析JSON（AI可能返回包含```json```的markdown格式）
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : aiText;

      // 🔍 调试：打印提取后的JSON字符串
      console.log("📋 提取的JSON（前300字符）:", jsonStr.substring(0, 300));
      console.log("📋 是否匹配到```json```格式:", !!jsonMatch);

      // 🔧 清洗 JSON 字符串，移除控制字符避免解析失败
      jsonStr = this.sanitizeJsonString(jsonStr);

      // 🔍 调试：打印清洗后的JSON
      console.log("🧹 清洗后JSON（前300字符）:", jsonStr.substring(0, 300));

      const parsed = JSON.parse(jsonStr);

      // 构建AIInsights对象
      const insights: AIInsights = {
        keyFindings: (parsed.keyFindings || []).map((f: any, i: number) => ({
          id: `finding-${i}`,
          severity: f.severity || "medium",
          category: f.category || "performance",
          message: f.message || "",
          data: f.data || {},
          relatedCharts: [],
          actionRequired: f.severity === "high",
        })),
        recommendations: (parsed.recommendations || []).map(
          (r: any, i: number) => ({
            id: `rec-${i}`,
            category: r.category || "教学改进",
            title: r.title || "",
            description: r.description || "",
            targetGroup: r.targetGroup,
            aiGenerated: true,
          })
        ),
        warnings: (parsed.warnings || []).map((w: any, i: number) => ({
          id: `warning-${i}`,
          severity: w.severity || "medium",
          message: w.message || "",
          affectedStudents: w.affectedStudents || 0,
          relatedMetrics: [],
        })),
        summary: parsed.summary || "AI分析暂不可用，请查看详细数据统计和图表。",
        confidence: 0.8,
        generatedAt: new Date(),
        modelUsed: "User Configured AI",
      };

      return insights;
    } catch (error) {
      console.error("解析AI响应失败:", error);
      // 🔧 修复：使用已有的 summary 生成默认分析，避免数据丢失
      return this.generateDefaultInsightsFromSummary(summary);
    }
  }

  /**
   * 从已有的 summary 生成默认分析（AI解析失败时的降级方案）
   * 与 generateDefaultInsights 类似，但直接使用已计算的 summary
   */
  private generateDefaultInsightsFromSummary(
    summary: GradeDataSummary
  ): AIInsights {
    const keyFindings: KeyFinding[] = [];

    // 1. 及格率分析
    if (summary.passRate < 70) {
      keyFindings.push({
        id: "finding-passrate",
        severity: "high",
        category: "performance",
        message: `整体及格率为${summary.passRate.toFixed(1)}%，低于目标水平`,
        data: { passRate: summary.passRate, target: 85 },
        relatedCharts: ["ScoreDistributionChart"],
        actionRequired: true,
      });
    } else {
      keyFindings.push({
        id: "finding-passrate",
        severity: "low",
        category: "performance",
        message: `整体及格率${summary.passRate.toFixed(1)}%，达到基本要求`,
        data: { passRate: summary.passRate },
        relatedCharts: ["ScoreDistributionChart"],
        actionRequired: false,
      });
    }

    // 2. 班级差异分析
    if (summary.classSummaries.length > 1) {
      const sortedClasses = [...summary.classSummaries].sort(
        (a, b) => b.avgScore - a.avgScore
      );
      const topClass = sortedClasses[0];
      const bottomClass = sortedClasses[sortedClasses.length - 1];
      const gap = topClass.avgScore - bottomClass.avgScore;

      if (gap > 10) {
        keyFindings.push({
          id: "finding-classgap",
          severity: gap > 15 ? "high" : "medium",
          category: "comparison",
          message: `班级间差异显著，${topClass.className}(${topClass.avgScore.toFixed(1)}分)与${bottomClass.className}(${bottomClass.avgScore.toFixed(1)}分)相差${gap.toFixed(1)}分`,
          data: { topClass, bottomClass, gap },
          relatedCharts: ["ClassComparisonChart"],
          actionRequired: gap > 15,
        });
      }
    }

    // 3. 优秀率分析
    if (summary.excellentRate >= 15) {
      keyFindings.push({
        id: "finding-excellent",
        severity: "low",
        category: "excellence",
        message: `优秀率达${summary.excellentRate.toFixed(1)}%，共${summary.rankingData.topStudentsCount}名优秀学生`,
        data: { excellentRate: summary.excellentRate },
        relatedCharts: ["ScoreDistributionChart"],
        actionRequired: false,
      });
    }

    // 4. 添加排名数据相关分析
    if (summary.rankingData.topStudentsCount > 0) {
      const topSubjectData = summary.rankingData.subjectRankingAnalysis[0];
      if (topSubjectData && topSubjectData.topStudents.length > 0) {
        keyFindings.push({
          id: "finding-top-students",
          severity: "low",
          category: "excellence",
          message: `前${summary.rankingData.topStudentsCount}名优秀学生表现突出，${topSubjectData.subject}科目领先者: ${topSubjectData.topStudents.slice(0, 3).join("、")}`,
          data: { topStudents: topSubjectData.topStudents },
          relatedCharts: [],
          actionRequired: false,
        });
      }
    }

    // 5. 偏科学生分析
    if (summary.rankingData.unbalancedStudents.length > 0) {
      const unbalanced = summary.rankingData.unbalancedStudents.slice(0, 3);
      const names = unbalanced.map((s) => s.name).join("、");
      keyFindings.push({
        id: "finding-unbalanced",
        severity: "medium",
        category: "warning", // 使用有效的 FindingCategory
        message: `发现${summary.rankingData.unbalancedStudents.length}名偏科学生需关注: ${names}等`,
        data: { unbalancedStudents: unbalanced },
        relatedCharts: [],
        actionRequired: true,
      });
    }

    const recommendations: Recommendation[] = [
      {
        id: "rec-1",
        category: "教学改进",
        title: "加强薄弱班级辅导",
        description: "针对平均分较低的班级，开展专题辅导和个性化教学",
        targetGroup: "薄弱班级",
        aiGenerated: false,
      },
      {
        id: "rec-2",
        category: "学生辅导",
        title: "关注学困生群体",
        description: "建立学困生档案，安排一对一辅导",
        targetGroup: "学困生",
        aiGenerated: false,
      },
    ];

    // 添加针对偏科学生的建议
    if (summary.rankingData.unbalancedStudents.length > 0) {
      recommendations.push({
        id: "rec-3",
        category: "偏科辅导",
        title: "针对性补弱辅导",
        description: `为${summary.rankingData.unbalancedStudents
          .slice(0, 3)
          .map((s) => s.name)
          .join("、")}等偏科学生制定专项辅导计划`,
        targetGroup: "偏科学生",
        aiGenerated: false,
      });
    }

    const warnings: Warning[] = [];
    const failedCount = Math.round(
      (summary.totalStudents * (100 - summary.passRate)) / 100
    );
    if (failedCount > 0) {
      warnings.push({
        id: "warning-failed",
        severity: summary.passRate < 60 ? "high" : "medium",
        message: `有${failedCount}名学生不及格，需要重点关注`,
        affectedStudents: failedCount,
        relatedMetrics: [
          { metric: "passRate", value: summary.passRate, threshold: 60 },
        ],
      });
    }

    return {
      keyFindings,
      recommendations,
      warnings,
      summary: `【AI分析暂不可用，以下为基础统计】共${summary.totalStudents}名学生参加考试，平均分${summary.averageScore.toFixed(1)}分，及格率${summary.passRate.toFixed(1)}%，优秀率${summary.excellentRate.toFixed(1)}%。最高分${summary.highestScore}分，最低分${summary.lowestScore}分。`,
      confidence: 0.6,
      generatedAt: new Date(),
      modelUsed: "Fallback (AI解析失败)",
    };
  }

  /**
   * 生成默认分析（无AI时的降级方案）
   */
  private generateDefaultInsights(gradeData: any[]): AIInsights {
    const summary = this.calculateDataSummary(gradeData);

    const keyFindings: KeyFinding[] = [];

    // 1. 及格率分析
    if (summary.passRate < 70) {
      keyFindings.push({
        id: "finding-passrate",
        severity: "high",
        category: "performance",
        message: `整体及格率为${summary.passRate.toFixed(1)}%，低于目标水平`,
        data: { passRate: summary.passRate, target: 85 },
        relatedCharts: ["ScoreDistributionChart"],
        actionRequired: true,
      });
    }

    // 2. 班级差异分析
    if (summary.classSummaries.length > 1) {
      const topClass = summary.classSummaries[0];
      const bottomClass =
        summary.classSummaries[summary.classSummaries.length - 1];
      const gap = topClass.avgScore - bottomClass.avgScore;

      if (gap > 10) {
        keyFindings.push({
          id: "finding-classgap",
          severity: gap > 15 ? "high" : "medium",
          category: "comparison",
          message: `班级间差异显著，最高分班级(${topClass.className})与最低分班级(${bottomClass.className})相差${gap.toFixed(1)}分`,
          data: { topClass, bottomClass, gap },
          relatedCharts: ["ClassComparisonChart"],
          actionRequired: gap > 15,
        });
      }
    }

    // 3. 优秀率分析
    if (summary.excellentRate >= 15) {
      keyFindings.push({
        id: "finding-excellent",
        severity: "low",
        category: "excellence",
        message: `优秀率达${summary.excellentRate.toFixed(1)}%，整体表现良好`,
        data: { excellentRate: summary.excellentRate },
        relatedCharts: ["ScoreDistributionChart"],
        actionRequired: false,
      });
    }

    const recommendations: Recommendation[] = [
      {
        id: "rec-1",
        category: "教学改进",
        title: "加强薄弱班级辅导",
        description: "针对平均分较低的班级，开展专题辅导和个性化教学",
        targetGroup: "薄弱班级",
        aiGenerated: false,
      },
      {
        id: "rec-2",
        category: "学生辅导",
        title: "关注学困生群体",
        description: "建立学困生档案，安排一对一辅导",
        targetGroup: "学困生",
        aiGenerated: false,
      },
    ];

    const warnings: Warning[] = [];
    const failedCount = Math.round(
      (summary.totalStudents * (100 - summary.passRate)) / 100
    );
    if (failedCount > 0) {
      warnings.push({
        id: "warning-failed",
        severity: failedCount > 20 ? "high" : "medium",
        message: `${failedCount}名学生成绩不及格，需要重点关注`,
        affectedStudents: failedCount,
        relatedMetrics: [
          {
            metric: "及格率",
            value: summary.passRate,
            threshold: 85,
          },
        ],
      });
    }

    return {
      keyFindings,
      recommendations,
      warnings,
      summary: `本次考试共有${summary.totalStudents}名学生参加，平均分为${summary.averageScore.toFixed(1)}分，及格率${summary.passRate.toFixed(1)}%。${
        summary.classSummaries.length > 0
          ? `表现最好的班级是${summary.classSummaries[0].className}（${summary.classSummaries[0].avgScore.toFixed(1)}分）。`
          : ""
      }建议重点关注学困生群体，加强薄弱环节的教学。`,
      confidence: 0.6,
      generatedAt: new Date(),
      modelUsed: "Default Analysis",
    };
  }
}

// 导出单例
export const aiReportAnalyzer = new AIReportAnalyzer();
