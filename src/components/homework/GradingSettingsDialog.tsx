import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Settings,
  Sliders,
  Plus,
  X,
  Save,
  Trash2,
  BrainCircuit,
  BarChart3,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// 评分方案模式
export type GradingScale = {
  id: string;
  name: string;
  description: string;
  levels: {
    value: number;
    name: string;
    color: string;
  }[];
};

// 知识点阈值设置
export type KnowledgePointThreshold = {
  level: string;
  threshold: number;
  color: string;
};

// 默认评分方案
const defaultGradingScales: GradingScale[] = [
  {
    id: "scale1",
    name: "优良中差",
    description: "传统四级评分",
    levels: [
      { value: 90, name: "优", color: "bg-green-500" },
      { value: 80, name: "良", color: "bg-blue-500" },
      { value: 70, name: "中", color: "bg-yellow-500" },
      { value: 60, name: "差", color: "bg-red-500" },
    ],
  },
  {
    id: "scale2",
    name: "五星评级",
    description: "星级评分方案",
    levels: [
      { value: 90, name: "五星", color: "bg-purple-500" },
      { value: 80, name: "四星", color: "bg-blue-500" },
      { value: 70, name: "三星", color: "bg-green-500" },
      { value: 60, name: "二星", color: "bg-yellow-500" },
      { value: 0, name: "一星", color: "bg-red-500" },
    ],
  },
];

// 默认知识点阈值
const defaultKnowledgePointThresholds: KnowledgePointThreshold[] = [
  { level: "精通", threshold: 90, color: "bg-green-500" },
  { level: "熟练", threshold: 75, color: "bg-blue-500" },
  { level: "掌握", threshold: 60, color: "bg-yellow-500" },
  { level: "不熟", threshold: 0, color: "bg-red-500" },
];

const scaleSchema = z.object({
  name: z.string().min(1, "评分方案名称不能为空"),
  description: z.string().optional(),
  levels: z.array(
    z.object({
      value: z.number().min(0).max(100),
      name: z.string().min(1, "等级名称不能为空"),
      color: z.string(),
    })
  ).min(1, "至少需要一个评分等级"),
});

