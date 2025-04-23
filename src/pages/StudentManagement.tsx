
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import StudentList from "@/components/analysis/StudentList";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Users, School } from "lucide-react";
import Navbar from "@/components/analysis/Navbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ClassProfilesList from "@/components/analysis/ClassProfilesList";

interface Student {
  studentId: string;
  name: string;
  className: string;
  averageScore: number;
}

interface StudentData {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  grades?: Array<{ score: number }>;
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("students");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        // Fetch actual student data from Supabase
        const { data, error } = await supabase
          .from('students')
          .select(`
            id,
            student_id,
            name,
            class_name,
            grades (
              score
            )
          `)
          .order('name');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Format the student data safely
          const formattedStudents = data.map((student: any) => {
            // Calculate average score if grades exist
            let avgScore = 0;
            if (student.grades && Array.isArray(student.grades) && student.grades.length > 0) {
              const sum = student.grades.reduce((acc: number, grade: any) => 
                acc + (typeof grade.score === 'number' ? grade.score : 0), 0);
              avgScore = Math.round((sum / student.grades.length) * 10) / 10;
            }
            
            return {
              studentId: student.student_id,
              name: student.name,
              className: student.class_name || '未分配',
              averageScore: avgScore
            };
          });
          
          setStudents(formattedStudents);
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error('获取学生数据失败:', error);
        toast.error('获取学生数据失败');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">学生与班级管理</h1>
          <p className="text-gray-500">管理学生和班级信息，查看学生成绩和班级统计数据</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="students">
              <Users className="mr-2 h-4 w-4" />
              学生管理
            </TabsTrigger>
            <TabsTrigger value="classes">
              <School className="mr-2 h-4 w-4" />
              班级管理
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="students" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>学生列表</CardTitle>
                  <CardDescription>管理所有学生信息和成绩</CardDescription>
                </div>
                <Button asChild>
                  <Link to="/warning-analysis">
                    查看预警分析
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">正在加载学生数据...</div>
                ) : students.length > 0 ? (
                  <StudentList students={students} />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无学生数据。请先添加学生信息或导入Excel文件。
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="classes" className="mt-6">
            <ClassProfilesList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentManagement;
