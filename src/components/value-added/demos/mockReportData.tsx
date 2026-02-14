/**
 * Mock数据: 19个报告卡片配置
 */

import {
  Award,
  TrendingUp,
  Users,
  Target,
  LineChart,
  BarChart3,
  PieChart,
  Activity,
  Download,
  GitCompare,
} from "lucide-react";

export interface ReportCard {
  id: string;
  title: string;
  description: string;
  badge: "总体" | "教学班" | "行政班" | "个人";
  icon: any;
  category: string;
}

export const mockReportCards: ReportCard[] = [
  // 教师增值评价
  {
    id: "teacher-score",
    title: "科目教师分数增值",
    description: "分析教师所教班级的分数增值率、进步人数占比、标准分变化",
    badge: "总体",
    icon: Award,
    category: "教师增值评价",
  },
  {
    id: "teacher-ability",
    title: "科目教师能力增值",
    description: "评估教师的巩固率、转化率、贡献率等能力培养指标",
    badge: "总体",
    icon: Target,
    category: "教师增值评价",
  },

  // 班级增值评价
  {
    id: "class-score",
    title: "班级分数增值",
    description: "展示班级入口/出口分、标准分、排名、增值率、进步人数占比",
    badge: "教学班",
    icon: TrendingUp,
    category: "班级增值评价",
  },
  {
    id: "class-ability",
    title: "班级能力增值",
    description: "分析班级的巩固率、转化率、贡献率等能力提升情况",
    badge: "教学班",
    icon: BarChart3,
    category: "班级增值评价",
  },

  // 教学排优
  {
    id: "subject-balance",
    title: "学科发展均衡",
    description: "分析行政班总分增值和各学科偏离度，识别薄弱学科",
    badge: "行政班",
    icon: PieChart,
    category: "教学排优",
  },
  {
    id: "subject-score-comparison",
    title: "各学科分数增值",
    description: "横向对比行政班各学科的分数增值表现",
    badge: "行政班",
    icon: BarChart3,
    category: "教学排优",
  },
  {
    id: "subject-ability-comparison",
    title: "各学科能力增值",
    description: "横向对比行政班各学科的能力增值表现",
    badge: "行政班",
    icon: Activity,
    category: "教学排优",
  },

  // 教师历次追踪
  {
    id: "teacher-score-trend",
    title: "历次分数走势",
    description: "追踪教师历次均分、标准分、分数增值率的变化趋势",
    badge: "总体",
    icon: LineChart,
    category: "教师历次追踪",
  },
  {
    id: "teacher-ability-trend",
    title: "历次能力走势",
    description: "追踪教师历次优秀率、贡献率、巩固率、转化率的变化",
    badge: "总体",
    icon: LineChart,
    category: "教师历次追踪",
  },

  // 班级历次追踪
  {
    id: "class-score-trend-grade",
    title: "全年级班级对比",
    description: "同一科目所有班级的历次走势对比，支持筛选班级",
    badge: "总体",
    icon: GitCompare,
    category: "班级历次追踪",
  },
  {
    id: "class-score-trend-single",
    title: "历次分数分析（单科）",
    description: "教学班单科目历次得分表现分析",
    badge: "教学班",
    icon: LineChart,
    category: "班级历次追踪",
  },
  {
    id: "class-ability-trend-single",
    title: "历次能力分析（单科）",
    description: "教学班单科目历次能力表现分析",
    badge: "教学班",
    icon: LineChart,
    category: "班级历次追踪",
  },
  {
    id: "class-score-trend-multi",
    title: "历次分数分析（多科）",
    description: "行政班各学科历次得分表现分析",
    badge: "行政班",
    icon: LineChart,
    category: "班级历次追踪",
  },
  {
    id: "class-ability-trend-multi",
    title: "历次能力分析（多科）",
    description: "行政班各学科历次能力表现分析",
    badge: "行政班",
    icon: LineChart,
    category: "班级历次追踪",
  },

  // 学生增值结果
  {
    id: "student-detail-download",
    title: "学生增值明细",
    description: "下载查看所有学生的详细增值数据",
    badge: "个人",
    icon: Download,
    category: "学生增值结果",
  },
  {
    id: "student-score-single",
    title: "单科学生分数增值",
    description: "查看学生单科出入口原始分、标准分、增值率",
    badge: "个人",
    icon: Users,
    category: "学生增值结果",
  },
  {
    id: "student-ability-single",
    title: "单科学生能力增值",
    description: "查看学生单科出入口等级、等级变化情况",
    badge: "个人",
    icon: Target,
    category: "学生增值结果",
  },
  {
    id: "student-score-multi",
    title: "学生各学科分数增值",
    description: "对比学生各学科的分数增值表现",
    badge: "个人",
    icon: BarChart3,
    category: "学生增值结果",
  },
  {
    id: "student-ability-multi",
    title: "学生各学科能力增值",
    description: "对比学生各学科的能力增值表现",
    badge: "个人",
    icon: Activity,
    category: "学生增值结果",
  },

  // 学生历次追踪
  {
    id: "student-trend",
    title: "单科学生历次表现",
    description: "追踪学生单科历次原始分、标准分、等级变化",
    badge: "个人",
    icon: LineChart,
    category: "学生历次追踪",
  },

  // 数据对比分析
  {
    id: "comparison-tool",
    title: "数据对比分析工具",
    description: "支持时间段、班级、科目、教师四维度对比分析",
    badge: "总体",
    icon: GitCompare,
    category: "数据对比分析",
  },
];

export const categories = [
  "教师增值评价",
  "班级增值评价",
  "教学排优",
  "教师历次追踪",
  "班级历次追踪",
  "学生增值结果",
  "学生历次追踪",
  "数据对比分析",
];

/**
 * Mock报告内容组件
 */
export const MockReportContent = ({ reportId }: { reportId: string }) => {
  const report = mockReportCards.find((r) => r.id === reportId);

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg border">
        <h3 className="text-xl font-bold mb-2">{report?.title}</h3>
        <p className="text-gray-600 mb-6">{report?.description}</p>

        {/* 模拟统计数据 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">增值率</div>
            <div className="text-2xl font-bold text-blue-600">+12.5%</div>
            <div className="text-xs text-gray-500 mt-1">较入口提升</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">进步人数</div>
            <div className="text-2xl font-bold text-green-600">85人</div>
            <div className="text-xs text-gray-500 mt-1">占比 68%</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">标准分变化</div>
            <div className="text-2xl font-bold text-purple-600">+5.2</div>
            <div className="text-xs text-gray-500 mt-1">显著提升</div>
          </div>
        </div>
      </div>

      {/* 模拟图表区域 */}
      <div className="p-6 bg-white rounded-lg border">
        <h4 className="font-semibold mb-4">趋势分析图表</h4>
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-400">
          [图表占位 - 实际报告中显示真实图表]
        </div>
      </div>

      {/* 模拟数据表格 */}
      <div className="p-6 bg-white rounded-lg border">
        <h4 className="font-semibold mb-4">详细数据</h4>
        <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400">
          [数据表格占位 - 实际报告中显示真实数据]
        </div>
      </div>
    </div>
  );
};
