/**
 * OnboardingTour使用示例
 */

import React from "react";
import {
  OnboardingTour,
  useOnboardingTour,
  isTourCompleted,
  resetTour,
  TourConfig,
} from "@/components/onboarding/OnboardingTour";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Upload, BarChart3, Settings } from "lucide-react";
import "@/components/onboarding/OnboardingTourStyles.css";

/**
 * 示例1: 首页功能引导
 */
const homepageTourConfig: TourConfig = {
  id: "homepage_tour",
  steps: [
    {
      target: ".nav-import-data",
      title: "数据导入",
      content: "点击这里可以导入学生信息和成绩数据。\n支持Excel和CSV格式文件。",
      placement: "bottom",
    },
    {
      target: ".nav-grade-analysis",
      title: "成绩分析",
      content: "在这里查看详细的成绩分析报告，\n包括趋势图、排名变化等。",
      placement: "bottom",
    },
    {
      target: ".nav-warning-system",
      title: "预警系统",
      content: "系统会自动识别预警学生，\n帮助教师及时发现问题。",
      placement: "bottom",
    },
    {
      target: ".nav-settings",
      title: "系统设置",
      content: "在设置中可以配置评分标准、\n预警规则等个性化选项。",
      placement: "left",
    },
  ],
  showProgress: true,
  autoStart: true,
};

export const Example1_HomepageTour: React.FC = () => {
  const { isOpen, start, close } = useOnboardingTour(homepageTourConfig);

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例1: 首页功能引导</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 模拟导航栏 */}
        <div className="flex items-center space-x-4 p-4 bg-gray-100 rounded">
          <Button className="nav-import-data" variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            数据导入
          </Button>
          <Button className="nav-grade-analysis" variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            成绩分析
          </Button>
          <Button className="nav-warning-system" variant="outline" size="sm">
            预警系统
          </Button>
          <Button className="nav-settings" variant="outline" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button onClick={start} disabled={isOpen}>
            开始引导
          </Button>
          <Button onClick={() => resetTour("homepage_tour")} variant="outline">
            重置状态
          </Button>
          <span className="text-sm text-muted-foreground">
            {isTourCompleted("homepage_tour") ? "✓ 已完成" : "未完成"}
          </span>
        </div>

        <OnboardingTour
          config={homepageTourConfig}
          isOpen={isOpen}
          onClose={close}
        />
      </CardContent>
    </Card>
  );
};

/**
 * 示例2: 数据导入流程引导
 */
const importTourConfig: TourConfig = {
  id: "import_tour",
  steps: [
    {
      target: ".upload-button",
      title: "选择文件",
      content: "点击这里上传Excel或CSV文件",
      placement: "bottom",
      action: {
        label: "试试看",
        onClick: () => {
          console.log("打开文件选择器");
        },
      },
    },
    {
      target: ".field-mapping",
      title: "字段映射",
      content: "确认数据列与系统字段的对应关系，\n系统会自动识别常见格式。",
      placement: "top",
    },
    {
      target: ".preview-table",
      title: "数据预览",
      content: "导入前可以预览数据，\n确认格式正确后再提交。",
      placement: "top",
    },
    {
      target: ".submit-button",
      title: "确认导入",
      content: "一切准备就绪，点击确认开始导入！",
      placement: "left",
    },
  ],
  showProgress: true,
};

export const Example2_ImportTour: React.FC = () => {
  const { isOpen, start, close } = useOnboardingTour(importTourConfig);

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例2: 数据导入流程引导</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 模拟导入界面 */}
        <div className="space-y-4 p-4 border rounded">
          <Button className="upload-button">
            <Upload className="w-4 h-4 mr-2" />
            选择文件
          </Button>

          <div className="field-mapping p-3 bg-gray-50 rounded">
            <h4 className="text-sm font-medium mb-2">字段映射</h4>
            <div className="text-sm text-muted-foreground">
              姓名 → name, 学号 → student_id
            </div>
          </div>

          <div className="preview-table p-3 bg-gray-50 rounded">
            <h4 className="text-sm font-medium mb-2">数据预览</h4>
            <div className="text-sm text-muted-foreground">
              预览前3行数据...
            </div>
          </div>

          <Button className="submit-button">确认导入</Button>
        </div>

        <Button onClick={start} disabled={isOpen}>
          开始引导
        </Button>

        <OnboardingTour
          config={importTourConfig}
          isOpen={isOpen}
          onClose={close}
        />
      </CardContent>
    </Card>
  );
};

