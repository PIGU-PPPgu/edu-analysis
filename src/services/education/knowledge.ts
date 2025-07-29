/**
 * 知识点管理服务 - 统一知识点业务逻辑
 *
 * 功能：
 * - 知识点创建和管理
 * - 学生掌握度追踪
 * - 知识点关联分析
 * - 学习路径推荐
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { dataCache } from "../core/cache";
import { aiOrchestrator } from "../ai/orchestrator";
import type { APIResponse } from "../core/api";
import type { KnowledgePoint } from "@/types/homework";

export interface KnowledgePointRecord {
  id: string;
  homework_id: string;
  name: string;
  description?: string;
  category?: string;
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  prerequisites?: string[];
  related_points?: string[];
  created_at: string;
}

export interface StudentMastery {
  id: string;
  student_id: string;
  knowledge_point_id: string;
  homework_id: string;
  submission_id: string;
  mastery_level: number; // 0-100
  mastery_grade: "A" | "B" | "C" | "D" | "E";
  assessment_count: number;
  comments?: string;
  last_assessed: string;
}

export interface KnowledgePointAnalysis {
  knowledge_point: KnowledgePointRecord;
  overall_mastery: {
    average_level: number;
    mastery_distribution: Array<{
      grade: string;
      count: number;
      percentage: number;
    }>;
    difficulty_assessment: "easy" | "medium" | "hard";
  };
  student_performance: Array<{
    student_id: string;
    student_name: string;
    mastery_level: number;
    mastery_grade: string;
    improvement_trend: "improving" | "stable" | "declining";
    last_assessed: string;
  }>;
  learning_recommendations: Array<{
    target_group: "struggling" | "average" | "advanced";
    recommendation: string;
  }>;
}

export interface LearningPath {
  student_id: string;
  current_level: number;
  recommended_sequence: Array<{
    knowledge_point_id: string;
    name: string;
    priority: "high" | "medium" | "low";
    estimated_time: number; // 预估学习时间（分钟）
    reason: string;
  }>;
  adaptive_suggestions: Array<{
    type: "review" | "advance" | "practice";
    content: string;
    difficulty: number;
  }>;
}

export interface KnowledgeGraph {
  nodes: Array<{
    id: string;
    name: string;
    category: string;
    mastery_rate: number;
    difficulty: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relationship: "prerequisite" | "related" | "builds_on";
    strength: number;
  }>;
}

/**
 * 知识点管理服务类
 */
export class KnowledgeService {
  private readonly cachePrefix = "knowledge_";
  private readonly cacheTTL = 30 * 60 * 1000; // 30分钟

  /**
   * 创建知识点
   */
  async createKnowledgePoint(
    data: Omit<KnowledgePointRecord, "id" | "created_at">
  ): Promise<APIResponse<KnowledgePointRecord>> {
    try {
      logInfo("创建知识点", { name: data.name, homework_id: data.homework_id });

      // 验证数据
      const validation = this.validateKnowledgePointData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      // 检查重复
      const existingResponse = await apiClient.query("knowledge_points", {
        filters: {
          homework_id: data.homework_id,
          name: data.name,
        },
        limit: 1,
      });

      if (existingResponse.success && existingResponse.data?.length) {
        return {
          success: false,
          error: "该作业中已存在同名知识点",
        };
      }

      // 创建知识点记录
      const response = await apiClient.insert<KnowledgePointRecord>(
        "knowledge_points",
        {
          ...data,
          created_at: new Date().toISOString(),
        }
      );

      if (response.success) {
        const knowledgePoint = Array.isArray(response.data)
          ? response.data[0]
          : response.data;

        // 清除相关缓存
        this.clearKnowledgeCache(data.homework_id);

        return { success: true, data: knowledgePoint };
      }

      return {
        success: false,
        error: response.error || "创建知识点失败",
      };
    } catch (error) {
      logError("创建知识点失败", error);
      return {
        success: false,
        error: error.message || "创建知识点失败",
      };
    }
  }

