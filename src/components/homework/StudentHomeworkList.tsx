
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import SubmitHomeworkDialog from "./SubmitHomeworkDialog";

const StudentHomeworkList = () => {
  const [homeworks, setHomeworks] = React.useState<any[]>([]);
  const [selectedHomework, setSelectedHomework] = React.useState<any>(null);
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchHomeworks = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('student_id, class_id')
        .eq('user_id', userData.user.id)
        .single();

      if (studentError) throw studentError;

      const { data, error } = await supabase
        .from('homework')
        .select(`
          *,
          classes (
            name
          ),
          homework_submissions (
            id,
            status,
            score,
            submitted_at
          )
        `)
        .eq('class_id', studentData.class_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHomeworks(data || []);
    } catch (error) {
      console.error('获取作业列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchHomeworks();
  }, []);

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">我的作业</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {homeworks.map((homework) => {
          const submission = homework.homework_submissions?.[0];
          const isSubmitted = !!submission;

          return (
            <Card key={homework.id}>
              <CardHeader>
                <CardTitle className="text-lg">{homework.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">班级：</span>{homework.classes?.name}</p>
                  <p><span className="font-medium">截止日期：</span>
                    {homework.due_date ? new Date(homework.due_date).toLocaleDateString() : '无'}
                  </p>
                  {isSubmitted ? (
                    <>
                      <p><span className="font-medium">状态：</span>{submission.status}</p>
                      {submission.score && (
                        <p><span className="font-medium">得分：</span>{submission.score}</p>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        setSelectedHomework(homework);
                        setShowSubmitDialog(true);
                      }}
                      className="w-full mt-2"
                    >
                      提交作业
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedHomework && (
        <SubmitHomeworkDialog
          open={showSubmitDialog}
          onOpenChange={setShowSubmitDialog}
          homework={selectedHomework}
          onSubmitted={() => {
            fetchHomeworks();
            setSelectedHomework(null);
          }}
        />
      )}
    </div>
  );
};

export default StudentHomeworkList;