// GradingSettingsDialog组件的Props
interface GradingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GradingSettingsDialog({
  open,
  onOpenChange,
}: GradingSettingsDialogProps) {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState("scales");
  const [scales, setScales] = useState<GradingScale[]>(defaultGradingScales);
  const [thresholds, setThresholds] = useState<KnowledgePointThreshold[]>(
    defaultKnowledgePointThresholds
  );
  const [editingScale, setEditingScale] = useState<GradingScale | null>(null);
  const [defaultScaleId, setDefaultScaleId] = useState<string>("scale1");

  const form = useForm<z.infer<typeof scaleSchema>>({
    resolver: zodResolver(scaleSchema),
    defaultValues: {
      name: "",
      description: "",
      levels: [
        { value: 90, name: "", color: "bg-green-500" },
        { value: 60, name: "", color: "bg-red-500" },
      ],
    },
  });

  // 处理保存评分方案
  const handleSaveScale = (values: z.infer<typeof scaleSchema>) => {
    if (editingScale) {
      // 更新现有方案
      setScales(
        scales.map((scale) =>
          scale.id === editingScale.id
            ? { ...scale, ...values }
            : scale
        )
      );
      toast({
        title: "更新成功",
        description: `评分方案 "${values.name}" 已更新`,
      });
    } else {
      // 创建新方案
      const newScale: GradingScale = {
        id: `scale${Date.now()}`,
        ...values,
      };
      setScales([...scales, newScale]);
      toast({
        title: "创建成功",
        description: `评分方案 "${values.name}" 已创建`,
      });
    }

    // 重置表单
    form.reset({
      name: "",
      description: "",
      levels: [
        { value: 90, name: "", color: "bg-green-500" },
        { value: 60, name: "", color: "bg-red-500" },
      ],
    });
    setEditingScale(null);
  };

  // 编辑评分方案
  const handleEditScale = (scale: GradingScale) => {
    setEditingScale(scale);
    form.reset({
      name: scale.name,
      description: scale.description,
      levels: scale.levels,
    });
  };

  // 删除评分方案
  const handleDeleteScale = (scaleId: string) => {
    setScales(scales.filter((scale) => scale.id !== scaleId));
    // 如果删除的是默认方案，重置默认方案
    if (scaleId === defaultScaleId && scales.length > 1) {
      setDefaultScaleId(scales.find((s) => s.id !== scaleId)?.id || "");
    }
    toast({
      title: "删除成功",
      description: "评分方案已删除",
    });
  };

  // 添加评分等级
  const handleAddLevel = () => {
    const currentLevels = form.getValues("levels");
    form.setValue("levels", [
      ...currentLevels,
      { value: 50, name: "", color: "bg-yellow-500" },
    ]);
  };

  // 删除评分等级
  const handleRemoveLevel = (index: number) => {
    const currentLevels = form.getValues("levels");
    if (currentLevels.length > 1) {
      form.setValue(
        "levels",
        currentLevels.filter((_, i) => i !== index)
      );
    }
  };

  // 更新知识点阈值
  const handleUpdateThreshold = (index: number, value: number) => {
    const updatedThresholds = [...thresholds];
    updatedThresholds[index].threshold = value;
    setThresholds(updatedThresholds);
  };

  // 设置默认评分方案
  const handleSetDefaultScale = (scaleId: string) => {
    setDefaultScaleId(scaleId);
    toast({
      title: "设置成功",
      description: "默认评分方案已更新",
    });
  };

  // 保存所有设置
  const handleSaveSettings = () => {
    toast({
      title: "保存成功",
      description: "批改设置已保存",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            批改设置
          </DialogTitle>
          <DialogDescription>
            设置评分方案和知识点掌握程度阈值
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList>
            <TabsTrigger value="scales">
              <Sliders className="h-4 w-4 mr-2" />
              评分方案
            </TabsTrigger>
            <TabsTrigger value="thresholds">
              <BrainCircuit className="h-4 w-4 mr-2" />
              知识点阈值
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scales" className="space-y-4 mt-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-medium">评分方案列表</h3>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingScale(null);
                  form.reset({
                    name: "",
                    description: "",
                    levels: [
                      { value: 90, name: "", color: "bg-green-500" },
                      { value: 60, name: "", color: "bg-red-500" },
                    ],
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                添加方案
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scales.map((scale) => (
                <Card key={scale.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base flex items-center">
                          {scale.name}
                          {scale.id === defaultScaleId && (
                            <Badge variant="default" className="ml-2">
                              默认
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{scale.description}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditScale(scale)}
                        >
                          编辑
                        </Button>
                        {scale.id !== defaultScaleId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteScale(scale.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {scale.levels.map((level, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className={`${level.color} text-white`}
                        >
                          {level.name}: ≥{level.value}
                        </Badge>
                      ))}
                    </div>
                    {scale.id !== defaultScaleId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleSetDefaultScale(scale.id)}
                      >
                        设为默认
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSaveScale)}
                className="space-y-4"
              >
                <h3 className="text-lg font-medium">
                  {editingScale ? "编辑评分方案" : "创建评分方案"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>方案名称</FormLabel>
                        <FormControl>
                          <Input placeholder="输入方案名称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>方案描述</FormLabel>
                        <FormControl>
                          <Input placeholder="描述该评分方案" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel>评分等级</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddLevel}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      添加等级
                    </Button>
                  </div>

                  {form.watch("levels").map((level, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 mb-2"
                    >
                      <Input
                        placeholder="等级名称"
                        value={level.name}
                        onChange={(e) => {
                          const updatedLevels = [...form.getValues("levels")];
                          updatedLevels[index].name = e.target.value;
                          form.setValue("levels", updatedLevels);
                        }}
                        className="w-1/3"
                      />
                      <div className="flex items-center gap-1">
                        <span>≥</span>
                        <Input
                          type="number"
                          placeholder="分数值"
                          value={level.value}
                          onChange={(e) => {
                            const updatedLevels = [...form.getValues("levels")];
                            updatedLevels[index].value = parseInt(
                              e.target.value,
                              10
                            );
                            form.setValue("levels", updatedLevels);
                          }}
                          className="w-20"
                          min={0}
                          max={100}
                        />
                        <span>分</span>
                      </div>
                      <select
                        value={level.color}
                        onChange={(e) => {
                          const updatedLevels = [...form.getValues("levels")];
                          updatedLevels[index].color = e.target.value;
                          form.setValue("levels", updatedLevels);
                        }}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1"
                      >
                        <option value="bg-green-500">绿色</option>
                        <option value="bg-blue-500">蓝色</option>
                        <option value="bg-yellow-500">黄色</option>
                        <option value="bg-red-500">红色</option>
                        <option value="bg-purple-500">紫色</option>
                        <option value="bg-pink-500">粉色</option>
                      </select>
                      <div
                        className={`w-6 h-6 rounded-full ${level.color}`}
                      ></div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLevel(index)}
                        disabled={form.watch("levels").length <= 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <FormDescription>
                    定义不同的评分等级和对应的分数阈值
                  </FormDescription>
                  <FormMessage />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset({
                        name: "",
                        description: "",
                        levels: [
                          { value: 90, name: "", color: "bg-green-500" },
                          { value: 60, name: "", color: "bg-red-500" },
                        ],
                      });
                      setEditingScale(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    保存方案
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="thresholds" className="space-y-4 mt-4">
            <h3 className="text-lg font-medium">知识点掌握程度阈值设置</h3>
            <p className="text-sm text-muted-foreground">
              设置不同掌握程度的分数阈值，用于评估学生对知识点的掌握情况
            </p>

            <div className="space-y-3">
              {thresholds.map((threshold, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3"
                >
                  <div className="w-20">
                    <Badge
                      variant="outline"
                      className={`${threshold.color} text-white w-full justify-center`}
                    >
                      {threshold.level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <span>≥</span>
                    <Input
                      type="number"
                      value={threshold.threshold}
                      onChange={(e) =>
                        handleUpdateThreshold(
                          index,
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="w-20"
                      min={0}
                      max={100}
                    />
                    <span>分</span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${threshold.color}`}
                          style={{
                            width: `${threshold.threshold}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted p-4 rounded-lg mt-6">
              <h4 className="font-medium flex items-center mb-2">
                <BarChart3 className="h-4 w-4 mr-2" />
                预览效果
              </h4>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {thresholds.map((threshold, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className={`${threshold.color} text-white`}
                    >
                      {threshold.level}: ≥{threshold.threshold}分
                    </Badge>
                  ))}
                </div>
                <div className="space-y-1 mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden flex">
                    {thresholds
                      .slice()
                      .sort((a, b) => a.threshold - b.threshold)
                      .map((threshold, index, arr) => {
                        // 计算当前区间的宽度
                        const prevThreshold = index > 0 ? arr[index - 1].threshold : 0;
                        const width = threshold.threshold - prevThreshold;
                        return (
                          <div
                            key={index}
                            className={`h-full ${threshold.color}`}
                            style={{ width: `${width}%` }}
                          ></div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSaveSettings}>
            <Check className="h-4 w-4 mr-2" />
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 