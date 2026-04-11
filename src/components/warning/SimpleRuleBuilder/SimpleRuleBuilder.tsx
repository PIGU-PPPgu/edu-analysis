/**
 * 简化版预警规则构建器
 * 为教师设计的简单易用的规则创建界面
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import RuleScenarios from "./RuleScenarios";
import RuleWizard from "./RuleWizard";
import { RuleScenario, RuleConfiguration, SimpleExportedRule } from "./types";
import { createWarningRule } from "@/services/warningService";

interface SimpleRuleBuilderProps {
  onSave?: (rule: SimpleExportedRule) => void;
  onCancel?: () => void;
  className?: string;
}

const SimpleRuleBuilder: React.FC<SimpleRuleBuilderProps> = ({
  onSave,
  onCancel,
  className,
}) => {
  const [currentView, setCurrentView] = useState<"scenarios" | "wizard">(
    "scenarios"
  );
  const [selectedScenario, setSelectedScenario] = useState<RuleScenario | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  // 选择场景
  const handleSelectScenario = (scenario: RuleScenario) => {
    setSelectedScenario(scenario);
    setCurrentView("wizard");
  };

  // 返回场景选择
  const handleBackToScenarios = () => {
    setCurrentView("scenarios");
    setSelectedScenario(null);
  };

  // 保存规则配置
  const handleSaveRule = async (configuration: RuleConfiguration) => {
    if (!selectedScenario) return;

    setIsSaving(true);
    try {
      // 生成自然语言描述
      let naturalLanguage = selectedScenario.template.conditionTemplate;
      Object.entries(configuration.parameters).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        if (naturalLanguage.includes(placeholder)) {
          if (key === "subjects" && Array.isArray(value)) {
            const subjectLabels = value.map((v) => {
              const option = selectedScenario.parameters
                .find((p) => p.id === "subjects")
                ?.options?.find((o) => o.value === v);
              return option?.label || v;
            });
            naturalLanguage = naturalLanguage.replace(
              placeholder,
              subjectLabels.join("、")
            );
          } else {
            naturalLanguage = naturalLanguage.replace(
              placeholder,
              String(value)
            );
          }
        }
      });

      // 获取当前用户ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id || "anonymous-user";

      // 构建导出规则
      const exportedRule: SimpleExportedRule = {
        name: configuration.name,
        description: configuration.description,
        scenario: selectedScenario.id,
        parameters: configuration.parameters,
        severity: selectedScenario.template.severity,
        scope: selectedScenario.template.scope,
        category: selectedScenario.template.category,
        priority: selectedScenario.template.priority,
        is_active: configuration.isActive,
        conditions: {
          naturalLanguage,
          sql: selectedScenario.template.sqlTemplate,
          parameters: configuration.parameters,
        },
        metadata: {
          createdBy: currentUserId,
          createdWith: "simple_rule_builder",
          scenario: selectedScenario.id,
          version: "1.0.0",
        },
      };

      // 调用API保存规则
      const result = await createWarningRule({
        name: exportedRule.name,
        description: exportedRule.description,
        conditions: {
          scenario: exportedRule.scenario,
          parameters: exportedRule.parameters,
          naturalLanguage: exportedRule.conditions.naturalLanguage,
        },
        severity: exportedRule.severity,
        scope: exportedRule.scope,
        category: exportedRule.category,
        priority: exportedRule.priority,
        is_active: exportedRule.is_active,
        is_system: false,
        auto_trigger: true,
        notification_enabled: true,
        metadata: exportedRule.metadata,
      });

      if (result) {
        toast.success("预警规则创建成功！");
        onSave?.(exportedRule);
      } else {
        throw new Error("保存失败");
      }
    } catch (error) {
      console.error("保存规则失败:", error);
      toast.error("保存规则失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* 顶部标题栏 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black rounded-full">
                <Sparkles className="h-5 w-5 text-[#B9FF66]" />
              </div>
              <div>
                <CardTitle className="text-black font-black uppercase tracking-wide">
                  智能预警助手
                </CardTitle>
                <p className="text-black/70 text-sm font-medium">
                  通过简单的几步配置，快速创建专业的预警规则
                </p>
              </div>
            </div>

            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-2 border-black bg-white text-black font-bold"
              >
                关闭
              </Button>
            )}
          </div>
        </CardHeader>

        {/* 当前步骤指示 */}
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">当前步骤:</span>
            {currentView === "scenarios" && (
              <span className="font-medium text-[#191A23]">选择预警场景</span>
            )}
            {currentView === "wizard" && selectedScenario && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToScenarios}
                  className="h-auto p-1 text-gray-500 hover:text-black"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  选择预警场景
                </Button>
                <span className="text-gray-400">/</span>
                <span className="font-medium text-[#191A23]">
                  配置 "{selectedScenario.name}"
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <div className="min-h-[600px]">
        {currentView === "scenarios" && (
          <RuleScenarios onSelectScenario={handleSelectScenario} />
        )}

        {currentView === "wizard" && selectedScenario && (
          <RuleWizard
            scenario={selectedScenario}
            onSave={handleSaveRule}
            onCancel={handleBackToScenarios}
          />
        )}
      </div>

      {/* 底部帮助信息 */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-blue-100 rounded-full mt-0.5">
              <div className="w-4 h-4 rounded-full bg-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-1">使用提示</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  • <strong>简单上手</strong>
                  ：选择一个预设场景，按向导完成配置即可
                </p>
                <p>
                  • <strong>智能建议</strong>
                  ：系统会根据历史数据提供合理的默认参数
                </p>
                <p>
                  • <strong>实时预览</strong>
                  ：在保存前可以查看规则的具体效果和影响范围
                </p>
                <p>
                  • <strong>随时调整</strong>：保存后仍可在规则管理页面修改参数
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 加载遮罩 */}
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-sm">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B9FF66] mx-auto"></div>
              <div>
                <h3 className="font-bold text-[#191A23]">正在保存规则</h3>
                <p className="text-sm text-gray-600">
                  请稍候，正在创建您的预警规则...
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SimpleRuleBuilder;
