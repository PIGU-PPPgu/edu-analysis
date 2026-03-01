"use client";

/**
 * 考试序列管理组件
 * 管理考试序列,用于历次追踪分析
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Calendar,
  TrendingUp,
  ListOrdered,
  Eye,
  Edit,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ExamSeries {
  id: string;
  name: string;
  description: string;
  grade_level: string;
  academic_year: string;
  semester: string;
  exam_count: number;
  created_at: string;
}

interface ExamInSeries {
  id: string;
  series_id: string;
  exam_id: string;
  exam_title: string;
  exam_date: string;
  sequence_order: number;
}

export function ExamSeriesManager() {
  const navigate = useNavigate();
  // TODO: 集成真实数据查询
  // 从 exam_series 和 exam_series_exams 表查询
  const [series, setSeries] = useState<ExamSeries[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<ExamSeries | null>(null);
  const [examsInSeries, setExamsInSeries] = useState<ExamInSeries[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seriesToDelete, setSeriesToDelete] = useState<ExamSeries | null>(null);

  // 选择序列时加载考试列表
  useEffect(() => {
    if (selectedSeries) {
      // TODO: 从exam_series_exams表查询真实数据
      // const { data } = await supabase
      //   .from('exam_series_exams')
      //   .select('*, grade_data(exam_id, exam_title, exam_date)')
      //   .eq('series_id', selectedSeries.id)
      //   .order('sequence_order');
      // setExamsInSeries(data || []);

      setExamsInSeries([]); // 暂时设为空
    } else {
      setExamsInSeries([]);
    }
  }, [selectedSeries]);

  const handleDeleteSeries = async () => {
    if (!seriesToDelete) return;

    // TODO: 实际删除逻辑
    setSeries((prev) => prev.filter((s) => s.id !== seriesToDelete.id));
    if (selectedSeries?.id === seriesToDelete.id) {
      setSelectedSeries(null);
    }
    toast.success("考试序列已删除");
    setDeleteDialogOpen(false);
    setSeriesToDelete(null);
  };

  const handleViewTracking = (series: ExamSeries) => {
    navigate(`/value-added?tab=reports&report=teacher-score-trend`);
  };

  return (
    <div className="space-y-6">
      {/* 序列列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>考试序列管理</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                创建考试序列,进行历次追踪分析
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建序列
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <div className="text-center py-12">
              <ListOrdered className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground mb-4">
                还没有创建任何考试序列
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建第一个序列
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>序列名称</TableHead>
                  <TableHead>年级</TableHead>
                  <TableHead>学年学期</TableHead>
                  <TableHead>考试数量</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.map((item) => (
                  <TableRow
                    key={item.id}
                    className={
                      selectedSeries?.id === item.id ? "bg-blue-50" : ""
                    }
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.grade_level}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.academic_year} {item.semester}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.exam_count} 场</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSeries(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看详情
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleViewTracking(item)}
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          历次追踪
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSeriesToDelete(item);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除序列
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 序列详情 */}
      {selectedSeries && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>序列详情: {selectedSeries.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedSeries.description}
                </p>
              </div>
              <Button variant="outline" onClick={() => setSelectedSeries(null)}>
                收起
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">年级</div>
                  <div className="font-semibold">
                    {selectedSeries.grade_level}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">学年学期</div>
                  <div className="font-semibold">
                    {selectedSeries.academic_year} {selectedSeries.semester}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">考试数量</div>
                  <div className="font-semibold">
                    {selectedSeries.exam_count} 场
                  </div>
                </div>
              </div>

              {/* 考试列表 */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  考试序列
                </h4>
                {examsInSeries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    该序列还没有添加考试
                  </div>
                ) : (
                  <div className="space-y-2">
                    {examsInSeries.map((exam, index) => (
                      <div
                        key={exam.id}
                        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                          {exam.sequence_order}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{exam.exam_title}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(exam.exam_date).toLocaleDateString(
                              "zh-CN"
                            )}
                          </div>
                        </div>
                        {index < examsInSeries.length - 1 && (
                          <div className="text-sm text-muted-foreground">
                            → 增值 →
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 创建序列对话框 */}
      <CreateSeriesDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={(newSeries) => {
          setSeries((prev) => [...prev, newSeries]);
          toast.success("考试序列创建成功");
        }}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除考试序列 &quot;{seriesToDelete?.name}&quot; 吗？
              此操作将同时删除所有相关的追踪分析数据,且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeries}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * 创建序列对话框
 */
interface CreateSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (series: ExamSeries) => void;
}

function CreateSeriesDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSeriesDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    grade_level: "",
    academic_year: "2024-2025",
    semester: "全学年",
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.grade_level) {
      toast.error("请填写必填项");
      return;
    }

    // TODO: 调用API创建
    const newSeries: ExamSeries = {
      id: `series-${Date.now()}`,
      ...formData,
      exam_count: 0,
      created_at: new Date().toISOString(),
    };

    onSuccess(newSeries);
    onOpenChange(false);
    setFormData({
      name: "",
      description: "",
      grade_level: "",
      academic_year: "2024-2025",
      semester: "全学年",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>创建考试序列</DialogTitle>
          <DialogDescription>
            创建一个考试序列,用于追踪分析学生在多次考试中的增值变化
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">序列名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例如: 高一数学2024学年追踪"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="简要描述该序列的用途"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade_level">年级 *</Label>
              <Select
                value={formData.grade_level}
                onValueChange={(value) =>
                  setFormData({ ...formData, grade_level: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择年级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="高一">高一</SelectItem>
                  <SelectItem value="高二">高二</SelectItem>
                  <SelectItem value="高三">高三</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="academic_year">学年</Label>
              <Select
                value={formData.academic_year}
                onValueChange={(value) =>
                  setFormData({ ...formData, academic_year: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                  <SelectItem value="2023-2024">2023-2024</SelectItem>
                  <SelectItem value="2022-2023">2022-2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="semester">学期</Label>
            <Select
              value={formData.semester}
              onValueChange={(value) =>
                setFormData({ ...formData, semester: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全学年">全学年</SelectItem>
                <SelectItem value="上学期">上学期</SelectItem>
                <SelectItem value="下学期">下学期</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>创建序列</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
