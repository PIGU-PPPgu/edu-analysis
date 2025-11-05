import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DuplicateGroup {
  name: string;
  students: Array<{
    id: string;
    student_id: string;
    name: string;
    class_name: string;
    created_at?: string;
  }>;
}

const CleanDuplicateStudents = () => {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanedCount, setCleanedCount] = useState(0);

  const scanDuplicates = async () => {
    setLoading(true);
    try {
      // 查询初三 7班的所有学生（包含创建时间用于排序）
      const { data: students, error } = await supabase
        .from("students")
        .select("id, student_id, name, class_name, created_at")
        .or(`class_name.eq.初三 7班,class_name.eq.初三7班`)
        .order("name")
        .order("created_at", { ascending: true }); // 按创建时间升序，保留最早的

      if (error) {
        console.error("查询失败:", error);
        toast.error("扫描失败: " + error.message);
        return;
      }

      // 按姓名分组
      const nameGroups = new Map<string, any[]>();
      students?.forEach((student) => {
        if (!nameGroups.has(student.name)) {
          nameGroups.set(student.name, []);
        }
        nameGroups.get(student.name)!.push(student);
      });

      // 找出重复的
      const duplicateList: DuplicateGroup[] = [];
      nameGroups.forEach((studentList, name) => {
        if (studentList.length > 1) {
          duplicateList.push({
            name,
            students: studentList,
          });
        }
      });

      setDuplicates(duplicateList);
      toast.success(`扫描完成，发现 ${duplicateList.length} 组重复学生`);
    } catch (error) {
      console.error("扫描重复学生时出错:", error);
      toast.error("扫描失败");
    } finally {
      setLoading(false);
    }
  };

  const cleanDuplicates = async () => {
    if (duplicates.length === 0) {
      toast.warning("没有需要清理的重复记录");
      return;
    }

    const confirmed = window.confirm(
      `确定要清理 ${duplicates.length} 组重复学生吗？\n\n` +
        `清理规则：\n` +
        `- 对于每组重复的学生，保留创建时间最早的记录\n` +
        `- 删除其他重复记录\n` +
        `- 此操作不可撤销！\n\n` +
        `建议先备份数据库！`
    );

    if (!confirmed) return;

    setCleaning(true);
    let totalDeleted = 0;

    try {
      for (const group of duplicates) {
        // 按创建时间排序，保留第一个（最早的）
        const sortedStudents = [...group.students].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateA - dateB;
        });

        const toKeep = sortedStudents[0];
        const toDelete = sortedStudents.slice(1);

        console.log(`处理 ${group.name}:`);
        console.log(
          `  保留: 学号=${toKeep.student_id}, ID=${toKeep.id.slice(0, 8)}, 创建时间=${toKeep.created_at}`
        );
        console.log(`  删除: ${toDelete.length} 条记录`);

        // 删除重复的记录
        const idsToDelete = toDelete.map((s) => s.id);

        const { error: deleteError, count } = await supabase
          .from("students")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) {
          console.error(`删除 ${group.name} 的重复记录失败:`, deleteError);
          toast.error(`删除 ${group.name} 失败: ${deleteError.message}`);
        } else {
          totalDeleted += toDelete.length;
          console.log(`  成功删除 ${count} 条记录`);
        }
      }

      setCleanedCount(totalDeleted);
      toast.success(`清理完成！共删除 ${totalDeleted} 条重复记录`);

      // 重新扫描
      await scanDuplicates();
    } catch (error) {
      console.error("清理重复学生时出错:", error);
      toast.error("清理失败");
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    scanDuplicates();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>初三 7班 - 清理重复学生</CardTitle>
          <CardDescription>扫描并清理数据库中的重复学生记录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={scanDuplicates}
              disabled={loading || cleaning}
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  扫描中...
                </>
              ) : (
                "重新扫描"
              )}
            </Button>

            <Button
              onClick={cleanDuplicates}
              disabled={loading || cleaning || duplicates.length === 0}
              variant="destructive"
            >
              {cleaning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  清理中...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  清理全部重复 ({duplicates.length})
                </>
              )}
            </Button>
          </div>

          {/* 清理结果 */}
          {cleanedCount > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                已成功删除 {cleanedCount} 条重复记录
              </AlertDescription>
            </Alert>
          )}

          {/* 重复列表 */}
          {duplicates.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                ✅ 没有发现重复的学生记录
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  发现 {duplicates.length} 组重复学生，共涉及{" "}
                  {duplicates.reduce((sum, g) => sum + g.students.length, 0)}{" "}
                  条记录
                </AlertDescription>
              </Alert>

              <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto">
                {duplicates.map((group, index) => (
                  <Card key={index} className="bg-red-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-red-700">
                        {group.name} (重复 {group.students.length} 次)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {group.students.map((student, idx) => (
                          <div
                            key={student.id}
                            className={`p-2 rounded text-sm ${
                              idx === 0
                                ? "bg-green-100 border border-green-300"
                                : "bg-white border border-red-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-semibold">
                                  {idx === 0 ? "✅ 保留" : "🗑️ 删除"}:
                                </span>
                                <span className="ml-2">
                                  学号: {student.student_id}
                                </span>
                                <span className="ml-2 text-gray-500">
                                  班级: {student.class_name}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                UUID: {student.id.slice(0, 13)}...
                              </div>
                            </div>
                            {student.created_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                创建时间:{" "}
                                {new Date(student.created_at).toLocaleString(
                                  "zh-CN"
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CleanDuplicateStudents;
