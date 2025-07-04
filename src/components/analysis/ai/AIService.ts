/**
 * 🤖 真AI分析服务
 * 集成豆包等AI服务，提供真正的智能分析能力
 */

import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { getAllProviders, getProviderConfig } from "@/services/aiProviderManager";
import { EnhancedAIClient } from "@/services/enhancedAIClient";

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  exam_date?: string;
  exam_title?: string;
  grade?: string;              // 等级（用户上传的原始等级数据）
  exam_type?: string;
  rank_in_class?: number;
  rank_in_grade?: number;
}

interface AIAnalysisRequest {
  type: 'class_diagnosis' | 'student_guidance';
  data: GradeRecord[];
  options?: {
    focus?: string;
    detail_level?: 'basic' | 'detailed' | 'comprehensive';
  };
}

interface AIClassDiagnosis {
  overall_assessment: {
    level: string;
    description: string;
    confidence: number;
  };
  subject_analysis: Array<{
    subject: string;
    strengths: string[];
    weaknesses: string[];
    teaching_suggestions: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
  management_insights: Array<{
    category: string;
    insight: string;
    recommendation: string;
    impact_level: number;
  }>;
  action_plan: {
    immediate_actions: string[];
    long_term_strategies: string[];
    success_metrics: string[];
  };
}

interface AIStudentGuidance {
  students: Array<{
    student_id: string;
    name: string;
    learning_pattern: {
      type: string;
      description: string;
      confidence: number;
    };
    personalized_plan: {
      goals: string[];
      methods: string[];
      timeline: string;
      expected_outcome: string;
    };
    priority_level: 'urgent' | 'important' | 'normal' | 'maintain';
  }>;
  summary: {
    total_analyzed: number;
    patterns_identified: string[];
    overall_recommendations: string[];
  };
}

export class AIAnalysisService {
  private static instance: AIAnalysisService;
  private aiClient: EnhancedAIClient | null = null;
  private isConfigured: boolean = false;

  private constructor() {
    this.initializeAIClient();
  }

