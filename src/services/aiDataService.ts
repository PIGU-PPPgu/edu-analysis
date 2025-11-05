/**
 * AI助手数据服务
 * 为AI助手提供智能数据读取和分析功能
 * 支持读取前端状态和后端数据
 */

import { getExams, getExamById, getExamStatistics } from "./examService";
import { getAllClasses, getClassDetailedAnalysisData } from "./classService";
import {
  fetchGradeData,
  fetchGradeDataByClass,
  fetchGradeDataBySubject,
  calculateGradeStatistics,
} from "@/api/gradeDataAPI";
import { getSubjectScore } from "@/utils/gradeFieldUtils";
import { logInfo, logError } from "@/utils/logger";

// 前端状态数据接口
export interface FrontendContextData {
  currentPage: string;
  currentPath: string;
  selectedFilters: {
    classes: string[];
    subjects: string[];
    examId?: string;
    dateRange?: { start: string; end: string };
  };
  visibleData: {
    studentsInView: number;
    chartsDisplayed: string[];
    currentAnalysisMode: string;
  };
  userActions: {
    lastAction: string;
    timestamp: string;
    context: string;
  };
}

// AI助手专用数据接口
export interface AIDataSummary {
  recentExams: {
    id: string;
    title: string;
    date: string;
    type: string;
    subject?: string;
    participantCount?: number;
    averageScore?: number;
    passRate?: number;
  }[];

  classOverview: {
    className: string;
    totalStudents: number;
    averageScore: number;
    passRate: number;
    excellentRate: number;
  }[];

  subjectPerformance: {
    subject: string;
    averageScore: number;
    participantCount: number;
    passRate: number;
    trend: "improving" | "declining" | "stable";
  }[];

  totalExams: number;
  totalStudents: number;
  overallAverageScore: number;
  dataTimestamp: string;
}

export interface ExamDetailAnalysis {
  examInfo: {
    id: string;
    title: string;
    date: string;
    type: string;
    totalStudents: number;
  };

  overallStatistics: {
    averageScore: number;
    maxScore: number;
    minScore: number;
    passRate: number;
    excellentRate: number;
    standardDeviation: number;
  };

  subjectBreakdown: {
    subject: string;
    averageScore: number;
    maxScore: number;
    minScore: number;
    passRate: number;
  }[];

  classPerformance: {
    className: string;
    averageScore: number;
    studentCount: number;
    passRate: number;
  }[];

  scoreDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];

  topPerformers: {
    name: string;
    className: string;
    totalScore: number;
  }[];

  needsAttention: {
    name: string;
    className: string;
    totalScore: number;
    subjects: string[];
  }[];
}

/**
 * 生成演示数据用于AI助手
 * 当真实数据不存在时提供示例数据
 */
function generateDemoData(): AIDataSummary {
  return {
    recentExams: [
      {
        id: "demo-1",
        title: "期中考试",
        date: "2024-11-15",
        type: "期中",
        subject: "综合",
        participantCount: 120,
        averageScore: 78.5,
        passRate: 85.2,
      },
      {
        id: "demo-2",
        title: "月考(数学)",
        date: "2024-10-20",
        type: "月考",
        subject: "数学",
        participantCount: 45,
        averageScore: 82.1,
        passRate: 88.9,
      },
    ],
    classOverview: [
      {
        className: "三年级1班",
        totalStudents: 35,
        averageScore: 79.2,
        passRate: 86.5,
        excellentRate: 23.1,
      },
      {
        className: "三年级2班",
        totalStudents: 33,
        averageScore: 81.4,
        passRate: 90.9,
        excellentRate: 27.3,
      },
    ],
    subjectPerformance: [
      {
        subject: "数学",
        averageScore: 82.1,
        participantCount: 68,
        passRate: 88.9,
        trend: "improving" as const,
      },
      {
        subject: "语文",
        averageScore: 77.8,
        participantCount: 68,
        passRate: 83.8,
        trend: "stable" as const,
      },
      {
        subject: "英语",
        averageScore: 75.2,
        participantCount: 68,
        passRate: 79.4,
        trend: "declining" as const,
      },
    ],
    totalExams: 5,
    totalStudents: 68,
    overallAverageScore: 78.5,
    dataTimestamp: new Date().toISOString(),
  };
}

/**
 * 获取AI助手数据概览
 * 提供最近考试、班级概况、科目表现等综合信息
 */
