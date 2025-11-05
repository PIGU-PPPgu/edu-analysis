import React, { useState, useEffect } from "react";
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
  CardFooter,
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
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getGradingScales,
  getGradingScaleWithLevels,
  createGradingScale,
  updateGradingScale,
  deleteGradingScale,
  GradingScale as DBGradingScale,
  GradingScaleLevel,
} from "@/services/gradingService";
import {
  getUserThresholds,
  saveUserThresholds,
  getDefaultThresholds,
  KnowledgePointThreshold as DBKnowledgePointThreshold,
} from "@/services/knowledgePointThresholdService";
import { useAppAuth } from "@/contexts/unified/UnifiedAppContext";

// UI组件的评分方案类型
export type GradingScale = {
  id: string;
  name: string;
  description: string;
  levels: {
    value: number;
    name: string;
    color: string;
  }[];
  is_default?: boolean;
};

// 知识点阈值设置（UI使用的类型）
export type KnowledgePointThreshold = {
  level: string;
  threshold: number;
  color: string;
};

// 默认知识点阈值
const defaultKnowledgePointThresholds = getDefaultThresholds().map((t) => ({
  level: t.level,
  threshold: t.threshold,
  color: t.color,
}));

const scaleSchema = z.object({
  name: z.string().min(1, "评分方案名称不能为空"),
  description: z.string().optional(),
  levels: z
    .array(
      z.object({
        value: z.preprocess((val) => Number(val), z.number().min(0).max(100)),
        name: z.string().min(1, "等级名称不能为空"),
        color: z.string(),
      })
    )
    .min(1, "至少需要一个评分等级"),
});

// GradingSettingsDialog组件的Props
interface GradingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 将DB格式转换为UI格式
const convertDbScaleToUiScale = (dbScale: DBGradingScale): GradingScale => {
  return {
    id: dbScale.id || "",
    name: dbScale.name,
    description: dbScale.created_at || "",
    is_default: dbScale.is_default,
    levels: (dbScale.levels || []).map((level) => ({
      value: level.min_score,
      name: level.name,
      color: level.color || "bg-green-500",
    })),
  };
};

// 将UI格式转换为DB格式
const convertUiScaleToDbScale = (
  uiScale: GradingScale,
  userId?: string
): DBGradingScale => {
  return {
    id: uiScale.id,
    name: uiScale.name,
    created_by: userId,
    is_default: uiScale.is_default,
    levels: uiScale.levels.map((level, index) => ({
      name: level.name,
      min_score: level.value,
      max_score: 100,
      color: level.color,
      position: index,
    })),
  };
};

// 将UI阈值格式转换为DB格式
const convertUiThresholdsToDbThresholds = (
  uiThresholds: KnowledgePointThreshold[]
): DBKnowledgePointThreshold[] => {
  return uiThresholds.map((threshold, index) => ({
    level: threshold.level,
    threshold: threshold.threshold,
    color: threshold.color,
    position: index,
  }));
};

// 将DB阈值格式转换为UI格式
const convertDbThresholdsToUiThresholds = (
  dbThresholds: DBKnowledgePointThreshold[]
): KnowledgePointThreshold[] => {
  return dbThresholds.map((threshold) => ({
    level: threshold.level,
    threshold: threshold.threshold,
    color: threshold.color,
  }));
};

