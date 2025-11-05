/**
 * 🧠 Master-AI-Data: 用户行为数据收集系统
 * 智能追踪用户操作，为推荐算法提供数据支撑
 */

import { supabase } from "@/integrations/supabase/client";
import { warningAnalysisCache } from "@/utils/performanceCache";

// 用户行为事件类型
export enum UserActionType {
  // 页面访问
  PAGE_VIEW = "page_view",
  PAGE_LEAVE = "page_leave",

  // 数据查看
  VIEW_STUDENT_PROFILE = "view_student_profile",
  VIEW_CLASS_ANALYSIS = "view_class_analysis",
  VIEW_GRADE_ANALYSIS = "view_grade_analysis",
  VIEW_EXAM_ANALYSIS = "view_exam_analysis",

  // 筛选和搜索
  APPLY_FILTER = "apply_filter",
  SEARCH_STUDENT = "search_student",
  SEARCH_DATA = "search_data",

  // 分析操作
  GENERATE_REPORT = "generate_report",
  EXPORT_DATA = "export_data",
  RUN_AI_ANALYSIS = "run_ai_analysis",

  // 设置和配置
  CHANGE_SETTINGS = "change_settings",
  UPDATE_PREFERENCES = "update_preferences",

  // 交互行为
  HOVER_ELEMENT = "hover_element",
  CLICK_CHART = "click_chart",
  SCROLL_PAGE = "scroll_page",

  // 学习行为
  ACCESS_HELP = "access_help",
  WATCH_TUTORIAL = "watch_tutorial",
  READ_DOCUMENTATION = "read_documentation",
}

// 用户行为数据接口
export interface UserBehaviorEvent {
  id?: string;
  user_id: string;
  session_id: string;
  action_type: UserActionType;
  page_path: string;
  element_id?: string;
  context_data: Record<string, any>;
  timestamp: string;
  duration?: number; // 操作持续时间（毫秒）
  user_agent: string;
  screen_resolution: string;
  device_type: "desktop" | "tablet" | "mobile";
}

// 用户偏好分析结果
export interface UserPreferences {
  user_id: string;
  preferred_pages: string[];
  frequent_actions: UserActionType[];
  preferred_filters: Record<string, any>;
  analysis_patterns: {
    preferred_chart_types: string[];
    preferred_time_ranges: string[];
    frequently_viewed_subjects: string[];
    frequently_viewed_classes: string[];
  };
  learning_style: {
    prefers_visual: boolean;
    prefers_detailed: boolean;
    prefers_summary: boolean;
    help_usage_frequency: number;
  };
  performance_preferences: {
    preferred_load_speed: "fast" | "balanced" | "detailed";
    prefers_cached_data: boolean;
    auto_refresh_enabled: boolean;
  };
  last_updated: string;
}

class UserBehaviorTracker {
  private sessionId: string;
  private userId: string | null = null;
  private eventQueue: UserBehaviorEvent[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30秒
  private currentPageStartTime: number = Date.now();
  private lastEventTime: number = Date.now();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
    this.setupPeriodicFlush();
  }

  /**
   * 设置当前用户ID
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * 记录用户行为事件
   */
  async trackEvent(
    actionType: UserActionType,
    contextData: Record<string, any> = {},
    elementId?: string,
    duration?: number
  ) {
    if (!this.userId) {
      console.warn(
        "[UserBehaviorTracker] User ID not set, skipping event tracking"
      );
      return;
    }

    const event: UserBehaviorEvent = {
      user_id: this.userId,
      session_id: this.sessionId,
      action_type: actionType,
      page_path: window.location.pathname,
      element_id: elementId,
      context_data: {
        ...contextData,
        referrer: document.referrer,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
      },
      timestamp: new Date().toISOString(),
      duration,
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      device_type: this.detectDeviceType(),
    };

    this.eventQueue.push(event);
    this.lastEventTime = Date.now();

    // 如果队列达到批量大小，立即发送
    if (this.eventQueue.length >= this.batchSize) {
      await this.flushEvents();
    }
  }

  /**
   * 跟踪页面访问
   */
  trackPageView(pagePath?: string) {
    const path = pagePath || window.location.pathname;
    this.currentPageStartTime = Date.now();

    this.trackEvent(UserActionType.PAGE_VIEW, {
      page_title: document.title,
      page_path: path,
      previous_page: document.referrer,
    });
  }

