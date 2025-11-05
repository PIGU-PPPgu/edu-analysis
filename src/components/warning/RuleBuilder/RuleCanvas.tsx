/**
 * 规则构建画布组件 - 可视化拖拽构建预警规则
 * 支持拖放、节点连接、条件编辑等功能
 */

import React, { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Copy,
  Move,
  Settings,
  Play,
  Save,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ConditionNode,
  DragItem,
  OperatorType,
  LogicOperator,
  RuleBuilderState,
  ValidationResult,
} from "./types";
import { MetricDefinition } from "./types";
import { getMetricById } from "./metricDefinitions";

interface RuleCanvasProps {
  state: RuleBuilderState;
  onStateChange: (newState: RuleBuilderState) => void;
  className?: string;
}

// 操作符选项
const operatorOptions: {
  value: OperatorType;
  label: string;
  description: string;
}[] = [
  { value: ">", label: "大于", description: "值大于指定数值" },
  { value: "<", label: "小于", description: "值小于指定数值" },
  { value: ">=", label: "大于等于", description: "值大于或等于指定数值" },
  { value: "<=", label: "小于等于", description: "值小于或等于指定数值" },
  { value: "=", label: "等于", description: "值等于指定数值" },
  { value: "!=", label: "不等于", description: "值不等于指定数值" },
  { value: "between", label: "介于", description: "值在指定范围内" },
  { value: "not_between", label: "不在范围", description: "值不在指定范围内" },
  { value: "top_percent", label: "前百分比", description: "排名在前N%" },
  { value: "bottom_percent", label: "后百分比", description: "排名在后N%" },
  { value: "consecutive", label: "连续条件", description: "连续N次满足条件" },
  { value: "trend_down", label: "下降趋势", description: "呈现下降趋势" },
  { value: "trend_up", label: "上升趋势", description: "呈现上升趋势" },
];

// 逻辑操作符选项
const logicOperatorOptions: {
  value: LogicOperator;
  label: string;
  color: string;
}[] = [
  { value: "AND", label: "并且", color: "bg-blue-100 text-blue-800" },
  { value: "OR", label: "或者", color: "bg-green-100 text-green-800" },
  { value: "NOT", label: "非", color: "bg-red-100 text-red-800" },
];

