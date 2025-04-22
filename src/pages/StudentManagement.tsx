
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StudentList from "@/components/analysis/StudentList";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import Navbar from "@/components/analysis/Navbar";
import { supabase } from "@/utils/auth";
import { toast } from "sonner";

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
        
        // 从Supabase获取学生数据
        // 注意：您需要在Supabase中创建相应的表和数据
        const { data, error } = await supabase
          .from('students')
          .select('*');
          
        if (error) {
          throw error;
        }
        
        if (data) {
          // 转换为应用所需格式
          const formattedData: Student[] = data.map((student: any) => ({
            studentId: student.student_id || student.studentId,
            name: student.name,
            className: student.class_name || student.className,
            averageScore: student.average_score || student.averageScore || 0,
          }));
          
          setStudents(formattedData);
        }
      } catch (error) {
        console.error('获取学生数据失败:', error);
        toast.error('获取学生数据失败');
        // 如果获取失败，使用空数组
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
                暂无学生数据。请先在Supabase中添加学生信息或导入Excel文件。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentManagement;
