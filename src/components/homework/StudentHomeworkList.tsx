import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SubmitHomeworkDialog from "./SubmitHomeworkDialog";
import { AlertTriangle, BookOpen, Clock, CheckCircle, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

// 导入Supabase服务
import { getStudentHomeworkSubmissions } from "@/services/homeworkService";
import { supabase } from "@/integrations/supabase/client";

// 导入模拟数据和API (临时保留，稍后会完全替换)
import { mockApi } from "@/data/mockData";

const StudentHomeworkList = () => {
  const [homeworks, setHomeworks] = React.useState<any[]>([]);
  const [selectedHomework, setSelectedHomework] = React.useState<any>(null);
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentStudentId, setCurrentStudentId] = React.useState<string | null>(null);

  // 获取当前用户信息
  React.useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 这里应该根据实际用户ID获取，暂时使用模拟ID
          setCurrentStudentId('student1');
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };

    getCurrentUser();
  }, []);

  const fetchHomeworks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("开始获取学生作业数据...");
      
      // 使用Supabase服务获取学生作业
      if (!currentStudentId) {
        throw new Error("未获取到学生ID");
      }
      
      const homeworksData = await getStudentHomeworkSubmissions(currentStudentId);
      console.log("获取到的作业:", homeworksData);
      
      // 格式化数据，匹配组件期望的结构
      const formattedData = homeworksData.map(submission => ({
        ...submission.homework,
        homework_submissions: [
          {
            id: submission.id,
            status: submission.status,
            score: submission.score,
            feedback: submission.feedback,
            submitted_at: submission.submitted_at,
          }
        ]
      }));
      
      setHomeworks(formattedData);
    } catch (error: any) {
      console.error('获取作业列表失败:', error);
      setError(error.message || "获取作业列表失败");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (currentStudentId) {
    fetchHomeworks();
    }
  }, [currentStudentId]);

  const handleSubmitHomework = async (homeworkId: string, content: string) => {
    try {
      // 暂时使用模拟数据，提交作业应该调用Supabase服务
      const submissionData = {
        homework_id: homeworkId,
        student_id: currentStudentId, 
        content,
        submitted_at: new Date().toISOString()
      };
      
      // 创建新提交记录（临时使用模拟API，后续替换为Supabase）
      await mockApi.student.submitHomework(submissionData);
      
      toast.success("作业提交成功");
      await fetchHomeworks(); // 重新加载数据
      setSelectedHomework(null);
      setShowSubmitDialog(false);
      
    } catch (error: any) {
      console.error('提交作业失败:', error);
      toast.error('提交作业失败: ' + (error.message || "未知错误"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-3">加载中...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h3 className="text-lg font-semibold">加载失败</h3>
        <p className="text-muted-foreground text-center">{error}</p>
        <Button onClick={fetchHomeworks}>重试</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold">我的作业</h2>
        <Badge variant="outline" className="px-2 py-1">
          <Clock className="h-3 w-3 mr-1" />
          学生视图
        </Badge>
      </div>

      {homeworks.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无作业</h3>
          <p className="text-muted-foreground">您目前没有需要完成的作业</p>
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {homeworks.map((homework) => {
          const submission = homework.homework_submissions?.[0];
          const isSubmitted = !!submission;
            const dueDate = new Date(homework.due_date);
            const isOverdue = dueDate < new Date() && (!isSubmitted || submission.status === "pending");

          return (
              <Card key={homework.id} className={isOverdue ? "border-red-200" : ""}>
                <CardHeader className={isOverdue ? "bg-red-50" : ""}>
                  <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{homework.title}</CardTitle>
                    {isSubmitted ? (
                      <Badge 
                        variant={submission.status === "graded" ? "default" : "secondary"}
                        className="ml-auto"
                      >
                        {submission.status === "graded" ? (
                          <>
                            <Award className="h-3 w-3 mr-1" />
                            已批改
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            已提交
                          </>
                        )}
                      </Badge>
                    ) : (
                      <Badge 
                        variant={isOverdue ? "destructive" : "outline"}
                        className="ml-auto"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {isOverdue ? "已逾期" : "待提交"}
                      </Badge>
                    )}
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 line-clamp-2">{homework.description}</p>
                    
                <div className="space-y-2 text-sm">
                      <p><span className="font-medium">班级：</span>{homework.classes?.name || '未知班级'}</p>
                      <p>
                        <span className="font-medium">截止日期：</span>
                        <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                          {formatDate(homework.due_date)}
                        </span>
                  </p>
                      {isSubmitted && submission.status === "graded" && (
                        <p><span className="font-medium">得分：</span>
                          <span className="font-medium text-green-600">{submission.score}</span>
                        </p>
                      )}
                      
                      {submission?.feedback && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <p className="font-medium text-xs">教师反馈：</p>
                          <p className="text-xs mt-1">{submission.feedback}</p>
                        </div>
                      )}
                    </div>
                    
                    {!isSubmitted && (
                    <Button
                      onClick={() => {
                        setSelectedHomework(homework);
                        setShowSubmitDialog(true);
                      }}
                        className="w-full mt-4"
                        variant={isOverdue ? "destructive" : "default"}
                    >
                        {isOverdue ? "逾期提交" : "提交作业"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      {selectedHomework && (
        <SubmitHomeworkDialog
          open={showSubmitDialog}
          onOpenChange={setShowSubmitDialog}
          homework={selectedHomework}
          onSubmitted={(content) => handleSubmitHomework(selectedHomework.id, content)}
        />
      )}
    </div>
  );
};

export default StudentHomeworkList;