  /**
   * 获取作业的知识点列表
   */
  async getHomeworkKnowledgePoints(
    homeworkId: string
  ): Promise<APIResponse<KnowledgePointRecord[]>> {
    try {
      logInfo("获取作业知识点列表", { homeworkId });

      const cacheKey = `${this.cachePrefix}homework_${homeworkId}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const response = await apiClient.query<KnowledgePointRecord>(
        "knowledge_points",
        {
          filters: { homework_id: homeworkId },
          orderBy: [{ column: "created_at", ascending: true }],
        }
      );

      if (response.success && response.data) {
        dataCache.set(cacheKey, response.data, this.cacheTTL);
      }

      return response;
    } catch (error) {
      logError("获取作业知识点列表失败", { homeworkId, error });
      return {
        success: false,
        error: error.message || "获取知识点列表失败",
      };
    }
  }

  /**
   * 记录学生掌握度
   */
  async recordStudentMastery(
    masteryData: Omit<StudentMastery, "id" | "last_assessed">
  ): Promise<APIResponse<StudentMastery>> {
    try {
      logInfo("记录学生掌握度", {
        student_id: masteryData.student_id,
        knowledge_point_id: masteryData.knowledge_point_id,
        mastery_level: masteryData.mastery_level,
      });

      // 检查是否已存在记录
      const existingResponse = await apiClient.query<StudentMastery>(
        "student_knowledge_mastery",
        {
          filters: {
            student_id: masteryData.student_id,
            knowledge_point_id: masteryData.knowledge_point_id,
            homework_id: masteryData.homework_id,
          },
          limit: 1,
        }
      );

      let mastery: StudentMastery;

      if (existingResponse.success && existingResponse.data?.length) {
        // 更新现有记录
        const existing = existingResponse.data[0];
        const updateData = {
          ...masteryData,
          assessment_count: existing.assessment_count + 1,
          last_assessed: new Date().toISOString(),
        };

        const updateResponse = await apiClient.update<StudentMastery>(
          "student_knowledge_mastery",
          existing.id,
          updateData
        );

        if (!updateResponse.success) {
          return {
            success: false,
            error: updateResponse.error || "更新掌握度记录失败",
          };
        }

        mastery = { ...existing, ...updateResponse.data };
      } else {
        // 创建新记录
        const createResponse = await apiClient.insert<StudentMastery>(
          "student_knowledge_mastery",
          {
            ...masteryData,
            assessment_count: 1,
            last_assessed: new Date().toISOString(),
          }
        );

        if (!createResponse.success || !createResponse.data) {
          return {
            success: false,
            error: createResponse.error || "创建掌握度记录失败",
          };
        }

        mastery = Array.isArray(createResponse.data)
          ? createResponse.data[0]
          : createResponse.data;
      }

      // 清除相关缓存
      this.clearMasteryCache(
        masteryData.student_id,
        masteryData.knowledge_point_id
      );

      return { success: true, data: mastery };
    } catch (error) {
      logError("记录学生掌握度失败", error);
      return {
        success: false,
        error: error.message || "记录掌握度失败",
      };
    }
  }

  /**
   * 获取学生知识点掌握情况
   */
  async getStudentMastery(
    studentId: string,
    options: {
      homeworkId?: string;
      knowledgePointId?: string;
      includeHistory?: boolean;
    } = {}
  ): Promise<APIResponse<StudentMastery[]>> {
    try {
      logInfo("获取学生知识点掌握情况", { studentId, options });

      const cacheKey = `${this.cachePrefix}mastery_${studentId}_${JSON.stringify(options)}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const filters: any = { student_id: studentId };
      if (options.homeworkId) filters.homework_id = options.homeworkId;
      if (options.knowledgePointId)
        filters.knowledge_point_id = options.knowledgePointId;

      const response = await apiClient.query<StudentMastery>(
        "student_knowledge_mastery",
        {
          filters,
          orderBy: [{ column: "last_assessed", ascending: false }],
        }
      );

      if (response.success && response.data) {
        dataCache.set(cacheKey, response.data, this.cacheTTL);
      }

      return response;
    } catch (error) {
      logError("获取学生知识点掌握情况失败", { studentId, error });
      return {
        success: false,
        error: error.message || "获取掌握情况失败",
      };
    }
  }