// 条件节点组件
const ConditionNodeComponent: React.FC<{
  node: ConditionNode;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ConditionNode>) => void;
  onDelete: () => void;
}> = ({ node, isSelected, onSelect, onUpdate, onDelete }) => {
  const metric = node.data.metric ? getMetricById(node.data.metric) : null;

  const handleDataUpdate = (key: string, value: any) => {
    onUpdate({
      data: {
        ...node.data,
        [key]: value,
      },
    });
  };

  // 根据节点类型渲染不同的内容
  const renderNodeContent = () => {
    switch (node.type) {
      case "metric":
        return (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{metric?.icon || "📊"}</span>
              <span className="font-bold text-sm text-[#191A23]">
                {metric?.displayName || "未知指标"}
              </span>
            </div>
            {metric && (
              <div className="flex gap-1">
                <Badge className="text-xs bg-blue-100 text-blue-800 border border-blue-200">
                  {metric.type}
                </Badge>
                {metric.unit && (
                  <Badge variant="outline" className="text-xs border-black">
                    {metric.unit}
                  </Badge>
                )}
              </div>
            )}
          </div>
        );

      case "operator":
        return (
          <div className="p-3">
            <Label className="text-xs font-bold text-[#191A23] mb-2 block">
              操作符
            </Label>
            <Select
              value={node.data.operator || ""}
              onValueChange={(value) =>
                handleDataUpdate("operator", value as OperatorType)
              }
            >
              <SelectTrigger className="text-sm border border-black">
                <SelectValue placeholder="选择操作符" />
              </SelectTrigger>
              <SelectContent>
                {operatorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">
                        {option.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "value":
        return (
          <div className="p-3">
            <Label className="text-xs font-bold text-[#191A23] mb-2 block">
              条件值
            </Label>
            {node.data.operator === "between" ||
            node.data.operator === "not_between" ? (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="最小值"
                  value={node.data.values?.[0] || ""}
                  onChange={(e) => {
                    const values = node.data.values || [];
                    values[0] = parseFloat(e.target.value) || 0;
                    handleDataUpdate("values", values);
                  }}
                  className="text-sm border border-black"
                />
                <Input
                  type="number"
                  placeholder="最大值"
                  value={node.data.values?.[1] || ""}
                  onChange={(e) => {
                    const values = node.data.values || [];
                    values[1] = parseFloat(e.target.value) || 0;
                    handleDataUpdate("values", values);
                  }}
                  className="text-sm border border-black"
                />
              </div>
            ) : (
              <Input
                type="number"
                placeholder="输入数值"
                value={node.data.value || ""}
                onChange={(e) =>
                  handleDataUpdate("value", parseFloat(e.target.value) || 0)
                }
                className="text-sm border border-black"
              />
            )}
          </div>
        );

      case "group":
        return (
          <div className="p-3">
            <Label className="text-xs font-bold text-[#191A23] mb-2 block">
              逻辑关系
            </Label>
            <div className="flex gap-1">
              {logicOperatorOptions.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={
                    node.data.logic === option.value ? "default" : "outline"
                  }
                  onClick={() => handleDataUpdate("logic", option.value)}
                  className={cn(
                    "text-xs font-bold border border-black",
                    node.data.logic === option.value
                      ? option.color
                      : "bg-white text-[#191A23]"
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-3">
            <div className="text-sm text-gray-500">条件节点</div>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "bg-white border-2 border-black rounded-lg cursor-pointer transition-all duration-200",
        "hover:shadow-[4px_4px_0px_0px_#000]",
        isSelected && "ring-2 ring-[#B9FF66] shadow-[4px_4px_0px_0px_#B9FF66]"
      )}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        minWidth: "200px",
      }}
      onClick={onSelect}
    >
      {/* 节点头部 */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        <Badge className="text-xs font-bold">{node.type}</Badge>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-6 w-6 p-0 hover:bg-red-100"
          >
            <Trash2 className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      </div>

      {/* 节点内容 */}
      {renderNodeContent()}
    </div>
  );
};

const RuleCanvas: React.FC<RuleCanvasProps> = ({
  state,
  onStateChange,
  className,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 处理拖放
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      try {
        const dragData = e.dataTransfer.getData("application/json");
        const dragItem: DragItem = JSON.parse(dragData);

        if (dragItem.type === "metric" && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          // 创建新的指标节点
          const newNode: ConditionNode = {
            id: `node_${Date.now()}`,
            type: "metric",
            position: { x, y },
            data: {
              metric: dragItem.data.id,
              label: dragItem.data.displayName,
            },
          };

          // 更新状态
          const newNodes = { ...state.nodes, [newNode.id]: newNode };
          onStateChange({
            ...state,
            nodes: newNodes,
            selectedNodeId: newNode.id,
          });
        }
      } catch (error) {
        console.error("处理拖放失败:", error);
      }
    },
    [state, onStateChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  // 选择节点
  const selectNode = (nodeId: string) => {
    onStateChange({
      ...state,
      selectedNodeId: nodeId,
    });
  };

  // 更新节点
  const updateNode = (nodeId: string, updates: Partial<ConditionNode>) => {
    const updatedNode = { ...state.nodes[nodeId], ...updates };
    const newNodes = { ...state.nodes, [nodeId]: updatedNode };

    onStateChange({
      ...state,
      nodes: newNodes,
    });
  };

  // 删除节点
  const deleteNode = (nodeId: string) => {
    const newNodes = { ...state.nodes };
    delete newNodes[nodeId];

    onStateChange({
      ...state,
      nodes: newNodes,
      selectedNodeId:
        state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    });
  };

  // 添加操作符节点
  const addOperatorNode = () => {
    const newNode: ConditionNode = {
      id: `operator_${Date.now()}`,
      type: "operator",
      position: { x: 100, y: 100 },
      data: {},
    };

    const newNodes = { ...state.nodes, [newNode.id]: newNode };
    onStateChange({
      ...state,
      nodes: newNodes,
      selectedNodeId: newNode.id,
    });
  };

  // 添加值节点
  const addValueNode = () => {
    const newNode: ConditionNode = {
      id: `value_${Date.now()}`,
      type: "value",
      position: { x: 200, y: 100 },
      data: {},
    };

    const newNodes = { ...state.nodes, [newNode.id]: newNode };
    onStateChange({
      ...state,
      nodes: newNodes,
      selectedNodeId: newNode.id,
    });
  };

  // 添加分组节点
  const addGroupNode = () => {
    const newNode: ConditionNode = {
      id: `group_${Date.now()}`,
      type: "group",
      position: { x: 300, y: 100 },
      data: {
        logic: "AND",
      },
    };

    const newNodes = { ...state.nodes, [newNode.id]: newNode };
    onStateChange({
      ...state,
      nodes: newNodes,
      selectedNodeId: newNode.id,
    });
  };

  // 清空画布
  const clearCanvas = () => {
    onStateChange({
      ...state,
      nodes: {},
      selectedNodeId: null,
      rootNodeId: null,
    });
  };

  // 验证规则
  const validateRule = (): ValidationResult => {
    const errors: ValidationResult["errors"] = [];
    const warnings: ValidationResult["warnings"] = [];

    // 检查是否有节点
    if (Object.keys(state.nodes).length === 0) {
      errors.push({
        type: "missing_value",
        message: "规则不能为空，请添加至少一个条件",
        severity: "error",
      });
    }

    // 检查各节点的完整性
    Object.values(state.nodes).forEach((node) => {
      switch (node.type) {
        case "metric":
          if (!node.data.metric) {
            errors.push({
              nodeId: node.id,
              type: "missing_value",
              message: "指标节点缺少指标定义",
              severity: "error",
            });
          }
          break;
        case "operator":
          if (!node.data.operator) {
            errors.push({
              nodeId: node.id,
              type: "missing_value",
              message: "操作符节点缺少操作符",
              severity: "error",
            });
          }
          break;
        case "value":
          if (node.data.value === undefined && !node.data.values) {
            errors.push({
              nodeId: node.id,
              type: "missing_value",
              message: "数值节点缺少数值",
              severity: "error",
            });
          }
          break;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance: {
        estimatedQueryTime: 100, // 模拟值
        complexity: "low",
        optimizations: [],
      },
    };
  };

  const validation = useMemo(() => validateRule(), [state.nodes]);

  return (
    <Card
      className={cn(
        "border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF]",
        className
      )}
    >
      {/* 画布头部 */}
      <CardHeader className="bg-[#9C88FF] border-b-2 border-black p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white font-black uppercase tracking-wide">
            规则构建画布
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* 验证状态 */}
            {validation.isValid ? (
              <Badge className="bg-green-500 text-white border border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                规则有效
              </Badge>
            ) : (
              <Badge className="bg-red-500 text-white border border-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                {validation.errors.length} 个错误
              </Badge>
            )}
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={addOperatorNode}
            className="border-2 border-white bg-white text-[#9C88FF] font-bold text-xs hover:bg-gray-50"
          >
            <Plus className="h-3 w-3 mr-1" />
            操作符
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={addValueNode}
            className="border-2 border-white bg-white text-[#9C88FF] font-bold text-xs hover:bg-gray-50"
          >
            <Plus className="h-3 w-3 mr-1" />
            数值
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={addGroupNode}
            className="border-2 border-white bg-white text-[#9C88FF] font-bold text-xs hover:bg-gray-50"
          >
            <Plus className="h-3 w-3 mr-1" />
            分组
          </Button>
          <div className="border-l-2 border-white/30 mx-2 h-6" />
          <Button
            size="sm"
            variant="outline"
            onClick={clearCanvas}
            className="border-2 border-white bg-white text-red-600 font-bold text-xs hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            清空
          </Button>
        </div>
      </CardHeader>

      {/* 画布内容 */}
      <CardContent className="p-0 relative">
        <div
          ref={canvasRef}
          className={cn(
            "relative min-h-[600px] bg-gray-50",
            "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[length:20px_20px]",
            isDragging &&
              "bg-[#B9FF66]/10 border-2 border-dashed border-[#B9FF66]"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          {/* 空状态提示 */}
          {Object.keys(state.nodes).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-lg font-bold text-[#191A23] mb-2">
                  开始构建预警规则
                </h3>
                <p className="text-sm text-[#191A23]/70 mb-4">
                  从左侧拖拽指标到这里，或使用上方工具栏添加条件节点
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    onClick={addOperatorNode}
                    className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold"
                  >
                    添加操作符
                  </Button>
                  <Button
                    size="sm"
                    onClick={addValueNode}
                    className="bg-[#9C88FF] text-white border-2 border-black font-bold"
                  >
                    添加数值
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 拖拽覆盖层 */}
          {isDragging && (
            <div className="absolute inset-0 bg-[#B9FF66]/20 border-4 border-dashed border-[#B9FF66] flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📌</div>
                <p className="text-lg font-bold text-[#191A23]">
                  释放以添加指标
                </p>
              </div>
            </div>
          )}

          {/* 渲染节点 */}
          {Object.values(state.nodes).map((node) => (
            <ConditionNodeComponent
              key={node.id}
              node={node}
              isSelected={state.selectedNodeId === node.id}
              onSelect={() => selectNode(node.id)}
              onUpdate={(updates) => updateNode(node.id, updates)}
              onDelete={() => deleteNode(node.id)}
            />
          ))}
        </div>

        {/* 验证错误显示 */}
        {!validation.isValid && (
          <div className="p-4 border-t-2 border-black bg-red-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-800 text-sm">规则验证失败</h4>
                <ul className="text-sm text-red-700 mt-1 space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>• {error.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RuleCanvas;
