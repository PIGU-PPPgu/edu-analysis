import React, { useState, useEffect } from "react";
import { PlusCircle, Trash2, Save, Edit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GradingScale,
  GradingScaleLevel,
  getGradingScales,
  getGradingScaleWithLevels,
  createGradingScale,
  updateGradingScale,
  deleteGradingScale,
} from "@/services/gradingService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_LEVEL_STRUCTURE = [
  {
    name: "不及格",
    min_score: 0,
    max_score: 59,
    color: "#ff4d4f",
    position: 0,
  },
  { name: "及格", min_score: 60, max_score: 69, color: "#faad14", position: 1 },
  { name: "中等", min_score: 70, max_score: 79, color: "#1677ff", position: 2 },
  { name: "良好", min_score: 80, max_score: 89, color: "#52c41a", position: 3 },
  {
    name: "优秀",
    min_score: 90,
    max_score: 100,
    color: "#722ed1",
    position: 4,
  },
];

export default function GradingScaleSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [scales, setScales] = useState<GradingScale[]>([]);
  const [selectedScale, setSelectedScale] = useState<GradingScale | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 新评级标准表单状态
  const [scaleName, setScaleName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [levels, setLevels] = useState<GradingScaleLevel[]>([]);

  useEffect(() => {
    loadGradingScales();
  }, []);

  const loadGradingScales = async () => {
    setIsLoading(true);
    try {
      const data = await getGradingScales();
      setScales(data);
    } catch (error) {
      console.error("加载评级标准失败:", error);
      toast({
        title: "错误",
        description: "加载评级标准失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectScale = async (scaleId: string) => {
    try {
      const data = await getGradingScaleWithLevels(scaleId);
      if (data) {
        setSelectedScale(data);
      }
    } catch (error) {
      console.error("加载评级标准详情失败:", error);
      toast({
        title: "错误",
        description: "加载评级标准详情失败",
        variant: "destructive",
      });
    }
  };

  const handleAddScale = () => {
    setIsEditing(false);
    setScaleName("");
    setIsDefault(false);
    setLevels([...DEFAULT_LEVEL_STRUCTURE]);
    setIsDialogOpen(true);
  };

  const handleEditScale = () => {
    if (!selectedScale) return;

    setIsEditing(true);
    setScaleName(selectedScale.name);
    setIsDefault(selectedScale.is_default || false);
    setLevels(selectedScale.levels || [...DEFAULT_LEVEL_STRUCTURE]);
    setIsDialogOpen(true);
  };

  const handleDeleteScale = async () => {
    if (!selectedScale?.id) return;

    if (!confirm("确定要删除这个评级标准吗？此操作不可撤销。")) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await deleteGradingScale(selectedScale.id);
      if (success) {
        toast({
          title: "成功",
          description: "评级标准已删除",
        });
        setSelectedScale(null);
        await loadGradingScales();
      }
    } catch (error) {
      console.error("删除评级标准失败:", error);
      toast({
        title: "错误",
        description: "删除评级标准失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveScale = async () => {
    if (!scaleName.trim()) {
      toast({
        title: "错误",
        description: "请输入评级标准名称",
        variant: "destructive",
      });
      return;
    }

    if (levels.length === 0) {
      toast({
        title: "错误",
        description: "请添加至少一个评级等级",
        variant: "destructive",
      });
      return;
    }

    // 验证分数范围
    const hasOverlap = levels.some((level, i) =>
      levels.some(
        (otherLevel, j) =>
          i !== j &&
          ((level.min_score >= otherLevel.min_score &&
            level.min_score <= otherLevel.max_score) ||
            (level.max_score >= otherLevel.min_score &&
              level.max_score <= otherLevel.max_score))
      )
    );

    if (hasOverlap) {
      toast({
        title: "错误",
        description: "评级等级的分数范围不能重叠",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && selectedScale?.id) {
        // 更新现有评级标准
        const success = await updateGradingScale({
          id: selectedScale.id,
          name: scaleName,
          is_default: isDefault,
          levels: levels,
        });

        if (success) {
          toast({
            title: "成功",
            description: "评级标准已更新",
          });
        }
      } else {
        // 创建新的评级标准
        const newScale = await createGradingScale({
          name: scaleName,
          created_by: user?.id,
          is_default: isDefault,
          levels: levels,
        });

        if (newScale) {
          toast({
            title: "成功",
            description: "评级标准已创建",
          });
        }
      }

      setIsDialogOpen(false);
      await loadGradingScales();
    } catch (error) {
      console.error("保存评级标准失败:", error);
      toast({
        title: "错误",
        description: "保存评级标准失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLevel = () => {
    const nextPosition = levels.length;
    setLevels([
      ...levels,
      {
        name: `等级 ${nextPosition + 1}`,
        min_score: 0,
        max_score: 100,
        position: nextPosition,
      },
    ]);
  };

  const handleUpdateLevel = (
    index: number,
    field: keyof GradingScaleLevel,
    value: any
  ) => {
    const updatedLevels = [...levels];
    updatedLevels[index] = {
      ...updatedLevels[index],
      [field]:
        field === "min_score" || field === "max_score"
          ? parseInt(value)
          : value,
    };
    setLevels(updatedLevels);
  };

  const handleDeleteLevel = (index: number) => {
    const updatedLevels = levels.filter((_, i) => i !== index);
    // 更新位置
    const reorderedLevels = updatedLevels.map((level, i) => ({
      ...level,
      position: i,
    }));
    setLevels(reorderedLevels);
  };

  // 渲染分数示例
  const renderScoreExamples = (levels: GradingScaleLevel[]) => {
    if (!levels || levels.length === 0) return null;

    // 排序等级
    const sortedLevels = [...levels].sort((a, b) => a.position - b.position);

    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {sortedLevels.map((level, index) => (
          <div key={index} className="flex flex-col items-center">
            <Badge
              style={{ backgroundColor: level.color || undefined }}
              className="mb-1"
            >
              {level.name}
            </Badge>
            <span className="text-xs text-gray-500">
              {level.min_score}-{level.max_score}分
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">评级标准设置</h2>
        <Button onClick={handleAddScale}>
          <PlusCircle className="h-4 w-4 mr-2" />
          新建评级标准
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">评级标准列表</TabsTrigger>
          {selectedScale && (
            <TabsTrigger value="detail">{selectedScale.name} 详情</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>已创建的评级标准</CardTitle>
              <CardDescription>管理您创建的所有评级标准</CardDescription>
            </CardHeader>
            <CardContent>
              {scales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  还没有创建评级标准，点击"新建评级标准"按钮创建
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>默认</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scales.map((scale) => (
                      <TableRow key={scale.id}>
                        <TableCell className="font-medium">
                          {scale.name}
                        </TableCell>
                        <TableCell>
                          {new Date(
                            scale.created_at || ""
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {scale.is_default ? (
                            <Badge variant="default">默认</Badge>
                          ) : (
                            <Badge variant="outline">否</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectScale(scale.id!)}
                          >
                            查看详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {selectedScale && (
          <TabsContent value="detail" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{selectedScale.name}</CardTitle>
                    <CardDescription>
                      创建于{" "}
                      {new Date(
                        selectedScale.created_at || ""
                      ).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleEditScale}>
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteScale}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">评级等级</h3>
                    {selectedScale.levels && selectedScale.levels.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>名称</TableHead>
                            <TableHead>最低分</TableHead>
                            <TableHead>最高分</TableHead>
                            <TableHead>颜色</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...selectedScale.levels]
                            .sort((a, b) => a.position - b.position)
                            .map((level) => (
                              <TableRow key={level.id}>
                                <TableCell>{level.name}</TableCell>
                                <TableCell>{level.min_score}</TableCell>
                                <TableCell>{level.max_score}</TableCell>
                                <TableCell>
                                  <div
                                    className="w-6 h-6 rounded-full"
                                    style={{
                                      backgroundColor: level.color || "#888",
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-gray-500">没有定义评级等级</div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">示例</h3>
                    {renderScoreExamples(selectedScale.levels || [])}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* 创建/编辑评级标准对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "编辑评级标准" : "创建新的评级标准"}
            </DialogTitle>
            <DialogDescription>
              设置评级标准以及各个分数区间对应的等级
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="scale-name">评级标准名称</Label>
                <Input
                  id="scale-name"
                  value={scaleName}
                  onChange={(e) => setScaleName(e.target.value)}
                  placeholder="例如: 标准五级制"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-default"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
                <Label htmlFor="is-default">设为默认评级标准</Label>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">评级等级</h3>
                <Button variant="outline" size="sm" onClick={handleAddLevel}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  添加等级
                </Button>
              </div>

              {levels.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  还没有添加评级等级
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>最低分</TableHead>
                      <TableHead>最高分</TableHead>
                      <TableHead>颜色</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...levels]
                      .sort((a, b) => a.position - b.position)
                      .map((level, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={level.name}
                              onChange={(e) =>
                                handleUpdateLevel(index, "name", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={level.min_score}
                              onChange={(e) =>
                                handleUpdateLevel(
                                  index,
                                  "min_score",
                                  e.target.value
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={level.max_score}
                              onChange={(e) =>
                                handleUpdateLevel(
                                  index,
                                  "max_score",
                                  e.target.value
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="color"
                              value={level.color || "#000000"}
                              onChange={(e) =>
                                handleUpdateLevel(
                                  index,
                                  "color",
                                  e.target.value
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLevel(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">预览</h3>
              {renderScoreExamples(levels)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveScale} disabled={isLoading}>
              {isLoading ? "保存中..." : "保存评级标准"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
