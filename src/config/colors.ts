/**
 * 🎨 学生画像系统 - 统一颜色配置
 * 
 * 为了解决班级管理页面绿色色调不统一的问题，
 * 统一定义所有教育场景下的颜色使用规范
 */

// 📊 成绩等级颜色映射 (统一标准)
export const GRADE_COLORS = {
  // 优秀 (90分以上)
  excellent: {
    text: 'text-green-600',           // 统一文字颜色
    background: 'bg-green-50',        // 统一背景颜色
    badge: 'bg-green-50 text-green-700', // 统一徽章颜色
    icon: 'text-green-600',           // 统一图标颜色
    border: 'border-green-200'        // 统一边框颜色
  },
  
  // 良好 (80-89分)
  good: {
    text: 'text-blue-600',
    background: 'bg-blue-50',
    badge: 'bg-blue-50 text-blue-700',
    icon: 'text-blue-600',
    border: 'border-blue-200'
  },
  
  // 中等 (70-79分)
  average: {
    text: 'text-yellow-600',
    background: 'bg-yellow-50',
    badge: 'bg-yellow-50 text-yellow-700',
    icon: 'text-yellow-600',
    border: 'border-yellow-200'
  },
  
  // 及格 (60-69分)
  pass: {
    text: 'text-orange-600',
    background: 'bg-orange-50',
    badge: 'bg-orange-50 text-orange-700',
    icon: 'text-orange-600',
    border: 'border-orange-200'
  },
  
  // 不及格 (60分以下)
  fail: {
    text: 'text-red-600',
    background: 'bg-red-50',
    badge: 'bg-red-50 text-red-700',
    icon: 'text-red-600',
    border: 'border-red-200'
  }
} as const;

// 📈 趋势颜色映射
export const TREND_COLORS = {
  up: {
    text: 'text-green-600',
    icon: 'text-green-600',
    background: 'bg-green-50'
  },
  down: {
    text: 'text-red-600', 
    icon: 'text-red-600',
    background: 'bg-red-50'
  },
  stable: {
    text: 'text-gray-500',
    icon: 'text-gray-400',
    background: 'bg-gray-50'
  }
} as const;

// 🎯 功能颜色映射
export const FUNCTION_COLORS = {
  // 班级管理
  class: {
    primary: 'text-blue-600',
    background: 'bg-blue-50',
    icon: 'text-blue-600'
  },
  
  // 学生信息
  student: {
    primary: 'text-purple-600', 
    background: 'bg-purple-50',
    icon: 'text-purple-600'
  },
  
  // 成绩分析
  grade: {
    primary: 'text-indigo-600',
    background: 'bg-indigo-50', 
    icon: 'text-indigo-600'
  },
  
  // AI分析
  ai: {
    primary: 'text-emerald-600',
    background: 'bg-emerald-50',
    icon: 'text-emerald-600'
  }
} as const;

// 项目统一色彩配置
// 基于项目品牌色 #B9FF66 的颜色系统

export const BRAND_COLORS = {
  // 品牌主色 - 鲜明的绿色
  primary: '#B9FF66',
  primaryHover: '#A8F055',
  primaryDark: '#5E9622',
  primaryDarker: '#426811',
  
  // 品牌色透明度变体
  primaryLight10: '#B9FF66/10',
  primaryLight20: '#B9FF66/20',
  primaryLight30: '#B9FF66/30',
  
  // 成功状态色
  success: '#B9FF66',
  successHover: '#A8F055',
  successText: '#5E9622',
  successBg: '#F4FFE5',
  
  // 等级色彩
  excellent: '#B9FF66',    // 优秀 (90+)
  good: '#4CAF50',         // 良好 (80-89)
  average: '#2196F3',      // 中等 (70-79) 
  pass: '#FF9800',         // 及格 (60-69)
  fail: '#F44336',         // 不及格 (<60)
} as const;

// 🔧 工具函数：根据分数获取颜色
export const getScoreColors = (score: number) => {
  if (score >= 90) return {
    text: 'text-[#5E9622]',
    bg: 'bg-[#F4FFE5]',
    border: 'border-[#B9FF66]',
    badge: 'bg-[#B9FF66] text-black'
  };
  if (score >= 80) return {
    text: 'text-blue-600', 
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-50 text-blue-700'
  };
  if (score >= 70) return {
    text: 'text-yellow-600',
    bg: 'bg-yellow-50', 
    border: 'border-yellow-200',
    badge: 'bg-yellow-50 text-yellow-700'
  };
  if (score >= 60) return {
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200', 
    badge: 'bg-orange-50 text-orange-700'
  };
  return {
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-50 text-red-700'
  };
};

// 🔧 工具函数：根据比率获取颜色
export const getRateColors = (rate: number) => {
  if (rate >= 90) return {
    text: 'text-[#5E9622]',
    bg: 'bg-[#F4FFE5]',
    indicator: 'bg-[#B9FF66]'
  };
  if (rate >= 80) return {
    text: 'text-blue-600',
    bg: 'bg-blue-50', 
    indicator: 'bg-blue-500'
  };
  if (rate >= 70) return {
    text: 'text-yellow-600',
    bg: 'bg-yellow-50',
    indicator: 'bg-yellow-500'
  };
  return {
    text: 'text-red-600',
    bg: 'bg-red-50',
    indicator: 'bg-red-500'
  };
};

// 🔧 工具函数：根据趋势获取颜色
export const getTrendColors = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return {
        text: 'text-[#5E9622]',
        bg: 'bg-[#F4FFE5]',
        icon: 'text-[#B9FF66]'
      };
    case 'down':
      return {
        text: 'text-red-600',
        bg: 'bg-red-50',
        icon: 'text-red-500'
      };
    case 'stable':
    default:
      return {
        text: 'text-gray-600',
        bg: 'bg-gray-50',
        icon: 'text-gray-500'
      };
  }
};

// 学科颜色映射
export const SUBJECT_COLORS = {
  语文: '#B9FF66',
  数学: '#4CAF50', 
  英语: '#2196F3',
  物理: '#9C27B0',
  化学: '#FF9800',
  生物: '#4CAF50',
  政治: '#F44336',
  历史: '#795548',
  地理: '#009688',
  总分: '#5E9622'
} as const; 