  /**
   * 分析知识点掌握情况
   */
  async analyzeKnowledgePoint(
    knowledgePointId: string
  ): Promise<APIResponse<KnowledgePointAnalysis>> {
    try {
      logInfo("分析知识点掌握情况", { knowledgePointId });

      const cacheKey = `${this.cachePrefix}analysis_${knowledgePointId}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取知识点信息
      const knowledgePointResponse =
        await apiClient.query<KnowledgePointRecord>("knowledge_points", {
          filters: { id: knowledgePointId },
          limit: 1,
        });

      if (
        !knowledgePointResponse.success ||
        !knowledgePointResponse.data?.length
      ) {
        return {
          success: false,
          error: "未找到知识点信息",
        };
      }

      const knowledge_point = knowledgePointResponse.data[0];

      // 获取所有学生的掌握情况
      const masteryResponse = await apiClient.query<StudentMastery>(
        "student_knowledge_mastery",
        {
          filters: { knowledge_point_id: knowledgePointId },
        }
      );

      if (!masteryResponse.success || !masteryResponse.data?.length) {
        return {
          success: false,
          error: "未找到掌握度数据",
        };
      }

      const masteryRecords = masteryResponse.data;

      // 计算整体掌握情况
      const overall_mastery = this.calculateOverallMastery(masteryRecords);

      // 获取学生表现详情
      const student_performance =
        await this.getStudentPerformanceDetails(masteryRecords);

      // 生成学习建议
      const learning_recommendations =
        await this.generateLearningRecommendations(
          knowledge_point,
          overall_mastery
        );

      const analysis: KnowledgePointAnalysis = {
        knowledge_point,
        overall_mastery,
        student_performance,
        learning_recommendations,
      };

      dataCache.set(cacheKey, analysis, this.cacheTTL);
      return { success: true, data: analysis };
    } catch (error) {
      logError("分析知识点掌握情况失败", { knowledgePointId, error });
      return {
        success: false,
        error: error.message || "知识点分析失败",
      };
    }
  }

  /**
   * 生成学习路径
   */
  async generateLearningPath(
    studentId: string
  ): Promise<APIResponse<LearningPath>> {
    try {
      logInfo("生成学习路径", { studentId });

      const cacheKey = `${this.cachePrefix}path_${studentId}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取学生所有掌握度记录
      const masteryResponse = await this.getStudentMastery(studentId);
      if (!masteryResponse.success || !masteryResponse.data?.length) {
        return {
          success: false,
          error: "未找到学生掌握度数据",
        };
      }

      const masteryRecords = masteryResponse.data;

      // 计算当前整体水平
      const current_level = this.calculateCurrentLevel(masteryRecords);

      // 生成推荐学习序列
      const recommended_sequence = await this.generateRecommendedSequence(
        studentId,
        masteryRecords
      );

      // 生成自适应建议
      const adaptive_suggestions = await this.generateAdaptiveSuggestions(
        studentId,
        masteryRecords
      );

      const learningPath: LearningPath = {
        student_id: studentId,
        current_level,
        recommended_sequence,
        adaptive_suggestions,
      };

      dataCache.set(cacheKey, learningPath, this.cacheTTL);
      return { success: true, data: learningPath };
    } catch (error) {
      logError("生成学习路径失败", { studentId, error });
      return {
        success: false,
        error: error.message || "生成学习路径失败",
      };
    }
  }