/**
 * 示例3: 带生命周期钩子的引导
 */
const lifecycleTourConfig: TourConfig = {
  id: "lifecycle_tour",
  steps: [
    {
      target: ".step1",
      title: "步骤1",
      content: "这是第一步",
      beforeShow: () => {
        console.log("[Tour] 显示步骤1之前");
      },
      afterShow: () => {
        console.log("[Tour] 显示步骤1之后");
      },
    },
    {
      target: ".step2",
      title: "步骤2",
      content: "这是第二步，有动态内容加载",
      beforeShow: () => {
        console.log("[Tour] 加载步骤2数据...");
        // 可以在这里加载数据、打开面板等
      },
    },
    {
      target: ".step3",
      title: "步骤3",
      content: "最后一步",
      beforeShow: () => {
        console.log("[Tour] 准备完成引导");
      },
    },
  ],
  onComplete: () => {
    console.log("[Tour] 引导完成!");
  },
  onSkip: () => {
    console.log("[Tour] 用户跳过引导");
  },
};

export const Example3_LifecycleTour: React.FC = () => {
  const { isOpen, start, close } = useOnboardingTour(lifecycleTourConfig);

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例3: 生命周期钩子</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="step1 p-4 bg-blue-50 rounded">步骤1目标</div>
          <div className="step2 p-4 bg-green-50 rounded">步骤2目标</div>
          <div className="step3 p-4 bg-yellow-50 rounded">步骤3目标</div>
        </div>

        <Button onClick={start} disabled={isOpen}>
          开始引导
        </Button>

        <div className="text-sm text-muted-foreground">
          打开浏览器控制台查看生命周期日志
        </div>

        <OnboardingTour
          config={lifecycleTourConfig}
          isOpen={isOpen}
          onClose={close}
        />
      </CardContent>
    </Card>
  );
};

/**
 * 示例汇总页面
 */
export const OnboardingTourExamples: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">OnboardingTour 使用示例</h1>
        <p className="text-muted-foreground">演示如何创建交互式新手引导</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Example1_HomepageTour />
        <Example2_ImportTour />
        <Example3_LifecycleTour />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>使用指南</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <h3>基本用法</h3>
          <ul>
            <li>
              <strong>TourConfig</strong>: 定义引导步骤和配置
            </li>
            <li>
              <strong>useOnboardingTour</strong>: Hook管理引导状态
            </li>
            <li>
              <strong>OnboardingTour</strong>: 渲染引导UI
            </li>
            <li>
              <strong>isTourCompleted/resetTour</strong>: 状态管理
            </li>
          </ul>

          <h3>引导步骤配置</h3>
          <ul>
            <li>target: 目标元素CSS选择器</li>
            <li>title: 步骤标题</li>
            <li>content: 步骤说明</li>
            <li>placement: 提示框位置 (top/bottom/left/right)</li>
            <li>action: 可选操作按钮</li>
            <li>beforeShow/afterShow: 生命周期钩子</li>
          </ul>

          <h3>高级特性</h3>
          <ul>
            <li>自动启动 - autoStart配置</li>
            <li>进度显示 - showProgress配置</li>
            <li>状态持久化 - localStorage自动保存</li>
            <li>动态定位 - 自动跟随目标元素</li>
            <li>响应式 - 窗口大小变化自动调整</li>
          </ul>

          <h3>最佳实践</h3>
          <ul>
            <li>步骤数量控制在5-8步以内</li>
            <li>每步内容简洁明了</li>
            <li>关键功能才设置引导</li>
            <li>提供跳过选项</li>
            <li>使用唯一的tourId</li>
          </ul>

          <h3>典型场景</h3>
          <ul>
            <li>首次登录系统</li>
            <li>新功能发布</li>
            <li>复杂操作流程</li>
            <li>设置向导</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