export async function getAIDataSummary(): Promise<AIDataSummary> {
  try {
    logInfo("AI助手正在获取数据概览...");

    // 先检查数据表是否存在
    let recentExams;
    try {
      recentExams = await getExams();
    } catch (error) {
      // 如果数据表不存在，返回演示数据
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        logInfo("数据表不存在，使用演示数据");
        return generateDemoData();
      }
      throw error;
    }

    if (!recentExams || recentExams.length === 0) {
      logInfo("无考试数据，使用演示数据");
      return generateDemoData();
    }

    const recentExamsLimit = recentExams.slice(0, 5); // 最近5次考试

    // 获取考试统计信息
    const examWithStats = await Promise.all(
      recentExamsLimit.map(async (exam) => {
        try {
          const stats = await getExamStatistics(exam.id);
          return {
            id: exam.id,
            title: exam.title,
            date: exam.date,
            type: exam.type,
            subject: exam.subject,
            participantCount: stats.participantCount,
            averageScore: stats.averageScore,
            passRate: stats.passRate,
          };
        } catch (error) {
          return {
            id: exam.id,
            title: exam.title,
            date: exam.date,
            type: exam.type,
            subject: exam.subject,
          };
        }
      })
    );

    // 获取班级概况
    const classes = await getAllClasses();
    const classOverview = classes.map((cls) => ({
      className: cls.name,
      totalStudents: cls.studentCount || 0, // 修复字段映射：使用 studentCount 而不是 totalStudents
      averageScore: cls.averageScore || 0,
      passRate: cls.passRate || 0,
      excellentRate: cls.excellentRate || 0,
    }));

    // 计算科目表现（基于最近的考试数据）
    const subjectPerformance: AIDataSummary["subjectPerformance"] = [];
    if (recentExamsLimit.length > 0) {
      // 获取所有科目的数据
      const subjectsMap = new Map<
        string,
        { scores: number[]; counts: number[] }
      >();

      for (const exam of recentExamsLimit) {
        if (exam.subject) {
          try {
            // 从宽表格式获取科目数据
            const gradeDataResponse = await fetchGradeData(exam.id);
            const gradeArray = Array.isArray(gradeDataResponse.data)
              ? gradeDataResponse.data
              : [];

            // 根据科目提取相应分数
            const validScores = gradeArray
              .map((g) => getSubjectScore(g, exam.subject))
              .filter(
                (s) => s !== null && s !== undefined && typeof s === "number"
              );

            if (!subjectsMap.has(exam.subject)) {
              subjectsMap.set(exam.subject, { scores: [], counts: [] });
            }

            const subjectData = subjectsMap.get(exam.subject)!;
            const avgScore =
              validScores.length > 0
                ? validScores.reduce((a, b) => a + b, 0) / validScores.length
                : 0;

            subjectData.scores.push(avgScore);
            subjectData.counts.push(validScores.length);
          } catch (error) {
            logError(`获取科目 ${exam.subject} 数据失败:`, error);
          }
        }
      }

      // 计算科目统计和趋势
      subjectsMap.forEach((data, subject) => {
        const averageScore =
          data.scores.length > 0
            ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
            : 0;
        const participantCount =
          data.counts.length > 0
            ? Math.round(
                data.counts.reduce((a, b) => a + b, 0) / data.counts.length
              )
            : 0;

        // 简单趋势分析：比较最近两次的平均分
        let trend: "improving" | "declining" | "stable" = "stable";
        if (data.scores.length >= 2) {
          const recent = data.scores[data.scores.length - 1];
          const previous = data.scores[data.scores.length - 2];
          const diff = recent - previous;
          if (diff > 2) trend = "improving";
          else if (diff < -2) trend = "declining";
        }

        const passRate =
          averageScore > 0 ? Math.min((averageScore / 100) * 100, 100) : 0;

        subjectPerformance.push({
          subject,
          averageScore: Math.round(averageScore * 100) / 100,
          participantCount,
          passRate: Math.round(passRate * 100) / 100,
          trend,
        });
      });
    }

    // 计算总体统计
    const totalExams = recentExams.length;
    const totalStudents = classOverview.reduce(
      (sum, cls) => sum + cls.totalStudents,
      0
    );
    const overallAverageScore =
      classOverview.length > 0
        ? classOverview.reduce((sum, cls) => sum + cls.averageScore, 0) /
          classOverview.length
        : 0;

    const summary: AIDataSummary = {
      recentExams: examWithStats,
      classOverview,
      subjectPerformance,
      totalExams,
      totalStudents,
      overallAverageScore: Math.round(overallAverageScore * 100) / 100,
      dataTimestamp: new Date().toISOString(),
    };

    logInfo("AI助手数据概览获取成功", {
      examsCount: examWithStats.length,
      classesCount: classOverview.length,
      subjectsCount: subjectPerformance.length,
    });

    return summary;
  } catch (error) {
    logError("获取AI助手数据概览失败:", error);

    // 特殊处理数据库表不存在的情况
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      throw new Error("数据库表尚未创建，请先导入成绩数据。");
    }

    throw new Error(`数据获取失败: ${error.message}`);
  }
}

