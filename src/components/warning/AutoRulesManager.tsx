import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  PlayCircle,
  StopCircle,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  FileCheck,
  Loader2,
  Zap,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import {
  getWarningRules,
  executeAllWarningRules,
  updateWarningRule,
  WarningRule,
  RuleExecutionResult,
} from "@/services/warningRulesService";

interface AutoRulesManagerProps {
  onRulesExecuted?: () => void;
}

const AutoRulesManager: React.FC<AutoRulesManagerProps> = ({
  onRulesExecuted,
}) => {
  const [rules, setRules] = useState<WarningRule[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<{
    time: string;
    totalWarnings: number;
    executedRules: number;
    processingTime: number;
    results: RuleExecutionResult[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载预警规则
  useEffect(() => {
    loadWarningRules();
  }, []);

  const loadWarningRules = async () => {
    try {
      setLoading(true);
      const rulesData = await getWarningRules();

      // 调试日志：查看规则数据结构
      console.log("🔍 [AutoRulesManager] 加载到的预警规则数据:", rulesData);
      rulesData.forEach((rule, index) => {
        console.log(`规则${index + 1}: ${rule.name}`);
        console.log("  conditions:", rule.conditions);
        console.log("  conditions类型:", typeof rule.conditions);
        console.log("  是否为数组:", Array.isArray(rule.conditions));
        if (Array.isArray(rule.conditions) && rule.conditions.length > 0) {
          console.log("  第一个条件:", rule.conditions[0]);
        }
      });

      setRules(rulesData);
    } catch (error) {
      console.error("加载预警规则失败:", error);
      toast.error("加载预警规则失败");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRules = async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    toast.info("开始执行预警规则...", {
      description: "正在分析学生数据并生成预警",
    });

    try {
      const result = await executeAllWarningRules();

      setLastExecution({
        time: new Date().toLocaleString("zh-CN"),
        totalWarnings: result.totalWarningsGenerated,
        executedRules: result.executedRules,
        processingTime: result.executionTime,
        results: result.results,
      });

      // 通知父组件规则已执行
      if (onRulesExecuted) {
        onRulesExecuted();
      }

      console.log("预警规则执行结果:", result);
    } catch (error) {
      console.error("执行预警规则失败:", error);
      toast.error("执行预警规则失败", {
        description: "请检查网络连接和数据库状态",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await updateWarningRule(ruleId, { is_active: isActive });

      setRules((prevRules) =>
        prevRules.map((rule) =>
          rule.id === ruleId ? { ...rule, is_active: isActive } : rule
        )
      );

      toast.success(isActive ? "规则已启用" : "规则已禁用");
    } catch (error) {
      console.error("切换规则状态失败:", error);
      toast.error("操作失败");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case "high":
        return "高风险";
      case "medium":
        return "中风险";
      case "low":
        return "低风险";
      default:
        return "未知";
    }
  };

  // 生成条件的可读性描述
  const getConditionDescription = (condition: any) => {
    console.log("🔍 [getConditionDescription] 处理条件:", condition);

    if (!condition) {
      console.log("  ❌ 条件为空或undefined");
      return "无效条件";
    }

    // 如果已有description，直接使用
    if (condition.description && typeof condition.description === "string") {
      console.log("  ✅ 使用现有description:", condition.description);
      return condition.description;
    }

    // 根据类型和值生成描述
    const { type, operator, value, timeframe, subject } = condition;
    console.log("  🔧 生成描述，字段值:", {
      type,
      operator,
      value,
      timeframe,
      subject,
    });

    const operatorText =
      {
        gt: "大于",
        gte: "大于等于",
        lt: "小于",
        lte: "小于等于",
        eq: "等于",
      }[operator] || operator;

    const timeframeText =
      {
        "1week": "一周内",
        "1month": "一个月内",
        "1semester": "一学期内",
        "3months": "三个月内",
      }[timeframe] || timeframe;

    const typeDescriptions = {
      grade_decline: `成绩下降次数${operatorText}${value}次${timeframeText ? `(${timeframeText})` : ""}`,
      homework_missing: `作业提交率${operatorText}${value}%${timeframeText ? `(${timeframeText})` : ""}`,
      knowledge_gap: `知识点掌握率${operatorText}${value}%${subject ? `(${subject})` : ""}`,
      attendance: `出勤率${operatorText}${value}%${timeframeText ? `(${timeframeText})` : ""}`,
      composite: `综合风险评分${operatorText}${value}分`,
    };

    const finalDescription =
      typeDescriptions[type] || `${type}: ${operatorText} ${value}`;
    console.log("  📝 最终描述:", finalDescription);
    return finalDescription;
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 rounded-xl">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c0ff3f] mr-3" />
          <span className="text-gray-600">加载预警规则...</span>
        </CardContent>
      </Card>
    );
  }

  const activeRulesCount = rules.filter((rule) => rule.is_active).length;

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card className="bg-white border border-gray-200 rounded-xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center text-lg font-semibold text-gray-800">
                <Zap className="h-5 w-5 mr-2 text-[#c0ff3f]" />
                自动预警规则执行
              </CardTitle>
              <CardDescription className="text-gray-500 mt-1">
                基于预设规则自动检测学生风险并生成预警
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center">
                <Activity className="h-3 w-3 mr-1" />
                {activeRulesCount}/{rules.length} 规则激活
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {lastExecution
                ? `上次执行: ${lastExecution.time}`
                : "从未执行过规则检查"}
            </div>
            <Button
              onClick={handleExecuteRules}
              disabled={isExecuting || activeRulesCount === 0}
              className="bg-[#c0ff3f] text-black hover:bg-[#a5e034] font-medium"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  执行中...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  执行规则检查
                </>
              )}
            </Button>
          </div>

          {activeRulesCount === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-800">
                  没有激活的预警规则，请启用至少一条规则后再执行
                </span>
              </div>
            </div>
          )}

          {lastExecution && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-800">
                  最近执行结果
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <FileCheck className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-lg font-bold text-gray-800">
                        {lastExecution.executedRules}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">执行规则数</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-lg font-bold text-gray-800">
                        {lastExecution.totalWarnings}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">生成预警数</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Users className="h-4 w-4 text-orange-500 mr-1" />
                      <span className="text-lg font-bold text-gray-800">
                        {lastExecution.results.reduce(
                          (sum, r) => sum + r.matchedStudents.length,
                          0
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">匹配学生数</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-lg font-bold text-gray-800">
                        {(lastExecution.processingTime / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">处理耗时</p>
                  </div>
                </div>

                {lastExecution.totalWarnings > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <p className="text-sm text-green-800">
                        成功为{" "}
                        <Badge variant="outline" className="mx-1">
                          {lastExecution.totalWarnings}
                        </Badge>{" "}
                        名学生生成预警记录
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 规则列表 */}
      <Card className="bg-white border border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-gray-800">
            <Settings className="h-5 w-5 mr-2 text-[#c0ff3f]" />
            预警规则管理
          </CardTitle>
          <CardDescription className="text-gray-500">
            管理自动预警规则的启用状态和执行条件
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-800">{rule.name}</h3>
                      <Badge className={getSeverityColor(rule.severity)}>
                        {getSeverityText(rule.severity)}
                      </Badge>
                      {rule.is_system && (
                        <Badge variant="outline" className="text-xs">
                          系统规则
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {rule.description}
                    </p>

                    <div className="text-xs text-gray-500">
                      <strong>触发条件:</strong>
                      <ul className="mt-1 space-y-1">
                        {(Array.isArray(rule.conditions)
                          ? rule.conditions
                          : []
                        ).map((condition, index) => (
                          <li key={index} className="ml-2 flex items-start">
                            <span className="text-[#c0ff3f] mr-1">•</span>
                            <span className="text-gray-700">
                              {getConditionDescription(condition)}
                            </span>
                          </li>
                        ))}
                        {(!Array.isArray(rule.conditions) ||
                          rule.conditions.length === 0) && (
                          <li className="ml-2 text-amber-600 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            <span>
                              该规则尚未配置具体触发条件，可能无法正常执行
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {rule.is_active ? "已启用" : "已禁用"}
                      </span>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) =>
                          handleToggleRule(rule.id, checked)
                        }
                        className="data-[state=checked]:bg-[#c0ff3f]"
                      />
                    </div>
                  </div>
                </div>

                {/* 规则执行结果 */}
                {lastExecution &&
                  lastExecution.results.find((r) => r.ruleId === rule.id) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {(() => {
                        const result = lastExecution.results.find(
                          (r) => r.ruleId === rule.id
                        )!;
                        return (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-4">
                              <span className="text-gray-600">
                                匹配学生:{" "}
                                <strong>{result.matchedStudents.length}</strong>
                              </span>
                              <span className="text-gray-600">
                                生成预警:{" "}
                                <strong>{result.warningsGenerated}</strong>
                              </span>
                              {result.errors.length > 0 && (
                                <span className="text-red-600">
                                  错误: <strong>{result.errors.length}</strong>
                                </span>
                              )}
                            </div>
                            <span className="text-gray-500">
                              用时: {(result.executionTime / 1000).toFixed(1)}s
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
              </div>
            ))}

            {rules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>暂无预警规则</p>
                <p className="text-sm mt-1">系统会自动创建默认预警规则</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <FileCheck className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>自动预警规则说明:</strong>
            </p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>成绩下降预警: 检测学生连续考试成绩下降或不及格情况</li>
              <li>作业缺交预警: 监控学生作业提交率和完成质量</li>
              <li>知识点薄弱预警: 分析学生知识点掌握程度</li>
              <li>综合风险预警: 结合多个维度评估学生学习风险</li>
            </ul>
            <p className="text-xs text-blue-600 mt-2">
              建议定期执行规则检查，或配合数据集成功能自动触发
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoRulesManager;
