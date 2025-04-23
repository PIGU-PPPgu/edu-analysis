
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StudentList from "@/components/analysis/StudentList";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import Navbar from "@/components/analysis/Navbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  studentId: string;
  name: string;
  className: string;
  averageScore: number;
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

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
          const formattedStudents = data.map(student => {
            // Calculate average score if grades exist
            let avgScore = 0;
            if (student.grades && student.grades.length > 0) {
              const sum = student.grades.reduce((acc, grade) => acc + grade.score, 0);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">学生管理</h1>
          <Button asChild>
            <Link to="/class-management">
              <Users className="mr-2 h-4 w-4" />
              查看班级管理
            </Link>
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>学生列表</CardTitle>
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
      </div>
    </div>
  );
};

export default StudentManagement;