  /**
   * 跟踪页面离开
   */
  trackPageLeave() {
    const duration = Date.now() - this.currentPageStartTime;
    this.trackEvent(
      UserActionType.PAGE_LEAVE,
      {
        page_duration: duration,
        scroll_depth: this.calculateScrollDepth(),
      },
      undefined,
      duration
    );
  }

  /**
   * 跟踪学生查看行为
   */
  trackStudentView(
    studentId: string,
    viewType: "profile" | "grades" | "analysis"
  ) {
    this.trackEvent(UserActionType.VIEW_STUDENT_PROFILE, {
      student_id: studentId,
      view_type: viewType,
      source_page: window.location.pathname,
    });
  }

  /**
   * 跟踪筛选操作
   */
  trackFilterUsage(filterType: string, filterValues: any) {
    this.trackEvent(UserActionType.APPLY_FILTER, {
      filter_type: filterType,
      filter_values: filterValues,
      page_context: window.location.pathname,
    });
  }

  /**
   * 跟踪AI分析使用
   */
  trackAIAnalysis(analysisType: string, duration: number, success: boolean) {
    this.trackEvent(
      UserActionType.RUN_AI_ANALYSIS,
      {
        analysis_type: analysisType,
        success,
        page_context: window.location.pathname,
      },
      undefined,
      duration
    );
  }

  /**
   * 跟踪搜索行为
   */
  trackSearch(
    searchType: "student" | "data" | "general",
    query: string,
    resultsCount: number
  ) {
    this.trackEvent(
      searchType === "student"
        ? UserActionType.SEARCH_STUDENT
        : UserActionType.SEARCH_DATA,
      {
        search_query: query,
        results_count: resultsCount,
        query_length: query.length,
      }
    );
  }

  /**
   * 跟踪图表交互
   */
  trackChartInteraction(
    chartType: string,
    interactionType: "hover" | "click" | "zoom",
    elementData?: any
  ) {
    this.trackEvent(UserActionType.CLICK_CHART, {
      chart_type: chartType,
      interaction_type: interactionType,
      element_data: elementData,
    });
  }

  /**
   * 获取用户行为统计
   */
  async getUserBehaviorStats(userId: string, days: number = 30): Promise<any> {
    return warningAnalysisCache.getUserBehaviorData(
      async () => {
        const { data, error } = await supabase
          .from("user_behavior_events")
          .select("*")
          .eq("user_id", userId)
          .gte(
            "timestamp",
            new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
          )
          .order("timestamp", { ascending: false });

        if (error) throw error;

        return this.analyzeUserBehavior(data || []);
      },
      userId,
      { days }
    );
  }

