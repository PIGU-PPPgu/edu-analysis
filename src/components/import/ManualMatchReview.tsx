import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserPlus, UserX, AlertCircle } from "lucide-react";
import type { MatchResult } from "@/services/intelligentStudentMatcher";

interface ManualMatchReviewProps {
  unmatchedStudents: MatchResult[];
  onConfirm: (decisions: StudentDecision[]) => void;
  onCancel: () => void;
}

export interface StudentDecision {
  fileStudent: {
    student_id?: string;
    name: string;
    class_name?: string;
  };
  action: "create" | "match" | "skip";
  matchedStudentId?: string; // 如果action是match,这个字段包含匹配的系统学生ID
}

interface SystemStudent {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
}

export function ManualMatchReview({
  unmatchedStudents,
  onConfirm,
  onCancel,
}: ManualMatchReviewProps) {
  const [decisions, setDecisions] = useState<Map<number, StudentDecision>>(
    new Map()
  );
  const [systemStudents, setSystemStudents] = useState<SystemStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // 加载系统中的学生列表供手动选择
  React.useEffect(() => {
    const loadSystemStudents = async () => {
      setLoadingStudents(true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase
          .from("students")
          .select("id, student_id, name, class_name:classes(name)")
          .limit(1000);

        if (!error && data) {
          setSystemStudents(
            data.map((s: any) => ({
              id: s.id,
              student_id: s.student_id,
              name: s.name,
              class_name: s.class_name?.name,
            }))
          );
        }
      } catch (error) {
        console.error("加载系统学生失败:", error);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadSystemStudents();
  }, []);

  const handleDecision = (
    index: number,
    action: "create" | "match" | "skip",
    matchedStudentId?: string
  ) => {
    const student = unmatchedStudents[index];
    setDecisions(
      new Map(
        decisions.set(index, {
          fileStudent: student.fileStudent,
          action,
          matchedStudentId,
        })
      )
    );
  };

  const handleConfirm = () => {
    // 为所有未决定的学生默认选择"创建新学生"
    const finalDecisions: StudentDecision[] = unmatchedStudents.map(
      (student, index) => {
        const decision = decisions.get(index);
        return (
          decision || {
            fileStudent: student.fileStudent,
            action: "create" as const,
          }
        );
      }
    );

    onConfirm(finalDecisions);
  };

  const getDecisionCount = (action: "create" | "match" | "skip") => {
    return Array.from(decisions.values()).filter((d) => d.action === action)
      .length;
  };

  const undecidedCount =
    unmatchedStudents.length -
    getDecisionCount("create") -
    getDecisionCount("match") -
    getDecisionCount("skip");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <span>手动确认未匹配学生</span>
        </CardTitle>
        <Alert>
          <AlertDescription>
            发现 {unmatchedStudents.length}{" "}
            名学生无法通过3选2规则自动匹配。请为每个学生选择操作：
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>创建新学生 - 在系统中新建此学生</li>
              <li>手动匹配 - 从现有学生中选择匹配对象</li>
              <li>跳过 - 暂不处理此学生</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 统计摘要 */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <Badge variant="outline">
            待处理: {undecidedCount}/{unmatchedStudents.length}
          </Badge>
          <Badge variant="outline" className="bg-green-50">
            <UserPlus className="w-3 h-3 mr-1" />
            创建: {getDecisionCount("create")}
          </Badge>
          <Badge variant="outline" className="bg-blue-50">
            <UserCheck className="w-3 h-3 mr-1" />
            匹配: {getDecisionCount("match")}
          </Badge>
          <Badge variant="outline" className="bg-gray-100">
            <UserX className="w-3 h-3 mr-1" />
            跳过: {getDecisionCount("skip")}
          </Badge>
        </div>

        {/* 学生列表 */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {unmatchedStudents.map((student, index) => {
            const decision = decisions.get(index);
            const isDecided = decision !== undefined;

            return (
              <div
                key={index}
                className={`p-4 border rounded-lg ${
                  isDecided ? "bg-gray-50" : "bg-white"
                }`}
              >
                {/* 学生信息 */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-lg">
                      {student.fileStudent.name}
                    </div>
                    <div className="text-sm text-gray-500 space-x-2">
                      {student.fileStudent.student_id && (
                        <span>学号: {student.fileStudent.student_id}</span>
                      )}
                      {student.fileStudent.class_name && (
                        <span>班级: {student.fileStudent.class_name}</span>
                      )}
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      {student.matchReason}
                    </div>
                  </div>

                  {isDecided && (
                    <Badge
                      variant={
                        decision.action === "create"
                          ? "default"
                          : decision.action === "match"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {decision.action === "create"
                        ? "创建新学生"
                        : decision.action === "match"
                          ? "已匹配"
                          : "跳过"}
                    </Badge>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={
                        decision?.action === "create" ? "default" : "outline"
                      }
                      onClick={() => handleDecision(index, "create")}
                      className="flex-1"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      创建新学生
                    </Button>

                    <Button
                      size="sm"
                      variant={
                        decision?.action === "skip" ? "default" : "outline"
                      }
                      onClick={() => handleDecision(index, "skip")}
                      className="flex-1"
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      跳过
                    </Button>
                  </div>

                  {/* 手动匹配选择器 */}
                  <div className="flex space-x-2">
                    <select
                      className="flex-1 p-2 border rounded text-sm"
                      value={decision?.matchedStudentId || ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleDecision(index, "match", e.target.value);
                        }
                      }}
                      disabled={loadingStudents}
                    >
                      <option value="">选择现有学生进行匹配...</option>
                      {systemStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.student_id}
                          {s.class_name ? ` - ${s.class_name}` : ""})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部操作 */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            取消导入
          </Button>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                // 全部选择创建新学生
                const allCreate = new Map<number, StudentDecision>();
                unmatchedStudents.forEach((student, index) => {
                  allCreate.set(index, {
                    fileStudent: student.fileStudent,
                    action: "create",
                  });
                });
                setDecisions(allCreate);
              }}
            >
              全部创建
            </Button>

            <Button onClick={handleConfirm}>
              确认处理 ({unmatchedStudents.length} 名学生)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
