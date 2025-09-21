/**
 * 用户引导系统提供者
 * 管理引导状态、进度和用户偏好
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// 引导步骤接口
export interface GuideStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS选择器
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'input' | 'scroll' | 'wait';
  nextTrigger?: 'auto' | 'manual' | 'element';
  skipable?: boolean;
  category: 'basic' | 'intermediate' | 'advanced';
}

// 引导流程接口
export interface GuideTour {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'feature' | 'workflow';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // 分钟
  steps: GuideStep[];
  prerequisites?: string[]; // 需要先完成的引导
}

// 用户引导状态
interface GuideState {
  isActive: boolean;
  currentTour: string | null;
  currentStep: number;
  completedTours: string[];
  userPreferences: {
    autoStart: boolean;
    showHints: boolean;
    enableTooltips: boolean;
    guideSpeed: 'slow' | 'normal' | 'fast';
  };
}

// 引导上下文
interface GuideContextType {
  state: GuideState;
  tours: GuideTour[];
  startTour: (tourId: string) => void;
  stopTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  updatePreferences: (preferences: Partial<GuideState['userPreferences']>) => void;
  isStepCompleted: (tourId: string, stepId: string) => boolean;
  isTourCompleted: (tourId: string) => boolean;
  canStartTour: (tourId: string) => boolean;
}

const GuideContext = createContext<GuideContextType | null>(null);

// 预警系统引导流程定义
const WARNING_SYSTEM_TOURS: GuideTour[] = [
  {
    id: 'warning-system-intro',
    name: '预警系统入门',
    description: '了解预警系统的基本概念和主要功能',
    category: 'system',
    difficulty: 'beginner',
    estimatedTime: 5,
    steps: [
      {
        id: 'welcome',
        title: '欢迎使用预警系统',
        content: '预警系统通过分析学生数据，及时发现潜在风险，帮助教师制定针对性干预措施。让我们一起了解系统的主要功能。',
        target: '.warning-analysis-header',
        position: 'bottom',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'basic'
      },
      {
        id: 'overview-cards',
        title: '统计概览',
        content: '这里显示了学校的整体预警情况，包括总学生数、风险学生数和预警比例。这些数据基于实时分析生成。',
        target: '.stat-cards',
        position: 'bottom',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'basic'
      },
      {
        id: 'tab-navigation',
        title: '功能导航',
        content: '系统分为五个主要模块：概览分析、预警列表、引擎控制、预警规则和数据同步。每个模块都有特定的功能。',
        target: '.warning-tabs',
        position: 'bottom',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'basic'
      },
      {
        id: 'filters',
        title: '筛选器',
        content: '使用筛选器可以按时间范围、风险等级、预警状态等条件精确查看数据。点击筛选器按钮试试。',
        target: '[data-guide="filter-button"]',
        position: 'bottom',
        action: 'click',
        nextTrigger: 'element',
        category: 'basic'
      }
    ]
  },
  {
    id: 'warning-dashboard-tour',
    name: '预警概览深度解析',
    description: '详细了解预警概览页面的各项数据和图表',
    category: 'feature',
    difficulty: 'intermediate',
    estimatedTime: 8,
    prerequisites: ['warning-system-intro'],
    steps: [{
        id: 'risk-distribution',
        title: '风险级别分布',
        content: '此图表显示不同风险等级学生的分布情况。红色代表高风险，橙色代表中风险，绿色代表低风险。',
        target: '.risk-distribution-chart',
        position: 'right',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'intermediate'
      },
      {
        id: 'risk-factors',
        title: '风险因素分析',
        content: '这里展示了导致学生预警的主要因素，如成绩下滑、出勤问题等。帮助识别需要重点关注的问题。',
        target: '.risk-factors-chart',
        position: 'left',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'intermediate'
      },
      {
        id: 'class-distribution',
        title: '班级风险分布',
        content: '查看各班级的风险学生比例，有助于识别需要特别关注的班级。进度条长度表示风险程度。',
        target: '.class-risk-cards',
        position: 'top',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'intermediate'
      },
      {
        id: 'warning-types',
        title: '预警类型统计',
        content: '了解不同类型预警的分布情况：学业预警、行为预警、出勤预警和作业预警。有助于制定针对性措施。',
        target: '.warning-type-cards',
        position: 'top',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'intermediate'
      }
    ]
  },
  {
    id: 'warning-engine-control',
    name: '预警引擎操作指南',
    description: '学习如何使用预警引擎执行规则和管理预警',
    category: 'workflow',
    difficulty: 'advanced',
    estimatedTime: 10,
    prerequisites: ['warning-system-intro', 'warning-dashboard-tour'],
    steps: [
      {
        id: 'engine-overview',
        title: '预警引擎介绍',
        content: '预警引擎是系统的核心，负责执行预警规则、生成预警记录。它可以手动执行或自动运行。',
        target: '.engine-control-panel',
        position: 'bottom',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'advanced'
      },
      {
        id: 'manual-execution',
        title: '手动执行规则',
        content: '点击"执行预警规则"按钮可以立即执行所有激活的预警规则。建议在数据更新后执行。',
        target: '[data-guide="execute-rules-button"]',
        position: 'top',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'advanced'
      },
      {
        id: 'execution-results',
        title: '查看执行结果',
        content: '执行完成后，这里会显示处理的学生数量、触发的预警数量和执行统计。',
        target: '.execution-results',
        position: 'top',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'advanced'
      }
    ]
  },
  {
    id: 'warning-rules-management',
    name: '预警规则管理',
    description: '学习如何创建、编辑和管理预警规则',
    category: 'workflow',
    difficulty: 'advanced',
    estimatedTime: 15,
    prerequisites: ['warning-system-intro'],
    steps: [
      {
        id: 'rules-overview',
        title: '预警规则概览',
        content: '预警规则定义了什么情况下系统会产生预警。系统包含多种预设规则，也支持自定义规则。',
        target: '.rules-list',
        position: 'bottom',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'advanced'
      },
      {
        id: 'create-rule',
        title: '创建新规则',
        content: '点击"创建规则"按钮可以添加自定义预警规则。可以设置触发条件、严重程度等参数。',
        target: '[data-guide="create-rule-button"]',
        position: 'bottom',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'advanced'
      },
      {
        id: 'rule-templates',
        title: '使用模板',
        content: '系统提供了常用的规则模板，如"连续不及格预警"、"成绩下降预警"等，可以直接使用或修改。',
        target: '.rule-templates',
        position: 'top',
        action: 'wait',
        nextTrigger: 'manual',
        category: 'advanced'
      }
    ]
  }
];

interface UserGuideProviderProps {
  children: ReactNode;
}

export function UserGuideProvider({ children }: UserGuideProviderProps) {
  const [state, setState] = useState<GuideState>({
    isActive: false,
    currentTour: null,
    currentStep: 0,
    completedTours: [],
    userPreferences: {
      autoStart: true,
      showHints: true,
      enableTooltips: true,
      guideSpeed: 'normal'
    }
  });

  // 从用户配置加载引导状态
  useEffect(() => {
    loadUserGuideState();
  }, []);

  const loadUserGuideState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();

      if (profile?.preferences?.guide) {
        setState(prev => ({
          ...prev,
          completedTours: profile.preferences.guide.completedTours || [],
          userPreferences: {
            ...prev.userPreferences,
            ...profile.preferences.guide.preferences
          }
        }));
      }
    } catch (error) {
      console.error('加载引导状态失败:', error);
    }
  };

  const saveUserGuideState = async (newState: Partial<GuideState>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();

      const updatedPreferences = {
        ...profile?.preferences,
        guide: {
          completedTours: newState.completedTours || state.completedTours,
          preferences: newState.userPreferences || state.userPreferences
        }
      };

      await supabase
        .from('user_profiles')
        .update({ preferences: updatedPreferences })
        .eq('id', user.id);
    } catch (error) {
      console.error('保存引导状态失败:', error);
    }
  };

  const startTour = (tourId: string) => {
    if (!canStartTour(tourId)) {
      console.warn(`无法启动引导 ${tourId}：不满足前置条件`);
      return;
    }

    setState(prev => ({
      ...prev,
      isActive: true,
      currentTour: tourId,
      currentStep: 0
    }));
  };

  const stopTour = () => {
    setState(prev => ({
      ...prev,
      isActive: false,
      currentTour: null,
      currentStep: 0
    }));
  };

  const nextStep = () => {
    if (!state.currentTour) return;
    
    const tour = WARNING_SYSTEM_TOURS.find(t => t.id === state.currentTour);
    if (!tour) return;

    if (state.currentStep < tour.steps.length - 1) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1
      }));
    } else {
      completeTour();
    }
  };

  const previousStep = () => {
    if (state.currentStep > 0) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1
      }));
    }
  };

  const skipTour = () => {
    stopTour();
  };

  const completeTour = () => {
    if (!state.currentTour) return;

    const newCompletedTours = [...state.completedTours, state.currentTour];
    const newState = {
      ...state,
      isActive: false,
      currentTour: null,
      currentStep: 0,
      completedTours: newCompletedTours
    };

    setState(newState);
    saveUserGuideState(newState);
  };

  const updatePreferences = (preferences: Partial<GuideState['userPreferences']>) => {
    const newPreferences = { ...state.userPreferences, ...preferences };
    const newState = { ...state, userPreferences: newPreferences };
    setState(newState);
    saveUserGuideState(newState);
  };

  const isStepCompleted = (tourId: string, stepId: string): boolean => {
    return state.completedTours.includes(tourId);
  };

  const isTourCompleted = (tourId: string): boolean => {
    return state.completedTours.includes(tourId);
  };

  const canStartTour = (tourId: string): boolean => {
    const tour = WARNING_SYSTEM_TOURS.find(t => t.id === tourId);
    if (!tour) return false;

    if (!tour.prerequisites) return true;

    return tour.prerequisites.every(prereq => state.completedTours.includes(prereq));
  };

  const contextValue: GuideContextType = {
    state,
    tours: WARNING_SYSTEM_TOURS,
    startTour,
    stopTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    updatePreferences,
    isStepCompleted,
    isTourCompleted,
    canStartTour
  };

  return (
    <GuideContext.Provider value={contextValue}>
      {children}
    </GuideContext.Provider>
  );
};
export function useGuide() {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuide must be used within UserGuideProvider');
  }
  return context;
}