  public static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService();
    }
    return AIAnalysisService.instance;
  }

  /**
   * 初始化AI客户端，使用用户配置的豆包等AI服务
   */
  private async initializeAIClient() {
    try {
      // 获取用户的AI配置
      const userConfig = await getUserAIConfig();
      
      // 从UserAIConfig中获取正确的字段
      const providerId = userConfig?.provider;
      const modelId = userConfig?.model || userConfig?.version; // 优先使用model，如果没有则使用version
      
      // 获取对应提供商的API密钥
      const apiKey = providerId ? await getUserAPIKey(providerId) : null;

      if (!apiKey || !providerId || !modelId) {
        console.warn('⚠️ AI服务：未找到用户AI配置，将使用基于实际数据的模拟分析');
        console.info('💡 提示：请在AI设置页面配置您的AI服务（支持豆包、OpenAI等）');
        console.debug('配置详情:', { apiKey: !!apiKey, providerId, modelId, userConfig });
        this.isConfigured = false;
        return;
      }

      // 获取提供商配置
      const providerConfig = getProviderConfig(providerId);
      if (!providerConfig) {
        console.error(`❌ 未找到提供商配置: ${providerId}`);
        this.isConfigured = false;
        return;
      }

      // 创建AI客户端
      this.aiClient = new EnhancedAIClient(
        apiKey,
        providerId,
        modelId,
        true // 启用调试模式
      );

      this.isConfigured = true;
      console.info(`🚀 AI服务：已配置 ${providerConfig.name} (${modelId})`);
      
    } catch (error) {
      console.error('AI客户端初始化失败:', error);
      this.isConfigured = false;
    }
  }

  /**
   * 重新初始化AI服务（当用户更改AI配置后调用）
   */
  public async refreshAIConfig() {
    await this.initializeAIClient();
  }

  /**
   * 获取AI服务状态
   */
  public getAIStatus() {
    return {
      isConfigured: this.isConfigured,
      hasClient: !!this.aiClient
    };
  }

  /**
   * 班级AI诊断 - 调用真实AI服务
   */
  async analyzeClass(gradeData: GradeRecord[]): Promise<AIClassDiagnosis> {
    try {
      // 准备AI分析的数据
      const analysisPrompt = this.buildClassAnalysisPrompt(gradeData);
      
      // 调用AI服务
      const response = await this.callAIService({
        prompt: analysisPrompt,
        type: 'class_diagnosis',
        max_tokens: 4000, // 增加输出空间
        temperature: 0.3 // 较低的温度确保分析的稳定性
      });

      // 解析AI返回的结果
      return this.parseClassDiagnosis(response, gradeData);
    } catch (error) {
      console.error('AI班级诊断失败:', error);
      console.warn('🔄 降级使用基于实际数据的模拟分析');
      
      // 降级到基于实际数据的模拟分析
      const mockResponse = this.generateClassAnalysis(gradeData);
      return JSON.parse(mockResponse);
    }
  }

  /**
   * 学生AI指导 - 调用真实AI服务
   */
  async analyzeStudents(gradeData: GradeRecord[]): Promise<AIStudentGuidance> {
    try {
      const analysisPrompt = this.buildStudentAnalysisPrompt(gradeData);
      
      const response = await this.callAIService({
        prompt: analysisPrompt,
        type: 'student_guidance',
        max_tokens: 4000,
        temperature: 0.2
      });

      return this.parseStudentGuidance(response);
    } catch (error) {
      console.error('AI学生指导失败:', error);
      console.warn('🔄 降级使用基于实际数据的学生模拟分析');
      
      // 降级到基于实际数据的模拟分析
      const mockResponse = this.generateStudentAnalysis(gradeData);
      return JSON.parse(mockResponse);
    }
  }

  /**
   * 构建班级分析的AI提示词（优化版本，避免token超限）
   */
  private buildClassAnalysisPrompt(gradeData: GradeRecord[]): string {
    const classStats = this.calculateClassStats(gradeData);
    
    // 生成简化的数据摘要而不是完整的原始数据
    const dataSummary = this.generateDataSummary(gradeData, classStats);
    
    return `
你是一位资深的教育AI专家，请基于以下班级成绩数据进行深度分析：

【班级基本情况】
- 学生人数: ${classStats.studentCount}
- 科目数量: ${classStats.subjectCount}
- 平均分: ${classStats.averageScore.toFixed(1)}
- 及格率: ${classStats.passRate.toFixed(1)}%

【数据摘要】
${dataSummary}

请以JSON格式返回分析结果：
{
  "overall_assessment": {
    "level": "班级水平等级",
    "description": "详细描述",
    "confidence": 0.8
  },
  "subject_analysis": [
    {
      "subject": "科目名称",
      "strengths": ["优势1", "优势2"],
      "weaknesses": ["弱点1", "弱点2"],
      "teaching_suggestions": ["建议1", "建议2"],
      "priority": "high/medium/low"
    }
  ],
  "management_insights": [
    {
      "category": "洞察类别",
      "insight": "发现的问题或机会",
      "recommendation": "具体建议",
      "impact_level": 8
    }
  ],
  "action_plan": {
    "immediate_actions": ["立即行动1", "立即行动2"],
    "long_term_strategies": ["长期策略1", "长期策略2"],
    "success_metrics": ["成功指标1", "成功指标2"]
  }
}

请确保分析基于实际数据，给出专业且可操作的建议。
`;
  }

  /**
   * 构建学生分析的AI提示词（优化版本）
   */
  private buildStudentAnalysisPrompt(gradeData: GradeRecord[]): string {
    // 生成学生数据摘要
    const studentSummary = this.generateStudentSummary(gradeData);
    
    return `
你是一位个性化学习AI顾问，请分析以下学生成绩数据，为每个学生提供个性化指导：

【学生成绩摘要】
${studentSummary}

请以JSON格式返回分析结果：
{
  "students": [
    {
      "student_id": "学生ID",
      "name": "学生姓名",
      "learning_pattern": {
        "type": "学习模式类型",
        "description": "详细描述",
        "confidence": 0.8
      },
      "personalized_plan": {
        "goals": ["目标1", "目标2"],
        "methods": ["方法1", "方法2"],
        "timeline": "时间安排",
        "expected_outcome": "预期效果"
      },
      "priority_level": "urgent/important/normal/maintain"
    }
  ],
  "summary": {
    "total_analyzed": 30,
    "patterns_identified": ["模式1", "模式2"],
    "overall_recommendations": ["建议1", "建议2"]
  }
}

请基于真实数据分析，为每个学生提供切实可行的个性化建议。
`;
  }

  /**
   * 调用AI服务的核心方法（使用用户配置的豆包等AI服务）
   */
  private async callAIService(params: {
    prompt: string;
    type: string;
    max_tokens: number;
    temperature: number;
  }): Promise<string> {
    
    // 如果AI未配置，使用基于实际数据的智能模拟分析
    if (!this.isConfigured || !this.aiClient) {
      console.warn('⚠️ AI服务：未配置AI服务，使用基于实际数据的模拟分析');
      console.info('💡 提示：请在AI设置页面配置您的AI服务（支持豆包、OpenAI等）');
      return this.getDataBasedMockResponse(params.type, params.prompt);
    }

    try {
      console.info('🚀 AI服务：使用用户配置的AI服务进行分析');
      
      const response = await this.aiClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `你是一位专业的教育数据分析AI专家，具有丰富的教学经验和数据分析能力。

重要要求：
1. 必须以纯JSON格式返回分析结果
2. 不要包含任何markdown标记（如\`\`\`json）
3. 不要包含任何解释性文字，只返回JSON
4. 确保JSON格式正确，可以直接被JSON.parse()解析
5. 所有字符串值用双引号包围`
          },
          {
            role: 'user',
            content: params.prompt + '\n\n请严格按照JSON格式返回，不要添加任何markdown标记或解释文字。'
          }
        ],
        max_tokens: params.max_tokens,
        temperature: params.temperature
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI返回内容为空');
      }

      return content;
    } catch (error) {
      console.error('🔥 AI服务调用失败:', error);
      console.warn('⚠️ 降级使用基于实际数据的模拟分析');
      // 降级到智能模拟数据
      return this.getDataBasedMockResponse(params.type, params.prompt);
    }
  }

  /**
   * 基于实际数据的智能模拟分析（当AI服务不可用时使用）
   */
  private getDataBasedMockResponse(type: string, prompt: string): string {
    // 从提示词中提取实际数据进行分析
    const dataMatch = prompt.match(/【详细成绩数据】\s*([\s\S]*?)(?=请从以下角度|请为每个学生)/);
    let gradeData = [];
    
    if (dataMatch) {
      try {
        gradeData = JSON.parse(dataMatch[1]);
      } catch (error) {
        console.warn('无法解析成绩数据，使用默认模拟数据');
      }
    }

    if (type === 'class_diagnosis') {
      return this.generateClassAnalysis(gradeData);
    } else {
      return this.generateStudentAnalysis(gradeData);
    }
  }

  /**
   * 生成基于实际数据的班级分析
   */
  private generateClassAnalysis(gradeData: any[]): string {
    const stats = this.calculateClassStats(gradeData);
    
    // 基于实际数据生成分析
    let level = '待提高';
    let description = '';
    let confidence = 0.75;

    if (stats.averageScore >= 85 && stats.passRate >= 90) {
      level = '优秀';
      description = `班级整体表现优异，平均分达到${stats.averageScore.toFixed(1)}分，及格率高达${stats.passRate.toFixed(1)}%，学生基础扎实，学习氛围浓厚`;
      confidence = 0.9;
    } else if (stats.averageScore >= 75 && stats.passRate >= 80) {
      level = '良好';
      description = `班级表现稳定向好，平均分${stats.averageScore.toFixed(1)}分，及格率${stats.passRate.toFixed(1)}%，仍有提升空间，需要重点关注薄弱环节`;
      confidence = 0.85;
    } else if (stats.averageScore >= 65 && stats.passRate >= 70) {
      level = '中等';
      description = `班级成绩处于中等水平，平均分${stats.averageScore.toFixed(1)}分，及格率${stats.passRate.toFixed(1)}%，需要系统性改进教学策略`;
      confidence = 0.8;
    } else {
      level = '需要改进';
      description = `班级整体成绩偏低，平均分仅${stats.averageScore.toFixed(1)}分，及格率${stats.passRate.toFixed(1)}%，需要立即采取干预措施`;
      confidence = 0.85;
    }

    // 动态生成科目分析
    const subjects = [...new Set(gradeData.map((r: any) => r.subject).filter(Boolean))];
    const subjectAnalysis = subjects.slice(0, 3).map(subject => {
      const subjectRecords = gradeData.filter((r: any) => r.subject === subject);
      const subjectAvg = subjectRecords.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / subjectRecords.length;
      
      return {
        subject,
        strengths: subjectAvg >= 75 ? ['学生基础较好', '理解能力强'] : ['部分学生表现积极'],
        weaknesses: subjectAvg < 70 ? ['基础知识需要巩固', '学习方法需要改进'] : ['少数学生需要关注'],
        teaching_suggestions: [
          '针对薄弱环节加强练习',
          '实施分层教学',
          subjectAvg < 70 ? '增加基础知识训练' : '适当增加挑战性内容'
        ],
        priority: subjectAvg < 60 ? 'high' : subjectAvg < 75 ? 'medium' : 'low'
      };
    });

    return JSON.stringify({
      overall_assessment: { level, description, confidence },
      subject_analysis: subjectAnalysis,
      management_insights: [
        {
          category: '学习状态',
          insight: stats.passRate < 70 ? '班级学习状态需要改善，存在学困生较多的情况' : '班级整体学习状态良好',
          recommendation: stats.passRate < 70 ? '建立学困生帮扶机制，加强个别辅导' : '保持现有教学节奏，适度增加挑战',
          impact_level: stats.passRate < 70 ? 9 : 7
        },
        {
          category: '教学策略',
          insight: `当前平均分${stats.averageScore.toFixed(1)}分，${stats.averageScore >= 80 ? '可以考虑提升教学难度' : '需要加强基础教学'}`,
          recommendation: stats.averageScore >= 80 ? '引入拓展内容，培养学生高阶思维' : '回归基础教学，确保知识掌握扎实',
          impact_level: 8
        }
      ],
      action_plan: {
        immediate_actions: [
          stats.passRate < 70 ? '立即识别学困生并制定帮扶计划' : '维持现有教学进度',
          '开展班级学习状态调研',
          '建立家校沟通机制'
        ],
        long_term_strategies: [
          '建立学生成长档案',
          '实施个性化教学方案',
          '定期进行教学效果评估'
        ],
        success_metrics: [
          `及格率提升至${Math.min(95, stats.passRate + 10).toFixed(0)}%`,
          `平均分提升至${(stats.averageScore + 5).toFixed(0)}分`,
          '学困生比例控制在10%以下'
        ]
      }
    });
  }

  /**
   * 生成基于实际数据的学生分析
   */
  private generateStudentAnalysis(gradeData: any[]): string {
    const studentGroups = gradeData.reduce((acc: any, record: any) => {
      const key = record.student_id;
      if (!acc[key]) {
        acc[key] = {
          studentId: key,
          name: record.name,
          scores: []
        };
      }
      if (record.score) {
        acc[key].scores.push(record.score);
      }
      return acc;
    }, {});

    const students = Object.values(studentGroups).slice(0, 5).map((student: any) => {
      const avgScore = student.scores.reduce((sum: number, s: number) => sum + s, 0) / student.scores.length;
      const maxScore = Math.max(...student.scores);
      const minScore = Math.min(...student.scores);
      const scoreRange = maxScore - minScore;

      // 基于实际数据判断学习模式
      let pattern = {
        type: '稳定型',
        description: '成绩表现相对稳定',
        confidence: 0.8
      };

      if (scoreRange > 20) {
        pattern = {
          type: '波动型',
          description: `成绩波动较大，分数区间${minScore}-${maxScore}，需要稳定学习状态`,
          confidence: 0.85
        };
      } else if (avgScore >= 85) {
        pattern = {
          type: '优秀稳定型',
          description: `成绩优异且稳定，平均分${avgScore.toFixed(1)}分，是班级的学习标杆`,
          confidence: 0.9
        };
      } else if (avgScore < 60) {
        pattern = {
          type: '需要关注型',
          description: `平均分${avgScore.toFixed(1)}分，需要重点关注和个性化辅导`,
          confidence: 0.88
        };
      }

      // 基于成绩生成个性化计划
      const plan = {
        goals: avgScore >= 80 ? ['保持优势', '挑战更高目标'] : avgScore >= 60 ? ['稳步提升', '巩固基础'] : ['重点突破', '基础强化'],
        methods: avgScore >= 80 ? ['拓展练习', '难题挑战'] : avgScore >= 60 ? ['系统复习', '错题整理'] : ['一对一辅导', '基础训练'],
        timeline: avgScore >= 80 ? '短期内冲刺满分' : avgScore >= 60 ? '1-2个月显著提升' : '需要3个月以上持续改进',
        expected_outcome: avgScore >= 80 ? `预计可稳定在${Math.min(100, avgScore + 5).toFixed(0)}分以上` : 
                          avgScore >= 60 ? `预计可提升至${(avgScore + 10).toFixed(0)}分` : 
                          `预计可提升至及格线${Math.max(60, avgScore + 15).toFixed(0)}分`
      };

      const priority = avgScore < 60 ? 'urgent' : avgScore < 70 ? 'important' : avgScore < 85 ? 'normal' : 'maintain';

      return {
        student_id: student.studentId,
        name: student.name,
        learning_pattern: pattern,
        personalized_plan: plan,
        priority_level: priority
      };
    });

    const patterns = [...new Set(students.map(s => s.learning_pattern.type))];
    
    return JSON.stringify({
      students,
      summary: {
        total_analyzed: Object.keys(studentGroups).length,
        patterns_identified: patterns,
        overall_recommendations: [
          '基于学生实际表现实施分层教学',
          '重点关注波动型和需要关注型学生',
          '发挥优秀学生的带动作用',
          '建立学习小组互助机制'
        ]
      }
    });
  }

  /**
   * 原有的简单模拟数据（保留作为备用）
   */
  private getMockResponse(type: string): string {
    if (type === 'class_diagnosis') {
      return JSON.stringify({
        overall_assessment: {
          level: "良好",
          description: "班级整体表现处于中上水平，具有较大提升潜力",
          confidence: 0.85
        },
        subject_analysis: [
          {
            subject: "数学",
            strengths: ["逻辑思维能力强", "基础运算扎实"],
            weaknesses: ["应用题理解有待提高", "几何证明薄弱"],
            teaching_suggestions: ["增加应用题练习", "加强几何直观教学", "建立错题本制度"],
            priority: "high"
          }
        ],
        management_insights: [
          {
            category: "学习氛围",
            insight: "班级学习积极性较高，但存在两极分化",
            recommendation: "建立学习小组，发挥优等生带动作用",
            impact_level: 8
          }
        ],
        action_plan: {
          immediate_actions: ["建立学习小组", "制定个性化辅导计划"],
          long_term_strategies: ["建立长期跟踪机制", "家校合作加强"],
          success_metrics: ["及格率提升至85%", "优秀率达到30%"]
        }
      });
    } else {
      return JSON.stringify({
        students: [
          {
            student_id: "001",
            name: "学生A",
            learning_pattern: {
              type: "稳步提升型",
              description: "成绩呈现稳定上升趋势，学习方法得当",
              confidence: 0.9
            },
            personalized_plan: {
              goals: ["保持现有学习节奏", "挑战更高难度题目"],
              methods: ["增加拓展练习", "参与学科竞赛"],
              timeline: "短期内保持，长期可冲刺优秀",
              expected_outcome: "预计可提升10-15分"
            },
            priority_level: "normal"
          }
        ],
        summary: {
          total_analyzed: 30,
          patterns_identified: ["稳步提升型", "波动型", "需要关注型"],
          overall_recommendations: ["实施分层教学", "加强个性化指导"]
        }
      });
    }
  }

  /**
   * 解析班级诊断结果
   */
  private parseClassDiagnosis(response: string, gradeData?: GradeRecord[]): AIClassDiagnosis {
    try {
      console.log('🔍 AI原始响应:', response);
      
      // 清理响应内容，移除可能的markdown标记和多余空白
      let cleanResponse = response.trim();
      
      // 移除可能的markdown代码块标记
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // 再次清理
      cleanResponse = cleanResponse.trim();
      
      console.log('🧹 清理后的响应:', cleanResponse);
      
      // 尝试解析JSON
      const parsed = JSON.parse(cleanResponse);
      
      // 验证必要字段
      if (!parsed.overall_assessment || !parsed.subject_analysis || !parsed.action_plan) {
        console.warn('⚠️ AI响应缺少必要字段，使用模拟数据');
        throw new Error('AI响应格式不完整');
      }
      
      return parsed;
    } catch (error) {
      console.error('解析AI班级诊断结果失败:', error);
      console.log('📄 原始响应内容:', response);
      
      // 如果解析失败，返回基于实际数据的模拟分析结果
      console.warn('🔄 JSON解析失败，降级到模拟分析');
      const fallbackData = gradeData || [];
      const fallbackResponse = this.generateClassAnalysis(fallbackData);
      return JSON.parse(fallbackResponse);
    }
  }

  /**
   * 解析学生指导结果
   */
  private parseStudentGuidance(response: string): AIStudentGuidance {
    try {
      console.log('🔍 AI学生分析原始响应:', response);
      
      // 清理响应内容
      let cleanResponse = response.trim();
      
      // 移除可能的markdown代码块标记
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      cleanResponse = cleanResponse.trim();
      console.log('🧹 清理后的学生分析响应:', cleanResponse);
      
      const parsed = JSON.parse(cleanResponse);
      
      // 验证必要字段
      if (!parsed.students || !parsed.summary) {
        console.warn('⚠️ AI学生分析响应缺少必要字段，使用模拟数据');
        throw new Error('AI学生分析响应格式不完整');
      }
      
      return parsed;
    } catch (error) {
      console.error('解析AI学生指导结果失败:', error);
      console.log('📄 学生分析原始响应内容:', response);
      throw new Error('AI分析结果格式错误');
    }
  }

  /**
   * 生成简化的数据摘要，避免发送完整原始数据
   */
  private generateDataSummary(gradeData: GradeRecord[], classStats: any): string {
    // 按科目分组统计
    const subjectStats = gradeData.reduce((acc, record) => {
      const subject = record.subject || '未知科目';
      const score = record.score || 0;
      const grade = record.grade || '';
      
      if (!acc[subject]) {
        acc[subject] = {
          scores: [],
          grades: [],
          count: 0
        };
      }
      
      if (score > 0) {
        acc[subject].scores.push(score);
      }
      if (grade) {
        acc[subject].grades.push(grade);
      }
      acc[subject].count++;
      
      return acc;
    }, {} as Record<string, any>);

    // 生成每个科目的摘要
    const subjectSummaries = Object.entries(subjectStats).map(([subject, stats]) => {
      const scores = stats.scores;
      const avgScore = scores.length > 0 ? (scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length) : 0;
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
      const minScore = scores.length > 0 ? Math.min(...scores) : 0;
      const passCount = scores.filter((s: number) => s >= 60).length;
      const passRate = scores.length > 0 ? (passCount / scores.length * 100) : 0;
      
      // 等级分布
      const gradeDistribution = stats.grades.reduce((acc: Record<string, number>, grade: string) => {
        acc[grade] = (acc[grade] || 0) + 1;
        return acc;
      }, {});
      
      return `${subject}: 平均${avgScore.toFixed(1)}分, 及格率${passRate.toFixed(1)}%, 分数范围${minScore}-${maxScore}, 等级分布${JSON.stringify(gradeDistribution)}`;
    });

    // 学生表现分布
    const studentScores = gradeData.reduce((acc, record) => {
      const studentId = record.student_id;
      if (!acc[studentId]) {
        acc[studentId] = [];
      }
      if (record.score && record.score > 0) {
        acc[studentId].push(record.score);
      }
      return acc;
    }, {} as Record<string, number[]>);

    const studentAvgs = Object.values(studentScores).map(scores => 
      scores.reduce((sum, s) => sum + s, 0) / scores.length
    );

    const excellentCount = studentAvgs.filter(avg => avg >= 90).length;
    const goodCount = studentAvgs.filter(avg => avg >= 80 && avg < 90).length;
    const averageCount = studentAvgs.filter(avg => avg >= 60 && avg < 80).length;
    const poorCount = studentAvgs.filter(avg => avg < 60).length;

    return `
各科目统计:
${subjectSummaries.join('\n')}

学生整体表现分布:
- 优秀(90+): ${excellentCount}人
- 良好(80-89): ${goodCount}人  
- 中等(60-79): ${averageCount}人
- 需要提升(<60): ${poorCount}人
`;
  }

  /**
   * 生成学生数据摘要，避免发送完整原始数据
   */
  private generateStudentSummary(gradeData: GradeRecord[]): string {
    // 按学生分组
    const studentGroups = gradeData.reduce((acc, record) => {
      const studentId = record.student_id;
      const name = record.name || studentId;
      
      if (!acc[studentId]) {
        acc[studentId] = {
          name,
          scores: [],
          subjects: [],
          grades: []
        };
      }
      
      if (record.score && record.score > 0) {
        acc[studentId].scores.push(record.score);
      }
      if (record.subject) {
        acc[studentId].subjects.push(record.subject);
      }
      if (record.grade) {
        acc[studentId].grades.push(record.grade);
      }
      
      return acc;
    }, {} as Record<string, any>);

    // 生成每个学生的摘要（限制数量避免过长）
    const studentSummaries = Object.entries(studentGroups)
      .slice(0, 10) // 只取前10个学生避免过长
      .map(([studentId, data]) => {
        const avgScore = data.scores.length > 0 
          ? (data.scores.reduce((sum: number, s: number) => sum + s, 0) / data.scores.length)
          : 0;
        const maxScore = data.scores.length > 0 ? Math.max(...data.scores) : 0;
        const minScore = data.scores.length > 0 ? Math.min(...data.scores) : 0;
        const scoreRange = maxScore - minScore;
        const subjectCount = new Set(data.subjects).size;
        
        // 等级分布
        const gradeCount = data.grades.reduce((acc: Record<string, number>, grade: string) => {
          acc[grade] = (acc[grade] || 0) + 1;
          return acc;
        }, {});
        
        return `${data.name}(${studentId}): 平均${avgScore.toFixed(1)}分, 波动${scoreRange}分, ${subjectCount}科, 等级${JSON.stringify(gradeCount)}`;
      });

    const totalStudents = Object.keys(studentGroups).length;
    const displayedCount = Math.min(10, totalStudents);
    
    return `
学生表现摘要 (显示前${displayedCount}/${totalStudents}人):
${studentSummaries.join('\n')}

${totalStudents > 10 ? `\n注：还有${totalStudents - 10}名学生，基于所有学生数据进行分析。` : ''}
`;
  }

  /**
   * 计算班级基础统计数据
   */
  private calculateClassStats(gradeData: GradeRecord[]) {
    const studentCount = new Set(gradeData.map(r => r.student_id)).size;
    const subjectCount = new Set(gradeData.map(r => r.subject)).size;
    const validScores = gradeData.map(r => r.score || 0).filter(s => s > 0);
    const averageScore = validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
    const passRate = (validScores.filter(s => s >= 60).length / validScores.length) * 100;

    return {
      studentCount,
      subjectCount,
      averageScore,
      passRate
    };
  }
}

export default AIAnalysisService;