/**
 * 获取特定考试的详细分析
 * @param examId 考试ID
 */
export async function getExamDetailAnalysis(
  examId: string
): Promise<ExamDetailAnalysis> {
  try {
    logInfo(`AI助手正在获取考试详细分析: ${examId}`);

    // 获取考试基本信息和统计
    const [examInfo, examStats] = await Promise.all([
      getExamById(examId),
      getExamStatistics(examId),
    ]);

    if (!examInfo) {
      throw new Error(`未找到考试信息: ${examId}`);
    }

    // 获取考试的所有成绩数据
    const gradeDataResponse = await fetchGradeData(examId);

    // 确保gradeData是数组格式，处理API异常情况
    const gradeData = Array.isArray(gradeDataResponse) ? gradeDataResponse : [];

    if (gradeData.length === 0) {
      throw new Error(`考试 ${examId} 暂无成绩数据`);
    }

    // 计算综合统计
    const statistics = calculateGradeStatistics(gradeData);

    // 按科目分组分析
    const subjectMap = new Map<string, any[]>();
    gradeData.forEach((record) => {
      if (record.subject) {
        if (!subjectMap.has(record.subject)) {
          subjectMap.set(record.subject, []);
        }
        subjectMap.get(record.subject)!.push(record);
      }
    });

    const subjectBreakdown = Array.from(subjectMap.entries()).map(
      ([subject, records]) => {
        const scores = records
          .map((r) => r.total_score || r.score)
          .filter((s) => s !== null && s !== undefined);
        const totalScore = Math.max(
          ...records
            .map((r) => r.subject_total_score || 100)
            .filter((s) => s !== null)
        );
        const passThreshold = totalScore * 0.6;

        return {
          subject,
          averageScore:
            scores.length > 0
              ? Math.round(
                  (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
                ) / 100
              : 0,
          maxScore: scores.length > 0 ? Math.max(...scores) : 0,
          minScore: scores.length > 0 ? Math.min(...scores) : 0,
          passRate:
            scores.length > 0
              ? Math.round(
                  (scores.filter((s) => s >= passThreshold).length /
                    scores.length) *
                    100 *
                    100
                ) / 100
              : 0,
        };
      }
    );

    // 按班级分组分析
    const classMap = new Map<string, any[]>();
    gradeData.forEach((record) => {
      if (record.class_name) {
        if (!classMap.has(record.class_name)) {
          classMap.set(record.class_name, []);
        }
        classMap.get(record.class_name)!.push(record);
      }
    });

    const classPerformance = Array.from(classMap.entries()).map(
      ([className, records]) => {
        const scores = records
          .map((r) => r.total_score || r.score)
          .filter((s) => s !== null && s !== undefined);
        const totalScore = Math.max(
          ...records
            .map((r) => r.subject_total_score || 100)
            .filter((s) => s !== null)
        );
        const passThreshold = totalScore * 0.6;

        return {
          className,
          averageScore:
            scores.length > 0
              ? Math.round(
                  (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
                ) / 100
              : 0,
          studentCount: records.length,
          passRate:
            scores.length > 0
              ? Math.round(
                  (scores.filter((s) => s >= passThreshold).length /
                    scores.length) *
                    100 *
                    100
                ) / 100
              : 0,
        };
      }
    );

    // 找出优秀和需要关注的学生
    const studentScores = gradeData.map((record) => ({
      name: record.name || record.student_name,
      className: record.class_name,
      totalScore: record.total_score || record.score || 0,
      subjects: record.subject ? [record.subject] : [],
    }));

    // 按学生合并数据
    const studentMap = new Map<string, (typeof studentScores)[0]>();
    studentScores.forEach((student) => {
      const key = `${student.name}-${student.className}`;
      if (!studentMap.has(key)) {
        studentMap.set(key, { ...student, subjects: [] });
      }
      const existing = studentMap.get(key)!;
      existing.totalScore = Math.max(existing.totalScore, student.totalScore);
      existing.subjects.push(...student.subjects);
    });

    const allStudents = Array.from(studentMap.values());

    // 排序找出前5名和后5名
    const sortedStudents = allStudents.sort(
      (a, b) => b.totalScore - a.totalScore
    );
    const topPerformers = sortedStudents.slice(0, 5);
    const needsAttention = sortedStudents.slice(-5).reverse();

    const analysis: ExamDetailAnalysis = {
      examInfo: {
        id: examInfo.id,
        title: examInfo.title,
        date: examInfo.date,
        type: examInfo.type,
        totalStudents: gradeData.length,
      },
      overallStatistics: {
        averageScore: examStats.averageScore,
        maxScore: examStats.maxScore,
        minScore: examStats.minScore,
        passRate: examStats.passRate,
        excellentRate: examStats.excellentRate,
        standardDeviation: statistics.standardDeviation || 0,
      },
      subjectBreakdown,
      classPerformance,
      scoreDistribution: examStats.scoreDistribution,
      topPerformers,
      needsAttention,
    };

    logInfo(`考试 ${examId} 详细分析完成`, {
      totalStudents: analysis.examInfo.totalStudents,
      subjectsCount: subjectBreakdown.length,
      classesCount: classPerformance.length,
    });

    return analysis;
  } catch (error) {
    logError(`获取考试 ${examId} 详细分析失败:`, error);

    // 特殊处理数据库表不存在的情况
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      throw new Error("数据库表尚未创建，请先导入成绩数据。");
    }

    throw new Error(`考试分析失败: ${error.message}`);
  }
}

/**
 * 获取前端上下文数据
 * 读取用户当前页面状态、筛选条件等前端信息
 */
export function getFrontendContext(): FrontendContextData {
  try {
    // 获取当前页面信息
    const currentPath = window.location.pathname;
    const currentPage = getCurrentPageName(currentPath);

    // 尝试读取前端状态（从各种可能的地方）
    const selectedFilters = {
      classes: getFrontendFilterValue("selectedClasses") || [],
      subjects: getFrontendFilterValue("selectedSubjects") || [],
      examId: getFrontendFilterValue("selectedExam"),
      dateRange: getFrontendFilterValue("dateRange"),
    };

    // 获取可见数据信息
    const visibleData = {
      studentsInView: getFrontendVisibleStudentsCount(),
      chartsDisplayed: getFrontendDisplayedCharts(),
      currentAnalysisMode: getFrontendAnalysisMode(),
    };

    // 获取用户最近操作
    const userActions = {
      lastAction: getFrontendLastAction(),
      timestamp: new Date().toISOString(),
      context: currentPage,
    };

    return {
      currentPage,
      currentPath,
      selectedFilters,
      visibleData,
      userActions,
    };
  } catch (error) {
    logError("获取前端上下文失败:", error);
    return {
      currentPage: "unknown",
      currentPath: window.location.pathname,
      selectedFilters: { classes: [], subjects: [] },
      visibleData: {
        studentsInView: 0,
        chartsDisplayed: [],
        currentAnalysisMode: "unknown",
      },
      userActions: {
        lastAction: "unknown",
        timestamp: new Date().toISOString(),
        context: "unknown",
      },
    };
  }
}

/**
 * 辅助函数：获取当前页面名称
 */
function getCurrentPageName(path: string): string {
  const pageMap: { [key: string]: string } = {
    "/": "首页",
    "/advanced-analysis": "高级分析",
    "/basic-analysis": "基础分析",
    "/class-analysis": "班级分析",
    "/student-management": "学生管理",
    "/ai-settings": "AI设置",
    "/import": "导入数据",
  };
  return pageMap[path] || "未知页面";
}

/**
 * 辅助函数：获取前端筛选值
 */
function getFrontendFilterValue(key: string): any {
  try {
    // 尝试从多个可能的地方获取筛选条件

    // 1. 从 localStorage 获取
    const stored = localStorage.getItem(`filter_${key}`);
    if (stored) return JSON.parse(stored);

    // 2. 从 URL 参数获取
    const urlParams = new URLSearchParams(window.location.search);
    const urlValue = urlParams.get(key);
    if (urlValue) return JSON.parse(urlValue);

    // 3. 从 DOM 元素获取（如果有可见的筛选器）
    const filterElement = document.querySelector(`[data-filter="${key}"]`);
    if (filterElement) {
      return (filterElement as any).value || (filterElement as any).textContent;
    }

    // 4. 从 React 状态获取（通过全局状态管理）
    const globalState = (window as any).__GLOBAL_STATE__;
    if (globalState && globalState[key]) {
      return globalState[key];
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 辅助函数：获取可见学生数量
 */
function getFrontendVisibleStudentsCount(): number {
  try {
    // 尝试从表格行数获取
    const tableRows = document.querySelectorAll("tbody tr, .student-row");
    if (tableRows.length > 0) return tableRows.length;

    // 尝试从计数器元素获取
    const counterElement = document.querySelector("[data-student-count]");
    if (counterElement) {
      return parseInt((counterElement as any).textContent || "0");
    }

    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * 辅助函数：获取显示的图表
 */
function getFrontendDisplayedCharts(): string[] {
  try {
    const charts: string[] = [];

    // 检查各种可能的图表元素
    const chartSelectors = [
      ".recharts-wrapper",
      ".chart-container",
      "[data-chart-type]",
      ".bar-chart",
      ".line-chart",
      ".pie-chart",
    ];

    chartSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        const chartType =
          element.getAttribute("data-chart-type") ||
          element.className.split(" ").find((cls) => cls.includes("chart")) ||
          "chart";
        charts.push(chartType);
      });
    });

    return [...new Set(charts)]; // 去重
  } catch (error) {
    return [];
  }
}

/**
 * 辅助函数：获取当前分析模式
 */
function getFrontendAnalysisMode(): string {
  try {
    // 从页面路径推断
    const path = window.location.pathname;
    if (path.includes("advanced")) return "高级分析";
    if (path.includes("basic")) return "基础分析";
    if (path.includes("class")) return "班级分析";

    // 从活跃的标签页获取
    const activeTab = document.querySelector(
      '.active-tab, .tab-active, [aria-selected="true"]'
    );
    if (activeTab) {
      return (activeTab as any).textContent || "unknown";
    }

    return "general";
  } catch (error) {
    return "unknown";
  }
}

/**
 * 辅助函数：获取最近操作
 */
function getFrontendLastAction(): string {
  try {
    // 从 sessionStorage 获取最近操作
    const lastAction = sessionStorage.getItem("lastUserAction");
    if (lastAction) return lastAction;

    // 从活跃元素推断
    const activeElement = document.activeElement;
    if (activeElement) {
      const tagName = activeElement.tagName.toLowerCase();
      const className = activeElement.className;
      return `${tagName}:${className}`;
    }

    return "unknown";
  } catch (error) {
    return "unknown";
  }
}

/**
 * 根据用户问题智能选择数据查询方式
 * 现在同时包含前端上下文和后端数据
 * @param userQuestion 用户问题
 * @param examId 可选的考试ID
 */
export async function getRelevantDataForQuestion(
  userQuestion: string,
  examId?: string
): Promise<{
  dataType: "summary" | "examDetail" | "error";
  data?: AIDataSummary | ExamDetailAnalysis;
  frontendContext?: FrontendContextData;
  suggestion?: string;
}> {
  try {
    logInfo("根据用户问题智能选择数据", { question: userQuestion, examId });

    // 获取前端上下文
    const frontendContext = getFrontendContext();

    const question = userQuestion.toLowerCase();

    // 判断是否询问特定考试
    if (
      examId ||
      question.includes("这次考试") ||
      question.includes("本次考试") ||
      question.includes("这场考试")
    ) {
      if (!examId) {
        // 如果没有提供examId，获取最近的考试
        const recentExams = await getExams();
        if (recentExams.length > 0) {
          examId = recentExams[0].id;
        } else {
          return {
            dataType: "error",
            frontendContext,
            suggestion: "暂无考试数据，请先导入考试成绩。",
          };
        }
      }

      const examAnalysis = await getExamDetailAnalysis(examId!);
      return {
        dataType: "examDetail",
        data: examAnalysis,
        frontendContext,
      };
    }

    // 默认返回数据概览
    const summary = await getAIDataSummary();
    return {
      dataType: "summary",
      data: summary,
      frontendContext,
    };
  } catch (error) {
    logError("智能数据选择失败:", error);

    // 获取前端上下文
    const frontendContext = getFrontendContext();

    // 根据错误类型提供具体建议
    let suggestion = "数据获取失败，请稍后重试或检查数据导入状态。";
    if (
      error.message?.includes("数据库表尚未创建") ||
      error.message?.includes("does not exist")
    ) {
      suggestion =
        '数据库尚未初始化，请先导入考试成绩数据。您可以通过"导入成绩"功能上传CSV文件。';
    } else if (error.message?.includes("暂无考试数据")) {
      suggestion = '暂无考试数据，请先通过"导入成绩"功能添加考试成绩。';
    }

    return {
      dataType: "error",
      frontendContext,
      suggestion,
    };
  }
}

/**
 * 为AI助手格式化数据用于对话
 * 现在同时包含前端上下文和后端数据
 * @param data 数据对象
 * @param dataType 数据类型
 * @param frontendContext 前端上下文
 */
export function formatDataForAI(
  data: AIDataSummary | ExamDetailAnalysis,
  dataType: "summary" | "examDetail",
  frontendContext?: FrontendContextData
): string {
  // 首先格式化前端上下文
  let contextInfo = "";
  if (frontendContext) {
    contextInfo = `\n【前端上下文】
当前页面：${frontendContext.currentPage}
路径：${frontendContext.currentPath}
用户筛选：${frontendContext.selectedFilters.classes.length > 0 ? "班级: " + frontendContext.selectedFilters.classes.join(", ") : ""}${frontendContext.selectedFilters.subjects.length > 0 ? " 科目: " + frontendContext.selectedFilters.subjects.join(", ") : ""}
可见数据：${frontendContext.visibleData.studentsInView}名学生${frontendContext.visibleData.chartsDisplayed.length > 0 ? "，显示图表: " + frontendContext.visibleData.chartsDisplayed.join(", ") : ""}
分析模式：${frontendContext.visibleData.currentAnalysisMode}
最近操作：${frontendContext.userActions.lastAction}
\n`;
  }
  if (dataType === "summary") {
    const summary = data as AIDataSummary;

    // 检查是否为演示数据
    const isDemoData = summary.recentExams.some((exam) =>
      exam.id.startsWith("demo-")
    );
    const dataSourceInfo = isDemoData
      ? "\n⚠️ 注意：以下为演示数据，请导入真实成绩数据后获取准确分析。\n"
      : "\n";

    return `${contextInfo}${dataSourceInfo}
【数据概览】
总体情况：
- 总考试数：${summary.totalExams} 场
- 总学生数：${summary.totalStudents} 人  
- 整体平均分：${summary.overallAverageScore} 分

最近考试表现：
${summary.recentExams
  .map(
    (exam) =>
      `- ${exam.title}（${exam.date}）：${exam.participantCount || "?"}人参考，平均${exam.averageScore || "?"}分，及格率${exam.passRate || "?"}%`
  )
  .join("\n")}

班级概况：
${summary.classOverview
  .map(
    (cls) =>
      `- ${cls.className}：${cls.totalStudents}人，平均${cls.averageScore}分，及格率${cls.passRate}%`
  )
  .join("\n")}

科目表现：
${summary.subjectPerformance
  .map(
    (subject) =>
      `- ${subject.subject}：平均${subject.averageScore}分，及格率${subject.passRate}%，趋势${subject.trend === "improving" ? "上升📈" : subject.trend === "declining" ? "下降📉" : "稳定➡️"}`
  )
  .join("\n")}
`.trim();
  } else {
    const detail = data as ExamDetailAnalysis;

    return `${contextInfo}
【考试详细分析：${detail.examInfo.title}】
考试信息：
- 考试时间：${detail.examInfo.date}
- 考试类型：${detail.examInfo.type}
- 参考人数：${detail.examInfo.totalStudents}人

整体统计：
- 平均分：${detail.overallStatistics.averageScore}分
- 最高分：${detail.overallStatistics.maxScore}分
- 最低分：${detail.overallStatistics.minScore}分
- 及格率：${detail.overallStatistics.passRate}%
- 优秀率：${detail.overallStatistics.excellentRate}%

科目表现：
${detail.subjectBreakdown
  .map(
    (subject) =>
      `- ${subject.subject}：平均${subject.averageScore}分，及格率${subject.passRate}%`
  )
  .join("\n")}

班级表现：
${detail.classPerformance
  .map(
    (cls) =>
      `- ${cls.className}：${cls.studentCount}人，平均${cls.averageScore}分，及格率${cls.passRate}%`
  )
  .join("\n")}

优秀学生（前5名）：
${detail.topPerformers
  .map(
    (student, index) =>
      `${index + 1}. ${student.name}（${student.className}）：${student.totalScore}分`
  )
  .join("\n")}

需要关注的学生：
${detail.needsAttention
  .map(
    (student) =>
      `- ${student.name}（${student.className}）：${student.totalScore}分`
  )
  .join("\n")}
`.trim();
  }
}
