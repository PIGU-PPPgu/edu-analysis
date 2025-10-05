/**
 * SuccessModal使用示例
 */

import React from "react";
import {
  SuccessModal,
  ImportSuccessModal,
  BatchOperationSuccessModal,
  SaveSuccessModal,
  useSuccessModal,
} from "@/components/feedback/SuccessModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Users, Save, CheckCircle } from "lucide-react";

/**
 * 示例1: 基础成功模态框
 */
export const Example1_BasicSuccess: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例1: 基础成功模态框</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setOpen(true)}>
          显示成功消息
        </Button>

        <SuccessModal
          open={open}
          onClose={() => setOpen(false)}
          title="操作成功"
          description="您的操作已成功完成"
        />
      </CardContent>
    </Card>
  );
};

/**
 * 示例2: 数据导入成功
 */
export const Example2_ImportSuccess: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例2: 数据导入成功</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          模拟导入成功
        </Button>

        <ImportSuccessModal
          open={open}
          onClose={() => setOpen(false)}
          totalCount={150}
          successCount={148}
          errorCount={2}
          itemName="学生"
          onViewDetails={() => {
            console.log("查看详情");
          }}
          onContinueImport={() => {
            console.log("继续导入");
          }}
        />
      </CardContent>
    </Card>
  );
};

/**
 * 示例3: 批量操作成功
 */
export const Example3_BatchOperation: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例3: 批量操作成功</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setOpen(true)}>
          <Users className="w-4 h-4 mr-2" />
          模拟批量分配
        </Button>

        <BatchOperationSuccessModal
          open={open}
          onClose={() => setOpen(false)}
          operationName="分配班级"
          successCount={45}
          failedCount={3}
          affectedItems="名学生"
          onViewResult={() => {
            console.log("查看结果");
          }}
          onUndo={() => {
            console.log("撤销操作");
          }}
        />
      </CardContent>
    </Card>
  );
};

/**
 * 示例4: 保存成功
 */
export const Example4_SaveSuccess: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例4: 保存成功 (自动关闭)</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setOpen(true)}>
          <Save className="w-4 h-4 mr-2" />
          保存设置
        </Button>

        <SaveSuccessModal
          open={open}
          onClose={() => setOpen(false)}
          itemName="考试设置"
          savedAt={new Date()}
          onViewItem={() => {
            console.log("查看设置");
          }}
          onContinueEdit={() => {
            console.log("继续编辑");
          }}
        />
      </CardContent>
    </Card>
  );
};

/**
 * 示例5: 使用Hook管理状态
 */
export const Example5_WithHook: React.FC = () => {
  const successModal = useSuccessModal();

  const handleComplexOperation = () => {
    // 模拟复杂操作
    setTimeout(() => {
      successModal.show({
        title: "数据同步完成",
        description: "所有数据已成功同步到云端",
        statistics: [
          { label: "同步数据", value: "1,234", highlight: true },
          { label: "耗时", value: "2.5秒" },
          { label: "数据大小", value: "15.6 MB" },
        ],
        actions: [
          {
            label: "查看同步报告",
            onClick: () => console.log("查看报告"),
            variant: "default",
          },
          {
            label: "立即备份",
            onClick: () => console.log("开始备份"),
            variant: "outline",
          },
        ],
        size: "lg",
      });
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例5: 使用Hook</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleComplexOperation}>
          执行复杂操作
        </Button>

        <SuccessModal
          open={successModal.open}
          onClose={successModal.hide}
          {...successModal.config}
        />
      </CardContent>
    </Card>
  );
};

/**
 * 示例6: 自定义详情内容
 */
export const Example6_CustomDetails: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例6: 自定义详情内容</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setOpen(true)}>
          <CheckCircle className="w-4 h-4 mr-2" />
          生成报告
        </Button>

        <SuccessModal
          open={open}
          onClose={() => setOpen(false)}
          title="报告生成成功"
          description="您的分析报告已生成完毕"
          statistics={[
            { label: "分析学生", value: 320, highlight: true },
            { label: "生成图表", value: 15 },
            { label: "数据点", value: "8,456" },
          ]}
          details={
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">报告包含:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ 成绩趋势分析</li>
                <li>✓ 学生排名变化</li>
                <li>✓ 知识点掌握度</li>
                <li>✓ 预警学生列表</li>
              </ul>
            </div>
          }
          actions={[
            {
              label: "下载报告",
              onClick: () => console.log("下载"),
              variant: "default",
            },
            {
              label: "分享报告",
              onClick: () => console.log("分享"),
              variant: "outline",
            },
          ]}
          size="lg"
        />
      </CardContent>
    </Card>
  );
};

/**
 * 示例汇总页面
 */
export const SuccessModalExamples: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">SuccessModal 使用示例</h1>
        <p className="text-muted-foreground">
          演示如何在不同场景下使用统一成功反馈模态框
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Example1_BasicSuccess />
        <Example2_ImportSuccess />
        <Example3_BatchOperation />
        <Example4_SaveSuccess />
        <Example5_WithHook />
        <Example6_CustomDetails />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>使用指南</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <h3>基本用法</h3>
          <ul>
            <li>
              <strong>SuccessModal</strong>: 通用成功反馈模态框
            </li>
            <li>
              <strong>ImportSuccessModal</strong>: 数据导入成功预设
            </li>
            <li>
              <strong>BatchOperationSuccessModal</strong>: 批量操作成功预设
            </li>
            <li>
              <strong>SaveSuccessModal</strong>: 保存成功预设
            </li>
            <li>
              <strong>useSuccessModal</strong>: Hook方式管理状态
            </li>
          </ul>

          <h3>核心特性</h3>
          <ul>
            <li>统计数据展示 - 清晰展示操作结果</li>
            <li>后续操作建议 - 引导用户下一步行动</li>
            <li>自定义详情内容 - 灵活展示更多信息</li>
            <li>自动关闭 - 适用于简单确认场景</li>
            <li>多种尺寸 - 适应不同内容量</li>
          </ul>

          <h3>最佳实践</h3>
          <ul>
            <li>重要操作使用模态框而非toast</li>
            <li>提供清晰的操作统计数据</li>
            <li>为用户提供有意义的后续操作</li>
            <li>简单确认可启用自动关闭</li>
            <li>使用预设组件减少代码重复</li>
          </ul>

          <h3>何时使用</h3>
          <ul>
            <li>数据导入/导出完成</li>
            <li>批量操作完成</li>
            <li>重要设置保存</li>
            <li>需要展示操作详情</li>
            <li>需要引导后续操作</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
