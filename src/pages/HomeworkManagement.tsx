
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeacherHomeworkList from "@/components/homework/TeacherHomeworkList";
import StudentHomeworkList from "@/components/homework/StudentHomeworkList";
import { useNavigate } from "react-router-dom";
import { getUserRoles } from "@/utils/auth";

const HomeworkManagement = () => {
  const [userRoles, setUserRoles] = React.useState<string[]>([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    const checkRoles = async () => {
      const roles = await getUserRoles();
      if (!roles) {
        navigate('/login');
        return;
      }
      setUserRoles(roles);
    };
    
    checkRoles();
  }, [navigate]);

  const isTeacher = userRoles.includes('teacher');
  const isStudent = userRoles.includes('student');

  if (!isTeacher && !isStudent) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">作业管理</h1>
      
      <Tabs defaultValue={isTeacher ? "teacher" : "student"} className="w-full">
        {isTeacher && (
          <>
            <TabsList>
              <TabsTrigger value="teacher">教师视图</TabsTrigger>
              <TabsTrigger value="student">学生视图</TabsTrigger>
            </TabsList>
            
            <TabsContent value="teacher">
              <TeacherHomeworkList />
            </TabsContent>
            
            <TabsContent value="student">
              <StudentHomeworkList />
            </TabsContent>
          </>
        )}
        
        {!isTeacher && isStudent && <StudentHomeworkList />}
      </Tabs>
    </div>
  );
};

export default HomeworkManagement;
