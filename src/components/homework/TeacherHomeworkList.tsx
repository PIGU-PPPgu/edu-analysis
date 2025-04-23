
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CreateHomeworkDialog from "./CreateHomeworkDialog";

const TeacherHomeworkList = () => {
  const [homeworks, setHomeworks] = React.useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchHomeworks = async () => {
    try {
      const { data, error } = await supabase
        .from('homework')
        .select(`
          *,
          classes (
            name
          ),
          homework_submissions (
            id
          )
        `)
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">已布置的作业</h2>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
        >
          <Plus className="w-4 h-4 mr-2" />
          布置新作业
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {homeworks.map((homework) => (
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
                <p><span className="font-medium">提交数：</span>
                  {homework.homework_submissions?.length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateHomeworkDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onHomeworkCreated={fetchHomeworks}
      />
    </div>
  );
};

export default TeacherHomeworkList;