  /**
   * 获取知识图谱
   */
  async getKnowledgeGraph(
    scope: {
      homeworkIds?: string[];
      subjectArea?: string;
    } = {}
  ): Promise<APIResponse<KnowledgeGraph>> {
    try {
      logInfo("获取知识图谱", { scope });

      const cacheKey = `${this.cachePrefix}graph_${JSON.stringify(scope)}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 构建查询条件
      const filters: any = {};
      if (scope.homeworkIds && scope.homeworkIds.length > 0) {
        filters.homework_id = { in: scope.homeworkIds };
      }

      // 获取知识点
      const knowledgePointsResponse =
        await apiClient.query<KnowledgePointRecord>("knowledge_points", {
          filters,
        });

      if (
        !knowledgePointsResponse.success ||
        !knowledgePointsResponse.data?.length
      ) {
        return {
          success: false,
          error: "未找到知识点数据",
        };
      }

      const knowledgePoints = knowledgePointsResponse.data;

      // 构建节点
      const nodes = await Promise.all(
        knowledgePoints.map(async (kp) => {
          const masteryRate = await this.getKnowledgePointMasteryRate(kp.id);
          return {
            id: kp.id,
            name: kp.name,
            category: kp.category || "未分类",
            mastery_rate: masteryRate,
            difficulty: kp.difficulty_level,
          };
        })
      );

      // 构建边（关系）
      const edges = this.buildKnowledgeEdges(knowledgePoints);

      const graph: KnowledgeGraph = {
        nodes,
        edges,
      };

      dataCache.set(cacheKey, graph, this.cacheTTL);
      return { success: true, data: graph };
    } catch (error) {
      logError("获取知识图谱失败", { scope, error });
      return {
        success: false,
        error: error.message || "获取知识图谱失败",
      };
    }
  }

  /**
   * AI辅助知识点提取
   */
  async extractKnowledgePointsWithAI(
    content: string,
    subject?: string,
    existingPoints: KnowledgePoint[] = []
  ): Promise<
    APIResponse<
      Array<{
        name: string;
        description: string;
        difficulty_level: number;
        category?: string;
      }>
    >
  > {
    try {
      logInfo("AI辅助知识点提取", {
        contentLength: content.length,
        subject,
        existingCount: existingPoints.length,
      });

      const analysisRequest = {
        type: "analysis" as const,
        content,
        context: {
          existingPoints,
          subject,
        },
        options: {
          enableCache: true,
          temperature: 0.3,
        },
      };

      const response = await aiOrchestrator.process(analysisRequest);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || "AI分析失败",
        };
      }

      // 解析AI返回的知识点数据
      const extractedPoints = this.parseAIKnowledgePoints(response.data);

      return { success: true, data: extractedPoints };
    } catch (error) {
      logError("AI辅助知识点提取失败", error);
      return {
        success: false,
        error: error.message || "AI知识点提取失败",
      };
    }
  }

  /**
   * 批量创建知识点
   */
  async createKnowledgePointsBatch(
    homeworkId: string,
    knowledgePoints: Array<
      Omit<KnowledgePointRecord, "id" | "homework_id" | "created_at">
    >
  ): Promise<APIResponse<{ created: number; errors: string[] }>> {
    try {
      logInfo("批量创建知识点", { homeworkId, count: knowledgePoints.length });

      const errors: string[] = [];
      let created = 0;

      const createData = knowledgePoints.map((kp) => ({
        ...kp,
        homework_id: homeworkId,
        created_at: new Date().toISOString(),
      }));

      // 验证数据
      for (const data of createData) {
        const validation = this.validateKnowledgePointData(data);
        if (!validation.valid) {
          errors.push(`知识点"${data.name}": ${validation.errors.join(", ")}`);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: errors.join("; "),
          data: { created: 0, errors },
        };
      }

      // 批量插入
      const response = await apiClient.insert("knowledge_points", createData);

      if (response.success) {
        created = knowledgePoints.length;
        this.clearKnowledgeCache(homeworkId);
      } else {
        errors.push(response.error || "批量插入失败");
      }

      return {
        success: errors.length === 0,
        data: { created, errors },
        error: errors.length > 0 ? errors.join("; ") : undefined,
      };
    } catch (error) {
      logError("批量创建知识点失败", { homeworkId, error });
      return {
        success: false,
        error: error.message || "批量创建失败",
        data: { created: 0, errors: [error.message] },
      };
    }
  }

  /**
   * 计算整体掌握情况
   */
  private calculateOverallMastery(
    masteryRecords: StudentMastery[]
  ): KnowledgePointAnalysis["overall_mastery"] {
    if (masteryRecords.length === 0) {
      return {
        average_level: 0,
        mastery_distribution: [],
        difficulty_assessment: "medium",
      };
    }

    // 计算平均掌握度
    const average_level =
      masteryRecords.reduce((sum, record) => sum + record.mastery_level, 0) /
      masteryRecords.length;

    // 统计等级分布
    const gradeCount = new Map<string, number>();
    masteryRecords.forEach((record) => {
      const grade = record.mastery_grade;
      gradeCount.set(grade, (gradeCount.get(grade) || 0) + 1);
    });

    const mastery_distribution = Array.from(gradeCount.entries()).map(
      ([grade, count]) => ({
        grade,
        count,
        percentage: Math.round((count / masteryRecords.length) * 10000) / 100,
      })
    );

    // 评估难度
    const excellentRate =
      ((gradeCount.get("A") || 0) + (gradeCount.get("B") || 0)) /
      masteryRecords.length;
    let difficulty_assessment: "easy" | "medium" | "hard";

    if (excellentRate >= 0.7) difficulty_assessment = "easy";
    else if (excellentRate >= 0.4) difficulty_assessment = "medium";
    else difficulty_assessment = "hard";

    return {
      average_level: Math.round(average_level * 100) / 100,
      mastery_distribution,
      difficulty_assessment,
    };
  }

  /**
   * 获取学生表现详情
   */
  private async getStudentPerformanceDetails(
    masteryRecords: StudentMastery[]
  ): Promise<KnowledgePointAnalysis["student_performance"]> {
    const studentPerformance = [];

    for (const record of masteryRecords) {
      // 获取学生姓名
      const studentResponse = await apiClient.query("students", {
        filters: { student_id: record.student_id },
        select: ["name"],
        limit: 1,
      });

      const student_name =
        studentResponse.success && studentResponse.data?.length
          ? studentResponse.data[0].name
          : "未知学生";

      // 计算改进趋势（简化实现）
      const improvement_trend: "improving" | "stable" | "declining" = "stable";

      studentPerformance.push({
        student_id: record.student_id,
        student_name,
        mastery_level: record.mastery_level,
        mastery_grade: record.mastery_grade,
        improvement_trend,
        last_assessed: record.last_assessed,
      });
    }

    return studentPerformance;
  }

  /**
   * 生成学习建议
   */
  private async generateLearningRecommendations(
    knowledgePoint: KnowledgePointRecord,
    overallMastery: KnowledgePointAnalysis["overall_mastery"]
  ): Promise<KnowledgePointAnalysis["learning_recommendations"]> {
    const recommendations: KnowledgePointAnalysis["learning_recommendations"] =
      [];

    // 根据难度评估生成建议
    switch (overallMastery.difficulty_assessment) {
      case "hard":
        recommendations.push({
          target_group: "struggling",
          recommendation: `${knowledgePoint.name}掌握困难，建议增加基础练习和个别辅导`,
        });
        recommendations.push({
          target_group: "average",
          recommendation: `通过分步讲解和实例练习来巩固${knowledgePoint.name}`,
        });
        break;

      case "medium":
        recommendations.push({
          target_group: "struggling",
          recommendation: `为掌握困难的学生提供${knowledgePoint.name}的额外练习`,
        });
        recommendations.push({
          target_group: "advanced",
          recommendation: `为优秀学生提供${knowledgePoint.name}的拓展应用`,
        });
        break;

      case "easy":
        recommendations.push({
          target_group: "average",
          recommendation: `${knowledgePoint.name}掌握良好，可以进行更深入的应用练习`,
        });
        recommendations.push({
          target_group: "advanced",
          recommendation: `${knowledgePoint.name}基础扎实，建议挑战相关的高阶问题`,
        });
        break;
    }

    return recommendations;
  }

  /**
   * 计算学生当前整体水平
   */
  private calculateCurrentLevel(masteryRecords: StudentMastery[]): number {
    if (masteryRecords.length === 0) return 0;

    const totalLevel = masteryRecords.reduce(
      (sum, record) => sum + record.mastery_level,
      0
    );
    return Math.round(totalLevel / masteryRecords.length);
  }

  /**
   * 生成推荐学习序列
   */
  private async generateRecommendedSequence(
    studentId: string,
    masteryRecords: StudentMastery[]
  ): Promise<LearningPath["recommended_sequence"]> {
    const sequence: LearningPath["recommended_sequence"] = [];

    // 找出掌握度低于70的知识点
    const needImprovement = masteryRecords.filter(
      (record) => record.mastery_level < 70
    );

    for (const record of needImprovement.slice(0, 5)) {
      // 限制推荐数量
      // 获取知识点信息
      const kpResponse = await apiClient.query<KnowledgePointRecord>(
        "knowledge_points",
        {
          filters: { id: record.knowledge_point_id },
          limit: 1,
        }
      );

      if (kpResponse.success && kpResponse.data?.length) {
        const kp = kpResponse.data[0];

        let priority: "high" | "medium" | "low";
        if (record.mastery_level < 40) priority = "high";
        else if (record.mastery_level < 60) priority = "medium";
        else priority = "low";

        sequence.push({
          knowledge_point_id: record.knowledge_point_id,
          name: kp.name,
          priority,
          estimated_time: kp.difficulty_level * 15, // 估算时间
          reason: `当前掌握度${record.mastery_level}%，需要加强练习`,
        });
      }
    }

    // 按优先级排序
    sequence.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return sequence;
  }

  /**
   * 生成自适应建议
   */
  private async generateAdaptiveSuggestions(
    studentId: string,
    masteryRecords: StudentMastery[]
  ): Promise<LearningPath["adaptive_suggestions"]> {
    const suggestions: LearningPath["adaptive_suggestions"] = [];

    const averageLevel = this.calculateCurrentLevel(masteryRecords);

    // 基于整体水平生成建议
    if (averageLevel < 60) {
      suggestions.push({
        type: "review",
        content: "建议回顾基础知识点，加强基本概念理解",
        difficulty: 2,
      });
      suggestions.push({
        type: "practice",
        content: "增加基础练习题，巩固基本技能",
        difficulty: 2,
      });
    } else if (averageLevel < 80) {
      suggestions.push({
        type: "practice",
        content: "通过中等难度练习提升解题能力",
        difficulty: 3,
      });
      suggestions.push({
        type: "review",
        content: "定期复习薄弱知识点",
        difficulty: 3,
      });
    } else {
      suggestions.push({
        type: "advance",
        content: "挑战高难度综合应用题",
        difficulty: 4,
      });
      suggestions.push({
        type: "practice",
        content: "尝试知识点的跨领域应用",
        difficulty: 5,
      });
    }

    return suggestions;
  }

  /**
   * 获取知识点掌握率
   */
  private async getKnowledgePointMasteryRate(
    knowledgePointId: string
  ): Promise<number> {
    try {
      const masteryResponse = await apiClient.query<StudentMastery>(
        "student_knowledge_mastery",
        {
          filters: { knowledge_point_id: knowledgePointId },
        }
      );

      if (!masteryResponse.success || !masteryResponse.data?.length) {
        return 0;
      }

      const records = masteryResponse.data;
      const masteredCount = records.filter(
        (record) => record.mastery_level >= 70
      ).length;

      return Math.round((masteredCount / records.length) * 10000) / 100;
    } catch (error) {
      logError("获取知识点掌握率失败", { knowledgePointId, error });
      return 0;
    }
  }

  /**
   * 构建知识点关系边
   */
  private buildKnowledgeEdges(
    knowledgePoints: KnowledgePointRecord[]
  ): KnowledgeGraph["edges"] {
    const edges: KnowledgeGraph["edges"] = [];

    knowledgePoints.forEach((kp) => {
      // 前置关系
      if (kp.prerequisites && kp.prerequisites.length > 0) {
        kp.prerequisites.forEach((prereq) => {
          const prerequisiteKp = knowledgePoints.find((p) => p.id === prereq);
          if (prerequisiteKp) {
            edges.push({
              source: prereq,
              target: kp.id,
              relationship: "prerequisite",
              strength: 0.8,
            });
          }
        });
      }

      // 相关关系
      if (kp.related_points && kp.related_points.length > 0) {
        kp.related_points.forEach((related) => {
          const relatedKp = knowledgePoints.find((p) => p.id === related);
          if (relatedKp) {
            edges.push({
              source: kp.id,
              target: related,
              relationship: "related",
              strength: 0.6,
            });
          }
        });
      }
    });

    return edges;
  }

  /**
   * 解析AI返回的知识点数据
   */
  private parseAIKnowledgePoints(aiData: any): Array<{
    name: string;
    description: string;
    difficulty_level: number;
    category?: string;
  }> {
    try {
      if (!aiData.knowledgePoints || !Array.isArray(aiData.knowledgePoints)) {
        return [];
      }

      return aiData.knowledgePoints.map((kp: any) => ({
        name: kp.name || "未命名知识点",
        description: kp.description || "",
        difficulty_level: Math.max(
          1,
          Math.min(5, Math.round(kp.importance || 3))
        ),
        category: kp.category || "未分类",
      }));
    } catch (error) {
      logError("解析AI知识点数据失败", error);
      return [];
    }
  }

  /**
   * 验证知识点数据
   */
  private validateKnowledgePointData(
    data: Omit<KnowledgePointRecord, "id" | "created_at">
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push("知识点名称不能为空");
    }

    if (!data.homework_id?.trim()) {
      errors.push("作业ID不能为空");
    }

    if (data.difficulty_level < 1 || data.difficulty_level > 5) {
      errors.push("难度等级必须在1-5之间");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 清除知识点相关缓存
   */
  private clearKnowledgeCache(homeworkId?: string): void {
    const patterns = [
      `${this.cachePrefix}analysis_`,
      `${this.cachePrefix}graph_`,
    ];

    if (homeworkId) {
      patterns.push(`${this.cachePrefix}homework_${homeworkId}`);
    }

    patterns.forEach((pattern) => {
      dataCache.getKeys().forEach((key) => {
        if (key.startsWith(pattern)) {
          dataCache.delete(key);
        }
      });
    });

    logInfo("清除知识点相关缓存", { homeworkId });
  }

  /**
   * 清除掌握度相关缓存
   */
  private clearMasteryCache(studentId: string, knowledgePointId: string): void {
    const patterns = [
      `${this.cachePrefix}mastery_${studentId}`,
      `${this.cachePrefix}path_${studentId}`,
      `${this.cachePrefix}analysis_${knowledgePointId}`,
    ];

    patterns.forEach((pattern) => {
      dataCache.getKeys().forEach((key) => {
        if (key.startsWith(pattern)) {
          dataCache.delete(key);
        }
      });
    });

    logInfo("清除掌握度相关缓存", { studentId, knowledgePointId });
  }
}

// 导出服务实例
export const knowledgeService = new KnowledgeService();