  /**
   * 分析用户偏好
   */
  async analyzeUserPreferences(userId: string): Promise<UserPreferences> {
    const stats = await this.getUserBehaviorStats(userId, 90); // 3个月数据

    return {
      user_id: userId,
      preferred_pages: stats.most_visited_pages.slice(0, 5),
      frequent_actions: stats.most_frequent_actions.slice(0, 10),
      preferred_filters: stats.most_used_filters,
      analysis_patterns: {
        preferred_chart_types: stats.preferred_chart_types,
        preferred_time_ranges: stats.preferred_time_ranges,
        frequently_viewed_subjects: stats.frequently_viewed_subjects,
        frequently_viewed_classes: stats.frequently_viewed_classes,
      },
      learning_style: {
        prefers_visual: stats.chart_interaction_rate > 0.3,
        prefers_detailed: stats.avg_page_duration > 120000, // 2分钟
        prefers_summary: stats.help_usage_frequency < 0.1,
        help_usage_frequency: stats.help_usage_frequency,
      },
      performance_preferences: {
        preferred_load_speed:
          stats.avg_page_duration < 60000 ? "fast" : "balanced",
        prefers_cached_data: stats.repeat_visit_rate > 0.5,
        auto_refresh_enabled: stats.refresh_frequency > 0.2,
      },
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * 发送事件到服务器
   */
  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const { error } = await supabase
        .from("user_behavior_events")
        .insert(eventsToSend);

      if (error) {
        console.error("[UserBehaviorTracker] Failed to send events:", error);
        // 将失败的事件放回队列
        this.eventQueue.unshift(...eventsToSend);
      } else {
        console.log(
          `[UserBehaviorTracker] Successfully sent ${eventsToSend.length} events`
        );
      }
    } catch (error) {
      console.error("[UserBehaviorTracker] Error sending events:", error);
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  /**
   * 分析用户行为数据
   */
  private analyzeUserBehavior(events: UserBehaviorEvent[]) {
    const stats = {
      total_events: events.length,
      session_count: new Set(events.map((e) => e.session_id)).size,
      most_visited_pages: this.getTopItems(events.map((e) => e.page_path)),
      most_frequent_actions: this.getTopItems(events.map((e) => e.action_type)),
      most_used_filters: this.analyzeFilterUsage(events),
      preferred_chart_types: this.analyzeChartInteractions(events),
      preferred_time_ranges: this.analyzeTimeRanges(events),
      frequently_viewed_subjects: this.analyzeSubjectViews(events),
      frequently_viewed_classes: this.analyzeClassViews(events),
      avg_page_duration: this.calculateAveragePageDuration(events),
      chart_interaction_rate: this.calculateChartInteractionRate(events),
      help_usage_frequency: this.calculateHelpUsageFrequency(events),
      repeat_visit_rate: this.calculateRepeatVisitRate(events),
      refresh_frequency: this.calculateRefreshFrequency(events),
    };

    return stats;
  }

  /**
   * 获取最常用项目
   */
  private getTopItems(items: any[]): any[] {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([item]) => item);
  }

  /**
   * 分析筛选器使用情况
   */
  private analyzeFilterUsage(events: UserBehaviorEvent[]) {
    const filterEvents = events.filter(
      (e) => e.action_type === UserActionType.APPLY_FILTER
    );
    const filterUsage: Record<string, any> = {};

    filterEvents.forEach((event) => {
      const { filter_type, filter_values } = event.context_data;
      if (!filterUsage[filter_type]) {
        filterUsage[filter_type] = {};
      }

      Object.entries(filter_values || {}).forEach(([key, value]) => {
        if (!filterUsage[filter_type][key]) {
          filterUsage[filter_type][key] = {};
        }
        filterUsage[filter_type][key][value as string] =
          (filterUsage[filter_type][key][value as string] || 0) + 1;
      });
    });

    return filterUsage;
  }

  /**
   * 分析图表交互
   */
  private analyzeChartInteractions(events: UserBehaviorEvent[]) {
    const chartEvents = events.filter(
      (e) => e.action_type === UserActionType.CLICK_CHART
    );
    return this.getTopItems(chartEvents.map((e) => e.context_data.chart_type));
  }

  /**
   * 分析时间范围偏好
   */
  private analyzeTimeRanges(events: UserBehaviorEvent[]) {
    // 基于筛选器使用分析时间范围偏好
    const filterEvents = events.filter(
      (e) =>
        e.action_type === UserActionType.APPLY_FILTER &&
        e.context_data.filter_values?.dateRange
    );

    return this.getTopItems(
      filterEvents.map((e) => e.context_data.filter_values.dateRange)
    );
  }

  /**
   * 分析科目查看偏好
   */
  private analyzeSubjectViews(events: UserBehaviorEvent[]) {
    const relevantEvents = events.filter(
      (e) => e.context_data.subject || e.context_data.filter_values?.subjects
    );

    const subjects: string[] = [];
    relevantEvents.forEach((event) => {
      if (event.context_data.subject) {
        subjects.push(event.context_data.subject);
      }
      if (event.context_data.filter_values?.subjects) {
        subjects.push(...event.context_data.filter_values.subjects);
      }
    });

    return this.getTopItems(subjects);
  }

  /**
   * 分析班级查看偏好
   */
  private analyzeClassViews(events: UserBehaviorEvent[]) {
    const relevantEvents = events.filter(
      (e) => e.context_data.class_name || e.context_data.filter_values?.classes
    );

    const classes: string[] = [];
    relevantEvents.forEach((event) => {
      if (event.context_data.class_name) {
        classes.push(event.context_data.class_name);
      }
      if (event.context_data.filter_values?.classes) {
        classes.push(...event.context_data.filter_values.classes);
      }
    });

    return this.getTopItems(classes);
  }

  /**
   * 计算平均页面停留时间
   */
  private calculateAveragePageDuration(events: UserBehaviorEvent[]): number {
    const pageLeaveEvents = events.filter(
      (e) => e.action_type === UserActionType.PAGE_LEAVE
    );
    const durations = pageLeaveEvents
      .map((e) => e.context_data.page_duration)
      .filter((d) => d && d > 0);

    return durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;
  }

  /**
   * 计算图表交互率
   */
  private calculateChartInteractionRate(events: UserBehaviorEvent[]): number {
    const pageViews = events.filter(
      (e) => e.action_type === UserActionType.PAGE_VIEW
    ).length;
    const chartInteractions = events.filter(
      (e) => e.action_type === UserActionType.CLICK_CHART
    ).length;

    return pageViews > 0 ? chartInteractions / pageViews : 0;
  }

  /**
   * 计算帮助使用频率
   */
  private calculateHelpUsageFrequency(events: UserBehaviorEvent[]): number {
    const totalActions = events.length;
    const helpActions = events.filter(
      (e) =>
        e.action_type === UserActionType.ACCESS_HELP ||
        e.action_type === UserActionType.WATCH_TUTORIAL ||
        e.action_type === UserActionType.READ_DOCUMENTATION
    ).length;

    return totalActions > 0 ? helpActions / totalActions : 0;
  }

  /**
   * 计算重复访问率
   */
  private calculateRepeatVisitRate(events: UserBehaviorEvent[]): number {
    const pageVisits = events.filter(
      (e) => e.action_type === UserActionType.PAGE_VIEW
    );
    const uniquePages = new Set(pageVisits.map((e) => e.page_path));
    const totalPageViews = pageVisits.length;

    return uniquePages.size > 0
      ? (totalPageViews - uniquePages.size) / totalPageViews
      : 0;
  }

  /**
   * 计算刷新频率
   */
  private calculateRefreshFrequency(events: UserBehaviorEvent[]): number {
    // 基于相同页面的重复访问计算
    const pageViews = events.filter(
      (e) => e.action_type === UserActionType.PAGE_VIEW
    );
    const pageViewsGrouped = pageViews.reduce(
      (acc, event) => {
        const key = event.page_path;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const refreshCount = Object.values(pageViewsGrouped).reduce(
      (sum, count) => sum + Math.max(0, count - 1),
      0
    );
    return pageViews.length > 0 ? refreshCount / pageViews.length : 0;
  }

  /**
   * 计算滚动深度
   */
  private calculateScrollDepth(): number {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    return scrollHeight > 0 ? scrollTop / scrollHeight : 0;
  }

  /**
   * 检测设备类型
   */
  private detectDeviceType(): "desktop" | "tablet" | "mobile" {
    const width = window.innerWidth;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 初始化跟踪
   */
  private initializeTracking() {
    // 监听页面离开
    window.addEventListener("beforeunload", () => {
      this.trackPageLeave();
      this.flushEvents();
    });

    // 监听页面可见性变化
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.trackPageLeave();
      } else {
        this.trackPageView();
      }
    });

    // 监听路由变化（SPA）
    let currentPath = window.location.pathname;
    setInterval(() => {
      if (window.location.pathname !== currentPath) {
        this.trackPageLeave();
        currentPath = window.location.pathname;
        this.trackPageView();
      }
    }, 1000);
  }

  /**
   * 设置定期发送
   */
  private setupPeriodicFlush() {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, this.flushInterval);
  }
}

// 导出单例实例
export const userBehaviorTracker = new UserBehaviorTracker();

// React Hook for easy integration
export const useUserBehaviorTracker = () => {
  return {
    trackEvent: userBehaviorTracker.trackEvent.bind(userBehaviorTracker),
    trackPageView: userBehaviorTracker.trackPageView.bind(userBehaviorTracker),
    trackStudentView:
      userBehaviorTracker.trackStudentView.bind(userBehaviorTracker),
    trackFilterUsage:
      userBehaviorTracker.trackFilterUsage.bind(userBehaviorTracker),
    trackAIAnalysis:
      userBehaviorTracker.trackAIAnalysis.bind(userBehaviorTracker),
    trackSearch: userBehaviorTracker.trackSearch.bind(userBehaviorTracker),
    trackChartInteraction:
      userBehaviorTracker.trackChartInteraction.bind(userBehaviorTracker),
    setUserId: userBehaviorTracker.setUserId.bind(userBehaviorTracker),
    getUserBehaviorStats:
      userBehaviorTracker.getUserBehaviorStats.bind(userBehaviorTracker),
    analyzeUserPreferences:
      userBehaviorTracker.analyzeUserPreferences.bind(userBehaviorTracker),
  };
};