export default function GradingSettingsDialog({
  open,
  onOpenChange,
}: GradingSettingsDialogProps) {
  const { user } = useAppAuth();
  const [currentTab, setCurrentTab] = useState("scales");
  const [scales, setScales] = useState<GradingScale[]>([]);
  const [thresholds, setThresholds] = useState<KnowledgePointThreshold[]>(
    defaultKnowledgePointThresholds
  );
  const [editingScale, setEditingScale] = useState<GradingScale | null>(null);
  const [defaultScaleId, setDefaultScaleId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedScaleId, setSelectedScaleId] = useState<string>("");
  const [thresholdsLoaded, setThresholdsLoaded] = useState(false);

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

  // 加载评分方案和知识点阈值
  useEffect(() => {
    if (open) {
      fetchGradingScales();
      fetchUserThresholds();
    }
  }, [open]);

  // 从Supabase获取评分方案
  const fetchGradingScales = async () => {
    setLoading(true);
    try {
      const dbScales = await getGradingScales();

      // 处理每个评分方案
      const uiScales: GradingScale[] = [];
      for (const scale of dbScales) {
        const detailedScale = await getGradingScaleWithLevels(scale.id || "");
        if (detailedScale) {
          const uiScale = convertDbScaleToUiScale(detailedScale);
          uiScales.push(uiScale);

          // 设置默认方案
          if (scale.is_default) {
            setDefaultScaleId(scale.id || "");
          }
        }
      }

      setScales(uiScales);

      // 如果有方案，选中第一个
      if (uiScales.length > 0) {
        setSelectedScaleId(uiScales[0].id);
      }
    } catch (error) {
      console.error("加载评分方案失败:", error);
      toast.error("加载评分方案失败");
    } finally {
      setLoading(false);
    }
  };

  // 获取用户的知识点阈值设置
  const fetchUserThresholds = async () => {
    if (!user?.id || thresholdsLoaded) return;

    setLoading(true);
    try {
      const dbThresholds = await getUserThresholds(user.id);

      if (dbThresholds && dbThresholds.length > 0) {
        const uiThresholds = convertDbThresholdsToUiThresholds(dbThresholds);
        setThresholds(uiThresholds);
      } else {
        // 如果用户没有保存过阈值设置，使用默认设置
        setThresholds(defaultKnowledgePointThresholds);
      }

      setThresholdsLoaded(true);
    } catch (error) {
      console.error("获取知识点阈值设置失败:", error);
      // 出错时使用默认阈值
      setThresholds(defaultKnowledgePointThresholds);
    } finally {
      setLoading(false);
    }
  };

  // 处理保存评分方案
  const handleSaveScale = async (values: z.infer<typeof scaleSchema>) => {
    setLoading(true);
    try {
      if (editingScale) {
        // 更新现有方案
        const updatedScale: GradingScale = {
          ...editingScale,
          name: values.name,
          description: values.description || "",
          levels: values.levels.map((level) => ({
            value: Number(level.value),
            name: String(level.name),
            color: String(level.color),
          })),
        };

        const dbScale = convertUiScaleToDbScale(updatedScale, user?.id);
        const success = await updateGradingScale(dbScale);

        if (success) {
          setScales(
            scales.map((scale) =>
              scale.id === editingScale.id ? updatedScale : scale
            )
          );
          toast.success("更新成功", {
            description: `评分方案 "${values.name}" 已更新`,
          });
        }
      } else {
        // 创建新方案
        const newUiScale: GradingScale = {
          id: `scale${Date.now()}`, // 临时ID，会被数据库替换
          name: values.name,
          description: values.description || "",
          levels: values.levels.map((level) => ({
            value: Number(level.value),
            name: String(level.name),
            color: String(level.color),
          })),
        };

        const dbScale = convertUiScaleToDbScale(newUiScale, user?.id);
        const createdScale = await createGradingScale(dbScale);

        if (createdScale) {
          // 获取完整的方案（包含ID）
          const detailedScale = await getGradingScaleWithLevels(
            createdScale.id
          );
          if (detailedScale) {
            const newScale = convertDbScaleToUiScale(detailedScale);
            setScales([...scales, newScale]);
            toast.success("创建成功", {
              description: `评分方案 "${values.name}" 已创建`,
            });
          }
        }
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
    } catch (error) {
      console.error("保存评分方案失败:", error);
      toast.error("保存评分方案失败");
    } finally {
      setLoading(false);
    }
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
  const handleDeleteScale = async (scaleId: string) => {
    try {
      setLoading(true);
      const success = await deleteGradingScale(scaleId);

      if (success) {
        setScales(scales.filter((scale) => scale.id !== scaleId));
        // 如果删除的是默认方案，重置默认方案
        if (scaleId === defaultScaleId && scales.length > 1) {
          const newDefaultId = scales.find((s) => s.id !== scaleId)?.id || "";
          setDefaultScaleId(newDefaultId);

          // 更新数据库中的默认方案
          if (newDefaultId) {
            const newDefaultScale = scales.find((s) => s.id === newDefaultId);
            if (newDefaultScale) {
              const dbScale = convertUiScaleToDbScale(
                {
                  ...newDefaultScale,
                  is_default: true,
                },
                user?.id
              );
              await updateGradingScale(dbScale);
            }
          }
        }

        // 如果删除的是选中的方案，重新选择
        if (scaleId === selectedScaleId && scales.length > 1) {
          const newSelectedId = scales.find((s) => s.id !== scaleId)?.id || "";
          setSelectedScaleId(newSelectedId);
        }

        toast.success("删除成功", {
          description: "评分方案已删除",
        });
      }
    } catch (error) {
      console.error("删除评分方案失败:", error);
      toast.error("删除评分方案失败");
    } finally {
      setLoading(false);
    }
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
  const handleSetDefaultScale = async (scaleId: string) => {
    try {
      setLoading(true);
      // 找到将要设为默认的方案
      const newDefaultScale = scales.find((s) => s.id === scaleId);
      if (!newDefaultScale) return;

      // 更新原默认方案
      if (defaultScaleId) {
        const oldDefaultScale = scales.find((s) => s.id === defaultScaleId);
        if (oldDefaultScale) {
          const dbOldScale = convertUiScaleToDbScale(
            {
              ...oldDefaultScale,
              is_default: false,
            },
            user?.id
          );
          await updateGradingScale(dbOldScale);
        }
      }

      // 设置新默认方案
      const dbNewScale = convertUiScaleToDbScale(
        {
          ...newDefaultScale,
          is_default: true,
        },
        user?.id
      );
      const success = await updateGradingScale(dbNewScale);

      if (success) {
        setDefaultScaleId(scaleId);
        // 更新本地状态
        setScales(
          scales.map((s) => ({
            ...s,
            is_default: s.id === scaleId,
          }))
        );

        toast.success("设置成功", {
          description: "默认评分方案已更新",
        });
      }
    } catch (error) {
      console.error("设置默认评分方案失败:", error);
      toast.error("设置默认评分方案失败");
    } finally {
      setLoading(false);
    }
  };

  // 选择评分方案
  const handleSelectScale = (scaleId: string) => {
    setSelectedScaleId(scaleId);
    toast.success("已选择评分方案", {
      description: `当前选中: ${scales.find((s) => s.id === scaleId)?.name}`,
    });
  };

  // 保存知识点阈值设置
  const handleSaveThresholds = async () => {
    if (!user?.id) {
      toast.error("未登录，无法保存设置");
      return false;
    }

    setLoading(true);
    try {
      // 按照分数阈值从高到低排序
      const sortedThresholds = [...thresholds].sort(
        (a, b) => b.threshold - a.threshold
      );
      const dbThresholds = convertUiThresholdsToDbThresholds(sortedThresholds);

      const success = await saveUserThresholds(dbThresholds, user.id);
      if (success) {
        setThresholds(sortedThresholds);
        setThresholdsLoaded(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("保存知识点阈值设置失败:", error);
      toast.error("保存知识点阈值设置失败");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 保存所有设置
  const handleSaveSettings = async () => {
    // 保存知识点阈值设置
    const thresholdsSaved = await handleSaveThresholds();

    if (thresholdsSaved) {
      toast.success("保存成功", {
        description: "批改设置已保存",
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> 批改设置
          </DialogTitle>
          <DialogDescription>
            设置评分方案和知识点掌握程度阈值
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">加载中...</span>
          </div>
        )}

        {!loading && (
          <Tabs
            defaultValue="scales"
            value={currentTab}
            onValueChange={setCurrentTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scales" className="flex gap-1.5">
                <Sliders className="h-4 w-4" /> 评分方案
              </TabsTrigger>
              <TabsTrigger value="thresholds" className="flex gap-1.5">
                <BrainCircuit className="h-4 w-4" /> 知识点阈值
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scales" className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">评分方案列表</h3>
                <Button
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {scales.map((scale) => (
                  <Card
                    key={scale.id}
                    className={`${selectedScaleId === scale.id ? "border-primary" : ""}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{scale.name}</CardTitle>
                        {scale.is_default && (
                          <Badge variant="secondary">默认</Badge>
                        )}
                      </div>
                      <CardDescription>{scale.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {scale.levels
                          .slice()
                          .sort((a, b) => b.value - a.value)
                          .map((level, idx) => (
                            <Badge
                              key={idx}
                              className={`${level.color} text-white`}
                            >
                              {level.name}: ≥{level.value}
                            </Badge>
                          ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${selectedScaleId === scale.id ? "bg-primary/10" : ""}`}
                          onClick={() => handleSelectScale(scale.id)}
                        >
                          {selectedScaleId === scale.id ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" /> 已选择
                            </>
                          ) : (
                            "选择"
                          )}
                        </Button>

                        <Button
                          variant={scale.is_default ? "default" : "outline"}
                          size="sm"
                          disabled={scale.is_default}
                          onClick={() => handleSetDefaultScale(scale.id)}
                        >
                          {scale.is_default ? "默认方案" : "设为默认"}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditScale(scale)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteScale(scale.id)}
                          disabled={scales.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}

                {scales.length === 0 && (
                  <div className="col-span-2 p-8 text-center border rounded-lg bg-muted/30">
                    <p className="text-muted-foreground">
                      暂无评分方案，请创建一个新方案。
                    </p>
                  </div>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingScale ? "编辑评分方案" : "创建新评分方案"}
                  </CardTitle>
                  <CardDescription>定义评分等级和分数阈值</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleSaveScale)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>方案名称</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="输入评分方案名称"
                                {...field}
                              />
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
                              <Textarea
                                placeholder="简要描述该评分方案"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                                const updatedLevels = [
                                  ...form.getValues("levels"),
                                ];
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
                                  const updatedLevels = [
                                    ...form.getValues("levels"),
                                  ];
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
                                const updatedLevels = [
                                  ...form.getValues("levels"),
                                ];
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
                        <Button type="submit" disabled={loading}>
                          <Save className="h-4 w-4 mr-2" />
                          保存方案
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="thresholds" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">
                    知识点掌握程度阈值设置
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    设置不同掌握程度的分数阈值，用于评估学生对知识点的掌握情况
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveThresholds}
                  disabled={loading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  保存阈值设置
                </Button>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {thresholds.map((threshold, index) => (
                      <div key={index} className="flex items-center gap-3">
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
                              const prevThreshold =
                                index > 0 ? arr[index - 1].threshold : 0;
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSaveSettings} disabled={loading}>
            <Check className="h-4 w-4 mr-2" />
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
